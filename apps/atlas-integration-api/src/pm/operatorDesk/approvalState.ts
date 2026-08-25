/**
 * Durable overlay for Approval Center owner decisions (defer/reject/execution tracking).
 * Composes over authoritative sources — not a duplicate approval engine.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const APPROVAL_STATE_SCHEMA_VERSION = 1;
export const APPROVAL_CENTER_MISSION_KEY = 'ATLAS-APPROVAL-CENTER-001' as const;

export type ApprovalOverlayStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'DEFERRED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'SUPERSEDED';

export type ApprovalExecutionState =
  | 'NOT_STARTED'
  | 'EXECUTING'
  | 'EXECUTED'
  | 'FAILED_AFTER_APPROVAL'
  | 'BLOCKED_BY_POLICY';

export type ApprovalOverlayRecord = {
  approvalId: string;
  status: ApprovalOverlayStatus;
  executionState: ApprovalExecutionState;
  parameterFingerprint: string;
  approvedParameterFingerprint?: string;
  deferredUntil?: string;
  rejectedReason?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  deferredAt?: string;
  deferredBy?: string;
  executionStartedAt?: string;
  executionCompletedAt?: string;
  executionResult?: string;
  relatedActivityIds: string[];
  updatedAt: string;
};

export type ApprovalStateOverlay = {
  schemaVersion?: number;
  records: ApprovalOverlayRecord[];
};

export function resolveApprovalStateDir(dataDir: string, env: NodeJS.ProcessEnv = process.env): string {
  const explicit = (env.INTEGRATION_APPROVAL_STATE_DIR || '').trim();
  if (explicit) return explicit;
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'approval-center');
  return join(dataDir, 'approval-center');
}

export function approvalStateFilePath(dir: string): string {
  return join(dir, 'approval-state-overlay.json');
}

export function emptyApprovalOverlay(): ApprovalStateOverlay {
  return { schemaVersion: APPROVAL_STATE_SCHEMA_VERSION, records: [] };
}

export function readApprovalOverlay(dir: string): ApprovalStateOverlay {
  const path = approvalStateFilePath(dir);
  if (!existsSync(path)) return emptyApprovalOverlay();
  const raw = readFileSync(path, 'utf8');
  if (!raw.trim()) return emptyApprovalOverlay();
  const parsed = JSON.parse(raw) as ApprovalStateOverlay;
  return {
    schemaVersion: parsed.schemaVersion ?? APPROVAL_STATE_SCHEMA_VERSION,
    records: Array.isArray(parsed.records) ? parsed.records : [],
  };
}

export function writeApprovalOverlay(dir: string, overlay: ApprovalStateOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = approvalStateFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(
    tmp,
    JSON.stringify({ schemaVersion: APPROVAL_STATE_SCHEMA_VERSION, records: overlay.records }, null, 2),
    { mode: 0o600 },
  );
  renameSync(tmp, path);
}

export function upsertApprovalOverlayRecord(
  overlay: ApprovalStateOverlay,
  record: ApprovalOverlayRecord,
): ApprovalStateOverlay {
  const idx = overlay.records.findIndex((r) => r.approvalId === record.approvalId);
  if (idx >= 0) {
    overlay.records[idx] = record;
  } else {
    overlay.records.push(record);
  }
  return overlay;
}

export function getApprovalOverlayRecord(
  overlay: ApprovalStateOverlay,
  approvalId: string,
): ApprovalOverlayRecord | null {
  return overlay.records.find((r) => r.approvalId === approvalId) ?? null;
}
