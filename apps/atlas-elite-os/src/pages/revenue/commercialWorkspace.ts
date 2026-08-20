/**
 * Operator-owned commercial accept path. Does not rebuild catalogs or engines.
 * Copilot cannot accept. Send / live dispatch / GCC provision stay closed.
 */

import {
  COMMERCIAL_GATES,
  type EngagementReadModel,
  type OpportunityCommercialReadModel,
  type ProposalReadModel,
} from './commercialReadModel';

export interface CommercialWorkspaceState {
  model: OpportunityCommercialReadModel;
  offerAcceptedBy: string | null;
  pricingAcceptedBy: string | null;
  scopeApprovedBy: string | null;
  sendError: string | null;
  gates: typeof COMMERCIAL_GATES;
}

export function createWorkspaceState(model: OpportunityCommercialReadModel): CommercialWorkspaceState {
  return {
    model: structuredClone(model),
    offerAcceptedBy: null,
    pricingAcceptedBy: null,
    scopeApprovedBy: null,
    sendError: null,
    gates: { ...COMMERCIAL_GATES },
  };
}

export function acceptOffer(state: CommercialWorkspaceState, operator: string): CommercialWorkspaceState {
  if (!operator.trim()) {
    return { ...state, sendError: 'Operator identity required — Copilot cannot accept an offer.' };
  }
  return {
    ...state,
    offerAcceptedBy: operator.trim(),
    sendError: null,
    model: {
      ...state.model,
      stage: 'PROPOSAL_DRAFT',
      etag: String(Number(state.model.etag) + 1),
    },
  };
}

export function acceptPricing(state: CommercialWorkspaceState, operator: string): CommercialWorkspaceState {
  if (!operator.trim()) {
    return { ...state, sendError: 'Operator identity required — Copilot cannot accept pricing.' };
  }
  if (!state.offerAcceptedBy) {
    return { ...state, sendError: 'Accept the offer recommendation before pricing.' };
  }
  return {
    ...state,
    pricingAcceptedBy: operator.trim(),
    sendError: null,
    model: {
      ...state.model,
      stage: 'PROPOSAL_APPROVAL',
      proposal: { ...state.model.proposal, status: 'ready' },
      etag: String(Number(state.model.etag) + 1),
    },
  };
}

export function attemptSendProposal(state: CommercialWorkspaceState): CommercialWorkspaceState {
  return {
    ...state,
    sendError: 'BL-C1: proposal cannot auto-send. liveDispatch remains false.',
    gates: { ...COMMERCIAL_GATES },
    model: {
      ...state.model,
      proposal: { ...state.model.proposal, autoSend: false, status: state.model.proposal.status },
    },
  };
}

export function acceptProposalInternally(state: CommercialWorkspaceState, operator: string): CommercialWorkspaceState {
  if (!operator.trim()) {
    return { ...state, sendError: 'Operator identity required to record acceptance.' };
  }
  if (!state.offerAcceptedBy || !state.pricingAcceptedBy) {
    return { ...state, sendError: 'Offer and pricing must be operator-accepted first.' };
  }
  const proposal: ProposalReadModel = {
    ...state.model.proposal,
    status: 'accepted',
    autoSend: false,
  };
  return {
    ...state,
    scopeApprovedBy: operator.trim(),
    sendError: null,
    model: {
      ...state.model,
      stage: 'CLOSED_WON',
      proposal,
      etag: String(Number(state.model.etag) + 1),
    },
  };
}

export function openEngagement(state: CommercialWorkspaceState, operator: string): CommercialWorkspaceState {
  if (!state.scopeApprovedBy) {
    return { ...state, sendError: 'Approved scope and economics required before engagement.' };
  }
  if (!operator.trim()) {
    return { ...state, sendError: 'Operator identity required to open an engagement.' };
  }
  const engagement: EngagementReadModel = {
    contractVersion: 'engagement-created.v1',
    engagementId: 'eng-revos-001',
    clientCode: state.model.clientCode,
    opportunityId: state.model.opportunityId,
    sku: state.model.offer.sku,
    startsOn: '2026-08-20',
    scopeSummary: state.model.offer.packageName,
    successFeeState: 'EARNED',
    referralState: 'PAYABLE',
    payoutAllowed: false,
  };
  return {
    ...state,
    sendError: null,
    model: {
      ...state.model,
      stage: 'ENGAGEMENT',
      engagement,
    },
  };
}

export function workspaceSummary(state: CommercialWorkspaceState) {
  return {
    liveDispatch: state.gates.liveDispatch,
    autoSend: state.model.proposal.autoSend,
    autoProvisionAccess: state.gates.autoProvisionAccess,
    offerObservationOnly: state.model.offer.observationOnly,
    pricingObservationOnly: state.model.pricing.observationOnly,
    offerAccepted: Boolean(state.offerAcceptedBy),
    pricingAccepted: Boolean(state.pricingAcceptedBy),
    engagementOpen: Boolean(state.model.engagement),
    wonActivatesClient: state.gates.wonActivatesClient,
  };
}
