/**
 * Application / lender package preparation.
 * Atlas prepares answers from supported facts. It does not silently create
 * borrower representations. Unknown stays unknown.
 */

import type {
  ApplicationAttestationState,
  ApplicationPackage,
  ApplicationPackageSection,
  CapitalDocument,
  CapitalOpportunity,
  LenderCriterionRecord,
  LenderProduct,
  LenderSpecificRequirement,
  PackageReadinessState,
  ProvenancedValue,
  SourceRef,
  VerificationState,
} from './types.ts';

function fieldFrom(
  pv: ProvenancedValue<unknown> | undefined,
  fallback?: unknown,
): { value: unknown; verification: VerificationState; sourceRef?: SourceRef } | undefined {
  if (pv && pv.value != null && pv.verification !== 'MISSING' && pv.verification !== 'REJECTED') {
    return { value: pv.value, verification: pv.verification, sourceRef: pv.sourceRef };
  }
  if (fallback != null && fallback !== '') {
    return { value: fallback, verification: 'UNVERIFIED' };
  }
  return undefined;
}

function section(
  key: string,
  label: string,
  fields: ApplicationPackageSection['fields'],
): ApplicationPackageSection {
  return {
    key,
    label,
    fields,
    missing: Object.entries(fields)
      .filter(([, v]) => !v || v.value == null || v.verification === 'MISSING')
      .map(([k]) => k),
  };
}

export function lenderSpecificFromCriteria(opts: {
  lenderId: string;
  productId?: string;
  products?: LenderProduct[];
  criteria?: LenderCriterionRecord[];
}): LenderSpecificRequirement[] {
  const product = (opts.products || []).find((p) => p.id === opts.productId);
  const rows = (opts.criteria || []).filter(
    (c) => c.lenderId === opts.lenderId && (!opts.productId || c.productId === opts.productId),
  );
  if (!opts.productId) {
    return [
      {
        item: 'Lender product not selected',
        freshness: 'UNKNOWN',
        unknownReason: 'Select a lender product before deriving lender-specific additions.',
      },
    ];
  }
  if (!product && !rows.length) {
    return [
      {
        item: 'Lender-specific requirements',
        freshness: 'UNKNOWN',
        unknownReason: 'No CURRENT sourced criteria for this lender/product. Do not invent documents.',
      },
    ];
  }
  if (!rows.length) {
    return [
      {
        item: product?.requiredDocuments?.join('; ') || 'Lender-specific requirements',
        freshness: productFreshnessOrUnknown(product),
        unknownReason: product?.requiredDocuments?.length
          ? undefined
          : 'Product exists but criteria are UNKNOWN. HVCG standard package only.',
      },
    ];
  }
  return rows.map((c) => ({
    item: `${c.criterion}: ${String(c.value)}`,
    criterion: c.criterion,
    freshness: c.freshness,
    sourceRef: c.sourceRef,
  }));
}

function productFreshnessOrUnknown(product?: LenderProduct): LenderSpecificRequirement['freshness'] {
  if (!product) return 'UNKNOWN';
  const days = product.lastVerifiedAt ? Date.now() - Date.parse(product.lastVerifiedAt) : NaN;
  if (!Number.isFinite(days)) return 'UNKNOWN';
  if (days > 180 * 86_400_000) return 'STALE';
  return 'CURRENT';
}

export function expectedQuestionsFromPackage(pkg: Pick<ApplicationPackage, 'missingFields' | 'lenderSpecificRequirements'>): string[] {
  const q: string[] = [];
  for (const m of pkg.missingFields) q.push(`Confirm ${m.field} (${m.requiredFrom}).`);
  for (const r of pkg.lenderSpecificRequirements) {
    if (r.freshness === 'UNKNOWN') q.push(`Lender may ask about ${r.item} — requirements UNKNOWN.`);
  }
  return q;
}

export function prepareApplication(opts: {
  opportunity: CapitalOpportunity;
  lenderId: string;
  productId?: string;
  fieldMap: Record<string, { from: 'opportunity' | 'profile'; path: string }>;
  documents: CapitalDocument[];
  products?: LenderProduct[];
  criteria?: LenderCriterionRecord[];
}): ApplicationPackage {
  void opts.fieldMap;
  const opp = opts.opportunity;
  const populated: ApplicationPackage['populatedFields'] = {};
  const missing: ApplicationPackage['missingFields'] = [];

  const amount = opp.need.requestedAmount;
  if (amount != null) populated.requestedAmount = { value: amount, verification: 'UNVERIFIED' };
  else missing.push({ field: 'requestedAmount', requiredFrom: 'MANNY_INPUT_REQUIRED' });

  const revenue = fieldFrom(opp.business.annualRevenue);
  if (revenue && revenue.verification === 'VERIFIED') populated.annualRevenue = revenue;
  else missing.push({ field: 'annualRevenue', requiredFrom: 'CLIENT_INPUT_REQUIRED' });

  populated.clientCode = { value: opp.clientCode, verification: 'VERIFIED' };

  const ownership = fieldFrom(undefined, opp.business.ownership);
  const cash = fieldFrom(opp.capitalProfile.cash);
  const debt = fieldFrom(opp.capitalProfile.existingDebt);
  const collateral = fieldFrom(undefined, opp.capitalProfile.collateral);
  const useOfFunds = fieldFrom(undefined, opp.need.useOfFunds || opp.need.purpose);
  const sourcesUses = fieldFrom(undefined, [opp.transaction.sources, opp.transaction.uses].filter(Boolean).join(' / ') || undefined);

  const sections: ApplicationPackageSection[] = [
    section('borrower', 'Borrower / company profile', {
      clientCode: populated.clientCode,
      industry: fieldFrom(undefined, opp.business.industry) || { value: null, verification: 'MISSING' },
      ownership: ownership || { value: null, verification: 'MISSING' },
    }),
    section('request', 'Requested amount / use of funds', {
      requestedAmount: populated.requestedAmount || { value: null, verification: 'MISSING' },
      useOfFunds: useOfFunds || { value: null, verification: 'MISSING' },
    }),
    section('financials', 'Financial snapshot', {
      annualRevenue: populated.annualRevenue || { value: null, verification: 'MISSING' },
      cash: cash || { value: null, verification: 'MISSING' },
      ar: fieldFrom(opp.capitalProfile.ar) || { value: null, verification: 'MISSING' },
    }),
    section('debt', 'Debt', {
      existingDebt: debt || { value: null, verification: 'MISSING' },
      monthlyDebtService: fieldFrom(opp.capitalProfile.monthlyDebtService) || { value: null, verification: 'MISSING' },
    }),
    section('collateral', 'Collateral', {
      collateral: collateral || { value: null, verification: 'MISSING' },
    }),
    section('sourcesUses', 'Sources / uses', {
      sourcesUses: sourcesUses || { value: null, verification: 'MISSING' },
    }),
  ];

  const attached = opts.documents.filter((d) => d.capitalOpportunityId === opp.id).map((d) => d.id);
  const lenderSpecificRequirements = lenderSpecificFromCriteria({
    lenderId: opts.lenderId,
    productId: opts.productId,
    products: opts.products,
    criteria: opts.criteria,
  });

  const status = missing.length ? ('BLOCKED_MISSING_FIELDS' as const) : ('PREPARED' as const);
  const packageStatus: PackageReadinessState = missing.length ? 'INCOMPLETE' : 'READY_FOR_MANNY_REVIEW';

  const pkg: ApplicationPackage = {
    id: `app-${opp.id}-${opts.lenderId}`,
    capitalOpportunityId: opp.id,
    lenderId: opts.lenderId,
    productId: opts.productId,
    populatedFields: populated,
    missingFields: missing,
    attachedDocumentIds: attached,
    status,
    attestation: 'PREPARED',
    packageStatus,
    sections,
    standardDocumentIds: attached,
    lenderSpecificRequirements,
    expectedQuestions: [],
    internalNotes: [
      'Prepared from supported client facts only. Not a borrower representation until client attestation.',
      'Atlas does not fabricate missing values.',
    ],
    notBorrowerRepresentation: true,
    createdAt: new Date().toISOString(),
  };
  pkg.expectedQuestions = expectedQuestionsFromPackage(pkg);
  return pkg;
}

const ATTEST_FORWARD: Record<ApplicationAttestationState, ApplicationAttestationState[]> = {
  PREPARED: ['CLIENT_CONFIRMATION_REQUIRED', 'CORRECTION_REQUIRED'],
  CLIENT_CONFIRMATION_REQUIRED: ['CLIENT_CONFIRMED', 'CORRECTION_REQUIRED'],
  CLIENT_CONFIRMED: ['APPROVED_FOR_SUBMISSION', 'CORRECTION_REQUIRED'],
  CORRECTION_REQUIRED: ['PREPARED', 'CLIENT_CONFIRMATION_REQUIRED'],
  APPROVED_FOR_SUBMISSION: ['CORRECTION_REQUIRED'],
};

export function attestApplication(
  pkg: ApplicationPackage,
  next: ApplicationAttestationState,
  actor: string,
  now = new Date().toISOString(),
): ApplicationPackage {
  const allowed = ATTEST_FORWARD[pkg.attestation] || [];
  if (!allowed.includes(next)) {
    throw new Error(`Invalid application attestation transition: ${pkg.attestation} → ${next}`);
  }
  let packageStatus: PackageReadinessState = pkg.packageStatus;
  if (next === 'CLIENT_CONFIRMATION_REQUIRED') packageStatus = 'CLIENT_CONFIRMATION_REQUIRED';
  if (next === 'CLIENT_CONFIRMED') packageStatus = 'CLIENT_CONFIRMATION_REQUIRED';
  if (next === 'APPROVED_FOR_SUBMISSION') packageStatus = 'READY_FOR_SUBMISSION';
  if (next === 'CORRECTION_REQUIRED' || next === 'PREPARED') packageStatus = pkg.missingFields.length ? 'INCOMPLETE' : 'READY_FOR_MANNY_REVIEW';
  return {
    ...pkg,
    attestation: next,
    packageStatus,
    attestedAt: now,
    attestedBy: actor,
    notBorrowerRepresentation: next === 'APPROVED_FOR_SUBMISSION' ? true : true,
  };
}

export function markPackageSubmittedRecordedOnly(pkg: ApplicationPackage): ApplicationPackage {
  if (pkg.attestation !== 'APPROVED_FOR_SUBMISSION' && pkg.packageStatus !== 'READY_FOR_SUBMISSION') {
    throw new Error('Recorded submission requires APPROVED_FOR_SUBMISSION / READY_FOR_SUBMISSION package.');
  }
  return { ...pkg, packageStatus: 'SUBMITTED_RECORDED_ONLY' };
}
