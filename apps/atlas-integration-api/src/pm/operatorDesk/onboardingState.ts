/**
 * Durable onboarding execution state linked to governed workflow definitions.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ONBOARDING_STATE_SCHEMA_VERSION = 1;
export const ONBOARDING_AUTOMATION_MISSION_KEY = 'ATLAS-CLIENT-ONBOARDING-AUTOMATION-001' as const;

export type OnboardingLifecycleStatus =
  | 'NOT_STARTED'
  | 'IDENTITY_RECONCILIATION'
  | 'DOCUMENT_COLLECTION'
  | 'SYSTEM_SETUP'
  | 'PROJECT_SETUP'
  | 'KICKOFF_PREPARATION'
  | 'WAITING_ON_CLIENT'
  | 'WAITING_ON_OWNER'
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'BLOCKED';

export type OnboardingMilestoneState = {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'complete' | 'blocked';
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

export type OnboardingDocumentGap = {
  label: string;
  status: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN' | 'MISSING';
  source?: string;
};

/** Canonical OPERATIONS HANDOFF package. Composed from already-known run facts. */
export type OnboardingOperationsHandoff = {
  status: 'NOT_READY' | 'PREPARED' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  taskCount: number;
  milestoneCount: number;
  missingDocumentCount: number;
  blockers: string[];
  ownerAttention: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  relatedThreadCount: number;
  capitalScope: boolean;
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical KICKOFF package. Composed from already-known run facts. No outbound. */
export type OnboardingKickoff = {
  status: 'NOT_READY' | 'PREPARED' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  milestoneStatus: 'pending' | 'in_progress' | 'complete' | 'blocked' | 'unknown';
  relatedThreadCount: number;
  missingDocumentCount: number;
  blockers: string[];
  ownerAttention: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical BLOCKER REVIEW package. Surfaces already-known blockers. No send. */
export type OnboardingBlockerReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  itemCount: number;
  items: string[];
  missingDocumentCount: number;
  ownerAttention: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical OWNER ATTENTION package. Surfaces already-known owner items. No send. */
export type OnboardingOwnerAttention = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  itemCount: number;
  items: string[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

/** Canonical MILESTONE REVIEW package. Surfaces already-known milestone state. No invented dates. */
export type OnboardingMilestoneReview = {
  status: 'NOT_READY' | 'CLEAR' | 'OPEN' | 'BLOCKED';
  ready: boolean;
  projectId?: string;
  projectName?: string;
  milestoneCount: number;
  completeCount: number;
  blockedCount: number;
  pendingCount: number;
  items: string[];
  nextMilestone?: string;
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  nextOwnerAction: string;
  send: false;
  liveGtmOutbound: false;
  capitalSubmit: false;
  outbound: false;
  provenance: 'CONFIRMED' | 'LIKELY' | 'PROPOSED' | 'STALE_OR_UNCERTAIN';
};

export type OnboardingRunRecord = {
  workflowId: string;
  workflowDefinitionId: string;
  clientCode?: string;
  clientName?: string;
  status: OnboardingLifecycleStatus;
  currentStep: string;
  nextStep: string;
  blockers: string[];
  ownerAttention: string[];
  projectId?: string;
  projectName?: string;
  taskIds: string[];
  milestoneIds: string[];
  assignedAgents: string[];
  documentGaps: OnboardingDocumentGap[];
  communicationPolicy: 'DRAFT_ONLY' | 'REQUIRE_APPROVAL' | 'AUTO_RESPOND';
  capitalScope: boolean;
  identityResolutionRequired: boolean;
  workspaceReconciled: boolean;
  dryRun: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  milestones: OnboardingMilestoneState[];
  operationsHandoff: OnboardingOperationsHandoff;
  kickoff: OnboardingKickoff;
  blockerReview: OnboardingBlockerReview;
  ownerAttentionPackage: OnboardingOwnerAttention;
  milestoneReview?: OnboardingMilestoneReview;
  provenance: string;
};

export type OnboardingStateOverlay = {
  schemaVersion?: number;
  records: OnboardingRunRecord[];
};

export function resolveOnboardingStateDir(dataDir: string, env: NodeJS.ProcessEnv = process.env): string {
  const explicit = (env.INTEGRATION_ONBOARDING_STATE_DIR || '').trim();
  if (explicit) return explicit;
  const fromEnv = (env.INTEGRATION_DATA_DIR || '').trim();
  if (fromEnv) return join(fromEnv, 'onboarding-runs');
  return join(dataDir, 'onboarding-runs');
}

export function onboardingStateFilePath(dir: string): string {
  return join(dir, 'onboarding-state-overlay.json');
}

export function emptyOnboardingOverlay(): OnboardingStateOverlay {
  return { schemaVersion: ONBOARDING_STATE_SCHEMA_VERSION, records: [] };
}

export function readOnboardingOverlay(dir: string): OnboardingStateOverlay {
  const path = onboardingStateFilePath(dir);
  if (!existsSync(path)) return emptyOnboardingOverlay();
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as OnboardingStateOverlay;
  return {
    schemaVersion: parsed.schemaVersion ?? ONBOARDING_STATE_SCHEMA_VERSION,
    records: Array.isArray(parsed.records) ? parsed.records : [],
  };
}

export function writeOnboardingOverlay(dir: string, overlay: OnboardingStateOverlay): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = onboardingStateFilePath(dir);
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, JSON.stringify(overlay, null, 2), 'utf8');
  renameSync(tmp, path);
}

export function getOnboardingRun(overlay: OnboardingStateOverlay, workflowId: string): OnboardingRunRecord | null {
  const matches = overlay.records.filter((r) => r.workflowId === workflowId);
  if (!matches.length) return null;
  return matches.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null;
}

export function upsertOnboardingRun(dir: string, record: OnboardingRunRecord): OnboardingRunRecord {
  const overlay = readOnboardingOverlay(dir);
  const idx = overlay.records.findIndex((r) => r.workflowId === record.workflowId);
  if (idx >= 0) overlay.records[idx] = record;
  else overlay.records.push(record);
  writeOnboardingOverlay(dir, overlay);
  return record;
}
