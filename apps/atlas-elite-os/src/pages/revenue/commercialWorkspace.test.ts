import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACME_COMMERCIAL_READ_MODEL, COMMERCIAL_GATES } from './commercialReadModel.ts';
import {
  acceptOffer,
  acceptPricing,
  acceptProposalInternally,
  attemptSendProposal,
  createWorkspaceState,
  openEngagement,
  workspaceSummary,
} from './commercialWorkspace.ts';

describe('Elite commercial workspace read-models', () => {
  it('keeps observation-only offer/pricing and closed gates', () => {
    assert.equal(ACME_COMMERCIAL_READ_MODEL.offer.observationOnly, true);
    assert.equal(ACME_COMMERCIAL_READ_MODEL.offer.createsCommitment, false);
    assert.equal(ACME_COMMERCIAL_READ_MODEL.pricing.observationOnly, true);
    assert.equal(ACME_COMMERCIAL_READ_MODEL.proposal.autoSend, false);
    assert.equal(COMMERCIAL_GATES.liveDispatch, false);
    assert.equal(COMMERCIAL_GATES.autoProvisionAccess, false);
  });

  it('requires an operator to accept offer and pricing', () => {
    let state = createWorkspaceState(ACME_COMMERCIAL_READ_MODEL);
    state = acceptOffer(state, '');
    assert.equal(state.offerAcceptedBy, null);
    state = acceptOffer(state, 'advisor@hvcg.test');
    assert.equal(state.offerAcceptedBy, 'advisor@hvcg.test');
    state = acceptPricing(state, '');
    assert.equal(state.pricingAcceptedBy, null);
    state = acceptPricing(state, 'advisor@hvcg.test');
    assert.equal(state.pricingAcceptedBy, 'advisor@hvcg.test');
    assert.equal(state.model.proposal.status, 'ready');
  });

  it('blocks send and keeps liveDispatch false', () => {
    let state = createWorkspaceState(ACME_COMMERCIAL_READ_MODEL);
    state = acceptOffer(state, 'advisor@hvcg.test');
    state = acceptPricing(state, 'advisor@hvcg.test');
    state = attemptSendProposal(state);
    assert.match(state.sendError || '', /cannot auto-send/);
    assert.equal(state.gates.liveDispatch, false);
    assert.equal(state.model.proposal.autoSend, false);
    assert.equal(state.model.proposal.status, 'ready');
  });

  it('opens engagement only after operator-accepted proposal', () => {
    let state = createWorkspaceState(ACME_COMMERCIAL_READ_MODEL);
    state = openEngagement(state, 'owner@hvcg.test');
    assert.equal(state.model.engagement, null);
    state = acceptOffer(state, 'advisor@hvcg.test');
    state = acceptPricing(state, 'advisor@hvcg.test');
    state = acceptProposalInternally(state, 'owner@hvcg.test');
    state = openEngagement(state, 'owner@hvcg.test');
    assert.ok(state.model.engagement);
    assert.equal(state.model.engagement?.payoutAllowed, false);
    assert.equal(state.model.engagement?.successFeeState, 'EARNED');
    const summary = workspaceSummary(state);
    assert.equal(summary.liveDispatch, false);
    assert.equal(summary.autoProvisionAccess, false);
    assert.equal(summary.wonActivatesClient, false);
    assert.equal(summary.engagementOpen, true);
  });
});
