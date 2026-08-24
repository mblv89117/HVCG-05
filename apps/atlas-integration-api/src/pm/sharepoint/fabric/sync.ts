/**
 * Restartable information-fabric backfill.
 * Outlook remains SoR. Atlas stores thread-level index rows only.
 * Checkpoints + source IDs. No mailbox byte-copy. No unbounded loops.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AtlasPrincipal } from '../../../middleware/auth.ts';
import { PmHttpError } from '../errors.ts';
import { assertMannyOnly } from '../manny.ts';
import { MANNY_ENTRA_OID } from '../manny.ts';
import type { SharePointPmService } from '../repository.ts';
import { classifyFabricRecord, stripSecrets, type ClientHint } from './classify.ts';
import { attachmentIndexSummary, authoritativeSourceUrl } from './fileIndex.ts';
import {
  emptySharePointCheckpoint,
  indexBusinessFiles,
  type SharePointFileCheckpoint,
} from './files.ts';
import { isAllowedFabricGraphPath, type FabricGraphClient } from './graph.ts';
import { sanitizeFabricNotes } from './status.ts';
import type { FabricChangeNotificationState } from './subscriptions.ts';

const MAX_PAGES = 8;
const PAGE_SIZE = 50;
const MAX_ATTACHMENT_MESSAGES_PAGE = 25;
const MAX_ATTACHMENT_LOOKUPS_DELTA = MAX_PAGES * PAGE_SIZE;
const MAX_ATTACHMENTS_PER_MESSAGE = 20;
const GRAPH_ATTACHMENT_UNSUPPORTED = new Set([400, 403, 404, 405]);
const MAIL_SELECT =
  'id,conversationId,internetMessageId,subject,from,toRecipients,ccRecipients,receivedDateTime,webLink,bodyPreview,hasAttachments';

export interface FabricCheckpoint {
  mailSkip: string | null;
  mailMode?: 'delta' | 'page';
  mailDeltaReady?: boolean;
  calendarSkip: string | null;
  contactsSkip: string | null;
  /** Last Graph HTTP status for /contacts. Distinct from contactsSkip nextLink. */
  contactsLastStatus?: number | null;
  /** Graph contact items seen on the last completed contacts sweep (not indexed counts). */
  contactsGraphItems?: number;
  /** Items classify-skipped for missing entitled ClientCode on the last sweep. */
  contactsClassifySkipped?: number;
  filesSkip: string | null;
  sharePoint?: SharePointFileCheckpoint;
  lastRunAt?: string;
  lastAttemptAt?: string;
  lastIndexed?: FabricSyncResult['indexed'];
  lastNotes?: string[];
  counts: Record<string, number>;
  changeNotifications?: FabricChangeNotificationState;
}

export interface FabricSyncResult {
  checkpoint: FabricCheckpoint;
  indexed: {
    mailThreads: number;
    meetings: number;
    contacts: number;
    files: number;
    attachmentsIndexed: number;
    skipped: number;
    restricted: number;
  };
  notes: string[];
}

function emptyCheckpoint(): FabricCheckpoint {
  return {
    mailSkip: null,
    calendarSkip: null,
    contactsSkip: null,
    filesSkip: null,
    sharePoint: emptySharePointCheckpoint(),
    counts: {},
  };
}

function loadCheckpoint(dir: string): FabricCheckpoint {
  const path = join(dir, 'fabric-checkpoint.json');
  if (!existsSync(path)) return emptyCheckpoint();
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as FabricCheckpoint;
    return {
      ...emptyCheckpoint(),
      ...raw,
      counts: raw.counts || {},
      sharePoint: {
        ...emptySharePointCheckpoint(),
        ...(raw.sharePoint || {}),
        drives: { ...(raw.sharePoint?.drives || {}) },
      },
    };
  } catch {
    return emptyCheckpoint();
  }
}

function saveCheckpoint(dir: string, cp: FabricCheckpoint): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'fabric-checkpoint.json'), JSON.stringify(cp, null, 2));
}

function asArray(json: Record<string, unknown>): Record<string, unknown>[] {
  const value = json.value;
  return Array.isArray(value)
    ? value.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object')
    : [];
}

function nextLink(json: Record<string, unknown>): string | null {
  return typeof json['@odata.nextLink'] === 'string' ? json['@odata.nextLink'] : null;
}

function deltaLink(json: Record<string, unknown>): string | null {
  return typeof json['@odata.deltaLink'] === 'string' ? json['@odata.deltaLink'] : null;
}

function mailDeltaUrl(): string {
  return `/v1.0/users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages/delta?$select=${MAIL_SELECT}&$top=${PAGE_SIZE}`;
}

function legacyMailPageUrl(): string {
  return `/v1.0/users/${MANNY_ENTRA_OID}/messages?$select=${MAIL_SELECT}&$top=${PAGE_SIZE}&$orderby=receivedDateTime desc`;
}

function attachmentMetadataUrl(messageId: string): string {
  return `/v1.0/users/${MANNY_ENTRA_OID}/messages/${encodeURIComponent(messageId)}/attachments?$select=id,name,contentType,size&$top=${MAX_ATTACHMENTS_PER_MESSAGE}`;
}

function isolatedFailureNote(label: string, err: unknown): string {
  if (err instanceof PmHttpError) return `${label}: ${err.message}`;
  if (err instanceof Error && err.message.trim()) return `${label}: ${err.message}`;
  return `${label}: isolated failure without HTTP status.`;
}

function persistFabricProgress(dir: string, cp: FabricCheckpoint, notes: string[]): void {
  cp.lastAttemptAt = new Date().toISOString();
  cp.lastNotes = sanitizeFabricNotes(pinHonestyNotes(notes));
  saveCheckpoint(dir, cp);
}

function pinHonestyNotes(notes: string[]): string[] {
  const mail = notes.filter((note) => /^Mail (delta|page) reached HTTP /.test(note));
  const skips = notes.filter((note) => /index write skipped|transport failed \(HTTP 0\)/.test(note));
  const attachments = notes.filter((note) => /Mail attachment metadata/.test(note));
  const contacts = notes.filter((note) => /^Contacts /.test(note));
  const rest = notes.filter(
    (note) =>
      !mail.includes(note) &&
      !skips.includes(note) &&
      !attachments.includes(note) &&
      !contacts.includes(note),
  );
  return [
    ...rest,
    ...skips.slice(0, 2),
    ...attachments.slice(-2),
    ...contacts.slice(-3),
    ...mail.slice(-1),
  ];
}

function attachmentLookupBudget(mailMode: 'delta' | 'page'): number {
  return mailMode === 'delta' ? MAX_ATTACHMENT_LOOKUPS_DELTA : MAX_ATTACHMENT_MESSAGES_PAGE;
}

async function readFabricJson(
  fabric: FabricGraphClient,
  url: string,
  notes: string[],
  label: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  try {
    return await fabric.getJson(url);
  } catch (err) {
    notes.push(isolatedFailureNote(`${label} did not return HTTP`, err));
    return { status: 0, json: {} };
  }
}

async function tryPmIndex(
  notes: string[],
  label: string,
  write: () => Promise<void>,
): Promise<boolean> {
  try {
    await write();
    return true;
  } catch (err) {
    const note = isolatedFailureNote(`${label} skipped`, err);
    if (!notes.some((existing) => existing.startsWith(`${label} skipped`))) notes.push(note);
    return false;
  }
}

function recordMailHttpFact(notes: string[], mailMode: 'delta' | 'page', status: number): void {
  const fact = `Mail ${mailMode} reached HTTP ${status}.`;
  const prior = notes.findIndex((note) => /^Mail (delta|page) reached HTTP /.test(note));
  if (prior >= 0) {
    const existing = notes[prior];
    if (/reached HTTP 200/.test(existing) && status !== 200) return;
    notes.splice(prior, 1);
  }
  notes.push(fact);
}

function mailboxPathname(url: string): string {
  try {
    const parsed = new URL(url.startsWith('https://') ? url : `https://graph.microsoft.com${url}`);
    return parsed.pathname;
  } catch {
    return url.split('?')[0] || url;
  }
}

export async function runFabricSync(opts: {
  principal?: AtlasPrincipal;
  service: SharePointPmService;
  fabric: FabricGraphClient;
  dataDir: string;
  bootstrap?: boolean;
}): Promise<FabricSyncResult> {
  if (!opts.bootstrap) {
    if (!opts.principal) {
      throw new Error('Fabric sync requires an authenticated principal.');
    }
    assertMannyOnly(opts.principal, 'Information fabric sync');
  }
  const notes: string[] = [];
  let clients: ClientHint[] = [];
  try {
    clients = (await opts.service.listClientHints()).map(
      (c): ClientHint => ({
        clientCode: c.clientCode,
        displayName: c.displayName,
        dba: c.dba,
        domains: [],
      }),
    );
  } catch (err) {
    notes.push(isolatedFailureNote('Client hints unavailable; fabric sync continued with empty client resolver', err));
  }
  const cp = loadCheckpoint(opts.dataDir);
  const indexed = {
    mailThreads: 0,
    meetings: 0,
    contacts: 0,
    files: 0,
    attachmentsIndexed: 0,
    skipped: 0,
    restricted: 0,
  };

  const seenConversations = new Set<string>();
  let attachmentLookups = 0;
  let mailUrl: string | null = cp.mailSkip || mailDeltaUrl();
  let mailMode: 'delta' | 'page' = mailUrl.includes('/delta') ? 'delta' : (cp.mailMode || 'page');
  if ((cp.counts.mailThreads || 0) === 0 && cp.mailDeltaReady === true && mailUrl) {
    notes.push('Inbox delta checkpoint had zero persisted mail threads; restarting inbox delta once.');
    mailUrl = mailDeltaUrl();
    mailMode = 'delta';
    cp.mailSkip = null;
    cp.mailDeltaReady = false;
    persistFabricProgress(opts.dataDir, cp, notes);
  }
  try {
  for (let page = 0; page < MAX_PAGES && mailUrl; page += 1) {
    if (!isAllowedFabricGraphPath(mailboxPathname(mailUrl))) {
      notes.push('Stored mail skip path was not allowlisted; restarting inbox delta.');
      mailUrl = mailDeltaUrl();
      mailMode = 'delta';
      cp.mailSkip = null;
      cp.mailMode = 'delta';
      persistFabricProgress(opts.dataDir, cp, notes);
      continue;
    }
    const { status, json } = await readFabricJson(opts.fabric, mailUrl, notes, `Mail ${mailMode}`);
    recordMailHttpFact(notes, mailMode, status);
    cp.mailMode = mailMode;
    persistFabricProgress(opts.dataDir, cp, notes);
    if (status !== 200) {
      if (page === 0 && mailMode === 'delta' && !cp.mailDeltaReady) {
        notes.push(`Mail delta unavailable at HTTP ${status}; falling back to recent messages page for this run.`);
        mailUrl = legacyMailPageUrl();
        mailMode = 'page';
        cp.mailMode = 'page';
        persistFabricProgress(opts.dataDir, cp, notes);
        page = -1;
        continue;
      }
      notes.push(`Mail index stopped at HTTP ${status}.`);
      break;
    }
    for (const msg of asArray(json)) {
      const conversationId = typeof msg.conversationId === 'string' ? msg.conversationId : '';
      const messageId = typeof msg.id === 'string' ? msg.id : '';
      if (!messageId) continue;
      if (conversationId && seenConversations.has(conversationId)) continue;
      if (conversationId) seenConversations.add(conversationId);
      const from =
        msg.from && typeof msg.from === 'object'
          ? String((msg.from as { emailAddress?: { address?: string } }).emailAddress?.address || '')
          : '';
      const to = Array.isArray(msg.toRecipients)
        ? msg.toRecipients.map((r) =>
            String((r as { emailAddress?: { address?: string } })?.emailAddress?.address || ''),
          )
        : [];
      const classified = classifyFabricRecord(
        {
          subject: typeof msg.subject === 'string' ? msg.subject : '',
          participants: [from, ...to],
          preview: typeof msg.bodyPreview === 'string' ? msg.bodyPreview : '',
          source: 'outlook',
        },
        clients,
      );
      if (classified.ingest === 'skip') {
        indexed.skipped += 1;
        continue;
      }
      if (classified.ingest === 'metadata_link') indexed.restricted += 1;
      const summary =
        classified.ingest === 'metadata_link'
          ? 'RESTRICTED — metadata and source link only. Body not stored.'
          : stripSecrets(typeof msg.bodyPreview === 'string' ? msg.bodyPreview : '');
      const webUrl = typeof msg.webLink === 'string' ? msg.webLink : undefined;
      const wroteMail = await tryPmIndex(notes, 'SharePoint mail index write', () =>
        opts.service.upsertCommunicationIndex({
          title: (typeof msg.subject === 'string' && msg.subject) || '(no subject)',
          summary,
          clientCode: classified.clientCode,
          date: typeof msg.receivedDateTime === 'string' ? msg.receivedDateTime : undefined,
          channel: 'Email',
          direction: from.toLowerCase().endsWith('@highvaluecapitalgroup.com') ? 'Outbound' : 'Inbound',
          webUrl,
          sourceMessageId: messageId,
          conversationId: conversationId || messageId,
          classification: classified.classification,
          provenanceSource: 'outlook-mail',
          sourceOrg: 'HVCG',
          idempotencyKey: `mail:${conversationId || messageId}`,
        }),
      );
      if (!wroteMail) continue;
      indexed.mailThreads += 1;
      if (
        msg.hasAttachments === true &&
        classified.clientCode &&
        attachmentLookups < attachmentLookupBudget(mailMode)
      ) {
        attachmentLookups += 1;
        const att = await readFabricJson(
          opts.fabric,
          attachmentMetadataUrl(messageId),
          notes,
          'Mail attachment metadata',
        );
        if (GRAPH_ATTACHMENT_UNSUPPORTED.has(att.status)) {
          notes.push(
            `Mail attachment metadata skipped: Graph HTTP ${att.status} unsupported; attachment index remains unproven.`,
          );
        } else if (att.status !== 200) {
          notes.push(`Mail attachment metadata stopped at HTTP ${att.status}.`);
        } else {
          const parentWebUrl = authoritativeSourceUrl(webUrl);
          for (const item of asArray(att.json).slice(0, MAX_ATTACHMENTS_PER_MESSAGE)) {
            const attId = typeof item.id === 'string' ? item.id : '';
            const name = typeof item.name === 'string' ? item.name : '';
            if (!attId) continue;
            const key = `mail-att:${messageId}:${attId}`;
            const contentType = typeof item.contentType === 'string' ? item.contentType : undefined;
            const size = typeof item.size === 'number' && Number.isFinite(item.size) ? item.size : undefined;
            const wroteAtt = await tryPmIndex(notes, 'SharePoint mail attachment index write', () =>
              opts.service.upsertCommunicationIndex({
                title: name || attId,
                summary: attachmentIndexSummary({
                  webUrl: parentWebUrl,
                  parentMessageId: messageId,
                  attachmentId: attId,
                  contentType,
                  size,
                  idempotencyKey: key,
                }),
                clientCode: classified.clientCode,
                channel: 'Other',
                webUrl: parentWebUrl,
                sourceMessageId: attId,
                conversationId: messageId,
                classification: 'RESTRICTED',
                provenanceSource: 'outlook-mail-attachment',
                sourceOrg: 'HVCG',
                idempotencyKey: key,
              }),
            );
            if (!wroteAtt) continue;
            indexed.attachmentsIndexed += 1;
            indexed.files += 1;
            indexed.restricted += 1;
          }
        }
      }
    }
    const delta = deltaLink(json);
    const next = nextLink(json);
    if (delta) {
      cp.mailSkip = delta;
      cp.mailMode = mailMode;
      cp.mailDeltaReady = mailMode === 'delta';
      mailUrl = null;
    } else {
      mailUrl = next;
      cp.mailSkip = mailUrl;
      cp.mailMode = mailMode;
    }
  }
  persistFabricProgress(opts.dataDir, cp, notes);

  let calUrl: string | null =
    cp.calendarSkip ||
    `/v1.0/users/${MANNY_ENTRA_OID}/calendar/events?$select=id,subject,start,end,organizer,attendees,webLink,onlineMeetingUrl,bodyPreview&$top=${PAGE_SIZE}&$orderby=start/dateTime desc`;
  for (let page = 0; page < MAX_PAGES && calUrl; page += 1) {
    const { status, json } = await readFabricJson(opts.fabric, calUrl, notes, 'Calendar');
    if (status !== 200) {
      notes.push(`Calendar index stopped at HTTP ${status}.`);
      break;
    }
    for (const ev of asArray(json)) {
      const eventId = typeof ev.id === 'string' ? ev.id : '';
      if (!eventId) continue;
      const attendees = Array.isArray(ev.attendees)
        ? ev.attendees.map((a) =>
            String((a as { emailAddress?: { address?: string } })?.emailAddress?.address || ''),
          )
        : [];
      const classified = classifyFabricRecord(
        {
          subject: typeof ev.subject === 'string' ? ev.subject : '',
          participants: attendees,
          preview: typeof ev.bodyPreview === 'string' ? ev.bodyPreview : '',
          source: 'calendar',
        },
        clients,
      );
      if (classified.ingest === 'skip') {
        indexed.skipped += 1;
        continue;
      }
      const wroteMeeting = await tryPmIndex(notes, 'SharePoint meeting index write', () =>
        opts.service.upsertMeetingIndex({
          title: (typeof ev.subject === 'string' && ev.subject) || '(no title)',
          summary:
            classified.ingest === 'metadata_link'
              ? 'RESTRICTED — metadata and source link only.'
              : stripSecrets(typeof ev.bodyPreview === 'string' ? ev.bodyPreview : ''),
          clientCode: classified.clientCode,
          date:
            ev.start && typeof ev.start === 'object'
              ? String((ev.start as { dateTime?: string }).dateTime || '')
              : undefined,
          webUrl: typeof ev.webLink === 'string' ? ev.webLink : undefined,
          sourceEventId: eventId,
          classification: classified.classification,
          provenanceSource: 'outlook-calendar',
          idempotencyKey: `cal:${eventId}`,
        }),
      );
      if (wroteMeeting) indexed.meetings += 1;
    }
    calUrl = nextLink(json);
    cp.calendarSkip = calUrl;
  }

  let contactUrl: string | null =
    cp.contactsSkip ||
    `/v1.0/users/${MANNY_ENTRA_OID}/contacts?$select=id,displayName,emailAddresses,companyName,jobTitle,businessPhones&$top=${PAGE_SIZE}`;
  let contactsGraphItems = 0;
  let contactsClassifySkipped = 0;
  for (let page = 0; page < MAX_PAGES && contactUrl; page += 1) {
    const { status, json } = await readFabricJson(opts.fabric, contactUrl, notes, 'Contacts');
    cp.contactsLastStatus = status;
    persistFabricProgress(opts.dataDir, cp, notes);
    if (status !== 200) {
      notes.push(`Contacts index stopped at HTTP ${status}.`);
      persistFabricProgress(opts.dataDir, cp, notes);
      break;
    }
    const pageItems = asArray(json);
    contactsGraphItems += pageItems.length;
    for (const ct of pageItems) {
      const contactId = typeof ct.id === 'string' ? ct.id : '';
      const email =
        Array.isArray(ct.emailAddresses) && ct.emailAddresses[0]
          ? String((ct.emailAddresses[0] as { address?: string }).address || '')
          : '';
      const classified = classifyFabricRecord(
        {
          subject: typeof ct.displayName === 'string' ? ct.displayName : '',
          participants: [email, String(ct.companyName || '')],
          source: 'contacts',
        },
        clients,
      );
      if (classified.ingest === 'skip' || !classified.clientCode) {
        indexed.skipped += 1;
        contactsClassifySkipped += 1;
        continue;
      }
      const wroteContact = await tryPmIndex(notes, 'SharePoint contact index write', () =>
        opts.service.upsertContactIndex({
          title: (typeof ct.displayName === 'string' && ct.displayName) || email || contactId,
          email,
          clientCode: classified.clientCode,
          jobTitle: typeof ct.jobTitle === 'string' ? ct.jobTitle : undefined,
          sourceContactId: contactId,
          provenanceSource: 'outlook-contacts',
          idempotencyKey: `contact:${contactId || email}`,
        }),
      );
      if (wroteContact) indexed.contacts += 1;
    }
    contactUrl = nextLink(json);
    cp.contactsSkip = contactUrl;
    cp.contactsGraphItems = contactsGraphItems;
    cp.contactsClassifySkipped = contactsClassifySkipped;
    persistFabricProgress(opts.dataDir, cp, notes);
  }
  cp.contactsGraphItems = contactsGraphItems;
  cp.contactsClassifySkipped = contactsClassifySkipped;
  if (cp.contactsLastStatus === 200 && contactsGraphItems === 0) {
    notes.push('Contacts Graph returned HTTP 200 with an empty page.');
  } else if (cp.contactsLastStatus === 200 && indexed.contacts === 0 && contactsClassifySkipped > 0) {
    notes.push('Contacts items classify-skipped for missing entitled ClientCode.');
  }

  if (cp.filesSkip && /\/drive\/recent/i.test(cp.filesSkip)) {
    cp.filesSkip = null;
  }
  notes.push(
    'Manny OneDrive recent skipped: Microsoft Graph documents application permissions as not supported for /drive/recent (deprecated). Not claimed as LIVE files.',
  );

  try {
    const sharePoint = await indexBusinessFiles({
      service: opts.service,
      fabric: opts.fabric,
      clients,
      checkpoint: cp.sharePoint || emptySharePointCheckpoint(),
      notes,
    });
    indexed.files += sharePoint.files;
    indexed.skipped += sharePoint.skipped;
    indexed.restricted += sharePoint.restricted;
    cp.sharePoint = sharePoint.checkpoint;
  } catch (err) {
    notes.push(isolatedFailureNote('SharePoint file index skipped', err));
  }

  notes.push('Planner application APIs are delegated-only per current Microsoft Graph docs — not indexed via app-only.');
  notes.push('Online meeting transcripts require a Teams application access policy if Graph returns 403.');
  cp.lastRunAt = new Date().toISOString();
  cp.lastIndexed = { ...indexed };
  cp.lastNotes = sanitizeFabricNotes(pinHonestyNotes(notes));
  cp.counts = {
    mailThreads: (cp.counts.mailThreads || 0) + indexed.mailThreads,
    meetings: (cp.counts.meetings || 0) + indexed.meetings,
    contacts: (cp.counts.contacts || 0) + indexed.contacts,
    files: (cp.counts.files || 0) + indexed.files,
    attachmentsIndexed: (cp.counts.attachmentsIndexed || 0) + indexed.attachmentsIndexed,
  };
  saveCheckpoint(opts.dataDir, cp);
  return { checkpoint: cp, indexed, notes };
  } catch (err) {
    notes.push(isolatedFailureNote('Fabric sync isolated a later source failure', err));
    persistFabricProgress(opts.dataDir, cp, notes);
    cp.lastIndexed = { ...indexed };
    cp.lastNotes = sanitizeFabricNotes(notes);
    saveCheckpoint(opts.dataDir, cp);
    return { checkpoint: cp, indexed, notes };
  }
}
