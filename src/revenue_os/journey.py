"""Synthetic commercial journey: offer → pricing → proposal → closed-won → engagement."""

from __future__ import annotations

from typing import Any

from .catalogs import catalog_integrity, sku_for_offer
from .commercial import CommercialWorkspace
from .compatibility import (
    accept_gtm_lead,
    emit_closed_won_learning,
    emit_gcc_handoff,
    envelope,
    ingest_copilot_recommendation,
)
from .documents import DocumentWorkflow
from .engagements import EngagementService
from .gates import GATES, assert_synthetic_safe
from .pricing import recommend_pricing
from .proposals import ProposalEngine
from .schemas import assert_valid
from .store import IdempotentStore

JOURNEY_ID = "REVOS-SYN-20260820-01"
CLIENT_CODE = "ACME01"
OPPORTUNITY_ID = "opp-revos-001"
LEAD_ID = "360-lead-revos-001"


def _gtm_fixture() -> dict[str, Any]:
    return {
        "contractVersion": "360-atlas-lead.v1",
        "leadId": LEAD_ID,
        "organizationName": "Acme Precision Manufacturing",
        "source": "360-growth",
        "observationOnly": True,
        "paidAdsRequested": False,
        "contact": {"name": "Jordan Lee", "email": "jordan@acme.example", "company": "Acme Precision Manufacturing"},
        "provenance": {
            "source": "360-growth",
            "submittedAt": "2026-08-20T12:00:00Z",
            "campaign": "cmp-revos-001",
            "sourceAttribution": "funnel:fun-revos-001",
            "idempotencyKey": f"360|{LEAD_ID}",
        },
        "governance": {
            "observationOnly": True,
            "productionClientDataAllowed": False,
            "createsClientStage": False,
            "createsEntitlement": False,
            "createsOpportunity": False,
            "isCrm": False,
            "liveDispatch": False,
            "paidAdsEnabled": False,
        },
        "attribution": {"source": "360-growth", "campaignId": "cmp-revos-001", "clientCode": CLIENT_CODE},
    }


def run_synthetic_commercial_journey() -> dict[str, Any]:
    """Deterministic offer → pricing → proposal → closed-won → engagement path.

    Live dispatch remains false. GCC handoff is persist-only.
    """
    gates = assert_synthetic_safe()
    integrity = catalog_integrity()
    if not integrity["ok"]:
        raise RuntimeError(f"catalog integrity failed: {integrity['errors']}")

    store = IdempotentStore()
    workspace = CommercialWorkspace(store)
    proposals = ProposalEngine(store)
    documents = DocumentWorkflow(store)
    engagements = EngagementService(store)

    gtm = accept_gtm_lead(_gtm_fixture(), store=store)
    if not gtm["ok"]:
        raise RuntimeError(f"GTM intake rejected: {gtm['errors']}")

    workspace.configure(
        opportunity_id=OPPORTUNITY_ID,
        client_code=CLIENT_CODE,
        stage="QUALIFIED_OPPORTUNITY",
        owner_principal="advisor@hvcg.test",
        lead_id=LEAD_ID,
        estimated_value=25000,
        currency="USD",
        attribution={"source": "360-growth", "campaignId": "cmp-revos-001", "clientCode": CLIENT_CODE},
    )
    context = workspace.to_context(OPPORTUNITY_ID)
    assert_valid("opportunity-commercial-context.v1.json", context)

    offer_obs = workspace.recommend_offer_observation(
        recommendation_id="offer-revos-001",
        opportunity_id=OPPORTUNITY_ID,
        need="Ready for financing",
        source_system="atlas",
    )
    if offer_obs["errors"]:
        raise RuntimeError(offer_obs["errors"])
    assert_valid("offer-recommendation.v1.json", offer_obs["contract"])

    copilot = ingest_copilot_recommendation(
        {
            **offer_obs["contract"],
            "recommendationId": "offer-copilot-shadow-001",
            "sourceSystem": "copilot",
        },
        store=store,
    )
    if copilot.get("promoted"):
        raise RuntimeError("Copilot recommendation must remain advisory")

    accepted_offer = workspace.accept_offer(
        opportunity_id=OPPORTUNITY_ID,
        recommendation_id="offer-revos-001",
        operator="advisor@hvcg.test",
    )
    if accepted_offer["errors"]:
        raise RuntimeError(accepted_offer["errors"])

    pricing = recommend_pricing(
        recommendation_id="price-revos-001",
        opportunity_id=OPPORTUNITY_ID,
        offer_code=accepted_offer["workspace"]["offerCode"],
        commercial_class=accepted_offer["workspace"]["commercialClass"],
        client_classification="HVCG_NEW_CLIENT",
    )
    if pricing["errors"]:
        raise RuntimeError(pricing["errors"])
    assert_valid("pricing-recommendation.v1.json", pricing["contract"])
    workspace.store_pricing_recommendation(pricing["contract"])
    accepted_price = workspace.accept_pricing(
        opportunity_id=OPPORTUNITY_ID,
        recommendation_id="price-revos-001",
        operator="advisor@hvcg.test",
        pricing_basis="SETUP",
    )
    if accepted_price["errors"]:
        raise RuntimeError(accepted_price["errors"])

    draft = proposals.draft(
        proposal_id="prop-revos-001",
        opportunity_id=OPPORTUNITY_ID,
        client_code=CLIENT_CODE,
        client_name="Acme Precision Manufacturing",
        commercial_class=accepted_offer["workspace"]["commercialClass"],
        offer_code=accepted_offer["workspace"]["offerCode"],
        pricing_recommendation=pricing["recommendation"],
    )
    if draft["errors"]:
        raise RuntimeError(draft["errors"])
    proposals.transition("prop-revos-001", "INTERNAL_REVIEW", actor="advisor@hvcg.test")
    proposals.transition("prop-revos-001", "APPROVED_TO_SEND", actor="owner@hvcg.test")
    blocked_send = proposals.transition("prop-revos-001", "SENT", actor="advisor@hvcg.test")
    if not blocked_send["errors"]:
        raise RuntimeError("proposal send must remain blocked")
    accepted_proposal = proposals.accept_internally("prop-revos-001", actor="owner@hvcg.test")
    if accepted_proposal["errors"]:
        raise RuntimeError(accepted_proposal["errors"])
    proposal_ctx = proposals.to_context("prop-revos-001")
    assert_valid("proposal-context.v1.json", proposal_ctx)

    msa = documents.create(
        document_id="msa-revos-001",
        document_type="MSA",
        opportunity_id=OPPORTUNITY_ID,
        client_code=CLIENT_CODE,
        proposal_id="prop-revos-001",
        title="HVCG Master Services Agreement — Acme",
        scope_summary="Governing terms for HVCG commercial services",
    )
    sow = documents.create(
        document_id="sow-revos-001",
        document_type="SOW",
        opportunity_id=OPPORTUNITY_ID,
        client_code=CLIENT_CODE,
        proposal_id="prop-revos-001",
        title="Lender-Ready Capital Package SOW",
        term_months=None,
        scope_summary=offer_obs["offer"]["description"],
        economics={
            "setupFee": pricing["recommendation"]["recommendedSetupFee"],
            "successFeeApplicable": True,
        },
    )
    replay_msa = documents.create(
        document_id="msa-revos-001",
        document_type="MSA",
        opportunity_id=OPPORTUNITY_ID,
        client_code=CLIENT_CODE,
        proposal_id="prop-revos-001",
        title="HVCG Master Services Agreement — Acme",
        scope_summary="Governing terms for HVCG commercial services",
    )
    documents.transition(msa["document"], "INTERNAL_REVIEW", actor="advisor@hvcg.test")
    documents.transition(documents.get("MSA", OPPORTUNITY_ID, "msa-revos-001"), "APPROVED_TO_SEND", actor="owner@hvcg.test")
    blocked_doc_send = documents.transition(
        documents.get("MSA", OPPORTUNITY_ID, "msa-revos-001"), "SENT", actor="advisor@hvcg.test"
    )
    signed_msa = documents.execute_wet_ink(
        documents.get("MSA", OPPORTUNITY_ID, "msa-revos-001"),
        actor="owner@hvcg.test",
        signature_evidence="wet-ink-binder-2026-08-20",
    )
    documents.activate(signed_msa["document"], actor="owner@hvcg.test")
    documents.transition(sow["document"], "INTERNAL_REVIEW", actor="advisor@hvcg.test")
    documents.transition(documents.get("SOW", OPPORTUNITY_ID, "sow-revos-001"), "APPROVED_TO_SEND", actor="owner@hvcg.test")
    signed_sow = documents.execute_wet_ink(
        documents.get("SOW", OPPORTUNITY_ID, "sow-revos-001"),
        actor="owner@hvcg.test",
        signature_evidence="wet-ink-sow-2026-08-20",
    )
    documents.activate(signed_sow["document"], actor="owner@hvcg.test")
    assert_valid("commercial-document.v1.json", documents.to_contract(documents.get("MSA", OPPORTUNITY_ID, "msa-revos-001")))
    assert_valid("commercial-document.v1.json", documents.to_contract(documents.get("SOW", OPPORTUNITY_ID, "sow-revos-001")))

    approved = workspace.approve_scope_and_economics(opportunity_id=OPPORTUNITY_ID, operator="owner@hvcg.test")
    if approved["errors"]:
        raise RuntimeError(approved["errors"])
    workspace_record = approved["workspace"]
    workspace_record["stage"] = "CLOSED_WON"
    store.put(f"opp-commercial|{OPPORTUNITY_ID}", workspace_record, collision="update-existing")
    validation = workspace.validate(OPPORTUNITY_ID)
    if not validation["ok"]:
        raise RuntimeError(validation["errors"])

    env = envelope(
        key=f"engagement|{OPPORTUNITY_ID}",
        source="atlas",
        dest="atlas",
        entity="engagement",
        operation="create",
        version="engagement-created.v1",
        correlation=JOURNEY_ID,
        event_id="evt-eng-revos-001",
        entity_id="eng-revos-001",
    )
    assert_valid("write-envelope.v1.json", env)
    created = engagements.create_from_closed_won(
        engagement_id="eng-revos-001",
        opportunity_id=OPPORTUNITY_ID,
        client_code=CLIENT_CODE,
        sku=sku_for_offer(offer_obs["offer"]),
        offer_code=workspace_record["offerCode"],
        commercial_class=workspace_record["commercialClass"],
        scope_summary=offer_obs["offer"]["description"],
        setup_fee=pricing["recommendation"]["recommendedSetupFee"],
        retainer=pricing["recommendation"]["recommendedRetainer"],
        term_months=offer_obs["offer"].get("minimumTermMonths"),
        success_fee_applicable=True,
        attribution={"source": "360-growth", "campaignId": "cmp-revos-001", "clientCode": CLIENT_CODE},
        envelope=env,
    )
    replay_eng = engagements.create_from_closed_won(
        engagement_id="eng-revos-001",
        opportunity_id=OPPORTUNITY_ID,
        client_code=CLIENT_CODE,
        sku=sku_for_offer(offer_obs["offer"]),
        offer_code=workspace_record["offerCode"],
        commercial_class=workspace_record["commercialClass"],
        scope_summary="should not replace",
        setup_fee=1,
        retainer=1,
        term_months=1,
        success_fee_applicable=True,
        envelope=env,
    )
    event = engagements.to_created_event(OPPORTUNITY_ID)
    assert_valid("engagement-created.v1.json", event)

    engagements.update_scope(OPPORTUNITY_ID, summary="Lender package + data room", actor="advisor@hvcg.test", change_order_id="co-001")
    engagements.accrue_success_fee(OPPORTUNITY_ID, amount=15000, event="facility-closed")
    engagements.tick_tail(OPPORTUNITY_ID)
    engagements.record_referral(OPPORTUNITY_ID, partner_id="ref-partner-001", collected_revenue=15000)
    engagements.mark_referral_payable(OPPORTUNITY_ID, approver="owner@hvcg.test")
    engagement = engagements.get_for_opportunity(OPPORTUNITY_ID)

    outcome = engagements.to_revenue_outcome(
        outcome_id="out-revos-001",
        opportunity_id=OPPORTUNITY_ID,
        amount=float(pricing["recommendation"]["recommendedSetupFee"] or 0),
        closed_at="2026-08-20T16:00:00Z",
    )
    if outcome.get("attribution") is None:
        outcome.pop("attribution", None)
    assert_valid("revenue-outcome.v1.json", outcome)
    learning = emit_closed_won_learning(
        outcome_id="out-revos-001",
        lessons=["Capital-ready manufacturing responded to diagnostic-to-package ladder"],
        store=store,
    )
    gcc = emit_gcc_handoff(
        client_code=CLIENT_CODE,
        display_name="Acme Precision Manufacturing",
        opportunity_id=OPPORTUNITY_ID,
        authorized_by="manny",
        store=store,
    )
    gcc_replay = emit_gcc_handoff(
        client_code=CLIENT_CODE,
        display_name="Acme Precision Manufacturing",
        opportunity_id=OPPORTUNITY_ID,
        authorized_by="manny",
        store=store,
    )

    return {
        "journeyId": JOURNEY_ID,
        "ok": True,
        "liveDispatch": gates["liveDispatch"],
        "autoProvisionAccess": gates["autoProvisionAccess"],
        "mutatesPaidAds": gates["mutatesPaidAds"],
        "gtm": {"ok": gtm["ok"], "semanticFork": gtm["semanticFork"], "replayed": False},
        "offer": offer_obs["contract"]["sku"],
        "pricingObservationOnly": pricing["contract"]["observationOnly"],
        "proposalStatus": accepted_proposal["proposal"]["status"],
        "proposalSendBlocked": bool(blocked_send["errors"]),
        "documentSendBlocked": bool(blocked_doc_send["errors"]),
        "msaReplay": replay_msa["replayed"] and not replay_msa["created"],
        "engagementReplay": replay_eng["replayed"] and not replay_eng["created"],
        "gccReplay": gcc_replay["replayed"] and not gcc_replay["created"],
        "engagementId": created["engagement"]["engagementId"],
        "successFeeState": engagement["economics"]["successFee"]["state"],
        "successFeeEarnedNeCollected": engagement["economics"]["successFee"]["earnedAmount"]
        != engagement["economics"]["successFee"]["collectedAmount"],
        "referralState": engagement["economics"]["referral"]["state"],
        "referralPayoutAllowed": engagement["economics"]["referral"]["payoutAllowed"],
        "copilotPromoted": copilot["promoted"],
        "learningMutatesPaidAds": learning["mutatesPaidAds"],
        "gccAutoProvision": gcc["autoProvisionAccess"],
        "wonActivatesClient": validation["wonActivatesClient"],
        "gates": gates,
        "catalog": {"serviceLines": integrity["serviceLines"], "offers": integrity["offers"]},
    }
