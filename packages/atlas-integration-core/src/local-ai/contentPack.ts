/**
 * Controlled live-content packs — manually initiated only (Phase 3).
 * Never auto-ingest Outlook/SharePoint/Dataverse/etc.
 */

import type { RedactionResult } from './redaction.ts';
import type { InjectionScanResult } from './injectionDefense.ts';
import type { ModelProfile } from './modelRouting.ts';

export const CONTENT_SOURCE_KINDS = [
  'pasted_text',
  'uploaded_document',
  'meeting_notes',
  'copied_email',
  'client_summary',
] as const;
export type ContentSourceKind = (typeof CONTENT_SOURCE_KINDS)[number];

export const SENSITIVITY_LEVELS = [
  'Public',
  'Internal',
  'Confidential',
  'Highly Confidential',
] as const;
export type SensitivityLevel = (typeof SENSITIVITY_LEVELS)[number];

export const CONTENT_PACK_STATUSES = [
  'Draft',
  'AwaitingRedactionApproval',
  'RedactionApproved',
  'Processing',
  'Completed',
  'Cancelled',
] as const;
export type ContentPackStatus = (typeof CONTENT_PACK_STATUSES)[number];

export const REDACTION_DECISIONS = [
  'Pending',
  'Approve Redacted Content',
  'Edit Redactions',
  'Cancel Job',
] as const;
export type RedactionDecision = (typeof REDACTION_DECISIONS)[number];

export interface ContentPackRecord {
  packId: string;
  createdAt: string;
  updatedAt: string;
  initiatedBy: 'Manny';
  sourceKind: ContentSourceKind;
  sourceConfirmed: boolean;
  clientId: string;
  clientLabel: string;
  projectId?: string | null;
  projectLabel?: string | null;
  sensitivity: SensitivityLevel;
  requestedOperation: string;
  modelProfileOverride?: ModelProfile | null;
  /** Original content — local store only; never sent to model until redaction approved. */
  originalContent: string;
  redactedContent: string;
  redactionPreview: RedactionResult | null;
  injectionPreview: InjectionScanResult | null;
  estimatedChars: number;
  estimatedTokensApprox: number;
  status: ContentPackStatus;
  redactionDecision: RedactionDecision;
  redactionApprovedAt: string | null;
  auditCorrelationId: string;
  linkedAiJobId: string | null;
  notes: string;
  syntheticOrApprovedLabel: string;
}

export interface CreateContentPackRequest {
  sourceKind: ContentSourceKind;
  sourceConfirmed: boolean;
  clientId: string;
  clientLabel: string;
  projectId?: string | null;
  projectLabel?: string | null;
  sensitivity: SensitivityLevel;
  requestedOperation: string;
  originalContent: string;
  modelProfileOverride?: ModelProfile | null;
  notes?: string;
  /** Must be true for any non-synthetic pack claiming live content. */
  ownerApprovedLiveContent?: boolean;
  syntheticBanner?: string;
}

export const MAX_CONTENT_PACK_CHARS = 120_000;

export function approxTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

export function assertContentPackReadyForModel(pack: ContentPackRecord): void {
  if (pack.redactionDecision !== 'Approve Redacted Content') {
    throw Object.assign(
      new Error('Content must receive explicit redaction approval before model processing'),
      { status: 409, code: 'redaction_not_approved' },
    );
  }
  if (pack.status !== 'RedactionApproved' && pack.status !== 'Processing') {
    throw Object.assign(new Error(`Pack status ${pack.status} cannot be processed`), {
      status: 409,
      code: 'invalid_pack_status',
    });
  }
  if (!pack.sourceConfirmed) {
    throw Object.assign(new Error('Source confirmation required'), {
      status: 400,
      code: 'source_not_confirmed',
    });
  }
}
