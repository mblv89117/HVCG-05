/**
 * Phase 4C-2 schemas: pack relationships, fingerprints, checkpoints, holds, retention, backups.
 * Local drafts only — never authoritative.
 */

export const DOCUMENT_RELATIONSHIP_TYPES = [
  'primary document',
  'amendment',
  'exhibit',
  'attachment',
  'prior version',
  'replacement version',
  'supporting evidence',
  'payment evidence',
  'lender checklist',
  'application',
  'approval',
  'correspondence',
  'duplicate',
  'probable duplicate',
  'unrelated',
  'relationship unknown',
] as const;
export type DocumentRelationshipType = (typeof DOCUMENT_RELATIONSHIP_TYPES)[number];

export const HOLD_TYPES = [
  'Legal Hold',
  'Client Matter Hold',
  'Manny Hold',
  'Investigation Hold',
  'Backup Hold',
] as const;
export type HoldType = (typeof HOLD_TYPES)[number];

export const BACKUP_PROFILES = [
  'Metadata Only',
  'Metadata Plus Extracted Content',
  'Full Local Review Backup',
] as const;
export type BackupProfile = (typeof BACKUP_PROFILES)[number];

export const JOB_CHECKPOINT_STAGES = [
  'staging',
  'malware_scan',
  'extraction',
  'ocr',
  'redaction',
  'redaction_approval',
  'injection_review',
  'ai_job_creation',
  'ai_processing',
  'schema_validation',
  'review_package_creation',
  'manny_decision',
] as const;
export type JobCheckpointStage = (typeof JOB_CHECKPOINT_STAGES)[number];

export const SCAN_POLICY_VERSION = '1.0.0-phase4c2';
export const EXTRACTION_POLICY_VERSION = '1.0.0-phase4c2';
export const OCR_PREPROCESS_VERSION = '1.0.0-phase4c2';
export const DEFAULT_SCAN_REUSE_MAX_AGE_HOURS = 168; // 7 days

/** Encrypted backup format (AES-256-GCM + scrypt via Node OpenSSL crypto). */
export const BACKUP_FORMAT_VERSION = 'atlas-local-ai-backup-v1';
export const BACKUP_ENCRYPTION_ALG = 'aes-256-gcm';
export const BACKUP_KDF = 'scrypt';

export interface PackMemberMeta {
  reviewId: string;
  stagedFileId: string;
  orderIndex: number;
  relationshipType: DocumentRelationshipType;
  versionLabel: string | null;
  amendmentLabel: string | null;
  designation: 'primary' | 'supporting' | 'other';
  expectedChecklistItem: string | null;
}

export interface PackRelationshipRecord {
  relationshipId: string;
  packId: string;
  fromReviewId: string;
  toReviewId: string | null;
  relationshipType: DocumentRelationshipType;
  label: string | null;
  correctedBy: 'Manny' | null;
  correctedAt: string | null;
  active: boolean;
  createdAt: string;
  historyNote: string | null;
}

export interface PackAnalysisDraft {
  packId: string;
  analyzedAt: string;
  draftOnly: true;
  documentInventory: Array<{
    reviewId: string;
    filename: string;
    documentType: string | null;
    designation: string;
    relationshipType: string;
  }>;
  documentChronology: Array<{ reviewId: string; dateHint: string | null; note: string }>;
  likelyGoverningDocument: string | null;
  amendmentsAndModifications: string[];
  conflictingTerms: string[];
  supersededTerms: string[];
  missingDocuments: string[];
  missingExhibits: string[];
  missingSignatures: string[];
  amountConflicts: string[];
  dateConflicts: string[];
  partyConflicts: string[];
  obligationConflicts: string[];
  deadlineConflicts: string[];
  unresolvedQuestions: string[];
  recommendedCurrentVersion: string | null;
  recommendedNextAction: string;
  workValueTier: string;
  mannyDecisionRequired: true;
  estimatedMannyReviewMinutes: number;
  estimatedMannyTimeSavedMinutes: number;
  sourceReferences: Array<{ reviewId: string; page: number | null; note: string }>;
  duplicateWarnings: string[];
  packRecommendation: string;
}

export interface HoldRecord {
  holdId: string;
  reviewId: string | null;
  packId: string | null;
  holdType: HoldType;
  reason: string;
  createdBy: 'Manny';
  createdAt: string;
  expiresAt: string | null;
  releasedBy: string | null;
  releasedAt: string | null;
  active: boolean;
}

export interface MalwareFingerprint {
  fingerprintId: string;
  reviewId: string;
  checksumSha256: string;
  clamavVersion: string | null;
  dailyDefinitionVersion: string | null;
  mainDefinitionVersion: string | null;
  bytecodeDefinitionVersion: string | null;
  definitionUpdateTimestamp: string | null;
  scanPolicyVersion: string;
  scanResult: string;
  scanTimestamp: string;
  clean: boolean;
  reusableUntil: string | null;
}

export interface ExtractionFingerprint {
  fingerprintId: string;
  reviewId: string;
  sourceChecksum: string;
  extractionLibrary: string;
  extractionLibraryVersion: string;
  extractionPolicyVersion: string;
  ocrEngine: string | null;
  ocrEngineVersion: string | null;
  ocrPreprocessingVersion: string | null;
  pageCount: number | null;
  extractionTimestamp: string;
  confidenceSummary: number | null;
  outcome: 'ok' | 'failed' | 'low_confidence';
}

export interface JobCheckpoint {
  checkpointId: string;
  reviewId: string;
  stage: JobCheckpointStage;
  attemptNumber: number;
  startedAt: string;
  completedAt: string | null;
  outcome: 'started' | 'completed' | 'failed' | 'skipped_reuse' | 'cancelled';
  correlationId: string;
  durationMs: number | null;
  reusableResultRef: string | null;
  failureReason: string | null;
}

export interface ResumeEligibility {
  reviewId: string;
  interruptedStage: string | null;
  completedStages: JobCheckpointStage[];
  reusableStages: JobCheckpointStage[];
  stagesRequiringRerun: JobCheckpointStage[];
  canResume: boolean;
  canRestart: boolean;
  priorAttempts: number;
  notes: string[];
}

export interface RetentionPolicyRecord {
  policyId: string;
  policyVersion: string;
  itemType: string;
  ageThresholdHours: number | null;
  sizeThresholdBytes: number | null;
  statusRequirement: string | null;
  exclusionRules: string[];
  legalHoldFlag: boolean;
  clientHoldFlag: boolean;
  mannyHoldFlag: boolean;
  active: boolean;
}

export interface RetentionBatch {
  batchId: string;
  createdAt: string;
  status: 'Proposed' | 'Approved' | 'Executed' | 'Cancelled';
  candidateReviewIds: string[];
  previewJson: unknown;
  approvedBy: string | null;
  approvedAt: string | null;
  executedAt: string | null;
  notes: string | null;
}

export interface BackupCreateOptions {
  profile: BackupProfile;
  encrypted: boolean;
  passphrase?: string;
  dryRun?: boolean;
  includeStagedOriginals?: boolean;
  destinationDir?: string;
}

export interface EncryptedBackupManifest {
  formatVersion: string;
  backupId: string;
  createdAt: string;
  schemaVersion: number;
  schemaLabel: string;
  profile: BackupProfile;
  encrypted: boolean;
  encryption?: {
    alg: string;
    kdf: string;
    saltB64: string;
    ivB64: string;
    authTagB64: string;
    /** scrypt params — never includes passphrase */
    scryptN: number;
    scryptR: number;
    scryptP: number;
  };
  checksumSha256: string;
  plaintextChecksumSha256: string | null;
  pathHint: string;
  includeStagedOriginals: boolean;
  reviewCount: number;
  packCount: number;
  auditCount: number;
  dryRun: boolean;
  estimatedBytes: number;
  fileCount: number;
  warning: string | null;
}

export interface StorageHealthReport {
  ok: boolean;
  databaseAvailable: boolean;
  schemaVersion: number;
  schemaLabel: string;
  dbBytes: number;
  journalMode: string;
  synchronous: string;
  foreignKeys: boolean;
  walOrJournalStatus: string;
  stagedFileCount: number;
  stagedFileBytes: number;
  extractedContentBytes: number;
  ocrContentBytes: number;
  thumbnailBytes: number;
  backupCount: number;
  backupBytes: number;
  orphanedFiles: number;
  metadataWithoutFiles: number;
  filesWithoutMetadata: number;
  expiredItems: number;
  heldItems: number;
  purgeCandidates: number;
  interruptedJobs: number;
  failedMigrations: number;
  lastSuccessfulBackup: string | null;
  lastVerifiedBackup: string | null;
  lastRetentionReview: string | null;
  lastClamavDefinitionUpdate: string | null;
  reviewCount: number;
  packCount: number;
  auditCount: number;
}

export interface IntegrityCheckReport {
  ok: boolean;
  integrityCheck: string;
  foreignKeyCheck: string[];
  orphanFiles: string[];
  missingFiles: string[];
  missingMetadata: string[];
  duplicateRecords: string[];
  staleLocks: string[];
  interruptedMigrations: string[];
  auditChainNotes: string[];
  dryRunCleanup: string[];
}

export function buildScannerFingerprintKey(fp: {
  checksumSha256: string;
  clamavVersion: string | null;
  dailyDefinitionVersion: string | null;
  scanPolicyVersion: string;
}): string {
  return [
    fp.checksumSha256,
    fp.clamavVersion || '',
    fp.dailyDefinitionVersion || '',
    fp.scanPolicyVersion,
  ].join('|');
}

export function buildExtractionFingerprintKey(fp: {
  sourceChecksum: string;
  extractionPolicyVersion: string;
  extractionLibraryVersion: string;
  ocrPreprocessingVersion: string | null;
}): string {
  return [
    fp.sourceChecksum,
    fp.extractionPolicyVersion,
    fp.extractionLibraryVersion,
    fp.ocrPreprocessingVersion || '',
  ].join('|');
}
