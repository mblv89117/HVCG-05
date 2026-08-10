/**
 * Phase 4B-2 document AI enrichment output schema + validation.
 * Deterministic extraction is never overwritten by model inference.
 */

import { isPhase3AllowedOperation } from './phase3Operations.ts';
import { SYNTHETIC_AI_OUTPUT_BANNER } from './decisionPackage.ts';

export const DOCUMENT_ENRICHMENT_SCHEMA_VERSION = '1.0.0-phase4b2';

export interface SourceReference {
  kind: 'page' | 'sheet' | 'cell_range' | 'paragraph' | 'image' | 'ocr_region' | 'deterministic' | 'model';
  page?: number | null;
  sheet?: string | null;
  cellRange?: string | null;
  paragraph?: number | null;
  imageRef?: string | null;
  confidence?: number | null;
  note?: string;
}

export interface FactOrInferenceItem {
  text: string;
  source: 'deterministic' | 'ocr' | 'embedded' | 'model_inference' | 'uncertain';
  confidence: number;
  refs: SourceReference[];
}

export interface DocumentEnrichmentOutput {
  review_id: string;
  job_id: string;
  document_type: string;
  document_type_confidence: number;
  alternative_document_types: Array<{ type: string; confidence: number }>;
  executive_summary: string;
  facts: FactOrInferenceItem[];
  inferences: FactOrInferenceItem[];
  parties: FactOrInferenceItem[];
  dates: FactOrInferenceItem[];
  amounts: FactOrInferenceItem[];
  payment_terms: FactOrInferenceItem[];
  obligations: FactOrInferenceItem[];
  deliverables: FactOrInferenceItem[];
  deadlines: FactOrInferenceItem[];
  renewal_terms: FactOrInferenceItem[];
  termination_terms: FactOrInferenceItem[];
  default_terms: FactOrInferenceItem[];
  governing_law: string | null;
  confidentiality_terms: FactOrInferenceItem[];
  signatures: {
    expected: string[];
    present: string[];
    missing: string[];
    uncertain: string[];
  };
  missing_pages: string[];
  referenced_exhibits: string[];
  missing_exhibits: string[];
  risks: string[];
  missing_information: string[];
  proposed_filename: string;
  proposed_folder: string;
  duplicate_status: string;
  recommended_next_action: string;
  recommended_owner: string;
  work_value_tier: string;
  requires_manny_approval: true;
  estimated_manny_review_minutes: number;
  estimated_manny_time_saved_minutes: number;
  confidence: number;
  warnings: string[];
  source_references: SourceReference[];
  conflicts: Array<{
    field: string;
    deterministicValue: string;
    modelValue: string;
    resolution: 'preserved_both_route_to_manny';
  }>;
  schemaVersion: typeof DOCUMENT_ENRICHMENT_SCHEMA_VERSION;
  draftOnly: true;
  banner: typeof SYNTHETIC_AI_OUTPUT_BANNER;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  if (!v.every((x) => typeof x === 'string')) return null;
  return v as string[];
}

/** Accept either string[] (model shorthand) or FactOrInferenceItem[]. */
export function normalizeFactItems(v: unknown): FactOrInferenceItem[] {
  if (!Array.isArray(v)) return [];
  return v.map((item) => {
    if (typeof item === 'string') {
      return {
        text: item,
        source: 'model_inference' as const,
        confidence: 0.5,
        refs: [],
      };
    }
    if (isObj(item) && typeof item.text === 'string') {
      return {
        text: item.text,
        source: (['deterministic', 'ocr', 'embedded', 'model_inference', 'uncertain'].includes(
          String(item.source),
        )
          ? String(item.source)
          : 'model_inference') as FactOrInferenceItem['source'],
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
        refs: Array.isArray(item.refs) ? (item.refs as SourceReference[]) : [],
      };
    }
    return {
      text: String(item),
      source: 'uncertain' as const,
      confidence: 0.3,
      refs: [],
    };
  });
}

export function validateDocumentEnrichmentOutput(
  value: unknown,
  opts?: { expectedJobId?: string; expectedReviewId?: string },
): { ok: boolean; errors: string[]; output?: DocumentEnrichmentOutput } {
  const errors: string[] = [];
  if (!isObj(value)) return { ok: false, errors: ['Output must be a JSON object'] };

  const required = [
    'review_id',
    'job_id',
    'document_type',
    'document_type_confidence',
    'executive_summary',
    'facts',
    'inferences',
    'risks',
    'missing_information',
    'proposed_filename',
    'proposed_folder',
    'duplicate_status',
    'recommended_next_action',
    'recommended_owner',
    'work_value_tier',
    'requires_manny_approval',
    'confidence',
    'warnings',
  ];
  for (const k of required) {
    if (!(k in value)) errors.push(`Missing field: ${k}`);
  }

  if (typeof value.job_id !== 'string') errors.push('job_id must be string');
  if (typeof value.review_id !== 'string') errors.push('review_id must be string');
  if (typeof value.document_type !== 'string') errors.push('document_type must be string');
  if (
    typeof value.document_type_confidence !== 'number' ||
    value.document_type_confidence < 0 ||
    value.document_type_confidence > 1
  ) {
    errors.push('document_type_confidence must be 0..1');
  }
  if (typeof value.executive_summary !== 'string') errors.push('executive_summary must be string');
  if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) {
    errors.push('confidence must be 0..1');
  }
  if (value.requires_manny_approval !== true) {
    errors.push('requires_manny_approval must be true');
  }
  for (const arrKey of ['risks', 'missing_information', 'warnings']) {
    if (asStringArray(value[arrKey]) === null) errors.push(`${arrKey} must be string[]`);
  }
  if (opts?.expectedJobId && value.job_id !== opts.expectedJobId) {
    errors.push(`job_id mismatch`);
  }
  if (opts?.expectedReviewId && value.review_id !== opts.expectedReviewId) {
    errors.push(`review_id mismatch`);
  }

  if (errors.length) return { ok: false, errors };

  const output: DocumentEnrichmentOutput = {
    review_id: String(value.review_id),
    job_id: String(value.job_id),
    document_type: String(value.document_type),
    document_type_confidence: Number(value.document_type_confidence),
    alternative_document_types: Array.isArray(value.alternative_document_types)
      ? (value.alternative_document_types as DocumentEnrichmentOutput['alternative_document_types'])
      : [],
    executive_summary: String(value.executive_summary),
    facts: normalizeFactItems(value.facts),
    inferences: normalizeFactItems(value.inferences),
    parties: normalizeFactItems(value.parties),
    dates: normalizeFactItems(value.dates),
    amounts: normalizeFactItems(value.amounts),
    payment_terms: normalizeFactItems(value.payment_terms),
    obligations: normalizeFactItems(value.obligations),
    deliverables: normalizeFactItems(value.deliverables),
    deadlines: normalizeFactItems(value.deadlines),
    renewal_terms: normalizeFactItems(value.renewal_terms),
    termination_terms: normalizeFactItems(value.termination_terms),
    default_terms: normalizeFactItems(value.default_terms),
    governing_law: value.governing_law == null ? null : String(value.governing_law),
    confidentiality_terms: normalizeFactItems(value.confidentiality_terms),
    signatures: isObj(value.signatures)
      ? {
          expected: asStringArray(value.signatures.expected) || [],
          present: asStringArray(value.signatures.present) || [],
          missing: asStringArray(value.signatures.missing) || [],
          uncertain: asStringArray(value.signatures.uncertain) || [],
        }
      : { expected: [], present: [], missing: [], uncertain: [] },
    missing_pages: asStringArray(value.missing_pages) || [],
    referenced_exhibits: asStringArray(value.referenced_exhibits) || [],
    missing_exhibits: asStringArray(value.missing_exhibits) || [],
    risks: asStringArray(value.risks) || [],
    missing_information: asStringArray(value.missing_information) || [],
    proposed_filename: String(value.proposed_filename || ''),
    proposed_folder: String(value.proposed_folder || ''),
    duplicate_status: String(value.duplicate_status || 'unable_to_determine'),
    recommended_next_action: String(value.recommended_next_action),
    recommended_owner: String(value.recommended_owner),
    work_value_tier: String(value.work_value_tier),
    requires_manny_approval: true,
    estimated_manny_review_minutes: Number(value.estimated_manny_review_minutes || 0),
    estimated_manny_time_saved_minutes: Number(value.estimated_manny_time_saved_minutes || 0),
    confidence: Number(value.confidence),
    warnings: asStringArray(value.warnings) || [],
    source_references: Array.isArray(value.source_references)
      ? (value.source_references as SourceReference[])
      : [],
    conflicts: Array.isArray(value.conflicts)
      ? (value.conflicts as DocumentEnrichmentOutput['conflicts'])
      : [],
    schemaVersion: DOCUMENT_ENRICHMENT_SCHEMA_VERSION,
    draftOnly: true,
    banner: SYNTHETIC_AI_OUTPUT_BANNER,
  };

  return { ok: true, errors: [], output };
}

/** Merge model enrichment with deterministic pack — never overwrite deterministic values. */
export function mergeDeterministicAndModel(opts: {
  reviewId: string;
  jobId: string;
  deterministic: {
    documentType: string;
    documentTypeConfidence: number;
    alternatives: Array<{ type: string; confidence: number }>;
    proposedFilename: string;
    proposedFolder: string;
    duplicateStatus: string;
    dates: string[];
    amounts: string[];
    obligations: string[];
    deadlines: string[];
    facts: string[];
  };
  model: DocumentEnrichmentOutput | null;
  modelRaw?: Record<string, unknown> | null;
}): DocumentEnrichmentOutput {
  const m = opts.model;
  const conflicts: DocumentEnrichmentOutput['conflicts'] = [];
  if (m && m.document_type && m.document_type !== opts.deterministic.documentType) {
    conflicts.push({
      field: 'document_type',
      deterministicValue: opts.deterministic.documentType,
      modelValue: m.document_type,
      resolution: 'preserved_both_route_to_manny',
    });
  }
  if (m && m.proposed_filename && m.proposed_filename !== opts.deterministic.proposedFilename) {
    conflicts.push({
      field: 'proposed_filename',
      deterministicValue: opts.deterministic.proposedFilename,
      modelValue: m.proposed_filename,
      resolution: 'preserved_both_route_to_manny',
    });
  }

  const confidence = Math.min(
    opts.deterministic.documentTypeConfidence,
    m?.confidence ?? opts.deterministic.documentTypeConfidence,
    conflicts.length ? 0.55 : 1,
  );

  return {
    review_id: opts.reviewId,
    job_id: opts.jobId,
    document_type: opts.deterministic.documentType,
    document_type_confidence: opts.deterministic.documentTypeConfidence,
    alternative_document_types: [
      ...opts.deterministic.alternatives,
      ...(m && m.document_type !== opts.deterministic.documentType
        ? [{ type: m.document_type, confidence: m.document_type_confidence }]
        : []),
    ],
    executive_summary:
      m?.executive_summary ||
      `Draft deterministic review for ${opts.deterministic.documentType} (${SYNTHETIC_AI_OUTPUT_BANNER})`,
    facts: [
      ...opts.deterministic.facts.map((t) => ({
        text: t,
        source: 'deterministic' as const,
        confidence: 0.85,
        refs: [{ kind: 'deterministic' as const }],
      })),
      ...(m?.facts.filter((f) => f.source !== 'deterministic') || []),
    ],
    inferences: m?.inferences || [],
    parties: m?.parties || [],
    dates: [
      ...opts.deterministic.dates.map((t) => ({
        text: t,
        source: 'deterministic' as const,
        confidence: 0.8,
        refs: [{ kind: 'deterministic' as const }],
      })),
      ...(m?.dates.filter((d) => !opts.deterministic.dates.includes(d.text)) || []),
    ],
    amounts: [
      ...opts.deterministic.amounts.map((t) => ({
        text: t,
        source: 'deterministic' as const,
        confidence: 0.8,
        refs: [{ kind: 'deterministic' as const }],
      })),
      ...(m?.amounts.filter((d) => !opts.deterministic.amounts.includes(d.text)) || []),
    ],
    payment_terms: m?.payment_terms || [],
    obligations: [
      ...opts.deterministic.obligations.map((t) => ({
        text: t,
        source: 'deterministic' as const,
        confidence: 0.75,
        refs: [{ kind: 'deterministic' as const }],
      })),
      ...(m?.obligations || []),
    ],
    deliverables: m?.deliverables || [],
    deadlines: [
      ...opts.deterministic.deadlines.map((t) => ({
        text: t,
        source: 'deterministic' as const,
        confidence: 0.75,
        refs: [{ kind: 'deterministic' as const }],
      })),
      ...(m?.deadlines || []),
    ],
    renewal_terms: m?.renewal_terms || [],
    termination_terms: m?.termination_terms || [],
    default_terms: m?.default_terms || [],
    governing_law: m?.governing_law ?? null,
    confidentiality_terms: m?.confidentiality_terms || [],
    signatures: m?.signatures || { expected: [], present: [], missing: [], uncertain: [] },
    missing_pages: m?.missing_pages || [],
    referenced_exhibits: m?.referenced_exhibits || [],
    missing_exhibits: m?.missing_exhibits || [],
    risks: [
      ...(conflicts.length ? ['Deterministic/model conflict — Manny review required'] : []),
      ...(m?.risks || []),
    ],
    missing_information: m?.missing_information || [],
    proposed_filename: opts.deterministic.proposedFilename,
    proposed_folder: opts.deterministic.proposedFolder,
    duplicate_status: opts.deterministic.duplicateStatus,
    recommended_next_action:
      m?.recommended_next_action ||
      'Manny reviews draft enrichment — approval does not move/rename/write the file',
    recommended_owner: m?.recommended_owner || 'Manny',
    work_value_tier: m?.work_value_tier || 'Tier 3 — Administrative Delegate',
    requires_manny_approval: true,
    estimated_manny_review_minutes: m?.estimated_manny_review_minutes || 8,
    estimated_manny_time_saved_minutes: m?.estimated_manny_time_saved_minutes || 15,
    confidence: Number.isFinite(confidence) ? confidence : 0.5,
    warnings: [
      ...(m?.warnings || []),
      ...(conflicts.length ? conflicts.map((c) => `conflict:${c.field}`) : []),
    ],
    source_references: m?.source_references || [],
    conflicts,
    schemaVersion: DOCUMENT_ENRICHMENT_SCHEMA_VERSION,
    draftOnly: true,
    banner: SYNTHETIC_AI_OUTPUT_BANNER,
  };
}

export function isDocumentAiOperation(op: string): boolean {
  return (
    isPhase3AllowedOperation(op) &&
    (op.includes('document') ||
      op.startsWith('summarize_document') ||
      op.startsWith('extract_document') ||
      op.startsWith('identify_document') ||
      op.startsWith('identify_missing') ||
      op.startsWith('compare_document') ||
      op.startsWith('prepare_document'))
  );
}
