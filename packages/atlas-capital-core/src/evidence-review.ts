/**
 * Evidence review cards and authorized human fact verification.
 * AI never promotes VERIFIED. Reviewers act on evidence, not raw PDFs.
 */

import { isMannyApprover } from './authz.ts';
import { hasSourceRef } from './intelligence.ts';
import type {
  CapitalDocument,
  DocumentReview,
  EvidenceReviewCard,
  ExtractedFact,
  FactReviewAudit,
  FactReviewDecision,
  FounderWorkloadMetric,
  SourceRef,
  VerificationState,
} from './types.ts';

export const MATERIAL_FACT_FIELDS = [
  'revenue',
  'grossProfit',
  'netIncome',
  'cash',
  'ar',
  'debt',
  'existingDebt',
  'totalAssets',
  'totalLiabilities',
] as const;

const DOWNLOAD_URL_RE =
  /https?:\/\/\S*(graph\.microsoft\.com|sharepoint\.com|sharepointonline\.com|tempauth|download\.aspx)\S*/gi;

export function assignFactId(documentId: string, field: string, index = 0): string {
  const safeField = field.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'field';
  return index ? `fact-${documentId}-${safeField}-${index}` : `fact-${documentId}-${safeField}`;
}

export function sanitizeEvidenceSnippet(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const cleaned = raw
    .replace(DOWNLOAD_URL_RE, '[redacted-url]')
    .replace(/https?:\/\/\S+/gi, '[redacted-url]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 240);
  return cleaned || undefined;
}

export function sourceRefIsControlledIdentity(ref: SourceRef | undefined): boolean {
  if (!hasSourceRef(ref)) return false;
  const id = ref.sourceRecordId || '';
  if (!id || /https?:\/\//i.test(id) || /tempauth/i.test(id)) return false;
  return true;
}

export function valuesConflict(left: string | number | null | undefined, right: string | number | null | undefined): boolean {
  if (left == null || right == null) return false;
  if (typeof left === 'number' && typeof right === 'number') {
    const scale = Math.max(Math.abs(left), Math.abs(right), 1);
    return Math.abs(left - right) / scale > 0.02;
  }
  return String(left).trim().toLowerCase() !== String(right).trim().toLowerCase();
}

export function preserveHumanReviewedFacts(
  incoming: ExtractedFact[],
  existing?: ExtractedFact[],
): ExtractedFact[] {
  if (!existing?.length) return incoming;
  const byId = new Map(existing.filter((f) => f.id).map((f) => [f.id as string, f]));
  const byField = new Map(existing.map((f) => [f.field, f]));
  const used = new Set<string>();
  const merged = incoming.map((fact) => {
    const prior = (fact.id && byId.get(fact.id)) || byField.get(fact.field);
    if (!prior) return fact;
    if (prior.id) used.add(prior.id);
    const humanLocked =
      Boolean(prior.reviewerDecision) ||
      prior.verification === 'VERIFIED' ||
      prior.verification === 'REJECTED' ||
      prior.verification === 'CORRECTED';
    if (!humanLocked) return { ...fact, id: fact.id || prior.id };
    return {
      ...prior,
      id: prior.id || fact.id,
      evidenceSnippet: prior.evidenceSnippet || fact.evidenceSnippet,
      conflictState: valuesConflict(prior.value, fact.value) ? 'CONFLICTING' : prior.conflictState || 'NONE',
    };
  });
  for (const prior of existing) {
    const humanLocked =
      Boolean(prior.reviewerDecision) ||
      prior.verification === 'VERIFIED' ||
      prior.verification === 'REJECTED' ||
      prior.verification === 'CORRECTED';
    if (humanLocked && prior.id && !used.has(prior.id) && !merged.some((f) => f.id === prior.id || f.field === prior.field)) {
      merged.push(prior);
    }
  }
  return merged;
}

export function identifyFacts(documentId: string, facts: ExtractedFact[]): ExtractedFact[] {
  const counts = new Map<string, number>();
  return facts.map((fact) => {
    const n = counts.get(fact.field) || 0;
    counts.set(fact.field, n + 1);
    return {
      ...fact,
      id: fact.id || assignFactId(documentId, fact.field, n),
      originalValue: fact.originalValue ?? fact.value,
      conflictState: fact.conflictState || 'NONE',
    };
  });
}

export function buildEvidenceReviewCards(opts: {
  reviews: DocumentReview[];
  documents: CapitalDocument[];
  fields?: readonly string[];
}): EvidenceReviewCard[] {
  const allow = new Set(opts.fields || MATERIAL_FACT_FIELDS);
  const docs = new Map(opts.documents.map((d) => [d.id, d]));
  const cards: EvidenceReviewCard[] = [];
  for (const review of opts.reviews) {
    const document = docs.get(review.documentId);
    for (const fact of review.extractedFacts) {
      if (!allow.has(fact.field)) continue;
      if (!sourceRefIsControlledIdentity(fact.sourceRef)) continue;
      cards.push({
        factId: fact.id || assignFactId(review.documentId, fact.field),
        field: fact.field,
        extractedValue: fact.value,
        originalValue: fact.originalValue ?? fact.value,
        correctedValue: fact.correctedValue,
        verificationState: fact.verification,
        confidence: fact.confidence,
        documentType: fact.documentType || review.classifiedType || document?.documentType || 'UNKNOWN',
        fileName: fact.fileName || document?.fileName || review.summary || review.documentId,
        sourceRef: fact.sourceRef,
        driveId: fact.driveId || document?.driveId,
        itemId: fact.itemId || document?.itemId,
        pageNumber: fact.pageNumber,
        section: fact.section,
        tableRow: fact.tableRow,
        evidenceSnippet: sanitizeEvidenceSnippet(fact.evidenceSnippet),
        extractionMethod: fact.extractionMethod || document?.extractionMethod,
        extractionTimestamp: fact.extractionTimestamp || review.createdAt,
        conflictState: fact.conflictState || (fact.verification === 'CONFLICTING' ? 'CONFLICTING' : 'NONE'),
        reviewer: fact.reviewer,
        reviewedAt: fact.reviewedAt,
        reviewerDecision: fact.reviewerDecision,
        actions: fact.verification === 'VERIFIED' || fact.verification === 'REJECTED' ? [] : ['VERIFY', 'CORRECT', 'REJECT'],
      });
    }
  }
  return cards;
}

export function founderWorkloadForCards(cards: EvidenceReviewCard[]): FounderWorkloadMetric {
  const pending = cards.filter((c) => c.actions.length > 0).length;
  return {
    documentsManuallyOpened: 0,
    valuesManuallyLocated: 0,
    manualTranscription: 0,
    mannyDecisions: pending,
    estimatedClicks: pending,
    target: {
      documentsManuallyOpened: 0,
      manualTranscription: 0,
      manualSearch: 0,
    },
  };
}

export class FactReviewError extends Error {
  readonly code: 'unauthorized' | 'forbidden' | 'unprocessable';
  constructor(code: FactReviewError['code'], message: string) {
    super(message);
    this.name = 'FactReviewError';
    this.code = code;
  }
}

export function applyFactReview(opts: {
  fact: ExtractedFact;
  decision: FactReviewDecision;
  actor: string;
  roles: readonly string[];
  correctedValue?: string | number | null;
  reason?: string;
  now?: string;
  requestedSourceRef?: SourceRef;
}): { fact: ExtractedFact; audit: Omit<FactReviewAudit, 'id' | 'clientCode' | 'capitalOpportunityId'> } {
  if (!isMannyApprover(opts.roles)) {
    throw new FactReviewError('unauthorized', 'HVCG Owner approval required');
  }
  if (opts.requestedSourceRef) {
    throw new FactReviewError('forbidden', 'SourceRef substitution is not allowed');
  }
  if (!sourceRefIsControlledIdentity(opts.fact.sourceRef)) {
    throw new FactReviewError('unprocessable', 'Fact is missing a controlled SourceRef');
  }
  const now = opts.now || new Date().toISOString();
  const original = opts.fact.originalValue ?? opts.fact.value;
  let next: ExtractedFact = {
    ...opts.fact,
    originalValue: original,
    reviewer: opts.actor,
    reviewedAt: now,
    reviewerDecision: opts.decision,
  };

  if (opts.decision === 'VERIFY') {
    next = { ...next, verification: 'VERIFIED', value: opts.fact.value, correctedValue: undefined };
  } else if (opts.decision === 'REJECT') {
    next = { ...next, verification: 'REJECTED', value: opts.fact.value, correctedValue: undefined };
  } else if (opts.decision === 'CORRECT') {
    if (opts.correctedValue == null || opts.correctedValue === '') {
      throw new FactReviewError('unprocessable', 'correctedValue is required');
    }
    next = {
      ...next,
      verification: 'VERIFIED',
      value: opts.correctedValue,
      correctedValue: opts.correctedValue,
    };
  } else {
    throw new FactReviewError('unprocessable', 'decision must be VERIFY, CORRECT, or REJECT');
  }

  return {
    fact: next,
    audit: {
      factId: opts.fact.id || assignFactId('unknown', opts.fact.field),
      previousState: opts.fact.verification,
      newState: next.verification,
      originalValue: original ?? null,
      finalValue: next.value,
      sourceRef: opts.fact.sourceRef,
      reviewer: opts.actor,
      timestamp: now,
      decision: opts.decision,
      reason: opts.reason,
    },
  };
}

export function applyReviewToReviews(
  reviews: DocumentReview[],
  factId: string,
  nextFact: ExtractedFact,
): DocumentReview[] {
  return reviews.map((review) => {
    const idx = review.extractedFacts.findIndex((f) => f.id === factId);
    if (idx < 0) return review;
    const extractedFacts = review.extractedFacts.slice();
    extractedFacts[idx] = nextFact;
    return { ...review, extractedFacts };
  });
}

export function findFactInReviews(
  reviews: DocumentReview[],
  factId: string,
): { review: DocumentReview; fact: ExtractedFact } | undefined {
  for (const review of reviews) {
    const fact = review.extractedFacts.find((f) => f.id === factId);
    if (fact) return { review, fact };
  }
  return undefined;
}

export function verificationStateForUnderwriting(state: VerificationState): VerificationState {
  if (state === 'VERIFIED' || state === 'REJECTED' || state === 'CORRECTED' || state === 'CONFLICTING' || state === 'MISSING') {
    return state;
  }
  return state === 'DERIVED' ? 'DERIVED' : 'UNVERIFIED';
}
