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
import type {
  OperatorOperatingItem,
  OperatorOperatingPicture,
} from '../operatorDesk/types.ts';
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
  }>;
  documents?: { queried: boolean; items: Array<{ id: string; title: string; source?: string }>; reason?: string };
  communications?: { queried: boolean; items: Array<Record<string, unknown>>; reason?: string };
  meetings?: { queried: boolean; items: Array<Record<string, unknown>>; reason?: string };
  engagements?: { queried: boolean; items: Array<Record<string, unknown>>; reason?: string };
  contacts?: { queried: boolean; items: Array<Record<string, unknown>>; reason?: string };
  decisionsRisks?: { queried: boolean; items: Array<Record<string, unknown>>; reason?: string };
  timeline?: Array<{ at: string; kind: string; title: string; source: string; id: string }>;
  nextActions?: Array<{ text: string; evidence?: Array<{ source: string; kind?: string; id: string; field?: string }> }>;
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
  documents?: WorkspaceTruthSnapshot['documents'];
  communications?: WorkspaceTruthSnapshot['communications'];
  meetings?: WorkspaceTruthSnapshot['meetings'];
  engagements?: WorkspaceTruthSnapshot['engagements'];
  contacts?: WorkspaceTruthSnapshot['contacts'];
  decisionsRisks?: WorkspaceTruthSnapshot['decisionsRisks'];
  timeline?: WorkspaceTruthSnapshot['timeline'];
  nextActions?: Array<{ text: string; evidence?: Array<{ source: string; kind?: string; id: string; field?: string }> }>;
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
    documents: payload.documents,
    communications: payload.communications,
    meetings: payload.meetings,
    engagements: payload.engagements,
    contacts: payload.contacts,
    decisionsRisks: payload.decisionsRisks,
    timeline: payload.timeline,
    nextActions: payload.nextActions,
  };
}

function looksCapital(text: string): boolean {
  return /capital|funding|loc\b|receivable|warehouse|buildout|lender/i.test(text);
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
  for (const item of workspace.contacts?.items || []) {
    const email = extractEmail(item);
    if (email) canonical.add(email);
  }
  const candidates: ContactCandidate[] = [];
  const seen = new Set<string>();
  const sources: Array<{ items: Array<Record<string, unknown>>; source: string }> = [
    { items: workspace.communications?.items || [], source: 'HVCG_Communications' },
    { items: workspace.engagements?.items || [], source: 'HVCG_Engagements' },
    { items: workspace.meetings?.items || [], source: 'HVCG_Meetings' },
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
  const workspace = opts.workspace?.clientCode === clientCode ? opts.workspace : undefined;
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

  const contactCount = sectionCount(workspace?.contacts);
  const engagementCount = sectionCount(workspace?.engagements);
  const documentCount = sectionCount(workspace?.documents);
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

  const contactsDomain = domain(
    'contacts',
    contactCount > 0 ? 'PARTIAL' : 'MISSING',
    contactCount > 0 ? 'CONFIRMED' : 'MISSING',
    contactCount > 0
      ? `${contactCount} entitled HVCG_Contacts row(s) on this ClientCode.`
      : 'No entitled HVCG_Contacts rows. Atlas does not invent contacts.',
    [
      {
        source: workspace?.contacts?.queried ? 'HVCG_Contacts' : 'HVCG_Contacts',
        detail: workspace?.contacts
          ? workspace.contacts.queried
            ? `queried; count=${contactCount}`
            : workspace.contacts.reason || 'Contacts list not queried.'
          : 'SharePoint workspace contacts were not supplied on this composition.',
      },
    ],
  );

  const engagementsDomain = domain(
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

  const projectNames = (workspace?.projects || []).map((p) => p.name);
  const projectsDomain = domain(
    'projects',
    projectCount > 0 ? 'PARTIAL' : recoveredProjects.length ? 'INDEXED' : 'MISSING',
    projectCount > 0 ? 'CONFIRMED' : recoveredProjects.length ? 'LIKELY' : 'MISSING',
    projectCount > 0
      ? `${projectCount} entitled HVCG_Projects row(s)` +
        (taskCount ? `; ${taskCount} open HVCG_Tasks.` : '.')
      : recoveredProjects.length
        ? `No entitled HVCG_Projects rows. Recovered HVS project filenames are indexed (${recoveredProjects
            .map((p) => p.title)
            .slice(0, 3)
            .join('; ')}). Live vs stale is STALE_OR_UNCERTAIN until Hub-visible.`
        : 'No entitled projects and no recovered project filenames.',
    [
      ...(workspace?.projects || []).slice(0, 8).map((p) => ({
        source: 'HVCG_Projects',
        detail: `${p.id}:${p.name}`,
      })),
      ...recoveredProjects.slice(0, 4).map((p) => ({
        source: 'hvs-recovered-projects',
        detail: p.title,
      })),
    ],
  );

  const documentsDomain = domain(
    'documents',
    documentCount > 0 || recoveredDocs.length > 0 ? 'INDEXED' : workspace?.documents && !workspace.documents.queried ? 'MISSING' : 'MISSING',
    documentCount > 0 ? 'CONFIRMED' : recoveredDocs.length ? 'CONFIRMED' : 'MISSING',
    documentCount > 0
      ? `${documentCount} entitled document index row(s). Binaries remain in M365.`
      : recoveredDocs.length
        ? `Document filenames are indexed from recovered HVS inventory (${recoveredDocs.length} recovered rows). Not a certified completeness scan.`
        : 'No entitled document index rows on this composition.',
    [
      {
        source: documentCount > 0 ? 'HVCG_Communications/file-index' : 'hvs-recovered-documents',
        detail: workspace?.documents?.reason || `recovered=${recoveredDocs.length}; hub=${documentCount}`,
      },
    ],
  );

  const communicationsDomain = domain(
    'communications',
    commsCount > 0 ? 'INDEXED' : workspace?.communications && !workspace.communications.queried ? 'MISSING' : 'MISSING',
    commsCount > 0 ? 'CONFIRMED' : 'MISSING',
    commsCount > 0
      ? `${commsCount} entitled communication index row(s).`
      : 'No entitled communication index rows on this composition. Atlas does not invent threads.',
    [
      {
        source: 'HVCG_Communications',
        detail: workspace?.communications?.reason || `queried=${Boolean(workspace?.communications?.queried)}; count=${commsCount}`,
      },
    ],
  );

  const financialContext = domain(
    'financialContext',
    hasGccOrg || gccSignals.length ? (hasGccOrg ? 'PARTIAL' : 'NOT_CERTIFIED') : 'NOT_CERTIFIED',
    gccSignals.length && hasGccOrg ? 'CONFIRMED' : 'NOT_CERTIFIED',
    hasGccOrg
      ? gccSignals.length
        ? `GCC organization is mapped. ${gccSignals.length} observation-only value signal(s) on record. Not a certified financial dataset.`
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

  const growthContext = domain(
    'growthContext',
    has360Org || gtm.length ? (has360Org ? 'PARTIAL' : 'NOT_CERTIFIED') : 'NOT_CERTIFIED',
    gtm.length && has360Org ? 'CONFIRMED' : 'NOT_CERTIFIED',
    has360Org
      ? gtm.length
        ? `Growth360 organization is mapped. ${gtm.length} observation-only attribution(s) on record. canExecute remains false.`
        : 'Growth360 organization is mapped. No attribution is currently projected. growthContext is not a certified 360 operating dataset.'
      : 'No verified 360 organization mapping. growthContext is NOT_CERTIFIED. Atlas does not invent Atlas Growth certification or create a 360 org.',
    [
      {
        source: 'atlas-identity-map',
        detail: has360Org
          ? `growth360OrganizationId=${identity?.growth360OrganizationId || 'n/a'}; slug=${identity?.growth360Slug || 'n/a'}`
          : 'growth360OrganizationId is null on the production identity seed.',
      },
    ],
  );

  const capitalProjects = (workspace?.projects || []).filter((p) =>
    looksCapital(`${p.projectType || ''} ${p.name || ''} ${p.nextAction || ''}`),
  );
  const capitalFromEngagement = looksCapital(workspace?.engagementType || '');
  const capitalFromRecoveredProjects = recoveredProjects.some((p) => looksCapital(p.title));
  const capitalContext = domain(
    'capitalContext',
    capitalProjects.length || recoveredCapital.length || capitalFromEngagement || capitalFromRecoveredProjects
      ? 'PARTIAL'
      : 'MISSING',
    capitalProjects.length || recoveredCapital.length || capitalFromRecoveredProjects
      ? 'LIKELY'
      : capitalFromEngagement
        ? 'LIKELY'
        : 'MISSING',
    capitalProjects.length || recoveredCapital.length || capitalFromEngagement || capitalFromRecoveredProjects
      ? 'Capital-related filenames or projects are indexed. Amounts, lender disposition, and funding status are not extracted and remain unstated.'
      : 'No entitled capital context on this composition.',
    [
      ...capitalProjects.slice(0, 4).map((p) => ({ source: 'HVCG_Projects', detail: `${p.id}:${p.name}` })),
      ...recoveredCapital.slice(0, 4).map((p) => ({
        source: 'hvs-recovered-capital',
        detail: `${p.name} (amountsExtracted=false)`,
      })),
      ...recoveredProjects
        .filter((p) => looksCapital(p.title))
        .slice(0, 4)
        .map((p) => ({ source: 'hvs-recovered-projects', detail: p.title })),
    ],
  );

  if (FORBIDDEN_CAPITAL_CLAIM.test(capitalContext.summary)) {
    capitalContext.summary =
      'Capital-related evidence is indexed. Atlas will not invent funding status, lender disposition, or requested amounts without entitled sourced fields.';
    capitalContext.classification = 'NOT_CERTIFIED';
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
      text:
        projectNames.length
          ? `Entitled projects: ${projectNames.slice(0, 6).join('; ')}.`
          : projectsDomain.summary,
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
    documentsMissing: {
      question: 'What documents are missing?',
      text: missingDocs.length
        ? missingDocs.map((d) => `${d.title} (${d.classification})`).join('; ')
        : 'No specific missing-document inventory beyond honest-empty folders. Atlas does not invent a closing checklist.',
      classification: missingDocs.length ? 'LIKELY' : 'MISSING',
      provenance: missingDocs.slice(0, 6).map((d) => ({ source: 'hvs-actionable-missing-docs', detail: d.evidence })),
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
        ? 'Mapped GCC observations are not a certified ledger. Ratios, runway, and actuals are absent unless a GCC OBSERVE signal is projected.'
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
      text: 'Every domain above carries source+detail provenance. Claims without a source stay MISSING or NOT_CERTIFIED.',
      classification: 'CONFIRMED',
      provenance: [
        identityDomain.provenance[0]!,
        financialContext.provenance[0]!,
        growthContext.provenance[0]!,
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
