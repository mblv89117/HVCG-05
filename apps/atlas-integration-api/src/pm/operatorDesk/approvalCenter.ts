/**
 * Atlas Approval Center — normalized owner decision surface over existing evidence.
 */

import { createHash } from 'node:crypto';
import type { AppConfig } from '../../config.ts';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import type { TaskRecord } from '../types.ts';
import type { SharePointPmService } from '../sharepoint/repository.ts';
import { appendAskAtlasActivity } from './activityLedger.ts';
import {
  readWorkflowDefinitionOverlay,
  resolveWorkflowDefinitionOverlayDir,
  getLatestDefinition,
} from './workflowDefinitions.ts';
import { readOnboardingOverlay, resolveOnboardingStateDir } from './onboardingState.ts';
import {
  APPROVAL_CENTER_MISSION_KEY,
  type ApprovalOverlayRecord,
  type ApprovalOverlayStatus,
  type ApprovalExecutionState,
  getApprovalOverlayRecord,
  readApprovalOverlay,
  resolveApprovalStateDir,
  upsertApprovalOverlayRecord,
  writeApprovalOverlay,
} from './approvalState.ts';
import {
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RUNTIME_AGENT,
  type AskAtlasAnswer,
} from './types.ts';
import { activateWorkflow, cancelWorkflowDraft } from './workflowCreation.ts';
import {
  getWorkflowDetail,
  listWorkflowCenter,
  workflowAttentionFromCenter,
  type WorkflowSummary,
} from './workflows.ts';
import { listVisibleAgentActivity } from './activityLedger.ts';

export const APPROVAL_CENTER_CONTRACT = 'atlas-hub-approvals.v1' as const;

export type ApprovalCategory =
  | 'CAPITAL'
  | 'COMMUNICATIONS'
  | 'MARKETING'
  | 'ONBOARDING'
  | 'OPERATIONS'
  | 'DOCUMENT_GOVERNANCE'
  | 'CONTRACT'
  | 'FINANCIAL'
  | 'EXTERNAL_SUBMISSION'
  | 'WORKFLOW_AUTHORITY'
  | 'SYSTEM';

export type ApprovalStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'DEFERRED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'FAILED_AFTER_APPROVAL'
  | 'SUPERSEDED';

export type ApprovalListItem = {
  approvalId: string;
  title: string;
  approvalType: string;
  category: ApprovalCategory;
  status: ApprovalStatus;
  clientCode?: string;
  clientName?: string;
  projectScope?: string;
  workflowId?: string;
  workflowName?: string;
  requestedAction: string;
  requestedBy: string;
  originatingSystem: string;
  policyClass?: string;
  policyReason: string;
  evidenceStatus: string;
  requestedAt: string;
  ageHours?: number;
  dueDate?: string;
  executionState: ApprovalExecutionState | 'NOT_STARTED';
  materialSummary?: string;
  actions: Array<'approve' | 'reject' | 'defer' | 'cancel' | 'open_context'>;
  href?: string;
  source: 'task' | 'workflow_gate' | 'workflow_authority' | 'onboarding' | 'ledger_blocked';
};

export type ApprovalDetail = ApprovalListItem & {
  whatIsRequested: string;
  whyRequiresApproval: string;
  expectedEffectIfApproved: string;
  expectedEffectIfRejected: string;
  evidence: string[];
  provenance: string;
  policyClassDetail?: string;
  ownerGatedActions?: string[];
  relatedDocuments?: string[];
  relatedCommunications?: string[];
  relatedCapitalMatter?: string;
  timeline: Array<{ at: string; event: string; actor?: string; detail?: string }>;
  confirmationSummary?: string;
  parameterFingerprint: string;
  stale: boolean;
  superseded: boolean;
};

export type ApprovalCenterModel = {
  contractVersion: typeof APPROVAL_CENTER_CONTRACT;
  missionKey: typeof APPROVAL_CENTER_MISSION_KEY;
  generatedAt: string;
  counts: {
    pending: number;
    deferred: number;
    approved: number;
    rejected: number;
    total: number;
  };
  categories: ApprovalCategory[];
  items: ApprovalListItem[];
};

function shaFingerprint(payload: Record<string, unknown>): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16);
}

function categoryForWorkflow(w: WorkflowSummary): ApprovalCategory {
  const id = w.workflowId.toLowerCase();
  if (id.startsWith('hart.')) return 'MARKETING';
  if (id.includes('capital')) return 'CAPITAL';
  if (w.workflowType === 'client_onboarding') return 'ONBOARDING';
  if (w.workflowType === 'communication') return 'COMMUNICATIONS';
  if (w.policyClass === 'OWNER_GATED' || w.policyClass === 'REQUIRE_APPROVAL') return 'WORKFLOW_AUTHORITY';
  return 'OPERATIONS';
}

function mergeStatus(
  overlay: ApprovalOverlayRecord | null,
  livePending: boolean,
): ApprovalStatus {
  if (!overlay) return livePending ? 'PENDING' : 'SUPERSEDED';
  if (overlay.status === 'APPROVED') {
    if (overlay.executionState === 'EXECUTING') return 'EXECUTING';
    if (overlay.executionState === 'EXECUTED') return 'EXECUTED';
    if (overlay.executionState === 'FAILED_AFTER_APPROVAL') return 'FAILED_AFTER_APPROVAL';
    return 'APPROVED';
  }
  if (overlay.status === 'DEFERRED') return 'DEFERRED';
  if (overlay.status === 'REJECTED') return 'REJECTED';
  if (overlay.status === 'EXPIRED') return 'EXPIRED';
  if (overlay.status === 'CANCELLED') return 'CANCELLED';
  if (overlay.status === 'SUPERSEDED') return 'SUPERSEDED';
  return livePending ? 'PENDING' : 'SUPERSEDED';
}

function callerMaySeeClient(principal: AtlasPrincipal, clientCode?: string): boolean {
  if (!clientCode) return true;
  return entitledClientCodes(principal).includes(clientCode);
}

function taskApprovalItem(task: TaskRecord, overlay: ApprovalOverlayRecord | null): ApprovalListItem | null {
  const clientCode = task.clientId?.trim();
  const fingerprint = shaFingerprint({
    taskId: task.id,
    title: task.title,
    status: task.status,
    requiresApproval: task.requiresApproval,
  });
  const approvalId = `task:${task.id}`;
  const livePending =
    task.status === 'needs_owner_approval' || task.status === 'needs_review' || task.requiresApproval;
  const status = mergeStatus(overlay, livePending);
  if (status === 'SUPERSEDED' && !overlay) return null;
  const requestedAt = task.updatedAt || task.createdAt;
  const ageHours = Math.round((Date.now() - Date.parse(requestedAt)) / 3600000);
  return {
    approvalId,
    title: task.title,
    approvalType: 'Owner task decision',
    category: 'OPERATIONS',
    status,
    clientCode,
    clientName: task.clientName,
    projectScope: task.projectId,
    requestedAction: task.nextAction || 'Review and approve owner task',
    requestedBy: task.creatorName || task.source || 'SharePoint PM',
    originatingSystem: 'sharepoint_tasks',
    policyClass: task.requiresApproval ? 'REQUIRE_APPROVAL' : 'OWNER_ESCALATE',
    policyReason: 'Task marked needs owner approval or requiresApproval in HVCG_Tasks.',
    evidenceStatus: task.completionEvidence ? 'CONFIRMED' : 'PROPOSED',
    requestedAt,
    ageHours,
    dueDate: task.dueDate,
    executionState: overlay?.executionState ?? 'NOT_STARTED',
    materialSummary: task.blocker,
    actions: status === 'PENDING' || status === 'DEFERRED' ? ['approve', 'reject', 'defer', 'open_context'] : ['open_context'],
    href: clientCode ? `/clients/${encodeURIComponent(clientCode)}` : undefined,
    source: 'task',
  };
}

function workflowGateItem(
  w: WorkflowSummary,
  overlay: ApprovalOverlayRecord | null,
): ApprovalListItem | null {
  const approvalId = `workflow-gate:${w.workflowId}`;
  const fingerprint = shaFingerprint({
    workflowId: w.workflowId,
    status: w.status,
    currentStep: w.currentStep,
    policyClass: w.policyClass,
  });
  const livePending = w.status === 'REQUIRES_APPROVAL' || w.ownerActionRequired === true;
  const status = mergeStatus(overlay, livePending);
  if (!livePending && !overlay) return null;
  if (status === 'SUPERSEDED' && !overlay) return null;
  const category = categoryForWorkflow(w);
  const policyReason =
    category === 'MARKETING'
      ? 'Material budget changes and new paid campaign launches are OWNER_GATED. Reporting and analysis remain AUTO.'
      : category === 'CAPITAL'
        ? 'External lender/investor submission and contractual commitments remain owner-gated.'
        : category === 'COMMUNICATIONS'
          ? 'Outbound communication send requires owner approval. AUTO_RESPOND is disabled globally.'
          : category === 'ONBOARDING'
            ? 'Client activation and outbound onboarding messages require owner decision.'
            : 'Workflow policy requires explicit owner authorization before governed action proceeds.';

  return {
    approvalId,
    title: w.name,
    approvalType: category === 'MARKETING' ? 'Hart marketing approval' : 'Workflow owner gate',
    category,
    status,
    clientCode: w.clientCode,
    clientName: w.clientName,
    projectScope: w.projectScope,
    workflowId: w.workflowId,
    workflowName: w.name,
    requestedAction: w.nextStep || w.currentStep || 'Owner authorization for governed workflow action',
    requestedBy: w.responsibleAgent || 'Atlas workflow runtime',
    originatingSystem: w.workflowType || 'workflow_center',
    policyClass: w.policyClass,
    policyReason,
    evidenceStatus: w.lastRunAt ? 'CONFIRMED' : 'PROPOSED',
    requestedAt: w.updatedAt || w.lastRunAt || new Date().toISOString(),
    ageHours: w.lastRunAt
      ? Math.round((Date.now() - Date.parse(w.lastRunAt)) / 3600000)
      : undefined,
    executionState: overlay?.executionState ?? 'NOT_STARTED',
    materialSummary: w.failureSummary,
    actions:
      status === 'PENDING' || status === 'DEFERRED'
        ? ['approve', 'reject', 'defer', 'open_context']
        : ['open_context'],
    href: `/workflows?workflowId=${encodeURIComponent(w.workflowId)}`,
    source: 'workflow_gate',
  };
}

function workflowAuthorityItem(
  def: { workflowId: string; name: string; scope: { clientCode?: string; clientName?: string }; approvalRequirements: string[]; policyClass: string; updatedAt: string },
  overlay: ApprovalOverlayRecord | null,
): ApprovalListItem {
  const approvalId = `workflow-authority:${def.workflowId}`;
  const livePending = true;
  const status = mergeStatus(overlay, livePending);
  return {
    approvalId,
    title: `Workflow authority — ${def.name}`,
    approvalType: 'Workflow authority expansion',
    category: 'WORKFLOW_AUTHORITY',
    status,
    clientCode: def.scope.clientCode,
    clientName: def.scope.clientName,
    workflowId: def.workflowId,
    workflowName: def.name,
    requestedAction: 'Approve expanded workflow authority and activate workflow',
    requestedBy: 'Ask Atlas conversational workflow',
    originatingSystem: 'workflow_definitions',
    policyClass: def.policyClass,
    policyReason:
      'Conversational workflow requests autonomy beyond current policy. Owner must approve authority expansion before activation.',
    evidenceStatus: 'CONFIRMED',
    requestedAt: def.updatedAt,
    executionState: overlay?.executionState ?? 'NOT_STARTED',
    materialSummary: def.approvalRequirements.join('; '),
    actions:
      status === 'PENDING' || status === 'DEFERRED'
        ? ['approve', 'reject', 'defer', 'open_context']
        : ['open_context'],
    href: `/workflows?workflowId=${encodeURIComponent(def.workflowId)}`,
    source: 'workflow_authority',
  };
}

function onboardingAttentionItem(
  run: { workflowId: string; clientCode?: string; clientName?: string; ownerAttention: string[]; updatedAt: string },
  attention: string,
  index: number,
  overlay: ApprovalOverlayRecord | null,
): ApprovalListItem {
  const approvalId = `onboarding-attention:${run.workflowId}:${index}`;
  const status = mergeStatus(overlay, true);
  return {
    approvalId,
    title: attention.slice(0, 120),
    approvalType: 'Onboarding owner decision',
    category: 'ONBOARDING',
    status,
    clientCode: run.clientCode,
    clientName: run.clientName,
    workflowId: run.workflowId,
    workflowName: 'Client onboarding',
    requestedAction: attention,
    requestedBy: 'atlas-onboarding-agent',
    originatingSystem: 'onboarding_automation',
    policyClass: 'OWNER_ESCALATE',
    policyReason: 'Genuine business decision surfaced during governed onboarding automation.',
    evidenceStatus: 'CONFIRMED',
    requestedAt: run.updatedAt,
    executionState: overlay?.executionState ?? 'NOT_STARTED',
    actions:
      status === 'PENDING' || status === 'DEFERRED'
        ? ['approve', 'reject', 'defer', 'open_context']
        : ['open_context'],
    href: run.clientCode ? `/clients/${encodeURIComponent(run.clientCode)}` : `/workflows?workflowId=${encodeURIComponent(run.workflowId)}`,
    source: 'onboarding',
  };
}

export function buildApprovalCenter(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  ownerApprovalTasks?: TaskRecord[];
}): ApprovalCenterModel {
  const approvalDir = resolveApprovalStateDir(opts.dataDir);
  const overlay = readApprovalOverlay(approvalDir);
  const center = listWorkflowCenter({
    cfg: opts.cfg,
    principal: opts.principal,
    dataDir: opts.dataDir,
  });
  const attention = workflowAttentionFromCenter(center);
  const items: ApprovalListItem[] = [];
  const seen = new Set<string>();

  for (const task of opts.ownerApprovalTasks ?? []) {
    if (!callerMaySeeClient(opts.principal, task.clientId)) continue;
    const overlayRec = getApprovalOverlayRecord(overlay, `task:${task.id}`);
    const item = taskApprovalItem(task, overlayRec);
    if (item && !seen.has(item.approvalId)) {
      seen.add(item.approvalId);
      items.push(item);
    }
  }

  for (const w of attention.waitingApproval) {
    if (!callerMaySeeClient(opts.principal, w.clientCode)) continue;
    const overlayRec = getApprovalOverlayRecord(overlay, `workflow-gate:${w.workflowId}`);
    const item = workflowGateItem(w, overlayRec);
    if (item && !seen.has(item.approvalId)) {
      seen.add(item.approvalId);
      items.push(item);
    }
  }

  for (const w of center.workflows.filter((wf) => wf.ownerActionRequired && wf.status !== 'REQUIRES_APPROVAL')) {
    if (!callerMaySeeClient(opts.principal, w.clientCode)) continue;
    const overlayRec = getApprovalOverlayRecord(overlay, `workflow-gate:${w.workflowId}`);
    const item = workflowGateItem(w, overlayRec);
    if (item && !seen.has(item.approvalId)) {
      seen.add(item.approvalId);
      items.push(item);
    }
  }

  const defOverlay = readWorkflowDefinitionOverlay(resolveWorkflowDefinitionOverlayDir(opts.dataDir));
  const workflowIds = [...new Set(defOverlay.definitions.map((r) => r.workflowId))];
  for (const workflowId of workflowIds) {
    const latest = getLatestDefinition(defOverlay, workflowId, opts.principal);
    if (!latest || latest.status !== 'READY_FOR_APPROVAL' || !latest.authorityExpansionRequired) continue;
    if (!callerMaySeeClient(opts.principal, latest.scope.clientCode)) continue;
    const overlayRec = getApprovalOverlayRecord(overlay, `workflow-authority:${latest.workflowId}`);
    const item = workflowAuthorityItem(latest, overlayRec);
    if (!seen.has(item.approvalId)) {
      seen.add(item.approvalId);
      items.push(item);
    }
  }

  const onboardingOverlay = readOnboardingOverlay(resolveOnboardingStateDir(opts.dataDir));
  for (const run of onboardingOverlay.records) {
    if (!callerMaySeeClient(opts.principal, run.clientCode)) continue;
    run.ownerAttention.forEach((attention, idx) => {
      const overlayRec = getApprovalOverlayRecord(overlay, `onboarding-attention:${run.workflowId}:${idx}`);
      const item = onboardingAttentionItem(run, attention, idx, overlayRec);
      if (!seen.has(item.approvalId)) {
        seen.add(item.approvalId);
        items.push(item);
      }
    });
  }

  const ledger = listVisibleAgentActivity({
    dataDir: opts.dataDir,
    principal: opts.principal,
    limit: 30,
  });
  ledger
    .filter((e) => e.result === 'hvs_blocked' || e.policyDecision === 'hvs_blocked')
    .slice(0, 5)
    .forEach((entry, idx) => {
      const approvalId = `ledger-blocked:${entry.timestamp}:${idx}`;
      if (seen.has(approvalId)) return;
      const overlayRec = getApprovalOverlayRecord(overlay, approvalId);
      const status = mergeStatus(overlayRec, true);
      items.push({
        approvalId,
        title: `Blocked action — ${entry.missionKey}`,
        approvalType: 'Policy-blocked agent action',
        category: entry.missionKey.toUpperCase().includes('CAPITAL') ? 'CAPITAL' : 'OPERATIONS',
        status,
        requestedAction: entry.tools.join(', ') || 'Resume after owner authorization',
        requestedBy: entry.agent,
        originatingSystem: 'agent_activity_ledger',
        policyReason: 'Agent action blocked by owner-gated policy (hvs_blocked).',
        evidenceStatus: 'CONFIRMED',
        requestedAt: entry.timestamp,
        executionState: overlayRec?.executionState ?? 'NOT_STARTED',
        actions: status === 'PENDING' ? ['approve', 'reject', 'defer', 'open_context'] : ['open_context'],
        source: 'ledger_blocked',
      });
      seen.add(approvalId);
    });

  const pending = items.filter((i) => i.status === 'PENDING').length;
  const deferred = items.filter((i) => i.status === 'DEFERRED').length;
  const approved = items.filter((i) => ['APPROVED', 'EXECUTED', 'EXECUTING'].includes(i.status)).length;
  const rejected = items.filter((i) => i.status === 'REJECTED').length;

  return {
    contractVersion: APPROVAL_CENTER_CONTRACT,
    missionKey: APPROVAL_CENTER_MISSION_KEY,
    generatedAt: new Date().toISOString(),
    counts: { pending, deferred, approved, rejected, total: items.length },
    categories: [
      'CAPITAL',
      'COMMUNICATIONS',
      'MARKETING',
      'ONBOARDING',
      'OPERATIONS',
      'WORKFLOW_AUTHORITY',
      'EXTERNAL_SUBMISSION',
    ],
    items: items.sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt)),
  };
}

export function getApprovalDetail(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  approvalId: string;
  ownerApprovalTasks?: TaskRecord[];
}): ApprovalDetail | null {
  const model = buildApprovalCenter({
    cfg: opts.cfg,
    principal: opts.principal,
    dataDir: opts.dataDir,
    ownerApprovalTasks: opts.ownerApprovalTasks,
  });
  const item = model.items.find((i) => i.approvalId === opts.approvalId);
  if (!item) return null;

  const approvalDir = resolveApprovalStateDir(opts.dataDir);
  const overlay = readApprovalOverlay(approvalDir);
  const overlayRec = getApprovalOverlayRecord(overlay, opts.approvalId);
  const fingerprint = overlayRec?.parameterFingerprint ?? shaFingerprint({ approvalId: opts.approvalId, title: item.title });

  let detailExtra: Partial<ApprovalDetail> = {};
  if (item.workflowId) {
    const wfDetail = getWorkflowDetail({
      cfg: opts.cfg,
      principal: opts.principal,
      dataDir: opts.dataDir,
      workflowId: item.workflowId,
    });
    if (wfDetail) {
      detailExtra = {
        ownerGatedActions: wfDetail.ownerGatedActions,
        policyClassDetail: wfDetail.policyClass,
        relatedCapitalMatter: wfDetail.scope?.capitalMatter,
        expectedEffectIfApproved:
          item.category === 'MARKETING'
            ? 'Owner authorization recorded. Live campaign mutation remains policy-gated; Hart may proceed with governed next steps without bypassing spend gates.'
            : item.category === 'CAPITAL'
              ? 'Owner authorization recorded. External submission remains separately gated until explicit Capital submit approval.'
              : 'Governed workflow may proceed along authorized path after policy revalidation.',
        expectedEffectIfRejected:
          'Requested action will not execute. Originating workflow waits or follows alternate authorized path.',
        confirmationSummary:
          item.category === 'MARKETING'
            ? `APPROVE MATERIAL MARKETING ACTION — ${item.title}. Policy: material budget / campaign launch OWNER_GATED. Execution follows only after parameter binding and policy revalidation.`
            : item.category === 'CAPITAL'
              ? `APPROVE CAPITAL OWNER GATE — ${item.title}. External lender/investor submission remains separately owner-gated.`
              : `APPROVE — ${item.title}. Scope: ${item.clientName || item.clientCode || 'organization'}.`,
      };
    }
  }

  const stale =
    overlayRec?.approvedParameterFingerprint &&
    overlayRec.approvedParameterFingerprint !== fingerprint &&
    overlayRec.status === 'APPROVED';

  return {
    ...item,
    whatIsRequested: item.requestedAction,
    whyRequiresApproval: item.policyReason,
    expectedEffectIfApproved:
      detailExtra.expectedEffectIfApproved ??
      'Governed action may proceed after owner authorization and policy revalidation.',
    expectedEffectIfRejected:
      detailExtra.expectedEffectIfRejected ?? 'Action will not execute; workflow may wait or stop per definition.',
    evidence: [
      item.evidenceStatus === 'CONFIRMED' ? 'Live Atlas runtime evidence available.' : 'Limited evidence — review context before approving.',
      item.materialSummary ? `Note: ${item.materialSummary}` : '',
    ].filter(Boolean),
    provenance: item.originatingSystem,
    timeline: overlayRec
      ? [
          { at: overlayRec.updatedAt, event: overlayRec.status, actor: overlayRec.approvedBy || overlayRec.rejectedBy },
        ]
      : [{ at: item.requestedAt, event: 'APPROVAL_REQUESTED' }],
    confirmationSummary: detailExtra.confirmationSummary,
    parameterFingerprint: fingerprint,
    stale,
    superseded: item.status === 'SUPERSEDED',
    ...detailExtra,
  };
}

async function appendApprovalLifecycle(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  event: string;
  approvalId: string;
  title: string;
  clientCode?: string;
  detail?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const answer: AskAtlasAnswer = {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: false,
    ranking: ['Decision Required'],
    items: [
      {
        id: opts.approvalId,
        state: 'Decision Required',
        why: opts.detail || opts.title,
        basedOn: opts.event,
        provenance: 'CONFIRMED',
        classification: 'CONFIRMED',
        ...(opts.clientCode ? { clientCode: opts.clientCode } : {}),
      },
    ],
    activity: {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: APPROVAL_CENTER_MISSION_KEY,
      trigger: 'approval_center',
      timestamp: now,
      tools: ['approval_center'],
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

export async function applyApprovalAction(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  approvalId: string;
  action: 'approve' | 'reject' | 'defer' | 'cancel';
  reason?: string;
  deferredUntil?: string;
  ownerApprovalTasks?: TaskRecord[];
  sharepoint?: SharePointPmService | null;
}): Promise<{ ok: true; detail: ApprovalDetail } | { ok: false; error: string }> {
  const detail = getApprovalDetail({
    cfg: opts.cfg,
    principal: opts.principal,
    dataDir: opts.dataDir,
    approvalId: opts.approvalId,
    ownerApprovalTasks: opts.ownerApprovalTasks,
  });
  if (!detail) return { ok: false, error: 'approval_not_found' };
  if (detail.clientCode && !callerMaySeeClient(opts.principal, detail.clientCode)) {
    return { ok: false, error: 'forbidden' };
  }

  const approvalDir = resolveApprovalStateDir(opts.dataDir);
  const overlay = readApprovalOverlay(approvalDir);
  const now = new Date().toISOString();
  const existing = getApprovalOverlayRecord(overlay, opts.approvalId);
  const fingerprint = detail.parameterFingerprint;

  if (existing?.status === 'APPROVED' && existing.approvedParameterFingerprint !== fingerprint) {
    return { ok: false, error: 'approval_stale_parameters' };
  }

  if (opts.action === 'reject') {
    const record: ApprovalOverlayRecord = {
      approvalId: opts.approvalId,
      status: 'REJECTED',
      executionState: 'NOT_STARTED',
      parameterFingerprint: fingerprint,
      rejectedAt: now,
      rejectedBy: opts.principal.userId,
      rejectedReason: opts.reason?.trim(),
      relatedActivityIds: existing?.relatedActivityIds ?? [],
      updatedAt: now,
    };
    upsertApprovalOverlayRecord(overlay, record);
    writeApprovalOverlay(approvalDir, overlay);

    if (detail.source === 'workflow_authority' && detail.workflowId) {
      await cancelWorkflowDraft({
        principal: opts.principal,
        dataDir: opts.dataDir,
        workflowId: detail.workflowId,
      });
    }
    await appendApprovalLifecycle({
      dataDir: opts.dataDir,
      principal: opts.principal,
      event: 'APPROVAL_REJECTED',
      approvalId: opts.approvalId,
      title: detail.title,
      clientCode: detail.clientCode,
      detail: opts.reason,
    });
    return {
      ok: true,
      detail: getApprovalDetail({
        cfg: opts.cfg,
        principal: opts.principal,
        dataDir: opts.dataDir,
        approvalId: opts.approvalId,
        ownerApprovalTasks: opts.ownerApprovalTasks,
      })!,
    };
  }

  if (opts.action === 'defer') {
    const record: ApprovalOverlayRecord = {
      approvalId: opts.approvalId,
      status: 'DEFERRED',
      executionState: 'NOT_STARTED',
      parameterFingerprint: fingerprint,
      deferredUntil: opts.deferredUntil?.trim() || undefined,
      deferredAt: now,
      deferredBy: opts.principal.userId,
      relatedActivityIds: existing?.relatedActivityIds ?? [],
      updatedAt: now,
    };
    upsertApprovalOverlayRecord(overlay, record);
    writeApprovalOverlay(approvalDir, overlay);
    await appendApprovalLifecycle({
      dataDir: opts.dataDir,
      principal: opts.principal,
      event: 'APPROVAL_DEFERRED',
      approvalId: opts.approvalId,
      title: detail.title,
      clientCode: detail.clientCode,
    });
    return {
      ok: true,
      detail: getApprovalDetail({
        cfg: opts.cfg,
        principal: opts.principal,
        dataDir: opts.dataDir,
        approvalId: opts.approvalId,
        ownerApprovalTasks: opts.ownerApprovalTasks,
      })!,
    };
  }

  if (opts.action === 'cancel') {
    const record: ApprovalOverlayRecord = {
      approvalId: opts.approvalId,
      status: 'CANCELLED',
      executionState: 'NOT_STARTED',
      parameterFingerprint: fingerprint,
      relatedActivityIds: existing?.relatedActivityIds ?? [],
      updatedAt: now,
    };
    upsertApprovalOverlayRecord(overlay, record);
    writeApprovalOverlay(approvalDir, overlay);
    await appendApprovalLifecycle({
      dataDir: opts.dataDir,
      principal: opts.principal,
      event: 'APPROVAL_CANCELLED',
      approvalId: opts.approvalId,
      title: detail.title,
      clientCode: detail.clientCode,
    });
    return {
      ok: true,
      detail: getApprovalDetail({
        cfg: opts.cfg,
        principal: opts.principal,
        dataDir: opts.dataDir,
        approvalId: opts.approvalId,
        ownerApprovalTasks: opts.ownerApprovalTasks,
      })!,
    };
  }

  // approve
  if (detail.source === 'task' && opts.sharepoint) {
    const taskId = opts.approvalId.replace(/^task:/, '');
    const existing = await opts.sharepoint.authorizeTask(opts.principal, taskId);
    if (existing === 'not_found') return { ok: false, error: 'task_not_found' };
    try {
      await opts.sharepoint.patchTask(opts.principal, taskId, { status: 'completed' }, existing.etag);
    } catch {
      return { ok: false, error: 'task_update_failed' };
    }
  }

  if (detail.source === 'workflow_authority' && detail.workflowId) {
    const result = await activateWorkflow({
      cfg: opts.cfg,
      principal: opts.principal,
      dataDir: opts.dataDir,
      workflowId: detail.workflowId,
      approveAuthority: true,
      sharepoint: opts.sharepoint ?? null,
    });
    if (!result.ok) return { ok: false, error: result.error };
  }

  const record: ApprovalOverlayRecord = {
    approvalId: opts.approvalId,
    status: 'APPROVED',
    executionState: 'EXECUTING',
    parameterFingerprint: fingerprint,
    approvedParameterFingerprint: fingerprint,
    approvedAt: now,
    approvedBy: opts.principal.userId,
    executionStartedAt: now,
    relatedActivityIds: existing?.relatedActivityIds ?? [],
    updatedAt: now,
  };
  upsertApprovalOverlayRecord(overlay, record);
  writeApprovalOverlay(approvalDir, overlay);

  await appendApprovalLifecycle({
    dataDir: opts.dataDir,
    principal: opts.principal,
    event: 'APPROVAL_APPROVED',
    approvalId: opts.approvalId,
    title: detail.title,
    clientCode: detail.clientCode,
  });

  record.executionState = detail.source === 'workflow_authority' ? 'EXECUTED' : 'EXECUTED';
  record.executionCompletedAt = new Date().toISOString();
  record.executionResult =
    detail.source === 'workflow_gate' || detail.source === 'ledger_blocked'
      ? 'Owner authorization recorded. Live external mutation remains policy-gated.'
      : 'Governed action executed or workflow resumed.';
  upsertApprovalOverlayRecord(overlay, record);
  writeApprovalOverlay(approvalDir, overlay);

  await appendApprovalLifecycle({
    dataDir: opts.dataDir,
    principal: opts.principal,
    event: 'APPROVAL_EXECUTED',
    approvalId: opts.approvalId,
    title: detail.title,
    clientCode: detail.clientCode,
    detail: record.executionResult,
  });

  return {
    ok: true,
    detail: getApprovalDetail({
      cfg: opts.cfg,
      principal: opts.principal,
      dataDir: opts.dataDir,
      approvalId: opts.approvalId,
      ownerApprovalTasks: opts.ownerApprovalTasks,
    })!,
  };
}

export function mapsToApprovalContextIntent(question: string): boolean {
  const q = question.toLowerCase();
  return (
    q.includes('approval') ||
    (q.includes('approve') && (q.includes('waiting') || q.includes('pending') || q.includes('need'))) ||
    q.includes('what needs my approval') ||
    q.includes('waiting on me') ||
    (q.includes('hart') && q.includes('approve')) ||
    (q.includes('capital') && q.includes('approval')) ||
    q.includes('deferred approval') ||
    q.includes('failed after') && q.includes('approved')
  );
}

export function answerApprovalContext(question: string, model: ApprovalCenterModel): string {
  const q = question.toLowerCase();
  const pending = model.items.filter((i) => i.status === 'PENDING');
  if (q.includes('hart') || q.includes('google ads') || q.includes('marketing')) {
    const hart = model.items.filter((i) => i.category === 'MARKETING' && i.status === 'PENDING');
    if (!hart.length) return 'No pending Hart/marketing approvals in the Approval Center snapshot.';
    return hart.map((i) => `${i.title}: ${i.requestedAction}`).join('\n');
  }
  if (q.includes('capital')) {
    const cap = model.items.filter((i) => i.category === 'CAPITAL' && i.status === 'PENDING');
    if (!cap.length) return 'No pending Capital approvals in the Approval Center snapshot.';
    return cap.map((i) => `${i.title}: ${i.requestedAction}`).join('\n');
  }
  if (q.includes('deferred')) {
    const def = model.items.filter((i) => i.status === 'DEFERRED');
    if (!def.length) return 'No deferred approvals.';
    return def.map((i) => `${i.title} (deferred)`).join('\n');
  }
  if (q.includes('failed') && q.includes('approved')) {
    const failed = model.items.filter((i) => i.status === 'FAILED_AFTER_APPROVAL');
    if (!failed.length) return 'No approvals failed after approval in the current snapshot.';
    return failed.map((i) => i.title).join('\n');
  }
  if (!pending.length) {
    return 'No pending approvals require your decision in the live Approval Center snapshot.';
  }
  return pending
    .slice(0, 8)
    .map((i) => `${i.title} (${i.category}): ${i.requestedAction}`)
    .join('\n');
}
