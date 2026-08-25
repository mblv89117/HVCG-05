/**
 * Financing structure evaluation — structures before lender match.
 * UNVERIFIED inputs produce PRELIMINARY status, never a lender recommendation.
 */

import type { CapitalOpportunity, FinancingStructure, ProvenancedValue } from './types.ts';

function moneyState(pv: ProvenancedValue<number> | undefined): 'verified' | 'unverified' | 'missing' {
  if (!pv || pv.value == null || pv.verification === 'MISSING' || pv.verification === 'REJECTED') return 'missing';
  if (pv.verification === 'VERIFIED' && pv.sourceRef?.sourceSystem) return 'verified';
  return 'unverified';
}

export function proposeFinancingStructures(opportunity: CapitalOpportunity): FinancingStructure[] {
  const amount = opportunity.need.requestedAmount;
  const type = opportunity.transactionType;
  const revenue = moneyState(opportunity.business.annualRevenue);
  const cash = moneyState(opportunity.capitalProfile.cash);
  const ar = moneyState(opportunity.capitalProfile.ar);
  const debt = moneyState(opportunity.capitalProfile.existingDebt);
  const unverified = [
    revenue === 'unverified' ? 'revenue' : '',
    cash === 'unverified' ? 'cash' : '',
    ar === 'unverified' ? 'AR' : '',
    debt === 'unverified' ? 'existing debt' : '',
  ].filter(Boolean);
  const preliminary = unverified.length > 0 || amount == null;
  const confidenceLabel = preliminary ? 'PRELIMINARY' : 'GROUNDED';
  const review = preliminary
    ? 'required before lender submission strategy'
    : 'confirm structure choice before outreach';

  const wcRequested =
    type === 'working_capital_loc' ||
    type === 'sba_working_capital' ||
    Boolean(opportunity.transaction.workingCapitalComponent) ||
    /working.?capital/i.test(opportunity.need.purpose || '');

  const structures: FinancingStructure[] = [
    {
      id: 'struct-wc-loc',
      name: 'Working Capital LOC',
      category: 'working_capital_loc',
      status: amount == null ? 'INSUFFICIENT_DATA' : 'POTENTIAL',
      confidenceLabel,
      basedOn: [
        amount != null ? `requested $${amount.toLocaleString()}` : 'requested amount missing',
        ...unverified.map((u) => `UNVERIFIED ${u}`),
      ],
      why: 'Requested use is working capital. A revolving LOC is a candidate structure, not a lender recommendation.',
      missingData: [
        ...(amount == null ? ['requested amount'] : []),
        ...(revenue === 'missing' ? ['verified revenue'] : []),
        ...(cash === 'missing' ? ['verified cash'] : []),
      ],
      unverifiedInputs: unverified,
      mannyReview: review,
    },
    {
      id: 'struct-term',
      name: 'Term loan',
      category: 'conventional_bank_loan',
      status: amount == null ? 'INSUFFICIENT_DATA' : 'POTENTIAL',
      confidenceLabel,
      basedOn: [amount != null ? `requested $${amount.toLocaleString()}` : 'requested amount missing'],
      why: 'A fully amortizing term loan may fit if the need is a one-time working-capital injection rather than revolving availability.',
      missingData: amount == null ? ['requested amount'] : [],
      unverifiedInputs: unverified,
      mannyReview: review,
    },
    {
      id: 'struct-sba-wc',
      name: 'SBA working-capital option',
      category: 'sba_working_capital',
      status:
        amount == null
          ? 'INSUFFICIENT_DATA'
          : amount > 5_000_000
            ? 'NOT_RECOMMENDED'
            : 'POTENTIAL',
      confidenceLabel,
      basedOn: [
        'SBA 7(a) official maximum $5,000,000 (sba.gov/loans/7a-loans/)',
        amount != null ? `requested $${amount.toLocaleString()}` : 'requested amount missing',
      ],
      why:
        amount != null && amount > 5_000_000
          ? 'Requested amount exceeds the official SBA 7(a) individual maximum.'
          : 'SBA 7(a) / WCP can finance working capital. Program eligibility is not determined here.',
      missingData: [
        ...(amount == null ? ['requested amount'] : []),
        ...(opportunity.business.yearsInBusiness?.value == null ? ['verified years in business'] : []),
      ],
      unverifiedInputs: unverified,
      mannyReview: review,
    },
    {
      id: 'struct-abl',
      name: 'AR / asset-based lending',
      category: 'asset_based_lending',
      status: ar === 'missing' ? 'INSUFFICIENT_DATA' : 'POTENTIAL',
      confidenceLabel: ar === 'unverified' || preliminary ? 'PRELIMINARY' : confidenceLabel,
      basedOn: ar === 'missing' ? ['AR not present on capital profile'] : [`AR ${ar}`],
      why:
        ar === 'missing'
          ? 'AR / ABL cannot be evaluated without accounts-receivable evidence.'
          : 'AR evidence exists. One aging or balance does not prove borrowing-base eligibility.',
      missingData: ar === 'missing' ? ['verified AR'] : ['borrowing base / ineligible AR detail'],
      unverifiedInputs: unverified.filter((u) => u === 'AR' || u === 'revenue'),
      mannyReview: review,
    },
  ];

  if (type === 'commercial_real_estate' || type === 'construction') {
    structures.push({
      id: 'struct-cre',
      name: 'Commercial real estate / 504-style project',
      category: type,
      status: 'POTENTIAL',
      confidenceLabel,
      basedOn: ['transaction type is real estate or construction'],
      why: 'CRE / SBA 504 is a candidate when the request is a fixed asset. Official 504 rules exclude working capital.',
      missingData: ['project costs', 'real estate component documentation'],
      unverifiedInputs: unverified,
      mannyReview: review,
    });
  } else if (wcRequested) {
    structures.push({
      id: 'struct-cre',
      name: 'Commercial real estate / 504-style project',
      category: 'commercial_real_estate',
      status: 'NOT_RECOMMENDED',
      confidenceLabel: 'GROUNDED',
      basedOn: ['SBA 504 official: cannot be used for working capital or inventory'],
      why: 'Requested use is working capital. Official SBA 504 proceeds exclude working capital.',
      missingData: [],
      unverifiedInputs: [],
      mannyReview: 'no CRE path unless the request changes',
    });
  }

  if (type === 'equipment') {
    structures.push({
      id: 'struct-eq',
      name: 'Equipment financing',
      category: 'equipment',
      status: 'POTENTIAL',
      confidenceLabel,
      basedOn: ['transaction type is equipment'],
      why: 'Equipment structures require asset identification. Not evaluated as a WC substitute.',
      missingData: ['equipment schedule'],
      unverifiedInputs: unverified,
      mannyReview: review,
    });
  }

  return structures;
}

export function structureLines(structures: FinancingStructure[]): string[] {
  return structures.map((s) => {
    const unverified = s.unverifiedInputs.length ? ` BASED ON UNVERIFIED ${s.unverifiedInputs.join(', ')}` : '';
    return `${s.name}: ${s.status} (${s.confidenceLabel})${unverified}. Manny review: ${s.mannyReview}`;
  });
}
