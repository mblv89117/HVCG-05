/**
 * Lender matching — decision support only.
 * Reuses HVCG_Lenders + HVCG_LenderOutreach. Product rows are an in-app contract only —
 * live tenant has no HVCG_LenderProducts list; do not provision one for this slice.
 * Never invents criteria or underwriting policy as VERIFIED.
 * Stale or missing criteria cannot produce BEST_FIT. Bands only — no percent scores.
 * Every explanation carries a SourceRef. Historical HVCG outreach is context, not a fit.
 */

import { FINANCING_DISCLAIMER } from './types.ts';
import type {
  CapitalOpportunity,
  CapitalProfile,
  HistoricalLenderAggregate,
  HistoricalLenderIntelligence,
  HistoricalOutcome,
  HistoricalSameClientContext,
  HvcgLenderExperience,
  LenderFilterRecord,
  LenderMatch,
  LenderMatchRun,
  LenderOrganization,
  LenderProduct,
  LenderSubmission,
  MatchBand,
  MatchExplanation,
  OpportunityClientIndexRow,
  OutreachHistorySnapshot,
  SourceRef,
  LenderFreshness,
} from './types.ts';

export const CRITERIA_STALE_DAYS = 180;

export interface LenderMatchContext {
  outreach?: LenderSubmission[];
  profile?: CapitalProfile;
  /** Maps opportunity id → ClientCode only. Never include titles or amounts. */
  opportunityClientIndex?: OpportunityClientIndexRow[];
}

function missingCapturedAt(): string {
  return 'MISSING';
}

export function productSourceRef(product: LenderProduct, field: string): SourceRef {
  return {
    sourceSystem: product.source || 'HVCG_LenderProducts',
    sourceRecordId: product.id,
    field,
    capturedAt: product.lastVerifiedAt || missingCapturedAt(),
    capturedBy: product.verifiedBy,
  };
}

export function lenderSourceRef(lender: LenderOrganization, field: string): SourceRef {
  return {
    sourceSystem: lender.verificationSource || 'HVCG_Lenders',
    sourceRecordId: lender.id,
    field,
    capturedAt: lender.lastVerifiedAt || missingCapturedAt(),
    capturedBy: lender.relationshipOwner,
  };
}

function opportunitySourceRef(opportunity: CapitalOpportunity, field: string, existing?: SourceRef): SourceRef {
  if (existing?.sourceSystem) return { ...existing, field: existing.field || field };
  return {
    sourceSystem: 'HVCG_CapitalOpportunities',
    sourceRecordId: opportunity.id,
    field,
    capturedAt: opportunity.updatedAt || opportunity.createdAt || missingCapturedAt(),
  };
}

function pushExplanation(
  explanations: MatchExplanation[],
  explanation: MatchExplanation,
): void {
  explanations.push(explanation);
}

function citeUnevaluableStatedField(
  explanations: MatchExplanation[],
  product: LenderProduct,
  criterion: string,
  field: string,
  value: number | null | undefined,
  statement: string,
): void {
  if (value == null) return;
  pushExplanation(explanations, {
    criterion,
    statement,
    outcome: 'context',
    sourceRef: productSourceRef(product, field),
  });
}

function citeUnstructuredNote(
  explanations: MatchExplanation[],
  product: LenderProduct,
  criterion: string,
  field: string,
  value: string | undefined,
): void {
  if (!value || !value.trim()) return;
  pushExplanation(explanations, {
    criterion,
    statement: `${field} is unstructured sourced text and was not parsed into matching criteria or treated as VERIFIED policy`,
    outcome: 'context',
    sourceRef: productSourceRef(product, field),
  });
}

function isDoNotContact(status: string | undefined): boolean {
  const v = (status || '').trim().toLowerCase().replace(/[_-]+/g, ' ');
  return v === 'do not contact';
}

function honestFreshness(input: {
  freshness?: LenderFreshness;
  lastVerifiedAt?: string;
  source?: string;
  verifiedBy?: string;
}, now: Date): LenderFreshness {
  const labeled = input.freshness || 'UNKNOWN';
  if (!input.lastVerifiedAt) {
    return labeled === 'STALE' ? 'STALE' : 'UNKNOWN';
  }
  const verified = Date.parse(input.lastVerifiedAt);
  if (!Number.isFinite(verified)) return 'UNKNOWN';
  const days = (now.getTime() - verified) / 86_400_000;
  if (days > CRITERIA_STALE_DAYS) return 'STALE';
  if (!input.source || !input.verifiedBy) return 'UNKNOWN';
  if (labeled === 'STALE') return 'STALE';
  if (labeled === 'UNKNOWN') return 'UNKNOWN';
  return 'CURRENT';
}

export function productFreshness(product: LenderProduct, now = new Date()): LenderProduct {
  return {
    ...product,
    freshness: honestFreshness(
      {
        freshness: product.freshness,
        lastVerifiedAt: product.lastVerifiedAt,
        source: product.source,
        verifiedBy: product.verifiedBy,
      },
      now,
    ),
  };
}

export function organizationFreshness(lender: LenderOrganization, now = new Date()): LenderFreshness {
  return honestFreshness(
    {
      freshness: lender.freshness,
      lastVerifiedAt: lender.lastVerifiedAt,
      source: lender.verificationSource,
      // HVCG_Lenders has VerificationSource, not VerifiedBy.
      verifiedBy: lender.verificationSource,
    },
    now,
  );
}

export function applyClientCapitalProfile(
  opportunity: CapitalOpportunity,
  profile?: CapitalProfile,
): CapitalOpportunity {
  if (!profile) return opportunity;
  const industry =
    opportunity.business.industry ||
    (profile.industry?.value && profile.industry.verification !== 'MISSING' ? profile.industry.value : undefined);
  const revenue = opportunity.business.annualRevenue;
  const profileRevenue = profile.revenue;
  const annualRevenue =
    revenue && revenue.verification !== 'MISSING' && revenue.value != null
      ? revenue
      : profileRevenue && profileRevenue.verification !== 'MISSING' && profileRevenue.value != null
        ? profileRevenue
        : revenue || profileRevenue;
  return {
    ...opportunity,
    business: {
      ...opportunity.business,
      industry,
      naics: opportunity.business.naics || (profile.naics?.value && profile.naics.verification !== 'MISSING' ? profile.naics.value : undefined),
      annualRevenue: annualRevenue,
      yearsInBusiness:
        opportunity.business.yearsInBusiness?.value != null
          ? opportunity.business.yearsInBusiness
          : undefined,
    },
    capitalProfile: {
      ...opportunity.capitalProfile,
      existingDebt:
        opportunity.capitalProfile.existingDebt?.value != null
          ? opportunity.capitalProfile.existingDebt
          : profile.existingDebt,
      monthlyDebtService:
        opportunity.capitalProfile.monthlyDebtService?.value != null
          ? opportunity.capitalProfile.monthlyDebtService
          : profile.monthlyDebtService,
      collateral: opportunity.capitalProfile.collateral || profile.collateral?.value || undefined,
      cash: opportunity.capitalProfile.cash?.value != null ? opportunity.capitalProfile.cash : profile.cash,
      ar: opportunity.capitalProfile.ar?.value != null ? opportunity.capitalProfile.ar : profile.ar,
      inventory:
        opportunity.capitalProfile.inventory?.value != null
          ? opportunity.capitalProfile.inventory
          : profile.inventory,
    },
  };
}

const HISTORICAL_CONTEXT_DISCLAIMER =
  'Historical contact is context, not a product fit, and is not future approval certainty.';
const TINY_SAMPLE_DISCLAIMER =
  'This sample is too small for rates, likelihood, or other statistical claims.';

export function normalizeLenderName(name: string | undefined): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function outreachBelongsToLender(
  row: LenderSubmission,
  lender: { id: string; name?: string },
): boolean {
  if (row.lenderId && row.lenderId === lender.id) return true;
  const rowName = normalizeLenderName(row.lenderName);
  const lenderName = normalizeLenderName(lender.name);
  return Boolean(rowName && lenderName && rowName === lenderName);
}

function rowsForLender(
  outreach: LenderSubmission[] | undefined,
  lender: { id: string; name?: string },
): LenderSubmission[] {
  return (outreach || []).filter((s) => outreachBelongsToLender(s, lender));
}

function outreachSourceRef(row: LenderSubmission, field = 'SubmissionStatus'): SourceRef {
  return {
    sourceSystem: 'HVCG_LenderOutreach',
    sourceRecordId: row.id,
    field,
    capturedAt: row.submittedAt || missingCapturedAt(),
    capturedBy: row.submittedBy,
  };
}

function lenderLevelOutreachRef(lenderId: string, last?: LenderSubmission): SourceRef {
  return {
    sourceSystem: 'HVCG_LenderOutreach',
    sourceRecordId: lenderId,
    field: 'LenderId',
    capturedAt: last?.submittedAt || missingCapturedAt(),
  };
}

function sortOutreach(rows: LenderSubmission[]): LenderSubmission[] {
  return rows
    .slice()
    .sort((a, b) => Date.parse(b.submittedAt || '') - Date.parse(a.submittedAt || '') || a.id.localeCompare(b.id));
}

export function deriveHistoricalOutcome(row: LenderSubmission): HistoricalOutcome {
  const response = row.response;
  const status = row.status;
  const message = row.messageClass;
  const approved =
    status === 'offer' ||
    response === 'Term Sheet' ||
    message === 'TERM_SHEET' ||
    message === 'CONDITIONAL_APPROVAL' ||
    message === 'FUNDED';
  const declined =
    status === 'declined' || response === 'Declined' || response === 'Pass' || message === 'DECLINE';
  if (approved && declined) return 'unknown';
  if (approved) return 'approved';
  if (declined) return 'declined';
  return 'unknown';
}

function extraDocsRequested(row: LenderSubmission): boolean {
  return (
    row.status === 'rfi' ||
    row.messageClass === 'REQUEST_FOR_INFORMATION' ||
    row.messageClass === 'MISSING_DOCUMENT'
  );
}

function fundedRow(row: LenderSubmission): boolean {
  return row.messageClass === 'FUNDED';
}

function countOutreach(rows: LenderSubmission[]): {
  outreachCount: number;
  submittedCount: number;
  declinedCount: number;
  offerCount: number;
  fundedCount: number;
  extraDocsRequestedCount: number;
  last?: LenderSubmission;
  lastOutcome: HistoricalOutcome;
} {
  const sorted = sortOutreach(rows);
  const last = sorted.find((s) => s.submittedAt) || sorted[0];
  return {
    outreachCount: rows.length,
    submittedCount: rows.filter((s) => s.status !== 'draft' && s.status !== 'withdrawn').length,
    declinedCount: rows.filter((s) => deriveHistoricalOutcome(s) === 'declined' || s.status === 'declined').length,
    offerCount: rows.filter(
      (s) => s.status === 'offer' || s.response === 'Term Sheet' || s.messageClass === 'TERM_SHEET',
    ).length,
    fundedCount: rows.filter(fundedRow).length,
    extraDocsRequestedCount: rows.filter(extraDocsRequested).length,
    last,
    lastOutcome: last ? deriveHistoricalOutcome(last) : 'unknown',
  };
}

function toAggregate(counted: ReturnType<typeof countOutreach>): HistoricalLenderAggregate {
  const last = counted.last;
  return {
    outreachCount: counted.outreachCount,
    submittedCount: counted.submittedCount,
    declinedCount: counted.declinedCount,
    offerCount: counted.offerCount,
    fundedCount: counted.fundedCount,
    extraDocsRequestedCount: counted.extraDocsRequestedCount,
    lastStatus: last?.status,
    lastResponse: last?.response,
    lastMessageClass: last?.messageClass,
    lastOutreachAt: last?.submittedAt,
    lastOutcome: counted.lastOutcome,
    productKnown: false,
    requestSizeKnown: false,
    declineReasonKnown: false,
    exceptionsKnown: false,
    responseTimeKnown: false,
    fundedOutcome: counted.fundedCount > 0 ? 'funded' : 'not_recorded',
  };
}

export function summarizeHvcgExperience(
  outreach: LenderSubmission[] | undefined,
  lenderId: string,
  lenderName?: string,
): HvcgLenderExperience | undefined {
  const rows = rowsForLender(outreach, { id: lenderId, name: lenderName });
  if (!rows.length) return undefined;
  const counted = countOutreach(rows);
  return {
    outreachCount: counted.outreachCount,
    submittedCount: counted.submittedCount,
    declinedCount: counted.declinedCount,
    offerCount: counted.offerCount,
    fundedCount: counted.fundedCount,
    extraDocsRequestedCount: counted.extraDocsRequestedCount,
    lastOutreachAt: counted.last?.submittedAt,
    lastResponse: counted.last?.response,
    lastMessageClass: counted.last?.messageClass,
    lastSubmissionStatus: counted.last?.status,
    lastOutcome: counted.lastOutcome,
    sourceRefs: rows.map((row) => outreachSourceRef(row)),
  };
}

function clientCodeForSubmission(
  row: LenderSubmission,
  index: OpportunityClientIndexRow[] | undefined,
): string | undefined {
  const hit = (index || []).find((o) => o.id === row.capitalOpportunityId);
  return hit?.clientCode;
}

/**
 * Explainable HVCG_LenderOutreach context for a lender.
 * Historical contact is not a fit and is not future certainty.
 * Cross-client: another client's opportunity/title/amount is never attached
 * to output visible under a different ClientCode. LenderId aggregates omit identifiers.
 */
export function summarizeHistoricalLenderIntelligence(input: {
  outreach?: LenderSubmission[];
  lenderId: string;
  lenderName?: string;
  viewingClientCode?: string;
  opportunityClientIndex?: OpportunityClientIndexRow[];
}): HistoricalLenderIntelligence | undefined {
  const rows = rowsForLender(input.outreach, { id: input.lenderId, name: input.lenderName });
  if (!rows.length) return undefined;

  const viewing = (input.viewingClientCode || '').trim();
  const sameClientRows = viewing
    ? rows.filter((s) => clientCodeForSubmission(s, input.opportunityClientIndex) === viewing)
    : [];
  const aggregate = countOutreach(rows);
  const same = countOutreach(sameClientRows);
  const sourceRefs = viewing
    ? sameClientRows.map((row) => outreachSourceRef(row))
    : [lenderLevelOutreachRef(input.lenderId, aggregate.last)];
  const contacted = viewing ? same.outreachCount > 0 : aggregate.outreachCount > 0;

  const sameAmountHits = viewing
    ? sameClientRows
        .map((s) => (input.opportunityClientIndex || []).find((o) => o.id === s.capitalOpportunityId))
        .filter((row): row is OpportunityClientIndexRow => row != null && row.clientCode === viewing)
        .map((row) => row.requestedAmount)
        .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    : [];
  const sameClient: HistoricalSameClientContext = {
    outreachCount: same.outreachCount,
    lastStatus: same.last?.status,
    lastResponse: same.last?.response,
    lastMessageClass: same.last?.messageClass,
    lastOutreachAt: same.last?.submittedAt,
    lastOutcome: same.lastOutcome,
    requestSizeKnown: sameAmountHits.length > 0,
    requestedAmount: sameAmountHits.length ? sameAmountHits[0] : undefined,
    productKnown: false,
    declineReasonKnown: false,
    extraDocsRequestedCount: same.extraDocsRequestedCount,
    fundedCount: same.fundedCount,
  };

  const parts: string[] = [];
  if (viewing) {
    parts.push(
      contacted
        ? `HVCG recorded ${same.outreachCount} outreach row(s) for this client at this lender; last status ${same.last?.status || 'unknown'}; last outcome ${same.lastOutcome}.`
        : 'HVCG has no sourced outreach rows for this client at this lender.',
    );
    if (aggregate.outreachCount > same.outreachCount) {
      parts.push(
        `HVCG also recorded ${aggregate.outreachCount - same.outreachCount} other outreach row(s) to this lender (counts only; other-client opportunity/title/amount omitted).`,
      );
    }
  } else {
    parts.push(
      `HVCG recorded ${aggregate.outreachCount} outreach row(s) to this lender; last status ${aggregate.last?.status || 'unknown'}; last outcome ${aggregate.lastOutcome}.`,
    );
  }
  if (aggregate.extraDocsRequestedCount) {
    parts.push(`Extra-document requests recorded on ${aggregate.extraDocsRequestedCount} row(s).`);
  }
  if (aggregate.fundedCount) {
    parts.push(`Funded outcome recorded on ${aggregate.fundedCount} row(s).`);
  }
  parts.push(HISTORICAL_CONTEXT_DISCLAIMER);
  if (aggregate.outreachCount < 5) parts.push(TINY_SAMPLE_DISCLAIMER);

  return {
    lenderId: input.lenderId,
    contacted,
    sameClient,
    lenderAggregate: toAggregate(aggregate),
    notAFit: true,
    notFutureCertainty: true,
    notAStatisticalClaim: true,
    explanation: parts.join(' '),
    sourceRefs,
  };
}

const OUTREACH_HISTORY_DISCLAIMER = `${HISTORICAL_CONTEXT_DISCLAIMER} ${TINY_SAMPLE_DISCLAIMER} Product, decline reason, exceptions, and response time stay unknown unless sourced on the outreach row.`;

export function buildOutreachHistorySnapshot(input: {
  outreach?: LenderSubmission[];
  lenders?: Array<{ id: string; name?: string }>;
}): OutreachHistorySnapshot {
  const rows = input.outreach || [];
  const lenders = input.lenders || [];
  const used = new Set<string>();
  const out: OutreachHistorySnapshot['lenders'] = [];

  for (const lender of lenders) {
    const hits = rowsForLender(rows, lender);
    if (!hits.length) continue;
    for (const row of hits) used.add(row.id);
    const counted = countOutreach(hits);
    out.push({
      lenderId: lender.id,
      lenderName: lender.name,
      unresolved: false,
      signals: toAggregate(counted),
    });
  }

  const unresolved = rows.filter((row) => !used.has(row.id));
  if (unresolved.length) {
    const counted = countOutreach(unresolved);
    out.push({
      lenderId: 'unresolved',
      unresolved: true,
      signals: toAggregate(counted),
    });
  }

  return {
    sourceSystem: 'HVCG_LenderOutreach',
    rowCount: rows.length,
    mappedRowCount: rows.length - unresolved.length,
    unresolvedRowCount: unresolved.length,
    lendersWithOutreach: out.filter((row) => !row.unresolved).length,
    isolation: {
      clientIdentifiersOmitted: true,
      amountsOmitted: true,
      notesOmitted: true,
      titlesOmitted: true,
    },
    notAFit: true,
    notFutureCertainty: true,
    notAStatisticalClaim: true,
    disclaimer: OUTREACH_HISTORY_DISCLAIMER,
    lenders: out,
  };
}

export function filterLenderUniverse(lenders: LenderOrganization[]): {
  eligible: LenderOrganization[];
  filteredOut: LenderFilterRecord[];
} {
  const eligible: LenderOrganization[] = [];
  const filteredOut: LenderFilterRecord[] = [];
  for (const lender of lenders) {
    if (isDoNotContact(lender.relationshipStatus)) {
      filteredOut.push({
        lenderId: lender.id,
        lenderName: lender.name,
        reason: 'RelationshipStatus is Do Not Contact — excluded before matching',
        sourceRef: lenderSourceRef(lender, 'RelationshipStatus'),
      });
      continue;
    }
    eligible.push(lender);
  }
  return { eligible, filteredOut };
}

function clientFactVerified(verification: string | undefined): boolean {
  return verification === 'VERIFIED';
}

function sbaLikeProduct(product: LenderProduct): boolean {
  const cat = (product.productCategory || '').toLowerCase();
  return cat === 'sba' || cat === 'sba_express' || cat === 'sba_working_capital';
}

function emptyCoverage(): Pick<
  LenderMatch,
  | 'criticalCriteriaCoverage'
  | 'supportedCriteria'
  | 'unknownCriticalCriteria'
  | 'staleCriticalCriteria'
  | 'disqualifiers'
> {
  return {
    criticalCriteriaCoverage: { required: 0, supported: 0, unknown: 0, stale: 0, disqualified: 0 },
    supportedCriteria: [],
    unknownCriticalCriteria: [],
    staleCriticalCriteria: [],
    disqualifiers: [],
  };
}

function coverageFrom(
  supportedCriteria: string[],
  unknownCriticalCriteria: string[],
  staleCriticalCriteria: string[],
  disqualifiers: string[],
): LenderMatch['criticalCriteriaCoverage'] {
  const required = new Set([
    ...supportedCriteria,
    ...unknownCriticalCriteria,
    ...staleCriticalCriteria,
    ...disqualifiers,
  ]).size;
  return {
    required,
    supported: supportedCriteria.length,
    unknown: unknownCriticalCriteria.length,
    stale: staleCriticalCriteria.length,
    disqualified: disqualifiers.length,
  };
}

function matchProductCore(
  opportunity: CapitalOpportunity,
  lender: LenderOrganization,
  product: LenderProduct,
  now: Date,
  experience?: HvcgLenderExperience,
  intelligence?: HistoricalLenderIntelligence,
): LenderMatch {
  const fresh = productFreshness(product, now);
  const explanations: MatchExplanation[] = [];
  const missing: string[] = [];
  const supportedCriteria: string[] = [];
  const unknownCriticalCriteria: string[] = [];
  const staleCriticalCriteria: string[] = [];
  const disqualifiers: string[] = [];
  let ineligible = false;
  let unknown = false;
  let positive = 0;
  let geographyBlocksBestFit = false;

  const markSupported = (criterion: string) => {
    if (!supportedCriteria.includes(criterion)) supportedCriteria.push(criterion);
  };
  const markUnknownCritical = (criterion: string) => {
    if (!unknownCriticalCriteria.includes(criterion)) unknownCriticalCriteria.push(criterion);
  };
  const markDisqualifier = (criterion: string) => {
    if (!disqualifiers.includes(criterion)) disqualifiers.push(criterion);
  };

  const amount = opportunity.need.requestedAmount;
  if (amount == null) {
    missing.push('requested amount');
    unknown = true;
    markUnknownCritical('requestedAmount');
    pushExplanation(explanations, {
      criterion: 'requestedAmount',
      statement: 'Requested amount is missing on the capital opportunity — cannot score amount fit',
      outcome: 'unknown',
      sourceRef: opportunitySourceRef(opportunity, 'TargetAmount'),
    });
  } else {
    if (fresh.minAmount != null) {
      if (amount < fresh.minAmount) {
        ineligible = true;
        markDisqualifier('minAmount');
        pushExplanation(explanations, {
          criterion: 'minAmount',
          statement: `Requested amount below product minimum (${fresh.minAmount})`,
          outcome: 'ineligible',
          sourceRef: productSourceRef(fresh, 'MinAmount'),
        });
      } else {
        positive += 1;
        markSupported('minAmount');
        pushExplanation(explanations, {
          criterion: 'minAmount',
          statement: `Amount meets stated minimum (${fresh.minAmount})`,
          outcome: 'met',
          sourceRef: productSourceRef(fresh, 'MinAmount'),
        });
      }
    } else if (fresh.maxAmount == null) {
      missing.push('product amount bounds');
      unknown = true;
      markUnknownCritical('requestedAmount');
      pushExplanation(explanations, {
        criterion: 'minAmount',
        statement: 'Product minimum and maximum amount are blank — unknown, not treated as unrestricted',
        outcome: 'unknown',
        sourceRef: productSourceRef(fresh, 'MinAmount'),
      });
    }
    if (fresh.maxAmount != null) {
      if (amount > fresh.maxAmount) {
        ineligible = true;
        markDisqualifier('maxAmount');
        pushExplanation(explanations, {
          criterion: 'maxAmount',
          statement: `Requested amount above product maximum (${fresh.maxAmount})`,
          outcome: 'ineligible',
          sourceRef: productSourceRef(fresh, 'MaxAmount'),
        });
      } else {
        positive += 1;
        markSupported('maxAmount');
        pushExplanation(explanations, {
          criterion: 'maxAmount',
          statement: `Amount within stated maximum (${fresh.maxAmount})`,
          outcome: 'met',
          sourceRef: productSourceRef(fresh, 'MaxAmount'),
        });
      }
    }
  }

  const revenue = opportunity.business.annualRevenue;
  if (!revenue || revenue.verification === 'MISSING' || revenue.value == null) {
    missing.push('verified annual revenue');
    unknown = true;
    markUnknownCritical('annualRevenue');
    pushExplanation(explanations, {
      criterion: 'annualRevenue',
      statement: 'Verified annual revenue is missing — cannot score revenue fit',
      outcome: 'unknown',
      sourceRef: opportunitySourceRef(opportunity, 'AnnualRevenue', revenue?.sourceRef),
    });
  } else if (!clientFactVerified(revenue.verification)) {
    missing.push('verified annual revenue');
    unknown = true;
    markUnknownCritical('annualRevenue');
    pushExplanation(explanations, {
      criterion: 'annualRevenue',
      statement: `Annual revenue is ${revenue.verification} — not used to claim a fit or ineligibility`,
      outcome: 'unknown',
      sourceRef: opportunitySourceRef(opportunity, 'AnnualRevenue', revenue.sourceRef),
    });
  } else if (fresh.minRevenue != null && revenue.value < fresh.minRevenue) {
    ineligible = true;
    markDisqualifier('minRevenue');
    pushExplanation(explanations, {
      criterion: 'minRevenue',
      statement: `Revenue below stated minimum (${fresh.minRevenue})`,
      outcome: 'ineligible',
      sourceRef: productSourceRef(fresh, 'MinRevenue'),
    });
  } else if (fresh.minRevenue != null) {
    positive += 1;
    markSupported('minRevenue');
    pushExplanation(explanations, {
      criterion: 'minRevenue',
      statement: `Revenue meets stated minimum (verification=${revenue.verification})`,
      outcome: 'met',
      sourceRef: productSourceRef(fresh, 'MinRevenue'),
    });
  } else if (sbaLikeProduct(fresh)) {
    markUnknownCritical('minRevenue');
    pushExplanation(explanations, {
      criterion: 'minRevenue',
      statement:
        'SBA-like product does not state a minimum revenue on the sourced official page. That unknown is material to eligibility — BEST_FIT is not allowed. Verified client revenue is not treated as an unrestricted fit.',
      outcome: 'unknown',
      sourceRef: productSourceRef(fresh, 'MinRevenue'),
    });
  } else {
    markSupported('annualRevenue');
  }

  const industry = opportunity.business.industry?.toLowerCase();
  if (industry && fresh.industriesRestricted?.some((i) => industry.includes(i.toLowerCase()))) {
    ineligible = true;
    markDisqualifier('industriesRestricted');
    pushExplanation(explanations, {
      criterion: 'industriesRestricted',
      statement: 'Industry is on the product restricted list',
      outcome: 'ineligible',
      sourceRef: productSourceRef(fresh, 'IndustriesRestricted'),
    });
  } else if (fresh.industriesRestricted?.length && !industry) {
    missing.push('client industry');
    markUnknownCritical('industry');
    pushExplanation(explanations, {
      criterion: 'industriesRestricted',
      statement: 'Product states restricted industries but client industry is missing — cannot confirm not disqualified',
      outcome: 'unknown',
      sourceRef: productSourceRef(fresh, 'IndustriesRestricted'),
    });
  } else if (fresh.industriesRequired?.length) {
    if (!industry) {
      missing.push('client industry');
      markUnknownCritical('industriesRequired');
      pushExplanation(explanations, {
        criterion: 'industriesRequired',
        statement: 'Product states a required industry and client industry is missing — cannot confirm eligibility',
        outcome: 'unknown',
        sourceRef: productSourceRef(fresh, 'IndustriesRequired'),
      });
    } else if (!fresh.industriesRequired.some((i) => industry.includes(i.toLowerCase()))) {
      ineligible = true;
      markDisqualifier('industriesRequired');
      pushExplanation(explanations, {
        criterion: 'industriesRequired',
        statement: 'Industry is outside the product required-industry list',
        outcome: 'ineligible',
        sourceRef: productSourceRef(fresh, 'IndustriesRequired'),
      });
    } else {
      positive += 1;
      markSupported('industriesRequired');
      pushExplanation(explanations, {
        criterion: 'industriesRequired',
        statement: 'Industry matches the sourced required-industry list',
        outcome: 'met',
        sourceRef: productSourceRef(fresh, 'IndustriesRequired'),
      });
    }
  } else if (fresh.industriesPreferred?.length) {
    if (industry && fresh.industriesPreferred.some((i) => industry.includes(i.toLowerCase()))) {
      positive += 1;
      markSupported('industriesPreferred');
      pushExplanation(explanations, {
        criterion: 'industriesPreferred',
        statement: 'Industry appears on preferred list',
        outcome: 'met',
        sourceRef: productSourceRef(fresh, 'IndustriesPreferred'),
      });
    } else if (industry) {
      pushExplanation(explanations, {
        criterion: 'industriesPreferred',
        statement: 'Industry not on preferred list (not automatically ineligible)',
        outcome: 'not_met',
        sourceRef: productSourceRef(fresh, 'IndustriesPreferred'),
      });
    } else {
      missing.push('client industry');
      unknown = true;
      markUnknownCritical('industry');
      pushExplanation(explanations, {
        criterion: 'industriesPreferred',
        statement: 'Product states preferred industries but client industry is missing',
        outcome: 'unknown',
        sourceRef: productSourceRef(fresh, 'IndustriesPreferred'),
      });
    }
  } else if (industry) {
    markSupported('industry');
  } else if (sbaLikeProduct(fresh)) {
    markUnknownCritical('industry');
    pushExplanation(explanations, {
      criterion: 'industry',
      statement:
        'SBA-like product: client industry is missing. SBA has ineligible business types. The statutory list is not invented here — industry remains a material unknown and BEST_FIT is not allowed.',
      outcome: 'unknown',
      sourceRef: opportunitySourceRef(opportunity, 'Industry'),
    });
  }

  const years = opportunity.business.yearsInBusiness;
  if (fresh.timeInBusinessMonths != null) {
    if (!years || years.value == null || !clientFactVerified(years.verification)) {
      missing.push('verified years in business');
      unknown = true;
      markUnknownCritical('timeInBusinessMonths');
      pushExplanation(explanations, {
        criterion: 'timeInBusinessMonths',
        statement: 'Product states time-in-business minimum; verified client years in business are missing',
        outcome: 'unknown',
        sourceRef: productSourceRef(fresh, 'TimeInBusinessMonths'),
      });
    } else if (years.value * 12 < fresh.timeInBusinessMonths) {
      ineligible = true;
      markDisqualifier('timeInBusinessMonths');
      pushExplanation(explanations, {
        criterion: 'timeInBusinessMonths',
        statement: `Years in business below stated minimum (${fresh.timeInBusinessMonths} months)`,
        outcome: 'ineligible',
        sourceRef: productSourceRef(fresh, 'TimeInBusinessMonths'),
      });
    } else {
      positive += 1;
      markSupported('timeInBusinessMonths');
      pushExplanation(explanations, {
        criterion: 'timeInBusinessMonths',
        statement: `Time in business meets stated minimum (${fresh.timeInBusinessMonths} months)`,
        outcome: 'met',
        sourceRef: productSourceRef(fresh, 'TimeInBusinessMonths'),
      });
    }
  } else if (sbaLikeProduct(fresh)) {
    markUnknownCritical('timeInBusinessMonths');
    pushExplanation(explanations, {
      criterion: 'timeInBusinessMonths',
      statement:
        'SBA-like product does not state a time-in-business minimum on the sourced official page. That unknown is material to eligibility — BEST_FIT is not allowed.',
      outcome: 'unknown',
      sourceRef: productSourceRef(fresh, 'TimeInBusinessMonths'),
    });
  } else if (fresh.minRevenue == null && (fresh.productCategory || '') !== 'asset_based_lending') {
    markUnknownCritical('borrowerOverlays');
    pushExplanation(explanations, {
      criterion: 'borrowerOverlays',
      statement:
        'Product does not state min revenue or time-in-business. Amount band alone is not sufficient for BEST_FIT. Minima are not invented.',
      outcome: 'unknown',
      sourceRef: productSourceRef(fresh, 'TimeInBusinessMonths'),
    });
  }

  if (sbaLikeProduct(fresh) && fresh.creditExpectations?.trim()) {
    markUnknownCritical('creditExpectations');
    pushExplanation(explanations, {
      criterion: 'creditExpectations',
      statement:
        'Product states credit expectations as unstructured sourced text. Client FICO is not a sourced opportunity field — not evaluated and not assumed met. Material unknown blocks BEST_FIT. The stated figure is not parsed into a numeric matching rule, and a FICO minimum is not invented when the official page is silent.',
      outcome: 'unknown',
      sourceRef: productSourceRef(fresh, 'CreditExpectations'),
    });
  }

  if (fresh.geography) {
    const locations = opportunity.business.locations?.toLowerCase();
    if (!locations) {
      missing.push('client geography');
      unknown = true;
      markUnknownCritical('geography');
      pushExplanation(explanations, {
        criterion: 'geography',
        statement: 'Product states geography but client location is missing — not treated as nationwide',
        outcome: 'unknown',
        sourceRef: productSourceRef(fresh, 'Geography'),
      });
    } else if (!locations.includes(fresh.geography.toLowerCase()) && !fresh.geography.toLowerCase().includes(locations)) {
      geographyBlocksBestFit = true;
      pushExplanation(explanations, {
        criterion: 'geography',
        statement: 'Client location is not an obvious match to stated product geography (not automatic ineligible without an exclusion rule). BEST_FIT requires geography supported where relevant.',
        outcome: 'not_met',
        sourceRef: productSourceRef(fresh, 'Geography'),
      });
    } else {
      positive += 1;
      markSupported('geography');
      pushExplanation(explanations, {
        criterion: 'geography',
        statement: `Client location is consistent with stated product geography (${fresh.geography})`,
        outcome: 'met',
        sourceRef: productSourceRef(fresh, 'Geography'),
      });
    }
  }

  const type = opportunity.transactionType;
  function appetite(
    flag: boolean | undefined,
    field: string,
    applies: boolean,
    ineligibleStatement: string,
  ): void {
    if (!applies) return;
    if (flag === false) {
      ineligible = true;
      markDisqualifier(field);
      pushExplanation(explanations, {
        criterion: field,
        statement: ineligibleStatement,
        outcome: 'ineligible',
        sourceRef: productSourceRef(fresh, field),
      });
    } else if (flag === true) {
      positive += 1;
      markSupported(field);
      pushExplanation(explanations, {
        criterion: field,
        statement: `Product states appetite for this transaction type (${type})`,
        outcome: 'met',
        sourceRef: productSourceRef(fresh, field),
      });
    } else {
      missing.push(`${field} appetite`);
      unknown = true;
      markUnknownCritical(field);
      pushExplanation(explanations, {
        criterion: field,
        statement: `Product ${field} is blank — unknown, not treated as no restriction`,
        outcome: 'unknown',
        sourceRef: productSourceRef(fresh, field),
      });
    }
  }

  appetite(fresh.acquisitionAppetite, 'AcquisitionAppetite', type === 'acquisition', 'Product has no acquisition appetite');
  appetite(fresh.constructionAppetite, 'ConstructionAppetite', type === 'construction', 'Product has no construction appetite');
  appetite(fresh.equipmentAppetite, 'EquipmentAppetite', type === 'equipment', 'Product has no equipment appetite');
  appetite(
    fresh.sbaParticipation,
    'SBAParticipation',
    type === 'sba' || type === 'sba_working_capital' || type === 'sba_express',
    'Product does not participate in SBA',
  );
  appetite(
    fresh.arEligible,
    'AREligible',
    type === 'ar_financing' || type === 'asset_based_lending',
    'AR is not eligible for this product',
  );
  appetite(
    fresh.realEstateAppetite,
    'RealEstateAppetite',
    type === 'commercial_real_estate',
    'Product has no commercial real estate appetite',
  );
  appetite(
    fresh.inventoryEligible,
    'InventoryEligible',
    type === 'inventory',
    'Inventory is not eligible for this product',
  );

  if (fresh.dscrMin != null) {
    markUnknownCritical('dscrMin');
    citeUnevaluableStatedField(
      explanations,
      fresh,
      'dscrMin',
      'DSCRMin',
      fresh.dscrMin,
      'Product states a DSCR minimum. Client DSCR is not a sourced opportunity field — not evaluated and not assumed met. Material unknown blocks BEST_FIT.',
    );
  }
  if (fresh.leverageMax != null) {
    markUnknownCritical('leverageMax');
    citeUnevaluableStatedField(
      explanations,
      fresh,
      'leverageMax',
      'LeverageMax',
      fresh.leverageMax,
      'Product states a leverage maximum. Client leverage is not a sourced opportunity field — not evaluated and not assumed met. Material unknown blocks BEST_FIT.',
    );
  }
  citeUnstructuredNote(explanations, fresh, 'creditExpectations', 'CreditExpectations', fresh.creditExpectations);
  citeUnstructuredNote(explanations, fresh, 'collateral', 'Collateral', fresh.collateral);
  citeUnstructuredNote(explanations, fresh, 'personalGuarantee', 'PersonalGuarantee', fresh.personalGuarantee);
  citeUnstructuredNote(explanations, fresh, 'otherCriteria', 'OtherCriteria', fresh.otherCriteria);
  citeUnstructuredNote(explanations, fresh, 'pricing', 'Pricing', fresh.pricing);
  citeUnstructuredNote(explanations, fresh, 'knownFees', 'KnownFees', fresh.knownFees);

  if (!fresh.source && !fresh.lastVerifiedAt) {
    missing.push('criteria source / last verified date');
    unknown = true;
    pushExplanation(explanations, {
      criterion: 'verification',
      statement: 'Criteria source and last verified date are missing',
      outcome: 'unknown',
      sourceRef: productSourceRef(fresh, 'VerificationSource'),
    });
  } else if (!fresh.source || !fresh.verifiedBy || !fresh.lastVerifiedAt) {
    unknown = true;
    pushExplanation(explanations, {
      criterion: 'verification',
      statement: 'Honest CURRENT requires VerificationSource, VerifiedBy, and LastVerifiedAt',
      outcome: 'unknown',
      sourceRef: productSourceRef(fresh, 'LastVerifiedAt'),
    });
  }

  if (fresh.freshness === 'STALE') {
    if (supportedCriteria.length) staleCriticalCriteria.push(...supportedCriteria.filter((c) => !staleCriticalCriteria.includes(c)));
    if (unknownCriticalCriteria.length) staleCriticalCriteria.push(...unknownCriticalCriteria.filter((c) => !staleCriticalCriteria.includes(c)));
    pushExplanation(explanations, {
      criterion: 'freshness',
      statement: `Criteria are STALE (LastVerifiedAt older than ${CRITERIA_STALE_DAYS} days) — not ranked as a definitive match`,
      outcome: 'degraded',
      sourceRef: productSourceRef(fresh, 'LastVerifiedAt'),
    });
  } else if (fresh.freshness === 'UNKNOWN') {
    pushExplanation(explanations, {
      criterion: 'freshness',
      statement: 'Criteria freshness is UNKNOWN',
      outcome: 'unknown',
      sourceRef: productSourceRef(fresh, 'CriteriaFreshness'),
    });
  }

  if (lender.relationshipStatus) {
    pushExplanation(explanations, {
      criterion: 'relationshipStatus',
      statement: `HVCG relationship is ${lender.relationshipStatus}. Relationship does not override product criteria.`,
      outcome: 'context',
      sourceRef: lenderSourceRef(lender, 'RelationshipStatus'),
    });
  }

  if (lender.organizationType) {
    pushExplanation(explanations, {
      criterion: 'lenderType',
      statement: `HVCG_Lenders.LenderType is ${lender.organizationType}. Type is catalog context, not an underwriting decision.`,
      outcome: 'context',
      sourceRef: lenderSourceRef(lender, 'LenderType'),
    });
  }

  if (lender.preferredProductsNote) {
    pushExplanation(explanations, {
      criterion: 'preferredProductsNote',
      statement: 'PreferredProducts is unstructured sourced text and was not parsed into matching criteria',
      outcome: 'context',
      sourceRef: lenderSourceRef(lender, 'PreferredProducts'),
    });
  }

  if (lender.notes) {
    pushExplanation(explanations, {
      criterion: 'notes',
      statement: 'HVCG_Lenders.Notes is unstructured sourced text and was not parsed into matching criteria',
      outcome: 'context',
      sourceRef: lenderSourceRef(lender, 'Notes'),
    });
  }

  if (intelligence) {
    pushExplanation(explanations, {
      criterion: 'hvcgExperience',
      statement: intelligence.explanation,
      outcome: 'context',
      sourceRef: intelligence.sourceRefs[0] || {
        sourceSystem: 'HVCG_LenderOutreach',
        sourceRecordId: lender.id,
        field: 'LenderId',
        capturedAt: intelligence.sameClient.lastOutreachAt || intelligence.lenderAggregate.lastOutreachAt || missingCapturedAt(),
      },
    });
  } else if (experience) {
    pushExplanation(explanations, {
      criterion: 'hvcgExperience',
      statement: `HVCG recorded ${experience.outreachCount} outreach row(s); last status ${experience.lastSubmissionStatus || 'unknown'}. Historical experience is context, not a fit.`,
      outcome: 'context',
      sourceRef: experience.sourceRefs[0] || {
        sourceSystem: 'HVCG_LenderOutreach',
        sourceRecordId: lender.id,
        field: 'LenderId',
        capturedAt: experience.lastOutreachAt || missingCapturedAt(),
      },
    });
  }

  let band: MatchBand;
  if (ineligible) band = 'INELIGIBLE';
  else if (fresh.freshness === 'STALE') band = 'UNKNOWN';
  else if (unknown || fresh.freshness === 'UNKNOWN') band = 'UNKNOWN';
  else if (missing.length === 0 && positive >= 2 && unknownCriticalCriteria.length === 0) band = 'BEST_FIT';
  else if (missing.length <= 2 && positive >= 1) band = 'POSSIBLE';
  else if (positive >= 1) band = 'LOW_FIT';
  else band = 'UNKNOWN';

  if (
    band === 'BEST_FIT' &&
    (fresh.freshness !== 'CURRENT' || unknown || unknownCriticalCriteria.length > 0 || geographyBlocksBestFit)
  ) {
    band = unknownCriticalCriteria.length > 0 || geographyBlocksBestFit ? 'POSSIBLE' : 'UNKNOWN';
    pushExplanation(explanations, {
      criterion: 'freshness',
      statement: geographyBlocksBestFit
        ? 'BEST_FIT blocked: geography is relevant and not supported'
        : unknownCriticalCriteria.length > 0
          ? `BEST_FIT blocked: unknown critical criteria (${unknownCriticalCriteria.join(', ')})`
          : 'BEST_FIT blocked: criteria not CURRENT or incomplete',
      outcome: 'degraded',
      sourceRef: productSourceRef(fresh, 'CriteriaFreshness'),
    });
  }

  // Bands only. product.confidence is a sourced 0-1 note on the product row — never a match percent.
  const reasons = explanations.filter((e) => e.outcome !== 'context').map((e) => e.statement);
  return {
    lenderId: lender.id,
    lenderName: lender.name,
    productId: fresh.id,
    productName: fresh.productName,
    band,
    reasons: reasons.length ? reasons : ['Insufficient stated criteria to score'],
    explanations,
    missingCriteria: missing,
    stale: fresh.freshness === 'STALE',
    freshness: fresh.freshness,
    sourceRef: productSourceRef(fresh, 'Title'),
    historicalExperience: experience,
    historicalIntelligence: intelligence,
    reviewStatus: 'PENDING_MANNY',
    criticalCriteriaCoverage: coverageFrom(
      supportedCriteria,
      unknownCriticalCriteria,
      staleCriticalCriteria,
      disqualifiers,
    ),
    supportedCriteria,
    unknownCriticalCriteria,
    staleCriticalCriteria,
    disqualifiers,
  };
}

export function matchLenderWithoutProducts(
  _opportunity: CapitalOpportunity,
  lender: LenderOrganization,
  now = new Date(),
  experience?: HvcgLenderExperience,
  intelligence?: HistoricalLenderIntelligence,
): LenderMatch {
  const freshness = organizationFreshness(lender, now);
  const explanations: MatchExplanation[] = [
    {
      criterion: 'products',
      statement:
        'No product criteria rows are recorded for this lender. HVCG_LenderProducts is not used as a live SoR. Blank criteria stay UNKNOWN — not a guessed fit.',
      outcome: 'unknown',
      sourceRef: lenderSourceRef(lender, 'Title'),
    },
  ];
  if (lender.preferredProductsNote) {
    explanations.push({
      criterion: 'preferredProductsNote',
      statement: 'PreferredProducts is unstructured sourced text and was not parsed into matching criteria',
      outcome: 'context',
      sourceRef: lenderSourceRef(lender, 'PreferredProducts'),
    });
  }
  if (freshness === 'STALE') {
    explanations.push({
      criterion: 'freshness',
      statement: `Lender LastVerifiedAt is STALE (older than ${CRITERIA_STALE_DAYS} days)`,
      outcome: 'degraded',
      sourceRef: lenderSourceRef(lender, 'LastVerifiedAt'),
    });
  } else if (freshness === 'UNKNOWN') {
    explanations.push({
      criterion: 'freshness',
      statement: 'Lender criteria freshness is UNKNOWN',
      outcome: 'unknown',
      sourceRef: lenderSourceRef(lender, 'CriteriaFreshness'),
    });
  }
  if (lender.relationshipStatus) {
    explanations.push({
      criterion: 'relationshipStatus',
      statement: `HVCG relationship is ${lender.relationshipStatus}. Relationship does not override missing product criteria.`,
      outcome: 'context',
      sourceRef: lenderSourceRef(lender, 'RelationshipStatus'),
    });
  }
  if (lender.organizationType) {
    explanations.push({
      criterion: 'lenderType',
      statement: `HVCG_Lenders.LenderType is ${lender.organizationType}. Type is catalog context, not an underwriting decision.`,
      outcome: 'context',
      sourceRef: lenderSourceRef(lender, 'LenderType'),
    });
  }
  if (lender.notes) {
    explanations.push({
      criterion: 'notes',
      statement: 'HVCG_Lenders.Notes is unstructured sourced text and was not parsed into matching criteria',
      outcome: 'context',
      sourceRef: lenderSourceRef(lender, 'Notes'),
    });
  }
  if (intelligence) {
    explanations.push({
      criterion: 'hvcgExperience',
      statement: intelligence.explanation,
      outcome: 'context',
      sourceRef: intelligence.sourceRefs[0] || {
        sourceSystem: 'HVCG_LenderOutreach',
        sourceRecordId: lender.id,
        field: 'LenderId',
        capturedAt: intelligence.lenderAggregate.lastOutreachAt || missingCapturedAt(),
      },
    });
  } else if (experience) {
    explanations.push({
      criterion: 'hvcgExperience',
      statement: `HVCG recorded ${experience.outreachCount} outreach row(s). Historical experience does not create a product fit.`,
      outcome: 'context',
      sourceRef: experience.sourceRefs[0],
    });
  }
  return {
    lenderId: lender.id,
    lenderName: lender.name,
    band: 'UNKNOWN',
    reasons: explanations.filter((e) => e.outcome !== 'context').map((e) => e.statement),
    explanations,
    missingCriteria: ['product criteria'],
    stale: freshness === 'STALE',
    freshness,
    sourceRef: lenderSourceRef(lender, 'Title'),
    historicalExperience: experience,
    historicalIntelligence: intelligence,
    reviewStatus: 'PENDING_MANNY',
    ...emptyCoverage(),
    unknownCriticalCriteria: ['product criteria'],
    criticalCriteriaCoverage: { required: 1, supported: 0, unknown: 1, stale: freshness === 'STALE' ? 1 : 0, disqualified: 0 },
  };
}

export function matchProduct(
  opportunity: CapitalOpportunity,
  lender: LenderOrganization,
  product: LenderProduct,
  now = new Date(),
  experience?: HvcgLenderExperience,
  intelligence?: HistoricalLenderIntelligence,
): LenderMatch {
  return matchProductCore(opportunity, lender, product, now, experience, intelligence);
}

export function rankMatches(matches: LenderMatch[]): LenderMatch[] {
  const order: Record<MatchBand, number> = {
    BEST_FIT: 0,
    POSSIBLE: 1,
    LOW_FIT: 2,
    UNKNOWN: 3,
    INELIGIBLE: 4,
  };
  return matches.slice().sort((a, b) => {
    const band = order[a.band] - order[b.band];
    if (band !== 0) return band;
    const expA = a.historicalExperience?.submittedCount || 0;
    const expB = b.historicalExperience?.submittedCount || 0;
    if (expA !== expB) return expB - expA;
    const tA = Date.parse(a.historicalExperience?.lastOutreachAt || '') || 0;
    const tB = Date.parse(b.historicalExperience?.lastOutreachAt || '') || 0;
    if (tA !== tB) return tB - tA;
    return a.lenderName.localeCompare(b.lenderName) || (a.productName || '').localeCompare(b.productName || '');
  });
}

export function matchLenders(
  opportunity: CapitalOpportunity,
  lenders: LenderOrganization[],
  products: LenderProduct[],
  now = new Date(),
  context: LenderMatchContext = {},
): LenderMatch[] {
  return runLenderMatch(opportunity, lenders, products, now, context).matches;
}

export function runLenderMatch(
  opportunity: CapitalOpportunity,
  lenders: LenderOrganization[],
  products: LenderProduct[],
  now = new Date(),
  context: LenderMatchContext = {},
): LenderMatchRun {
  const facts = applyClientCapitalProfile(opportunity, context.profile);
  const { eligible, filteredOut } = filterLenderUniverse(lenders);
  const productsByLender = new Map<string, LenderProduct[]>();
  for (const product of products) {
    const list = productsByLender.get(product.lenderId) || [];
    list.push(product);
    productsByLender.set(product.lenderId, list);
  }
  const results: LenderMatch[] = [];
  const index = [
    { id: facts.id, clientCode: facts.clientCode },
    ...(context.opportunityClientIndex || []).filter((r) => r.id !== facts.id),
  ];
  for (const lender of eligible) {
    const experience = summarizeHvcgExperience(context.outreach, lender.id, lender.name);
    const intelligence = summarizeHistoricalLenderIntelligence({
      outreach: context.outreach,
      lenderId: lender.id,
      lenderName: lender.name,
      viewingClientCode: facts.clientCode,
      opportunityClientIndex: index,
    });
    const lenderProducts = productsByLender.get(lender.id) || [];
    if (!lenderProducts.length) {
      results.push(matchLenderWithoutProducts(facts, lender, now, experience, intelligence));
      continue;
    }
    for (const product of lenderProducts) {
      results.push(matchProduct(facts, lender, product, now, experience, intelligence));
    }
  }
  return {
    matches: rankMatches(results),
    filteredOut,
    review: {
      status: 'PENDING_MANNY',
      disclaimer: FINANCING_DISCLAIMER,
    },
    generatedAt: now.toISOString(),
  };
}
