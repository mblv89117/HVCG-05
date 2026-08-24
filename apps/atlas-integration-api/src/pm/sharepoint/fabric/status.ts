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
}

const EMPTY_INDEXED: FabricIndexedCounts = {
  mailThreads: 0,
  meetings: 0,
  contacts: 0,
  files: 0,
  skipped: 0,
  restricted: 0,
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
      cumulative: { mailThreads: 0, meetings: 0, contacts: 0, files: 0 },
      notes: scheduledSweepEnabled
        ? ['Fabric checkpoint absent — continuous mailbox sync has not completed a run.']
        : ['Fabric scheduled sweep disabled; mailbox sync is not continuous.'],
      honesty: 'never_run',
      changeNotifications: { ...SKIPPED_NOTIFICATIONS },
    };
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      lastRunAt?: string;
      lastAttemptAt?: string;
      mailMode?: 'delta' | 'page';
      mailDeltaReady?: boolean;
      mailSkip?: string | null;
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
      /stopped at HTTP|did not complete|index write skipped|transport failed \(HTTP 0\)/i.test(note),
    );
    let honesty: FabricSyncHealth['honesty'] = 'never_run';
    if (!lastRunAt) honesty = 'never_run';
    else if (mailMode === 'page') honesty = 'page_fallback';
    else if (mailMode === 'delta' && raw.mailDeltaReady === true && !hardFail) honesty = 'delta';
    else honesty = 'degraded';
    return {
      lastRunAt,
      lastAttemptAt,
      mailMode,
      mailDeltaReady: raw.mailDeltaReady === true,
      mailSkipPresent: typeof raw.mailSkip === 'string' && raw.mailSkip.length > 0,
      scheduledSweepEnabled,
      lastIndexed: asCounts(raw.lastIndexed),
      cumulative: {
        mailThreads: typeof raw.counts?.mailThreads === 'number' ? raw.counts.mailThreads : 0,
        meetings: typeof raw.counts?.meetings === 'number' ? raw.counts.meetings : 0,
        contacts: typeof raw.counts?.contacts === 'number' ? raw.counts.contacts : 0,
        files: typeof raw.counts?.files === 'number' ? raw.counts.files : 0,
      },
      notes,
      honesty,
      changeNotifications: inspectChangeNotificationHealth(raw),
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
      cumulative: { mailThreads: 0, meetings: 0, contacts: 0, files: 0 },
      notes: ['Fabric checkpoint unreadable — treating mailbox sync as unproven.'],
      honesty: 'degraded',
      changeNotifications: { ...SKIPPED_NOTIFICATIONS, status: 'error', reason: 'fabric checkpoint unreadable' },
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
