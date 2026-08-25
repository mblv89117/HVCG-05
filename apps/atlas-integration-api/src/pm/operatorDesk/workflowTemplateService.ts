/**
 * Instantiate governed workflow drafts from catalog templates.
 */

import { randomUUID } from 'node:crypto';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';
import {
  persistDefinitionVersion,
  resolveWorkflowDefinitionOverlayDir,
  slugWorkflowId,
  type WorkflowDefinitionRecord,
  type WorkflowScope,
} from './workflowDefinitions.ts';
import { formatWorkflowPreview, WORKFLOW_CREATION_MISSION_KEY } from './workflowParser.ts';
import type { WorkflowConfirmationAction, WorkflowDraftPayload } from './workflowCreation.ts';
import { CONVERSATIONAL_WORKFLOW_CONTRACT } from './workflowCreation.ts';
import {
  getWorkflowTemplate,
  listActiveWorkflowTemplates,
  resolveClientFromInput,
  WORKFLOW_TEMPLATES_CONTRACT,
  WORKFLOW_TEMPLATES_MISSION_KEY,
  type WorkflowTemplateDefinition,
  resolveTemplateIdFromText,
} from './workflowTemplates.ts';
import { appendAskAtlasActivity } from './activityLedger.ts';
import {
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RUNTIME_AGENT,
  type AskAtlasAnswer,
} from './types.ts';

export type WorkflowTemplateCatalogModel = {
  contractVersion: typeof WORKFLOW_TEMPLATES_CONTRACT;
  missionKey: typeof WORKFLOW_TEMPLATES_MISSION_KEY;
  templates: Array<{
    templateId: string;
    templateVersion: number;
    name: string;
    description: string;
    category: string;
    businessPurpose: string;
    status: string;
    commonTrigger: string;
    typicalActions: string[];
    approvalCharacteristics: string[];
    recommendedAutonomy: string;
    relatedSystems: string[];
  }>;
};

export type WorkflowTemplateDetailModel = WorkflowTemplateDefinition & {
  contractVersion: typeof WORKFLOW_TEMPLATES_CONTRACT;
  missionKey: typeof WORKFLOW_TEMPLATES_MISSION_KEY;
};

function confirmationActionsFor(def: WorkflowDefinitionRecord): WorkflowConfirmationAction[] {
  if (def.authorityExpansionRequired && def.status !== 'ACTIVE') return ['approve_authority', 'cancel'];
  if (def.status === 'DRAFT' || def.status === 'READY_FOR_APPROVAL') return ['activate', 'edit', 'cancel'];
  return ['edit'];
}

function authorityFromTemplate(template: WorkflowTemplateDefinition): boolean {
  return template.approvalRequirements.some((r) =>
    [
      'material_budget_change',
      'new_paid_campaign_launch',
      'external_lender_submit',
      'external_investor_submit',
      'auto_respond',
      'contract_change',
      'pricing_change',
    ].includes(r),
  );
}

function applyCustomizations(
  template: WorkflowTemplateDefinition,
  inputs: Record<string, unknown>,
): {
  scope: WorkflowScope;
  trigger: WorkflowTemplateDefinition['defaultTrigger'];
  conditions: WorkflowTemplateDefinition['defaultConditions'];
  customizations: Record<string, string | number | boolean>;
} {
  const customizations: Record<string, string | number | boolean> = {};
  const clientCode = typeof inputs.clientCode === 'string' ? inputs.clientCode : undefined;
  const clientHint = typeof inputs.clientHint === 'string' ? inputs.clientHint : undefined;
  const resolved = resolveClientFromInput(clientCode, clientHint);

  const scope: WorkflowScope = {
    organizationId: 'org-hvcg',
    ...(resolved.clientCode ? { clientCode: resolved.clientCode, clientName: resolved.clientName } : {}),
    ...(typeof inputs.projectScope === 'string' ? { projectScope: inputs.projectScope } : {}),
    ...(template.defaultScopeType === 'capital' ? { capitalMatter: 'capital_pipeline' } : {}),
  };

  let trigger = { ...template.defaultTrigger };
  const followUpDays = inputs.followUpDays;
  if (typeof followUpDays === 'number' || typeof followUpDays === 'string') {
    const days = Number(followUpDays);
    if (days > 0) {
      customizations.followUpDays = days;
      const conditions = [
        {
          id: randomUUID(),
          expression: `no_reply_days >= ${days}`,
          originalLanguage: `no reply for ${days} days`,
        },
      ];
      return {
        scope,
        trigger,
        conditions: conditions,
        customizations,
      };
    }
  }

  if (typeof inputs.scheduleTime === 'string' && inputs.scheduleTime.trim()) {
    const t = inputs.scheduleTime.trim();
    customizations.scheduleTime = t;
    trigger = {
      type: 'schedule',
      schedule: `daily_${t.replace(':', '')}_local_preview`,
      scheduleHuman: `Every day at ${t} (preview — confirm before activation)`,
      originalLanguage: `daily at ${t}`,
    };
  }

  if (typeof inputs.researchDomain === 'string' && inputs.researchDomain.trim()) {
    customizations.researchDomain = inputs.researchDomain.trim();
  }

  return {
    scope,
    trigger,
    conditions: [...template.defaultConditions],
    customizations,
  };
}

export function buildTemplateCatalog(): WorkflowTemplateCatalogModel {
  const templates = listActiveWorkflowTemplates().map((t) => ({
    templateId: t.templateId,
    templateVersion: t.templateVersion,
    name: t.name,
    description: t.description,
    category: t.category,
    businessPurpose: t.businessPurpose,
    status: t.status,
    commonTrigger:
      t.defaultTrigger.scheduleHuman ?? t.defaultTrigger.event ?? t.defaultTrigger.originalLanguage,
    typicalActions: t.defaultActions.slice(0, 4).map((a) => a.description),
    approvalCharacteristics: t.approvalRequirements,
    recommendedAutonomy: t.recommendedAutonomy,
    relatedSystems: t.relatedSystems,
  }));
  return {
    contractVersion: WORKFLOW_TEMPLATES_CONTRACT,
    missionKey: WORKFLOW_TEMPLATES_MISSION_KEY,
    templates,
  };
}

export function buildTemplateDetail(templateId: string): WorkflowTemplateDetailModel | null {
  const template = getWorkflowTemplate(templateId);
  if (!template || template.status === 'DISABLED') return null;
  return {
    ...template,
    contractVersion: WORKFLOW_TEMPLATES_CONTRACT,
    missionKey: WORKFLOW_TEMPLATES_MISSION_KEY,
  };
}

export function callerMayUseTemplate(template: WorkflowTemplateDefinition, principal: AtlasPrincipal): boolean {
  if (template.defaultScopeType === 'organization') return true;
  if (!template.requiredInputs.some((i) => i.inputType === 'client' && i.required)) return true;
  return entitledClientCodes(principal).length > 0;
}

export async function instantiateWorkflowFromTemplate(opts: {
  principal: AtlasPrincipal;
  dataDir: string;
  templateId: string;
  inputs?: Record<string, unknown>;
  sourceConversation?: string;
}): Promise<{ ok: true; payload: WorkflowDraftPayload } | { ok: false; error: string }> {
  const template = getWorkflowTemplate(opts.templateId);
  if (!template || template.status === 'DISABLED') return { ok: false, error: 'template_not_found' };
  if (template.status === 'DEPRECATED') return { ok: false, error: 'template_deprecated' };
  if (!callerMayUseTemplate(template, opts.principal)) return { ok: false, error: 'forbidden' };

  const inputs = opts.inputs ?? {};
  for (const req of template.requiredInputs) {
    if (req.required && req.inputType === 'client' && !inputs.clientCode && !inputs.clientHint) {
      return { ok: false, error: 'client_required' };
    }
  }

  const clientCode = typeof inputs.clientCode === 'string' ? inputs.clientCode.trim().toUpperCase() : undefined;
  if (clientCode && !entitledClientCodes(opts.principal).includes(clientCode)) {
    return { ok: false, error: 'client_not_entitled' };
  }

  const { scope, trigger, conditions, customizations } = applyCustomizations(template, inputs);
  const authorityExpansionRequired = authorityFromTemplate(template);
  const now = new Date().toISOString();
  const workflowId = slugWorkflowId(`${template.name}-${scope.clientCode ?? 'org'}`);

  const record: WorkflowDefinitionRecord = {
    workflowDefinitionId: randomUUID(),
    workflowId,
    version: 1,
    name: scope.clientName ? `${template.name} — ${scope.clientName}` : template.name,
    description: template.businessPurpose,
    status: authorityExpansionRequired ? 'READY_FOR_APPROVAL' : 'DRAFT',
    scope,
    trigger,
    conditions,
    actions: template.defaultActions.map((a) => ({ ...a, id: randomUUID() })),
    policyClass: template.policyClassifications[0] ?? 'READ_AUTO',
    approvalRequirements: [...template.approvalRequirements],
    retryPolicy: template.retryPolicy,
    failurePolicy: template.failurePolicy,
    responsibleAgent: 'atlas-hub-runtime',
    createdBy: opts.principal.userId,
    createdAt: now,
    updatedAt: now,
    sourceConversation:
      opts.sourceConversation ?? `Template: ${template.templateId} v${template.templateVersion}`,
    provenance: 'template',
    templateKey: template.templateId,
    sourceTemplateId: template.templateId,
    sourceTemplateVersion: template.templateVersion,
    templateCustomizations: customizations,
    versionHistory: [],
    authorityExpansionRequired,
  };

  const dir = resolveWorkflowDefinitionOverlayDir(opts.dataDir);
  await persistDefinitionVersion(dir, record);

  const preview = formatWorkflowPreview(record);
  const templatePreview = [
    preview,
    '',
    'SOURCE',
    `Template: ${template.name} (v${template.templateVersion})`,
    Object.keys(customizations).length
      ? `Customizations: ${Object.keys(customizations).map((k) => `${k}=${customizations[k]}`).join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const payload: WorkflowDraftPayload = {
    contractVersion: CONVERSATIONAL_WORKFLOW_CONTRACT,
    missionKey: WORKFLOW_CREATION_MISSION_KEY,
    record,
    preview: templatePreview,
    confirmationActions: confirmationActionsFor(record),
    authorityExpansionRequired,
  };

  return { ok: true, payload };
}

export async function appendTemplateLifecycle(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  event: string;
  templateId: string;
  templateName: string;
  clientCode?: string;
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
        id: `template:${opts.templateId}:${opts.event}`,
        state: 'Decision Required',
        why: `${opts.templateName}: ${opts.event}`,
        basedOn: `Template lifecycle ${opts.event}`,
        evidence: opts.templateId,
        provenance: 'CONFIRMED',
        classification: 'CONFIRMED',
        ...(opts.clientCode ? { clientCode: opts.clientCode } : {}),
      },
    ],
    activity: {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: opts.event,
      trigger: 'signed_operator_question',
      timestamp: now,
      tools: ['workflow_template'],
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

export function answerTemplateDiscovery(question: string): string {
  const q = question.toLowerCase();
  const catalog = listActiveWorkflowTemplates();
  if (q.includes('onboarding')) {
    const t = getWorkflowTemplate('client_onboarding');
    return t
      ? `${t.name}: ${t.businessPurpose}. Use Templates in Workflows or Ask Atlas: "Use the Client Onboarding template for [client]."`
      : 'No onboarding template available.';
  }
  if (q.includes('capital')) {
    return catalog
      .filter((t) => t.category === 'Capital' || t.templateId.includes('capital'))
      .map((t) => `${t.name} (${t.templateId})`)
      .join('\n');
  }
  if (q.includes('hart') || q.includes('marketing')) {
    const t = getWorkflowTemplate('marketing_review');
    return t
      ? `Use ${t.name} for daily Google Ads / CallRail / CMO review. Template ID: marketing_review.`
      : 'Marketing review template not found.';
  }
  if (q.includes('missing document')) {
    const t = getWorkflowTemplate('document_collection');
    return t ? `${t.name}: ${t.description}` : 'Document collection template not available.';
  }
  return catalog.map((t) => `${t.name} [${t.templateId}] — ${t.category}`).join('\n');
}

export function answerTemplateContext(question: string, templateId?: string): string {
  const id = templateId ?? resolveTemplateIdFromText(question);
  if (!id) return 'Specify a template or ask about a workflow created from a template in Workflow Center.';
  const t = getWorkflowTemplate(id);
  if (!t) return 'Template not found.';
  const s = t.ownerReadableSummary;
  return [
    t.name,
    '',
    'PURPOSE',
    s.purpose,
    '',
    'WHEN IT RUNS',
    s.whenItRuns,
    '',
    'WHAT IT DOES',
    ...s.whatItDoes.map((line, i) => `${i + 1}. ${line}`),
    '',
    'REQUIRES APPROVAL',
    s.requiresApproval.join(', ') || 'None beyond standard policy',
    '',
    'SYSTEMS',
    s.systems.join(', '),
  ].join('\n');
}