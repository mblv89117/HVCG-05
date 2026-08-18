import { randomUUID } from 'node:crypto';
import {
  applyMannyDecision,
  assertTransition,
  buildUnderwritingSummary,
  classifyLenderMessage,
  commandKpis,
  compareOffers,
  consolidateMissingRequest,
  createFeeRecord,
  defaultClosingConditions,
  detectDuplicate,
  draftStrategy,
  evaHandoffAllowed,
  generateChecklist,
  InvalidStageTransitionError,
  isCapitalClientCode,
  isCapitalStage,
  isMannyApprover,
  matchLenders,
  missingValue,
  overrideChecklistItem,
  prepareApplication,
  preserveAttribution,
  reviewDocument,
  STAGE_TO_LEGACY_FUNDING_STATUS,
  toQueueItem,
  type Attribution,
  type CapitalOpportunity,
  type CapitalStage,
  type ChecklistItem,
  type TransactionType,
} from '@hvcg/atlas-capital-core';
import type { AtlasPrincipal } from '../middleware/auth.ts';
import { canAccessClient } from './authz.ts';
import { conflict, forbidden, notFound, unprocessable } from './errors.ts';
import type { CapitalPersistence, CapitalState } from './store.ts';

const TRANSACTION_TYPES: TransactionType[] = [
  'conventional_bank_loan',
  'sba',
  'sba_working_capital',
  'sba_express',
  'acquisition',
  'commercial_real_estate',
  'construction',
  'working_capital_loc',
  'equipment',
  'ar_financing',
  'asset_based_lending',
  'inventory',
  'refinance',
  'bridge',
  'recapitalization',
];

function nowIso(): string {
  return new Date().toISOString();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function assertCapitalAccess(principal: AtlasPrincipal, clientCode: string): void {
  if (!canAccessClient(principal, clientCode)) {
    forbidden();
  }
}

export function visibleOpportunities(state: CapitalState, principal: AtlasPrincipal): CapitalOpportunity[] {
  return state.opportunities.filter((o) => canAccessClient(principal, o.clientCode));
}

function requireOpp(state: CapitalState, principal: AtlasPrincipal, id: string): CapitalOpportunity {
  const opp = state.opportunities.find((o) => o.id === id);
  if (!opp || !canAccessClient(principal, opp.clientCode)) notFound();
  return opp;
}

export class CapitalService {
  constructor(private readonly store: CapitalPersistence) {}

  async commandCenter(principal: AtlasPrincipal) {
    const state = await this.store.load();
    const opps = visibleOpportunities(state, principal);
    const checklists = new Map(opps.map((o) => [o.id, state.checklists[o.id] || []]));
    const offers = state.offers.filter((x) => opps.some((o) => o.id === x.capitalOpportunityId));
    const fees = state.fees.filter((f) => canAccessClient(principal, f.clientCode));
    const queues = opps.map((o) => toQueueItem(o, checklists.get(o.id) || []));
    return {
      kpis: commandKpis(opps, checklists, offers, fees),
      queues,
      disclaimer:
        'HVCG is not a lender. Financing outcomes are determined by third-party capital providers. AI output is unverified until a human confirms source documents.',
    };
  }

  async list(principal: AtlasPrincipal) {
    return { opportunities: visibleOpportunities(await this.store.load(), principal) };
  }

  async get(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opportunity = requireOpp(state, principal, id);
    return {
      opportunity,
      checklist: state.checklists[id] || [],
      documents: state.documents.filter((d) => d.capitalOpportunityId === id),
      reviews: state.reviews.filter((r) => r.capitalOpportunityId === id),
      strategy: state.strategies.find((s) => s.capitalOpportunityId === id) || null,
      underwriting: state.underwriting.find((u) => u.capitalOpportunityId === id) || null,
      submissions: state.submissions.filter((s) => s.capitalOpportunityId === id),
      offers: state.offers.filter((o) => o.capitalOpportunityId === id),
      closing: state.closing[id] || [],
    };
  }

  async create(principal: AtlasPrincipal, body: Record<string, unknown>) {
    const clientCode = asString(body.clientCode);
    if (!isCapitalClientCode(clientCode)) unprocessable('Canonical ClientCode required');
    assertCapitalAccess(principal, clientCode);
    const state = await this.store.load();
    const idempotencyKey = asString(body.idempotencyKey);
    if (idempotencyKey) {
      const existing = state.opportunities.find((o) => o.idempotencyKey === idempotencyKey);
      if (existing) {
        assertCapitalAccess(principal, existing.clientCode);
        return { opportunity: existing, created: false };
      }
    }
    const tx = asString(body.transactionType) as TransactionType;
    if (!TRANSACTION_TYPES.includes(tx)) unprocessable('Unknown transactionType');
    const need = asRecord(body.need);
    const business = asRecord(body.business);
    const amount = asNumber(need.requestedAmount) ?? asNumber(body.requestedAmount);
    const revenueRaw = asRecord(business.annualRevenue);
    const revenueValue = asNumber(revenueRaw.value) ?? asNumber(body.annualRevenue);
    const revenueVerification = asString(revenueRaw.verification) || asString(body.revenueVerification);
    const t = nowIso();
    const opportunity: CapitalOpportunity = {
      id: `cap-${randomUUID()}`,
      title: asString(body.title) || `${clientCode} capital need`,
      clientId: asString(body.clientId) || clientCode,
      clientCode,
      opportunityId: asString(body.opportunityId) || undefined,
      projectId: asString(body.projectId) || undefined,
      engagementId: asString(body.engagementId) || undefined,
      transactionType: tx,
      capitalTypeLegacy: STAGE_TO_LEGACY_FUNDING_STATUS.NeedIdentified,
      need: {
        requestedAmount: amount,
        purpose: asString(need.purpose) || asString(body.purpose) || undefined,
        useOfFunds: asString(need.useOfFunds) || asString(body.useOfFunds) || undefined,
        urgency: (asString(body.urgency) as CapitalOpportunity['need']['urgency']) || 'normal',
      },
      business: {
        industry: asString(business.industry) || asString(body.industry) || undefined,
        annualRevenue:
          revenueValue != null
            ? {
                value: revenueValue,
                verification: revenueVerification === 'VERIFIED' ? 'VERIFIED' : revenueVerification === 'MISSING' ? 'MISSING' : 'UNVERIFIED',
                confidence: revenueVerification === 'VERIFIED' ? 1 : 0.4,
              }
            : missingValue<number>(),
      },
      capitalProfile: {},
      transaction: {},
      stage: 'NeedIdentified',
      stageEnteredAt: t,
      ownerEmail: principal.email || principal.userId,
      nextAction: 'Qualify the capital need',
      nextActionOwner: principal.email,
      submissionReadiness: false,
      closingReadiness: false,
      lastMeaningfulActivityAt: t,
      clientApproval: 'NOT_REQUIRED',
      mannyStrategyApproval: 'NOT_REQUIRED',
      mannyShortlistApproval: 'NOT_REQUIRED',
      createdAt: t,
      updatedAt: t,
      idempotencyKey: idempotencyKey || undefined,
      handoffSource: asString(body.handoffSource) || 'Direct',
    };
    state.opportunities.push(opportunity);
    await this.store.save(state);
    return { opportunity, created: true };
  }

  async transition(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const to = asString(body.to) || asString(body.toStage) || asString(body.stage);
    if (!isCapitalStage(to)) unprocessable('Unknown stage');
    if (
      (to === 'StrategyApproved' || to === 'ReadyForSubmission') &&
      !isMannyApprover(principal.roles)
    ) {
      forbidden('HVCG Owner approval required for this stage');
    }
    try {
      assertTransition(opp.stage, to);
    } catch (err) {
      if (err instanceof InvalidStageTransitionError) conflict(err.message, 'invalid_stage_transition');
      throw err;
    }
    const t = nowIso();
    opp.stage = to as CapitalStage;
    opp.stageEnteredAt = t;
    opp.updatedAt = t;
    opp.lastMeaningfulActivityAt = t;
    opp.capitalTypeLegacy = STAGE_TO_LEGACY_FUNDING_STATUS[opp.stage];
    await this.store.save(state);
    return { opportunity: opp };
  }

  async generateChecklist(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const items = generateChecklist({
      transactionType: opp.transactionType,
      personalGuaranteeExpected: true,
      sba: opp.transactionType.startsWith('sba'),
      realEstateComponent: opp.transaction.realEstateComponent,
    });
    state.checklists[id] = items;
    if (opp.stage === 'NeedIdentified') {
      assertTransition(opp.stage, 'InitialQualification');
      opp.stage = 'InitialQualification';
      opp.stageEnteredAt = nowIso();
    }
    if (opp.stage === 'InitialQualification') {
      assertTransition(opp.stage, 'DocumentsRequested');
      opp.stage = 'DocumentsRequested';
      opp.stageEnteredAt = nowIso();
    }
    opp.updatedAt = nowIso();
    await this.store.save(state);
    return { checklist: items };
  }

  async checklist(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    return { checklist: state.checklists[id] || [] };
  }

  async overrideItem(principal: AtlasPrincipal, id: string, itemId: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    const items = state.checklists[id] || [];
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) notFound('Checklist item not found');
    let patched: ChecklistItem;
    try {
      patched = overrideChecklistItem(items[idx], {
        status: (asString(body.status) as ChecklistItem['status']) || items[idx].status,
        notes: asString(body.notes) || items[idx].notes,
        overrideReason: asString(body.overrideReason),
        overrideBy: principal.email || principal.userId,
      });
    } catch (err) {
      unprocessable(err instanceof Error ? err.message : 'Checklist override requires an audit reason');
    }
    items[idx] = patched;
    await this.store.save(state);
    return { item: patched };
  }

  async addDocument(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const fileName = asString(body.fileName);
    if (!fileName) unprocessable('fileName required');
    const sha256 = asString(body.sha256) || undefined;
    const dup = detectDuplicate(state.documents.filter((d) => d.capitalOpportunityId === id), {
      sha256,
      fileName,
    });
    if (dup) {
      return { document: state.documents.find((d) => d.id === dup), duplicate: true, duplicateOf: dup };
    }
    const doc = {
      id: `doc-${randomUUID()}`,
      capitalOpportunityId: id,
      clientCode: opp.clientCode,
      checklistItemId: asString(body.checklistItemId) || undefined,
      documentType: asString(body.documentType) || 'other',
      fileName,
      contentType: asString(body.contentType) || 'application/pdf',
      sizeBytes: asNumber(body.sizeBytes) || 0,
      sha256,
      version: 1,
      source: asString(body.source) || 'client-upload',
      associatedAt: nowIso(),
      associatedBy: principal.email || principal.userId,
      originalPreserved: true as const,
      webUrl: asString(body.webUrl) || undefined,
    };
    state.documents.push(doc);
    await this.store.save(state);
    return { document: doc, duplicate: false, duplicateOf: undefined };
  }

  async review(principal: AtlasPrincipal, id: string, docId: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    const doc = state.documents.find((d) => d.id === docId && d.capitalOpportunityId === id);
    if (!doc) notFound('Document not found');
    const review = reviewDocument({
      document: doc,
      summary: asString(body.summary) || undefined,
      extractedFacts: Array.isArray(body.extractedFacts)
        ? (body.extractedFacts as Array<{
            field: string;
            value: string | number | null;
            verification: 'VERIFIED';
            confidence: number;
            sourceRef: { sourceSystem: string; capturedAt: string };
          }>)
        : [],
    });
    state.reviews = state.reviews.filter((r) => r.documentId !== docId);
    state.reviews.push(review);
    await this.store.save(state);
    return { review };
  }

  async missingRequest(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    return { request: consolidateMissingRequest(state.checklists[id] || [], opp.clientCode) };
  }

  async underwrite(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const uw = buildUnderwritingSummary({
      opportunity: opp,
      checklist: state.checklists[id] || [],
      reviews: state.reviews.filter((r) => r.capitalOpportunityId === id),
      createdBy: principal.email || principal.userId,
    });
    state.underwriting = state.underwriting.filter((u) => u.capitalOpportunityId !== id);
    state.underwriting.push(uw);
    await this.store.save(state);
    return { underwriting: uw };
  }

  async strategy(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const uw =
      state.underwriting.find((u) => u.capitalOpportunityId === id) ||
      buildUnderwritingSummary({
        opportunity: opp,
        checklist: state.checklists[id] || [],
        reviews: [],
        createdBy: principal.email || principal.userId,
      });
    const matches = matchLenders(opp, state.lenders, state.products);
    const strat = draftStrategy({ opportunity: opp, matches, underwriting: uw });
    state.strategies = state.strategies.filter((s) => s.capitalOpportunityId !== id);
    state.strategies.push(strat);
    opp.stage = 'AwaitingMannyStrategyApproval';
    opp.stageEnteredAt = nowIso();
    opp.mannyStrategyApproval = 'PENDING';
    await this.store.save(state);
    return { strategy: strat };
  }

  async strategyDecision(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const strat = state.strategies.find((s) => s.capitalOpportunityId === id);
    if (!strat) notFound('Strategy not found');
    const decision = asString(body.decision);
    if (decision !== 'APPROVED' && decision !== 'REJECTED' && decision !== 'REVISE') {
      unprocessable('decision must be APPROVED, REJECTED, or REVISE');
    }
    const updated = applyMannyDecision(strat, decision, principal.email || principal.userId);
    Object.assign(strat, updated);
    opp.mannyStrategyApproval = updated.mannyApproval;
    if (decision === 'APPROVED') {
      try {
        assertTransition(opp.stage, 'StrategyApproved');
        opp.stage = 'StrategyApproved';
        opp.stageEnteredAt = nowIso();
      } catch (err) {
        if (err instanceof InvalidStageTransitionError) {
          opp.stage = 'StrategyApproved';
          opp.stageEnteredAt = nowIso();
        } else throw err;
      }
    }
    await this.store.save(state);
    return { strategy: strat, opportunity: opp };
  }

  async addLender(principal: AtlasPrincipal, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    const lender = {
      id: `ln-${randomUUID()}`,
      name: asString(body.name) || 'Unnamed lender',
      organizationType: asString(body.organizationType) || undefined,
      geography: asString(body.geography) || undefined,
    };
    state.lenders.push(lender);
    await this.store.save(state);
    return { lender };
  }

  async addProduct(principal: AtlasPrincipal, lenderId: string, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    if (!state.lenders.some((l) => l.id === lenderId)) notFound('Lender not found');
    const product = {
      id: `pr-${randomUUID()}`,
      lenderId,
      productName: asString(body.productName) || 'Product',
      minAmount: asNumber(body.minAmount),
      maxAmount: asNumber(body.maxAmount),
      minRevenue: asNumber(body.minRevenue),
      freshness: (asString(body.freshness) as 'CURRENT' | 'STALE' | 'UNKNOWN') || 'UNKNOWN',
      lastVerifiedAt: asString(body.lastVerifiedAt) || undefined,
      source: asString(body.source) || undefined,
      verifiedBy: asString(body.verifiedBy) || undefined,
      confidence: asNumber(body.confidence),
      sbaParticipation: body.sbaParticipation === true,
    };
    state.products.push(product);
    await this.store.save(state);
    return { product };
  }

  async match(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const matches = matchLenders(opp, state.lenders, state.products);
    if (opp.stage === 'StrategyApproved' || opp.stage === 'LenderVendorResearch') {
      opp.stage = 'AwaitingMannyShortlistApproval';
      opp.stageEnteredAt = nowIso();
      opp.mannyShortlistApproval = 'PENDING';
    }
    await this.store.save(state);
    return { matches, opportunity: opp };
  }

  async shortlistDecision(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const decision = asString(body.decision);
    if (decision === 'APPROVED') {
      opp.mannyShortlistApproval = 'APPROVED';
      opp.stage = 'ReadyForSubmission';
      opp.stageEnteredAt = nowIso();
      const lenderIds = Array.isArray(body.lenderIds) ? body.lenderIds.map((x) => String(x).trim()).filter(Boolean) : [];
      for (const lenderId of lenderIds) {
        const exists = state.submissions.some(
          (s) => s.capitalOpportunityId === id && s.lenderId === lenderId && s.status === 'draft',
        );
        if (exists) continue;
        state.submissions.push({
          id: `sub-${randomUUID()}`,
          capitalOpportunityId: id,
          lenderId,
          method: 'package',
          status: 'draft',
          documentIds: [],
          notes: 'Shortlist outreach — recorded only.',
        });
      }
    } else if (decision === 'REJECTED' || decision === 'REVISE') {
      opp.mannyShortlistApproval = decision === 'REJECTED' ? 'REJECTED' : 'REVISE';
      opp.stage = 'LenderVendorResearch';
    } else unprocessable('decision must be APPROVED, REJECTED, or REVISE');
    await this.store.save(state);
    return { opportunity: opp };
  }

  async application(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const lenderId = asString(body.lenderId);
    if (!lenderId) unprocessable('lenderId required');
    const pkg = prepareApplication({
      opportunity: opp,
      lenderId,
      productId: asString(body.productId) || undefined,
      fieldMap: {},
      documents: state.documents.filter((d) => d.capitalOpportunityId === id),
    });
    state.applications = state.applications.filter((a) => a.id !== pkg.id);
    state.applications.push(pkg);
    await this.store.save(state);
    return { application: pkg };
  }

  async submission(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    void body.externalSubmit;
    if (
      opp.mannyStrategyApproval !== 'APPROVED' ||
      opp.mannyShortlistApproval !== 'APPROVED' ||
      opp.stage !== 'ReadyForSubmission'
    ) {
      forbidden('Submission requires Manny strategy and shortlist approval at ReadyForSubmission');
    }
    const sub = {
      id: `sub-${randomUUID()}`,
      capitalOpportunityId: id,
      lenderId: asString(body.lenderId) || 'unknown',
      method: 'package' as const,
      status: 'submitted' as const,
      submittedAt: nowIso(),
      submittedBy: principal.email || principal.userId,
      confirmationNumber: asString(body.confirmationNumber) || undefined,
      packageVersion: asString(body.packageVersion) || 'v1',
      documentIds: state.documents.filter((d) => d.capitalOpportunityId === id).map((d) => d.id),
      notes: 'Record only — no external portal submit. BL-C1.',
    };
    state.submissions.push(sub);
    if (opp.stage === 'ReadyForSubmission') {
      opp.stage = 'Submitted';
      opp.stageEnteredAt = nowIso();
    }
    await this.store.save(state);
    return { submission: sub, recordedOnly: true, externalSubmitAttempted: false, externalSubmit: false };
  }

  async classify(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    const classified = classifyLenderMessage(asString(body.text));
    return { classification: classified, communication: classified };
  }

  async addOffer(principal: AtlasPrincipal, id: string, body: Record<string, unknown>) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    const offer = {
      id: `off-${randomUUID()}`,
      capitalOpportunityId: id,
      lenderId: asString(body.lenderId) || 'ln-unknown',
      lenderName: asString(body.lenderName) || 'Unknown lender',
      amount: asNumber(body.amount) ?? undefined,
      interestRate: asNumber(body.interestRate) ?? undefined,
      assumptions: Array.isArray(body.assumptions) ? body.assumptions.map((x) => String(x)) : [],
      createdAt: nowIso(),
    };
    state.offers.push(offer);
    await this.store.save(state);
    return { offer };
  }

  async compare(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    requireOpp(state, principal, id);
    return compareOffers(state.offers.filter((o) => o.capitalOpportunityId === id));
  }

  async closing(principal: AtlasPrincipal, id: string) {
    const state = await this.store.load();
    const opp = requireOpp(state, principal, id);
    const items = defaultClosingConditions(opp.transactionType).map((c) => ({
      ...c,
      capitalOpportunityId: id,
    }));
    state.closing[id] = items;
    await this.store.save(state);
    return { closing: items, conditions: items };
  }

  async fee(principal: AtlasPrincipal, body: Record<string, unknown>) {
    const clientCode = asString(body.clientCode);
    if (!isCapitalClientCode(clientCode)) unprocessable('Canonical ClientCode required');
    assertCapitalAccess(principal, clientCode);
    const rec = createFeeRecord({
      clientCode,
      capitalOpportunityId: asString(body.capitalOpportunityId) || undefined,
      feeType: asString(body.feeType) || 'advisory',
      feeFormula: asString(body.feeFormula) || undefined,
      notes: asString(body.notes) || undefined,
    });
    const state = await this.store.load();
    state.fees.push(rec);
    await this.store.save(state);
    return { fee: rec };
  }

  async evaHandoff(principal: AtlasPrincipal, body: Record<string, unknown>) {
    const clientCode = asString(body.clientCode);
    if (!isCapitalClientCode(clientCode)) unprocessable('Canonical ClientCode required');
    assertCapitalAccess(principal, clientCode);
    const revenue = asNumber(body.annualRevenue);
    const route = evaHandoffAllowed(revenue);
    const attribution = preserveAttribution((body.attribution as Attribution) || {});
    const state = await this.store.load();
    state.attributions.push(attribution);
    if (route.route !== 'atlas_hvcg') {
      await this.store.save(state);
      return { route: route.route, created: false, opportunity: null, reason: route.reason };
    }
    const created = await this.create(principal, {
      ...body,
      clientCode,
      transactionType: asString(body.transactionType) || 'working_capital_loc',
      handoffSource: 'EVA',
      revenueVerification: 'UNVERIFIED',
    });
    return { route: route.route, ...created, reason: route.reason };
  }

  async copilotHandoff(principal: AtlasPrincipal, body: Record<string, unknown>) {
    const state = await this.store.load();
    const rec = {
      id: `acp-${randomUUID()}`,
      clientCode: asString(body.clientCode) || undefined,
      organizationName: asString(body.organizationName) || asString((body.organization as Record<string, unknown> | undefined)?.name),
      assessmentId: asString(body.assessmentId),
      recommendedPackage: asString(body.recommendedPackage),
      observationOnly: true as const,
      createdAt: nowIso(),
    };
    if (rec.clientCode) assertCapitalAccess(principal, rec.clientCode);
    state.copilotHandoffs.push(rec);
    await this.store.save(state);
    return {
      handoff: rec,
      mergedWithCapitalOperations: false,
      note: 'Agent Copilot creates AI implementation opportunities — not a capital diagnostic.',
    };
  }

  async attribution(principal: AtlasPrincipal, body: Record<string, unknown>) {
    if (!isMannyApprover(principal.roles)) forbidden('HVCG Owner approval required');
    const state = await this.store.load();
    const attr = preserveAttribution(body as Attribution);
    state.attributions.push(attr);
    await this.store.save(state);
    return { attribution: attr };
  }
}
