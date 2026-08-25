/**
 * Deep Microsoft Graph ingestion — paginates until exhausted (safety capped).
 * Covers mail folders, calendar, contacts, OneDrive, SharePoint libraries, Teams (best-effort),
 * and attachment metadata.
 */

import {
  contentHash,
  type CanonicalEntityKind,
  type CanonicalRecord,
  type ConnectionRecord,
  type PermissionMode,
} from '@hvcg/atlas-integration-core';
import { classifyByTitle } from '../../client360/classify.ts';
import { graphFetch } from '../../oauth/microsoft.ts';
import type { IntegrationRepository } from '../../store/repository.ts';

const MAIL_SELECT =
  'id,subject,bodyPreview,receivedDateTime,sentDateTime,webLink,from,toRecipients,ccRecipients,conversationId,hasAttachments,categories';
const EVENT_SELECT =
  'id,subject,bodyPreview,start,end,webLink,organizer,attendees,location,isCancelled';
const CONTACT_SELECT =
  'id,displayName,givenName,surname,companyName,jobTitle,emailAddresses,businessPhones,mobilePhone';
const DRIVE_SELECT = 'id,name,webUrl,file,folder,size,lastModifiedDateTime,createdDateTime,parentReference';

const MAX_PAGES_PER_STREAM = 200;
const PAGE_SIZE = 50;

type GraphPage<T> = {
  value?: T[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function recipientEmails(
  recipients?: Array<{ emailAddress?: { address?: string; name?: string } }>,
): string[] {
  return (recipients || [])
    .map((r) => r.emailAddress?.address)
    .filter((a): a is string => Boolean(a));
}

function fromAddress(from?: { emailAddress?: { address?: string; name?: string } }): {
  email?: string;
  name?: string;
} {
  return {
    email: from?.emailAddress?.address,
    name: from?.emailAddress?.name,
  };
}

export interface DeepSyncStats {
  imported: number;
  duplicates: number;
  skipped: number;
  errorCount: number;
  details: string[];
  pagesFetched: number;
  streams: string[];
}

export async function runMicrosoftDeepSync(opts: {
  repo: IntegrationRepository;
  connectionId: string;
  conn: ConnectionRecord;
  getToken: () => Promise<string>;
  mode?: 'full' | 'incremental';
}): Promise<{ records: CanonicalRecord[]; stats: DeepSyncStats }> {
  const { repo, connectionId, conn, mode } = opts;
  if (mode === 'full') {
    repo.clearCheckpoints(connectionId);
  }

  const stats: DeepSyncStats = {
    imported: 0,
    duplicates: 0,
    skipped: 0,
    errorCount: 0,
    details: [],
    pagesFetched: 0,
    streams: [],
  };
  const allRecords: CanonicalRecord[] = [];
  const batch: CanonicalRecord[] = [];

  const flush = () => {
    if (!batch.length) return;
    const result = repo.upsertSourceRecordsBatch(batch.splice(0, batch.length));
    stats.imported += result.imported;
    stats.duplicates += result.duplicates;
  };

  const push = (record: CanonicalRecord) => {
    allRecords.push(record);
    batch.push(record);
    if (batch.length >= 40) flush();
  };

  const token = await opts.getToken();

  const mailFolders = ['inbox', 'sentitems', 'archive'];
  for (const folder of mailFolders) {
    try {
      const stream = `mail:${folder}`;
      stats.streams.push(stream);
      await paginateMailFolder({
        repo,
        connectionId,
        conn,
        getToken: opts.getToken,
        folder,
        mode,
        onPage: (recs, pages) => {
          stats.pagesFetched += pages;
          for (const r of recs) push(r);
        },
        onAttachments: (recs) => {
          for (const r of recs) push(r);
        },
      });
    } catch (err) {
      stats.errorCount++;
      stats.details.push(
        `mail:${folder}: ${err instanceof Error ? err.message.slice(0, 140) : 'failed'}`,
      );
    }
  }

  try {
    stats.streams.push('calendar');
    await paginateCalendar({
      connectionId,
      conn,
      token: await opts.getToken(),
      onRecords: (recs, pages) => {
        stats.pagesFetched += pages;
        for (const r of recs) push(r);
      },
    });
  } catch (err) {
    stats.errorCount++;
    stats.details.push(
      `calendar: ${err instanceof Error ? err.message.slice(0, 140) : 'failed'}`,
    );
  }

  try {
    stats.streams.push('contacts');
    await paginateContacts({
      connectionId,
      conn,
      token: await opts.getToken(),
      onRecords: (recs, pages) => {
        stats.pagesFetched += pages;
        for (const r of recs) push(r);
      },
    });
  } catch (err) {
    stats.errorCount++;
    stats.details.push(
      `contacts: ${err instanceof Error ? err.message.slice(0, 140) : 'failed'}`,
    );
  }

  try {
    stats.streams.push('onedrive');
    await paginateDriveDelta({
      repo,
      connectionId,
      conn,
      getToken: opts.getToken,
      drivePath: '/me/drive',
      resourceType: 'drive',
      mode,
      onRecords: (recs, pages) => {
        stats.pagesFetched += pages;
        for (const r of recs) push(r);
      },
    });
  } catch (err) {
    stats.errorCount++;
    stats.details.push(
      `onedrive: ${err instanceof Error ? err.message.slice(0, 140) : 'failed'}`,
    );
  }

  const selectedLibs = repo
    .listDiscoveredResources(connectionId)
    .filter(
      (r) =>
        r.selected &&
        (r.resourceType === 'documentLibrary' ||
          r.resourceType === 'site' ||
          r.resourceType === 'drive'),
    );

  for (const lib of selectedLibs) {
    if (lib.resourceType === 'drive' && lib.resourceId) {
      // already covered personal OneDrive via /me/drive; skip duplicates of same id
      continue;
    }
    if (lib.resourceType === 'documentLibrary') {
      const driveId =
        (lib.metadata?.driveId as string | undefined) ||
        (lib.metadata?.id as string | undefined) ||
        lib.resourceId;
      if (!driveId) continue;
      try {
        stats.streams.push(`sharepoint:${lib.displayName || driveId}`);
        await paginateDriveDelta({
          repo,
          connectionId,
          conn,
          getToken: opts.getToken,
          drivePath: `/drives/${encodeURIComponent(driveId)}`,
          resourceType: `drive:${driveId}`,
          mode,
          onRecords: (recs, pages) => {
            stats.pagesFetched += pages;
            for (const r of recs) push(r);
          },
        });
      } catch (err) {
        stats.errorCount++;
        stats.details.push(
          `sharepoint:${lib.displayName}: ${err instanceof Error ? err.message.slice(0, 120) : 'failed'}`,
        );
      }
    }
    if (lib.resourceType === 'site') {
      try {
        const siteId = lib.resourceId;
        const drives = await graphFetch<{ value: Array<{ id: string; name?: string }> }>(
          await opts.getToken(),
          `/sites/${encodeURIComponent(siteId)}/drives?$top=20`,
        );
        for (const d of drives.value || []) {
          stats.streams.push(`site-drive:${d.name || d.id}`);
          await paginateDriveDelta({
            repo,
            connectionId,
            conn,
            getToken: opts.getToken,
            drivePath: `/drives/${encodeURIComponent(d.id)}`,
            resourceType: `drive:${d.id}`,
            mode,
            onRecords: (recs, pages) => {
              stats.pagesFetched += pages;
              for (const r of recs) push(r);
            },
          });
        }
      } catch (err) {
        stats.errorCount++;
        stats.details.push(
          `site:${lib.displayName}: ${err instanceof Error ? err.message.slice(0, 120) : 'failed'}`,
        );
      }
    }
  }

  try {
    stats.streams.push('teams');
    await paginateTeamsBestEffort({
      connectionId,
      conn,
      token: await opts.getToken(),
      onRecords: (recs, pages) => {
        stats.pagesFetched += pages;
        for (const r of recs) push(r);
      },
    });
  } catch (err) {
    stats.errorCount++;
    stats.details.push(`teams: ${err instanceof Error ? err.message.slice(0, 140) : 'failed'}`);
  }

  flush();
  void token;
  return { records: allRecords, stats };
}

async function paginateMailFolder(opts: {
  repo: IntegrationRepository;
  connectionId: string;
  conn: ConnectionRecord;
  getToken: () => Promise<string>;
  folder: string;
  mode?: 'full' | 'incremental';
  onPage: (records: CanonicalRecord[], pages: number) => void;
  onAttachments: (records: CanonicalRecord[]) => void;
}) {
  const checkpointKey = `mail:${opts.folder}`;
  let path: string | undefined;
  if (opts.mode !== 'full') {
    const cp = opts.repo.getCheckpoint(opts.connectionId, checkpointKey);
    if (cp?.deltaToken) path = cp.deltaToken;
  }
  if (!path) {
    path = `/me/mailFolders/${opts.folder}/messages?$top=${PAGE_SIZE}&$orderby=receivedDateTime%20desc&$select=${MAIL_SELECT}&$expand=attachments($select=id,name,contentType,size)`;
  }

  let pages = 0;
  let link: string | undefined = path;
  const attachmentRecords: CanonicalRecord[] = [];

  while (link && pages < MAX_PAGES_PER_STREAM) {
    pages++;
    const token = await opts.getToken();
    let data: GraphPage<{
      id: string;
      subject?: string;
      bodyPreview?: string;
      receivedDateTime?: string;
      sentDateTime?: string;
      webLink?: string;
      from?: { emailAddress?: { address?: string; name?: string } };
      toRecipients?: Array<{ emailAddress?: { address?: string; name?: string } }>;
      ccRecipients?: Array<{ emailAddress?: { address?: string; name?: string } }>;
      conversationId?: string;
      hasAttachments?: boolean;
      categories?: string[];
      attachments?: Array<{ id: string; name?: string; contentType?: string; size?: number; '@odata.type'?: string }>;
      '@removed'?: unknown;
    }>;
    try {
      data = await graphFetch(token, link);
    } catch {
      // Fall back if folder name invalid
      if (pages === 1 && opts.folder === 'archive') {
        const folders = await graphFetch<{ value: Array<{ id: string }> }>(
          token,
          `/me/mailFolders?$filter=displayName%20eq%20'Archive'&$top=1`,
        );
        const archiveId = folders.value?.[0]?.id;
        if (!archiveId) break;
        link = `/me/mailFolders/${archiveId}/messages?$top=${PAGE_SIZE}&$orderby=receivedDateTime%20desc&$select=${MAIL_SELECT}&$expand=attachments($select=id,name,contentType,size)`;
        continue;
      }
      throw new Error(`mail folder ${opts.folder} failed`);
    }

    const pageRecords: CanonicalRecord[] = [];
    for (const msg of data.value || []) {
      if (msg['@removed']) continue;
      pageRecords.push(toEmailRecord(opts.connectionId, opts.conn, msg, opts.folder));
      for (const a of msg.attachments || []) {
        if (!a.name || a['@odata.type']?.includes('itemAttachment')) continue;
        attachmentRecords.push(
          toAttachmentRecord(opts.connectionId, opts.conn, msg.id, a, msg.subject),
        );
      }
    }
    opts.onPage(pageRecords, 1);
    link = data['@odata.nextLink'];
    if (!link && data['@odata.deltaLink']) {
      opts.repo.saveCheckpoint({
        connectionId: opts.connectionId,
        resourceType: checkpointKey,
        deltaToken: data['@odata.deltaLink'],
        updatedAt: nowIso(),
      });
    }
    if (link) {
      opts.repo.saveCheckpoint({
        connectionId: opts.connectionId,
        resourceType: checkpointKey,
        deltaToken: link,
        updatedAt: nowIso(),
      });
    }
  }

  if (attachmentRecords.length) opts.onAttachments(attachmentRecords);
}

async function paginateCalendar(opts: {
  connectionId: string;
  conn: ConnectionRecord;
  token: string;
  onRecords: (records: CanonicalRecord[], pages: number) => void;
}) {
  type EventRow = {
    id: string;
    subject?: string;
    bodyPreview?: string;
    start?: { dateTime?: string };
    end?: { dateTime?: string };
    webLink?: string;
    organizer?: { emailAddress?: { address?: string; name?: string } };
    attendees?: Array<{ emailAddress?: { address?: string; name?: string } }>;
    location?: { displayName?: string };
    isCancelled?: boolean;
  };
  let link: string | undefined =
    `/me/events?$top=${PAGE_SIZE}&$orderby=start/dateTime%20desc&$select=${EVENT_SELECT}`;
  let pages = 0;
  while (link && pages < MAX_PAGES_PER_STREAM) {
    pages++;
    const path = link;
    const data: GraphPage<EventRow> = await graphFetch(opts.token, path);
    const records = (data.value || [])
      .filter((e: EventRow) => !e.isCancelled)
      .map((e: EventRow) => toMeetingRecord(opts.connectionId, opts.conn, e));
    opts.onRecords(records, 1);
    link = data['@odata.nextLink'];
  }
}

async function paginateContacts(opts: {
  connectionId: string;
  conn: ConnectionRecord;
  token: string;
  onRecords: (records: CanonicalRecord[], pages: number) => void;
}) {
  type ContactRow = {
    id: string;
    displayName?: string;
    givenName?: string;
    surname?: string;
    companyName?: string;
    jobTitle?: string;
    emailAddresses?: Array<{ address?: string; name?: string }>;
    businessPhones?: string[];
    mobilePhone?: string;
  };
  let link: string | undefined = `/me/contacts?$top=${PAGE_SIZE}&$select=${CONTACT_SELECT}`;
  let pages = 0;
  while (link && pages < MAX_PAGES_PER_STREAM) {
    pages++;
    const path = link;
    const data: GraphPage<ContactRow> = await graphFetch(opts.token, path);
    const records = (data.value || []).map((c: ContactRow) =>
      toContactRecord(opts.connectionId, opts.conn, c),
    );
    opts.onRecords(records, 1);
    link = data['@odata.nextLink'];
  }
}

async function paginateDriveDelta(opts: {
  repo: IntegrationRepository;
  connectionId: string;
  conn: ConnectionRecord;
  getToken: () => Promise<string>;
  drivePath: string;
  resourceType: string;
  mode?: 'full' | 'incremental';
  onRecords: (records: CanonicalRecord[], pages: number) => void;
}) {
  let link: string | undefined;
  if (opts.mode !== 'full') {
    const cp = opts.repo.getCheckpoint(opts.connectionId, opts.resourceType);
    if (cp?.deltaToken) link = cp.deltaToken;
  }
  if (!link) {
    link = `${opts.drivePath}/root/delta?$top=${PAGE_SIZE}&$select=${DRIVE_SELECT}`;
  }

  let pages = 0;
  while (link && pages < MAX_PAGES_PER_STREAM) {
    pages++;
    const token = await opts.getToken();
    let data: GraphPage<{
      id: string;
      name?: string;
      webUrl?: string;
      file?: unknown;
      folder?: unknown;
      size?: number;
      lastModifiedDateTime?: string;
      createdDateTime?: string;
      parentReference?: { driveId?: string; path?: string };
    }>;
    try {
      data = await graphFetch(token, link);
    } catch {
      // delta unsupported — fall back to children listing once
      if (pages === 1) {
        data = await graphFetch(
          token,
          `${opts.drivePath}/root/children?$top=${PAGE_SIZE}&$select=${DRIVE_SELECT}`,
        );
      } else {
        break;
      }
    }
    const records = (data.value || [])
      .filter((i) => i.file || (!i.folder && i.name))
      .map((i) => toDocumentRecord(opts.connectionId, opts.conn, i));
    opts.onRecords(records, 1);
    const next = data['@odata.nextLink'];
    const delta = data['@odata.deltaLink'];
    link = next;
    if (delta || next) {
      opts.repo.saveCheckpoint({
        connectionId: opts.connectionId,
        resourceType: opts.resourceType,
        deltaToken: next || delta,
        updatedAt: nowIso(),
      });
    }
  }
}

async function paginateTeamsBestEffort(opts: {
  connectionId: string;
  conn: ConnectionRecord;
  token: string;
  onRecords: (records: CanonicalRecord[], pages: number) => void;
}) {
  const teams = await graphFetch<{ value: Array<{ id: string; displayName?: string }> }>(
    opts.token,
    '/me/joinedTeams?$top=50',
  ).catch(() => ({ value: [] as Array<{ id: string; displayName?: string }> }));

  const records: CanonicalRecord[] = [];
  for (const team of teams.value || []) {
    records.push({
      kind: 'Communication',
      id: crypto.randomUUID(),
      title: team.displayName || team.id,
      summary: 'Microsoft Team',
      fields: {
        connectionId: opts.connectionId,
        teamId: team.id,
        resourceType: 'team',
      },
      provenance: {
        provider: 'microsoft',
        sourceSystem: 'teams',
        sourceAccount: opts.connectionId,
        sourceRecordId: `team:${team.id}`,
        importedAt: nowIso(),
        lastSynchronizedAt: nowIso(),
        contentHash: contentHash(team.id),
        atlasRecordId: crypto.randomUUID(),
        confidenceLevel: 0.7,
        permissionClassification: opts.conn.permissionMode,
      },
    });
  }
  if (records.length) opts.onRecords(records, 1);
}

function permissionOf(conn: ConnectionRecord): PermissionMode {
  return conn.permissionMode;
}

function toEmailRecord(
  connectionId: string,
  conn: ConnectionRecord,
  msg: {
    id: string;
    subject?: string;
    bodyPreview?: string;
    receivedDateTime?: string;
    sentDateTime?: string;
    webLink?: string;
    from?: { emailAddress?: { address?: string; name?: string } };
    toRecipients?: Array<{ emailAddress?: { address?: string; name?: string } }>;
    ccRecipients?: Array<{ emailAddress?: { address?: string; name?: string } }>;
    conversationId?: string;
    hasAttachments?: boolean;
    categories?: string[];
  },
  folder: string,
): CanonicalRecord {
  const now = nowIso();
  const from = fromAddress(msg.from);
  const to = recipientEmails(msg.toRecipients);
  const cc = recipientEmails(msg.ccRecipients);
  return {
    kind: 'Email',
    id: crypto.randomUUID(),
    title: msg.subject || '(no subject)',
    summary: msg.bodyPreview,
    fields: {
      connectionId,
      messageId: msg.id,
      webLink: msg.webLink,
      folder,
      from: from.email,
      fromName: from.name,
      to,
      cc,
      conversationId: msg.conversationId,
      hasAttachments: Boolean(msg.hasAttachments),
      categories: msg.categories || [],
      businessEntity: conn.businessEntity,
      accountEmail: conn.accountEmail,
      occurredAt: msg.receivedDateTime || msg.sentDateTime,
    },
    provenance: {
      provider: 'microsoft',
      sourceSystem: 'outlook',
      sourceAccount: connectionId,
      sourceRecordId: msg.id,
      sourceUrl: msg.webLink,
      originalModifiedAt: msg.receivedDateTime || msg.sentDateTime,
      importedAt: now,
      lastSynchronizedAt: now,
      contentHash: contentHash(JSON.stringify({ id: msg.id, subject: msg.subject })),
      atlasRecordId: crypto.randomUUID(),
      confidenceLevel: 1,
      permissionClassification: permissionOf(conn),
    },
  };
}

function toAttachmentRecord(
  connectionId: string,
  conn: ConnectionRecord,
  messageId: string,
  att: { id: string; name?: string; contentType?: string; size?: number },
  subject?: string,
): CanonicalRecord {
  const now = nowIso();
  const kind = classifyByTitle(att.name) === 'Document' ? 'Attachment' : classifyByTitle(att.name);
  return {
    kind: kind as CanonicalEntityKind,
    id: crypto.randomUUID(),
    title: att.name || att.id,
    summary: subject ? `Attachment on: ${subject}` : undefined,
    fields: {
      connectionId,
      attachmentId: att.id,
      messageId,
      contentType: att.contentType,
      size: att.size,
      parentSubject: subject,
      documentClass: classifyByTitle(att.name),
      businessEntity: conn.businessEntity,
      accountEmail: conn.accountEmail,
    },
    provenance: {
      provider: 'microsoft',
      sourceSystem: 'outlook',
      sourceAccount: connectionId,
      sourceRecordId: `${messageId}::${att.id}`,
      importedAt: now,
      lastSynchronizedAt: now,
      contentHash: contentHash(`${messageId}:${att.id}:${att.name}`),
      atlasRecordId: crypto.randomUUID(),
      confidenceLevel: 1,
      permissionClassification: permissionOf(conn),
    },
  };
}

function toMeetingRecord(
  connectionId: string,
  conn: ConnectionRecord,
  ev: {
    id: string;
    subject?: string;
    bodyPreview?: string;
    start?: { dateTime?: string };
    end?: { dateTime?: string };
    webLink?: string;
    organizer?: { emailAddress?: { address?: string; name?: string } };
    attendees?: Array<{ emailAddress?: { address?: string; name?: string } }>;
    location?: { displayName?: string };
  },
): CanonicalRecord {
  const now = nowIso();
  const attendees = (ev.attendees || [])
    .map((a) => a.emailAddress?.address)
    .filter((a): a is string => Boolean(a));
  return {
    kind: 'Meeting',
    id: crypto.randomUUID(),
    title: ev.subject || '(no subject)',
    summary: ev.bodyPreview,
    fields: {
      connectionId,
      eventId: ev.id,
      webLink: ev.webLink,
      organizer: ev.organizer?.emailAddress?.address,
      organizerName: ev.organizer?.emailAddress?.name,
      attendees,
      location: ev.location?.displayName,
      start: ev.start?.dateTime,
      end: ev.end?.dateTime,
      occurredAt: ev.start?.dateTime,
      businessEntity: conn.businessEntity,
      accountEmail: conn.accountEmail,
    },
    provenance: {
      provider: 'microsoft',
      sourceSystem: 'outlook-calendar',
      sourceAccount: connectionId,
      sourceRecordId: ev.id,
      sourceUrl: ev.webLink,
      originalCreatedAt: ev.start?.dateTime,
      importedAt: now,
      lastSynchronizedAt: now,
      contentHash: contentHash(JSON.stringify({ id: ev.id, subject: ev.subject })),
      atlasRecordId: crypto.randomUUID(),
      confidenceLevel: 1,
      permissionClassification: permissionOf(conn),
    },
  };
}

function toContactRecord(
  connectionId: string,
  conn: ConnectionRecord,
  c: {
    id: string;
    displayName?: string;
    givenName?: string;
    surname?: string;
    companyName?: string;
    jobTitle?: string;
    emailAddresses?: Array<{ address?: string; name?: string }>;
    businessPhones?: string[];
    mobilePhone?: string;
  },
): CanonicalRecord {
  const now = nowIso();
  const emails = (c.emailAddresses || [])
    .map((e) => e.address)
    .filter((a): a is string => Boolean(a));
  return {
    kind: 'Person',
    id: crypto.randomUUID(),
    title: c.displayName || emails[0] || c.id,
    summary: c.companyName || c.jobTitle,
    fields: {
      connectionId,
      contactId: c.id,
      companyName: c.companyName,
      jobTitle: c.jobTitle,
      emails,
      phone: c.mobilePhone || c.businessPhones?.[0],
      businessPhones: c.businessPhones || [],
      businessEntity: conn.businessEntity,
      accountEmail: conn.accountEmail,
    },
    provenance: {
      provider: 'microsoft',
      sourceSystem: 'outlook-contacts',
      sourceAccount: connectionId,
      sourceRecordId: c.id,
      importedAt: now,
      lastSynchronizedAt: now,
      contentHash: contentHash(JSON.stringify({ id: c.id, emails })),
      atlasRecordId: crypto.randomUUID(),
      confidenceLevel: 1,
      permissionClassification: permissionOf(conn),
    },
  };
}

function toDocumentRecord(
  connectionId: string,
  conn: ConnectionRecord,
  item: {
    id: string;
    name?: string;
    webUrl?: string;
    size?: number;
    lastModifiedDateTime?: string;
    createdDateTime?: string;
    parentReference?: { driveId?: string; path?: string };
  },
): CanonicalRecord {
  const now = nowIso();
  const classified = classifyByTitle(item.name);
  return {
    kind: classified,
    id: crypto.randomUUID(),
    title: item.name || item.id,
    fields: {
      connectionId,
      itemId: item.id,
      webUrl: item.webUrl,
      size: item.size,
      driveId: item.parentReference?.driveId,
      path: item.parentReference?.path,
      documentClass: classified,
      businessEntity: conn.businessEntity,
      accountEmail: conn.accountEmail,
      occurredAt: item.lastModifiedDateTime || item.createdDateTime,
    },
    provenance: {
      provider: 'microsoft',
      sourceSystem: 'sharepoint',
      sourceAccount: connectionId,
      sourceRecordId: item.id,
      sourceUrl: item.webUrl,
      originalModifiedAt: item.lastModifiedDateTime,
      originalCreatedAt: item.createdDateTime,
      importedAt: now,
      lastSynchronizedAt: now,
      contentHash: contentHash(JSON.stringify({ id: item.id, name: item.name })),
      atlasRecordId: crypto.randomUUID(),
      confidenceLevel: 1,
      permissionClassification: permissionOf(conn),
    },
  };
}
