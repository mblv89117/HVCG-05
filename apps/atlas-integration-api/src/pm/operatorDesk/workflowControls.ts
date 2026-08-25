/**
 * Owner workflow control overlay — pause / resume / disable intent for Atlas workflows.
 * Overlay only; does not bypass downstream policy gates (Capital, ad spend, etc.).
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AtlasPrincipal } from '../../middleware/auth.ts';

export const WORKFLOW_CONTROL_OVERLAY_SCHEMA_VERSION = 1;
export const DEFAULT_WORKFLOW_CONTROL_HOME_DIR = '/home/webapp_data/integrations/workflow-controls';

export type WorkflowControlState = 'active' | 'paused' | 'disabled';

export interface WorkflowControlRecord {
  workflowId: string;
  state: WorkflowControlState;
  updatedAt: string;
  updatedByUserId: string;
  reason?: string;
  retryCount?: number;
  lastRetryAt?: string;
}

export interface WorkflowControlOverlay {
  schemaVersion?: number;
  records: WorkflowControlRecord[];
}

export class WorkflowControlOverlayCorruptError extends Error {
  readonly code = 'WORKFLOW_CONTROL_OVERLAY_CORRUPT';
}

export function resolveWorkflowControlOverlayDir(
  dataDir: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const explicit = (env.INTEGRATION_WORKFLOW_CONTROL_DIR || '').trim();
  if (explicit) return explicit;
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'workflow-controls');
  if ((env.HOME || '') === '/home') {
    const preferred = DEFAULT_WORKFLOW_CONTROL_HOME_DIR;
    try {
      mkdirSync(preferred, { recursive: true, mode: 0o700 });
      return preferred;
    } catch {
      /* fall through */
    }
  }
  return join(dataDir, 'workflow-controls');
}

export function workflowControlOverlayFilePath(dir: string): string {
  return join(dir, 'workflow-control-overlay.json');
}

export function emptyWorkflowControlOverlay(): WorkflowControlOverlay {
  return {
    schemaVersion: WORKFLOW_CONTROL_OVERLAY_SCHEMA_VERSION,
    records: [],
  };
}

export function readWorkflowControlOverlay(dir: string): WorkflowControlOverlay {
  const path = workflowControlOverlayFilePath(dir);
  if (!existsSync(path)) return emptyWorkflowControlOverlay();
  const raw = readFileSync(path, 'utf8');
  if (!raw.trim()) throw new WorkflowControlOverlayCorruptError('Workflow control overlay is empty');
  const parsed = JSON.parse(raw) as WorkflowControlOverlay;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new WorkflowControlOverlayCorruptError('Workflow control overlay is not an object');
  }
  return {
    schemaVersion: parsed.schemaVersion ?? WORKFLOW_CONTROL_OVERLAY_SCHEMA_VERSION,
    records: Array.isArray(parsed.records) ? parsed.records : [],
  };
}

const overlayWriteLocks = new Map<string, Promise<void>>();

export async function withWorkflowControlWriteLock<T>(dir: string, fn: () => Promise<T> | T): Promise<T> {
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

export function writeWorkflowControlOverlay(dir: string, overlay: WorkflowControlOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = workflowControlOverlayFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(
    tmp,
    JSON.stringify(
      {
        schemaVersion: WORKFLOW_CONTROL_OVERLAY_SCHEMA_VERSION,
        records: overlay.records,
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  renameSync(tmp, path);
}

export function getWorkflowControlState(
  overlay: WorkflowControlOverlay,
  workflowId: string,
): WorkflowControlRecord | undefined {
  return overlay.records.find((r) => r.workflowId === workflowId);
}

export async function applyWorkflowControl(opts: {
  dataDir: string;
  principal: AtlasPrincipal;
  workflowId: string;
  action: 'pause' | 'resume' | 'disable' | 'retry';
  reason?: string;
  env?: NodeJS.ProcessEnv;
}): Promise<WorkflowControlRecord> {
  const dir = resolveWorkflowControlOverlayDir(opts.dataDir, opts.env || process.env);
  return withWorkflowControlWriteLock(dir, () => {
    const overlay = readWorkflowControlOverlay(dir);
    const now = new Date().toISOString();
    const existing = overlay.records.find((r) => r.workflowId === opts.workflowId);
    let state: WorkflowControlState = existing?.state ?? 'active';
    let retryCount = existing?.retryCount ?? 0;
    let lastRetryAt = existing?.lastRetryAt;

    if (opts.action === 'pause') state = 'paused';
    if (opts.action === 'resume') state = 'active';
    if (opts.action === 'disable') state = 'disabled';
    if (opts.action === 'retry') {
      retryCount += 1;
      lastRetryAt = now;
      if (state === 'disabled') state = 'active';
    }

    const record: WorkflowControlRecord = {
      workflowId: opts.workflowId,
      state,
      updatedAt: now,
      updatedByUserId: opts.principal.userId,
      ...(opts.reason ? { reason: opts.reason } : {}),
      ...(retryCount ? { retryCount } : {}),
      ...(lastRetryAt ? { lastRetryAt } : {}),
    };

    const idx = overlay.records.findIndex((r) => r.workflowId === opts.workflowId);
    if (idx >= 0) overlay.records[idx] = record;
    else overlay.records.push(record);

    writeWorkflowControlOverlay(dir, overlay);
    return record;
  });
}
