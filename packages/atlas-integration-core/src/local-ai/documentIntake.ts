/**
 * Phase 4B-1 document types, staging, extraction, and review schemas.
 * All outputs are drafts — never authoritative.
 */

export const SUPPORTED_DOCUMENT_EXTENSIONS = [
  'pdf',
  'docx',
  'xlsx',
  'csv',
  'txt',
  'png',
  'jpg',
  'jpeg',
] as const;
export type SupportedDocumentExtension = (typeof SUPPORTED_DOCUMENT_EXTENSIONS)[number];

export const DOCUMENT_MIME_BY_EXT: Record<SupportedDocumentExtension, string[]> = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
  ],
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
  ],
  csv: ['text/csv', 'text/plain', 'application/csv'],
  txt: ['text/plain'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
};

export const DOCUMENT_CLASSIFICATIONS = [
  'agreement',
  'proposal',
  'invoice',
  'bank_statement',
  'tax_document',
  'financial_statement',
  'insurance_document',
  'identification_document',
  'lease',
  'purchase_agreement',
  'lender_request',
  'client_intake',
  'meeting_notes',
  'correspondence',
  'marketing_asset',
  'operating_document',
  'unknown',
] as const;
export type DocumentClassification = (typeof DOCUMENT_CLASSIFICATIONS)[number];

export const DUPLICATE_STATUSES = [
  'exact_duplicate',
  'probable_duplicate',
  'prior_version',
  'related_document',
  'unique',
  'unable_to_determine',
] as const;
export type DuplicateStatus = (typeof DUPLICATE_STATUSES)[number];

export const STAGED_FILE_STATUSES = [
  'Staged',
  'Extracting',
  'OcrInProgress',
  'ReadyForReview',
  'ReviewComplete',
  'Purged',
  'Expired',
  'Failed',
] as const;
export type StagedFileStatus = (typeof STAGED_FILE_STATUSES)[number];

export const DOCUMENT_REVIEW_DECISIONS = [
  'Approve Draft',
  'Reject Draft',
  'Return for Revision',
  'Correct Extracted Fields',
  'Correct Classification',
  'Correct Proposed Filename',
  'Correct Proposed Folder',
  'Mark Duplicate',
  'Mark Unique',
  'Archive Review Result',
  'Purge Staged File',
] as const;
export type DocumentReviewDecision = (typeof DOCUMENT_REVIEW_DECISIONS)[number];

export const TEXT_SOURCE_KINDS = ['embedded', 'ocr', 'model_inference'] as const;
export type TextSourceKind = (typeof TEXT_SOURCE_KINDS)[number];

export const DEFAULT_MAX_STAGED_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
export const DEFAULT_MAX_OCR_PAGES = 40;
export const DEFAULT_STAGED_FILE_TTL_HOURS = 24;
export const DEFAULT_MAX_IMAGE_PIXELS = 40_000_000;
export const OCR_ENGINE_NAME = 'tesseract';
export const DOCUMENT_STAGING_SCHEMA_VERSION = '1.0.0-phase4b1';

export interface ExtractedField {
  key: string;
  value: string | number | boolean | null;
  confidence: number;
  sourcePage: number | null;
  sourceKind: TextSourceKind;
  notes?: string;
}

export interface PageTextBlock {
  page: number;
  text: string;
  sourceKind: TextSourceKind;
  confidence: number | null;
  skipped?: boolean;
  skipReason?: string;
}

export interface OcrRunSummary {
  engine: typeof OCR_ENGINE_NAME;
  version: string;
  pagesProcessed: number;
  pagesSkipped: number;
  averageConfidence: number | null;
  failedPages: number[];
  durationMs: number;
  cancelled: boolean;
  timedOut: boolean;
  disclaimer: 'OCR-derived text is not guaranteed accurate';
}

export interface ExtractionSummary {
  method: string;
  embeddedTextChars: number;
  ocrTextChars: number;
  pageCount: number | null;
  encryptedOrPasswordProtected: boolean;
  warnings: string[];
  pages: PageTextBlock[];
  ocr: OcrRunSummary | null;
}

export interface DocumentClassificationResult {
  proposedType: DocumentClassification;
  confidence: number;
  alternatives: Array<{ type: DocumentClassification; confidence: number }>;
  evidence: string[];
  mannyReviewRequired: true;
}

export interface NamingRecommendation {
  originalFilename: string;
  proposedFilename: string;
  reason: string;
  missingNamingElements: string[];
  collisionOrDuplicateWarning: string | null;
  fileRenamed: false;
}

export interface FolderRecommendation {
  proposedClient: string;
  proposedWorkspace: string;
  proposedFolderPath: string;
  confidence: number;
  alternativePaths: string[];
  reason: string;
  missingContext: string[];
  fileMoved: false;
}

export interface DuplicateDetectionResult {
  status: DuplicateStatus;
  matchedStagedFileId: string | null;
  matchedChecksum: string | null;
  reasons: string[];
  fileDeleted: false;
}

export interface DocumentReviewPackage {
  schemaVersion: typeof DOCUMENT_STAGING_SCHEMA_VERSION;
  stagedFileId: string;
  correlationId: string;
  fileMetadata: {
    originalFilename: string;
    safeFilename: string;
    extension: string;
    declaredMime: string;
    detectedMime: string | null;
    sizeBytes: number;
    checksumSha256: string;
    uploadedAt: string;
  };
  extraction: ExtractionSummary;
  classification: DocumentClassificationResult;
  structuredFields: ExtractedField[];
  dates: string[];
  amounts: string[];
  deadlines: string[];
  obligations: string[];
  signatureReview: {
    signaturesPresent: boolean;
    signaturesMissing: boolean;
    initialsPresent: boolean;
    initialsMissing: boolean;
    notes: string[];
  };
  missingPageReview: {
    indicators: string[];
    pageCount: number | null;
  };
  duplicate: DuplicateDetectionResult;
  naming: NamingRecommendation;
  folder: FolderRecommendation;
  risks: string[];
  missingInformation: string[];
  recommendedNextAction: string;
  workValueTier: string;
  estimatedMannyReviewMinutes: number;
  estimatedMannyTimeSavedMinutes: number;
  decisionPackage: unknown | null;
  injectionWarnings: string[];
  redactionSummary: unknown | null;
  modelRouting: {
    requestedProfile: string;
    actualModel: string;
    usedFallback: boolean;
    fallbackReason: string | null;
  } | null;
  draftOnly: true;
  noFileMovement: true;
  noRecordWrites: true;
  noExternalCommunications: true;
  syntheticBanner: 'TEST — SYNTHETIC DOCUMENT';
}

export interface StagedDocumentRecord {
  stagedFileId: string;
  correlationId: string;
  status: StagedFileStatus;
  originalFilename: string;
  safeFilename: string;
  relativePath: string;
  absolutePathHint: string;
  extension: SupportedDocumentExtension | string;
  declaredMime: string;
  detectedMime: string | null;
  sizeBytes: number;
  checksumSha256: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  initiatedBy: 'Manny';
  malwareScanStatus: 'not_configured' | 'skipped' | 'clean' | 'blocked';
  malwareScanNote: string;
  extraction: ExtractionSummary | null;
  reviewPackage: DocumentReviewPackage | null;
  linkedAiJobId: string | null;
  mannyDecision: DocumentReviewDecision | 'Pending' | null;
  mannyDecisionAt: string | null;
  mannyCorrections: Record<string, unknown> | null;
  errorDetail: string | null;
  purgedAt: string | null;
  draftOnly: true;
}

export function isSupportedExtension(ext: string): ext is SupportedDocumentExtension {
  return (SUPPORTED_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext.toLowerCase());
}

export function extensionFromFilename(name: string): string {
  const i = name.lastIndexOf('.');
  if (i < 0) return '';
  return name.slice(i + 1).toLowerCase();
}
