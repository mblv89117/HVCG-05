/**
 * Capital document intelligence pipeline (advisory).
 *
 * COLLECTION → CLASSIFICATION → EXTRACTION → PERIOD → ENTITY →
 * CURRENT/STALE → COMPLETENESS → CONFLICTS → MISSING DOCS →
 * CLIENT REQUEST (draft only) → UNDERWRITING SUMMARY
 *
 * Filename / metadata heuristics only. OCR is stubbed. AI facts cannot
 * land as VERIFIED. Every derived/extracted fact carries SourceRef.
 * No client or lender side effects.
 */

import {
  completenessPercent,
  consolidateMissingRequest,
  markOutdated,
  requiredOpenItems,
} from './checklist.ts';
import {
  classifyDocumentName,
  detectDuplicate,
  hasSourceRef,
  reviewDocument,
  buildUnderwritingSummary,
} from './intelligence.ts';
import { AI_DISCLAIMER, FINANCING_DISCLAIMER } from './types.ts';
import type {
  CapitalDocument,
  CapitalOpportunity,
  ChecklistItem,
  ConflictFinding,
  DocumentIntelligenceDocumentResult,
  DocumentIntelligenceReport,
  DocumentReview,
  EntityDetection,
  ExtractedFact,
  FreshnessDetection,
  PeriodDetection,
  SourceRef,
  VerificationState,
} from './types.ts';

export const DOCUMENT_INTELLIGENCE_SOURCE = 'atlas-document-intelligence';
export const OCR_STUBBED: DocumentIntelligenceDocumentResult['extraction']['ocr'] = 'STUBBED_NOT_RUN';

/** Filename / metadata classification below this is not a type match. */
export const CLASSIFICATION_LOW_CONFIDENCE = 0.5;

/**
 * Completeness of one file vs the requested checklist row (contracts).
 * Distinct from checklist RequestStatus and from completenessPercent.
 */
export const COMPLETENESS_VS_REQUEST = [
  'SATISFIED',
  'LIKELY_SATISFIED_NEEDS_REVIEW',
  'INCOMPLETE',
  'OUTDATED',
  'WRONG_ENTITY',
  'WRONG_PERIOD',
  'CONFLICTING',
  'NOT_MATCHED',
  'UNKNOWN',
] as const;
export type CompletenessVsRequest = (typeof COMPLETENESS_VS_REQUEST)[number];

export interface CompletenessVsRequestRow {
  documentId: string;
  itemKey?: string;
  status: CompletenessVsRequest;
}

const PROMPT_INJECTION_RE =
  /ignore\s+(all\s+)?(previous\s+)?instructions|disregard\s+(all\s+)?(previous|prior|these)\s+instructions|you\s+are\s+now\b/i;

const PERIOD_SENSITIVE_TYPES = new Set([
  'bank_statement',
  'pnl',
  'balance_sheet',
  'cash_flow',
  'tax_return',
  'ar_aging',
  'ap_aging',
  'debt_schedule',
]);

export function isPromptInjectionFileName(fileName: string): boolean {
  return PROMPT_INJECTION_RE.test(fileName);
}

/** `other` from the name heuristic is UNKNOWN — not a guessed type. */
export function normalizeClassification(classified: {
  documentType: string;
  confidence: number;
}): { documentType: string; confidence: number } {
  if (classified.documentType === 'other') {
    return { documentType: 'UNKNOWN', confidence: classified.confidence };
  }
  return classified;
}

export const CLASSIFICATION_TO_ITEM_KEY: Record<string, string> = {
  bank_statement: 'bank-3mo',
  pnl: 'fin-pl-ytd',
  balance_sheet: 'fin-bs-ytd',
  cash_flow: 'fin-pl-ytd',
  tax_return: 'fin-tax-3yr',
  ar_aging: 'ar-aging',
  ap_aging: 'ap-aging',
  debt_schedule: 'debt-schedule',
  personal_financial_statement: 'pfs',
  sba_document: 'sba-1919',
  purchase_agreement: 're-psa',
  loi: 're-psa',
  appraisal: 're-appraisal',
  lease: 're-lease',
  insurance: 'ins-gl',
  formation: 'org-formation',
  ownership: 'org-ownership',
  ucc: 'ucc-search',
};

const MONTH_INDEX: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  sept: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const STALE_DAYS: Record<string, number> = {
  bank_statement: 45,
  pnl: 90,
  balance_sheet: 90,
  cash_flow: 90,
  ar_aging: 45,
  ap_aging: 45,
  debt_schedule: 90,
  insurance: 365,
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month1to12: number): string {
  return isoDate(new Date(Date.UTC(year, month1to12, 0)));
}

function sourceRef(opts: {
  capturedAt: string;
  sourceRecordId?: string;
  field: string;
  sourceUrl?: string;
}): SourceRef {
  return {
    sourceSystem: DOCUMENT_INTELLIGENCE_SOURCE,
    sourceRecordId: opts.sourceRecordId,
    sourceUrl: opts.sourceUrl,
    field: opts.field,
    capturedAt: opts.capturedAt,
  };
}

export function demoteEngineVerified(state: VerificationState): VerificationState {
  return state === 'VERIFIED' ? 'UNVERIFIED' : state;
}

export function ensureFactProvenance(fact: ExtractedFact, document: CapitalDocument, _capturedAt: string): ExtractedFact {
  if (!hasSourceRef(fact.sourceRef)) {
    return {
      ...fact,
      verification: 'MISSING',
      value: null,
    };
  }
  return {
    ...fact,
    verification: demoteEngineVerified(fact.verification),
    sourceRef: {
      ...fact.sourceRef,
      sourceRecordId: fact.sourceRef.sourceRecordId || document.id,
      sourceUrl: fact.sourceRef.sourceUrl || document.webUrl,
      field: fact.sourceRef.field || fact.field,
    },
  };
}

export function suggestedChecklistItemKey(documentType: string): string | undefined {
  return CLASSIFICATION_TO_ITEM_KEY[documentType];
}

function itemKeysCompatible(classifiedKey: string | undefined, requestedKey: string | undefined): boolean {
  if (!classifiedKey || !requestedKey) return false;
  if (classifiedKey === requestedKey) return true;
  return (classifiedKey === 'pfs' && requestedKey === 'sba-413') || (classifiedKey === 'sba-413' && requestedKey === 'pfs');
}

function periodYearMismatch(item: ChecklistItem, period: PeriodDetection, documentType: string): boolean {
  if (!item.currentThrough || !period.determined || !period.periodEnd) return false;
  if (documentType === 'tax_return') return false;
  const wantYear = item.currentThrough.slice(0, 4);
  const gotYear = String(period.taxYear ?? period.periodEnd.slice(0, 4));
  return Boolean(wantYear && gotYear && wantYear !== gotYear);
}

/**
 * Fail-closed: a file does not SATISFY a request unless type, entity, and
 * period heuristics align. Prompt-injection filenames are content, not authority.
 */
export function evaluateCompletenessVsRequest(opts: {
  result: DocumentIntelligenceDocumentResult;
  item?: ChecklistItem;
  conflicts?: ConflictFinding[];
  bankStatementMonths?: string[];
}): CompletenessVsRequest {
  const { result, item, conflicts = [], bankStatementMonths } = opts;
  const type = result.classification.documentType;
  const classifiedKey = suggestedChecklistItemKey(type) || result.collection.suggestedItemKey;
  const requestedKey = item?.itemKey;

  if (isPromptInjectionFileName(result.collection.fileName)) return 'UNKNOWN';
  if (type === 'UNKNOWN' || type === 'other' || result.classification.confidence < CLASSIFICATION_LOW_CONFIDENCE) {
    return 'UNKNOWN';
  }
  if (result.entity.matchesOpportunity === false) return 'WRONG_ENTITY';
  if (requestedKey && classifiedKey && !itemKeysCompatible(classifiedKey, requestedKey)) return 'NOT_MATCHED';
  if (!requestedKey && !classifiedKey) return 'NOT_MATCHED';
  if (item && periodYearMismatch(item, result.period, type)) return 'WRONG_PERIOD';
  if (result.freshness.stale) return 'OUTDATED';
  if (conflicts.some((c) => c.left.documentId === result.documentId || c.right.documentId === result.documentId)) {
    return 'CONFLICTING';
  }
  if (result.incompletePages) return 'INCOMPLETE';
  const months = bankStatementMonths;
  if ((requestedKey === 'bank-3mo' || type === 'bank_statement') && months && months.length > 0 && months.length < 3) {
    return 'INCOMPLETE';
  }
  if (PERIOD_SENSITIVE_TYPES.has(type) && !result.period.determined) return 'INCOMPLETE';
  if (result.collection.duplicateOf) return 'LIKELY_SATISFIED_NEEDS_REVIEW';
  if (result.entity.matchesOpportunity !== true) return 'LIKELY_SATISFIED_NEEDS_REVIEW';
  if (result.extraction.facts.some((f) => f.verification !== 'VERIFIED')) return 'LIKELY_SATISFIED_NEEDS_REVIEW';
  return 'SATISFIED';
}

export function detectPeriodFromFileName(
  fileName: string,
  capturedAt: string,
  sourceRecordId?: string,
): PeriodDetection {
  const ref = sourceRef({ capturedAt, sourceRecordId, field: 'fileName' });
  const missing = (): PeriodDetection => ({
    periodLabel: null,
    determined: false,
    verification: 'MISSING',
    sourceRef: ref,
  });
  const n = fileName.toLowerCase();

  const iso = /\b(20\d{2})[-_/](0?[1-9]|1[0-2])[-_/](0?[1-9]|[12]\d|3[01])\b/.exec(n);
  if (iso) {
    const y = Number(iso[1]);
    const m = iso[2].padStart(2, '0');
    const d = iso[3].padStart(2, '0');
    const label = `${y}-${m}-${d}`;
    return {
      periodLabel: label,
      periodEnd: label,
      determined: true,
      verification: 'DERIVED',
      sourceRef: ref,
    };
  }

  const ym = /\b(20\d{2})[-_/](0?[1-9]|1[0-2])\b/.exec(n);
  const monthName = /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)\.?\s*[,\-_/]?\s*(20\d{2})\b/i.exec(
    n,
  );
  const ytd = /\bytd\b/.test(n);
  const fy = /\bfy\s*(20\d{2})\b/i.exec(n);
  const tax = /\b(20\d{2})\s*(?:tax|1120|1065|1040)\b|\b(?:tax|1120|1065|1040)\s*(20\d{2})\b/.exec(n);

  if (monthName) {
    const month = MONTH_INDEX[monthName[1].toLowerCase()];
    const year = Number(monthName[2]);
    if (month && year) {
      const end = lastDayOfMonth(year, month);
      return {
        periodLabel: ytd ? `YTD-${year}-${String(month).padStart(2, '0')}` : `${year}-${String(month).padStart(2, '0')}`,
        periodEnd: end,
        determined: true,
        verification: 'DERIVED',
        sourceRef: ref,
      };
    }
  }

  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    return {
      periodLabel: ytd ? `YTD-${year}-${String(month).padStart(2, '0')}` : `${year}-${String(month).padStart(2, '0')}`,
      periodEnd: lastDayOfMonth(year, month),
      determined: true,
      verification: 'DERIVED',
      sourceRef: ref,
    };
  }

  if (tax) {
    const year = Number(tax[1] || tax[2]);
    return {
      periodLabel: `FY${year}`,
      taxYear: year,
      periodEnd: `${year}-12-31`,
      determined: true,
      verification: 'DERIVED',
      sourceRef: ref,
    };
  }

  if (fy) {
    const year = Number(fy[1]);
    return {
      periodLabel: `FY${year}`,
      taxYear: year,
      periodEnd: `${year}-12-31`,
      determined: true,
      verification: 'DERIVED',
      sourceRef: ref,
    };
  }

  if (ytd) {
    return {
      periodLabel: 'YTD',
      determined: false,
      verification: 'UNVERIFIED',
      sourceRef: ref,
    };
  }

  return missing();
}

function normalizeEntityToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function detectEntityFromFileName(
  fileName: string,
  opportunity: Pick<CapitalOpportunity, 'clientCode' | 'title'>,
  capturedAt: string,
  sourceRecordId?: string,
): EntityDetection {
  const ref = sourceRef({ capturedAt, sourceRecordId, field: 'fileName' });
  const stem = fileName.replace(/\.[^.]+$/, '');
  const stripped = stem
    .replace(
      /\b(bank\s*statements?|p&l|profit\s*and\s*loss|balance\s*sheet|tax\s*returns?|ar\s*aging|ap\s*aging|aging|ytd|fy\d{4}|20\d{2}|form\s*\d+|january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|0?[1-9]|1[0-2])\b/gi,
      ' ',
    )
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const code = opportunity.clientCode.toUpperCase();
  if (stem.toUpperCase().includes(code)) {
    return {
      entityName: opportunity.clientCode,
      matchesOpportunity: true,
      verification: 'DERIVED',
      sourceRef: ref,
    };
  }
  const titleTokens = normalizeEntityToken(opportunity.title)
    .split(' ')
    .filter((t) => t.length >= 4);
  const fileTokens = normalizeEntityToken(stripped)
    .split(' ')
    .filter((t) => t.length >= 4);
  const overlap = fileTokens.filter((t) => titleTokens.includes(t));
  if (overlap.length >= 1) {
    return {
      entityName: stripped || opportunity.clientCode,
      matchesOpportunity: true,
      verification: 'DERIVED',
      sourceRef: ref,
    };
  }
  if (stripped.length >= 4 && /[a-z]/i.test(stripped) && fileTokens.length >= 1) {
    return { entityName: stripped, matchesOpportunity: false, verification: 'DERIVED', sourceRef: ref };
  }
  return {
    entityName: null,
    matchesOpportunity: null,
    verification: 'MISSING',
    sourceRef: ref,
  };
}

export function detectFreshness(opts: {
  documentType: string;
  period: PeriodDetection;
  asOf: Date;
  capturedAt: string;
  sourceRecordId?: string;
  expiration?: string;
}): FreshnessDetection {
  const asOfIso = opts.asOf.toISOString();
  const ref = sourceRef({ capturedAt: opts.capturedAt, sourceRecordId: opts.sourceRecordId, field: 'period' });
  if (opts.expiration) {
    const exp = Date.parse(opts.expiration);
    if (Number.isFinite(exp) && opts.asOf.getTime() > exp) {
      return {
        stale: true,
        determined: true,
        reason: `Past expiration ${opts.expiration}`,
        currentThrough: opts.expiration,
        asOf: asOfIso,
        verification: 'DERIVED',
        sourceRef: ref,
      };
    }
  }
  if (opts.documentType === 'tax_return' && opts.period.taxYear != null) {
    const asOfYear = opts.asOf.getUTCFullYear();
    const stale = opts.period.taxYear < asOfYear - 3;
    return {
      stale,
      determined: true,
      reason: stale ? `Tax year ${opts.period.taxYear} is outside the trailing 3-year window` : undefined,
      currentThrough: opts.period.periodEnd,
      asOf: asOfIso,
      verification: 'DERIVED',
      sourceRef: ref,
    };
  }
  if (!opts.period.determined || !opts.period.periodEnd) {
    return {
      stale: false,
      determined: false,
      reason: 'Period not determined from filename — not treated as current',
      asOf: asOfIso,
      verification: 'MISSING',
      sourceRef: ref,
    };
  }
  const end = Date.parse(opts.period.periodEnd);
  if (!Number.isFinite(end)) {
    return {
      stale: false,
      determined: false,
      asOf: asOfIso,
      verification: 'MISSING',
      sourceRef: ref,
    };
  }
  const days = Math.floor((opts.asOf.getTime() - end) / 86_400_000);
  const limit = STALE_DAYS[opts.documentType] ?? 180;
  const stale = days > limit;
  return {
    stale,
    determined: true,
    reason: stale ? `${opts.documentType} period ended ${opts.period.periodEnd} (${days} days before as-of; limit ${limit})` : undefined,
    currentThrough: opts.period.periodEnd,
    asOf: asOfIso,
    verification: 'DERIVED',
    sourceRef: ref,
  };
}

function valuesConflict(a: string | number | null, b: string | number | null): boolean {
  if (a == null || b == null) return false;
  if (typeof a === 'number' && typeof b === 'number') {
    const denom = Math.max(Math.abs(a), Math.abs(b), 1);
    return Math.abs(a - b) / denom > 0.05;
  }
  return String(a).trim().toLowerCase() !== String(b).trim().toLowerCase();
}

function matchChecklistItem(
  checklist: ChecklistItem[],
  suggestedKey: string | undefined,
  checklistItemId: string | undefined,
): ChecklistItem | undefined {
  if (checklistItemId) {
    const byId = checklist.find((i) => i.id === checklistItemId);
    if (byId) return byId;
  }
  if (!suggestedKey) return undefined;
  const direct = checklist.find((i) => i.itemKey === suggestedKey);
  if (direct) return direct;
  if (suggestedKey === 'pfs') return checklist.find((i) => i.itemKey === 'sba-413');
  return undefined;
}

export function applyIntelligenceToChecklist(
  checklist: ChecklistItem[],
  results: DocumentIntelligenceDocumentResult[],
  asOf: Date,
  conflicts: ConflictFinding[],
): ChecklistItem[] {
  const aged = markOutdated(checklist, asOf);
  return aged.map((item) => {
    const matches = results.filter(
      (r) => r.collection.checklistItemId === item.id || r.collection.suggestedItemKey === item.itemKey,
    );
    if (!matches.length) return item;
    let next: ChecklistItem = { ...item };
    const conflicted = conflicts.some((c) => matches.some((m) => m.documentId === c.left.documentId || m.documentId === c.right.documentId));
    const staleHit = matches.find((m) => m.freshness.stale);
    const receivedAt = matches.map((m) => m.review.createdAt).sort()[0];
    next.fileId = matches[0].documentId;
    next.fileLink = matches[0].collection.webUrl || next.fileLink;
    if (staleHit) {
      next = {
        ...next,
        status: 'OUTDATED',
        deficiency: staleHit.freshness.reason || 'Document period is stale',
        receivedAt: next.receivedAt || receivedAt,
        verification: next.verification === 'VERIFIED' ? 'UNVERIFIED' : next.verification === 'MISSING' ? 'UNVERIFIED' : next.verification,
      };
    } else if (conflicted && (next.status === 'ACCEPTED' || next.status === 'RECEIVED' || next.status === 'NEEDS_REVIEW')) {
      next = {
        ...next,
        status: 'NEEDS_REVIEW',
        deficiency: 'Conflicting facts — human re-review required',
        verification: 'CONFLICTING',
      };
    } else if (next.status === 'MISSING' || next.status === 'REQUESTED' || next.status === 'RECEIVED') {
      next = {
        ...next,
        status: 'NEEDS_REVIEW',
        receivedAt: next.receivedAt || receivedAt,
        verification: next.verification === 'MISSING' ? 'UNVERIFIED' : next.verification,
      };
    }
    if (next.status === 'ACCEPTED' && next.verification === 'VERIFIED') {
      return next;
    }
    if (next.verification === 'VERIFIED') {
      next = { ...next, verification: 'UNVERIFIED' };
    }
    return next;
  });
}

function bankStatementMonths(results: DocumentIntelligenceDocumentResult[]): string[] {
  const months = new Set<string>();
  for (const r of results) {
    if (r.classification.documentType !== 'bank_statement') continue;
    const end = r.period.periodEnd;
    if (end && /^\d{4}-\d{2}/.test(end)) months.add(end.slice(0, 7));
  }
  return [...months].sort();
}

function detectConflicts(opts: {
  opportunity: CapitalOpportunity;
  results: DocumentIntelligenceDocumentResult[];
}): ConflictFinding[] {
  const findings: ConflictFinding[] = [];
  const byField = new Map<string, Array<{ documentId: string; value: string | number | null; sourceRef: SourceRef }>>();
  for (const r of opts.results) {
    if (r.entity.matchesOpportunity === false && r.entity.entityName) {
      findings.push({
        field: 'entityName',
        left: {
          documentId: r.documentId,
          value: r.entity.entityName,
          sourceRef: r.entity.sourceRef,
        },
        right: {
          documentId: 'atlas',
          value: opts.opportunity.clientCode,
          sourceRef: sourceRef({
            capturedAt: opts.opportunity.updatedAt,
            sourceRecordId: opts.opportunity.id,
            field: 'clientCode',
          }),
        },
        verification: 'CONFLICTING',
      });
    }
    for (const fact of r.extraction.facts) {
      const list = byField.get(fact.field) || [];
      list.push({ documentId: r.documentId, value: fact.value, sourceRef: fact.sourceRef });
      byField.set(fact.field, list);
    }
  }
  for (const [field, entries] of byField) {
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        if (valuesConflict(entries[i].value, entries[j].value)) {
          findings.push({
            field,
            left: entries[i],
            right: entries[j],
            verification: 'CONFLICTING',
          });
        }
      }
    }
  }
  const atlasRevenue = opts.opportunity.business.annualRevenue;
  if (atlasRevenue && atlasRevenue.verification !== 'MISSING' && atlasRevenue.value != null) {
    for (const r of opts.results) {
      for (const fact of r.extraction.facts) {
        if (fact.field === 'revenue' && typeof fact.value === 'number' && valuesConflict(fact.value, atlasRevenue.value)) {
          findings.push({
            field: 'revenue',
            left: { documentId: r.documentId, value: fact.value, sourceRef: fact.sourceRef },
            right: {
              documentId: 'atlas',
              value: atlasRevenue.value,
              sourceRef: atlasRevenue.sourceRef || sourceRef({
                capturedAt: opts.opportunity.updatedAt,
                sourceRecordId: opts.opportunity.id,
                field: 'annualRevenue',
              }),
            },
            verification: 'CONFLICTING',
          });
        }
      }
    }
  }
  return findings;
}

export function analyzeDocument(opts: {
  document: CapitalDocument;
  opportunity: Pick<CapitalOpportunity, 'id' | 'clientCode' | 'title'>;
  checklist: ChecklistItem[];
  existingDocuments: CapitalDocument[];
  extractedFacts?: ExtractedFact[];
  incompletePages?: boolean;
  asOf: Date;
}): DocumentIntelligenceDocumentResult {
  const capturedAt = opts.document.associatedAt || opts.asOf.toISOString();
  const classified = normalizeClassification(classifyDocumentName(opts.document.fileName));
  const suggested = suggestedChecklistItemKey(classified.documentType);
  const matched = matchChecklistItem(opts.checklist, suggested, opts.document.checklistItemId);
  const others = opts.existingDocuments.filter((d) => d.id !== opts.document.id);
  const duplicateOf = detectDuplicate(others, opts.document);
  const period = detectPeriodFromFileName(opts.document.fileName, capturedAt, opts.document.id);
  const entity = detectEntityFromFileName(opts.document.fileName, opts.opportunity, capturedAt, opts.document.id);
  const freshness = detectFreshness({
    documentType: classified.documentType,
    period,
    asOf: opts.asOf,
    capturedAt,
    sourceRecordId: opts.document.id,
    expiration: matched?.expiration,
  });
  const facts = (opts.extractedFacts || [])
    .filter((f) => hasSourceRef(f.sourceRef))
    .map((f) => ensureFactProvenance(f, opts.document, capturedAt));
  const atlasConflicts: string[] = [];
  const dropped = (opts.extractedFacts || []).filter((f) => !hasSourceRef(f.sourceRef));
  for (const f of dropped) {
    atlasConflicts.push(`Dropped ${f.field || 'fact'}: sourceRef required — missing stays missing`);
  }
  if (entity.matchesOpportunity === false && entity.entityName) {
    atlasConflicts.push(`Entity "${entity.entityName}" does not match ${opts.opportunity.clientCode}`);
  }
  if (freshness.stale && freshness.reason) atlasConflicts.push(freshness.reason);
  const review = reviewDocument({
    document: opts.document,
    extractedFacts: facts,
    period: period.periodLabel || undefined,
    entityName: entity.entityName || undefined,
    incompletePages: opts.incompletePages,
    atlasConflicts,
    stale: freshness.stale,
    inconsistentPeriod: period.verification === 'UNVERIFIED',
    duplicateOf,
    summary: [
      `Classified as ${classified.documentType} (${classified.confidence}) from file name.`,
      period.periodLabel ? `Period ${period.periodLabel} (${period.verification}).` : 'Period MISSING.',
      entity.entityName ? `Entity ${entity.entityName} (${entity.verification}).` : 'Entity MISSING.',
      freshness.stale ? `STALE: ${freshness.reason}` : freshness.determined ? 'Freshness current (derived).' : 'Freshness not determined.',
      'OCR not run. Extracted values are unverified until a human confirms the source document.',
    ].join(' '),
  });

  const classificationRef = sourceRef({ capturedAt, sourceRecordId: opts.document.id, field: 'fileName' });
  return {
    documentId: opts.document.id,
    collection: {
      associated: true,
      checklistItemId: matched?.id || opts.document.checklistItemId,
      suggestedItemKey: suggested || matched?.itemKey,
      duplicateOf,
      fileName: opts.document.fileName,
      webUrl: opts.document.webUrl,
      originalPreserved: true,
    },
    classification: {
      documentType: classified.documentType,
      confidence: classified.confidence,
      verification:
        classified.documentType === 'UNKNOWN' || classified.confidence < CLASSIFICATION_LOW_CONFIDENCE
          ? 'UNVERIFIED'
          : 'DERIVED',
      sourceRef: classificationRef,
    },
    extraction: {
      facts,
      ocr: OCR_STUBBED,
      verification: facts.length ? 'UNVERIFIED' : 'MISSING',
    },
    period,
    entity,
    freshness,
    incompletePages: Boolean(opts.incompletePages),
    review,
  };
}

export interface DocumentIntelligenceInput {
  opportunity: CapitalOpportunity;
  checklist: ChecklistItem[];
  documents: CapitalDocument[];
  incomingFactsByDocumentId?: Record<string, ExtractedFact[]>;
  incompletePagesByDocumentId?: Record<string, boolean>;
  includeUnderwriting?: boolean;
  createdBy: string;
  asOf?: Date | string;
}

export interface DocumentIntelligenceOutput {
  report: DocumentIntelligenceReport;
  checklist: ChecklistItem[];
  reviews: DocumentReview[];
  completenessVsRequest: CompletenessVsRequestRow[];
}

export function runDocumentIntelligence(input: DocumentIntelligenceInput): DocumentIntelligenceOutput {
  const asOf = input.asOf instanceof Date ? input.asOf : new Date(input.asOf || Date.now());
  const capturedAt = asOf.toISOString();
  const results = input.documents.map((document) =>
    analyzeDocument({
      document,
      opportunity: input.opportunity,
      checklist: input.checklist,
      existingDocuments: input.documents,
      extractedFacts: input.incomingFactsByDocumentId?.[document.id],
      incompletePages: input.incompletePagesByDocumentId?.[document.id],
      asOf,
    }),
  );
  const conflicts = detectConflicts({ opportunity: input.opportunity, results });
  for (const r of results) {
    const related = conflicts.filter((c) => c.left.documentId === r.documentId || c.right.documentId === r.documentId);
    if (related.length) {
      r.review.conflicts = [
        ...r.review.conflicts,
        ...related.map((c) => `${c.field}: ${String(c.left.value)} vs ${String(c.right.value)}`),
      ];
      for (const fact of r.extraction.facts) {
        if (related.some((c) => c.field === fact.field)) fact.verification = 'CONFLICTING';
      }
      for (const fact of r.review.extractedFacts) {
        if (related.some((c) => c.field === fact.field)) fact.verification = 'CONFLICTING';
      }
    }
  }

  let checklist = applyIntelligenceToChecklist(input.checklist, results, asOf, conflicts);
  const months = bankStatementMonths(results);
  const bankItem = checklist.find((i) => i.itemKey === 'bank-3mo');
  if (bankItem && months.length > 0 && months.length < 3 && bankItem.status !== 'NOT_APPLICABLE') {
    checklist = checklist.map((i) =>
      i.itemKey === 'bank-3mo'
        ? {
            ...i,
            status: i.status === 'ACCEPTED' ? 'INCOMPLETE' : i.status === 'MISSING' || i.status === 'REQUESTED' ? 'INCOMPLETE' : i.status,
            deficiency: `Bank statements cover ${months.join(', ')} — 3 distinct months required`,
            verification: i.verification === 'VERIFIED' ? 'UNVERIFIED' : i.verification === 'MISSING' ? 'UNVERIFIED' : i.verification,
          }
        : i,
    );
  }

  const completenessSource = sourceRef({
    capturedAt,
    sourceRecordId: input.opportunity.id,
    field: 'checklist',
  });
  const blocking = requiredOpenItems(checklist);
  const completeness = {
    percent: completenessPercent(checklist),
    requiredCount: checklist.filter((i) => i.requiredness !== 'OPTIONAL' && i.status !== 'NOT_APPLICABLE').length,
    acceptedCount: checklist.filter((i) => i.requiredness !== 'OPTIONAL' && i.status === 'ACCEPTED').length,
    blockingItems: blocking.map((i) => ({ itemKey: i.itemKey, name: i.name, status: i.status })),
    bankStatementMonths: months,
    verification: 'DERIVED' as const,
    sourceRef: completenessSource,
  };

  const missingDocuments = blocking.map((i) => ({
    itemKey: i.itemKey,
    name: i.name,
    status: i.status,
    requiredness: i.requiredness,
    deficiency: i.deficiency,
  }));
  const clientRequest = consolidateMissingRequest(checklist, input.opportunity.clientCode);
  const reviews = results.map((r) => r.review);
  const usedUnverifiedFacts = results.some(
    (r) =>
      r.extraction.ocr === OCR_STUBBED ||
      r.extraction.facts.some((f) => f.verification !== 'VERIFIED') ||
      r.period.verification === 'DERIVED' ||
      r.freshness.verification === 'DERIVED',
  );
  const underwriting =
    input.includeUnderwriting === false
      ? undefined
      : buildUnderwritingSummary({
          opportunity: input.opportunity,
          checklist,
          reviews,
          createdBy: input.createdBy,
        });

  const report: DocumentIntelligenceReport = {
    capitalOpportunityId: input.opportunity.id,
    clientCode: input.opportunity.clientCode,
    asOf: capturedAt,
    documents: results,
    completeness,
    conflicts,
    missingDocuments,
    clientRequest,
    clientRequestSendAttempted: false,
    underwriting,
    usedUnverifiedFacts: Boolean(usedUnverifiedFacts || underwriting?.usedUnverifiedFacts),
    disclaimer: `${AI_DISCLAIMER} ${FINANCING_DISCLAIMER}`,
  };

  const completenessVsRequest: CompletenessVsRequestRow[] = results.map((r) => {
    const item =
      checklist.find((i) => i.id === r.collection.checklistItemId) ||
      checklist.find((i) => i.itemKey === r.collection.suggestedItemKey);
    return {
      documentId: r.documentId,
      itemKey: item?.itemKey || r.collection.suggestedItemKey,
      status: evaluateCompletenessVsRequest({
        result: r,
        item,
        conflicts,
        bankStatementMonths: months,
      }),
    };
  });

  return { report, checklist, reviews, completenessVsRequest };
}
