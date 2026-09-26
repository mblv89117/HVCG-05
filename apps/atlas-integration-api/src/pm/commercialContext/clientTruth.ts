/**
 * Client truth composition — one operating picture from existing Atlas stores.
 * Not a second CRM. Never invents contacts, amounts, lender facts, or certified finance/growth.
 *
 * Mission: ATLAS-W2C-ACCG01-HONEST-REAL-CLIENT-PROOF
 */

import {
  ClientIdentityRegistry,
  PRODUCTION_CLIENT_IDENTITY_SEED,
  type ClientIdentityMapping,
} from '@hvcg/atlas-identity-map';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { entityBoundaryFor, isAccgReadOnly } from '../sharepoint/knowledgeClassification.ts';
import { hvsActionableClientKnowledge } from '../sharepoint/hvsActionableClientKnowledge.ts';
import { hvsRecoveredDocuments } from '../sharepoint/hvsRecoveredDocuments.ts';
import { hvsRecoveredProjects } from '../sharepoint/hvsRecoveredProjects.ts';
import { hvsRecoveredCapitalPackets } from '../sharepoint/hvsRecoveredClientRecords.ts';
import {
  filterOwnerFacingProjects,
  filterOwnerFacingTasks,
  filterOwnerFacingWorkspaceItems,
  isHygieneTargetedSource,
  sourceRecordKey,
  type WorkspaceHygieneSummary,
} from '../sharepoint/operatingRecordHygiene.ts';
import type {
  OperatorOperatingItem,
  OperatorOperatingPicture,
} from '../operatorDesk/types.ts';
import { growth360ApprovalId } from '../../modules/ingest/campaignApproval.ts';
import { gccObservationHonestyLine, redactFinancialDollars } from '../../modules/ingest/gccValueSignal.ts';
import type { OperatorCommercialContext } from './types.ts';

export const CLIENT_TRUTH_CONTRACT = 'atlas-client-truth.v1' as const;
export const CLIENT_TRUTH_MISSION_KEY = 'ATLAS-W2C-ACCG01-HONEST-REAL-CLIENT-PROOF' as const;

export const TRUTH_CLASSIFICATIONS = [
  'CONFIRMED',
  'LIKELY',
  'PROPOSED',
  'STALE_OR_UNCERTAIN',
  'MISSING',
  'NOT_CERTIFIED',
  'NOT_APPLICABLE',
] as const;
export type TruthClassification = (typeof TRUTH_CLASSIFICATIONS)[number];

export const DOMAIN_COMPLETENESS = [
  'VERIFIED',
  'INDEXED',
  'PARTIAL',
  'MISSING',
  'NOT_CERTIFIED',
  'NOT_APPLICABLE',
] as const;
export type DomainCompleteness = (typeof DOMAIN_COMPLETENESS)[number];

export type OperatingPosture =
  | 'ACTIVE_CLIENT_CONTEXT_RECOVERY'
  | 'LEGACY_CLIENT_RECONCILIATION'
  | 'STANDARD';

export type TruthProvenance = { source: string; detail: string };

export type DomainTruth = {
  domain: string;
  completeness: DomainCompleteness;
  classification: TruthClassification;
  summary: string;
  provenance: TruthProvenance[];
};

export type ContactCandidate = {
  displayName?: string;
  email?: string;
  source: string;
  sourceId: string;
  classification: 'PROPOSED';
  writeStatus: 'CANDIDATE_NOT_CREATED';
  provenance: TruthProvenance;
};

export type TruthQueueItem = {
  id: string;
  title: string;
  classification: TruthClassification;
  source: string;
  evidence?: string;
};

export type TruthQueues = {
  needsAction: TruthQueueItem[];
  waiting: TruthQueueItem[];
  overdue: TruthQueueItem[];
  blocked: TruthQueueItem[];
  decisionRequired: TruthQueueItem[];
  atRisk: TruthQueueItem[];
  ready: TruthQueueItem[];
  outcomes: TruthQueueItem[];
};

export type TruthAnswer = {
  question: string;
  text: string;
  classification: TruthClassification;
  provenance: TruthProvenance[];
};

export type WorkspaceTruthSnapshot = {
  clientCode: string;
  displayName?: string;
  clientStage?: string;
  engagementType?: string;
  projects?: Array<{
    id: string;
    name: string;
    projectType?: string;
    status?: string;
    health?: string;
    nextAction?: string;
    ownerName?: string;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    status?: string;
    dueDate?: string;
    blocker?: string;
    requiresApproval?: boolean;
    nextAction?: string;
    projectId?: string;
    /** Present only when the source row carried an exact ClientCode. */
    clientCode?: string;
  }>;
  documents?: {
    queried: boolean;
    items: Array<{ id: string; title: string; source?: string; kind?: string; clientCode?: string }>;
    reason?: string;
    /** Set when the file-index walk did not finish. Not MISSING and not INDEXED. */
    availability?: 'SOURCE_UNAVAILABLE';
  };
  communications?: {
    queried: boolean;
    items: Array<Record<string, unknown>>;
    reason?: string;
    status?: 'COMPLETE' | 'PARTIAL_SOURCE_DATA_NOT_FOUND' | 'BLOCKED_AMBIGUOUS_IDENTITY' | 'SOURCE_UNAVAILABLE';
  };
  meetings?: {
    queried: boolean;
    items: Array<Record<string, unknown>>;
    reason?: string;
    status?: 'COMPLETE' | 'PARTIAL_SOURCE_DATA_NOT_FOUND' | 'BLOCKED_AMBIGUOUS_IDENTITY' | 'SOURCE_UNAVAILABLE';
  };
  engagements?: {
    queried: boolean;
    items: Array<Record<string, unknown>>;
    reason?: string;
    status?: 'COMPLETE' | 'PARTIAL_SOURCE_DATA_NOT_FOUND' | 'BLOCKED_AMBIGUOUS_IDENTITY' | 'SOURCE_UNAVAILABLE';
  };
  contacts?: {
    queried: boolean;
    items: Array<Record<string, unknown>>;
    reason?: string;
    status?: 'COMPLETE' | 'PARTIAL_SOURCE_DATA_NOT_FOUND' | 'BLOCKED_AMBIGUOUS_IDENTITY' | 'SOURCE_UNAVAILABLE';
  };
  decisionsRisks?: {
    queried: boolean;
    items: Array<Record<string, unknown>>;
    reason?: string;
    status?: 'COMPLETE' | 'PARTIAL_SOURCE_DATA_NOT_FOUND' | 'BLOCKED_AMBIGUOUS_IDENTITY' | 'SOURCE_UNAVAILABLE';
  };
  timeline?: Array<{ at: string; kind: string; title: string; source: string; id: string }>;
  nextActions?: Array<{ text: string; evidence?: Array<{ source: string; kind?: string; id: string; field?: string }> }>;
  /** Present when Hub workspace applied operating-record hygiene. */
  hygiene?: WorkspaceHygieneSummary;
};

export type ClientTruthModel = {
  contractVersion: typeof CLIENT_TRUTH_CONTRACT;
  missionKey: typeof CLIENT_TRUTH_MISSION_KEY;
  clientCode: string;
  displayName?: string;
  entitled: true;
  invented: false;
  operatingPosture: OperatingPosture;
  writePolicy: 'read_only' | 'normal' | 'none';
  identity: DomainTruth;
  contacts: DomainTruth;
  engagements: DomainTruth;
  projects: DomainTruth;
  documents: DomainTruth;
  communications: DomainTruth;
  /** Entitled HVCG_Meetings slice. Not the workspace timeline. */
  meetings: DomainTruth;
  financialContext: DomainTruth;
  growthContext: DomainTruth;
  capitalContext: DomainTruth;
  contactCandidates: ContactCandidate[];
  queues: TruthQueues;
  answers: Record<string, TruthAnswer>;
  globalAutoRespond: false;
  capitalSubmit: false;
  liveGtmOutbound: false;
  canExecute: false;
};

const PRODUCTION_IDENTITY = new ClientIdentityRegistry(PRODUCTION_CLIENT_IDENTITY_SEED);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const FORBIDDEN_CAPITAL_CLAIM =
  /\b(lender approval|funding commitment|targetamount|borrowing base|receivable eligibility|dscr|ltv\s*[:=]|committed funded)\b/i;

function emptyQueues(): TruthQueues {
  return {
    needsAction: [],
    waiting: [],
    overdue: [],
    blocked: [],
    decisionRequired: [],
    atRisk: [],
    ready: [],
    outcomes: [],
  };
}

function todayStamp(now?: string): string {
  const t = now ? Date.parse(now) : Date.now();
  return new Date(Number.isFinite(t) ? t : Date.now()).toISOString().slice(0, 10);
}

function sectionCount(section?: { queried: boolean; items: unknown[] }): number {
  return section?.queried ? section.items.length : 0;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function extractEmail(item: Record<string, unknown>): string | undefined {
  for (const key of ['email', 'fromEmail', 'senderEmail', 'contactEmail', 'from', 'sender']) {
    const raw = asText(item[key]);
    const match = raw.match(EMAIL_RE);
    if (match) return match[0].toLowerCase();
  }
  const title = asText(item.title);
  const titleMatch = title.match(EMAIL_RE);
  return titleMatch ? titleMatch[0].toLowerCase() : undefined;
}

function extractDisplayName(item: Record<string, unknown>, email?: string): string | undefined {
  for (const key of ['contactName', 'displayName', 'fromName', 'name', 'title']) {
    const raw = asText(item[key]);
    if (raw && !EMAIL_RE.test(raw)) return raw;
  }
  return email;
}

export function workspaceSnapshotFromPayload(payload: {
  overview?: { clientCode: string; displayName?: string; clientStage?: string; engagementType?: string };
  client?: { clientCode: string; displayName?: string; clientStage?: string; engagementType?: string };
  projects?: WorkspaceTruthSnapshot['projects'];
  tasks?: WorkspaceTruthSnapshot['tasks'];
  documents?: WorkspaceTruthSnapshot['documents'] & { status?: string };
  communications?: WorkspaceTruthSnapshot['communications'];
  meetings?: WorkspaceTruthSnapshot['meetings'];
  engagements?: WorkspaceTruthSnapshot['engagements'];
  contacts?: WorkspaceTruthSnapshot['contacts'];
  decisionsRisks?: WorkspaceTruthSnapshot['decisionsRisks'];
  timeline?: WorkspaceTruthSnapshot['timeline'];
  nextActions?: Array<{ text: string; evidence?: Array<{ source: string; kind?: string; id: string; field?: string }> }>;
  hygiene?: WorkspaceHygieneSummary;
}): WorkspaceTruthSnapshot | undefined {
  const clientCode = payload.overview?.clientCode || payload.client?.clientCode;
  if (!clientCode) return undefined;
  return {
    clientCode,
    displayName: payload.overview?.displayName || payload.client?.displayName,
    clientStage: payload.overview?.clientStage || payload.client?.clientStage,
    engagementType: payload.overview?.engagementType || payload.client?.engagementType,
    projects: payload.projects,
    tasks: payload.tasks,
    documents: payload.documents
      ? {
          queried: payload.documents.queried,
          items: payload.documents.availability === 'SOURCE_UNAVAILABLE' || payload.documents.status === 'SOURCE_UNAVAILABLE'
            ? []
            : payload.documents.items,
          reason: payload.documents.reason,
          availability:
            payload.documents.availability === 'SOURCE_UNAVAILABLE' || payload.documents.status === 'SOURCE_UNAVAILABLE'
              ? 'SOURCE_UNAVAILABLE'
              : undefined,
        }
      : undefined,
    communications: payload.communications,
    meetings: payload.meetings
      ? payload.meetings.status === 'SOURCE_UNAVAILABLE'
        ? {
            queried: false,
            items: [],
            reason: payload.meetings.reason,
            status: 'SOURCE_UNAVAILABLE',
          }
        : payload.meetings
      : undefined,
    engagements: payload.engagements,
    contacts: payload.contacts
      ? payload.contacts.status === 'SOURCE_UNAVAILABLE'
        ? {
            queried: false,
            items: [],
            reason: payload.contacts.reason,
            status: 'SOURCE_UNAVAILABLE',
          }
        : payload.contacts
      : undefined,
    decisionsRisks: payload.decisionsRisks,
    timeline: payload.timeline,
    nextActions: payload.nextActions,
    hygiene: payload.hygiene,
  };
}

/**
 * Defense-in-depth: ensure TEST_HARDENING / INTERNAL_SYSTEM / UNKNOWN / HISTORICAL
 * never enter owner-facing composition even if a caller skipped workspace filtering.
 */
export function applyOperatingHygieneToWorkspaceSnapshot(
  workspace?: WorkspaceTruthSnapshot,
): WorkspaceTruthSnapshot | undefined {
  if (!workspace) return undefined;
  const projectHygiene = filterOwnerFacingProjects(
    (workspace.projects || []).map((p) => ({
      ...p,
      name: p.name,
      id: p.id,
      clientCode: workspace.clientCode,
    })),
  );
  const taskHygiene = filterOwnerFacingTasks(
    (workspace.tasks || []).map((t) => ({
      ...t,
      clientCode: workspace.clientCode,
    })),
    projectHygiene.byId,
  );
  const decisionHygiene = workspace.decisionsRisks
    ? filterOwnerFacingWorkspaceItems(workspace.decisionsRisks.items, {
        clientCode: workspace.clientCode,
      })
    : undefined;
  const allowedKeys = new Set<string>([
    ...projectHygiene.operating.map((p) => sourceRecordKey('HVCG_Projects', p.id)),
    ...taskHygiene.operating.map((t) => sourceRecordKey('HVCG_Tasks', t.id)),
    ...(decisionHygiene?.operating || []).map((d) =>
      sourceRecordKey(
        typeof d.sourceList === 'string' ? d.sourceList : undefined,
        String(d.id ?? ''),
      ),
    ),
  ]);
  const timeline = (workspace.timeline || []).filter((ev) => {
    if (isHygieneTargetedSource(ev.source)) {
      // List-local IDs collide across HVCG_* lists — always qualify by source.
      if (!ev.source || !ev.id) return false;
      return allowedKeys.has(sourceRecordKey(ev.source, ev.id));
    }
    // Communications/meetings remain; harden isolation is project/task/decision/risk scoped.
    return true;
  });
  return {
    ...workspace,
    projects: projectHygiene.operating.map(({ name, id, projectType, status, health, nextAction, ownerName }) => ({
      id,
      name,
      projectType,
      status,
      health,
      nextAction,
      ownerName,
    })),
    tasks: taskHygiene.operating,
    decisionsRisks: workspace.decisionsRisks
      ? {
          ...workspace.decisionsRisks,
          items: decisionHygiene?.operating || [],
        }
      : workspace.decisionsRisks,
    timeline,
  };
}

function looksCapital(text: string): boolean {
  return /capital|funding|loc\b|receivable|warehouse|buildout|lender/i.test(text);
}

/**
 * Recovered filename label for the optional historical clause.
 * Dollar figures are stripped so a filename is not an amount extraction.
 */
function historicalCapitalLabel(raw: string): string {
  return redactFinancialDollars(raw.replace(/\s+/g, ' ').trim());
}

const FILE_INDEX_SOURCE = 'HVCG_Communications/file-index';
const LIBRARY_POINTER_SOURCE = 'HVCG_Clients.SharePointLibraryUrl';

function isSharePointLibraryPointer(item: { id: string; title: string; source?: string; kind?: string }): boolean {
  if (item.source === LIBRARY_POINTER_SOURCE) return true;
  return (item.kind || '').toLowerCase() === 'library';
}

/**
 * Current document index = entitled HVCG_Communications/file-index rows for this
 * ClientCode. A library URL pointer is not a file inventory. Rows stamped with
 * another ClientCode are refused.
 */
function entitledFileIndexTitles(
  documents: WorkspaceTruthSnapshot['documents'] | undefined,
  clientCode: string,
): { titles: string[]; libraryPointer: boolean } {
  const items = documents?.items || [];
  const libraryPointer = items.some(isSharePointLibraryPointer);
  if (!documents?.queried) return { titles: [], libraryPointer };
  const titles: string[] = [];
  for (const item of items) {
    if (isSharePointLibraryPointer(item)) continue;
    if (item.source !== FILE_INDEX_SOURCE) continue;
    const rowCode = (item.clientCode || '').trim().toUpperCase();
    if (rowCode && rowCode !== clientCode) continue;
    const title = item.title.replace(/\s+/g, ' ').trim();
    if (!title) continue;
    titles.push(title);
  }
  return { titles, libraryPointer };
}

/** Short entitled slice shown with the full count. Not a second inventory. */
export const MEETINGS_LIST_SLICE = 6;

export const MEETINGS_MISSING_SENTENCE =
  'No entitled HVCG_Meetings rows. meetings=MISSING. Atlas does not invent meetings, attendees, notes, decisions, or next actions.';

export function meetingsNotQueriedSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  const base = 'HVCG_Meetings was not queried. Atlas does not treat that as an empty meeting list.';
  return detail ? `${base} ${detail}` : base;
}

export function meetingsSourceUnavailableSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  return [
    'Atlas cannot read the entitled HVCG_Meetings slice.',
    'meetings=SOURCE_UNAVAILABLE.',
    detail || 'HVCG_Meetings list walk did not complete.',
    'Partial rows are not the meeting list.',
    'Atlas does not invent meetings, attendees, notes, decisions, or next actions.',
  ].join(' ');
}

export function meetingsIndexedSentence(rows: Array<{ title: string; date?: string }>): string {
  const labels = rows.slice(0, MEETINGS_LIST_SLICE).map((row) =>
    row.date ? `${row.title} (${row.date})` : `${row.title} (date not recorded)`,
  );
  const shown = labels.length;
  const more = rows.length > shown ? ` Showing ${shown} of ${rows.length}.` : '';
  return `${rows.length} entitled HVCG_Meetings row(s). meetings=INDEXED. ${labels.join('; ')}.${more}`;
}

function meetingDay(value: unknown): string | undefined {
  const raw = asText(value);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1];
}

/**
 * Entitled HVCG_Meetings rows for this ClientCode. A truncated walk contributes
 * no titles. Rows stamped with another code, or with no code, are refused.
 */
function entitledMeetings(
  meetings: WorkspaceTruthSnapshot['meetings'] | undefined,
  clientCode: string,
): { unavailable: boolean; queried: boolean; rows: Array<{ title: string; date?: string }>; reason?: string } {
  if (meetings?.status === 'SOURCE_UNAVAILABLE') {
    return { unavailable: true, queried: false, rows: [], reason: meetings.reason };
  }
  if (!meetings?.queried) {
    return { unavailable: false, queried: false, rows: [], reason: meetings?.reason };
  }
  const rows: Array<{ title: string; date?: string }> = [];
  for (const item of meetings.items || []) {
    if (asText(item.clientCode).toUpperCase() !== clientCode) continue;
    const title = asText(item.title).replace(/\s+/g, ' ');
    if (!title) continue;
    const date = meetingDay(item.date);
    rows.push(date ? { title, date } : { title });
  }
  return { unavailable: false, queried: true, rows, reason: meetings.reason };
}

/** Short entitled contact slice shown with the full count. Not a second inventory. */
export const CONTACTS_LIST_SLICE = 6;

export const CONTACTS_MISSING_SENTENCE =
  'No entitled HVCG_Contacts rows. contacts=MISSING. Atlas does not invent contacts, emails, phones, roles, or meeting attendees.';

export function contactsNotQueriedSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  const base = 'HVCG_Contacts was not queried. Atlas does not treat that as an empty contact list.';
  return detail ? `${base} ${detail}` : base;
}

export function contactsSourceUnavailableSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  return [
    'Atlas cannot read the entitled HVCG_Contacts slice.',
    'contacts=SOURCE_UNAVAILABLE.',
    detail || 'HVCG_Contacts list walk did not complete.',
    'Partial rows are not the contact list.',
    'Atlas does not invent contacts, emails, phones, roles, or meeting attendees.',
  ].join(' ');
}

export function contactListLabel(row: { title: string; email?: string; jobTitle?: string }): string {
  const email = (row.email || '').trim();
  const jobTitle = (row.jobTitle || '').trim();
  const identity = email ? `${row.title} <${email}>` : `${row.title} (email not recorded)`;
  return jobTitle ? `${identity}, ${jobTitle}` : identity;
}

export function contactsIndexedSentence(
  rows: Array<{ title: string; email?: string; jobTitle?: string }>,
): string {
  const labels = rows.slice(0, CONTACTS_LIST_SLICE).map((row) => contactListLabel(row));
  const extra = rows.length - labels.length;
  const more = extra > 0 ? ` +${extra} more.` : '';
  return `${rows.length} entitled HVCG_Contacts row(s). contacts=INDEXED. ${labels.join('; ')}.${more}`;
}

/**
 * Entitled HVCG_Contacts rows for this ClientCode. A truncated walk contributes
 * no names. Rows stamped with another code, or with no code, are refused.
 * Phone, role flags, and Modified are not part of the label.
 */
function entitledContacts(
  contacts: WorkspaceTruthSnapshot['contacts'] | undefined,
  clientCode: string,
): {
  supplied: boolean;
  unavailable: boolean;
  queried: boolean;
  rows: Array<{ title: string; email?: string; jobTitle?: string }>;
  reason?: string;
} {
  if (!contacts) {
    return { supplied: false, unavailable: false, queried: false, rows: [] };
  }
  if (contacts.status === 'SOURCE_UNAVAILABLE') {
    return { supplied: true, unavailable: true, queried: false, rows: [], reason: contacts.reason };
  }
  if (!contacts.queried) {
    return { supplied: true, unavailable: false, queried: false, rows: [], reason: contacts.reason };
  }
  const rows: Array<{ title: string; email?: string; jobTitle?: string }> = [];
  for (const item of contacts.items || []) {
    if (asText(item.clientCode).toUpperCase() !== clientCode) continue;
    const title = asText(item.title).replace(/\s+/g, ' ');
    if (!title) continue;
    const email = asText(item.email);
    const jobTitle = asText(item.jobTitle);
    rows.push({
      title,
      ...(email ? { email } : {}),
      ...(jobTitle ? { jobTitle } : {}),
    });
  }
  return { supplied: true, unavailable: false, queried: true, rows, reason: contacts.reason };
}

function queueFromTasks(
  tasks: NonNullable<WorkspaceTruthSnapshot['tasks']>,
  now?: string,
): TruthQueues {
  const queues = emptyQueues();
  const today = todayStamp(now);
  for (const task of tasks) {
    const status = (task.status || '').toLowerCase().replace(/[_-]+/g, ' ');
    const due = task.dueDate?.slice(0, 10);
    const overdue = Boolean(due && due < today && status !== 'completed' && status !== 'cancelled');
    const item: TruthQueueItem = {
      id: task.id,
      title: task.title,
      classification: 'CONFIRMED',
      source: 'HVCG_Tasks',
      evidence: task.blocker || task.nextAction || task.status,
    };
    if (overdue) queues.overdue.push(item);
    if (status === 'blocked' || task.blocker) queues.blocked.push(item);
    if (status === 'waiting') queues.waiting.push(item);
    if (
      status === 'needs owner approval' ||
      status === 'needs review' ||
      status === 'decision required' ||
      task.requiresApproval
    ) {
      queues.decisionRequired.push(item);
    }
    if (status === 'ready') queues.ready.push(item);
    if (status === 'completed') queues.outcomes.push(item);
    if (!overdue && status !== 'blocked' && status !== 'completed' && status !== 'cancelled') {
      queues.needsAction.push(item);
    }
  }
  return queues;
}

function mergeQueues(a: TruthQueues, b: TruthQueues): TruthQueues {
  const merge = (left: TruthQueueItem[], right: TruthQueueItem[]) => {
    const seen = new Set<string>();
    const out: TruthQueueItem[] = [];
    for (const row of [...left, ...right]) {
      const key = `${row.source}:${row.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  };
  return {
    needsAction: merge(a.needsAction, b.needsAction),
    waiting: merge(a.waiting, b.waiting),
    overdue: merge(a.overdue, b.overdue),
    blocked: merge(a.blocked, b.blocked),
    decisionRequired: merge(a.decisionRequired, b.decisionRequired),
    atRisk: merge(a.atRisk, b.atRisk),
    ready: merge(a.ready, b.ready),
    outcomes: merge(a.outcomes, b.outcomes),
  };
}

function pictureQueuesForClient(picture: OperatorOperatingPicture | undefined, clientCode: string): TruthQueues {
  const queues = emptyQueues();
  if (!picture) return queues;
  const map = (rows: OperatorOperatingItem[], target: TruthQueueItem[]) => {
    for (const row of rows) {
      if (row.clientCode !== clientCode) continue;
      target.push({
        id: row.id,
        title: row.title,
        classification: row.provenance === 'COMPLETE' ? 'CONFIRMED' : row.provenance,
        source: row.kind,
        evidence: row.evidence,
      });
    }
  };
  map(picture.queues.needsAction, queues.needsAction);
  map(picture.queues.waiting, queues.waiting);
  map(picture.queues.overdue, queues.overdue);
  map(picture.queues.blocked, queues.blocked);
  map(picture.queues.decisionRequired, queues.decisionRequired);
  map(picture.queues.atRisk, queues.atRisk);
  map(picture.queues.ready, queues.ready);
  map(picture.queues.outcomes, queues.outcomes);
  return queues;
}

function prepareContactCandidates(workspace?: WorkspaceTruthSnapshot): ContactCandidate[] {
  if (!workspace) return [];
  const canonical = new Set<string>();
  const contactItems =
    workspace.contacts?.status === 'SOURCE_UNAVAILABLE' || !workspace.contacts?.queried
      ? []
      : workspace.contacts?.items || [];
  for (const item of contactItems) {
    const email = extractEmail(item);
    if (email) canonical.add(email);
  }
  const candidates: ContactCandidate[] = [];
  const seen = new Set<string>();
  const meetingItems =
    workspace.meetings?.status === 'SOURCE_UNAVAILABLE' || !workspace.meetings?.queried
      ? []
      : (workspace.meetings?.items || []).filter(
          (item) => asText(item.clientCode).toUpperCase() === workspace.clientCode,
        );
  const sources: Array<{ items: Array<Record<string, unknown>>; source: string }> = [
    { items: workspace.communications?.items || [], source: 'HVCG_Communications' },
    { items: workspace.engagements?.items || [], source: 'HVCG_Engagements' },
    { items: meetingItems, source: 'HVCG_Meetings' },
  ];
  for (const bucket of sources) {
    for (const item of bucket.items) {
      const email = extractEmail(item);
      if (!email || canonical.has(email) || seen.has(email)) continue;
      seen.add(email);
      const sourceId = asText(item.id) || email;
      candidates.push({
        displayName: extractDisplayName(item, email),
        email,
        source: bucket.source,
        sourceId,
        classification: 'PROPOSED',
        writeStatus: 'CANDIDATE_NOT_CREATED',
        provenance: {
          source: bucket.source,
          detail: `Entitled ${bucket.source} row ${sourceId} contains ${email}. Not written to HVCG_Contacts.`,
        },
      });
    }
  }
  return candidates.slice(0, 20);
}

function domain(
  name: string,
  completeness: DomainCompleteness,
  classification: TruthClassification,
  summary: string,
  provenance: TruthProvenance[],
): DomainTruth {
  return { domain: name, completeness, classification, summary, provenance };
}

export function composeClientTruth(opts: {
  clientCode: string;
  commercial?: OperatorCommercialContext;
  workspace?: WorkspaceTruthSnapshot;
  identity?: ClientIdentityMapping | null;
  picture?: OperatorOperatingPicture;
  now?: string;
}): ClientTruthModel | { failClosed: true; reason: 'unknown_client_code' | 'not_entitled_filter' } {
  const clientCode = (opts.clientCode || '').trim().toUpperCase();
  if (!isCanonicalClientCode(clientCode) || clientCode === '*') {
    return { failClosed: true, reason: 'unknown_client_code' };
  }
  if (opts.commercial?.clientCode && opts.commercial.clientCode !== clientCode) {
    return { failClosed: true, reason: 'not_entitled_filter' };
  }

  const identity = opts.identity ?? PRODUCTION_IDENTITY.getByClientCode(clientCode);
  const boundary = entityBoundaryFor(clientCode);
  const writePolicy = boundary?.writePolicy || (isAccgReadOnly(clientCode) ? 'read_only' : 'normal');
  const workspace = applyOperatingHygieneToWorkspaceSnapshot(
    opts.workspace?.clientCode === clientCode ? opts.workspace : undefined,
  );
  const displayName = workspace?.displayName || identity?.displayName || clientCode;
  const hvsBlocked = opts.picture?.hvsDataAccess === 'BLOCKED';
  const knowledge = hvsBlocked
    ? undefined
    : opts.picture?.hvsActionableClientKnowledge.find((row) => row.clientCode === clientCode) ||
      hvsActionableClientKnowledge().find((row) => row.clientCode === clientCode);
  const recoveredProjects = hvsBlocked
    ? []
    : opts.picture?.hvsRecoveredProjects.filter((row) => row.clientCode === clientCode).length
      ? opts.picture.hvsRecoveredProjects.filter((row) => row.clientCode === clientCode)
      : hvsRecoveredProjects().filter((row) => row.clientCode === clientCode);
  const recoveredDocs = hvsBlocked
    ? []
    : opts.picture?.hvsRecoveredDocuments.filter((row) => row.clientCode === clientCode).length
      ? opts.picture.hvsRecoveredDocuments.filter((row) => row.clientCode === clientCode)
      : hvsRecoveredDocuments().filter((row) => row.clientCode === clientCode);
  const recoveredCapital = hvsBlocked
    ? []
    : opts.picture?.hvsRecoveredCapitalPackets.filter((row) => row.clientCode === clientCode).length
      ? opts.picture.hvsRecoveredCapitalPackets.filter((row) => row.clientCode === clientCode)
      : hvsRecoveredCapitalPackets().filter((row) => row.clientCode === clientCode);

  const gccSignals = (opts.commercial?.gcc.signals || []).filter((s) => s.clientCode === clientCode);
  const gtm = (opts.commercial?.gtm.attributions || []).filter((a) => a.clientCode === clientCode);
  const hasGccOrg = Boolean(identity?.gccOrganizationId);
  const has360Org = Boolean(identity?.growth360OrganizationId || identity?.growth360Slug);

  const engagementCount = sectionCount(workspace?.engagements);
  const fileIndex = entitledFileIndexTitles(workspace?.documents, clientCode);
  const documentCount = fileIndex.titles.length;
  const commsCount = sectionCount(workspace?.communications);
  const projectCount = workspace?.projects?.length ?? 0;
  const taskCount = workspace?.tasks?.length ?? 0;

  const identityDomain = domain(
    'identity',
    identity?.confidence === 'VERIFIED' ? 'VERIFIED' : 'PARTIAL',
    identity?.confidence === 'VERIFIED' ? 'CONFIRMED' : 'LIKELY',
    `${displayName} (${clientCode}) is an entitled Atlas ClientCode` +
      (identity?.entraGroupDisplayName ? ` mapped to ${identity.entraGroupDisplayName}` : '.') +
      (writePolicy === 'read_only' ? ' Write policy is read-only unless an approved window exists.' : ''),
    [
      {
        source: 'atlas-identity-map',
        detail: identity
          ? `seed confidence=${identity.confidence}; entra=${identity.entraGroupDisplayName}`
          : 'No production identity seed row; ClientCode still canonical if entitled.',
      },
    ],
  );

  // W2L: current contact list is the entitled HVCG_Contacts slice only.
  // Proposed contactCandidates are not that list. A finished empty slice is
  // MISSING. A truncated walk is SOURCE_UNAVAILABLE and contributes no names.
  // An absent section stays MISSING so a composition with no workspace does
  // not become an allowlist miss.
  const contactSlice = entitledContacts(workspace?.contacts, clientCode);
  const entitledContactCount = contactSlice.rows.length;
  const contactsSummary = !contactSlice.supplied
    ? 'No entitled HVCG_Contacts rows. Atlas does not invent contacts.'
    : contactSlice.unavailable
      ? contactsSourceUnavailableSentence(contactSlice.reason)
      : entitledContactCount > 0
        ? contactsIndexedSentence(contactSlice.rows)
        : contactSlice.queried
          ? CONTACTS_MISSING_SENTENCE
          : contactsNotQueriedSentence(contactSlice.reason);
  const contactsDomain = domain(
    'contacts',
    !contactSlice.supplied
      ? 'MISSING'
      : contactSlice.unavailable
        ? 'NOT_CERTIFIED'
        : entitledContactCount > 0
          ? 'INDEXED'
          : contactSlice.queried
            ? 'MISSING'
            : 'NOT_CERTIFIED',
    !contactSlice.supplied
      ? 'MISSING'
      : contactSlice.unavailable
        ? 'NOT_CERTIFIED'
        : entitledContactCount > 0
          ? 'CONFIRMED'
          : contactSlice.queried
            ? 'MISSING'
            : 'NOT_CERTIFIED',
    contactsSummary,
    [
      ...contactSlice.rows.slice(0, CONTACTS_LIST_SLICE).map((row) => ({
        source: 'HVCG_Contacts',
        detail: contactListLabel(row),
      })),
      {
        source: 'HVCG_Contacts',
        detail: !contactSlice.supplied
          ? 'SharePoint workspace contacts were not supplied on this composition.'
          : contactSlice.unavailable
            ? `contacts=SOURCE_UNAVAILABLE; partial rows are not the list; ${contactSlice.reason || 'walk did not complete'}`
            : contactSlice.queried
              ? `entitled count=${entitledContactCount}; contacts=${entitledContactCount > 0 ? 'INDEXED' : 'MISSING'}`
              : contactSlice.reason || 'Contacts list not queried.',
      },
    ],
  );

  const engagementsUnavailable = workspace?.engagements?.status === 'SOURCE_UNAVAILABLE';
  const engagementsDomain = engagementsUnavailable
    ? domain(
        'engagements',
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
        'HVCG_Engagements walk did not complete. engagements=SOURCE_UNAVAILABLE. Atlas does not invent engagements.',
        [
          {
            source: 'HVCG_Engagements',
            detail: workspace?.engagements?.reason || 'engagements walk did not complete',
          },
        ],
      )
    : domain(
        'engagements',
        engagementCount > 0 || workspace?.engagementType ? 'PARTIAL' : 'MISSING',
        engagementCount > 0 || workspace?.engagementType ? 'CONFIRMED' : knowledge ? 'LIKELY' : 'MISSING',
        engagementCount > 0
          ? `${engagementCount} entitled HVCG_Engagements row(s).`
          : workspace?.engagementType
            ? `EngagementTypePrimary on HVCG_Clients is ${workspace.engagementType}. No entitled engagement rows.`
            : knowledge?.hvcgResponsibilities.some((r) => /engagement|agreement/i.test(r.title))
              ? 'Recovered engagement/agreement filenames exist. Live Hub engagement rows are not confirmed.'
              : 'No entitled engagement rows and no recovered engagement filenames.',
        [
          {
            source: engagementCount > 0 ? 'HVCG_Engagements' : 'HVCG_Clients',
            detail: workspace?.engagementType || `count=${engagementCount}`,
          },
        ],
      );

  // W2G: current/active projects are hygiene-kept HVCG_Projects only.
  // An empty post-hygiene set is MISSING. Recovered HVS filenames are never that list.
  const workspaceLoaded = Boolean(workspace);
  const projectNames = (workspace?.projects || []).map((p) => p.name).filter((name) => name.trim().length > 0);
  const staleRecoveredTitles = recoveredProjects
    .map((p) => p.title.trim())
    .filter(Boolean)
    .slice(0, 3);
  const staleRecoveredClause =
    workspaceLoaded && staleRecoveredTitles.length
      ? ` Historical/STALE_OR_UNCERTAIN recovered HVS filenames are not current or active projects: ${staleRecoveredTitles.join('; ')}.`
      : '';
  const projectsSummary =
    (projectCount > 0
      ? `${projectCount} hygiene-kept HVCG_Projects row(s) (REAL_CURRENT_OPERATING)` +
        (taskCount ? `; ${taskCount} open HVCG_Tasks.` : '.') +
        ` Current/active: ${projectNames.slice(0, 6).join('; ')}.`
      : workspaceLoaded
        ? 'No hygiene-kept HVCG_Projects rows after operating hygiene. projects=MISSING. Atlas does not invent active project names.'
        : 'No hygiene-kept HVCG_Projects rows. projects=MISSING. Atlas will not substitute recovered HVS filenames for the active project list.') +
    staleRecoveredClause;
  const projectsDomain = domain(
    'projects',
    projectCount > 0 ? 'PARTIAL' : 'MISSING',
    projectCount > 0 ? 'CONFIRMED' : 'MISSING',
    projectsSummary,
    [
      ...(workspace?.projects || []).slice(0, 8).map((p) => ({
        source: 'HVCG_Projects',
        detail: `${p.id}:${p.name}`,
      })),
      {
        source: 'HVCG_Projects',
        detail: workspaceLoaded
          ? `hygiene-kept REAL_CURRENT_OPERATING count=${projectCount}`
          : 'no successful workspace load; projects=MISSING',
      },
      ...(workspaceLoaded
        ? recoveredProjects.slice(0, 4).map((p) => ({
            source: 'hvs-recovered-projects',
            detail: `STALE_OR_UNCERTAIN:${p.title}`,
          }))
        : []),
    ],
  );

  // W2I: current document index is entitled HVCG_Communications/file-index rows
  // for this ClientCode only. An empty index is MISSING even when recovered HVS
  // filenames exist. Those names, if shown, stay Historical/STALE_OR_UNCERTAIN.
  // A SharePoint library URL pointer is not a complete file inventory.
  const fileIndexUnavailable = workspace?.documents?.availability === 'SOURCE_UNAVAILABLE';
  const documentTitles = fileIndexUnavailable ? [] : fileIndex.titles;
  const staleRecoveredDocNames = fileIndexUnavailable
    ? []
    :
    workspaceLoaded && documentCount === 0
      ? [
          ...new Set(
            recoveredDocs
              .map((row) => row.name.replace(/\s+/g, ' ').trim())
              .filter(Boolean),
          ),
        ].slice(0, 4)
      : [];
  const staleDocsClause = staleRecoveredDocNames.length
    ? ` Historical/STALE_OR_UNCERTAIN recovered HVS filenames are not the current document index: ${staleRecoveredDocNames.join('; ')}.`
    : '';
  const libraryClause =
    fileIndex.libraryPointer && documentCount === 0
      ? ' A SharePoint library URL pointer is not a complete file inventory.'
      : '';
  const documentsSummary = fileIndexUnavailable
    ? 'Atlas cannot read the current document index (HVCG_Communications/file-index). Document availability is SOURCE_UNAVAILABLE. documents=SOURCE_UNAVAILABLE. Atlas will not invent files, filenames, or a closing checklist.'
    : (documentCount > 0
        ? `${documentCount} entitled HVCG_Communications/file-index row(s). Current index: ${documentTitles.slice(0, 8).join('; ')}. Binaries remain in M365.`
        : workspaceLoaded
          ? 'No entitled HVCG_Communications/file-index rows. documents=MISSING. Atlas does not invent filenames.'
          : 'No entitled HVCG_Communications/file-index rows. documents=MISSING. Atlas will not substitute recovered HVS filenames for the current document index.') +
      libraryClause +
      staleDocsClause;
  const documentsDomain = domain(
    'documents',
    fileIndexUnavailable ? 'NOT_CERTIFIED' : documentCount > 0 ? 'INDEXED' : 'MISSING',
    fileIndexUnavailable ? 'NOT_CERTIFIED' : documentCount > 0 ? 'CONFIRMED' : 'MISSING',
    documentsSummary,
    [
      ...documentTitles.slice(0, 8).map((title) => ({
        source: FILE_INDEX_SOURCE,
        detail: title,
      })),
      {
        source: FILE_INDEX_SOURCE,
        detail: fileIndexUnavailable
          ? 'file-index walk did not complete; partial rows are not an index; documents=SOURCE_UNAVAILABLE'
          : workspaceLoaded
            ? `entitled file-index count=${documentCount}; documents=${documentCount > 0 ? 'INDEXED' : 'MISSING'}`
            : 'no successful workspace load; documents=MISSING',
      },
      ...(fileIndex.libraryPointer
        ? [
            {
              source: LIBRARY_POINTER_SOURCE,
              detail: 'library URL pointer is not a file inventory',
            },
          ]
        : []),
      ...staleRecoveredDocNames.map((name) => ({
        source: 'hvs-recovered-documents',
        detail: `STALE_OR_UNCERTAIN:${name}`,
      })),
    ],
  );

  const communicationsUnavailable = workspace?.communications?.status === 'SOURCE_UNAVAILABLE';
  const communicationsDomain = communicationsUnavailable
    ? domain(
        'communications',
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
        'HVCG_Communications walk did not complete. communications=SOURCE_UNAVAILABLE. Atlas does not invent threads from a partial walk.',
        [
          {
            source: 'HVCG_Communications',
            detail: workspace?.communications?.reason || 'communications walk did not complete',
          },
        ],
      )
    : domain(
        'communications',
        commsCount > 0 ? 'INDEXED' : 'MISSING',
        commsCount > 0 ? 'CONFIRMED' : 'MISSING',
        commsCount > 0
          ? `${commsCount} entitled communication index row(s).`
          : 'No entitled communication index rows on this composition. Atlas does not invent threads.',
        [
          {
            source: 'HVCG_Communications',
            detail:
              workspace?.communications?.reason ||
              `queried=${Boolean(workspace?.communications?.queried)}; count=${commsCount}`,
          },
        ],
      );

  // W2K: current meeting list is the entitled HVCG_Meetings slice only.
  // The workspace timeline is not that inventory. A finished empty slice is
  // MISSING. A truncated walk is SOURCE_UNAVAILABLE and contributes no titles.
  const meetingSlice = entitledMeetings(workspace?.meetings, clientCode);
  const meetingCount = meetingSlice.rows.length;
  const meetingsSummary = meetingSlice.unavailable
    ? meetingsSourceUnavailableSentence(meetingSlice.reason)
    : meetingCount > 0
      ? meetingsIndexedSentence(meetingSlice.rows)
      : meetingSlice.queried
        ? MEETINGS_MISSING_SENTENCE
        : meetingsNotQueriedSentence(meetingSlice.reason);
  const meetingsDomain = domain(
    'meetings',
    meetingSlice.unavailable ? 'NOT_CERTIFIED' : meetingCount > 0 ? 'INDEXED' : meetingSlice.queried ? 'MISSING' : 'NOT_CERTIFIED',
    meetingSlice.unavailable ? 'NOT_CERTIFIED' : meetingCount > 0 ? 'CONFIRMED' : meetingSlice.queried ? 'MISSING' : 'NOT_CERTIFIED',
    meetingsSummary,
    [
      ...meetingSlice.rows.slice(0, MEETINGS_LIST_SLICE).map((row) => ({
        source: 'HVCG_Meetings',
        detail: row.date ? `${row.title} (${row.date})` : `${row.title} (date not recorded)`,
      })),
      {
        source: 'HVCG_Meetings',
        detail: meetingSlice.unavailable
          ? `meetings=SOURCE_UNAVAILABLE; partial rows are not the list; ${meetingSlice.reason || 'walk did not complete'}`
          : meetingSlice.queried
            ? `entitled count=${meetingCount}; meetings=${meetingCount > 0 ? 'INDEXED' : 'MISSING'}`
            : 'HVCG_Meetings was not queried; not an empty meeting list',
      },
    ],
  );

  const gccQuotes = gccSignals.slice(0, 4).map((s) => gccObservationHonestyLine(s));
  const financialContext = domain(
    'financialContext',
    hasGccOrg || gccSignals.length ? (hasGccOrg ? 'PARTIAL' : 'NOT_CERTIFIED') : 'NOT_CERTIFIED',
    gccSignals.length && hasGccOrg ? 'CONFIRMED' : 'NOT_CERTIFIED',
    hasGccOrg
      ? gccSignals.length
        ? `GCC organization is mapped. ${gccQuotes.join(' ')}`
        : `GCC organization ${identity?.gccOrganizationId} is mapped. No value signal is currently projected. Financial intelligence remains observation-only.`
      : 'No verified GCC organization mapping. financialContext is NOT_CERTIFIED. Atlas does not invent Atlas Finance data or create a GCC organization.',
    [
      {
        source: 'atlas-identity-map',
        detail: hasGccOrg
          ? `gccOrganizationId=${identity?.gccOrganizationId}`
          : 'gccOrganizationId is null on the production identity seed.',
      },
      ...(gccSignals.length
        ? gccSignals.slice(0, 4).map((s) => ({
            source: 'gcc-module-ingest',
            detail: `${s.signalType}:${s.signalId}`,
          }))
        : [
            {
              source: 'gcc-module-ingest',
              detail: opts.commercial?.gcc.honesty.emptyReason || 'No GCC value signal on record.',
            },
          ]),
    ],
  );

  const growthApprovalIds = gtm.slice(0, 4).map((a) => growth360ApprovalId(a.idempotencyKey));
  const growthContext = domain(
    'growthContext',
    has360Org || gtm.length ? (has360Org ? 'PARTIAL' : 'NOT_CERTIFIED') : 'NOT_CERTIFIED',
    gtm.length && has360Org ? 'CONFIRMED' : 'NOT_CERTIFIED',
    has360Org
      ? gtm.length
        ? `Growth360 organization is mapped. ${gtm.length} observation-only attribution(s) on record. Approval Center ${growthApprovalIds.join(', ')}. canExecute remains false.`
        : 'Growth360 organization is mapped. No attribution is currently projected. growthContext is not a certified 360 operating dataset.'
      : 'No verified 360 organization mapping. growthContext is NOT_CERTIFIED. Atlas does not invent Atlas Growth certification or create a 360 org.',
    [
      {
        source: 'atlas-identity-map',
        detail: has360Org
          ? `growth360OrganizationId=${identity?.growth360OrganizationId || 'n/a'}; slug=${identity?.growth360Slug || 'n/a'}`
          : 'growth360OrganizationId is null on the production identity seed.',
      },
      ...gtm.slice(0, 4).map((a) => ({
        source: 'growth360-module-ingest',
        detail: `approvalId=${growth360ApprovalId(a.idempotencyKey)}; idempotencyKey=${a.idempotencyKey}; href=/approvals; client=/clients/${clientCode}`,
      })),
    ],
  );

  // W2H: current capital context is entitled capital opportunities already on
  // this composition. This path does not read HVCG_CapitalOpportunities.
  // HVCG_Opportunities, engagement type, recovered HVS filenames, and keyword
  // matches on HVCG_Projects titles are not that set, so an empty entitled
  // set is capitalContext=MISSING.
  const historicalLabels: string[] = [];
  if (workspaceLoaded) {
    const seen = new Set<string>();
    const pushLabel = (raw: string) => {
      const label = historicalCapitalLabel(raw);
      if (!label || seen.has(label)) return;
      seen.add(label);
      historicalLabels.push(label);
    };
    for (const packet of recoveredCapital) pushLabel(packet.name);
    for (const project of recoveredProjects) {
      if (looksCapital(project.title)) pushLabel(project.title);
    }
  }
  const historicalClause = historicalLabels.length
    ? ` Historical/STALE_OR_UNCERTAIN recovered HVS filenames are not active capital: ${historicalLabels.slice(0, 4).join('; ')}. Amounts, lender, and funding status are not extracted.`
    : '';
  const capitalContext = domain(
    'capitalContext',
    'MISSING',
    'MISSING',
    `No entitled capital opportunity is on this composition. capitalContext=MISSING. Atlas does not invent capital, amounts, or lenders.${historicalClause}`,
    [
      {
        source: 'client-truth',
        detail: 'no entitled capital opportunity on this composition; capitalContext=MISSING',
      },
      ...historicalLabels.slice(0, 4).map((label) => ({
        source: 'hvs-recovered-capital',
        detail: `STALE_OR_UNCERTAIN:${label}`,
      })),
    ],
  );

  if (FORBIDDEN_CAPITAL_CLAIM.test(capitalContext.summary) || /\$/.test(capitalContext.summary)) {
    capitalContext.summary =
      'No entitled capital opportunity is on this composition. capitalContext=MISSING. Atlas does not invent capital, amounts, lenders, or funding status.';
    capitalContext.classification = 'MISSING';
    capitalContext.completeness = 'MISSING';
    capitalContext.provenance = [
      {
        source: 'client-truth',
        detail: 'forbidden capital claim removed; capitalContext=MISSING',
      },
    ];
  }

  const contactCandidates = prepareContactCandidates(workspace);
  const taskQueues = queueFromTasks(workspace?.tasks || [], opts.now);
  const fromPicture = pictureQueuesForClient(opts.picture, clientCode);
  const queues = mergeQueues(taskQueues, fromPicture);

  for (const row of knowledge?.waitingItems || []) {
    queues.waiting.push({
      id: row.id,
      title: row.title,
      classification: row.classification,
      source: 'hvs-actionable-waiting',
      evidence: row.evidence,
    });
  }
  for (const row of knowledge?.overdueItems || []) {
    queues.overdue.push({
      id: row.id,
      title: row.title,
      classification: row.classification,
      source: 'hvs-actionable-overdue',
      evidence: row.evidence,
    });
  }
  for (const row of knowledge?.decisions || []) {
    queues.decisionRequired.push({
      id: row.id,
      title: row.title,
      classification: row.classification,
      source: 'hvs-actionable-decision',
      evidence: row.evidence,
    });
  }
  for (const p of workspace?.projects || []) {
    if (p.health === 'at_risk' || p.health === 'critical') {
      queues.atRisk.push({
        id: p.id,
        title: p.name,
        classification: 'CONFIRMED',
        source: 'HVCG_Projects',
        evidence: p.health,
      });
    }
    if (p.nextAction) {
      queues.needsAction.push({
        id: `${p.id}:next`,
        title: p.nextAction,
        classification: 'CONFIRMED',
        source: 'HVCG_Projects',
        evidence: `NextAction on ${p.name}`,
      });
    }
  }

  const hasIndexedWork =
    projectCount > 0 ||
    documentCount > 0 ||
    commsCount > 0 ||
    recoveredProjects.length > 0 ||
    recoveredDocs.length > 0;
  const operatingPosture: OperatingPosture = isAccgReadOnly(clientCode)
    ? hasIndexedWork
      ? 'ACTIVE_CLIENT_CONTEXT_RECOVERY'
      : 'LEGACY_CLIENT_RECONCILIATION'
    : hasIndexedWork
      ? 'STANDARD'
      : 'STANDARD';

  const missingDocs = knowledge?.missingDocuments || [];
  const ownerNext = [
    ...queues.decisionRequired.map((q) => q.title),
    ...(knowledge?.decisions || []).map((d) => d.title),
  ];
  const clientNext = (knowledge?.clientResponsibilities || []).map((r) => r.title);
  const hvcgNext = (knowledge?.hvcgResponsibilities || []).map((r) => r.title);

  const answers: Record<string, TruthAnswer> = {
    who: {
      question: 'Who is the client?',
      text: identityDomain.summary,
      classification: identityDomain.classification,
      provenance: identityDomain.provenance,
    },
    engagement: {
      question: 'What engagement do we have?',
      text: engagementsDomain.summary,
      classification: engagementsDomain.classification,
      provenance: engagementsDomain.provenance,
    },
    workingOn: {
      question: 'What are we actively working on?',
      text: projectNames.length
        ? `Current/active projects (hygiene-kept HVCG_Projects only): ${projectNames.slice(0, 6).join('; ')}.`
        : workspaceLoaded
          ? 'No current/active projects after operating hygiene. projects=MISSING. Atlas does not invent project names.'
          : 'No current/active HVCG_Projects rows are loaded. projects=MISSING. Atlas will not substitute recovered HVS filenames for the active project list.',
      classification: projectsDomain.classification,
      provenance: projectsDomain.provenance,
    },
    changed: {
      question: 'What changed recently?',
      text: workspace?.timeline?.length
        ? workspace.timeline
            .slice(0, 5)
            .map((ev) => `${ev.at.slice(0, 10)} · ${ev.title}`)
            .join('; ')
        : 'No recent Hub workspace timeline events on this composition.',
      classification: workspace?.timeline?.length ? 'CONFIRMED' : 'MISSING',
      provenance: (workspace?.timeline || []).slice(0, 5).map((ev) => ({ source: ev.source, detail: ev.id })),
    },
    blocked: {
      question: 'What is blocked?',
      text: queues.blocked.length
        ? queues.blocked.map((q) => q.title).join('; ')
        : 'No blocked entitled items on this composition.',
      classification: queues.blocked.length ? 'CONFIRMED' : 'MISSING',
      provenance: queues.blocked.slice(0, 6).map((q) => ({ source: q.source, detail: q.id })),
    },
    waiting: {
      question: 'What are we waiting on?',
      text: queues.waiting.length
        ? queues.waiting.map((q) => q.title).join('; ')
        : clientNext.length
          ? `Client-owed recovered items (not Hub-confirmed live): ${clientNext.slice(0, 4).join('; ')}`
          : 'No waiting entitled items on this composition.',
      classification: queues.waiting.length ? 'CONFIRMED' : clientNext.length ? 'PROPOSED' : 'MISSING',
      provenance: queues.waiting.slice(0, 6).map((q) => ({ source: q.source, detail: q.id })),
    },
    decisions: {
      question: 'What decisions are required?',
      text: ownerNext.length
        ? ownerNext.slice(0, 6).join('; ')
        : 'No Owner/Manny decisions are evidenced on this composition.',
      classification: ownerNext.length ? 'LIKELY' : 'MISSING',
      provenance: queues.decisionRequired.slice(0, 6).map((q) => ({ source: q.source, detail: q.id })),
    },
    documentsExist: {
      question: 'What documents exist?',
      text: documentsDomain.summary,
      classification: documentsDomain.classification,
      provenance: documentsDomain.provenance,
    },
    meetingsExist: {
      question: 'What meetings exist?',
      text: meetingsDomain.summary,
      classification: meetingsDomain.classification,
      provenance: meetingsDomain.provenance,
    },
    contactsExist: {
      question: 'What contacts exist?',
      text: contactsDomain.summary,
      classification: contactsDomain.classification,
      provenance: contactsDomain.provenance,
    },
    documentsMissing: {
      question: 'What documents are missing?',
      // Recovered HVS folder gaps (hvsActionableClientKnowledge.missingDocuments)
      // are not an entitled file-index inventory. Do not emit them as current LIKELY missing.
      text: 'No entitled missing-document inventory is on this composition. Recovered HVS filenames are not a current missing list. Atlas does not invent a closing checklist.',
      classification: 'MISSING',
      provenance: [
        {
          source: 'HVCG_Communications/file-index',
          detail:
            missingDocs.length > 0
              ? 'recovered HVS folder gaps are not a current missing inventory'
              : 'no entitled missing-document inventory on this composition',
        },
      ],
    },
    commitments: {
      question: 'What commitments exist?',
      text: 'Commitments are not a certified Hub domain on this composition. Recovered agreement filenames are not treated as live obligations.',
      classification: 'STALE_OR_UNCERTAIN',
      provenance: [{ source: 'client-truth', detail: 'No invented SOW/obligation extraction.' }],
    },
    capital: {
      question: 'What capital initiatives are active?',
      text: capitalContext.summary,
      classification: capitalContext.classification,
      provenance: capitalContext.provenance,
    },
    outstandingRequests: {
      question: 'What lender/vendor/client requests are outstanding?',
      text: 'No entitled lender/vendor request objects are on this composition. capitalSubmit remains false.',
      classification: 'MISSING',
      provenance: [{ source: 'client-truth', detail: 'capitalSubmit=false; no invented lender disposition.' }],
    },
    financialKnown: {
      question: 'What financial information is actually certified?',
      text: financialContext.summary,
      classification: financialContext.classification,
      provenance: financialContext.provenance,
    },
    financialUnknown: {
      question: 'What financial information is absent/unverified?',
      text: hasGccOrg
        ? gccSignals.length
          ? 'Observation-only GCC text is not a certified ledger. copiesLedger=false. canExecute=false. Runway, cash, and forecast dollars are not copied into Atlas.'
          : 'Mapped GCC observations are not a certified ledger. Ratios, runway, and actuals are absent unless a GCC OBSERVE signal is projected.'
        : 'No GCC organization, no certified actuals, no certified forecast, no certified runway. financialContext=NOT_CERTIFIED.',
      classification: 'NOT_CERTIFIED',
      provenance: financialContext.provenance,
    },
    growthKnown: {
      question: 'What growth information is certified?',
      text: growthContext.summary,
      classification: growthContext.classification,
      provenance: growthContext.provenance,
    },
    growthUnknown: {
      question: 'What growth information is absent/unverified?',
      text: has360Org
        ? 'Mapped Growth360 observations are not a certified campaign-performance dataset. Paid execution remains Owner-gated.'
        : 'No 360 organization mapping. Campaign performance, attribution completeness, and Atlas Growth certification are absent.',
      classification: 'NOT_CERTIFIED',
      provenance: growthContext.provenance,
    },
    hvcgNext: {
      question: 'What should HVCG do next?',
      text: hvcgNext.length
        ? hvcgNext.slice(0, 5).join('; ')
        : queues.needsAction.length
          ? queues.needsAction
              .slice(0, 5)
              .map((q) => q.title)
              .join('; ')
          : 'OBSERVE entitled workspace and keep missing domains honest. Do not invent next actions.',
      classification: hvcgNext.length ? 'LIKELY' : queues.needsAction.length ? 'CONFIRMED' : 'MISSING',
      provenance: [{ source: 'client-truth', detail: `operatingPosture=${operatingPosture}` }],
    },
    clientNext: {
      question: 'What should the client do next?',
      text: clientNext.length
        ? clientNext.slice(0, 5).join('; ')
        : 'No evidenced client-owed items. Atlas does not invent a client homework list.',
      classification: clientNext.length ? 'PROPOSED' : 'MISSING',
      provenance: (knowledge?.clientResponsibilities || []).slice(0, 4).map((r) => ({
        source: 'hvs-actionable-client-responsibility',
        detail: r.evidence,
      })),
    },
    ownerApproval: {
      question: 'What requires Manny/Owner approval?',
      text: [
        'External client communications remain unsent drafts (GLOBAL_AUTO_RESPOND=false).',
        'Money movement, contracts/signatures, and lender/investor submissions are never autonomous.',
        ...(writePolicy === 'read_only'
          ? ['This ClientCode is read-only on Hub unless an approved write window exists.']
          : []),
        ...ownerNext.slice(0, 4),
      ].join(' '),
      classification: 'CONFIRMED',
      provenance: [{ source: 'authority', detail: `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}` }],
    },
    provenance: {
      question: 'What is the provenance of every important statement?',
      text: workspace?.hygiene?.quarantined.length
        ? `Every domain above carries source+detail provenance. Claims without a source stay MISSING or NOT_CERTIFIED. Operating hygiene quarantined ${workspace.hygiene.quarantined.length} TEST_HARDENING/INTERNAL_SYSTEM/HISTORICAL_RECOVERED/UNKNOWN record(s) from owner-facing current work; source rows remain auditable and were not deleted.`
        : 'Every domain above carries source+detail provenance. Claims without a source stay MISSING or NOT_CERTIFIED.',
      classification: 'CONFIRMED',
      provenance: [
        identityDomain.provenance[0]!,
        financialContext.provenance[0]!,
        growthContext.provenance[0]!,
        ...(workspace?.hygiene?.quarantined.slice(0, 4).map((row) => ({
          source: 'operating-record-hygiene',
          detail: `${row.proposedClassification}:${row.sourceRef}:${row.title}`,
        })) || []),
      ],
    },
  };

  return {
    contractVersion: CLIENT_TRUTH_CONTRACT,
    missionKey: CLIENT_TRUTH_MISSION_KEY,
    clientCode,
    displayName,
    entitled: true,
    invented: false,
    operatingPosture,
    writePolicy,
    identity: identityDomain,
    contacts: contactsDomain,
    engagements: engagementsDomain,
    projects: projectsDomain,
    documents: documentsDomain,
    communications: communicationsDomain,
    meetings: meetingsDomain,
    financialContext,
    growthContext,
    capitalContext,
    contactCandidates,
    queues,
    answers,
    globalAutoRespond: false,
    capitalSubmit: false,
    liveGtmOutbound: false,
    canExecute: false,
  };
}

export function isClientTruth(value: unknown): value is ClientTruthModel {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as ClientTruthModel).contractVersion === CLIENT_TRUTH_CONTRACT &&
      (value as ClientTruthModel).invented === false,
  );
}
