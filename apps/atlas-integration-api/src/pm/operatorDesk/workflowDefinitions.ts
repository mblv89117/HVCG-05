/**
 * Governed conversational workflow definitions — overlay storage with versioning.
 * Not a separate orchestration engine; definitions appear in Workflow Center when active.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { entitledClientCodes } from '../sharepoint/authz.ts';

export const WORKFLOW_DEFINITION_OVERLAY_SCHEMA_VERSION = 1;
export const DEFAULT_WORKFLOW_DEFINITION_HOME_DIR = '/home/webapp_data/integrations/workflow-definitions';
export const CUSTOM_WORKFLOW_ID_PREFIX = 'custom.' as const;

export type WorkflowDefinitionStatus =
  | 'DRAFT'
  | 'READY_FOR_APPROVAL'
  | 'ACTIVE'
  | 'PAUSED'
  | 'DISABLED'
  | 'REJECTED';

export type WorkflowPolicyClass =
  | 'READ_AUTO'
  | 'INTERNAL_WRITE_AUTO'
  | 'RECOMMEND_AUTO'
  | 'DRAFT_ONLY'
  | 'REQUIRE_APPROVAL'
  | 'OWNER_GATED'
  | 'PREPARE_ONLY'
  | 'UNSUPPORTED_ACTION';

export type WorkflowActionDefinition = {
  id: string;
  order: number;
  actionType: string;
  policyClass: WorkflowPolicyClass;
  description: string;
  supported: boolean;
};

export type WorkflowScope = {
  organizationId?: string;
  clientCode?: string;
  clientName?: string;
  projectScope?: string;
  capitalMatter?: string;
  system?: string;
};

export type WorkflowTriggerDefinition = {
  type: 'schedule' | 'event' | 'manual' | 'threshold' | 'state_change';
  schedule?: string;
  scheduleHuman?: string;
  event?: string;
  manual?: boolean;
  originalLanguage: string;
};

export type WorkflowConditionDefinition = {
  id: string;
  expression: string;
  originalLanguage: string;
};

export type WorkflowVersionMeta = {
  version: number;
  changedAt: string;
  changedBy: string;
  changeReason?: string;
  changedFields: string[];
};

export type WorkflowDefinitionRecord = {
  workflowDefinitionId: string;
  workflowId: string;
  version: number;
  name: string;
  description: string;
  status: WorkflowDefinitionStatus;
  scope: WorkflowScope;
  trigger: WorkflowTriggerDefinition;
  conditions: WorkflowConditionDefinition[];
  actions: WorkflowActionDefinition[];
  policyClass: WorkflowPolicyClass;
  approvalRequirements: string[];
  retryPolicy?: string;
  failurePolicy?: string;
  responsibleAgent?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  sourceConversation: string;
  provenance: 'conversational' | 'template';
  templateKey?: string;
  versionHistory: WorkflowVersionMeta[];
  authorityExpansionRequired: boolean;
};

export interface WorkflowDefinitionOverlay {
  schemaVersion?: number;
  definitions: WorkflowDefinitionRecord[];
}

export function resolveWorkflowDefinitionOverlayDir(
  dataDir: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicit = (env.INTEGRATION_WORKFLOW_DEFINITION_DIR || '').trim();
  if (explicit) return explicit;
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'workflow-definitions');
  if ((env.HOME || '') === '/home') {
    const preferred = DEFAULT_WORKFLOW_DEFINITION_HOME_DIR;
    try {
      mkdirSync(preferred, { recursive: true, mode: 0o700 });
      return preferred;
    } catch {
      /* fall through */
    }
  }
  return join(dataDir, 'workflow-definitions');
}

export function workflowDefinitionOverlayFilePath(dir: string): string {
  return join(dir, 'workflow-definitions-overlay.json');
}

export function emptyWorkflowDefinitionOverlay(): WorkflowDefinitionOverlay {
  return {
    schemaVersion: WORKFLOW_DEFINITION_OVERLAY_SCHEMA_VERSION,
    definitions: [],
  };
}

export function readWorkflowDefinitionOverlay(dir: string): WorkflowDefinitionOverlay {
  const path = workflowDefinitionOverlayFilePath(dir);
  if (!existsSync(path)) return emptyWorkflowDefinitionOverlay();
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as WorkflowDefinitionOverlay;
  return {
    schemaVersion: parsed.schemaVersion ?? WORKFLOW_DEFINITION_OVERLAY_SCHEMA_VERSION,
    definitions: Array.isArray(parsed.definitions) ? parsed.definitions : [],
  };
}

const overlayWriteLocks = new Map<string, Promise<void>>();

export async function withWorkflowDefinitionWriteLock<T>(
  dir: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const prev = overlayWriteLocks.get(dir) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  overlayWriteLocks.set(dir, prev.then(() => gate));
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

export function writeWorkflowDefinitionOverlay(dir: string, overlay: WorkflowDefinitionOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = workflowDefinitionOverlayFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(
    tmp,
    JSON.stringify(
      {
        schemaVersion: WORKFLOW_DEFINITION_OVERLAY_SCHEMA_VERSION,
        definitions: overlay.definitions,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  renameSync(tmp, path);
}

export function slugWorkflowId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${CUSTOM_WORKFLOW_ID_PREFIX}${slug || randomUUID().slice(0, 8)}`;
}

export function callerMaySeeDefinition(def: WorkflowDefinitionRecord, principal: AtlasPrincipal): boolean {
  if (!def.scope.clientCode) return true;
  return entitledClientCodes(principal).includes(def.scope.clientCode);
}

export function listVisibleDefinitions(
  overlay: WorkflowDefinitionOverlay,
  principal: AtlasPrincipal,
): WorkflowDefinitionRecord[] {
  const byWorkflowId = new Map<string, WorkflowDefinitionRecord>();
  for (const def of overlay.definitions) {
    if (!callerMaySeeDefinition(def, principal)) continue;
    const existing = byWorkflowId.get(def.workflowId);
    if (!existing || def.version > existing.version) byWorkflowId.set(def.workflowId, def);
  }
  return [...byWorkflowId.values()];
}

export function getLatestDefinition(
  overlay: WorkflowDefinitionOverlay,
  workflowId: string,
  principal: AtlasPrincipal,
): WorkflowDefinitionRecord | undefined {
  const matches = overlay.definitions
    .filter((d) => d.workflowId === workflowId && callerMaySeeDefinition(d, principal))
    .sort((a, b) => b.version - a.version);
  return matches[0];
}

export async function persistDefinitionVersion(
  dir: string,
  record: WorkflowDefinitionRecord,
): Promise<WorkflowDefinitionRecord> {
  return withWorkflowDefinitionWriteLock(dir, () => {
    const overlay = readWorkflowDefinitionOverlay(dir);
    overlay.definitions.push(record);
    writeWorkflowDefinitionOverlay(dir, overlay);
    return record;
  });
}
