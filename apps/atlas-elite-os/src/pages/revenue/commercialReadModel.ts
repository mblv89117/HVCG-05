/**
 * Elite read-models for Revenue OS commercial workspace.
 * Source of truth remains src/revenue_os — this file only renders tip contracts.
 * Observation until operator accept. autoSend and liveDispatch stay false.
 *
 * REVOS-ELITE-RT-20260820-01: fail closed unless opportunityId matches a loaded
 * commercial context for that ClientCode. Never remap ACME01 prices onto another id.
 */

export const COMMERCIAL_GATES = {
  liveDispatch: false,
  autoSend: false,
  autoProvisionAccess: false,
  mutatesPaidAds: false,
  copilotHasCommercialAuthority: false,
  wonActivatesClient: false,
} as const;

export type CommercialStage =
  | 'QUALIFIED_OPPORTUNITY'
  | 'PROPOSAL_DRAFT'
  | 'PROPOSAL_APPROVAL'
  | 'CLOSED_WON'
  | 'ENGAGEMENT';

export interface OfferReadModel {
  contractVersion: 'offer-recommendation.v1';
  recommendationId: string;
  opportunityId: string;
  clientCode: string;
  sku: string;
  packageName: string;
  rationale: string;
  confidence: number;
  sourceSystem: 'atlas' | 'copilot' | '360';
  observationOnly: true;
  createsCommitment: false;
  offerCode: string;
  serviceLine: string;
  commercialClass: 'STRUCTURED_OFFER' | 'RECURRING_RETAINER' | 'PREMIUM_SPECIAL_PROJECT';
}

export interface PricingReadModel {
  contractVersion: 'pricing-recommendation.v1';
  recommendationId: string;
  opportunityId: string;
  currency: 'USD';
  listPrice: number;
  recommendedPrice: number;
  floorPrice: number;
  observationOnly: true;
  createsCommitment: false;
  pricingVersion: string;
}

export interface ProposalReadModel {
  contractVersion: 'proposal-context.v1';
  proposalId: string;
  opportunityId: string;
  clientCode: string;
  offerSku: string;
  status: 'draft' | 'internal_review' | 'ready' | 'accepted';
  autoSend: false;
}

export interface EngagementReadModel {
  contractVersion: 'engagement-created.v1';
  engagementId: string;
  clientCode: string;
  opportunityId: string;
  sku: string;
  startsOn: string;
  scopeSummary: string;
  successFeeState: 'GUIDANCE' | 'EARNED' | 'COLLECTED';
  referralState: 'ELIGIBLE' | 'PAYABLE' | 'PAID' | null;
  payoutAllowed: false;
}

export interface OpportunityCommercialReadModel {
  contractVersion: 'opportunity-commercial-context.v1';
  opportunityId: string;
  clientCode: string;
  clientName: string;
  stage: CommercialStage;
  ownerPrincipal: string;
  estimatedValue: number;
  currency: 'USD';
  etag: string;
  offer: OfferReadModel;
  pricing: PricingReadModel;
  proposal: ProposalReadModel;
  engagement: EngagementReadModel | null;
}

/** Fail-closed result: unmatched opportunity/ClientCode never inherit another tenant's prices. */
export type CommercialReadModelResult =
  | { ok: true; model: OpportunityCommercialReadModel; error: null }
  | { ok: false; model: null; error: string };

/** Synthetic ACME journey already certified on tip 9c9c331 — render only. */
export const ACME_COMMERCIAL_READ_MODEL: OpportunityCommercialReadModel = {
  contractVersion: 'opportunity-commercial-context.v1',
  opportunityId: 'opp-revos-001',
  clientCode: 'ACME01',
  clientName: 'Acme Precision Manufacturing',
  stage: 'QUALIFIED_OPPORTUNITY',
  ownerPrincipal: 'advisor@hvcg.test',
  estimatedValue: 25000,
  currency: 'USD',
  etag: '1',
  offer: {
    contractVersion: 'offer-recommendation.v1',
    recommendationId: 'offer-revos-001',
    opportunityId: 'opp-revos-001',
    clientCode: 'ACME01',
    sku: 'SKU-CAP-CORE',
    packageName: 'Lender-Ready Capital Package',
    rationale: 'Ready for financing → OFF-CAP-PKG',
    confidence: 0.8,
    sourceSystem: 'atlas',
    observationOnly: true,
    createsCommitment: false,
    offerCode: 'OFF-CAP-PKG',
    serviceLine: 'SL-CAPITAL',
    commercialClass: 'STRUCTURED_OFFER',
  },
  pricing: {
    contractVersion: 'pricing-recommendation.v1',
    recommendationId: 'price-revos-001',
    opportunityId: 'opp-revos-001',
    currency: 'USD',
    listPrice: 35000,
    recommendedPrice: 10000,
    floorPrice: 10000,
    observationOnly: true,
    createsCommitment: false,
    pricingVersion: 'HVCG-PRICE-2026-08-11-v2',
  },
  proposal: {
    contractVersion: 'proposal-context.v1',
    proposalId: 'prop-revos-001',
    opportunityId: 'opp-revos-001',
    clientCode: 'ACME01',
    offerSku: 'OFF-CAP-PKG',
    status: 'draft',
    autoSend: false,
  },
  engagement: null,
};

/**
 * Loaded commercial contexts keyed by opportunityId.
 * Only ACME01 / opp-revos-001 is loaded this cycle — no ACME remapping, no ACCG01 writes.
 */
const LOADED_COMMERCIAL_CONTEXTS: Readonly<Record<string, OpportunityCommercialReadModel>> = {
  [ACME_COMMERCIAL_READ_MODEL.opportunityId]: ACME_COMMERCIAL_READ_MODEL,
};

export function hasLoadedCommercialContext(opportunityId?: string | null): boolean {
  const id = opportunityId?.trim() ?? '';
  return Boolean(id && LOADED_COMMERCIAL_CONTEXTS[id]);
}

/**
 * REVOS-ELITE-RT-20260820-01: fail closed unless opportunityId matches a loaded
 * commercial context for that ClientCode. Never render ACME01 floor/list under a
 * non-ACME opportunity (e.g. opp-accg-expansion-001).
 */
export function loadCommercialReadModel(
  opportunityId?: string | null,
  clientCode?: string | null,
): CommercialReadModelResult {
  const id = opportunityId?.trim() ?? '';
  if (!id) {
    return {
      ok: false,
      model: null,
      error:
        'opportunityId is required. Commercial workspace fails closed when no opportunity is specified.',
    };
  }

  const record = LOADED_COMMERCIAL_CONTEXTS[id];
  if (!record) {
    return {
      ok: false,
      model: null,
      error: `No loaded commercial context for opportunity '${id}'. Fail closed — ACME01 prices are not remapped onto unmatched opportunities.`,
    };
  }

  const requestedClient = clientCode?.trim() ?? '';
  if (requestedClient && requestedClient !== record.clientCode) {
    return {
      ok: false,
      model: null,
      error: `ClientCode '${requestedClient}' does not match loaded commercial context '${record.clientCode}' for opportunity '${id}'. Fail closed.`,
    };
  }

  return { ok: true, model: structuredClone(record), error: null };
}
