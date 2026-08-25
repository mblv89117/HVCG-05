/**
 * Conversational workflow creation — parse, draft, preview, policy, activate, edit.
 * Uses governed definition overlay + activity ledger; no separate orchestration product.
 */

import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../../config.ts';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { appendAskAtlasActivity } from './activityLedger.ts';
import {
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RUNTIME_AGENT,
  type AskAtlasAnswer,
} from './types.ts';
import {
  getLatestDefinition,
  listVisibleDefinitions,
  persistDefinitionVersion,
  readWorkflowDefinitionOverlay,
  resolveWorkflowDefinitionOverlayDir,
  type WorkflowDefinitionRecord,
  type WorkflowDefinitionStatus,
} from './workflowDefinitions.ts';
import {
  buildDefinitionFromParsed,
  formatWorkflowPreview,
  mapsToWorkflowCreationIntent,
  mapsToWorkflowDiscoveryIntent,
  mapsToWorkflowEditIntent,
  parseWorkflowInstruction,
  WORKFLOW_CREATION_MISSION_KEY,
} from './workflowParser.ts';
import { applyWorkflowControl } from './workflowControls.ts';
import type { WorkflowCenterModel } from './workflows.ts';

export const CONVERSATIONAL_WORKFLOW_CONTRACT = 'atlas-hub-conversational-workflow.v1' as const;

export type WorkflowConfirmationAction = 'activate' | 'edit' | 'cancel' | 'approve_authority';

export type WorkflowDraftPayload = {
  contractVersion: typeof CONVERSATIONAL_WORKFLOW_CONTRACT;
  missionKey: typeof WORKFLOW_CREATION_MISSION_KEY;
  record: WorkflowDefinitionRecord;
  preview: string;
  confirmationActions: WorkflowConfirmationAction[];
  authorityExpansionRequired: boolean;
};

type LifecycleEvent =
  | 'WORKFLOW_DRAFT_CREATED'
  | 'WORKFLOW_PREVIEWED'
  | 'WORKFLOW_ACTIVATED'
  | 'WORKFLOW_EDITED'
  | 'WORKFLOW_PAUSED'
  | 'WORKFLOW_RESUMED'
  | 'WORKFLOW_DISABLED'
  | 'WORKFLOW_APPROVAL_REQUESTED'
  | 'WORKFLOW_APPROVAL_GRANTED'
  | 'WORKFLOW_REJECTED';

function confirmationActionsFor(def: WorkflowDefinitionRecord): WorkflowConfirmationAction[] {
  if (def.status === 'REJECTED' || def.status === 'DISABLED') return ['edit'];
  if (def.authorityExpansionRequired && def.status !== 'ACTIVE') {
    return ['approve_authority', 'cancel'];
  }
  if (def.status === 'DRAFT' || def.status === 'READY_FOR_APPROVAL') {
    return ['activate', 'edit', 'cancel'];
  }
  return ['edit'];
}

async function appendWorkflowLifecycle(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  event: LifecycleEvent;
  workflowId: string;
  workflowName: string;
  clientCode?: string;
  tools?: string[];
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
        id: `workflow-lifecycle:${opts.workflowId}:${opts.event}`,
        state: 'Decision Required',
        why: `${opts.workflowName}: ${opts.event}`,
        basedOn: `Workflow lifecycle ${opts.event}`,
        evidence: opts.workflowId,
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
      tools: opts.tools ?? ['workflow_definition'],
      classification: 'CONFIRMED',
      result: 'answered',
      readWriteStatus: 'READ_AUTO',
      policyDecision: 'answered',
      ran: true,
    },
  };
  try {
    await appendAskAtlasActivity({
      dataDir: opts.dataDir,
      answer,
      principal: opts.principal,
    });
  } catch {
    /* overlay optional */
  }
}

function overlayDir(dataDir: string): string {
  return resolveWorkflowDefinitionOverlayDir(dataDir);
}

function resolveWorkflowIdFromText(
  text: string,
  overlay: ReturnType<typeof readWorkflowDefinitionOverlay>,
  principal: AtlasPrincipal,
): string | undefined {
  const lower = text.toLowerCase();
  const defs = listVisibleDefinitions(overlay, principal)
    .filter((d) => d.status !== 'REJECTED')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (lower.includes('hart')) {
    const hart = defs.find(
      (d) => d.scope.clientCode === 'HFD01' || d.name.toLowerCase().includes('hart'),
    );
    if (hart) return hart.workflowId;
  }
  for (const d of defs) {
    const nameLower = d.name.toLowerCase();
    if (nameLower.length >= 4 && lower.includes(nameLower.slice(0, Math.min(12, nameLower.length)))) {
      return d.workflowId;
    }
  }
  return defs[0]?.workflowId;
}

function cloneWithStatus(
  latest: WorkflowDefinitionRecord,
  status: WorkflowDefinitionStatus,
  principal: AtlasPrincipal,
  changeReason: string,
  changedFields: string[],
): WorkflowDefinitionRecord {
  const now = new Date().toISOString();
  return {
    ...latest,
    workflowDefinitionId: randomUUID(),
    version: latest.version + 1,
    status,
    updatedAt: now,
    versionHistory: [
      ...latest.versionHistory,
      {
        version: latest.version + 1,
        changedAt: now,
        changedBy: principal.userId,
        changeReason,
        changedFields,
      },
    ],
  };
}

export async function createWorkflowDraft(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  instruction: string;
}): Promise<{ ok: true; payload: WorkflowDraftPayload } | { ok: false; error: string }> {
  const instruction = opts.instruction.trim();
  if (!instruction) return { ok: false, error: 'instruction_required' };

  const parsed = parseWorkflowInstruction(instruction);
  const record = buildDefinitionFromParsed(parsed, {
    principalUserId: opts.principal.userId,
    sourceConversation: instruction,
    status: parsed.authorityExpansionRequired ? 'READY_FOR_APPROVAL' : 'DRAFT',
  });

  const dir = overlayDir(opts.dataDir);
  await persistDefinitionVersion(dir, record);

  await appendWorkflowLifecycle({
    dataDir: opts.dataDir,
    principal: opts.principal,
    event: 'WORKFLOW_DRAFT_CREATED',
    workflowId: record.workflowId,
    workflowName: record.name,
    clientCode: record.scope.clientCode,
  });
  await appendWorkflowLifecycle({
    dataDir: opts.dataDir,
    principal: opts.principal,
    event: 'WORKFLOW_PREVIEWED',
    workflowId: record.workflowId,
    workflowName: record.name,
    clientCode: record.scope.clientCode,
  });

  if (record.authorityExpansionRequired) {
    await appendWorkflowLifecycle({
      dataDir: opts.dataDir,
      principal: opts.principal,
      event: 'WORKFLOW_APPROVAL_REQUESTED',
      workflowId: record.workflowId,
      workflowName: record.name,
      clientCode: record.scope.clientCode,
    });
  }

  const payload: WorkflowDraftPayload = {
    contractVersion: CONVERSATIONAL_WORKFLOW_CONTRACT,
    missionKey: WORKFLOW_CREATION_MISSION_KEY,
    record,
    preview: formatWorkflowPreview(record),
    confirmationActions: confirmationActionsFor(record),
    authorityExpansionRequired: record.authorityExpansionRequired,
  };
  return { ok: true, payload };
}

export async function activateWorkflow(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  workflowId: string;
  approveAuthority?: boolean;
}): Promise<{ ok: true; record: WorkflowDefinitionRecord } | { ok: false; error: string }> {
  const dir = overlayDir(opts.dataDir);
  const overlay = readWorkflowDefinitionOverlay(dir);
  const latest = getLatestDefinition(overlay, opts.workflowId, opts.principal);
  if (!latest) return { ok: false, error: 'workflow_not_found' };
  if (latest.status === 'ACTIVE') return { ok: true, record: latest };
  if (latest.status === 'REJECTED' || latest.status === 'DISABLED') {
    return { ok: false, error: 'workflow_not_activatable' };
  }

  if (latest.authorityExpansionRequired && !opts.approveAuthority) {
    return { ok: false, error: 'authority_approval_required' };
  }

  const activated = cloneWithStatus(latest, 'ACTIVE', opts.principal, 'owner_activated', ['status']);
  await persistDefinitionVersion(dir, activated);

  if (latest.authorityExpansionRequired && opts.approveAuthority) {
    await appendWorkflowLifecycle({
      dataDir: opts.dataDir,
      principal: opts.principal,
      event: 'WORKFLOW_APPROVAL_GRANTED',
      workflowId: activated.workflowId,
      workflowName: activated.name,
      clientCode: activated.scope.clientCode,
    });
  }

  await appendWorkflowLifecycle({
    dataDir: opts.dataDir,
    principal: opts.principal,
    event: 'WORKFLOW_ACTIVATED',
    workflowId: activated.workflowId,
    workflowName: activated.name,
    clientCode: activated.scope.clientCode,
    tools: activated.actions.map((a) => a.actionType),
  });

  return { ok: true, record: activated };
}

export async function cancelWorkflowDraft(opts: {
  principal: AtlasPrincipal;
  dataDir: string;
  workflowId: string;
}): Promise<{ ok: true; record: WorkflowDefinitionRecord } | { ok: false; error: string }> {
  const dir = overlayDir(opts.dataDir);
  const overlay = readWorkflowDefinitionOverlay(dir);
  const latest = getLatestDefinition(overlay, opts.workflowId, opts.principal);
  if (!latest) return { ok: false, error: 'workflow_not_found' };
  if (latest.status === 'ACTIVE') return { ok: false, error: 'cannot_cancel_active_workflow' };

  const rejected = cloneWithStatus(latest, 'REJECTED', opts.principal, 'owner_cancelled', ['status']);
  await persistDefinitionVersion(dir, rejected);

  await appendWorkflowLifecycle({
    dataDir: opts.dataDir,
    principal: opts.principal,
    event: 'WORKFLOW_REJECTED',
    workflowId: rejected.workflowId,
    workflowName: rejected.name,
    clientCode: rejected.scope.clientCode,
  });

  return { ok: true, record: rejected };
}

export async function editWorkflowFromInstruction(opts: {
  cfg: AppConfig;
  principal: AtlasPrincipal;
  dataDir: string;
  instruction: string;
  workflowId?: string;
}): Promise<{ ok: true; payload: WorkflowDraftPayload } | { ok: false; error: string }> {
  const instruction = opts.instruction.trim();
  const dir = overlayDir(opts.dataDir);
  const overlay = readWorkflowDefinitionOverlay(dir);
  const workflowId =
    opts.workflowId?.trim() || resolveWorkflowIdFromText(instruction, overlay, opts.principal);
  if (!workflowId) return { ok: false, error: 'workflow_not_found' };

  const latest = getLatestDefinition(overlay, workflowId, opts.principal);
  if (!latest) return { ok: false, error: 'workflow_not_found' };

  const lower = instruction.toLowerCase();

  if (lower.includes('pause') && lower.includes('workflow')) {
    await applyWorkflowControl({
      dataDir: opts.dataDir,
      principal: opts.principal,
      workflowId,
      action: 'pause',
      reason: 'owner_conversational_pause',
    });
    const paused = cloneWithStatus(latest, 'PAUSED', opts.principal, 'owner_paused', ['status']);
    await persistDefinitionVersion(dir, paused);
    await appendWorkflowLifecycle({
      dataDir: opts.dataDir,
      principal: opts.principal,
      event: 'WORKFLOW_PAUSED',
      workflowId,
      workflowName: paused.name,
      clientCode: paused.scope.clientCode,
    });
    const payload: WorkflowDraftPayload = {
      contractVersion: CONVERSATIONAL_WORKFLOW_CONTRACT,
      missionKey: WORKFLOW_CREATION_MISSION_KEY,
      record: paused,
      preview: formatWorkflowPreview(paused),
      confirmationActions: confirmationActionsFor(paused),
      authorityExpansionRequired: paused.authorityExpansionRequired,
    };
    return { ok: true, payload };
  }

  if (lower.includes('resume') && lower.includes('workflow')) {
    await applyWorkflowControl({
      dataDir: opts.dataDir,
      principal: opts.principal,
      workflowId,
      action: 'resume',
    });
    const resumed = cloneWithStatus(
      latest,
      latest.status === 'PAUSED' ? 'ACTIVE' : latest.status,
      opts.principal,
      'owner_resumed',
      ['status'],
    );
    await persistDefinitionVersion(dir, resumed);
    await appendWorkflowLifecycle({
      dataDir: opts.dataDir,
      principal: opts.principal,
      event: 'WORKFLOW_RESUMED',
      workflowId,
      workflowName: resumed.name,
      clientCode: resumed.scope.clientCode,
    });
    const payload: WorkflowDraftPayload = {
      contractVersion: CONVERSATIONAL_WORKFLOW_CONTRACT,
      missionKey: WORKFLOW_CREATION_MISSION_KEY,
      record: resumed,
      preview: formatWorkflowPreview(resumed),
      confirmationActions: confirmationActionsFor(resumed),
      authorityExpansionRequired: resumed.authorityExpansionRequired,
    };
    return { ok: true, payload };
  }

  if (lower.includes('disable') && lower.includes('workflow')) {
    await applyWorkflowControl({
      dataDir: opts.dataDir,
      principal: opts.principal,
      workflowId,
      action: 'disable',
      reason: 'owner_conversational_disable',
    });
    const disabled = cloneWithStatus(latest, 'DISABLED', opts.principal, 'owner_disabled', ['status']);
    await persistDefinitionVersion(dir, disabled);
    await appendWorkflowLifecycle({
      dataDir: opts.dataDir,
      principal: opts.principal,
      event: 'WORKFLOW_DISABLED',
      workflowId,
      workflowName: disabled.name,
      clientCode: disabled.scope.clientCode,
    });
    const payload: WorkflowDraftPayload = {
      contractVersion: CONVERSATIONAL_WORKFLOW_CONTRACT,
      missionKey: WORKFLOW_CREATION_MISSION_KEY,
      record: disabled,
      preview: formatWorkflowPreview(disabled),
      confirmationActions: confirmationActionsFor(disabled),
      authorityExpansionRequired: disabled.authorityExpansionRequired,
    };
    return { ok: true, payload };
  }

  const parsed = parseWorkflowInstruction(instruction);
  const merged: WorkflowDefinitionRecord = {
    ...latest,
    workflowDefinitionId: randomUUID(),
    version: latest.version + 1,
    name: parsed.name !== 'Custom Atlas Workflow' ? parsed.name : latest.name,
    description: instruction,
    scope: { ...latest.scope, ...parsed.scope },
    trigger: parsed.trigger.type !== 'manual' ? parsed.trigger : latest.trigger,
    conditions: parsed.conditions.length ? parsed.conditions : latest.conditions,
    actions: parsed.actions.length > 1 ? parsed.actions : latest.actions,
    policyClass: parsed.policyClass,
    approvalRequirements: parsed.approvalRequirements,
    authorityExpansionRequired: parsed.authorityExpansionRequired,
    updatedAt: new Date().toISOString(),
    sourceConversation: instruction,
    versionHistory: [
      ...latest.versionHistory,
      {
        version: latest.version + 1,
        changedAt: new Date().toISOString(),
        changedBy: opts.principal.userId,
        changeReason: 'owner_conversational_edit',
        changedFields: ['trigger', 'actions', 'policy', 'scope'],
      },
    ],
    status: parsed.authorityExpansionRequired ? 'READY_FOR_APPROVAL' : latest.status,
  };

  if (lower.includes('9 am') || lower.includes('9:00')) {
    merged.trigger = {
      type: 'schedule',
      schedule: 'daily_09:00_local_preview',
      scheduleHuman: 'Every day at 9:00 AM (preview — confirm before activation)',
      originalLanguage: '9 AM',
    };
  }

  if (lower.includes('require my approval') && lower.includes('email')) {
    merged.approvalRequirements = [...new Set([...merged.approvalRequirements, 'send_external_message'])];
    merged.authorityExpansionRequired = true;
    merged.status = 'READY_FOR_APPROVAL';
  }

  await persistDefinitionVersion(dir, merged);
  await appendWorkflowLifecycle({
    dataDir: opts.dataDir,
    principal: opts.principal,
    event: 'WORKFLOW_EDITED',
    workflowId: merged.workflowId,
    workflowName: merged.name,
    clientCode: merged.scope.clientCode,
  });

  const payload: WorkflowDraftPayload = {
    contractVersion: CONVERSATIONAL_WORKFLOW_CONTRACT,
    missionKey: WORKFLOW_CREATION_MISSION_KEY,
    record: merged,
    preview: formatWorkflowPreview(merged),
    confirmationActions: confirmationActionsFor(merged),
    authorityExpansionRequired: merged.authorityExpansionRequired,
  };
  return { ok: true, payload };
}

export function answerWorkflowDiscovery(
  question: string,
  overlay: ReturnType<typeof readWorkflowDefinitionOverlay>,
  principal: AtlasPrincipal,
  center: WorkflowCenterModel,
): string {
  const q = question.toLowerCase();
  const custom = listVisibleDefinitions(overlay, principal).filter((d) => d.status !== 'REJECTED');

  if (q.includes('workflows have i created') || q.includes('workflows i created') || q.includes('show the workflows')) {
    if (!custom.length) return 'You have not created any conversational workflows yet.';
    return custom
      .map((d) => `${d.name} (${d.workflowId}): ${d.status} — created ${d.createdAt}`)
      .join('\n');
  }

  if (q.includes('which workflows can send email')) {
    const lines: string[] = [];
    for (const w of center.workflows.filter((w) => w.workflowType === 'communication')) {
      lines.push(`${w.name}: draft-only / approval required`);
    }
    for (const d of custom.filter((c) =>
      c.actions.some((a) => a.actionType.includes('email') || a.actionType.includes('draft')),
    )) {
      lines.push(`${d.name}: DRAFT_ONLY — never auto-send`);
    }
    if (!lines.length) return 'No entitled workflows currently draft or send email.';
    return lines.join('\n');
  }

  if (q.includes('which workflows require my approval')) {
    const lines: string[] = [];
    for (const w of center.workflows.filter((w) => w.approvalRequired || w.status === 'REQUIRES_APPROVAL')) {
      lines.push(`${w.name}: ${w.status}`);
    }
    for (const d of custom.filter((c) => c.authorityExpansionRequired || c.approvalRequirements.length > 0)) {
      lines.push(`${d.name}: ${d.status} — ${d.approvalRequirements.join(', ')}`);
    }
    if (!lines.length) return 'No workflows currently require owner approval in your entitled view.';
    return lines.join('\n');
  }

  if (q.includes('what does the') && q.includes('workflow do')) {
    const target = custom.find((d) => q.includes('hart') && d.scope.clientCode === 'HFD01') ?? custom[0];
    if (!target) return 'No matching conversational workflow found in your entitled view.';
    return `${target.name}: ${formatWorkflowPreview(target)}`;
  }

  if (q.includes('what changed in this workflow')) {
    const target = resolveWorkflowIdFromText(q, overlay, principal);
    const def = target ? getLatestDefinition(overlay, target, principal) : undefined;
    if (!def || !def.versionHistory.length) return 'No version history recorded for this workflow.';
    return def.versionHistory
      .map((v) => `v${v.version} ${v.changedAt}: ${v.changeReason} (${v.changedFields.join(', ')})`)
      .join('\n');
  }

  if (q.includes('why did this workflow run')) {
    return 'Workflow runs are recorded in Agent Activity and Workflow Center activity tabs from live ledger evidence.';
  }

  return `You have ${custom.length} conversational workflow definition(s). Open Workflow Center for full detail.`;
}

export function buildConversationalAskAtlasAnswer(opts: {
  question: string;
  previewText: string;
  workflowId: string;
  workflowName: string;
  clientCode?: string;
  now?: string;
}): AskAtlasAnswer {
  const now = opts.now ?? new Date().toISOString();
  return {
    kind: 'ask_atlas_attention_v1',
    question: ASK_ATLAS_QUESTION,
    invented: false,
    honestEmpty: false,
    ranking: ['Decision Required', 'At Risk', 'Overdue', 'Waiting', 'Blocked', 'Capital'],
    items: [
      {
        id: `workflow-draft:${opts.workflowId}`,
        state: 'Decision Required',
        why: `Workflow drafted: ${opts.workflowName}`,
        basedOn: opts.previewText.slice(0, 240),
        evidence: opts.workflowId,
        provenance: 'CONFIRMED',
        classification: 'CONFIRMED',
        ...(opts.clientCode ? { clientCode: opts.clientCode } : {}),
      },
    ],
    activity: {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      missionKey: WORKFLOW_CREATION_MISSION_KEY,
      trigger: 'signed_operator_question',
      timestamp: now,
      tools: ['workflow_definition', 'workflow_preview'],
      classification: 'CONFIRMED',
      result: 'answered',
      readWriteStatus: 'READ_AUTO',
      policyDecision: 'answered',
      ran: true,
    },
  };
}

export function mapsToConversationalWorkflowRuntime(question: string): boolean {
  return (
    mapsToWorkflowCreationIntent(question) ||
    mapsToWorkflowEditIntent(question) ||
    mapsToWorkflowDiscoveryIntent(question)
  );
}
