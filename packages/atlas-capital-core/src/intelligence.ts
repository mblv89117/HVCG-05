/**
 * Capital intelligence helpers: provenance, AI review, underwriting, strategy,
 * application prep, communications, offers, closing, fees, command center, handoffs.
 * AI never becomes verified financial data.
 */

import { agingBand, daysInStage, isTerminal, type AgingBand } from './stages.ts';
import type { CapitalStage } from './stages.ts';
import {
  AI_DISCLAIMER,
  FINANCING_DISCLAIMER,
  LEGAL_COMPLIANCE_REVIEW_REQUIRED,
  type ApplicationPackage,
  type Attribution,
  type CapitalCommandKpis,
  type CapitalDocument,
  type CapitalOpportunity,
  type ChecklistItem,
  type ClosingCondition,
  type DocumentReview,
  type ExtractedFact,
  type FeeRecord,
  type FinancingStrategy,
  type LenderMatch,
  type LenderMessageClass,
  type MannyStrategyFactRow,
  type MannyStrategyPackage,
  type ProvenancedValue,
  type QueueItem,
  type SourceRef,
  type TermSheetOffer,
  type UnderwritingSummary,
  type VerificationState,
  type WorkQueue,
} from './types.ts';
import { completenessPercent, consolidateMissingRequest, requiredOpenItems } from './checklist.ts';
import { proposeFinancingStructures, structureLines } from './financing-structures.ts';

export function missingValue<T>(): ProvenancedValue<T> {
  return { value: null, verification: 'MISSING', confidence: null };
}

export function verifiedValue<T>(value: T, sourceSystem: string, capturedAt: string, verifiedBy: string): ProvenancedValue<T> {
  return {
    value,
    verification: 'VERIFIED',
    confidence: 1,
    sourceRef: { sourceSystem, capturedAt, capturedBy: verifiedBy },
    verifiedAt: capturedAt,
    verifiedBy,
  };
}

export function derivedValue<T>(value: T, sourceSystem: string, capturedAt: string, field?: string): ProvenancedValue<T> {
  return {
    value,
    verification: 'DERIVED',
    confidence: 0.5,
    sourceRef: { sourceSystem, capturedAt, field },
  };
}

export function cannotPromoteToVerified(state: VerificationState): boolean {
  return state !== 'VERIFIED';
}

/** VERIFIED financials and extracted facts require a SourceRef. Missing stays missing. */
export function hasSourceRef(ref: SourceRef | null | undefined): ref is SourceRef {
  if (!ref || typeof ref.sourceSystem !== 'string' || !ref.sourceSystem.trim()) return false;
  if (!ref.capturedAt || ref.capturedAt === 'MISSING') return false;
  return true;
}

export interface DocumentClassification {
  documentType: string;
  confidence: number;
  signals: string[];
}

const FILENAME_RULES: Array<[RegExp, string]> = [
  [/bank.?stmt|bank.?statement|statement.*bank/, 'bank_statement'],
  [/p&l|profit.?and.?loss|income.?stmt/, 'pnl'],
  [/balance.?sheet/, 'balance_sheet'],
  [/cash.?flow/, 'cash_flow'],
  [/tax.?return|form.?1120|form.?1065|form.?1040/, 'tax_return'],
  [/ar.?aging|accounts.?receivable/, 'ar_aging'],
  [/ap.?aging|accounts.?payable/, 'ap_aging'],
  [/loan.?statement|principal.?balance.?stmt/, 'loan_statement'],
  [/debt.?sched/, 'debt_schedule'],
  [/personal.?financial|form.?413/, 'personal_financial_statement'],
  [/sba/, 'sba_document'],
  [/promissory|note\b/, 'promissory_note'],
  [/purchase.?agreement|psa/, 'purchase_agreement'],
  [/\bloi\b|letter.?of.?intent/, 'loi'],
  [/lease/, 'lease'],
  [/ucc/, 'ucc'],
  [/appraisal/, 'appraisal'],
  [/insur/, 'insurance'],
  [/articles|operating.?agreement|bylaws|formation/, 'formation'],
  [/ownership|cap.?table|stock.?ledger/, 'ownership'],
];

const LOAN_STATEMENT_TEXT =
  /outstanding\s+principal|principal\s+balance|loan\s+number|payment\s+due|interest\s+rate|maturity\s+date/i;
const DEBT_SCHEDULE_TEXT =
  /(?:original\s+amount|current\s+balance).{0,80}(?:monthly\s+payment|maturity).{0,80}(?:lender|rate|collateral)|multiple\s+obligations|debt\s+schedule/i;

function countObligationRows(text: string): number {
  const rows = text.match(/(?:lender|creditor|bank).{0,40}(?:balance|principal|payment)/gi);
  return rows ? new Set(rows.map((r) => r.toLowerCase())).size : 0;
}

/**
 * Filename + native text + keywords. loan_statement and debt_schedule stay distinct.
 * Filename "loan statement" never becomes debt_schedule.
 */
export function classifyDocument(opts: {
  fileName: string;
  text?: string;
  opportunity?: Pick<CapitalOpportunity, 'transactionType' | 'need'>;
}): DocumentClassification {
  const n = opts.fileName.toLowerCase();
  const signals: string[] = [];
  for (const [re, type] of FILENAME_RULES) {
    if (re.test(n)) {
      signals.push(`filename:${type}`);
      let confidence = type === 'loan_statement' || type === 'debt_schedule' ? 0.82 : 0.7;
      const text = opts.text || '';
      if (type === 'loan_statement' && text && LOAN_STATEMENT_TEXT.test(text)) {
        confidence = Math.min(0.92, confidence + 0.08);
        signals.push('text:loan_statement_keywords');
      }
      if (type === 'debt_schedule' && text && (DEBT_SCHEDULE_TEXT.test(text) || countObligationRows(text) >= 2)) {
        confidence = Math.min(0.92, confidence + 0.08);
        signals.push('text:debt_schedule_keywords');
      }
      return { documentType: type, confidence, signals };
    }
  }

  const text = opts.text || '';
  if (text) {
    const loanHits = LOAN_STATEMENT_TEXT.test(text);
    const scheduleHits = DEBT_SCHEDULE_TEXT.test(text) || countObligationRows(text) >= 2;
    if (loanHits && !scheduleHits && !/loan\s+committee|minutes|agenda/i.test(opts.fileName)) {
      signals.push('text:loan_statement_keywords');
      return { documentType: 'loan_statement', confidence: 0.72, signals };
    }
    if (scheduleHits && !/loan.?statement/i.test(n)) {
      signals.push('text:debt_schedule_keywords');
      return { documentType: 'debt_schedule', confidence: 0.72, signals };
    }
    if (/profit\s+and\s+loss|revenue\s*[:\s]+\$?\s*[\d,]+/i.test(text) && /net\s+income/i.test(text)) {
      signals.push('text:pnl_keywords');
      return { documentType: 'pnl', confidence: 0.68, signals };
    }
    if (/ending\s+balance|beginning\s+balance/i.test(text) && /bank/i.test(text)) {
      signals.push('text:bank_statement_keywords');
      return { documentType: 'bank_statement', confidence: 0.68, signals };
    }
  }

  return { documentType: 'other', confidence: 0.3, signals };
}

export function classifyDocumentName(fileName: string): { documentType: string; confidence: number } {
  const classified = classifyDocument({ fileName });
  return { documentType: classified.documentType, confidence: classified.confidence };
}

export function detectDuplicate(
  existing: CapitalDocument[],
  incoming: { sha256?: string; fileName: string; driveId?: string; itemId?: string },
): string | undefined {
  if (incoming.sha256) {
    const hit = existing.find((d) => d.sha256 && d.sha256 === incoming.sha256);
    if (hit) return hit.id;
  }
  // Filename is not identity when SharePoint item ids are present.
  if (incoming.driveId && incoming.itemId) return undefined;
  const nameHit = existing.find((d) => d.fileName.toLowerCase() === incoming.fileName.toLowerCase());
  return nameHit?.id;
}

/** Authorization identity for a SharePoint file — not a content hash. */
export function sharePointItemKey(driveId?: string, itemId?: string): string | null {
  if (!driveId || !itemId) return null;
  return `${driveId}:${itemId}`;
}

export function findDocumentBySharePointItem(
  existing: CapitalDocument[],
  driveId: string,
  itemId: string,
): CapitalDocument | undefined {
  return existing.find((d) => d.driveId === driveId && d.itemId === itemId);
}

export function findDocumentByContentHash(
  existing: CapitalDocument[],
  sha256: string,
  exceptId?: string,
): CapitalDocument | undefined {
  if (!sha256) return undefined;
  return existing.find((d) => d.sha256 === sha256 && d.id !== exceptId);
}

export function reviewDocument(input: {
  document: CapitalDocument;
  extractedFacts?: ExtractedFact[];
  period?: string;
  entityName?: string;
  summary?: string;
  incompletePages?: boolean;
  atlasConflicts?: string[];
  stale?: boolean;
  inconsistentPeriod?: boolean;
  duplicateOf?: string;
  classifiedType?: string;
  classifiedConfidence?: number;
  extractedText?: string;
}): DocumentReview {
  const classified = input.classifiedType
    ? { documentType: input.classifiedType, confidence: input.classifiedConfidence ?? 0.7 }
    : classifyDocument({ fileName: input.document.fileName, text: input.extractedText });
  const conflicts = [...(input.atlasConflicts || [])];
  const facts: ExtractedFact[] = [];
  const counts = new Map<string, number>();
  for (const f of input.extractedFacts || []) {
    if (!hasSourceRef(f.sourceRef)) {
      conflicts.push(`Dropped ${f.field || 'fact'}: sourceRef required — missing stays missing`);
      continue;
    }
    const n = counts.get(f.field) || 0;
    counts.set(f.field, n + 1);
    const demoted =
      f.verification === 'VERIFIED' && !f.reviewerDecision ? 'UNVERIFIED' : f.verification;
    facts.push({
      ...f,
      id: f.id || `fact-${input.document.id}-${f.field}${n ? `-${n}` : ''}`,
      originalValue: f.originalValue ?? f.value,
      verification: demoted as VerificationState,
      documentType: f.documentType || classified.documentType,
      fileName: f.fileName || input.document.fileName,
      driveId: f.driveId || input.document.driveId,
      itemId: f.itemId || input.document.itemId,
      sourceRef: {
        ...f.sourceRef,
        field: f.sourceRef.field || f.field,
        sourceRecordId: f.sourceRef.sourceRecordId || input.document.id,
      },
    });
  }
  return {
    id: `rev-${input.document.id}`,
    documentId: input.document.id,
    capitalOpportunityId: input.document.capitalOpportunityId,
    classifiedType: classified.documentType,
    period: input.period,
    entityName: input.entityName,
    summary: input.summary,
    extractedFacts: facts,
    incompletePages: Boolean(input.incompletePages),
    stale: Boolean(input.stale),
    duplicateOf: input.duplicateOf,
    inconsistentPeriod: Boolean(input.inconsistentPeriod),
    conflicts,
    confidence: classified.confidence,
    reviewer: 'ai',
    createdAt: new Date().toISOString(),
    disclaimer: AI_DISCLAIMER,
  };
}

function section(title: string, body: string): [string, string] {
  return [title, body];
}

/** Material numeric claim: SourceRef citation, or MISSING. VERIFIED without SourceRef is not VERIFIED. */
export function moneyClaim(pv: ProvenancedValue<number> | undefined): string {
  if (pv?.value == null) return 'MISSING';
  const amount = `$${pv.value.toLocaleString()}`;
  const sourced = hasSourceRef(pv.sourceRef);
  const src = sourced ? ` source=${pv.sourceRef!.sourceSystem}` : '';
  if (pv.verification === 'VERIFIED' && sourced) return `${amount} (VERIFIED${src})`;
  const grade = pv.verification === 'VERIFIED' && !sourced ? 'UNVERIFIED' : pv.verification;
  return `${amount} (${grade}${src} — not verified)`;
}

function usedUnverifiedMoney(pv: ProvenancedValue<number> | undefined): boolean {
  if (!pv || pv.value == null || pv.verification === 'MISSING' || pv.verification === 'REJECTED') return false;
  if (pv.verification === 'VERIFIED' && hasSourceRef(pv.sourceRef)) return false;
  return true;
}

const OVERLAY_FIELDS: Record<string, 'revenue' | 'grossProfit' | 'netIncome' | 'cash' | 'ar' | 'debt'> = {
  revenue: 'revenue',
  grossProfit: 'grossProfit',
  netIncome: 'netIncome',
  cash: 'cash',
  ar: 'ar',
  debt: 'debt',
  existingDebt: 'debt',
};

export function factToProvenancedNumber(fact: ExtractedFact): ProvenancedValue<number> | undefined {
  if (typeof fact.value !== 'number' || !hasSourceRef(fact.sourceRef)) return undefined;
  if (fact.verification === 'REJECTED') return undefined;
  const verification =
    fact.verification === 'VERIFIED' ? 'VERIFIED' : fact.verification === 'CONFLICTING' ? 'CONFLICTING' : 'UNVERIFIED';
  return {
    value: fact.value,
    verification,
    confidence: fact.confidence,
    sourceRef: fact.sourceRef,
    obtainedAt: fact.extractionTimestamp,
    verifiedAt: fact.reviewedAt,
    verifiedBy: fact.reviewer,
    notes: fact.fileName,
  };
}

function preferProvenance(
  existing: ProvenancedValue<number> | undefined,
  incoming: ProvenancedValue<number> | undefined,
): ProvenancedValue<number> | undefined {
  if (existing?.value != null && existing.verification === 'VERIFIED' && hasSourceRef(existing.sourceRef)) return existing;
  if (incoming?.value != null && hasSourceRef(incoming.sourceRef)) {
    if (existing?.value != null && existing.verification !== 'MISSING' && incoming.verification !== 'VERIFIED') {
      return existing;
    }
    return incoming;
  }
  return existing;
}

export function overlayOpportunityFromReviews(
  opportunity: CapitalOpportunity,
  reviews: DocumentReview[],
): { opportunity: CapitalOpportunity; facts: Partial<Record<'revenue' | 'grossProfit' | 'netIncome' | 'cash' | 'ar' | 'debt', ProvenancedValue<number>>>; conflicts: string[] } {
  const buckets = new Map<string, ExtractedFact[]>();
  for (const review of reviews) {
    for (const fact of review.extractedFacts) {
      const key = OVERLAY_FIELDS[fact.field];
      if (!key) continue;
      if (!hasSourceRef(fact.sourceRef) || fact.verification === 'REJECTED') continue;
      const list = buckets.get(key) || [];
      list.push(fact);
      buckets.set(key, list);
    }
  }
  const facts: Partial<Record<'revenue' | 'grossProfit' | 'netIncome' | 'cash' | 'ar' | 'debt', ProvenancedValue<number>>> = {};
  const conflicts: string[] = [];
  for (const [key, list] of buckets) {
    const typed = key as keyof typeof facts;
    const verified = list.find((f) => f.verification === 'VERIFIED');
    const chosen = verified || list[0];
    const pv = factToProvenancedNumber(chosen);
    if (!pv) continue;
    if (list.some((f) => f !== chosen && typeof f.value === 'number' && f.value !== chosen.value)) {
      pv.verification = 'CONFLICTING';
      conflicts.push(key);
    }
    facts[typed] = pv;
  }
  return {
    opportunity: {
      ...opportunity,
      business: {
        ...opportunity.business,
        annualRevenue: preferProvenance(opportunity.business.annualRevenue, facts.revenue),
      },
      capitalProfile: {
        ...opportunity.capitalProfile,
        cash: preferProvenance(opportunity.capitalProfile.cash, facts.cash),
        ar: preferProvenance(opportunity.capitalProfile.ar, facts.ar),
        existingDebt: preferProvenance(opportunity.capitalProfile.existingDebt, facts.debt),
      },
    },
    facts,
    conflicts,
  };
}

function snapshotLine(label: string, pv: ProvenancedValue<number> | undefined): string {
  if (!pv || pv.value == null) return `${label}: MISSING`;
  const src = hasSourceRef(pv.sourceRef)
    ? ` SourceRef=${pv.sourceRef.sourceSystem}${pv.sourceRef.sourceRecordId ? `/${pv.sourceRef.sourceRecordId}` : ''}`
    : '';
  const grade = pv.verification === 'VERIFIED' && hasSourceRef(pv.sourceRef) ? 'VERIFIED' : pv.verification === 'CONFLICTING' ? 'CONFLICTING' : 'UNVERIFIED';
  return `${label}: $${pv.value.toLocaleString()} ${grade}${src}`;
}

export function buildUnderwritingSummary(opts: {
  opportunity: CapitalOpportunity;
  checklist: ChecklistItem[];
  reviews: DocumentReview[];
  createdBy: string;
}): UnderwritingSummary {
  const overlaid = overlayOpportunityFromReviews(opts.opportunity, opts.reviews);
  const o = overlaid.opportunity;
  const missing = requiredOpenItems(opts.checklist).map((i) => i.name);
  const revenue = o.business.annualRevenue;
  const ebitda = o.business.ebitda;
  const debt = o.capitalProfile.existingDebt;
  const structures = proposeFinancingStructures(o);
  const structureNarrative = [
    'Draft only — requires Manny strategy approval before it is an HVCG recommendation.',
    ...structureLines(structures),
  ].join(' ');

  const sections = Object.fromEntries([
    section('Executive Summary', `${o.clientCode} requests ${o.need.requestedAmount != null ? `$${o.need.requestedAmount.toLocaleString()}` : 'an unspecified amount'} for ${o.need.purpose || o.transactionType}. Stage: ${o.stage}.`),
    section('Financing Request', o.need.purpose || 'Not stated'),
    section('Use of Funds', o.need.useOfFunds || 'MISSING'),
    section('Business Overview', [o.business.industry, o.business.naics].filter(Boolean).join(' / ') || 'MISSING'),
    section('Ownership', o.business.ownership || 'MISSING'),
    section('Revenue', moneyClaim(revenue)),
    section('Gross Profit', moneyClaim(overlaid.facts.grossProfit)),
    section('Net Income', moneyClaim(overlaid.facts.netIncome)),
    section('Profitability', moneyClaim(ebitda)),
    section('Cash', moneyClaim(o.capitalProfile.cash)),
    section('AR', moneyClaim(o.capitalProfile.ar)),
    section('Debt', moneyClaim(debt)),
    section(
      'Financial Snapshot',
      [
        snapshotLine('Revenue', revenue),
        snapshotLine('Gross Profit', overlaid.facts.grossProfit),
        snapshotLine('Net Income', overlaid.facts.netIncome),
        snapshotLine('Cash', o.capitalProfile.cash),
        snapshotLine('AR', o.capitalProfile.ar),
        snapshotLine('Existing Debt', debt),
        overlaid.conflicts.length ? `Conflicts: ${overlaid.conflicts.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    ),
    section('Collateral', o.capitalProfile.collateral || 'MISSING'),
    section('Missing Information', missing.length ? missing.join('; ') : 'No required checklist items open'),
    section('Potential Financing Structures', structureNarrative),
  ]);

  const usedUnverified = Boolean(
    usedUnverifiedMoney(revenue) ||
      usedUnverifiedMoney(ebitda) ||
      usedUnverifiedMoney(debt) ||
      usedUnverifiedMoney(o.capitalProfile.cash) ||
      usedUnverifiedMoney(o.capitalProfile.ar) ||
      usedUnverifiedMoney(overlaid.facts.grossProfit) ||
      usedUnverifiedMoney(overlaid.facts.netIncome) ||
      opts.reviews.some((r) => r.extractedFacts.some((f) => f.verification !== 'VERIFIED' || !hasSourceRef(f.sourceRef))),
  );

  return {
    id: `uw-${o.id}`,
    capitalOpportunityId: o.id,
    sections,
    missingInformation: missing,
    expectedQuestions: missing.map((m) => `Please provide ${m}`),
    potentialStructures: structureLines(structures),
    recommendedNextSteps: missing.length
      ? ['Send consolidated missing-document request', 'Do not draft lender-facing strategy until required docs are accepted']
      : usedUnverified
        ? ['Verify UNVERIFIED facts in evidence review before lender submission strategy']
        : ['Draft financing strategy for Manny approval'],
    usedUnverifiedFacts: usedUnverified,
    createdAt: new Date().toISOString(),
    createdBy: opts.createdBy,
    disclaimer: `${AI_DISCLAIMER} ${FINANCING_DISCLAIMER}`,
  };
}

export function draftStrategy(opts: {
  opportunity: CapitalOpportunity;
  matches: LenderMatch[];
  underwriting: UnderwritingSummary;
}): FinancingStrategy {
  const o = opts.opportunity;
  const best = opts.matches.filter((m) => m.band === 'BEST_FIT' || m.band === 'POSSIBLE');
  const paths = [
    { rank: 1, name: 'Existing lender expansion', rationale: 'Check current relationships before new outreach.' },
    {
      rank: 2,
      name: o.transactionType.includes('sba') ? 'SBA / government-guaranteed path' : 'Primary product path matching request type',
      rationale: `Transaction type ${o.transactionType}.`,
    },
    { rank: 3, name: 'Fallback / specialty', rationale: 'Use only if primary path is ineligible or stale.' },
  ];
  return {
    id: `strat-${o.id}`,
    capitalOpportunityId: o.id,
    clientCode: o.clientCode,
    needSummary: `${o.clientCode} — ${o.need.requestedAmount != null ? `$${o.need.requestedAmount.toLocaleString()}` : 'amount TBD'} ${o.need.purpose || o.transactionType}`,
    paths,
    strengths: Object.values(opts.underwriting.sections).filter((s) => !s.includes('MISSING')).slice(0, 3),
    risks: opts.underwriting.missingInformation,
    missingInformation: opts.underwriting.missingInformation,
    lenderCandidates: best,
    rationale: 'Decision support only. Manny approval required before this is an HVCG recommendation.',
    mannyApproval: 'PENDING',
    createdAt: new Date().toISOString(),
    disclaimer: FINANCING_DISCLAIMER,
  };
}

export function applyMannyDecision<T extends { mannyApproval: FinancingStrategy['mannyApproval'] }>(
  record: T,
  decision: 'APPROVED' | 'REJECTED' | 'REVISE',
  actor: string,
  at = new Date().toISOString(),
): T & { approvedBy?: string; approvedAt?: string } {
  return {
    ...record,
    mannyApproval: decision === 'APPROVED' ? 'APPROVED' : decision === 'REJECTED' ? 'REJECTED' : 'REVISE',
    approvedBy: actor,
    approvedAt: at,
  };
}

export function prepareApplication(opts: {
  opportunity: CapitalOpportunity;
  lenderId: string;
  productId?: string;
  fieldMap: Record<string, { from: 'opportunity' | 'profile'; path: string }>;
  documents: CapitalDocument[];
}): ApplicationPackage {
  const populated: ApplicationPackage['populatedFields'] = {};
  const missing: ApplicationPackage['missingFields'] = [];

  const amount = opts.opportunity.need.requestedAmount;
  if (amount != null) {
    populated.requestedAmount = { value: amount, verification: 'VERIFIED' };
  } else {
    missing.push({ field: 'requestedAmount', requiredFrom: 'MANNY_INPUT_REQUIRED' });
  }

  const revenue = opts.opportunity.business.annualRevenue;
  if (revenue?.verification === 'VERIFIED' && revenue.value != null) {
    populated.annualRevenue = { value: revenue.value, verification: 'VERIFIED' };
  } else {
    missing.push({ field: 'annualRevenue', requiredFrom: 'CLIENT_INPUT_REQUIRED' });
  }

  const legal = opts.opportunity.clientCode;
  populated.clientCode = { value: legal, verification: 'VERIFIED' };

  return {
    id: `app-${opts.opportunity.id}-${opts.lenderId}`,
    capitalOpportunityId: opts.opportunity.id,
    lenderId: opts.lenderId,
    productId: opts.productId,
    populatedFields: populated,
    missingFields: missing,
    attachedDocumentIds: opts.documents.filter((d) => d.capitalOpportunityId === opts.opportunity.id).map((d) => d.id),
    status: missing.length ? 'BLOCKED_MISSING_FIELDS' : 'PREPARED',
    createdAt: new Date().toISOString(),
  };
}

export function classifyLenderMessage(text: string): { classification: LenderMessageClass; requestedItems: string[]; dueDate?: string } {
  const t = text.toLowerCase();
  let classification: LenderMessageClass = 'OTHER';
  if (/\bterm sheet\b/.test(t)) classification = 'TERM_SHEET';
  else if (/\bfunded\b|\bwired\b/.test(t)) classification = 'FUNDED';
  else if (/\bdeclin/.test(t)) classification = 'DECLINE';
  else if (/\bconditional.?approv/.test(t)) classification = 'CONDITIONAL_APPROVAL';
  else if (/\bclosing condition/.test(t)) classification = 'CLOSING_CONDITION';
  else if (/\badditional information\b|\brfi\b|\bneed the following/.test(t)) classification = 'REQUEST_FOR_INFORMATION';
  else if (/\bmissing (doc|item)/.test(t) || /\bplease (send|provide|upload)/.test(t)) classification = 'MISSING_DOCUMENT';
  else if (/\bunderwriting\b|\bcredit committee\b/.test(t)) classification = 'UNDERWRITING_QUESTION';
  else if (/\breceived\b|\backnowledg/.test(t)) classification = 'ACKNOWLEDGMENT';
  else if (/\boffer\b/.test(t)) classification = 'TERM_SHEET';

  const requestedItems: string[] = [];
  for (const line of text.split(/\n|;/)) {
    const m = /^\s*[-*]\s+(.+)/.exec(line);
    if (m) requestedItems.push(m[1].trim());
  }
  const due = /\bby (\d{4}-\d{2}-\d{2})\b/i.exec(text)?.[1];
  return { classification, requestedItems, dueDate: due };
}

export function compareOffers(offers: TermSheetOffer[]): {
  rows: TermSheetOffer[];
  notes: string[];
  disclaimer: string;
} {
  const notes: string[] = [];
  if (offers.length < 2) notes.push('Fewer than two offers — comparison is informational only.');
  const withRate = offers.filter((o) => typeof o.interestRate === 'number');
  if (withRate.length >= 2) {
    const sorted = withRate.slice().sort((a, b) => (a.interestRate || 0) - (b.interestRate || 0));
    notes.push(`Lowest stated rate: ${sorted[0].lenderName} at ${sorted[0].interestRate}%. Rate is not effective cost unless fees and term are comparable.`);
  }
  for (const o of offers) {
    if (!o.assumptions.length) notes.push(`${o.lenderName}: no assumptions recorded — do not treat figures as complete.`);
  }
  return { rows: offers, notes, disclaimer: FINANCING_DISCLAIMER };
}

export function defaultClosingConditions(transactionType: string, now = new Date().toISOString()): ClosingCondition[] {
  const names = [
    'Final underwriting clearance',
    'Entity documentation current',
    'Insurance binders',
    'Borrower authorizations / resolutions',
    'Guarantees (if applicable)',
    'Funding instructions',
    'Legal documents / signatures',
  ];
  if (transactionType.includes('real_estate') || transactionType === 'construction' || transactionType === 'commercial_real_estate') {
    names.push('Appraisal', 'Title', 'Landlord approvals');
  }
  if (transactionType === 'refinance' || transactionType === 'acquisition' || transactionType === 'asset_based_lending') {
    names.push('UCC / lien search', 'Payoff / lien release');
  }
  return names.map((name, idx) => ({
    id: `cl-${idx + 1}`,
    capitalOpportunityId: '',
    name,
    owner: 'hvcg',
    status: 'open' as const,
    notes: `Generated ${now}`,
  }));
}

export function feeRequiresLegalReview(feeType: string): boolean {
  return /securit|equity|investment|m&a|merger|acquisition fee|transaction.?based|success fee|tail/i.test(feeType);
}

export function createFeeRecord(input: Omit<FeeRecord, 'id' | 'legalComplianceReviewRequired' | 'approvalStatus' | 'invoiceStatus' | 'paymentStatus'> & Partial<FeeRecord>): FeeRecord {
  const legal = input.legalComplianceReviewRequired ?? feeRequiresLegalReview(input.feeType);
  return {
    id: input.id || `fee-${Date.now()}`,
    clientCode: input.clientCode,
    engagementId: input.engagementId,
    capitalOpportunityId: input.capitalOpportunityId,
    executedAgreementRef: input.executedAgreementRef,
    feeType: input.feeType,
    feeFormula: input.feeFormula,
    startDate: input.startDate,
    earnedEvent: input.earnedEvent,
    tailStart: input.tailStart,
    tailEnd: input.tailEnd,
    lenderId: input.lenderId,
    approvalStatus: input.approvalStatus || 'PENDING',
    invoiceStatus: input.invoiceStatus || 'not_invoiced',
    paymentStatus: input.paymentStatus || 'unpaid',
    legalComplianceReviewRequired: legal,
    notes: legal
      ? `${LEGAL_COMPLIANCE_REVIEW_REQUIRED}. ${input.notes || ''}`.trim()
      : input.notes,
  };
}

export function queueFor(opportunity: CapitalOpportunity, checklist: ChecklistItem[]): WorkQueue {
  if (opportunity.stage === 'Funded' || opportunity.stage === 'ClosedArchived') return 'FUNDED';
  if (opportunity.stage === 'Closing') return 'CLOSING';
  if (opportunity.stage === 'TermSheetOfferReceived' || opportunity.stage === 'OfferComparison' || opportunity.stage === 'ClientDecision') {
    return 'OFFERS_RECEIVED';
  }
  if (opportunity.stage === 'AwaitingMannyStrategyApproval' || opportunity.stage === 'AwaitingMannyShortlistApproval') {
    return 'AWAITING_MANNY';
  }
  if (
    opportunity.stage === 'Submitted' ||
    opportunity.stage === 'Underwriting' ||
    opportunity.stage === 'AdditionalInformationRequested' ||
    opportunity.stage === 'LenderVendorResearch'
  ) {
    return 'AWAITING_LENDER';
  }
  const clientDocs = requiredOpenItems(checklist).some((i) => i.responsibleParty === 'client');
  if (clientDocs || opportunity.stage === 'DocumentsRequested' || opportunity.stage === 'DocumentsInProgress') {
    return 'AWAITING_CLIENT';
  }
  return 'NEEDS_ATTENTION';
}

export function toQueueItem(opportunity: CapitalOpportunity, checklist: ChecklistItem[], now = new Date()): QueueItem {
  const agingDays = daysInStage(opportunity.stageEnteredAt, now);
  return {
    opportunityId: opportunity.id,
    title: opportunity.title,
    clientCode: opportunity.clientCode,
    stage: opportunity.stage,
    queue: queueFor(opportunity, checklist),
    nextAction: opportunity.nextAction,
    due: opportunity.nextActionDue,
    agingDays,
    aging: agingBand(agingDays, opportunity.nextActionDue, now) as AgingBand,
    blocker: opportunity.blockers,
  };
}

export function commandKpis(
  opportunities: CapitalOpportunity[],
  checklists: Map<string, ChecklistItem[]>,
  offers: TermSheetOffer[],
  fees: FeeRecord[],
  now = new Date(),
): CapitalCommandKpis {
  const active = opportunities.filter((o) => !isTerminal(o.stage) || o.stage === 'Funded');
  const live = opportunities.filter((o) => !isTerminal(o.stage));
  return {
    activeOpportunities: live.length,
    totalRequested: live.reduce((s, o) => s + (o.need.requestedAmount || 0), 0),
    documentsBlocked: live.reduce((s, o) => s + requiredOpenItems(checklists.get(o.id) || []).length, 0),
    clientActionsOverdue: live.filter((o) => o.nextActionDue && Date.parse(o.nextActionDue) < now.getTime() && queueFor(o, checklists.get(o.id) || []) === 'AWAITING_CLIENT').length,
    lenderResponsesDue: live.filter((o) => o.stage === 'Submitted' || o.stage === 'Underwriting' || o.stage === 'AdditionalInformationRequested').length,
    mannyApprovalsRequired: live.filter((o) => o.stage === 'AwaitingMannyStrategyApproval' || o.stage === 'AwaitingMannyShortlistApproval').length,
    offersReceived: offers.length,
    transactionsClosing: live.filter((o) => o.stage === 'Closing').length,
    recentlyFunded: opportunities.filter((o) => o.stage === 'Funded').length,
    feeReceivableOpen: fees.filter((f) => f.paymentStatus !== 'paid' && f.invoiceStatus !== 'void').length,
  };
}

export function evaHandoffAllowed(annualRevenue: number | null | undefined): {
  route: 'atlas_hvcg' | 'nurture_360';
  reason: string;
} {
  if (annualRevenue == null) {
    return { route: 'nurture_360', reason: 'Revenue unknown — do not auto-consume Manny time' };
  }
  if (annualRevenue >= 2_000_000) {
    return { route: 'atlas_hvcg', reason: 'Approximately $2M+ — Atlas HVCG opportunity path' };
  }
  return { route: 'nurture_360', reason: 'Under ~$2M — useful report / nurture / 360 / scalable tools' };
}

export function preserveAttribution(input: Attribution): Attribution {
  return { ...input };
}

function factRow(field: string, pv: ProvenancedValue<number | string> | undefined): MannyStrategyFactRow | { missing: string } {
  if (!pv || pv.value == null || pv.verification === 'MISSING' || pv.verification === 'REJECTED') {
    return { missing: field };
  }
  const value = typeof pv.value === 'number' ? `$${pv.value.toLocaleString()}` : String(pv.value);
  const sourced = hasSourceRef(pv.sourceRef);
  const verification =
    pv.verification === 'VERIFIED' && sourced ? 'VERIFIED' : pv.verification === 'VERIFIED' && !sourced ? 'UNVERIFIED' : pv.verification;
  return { field, value, verification };
}

export function buildMannyStrategyPackage(opts: {
  opportunity: CapitalOpportunity;
  matches: LenderMatch[];
  checklist?: ChecklistItem[];
  risks?: string[];
}): MannyStrategyPackage {
  const o = opts.opportunity;
  const structures = proposeFinancingStructures(o);
  const candidates = opts.matches.filter((m) => m.band !== 'INELIGIBLE');
  const verified: MannyStrategyFactRow[] = [];
  const unverified: MannyStrategyFactRow[] = [];
  const missing: string[] = [];

  const moneyFacts: Array<[string, ProvenancedValue<number> | undefined]> = [
    ['annualRevenue', o.business.annualRevenue],
    ['ebitda', o.business.ebitda],
    ['cash', o.capitalProfile.cash],
    ['ar', o.capitalProfile.ar],
    ['inventory', o.capitalProfile.inventory],
    ['existingDebt', o.capitalProfile.existingDebt],
    ['monthlyDebtService', o.capitalProfile.monthlyDebtService],
  ];
  for (const [field, pv] of moneyFacts) {
    const row = factRow(field, pv);
    if ('missing' in row) missing.push(row.missing);
    else if (row.verification === 'VERIFIED') verified.push(row);
    else unverified.push(row);
  }
  if (o.business.yearsInBusiness?.value == null || o.business.yearsInBusiness.verification === 'MISSING') {
    missing.push('yearsInBusiness');
  } else {
    const row = factRow('yearsInBusiness', o.business.yearsInBusiness);
    if (!('missing' in row)) {
      if (row.verification === 'VERIFIED') verified.push({ ...row, value: String(o.business.yearsInBusiness.value) });
      else unverified.push({ ...row, value: String(o.business.yearsInBusiness.value) });
    }
  }
  if (o.need.requestedAmount == null) missing.push('requestedAmount');
  if (!o.need.useOfFunds && !o.need.purpose) missing.push('useOfFunds');
  if (opts.checklist?.length) {
    for (const item of requiredOpenItems(opts.checklist)) missing.push(item.name);
  }

  const risks = [
    ...(opts.risks || []),
    ...unverified.map((f) => `Unverified fact in package: ${f.field}`),
    ...candidates
      .filter((m) => (m.unknownCriticalCriteria || []).length > 0 && m.band === 'BEST_FIT')
      .map((m) => `BEST_FIT with unknown critical criteria is invalid (${m.productName || m.lenderName})`),
    'Historical HVCG outreach is context, not approval certainty.',
    'No external lender submission is performed by this package.',
  ];

  return {
    capitalOpportunityId: o.id,
    clientCode: o.clientCode,
    need: {
      requestedAmount: o.need.requestedAmount,
      purpose: o.need.purpose,
      transactionType: o.transactionType,
    },
    useOfFunds: o.need.useOfFunds || o.need.purpose || 'MISSING',
    facts: { verified, unverified, missing: [...new Set(missing)] },
    risks: [...new Set(risks.filter(Boolean))],
    structures,
    lenderCandidates: candidates.map((m) => ({
      lenderId: m.lenderId,
      lenderName: m.lenderName,
      productId: m.productId,
      productName: m.productName,
      band: m.band,
      why: m.explanations.filter((e) => e.outcome === 'met').map((e) => e.statement),
      unknown: [
        ...m.missingCriteria,
        ...m.explanations.filter((e) => e.outcome === 'unknown' || e.outcome === 'degraded').map((e) => e.statement),
      ],
      stale: m.stale,
      historicalContext: m.historicalIntelligence?.explanation,
      unknownCriticalCriteria: m.unknownCriticalCriteria,
      supportedCriteria: m.supportedCriteria,
      disqualifiers: m.disqualifiers,
    })),
    mannyWorkflow: {
      approve: 'APPROVED',
      revise: 'REVISE',
      reject: 'REJECTED',
      externalSubmit: false,
    },
    reviewStatus: 'PENDING_MANNY',
    disclaimer: FINANCING_DISCLAIMER,
  };
}

export { completenessPercent, consolidateMissingRequest };
export type { CapitalStage };
