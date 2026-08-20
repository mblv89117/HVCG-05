"""Synthetic cross-system journey runners (no production side effects)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .schema_loader import assert_valid
from .synthetic_bus import SyntheticBus, WriteResult

NOW = datetime(2026, 8, 20, 12, 0, 0, tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
CORRELATION_A = "journey-a-corr-001"
CORRELATION_B = "journey-b-corr-001"
CORRELATION_C = "journey-c-corr-001"


def envelope(
    *,
    key: str,
    source: str,
    dest: str,
    entity: str,
    operation: str,
    version: str,
    correlation: str,
    event_id: str,
    entity_id: str,
    campaign_id: str | None = None,
    outcome: str = "pending",
    replay: str = "return-existing",
    identity_class: str = "system_service",
) -> dict[str, Any]:
    trace: dict[str, Any] = {
        "correlationId": correlation,
        "sourceSystem": source,
        "destinationSystem": dest,
        "eventId": event_id,
        "entityId": entity_id,
        "timestamp": NOW,
        "version": version,
        "outcome": outcome,
    }
    if campaign_id:
        trace["campaignId"] = campaign_id
    return {
        "idempotencyKey": key,
        "sourceSystem": source,
        "destinationSystem": dest,
        "entity": entity,
        "operation": operation,
        "version": version,
        "replaySemantics": replay,
        "trace": trace,
        "actor": {"identityClass": identity_class, "principalId": f"{source}-svc", "scopes": [f"{entity}:write"]},
    }


def run_journey_a(bus: SyntheticBus | None = None) -> dict[str, Any]:
    """GTM target → campaign → funnel/form → Atlas Lead → Opportunity → offer → proposal → engagement → activation → GCC."""
    bus = bus or SyntheticBus()
    campaign_id = "cmp-gtm-001"
    company = {
        "contractVersion": "gtm-company-profile.v1",
        "companyId": "360-co-001",
        "legalName": "Acme Precision Manufacturing",
        "ownerSystem": "360",
        "industry": "Manufacturing",
        "painHypotheses": ["working capital gap"],
        "attribution": {"source": "360-growth", "campaignId": campaign_id},
    }
    assert_valid("gtm-company-profile.v1.json", company)

    campaign = {
        "contractVersion": "campaign-spec.v1",
        "campaignId": campaign_id,
        "name": "Q3 Capital Ready",
        "status": "ready",
        "channel": "content",
        "paidAdsEnabled": False,
        "ownerSystem": "360",
        "attribution": {"source": "360-growth", "campaignId": campaign_id},
    }
    assert_valid("campaign-spec.v1.json", campaign)

    funnel = {
        "contractVersion": "funnel-spec.v1",
        "funnelId": "fun-001",
        "campaignId": campaign_id,
        "name": "Capital Ready Funnel",
        "ownerSystem": "360",
        "steps": [
            {"stepId": "s1", "kind": "content", "contentId": "cnt-1"},
            {"stepId": "s2", "kind": "form", "formId": "form-001"},
            {"stepId": "s3", "kind": "diagnostic"},
        ],
    }
    assert_valid("funnel-spec.v1.json", funnel)

    form = {
        "contractVersion": "form-spec.v1",
        "formId": "form-001",
        "funnelId": "fun-001",
        "campaignId": campaign_id,
        "ownerSystem": "360",
        "fields": [
            {"name": "email", "type": "email", "required": True},
            {"name": "company", "type": "string", "required": True, "maxLength": 255},
        ],
    }
    assert_valid("form-spec.v1.json", form)

    nurture = {
        "planId": f"nurture-{company['companyId']}",
        "companyId": company["companyId"],
        "campaignId": campaign_id,
        "goal": "prepare_lead_before_manny_call",
        "steps": [
            {
                "stepId": "n1",
                "kind": "executive_memo",
                "message": "Prepare lead before Manny call (observation-only; no live send).",
            }
        ],
        "createdAt": NOW,
        "observationOnly": True,
        "liveSend": False,
        "liveDispatch": False,
        "paidAdsEnabled": False,
        "ownerSystem": "360",
    }
    assert_valid("nurture-plan.v1.json", nurture)

    lead_handoff = {
        "contractVersion": "360-atlas-lead.v1",
        "leadId": "360-lead-001",
        "organizationName": company["legalName"],
        "source": "360-growth",
        "observationOnly": True,
        "paidAdsRequested": False,
        "contact": {"name": "Jordan Lee", "email": "jordan@acme.example", "company": company["legalName"]},
        "provenance": {
            "source": "360-growth",
            "submittedAt": NOW,
            "campaign": campaign_id,
            "sourceAttribution": "funnel:fun-001",
            "idempotencyKey": "360|360-lead-001",
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
        "attribution": {
            "source": "360-growth",
            "campaignId": campaign_id,
            "funnelId": "fun-001",
            "formId": "form-001",
        },
    }
    assert_valid("360-atlas-lead.v1.json", lead_handoff)
    r_lead = bus.write("360|360-lead-001", "lead", {"id": "atlas-lead-100", **lead_handoff})

    # Conversion keys
    r_client = bus.write("client-from-lead|atlas-lead-100", "client", {"id": "ACME01", "ClientCode": "ACME01"})
    bus.write("contact-from-lead|atlas-lead-100", "contact", {"id": "contact-1", "email": "jordan@acme.example"})
    r_opp = bus.write("opp-from-lead|atlas-lead-100", "opportunity", {"id": "opp-100", "ClientCode": "ACME01"})

    offer = {
        "contractVersion": "offer-recommendation.v1",
        "recommendationId": "offer-001",
        "opportunityId": "opp-100",
        "clientCode": "ACME01",
        "sku": "FRAC-CFO",
        "packageName": "Fractional CFO",
        "observationOnly": True,
        "createsCommitment": False,
        "sourceSystem": "atlas",
        "confidence": 0.72,
    }
    assert_valid("offer-recommendation.v1.json", offer)

    proposal = {
        "contractVersion": "proposal-context.v1",
        "proposalId": "prop-001",
        "opportunityId": "opp-100",
        "clientCode": "ACME01",
        "offerSku": "FRAC-CFO",
        "status": "draft",
        "autoSend": False,
        "attribution": {"source": "360-growth", "campaignId": campaign_id, "clientCode": "ACME01"},
    }
    assert_valid("proposal-context.v1.json", proposal)

    eng_env = envelope(
        key="engagement|opp-100",
        source="atlas",
        dest="atlas",
        entity="engagement",
        operation="create",
        version="engagement-created.v1",
        correlation=CORRELATION_A,
        event_id="evt-eng-001",
        entity_id="eng-001",
        campaign_id=campaign_id,
        identity_class="hvcg_human",
    )
    assert_valid("write-envelope.v1.json", eng_env)
    engagement = {
        "contractVersion": "engagement-created.v1",
        "engagementId": "eng-001",
        "clientCode": "ACME01",
        "opportunityId": "opp-100",
        "sku": "FRAC-CFO",
        "startsOn": "2026-09-01",
        "envelope": eng_env,
        "attribution": {"source": "360-growth", "campaignId": campaign_id, "clientCode": "ACME01"},
    }
    assert_valid("engagement-created.v1.json", engagement)
    bus.write("engagement|opp-100", "engagement", {"id": "eng-001", **engagement})

    act_env = envelope(
        key="client-activate|ACME01|opp-100",
        source="atlas",
        dest="atlas",
        entity="client",
        operation="activate",
        version="client-activation-event.v1",
        correlation=CORRELATION_A,
        event_id="evt-act-001",
        entity_id="ACME01",
        campaign_id=campaign_id,
        identity_class="hvcg_human",
    )
    activation = {
        "contractVersion": "client-activation-event.v1",
        "clientCode": "ACME01",
        "action": "authorize",
        "opportunityId": "opp-100",
        "envelope": act_env,
        "provisionsEntitlements": False,
        "autoProvisionsGcc": False,
    }
    assert_valid("client-activation-event.v1.json", activation)
    bus.write("client-activate|ACME01|opp-100", "client_activation", {"id": "ACME01", **activation})

    gcc_env = envelope(
        key="gcc-activate|ACME01|activate",
        source="atlas",
        dest="gcc",
        entity="client",
        operation="handoff",
        version="atlas-to-gcc-handoff.v1",
        correlation=CORRELATION_A,
        event_id="evt-gcc-001",
        entity_id="ACME01",
        campaign_id=campaign_id,
    )
    gcc = {
        "contractVersion": "atlas-to-gcc-handoff.v1",
        "emittedAt": NOW,
        "idempotencyKey": "gcc-activate|ACME01|activate",
        "client": {"clientCode": "ACME01", "displayName": company["legalName"], "clientStage": "Active Client"},
        "activation": {"opportunityId": "opp-100", "authorizedBy": "manny", "authorizedAt": NOW},
        "gcc": {"action": "prepare_tenant_mapping"},
        "governance": {"autoProvisionAccess": False, "duplicateAtlasCrm": False},
        "attribution": {"source": "360-growth", "campaignId": campaign_id, "clientCode": "ACME01"},
        "envelope": gcc_env,
    }
    assert_valid("atlas-to-gcc-handoff.v1.json", gcc)
    r_gcc = bus.write("gcc-activate|ACME01|activate", "gcc_handoff", {"id": "gcc-map-1", **gcc})

    return {
        "journey": "A",
        "correlationId": CORRELATION_A,
        "campaignId": campaign_id,
        "clientCode": "ACME01",
        "results": {
            "lead": r_lead.outcome,
            "client": r_client.outcome,
            "opportunity": r_opp.outcome,
            "gcc": r_gcc.outcome,
        },
        "counts": {
            "lead": bus.count("lead"),
            "client": bus.count("client"),
            "opportunity": bus.count("opportunity"),
            "engagement": bus.count("engagement"),
            "gcc_handoff": bus.count("gcc_handoff"),
        },
        "bus": bus,
    }


def run_journey_b(bus: SyntheticBus | None = None) -> dict[str, Any]:
    """Copilot → Atlas lead → Revenue OS offer → engagement."""
    bus = bus or SyntheticBus()
    handoff = {
        "contractVersion": "agent-copilot-assessment-handoff.v1",
        "assessmentId": "mri-501",
        "organizationName": "Northwind Logistics",
        "source": "agent-copilot",
        "observationOnly": True,
        "recommendedPackage": "Growth",
        "provenance": {
            "submittedAt": NOW,
            "confidence": 0.81,
            "assessmentVersion": "mri-2026.08",
            "campaign": "copilot-organic",
            "sourceAttribution": "business-mri",
            "idempotencyKey": "copilot|mri-501",
        },
        "governance": {
            "observationOnly": True,
            "isCrm": False,
            "liveDispatch": False,
            "createsOpportunity": False,
            "createsEntitlement": False,
        },
        "mriOpportunities": [{"name": "AP automation", "value": 120000, "confidence": 0.7, "phase": "90d"}],
    }
    assert_valid("agent-copilot-assessment-handoff.v1.json", handoff)
    bus.write("copilot|mri-501", "lead", {"id": "atlas-lead-501", **handoff})

    bus.write("client-from-lead|atlas-lead-501", "client", {"id": "NORTH01", "ClientCode": "NORTH01"})
    bus.write("opp-from-lead|atlas-lead-501", "opportunity", {"id": "opp-501", "ClientCode": "NORTH01"})

    offer = {
        "contractVersion": "offer-recommendation.v1",
        "recommendationId": "offer-501",
        "opportunityId": "opp-501",
        "clientCode": "NORTH01",
        "sku": "AI-OPS",
        "observationOnly": True,
        "createsCommitment": False,
        "sourceSystem": "copilot",
    }
    assert_valid("offer-recommendation.v1.json", offer)

    pricing = {
        "contractVersion": "pricing-recommendation.v1",
        "recommendationId": "price-501",
        "opportunityId": "opp-501",
        "currency": "USD",
        "listPrice": 48000,
        "recommendedPrice": 42000,
        "observationOnly": True,
        "createsCommitment": False,
    }
    assert_valid("pricing-recommendation.v1.json", pricing)

    eng_env = envelope(
        key="engagement|opp-501",
        source="atlas",
        dest="atlas",
        entity="engagement",
        operation="create",
        version="engagement-created.v1",
        correlation=CORRELATION_B,
        event_id="evt-eng-501",
        entity_id="eng-501",
        identity_class="hvcg_human",
    )
    engagement = {
        "contractVersion": "engagement-created.v1",
        "engagementId": "eng-501",
        "clientCode": "NORTH01",
        "opportunityId": "opp-501",
        "sku": "AI-OPS",
        "envelope": eng_env,
    }
    assert_valid("engagement-created.v1.json", engagement)
    bus.write("engagement|opp-501", "engagement", {"id": "eng-501", **engagement})

    return {
        "journey": "B",
        "correlationId": CORRELATION_B,
        "clientCode": "NORTH01",
        "counts": {
            "lead": bus.count("lead"),
            "opportunity": bus.count("opportunity"),
            "engagement": bus.count("engagement"),
        },
        "bus": bus,
    }


def run_journey_c(bus: SyntheticBus | None = None) -> dict[str, Any]:
    """GCC value signal → Atlas renewal/expansion context → GTM learning."""
    bus = bus or SyntheticBus()
    sig_env = envelope(
        key="gcc-signal|sig-900",
        source="gcc",
        dest="atlas",
        entity="revenue_outcome",
        operation="signal",
        version="gcc-value-signal.v1",
        correlation=CORRELATION_C,
        event_id="evt-sig-900",
        entity_id="sig-900",
        identity_class="system_service",
    )
    signal = {
        "contractVersion": "gcc-value-signal.v1",
        "signalId": "sig-900",
        "clientCode": "ACME01",
        "gccOrganizationId": "org-gcc-aaaa-bbbb",
        "signalType": "expansion_opportunity",
        "severity": "high",
        "summary": "Cash conversion improved; expansion candidate.",
        "metrics": {"ltv_proxy": 250000},
        "emittedAt": NOW,
        "copiesLedger": False,
        "envelope": sig_env,
    }
    assert_valid("gcc-value-signal.v1.json", signal)
    bus.write("gcc-signal|sig-900", "gcc_signal", {"id": "sig-900", **signal})

    # Atlas renewal opportunity context (new opp key distinct from original)
    bus.write(
        "opp-from-signal|sig-900",
        "opportunity",
        {"id": "opp-renew-900", "ClientCode": "ACME01", "stage": "Expansion"},
    )

    outcome = {
        "contractVersion": "revenue-outcome.v1",
        "outcomeId": "rev-900",
        "clientCode": "ACME01",
        "opportunityId": "opp-renew-900",
        "amount": 36000,
        "currency": "USD",
        "outcomeType": "expansion",
        "closedAt": NOW,
        "attribution": {"source": "360-growth", "campaignId": "cmp-gtm-001", "clientCode": "ACME01"},
    }
    assert_valid("revenue-outcome.v1.json", outcome)

    learn_env = envelope(
        key="learn-won|rev-900",
        source="atlas",
        dest="360",
        entity="gtm_experiment",
        operation="signal",
        version="closed-won-learning-event.v1",
        correlation=CORRELATION_C,
        event_id="evt-learn-900",
        entity_id="rev-900",
        campaign_id="cmp-gtm-001",
    )
    learning = {
        "contractVersion": "closed-won-learning-event.v1",
        "eventId": "learn-900",
        "outcomeId": "rev-900",
        "campaignId": "cmp-gtm-001",
        "source": "360-growth",
        "lessons": ["Capital-ready content converted expansion"],
        "ownerSystem": "atlas",
        "destinationSystem": "360",
        "mutatesPaidAds": False,
        "envelope": learn_env,
        "attribution": {"source": "360-growth", "campaignId": "cmp-gtm-001", "clientCode": "ACME01"},
    }
    assert_valid("closed-won-learning-event.v1.json", learning)
    bus.write("learn-won|rev-900", "learning", {"id": "learn-900", **learning})

    return {
        "journey": "C",
        "correlationId": CORRELATION_C,
        "counts": {
            "gcc_signal": bus.count("gcc_signal"),
            "opportunity": bus.count("opportunity"),
            "learning": bus.count("learning"),
        },
        "bus": bus,
    }


def replay_write(bus: SyntheticBus, key: str, entity: str, payload: dict[str, Any]) -> WriteResult:
    return bus.write(key, entity, payload)
