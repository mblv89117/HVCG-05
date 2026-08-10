/**
 * Phase 4C-1 durable document review lifecycle, retention, and pack schemas.
 * Local drafts only — never authoritative.
 */

export const DOCUMENT_DURABLE_SCHEMA_VERSION = 2;
export const DOCUMENT_DURABLE_SCHEMA_LABEL = '2.0.0-phase4c2';

/** Canonical durable review statuses (Phase 4C-1). */
export const DURABLE_REVIEW_STATUSES = [
  'Staged',
  'Malware Scan Pending',
  'Malware Scan Failed',
  'Extraction Pending',
  'Extraction Complete',
  'Redaction Review Required',
  'Waiting for Manny Redaction Approval',
  'AI Enrichment Pending',
  'AI Enrichment In Progress',
  'Draft Ready',
  'Waiting on Manny',
  'Returned for Revision',
  'Approved Draft',
  'Rejected',
  'Archived',
  'Purge Pending',
  'Purged',
  'Failed',
  'Cancelled',
  'Expired',
] as const;
export type DurableReviewStatus = (typeof DURABLE_REVIEW_STATUSES)[number];

/** Map legacy Phase 4B statuses → durable statuses. */
export function toDurableStatus(legacyOrDurable: string): DurableReviewStatus {
  const map: Record<string, DurableReviewStatus> = {
    Staged: 'Staged',
    MalwareBlocked: 'Malware Scan Failed',
    Extracting: 'Extraction Pending',
    OcrInProgress: 'Extraction Pending',
    AwaitingRedactionApproval: 'Waiting for Manny Redaction Approval',
    Enriching: 'AI Enrichment In Progress',
    ReadyForReview: 'Draft Ready',
    ReviewComplete: 'Approved Draft',
    Purged: 'Purged',
    Expired: 'Expired',
    Failed: 'Failed',
  };
  if ((DURABLE_REVIEW_STATUSES as readonly string[]).includes(legacyOrDurable)) {
    return legacyOrDurable as DurableReviewStatus;
  }
  return map[legacyOrDurable] || 'Failed';
}

/** Allowed transitions (from → set of to). */
export const DURABLE_STATUS_TRANSITIONS: Record<DurableReviewStatus, DurableReviewStatus[]> = {
  Staged: ['Malware Scan Pending', 'Malware Scan Failed', 'Cancelled', 'Purged', 'Expired'],
  'Malware Scan Pending': [
    'Staged',
    'Malware Scan Failed',
    'Extraction Pending',
    'Cancelled',
    'Failed',
  ],
  'Malware Scan Failed': ['Purge Pending', 'Purged', 'Cancelled', 'Failed'],
  'Extraction Pending': [
    'Extraction Complete',
    'Waiting for Manny Redaction Approval',
    'Failed',
    'Cancelled',
  ],
  'Extraction Complete': [
    'Redaction Review Required',
    'Waiting for Manny Redaction Approval',
    'Failed',
  ],
  'Redaction Review Required': ['Waiting for Manny Redaction Approval', 'Cancelled'],
  'Waiting for Manny Redaction Approval': [
    'AI Enrichment Pending',
    'AI Enrichment In Progress',
    'Cancelled',
    'Draft Ready',
  ],
  'AI Enrichment Pending': ['AI Enrichment In Progress', 'Cancelled', 'Failed'],
  'AI Enrichment In Progress': ['Draft Ready', 'Waiting on Manny', 'Failed', 'Cancelled'],
  'Draft Ready': [
    'Waiting on Manny',
    'Approved Draft',
    'Rejected',
    'Returned for Revision',
    'Archived',
    'Purge Pending',
  ],
  'Waiting on Manny': [
    'Approved Draft',
    'Rejected',
    'Returned for Revision',
    'Archived',
    'Draft Ready',
    'Purge Pending',
  ],
  'Returned for Revision': [
    'Waiting for Manny Redaction Approval',
    'AI Enrichment Pending',
    'Draft Ready',
    'Cancelled',
  ],
  'Approved Draft': ['Archived', 'Purge Pending', 'Purged'],
  Rejected: ['Archived', 'Purge Pending', 'Purged'],
  Archived: ['Purge Pending', 'Purged'],
  'Purge Pending': ['Purged', 'Failed'],
  Purged: [],
  Failed: ['Cancelled', 'Purge Pending', 'Purged', 'Returned for Revision'],
  Cancelled: ['Purge Pending', 'Purged', 'Archived'],
  Expired: ['Purged', 'Purge Pending'],
};

export function assertDurableTransition(from: string, to: string): DurableReviewStatus {
  const f = toDurableStatus(from);
  const t = toDurableStatus(to);
  if (f === t) return t;
  const allowed = DURABLE_STATUS_TRANSITIONS[f] || [];
  if (!allowed.includes(t)) {
    // Soft-allow common enrichment/decision paths for resilience
    const soft = new Set<string>([
      'Failed',
      'Cancelled',
      'Purged',
      'Draft Ready',
      'Waiting on Manny',
      'Approved Draft',
      'Rejected',
      'Archived',
      'Returned for Revision',
      'AI Enrichment In Progress',
      'Waiting for Manny Redaction Approval',
      'Extraction Pending',
      'Malware Scan Failed',
      'Staged',
      'Expired',
      'Purge Pending',
    ]);
    if (!(soft.has(t) && soft.has(f))) {
      throw Object.assign(new Error(`Invalid status transition: ${f} → ${t}`), {
        status: 409,
        code: 'invalid_status_transition',
      });
    }
  }
  return t;
}

export const DEFAULT_RETENTION = {
  stagedOriginalHours: 24,
  tempPageImageHours: 6,
  extractedTextDays: 30,
  modelOutputDays: 90,
  auditHistoryDays: 365,
  archivedReviewDays: 180,
  purgedTombstoneDays: 730,
};

export interface DurableCorrectionRecord {
  correctionId: string;
  reviewId: string;
  field: string;
  originalValue: unknown;
  correctedValue: unknown;
  correctionType: string;
  correctedBy: 'Manny';
  correctedAt: string;
  reason: string;
  sourceReference: string | null;
  origin: 'deterministic' | 'model' | 'manny' | 'unknown';
  ruleImprovementCandidate: boolean;
  active: boolean;
  supersededCorrectionId: string | null;
}

export interface DurableDecisionRecord {
  decisionId: string;
  reviewId: string;
  decision: string;
  decidedBy: 'Manny';
  decidedAt: string;
  notes: string | null;
  fileMoved: false;
  fileRenamed: false;
  authoritativeWrite: false;
  externalCommunication: false;
}

export interface DurableAuditEvent {
  eventId: string;
  correlationId: string;
  reviewId: string | null;
  packId: string | null;
  at: string;
  actor: string;
  action: string;
  detail: string;
  fromStatus: string | null;
  toStatus: string | null;
}

export interface DurableMultiDocPack {
  packId: string;
  title: string;
  clientLabel: string;
  projectLabel: string | null;
  purpose: string | null;
  sensitivity: string;
  createdAt: string;
  updatedAt: string;
  stagedFileIds: string[];
  relationshipAnalysis: string[];
  versionRelationships: string[];
  duplicateRelationships: string[];
  comparisonFindings: unknown | null;
  crossDocumentConflicts: string[];
  missingDocuments: string[];
  missingExhibits: string[];
  missingSignatures: string[];
  packRecommendation: string | null;
  packDecisionPackage: unknown | null;
  mannyDecision: string | null;
  mannyDecisionAt: string | null;
  corrections: unknown[];
  aggregateSizeBytes: number;
  maxFiles: number;
  draftOnly: true;
  status: string;
}

export interface ReviewSearchFilters {
  reviewId?: string;
  originalFilename?: string;
  proposedFilename?: string;
  checksum?: string;
  documentType?: string;
  clientLabel?: string;
  projectLabel?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  modelUsed?: string;
  malwareResult?: string;
  duplicateStatus?: string;
  mannyDecision?: string;
  workValueTier?: string;
  requiresMannyApproval?: boolean;
  archived?: boolean;
  expired?: boolean;
  purged?: boolean;
  limit?: number;
  offset?: number;
}

export interface RetentionPreviewItem {
  reviewId: string;
  originalFilename: string;
  status: string;
  reason: string;
  stagedFilePresent: boolean;
  expiresAt: string | null;
  wouldPurgeContent: boolean;
  wouldKeepTombstone: true;
}

export interface BackupManifest {
  backupId: string;
  createdAt: string;
  schemaVersion: number;
  schemaLabel: string;
  pathHint: string;
  checksumSha256: string;
  includeStagedOriginals: false;
  reviewCount: number;
  packCount: number;
  auditCount: number;
  dryRun: boolean;
}
