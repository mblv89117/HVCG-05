/**
 * Governed AI Job model — extends HVCG_AIJobs concepts for Local AI Operations Phase 1.
 * Authoritative business records are NEVER written by the mock worker.
 */

import type { ConfigurableOwner } from './ownership.ts';
import type { WorkValueTier } from './workValue.ts';
import type { ExecutiveDecisionPackage } from './decisionPackage.ts';
import { SYNTHETIC_AI_OUTPUT_BANNER } from './decisionPackage.ts';

export const AI_JOB_STATUSES = [
  'Pending',
  'Queued',
  'In Progress',
  'Draft Ready',
  'Validation Failed',
  'Processing Failed',
  'Waiting on Manny',
  'Manny Approved',
  'Manny Rejected',
  'Returned for Revision',
  'Completed',
  'Cancelled',
] as const;

export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

export const AI_VALIDATION_STATUSES = [
  'NotStarted',
  'Passed',
  'Failed',
  'Skipped',
] as const;
export type AiValidationStatus = (typeof AI_VALIDATION_STATUSES)[number];

export const AI_REDACTION_STATUSES = [
  'NotRequired',
  'Pending',
  'Redacted',
  'Failed',
] as const;
export type AiRedactionStatus = (typeof AI_REDACTION_STATUSES)[number];

export const MANNY_DECISIONS = [
  'Pending',
  'Approved',
  'Rejected',
  'Returned for Revision',
  'NotRequired',
] as const;
export type MannyDecision = (typeof MANNY_DECISIONS)[number];

export const MOCK_SCENARIOS = [
  'success',
  'timeout',
  'malformed',
  'low_confidence',
  'failure',
] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export interface AiJobRecord {
  aiJobId: string;
  sourceRecordType: string;
  sourceRecordId: string;
  requestedOperation: string;
  requestedBy: ConfigurableOwner | string;
  assignedAiRole: ConfigurableOwner;
  workValueTier: WorkValueTier;
  inputPayloadReference: string;
  redactionStatus: AiRedactionStatus;
  processingStatus: AiJobStatus;
  validationStatus: AiValidationStatus;
  confidence: number | null;
  outputPayload: unknown | null;
  outputSummary: string | null;
  recommendedNextAction: string | null;
  requiresMannyApproval: boolean;
  mannyDecision: MannyDecision;
  mannyDecisionDate: string | null;
  retryCount: number;
  maxRetries: number;
  errorType: string | null;
  errorDetail: string | null;
  createdDate: string;
  startedDate: string | null;
  completedDate: string | null;
  auditCorrelationId: string;
  idempotencyKey: string;
  mockScenario: MockScenario;
  decisionPackage: ExecutiveDecisionPackage | null;
  syntheticBanner: typeof SYNTHETIC_AI_OUTPUT_BANNER;
  /** Never true for Phase 1 mock — authoritative writes are blocked. */
  wroteAuthoritativeBusinessRecord: boolean;
  policyVersion: string | null;
  killSwitchEngaged: boolean;
}

export interface AiAuditEvent {
  id: string;
  auditCorrelationId: string;
  aiJobId: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
  previousStatus?: AiJobStatus;
  nextStatus?: AiJobStatus;
}

export interface CreateAiJobRequest {
  sourceRecordType: string;
  sourceRecordId: string;
  requestedOperation: string;
  requestedBy?: string;
  workValueTier?: WorkValueTier;
  inputPayloadReference?: string;
  requiresMannyApproval?: boolean;
  idempotencyKey: string;
  mockScenario?: MockScenario;
  assignedAiRole?: ConfigurableOwner;
}

export const AI_JOB_SCHEMA_VERSION = '1.0.0-phase1';
export const DEFAULT_MAX_RETRIES = 2;
export const DEFAULT_JOB_TIMEOUT_MS = 5_000;
