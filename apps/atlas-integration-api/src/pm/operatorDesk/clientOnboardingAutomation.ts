/**
 * Governed client onboarding automation — executes Client Onboarding template workflows.
 */

import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../config.ts';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import type { SharePointPmService } from '../sharepoint/repository.ts';
import {
  createDocumentRequest,
  listDocumentRequests,
  type DocumentRequestRecord,
} from '../sharepoint/documentRequests.ts';
import { inspectFabricSyncHealth, isFabricSweepEnabled } from '../sharepoint/fabric/status.ts';
import { appendAskAtlasActivity } from './activityLedger.ts';
import {
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RUNTIME_AGENT,
  type AskAtlasAnswer,
} from './types.ts';
import type { WorkflowDefinitionRecord } from './workflowDefinitions.ts';
import {
  ONBOARDING_AUTOMATION_MISSION_KEY,
  type OnboardingDocumentGap,
  type OnboardingLifecycleStatus,
  type OnboardingBlockerReview,
  type OnboardingKickoff,
  type OnboardingMilestoneState,
  type OnboardingOperationsHandoff,
  type OnboardingOwnerAttention,
  type OnboardingMilestoneReview,
  type OnboardingCompletion,
  type OnboardingDocumentReview,
  type OnboardingIdentityReview,
  type OnboardingWorkspaceReview,
  type OnboardingProjectReview,
  type OnboardingTaskReview,
  type OnboardingAgentAssignmentReview,
  type OnboardingRealtimeDocumentsHonesty,
  type RealtimeDocumentsFabricSnapshot,
  type OnboardingRunRecord,
  resolveOnboardingStateDir,
  upsertOnboardingRun,
} from './onboardingState.ts';

const ONBOARDING_PROJECT_TITLE = /\b(onboard(?:ing)?|kickoff|engagement setup|client activation)\b/i;
const DEFAULT_MILESTONES: Array<{ id: string; label: string }> = [
  { id: 'identity_verified', label: 'Client identity verified' },
  { id: 'agreement_scope_verified', label: 'Agreement / scope verified' },
  { id: 'documents_complete', label: 'Documents complete' },
  { id: 'system_access_complete', label: 'System access complete' },
  { id: 'kickoff_ready', label: 'Kickoff ready' },
  { id: 'kickoff_complete', label: 'Kickoff complete' },
  { id: 'operating_baseline_complete', label: 'Initial operating baseline complete' },
];

const DEFAULT_DOCUMENT_REQUIREMENTS = [
  'Operating agreement or formation documents',
  'Engagement letter / SOW',
  'Primary contact confirmation',
  'Tax ID / W-9 where applicable',
];

const DEFAULT_ONBOARDING_TASKS = [
  { key: 'confirm_primary_contact', title: 'Confirm primary client contact', purpose: 'Validate authorized contacts' },
  { key: 'review_engagement_scope', title: 'Review engagement scope and SOW', purpose: 'Align onboarding scope' },
  { key: 'collect_missing_documents', title: 'Review missing onboarding documents', purpose: 'Document collection' },
  { key: 'prepare_kickoff', title: 'Prepare kickoff materials', purpose: 'Kickoff preparation' },
];

export type OnboardingAgentAssignInput = {
  clientCode: string;
  projectId: string;
  taskIds: string[];
  agentId?: string;
};

export type OnboardingAgentAssignResult = {
  id?: string;
  agentId?: string;
};

export type OnboardingMilestoneRow = {
  id?: string;
  title?: string;
};

/** Record a SharePoint milestone only when list or create returns an id. Never invent ids. */
export async function defaultOnboardingMilestoneList(
  sharepoint: SharePointPmService | null,
  principal: AtlasPrincipal,
  projectId: string,
): Promise<OnboardingMilestoneRow[]> {
  const list = sharepoint?.listAuthorizedMilestones;
  if (typeof list !== 'function' || !projectId.trim()) return [];
  try {
    const rows = await list.call(sharepoint, principal, projectId);
    return (rows ?? []).map((row) => ({ id: row?.id, title: row?.title }));
  } catch {
    return [];
  }
}

export async function defaultOnboardingMilestoneCreate(
  sharepoint: SharePointPmService | null,
  principal: AtlasPrincipal,
  body: { title: string; projectId: string; status?: string },
): Promise<{ id?: string }> {
  if (!sharepoint || !body.projectId.trim() || !body.title.trim()) return {};
  return sharepoint.createMilestone(principal, body);
}

export type OnboardingAutomationResult = {
  ok: true;
  record: OnboardingRunRecord;
  events: string[];
} | {
  ok: false;
  error: string;
  record?: OnboardingRunRecord;
};

/** Record an assignee only when an entitled project/task context exists and assign returns an id. */
export function defaultOnboardingAgentAssign(
  input: OnboardingAgentAssignInput,
): OnboardingAgentAssignResult {
  const projectId = input.projectId?.trim();
  const agentId = input.agentId?.trim();
  if (!projectId || !agentId) return {};
  return { id: randomUUID(), agentId };
}

export function isOnboardingWorkflow(workflow: WorkflowDefinitionRecord): boolean {
  return (
    workflow.sourceTemplateId === 'client_onboarding' ||
    workflow.templateKey === 'client_onboarding' ||
    workflow.name.toLowerCase().includes('client onboarding')
  );
}

function milestoneTemplate(): OnboardingMilestoneState[] {
  return DEFAULT_MILESTONES.map((m) => ({
    id: m.id,
    label: m.label,
    status: 'pending',
    provenance: 'PROPOSED',
  }));
}

async function appendOnboardingActivity(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  event: string;
  clientCode?: string;
  summary: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const answer: AskAtlasAnswer = {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: false,
    ranking: ['Decision Required', 'At Risk', 'Overdue', 'Waiting', 'Blocked', 'Capital'],
    items: [
      {
        id: `onboarding:${opts.event}:${opts.clientCode ?? 'org'}`,
        state: 'Decision Required',
        why: opts.summary,
        basedOn: opts.event,
        evidence: ONBOARDING_AUTOMATION_MISSION_KEY,
        provenance: 'CONFIRMED',
        classification: 'CONFIRMED',
        ...(opts.clientCode ? { clientCode: opts.clientCode } : {}),
      },
    ],
    activity: {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: opts.event,
      trigger: 'onboarding_automation',
      timestamp: now,
      tools: ['client_onboarding_automation'],
      classification: 'CONFIRMED',
      result: 'answered',
      readWriteStatus: 'READ_AUTO',
      policyDecision: 'answered',
      ran: true,
    },
  };
  try {
    await appendAskAtlasActivity({ dataDir: opts.dataDir, answer, principal: opts.principal });
  } catch {
    /* optional */
  }
}

export function composeOperationsHandoff(record: {
  identityResolutionRequired?: boolean;
  workspaceReconciled?: boolean;
  projectId?: string;
  projectName?: string;
  taskIds?: string[];
  milestoneIds?: string[];
  documentGaps?: OnboardingDocumentGap[];
  blockers?: string[];
  ownerAttention?: string[];
  communicationPolicy?: OnboardingOperationsHandoff['communicationPolicy'];
  relatedThreadCount?: number;
  capitalScope?: boolean;
}): OnboardingOperationsHandoff {
  const blockers = record.blockers ?? [];
  const ownerAttention = record.ownerAttention ?? [];
  const missingDocumentCount = record.documentGaps?.filter((d) => d.status === 'MISSING').length ?? 0;
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const relatedThreadCount = Math.max(0, record.relatedThreadCount ?? 0);
  const capitalScope = Boolean(record.capitalScope);
  const nextOwnerAction =
    ownerAttention[0]
    ?? (record.identityResolutionRequired
      ? 'Assign client scope to onboarding workflow'
      : blockers[0]
        ? blockers[0]
        : missingDocumentCount
          ? 'Reconcile or request missing documents (draft only)'
          : 'Review operations handoff and continue the entitled onboarding checklist');
  if (record.identityResolutionRequired || !record.workspaceReconciled || !record.projectId) {
    const status = record.identityResolutionRequired
      ? 'NOT_READY'
      : blockers.length
        ? 'BLOCKED'
        : 'NOT_READY';
    return {
      status,
      ready: false,
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      taskCount: record.taskIds?.length ?? 0,
      milestoneCount: record.milestoneIds?.length ?? 0,
      missingDocumentCount,
      blockers,
      ownerAttention,
      communicationPolicy,
      relatedThreadCount,
      capitalScope,
      nextOwnerAction,
      send: false,
      liveGtmOutbound: false,
      capitalSubmit: false,
      provenance: record.identityResolutionRequired ? 'CONFIRMED' : 'PROPOSED',
    };
  }
  return {
    status: blockers.length ? 'BLOCKED' : 'PREPARED',
    ready: blockers.length === 0,
    projectId: record.projectId,
    ...(record.projectName ? { projectName: record.projectName } : {}),
    taskCount: record.taskIds?.length ?? 0,
    milestoneCount: record.milestoneIds?.length ?? 0,
    missingDocumentCount,
    blockers,
    ownerAttention,
    communicationPolicy,
    relatedThreadCount,
    capitalScope,
    nextOwnerAction,
    send: false,
    liveGtmOutbound: false,
    capitalSubmit: false,
    provenance: 'CONFIRMED',
  };
}

export function composeKickoff(record: {
  identityResolutionRequired?: boolean;
  workspaceReconciled?: boolean;
  projectId?: string;
  projectName?: string;
  milestones?: OnboardingMilestoneState[];
  documentGaps?: OnboardingDocumentGap[];
  blockers?: string[];
  ownerAttention?: string[];
  communicationPolicy?: OnboardingKickoff['communicationPolicy'];
  relatedThreadCount?: number;
}): OnboardingKickoff {
  const blockers = record.blockers ?? [];
  const ownerAttention = record.ownerAttention ?? [];
  const missingDocumentCount = record.documentGaps?.filter((d) => d.status === 'MISSING').length ?? 0;
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const relatedThreadCount = Math.max(0, record.relatedThreadCount ?? 0);
  const milestone = record.milestones?.find((m) => m.id === 'kickoff_ready');
  const milestoneStatus = milestone?.status ?? 'unknown';
  const nextOwnerAction =
    ownerAttention[0]
    ?? (record.identityResolutionRequired
      ? 'Assign client scope before kickoff'
      : blockers[0]
        ? blockers[0]
        : missingDocumentCount
          ? 'Reconcile missing documents before kickoff (draft only)'
          : 'Review kickoff package (DRAFT_ONLY, no outbound)');
  if (record.identityResolutionRequired || !record.workspaceReconciled || !record.projectId) {
    return {
      status: record.identityResolutionRequired ? 'NOT_READY' : blockers.length ? 'BLOCKED' : 'NOT_READY',
      ready: false,
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      milestoneStatus,
      relatedThreadCount,
      missingDocumentCount,
      blockers,
      ownerAttention,
      communicationPolicy,
      nextOwnerAction,
      send: false,
      liveGtmOutbound: false,
      capitalSubmit: false,
      outbound: false,
      provenance: record.identityResolutionRequired ? 'CONFIRMED' : 'PROPOSED',
    };
  }
  return {
    status: blockers.length ? 'BLOCKED' : 'PREPARED',
    ready: blockers.length === 0 && missingDocumentCount === 0,
    projectId: record.projectId,
    ...(record.projectName ? { projectName: record.projectName } : {}),
    milestoneStatus,
    relatedThreadCount,
    missingDocumentCount,
    blockers,
    ownerAttention,
    communicationPolicy,
    nextOwnerAction,
    send: false,
    liveGtmOutbound: false,
    capitalSubmit: false,
    outbound: false,
    provenance: 'CONFIRMED',
  };
}

export function composeBlockerReview(record: {
  identityResolutionRequired?: boolean;
  workspaceReconciled?: boolean;
  projectId?: string;
  projectName?: string;
  documentGaps?: OnboardingDocumentGap[];
  blockers?: string[];
  ownerAttention?: string[];
  communicationPolicy?: OnboardingBlockerReview['communicationPolicy'];
}): OnboardingBlockerReview {
  const blockers = record.blockers ?? [];
  const ownerAttention = record.ownerAttention ?? [];
  const missingDocumentCount = record.documentGaps?.filter((d) => d.status === 'MISSING').length ?? 0;
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const items = [
    ...blockers,
    ...(missingDocumentCount ? [`${missingDocumentCount} missing document${missingDocumentCount === 1 ? '' : 's'}`] : []),
    ...ownerAttention,
  ];
  const nextOwnerAction =
    ownerAttention[0]
    ?? (record.identityResolutionRequired
      ? 'Assign client scope before blocker clearance'
      : blockers[0]
        ? blockers[0]
        : missingDocumentCount
          ? 'Reconcile missing documents before clearance (draft only)'
          : 'No open onboarding blockers');
  if (record.identityResolutionRequired || !record.workspaceReconciled || !record.projectId) {
    return {
      status: record.identityResolutionRequired ? 'NOT_READY' : blockers.length ? 'BLOCKED' : 'NOT_READY',
      ready: false,
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      itemCount: items.length,
      items,
      missingDocumentCount,
      ownerAttention,
      communicationPolicy,
      nextOwnerAction,
      send: false,
      liveGtmOutbound: false,
      capitalSubmit: false,
      outbound: false,
      provenance: record.identityResolutionRequired ? 'CONFIRMED' : 'PROPOSED',
    };
  }
  const status = blockers.length ? 'BLOCKED' : items.length ? 'OPEN' : 'CLEAR';
  return {
    status,
    ready: status === 'CLEAR',
    projectId: record.projectId,
    ...(record.projectName ? { projectName: record.projectName } : {}),
    itemCount: items.length,
    items,
    missingDocumentCount,
    ownerAttention,
    communicationPolicy,
    nextOwnerAction,
    send: false,
    liveGtmOutbound: false,
    capitalSubmit: false,
    outbound: false,
    provenance: 'CONFIRMED',
  };
}

export function composeOwnerAttention(record: {
  identityResolutionRequired?: boolean;
  workspaceReconciled?: boolean;
  projectId?: string;
  projectName?: string;
  ownerAttention?: string[];
  communicationPolicy?: OnboardingOwnerAttention['communicationPolicy'];
}): OnboardingOwnerAttention {
  const items = record.ownerAttention ?? [];
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const nextOwnerAction =
    items[0]
    ?? (record.identityResolutionRequired
      ? 'Assign client scope before owner attention can clear'
      : 'No owner attention items');
  if (record.identityResolutionRequired || !record.workspaceReconciled || !record.projectId) {
    return {
      status: 'NOT_READY',
      ready: false,
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      itemCount: items.length,
      items,
      communicationPolicy,
      nextOwnerAction,
      send: false,
      liveGtmOutbound: false,
      capitalSubmit: false,
      outbound: false,
      provenance: record.identityResolutionRequired ? 'CONFIRMED' : 'PROPOSED',
    };
  }
  const status = items.length ? 'OPEN' : 'CLEAR';
  return {
    status,
    ready: status === 'CLEAR',
    projectId: record.projectId,
    ...(record.projectName ? { projectName: record.projectName } : {}),
    itemCount: items.length,
    items,
    communicationPolicy,
    nextOwnerAction,
    send: false,
    liveGtmOutbound: false,
    capitalSubmit: false,
    outbound: false,
    provenance: 'CONFIRMED',
  };
}

export function composeMilestoneReview(record: {
  identityResolutionRequired?: boolean;
  workspaceReconciled?: boolean;
  projectId?: string;
  projectName?: string;
  milestones?: OnboardingMilestoneState[];
  milestoneIds?: string[];
  reusedExisting?: boolean;
  blockers?: string[];
  communicationPolicy?: OnboardingMilestoneReview['communicationPolicy'];
}): OnboardingMilestoneReview {
  const milestones = record.milestones ?? [];
  const milestoneIds = (record.milestoneIds ?? []).map((id) => id.trim()).filter(Boolean);
  const milestoneReconciled = milestoneIds.length > 0;
  const reusedExisting = Boolean(record.reusedExisting && milestoneReconciled);
  const completeCount = milestones.filter((m) => m.status === 'complete').length;
  const blockedCount = milestones.filter((m) => m.status === 'blocked').length;
  const pendingCount = milestones.filter((m) => m.status === 'pending' || m.status === 'in_progress').length;
  const items = milestones.filter((m) => m.status !== 'complete').map((m) => `${m.label} (${m.status})`);
  const nextMilestone =
    milestones.find((m) => m.status === 'in_progress')?.label
    ?? milestones.find((m) => m.status === 'pending')?.label
    ?? milestones.find((m) => m.status === 'blocked')?.label;
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const blockers = record.blockers ?? [];
  const nextOwnerAction =
    record.identityResolutionRequired
      ? 'Assign client scope before milestone review'
      : !milestoneReconciled
        ? 'Confirm the existing entitled onboarding milestones; do not create duplicates'
        : blockedCount
          ? `Clear blocked milestone: ${milestones.find((m) => m.status === 'blocked')?.label ?? 'blocked'}`
          : nextMilestone
            ? `Advance milestone: ${nextMilestone}`
            : reusedExisting
              ? 'Existing entitled onboarding milestones reused — no duplicate milestones created'
              : 'Governed onboarding milestones are reconciled — no duplicate milestones created';
  const counts = {
    milestoneCount: milestones.length,
    completeCount,
    blockedCount,
    pendingCount,
    milestoneReconciled,
    reusedExisting,
    items,
    ...(nextMilestone ? { nextMilestone } : {}),
    communicationPolicy,
    nextOwnerAction,
    send: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    outbound: false as const,
  };
  if (record.identityResolutionRequired || !record.workspaceReconciled || !record.projectId) {
    return {
      status: record.identityResolutionRequired ? 'NOT_READY' : blockers.length ? 'BLOCKED' : 'NOT_READY',
      ready: false,
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...counts,
      milestoneReconciled: false,
      reusedExisting: false,
      provenance: record.identityResolutionRequired ? 'CONFIRMED' : 'PROPOSED',
    };
  }
  if (!milestoneReconciled) {
    const status = blockedCount || blockers.length ? 'BLOCKED' : 'OPEN';
    return {
      status,
      ready: false,
      projectId: record.projectId,
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...counts,
      provenance: 'PROPOSED',
    };
  }
  const status = blockedCount || blockers.length ? 'BLOCKED' : items.length ? 'OPEN' : 'CLEAR';
  return {
    status,
    ready: status === 'CLEAR',
    projectId: record.projectId,
    ...(record.projectName ? { projectName: record.projectName } : {}),
    ...counts,
    provenance: 'CONFIRMED',
  };
}

export function composeOnboardingDocumentReview(record: {
  identityResolutionRequired?: boolean;
  workspaceReconciled?: boolean;
  projectId?: string;
  projectName?: string;
  documentGaps?: OnboardingDocumentGap[];
  blockers?: string[];
  communicationPolicy?: OnboardingDocumentReview['communicationPolicy'];
}): OnboardingDocumentReview {
  const gaps = record.documentGaps ?? [];
  const confirmedCount = gaps.filter((d) => d.status === 'CONFIRMED').length;
  const missingCount = gaps.filter((d) => d.status === 'MISSING').length;
  const uncertainCount = gaps.filter((d) =>
    d.status === 'STALE_OR_UNCERTAIN' || d.status === 'LIKELY' || d.status === 'PROPOSED',
  ).length;
  const items = gaps
    .filter((d) => d.status !== 'CONFIRMED')
    .map((d) => `${d.label} (${d.status})`);
  const nextDocument =
    gaps.find((d) => d.status === 'MISSING')?.label
    ?? gaps.find((d) => d.status === 'STALE_OR_UNCERTAIN')?.label
    ?? gaps.find((d) => d.status === 'LIKELY' || d.status === 'PROPOSED')?.label;
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const blockers = record.blockers ?? [];
  const nextOwnerAction =
    record.identityResolutionRequired
      ? 'Assign client scope before document review'
      : blockers.length
        ? blockers[0]
        : missingCount
          ? `Reconcile or request missing documents (draft only): ${nextDocument ?? 'missing'}`
          : uncertainCount
            ? `Review uncertain documents (do not invent receipt): ${nextDocument ?? 'uncertain'}`
            : 'No open onboarding document items';
  const counts = {
    requirementCount: gaps.length,
    confirmedCount,
    missingCount,
    uncertainCount,
    items,
    ...(nextDocument ? { nextDocument } : {}),
    communicationPolicy,
    nextOwnerAction,
    send: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    outbound: false as const,
  };
  if (record.identityResolutionRequired || !record.workspaceReconciled || !record.projectId) {
    return {
      status: record.identityResolutionRequired ? 'NOT_READY' : blockers.length ? 'BLOCKED' : 'NOT_READY',
      ready: false,
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...counts,
      provenance: record.identityResolutionRequired ? 'CONFIRMED' : 'PROPOSED',
    };
  }
  const status = blockers.length ? 'BLOCKED' : items.length ? 'OPEN' : 'CLEAR';
  return {
    status,
    ready: status === 'CLEAR',
    projectId: record.projectId,
    ...(record.projectName ? { projectName: record.projectName } : {}),
    ...counts,
    provenance: missingCount || uncertainCount ? 'PROPOSED' : 'CONFIRMED',
  };
}

export function composeOnboardingIdentityReview(record: {
  identityResolutionRequired?: boolean;
  clientCode?: string;
  clientName?: string;
  entitled?: boolean;
  blockers?: string[];
  communicationPolicy?: OnboardingIdentityReview['communicationPolicy'];
}): OnboardingIdentityReview {
  const identityResolutionRequired = Boolean(record.identityResolutionRequired);
  const clientCode = record.clientCode?.trim().toUpperCase();
  const entitled = Boolean(record.entitled && clientCode);
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const blockers = record.blockers ?? [];
  const items: string[] = [];
  if (identityResolutionRequired || !clientCode) {
    items.push('Client scope missing — assign an entitled ClientCode before onboarding execution');
  } else if (!entitled) {
    items.push('ClientCode is not on the entitled roster — Atlas does not invent ClientCodes');
  }
  const nextOwnerAction =
    identityResolutionRequired || !clientCode
      ? 'Assign entitled client scope to the onboarding workflow'
      : !entitled
        ? 'Do not invent a ClientCode; use an entitled roster code'
        : blockers.includes('IDENTITY_RESOLUTION_REQUIRED')
          ? 'Assign entitled client scope to the onboarding workflow'
          : 'Client identity is reconciled against the entitled roster';
  const flags = {
    entitled,
    identityResolutionRequired,
    itemCount: items.length,
    items,
    communicationPolicy,
    nextOwnerAction,
    send: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    outbound: false as const,
  };
  if (identityResolutionRequired || !clientCode) {
    return {
      status: 'OPEN',
      ready: false,
      ...(clientCode ? { clientCode } : {}),
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...flags,
      provenance: 'CONFIRMED',
    };
  }
  if (!entitled) {
    return {
      status: 'BLOCKED',
      ready: false,
      clientCode,
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...flags,
      provenance: 'CONFIRMED',
    };
  }
  return {
    status: 'CLEAR',
    ready: true,
    clientCode,
    ...(record.clientName ? { clientName: record.clientName } : {}),
    ...flags,
    provenance: 'CONFIRMED',
  };
}

export function composeOnboardingWorkspaceReview(record: {
  identityResolutionRequired?: boolean;
  workspaceReconciled?: boolean;
  clientCode?: string;
  clientName?: string;
  reusedExisting?: boolean;
  blockers?: string[];
  communicationPolicy?: OnboardingWorkspaceReview['communicationPolicy'];
}): OnboardingWorkspaceReview {
  const identityResolutionRequired = Boolean(record.identityResolutionRequired);
  const workspaceReconciled = Boolean(record.workspaceReconciled);
  const reusedExisting = Boolean(record.reusedExisting && workspaceReconciled);
  const clientCode = record.clientCode?.trim().toUpperCase();
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const blockers = record.blockers ?? [];
  const items: string[] = [];
  if (identityResolutionRequired || !clientCode) {
    items.push('Client scope missing — assign an entitled ClientCode before workspace reconciliation');
  } else if (!workspaceReconciled) {
    items.push('Existing entitled workspace is not confirmed — Atlas will not invent or duplicate a workspace');
  }
  const nextOwnerAction =
    identityResolutionRequired || !clientCode
      ? 'Assign entitled client scope before workspace reconciliation'
      : !workspaceReconciled
        ? 'Confirm the existing entitled client workspace; do not create a duplicate'
        : 'Existing entitled workspace reused — no duplicate workspace created';
  const flags = {
    workspaceReconciled,
    reusedExisting,
    itemCount: items.length,
    items,
    communicationPolicy,
    nextOwnerAction,
    send: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    outbound: false as const,
  };
  if (identityResolutionRequired || !clientCode) {
    return {
      status: 'OPEN',
      ready: false,
      ...(clientCode ? { clientCode } : {}),
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...flags,
      provenance: 'CONFIRMED',
    };
  }
  if (!workspaceReconciled) {
    const status = blockers.length ? 'BLOCKED' : 'OPEN';
    return {
      status,
      ready: false,
      clientCode,
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...flags,
      provenance: 'PROPOSED',
    };
  }
  return {
    status: 'CLEAR',
    ready: true,
    clientCode,
    ...(record.clientName ? { clientName: record.clientName } : {}),
    ...flags,
    provenance: 'CONFIRMED',
  };
}

export function composeOnboardingProjectReview(record: {
  identityResolutionRequired?: boolean;
  clientCode?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  reusedExisting?: boolean;
  blockers?: string[];
  communicationPolicy?: OnboardingProjectReview['communicationPolicy'];
}): OnboardingProjectReview {
  const identityResolutionRequired = Boolean(record.identityResolutionRequired);
  const projectId = record.projectId?.trim();
  const projectReconciled = Boolean(projectId);
  const reusedExisting = Boolean(record.reusedExisting && projectReconciled);
  const clientCode = record.clientCode?.trim().toUpperCase();
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const blockers = record.blockers ?? [];
  const items: string[] = [];
  if (identityResolutionRequired || !clientCode) {
    items.push('Client scope missing — assign an entitled ClientCode before project reconciliation');
  } else if (!projectReconciled) {
    items.push('Existing entitled project is not confirmed — Atlas will not invent or duplicate a project');
  }
  const nextOwnerAction =
    identityResolutionRequired || !clientCode
      ? 'Assign entitled client scope before project reconciliation'
      : !projectReconciled
        ? 'Confirm the existing entitled onboarding project; do not create a duplicate'
        : reusedExisting
          ? 'Existing entitled onboarding project reused — no duplicate project created'
          : 'Governed onboarding project is reconciled — no duplicate project created';
  const flags = {
    projectReconciled,
    reusedExisting,
    itemCount: items.length,
    items,
    communicationPolicy,
    nextOwnerAction,
    send: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    outbound: false as const,
  };
  if (identityResolutionRequired || !clientCode) {
    return {
      status: 'OPEN',
      ready: false,
      ...(clientCode ? { clientCode } : {}),
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...(projectId ? { projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...flags,
      provenance: 'CONFIRMED',
    };
  }
  if (!projectReconciled) {
    const status = blockers.length ? 'BLOCKED' : 'OPEN';
    return {
      status,
      ready: false,
      clientCode,
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...flags,
      provenance: 'PROPOSED',
    };
  }
  return {
    status: 'CLEAR',
    ready: true,
    clientCode,
    ...(record.clientName ? { clientName: record.clientName } : {}),
    projectId,
    ...(record.projectName ? { projectName: record.projectName } : {}),
    ...flags,
    provenance: 'CONFIRMED',
  };
}

export function composeOnboardingTaskReview(record: {
  identityResolutionRequired?: boolean;
  clientCode?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  taskIds?: string[];
  reusedExisting?: boolean;
  blockers?: string[];
  communicationPolicy?: OnboardingTaskReview['communicationPolicy'];
}): OnboardingTaskReview {
  const identityResolutionRequired = Boolean(record.identityResolutionRequired);
  const taskIds = (record.taskIds ?? []).map((id) => id.trim()).filter(Boolean);
  const taskCount = taskIds.length;
  const taskReconciled = taskCount > 0;
  const reusedExisting = Boolean(record.reusedExisting && taskReconciled);
  const clientCode = record.clientCode?.trim().toUpperCase();
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const blockers = record.blockers ?? [];
  const items: string[] = [];
  if (identityResolutionRequired || !clientCode) {
    items.push('Client scope missing — assign an entitled ClientCode before task reconciliation');
  } else if (!taskReconciled) {
    items.push('Existing entitled onboarding tasks are not confirmed — Atlas will not invent or duplicate tasks');
  }
  const nextOwnerAction =
    identityResolutionRequired || !clientCode
      ? 'Assign entitled client scope before task reconciliation'
      : !taskReconciled
        ? 'Confirm the existing entitled onboarding tasks; do not create duplicates'
        : reusedExisting
          ? 'Existing entitled onboarding tasks reused — no duplicate tasks created'
          : 'Governed onboarding tasks are reconciled — no duplicate tasks created';
  const flags = {
    taskCount,
    taskReconciled,
    reusedExisting,
    itemCount: items.length,
    items,
    communicationPolicy,
    nextOwnerAction,
    send: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    outbound: false as const,
  };
  if (identityResolutionRequired || !clientCode) {
    return {
      status: 'OPEN',
      ready: false,
      ...(clientCode ? { clientCode } : {}),
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...flags,
      provenance: 'CONFIRMED',
    };
  }
  if (!taskReconciled) {
    const status = blockers.length ? 'BLOCKED' : 'OPEN';
    return {
      status,
      ready: false,
      clientCode,
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...flags,
      provenance: 'PROPOSED',
    };
  }
  return {
    status: 'CLEAR',
    ready: true,
    clientCode,
    ...(record.clientName ? { clientName: record.clientName } : {}),
    ...(record.projectId ? { projectId: record.projectId } : {}),
    ...(record.projectName ? { projectName: record.projectName } : {}),
    ...flags,
    provenance: 'CONFIRMED',
  };
}

export function composeOnboardingAgentAssignmentReview(record: {
  identityResolutionRequired?: boolean;
  clientCode?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  assignedAgents?: string[];
  reusedExisting?: boolean;
  blockers?: string[];
  communicationPolicy?: OnboardingAgentAssignmentReview['communicationPolicy'];
}): OnboardingAgentAssignmentReview {
  const identityResolutionRequired = Boolean(record.identityResolutionRequired);
  const assignedAgents = (record.assignedAgents ?? []).map((id) => id.trim()).filter(Boolean);
  const agentCount = assignedAgents.length;
  const agentReconciled = agentCount > 0;
  const reusedExisting = Boolean(record.reusedExisting && agentReconciled);
  const clientCode = record.clientCode?.trim().toUpperCase();
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const blockers = record.blockers ?? [];
  const items: string[] = [];
  if (identityResolutionRequired || !clientCode) {
    items.push('Client scope missing — assign an entitled ClientCode before agent assignment');
  } else if (!agentReconciled) {
    items.push('Existing entitled onboarding agents are not confirmed — Atlas will not invent or duplicate agents');
  }
  const nextOwnerAction =
    identityResolutionRequired || !clientCode
      ? 'Assign entitled client scope before agent assignment'
      : !agentReconciled
        ? 'Confirm the existing entitled onboarding agents; do not create duplicates'
        : reusedExisting
          ? 'Existing entitled onboarding agents reused — no duplicate agents created'
          : 'Governed onboarding agents are reconciled — no duplicate agents created';
  const flags = {
    agentCount,
    agentReconciled,
    reusedExisting,
    itemCount: items.length,
    items,
    communicationPolicy,
    nextOwnerAction,
    send: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    outbound: false as const,
  };
  if (identityResolutionRequired || !clientCode) {
    return {
      status: 'OPEN',
      ready: false,
      ...(clientCode ? { clientCode } : {}),
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...flags,
      provenance: 'CONFIRMED',
    };
  }
  if (!agentReconciled) {
    const status = blockers.length ? 'BLOCKED' : 'OPEN';
    return {
      status,
      ready: false,
      clientCode,
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...flags,
      provenance: 'PROPOSED',
    };
  }
  return {
    status: 'CLEAR',
    ready: true,
    clientCode,
    ...(record.clientName ? { clientName: record.clientName } : {}),
    ...(record.projectId ? { projectId: record.projectId } : {}),
    ...(record.projectName ? { projectName: record.projectName } : {}),
    ...flags,
    provenance: 'CONFIRMED',
  };
}

const EMPTY_LAST_INDEXED = {
  mailThreads: 0,
  meetings: 0,
  contacts: 0,
  files: 0,
  attachmentsIndexed: 0,
};

function snapshotKnownFabric(fabric?: RealtimeDocumentsFabricSnapshot): RealtimeDocumentsFabricSnapshot {
  const lastIndexed = fabric?.lastIndexed;
  return {
    lastRunAt: fabric?.lastRunAt ?? null,
    honesty: fabric?.honesty ?? 'never_run',
    mailDeltaReady: fabric?.mailDeltaReady === true,
    lastIndexed: {
      mailThreads: lastIndexed?.mailThreads ?? 0,
      meetings: lastIndexed?.meetings ?? 0,
      contacts: lastIndexed?.contacts ?? 0,
      files: lastIndexed?.files ?? 0,
      attachmentsIndexed: lastIndexed?.attachmentsIndexed ?? 0,
    },
    notes: Array.isArray(fabric?.notes) ? fabric.notes.filter((note) => note.trim().length > 0) : [],
    changeNotifications: {
      status: fabric?.changeNotifications?.status || 'skipped',
      mail: fabric?.changeNotifications?.mail || 'skipped',
      files: fabric?.changeNotifications?.files || 'skipped',
      calendar: fabric?.changeNotifications?.calendar || 'skipped',
    },
    attachmentLinks: {
      status: fabric?.attachmentLinks?.status === 'ready' ? 'ready' : 'skipped',
      reason:
        fabric?.attachmentLinks?.reason
        || 'No indexed outlook-mail-attachment metadata to link; attachment links remain unproven.',
    },
    contacts: {
      status:
        fabric?.contacts?.status === 'ready' || fabric?.contacts?.status === 'error'
          ? fabric.contacts.status
          : 'skipped',
      reason: fabric?.contacts?.reason || 'Contacts sweep has not completed; contacts remain unproven.',
    },
  };
}

function knownFabricFromDataDir(dataDir: string): RealtimeDocumentsFabricSnapshot {
  return inspectFabricSyncHealth(dataDir, { sweepEnabled: isFabricSweepEnabled() });
}

export function composeRealtimeDocumentsHonesty(record: {
  identityResolutionRequired?: boolean;
  clientCode?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  documentGaps?: OnboardingDocumentGap[];
  blockers?: string[];
  communicationPolicy?: OnboardingRealtimeDocumentsHonesty['communicationPolicy'];
  fabric?: RealtimeDocumentsFabricSnapshot;
}): OnboardingRealtimeDocumentsHonesty {
  const fabric = snapshotKnownFabric(record.fabric);
  const notes = fabric.notes ?? [];
  const fileSearchSkipped = notes.some((note) => /file search skipped/i.test(note));
  const oneDriveRecentSkipped = notes.some((note) => /onedrive recent skipped/i.test(note));
  const contactsEmpty =
    notes.some((note) => /contacts graph returned http 200 with an empty page/i.test(note))
    || (fabric.contacts?.status === 'ready' && /empty page/i.test(fabric.contacts.reason || ''));
  const lastIndexed = fabric.lastIndexed ?? EMPTY_LAST_INDEXED;
  const filesRealtime = Boolean(
    fabric.lastRunAt
    && fabric.honesty !== 'never_run'
    && !fileSearchSkipped
    && lastIndexed.files > 0,
  );
  const documentGaps = record.documentGaps ?? [];
  const confirmedCount = documentGaps.filter((gap) => gap.status === 'CONFIRMED').length;
  const missingCount = documentGaps.filter((gap) => gap.status === 'MISSING').length;
  const uncertainCount = documentGaps.filter((gap) =>
    gap.status === 'STALE_OR_UNCERTAIN' || gap.status === 'LIKELY' || gap.status === 'PROPOSED',
  ).length;
  const honestyNotes: string[] = [];
  if (fabric.mailDeltaReady) honestyNotes.push('mail delta ready');
  if (fileSearchSkipped) honestyNotes.push('file search skipped');
  if (oneDriveRecentSkipped) honestyNotes.push('OneDrive recent skipped');
  if (contactsEmpty) honestyNotes.push('contacts empty');
  const items: string[] = [];
  if (!fabric.lastRunAt || fabric.honesty === 'never_run') {
    items.push('Fabric sync has not completed a run — document freshness is unproven');
  }
  if (fileSearchSkipped) {
    items.push('Graph file search skipped — Atlas does not claim LIVE files');
  }
  if (oneDriveRecentSkipped) {
    items.push('OneDrive recent skipped — Atlas does not claim LIVE files');
  }
  if (contactsEmpty) {
    items.push('Contacts Graph returned an empty page');
  }
  for (const gap of documentGaps.filter((row) => row.status !== 'CONFIRMED')) {
    items.push(`${gap.label} (${gap.status})`);
  }
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const blockers = record.blockers ?? [];
  const clientCode = record.clientCode?.trim().toUpperCase();
  const nextOwnerAction =
    record.identityResolutionRequired
      ? 'Assign entitled client scope before treating documents as current'
      : fileSearchSkipped || oneDriveRecentSkipped
        ? 'Do not treat Graph files as LIVE; file search / OneDrive recent remain skipped'
        : !fabric.lastRunAt || fabric.honesty === 'never_run'
          ? 'Do not treat documents as realtime until fabric has completed a run'
          : missingCount
            ? 'Reconcile already-known missing documents (draft only); do not invent receipt'
            : uncertainCount
              ? 'Review already-known STALE_OR_UNCERTAIN documents; do not invent receipt'
              : filesRealtime
                ? 'Indexed files are present — Atlas still does not invent filenames or receipts'
                : 'Document freshness remains unproven against Graph file search';
  const flags = {
    lastRunAt: fabric.lastRunAt,
    lastIndexed,
    honesty: fabric.honesty,
    mailDeltaReady: fabric.mailDeltaReady,
    fileSearchSkipped,
    oneDriveRecentSkipped,
    contactsEmpty,
    filesRealtime,
    changeNotifications: fabric.changeNotifications ?? {
      status: 'skipped',
      mail: 'skipped',
      files: 'skipped',
      calendar: 'skipped',
    },
    attachmentLinks: fabric.attachmentLinks ?? {
      status: 'skipped' as const,
      reason: 'No indexed outlook-mail-attachment metadata to link; attachment links remain unproven.',
    },
    documentGaps,
    confirmedCount,
    missingCount,
    uncertainCount,
    honestyNotes,
    itemCount: items.length,
    items,
    communicationPolicy,
    nextOwnerAction,
    send: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    outbound: false as const,
  };
  if (record.identityResolutionRequired) {
    return {
      status: 'NOT_READY',
      ready: false,
      ...(clientCode ? { clientCode } : {}),
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...flags,
      provenance: 'CONFIRMED',
    };
  }
  if (blockers.length) {
    return {
      status: 'BLOCKED',
      ready: false,
      ...(clientCode ? { clientCode } : {}),
      ...(record.clientName ? { clientName: record.clientName } : {}),
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...flags,
      provenance: 'CONFIRMED',
    };
  }
  const status = !filesRealtime || items.length ? 'OPEN' : 'CLEAR';
  return {
    status,
    ready: status === 'CLEAR',
    ...(clientCode ? { clientCode } : {}),
    ...(record.clientName ? { clientName: record.clientName } : {}),
    ...(record.projectId ? { projectId: record.projectId } : {}),
    ...(record.projectName ? { projectName: record.projectName } : {}),
    ...flags,
    provenance: fileSearchSkipped || !filesRealtime ? 'STALE_OR_UNCERTAIN' : 'CONFIRMED',
  };
}

type CompletionGate = { label: string; status: string; ready: boolean };

export function composeOnboardingCompletion(record: {
  identityResolutionRequired?: boolean;
  workspaceReconciled?: boolean;
  projectId?: string;
  projectName?: string;
  operationsHandoff?: { status: string; ready: boolean };
  kickoff?: { status: string; ready: boolean };
  blockerReview?: { status: string; ready: boolean };
  ownerAttentionPackage?: { status: string; ready: boolean };
  milestoneReview?: { status: string; ready: boolean };
  communicationPolicy?: OnboardingCompletion['communicationPolicy'];
}): OnboardingCompletion {
  const communicationPolicy = record.communicationPolicy ?? 'DRAFT_ONLY';
  const gates: CompletionGate[] = [
    { label: 'operations handoff', status: record.operationsHandoff?.status ?? 'NOT_READY', ready: Boolean(record.operationsHandoff?.ready) },
    { label: 'kickoff', status: record.kickoff?.status ?? 'NOT_READY', ready: Boolean(record.kickoff?.ready) },
    { label: 'blocker review', status: record.blockerReview?.status ?? 'NOT_READY', ready: Boolean(record.blockerReview?.ready) },
    { label: 'owner attention', status: record.ownerAttentionPackage?.status ?? 'NOT_READY', ready: Boolean(record.ownerAttentionPackage?.ready) },
    { label: 'milestone review', status: record.milestoneReview?.status ?? 'NOT_READY', ready: Boolean(record.milestoneReview?.ready) },
  ];
  const packageCount = gates.length;
  const readyCount = gates.filter((g) => g.ready).length;
  const blockedCount = gates.filter((g) => g.status === 'BLOCKED').length;
  const openItems = gates.filter((g) => !g.ready).map((g) => `${g.label} (${g.status})`);
  const nextOwnerAction =
    record.identityResolutionRequired
      ? 'Assign client scope before onboarding completion'
      : blockedCount
        ? `Clear blocked package: ${gates.find((g) => g.status === 'BLOCKED')?.label ?? 'blocked'}`
        : openItems[0]
          ? `Advance package: ${openItems[0]}`
          : 'No open onboarding completion items';
  const counts = {
    packageCount,
    readyCount,
    blockedCount,
    openItems,
    communicationPolicy,
    nextOwnerAction,
    send: false as const,
    liveGtmOutbound: false as const,
    capitalSubmit: false as const,
    outbound: false as const,
  };
  if (record.identityResolutionRequired || !record.workspaceReconciled || !record.projectId) {
    return {
      status: record.identityResolutionRequired ? 'NOT_READY' : blockedCount ? 'BLOCKED' : 'NOT_READY',
      ready: false,
      ...(record.projectId ? { projectId: record.projectId } : {}),
      ...(record.projectName ? { projectName: record.projectName } : {}),
      ...counts,
      provenance: record.identityResolutionRequired ? 'CONFIRMED' : 'PROPOSED',
    };
  }
  const status = blockedCount ? 'BLOCKED' : openItems.length ? 'OPEN' : 'CLEAR';
  return {
    status,
    ready: status === 'CLEAR',
    projectId: record.projectId,
    ...(record.projectName ? { projectName: record.projectName } : {}),
    ...counts,
    provenance: 'CONFIRMED',
  };
}

function computeStatus(record: Partial<OnboardingRunRecord>): OnboardingLifecycleStatus {
  if (record.identityResolutionRequired) return 'IDENTITY_RECONCILIATION';
  const missingDocs = record.documentGaps?.filter((d) => d.status === 'MISSING').length ?? 0;
  if (missingDocs > 0) return 'DOCUMENT_COLLECTION';
  if (!record.projectId) return 'PROJECT_SETUP';
  if (record.ownerAttention?.length) return 'WAITING_ON_OWNER';
  if (record.blockers?.length) return 'BLOCKED';
  const milestones = record.milestones ?? [];
  const kickoffReady = milestones.find((m) => m.id === 'kickoff_ready');
  if (kickoffReady?.status === 'complete') return 'IN_PROGRESS';
  if (milestones.every((m) => m.status === 'complete')) return 'COMPLETE';
  return 'KICKOFF_PREPARATION';
}

/** Persist IDENTITY_RECONCILIATION without creating project, task, milestone, Hub-MI, or outbound. */
function buildIdentityReconciliationRecord(opts: {
  workflow: WorkflowDefinitionRecord;
  dataDir: string;
  now: string;
  dryRun?: boolean;
  clientCode?: string;
  clientName?: string;
  blockers: string[];
  ownerAttention: string[];
}): OnboardingRunRecord {
  const identityResolutionRequired = true;
  const workspaceReconciled = false;
  const capitalScope = Boolean(opts.workflow.scope.capitalMatter);
  const milestones = milestoneTemplate();
  const operationsHandoff = composeOperationsHandoff({
    identityResolutionRequired,
    workspaceReconciled,
    blockers: opts.blockers,
    ownerAttention: opts.ownerAttention,
    communicationPolicy: 'DRAFT_ONLY',
    capitalScope,
  });
  const kickoff = composeKickoff({
    identityResolutionRequired,
    workspaceReconciled,
    blockers: opts.blockers,
    ownerAttention: opts.ownerAttention,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const blockerReview = composeBlockerReview({
    identityResolutionRequired,
    workspaceReconciled,
    blockers: opts.blockers,
    ownerAttention: opts.ownerAttention,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const ownerAttentionPackage = composeOwnerAttention({
    identityResolutionRequired,
    workspaceReconciled,
    ownerAttention: opts.ownerAttention,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const milestoneReview = composeMilestoneReview({
    identityResolutionRequired,
    workspaceReconciled,
    milestones,
    blockers: opts.blockers,
    communicationPolicy: 'DRAFT_ONLY',
  });
  return {
    workflowId: opts.workflow.workflowId,
    workflowDefinitionId: opts.workflow.workflowDefinitionId,
    ...(opts.clientCode ? { clientCode: opts.clientCode } : {}),
    ...(opts.clientName ? { clientName: opts.clientName } : {}),
    status: 'IDENTITY_RECONCILIATION',
    currentStep: 'Resolve authoritative ClientCode',
    nextStep: 'Provide client scope before onboarding execution',
    blockers: opts.blockers,
    ownerAttention: opts.ownerAttention,
    taskIds: [],
    milestoneIds: [],
    assignedAgents: [],
    documentGaps: [],
    communicationPolicy: 'DRAFT_ONLY',
    capitalScope,
    identityResolutionRequired,
    workspaceReconciled,
    documentsReconciled: false,
    milestoneReconciled: false,
    dryRun: Boolean(opts.dryRun),
    createdAt: opts.now,
    updatedAt: opts.now,
    lastExecutedAt: opts.now,
    milestones,
    operationsHandoff,
    kickoff,
    blockerReview,
    ownerAttentionPackage,
    milestoneReview,
    completion: composeOnboardingCompletion({
      identityResolutionRequired,
      workspaceReconciled,
      operationsHandoff: { status: 'NOT_READY', ready: false },
      kickoff: { status: 'NOT_READY', ready: false },
      blockerReview: { status: 'NOT_READY', ready: false },
      ownerAttentionPackage: { status: 'NOT_READY', ready: false },
      milestoneReview: { status: 'NOT_READY', ready: false },
      communicationPolicy: 'DRAFT_ONLY',
    }),
    documentReview: composeOnboardingDocumentReview({
      identityResolutionRequired,
      workspaceReconciled,
      blockers: opts.blockers,
      communicationPolicy: 'DRAFT_ONLY',
    }),
    identityReview: composeOnboardingIdentityReview({
      identityResolutionRequired,
      ...(opts.clientCode ? { clientCode: opts.clientCode } : {}),
      ...(opts.clientName ? { clientName: opts.clientName } : {}),
      blockers: opts.blockers,
      communicationPolicy: 'DRAFT_ONLY',
    }),
    workspaceReview: composeOnboardingWorkspaceReview({
      identityResolutionRequired,
      workspaceReconciled,
      blockers: opts.blockers,
      communicationPolicy: 'DRAFT_ONLY',
    }),
    projectReview: composeOnboardingProjectReview({
      identityResolutionRequired,
      blockers: opts.blockers,
      communicationPolicy: 'DRAFT_ONLY',
    }),
    taskReview: composeOnboardingTaskReview({
      identityResolutionRequired,
      blockers: opts.blockers,
      communicationPolicy: 'DRAFT_ONLY',
    }),
    agentAssignmentReview: composeOnboardingAgentAssignmentReview({
      identityResolutionRequired,
      blockers: opts.blockers,
      communicationPolicy: 'DRAFT_ONLY',
    }),
    realtimeDocumentsHonesty: composeRealtimeDocumentsHonesty({
      identityResolutionRequired,
      blockers: opts.blockers,
      communicationPolicy: 'DRAFT_ONLY',
      fabric: knownFabricFromDataDir(opts.dataDir),
    }),
    provenance: 'onboarding_automation',
  };
}

async function persistIdentityReconciliation(opts: {
  workflow: WorkflowDefinitionRecord;
  principal: AtlasPrincipal;
  dataDir: string;
  now: string;
  dryRun?: boolean;
  clientCode?: string;
  clientName?: string;
  blockers: string[];
  ownerAttention: string[];
}): Promise<OnboardingAutomationResult> {
  const record = buildIdentityReconciliationRecord(opts);
  upsertOnboardingRun(resolveOnboardingStateDir(opts.dataDir), record);
  await appendOnboardingActivity({
    dataDir: opts.dataDir,
    principal: opts.principal,
    event: 'ONBOARDING_STARTED',
    ...(opts.clientCode ? { clientCode: opts.clientCode } : {}),
    summary: opts.clientCode
      ? `${opts.clientName ?? opts.clientCode}: IDENTITY_RECONCILIATION`
      : 'Onboarding started — identity resolution required',
  });
  return { ok: true, record, events: ['ONBOARDING_STARTED'] };
}

export async function runClientOnboardingAutomation(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  sharepoint: SharePointPmService | null;
  workflow: WorkflowDefinitionRecord;
  dryRun?: boolean;
  documentRequestList?: (
    dataDir: string,
    clientCode: string,
  ) => DocumentRequestRecord[] | Promise<DocumentRequestRecord[]>;
  documentRequestCreate?: (
    dataDir: string,
    input: { clientCode: string; title: string; createdBy: string },
  ) => { id?: string } | Promise<{ id?: string }>;
  agentAssign?: (
    input: OnboardingAgentAssignInput,
  ) => OnboardingAgentAssignResult | Promise<OnboardingAgentAssignResult>;
  milestoneList?: (
    principal: AtlasPrincipal,
    projectId: string,
  ) => OnboardingMilestoneRow[] | Promise<OnboardingMilestoneRow[]>;
  milestoneCreate?: (
    principal: AtlasPrincipal,
    body: { title: string; projectId: string; status?: string },
  ) => { id?: string } | Promise<{ id?: string }>;
}): Promise<OnboardingAutomationResult> {
  if (!isOnboardingWorkflow(opts.workflow)) {
    return { ok: false, error: 'not_onboarding_workflow' };
  }

  const clientCode = opts.workflow.scope.clientCode?.trim().toUpperCase();
  const now = new Date().toISOString();
  const events: string[] = ['ONBOARDING_STARTED'];
  const dir = resolveOnboardingStateDir(opts.dataDir);

  if (!clientCode) {
    return persistIdentityReconciliation({
      workflow: opts.workflow,
      principal: opts.principal,
      dataDir: opts.dataDir,
      now,
      dryRun: opts.dryRun,
      blockers: ['IDENTITY_RESOLUTION_REQUIRED'],
      ownerAttention: ['Assign client scope to onboarding workflow'],
    });
  }

  if (!isCanonicalClientCode(clientCode)) {
    return { ok: false, error: 'invalid_client_code' };
  }
  if (!entitledClientCodes(opts.principal).includes(clientCode)) {
    return { ok: false, error: 'client_not_entitled' };
  }

  const sp = opts.sharepoint;
  let clientName = opts.workflow.scope.clientName?.trim() || clientCode;
  const entitledMatches = sp
    ? (await sp.listAuthorizedClients(opts.principal)).filter((c) => c.clientCode === clientCode)
    : [];
  if (!sp || entitledMatches.length !== 1) {
    return persistIdentityReconciliation({
      workflow: opts.workflow,
      principal: opts.principal,
      dataDir: opts.dataDir,
      now,
      dryRun: opts.dryRun,
      clientCode,
      clientName,
      blockers: ['IDENTITY_RESOLUTION_REQUIRED'],
      ownerAttention: !sp
        ? ['Confirm SharePoint PM availability and entitled HVCG_Clients identity']
        : ['Confirm client activation and entitlement'],
    });
  }

  const client = entitledMatches[0];
  clientName = client.displayName || clientName;
  let workspaceReconciled = false;
  let documentsReconciled = false;
  let projectId: string | undefined;
  let projectName: string | undefined;
  let reusedExistingProject = false;
  const taskIds: string[] = [];
  let reusedExistingTasks = false;
  const assignedAgents: string[] = [];
  const milestoneIds: string[] = [];
  let reusedExistingMilestones = false;
  const blockers: string[] = [];
  const ownerAttention: string[] = [];
  const documentGaps: OnboardingDocumentGap[] = [];
  const milestones = milestoneTemplate();
  milestones.find((m) => m.id === 'identity_verified')!.status = 'complete';
  milestones.find((m) => m.id === 'identity_verified')!.provenance = 'CONFIRMED';
  events.push('CLIENT_IDENTITY_RECONCILED');

  const projects = await sp.listAuthorizedProjects(opts.principal);
  const existingProject = projects.find(
    (p) => p.clientCode === clientCode && ONBOARDING_PROJECT_TITLE.test(p.name || ''),
  );
  if (existingProject?.id) {
    reusedExistingProject = true;
    projectId = existingProject.id;
    projectName = existingProject.name;
    workspaceReconciled = true;
    milestones.find((m) => m.id === 'agreement_scope_verified')!.status = 'in_progress';
    milestones.find((m) => m.id === 'agreement_scope_verified')!.provenance = 'CONFIRMED';
  } else if (!opts.dryRun) {
    try {
      const created = await sp.createProject(opts.principal, {
        name: `Client Onboarding — ${clientName}`,
        clientCode,
        objective: 'Governed client onboarding established by Atlas automation.',
        status: 'active',
        nextAction: 'Complete onboarding checklist',
      }, `atlas-onboarding-project-${clientCode}`);
      if (created?.id) {
        projectId = created.id;
        projectName = created.name;
        workspaceReconciled = true;
        events.push('PROJECT_CREATED');
      }
    } catch {
      /* create failed — do not invent a workspace or claim reconciliation */
    }
  }

  if (projectId) {
    const existingTasks = await sp.listAuthorizedTasks(opts.principal, projectId);
    const missingTasks: typeof DEFAULT_ONBOARDING_TASKS[number][] = [];
    for (const taskDef of DEFAULT_ONBOARDING_TASKS) {
      const found = existingTasks.find((t) => t.title === taskDef.title);
      if (found?.id) {
        taskIds.push(found.id);
        reusedExistingTasks = true;
      } else {
        missingTasks.push(taskDef);
      }
    }
    if (!opts.dryRun && missingTasks.length) {
      try {
        let createdWithId = false;
        for (const taskDef of missingTasks) {
          const task = await sp.createTask(opts.principal, {
            title: taskDef.title,
            description: taskDef.purpose,
            projectId,
            status: 'ready',
          }, `atlas-onboarding-task-${clientCode}-${taskDef.key}`);
          if (task?.id) {
            taskIds.push(task.id);
            createdWithId = true;
          }
        }
        if (createdWithId) events.push('TASKS_CREATED');
      } catch {
        /* create failed — do not invent a task id */
      }
    }
  }

  if (projectId) {
    const listMilestonesFn = opts.milestoneList
      ?? ((principal: AtlasPrincipal, id: string) => defaultOnboardingMilestoneList(sp, principal, id));
    const createMilestoneFn = opts.milestoneCreate
      ?? ((principal: AtlasPrincipal, body: { title: string; projectId: string; status?: string }) =>
        defaultOnboardingMilestoneCreate(sp, principal, body));
    const existingMilestones = await listMilestonesFn(opts.principal, projectId);
    const missingMilestones: typeof DEFAULT_MILESTONES[number][] = [];
    for (const milestoneDef of DEFAULT_MILESTONES) {
      const found = existingMilestones.find((row) => row.title === milestoneDef.label);
      if (found?.id) {
        milestoneIds.push(found.id);
        reusedExistingMilestones = true;
      } else {
        missingMilestones.push(milestoneDef);
      }
    }
    if (!opts.dryRun && missingMilestones.length) {
      try {
        let createdWithId = false;
        for (const milestoneDef of missingMilestones) {
          const milestone = await createMilestoneFn(opts.principal, {
            title: milestoneDef.label,
            projectId,
            status: 'pending',
          });
          if (milestone?.id) {
            milestoneIds.push(milestone.id);
            createdWithId = true;
          }
        }
        if (createdWithId) events.push('MILESTONE_CREATED');
      } catch {
        /* create failed — do not invent a milestone id */
      }
    }
  }
  const milestoneReconciled = milestoneIds.length > 0;

  const assignResponsibleAgent = opts.agentAssign ?? defaultOnboardingAgentAssign;
  if (projectId && taskIds.length && !opts.dryRun) {
    try {
      const assigned = await assignResponsibleAgent({
        clientCode,
        projectId,
        taskIds: [...taskIds],
        ...(opts.workflow.responsibleAgent?.trim()
          ? { agentId: opts.workflow.responsibleAgent.trim() }
          : {}),
      });
      const agentId = assigned?.agentId?.trim();
      if (assigned?.id && agentId) {
        assignedAgents.push(agentId);
        events.push('AGENTS_ASSIGNED');
      }
    } catch {
      /* assign failed — do not invent an assignee or claim assignment complete */
    }
  }

  const listDocumentRequestsFn = opts.documentRequestList ?? listDocumentRequests;
  const createDocumentRequestFn = opts.documentRequestCreate ?? createDocumentRequest;
  try {
    const docRequests = await listDocumentRequestsFn(opts.dataDir, clientCode);
    const reusable = docRequests.filter((row) => Boolean(row.id));
    for (const reqLabel of DEFAULT_DOCUMENT_REQUIREMENTS) {
      const matched = docRequests.find((r) =>
        (r.title || '').toLowerCase().includes(reqLabel.split(' ')[0].toLowerCase()),
      );
      documentGaps.push({
        label: reqLabel,
        status: matched ? 'CONFIRMED' : 'MISSING',
        source: matched ? 'HVCG_DocumentRequests' : undefined,
      });
    }
    if (reusable.length > 0) {
      documentsReconciled = true;
      events.push('DOCUMENT_RECONCILED');
    } else if (!opts.dryRun) {
      try {
        let createdWithId = false;
        for (const reqLabel of DEFAULT_DOCUMENT_REQUIREMENTS) {
          const created = await createDocumentRequestFn(opts.dataDir, {
            clientCode,
            title: reqLabel,
            createdBy: opts.principal.userId,
          });
          if (created?.id) {
            createdWithId = true;
            const gap = documentGaps.find((row) => row.label === reqLabel);
            if (gap) {
              gap.status = 'CONFIRMED';
              gap.source = 'HVCG_DocumentRequests';
            }
          }
        }
        if (createdWithId) {
          documentsReconciled = true;
          events.push('DOCUMENT_REQUIREMENTS_CREATED', 'DOCUMENT_RECONCILED');
        }
      } catch {
        /* create failed — do not invent documents or claim reconciliation */
      }
    }
  } catch {
    for (const reqLabel of DEFAULT_DOCUMENT_REQUIREMENTS) {
      documentGaps.push({ label: reqLabel, status: 'STALE_OR_UNCERTAIN' });
    }
  }

  const capitalScope = Boolean(opts.workflow.scope.capitalMatter);
  if (capitalScope) {
    ownerAttention.push('Capital scope detected — external lender submission remains owner-gated');
  }

  ownerAttention.push('Outbound onboarding communications remain DRAFT_ONLY unless explicit policy permits');

  const partial: Partial<OnboardingRunRecord> = {
    identityResolutionRequired: false,
    workspaceReconciled,
    documentsReconciled,
    milestoneReconciled,
    projectId,
    documentGaps,
    milestones,
    ownerAttention,
    blockers,
  };
  const status = computeStatus(partial);
  const operationsHandoff = composeOperationsHandoff({
    identityResolutionRequired: false,
    workspaceReconciled,
    projectId,
    projectName,
    taskIds,
    milestoneIds,
    documentGaps,
    blockers,
    ownerAttention,
    communicationPolicy: 'DRAFT_ONLY',
    capitalScope,
  });
  const kickoff = composeKickoff({
    identityResolutionRequired: false,
    workspaceReconciled,
    projectId,
    projectName,
    milestones,
    documentGaps,
    blockers,
    ownerAttention,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const blockerReview = composeBlockerReview({
    identityResolutionRequired: false,
    workspaceReconciled,
    projectId,
    projectName,
    documentGaps,
    blockers,
    ownerAttention,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const ownerAttentionPackage = composeOwnerAttention({
    identityResolutionRequired: false,
    workspaceReconciled,
    projectId,
    projectName,
    ownerAttention,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const milestoneReview = composeMilestoneReview({
    identityResolutionRequired: false,
    workspaceReconciled,
    projectId,
    projectName,
    milestones,
    milestoneIds,
    reusedExisting: reusedExistingMilestones,
    blockers,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const completion = composeOnboardingCompletion({
    identityResolutionRequired: false,
    workspaceReconciled,
    projectId,
    projectName,
    operationsHandoff,
    kickoff,
    blockerReview,
    ownerAttentionPackage,
    milestoneReview,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const documentReview = composeOnboardingDocumentReview({
    identityResolutionRequired: false,
    workspaceReconciled,
    projectId,
    projectName,
    documentGaps,
    blockers,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const identityReview = composeOnboardingIdentityReview({
    identityResolutionRequired: false,
    clientCode,
    clientName,
    entitled: true,
    blockers,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const workspaceReview = composeOnboardingWorkspaceReview({
    identityResolutionRequired: false,
    workspaceReconciled,
    clientCode,
    clientName,
    reusedExisting: workspaceReconciled,
    blockers,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const projectReview = composeOnboardingProjectReview({
    identityResolutionRequired: false,
    clientCode,
    clientName,
    projectId,
    projectName,
    reusedExisting: reusedExistingProject,
    blockers,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const taskReview = composeOnboardingTaskReview({
    identityResolutionRequired: false,
    clientCode,
    clientName,
    projectId,
    projectName,
    taskIds,
    reusedExisting: reusedExistingTasks,
    blockers,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const agentAssignmentReview = composeOnboardingAgentAssignmentReview({
    identityResolutionRequired: false,
    clientCode,
    clientName,
    projectId,
    projectName,
    assignedAgents,
    reusedExisting: false,
    blockers,
    communicationPolicy: 'DRAFT_ONLY',
  });
  const realtimeDocumentsHonesty = composeRealtimeDocumentsHonesty({
    identityResolutionRequired: false,
    clientCode,
    clientName,
    projectId,
    projectName,
    documentGaps,
    blockers,
    communicationPolicy: 'DRAFT_ONLY',
    fabric: knownFabricFromDataDir(opts.dataDir),
  });
  if (operationsHandoff.status !== 'NOT_READY') events.push('OPERATIONS_HANDOFF');
  if (kickoff.status !== 'NOT_READY') events.push('KICKOFF');
  if (blockerReview.status !== 'NOT_READY') events.push('BLOCKER_REVIEW');
  if (ownerAttentionPackage.status !== 'NOT_READY') events.push('OWNER_ATTENTION');
  if (milestoneReview.status !== 'NOT_READY') events.push('MILESTONE_REVIEW');
  if (completion.status !== 'NOT_READY') events.push('COMPLETION');
  if (documentReview.status !== 'NOT_READY') events.push('DOCUMENT_REVIEW');
  if (identityReview.status !== 'NOT_READY') events.push('IDENTITY_REVIEW');
  if (workspaceReview.status !== 'NOT_READY') events.push('WORKSPACE_REVIEW');
  if (projectReview.status !== 'NOT_READY') events.push('PROJECT_REVIEW');
  if (taskReview.status !== 'NOT_READY') events.push('TASK_REVIEW');
  if (agentAssignmentReview.status !== 'NOT_READY') events.push('AGENT_ASSIGNMENT_REVIEW');
  if (realtimeDocumentsHonesty.status !== 'NOT_READY') events.push('REALTIME_DOCUMENTS_HONESTY');

  const record: OnboardingRunRecord = {
    workflowId: opts.workflow.workflowId,
    workflowDefinitionId: opts.workflow.workflowDefinitionId,
    clientCode,
    clientName,
    status,
    currentStep: status === 'DOCUMENT_COLLECTION' ? 'Collect missing onboarding documents' : 'Establish onboarding operating structure',
    nextStep:
      documentGaps.some((d) => d.status === 'MISSING')
        ? 'Reconcile or request missing documents (draft only)'
        : operationsHandoff.ready
          ? 'Owner review of operations handoff (no send / no capital submit)'
          : 'Prepare kickoff and operating baseline',
    blockers,
    ownerAttention,
    projectId,
    projectName,
    taskIds,
    milestoneIds,
    assignedAgents,
    documentGaps,
    communicationPolicy: 'DRAFT_ONLY',
    capitalScope,
    identityResolutionRequired: false,
    workspaceReconciled,
    documentsReconciled,
    milestoneReconciled,
    dryRun: Boolean(opts.dryRun),
    createdAt: now,
    updatedAt: now,
    lastExecutedAt: now,
    milestones,
    operationsHandoff,
    kickoff,
    blockerReview,
    ownerAttentionPackage,
    milestoneReview,
    completion,
    documentReview,
    identityReview,
    workspaceReview,
    projectReview,
    taskReview,
    agentAssignmentReview,
    realtimeDocumentsHonesty,
    provenance: 'onboarding_automation',
  };

  upsertOnboardingRun(dir, record);
  await appendOnboardingActivity({
    dataDir: opts.dataDir,
    principal: opts.principal,
    event: status === 'COMPLETE' ? 'ONBOARDING_COMPLETED' : 'ONBOARDING_STARTED',
    clientCode,
    summary: `${clientName}: ${status}`,
  });

  return { ok: true, record, events };
}

/** Canonical entitled ClientCodes. Never invent a code outside this roster. */
export const ENTITLED_CANONICAL_CLIENT_CODES = ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01'] as const;

export type EntitledClientCodeMatch =
  | { kind: 'exact' | 'unique_prefix'; clientCode: string; candidates: string[] }
  | { kind: 'none' | 'ambiguous'; clientCode?: undefined; candidates: string[] };

export type OnboardingExistingProject = {
  name: string;
  clientCode: string;
  status?: string;
  health?: string;
};

export type OnboardingExistingWorkflow = {
  name: string;
  clientCode?: string;
  status?: string;
  workflowType?: string;
};

function codeTokenBoundary(code: string): RegExp {
  return new RegExp(`(?:^|[^A-Z0-9])${code}(?:[^A-Z0-9]|$)`);
}

function questionTokens(question: string): string[] {
  return question.toUpperCase().match(/[A-Z][A-Z0-9]{1,15}/g) ?? [];
}

export function resolveEntitledClientCodeFromQuestion(
  question: string,
  entitledCodes: readonly string[],
): EntitledClientCodeMatch {
  const roster = entitledCodes.filter((code) =>
    (ENTITLED_CANONICAL_CLIENT_CODES as readonly string[]).includes(code),
  );
  const upper = question.toUpperCase();
  const exact = roster.filter((code) => codeTokenBoundary(code).test(upper));
  if (exact.length === 1) return { kind: 'exact', clientCode: exact[0], candidates: exact };
  if (exact.length > 1) return { kind: 'ambiguous', candidates: exact };

  const tokens = questionTokens(question);
  const prefixHits = new Set<string>();
  for (const token of tokens) {
    for (const code of roster) {
      if (code.startsWith(token) && token.length < code.length) prefixHits.add(code);
    }
  }
  const prefixed = [...prefixHits];
  if (prefixed.length === 1) return { kind: 'unique_prefix', clientCode: prefixed[0], candidates: prefixed };
  if (prefixed.length > 1) return { kind: 'ambiguous', candidates: prefixed };
  return { kind: 'none', candidates: [] };
}

export function isOnboardingProjectTitle(name: string | undefined): boolean {
  return ONBOARDING_PROJECT_TITLE.test(name || '');
}

export function findEntitledOnboardingProject<T extends OnboardingExistingProject>(
  projects: T[],
  clientCode: string,
): T | undefined {
  return projects.find((p) => p.clientCode === clientCode && isOnboardingProjectTitle(p.name));
}

export function findEntitledOnboardingWorkflow<T extends OnboardingExistingWorkflow>(
  workflows: T[],
  clientCode: string,
): T | undefined {
  return workflows.find(
    (w) =>
      w.clientCode === clientCode &&
      (/onboard/i.test(w.name) || w.workflowType === 'client_onboarding'),
  );
}

const TERMINAL_WORKFLOW_STATUSES = new Set(['REJECTED', 'DISABLED']);

export function findEntitledOnboardingWorkflowDefinition(
  definitions: WorkflowDefinitionRecord[],
  clientCode: string,
): WorkflowDefinitionRecord | undefined {
  const eligible = definitions.filter(
    (d) =>
      d.scope.clientCode === clientCode &&
      isOnboardingWorkflow(d) &&
      !TERMINAL_WORKFLOW_STATUSES.has(d.status),
  );
  return eligible.find((d) => d.status === 'ACTIVE') ?? eligible[0];
}

const ONBOARDING_CONTEXT_PHRASES = [
  'where are we',
  'missing',
  'blocked',
  'waiting on',
  'kickoff',
  'kick off',
  'approve',
  'document',
  'document review',
  'document collection',
  'identity',
  'identity review',
  'client scope',
  'client code',
  'workspace',
  'workspace review',
  'project review',
  'project setup',
  'task review',
  'onboarding tasks',
  'onboarding task',
  'agent assignment',
  'assigned agent',
  'agent review',
  'realtime',
  'real-time',
  'freshness',
  'current document',
  'reconcile',
  'start',
  'run',
  'execute',
  'activate',
  'begin',
  'status',
  'handoff',
  'blocker',
  'owner attention',
  'attention',
  'milestone',
  'complete',
  'completion',
  'finished',
] as const;

const ONBOARDING_EXECUTE_VERB = /\b(start|run|execute|activate|begin)\b/;

export function mapsToOnboardingExecuteIntent(question: string): boolean {
  const q = question.toLowerCase();
  return q.includes('onboarding') && ONBOARDING_EXECUTE_VERB.test(q);
}

export function classifyOnboardingAskAtlasIntent(question: string): 'execute' | 'status' | null {
  if (!mapsToOnboardingContextIntent(question)) return null;
  return mapsToOnboardingExecuteIntent(question) ? 'execute' : 'status';
}

function formatExistingProjectStatus(project: OnboardingExistingProject): string {
  const parts: string[] = [];
  const status = (project.status || '').toLowerCase();
  if (status === 'draft' || status === 'not started') parts.push('Draft');
  else if (project.status) parts.push(project.status);
  const health = (project.health || '').toLowerCase();
  if (!project.health || health === 'unknown' || health === 'not assessed') parts.push('Unverified');
  return parts.join(' | ');
}

function answerFromExistingOnboarding(
  match: EntitledClientCodeMatch,
  extras: {
    existingProject?: OnboardingExistingProject;
    existingWorkflow?: OnboardingExistingWorkflow;
  },
): string {
  if (match.kind === 'ambiguous') {
    return `Multiple entitled ClientCodes match that question (${match.candidates.join(', ')}). Which entitled code? Atlas does not invent or guess a ClientCode.`;
  }
  if (match.kind === 'none') {
    return 'No entitled ClientCode matched that onboarding question. Atlas matches unique prefixes against the entitled roster only and does not invent ClientCodes.';
  }
  const code = match.clientCode;
  const project = extras.existingProject;
  const workflow = extras.existingWorkflow;
  if (!project && !workflow) {
    return `No onboarding run found for entitled ${code}. No entitled onboarding project or workflow was visible either. Atlas did not create a duplicate project, task, milestone, or ClientCode.`;
  }
  return [
    `Onboarding for ${code}`,
    project ? `Existing project: ${project.name}${formatExistingProjectStatus(project) ? ` (${formatExistingProjectStatus(project)})` : ''}` : '',
    workflow ? `Existing workflow: ${workflow.name}${workflow.status ? ` (${workflow.status})` : ''}` : '',
    'No governed onboarding automation run is recorded for this entitled project (template-created, not run_onboarding).',
    'Atlas did not create a duplicate project, task, milestone, or ClientCode.',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatRealtimeDocumentsHonesty(
  pack: OnboardingRealtimeDocumentsHonesty,
  scope: string,
): string {
  return [
    `Document freshness for ${scope}: ${pack.status}`,
    pack.clientCode ? `ClientCode: ${pack.clientCode}` : '',
    pack.projectName ? `Project: ${pack.projectName}` : '',
    `Fabric lastRunAt: ${pack.lastRunAt ?? 'never_run'}`,
    `Fabric honesty: ${pack.honesty}`,
    pack.mailDeltaReady ? 'Mail: delta ready' : 'Mail: delta not ready',
    pack.fileSearchSkipped
      ? 'File search: skipped — Atlas does not claim LIVE files'
      : pack.filesRealtime
        ? 'Indexed files are present — Atlas does not invent filenames'
        : 'File search: not proven LIVE',
    pack.oneDriveRecentSkipped ? 'OneDrive recent: skipped' : '',
    pack.contactsEmpty ? 'Contacts: empty' : '',
    `Change notifications mail/files/calendar: ${pack.changeNotifications.mail}/${pack.changeNotifications.files}/${pack.changeNotifications.calendar}`,
    `Attachment links: ${pack.attachmentLinks.status}`,
    pack.documentGaps.length
      ? `Document gaps: ${pack.documentGaps.map((gap) => `${gap.label} (${gap.status})`).join('; ')}`
      : 'No entitled documentGaps on this run.',
    pack.honestyNotes.length ? `Honesty: ${pack.honestyNotes.join('; ')}` : '',
    pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open document-freshness items.',
    `Communication policy: ${pack.communicationPolicy}`,
    `Next owner action: ${pack.nextOwnerAction}`,
    'Atlas did not invent filenames, receipts, ClientCodes, or counts. Atlas did not call Graph /search/query.',
    'Atlas did not send mail, launch GTM, or submit capital.',
  ]
    .filter(Boolean)
    .join('\n');
}

export function answerOnboardingContext(
  question: string,
  record: OnboardingRunRecord | null,
  extras?: {
    match?: EntitledClientCodeMatch;
    existingProject?: OnboardingExistingProject;
    existingWorkflow?: OnboardingExistingWorkflow;
    fabric?: RealtimeDocumentsFabricSnapshot;
  },
): string {
  const q = question.toLowerCase();
  if (mapsToRealtimeDocumentsHonestyIntent(question)) {
    const pack = record?.realtimeDocumentsHonesty ?? composeRealtimeDocumentsHonesty({
      identityResolutionRequired: record?.identityResolutionRequired,
      clientCode: record?.clientCode,
      clientName: record?.clientName,
      projectId: record?.projectId,
      projectName: record?.projectName,
      documentGaps: record?.documentGaps,
      blockers: record?.blockers,
      communicationPolicy: record?.communicationPolicy,
      fabric: extras?.fabric,
    });
    return formatRealtimeDocumentsHonesty(pack, record?.clientCode ?? extras?.match?.clientCode ?? 'Hub');
  }
  if (!record) {
    if (extras?.match || extras?.existingProject || extras?.existingWorkflow) {
      return answerFromExistingOnboarding(extras.match ?? { kind: 'none', candidates: [] }, extras);
    }
    return 'No onboarding run found for the requested client. Activate a Client Onboarding workflow or provide a client code.';
  }
  if (q.includes('identity') || q.includes('client scope') || q.includes('client code')) {
    const pack = record.identityReview ?? composeOnboardingIdentityReview({
      identityResolutionRequired: record.identityResolutionRequired,
      clientCode: record.clientCode,
      clientName: record.clientName,
      entitled: Boolean(record.clientCode && !record.identityResolutionRequired),
      blockers: record.blockers,
      communicationPolicy: record.communicationPolicy,
    });
    return [
      `Identity review for ${record.clientCode ?? 'unscoped client'}: ${pack.status}`,
      pack.clientCode ? `ClientCode: ${pack.clientCode}` : 'ClientCode: not assigned',
      pack.entitled ? 'Entitled roster: yes' : 'Entitled roster: no',
      pack.items.length ? `Open: ${pack.items.join('; ')}` : 'Client identity is reconciled against the entitled roster.',
      `Communication policy: ${pack.communicationPolicy}`,
      `Next owner action: ${pack.nextOwnerAction}`,
      'Atlas did not invent a ClientCode, send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('workspace')) {
    const pack = record.workspaceReview ?? composeOnboardingWorkspaceReview({
      identityResolutionRequired: record.identityResolutionRequired,
      workspaceReconciled: record.workspaceReconciled,
      clientCode: record.clientCode,
      clientName: record.clientName,
      reusedExisting: record.workspaceReconciled,
      blockers: record.blockers,
      communicationPolicy: record.communicationPolicy,
    });
    return [
      `Workspace review for ${record.clientCode ?? 'unscoped client'}: ${pack.status}`,
      pack.clientCode ? `ClientCode: ${pack.clientCode}` : 'ClientCode: not assigned',
      pack.workspaceReconciled ? 'Existing entitled workspace: reused' : 'Existing entitled workspace: not confirmed',
      pack.reusedExisting ? 'No duplicate workspace created.' : 'Atlas did not invent or duplicate a workspace.',
      pack.items.length ? `Open: ${pack.items.join('; ')}` : 'Existing entitled workspace is reconciled.',
      `Communication policy: ${pack.communicationPolicy}`,
      `Next owner action: ${pack.nextOwnerAction}`,
      'Atlas did not invent a ClientCode, send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('project review') || q.includes('project setup')) {
    const pack = record.projectReview ?? composeOnboardingProjectReview({
      identityResolutionRequired: record.identityResolutionRequired,
      clientCode: record.clientCode,
      clientName: record.clientName,
      projectId: record.projectId,
      projectName: record.projectName,
      reusedExisting: Boolean(record.projectReview?.reusedExisting),
      blockers: record.blockers,
      communicationPolicy: record.communicationPolicy,
    });
    return [
      `Project review for ${record.clientCode ?? 'unscoped client'}: ${pack.status}`,
      pack.clientCode ? `ClientCode: ${pack.clientCode}` : 'ClientCode: not assigned',
      pack.projectName ? `Project: ${pack.projectName}` : '',
      pack.projectReconciled
        ? pack.reusedExisting
          ? 'Existing entitled project: reused'
          : 'Governed onboarding project: reconciled'
        : 'Existing entitled project: not confirmed',
      pack.reusedExisting ? 'No duplicate project created.' : 'Atlas did not invent or duplicate a project.',
      pack.items.length ? `Open: ${pack.items.join('; ')}` : 'Existing entitled onboarding project is reconciled.',
      `Communication policy: ${pack.communicationPolicy}`,
      `Next owner action: ${pack.nextOwnerAction}`,
      'Atlas did not invent a ClientCode, send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('task review') || q.includes('onboarding task')) {
    const pack = record.taskReview ?? composeOnboardingTaskReview({
      identityResolutionRequired: record.identityResolutionRequired,
      clientCode: record.clientCode,
      clientName: record.clientName,
      projectId: record.projectId,
      projectName: record.projectName,
      taskIds: record.taskIds,
      reusedExisting: Boolean(record.taskReview?.reusedExisting),
      blockers: record.blockers,
      communicationPolicy: record.communicationPolicy,
    });
    return [
      `Task review for ${record.clientCode ?? 'unscoped client'}: ${pack.status}`,
      pack.clientCode ? `ClientCode: ${pack.clientCode}` : 'ClientCode: not assigned',
      pack.projectName ? `Project: ${pack.projectName}` : '',
      `Tasks: ${pack.taskCount}`,
      pack.taskReconciled
        ? pack.reusedExisting
          ? 'Existing entitled tasks: reused'
          : 'Governed onboarding tasks: reconciled'
        : 'Existing entitled tasks: not confirmed',
      pack.reusedExisting ? 'No duplicate tasks created.' : 'Atlas did not invent or duplicate tasks.',
      pack.items.length ? `Open: ${pack.items.join('; ')}` : 'Existing entitled onboarding tasks are reconciled.',
      `Communication policy: ${pack.communicationPolicy}`,
      `Next owner action: ${pack.nextOwnerAction}`,
      'Atlas did not invent a ClientCode, send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('agent assignment') || q.includes('assigned agent') || q.includes('agent review')) {
    const pack = record.agentAssignmentReview ?? composeOnboardingAgentAssignmentReview({
      identityResolutionRequired: record.identityResolutionRequired,
      clientCode: record.clientCode,
      clientName: record.clientName,
      projectId: record.projectId,
      projectName: record.projectName,
      assignedAgents: record.assignedAgents,
      reusedExisting: Boolean(record.agentAssignmentReview?.reusedExisting),
      blockers: record.blockers,
      communicationPolicy: record.communicationPolicy,
    });
    return [
      `Agent assignment review for ${record.clientCode ?? 'unscoped client'}: ${pack.status}`,
      pack.clientCode ? `ClientCode: ${pack.clientCode}` : 'ClientCode: not assigned',
      pack.projectName ? `Project: ${pack.projectName}` : '',
      `Agents: ${pack.agentCount}`,
      pack.agentReconciled
        ? pack.reusedExisting
          ? 'Existing entitled agents: reused'
          : 'Governed onboarding agents: reconciled'
        : 'Existing entitled agents: not confirmed',
      pack.reusedExisting ? 'No duplicate agents created.' : 'Atlas did not invent or duplicate agents.',
      pack.items.length ? `Open: ${pack.items.join('; ')}` : 'Existing entitled onboarding agents are reconciled.',
      `Communication policy: ${pack.communicationPolicy}`,
      `Next owner action: ${pack.nextOwnerAction}`,
      'Atlas did not invent a ClientCode, send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('completion') || q.includes('finished') || (q.includes('complete') && !q.includes('document') && !q.includes('milestone'))) {
    const pack = record.completion ?? composeOnboardingCompletion({
      identityResolutionRequired: record.identityResolutionRequired,
      workspaceReconciled: record.workspaceReconciled,
      projectId: record.projectId,
      projectName: record.projectName,
      operationsHandoff: record.operationsHandoff,
      kickoff: record.kickoff,
      blockerReview: record.blockerReview,
      ownerAttentionPackage: record.ownerAttentionPackage,
      milestoneReview: record.milestoneReview,
      communicationPolicy: record.communicationPolicy,
    });
    return [
      `Onboarding completion for ${record.clientCode ?? 'client'}: ${pack.status}`,
      pack.projectName ? `Project: ${pack.projectName}` : '',
      `Packages ready: ${pack.readyCount}/${pack.packageCount}`,
      pack.openItems.length ? `Open: ${pack.openItems.join('; ')}` : 'No open onboarding completion items.',
      `Communication policy: ${pack.communicationPolicy}`,
      `Next owner action: ${pack.nextOwnerAction}`,
      'Atlas did not send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('milestone')) {
    const pack = record.milestoneReview ?? composeMilestoneReview({
      identityResolutionRequired: record.identityResolutionRequired,
      workspaceReconciled: record.workspaceReconciled,
      projectId: record.projectId,
      projectName: record.projectName,
      milestones: record.milestones,
      milestoneIds: record.milestoneIds,
      reusedExisting: Boolean(record.milestoneReview?.reusedExisting),
      blockers: record.blockers,
      communicationPolicy: record.communicationPolicy,
    });
    return [
      `Milestone review for ${record.clientCode ?? 'client'}: ${pack.status}`,
      pack.projectName ? `Project: ${pack.projectName}` : '',
      `Milestones: ${pack.completeCount}/${pack.milestoneCount} complete`,
      pack.nextMilestone ? `Next: ${pack.nextMilestone}` : '',
      pack.milestoneReconciled
        ? pack.reusedExisting
          ? 'Existing entitled milestones: reused'
          : 'Governed onboarding milestones: reconciled'
        : 'Existing entitled milestones: not confirmed',
      pack.reusedExisting ? 'No duplicate milestones created.' : 'Atlas did not invent or duplicate milestones.',
      pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open onboarding milestones.',
      `Communication policy: ${pack.communicationPolicy}`,
      `Next owner action: ${pack.nextOwnerAction}`,
      'Atlas did not invent dates, send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('owner attention') || (q.includes('attention') && !q.includes('kickoff'))) {
    const pack = record.ownerAttentionPackage;
    return [
      `Owner attention for ${record.clientCode ?? 'client'}: ${pack.status}`,
      pack.projectName ? `Project: ${pack.projectName}` : '',
      pack.itemCount ? `Items: ${pack.items.join('; ')}` : 'No owner attention items.',
      `Communication policy: ${pack.communicationPolicy}`,
      `Next owner action: ${pack.nextOwnerAction}`,
      'Atlas did not send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('missing') || q.includes('document') || q.includes('reconcile')) {
    const pack = record.documentReview ?? composeOnboardingDocumentReview({
      identityResolutionRequired: record.identityResolutionRequired,
      workspaceReconciled: record.workspaceReconciled,
      projectId: record.projectId,
      projectName: record.projectName,
      documentGaps: record.documentGaps,
      blockers: record.blockers,
      communicationPolicy: record.communicationPolicy,
    });
    return [
      `Document review for ${record.clientCode ?? 'client'}: ${pack.status}`,
      pack.projectName ? `Project: ${pack.projectName}` : '',
      `Confirmed: ${pack.confirmedCount}/${pack.requirementCount}`,
      pack.items.length ? `Open: ${pack.items.join('; ')}` : 'No open onboarding document items.',
      pack.nextDocument ? `Next: ${pack.nextDocument}` : '',
      `Communication policy: ${pack.communicationPolicy}`,
      `Next owner action: ${pack.nextOwnerAction}`,
      'Atlas did not invent document receipt, send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('blocked') || q.includes('waiting') || q.includes('blocker')) {
    const review = record.blockerReview;
    return [
      `Blocker review for ${record.clientCode ?? 'client'}: ${review.status}`,
      review.projectName ? `Project: ${review.projectName}` : '',
      review.itemCount ? `Items: ${review.items.join('; ')}` : 'No open onboarding blockers.',
      `Documents missing: ${review.missingDocumentCount}`,
      `Communication policy: ${review.communicationPolicy}`,
      review.ownerAttention.length ? `Owner attention: ${review.ownerAttention.join('; ')}` : '',
      `Next owner action: ${review.nextOwnerAction}`,
      'Atlas did not send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('handoff')) {
    const handoff = record.operationsHandoff;
    return [
      `Operations handoff for ${record.clientCode ?? 'client'}: ${handoff.status}`,
      handoff.projectName ? `Project: ${handoff.projectName}` : '',
      `Tasks: ${handoff.taskCount}`,
      `Milestones: ${handoff.milestoneCount}`,
      `Documents missing: ${handoff.missingDocumentCount}`,
      `Communication policy: ${handoff.communicationPolicy}`,
      `Related entitled threads: ${handoff.relatedThreadCount} (DRAFT_ONLY, no send)`,
      handoff.capitalScope ? 'Capital: PREPARE_ONLY (external submit owner-gated)' : 'Capital: none in scope',
      handoff.ownerAttention.length ? `Owner attention: ${handoff.ownerAttention.join('; ')}` : '',
      `Next owner action: ${handoff.nextOwnerAction}`,
      'Atlas did not send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('kickoff') || q.includes('ready')) {
    const kickoff = record.kickoff;
    return [
      `Kickoff for ${record.clientCode ?? 'client'}: ${kickoff.status}`,
      kickoff.projectName ? `Project: ${kickoff.projectName}` : '',
      `Milestone: ${kickoff.milestoneStatus}`,
      `Documents missing: ${kickoff.missingDocumentCount}`,
      `Related entitled threads: ${kickoff.relatedThreadCount} (DRAFT_ONLY, no send)`,
      `Communication policy: ${kickoff.communicationPolicy}`,
      kickoff.ownerAttention.length ? `Owner attention: ${kickoff.ownerAttention.join('; ')}` : '',
      `Next owner action: ${kickoff.nextOwnerAction}`,
      'Atlas did not send mail, launch GTM, or submit capital.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    `Onboarding for ${record.clientName ?? record.clientCode ?? 'client'}`,
    `Status: ${record.status}`,
    `Current step: ${record.currentStep}`,
    `Next step: ${record.nextStep}`,
    record.projectName ? `Project: ${record.projectName}` : '',
    `Documents missing: ${record.documentGaps.filter((d) => d.status === 'MISSING').length}`,
    `Communication policy: ${record.communicationPolicy}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function mapsToRealtimeDocumentsHonestyIntent(question: string): boolean {
  const q = question.toLowerCase();
  if (q.includes('realtime') || q.includes('real-time') || q.includes('freshness')) {
    return q.includes('document') || q.includes('file') || q.includes('fabric') || q.includes('index');
  }
  if (/\bwhat documents are current\b/.test(q)) return true;
  if (/\bdocuments? (are |is )?current\b/.test(q)) return true;
  return false;
}

export function mapsToOnboardingContextIntent(question: string): boolean {
  const q = question.toLowerCase();
  if (mapsToRealtimeDocumentsHonestyIntent(question)) return true;
  return q.includes('onboarding') && ONBOARDING_CONTEXT_PHRASES.some((phrase) => q.includes(phrase));
}

export function findOnboardingRunForQuestion(
  question: string,
  records: OnboardingRunRecord[],
  entitledCodes: readonly string[] = ENTITLED_CANONICAL_CLIENT_CODES,
): OnboardingRunRecord | null {
  const match = resolveEntitledClientCodeFromQuestion(question, entitledCodes);
  if (match.kind === 'exact' || match.kind === 'unique_prefix') {
    return records.find((r) => r.clientCode === match.clientCode) ?? null;
  }
  if (match.kind === 'ambiguous') return null;
  const entitledRuns = records.filter(
    (r) => r.clientCode && entitledCodes.includes(r.clientCode),
  );
  if (entitledRuns.length === 1) return entitledRuns[0];
  return null;
}
