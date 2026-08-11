/**
 * BA V2 commercial engine for Atlas Elite Revenue UI.
 * SoR catalogs are synced snapshots from hvcg-business-architecture-v2/config/business.
 * Do not hard-code V2 prices in components — read from these catalogs.
 * BL-C1: proposals cannot auto-send.
 */

import offerCatalog from './catalog/offer-catalog.json';
import serviceLines from './catalog/service-lines.json';
import rateCard from './catalog/pricing-rate-card-v2.json';
import freeFitPolicy from './catalog/free-fit-assessment.json';
import decisionEngine from './catalog/offer-decision-engine.json';
import compliance from './catalog/compliance-language.json';
import migrationSeed from './catalog/client-migration-seed.json';

export const BL_C1_ACTIVE = true;
export const CURRENT_RATE_CARD_ID = 'HVCG-PRICE-2026-08-11-v2';
export const HISTORICAL_RATE_CARD_ID = 'HVCG-PRICE-2026-07-15-v1';
export const ACCG_LOCKED_MONTHLY = 4539;

export type CommercialClass = 'STRUCTURED_OFFER' | 'RECURRING_RETAINER' | 'PREMIUM_SPECIAL_PROJECT';
export type ClientClassification = 'HVCG_NEW_CLIENT' | 'HVS_LEGACY_CLIENT' | 'UNKNOWN';
export type LeadSource =
  | 'Website'
  | 'Direct Outreach'
  | 'Existing Client'
  | 'Referral Partner'
  | 'Lender'
  | 'SBA Lender'
  | 'CPA'
  | 'Attorney'
  | 'Insurance Partner'
  | 'Podcast'
  | 'LinkedIn'
  | 'YouTube'
  | 'Instagram'
  | 'TikTok'
  | 'Newsletter'
  | 'Event'
  | 'Other';

export type ProposalStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'INTERNAL_REVIEW'
  | 'OWNER_APPROVAL_REQUIRED'
  | 'APPROVED_TO_SEND'
  | 'SENT'
  | 'CLIENT_REVIEW'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'SUPERSEDED';

export type MigrationAction = 'Retain' | 'Reprice' | 'Upsell' | 'Re-engage' | 'Archive' | 'Transition' | 'Decline';
export type MigrationState =
  | 'NOT_REVIEWED'
  | 'REVIEW_IN_PROGRESS'
  | 'RECOMMENDATION_READY'
  | 'OWNER_REVIEW'
  | 'OWNER_APPROVED'
  | 'PROPOSAL_DRAFTED'
  | 'CLIENT_CONTACT_GATED'
  | 'CLIENT_REVIEW'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'COMPLETED'
  | 'ARCHIVED';

export interface PricingRecommendation {
  offerCode: string;
  commercialClass: CommercialClass;
  recommendedSetupFee: number | null;
  recommendedRetainer: number | null;
  pricingVersion: string;
  pricingStateForNewEconomics: 'CURRENT_RATE_CARD' | 'RECOMMENDED_FUTURE';
  rationale: string[];
  approvalRequired: true;
  isApprovedPrice: false;
  complianceFlags: string[];
  legacyProtected: boolean;
  contractedCurrent: number | null;
  recommendedFuture: number | null;
}

export interface FreeFitRecord {
  assessmentId: string;
  company: string;
  revenueRange: string;
  needCategory: string;
  capitalGoal: string;
  urgency: string;
  systemsCondition: string;
  documentAvailability: string;
  referralSource: string;
  leadSource: LeadSource;
  qualificationResult: 'Qualified' | 'Disqualified' | 'Pending';
  serviceFit: string | null;
  recommendedDiagnostic: string | null;
  recommendedOffer: string | null;
  notes: string;
  substantiveBlocked: string[];
}

export interface DiagnosticRecord {
  diagnosticId: string;
  diagnosticType: string;
  fee: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BYPASSED' | 'CANCELLED';
  pricingVersion: string;
  requiredDocuments: string[];
  documentsReceived: string[];
  findingsFact: string[];
  findingsAiInference: string[];
  findingsAdvisorConclusion: string[];
  riskFlags: string[];
  recommendedOffer: string | null;
  recommendedServiceLine: string | null;
  humanApproval: boolean;
  completionDate: string | null;
  bypass: boolean;
  bypassReason: string | null;
  bypassAuthorizedBy: string | null;
  bypassDate: string | null;
}

export interface ProposalDraft {
  status: ProposalStatus;
  archetype: CommercialClass;
  offerCode: string;
  pricingVersionId: string;
  recommended: PricingRecommendation;
  proposedSetup: number | null;
  proposedRetainer: number | null;
  override?: {
    type: 'MANUAL_PRICING_OVERRIDE';
    approver: string;
    reason: string;
    date: string;
  };
  body: string;
  canAutoSend: false;
  blC1Active: true;
  approvalStatus: 'None' | 'Pending' | 'Approved' | 'Rejected' | 'ChangesRequested';
}

export interface MigrationRecord {
  clientName: string;
  classification: string;
  contractedCurrent: number | null;
  recommendedFuture: number | null;
  recommendedOffer: string | null;
  migrationAction: MigrationAction;
  migrationState: MigrationState;
  ownerApproval: boolean;
  clientProposalStatus: string;
  notes: string;
  sourceEvidence: string;
}

export function listServiceLines(includeRestricted = false) {
  return (serviceLines as { serviceLines: Array<{ code: string; name: string; public: boolean; restricted?: boolean }> }).serviceLines.filter(
    (s) => includeRestricted || (!s.restricted && s.public)
  );
}

export function listOffers(includeRestricted = false) {
  return (offerCatalog as { offers: Array<Record<string, unknown>> }).offers.filter(
    (o) => includeRestricted || (o.public !== false && !o.restricted)
  ) as Array<{
    offerCode: string;
    name: string;
    serviceLine: string;
    category: CommercialClass;
    setupFeeGuidance?: { min?: number; max?: number; typical?: number };
    monthlyRetainerOption?: { min?: number; max?: number } | null;
    deliverables?: string[];
    requiredInputs?: string[];
    complianceRequirements?: string[];
    salesAngle?: string;
    description?: string;
    painPoint?: string;
  }>;
}

export function isLegacy(classification: ClientClassification) {
  return classification === 'HVS_LEGACY_CLIENT';
}

export function recommendOfferFromNeed(need: string) {
  const rules = (decisionEngine as { rules: Array<{ need: string; offerCode: string; diagnostic: string | null }> }).rules;
  const hit = rules.find((r) => r.need.toLowerCase() === need.trim().toLowerCase());
  return hit ?? null;
}

export function validateFreeFitSubstantive(attempted: string[]): string[] {
  const prohibited = new Set((freeFitPolicy as { prohibitedSubstantiveWork: string[] }).prohibitedSubstantiveWork);
  return attempted.filter((a) => prohibited.has(a)).map((a) => `Free Fit must not include: ${a}`);
}

export function recommendPricing(input: {
  offerCode: string;
  commercialClass: CommercialClass;
  clientClassification: ClientClassification;
  contractedCurrent?: number | null;
  complexity?: 'standard' | 'premium';
}): PricingRecommendation {
  const offer = listOffers(true).find((o) => o.offerCode === input.offerCode);
  if (!offer) {
    throw new Error(`Unknown offer ${input.offerCode}`);
  }
  const setup = offer.setupFeeGuidance ?? {};
  let setupTarget = setup.typical ?? setup.min ?? null;
  if (input.complexity === 'premium' && setup.max != null) setupTarget = setup.max;
  const retainer = offer.monthlyRetainerOption;
  let retainerTarget = retainer?.min ?? null;
  if (input.complexity === 'premium' && retainer?.max != null) retainerTarget = retainer.max;

  const legacy = isLegacy(input.clientClassification);
  return {
    offerCode: input.offerCode,
    commercialClass: input.commercialClass,
    recommendedSetupFee: legacy ? null : setupTarget,
    recommendedRetainer: legacy ? null : retainerTarget,
    pricingVersion: legacy ? HISTORICAL_RATE_CARD_ID : CURRENT_RATE_CARD_ID,
    pricingStateForNewEconomics: legacy ? 'RECOMMENDED_FUTURE' : 'CURRENT_RATE_CARD',
    rationale: [
      `Offer ${offer.name}`,
      `Class ${input.commercialClass}`,
      `Client ${input.clientClassification}`,
      `Rate card ${(rateCard as { versionId: string; status: string }).versionId} (${(rateCard as { status: string }).status})`,
    ],
    approvalRequired: true,
    isApprovedPrice: false,
    complianceFlags: offer.complianceRequirements ?? [],
    legacyProtected: legacy,
    contractedCurrent: input.contractedCurrent ?? null,
    recommendedFuture: legacy ? retainerTarget : null,
  };
}

export function protectContracted(contracted: number | null, recommended: number | null, approved = false, executed = false) {
  if (!approved || !executed) return contracted;
  return recommended ?? contracted;
}

export function draftProposalBody(input: {
  clientName: string;
  offerCode: string;
  commercialClass: CommercialClass;
  recommendation: PricingRecommendation;
  proposedSetup: number | null;
  proposedRetainer: number | null;
}): string {
  const offer = listOffers(true).find((o) => o.offerCode === input.offerCode);
  const outOfScope =
    input.commercialClass === 'RECURRING_RETAINER'
      ? (compliance as { outOfScopeRetainer: string }).outOfScopeRetainer
      : (compliance as { outOfScopeStructured: string }).outOfScopeStructured;
  const general = (compliance as { language: { generalAdvisory: string } }).language.generalAdvisory;
  return [
    `# ${input.commercialClass.replaceAll('_', ' ')} PROPOSAL`,
    ``,
    `Client: ${input.clientName}`,
    `Offer: ${offer?.name ?? input.offerCode} (${input.offerCode})`,
    `Pricing version: ${input.recommendation.pricingVersion}`,
    ``,
    `## Situation`,
    offer?.painPoint ?? '',
    ``,
    `## Objective`,
    offer?.salesAngle ?? '',
    ``,
    `## Scope`,
    offer?.description ?? '',
    ``,
    `## Deliverables`,
    ...(offer?.deliverables ?? []).map((d) => `- ${d}`),
    ``,
    `## Client Responsibilities`,
    ...(offer?.requiredInputs ?? []).map((d) => `- ${d}`),
    ``,
    `## Fee`,
    `Setup: ${input.proposedSetup ?? input.recommendation.recommendedSetupFee ?? '—'}`,
    `Retainer: ${input.proposedRetainer ?? input.recommendation.recommendedRetainer ?? '—'}`,
    `Recommendation is NOT an approved contract price.`,
    ``,
    `## Out-of-Scope`,
    outOfScope,
    ``,
    `## Compliance`,
    general,
    ``,
    `## Next Steps`,
    `Internal approval required. BL-C1 active — no autonomous send.`,
  ].join('\n');
}

export function transitionProposal(status: ProposalStatus, next: ProposalStatus): { ok: boolean; error?: string } {
  if ((next === 'SENT' || next === 'CLIENT_REVIEW') && BL_C1_ACTIVE) {
    return { ok: false, error: 'BL-C1 active: cannot mark SENT / external client review from Sprint 4 UI' };
  }
  return { ok: true };
}

export function migrationRecords(): MigrationRecord[] {
  const records = (migrationSeed as { records: Array<Record<string, unknown>> }).records;
  return records.map((r) => {
    const price = r.currentContractedPrice as { amount: number | null; evidence?: string } | undefined;
    return {
      clientName: String(r.clientName),
      classification: String(r.classification),
      contractedCurrent: price?.amount ?? null,
      recommendedFuture: null,
      recommendedOffer: (r.recommendedOffer as string) ?? null,
      migrationAction: (r.migrationAction as MigrationAction) ?? 'Retain',
      migrationState: 'NOT_REVIEWED',
      ownerApproval: false,
      clientProposalStatus: 'Not Proposed',
      notes: String(r.notes ?? ''),
      sourceEvidence: price?.evidence ?? 'REQUIRES_VERIFICATION',
    };
  });
}

export function attributionSources(): LeadSource[] {
  return [
    'Website',
    'Direct Outreach',
    'Existing Client',
    'Referral Partner',
    'Lender',
    'SBA Lender',
    'CPA',
    'Attorney',
    'Insurance Partner',
    'Podcast',
    'LinkedIn',
    'YouTube',
    'Instagram',
    'TikTok',
    'Newsletter',
    'Event',
    'Other',
  ];
}

export function rateCardMeta() {
  return {
    versionId: (rateCard as { versionId: string }).versionId,
    status: (rateCard as { status: string }).status,
    diagnostics: (rateCard as { diagnostics: unknown }).diagnostics,
    monthlyRetainers: (rateCard as { monthlyRetainers: unknown }).monthlyRetainers,
  };
}

/** Success-fee foundation only — not a full calculation engine. */
export interface SuccessFeeFoundation {
  percentage: number | null;
  base: 'collected_cleared_revenue' | 'closed_financing' | 'other' | null;
  trigger: string | null;
  complianceFlag: boolean;
  agreementStatus: 'Not Proposed' | 'Draft' | 'Internal Review' | 'Approved' | 'Executed' | 'Declined';
}

export function successFeeFoundation(partial?: Partial<SuccessFeeFoundation>): SuccessFeeFoundation {
  return {
    percentage: partial?.percentage ?? null,
    base: partial?.base ?? 'collected_cleared_revenue',
    trigger: partial?.trigger ?? null,
    complianceFlag: partial?.complianceFlag ?? true,
    agreementStatus: partial?.agreementStatus ?? 'Not Proposed',
  };
}
