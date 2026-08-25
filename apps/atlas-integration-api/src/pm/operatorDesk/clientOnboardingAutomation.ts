/**
 * Governed client onboarding automation — executes Client Onboarding template workflows.
 */

import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../config.ts';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import type { SharePointPmService } from '../sharepoint/repository.ts';
import { listDocumentRequests } from '../sharepoint/documentRequests.ts';
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
  type OnboardingMilestoneState,
  type OnboardingRunRecord,
  resolveOnboardingStateDir,
  upsertOnboardingRun,
} from './onboardingState.ts';

const ONBOARDING_PROJECT_TITLE = /\b(onboard|kickoff|engagement setup|client activation)\b/i;
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

export type OnboardingAutomationResult = {
  ok: true;
  record: OnboardingRunRecord;
  events: string[];
} | {
  ok: false;
  error: string;
  record?: OnboardingRunRecord;
};

function isOnboardingWorkflow(workflow: WorkflowDefinitionRecord): boolean {
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

export async function runClientOnboardingAutomation(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  sharepoint: SharePointPmService | null;
  workflow: WorkflowDefinitionRecord;
  dryRun?: boolean;
}): Promise<OnboardingAutomationResult> {
  if (!isOnboardingWorkflow(opts.workflow)) {
    return { ok: false, error: 'not_onboarding_workflow' };
  }

  const clientCode = opts.workflow.scope.clientCode?.trim().toUpperCase();
  const now = new Date().toISOString();
  const events: string[] = ['ONBOARDING_STARTED'];
  const dir = resolveOnboardingStateDir(opts.dataDir);

  if (!clientCode) {
    const record: OnboardingRunRecord = {
      workflowId: opts.workflow.workflowId,
      workflowDefinitionId: opts.workflow.workflowDefinitionId,
      status: 'IDENTITY_RECONCILIATION',
      currentStep: 'Resolve authoritative ClientCode',
      nextStep: 'Provide client scope before onboarding execution',
      blockers: ['IDENTITY_RESOLUTION_REQUIRED'],
      ownerAttention: ['Assign client scope to onboarding workflow'],
      taskIds: [],
      milestoneIds: [],
      assignedAgents: ['atlas-onboarding-agent'],
      documentGaps: [],
      communicationPolicy: 'DRAFT_ONLY',
      capitalScope: Boolean(opts.workflow.scope.capitalMatter),
      identityResolutionRequired: true,
      workspaceReconciled: false,
      dryRun: Boolean(opts.dryRun),
      createdAt: now,
      updatedAt: now,
      lastExecutedAt: now,
      milestones: milestoneTemplate(),
      provenance: 'onboarding_automation',
    };
    upsertOnboardingRun(dir, record);
    await appendOnboardingActivity({
      dataDir: opts.dataDir,
      principal: opts.principal,
      event: 'ONBOARDING_STARTED',
      summary: 'Onboarding started — identity resolution required',
    });
    return { ok: true, record, events };
  }

  if (!isCanonicalClientCode(clientCode)) {
    return { ok: false, error: 'invalid_client_code' };
  }
  if (!entitledClientCodes(opts.principal).includes(clientCode)) {
    return { ok: false, error: 'client_not_entitled' };
  }

  const sp = opts.sharepoint;
  let clientName = opts.workflow.scope.clientName?.trim() || clientCode;
  let workspaceReconciled = false;
  let projectId: string | undefined;
  let projectName: string | undefined;
  const taskIds: string[] = [];
  const milestoneIds: string[] = [];
  const blockers: string[] = [];
  const ownerAttention: string[] = [];
  const documentGaps: OnboardingDocumentGap[] = [];
  const milestones = milestoneTemplate();

  if (sp) {
    const clients = await sp.listAuthorizedClients(opts.principal);
    const client = clients.find((c) => c.clientCode === clientCode);
    if (!client) {
      blockers.push('Client not found in entitled HVCG_Clients roster');
      ownerAttention.push('Confirm client activation and entitlement');
    } else {
      clientName = client.displayName || clientName;
      workspaceReconciled = true;
      milestones.find((m) => m.id === 'identity_verified')!.status = 'complete';
      milestones.find((m) => m.id === 'identity_verified')!.provenance = 'CONFIRMED';
      events.push('CLIENT_IDENTITY_RECONCILED');
    }

    const projects = await sp.listAuthorizedProjects(opts.principal);
    const existingProject = projects.find(
      (p) => p.clientCode === clientCode && ONBOARDING_PROJECT_TITLE.test(p.name || ''),
    );
    if (existingProject) {
      projectId = existingProject.id;
      projectName = existingProject.name;
      milestones.find((m) => m.id === 'agreement_scope_verified')!.status = 'in_progress';
      milestones.find((m) => m.id === 'agreement_scope_verified')!.provenance = 'CONFIRMED';
    } else if (!opts.dryRun) {
      const created = await sp.createProject(opts.principal, {
        name: `Client Onboarding — ${clientName}`,
        clientCode,
        objective: 'Governed client onboarding established by Atlas automation.',
        status: 'active',
        nextAction: 'Complete onboarding checklist',
      }, `atlas-onboarding-project-${clientCode}`);
      projectId = created.id;
      projectName = created.name;
      events.push('PROJECT_CREATED');
    } else {
      projectName = `Client Onboarding — ${clientName} (dry-run proposed)`;
      events.push('PROJECT_CREATED');
    }

    const existingTasks = await sp.listAuthorizedTasks(opts.principal, projectId);
    for (const taskDef of DEFAULT_ONBOARDING_TASKS) {
      const exists = existingTasks.some((t) => t.title === taskDef.title);
      if (exists) {
        const found = existingTasks.find((t) => t.title === taskDef.title);
        if (found?.id) taskIds.push(found.id);
        continue;
      }
      if (!opts.dryRun && projectId) {
        const task = await sp.createTask(opts.principal, {
          title: taskDef.title,
          description: taskDef.purpose,
          projectId,
          status: 'ready',
        }, `atlas-onboarding-task-${clientCode}-${taskDef.key}`);
        taskIds.push(task.id);
      }
    }
    if (taskIds.length || opts.dryRun) events.push('TASKS_CREATED');

    for (const label of DEFAULT_MILESTONES) {
      if (!opts.dryRun && projectId) {
        try {
          const milestone = await sp.createMilestone(opts.principal, {
            title: label.label,
            projectId,
            status: 'pending',
          });
          milestoneIds.push(milestone.id);
        } catch {
          /* milestone optional */
        }
      }
    }
    if (milestoneIds.length || opts.dryRun) events.push('MILESTONE_CREATED');

    try {
      const docRequests = await listDocumentRequests(opts.dataDir, clientCode);
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
      events.push('DOCUMENT_REQUIREMENTS_CREATED', 'DOCUMENT_RECONCILED');
    } catch {
      for (const reqLabel of DEFAULT_DOCUMENT_REQUIREMENTS) {
        documentGaps.push({ label: reqLabel, status: 'STALE_OR_UNCERTAIN' });
      }
    }
  } else {
    blockers.push('SharePoint PM backend unavailable — onboarding execution deferred');
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
    projectId,
    documentGaps,
    milestones,
    ownerAttention,
    blockers,
  };
  const status = computeStatus(partial);

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
        : 'Prepare kickoff and operating baseline',
    blockers,
    ownerAttention,
    projectId,
    projectName,
    taskIds,
    milestoneIds,
    assignedAgents: ['atlas-onboarding-agent', 'atlas-hub-runtime'],
    documentGaps,
    communicationPolicy: 'DRAFT_ONLY',
    capitalScope,
    identityResolutionRequired: false,
    workspaceReconciled,
    dryRun: Boolean(opts.dryRun),
    createdAt: now,
    updatedAt: now,
    lastExecutedAt: now,
    milestones,
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

export function answerOnboardingContext(
  question: string,
  record: OnboardingRunRecord | null,
  extras?: {
    match?: EntitledClientCodeMatch;
    existingProject?: OnboardingExistingProject;
    existingWorkflow?: OnboardingExistingWorkflow;
  },
): string {
  const q = question.toLowerCase();
  if (!record) {
    if (extras?.match || extras?.existingProject || extras?.existingWorkflow) {
      return answerFromExistingOnboarding(extras.match ?? { kind: 'none', candidates: [] }, extras);
    }
    return 'No onboarding run found for the requested client. Activate a Client Onboarding workflow or provide a client code.';
  }
  if (q.includes('missing') || q.includes('document')) {
    const missing = record.documentGaps.filter((d) => d.status === 'MISSING');
    return missing.length
      ? `Missing for ${record.clientCode ?? 'client'}: ${missing.map((d) => d.label).join('; ')}`
      : `No confirmed missing documents for ${record.clientCode ?? 'client'}.`;
  }
  if (q.includes('blocked') || q.includes('waiting')) {
    return [
      `Status: ${record.status}`,
      record.blockers.length ? `Blockers: ${record.blockers.join('; ')}` : 'No blockers recorded.',
      record.ownerAttention.length ? `Owner attention: ${record.ownerAttention.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }
  if (q.includes('kickoff') || q.includes('ready')) {
    const kickoff = record.milestones.find((m) => m.id === 'kickoff_ready');
    return `Kickoff ready milestone: ${kickoff?.status ?? 'unknown'}. Next step: ${record.nextStep}`;
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

export function mapsToOnboardingContextIntent(question: string): boolean {
  const q = question.toLowerCase();
  return (
    q.includes('onboarding') &&
    (q.includes('where are we') ||
      q.includes('missing') ||
      q.includes('blocked') ||
      q.includes('waiting on') ||
      q.includes('kickoff') ||
      q.includes('approve') ||
      q.includes('document'))
  );
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
