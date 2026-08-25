/**
 * Natural-language workflow parsing — deterministic, no LLM spend.
 */

import { randomUUID } from 'node:crypto';
import type {
  WorkflowActionDefinition,
  WorkflowConditionDefinition,
  WorkflowDefinitionRecord,
  WorkflowPolicyClass,
  WorkflowScope,
  WorkflowTriggerDefinition,
} from './workflowDefinitions.ts';
import { slugWorkflowId } from './workflowDefinitions.ts';

export const WORKFLOW_CREATION_MISSION_KEY = 'ATLAS-CONVERSATIONAL-WORKFLOW-CREATION-001' as const;

const CLIENT_ALIASES: Record<string, { clientCode: string; clientName: string }> = {
  hart: { clientCode: 'HFD01', clientName: 'Hart Family Dental' },
  'hart family dental': { clientCode: 'HFD01', clientName: 'Hart Family Dental' },
  prodigy: { clientCode: 'PDG01', clientName: 'Prodigy Games' },
  accg: { clientCode: 'ACCG01', clientName: 'ACCG' },
  capital: { clientCode: undefined as unknown as string, clientName: 'Capital' },
};

export type ParsedWorkflowDraft = {
  name: string;
  description: string;
  scope: WorkflowScope;
  trigger: WorkflowTriggerDefinition;
  conditions: WorkflowConditionDefinition[];
  actions: WorkflowActionDefinition[];
  policyClass: WorkflowPolicyClass;
  approvalRequirements: string[];
  authorityExpansionRequired: boolean;
  templateKey?: string;
  provenance: 'conversational' | 'template';
  unsupportedActions: string[];
};

export function mapsToWorkflowCreationIntent(question: string): boolean {
  const q = question.toLowerCase().trim();
  return (
    q.startsWith('create a workflow') ||
    q.startsWith('create workflow') ||
    q.includes('create a workflow that') ||
    q.includes('set up a workflow') ||
    q.includes('build a workflow')
  );
}

export function mapsToWorkflowEditIntent(question: string): boolean {
  const q = question.toLowerCase().trim();
  return (
    q.startsWith('change this workflow') ||
    q.startsWith('edit this workflow') ||
    q.startsWith('pause the') && q.includes('workflow') ||
    q.startsWith('disable this workflow') ||
    q.startsWith('resume the') && q.includes('workflow') ||
    q.includes('require my approval before') ||
    q.includes('add accg to this workflow') ||
    q.includes('remove the') && q.includes('step')
  );
}

export function mapsToWorkflowDiscoveryIntent(question: string): boolean {
  const q = question.toLowerCase().trim();
  return (
    q.includes('workflows have i created') ||
    q.includes('workflows i created') ||
    q.includes('what does the') && q.includes('workflow do') ||
    q.includes('which workflows can send email') ||
    q.includes('which workflows require my approval') ||
    q.includes('what changed in this workflow') ||
    q.includes('why did this workflow run') ||
    q.includes('show the workflows')
  );
}

function resolveClientScope(text: string): WorkflowScope {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(CLIENT_ALIASES)) {
    if (lower.includes(key)) {
      return {
        clientCode: val.clientCode,
        clientName: val.clientName,
        organizationId: 'org-hvcg',
      };
    }
  }
  if (lower.includes('capital')) {
    return { organizationId: 'org-hvcg', capitalMatter: 'capital_pipeline' };
  }
  return { organizationId: 'org-hvcg' };
}

function parseSchedule(text: string): WorkflowTriggerDefinition {
  const lower = text.toLowerCase();
  if (lower.includes('every morning') || lower.includes('each morning')) {
    return {
      type: 'schedule',
      schedule: 'daily_08:00_local_preview',
      scheduleHuman: 'Every day at 8:00 AM (preview — confirm before activation)',
      originalLanguage: 'every morning',
    };
  }
  if (lower.includes('every monday')) {
    return {
      type: 'schedule',
      schedule: 'weekly_monday_08:00_local_preview',
      scheduleHuman: 'Every Monday at 8:00 AM (preview — confirm before activation)',
      originalLanguage: 'every Monday',
    };
  }
  if (lower.includes('once per week') || lower.includes('every week')) {
    return {
      type: 'schedule',
      schedule: 'weekly_local_preview',
      scheduleHuman: 'Once per week (preview — confirm time before activation)',
      originalLanguage: 'once per week',
    };
  }
  if (lower.includes('three days after')) {
    return {
      type: 'schedule',
      schedule: 'delay_3_days',
      scheduleHuman: 'Three days after trigger event',
      originalLanguage: 'three days after',
    };
  }
  if (lower.includes('when a new client') || lower.includes('when a client signs')) {
    return {
      type: 'event',
      event: 'CLIENT_ACTIVATED',
      originalLanguage: 'client activation',
    };
  }
  if (lower.includes('when a client emails') || lower.includes('email received')) {
    return {
      type: 'event',
      event: 'EMAIL_RECEIVED',
      originalLanguage: 'email received',
    };
  }
  if (lower.includes('when a capital client') || lower.includes('updated financials')) {
    return {
      type: 'event',
      event: 'CAPITAL_DOCUMENT_RECEIVED',
      originalLanguage: 'capital document received',
    };
  }
  if (lower.includes('no reply') || lower.includes('not responded')) {
    return {
      type: 'threshold',
      event: 'NO_REPLY_THRESHOLD',
      originalLanguage: 'no reply threshold',
    };
  }
  return {
    type: 'manual',
    manual: true,
    originalLanguage: 'manual or unspecified trigger',
  };
}

function parseConditions(text: string): WorkflowConditionDefinition[] {
  const lower = text.toLowerCase();
  const conditions: WorkflowConditionDefinition[] = [];
  const noReply = lower.match(/no (?:reply|response).*?(\d+)\s*days?/);
  if (noReply) {
    conditions.push({
      id: randomUUID(),
      expression: `no_reply_days >= ${noReply[1]}`,
      originalLanguage: noReply[0],
    });
  }
  if (lower.includes('documents are still missing') || lower.includes('missing documents')) {
    conditions.push({
      id: randomUUID(),
      expression: 'missing_required_documents = true',
      originalLanguage: 'documents still missing',
    });
  }
  if (lower.includes('spend increases') || lower.includes('budget increase')) {
    const pct = lower.match(/(\d+)%/);
    conditions.push({
      id: randomUUID(),
      expression: pct ? `spend_change_pct > ${pct[1]}` : 'spend_increased = true',
      originalLanguage: 'spend increase condition',
    });
  }
  return conditions;
}

type ActionBlueprint = {
  actionType: string;
  description: string;
  policyClass: WorkflowPolicyClass;
  supported: boolean;
};

function hartMarketingActions(): ActionBlueprint[] {
  return [
    {
      actionType: 'google_ads_metrics_sync',
      description: 'Sync Google Ads metrics to production persistence',
      policyClass: 'READ_AUTO',
      supported: true,
    },
    {
      actionType: 'callrail_reconcile',
      description: 'Reconcile CallRail tracking without overwriting authoritative IDs',
      policyClass: 'INTERNAL_WRITE_AUTO',
      supported: true,
    },
    {
      actionType: 'cmo_analysis',
      description: 'Run CMO analysis on persisted marketing metrics',
      policyClass: 'RECOMMEND_AUTO',
      supported: true,
    },
    {
      actionType: 'marketing_recommendation',
      description: 'Prepare marketing recommendation (no automatic spend changes)',
      policyClass: 'RECOMMEND_AUTO',
      supported: true,
    },
  ];
}

function parseActions(text: string): { actions: WorkflowActionDefinition[]; unsupported: string[] } {
  const lower = text.toLowerCase();
  const blueprints: ActionBlueprint[] = [];
  const unsupported: string[] = [];

  if (
    lower.includes('google ads') ||
    lower.includes('callrail') ||
    lower.includes('cmo') ||
    lower.includes('marketing review') ||
    lower.includes('ad budget') ||
    lower.includes('increasing the budget')
  ) {
    blueprints.push(...hartMarketingActions());
  }

  if (lower.includes('onboarding') || lower.includes('new client signs')) {
    blueprints.push(
      {
        actionType: 'create_onboarding_tasks',
        description: 'Create onboarding tasks from entitled client evidence',
        policyClass: 'INTERNAL_WRITE_AUTO',
        supported: true,
      },
      {
        actionType: 'request_missing_documents',
        description: 'Identify and request missing documents (no auto outbound without approval)',
        policyClass: 'REQUIRE_APPROVAL',
        supported: true,
      },
      {
        actionType: 'create_kickoff_project',
        description: 'Prepare kickoff project structure',
        policyClass: 'INTERNAL_WRITE_AUTO',
        supported: true,
      },
      {
        actionType: 'notify_owner_blockers',
        description: 'Notify owner of onboarding blockers',
        policyClass: 'REQUIRE_APPROVAL',
        supported: true,
      },
    );
  }

  if (lower.includes('draft a response') || lower.includes('draft a reply') || lower.includes('status email')) {
    blueprints.push({
      actionType: 'draft_email_response',
      description: 'Draft email response for owner review (never auto-send)',
      policyClass: 'DRAFT_ONLY',
      supported: true,
    });
  }

  if (lower.includes('capital') && (lower.includes('financials') || lower.includes('submission'))) {
    blueprints.push(
      {
        actionType: 'ingest_capital_documents',
        description: 'Ingest updated Capital documents',
        policyClass: 'READ_AUTO',
        supported: true,
      },
      {
        actionType: 'compare_capital_package',
        description: 'Compare Capital submission package changes',
        policyClass: 'PREPARE_ONLY',
        supported: true,
      },
      {
        actionType: 'prepare_capital_submission',
        description: 'Prepare lender package (external submit owner-gated)',
        policyClass: 'PREPARE_ONLY',
        supported: true,
      },
    );
  }

  if (lower.includes('remind me when') || lower.includes('has not responded')) {
    blueprints.push({
      actionType: 'create_followup_reminder',
      description: 'Create governed follow-up reminder for owner attention',
      policyClass: 'INTERNAL_WRITE_AUTO',
      supported: true,
    });
  }

  if (lower.includes('increase') && lower.includes('budget') && lower.includes('automatically')) {
    unsupported.push('automatic_budget_increase_without_owner_approval');
  }

  if (!blueprints.length) {
    blueprints.push({
      actionType: 'owner_attention_review',
      description: 'Surface workflow intent to owner for manual refinement',
      policyClass: 'READ_AUTO',
      supported: true,
    });
  }

  const actions: WorkflowActionDefinition[] = blueprints.map((b, idx) => ({
    id: randomUUID(),
    order: idx + 1,
    actionType: b.actionType,
    policyClass: b.policyClass,
    description: b.description,
    supported: b.supported,
  }));

  return { actions, unsupported };
}

function analyzePolicy(actions: WorkflowActionDefinition[], text: string): {
  policyClass: WorkflowPolicyClass;
  approvalRequirements: string[];
  authorityExpansionRequired: boolean;
} {
  const lower = text.toLowerCase();
  const approvalRequirements: string[] = [];
  let authorityExpansionRequired = false;

  for (const action of actions) {
    if (action.policyClass === 'OWNER_GATED' || action.policyClass === 'REQUIRE_APPROVAL') {
      approvalRequirements.push(action.actionType);
    }
    if (action.policyClass === 'DRAFT_ONLY') {
      approvalRequirements.push('send_external_message');
    }
  }

  if (
    (lower.includes('increase') || lower.includes('increasing') || lower.includes('raised spend')) &&
    (lower.includes('budget') || lower.includes('spend') || lower.includes('google ads'))
  ) {
    approvalRequirements.push('material_budget_change');
    authorityExpansionRequired = true;
  }
  if (lower.includes('launch') && lower.includes('campaign')) {
    approvalRequirements.push('new_paid_campaign_launch');
    authorityExpansionRequired = true;
  }
  if (lower.includes('submit') && (lower.includes('lender') || lower.includes('investor'))) {
    approvalRequirements.push('external_capital_submit');
    authorityExpansionRequired = true;
  }
  if (lower.includes('auto respond') || lower.includes('automatically send') || lower.includes('send without')) {
    approvalRequirements.push('auto_respond');
    authorityExpansionRequired = true;
  }

  const policyClass: WorkflowPolicyClass = authorityExpansionRequired
    ? 'REQUIRE_APPROVAL'
    : actions.some((a) => a.policyClass === 'DRAFT_ONLY')
      ? 'DRAFT_ONLY'
      : actions.some((a) => a.policyClass === 'PREPARE_ONLY')
        ? 'PREPARE_ONLY'
        : 'READ_AUTO';

  return { policyClass, approvalRequirements, authorityExpansionRequired };
}

export function parseWorkflowInstruction(instruction: string): ParsedWorkflowDraft {
  const text = instruction.trim();
  const lower = text.toLowerCase();

  let name = 'Custom Atlas Workflow';
  if (lower.includes('hart') && lower.includes('google ads')) {
    name = 'Hart Daily Google Ads Review';
  } else if (lower.includes('onboarding')) {
    name = 'Client Onboarding Workflow';
  } else if (lower.includes('capital')) {
    name = 'Capital Submission Refresh';
  } else if (lower.includes('draft') && lower.includes('email')) {
    name = 'Client Status Email Draft';
  } else if (lower.includes('remind')) {
    name = 'Client Follow-Up Reminder';
  }

  const scope = resolveClientScope(text);
  const trigger = parseSchedule(text);
  const conditions = parseConditions(text);
  const { actions, unsupported } = parseActions(text);
  const policy = analyzePolicy(actions, text);

  let templateKey: string | undefined;
  if (name === 'Hart Daily Google Ads Review') templateKey = 'hart_marketing_review';

  return {
    name,
    description: text,
    scope,
    trigger,
    conditions,
    actions,
    policyClass: policy.policyClass,
    approvalRequirements: policy.approvalRequirements,
    authorityExpansionRequired: policy.authorityExpansionRequired,
    templateKey,
    provenance: templateKey ? 'template' : 'conversational',
    unsupportedActions: unsupported,
  };
}

export function buildDefinitionFromParsed(
  parsed: ParsedWorkflowDraft,
  opts: {
    principalUserId: string;
    sourceConversation: string;
    workflowId?: string;
    workflowDefinitionId?: string;
    version?: number;
    status?: WorkflowDefinitionRecord['status'];
  },
): WorkflowDefinitionRecord {
  const now = new Date().toISOString();
  const workflowId = opts.workflowId ?? slugWorkflowId(parsed.name);
  const version = opts.version ?? 1;
  return {
    workflowDefinitionId: opts.workflowDefinitionId ?? randomUUID(),
    workflowId,
    version,
    name: parsed.name,
    description: parsed.description,
    status: opts.status ?? (parsed.authorityExpansionRequired ? 'READY_FOR_APPROVAL' : 'DRAFT'),
    scope: parsed.scope,
    trigger: parsed.trigger,
    conditions: parsed.conditions,
    actions: parsed.actions,
    policyClass: parsed.policyClass,
    approvalRequirements: parsed.approvalRequirements,
    retryPolicy: 'bounded_transient_retry',
    failurePolicy: 'surface_in_workflow_center',
    responsibleAgent: 'atlas-hub-runtime',
    createdBy: opts.principalUserId,
    createdAt: now,
    updatedAt: now,
    sourceConversation: opts.sourceConversation,
    provenance: parsed.provenance,
    templateKey: parsed.templateKey,
    versionHistory: [],
    authorityExpansionRequired: parsed.authorityExpansionRequired,
  };
}

export function formatWorkflowPreview(record: WorkflowDefinitionRecord): string {
  const lines: string[] = [
    `WORKFLOW`,
    record.name,
    '',
    'TRIGGER',
    record.trigger.scheduleHuman ?? record.trigger.event ?? record.trigger.originalLanguage,
    '',
    'SCOPE',
    record.scope.clientName ?? record.scope.clientCode ?? 'Organization-wide',
    '',
    'ACTIONS',
  ];
  for (const action of record.actions) {
    lines.push(`${action.order}. ${action.description}`);
  }
  lines.push('', 'POLICY');
  lines.push(`Class: ${record.policyClass}`);
  if (record.approvalRequirements.length) {
    lines.push(`Approval required before: ${record.approvalRequirements.join(', ')}`);
  } else {
    lines.push('No authority expansion detected — owner confirmation still required to activate.');
  }
  if (record.authorityExpansionRequired) {
    lines.push('', 'AUTHORITY', 'This workflow expands governed authority — explicit owner approval required before activation.');
  }
  return lines.join('\n');
}
