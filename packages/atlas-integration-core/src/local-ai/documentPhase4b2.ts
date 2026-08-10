/**
 * Phase 4B-2 malware scan result types, corrections, version compare, multi-doc.
 */

export const MALWARE_SCAN_STATUSES = [
  'clean',
  'infected',
  'unavailable',
  'timeout',
  'error',
  'skipped_synthetic_override',
  'not_configured',
] as const;
export type MalwareScanStatus = (typeof MALWARE_SCAN_STATUSES)[number];

export interface MalwareScanResult {
  status: MalwareScanStatus;
  engine: 'clamav' | 'none';
  scannerVersion: string | null;
  definitionVersion: string | null;
  definitionDate: string | null;
  checksumSha256: string;
  detail: string;
  durationMs: number;
  quarantined: boolean;
  blocked: boolean;
  overrideUsed: boolean;
  overrideReason: string | null;
}

export interface FieldCorrectionRecord {
  field: string;
  originalValue: unknown;
  correctedValue: unknown;
  correctedBy: 'Manny';
  correctedAt: string;
  reason: string;
  informFutureDeterministicRules: boolean;
}

export interface DocumentVersionComparison {
  schemaVersion: '1.0.0-phase4b2';
  leftStagedFileId: string;
  rightStagedFileId: string;
  likelySameDocumentFamily: boolean;
  versionDates: string[];
  sectionsAdded: string[];
  sectionsRemoved: string[];
  amountsChanged: string[];
  datesChanged: string[];
  partiesChanged: string[];
  obligationsChanged: string[];
  signaturesChanged: string[];
  materialRiskChanges: string[];
  proposedCurrentVersion: string | null;
  confidence: number;
  sourceReferences: Array<{ stagedFileId: string; note: string }>;
  draftOnly: true;
  filesDeleted: false;
}

export interface MultiDocumentReviewPack {
  packId: string;
  stagedFileIds: string[];
  createdAt: string;
  clientLabel: string;
  relationshipAnalysis: string[];
  crossDocumentConflicts: string[];
  crossDocumentMissingInformation: string[];
  duplicateNotes: string[];
  sourceCitations: Array<{ stagedFileId: string; note: string }>;
  draftOnly: true;
  maxFiles: number;
  aggregateSizeBytes: number;
}

export const DEFAULT_MULTI_DOC_MAX_FILES = 5;
export const DEFAULT_MULTI_DOC_MAX_BYTES = 40 * 1024 * 1024;

export const OCR_CONFIDENCE_BANDS = [
  'High confidence',
  'Review recommended',
  'Low confidence',
  'Extraction unreliable',
] as const;
export type OcrConfidenceBand = (typeof OCR_CONFIDENCE_BANDS)[number];

export function classifyOcrConfidence(avg: number | null): OcrConfidenceBand {
  if (avg == null) return 'Extraction unreliable';
  if (avg >= 0.85) return 'High confidence';
  if (avg >= 0.65) return 'Review recommended';
  if (avg >= 0.4) return 'Low confidence';
  return 'Extraction unreliable';
}
