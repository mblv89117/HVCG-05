/**
 * Atlas Workflow Center — normalized views over runtime, ledger, overlays, and policy.
 * No duplicate orchestration engine; composes existing Hub operator infrastructure.
 */

import type { AppConfig } from '../../config.ts';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import { inspectFabricSyncHealth, isFabricSweepEnabled } from '../sharepoint/fabric/status.ts';
import { listVisibleAgentActivity } from './activityLedger.ts';
import {
  ASK_ATLAS_LOOP_MISSION_KEY,
  ASK_ATLAS_EVENT_MISSION_KEY,
  ASK_ATLAS_PII_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  CAPITAL_SUBMISSION_OWNER_GATED,
  COMMUNICATIONS_AUTO_RESPOND,
  ONBOARDING_AGENT_OWNER_GATED,
  type AgentActivityLedgerEntry,
  type AskAtlasAnswer,
} from './types.ts';
import {
  applyWorkflowControl,
  getWorkflowControlState,
  readWorkflowControlOverlay,
  resolveWorkflowControlOverlayDir,
  type WorkflowControlRecord,
} from './workflowControls.ts';
import {
  CUSTOM_WORKFLOW_ID_PREFIX,
  listVisibleDefinitions,
  readWorkflowDefinitionOverlay,
  resolveWorkflowDefinitionOverlayDir,
  getLatestDefinition,
  type WorkflowDefinitionRecord,
} from './workflowDefinitions.ts';
import { formatWorkflowPreview } from './workflowParser.ts';
import { getOnboardingRun, readOnboardingOverlay, resolveOnboardingStateDir } from './onboardingState.ts';

export const WORKFLOW_CENTER_CONTRACT = 'atlas-hub-workflows.v1' as const;
export const WORKFLOW_CENTER_MISSION_KEY = 'ATLAS-WORKFLOW-CENTER-001' as const;

export type WorkflowStatus =
  | 'ACTIVE'
  | 'RUNNING'
  | 'WAITING'
  | 'PAUSED'
  | 'REQUIRES_APPROVAL'
  | 'FAILED'
  | 'RETRYING'
  | 'COMPLETE'
  | 'DISABLED';

export type WorkflowDataProvenance = 'LIVE' | 'RECOVERED' | 'HISTORICAL' | 'SIMULATED' | 'TEST';

export type WorkflowSummary = {
  workflowId: string;
  name: string;
  description: string;
  workflowType: string;
  trigger: string;
  status: WorkflowStatus;
  currentStep?: string;
  nextStep?: string;
  clientCode?: string;
  clientName?: string;
  projectScope?: string;
  responsibleAgent?: string;
  autonomyLevel: string;
  approvalRequired: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  successState: 'success' | 'failure' | 'unknown' | 'never_run';
  retryState?: string;
  retryCount?: number;
  updatedAt: string;
  provenance: WorkflowDataProvenance;
  failureSummary?: string;
  ownerActionRequired?: boolean;
  policyClass?: string;
  href?: string;
};

export type WorkflowRunSummary = {
  runId: string;
  startedAt: string;
  endedAt?: string;
  status: WorkflowStatus;
  step?: string;
  result?: string;
  provenance: WorkflowDataProvenance;
};

export type WorkflowActivityItem = {
  id: string;
  timestamp: string;
  kind: string;
  actor?: string;
  agent?: string;
  tool?: string;
  policy?: string;
  result: string;
  provenance: WorkflowDataProvenance;
  summary: string;
};

export type WorkflowDefinitionVersionSummary = {
  version: number;
  changedAt: string;
  changedBy: string;
  changeReason?: string;
  changedFields: string[];
  status: string;
};

export type WorkflowDetail = WorkflowSummary & {
  overview: {
    whyExists: string;
    source: string;
    relatedMission?: string;
    sourceEvent?: string;
    createdFromAskAtlas?: boolean;
    conversationalProvenance?: string;
    sourceTemplateId?: string;
    sourceTemplateVersion?: number;
    templateCustomizations?: Record<string, string | number | boolean>;
  };
  scope: {
    clientCode?: string;
    clientName?: string;
    projectScope?: string;
    relatedSystem?: string;
    relatedDocuments?: string[];
    relatedCommunications?: string[];
    capitalMatter?: string;
  };
  triggerDetail: {
    triggerType: string;
    event?: string;
    schedule?: string;
    manual?: boolean;
    policy?: string;
    source?: string;
  };
  currentExecution?: {
    currentStep?: string;
    nextStep?: string;
    runId?: string;
    startedAt?: string;
    elapsedMs?: number;
    waitingReason?: string;
  };
  actionsAllowed: string[];
  actionsBlocked: string[];
  ownerGatedActions: string[];
  history: WorkflowRunSummary[];
  activity: WorkflowActivityItem[];
  control?: WorkflowControlRecord;
  diagnostics?: Record<string, string | number | boolean | null>;
  definitionPreview?: string;
  versionHistory?: WorkflowDefinitionVersionSummary[];
  approvalRequirements?: string[];
  authorityExpansionRequired?: boolean;
};

export type WorkflowCenterModel = {
  contractVersion: typeof WORKFLOW_CENTER_CONTRACT;
  missionKey: typeof WORKFLOW_CENTER_MISSION_KEY;
  entitled: boolean;
  workflows: WorkflowSummary[];
  counts: {
    total: number;
    requiresApproval: number;
    failed: number;
    paused: number;
    running: number;
  };
  policy: {
    paidAdsReporting: 'AUTO';
    paidAdsAnalysis: 'AUTO';
    paidAdsRecommendations: 'AUTO';
    paidAdsMutationValidation: 'AUTO';
    materialBudgetChange: 'OWNER_GATED';
    newPaidCampaignLaunch: 'OWNER_GATED';
    capitalExternalSubmit: 'OWNER_GATED';
    communicationsAutoRespond: false;
  };
};

type WorkflowDefinition = {
  workflowId: string;
  name: string;
  description: string;
  workflowType: string;
  trigger: string;
  responsibleAgent: string;
  autonomyLevel: string;
  approvalRequired: boolean;
  policyClass?: string;
  clientCode?: string;
  clientName?: string;
  projectScope?: string;
  relatedSystem?: string;
  missionKeyPatterns: string[];
  triggerKinds: string[];
  whyExists: string;
  source: string;
  relatedMission?: string;
  actionsAllowed: string[];
  actionsBlocked: string[];
  ownerGatedActions: string[];
  ownerActionRequired?: boolean;
  href?: string;
  pauseAllowed: boolean;
  retryAllowed: boolean;
  scheduleCadence?: string;
};

const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    workflowId: 'atlas.m365.fabric_sweep',
    name: 'M365 knowledge sync',
    description:
      'Indexes entitled mail, calendar, contacts, and files into the Atlas knowledge fabric for search and client context.',
    workflowType: 'scheduled',
    trigger: 'scheduled_sweep',
    responsibleAgent: 'atlas-hub-fabric',
    autonomyLevel: 'READ_AUTO',
    approvalRequired: false,
    policyClass: 'READ_AUTO',
    missionKeyPatterns: [],
    triggerKinds: ['scheduled_sweep'],
    whyExists: 'Keeps Ask Atlas and authorized search backed by entitled M365 evidence.',
    source: 'atlas_fabric_sweep',
    actionsAllowed: ['pause_overlay', 'resume_overlay', 'run_manual_sync'],
    actionsBlocked: ['bypass_entitlement', 'index_unentitled_clients'],
    ownerGatedActions: [],
    pauseAllowed: true,
    retryAllowed: true,
    scheduleCadence: 'interval_sweep',
  },
  {
    workflowId: 'atlas.business_memory.backfill',
    name: 'Current client business memory',
    description:
      'Reconciles entitled current-client identity, mail, files, projects, and operating records into durable business memory.',
    workflowType: 'scheduled',
    trigger: 'scheduled_sweep',
    responsibleAgent: 'atlas_business_memory',
    autonomyLevel: 'READ_AUTO',
    approvalRequired: false,
    policyClass: 'READ_AUTO',
    missionKeyPatterns: ['ATLAS-M365-CURRENT-CLIENT-BACKFILL', 'BUSINESS_MEMORY'],
    triggerKinds: ['scheduled_sweep', 'authorized_internal_event'],
    whyExists: 'Keeps Ask Atlas, Projects, and Documents grounded in reconciled client memory.',
    source: 'atlas_business_memory',
    actionsAllowed: ['enumerate_clients', 'reconcile_memory', 'emit_governed_triggers'],
    actionsBlocked: ['fabricate_client_codes', 'cross_client_merge'],
    ownerGatedActions: [],
    pauseAllowed: false,
    retryAllowed: true,
    scheduleCadence: 'after_fabric_sweep',
  },
  {
    workflowId: 'atlas.engineering.loop',
    name: 'Engineering mission loop',
    description:
      'Inspects product improvement signals and persists bounded engineering mission proposals for V4 execution.',
    workflowType: 'agent',
    trigger: 'signed_operator_inspect',
    responsibleAgent: 'atlas-hub-runtime',
    autonomyLevel: 'SAFE_INTERNAL_WRITE',
    approvalRequired: false,
    policyClass: 'SAFE_INTERNAL_WRITE',
    missionKeyPatterns: [ASK_ATLAS_LOOP_MISSION_KEY, 'ATLAS-AGENTIC-OPS-LOOP'],
    triggerKinds: ['signed_operator_inspect'],
    whyExists: 'Routes governed improvement work into bounded engineering missions.',
    source: 'atlas_engineering_loop',
    relatedMission: ASK_ATLAS_LOOP_MISSION_KEY,
    actionsAllowed: ['inspect', 'persist_proposed_missions'],
    actionsBlocked: ['auto_execute_code', 'auto_deploy', 'auto_merge'],
    ownerGatedActions: ['dispatch_v4_without_review'],
    pauseAllowed: true,
    retryAllowed: true,
  },
  {
    workflowId: 'atlas.product.improvement',
    name: 'Product improvement inspect',
    description:
      'Surfaces failed agent actions, health degradations, and recorded product surface gaps for operator review.',
    workflowType: 'agent',
    trigger: 'signed_operator_inspect',
    responsibleAgent: 'atlas-hub-runtime',
    autonomyLevel: 'READ_AUTO',
    approvalRequired: false,
    policyClass: 'READ_AUTO',
    missionKeyPatterns: [ASK_ATLAS_PII_MISSION_KEY, 'PRODUCT-IMPROVEMENT', 'ATLAS-AGENTIC-OPS-PII'],
    triggerKinds: ['signed_operator_inspect'],
    whyExists: 'Feeds the product improvement intelligence loop without inventing metrics.',
    source: 'atlas_product_improvement',
    relatedMission: ASK_ATLAS_PII_MISSION_KEY,
    actionsAllowed: ['inspect'],
    actionsBlocked: ['auto_fix_production'],
    ownerGatedActions: [],
    pauseAllowed: true,
    retryAllowed: true,
  },
  {
    workflowId: 'atlas.event.processing',
    name: 'Atlas event processor',
    description:
      'Evaluates authorized internal events, applies policy classes, and routes attention or owner gates.',
    workflowType: 'event_driven',
    trigger: 'authorized_internal_event',
    responsibleAgent: 'atlas-hub-runtime',
    autonomyLevel: 'READ_AUTO',
    approvalRequired: false,
    policyClass: 'READ_AUTO',
    missionKeyPatterns: [ASK_ATLAS_EVENT_MISSION_KEY, 'ATLAS-AGENTIC-OPS-EVENT'],
    triggerKinds: ['authorized_internal_event'],
    whyExists: 'Connects runtime events to governed operator attention.',
    source: 'atlas_event_processing',
    relatedMission: ASK_ATLAS_EVENT_MISSION_KEY,
    actionsAllowed: ['evaluate_event', 'route_attention'],
    actionsBlocked: ['owner_gated_execute'],
    ownerGatedActions: ['ad_spend', 'lender_outreach', 'contract_send', 'outbound_message'],
    pauseAllowed: false,
    retryAllowed: true,
  },
  {
    workflowId: 'atlas.decisions.queue',
    name: 'Owner decisions queue',
    description: 'SharePoint-backed decisions and approvals that require Manny review before execution.',
    workflowType: 'approval',
    trigger: 'policy',
    responsibleAgent: 'sharepoint-decisions',
    autonomyLevel: 'OWNER_ESCALATE',
    approvalRequired: true,
    policyClass: 'OWNER_ESCALATE',
    missionKeyPatterns: [],
    triggerKinds: [],
    whyExists: 'Central owner approval path for material business decisions.',
    source: 'sharepoint_hvcg_decisions',
    href: '/tasks',
    actionsAllowed: ['view', 'open_related_context'],
    actionsBlocked: ['silent_approve'],
    ownerGatedActions: ['approve', 'reject'],
    ownerActionRequired: true,
    pauseAllowed: false,
    retryAllowed: false,
  },
  {
    workflowId: 'hart.google_ads.sync',
    name: 'Hart Google Ads metrics sync',
    description:
      'Production read path: Google Ads → 360 API → Postgres with location attribution. Read-only for live campaigns.',
    workflowType: 'integration_sync',
    trigger: 'scheduled_or_manual',
    responsibleAgent: '360-lead-intelligence',
    autonomyLevel: 'READ_AUTO',
    approvalRequired: false,
    policyClass: 'READ_AUTO',
    clientCode: 'HFD01',
    clientName: 'Hart Family Dental',
    relatedSystem: '360-growth-solution',
    missionKeyPatterns: [
      'HART-GOOGLE-ADS',
      'HART_GOOGLE_ADS',
      'google_ads_sync',
      'GOOGLE-ADS-PRODUCTION',
    ],
    triggerKinds: ['signed_operator_question', 'scheduled_sweep', 'authorized_internal_event'],
    whyExists: 'Keeps Hart marketing intelligence backed by live Google Ads production metrics.',
    source: '360_google_ads_production_sync',
    relatedMission: 'HART-GOOGLE-ADS-PRODUCTION-SYNC-001',
    actionsAllowed: ['sync_metrics', 'reconcile_callrail', 'view_cmo_dashboard'],
    actionsBlocked: ['mutate_live_campaigns', 'enable_paid_ads'],
    ownerGatedActions: ['material_budget_change', 'new_paid_campaign_launch'],
    pauseAllowed: true,
    retryAllowed: true,
  },
  {
    workflowId: 'hart.callrail.reconcile',
    name: 'Hart CallRail reconciliation',
    description: 'Reconciles Hart tracking numbers and CallRail tracker IDs without overwriting authoritative IDs.',
    workflowType: 'integration_sync',
    trigger: 'with_google_ads_sync',
    responsibleAgent: '360-lead-intelligence',
    autonomyLevel: 'SAFE_INTERNAL_WRITE',
    approvalRequired: false,
    policyClass: 'SAFE_INTERNAL_WRITE',
    clientCode: 'HFD01',
    clientName: 'Hart Family Dental',
    relatedSystem: '360-growth-solution',
    missionKeyPatterns: ['CALLRAIL', 'callrail'],
    triggerKinds: ['signed_operator_question', 'scheduled_sweep'],
    whyExists: 'Preserves call attribution between Google Ads and CallRail for Hart locations.',
    source: '360_callrail_reconcile',
    relatedMission: 'HART-GOOGLE-ADS-PRODUCTION-SYNC-001',
    actionsAllowed: ['reconcile_trackers'],
    actionsBlocked: ['create_duplicate_trackers', 'blind_overwrite'],
    ownerGatedActions: [],
    pauseAllowed: true,
    retryAllowed: true,
  },
  {
    workflowId: 'hart.cmo.cycle',
    name: 'Hart CMO analysis cycle',
    description:
      'Reads persisted Hart marketing metrics and may propose recommendations. Material spend changes stay owner-gated.',
    workflowType: 'agent',
    trigger: 'manual_or_scheduled',
    responsibleAgent: 'hart-chief-marketing-agent',
    autonomyLevel: 'PROPOSE_AUTO',
    approvalRequired: true,
    policyClass: 'PROPOSE_AUTO',
    clientCode: 'HFD01',
    clientName: 'Hart Family Dental',
    relatedSystem: '360-growth-solution',
    missionKeyPatterns: ['CMO', 'cmo_cycle', 'chief_marketing'],
    triggerKinds: ['signed_operator_question', 'signed_operator_inspect'],
    whyExists: 'Surfaces marketing intelligence and approval-required directives from production data.',
    source: '360_cmo_cycle',
    actionsAllowed: ['analyze_metrics', 'propose_recommendations'],
    actionsBlocked: ['execute_material_budget_change', 'launch_new_campaign'],
    ownerGatedActions: ['material_budget_change', 'new_paid_campaign_launch', 'approve_directive'],
    ownerActionRequired: true,
    pauseAllowed: true,
    retryAllowed: true,
  },
  {
    workflowId: 'atlas.capital.submission_prepare',
    name: 'Capital submission preparation',
    description: 'Prepares lender/investor packages. External submission remains owner-gated.',
    workflowType: 'approval',
    trigger: 'manual',
    responsibleAgent: 'atlas-capital-agent',
    autonomyLevel: 'PREPARE_ONLY',
    approvalRequired: true,
    policyClass: 'PREPARE_ONLY',
    missionKeyPatterns: ['CAPITAL-SUBMISSION', 'ATLAS-CAPITAL'],
    triggerKinds: ['signed_operator_question', 'signed_operator_inspect'],
    whyExists: 'Accelerates Capital prep while preserving owner control of external sends.',
    source: 'atlas_capital_prepare',
    actionsAllowed: ['research', 'draft', 'compare', 'analyze'],
    actionsBlocked: ['external_submit'],
    ownerGatedActions: ['external_lender_submit', 'external_investor_submit'],
    ownerActionRequired: CAPITAL_SUBMISSION_OWNER_GATED,
    pauseAllowed: false,
    retryAllowed: true,
  },
  {
    workflowId: 'atlas.communications.draft',
    name: 'Communication draft workflow',
    description: 'Draft-only communication assistance. AUTO_RESPOND is never enabled.',
    workflowType: 'communication',
    trigger: 'event_or_manual',
    responsibleAgent: 'atlas-communications-agent',
    autonomyLevel: 'DRAFT_ONLY',
    approvalRequired: true,
    policyClass: 'DRAFT_ONLY',
    missionKeyPatterns: ['COMMUNICATIONS', 'ATLAS-AI-COMMUNICATIONS'],
    triggerKinds: ['authorized_internal_event', 'signed_operator_question'],
    whyExists: 'Supports draft replies without autonomous outbound messaging.',
    source: 'atlas_communications',
    actionsAllowed: ['draft_reply', 'summarize_thread'],
    actionsBlocked: ['auto_respond', 'send_without_approval'],
    ownerGatedActions: ['send_external_message'],
    ownerActionRequired: !COMMUNICATIONS_AUTO_RESPOND,
    pauseAllowed: false,
    retryAllowed: false,
  },
  {
    workflowId: 'atlas.onboarding.agent',
    name: 'Client onboarding workflow',
    description: 'Surfaces onboarding evidence and tasks. Activation and outbound remain owner-escalated.',
    workflowType: 'client_onboarding',
    trigger: 'client_status_change',
    responsibleAgent: 'atlas-onboarding-agent',
    autonomyLevel: 'OWNER_ESCALATE',
    approvalRequired: true,
    policyClass: 'OWNER_ESCALATE',
    missionKeyPatterns: ['ONBOARDING', 'ATLAS-ONBOARDING'],
    triggerKinds: ['signed_operator_inspect', 'authorized_internal_event'],
    whyExists: 'Guides onboarding without auto-activating clients or sending live GTM outbound.',
    source: 'atlas_onboarding',
    actionsAllowed: ['surface_evidence', 'propose_tasks'],
    actionsBlocked: ['auto_activate', 'live_gtm_outbound'],
    ownerGatedActions: ['activate_client', 'send_onboarding_outbound'],
    ownerActionRequired: ONBOARDING_AGENT_OWNER_GATED,
    pauseAllowed: false,
    retryAllowed: false,
  },
];

function matchesMission(entry: AgentActivityLedgerEntry, patterns: string[]): boolean {
  const key = entry.missionKey.toUpperCase();
  return patterns.some((p) => key.includes(p.toUpperCase()));
}

function matchesTrigger(entry: AgentActivityLedgerEntry, kinds: string[]): boolean {
  if (!kinds.length) return false;
  return kinds.includes(entry.trigger);
}

function entriesForWorkflow(
  workflow: WorkflowDefinition,
  entries: AgentActivityLedgerEntry[],
): AgentActivityLedgerEntry[] {
  return entries.filter(
    (e) => matchesMission(e, workflow.missionKeyPatterns) || matchesTrigger(e, workflow.triggerKinds),
  );
}

function callerMaySeeWorkflow(workflow: WorkflowDefinition, principal: AtlasPrincipal): boolean {
  if (!workflow.clientCode) return true;
  return entitledClientCodes(principal).includes(workflow.clientCode);
}

function mapLedgerResultToStatus(
  entry: AgentActivityLedgerEntry | undefined,
  control?: WorkflowControlRecord,
): { status: WorkflowStatus; successState: WorkflowSummary['successState']; failureSummary?: string } {
  if (control?.state === 'disabled') {
    return { status: 'DISABLED', successState: 'unknown' };
  }
  if (control?.state === 'paused') {
    return { status: 'PAUSED', successState: 'unknown' };
  }
  if (!entry) {
    return { status: 'ACTIVE', successState: 'never_run' };
  }
  if (entry.result === 'fail_closed' || entry.policyDecision === 'fail_closed') {
    return {
      status: 'FAILED',
      successState: 'failure',
      failureSummary: 'Policy fail-closed or runtime blocked this workflow run.',
    };
  }
  if (entry.result === 'hvs_blocked') {
    return {
      status: 'REQUIRES_APPROVAL',
      successState: 'unknown',
      failureSummary: 'Owner-gated action blocked until approval.',
    };
  }
  if (entry.ran === false) {
    return { status: 'WAITING', successState: 'unknown' };
  }
  return { status: 'COMPLETE', successState: 'success' };
}

function activityFromLedger(
  workflow: WorkflowDefinition,
  entries: AgentActivityLedgerEntry[],
): WorkflowActivityItem[] {
  return entries.slice(0, 40).map((entry, idx) => ({
    id: `${workflow.workflowId}:${entry.timestamp}:${idx}`,
    timestamp: entry.timestamp,
    kind: entry.result === 'hvs_blocked' ? 'approval_blocked' : 'agent_run',
    actor: entry.writerUserId,
    agent: entry.agent,
    tool: entry.tools.join(', '),
    policy: entry.readWriteStatus,
    result: entry.result,
    provenance: 'LIVE',
    summary: `${entry.missionKey} via ${entry.trigger}`,
  }));
}

function runsFromLedger(workflow: WorkflowDefinition, entries: AgentActivityLedgerEntry[]): WorkflowRunSummary[] {
  return entries.slice(0, 20).map((entry, idx) => {
    const mapped = mapLedgerResultToStatus(entry);
    return {
      runId: `${workflow.workflowId}-run-${idx}`,
      startedAt: entry.timestamp,
      endedAt: entry.timestamp,
      status: mapped.status,
      step: entry.missionKey,
      result: entry.result,
      provenance: 'LIVE',
    };
  });
}

function enrichFabricWorkflow(
  summary: WorkflowSummary,
  cfg: AppConfig,
): WorkflowSummary {
  const fabric = inspectFabricSyncHealth(cfg.dataDir, {
    sweepEnabled: Boolean(cfg.pmBackend.sharepoint) && isFabricSweepEnabled(),
  });
  const mapped = mapLedgerResultToStatus(undefined);
  let status: WorkflowStatus = mapped.status;
  let successState = mapped.successState;
  if (fabric.honesty === 'degraded') {
    status = 'FAILED';
    successState = 'failure';
  } else if (fabric.lastRunAt) {
    status = 'COMPLETE';
    successState = 'success';
  }
  return {
    ...summary,
    status,
    successState,
    lastRunAt: fabric.lastRunAt ?? undefined,
    nextRunAt: fabric.scheduledSweepEnabled ? 'scheduled_interval' : undefined,
    currentStep: fabric.mailMode === 'none' ? 'awaiting_sweep' : `mail_${fabric.mailMode}`,
    nextStep: fabric.scheduledSweepEnabled ? 'next_scheduled_sweep' : 'manual_sync',
    updatedAt: fabric.lastAttemptAt ?? summary.updatedAt,
    failureSummary:
      fabric.honesty === 'degraded' ? 'Fabric sync degraded — see diagnostics.' : summary.failureSummary,
    provenance: 'LIVE',
  };
}

function isCustomWorkflowId(workflowId: string): boolean {
  return workflowId.startsWith(CUSTOM_WORKFLOW_ID_PREFIX);
}

function mapDefinitionStatus(
  def: WorkflowDefinitionRecord,
  control?: WorkflowControlRecord,
): WorkflowStatus {
  if (control?.state === 'disabled' || def.status === 'DISABLED') return 'DISABLED';
  if (control?.state === 'paused' || def.status === 'PAUSED') return 'PAUSED';
  if (def.status === 'DRAFT') return 'WAITING';
  if (def.status === 'READY_FOR_APPROVAL') return 'REQUIRES_APPROVAL';
  if (def.status === 'REJECTED') return 'DISABLED';
  return 'ACTIVE';
}

function summaryFromCustomDefinition(
  def: WorkflowDefinitionRecord,
  control?: WorkflowControlRecord,
): WorkflowSummary {
  const status = mapDefinitionStatus(def, control);
  return {
    workflowId: def.workflowId,
    name: def.name,
    description: def.description.slice(0, 280),
    workflowType: def.provenance === 'template' ? 'template' : 'conversational',
    trigger: def.trigger.scheduleHuman ?? def.trigger.event ?? def.trigger.originalLanguage,
    status,
    currentStep: def.status,
    nextStep: def.authorityExpansionRequired ? 'owner_approval' : 'awaiting_activation',
    clientCode: def.scope.clientCode,
    clientName: def.scope.clientName,
    projectScope: def.scope.projectScope,
    responsibleAgent: def.responsibleAgent ?? 'atlas-hub-runtime',
    autonomyLevel: def.policyClass,
    approvalRequired: def.authorityExpansionRequired || def.approvalRequirements.length > 0,
    lastRunAt: undefined,
    nextRunAt: def.trigger.scheduleHuman ?? def.trigger.schedule,
    successState: 'never_run',
    updatedAt: def.updatedAt,
    provenance: 'LIVE',
    ownerActionRequired: def.authorityExpansionRequired,
    policyClass: def.policyClass,
    href: `/workflows?workflowId=${encodeURIComponent(def.workflowId)}`,
  };
}

function detailFromCustomDefinition(
  def: WorkflowDefinitionRecord,
  overlay: ReturnType<typeof readWorkflowDefinitionOverlay>,
  control?: WorkflowControlRecord,
  principal?: AtlasPrincipal,
  dataDir?: string,
): WorkflowDetail {
  const summary = summaryFromCustomDefinition(def, control);
  const versions = overlay.definitions
    .filter((d) => d.workflowId === def.workflowId)
  const versionHistory: WorkflowDefinitionVersionSummary[] = versions
    .flatMap((d) =>
      d.versionHistory.map((v) => ({
        version: v.version,
        changedAt: v.changedAt,
        changedBy: v.changedBy,
        changeReason: v.changeReason,
        changedFields: v.changedFields,
        status: d.status,
      })),
    )
    .sort((a, b) => b.version - a.version);

  const workflowActivity = versions.slice(-5).map((d, idx) => ({
    id: `${def.workflowId}:def:${d.version}:${idx}`,
    timestamp: d.updatedAt,
    kind: 'definition_version',
    actor: d.createdBy,
    result: d.status,
    provenance: 'LIVE' as WorkflowDataProvenance,
    summary: `Definition v${d.version} — ${d.status}`,
  }));

  const onboardingRun =
    dataDir && (def.sourceTemplateId === 'client_onboarding' || def.templateKey === 'client_onboarding')
      ? getOnboardingRun(readOnboardingOverlay(resolveOnboardingStateDir(dataDir)), def.workflowId)
      : null;

  return {
    ...summary,
    overview: {
      whyExists: `Created from Ask Atlas ${def.provenance === 'template' ? 'workflow template' : 'conversational workflow creation'} (${def.provenance}).`,
      source: def.provenance === 'template' ? 'workflow_template' : 'ask_atlas_conversational',
      relatedMission:
        def.provenance === 'template'
          ? 'ATLAS-WORKFLOW-TEMPLATES-001'
          : 'ATLAS-CONVERSATIONAL-WORKFLOW-CREATION-001',
      createdFromAskAtlas: true,
      conversationalProvenance: def.sourceConversation.slice(0, 500),
      ...(def.sourceTemplateId
        ? {
            sourceTemplateId: def.sourceTemplateId,
            sourceTemplateVersion: def.sourceTemplateVersion,
            templateCustomizations: def.templateCustomizations,
          }
        : {}),
    },
    scope: {
      clientCode: def.scope.clientCode,
      clientName: def.scope.clientName,
      projectScope: def.scope.projectScope,
      capitalMatter: def.scope.capitalMatter,
      relatedSystem: def.scope.system,
    },
    triggerDetail: {
      triggerType: def.trigger.type,
      event: def.trigger.event,
      schedule: def.trigger.schedule ?? def.trigger.scheduleHuman,
      manual: def.trigger.manual,
      policy: def.policyClass,
      source: 'conversational_definition',
    },
    actionsAllowed: def.actions.filter((a) => a.supported).map((a) => a.actionType),
    actionsBlocked: def.actions.filter((a) => !a.supported).map((a) => a.actionType),
    ownerGatedActions: def.approvalRequirements,
    history: [],
    activity: workflowActivity,
    control,
    definitionPreview: formatWorkflowPreview(def),
    versionHistory,
    approvalRequirements: def.approvalRequirements,
    authorityExpansionRequired: def.authorityExpansionRequired,
    diagnostics: {
      templateKey: def.templateKey ?? null,
      definitionVersion: def.version,
      draftNotExecutable: def.status === 'DRAFT' || def.status === 'READY_FOR_APPROVAL',
      ...(onboardingRun
        ? {
            onboardingStatus: onboardingRun.status,
            onboardingCurrentStep: onboardingRun.currentStep,
            onboardingNextStep: onboardingRun.nextStep,
            onboardingBlockers: onboardingRun.blockers,
          }
        : {}),
    },
  };
}

function buildSummary(
  workflow: WorkflowDefinition,
  entries: AgentActivityLedgerEntry[],
  control?: WorkflowControlRecord,
  cfg?: AppConfig,
): WorkflowSummary {
  const related = entriesForWorkflow(workflow, entries);
  const latest = related[related.length - 1];
  const mapped = mapLedgerResultToStatus(latest, control);
  let status = workflow.approvalRequired && !latest ? 'REQUIRES_APPROVAL' : mapped.status;
  if (workflow.approvalRequired && latest?.result === 'answered') status = 'REQUIRES_APPROVAL';

  const summary: WorkflowSummary = {
    workflowId: workflow.workflowId,
    name: workflow.name,
    description: workflow.description,
    workflowType: workflow.workflowType,
    trigger: workflow.trigger,
    status,
    currentStep: latest?.missionKey,
    nextStep: workflow.approvalRequired ? 'owner_review' : workflow.scheduleCadence ?? undefined,
    clientCode: workflow.clientCode,
    clientName: workflow.clientName,
    projectScope: workflow.projectScope,
    responsibleAgent: workflow.responsibleAgent,
    autonomyLevel: workflow.autonomyLevel,
    approvalRequired: workflow.approvalRequired,
    lastRunAt: latest?.timestamp,
    nextRunAt: workflow.scheduleCadence,
    successState: mapped.successState,
    retryState: control?.lastRetryAt ? 'retry_recorded' : undefined,
    retryCount: control?.retryCount,
    updatedAt: control?.updatedAt ?? latest?.timestamp ?? new Date().toISOString(),
    provenance: latest ? 'LIVE' : 'LIVE',
    failureSummary: mapped.failureSummary,
    ownerActionRequired: workflow.ownerActionRequired,
    policyClass: workflow.policyClass,
    href: workflow.href,
  };

  if (workflow.workflowId === 'atlas.m365.fabric_sweep' && cfg) {
    return enrichFabricWorkflow(summary, cfg);
  }
  return summary;
}

export function listWorkflowCenter(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
}): WorkflowCenterModel {
  const entries = listVisibleAgentActivity({
    dataDir: opts.dataDir,
    principal: opts.principal,
    limit: 200,
  });
  const controlDir = resolveWorkflowControlOverlayDir(opts.dataDir);
  const controlOverlay = readWorkflowControlOverlay(controlDir);

  const staticWorkflows = WORKFLOW_DEFINITIONS.filter((w) => callerMaySeeWorkflow(w, opts.principal)).map(
    (workflow) => {
      const control = getWorkflowControlState(controlOverlay, workflow.workflowId);
      return buildSummary(workflow, entries, control, opts.cfg);
    },
  );

  const defOverlayDir = resolveWorkflowDefinitionOverlayDir(opts.dataDir);
  const defOverlay = readWorkflowDefinitionOverlay(defOverlayDir);
  const customSummaries = listVisibleDefinitions(defOverlay, opts.principal)
    .filter((d) => d.status !== 'REJECTED')
    .map((def) => {
      const control = getWorkflowControlState(controlOverlay, def.workflowId);
      return summaryFromCustomDefinition(def, control);
    });

  const workflows = [...staticWorkflows, ...customSummaries];

  const counts = {
    total: workflows.length,
    requiresApproval: workflows.filter((w) => w.status === 'REQUIRES_APPROVAL').length,
    failed: workflows.filter((w) => w.status === 'FAILED').length,
    paused: workflows.filter((w) => w.status === 'PAUSED' || w.status === 'DISABLED').length,
    running: workflows.filter((w) => w.status === 'RUNNING').length,
  };

  return {
    contractVersion: WORKFLOW_CENTER_CONTRACT,
    missionKey: WORKFLOW_CENTER_MISSION_KEY,
    entitled: true,
    workflows,
    counts,
    policy: {
      paidAdsReporting: 'AUTO',
      paidAdsAnalysis: 'AUTO',
      paidAdsRecommendations: 'AUTO',
      paidAdsMutationValidation: 'AUTO',
      materialBudgetChange: 'OWNER_GATED',
      newPaidCampaignLaunch: 'OWNER_GATED',
      capitalExternalSubmit: 'OWNER_GATED',
      communicationsAutoRespond: false,
    },
  };
}

export function getWorkflowDetail(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  workflowId: string;
}): WorkflowDetail | null {
  if (isCustomWorkflowId(opts.workflowId)) {
    const defOverlayDir = resolveWorkflowDefinitionOverlayDir(opts.dataDir);
    const defOverlay = readWorkflowDefinitionOverlay(defOverlayDir);
    const def = getLatestDefinition(defOverlay, opts.workflowId, opts.principal);
    if (!def || def.status === 'REJECTED') return null;
    const controlDir = resolveWorkflowControlOverlayDir(opts.dataDir);
    const controlOverlay = readWorkflowControlOverlay(controlDir);
    const control = getWorkflowControlState(controlOverlay, opts.workflowId);
    return detailFromCustomDefinition(def, defOverlay, control, opts.principal, opts.dataDir);
  }

  const workflow = WORKFLOW_DEFINITIONS.find((w) => w.workflowId === opts.workflowId);
  if (!workflow || !callerMaySeeWorkflow(workflow, opts.principal)) return null;

  const entries = listVisibleAgentActivity({
    dataDir: opts.dataDir,
    principal: opts.principal,
    limit: 200,
  });
  const related = entriesForWorkflow(workflow, entries);
  const controlDir = resolveWorkflowControlOverlayDir(opts.dataDir);
  const controlOverlay = readWorkflowControlOverlay(controlDir);
  const control = getWorkflowControlState(controlOverlay, workflow.workflowId);
  const summary = buildSummary(workflow, entries, control, opts.cfg);
  const activity = activityFromLedger(workflow, related);
  const history = runsFromLedger(workflow, related);

  const latest = related[related.length - 1];
  const diagnostics: Record<string, string | number | boolean | null> = {};
  if (workflow.workflowId === 'atlas.m365.fabric_sweep') {
    const fabric = inspectFabricSyncHealth(opts.cfg.dataDir, {
      sweepEnabled: Boolean(opts.cfg.pmBackend.sharepoint) && isFabricSweepEnabled(),
    });
    diagnostics.fabricHonesty = fabric.honesty;
    diagnostics.mailMode = fabric.mailMode;
    diagnostics.lastRunAt = fabric.lastRunAt;
    diagnostics.scheduledSweepEnabled = fabric.scheduledSweepEnabled;
  }

  if (workflow.workflowId === 'hart.google_ads.sync') {
    diagnostics.reportingAuto = true;
    diagnostics.analysisAuto = true;
    diagnostics.recommendationsAuto = true;
    diagnostics.mutationValidationAuto = true;
    diagnostics.materialBudgetChangeOwnerGated = true;
    diagnostics.newCampaignLaunchOwnerGated = true;
    diagnostics.livePipelineVerified = related.length > 0;
  }

  return {
    ...summary,
    overview: {
      whyExists: workflow.whyExists,
      source: workflow.source,
      relatedMission: workflow.relatedMission,
      sourceEvent: latest?.trigger,
    },
    scope: {
      clientCode: workflow.clientCode,
      clientName: workflow.clientName,
      projectScope: workflow.projectScope,
      relatedSystem: workflow.relatedSystem,
    },
    triggerDetail: {
      triggerType: workflow.trigger,
      event: latest?.trigger,
      schedule: workflow.scheduleCadence,
      manual: workflow.trigger.includes('manual'),
      policy: workflow.policyClass,
      source: workflow.source,
    },
    currentExecution: latest
      ? {
          currentStep: latest.missionKey,
          nextStep: summary.nextStep,
          runId: `${workflow.workflowId}:${latest.timestamp}`,
          startedAt: latest.timestamp,
          waitingReason:
            summary.status === 'REQUIRES_APPROVAL' ? 'Owner approval required before execution.' : undefined,
        }
      : undefined,
    actionsAllowed: [...workflow.actionsAllowed],
    actionsBlocked: [...workflow.actionsBlocked],
    ownerGatedActions: [...workflow.ownerGatedActions],
    history,
    activity,
    control,
    diagnostics: Object.keys(diagnostics).length ? diagnostics : undefined,
  };
}

export async function handleWorkflowControl(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  workflowId: string;
  action: 'pause' | 'resume' | 'disable' | 'retry';
  reason?: string;
}): Promise<{ ok: true; control: WorkflowControlRecord; workflow: WorkflowSummary } | { ok: false; error: string }> {
  if (isCustomWorkflowId(opts.workflowId)) {
    const defOverlayDir = resolveWorkflowDefinitionOverlayDir(opts.cfg.dataDir);
    const defOverlay = readWorkflowDefinitionOverlay(defOverlayDir);
    const def = getLatestDefinition(defOverlay, opts.workflowId, opts.principal);
    if (!def) return { ok: false, error: 'workflow_not_found' };

    const control = await applyWorkflowControl({
      dataDir: opts.cfg.dataDir,
      principal: opts.principal,
      workflowId: opts.workflowId,
      action: opts.action,
      reason: opts.reason,
    });
    const summary = summaryFromCustomDefinition(def, control);
    return { ok: true, control, workflow: summary };
  }

  const workflow = WORKFLOW_DEFINITIONS.find((w) => w.workflowId === opts.workflowId);
  if (!workflow || !callerMaySeeWorkflow(workflow, opts.principal)) {
    return { ok: false, error: 'workflow_not_found' };
  }
  if (opts.action === 'pause' && !workflow.pauseAllowed) {
    return { ok: false, error: 'pause_not_allowed' };
  }
  if (opts.action === 'retry' && !workflow.retryAllowed) {
    return { ok: false, error: 'retry_not_allowed' };
  }
  if (opts.action === 'disable' && workflow.ownerGatedActions.length > 0 && workflow.approvalRequired) {
    return { ok: false, error: 'disable_not_allowed_for_owner_gated_workflow' };
  }

  const control = await applyWorkflowControl({
    dataDir: opts.cfg.dataDir,
    principal: opts.principal,
    workflowId: opts.workflowId,
    action: opts.action,
    reason: opts.reason,
  });

  const entries = listVisibleAgentActivity({
    dataDir: opts.cfg.dataDir,
    principal: opts.principal,
    limit: 200,
  });
  const summary = buildSummary(workflow, entries, control, opts.cfg);
  return { ok: true, control, workflow: summary };
}

export function workflowAttentionFromCenter(model: WorkflowCenterModel): {
  requiresAttention: WorkflowSummary[];
  failed: WorkflowSummary[];
  waitingApproval: WorkflowSummary[];
} {
  return {
    requiresAttention: model.workflows.filter(
      (w) => w.status === 'REQUIRES_APPROVAL' || w.status === 'FAILED' || w.ownerActionRequired,
    ),
    failed: model.workflows.filter((w) => w.status === 'FAILED'),
    waitingApproval: model.workflows.filter((w) => w.status === 'REQUIRES_APPROVAL'),
  };
}

export function mapsToWorkflowQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return (
    q.includes('workflow') ||
    q.includes('automation') ||
    q.includes('google ads sync') ||
    q.includes('what failed') ||
    q.includes('waiting for approval') ||
    q.includes('requires approval') ||
    q.includes('currently running') ||
    q.includes('what ran') ||
    q.includes('what is running')
  );
}

export function buildWorkflowAskAtlasAnswer(opts: {
  question: string;
  center: WorkflowCenterModel;
  now?: string;
}): AskAtlasAnswer {
  const now = opts.now ?? new Date().toISOString();
  const answerText = answerWorkflowQuestion(opts.question, opts.center);
  const attention = workflowAttentionFromCenter(opts.center);
  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: attention.requiresAttention.length === 0 && !answerText,
    ranking: ['Decision Required', 'At Risk', 'Overdue', 'Waiting', 'Blocked', 'Capital'],
    items: attention.requiresAttention.slice(0, 8).map((w, idx) => ({
      id: `workflow:${w.workflowId}:${idx}`,
      state: w.status === 'FAILED' ? 'At Risk' : 'Decision Required',
      why: w.failureSummary ?? w.description,
      basedOn: `Workflow Center live state: ${w.status}`,
      evidence: w.lastRunAt ? `Last run ${w.lastRunAt}` : 'No ledger run recorded',
      provenance: 'CONFIRMED',
      classification: 'CONFIRMED',
      client: w.clientName,
      clientCode: w.clientCode,
      kind: w.workflowType,
    })),
    activity: {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: WORKFLOW_CENTER_MISSION_KEY,
      trigger: 'signed_operator_question',
      timestamp: now,
      tools: ['workflow_center'],
      classification: 'CONFIRMED',
      result: 'answered',
      readWriteStatus: 'READ_AUTO',
      policyDecision: 'answered',
      ran: true,
    },
    ...(answerText ? { workflowAnswer: answerText } : {}),
  } as AskAtlasAnswer & { workflowAnswer?: string };
}

export function answerWorkflowQuestion(question: string, model: WorkflowCenterModel): string {
  const q = question.toLowerCase();
  const attention = workflowAttentionFromCenter(model);
  if (q.includes('need my attention') || q.includes('need attention')) {
    if (!attention.requiresAttention.length) {
      return 'No workflows currently require your attention based on live Atlas runtime evidence.';
    }
    return attention.requiresAttention
      .slice(0, 5)
      .map((w) => `${w.name}: ${w.status}${w.failureSummary ? ` — ${w.failureSummary}` : ''}`)
      .join('\n');
  }
  if (q.includes('waiting for approval') || q.includes('requires approval')) {
    if (!attention.waitingApproval.length) {
      return 'No workflows are waiting for owner approval in the live Workflow Center view.';
    }
    return attention.waitingApproval.map((w) => `${w.name} (${w.workflowId})`).join('\n');
  }
  if (q.includes('failed') || q.includes('what failed')) {
    if (!attention.failed.length) {
      return 'No failed workflows in the current live Workflow Center snapshot.';
    }
    return attention.failed
      .map((w) => `${w.name}: ${w.failureSummary ?? w.status}`)
      .join('\n');
  }
  if (q.includes('hart') && q.includes('google ads')) {
    const hart = model.workflows.find((w) => w.workflowId === 'hart.google_ads.sync');
    if (!hart) return 'Hart Google Ads sync workflow is not visible for your entitlement scope.';
    return `Hart Google Ads sync is ${hart.status}. Last run: ${hart.lastRunAt ?? 'never recorded in ledger'}. Policy: reporting/analysis AUTO; material budget and new campaigns OWNER_GATED.`;
  }
  if (q.includes('prodigy')) {
    const prodigy = model.workflows.filter((w) => w.clientCode === 'PDG01');
    if (!prodigy.length) {
      return 'No Prodigy-scoped workflows are in your entitled Workflow Center view.';
    }
    return prodigy.map((w) => `${w.name}: ${w.status}`).join('\n');
  }
  if (q.includes('accg')) {
    const accg = model.workflows.filter((w) => w.clientCode === 'ACCG01');
    if (!accg.length) {
      return 'No ACCG-scoped workflows are in your entitled Workflow Center view.';
    }
    return accg.map((w) => `${w.name}: ${w.status}`).join('\n');
  }
  const running = model.workflows.filter((w) => w.status === 'RUNNING' || w.status === 'ACTIVE');
  return `Workflow Center shows ${model.counts.total} workflows (${model.counts.requiresApproval} require approval, ${model.counts.failed} failed). Active: ${running.map((w) => w.name).join(', ')}.`;
}
