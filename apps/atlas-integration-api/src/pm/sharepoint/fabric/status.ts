/**
 * Honest fabric-sync status for Hub /health.
 * Counts, mode, and HTTP notes only. Never exposes mailbox bodies,
 * subjects, delta tokens, mailSkip URLs, or ClientCodes.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ChangeNotificationStatus } from './notifications.ts';

export const FABRIC_CHECKPOINT_FILE = 'fabric-checkpoint.json';

export interface FabricIndexedCounts {
  mailThreads: number;
  meetings: number;
  contacts: number;
  files: number;
  attachmentsIndexed: number;
  skipped: number;
  restricted: number;
}

export interface FabricSyncHealth {
  lastRunAt: string | null;
  lastAttemptAt: string | null;
  mailMode: 'delta' | 'page' | 'none';
  mailDeltaReady: boolean;
  mailSkipPresent: boolean;
  scheduledSweepEnabled: boolean;
  lastIndexed: FabricIndexedCounts;
  cumulative: {
    mailThreads: number;
    meetings: number;
    contacts: number;
    files: number;
    attachmentsIndexed: number;
  };
  notes: string[];
  honesty: 'never_run' | 'delta' | 'page_fallback' | 'degraded';
  changeNotifications: {
    status: ChangeNotificationStatus;
    reason: string;
    mail: ChangeNotificationStatus;
    files: ChangeNotificationStatus;
    calendar: ChangeNotificationStatus;
  };
  /**
   * Entitled document ↔ indexed attachment metadata link path.
   * skipped when no indexed attachments exist. ready only when the fabric
   * count is already > 0. Never claims LIVE. Never invents counts.
   */
  attachmentLinks: {
    status: 'skipped' | 'ready';
    reason: string;
  };
  /**
   * Outlook contacts fabric index honesty.
   * skipped when the sweep has not completed or Graph returned non-200.
   * ready when Graph 200 completed (including honest empty). Never LIVE.
   * error when the checkpoint is unreadable.
   */
  contacts: {
    status: 'skipped' | 'ready' | 'error';
    reason: string;
  };
  /**
   * Graph POST /search/query honesty for business file search.
   * skipped when the sweep has not completed, Graph returned non-200, or a
   * prior app-only rejection (HTTP 400 invalid_request / BadRequest, or
   * HTTP 0 graph_request_failed) was recorded and later sweeps do not POST again.
   * ready when Graph 200 completed. Never LIVE. Never invents file counts —
   * cumulative.files / lastIndexed.files stay the existing business-file index.
   * error when the checkpoint is unreadable.
   */
  fileSearch: {
    status: 'skipped' | 'ready' | 'error';
    reason: string;
  };
  /**
   * Outlook mail attachment metadata index honesty.
   * skipped when the sweep has not completed or Graph returned non-200.
   * ready when Graph 200 completed (including honest empty / classify-skip).
   * Never LIVE. Never invents attachment counts.
   * error when the checkpoint is unreadable.
   */
  attachments: {
    status: 'skipped' | 'ready' | 'error';
    reason: string;
  };
  /**
   * Entitled Hub operating-index search for already-indexed attachment metadata.
   * ready only when fabric attachment count is already > 0.
   * Never claims LIVE. Never invents filenames, ids, or counts.
   * Does not call Graph /search/query.
   */
  attachmentSearch: {
    status: 'skipped' | 'ready' | 'error';
    reason: string;
  };
  /**
   * Entitled Hub operating-index search for already-indexed business files.
   * ready only when fabric file count is already > 0.
   * Never claims LIVE. Never invents filenames, ids, ClientCodes, or counts.
   * Does not call Graph /search/query.
   * Distinct from fileSearch (Graph POST /search/query honesty).
   */
  fileIndexSearch: {
    status: 'skipped' | 'ready' | 'error';
    reason: string;
  };
  /**
   * Entitled HVCG_Clients hint-list honesty for the last completed sweep.
   * ready when count > 0. empty when the list completed with 0 hints.
   * error when the load failed (fail-closed empty resolver) or the
   * checkpoint is unreadable. skipped when no completed sweep persisted
   * a count. Never includes ClientCodes, names, domains, or tokens.
   */
  clientHints: {
    status: 'ready' | 'empty' | 'error' | 'skipped';
    reason: string;
    count: number;
  };
}

const EMPTY_INDEXED: FabricIndexedCounts = {
  mailThreads: 0,
  meetings: 0,
  contacts: 0,
  files: 0,
  attachmentsIndexed: 0,
  skipped: 0,
  restricted: 0,
};

const EMPTY_CUMULATIVE: FabricSyncHealth['cumulative'] = {
  mailThreads: 0,
  meetings: 0,
  contacts: 0,
  files: 0,
  attachmentsIndexed: 0,
};

const TOKENISH = /(delta|skip)token=[^&\s]+/gi;
const BEARERISH = /Bearer\s+[A-Za-z0-9._-]+/gi;
const URLISH = /https?:\/\/[^\s]+/gi;

export function sanitizeFabricNotes(notes: string[]): string[] {
  return notes
    .map((note) =>
      note
        .replace(TOKENISH, '$1token=[redacted]')
        .replace(BEARERISH, 'Bearer [redacted]')
        .replace(URLISH, '[url-redacted]'),
    )
    .filter((note) => note.trim().length > 0)
    .slice(-12);
}

export function isFabricSweepEnabled(env: NodeJS.Dict<string | undefined> = process.env): boolean {
  const raw = (env.INTEGRATION_FABRIC_SWEEP || '').trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'off') return false;
  return true;
}

export function fabricSweepIntervalMs(env: NodeJS.Dict<string | undefined> = process.env): number {
  const raw = Number(env.INTEGRATION_FABRIC_SWEEP_MS);
  if (Number.isFinite(raw) && raw >= 60_000) return Math.min(raw, 6 * 60 * 60 * 1000);
  return 15 * 60 * 1000;
}

const SKIPPED_NOTIFICATIONS: FabricSyncHealth['changeNotifications'] = {
  status: 'skipped',
  reason: 'subscription create not proven against Graph',
  mail: 'skipped',
  files: 'skipped',
  calendar: 'skipped',
};

const SKIPPED_ATTACHMENT_LINKS: FabricSyncHealth['attachmentLinks'] = {
  status: 'skipped',
  reason: 'No indexed outlook-mail-attachment metadata to link; attachment links remain unproven.',
};

const SKIPPED_CONTACTS: FabricSyncHealth['contacts'] = {
  status: 'skipped',
  reason: 'Contacts sweep has not completed; contacts remain unproven.',
};

const ERROR_CONTACTS: FabricSyncHealth['contacts'] = {
  status: 'error',
  reason: 'Fabric checkpoint unreadable; contacts remain unproven.',
};

const SKIPPED_FILE_SEARCH: FabricSyncHealth['fileSearch'] = {
  status: 'skipped',
  reason: 'File search has not completed; file search remains unproven.',
};

const ERROR_FILE_SEARCH: FabricSyncHealth['fileSearch'] = {
  status: 'error',
  reason: 'Fabric checkpoint unreadable; file search remains unproven.',
};

const SKIPPED_ATTACHMENTS: FabricSyncHealth['attachments'] = {
  status: 'skipped',
  reason: 'Mail attachment metadata has not completed; attachment index remains unproven.',
};

const ERROR_ATTACHMENTS: FabricSyncHealth['attachments'] = {
  status: 'error',
  reason: 'Fabric checkpoint unreadable; attachment index remains unproven.',
};

const SKIPPED_ATTACHMENT_SEARCH: FabricSyncHealth['attachmentSearch'] = {
  status: 'skipped',
  reason: 'No indexed outlook-mail-attachment metadata to search; attachment search remains unproven.',
};

const ERROR_ATTACHMENT_SEARCH: FabricSyncHealth['attachmentSearch'] = {
  status: 'error',
  reason: 'Fabric checkpoint unreadable; attachment search remains unproven.',
};

const SKIPPED_FILE_INDEX_SEARCH: FabricSyncHealth['fileIndexSearch'] = {
  status: 'skipped',
  reason: 'No indexed business files to search; file-index search remains unproven.',
};

const ERROR_FILE_INDEX_SEARCH: FabricSyncHealth['fileIndexSearch'] = {
  status: 'error',
  reason: 'Fabric checkpoint unreadable; file-index search remains unproven.',
};

const SKIPPED_CLIENT_HINTS: FabricSyncHealth['clientHints'] = {
  status: 'skipped',
  reason: 'Client hints have not completed; hint population remains unproven.',
  count: 0,
};

const ERROR_CLIENT_HINTS: FabricSyncHealth['clientHints'] = {
  status: 'error',
  reason: 'Fabric checkpoint unreadable; client hints remain unproven.',
  count: 0,
};

function inspectClientHintsHealth(opts: {
  honesty: FabricSyncHealth['honesty'];
  lastRunAt: string | null;
  clientHintsCount?: number;
  clientHintsError?: boolean;
  notes: string[];
}): FabricSyncHealth['clientHints'] {
  if (opts.honesty === 'never_run' || !opts.lastRunAt) {
    return { ...SKIPPED_CLIENT_HINTS };
  }
  if (typeof opts.clientHintsCount === 'number' && Number.isFinite(opts.clientHintsCount)) {
    const count = Math.max(0, Math.floor(opts.clientHintsCount));
    if (opts.clientHintsError === true) {
      return {
        status: 'error',
        reason: 'Client hints load failed; fabric continued with an empty resolver.',
        count: 0,
      };
    }
    if (count > 0) {
      return {
        status: 'ready',
        reason: 'Client hints loaded on the last completed sweep.',
        count,
      };
    }
    return {
      status: 'empty',
      reason: 'Last completed sweep loaded an empty hint list.',
      count: 0,
    };
  }
  if (
    opts.clientHintsError === true ||
    opts.notes.some((note) => /Client hints unavailable|empty client resolver/i.test(note))
  ) {
    return {
      status: 'error',
      reason: 'Client hints load failed; fabric continued with an empty resolver.',
      count: 0,
    };
  }
  return { ...SKIPPED_CLIENT_HINTS };
}

function parseContactsStopStatus(notes: string[]): number | null {
  for (const note of notes) {
    const match = /Contacts index stopped at HTTP (\d+)/i.exec(note);
    if (match) {
      const status = Number(match[1]);
      if (Number.isFinite(status)) return status;
    }
  }
  return null;
}

function inspectContactsHealth(opts: {
  honesty: FabricSyncHealth['honesty'];
  lastRunAt: string | null;
  lastIndexed: FabricIndexedCounts;
  contactsLastStatus?: number | null;
  contactsGraphItems?: number;
  notes: string[];
}): FabricSyncHealth['contacts'] {
  if (opts.honesty === 'never_run' || !opts.lastRunAt) {
    return { ...SKIPPED_CONTACTS };
  }
  const lastStatus =
    typeof opts.contactsLastStatus === 'number' && Number.isFinite(opts.contactsLastStatus)
      ? Math.floor(opts.contactsLastStatus)
      : parseContactsStopStatus(opts.notes);
  if (lastStatus != null && lastStatus !== 200) {
    return {
      status: 'skipped',
      reason: `Contacts Graph returned HTTP ${lastStatus}; contacts remain unproven.`,
    };
  }
  if (lastStatus !== 200) {
    return { ...SKIPPED_CONTACTS };
  }
  const indexed = opts.lastIndexed.contacts;
  const graphItems =
    typeof opts.contactsGraphItems === 'number' && Number.isFinite(opts.contactsGraphItems)
      ? Math.max(0, Math.floor(opts.contactsGraphItems))
      : 0;
  if (indexed > 0) {
    return {
      status: 'ready',
      reason: 'Contacts Graph returned HTTP 200; entitled contacts were indexed.',
    };
  }
  if (graphItems > 0) {
    return {
      status: 'ready',
      reason: 'Contacts Graph returned HTTP 200; items classify-skipped for missing entitled ClientCode.',
    };
  }
  return {
    status: 'ready',
    reason: 'Contacts Graph returned HTTP 200 with an empty page; indexed contacts remain 0.',
  };
}

function parseFileSearchStopStatus(notes: string[]): number | null {
  for (const note of notes) {
    const match = /File search skipped:.*HTTP (\d+)/i.exec(note);
    if (match) {
      const status = Number(match[1]);
      if (Number.isFinite(status)) return status;
    }
  }
  return null;
}

function inspectFileSearchHealth(opts: {
  honesty: FabricSyncHealth['honesty'];
  lastRunAt: string | null;
  fileSearchLastStatus?: number | null;
  notes: string[];
}): FabricSyncHealth['fileSearch'] {
  if (opts.honesty === 'never_run' || !opts.lastRunAt) {
    return { ...SKIPPED_FILE_SEARCH };
  }
  const lastStatus =
    typeof opts.fileSearchLastStatus === 'number' && Number.isFinite(opts.fileSearchLastStatus)
      ? Math.floor(opts.fileSearchLastStatus)
      : parseFileSearchStopStatus(opts.notes);
  if (lastStatus != null && lastStatus !== 200) {
    return {
      status: 'skipped',
      reason: `File search Graph search/query returned HTTP ${lastStatus}; file search remains unproven.`,
    };
  }
  if (lastStatus !== 200) {
    return { ...SKIPPED_FILE_SEARCH };
  }
  return {
    status: 'ready',
    reason: 'File search Graph search/query returned HTTP 200; file counts remain the existing business-file index.',
  };
}

function parseAttachmentStopStatus(notes: string[]): number | null {
  for (const note of notes) {
    const match = /Mail attachment metadata (?:skipped: Graph HTTP|stopped at HTTP) (\d+)/i.exec(note);
    if (match) {
      const status = Number(match[1]);
      if (Number.isFinite(status)) return status;
    }
  }
  return null;
}

function inspectAttachmentsHealth(opts: {
  honesty: FabricSyncHealth['honesty'];
  lastRunAt: string | null;
  lastIndexed: FabricIndexedCounts;
  attachmentsLastStatus?: number | null;
  attachmentsGraphItems?: number;
  attachmentsHasAttachmentsSeen?: number;
  attachmentsClassifySkipped?: number;
  notes: string[];
}): FabricSyncHealth['attachments'] {
  if (opts.honesty === 'never_run' || !opts.lastRunAt) {
    return { ...SKIPPED_ATTACHMENTS };
  }
  const lastStatus =
    typeof opts.attachmentsLastStatus === 'number' && Number.isFinite(opts.attachmentsLastStatus)
      ? Math.floor(opts.attachmentsLastStatus)
      : parseAttachmentStopStatus(opts.notes);
  if (lastStatus != null && lastStatus !== 200) {
    return {
      status: 'skipped',
      reason: `Mail attachment metadata Graph returned HTTP ${lastStatus}; attachment index remains unproven.`,
    };
  }
  if (lastStatus !== 200) {
    return { ...SKIPPED_ATTACHMENTS };
  }
  const indexed = opts.lastIndexed.attachmentsIndexed;
  const graphItems =
    typeof opts.attachmentsGraphItems === 'number' && Number.isFinite(opts.attachmentsGraphItems)
      ? Math.max(0, Math.floor(opts.attachmentsGraphItems))
      : 0;
  const seen =
    typeof opts.attachmentsHasAttachmentsSeen === 'number' && Number.isFinite(opts.attachmentsHasAttachmentsSeen)
      ? Math.max(0, Math.floor(opts.attachmentsHasAttachmentsSeen))
      : 0;
  const classifySkipped =
    typeof opts.attachmentsClassifySkipped === 'number' && Number.isFinite(opts.attachmentsClassifySkipped)
      ? Math.max(0, Math.floor(opts.attachmentsClassifySkipped))
      : 0;
  if (indexed > 0) {
    return {
      status: 'ready',
      reason: 'Mail attachment metadata Graph returned HTTP 200; entitled attachment metadata was indexed.',
    };
  }
  if (classifySkipped > 0) {
    return {
      status: 'ready',
      reason: 'Mail attachment metadata Graph returned HTTP 200; items classify-skipped for missing entitled ClientCode.',
    };
  }
  if (seen === 0 && graphItems === 0) {
    return {
      status: 'ready',
      reason: 'Mail attachment metadata Graph returned HTTP 200 with no hasAttachments messages; indexed attachments remain 0.',
    };
  }
  return {
    status: 'ready',
    reason: 'Mail attachment metadata Graph returned HTTP 200; indexed attachments remain 0.',
  };
}

function inspectAttachmentLinkHealth(opts: {
  honesty: FabricSyncHealth['honesty'];
  lastIndexed: FabricIndexedCounts;
  cumulative: FabricSyncHealth['cumulative'];
  attachmentsLastStatus?: number | null;
  notes: string[];
}): FabricSyncHealth['attachmentLinks'] {
  const indexed = Math.max(opts.lastIndexed.attachmentsIndexed, opts.cumulative.attachmentsIndexed);
  if (indexed > 0) {
    return {
      status: 'ready',
      reason: 'Indexed outlook-mail-attachment metadata is available for entitled document linking.',
    };
  }
  if (opts.honesty === 'never_run') {
    return { ...SKIPPED_ATTACHMENT_LINKS };
  }
  const lastStatus =
    typeof opts.attachmentsLastStatus === 'number' && Number.isFinite(opts.attachmentsLastStatus)
      ? Math.floor(opts.attachmentsLastStatus)
      : parseAttachmentStopStatus(opts.notes);
  if (lastStatus != null && lastStatus !== 200) {
    return {
      status: 'skipped',
      reason: `Mail attachment metadata Graph returned HTTP ${lastStatus}; attachment links remain unproven.`,
    };
  }
  if (lastStatus === 200) {
    return {
      status: 'skipped',
      reason:
        'Mail attachment metadata Graph returned HTTP 200; no entitled outlook-mail-attachment metadata to link; attachment links remain unproven.',
    };
  }
  return { ...SKIPPED_ATTACHMENT_LINKS };
}

function inspectAttachmentSearchHealth(opts: {
  lastIndexed: FabricIndexedCounts;
  cumulative: FabricSyncHealth['cumulative'];
}): FabricSyncHealth['attachmentSearch'] {
  const indexed = Math.max(opts.lastIndexed.attachmentsIndexed, opts.cumulative.attachmentsIndexed);
  if (indexed > 0) {
    return {
      status: 'ready',
      reason:
        'Indexed outlook-mail-attachment metadata is searchable on the entitled Hub operating index.',
    };
  }
  return { ...SKIPPED_ATTACHMENT_SEARCH };
}

function inspectFileIndexSearchHealth(opts: {
  lastIndexed: FabricIndexedCounts;
  cumulative: FabricSyncHealth['cumulative'];
}): FabricSyncHealth['fileIndexSearch'] {
  const indexed = Math.max(opts.lastIndexed.files, opts.cumulative.files);
  if (indexed > 0) {
    return {
      status: 'ready',
      reason: 'Indexed business files are searchable on the entitled Hub operating index.',
    };
  }
  return { ...SKIPPED_FILE_INDEX_SEARCH };
}

function inspectChangeNotificationHealth(raw: {
  changeNotifications?: {
    status?: ChangeNotificationStatus;
    reason?: string;
    mailStatus?: ChangeNotificationStatus;
    filesStatus?: ChangeNotificationStatus;
    calendarStatus?: ChangeNotificationStatus;
    mail?: { id?: string; expirationDateTime?: string };
    files?: Array<{ id?: string; expirationDateTime?: string }>;
    calendar?: { id?: string; expirationDateTime?: string };
  };
}): FabricSyncHealth['changeNotifications'] {
  const state = raw.changeNotifications;
  if (!state || typeof state !== 'object') return { ...SKIPPED_NOTIFICATIONS };
  const mailReady = Boolean(
    state.mailStatus === 'ready' &&
      state.mail?.id &&
      typeof state.mail.expirationDateTime === 'string' &&
      Date.parse(state.mail.expirationDateTime) > Date.now(),
  );
  const filesReady = Boolean(
    state.filesStatus === 'ready' &&
      Array.isArray(state.files) &&
      state.files.some(
        (row) =>
          Boolean(row?.id) &&
          typeof row.expirationDateTime === 'string' &&
          Date.parse(row.expirationDateTime) > Date.now(),
      ),
  );
  const calendarReady = Boolean(
    state.calendarStatus === 'ready' &&
      state.calendar?.id &&
      typeof state.calendar.expirationDateTime === 'string' &&
      Date.parse(state.calendar.expirationDateTime) > Date.now(),
  );
  const filesLane: ChangeNotificationStatus = filesReady
    ? 'ready'
    : state.filesStatus === 'error'
      ? 'error'
      : 'skipped';
  const calendarLane: ChangeNotificationStatus = calendarReady
    ? 'ready'
    : state.calendarStatus === 'error'
      ? 'error'
      : 'skipped';
  const reason = sanitizeFabricNotes([state.reason || SKIPPED_NOTIFICATIONS.reason])[0] || SKIPPED_NOTIFICATIONS.reason;
  if (state.mailStatus === 'error' || (state.status === 'error' && !mailReady)) {
    return { status: 'error', reason, mail: 'error', files: filesLane, calendar: calendarLane };
  }
  if (mailReady) {
    return {
      status: 'ready',
      reason,
      mail: 'ready',
      files: filesLane,
      calendar: calendarLane,
    };
  }
  return {
    status: 'skipped',
    reason,
    mail: 'skipped',
    files: filesLane,
    calendar: calendarLane,
  };
}

function asCounts(value: unknown): FabricIndexedCounts {
  if (!value || typeof value !== 'object') return { ...EMPTY_INDEXED };
  const rec = value as Record<string, unknown>;
  const n = (key: keyof FabricIndexedCounts) =>
    typeof rec[key] === 'number' && Number.isFinite(rec[key]) ? Math.max(0, Math.floor(rec[key] as number)) : 0;
  return {
    mailThreads: n('mailThreads'),
    meetings: n('meetings'),
    contacts: n('contacts'),
    files: n('files'),
    attachmentsIndexed: n('attachmentsIndexed'),
    skipped: n('skipped'),
    restricted: n('restricted'),
  };
}

export function inspectFabricSyncHealth(
  dataDir: string,
  opts: { sweepEnabled?: boolean } = {},
): FabricSyncHealth {
  const path = join(dataDir, FABRIC_CHECKPOINT_FILE);
  const scheduledSweepEnabled = opts.sweepEnabled ?? isFabricSweepEnabled();
  if (!existsSync(path)) {
    return {
      lastRunAt: null,
      lastAttemptAt: null,
      mailMode: 'none',
      mailDeltaReady: false,
      mailSkipPresent: false,
      scheduledSweepEnabled,
      lastIndexed: { ...EMPTY_INDEXED },
      cumulative: { ...EMPTY_CUMULATIVE },
      notes: scheduledSweepEnabled
        ? ['Fabric checkpoint absent — continuous mailbox sync has not completed a run.']
        : ['Fabric scheduled sweep disabled; mailbox sync is not continuous.'],
      honesty: 'never_run',
      changeNotifications: { ...SKIPPED_NOTIFICATIONS },
      attachmentLinks: { ...SKIPPED_ATTACHMENT_LINKS },
      contacts: { ...SKIPPED_CONTACTS },
      fileSearch: { ...SKIPPED_FILE_SEARCH },
      attachments: { ...SKIPPED_ATTACHMENTS },
      attachmentSearch: { ...SKIPPED_ATTACHMENT_SEARCH },
      fileIndexSearch: { ...SKIPPED_FILE_INDEX_SEARCH },
      clientHints: { ...SKIPPED_CLIENT_HINTS },
    };
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      lastRunAt?: string;
      lastAttemptAt?: string;
      mailMode?: 'delta' | 'page';
      mailDeltaReady?: boolean;
      mailSkip?: string | null;
      contactsLastStatus?: number | null;
      contactsGraphItems?: number;
      fileSearchLastStatus?: number | null;
      attachmentsLastStatus?: number | null;
      attachmentsGraphItems?: number;
      attachmentsHasAttachmentsSeen?: number;
      attachmentsClassifySkipped?: number;
      clientHintsCount?: number;
      clientHintsError?: boolean;
      counts?: Record<string, number>;
      lastIndexed?: FabricIndexedCounts;
      lastNotes?: string[];
      changeNotifications?: {
        status?: ChangeNotificationStatus;
        reason?: string;
        mailStatus?: ChangeNotificationStatus;
        filesStatus?: ChangeNotificationStatus;
        calendarStatus?: ChangeNotificationStatus;
        mail?: { id?: string; expirationDateTime?: string };
        files?: Array<{ id?: string; expirationDateTime?: string }>;
        calendar?: { id?: string; expirationDateTime?: string };
      };
    };
    const lastRunAt = typeof raw.lastRunAt === 'string' && raw.lastRunAt ? raw.lastRunAt : null;
    const lastAttemptAt =
      typeof raw.lastAttemptAt === 'string' && raw.lastAttemptAt ? raw.lastAttemptAt : lastRunAt;
    const mailMode = raw.mailMode === 'delta' || raw.mailMode === 'page' ? raw.mailMode : 'none';
    const notes = sanitizeFabricNotes(Array.isArray(raw.lastNotes) ? raw.lastNotes.map(String) : []);
    const hardFail = notes.some((note) =>
      /Mail index stopped at HTTP|Mail (delta|page) did not complete|index write skipped|transport failed \(HTTP 0\)/i.test(
        note,
      ),
    );
    let honesty: FabricSyncHealth['honesty'] = 'never_run';
    if (!lastRunAt) honesty = 'never_run';
    else if (mailMode === 'page') honesty = 'page_fallback';
    else if (mailMode === 'delta' && raw.mailDeltaReady === true && !hardFail) honesty = 'delta';
    else honesty = 'degraded';
    const lastIndexed = asCounts(raw.lastIndexed);
    const cumulative: FabricSyncHealth['cumulative'] = {
      mailThreads: typeof raw.counts?.mailThreads === 'number' ? raw.counts.mailThreads : 0,
      meetings: typeof raw.counts?.meetings === 'number' ? raw.counts.meetings : 0,
      contacts: typeof raw.counts?.contacts === 'number' ? raw.counts.contacts : 0,
      files: typeof raw.counts?.files === 'number' ? raw.counts.files : 0,
      attachmentsIndexed:
        typeof raw.counts?.attachmentsIndexed === 'number' ? raw.counts.attachmentsIndexed : 0,
    };
    return {
      lastRunAt,
      lastAttemptAt,
      mailMode,
      mailDeltaReady: raw.mailDeltaReady === true,
      mailSkipPresent: typeof raw.mailSkip === 'string' && raw.mailSkip.length > 0,
      scheduledSweepEnabled,
      lastIndexed,
      cumulative,
      notes,
      honesty,
      changeNotifications: inspectChangeNotificationHealth(raw),
      attachmentLinks: inspectAttachmentLinkHealth({
        honesty,
        lastIndexed,
        cumulative,
        attachmentsLastStatus:
          typeof raw.attachmentsLastStatus === 'number' && Number.isFinite(raw.attachmentsLastStatus)
            ? raw.attachmentsLastStatus
            : null,
        notes,
      }),
      attachments: inspectAttachmentsHealth({
        honesty,
        lastRunAt,
        lastIndexed,
        attachmentsLastStatus:
          typeof raw.attachmentsLastStatus === 'number' && Number.isFinite(raw.attachmentsLastStatus)
            ? raw.attachmentsLastStatus
            : null,
        attachmentsGraphItems:
          typeof raw.attachmentsGraphItems === 'number' && Number.isFinite(raw.attachmentsGraphItems)
            ? raw.attachmentsGraphItems
            : undefined,
        attachmentsHasAttachmentsSeen:
          typeof raw.attachmentsHasAttachmentsSeen === 'number' &&
          Number.isFinite(raw.attachmentsHasAttachmentsSeen)
            ? raw.attachmentsHasAttachmentsSeen
            : undefined,
        attachmentsClassifySkipped:
          typeof raw.attachmentsClassifySkipped === 'number' && Number.isFinite(raw.attachmentsClassifySkipped)
            ? raw.attachmentsClassifySkipped
            : undefined,
        notes,
      }),
      contacts: inspectContactsHealth({
        honesty,
        lastRunAt,
        lastIndexed,
        contactsLastStatus:
          typeof raw.contactsLastStatus === 'number' && Number.isFinite(raw.contactsLastStatus)
            ? raw.contactsLastStatus
            : null,
        contactsGraphItems:
          typeof raw.contactsGraphItems === 'number' && Number.isFinite(raw.contactsGraphItems)
            ? raw.contactsGraphItems
            : undefined,
        notes,
      }),
      fileSearch: inspectFileSearchHealth({
        honesty,
        lastRunAt,
        fileSearchLastStatus:
          typeof raw.fileSearchLastStatus === 'number' && Number.isFinite(raw.fileSearchLastStatus)
            ? raw.fileSearchLastStatus
            : null,
        notes,
      }),
      attachmentSearch: inspectAttachmentSearchHealth({ lastIndexed, cumulative }),
      fileIndexSearch: inspectFileIndexSearchHealth({ lastIndexed, cumulative }),
      clientHints: inspectClientHintsHealth({
        honesty,
        lastRunAt,
        clientHintsCount:
          typeof raw.clientHintsCount === 'number' && Number.isFinite(raw.clientHintsCount)
            ? raw.clientHintsCount
            : undefined,
        clientHintsError: raw.clientHintsError === true,
        notes,
      }),
    };
  } catch {
    return {
      lastRunAt: null,
      lastAttemptAt: null,
      mailMode: 'none',
      mailDeltaReady: false,
      mailSkipPresent: false,
      scheduledSweepEnabled,
      lastIndexed: { ...EMPTY_INDEXED },
      cumulative: { ...EMPTY_CUMULATIVE },
      notes: ['Fabric checkpoint unreadable — treating mailbox sync as unproven.'],
      honesty: 'degraded',
      changeNotifications: { ...SKIPPED_NOTIFICATIONS, status: 'error', reason: 'fabric checkpoint unreadable' },
      attachmentLinks: { ...SKIPPED_ATTACHMENT_LINKS },
      contacts: { ...ERROR_CONTACTS },
      fileSearch: { ...ERROR_FILE_SEARCH },
      attachments: { ...ERROR_ATTACHMENTS },
      attachmentSearch: { ...ERROR_ATTACHMENT_SEARCH },
      fileIndexSearch: { ...ERROR_FILE_INDEX_SEARCH },
      clientHints: { ...ERROR_CLIENT_HINTS },
    };
  }
}

export function persistHonestyFields<T extends Record<string, unknown>>(
  checkpoint: T,
  result: { indexed: FabricIndexedCounts; notes: string[] },
): T & { lastIndexed: FabricIndexedCounts; lastNotes: string[] } {
  return {
    ...checkpoint,
    lastIndexed: { ...result.indexed },
    lastNotes: sanitizeFabricNotes(result.notes),
  };
}

export function recordFabricSweepAttempt(
  dataDir: string,
  notes: string[],
  opts: { complete?: boolean } = {},
): void {
  const path = join(dataDir, FABRIC_CHECKPOINT_FILE);
  mkdirSync(dataDir, { recursive: true });
  let current: Record<string, unknown> = {};
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        current = parsed as Record<string, unknown>;
      }
    } catch {
      current = {};
    }
  }
  const now = new Date().toISOString();
  const prior = Array.isArray(current.lastNotes) ? current.lastNotes.map(String) : [];
  const keep = prior.filter((note) =>
    /Mail |mail delta|HTTP |token acquisition|transport failed|mailbox/i.test(note),
  );
  const next = {
    ...current,
    lastAttemptAt: now,
    lastNotes: sanitizeFabricNotes([...keep, ...notes]),
  };
  if (opts.complete) next.lastRunAt = now;
  writeFileSync(path, JSON.stringify(next, null, 2));
}
