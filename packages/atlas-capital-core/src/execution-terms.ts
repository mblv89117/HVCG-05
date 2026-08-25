/**
 * Term-sheet ingest and comparison.
 * Extracted terms stay UNVERIFIED. Derived math is labeled DERIVED, never lender-quoted.
 * Atlas does not choose financing for the client.
 */

import { FINANCING_DISCLAIMER } from './types.ts';
import type {
  DecisionSupportBand,
  DerivedTermMetrics,
  TermComparison,
  TermSheetExtraction,
  TermSheetOffer,
  VerificationState,
} from './types.ts';
import { detectInstructionInjection } from './execution-trust.ts';

const MONEY = /\$?\s*([\d,]+(?:\.\d+)?)\s*(k|m|mm|million)?/i;

function parseMoney(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = MONEY.exec(raw.replace(/,/g, ''));
  if (!m) return undefined;
  let n = Number(m[1]);
  if (!Number.isFinite(n)) return undefined;
  const mag = (m[2] || '').toLowerCase();
  if (mag === 'k') n *= 1_000;
  if (mag === 'm' || mag === 'mm' || mag === 'million') n *= 1_000_000;
  return n;
}

function capture(text: string, re: RegExp): string | undefined {
  const m = re.exec(text);
  return m?.[1]?.trim();
}

export function extractTermSheetFromText(opts: {
  text: string;
  capitalOpportunityId: string;
  lenderId?: string;
  lenderName?: string;
  id?: string;
}): TermSheetExtraction {
  const injectionDetected = detectInstructionInjection(opts.text);
  const text = opts.text;
  const amount = parseMoney(capture(text, /(?:approved\s*)?amount[:\s]+([^\n]+)/i) || undefined);
  const rateRaw = capture(text, /(?:interest\s*)?rate[:\s]+([\d.]+)\s*%/i);
  const termRaw = capture(text, /term[:\s]+(\d+)\s*(?:month|mo)/i) || capture(text, /term[:\s]+(\d+)\s*year/i);
  const amortRaw = capture(text, /amort(?:ization)?[:\s]+(\d+)/i);
  const origination = parseMoney(capture(text, /origination(?:\s*fee)?[:\s]+([^\n]+)/i) || undefined);
  const product = capture(text, /product[:\s]+([^\n]+)/i);
  const index = capture(text, /index[:\s]+([^\n]+)/i);
  const spreadRaw = capture(text, /spread[:\s]+([\d.]+)/i);
  const collateral = capture(text, /collateral[:\s]+([^\n]+)/i);
  const pg = capture(text, /(?:personal\s*)?guarantee[:\s]+([^\n]+)/i);
  const covenants = capture(text, /covenant[s]?[:\s]+([^\n]+)/i);
  const conditions = capture(text, /condition[s]?[:\s]+([^\n]+)/i);
  const expiration = capture(text, /expir(?:es|ation)[:\s]+([^\n]+)/i);
  const prepayment = capture(text, /prepay(?:ment)?[:\s]+([^\n]+)/i);
  const deposits = capture(text, /deposit(?:ory)?[:\s]+([^\n]+)/i);
  const rateTypeMatch = /\bfixed\b/i.test(text) ? 'fixed' : /\bvariable\b|\bfloating\b/i.test(text) ? 'variable' : 'unknown';

  const termMonths = termRaw
    ? /\byear/i.test(text) && !/month/i.test(capture(text, /term[:\s]+([^\n]+)/i) || '')
      ? Number(termRaw) * 12
      : Number(termRaw)
    : undefined;

  const offer: TermSheetOffer = {
    id: opts.id || `off-extract-${Date.now()}`,
    capitalOpportunityId: opts.capitalOpportunityId,
    lenderId: opts.lenderId || 'ln-unknown',
    lenderName: opts.lenderName || capture(text, /lender[:\s]+([^\n]+)/i) || 'Unknown lender',
    product: product,
    amount,
    interestRate: rateRaw ? Number(rateRaw) : undefined,
    index,
    spread: spreadRaw ? Number(spreadRaw) : undefined,
    rateType: rateTypeMatch,
    termMonths: Number.isFinite(termMonths) ? termMonths : undefined,
    amortizationMonths: amortRaw ? Number(amortRaw) : undefined,
    origination,
    collateral,
    personalGuarantee: pg,
    prepayment,
    covenants,
    deposits,
    conditions,
    expiration,
    assumptions: ['Extracted from untrusted text. All fields UNVERIFIED until Manny confirms against the source document.'],
    createdAt: new Date().toISOString(),
    extractionVerification: 'UNVERIFIED',
    sourceRef: {
      sourceSystem: 'untrusted_term_sheet_text',
      capturedAt: new Date().toISOString(),
      field: 'body',
    },
  };

  const fieldVerification: Record<string, VerificationState> = {};
  const tracked: Array<[string, unknown]> = [
    ['amount', offer.amount],
    ['interestRate', offer.interestRate],
    ['termMonths', offer.termMonths],
    ['amortizationMonths', offer.amortizationMonths],
    ['origination', offer.origination],
    ['collateral', offer.collateral],
    ['personalGuarantee', offer.personalGuarantee],
    ['covenants', offer.covenants],
    ['conditions', offer.conditions],
    ['expiration', offer.expiration],
    ['index', offer.index],
    ['spread', offer.spread],
    ['prepayment', offer.prepayment],
    ['deposits', offer.deposits],
  ];
  const missingTerms: string[] = [];
  for (const [k, v] of tracked) {
    if (v == null || v === '') {
      fieldVerification[k] = 'MISSING';
      missingTerms.push(k);
    } else {
      fieldVerification[k] = 'UNVERIFIED';
    }
  }

  return { offer, fieldVerification, missingTerms, injectionDetected, notQuotedAsComplete: true };
}

export function derivedTermMetrics(offer: TermSheetOffer): DerivedTermMetrics {
  const methodology =
    'DERIVED only. Annual debt service ≈ rate × amount when both are present; total scheduled payments ≈ payment × term months; balloon ≈ remaining principal if amort > term. Not lender-quoted.';
  const amount = offer.amount;
  const rate = offer.interestRate;
  const term = offer.termMonths;
  const amort = offer.amortizationMonths || term;
  const origination = offer.origination || 0;
  const closing = offer.closingFees || 0;
  let estimatedAnnualDebtService: number | undefined;
  let estimatedPayment: number | undefined;
  let totalScheduledPayments: number | undefined;
  let balloon: number | undefined;
  if (amount != null && rate != null) {
    estimatedAnnualDebtService = Math.round(amount * (rate / 100) * 100) / 100;
    const monthlyRate = rate / 100 / 12;
    const n = amort || 0;
    if (monthlyRate > 0 && n > 0) {
      estimatedPayment = Math.round((amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n)) * 100) / 100;
    } else if (n > 0) {
      estimatedPayment = Math.round((amount / n) * 100) / 100;
    }
    if (estimatedPayment != null && term) {
      totalScheduledPayments = Math.round(estimatedPayment * term * 100) / 100;
      if (amort && term < amort && estimatedPayment != null && monthlyRate > 0) {
        const remaining = amort - term;
        balloon =
          Math.round(
            (estimatedPayment * (1 - Math.pow(1 + monthlyRate, -remaining))) / monthlyRate * 100,
          ) / 100;
      }
    }
  }
  return {
    estimatedAnnualDebtService,
    estimatedCashCost: estimatedAnnualDebtService,
    estimatedEffectiveFees: origination + closing || undefined,
    totalScheduledPayments,
    balloon,
    methodology,
    verification: 'DERIVED',
  };
}

export function compareTermSheets(offers: TermSheetOffer[], mannyRecommendation?: string, mannyRecommendationBy?: string): TermComparison {
  const rows = offers.map((o) => ({
    offerId: o.id,
    lenderName: o.lenderName,
    product: o.product,
    amount: o.amount,
    interestRate: o.interestRate,
    termMonths: o.termMonths,
    estimatedPayment: o.estimatedPayment,
    origination: o.origination,
    collateral: o.collateral,
    personalGuarantee: o.personalGuarantee,
    covenants: o.covenants,
    conditions: o.conditions,
    expectedClosingDays: o.expectedClosingDays,
    derived: derivedTermMetrics(o),
  }));

  const bands = emptyBands();
  const withCost = rows.filter((r) => r.derived.estimatedAnnualDebtService != null);
  if (withCost.length) {
    const lowest = withCost.slice().sort((a, b) => (a.derived.estimatedAnnualDebtService || 0) - (b.derived.estimatedAnnualDebtService || 0))[0];
    bands.LOWEST_COST = lowest.offerId;
  }
  const withSpeed = rows.filter((r) => r.expectedClosingDays != null);
  if (withSpeed.length) {
    bands.FASTEST = withSpeed.slice().sort((a, b) => (a.expectedClosingDays || 99) - (b.expectedClosingDays || 99))[0].offerId;
  }
  const withAmt = rows.filter((r) => r.amount != null);
  if (withAmt.length) {
    bands.BEST_MATCH_TO_REQUEST = withAmt.slice().sort((a, b) => (b.amount || 0) - (a.amount || 0))[0].offerId;
  }
  const notes = [
    'Decision support only. Atlas does not select financing for the client.',
    'Derived figures are not lender-quoted terms.',
  ];
  if (offers.length < 2) notes.push('Fewer than two offers — comparison is informational only.');
  if (!withCost.length) notes.push('LOWEST_COST is UNKNOWN — missing amount or rate.');

  return {
    rows,
    bands,
    notes,
    mannyRecommendation,
    mannyRecommendationBy,
    disclaimer: FINANCING_DISCLAIMER,
    derivedNotQuoted: true,
  };
}

function emptyBands(): Record<DecisionSupportBand, string | 'UNKNOWN'> {
  return {
    LOWEST_COST: 'UNKNOWN',
    MOST_FLEXIBLE: 'UNKNOWN',
    FASTEST: 'UNKNOWN',
    LOWEST_COLLATERAL_BURDEN: 'UNKNOWN',
    LOWEST_GUARANTEE_BURDEN: 'UNKNOWN',
    BEST_MATCH_TO_REQUEST: 'UNKNOWN',
    UNKNOWN_INSUFFICIENT_DATA: 'UNKNOWN',
  };
}
