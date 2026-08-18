/**
 * Restartable information-fabric backfill.
 * Outlook remains SoR. Atlas stores thread-level index rows only.
 * Checkpoints + source IDs. No mailbox byte-copy. No unbounded loops.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AtlasPrincipal } from '../../../middleware/auth.ts';
import { assertMannyOnly } from '../manny.ts';
import { MANNY_ENTRA_OID } from '../manny.ts';
import type { SharePointPmService } from '../repository.ts';
import { classifyFabricRecord, stripSecrets, type ClientHint } from './classify.ts';
import { fileIndexSummary } from './fileIndex.ts';
import {
  emptySharePointCheckpoint,
  indexBusinessFiles,
  type SharePointFileCheckpoint,
} from './files.ts';
import type { FabricGraphClient } from './graph.ts';

const MAX_PAGES = 8;
const PAGE_SIZE = 50;

export interface FabricCheckpoint {
  mailSkip: string | null;
  calendarSkip: string | null;
  contactsSkip: string | null;
  filesSkip: string | null;
  sharePoint?: SharePointFileCheckpoint;
  lastRunAt?: string;
  counts: Record<string, number>;
}

export interface FabricSyncResult {
  checkpoint: FabricCheckpoint;
  indexed: {
    mailThreads: number;
    meetings: number;
    contacts: number;
    files: number;
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
  const clients = (await opts.service.listClientHints()).map(
    (c): ClientHint => ({
      clientCode: c.clientCode,
      displayName: c.displayName,
      dba: c.dba,
      domains: [],
    }),
  );
  const cp = loadCheckpoint(opts.dataDir);
  const indexed = { mailThreads: 0, meetings: 0, contacts: 0, files: 0, skipped: 0, restricted: 0 };

  const seenConversations = new Set<string>();
  let mailUrl =
    cp.mailSkip ||
    `/v1.0/users/${MANNY_ENTRA_OID}/messages?$select=id,conversationId,internetMessageId,subject,from,toRecipients,ccRecipients,receivedDateTime,webLink,bodyPreview&$top=${PAGE_SIZE}&$orderby=receivedDateTime desc`;
  for (let page = 0; page < MAX_PAGES && mailUrl; page += 1) {
    const { status, json } = await opts.fabric.getJson(mailUrl);
    if (status !== 200) {
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
      await opts.service.upsertCommunicationIndex({
        title: (typeof msg.subject === 'string' && msg.subject) || '(no subject)',
        summary,
        clientCode: classified.clientCode,
        date: typeof msg.receivedDateTime === 'string' ? msg.receivedDateTime : undefined,
        channel: 'Email',
        direction: from.toLowerCase().endsWith('@highvaluecapitalgroup.com') ? 'Outbound' : 'Inbound',
        webUrl: typeof msg.webLink === 'string' ? msg.webLink : undefined,
        sourceMessageId: messageId,
        conversationId: conversationId || messageId,
        classification: classified.classification,
        provenanceSource: 'outlook-mail',
        sourceOrg: 'HVCG',
        idempotencyKey: `mail:${conversationId || messageId}`,
      });
      indexed.mailThreads += 1;
    }
    mailUrl = nextLink(json);
    cp.mailSkip = mailUrl;
  }

  let calUrl =
    cp.calendarSkip ||
    `/v1.0/users/${MANNY_ENTRA_OID}/calendar/events?$select=id,subject,start,end,organizer,attendees,webLink,onlineMeetingUrl,bodyPreview&$top=${PAGE_SIZE}&$orderby=start/dateTime desc`;
  for (let page = 0; page < MAX_PAGES && calUrl; page += 1) {
    const { status, json } = await opts.fabric.getJson(calUrl);
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
      await opts.service.upsertMeetingIndex({
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
      });
      indexed.meetings += 1;
    }
    calUrl = nextLink(json);
    cp.calendarSkip = calUrl;
  }

  let contactUrl =
    cp.contactsSkip ||
    `/v1.0/users/${MANNY_ENTRA_OID}/contacts?$select=id,displayName,emailAddresses,companyName,jobTitle,businessPhones&$top=${PAGE_SIZE}`;
  for (let page = 0; page < MAX_PAGES && contactUrl; page += 1) {
    const { status, json } = await opts.fabric.getJson(contactUrl);
    if (status !== 200) {
      notes.push(`Contacts index stopped at HTTP ${status}.`);
      break;
    }
    for (const ct of asArray(json)) {
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
        continue;
      }
      await opts.service.upsertContactIndex({
        title: (typeof ct.displayName === 'string' && ct.displayName) || email || contactId,
        email,
        clientCode: classified.clientCode,
        jobTitle: typeof ct.jobTitle === 'string' ? ct.jobTitle : undefined,
        sourceContactId: contactId,
        provenanceSource: 'outlook-contacts',
        idempotencyKey: `contact:${contactId || email}`,
      });
      indexed.contacts += 1;
    }
    contactUrl = nextLink(json);
    cp.contactsSkip = contactUrl;
  }

  let fileUrl = cp.filesSkip || `/v1.0/users/${MANNY_ENTRA_OID}/drive/recent?$top=${PAGE_SIZE}`;
  for (let page = 0; page < 4 && fileUrl; page += 1) {
    const { status, json } = await opts.fabric.getJson(fileUrl);
    if (status !== 200) {
      notes.push(`Manny OneDrive recent stopped at HTTP ${status}.`);
      break;
    }
    for (const file of asArray(json)) {
      const itemId = typeof file.id === 'string' ? file.id : '';
      const name = typeof file.name === 'string' ? file.name : '';
      const webUrl = typeof file.webUrl === 'string' ? file.webUrl : undefined;
      const classified = classifyFabricRecord({ subject: name, preview: name, source: 'onedrive' }, clients);
      if (classified.ingest === 'skip') {
        indexed.skipped += 1;
        continue;
      }
      const restricted = classified.ingest === 'metadata_link';
      if (restricted) indexed.restricted += 1;
      const key = `file:${itemId}`;
      await opts.service.upsertCommunicationIndex({
        title: name || itemId,
        summary: fileIndexSummary({ restricted, webUrl, idempotencyKey: key }),
        clientCode: classified.clientCode,
        channel: 'Other',
        webUrl,
        sourceMessageId: itemId,
        classification: classified.classification,
        provenanceSource: 'onedrive',
        sourceOrg: 'HVCG',
        idempotencyKey: key,
      });
      indexed.files += 1;
    }
    fileUrl = nextLink(json);
    cp.filesSkip = fileUrl;
  }

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

  notes.push('Planner application APIs are delegated-only per current Microsoft Graph docs — not indexed via app-only.');
  notes.push('Online meeting transcripts require a Teams application access policy if Graph returns 403.');
  cp.lastRunAt = new Date().toISOString();
  cp.counts = {
    mailThreads: (cp.counts.mailThreads || 0) + indexed.mailThreads,
    meetings: (cp.counts.meetings || 0) + indexed.meetings,
    contacts: (cp.counts.contacts || 0) + indexed.contacts,
    files: (cp.counts.files || 0) + indexed.files,
  };
  saveCheckpoint(opts.dataDir, cp);
  return { checkpoint: cp, indexed, notes };
}
