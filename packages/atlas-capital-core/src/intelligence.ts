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
  type ProvenancedValue,
  type QueueItem,
  type SourceRef,
  type TermSheetOffer,
  type UnderwritingSummary,
  type VerificationState,
  type WorkQueue,
} from './types.ts';
import { completenessPercent, consolidateMissingRequest, requiredOpenItems } from './checklist.ts';

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

export function classifyDocumentName(fileName: string): { documentType: string; confidence: number } {
  const n = fileName.toLowerCase();
  const rules: Array<[RegExp, string]> = [
    [/bank.?stmt|bank.?statement|statement.*bank/, 'bank_statement'],
    [/p&l|profit.?and.?loss|income.?stmt/, 'pnl'],
    [/balance.?sheet/, 'balance_sheet'],
    [/cash.?flow/, 'cash_flow'],
    [/tax.?return|form.?1120|form.?1065|form.?1040/, 'tax_return'],
    [/ar.?aging|accounts.?receivable/, 'ar_aging'],
    [/ap.?aging|accounts.?payable/, 'ap_aging'],
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
  for (const [re, type] of rules) {
    if (re.test(n)) return { documentType: type, confidence: 0.7 };
  }
  return { documentType: 'other', confidence: 0.3 };
}

export function detectDuplicate(existing: CapitalDocument[], incoming: { sha256?: string; fileName: string }): string | undefined {
  if (incoming.sha256) {
    const hit = existing.find((d) => d.sha256 && d.sha256 === incoming.sha256);
    if (hit) return hit.id;
  }
  const nameHit = existing.find((d) => d.fileName.toLowerCase() === incoming.fileName.toLowerCase());
  return nameHit?.id;
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
}): DocumentReview {
  const classified = classifyDocumentName(input.document.fileName);
  const conflicts = [...(input.atlasConflicts || [])];
  const facts: ExtractedFact[] = [];
  for (const f of input.extractedFacts || []) {
    if (!hasSourceRef(f.sourceRef)) {
      conflicts.push(`Dropped ${f.field || 'fact'}: sourceRef required — missing stays missing`);
      continue;
    }
    facts.push({
      ...f,
      verification: (f.verification === 'VERIFIED' ? 'UNVERIFIED' : f.verification) as VerificationState,
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
  const src = sourced ? ` source=${pv.sourceRef.sourceSystem}` : '';
  if (pv.verification === 'VERIFIED' && sourced) return `${amount} (VERIFIED${src})`;
  const grade = pv.verification === 'VERIFIED' && !sourced ? 'UNVERIFIED' : pv.verification;
  return `${amount} (${grade}${src} — not verified)`;
}

function usedUnverifiedMoney(pv: ProvenancedValue<number> | undefined): boolean {
  if (!pv || pv.value == null || pv.verification === 'MISSING') return false;
  if (pv.verification === 'VERIFIED' && hasSourceRef(pv.sourceRef)) return false;
  return true;
}

export function buildUnderwritingSummary(opts: {
  opportunity: CapitalOpportunity;
  checklist: ChecklistItem[];
  reviews: DocumentReview[];
  createdBy: string;
}): UnderwritingSummary {
  const o = opts.opportunity;
  const missing = requiredOpenItems(opts.checklist).map((i) => i.name);
  const revenue = o.business.annualRevenue;
  const ebitda = o.business.ebitda;
  const debt = o.capitalProfile.existingDebt;

  const sections = Object.fromEntries([
    section('Executive Summary', `${o.clientCode} requests ${o.need.requestedAmount != null ? `$${o.need.requestedAmount.toLocaleString()}` : 'an unspecified amount'} for ${o.need.purpose || o.transactionType}. Stage: ${o.stage}.`),
    section('Financing Request', o.need.purpose || 'Not stated'),
    section('Use of Funds', o.need.useOfFunds || 'MISSING'),
    section('Business Overview', [o.business.industry, o.business.naics].filter(Boolean).join(' / ') || 'MISSING'),
    section('Ownership', o.business.ownership || 'MISSING'),
    section('Revenue', moneyClaim(revenue)),
    section('Profitability', moneyClaim(ebitda)),
    section('Debt', moneyClaim(debt)),
    section('Collateral', o.capitalProfile.collateral || 'MISSING'),
    section('Missing Information', missing.length ? missing.join('; ') : 'No required checklist items open'),
    section('Potential Financing Structures', 'Draft only — requires Manny strategy approval before it is an HVCG recommendation.'),
  ]);

  const usedUnverified = Boolean(
    usedUnverifiedMoney(revenue) ||
      usedUnverifiedMoney(ebitda) ||
      usedUnverifiedMoney(debt) ||
      opts.reviews.some((r) => r.extractedFacts.some((f) => f.verification !== 'VERIFIED' || !hasSourceRef(f.sourceRef))),
  );

  return {
    id: `uw-${o.id}`,
    capitalOpportunityId: o.id,
    sections,
    missingInformation: missing,
    expectedQuestions: missing.map((m) => `Please provide ${m}`),
    potentialStructures: [],
    recommendedNextSteps: missing.length
      ? ['Send consolidated missing-document request', 'Do not draft lender-facing strategy until required docs are accepted']
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

export { completenessPercent, consolidateMissingRequest };
export type { CapitalStage };
