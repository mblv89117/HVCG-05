/**
 * Durable onboarding execution state linked to governed workflow definitions.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ONBOARDING_STATE_SCHEMA_VERSION = 1;
export const ONBOARDING_AUTOMATION_MISSION_KEY = 'ATLAS-CLIENT-ONBOARDING-AUTOMATION-001' as const;

export type OnboardingLifecycleStatus =
  | 'NOT_STARTED'
  | 'IDENTITY_RECONCILIATION'
  | 'DOCUMENT_COLLECTION'
  | 'SYSTEM_SETUP'
  | 'PROJECT_SETUP'
  | 'KICKOFF_PREPARATION'
  | 'WAITING_ON_CLIENT'
  | 'WAITING_ON_OWNER'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'BLOCKED';

export type OnboardingMilestoneState = {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'complete' | 'blocked';
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

export type OnboardingDocumentGap = {
  label: string;
  status: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN' | 'MISSING';
  source?: string;
};

/** Canonical OPERATIONS HANDOFF package. Composed from already-known run facts. */
export type OnboardingOperationsHandoff = {
  status: 'NOT_READY' | 'PREPARED' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  taskCount: number;
  milestoneCount: number;
  missingDocumentCount: number;
  blockers: string[];
  ownerAttention: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  relatedThreadCount: number;
  capitalScope: boolean;
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Already-known entitled kickoff record / task / milestone refs. Id required. Never invented. */
export type OnboardingRelatedKickoffRef = {
  id: string;
  title?: string;
  kind?: 'record' | 'task' | 'milestone';
};

/** Canonical KICKOFF package. Composed from already-known run facts. No outbound. */
export type OnboardingKickoff = {
  status: 'NOT_READY' | 'PREPARED' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  milestoneStatus: 'pending' | 'in_progress' | 'complete' | 'blocked' | 'unknown';
  relatedThreadCount: number;
  missingDocumentCount: number;
  /** True only after entitled reuse of a same-scope kickoff record/task/milestone with a real id, or a create that returned an id. */
  kickoffReconciled: boolean;
  reusedExisting: boolean;
  relatedKickoff: OnboardingRelatedKickoffRef[];
  blockers: string[];
  ownerAttention: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  autoRespond: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Already-known entitled blocker / task / attention refs. Id required. Never invented. */
export type OnboardingRelatedBlockerRef = {
  id: string;
  title?: string;
  kind?: 'blocker' | 'task' | 'attention';
};

/** Canonical BLOCKER REVIEW package. Surfaces already-known blockers. No send. */
export type OnboardingBlockerReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  itemCount: number;
  items: string[];
  missingDocumentCount: number;
  ownerAttention: string[];
  /** True only after entitled reuse of same-scope blocker/task/attention rows with a real id, or a create that returned an id. */
  blockerReconciled: boolean;
  reusedExisting: boolean;
  relatedBlockers: OnboardingRelatedBlockerRef[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  autoRespond: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Already-known entitled owner-attention / attention / owner-action refs. Id required. Never invented. */
export type OnboardingRelatedOwnerAttentionRef = {
  id: string;
  title?: string;
  kind?: 'owner-attention' | 'attention' | 'owner-action';
};

/** Canonical OWNER ATTENTION package. Surfaces already-known owner items. No send. */
export type OnboardingOwnerAttention = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  itemCount: number;
  items: string[];
  /** True only after entitled reuse of same-scope owner-attention/attention/owner-action rows with a real id, or a create that returned an id. */
  ownerAttentionReconciled: boolean;
  reusedExisting: boolean;
  relatedOwnerAttention: OnboardingRelatedOwnerAttentionRef[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  autoRespond: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical MILESTONE REVIEW package. Surfaces already-known milestone state. No invented dates. */
export type OnboardingMilestoneReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  milestoneCount: number;
  completeCount: number;
  blockedCount: number;
  pendingCount: number;
  /** True only after reuse-with-id or a create that returned an id. */
  milestoneReconciled: boolean;
  reusedExisting: boolean;
  items: string[];
  nextMilestone?: string;
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical IDENTITY REVIEW package. Surfaces already-known client-scope facts. No invented ClientCodes. */
export type OnboardingIdentityReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  clientName?: string;
  entitled: boolean;
  identityResolutionRequired: boolean;
  itemCount: number;
  items: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical WORKSPACE REVIEW package. Surfaces already-known workspace reconciliation. No duplicate workspace. */
export type OnboardingWorkspaceReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  clientName?: string;
  workspaceReconciled: boolean;
  reusedExisting: boolean;
  itemCount: number;
  items: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical PROJECT REVIEW package. Surfaces already-known project reconciliation. No duplicate project. */
export type OnboardingProjectReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  projectReconciled: boolean;
  reusedExisting: boolean;
  itemCount: number;
  items: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical TASK REVIEW package. Surfaces already-known entitled tasks. No duplicate tasks. */
export type OnboardingTaskReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  taskCount: number;
  taskReconciled: boolean;
  reusedExisting: boolean;
  itemCount: number;
  items: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Already-known entitled mail-thread / email refs. Id required. Never invented. */
export type OnboardingRelatedCommsRef = {
  id: string;
  title?: string;
  conversationId?: string;
};

/** Canonical COMMUNICATION CONTEXT REVIEW. Reuses entitled same-scope threads/emails. No invented ids. */
export type OnboardingCommunicationContextReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  clientName?: string;
  relatedThreadCount: number;
  relatedEmails: OnboardingRelatedCommsRef[];
  relatedThreads: OnboardingRelatedCommsRef[];
  /** True only after entitled reuse/attach of same-scope threads or emails that have real ids. */
  communicationContextReconciled: boolean;
  reusedExisting: boolean;
  itemCount: number;
  items: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  autoRespond: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Already-known entitled capital packet / project / related-capital refs. Id required. Never invented. */
export type OnboardingRelatedCapitalRef = {
  id: string;
  title?: string;
};

/** Canonical CAPITAL CONTEXT REVIEW. Reuses entitled same-scope capital rows. No invented ids or amounts. */
export type OnboardingCapitalContextReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  clientName?: string;
  relatedCapitalCount: number;
  relatedCapital: OnboardingRelatedCapitalRef[];
  /** True only after entitled reuse/list of same-scope capital rows that have real ids. */
  capitalContextReconciled: boolean;
  reusedExisting: boolean;
  itemCount: number;
  items: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  autoRespond: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical AGENT ASSIGNMENT REVIEW. Surfaces already-known entitled agents. No invented agents. */
export type OnboardingAgentAssignmentReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  agentCount: number;
  agentReconciled: boolean;
  reusedExisting: boolean;
  itemCount: number;
  items: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Already-known /health fabricSync fields. Copied only. No invented counts or filenames. */
export type RealtimeDocumentsFabricSnapshot = {
  lastRunAt: string | null;
  honesty: 'never_run' | 'delta' | 'page_fallback' | 'degraded';
  mailDeltaReady: boolean;
  lastIndexed?: {
    mailThreads: number;
    meetings: number;
    contacts: number;
    files: number;
    attachmentsIndexed: number;
  };
  notes?: string[];
  changeNotifications?: {
    status: string;
    mail: string;
    files: string;
    calendar: string;
  };
  attachmentLinks?: { status: 'skipped' | 'ready'; reason: string };
  contacts?: { status: 'skipped' | 'ready' | 'error'; reason: string };
};

/**
 * Canonical REALTIME DOCUMENTS HONESTY package.
 * Surfaces already-known fabricSync / changeNotifications / attachmentLinks / documentGaps.
 * Never invents receipts, filenames, ClientCodes, or counts. Never claims LIVE files
 * when Graph file search is skipped.
 */
export type OnboardingRealtimeDocumentsHonesty = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  clientCode?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  lastRunAt: string | null;
  lastIndexed: {
    mailThreads: number;
    meetings: number;
    contacts: number;
    files: number;
    attachmentsIndexed: number;
  };
  honesty: 'never_run' | 'delta' | 'page_fallback' | 'degraded';
  mailDeltaReady: boolean;
  fileSearchSkipped: boolean;
  oneDriveRecentSkipped: boolean;
  contactsEmpty: boolean;
  filesRealtime: false | true;
  changeNotifications: {
    status: string;
    mail: string;
    files: string;
    calendar: string;
  };
  attachmentLinks: { status: 'skipped' | 'ready'; reason: string };
  documentGaps: OnboardingDocumentGap[];
  confirmedCount: number;
  missingCount: number;
  uncertainCount: number;
  honestyNotes: string[];
  itemCount: number;
  items: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical DOCUMENT REVIEW package. Surfaces already-known documentGaps. No invented receipt. */
export type OnboardingDocumentReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  requirementCount: number;
  confirmedCount: number;
  missingCount: number;
  uncertainCount: number;
  items: string[];
  nextDocument?: string;
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical COMPLETION package. Rollup of already-known package statuses. No send. */
export type OnboardingCompletion = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  packageCount: number;
  readyCount: number;
  blockedCount: number;
  openItems: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

export type OnboardingRunRecord = {
  workflowId: string;
  workflowDefinitionId: string;
  clientCode?: string;
  clientName?: string;
  status: OnboardingLifecycleStatus;
  currentStep: string;
  nextStep: string;
  blockers: string[];
  ownerAttention: string[];
  projectId?: string;
  projectName?: string;
  taskIds: string[];
  milestoneIds: string[];
  /** Agent ids recorded only after entitled project/task context exists and assign returns an id. */
  assignedAgents: string[];
  documentGaps: OnboardingDocumentGap[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  capitalScope: boolean;
  identityResolutionRequired: boolean;
  workspaceReconciled: boolean;
  /** True only after entitled reuse of an existing document request set, or a create that returned an id. */
  documentsReconciled?: boolean;
  /** True only after reuse of an entitled project milestone id, or a create that returned an id. */
  milestoneReconciled?: boolean;
  /** True only after entitled reuse of same-scope threads/emails that have real ids. */
  communicationContextReconciled?: boolean;
  /** True only after entitled reuse of same-scope capital packets/projects/related-capital rows that have real ids. */
  capitalContextReconciled?: boolean;
  /** True only after entitled reuse of a same-scope kickoff record/task/milestone with a real id, or a create that returned an id. */
  kickoffReconciled?: boolean;
  /** True only after entitled reuse of same-scope blocker/task/attention rows with a real id, or a create that returned an id. */
  blockerReconciled?: boolean;
  /** True only after entitled reuse of same-scope owner-attention/attention/owner-action rows with a real id, or a create that returned an id. */
  ownerAttentionReconciled?: boolean;
  dryRun: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  milestones: OnboardingMilestoneState[];
  operationsHandoff: OnboardingOperationsHandoff;
  kickoff: OnboardingKickoff;
  blockerReview: OnboardingBlockerReview;
  ownerAttentionPackage: OnboardingOwnerAttention;
  milestoneReview?: OnboardingMilestoneReview;
  completion?: OnboardingCompletion;
  documentReview?: OnboardingDocumentReview;
  identityReview?: OnboardingIdentityReview;
  workspaceReview?: OnboardingWorkspaceReview;
  projectReview?: OnboardingProjectReview;
  taskReview?: OnboardingTaskReview;
  agentAssignmentReview?: OnboardingAgentAssignmentReview;
  communicationContextReview?: OnboardingCommunicationContextReview;
  capitalContextReview?: OnboardingCapitalContextReview;
  realtimeDocumentsHonesty?: OnboardingRealtimeDocumentsHonesty;
  provenance: string;
};

export type OnboardingStateOverlay = {
  schemaVersion?: number;
  records: OnboardingRunRecord[];
};

export function resolveOnboardingStateDir(dataDir: string, env: NodeJS.ProcessEnv = process.env): string {
  const explicit = (env.INTEGRATION_ONBOARDING_STATE_DIR || '').trim();
  if (explicit) return explicit;
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'onboarding-runs');
  return join(dataDir, 'onboarding-runs');
}

export function onboardingStateFilePath(dir: string): string {
  return join(dir, 'onboarding-state-overlay.json');
}

export function emptyOnboardingOverlay(): OnboardingStateOverlay {
  return { schemaVersion: ONBOARDING_STATE_SCHEMA_VERSION, records: [] };
}

export function readOnboardingOverlay(dir: string): OnboardingStateOverlay {
  const path = onboardingStateFilePath(dir);
  if (!existsSync(path)) return emptyOnboardingOverlay();
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as OnboardingStateOverlay;
  return {
    schemaVersion: parsed.schemaVersion ?? ONBOARDING_STATE_SCHEMA_VERSION,
    records: Array.isArray(parsed.records) ? parsed.records : [],
  };
}

export function writeOnboardingOverlay(dir: string, overlay: OnboardingStateOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = onboardingStateFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(overlay, null, 2), 'utf8');
  renameSync(tmp, path);
}

export function getOnboardingRun(overlay: OnboardingStateOverlay, workflowId: string): OnboardingRunRecord | null {
  const matches = overlay.records.filter((r) => r.workflowId === workflowId);
  if (!matches.length) return null;
  return matches.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null;
}

export function upsertOnboardingRun(dir: string, record: OnboardingRunRecord): OnboardingRunRecord {
  const overlay = readOnboardingOverlay(dir);
  const idx = overlay.records.findIndex((r) => r.workflowId === record.workflowId);
  if (idx >= 0) overlay.records[idx] = record;
  else overlay.records.push(record);
  writeOnboardingOverlay(dir, overlay);
  return record;
}
