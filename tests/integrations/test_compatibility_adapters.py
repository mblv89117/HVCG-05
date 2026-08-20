"""Adapter + compatibility tests for orchestrator CC-001 / CC-006."""
from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests" / "integrations"))

from harness.schema_loader import assert_valid, validate  # noqa: E402

KIND_TO_SIGNAL = {
    "renewal_risk": "renewal_risk",
    "expansion_ready": "expansion_opportunity",
    "high_realized_value": "value_realized",
    "low_engagement": "engagement_health",
    "financial_deterioration": "renewal_risk",
    "new_capital_need": "capital_need",
    "new_constraint": "constraint",
    "new_ai_opportunity": "ai_opportunity",
    "new_process_bottleneck": "process_bottleneck",
    "contract_opportunity": "contract_opportunity",
}


def map_gcc_atlas_signal(local: dict) -> dict:
    severity = local.get("severity", "medium")
    if severity not in {"low", "medium", "high", "critical"}:
        severity = "medium"
    return {
        "contractVersion": "gcc-value-signal.v1",
        "signalId": local["signalId"],
        "clientCode": local["clientCode"],
        "gccOrganizationId": local["gccOrganizationId"],
        "engagementId": local.get("engagementId"),
        "signalType": KIND_TO_SIGNAL[local["kind"]],
        "kind": local["kind"],
        "severity": severity,
        "summary": local["summary"],
        "metrics": local.get("payload") or {},
        "emittedAt": local["emittedAt"],
        "copiesLedger": False,
        "envelope": {
            "idempotencyKey": f"gcc-signal|{local['signalId']}",
            "sourceSystem": "gcc",
            "destinationSystem": "atlas",
            "entity": "revenue_outcome",
            "operation": "signal",
            "version": "gcc-value-signal.v1",
            "replaySemantics": "return-existing",
            "trace": {
                "correlationId": f"corr-{local['signalId']}",
                "sourceSystem": "gcc",
                "destinationSystem": "atlas",
                "eventId": f"evt-{local['signalId']}",
                "entityId": local["signalId"],
                "timestamp": local["emittedAt"],
                "version": "gcc-value-signal.v1",
                "outcome": "accepted",
            },
        },
    }


# Mirror GTM packages/gtm-agent/src/atlas/journey-sot.ts @ f53e628 (file SHA 6d8d541).
GTM_EXPERIMENT_STATUS_TO_SOT = {
    "observed": "draft",
    "analyzed": "draft",
    "hypothesized": "draft",
    "variant_generated": "draft",
    "qa_passed": "draft",
    "compliance_checked": "draft",
    "experimenting": "running",
    "measured": "completed",
    "attributed": "completed",
    "learned": "completed",
    "promoted": "completed",
    "rolled_back": "abandoned",
}

PAIN_KIND_TO_SEVERITY = {
    "capital_readiness": "capital",
    "cash_flow_visibility": "cash",
    "financial_reporting": "cash",
    "contract_readiness": "operations",
    "procurement": "operations",
    "operational_systems": "operations",
    "owner_bottleneck": "operations",
    "crm_weakness": "growth",
    "ai_opportunity": "growth",
    "risk_documentation": "capital",
    "growth_system_weakness": "growth",
}


def to_integration_booking_event(producer: dict, *, envelope: dict | None = None) -> dict:
    """Mirror GTM `toBookingEventV1` @ f53e628 — throws unless dryRun===true."""
    if producer.get("ok") is False or producer.get("dryRun") is not True:
        raise ValueError("booking_event_requires_dryRun_true — liveDispatch impossible")
    booking_id = producer.get("meetingId") or producer.get("bookingId") or producer.get("requestId")
    slot = producer.get("slot") or {}
    campaign_id = producer.get("campaignId")
    env = envelope or {
        "idempotencyKey": f"booking|{booking_id}",
        "sourceSystem": "360",
        "destinationSystem": "atlas",
        "entity": "booking",
        "operation": "stage",
        "version": "booking-event.v1",
        "replaySemantics": "return-existing",
        "trace": {
            "correlationId": producer.get("correlationId") or booking_id,
            "sourceSystem": "360",
            "destinationSystem": "atlas",
            "eventId": f"evt-book-{booking_id}",
            "entityId": booking_id,
            "campaignId": campaign_id,
            "timestamp": "2026-08-20T21:00:00Z",
            "version": "booking-event.v1",
            "outcome": "accepted",
        },
        "actor": {"identityClass": "system_service", "principalId": "360-gtm-synthetic", "scopes": ["booking:stage"]},
    }
    return {
        "contractVersion": "booking-event.v1",
        "bookingId": booking_id,
        "envelope": env,
        "leadRef": {
            "system": "360",
            "entity": "lead",
            "id": producer.get("leadId") or f"lead-{producer.get('companyId', 'unknown')}",
        },
        "contactEmail": producer.get("attendeeEmail") or producer.get("contactEmail"),
        "startsAt": slot.get("start") or producer["startsAt"],
        "endsAt": slot.get("end") or producer.get("endsAt"),
        "status": "confirmed" if producer.get("status") == "confirmed" else "requested",
        "meetingProvider": "microsoft_calendar_mock",
        "attribution": {
            "source": "SYN-GTM",
            "campaignId": campaign_id,
        },
    }


def to_integration_experiment_spec(producer: dict) -> dict:
    """Mirror GTM `toExperimentSpecV1` @ f53e628."""
    status = GTM_EXPERIMENT_STATUS_TO_SOT[producer["status"]]
    variant_id = producer.get("variantCampaignId") or producer["experimentId"]
    return {
        "contractVersion": "experiment-spec.v1",
        "experimentId": producer["experimentId"],
        "campaignId": producer.get("parentCampaignId") or producer.get("campaignId"),
        "hypothesis": producer["hypothesis"],
        "status": status,
        "variants": [
            {
                "variantId": variant_id,
                "name": f"Variant 2 · {variant_id}",
                "allocationPct": 0,
            }
        ],
        "ownerSystem": "360",
        "paidAdsEnabled": False,
    }


def to_integration_optimization_decision(producer: dict, *, decided_at: str) -> dict:
    """Mirror GTM `toOptimizationDecisionV1` @ f53e628 — decision is const hold_for_owner."""
    status = producer.get("status")
    rationale = (
        "Variant 2 rolled back — insufficient wins / kill switch; hold for owner. No paid-ads mutation."
        if status == "rolled_back"
        else "Optimization remains observation-only; hold for owner before any spend or live promotion."
    )
    return {
        "contractVersion": "optimization-decision.v1",
        "decisionId": f"dec-{producer['experimentId']}",
        "experimentId": producer["experimentId"],
        "decision": "hold_for_owner",
        "rationale": rationale,
        "decidedAt": decided_at,
        "ownerSystem": "360",
        "requiresOwnerApproval": True,
        "mutatesPaidAds": False,
    }


def to_gtm_company_profile_v1(producer: dict, *, pain_hypotheses: list[str] | None = None) -> dict:
    """Mirror GTM `toGtmCompanyProfileV1` @ f53e628 integration-sot.ts — never invent ClientCode."""
    legal = producer.get("legalName") or producer.get("company")
    domain = producer.get("domain")
    website = producer.get("website") or producer.get("url")
    if not website and domain:
        website = f"https://{domain}"
    mapped = {
        "contractVersion": "gtm-company-profile.v1",
        "companyId": producer["companyId"],
        "legalName": legal,
        "ownerSystem": "360",
        "industry": producer.get("industry"),
        "geography": producer.get("geography") or producer.get("location") or (producer.get("locations") or [None])[0],
        "website": website,
        "painHypotheses": pain_hypotheses,
    }
    return {k: v for k, v in mapped.items() if v is not None}


def to_pain_hypothesis_v1(producer: dict, *, company_id: str) -> dict:
    """Map SYN-GTM pain mark (status=HYPOTHESIS) → SoT pain-hypothesis.v1."""
    if producer.get("status") != "HYPOTHESIS":
        raise ValueError("pain_hypothesis_requires_HYPOTHESIS_status")
    return {
        "contractVersion": "pain-hypothesis.v1",
        "hypothesisId": producer["id"],
        "companyId": company_id,
        "statement": producer["statement"],
        "severity": PAIN_KIND_TO_SEVERITY.get(producer.get("kind", ""), "other"),
        "confidence": producer.get("confidence"),
        "ownerSystem": "360",
        "observationOnly": True,
    }


def to_gtm_lead_score_v1(producer: dict, *, lead_id: str, company_id: str | None = None) -> dict:
    """Mirror GTM `toGtmLeadScoreV1` @ f53e628."""
    total = producer["total"] if "total" in producer else producer["score"]
    if total >= 80:
        band = "qualified"
    elif total >= 65:
        band = "hot"
    elif total >= 45:
        band = "warm"
    else:
        band = "cold"
    return {
        "contractVersion": "gtm-lead-score.v1",
        "leadId": lead_id,
        "companyId": company_id or producer.get("companyId"),
        "score": total,
        "band": band,
        "signals": producer.get("signals") or [],
        "ownerSystem": "360",
        "scoredAt": producer.get("scoredAt") or "2026-08-20T21:00:00Z",
        "observationOnly": True,
    }


def to_campaign_spec_v1(producer: dict) -> dict:
    """Map GTM campaign-spec.v1 producer (running_dry) → SoT campaign-spec.v1. Never live. paidAdsEnabled false."""
    status = producer.get("status") or "draft"
    if status in {"running_dry", "ready"}:
        sot_status = "ready"
    elif status == "paused":
        sot_status = "paused"
    elif status == "archived":
        sot_status = "completed"
    else:
        sot_status = "draft"
    channels = producer.get("channels") or []
    return {
        "contractVersion": "campaign-spec.v1",
        "campaignId": producer["campaignId"],
        "name": producer.get("name") or producer.get("segment") or producer["campaignId"],
        "status": sot_status,
        "channel": producer.get("channel") or (channels[0] if channels else "web"),
        "paidAdsEnabled": False,
        "ownerSystem": "360",
        "attribution": {"source": "SYN-GTM", "campaignId": producer["campaignId"]},
    }


def to_funnel_spec_v1(producer: dict) -> dict:
    """Map SYN-GTM compiled funnel mark → SoT funnel-spec.v1 (existing schema only)."""
    pages = producer.get("pages") or []
    steps = producer.get("steps")
    if not steps:
        steps = [{"stepId": p.get("pageId") or f"p{i}", "kind": "content"} for i, p in enumerate(pages, start=1)]
        if not steps:
            steps = [{"stepId": "s1", "kind": "form", "formId": producer.get("formId")}]
    return {
        "contractVersion": "funnel-spec.v1",
        "funnelId": producer.get("funnelId") or producer.get("siteId"),
        "campaignId": producer["campaignId"],
        "name": producer.get("name") or "SYN-GTM funnel",
        "ownerSystem": "360",
        "steps": steps,
    }


def to_form_spec_v1(producer: dict) -> dict:
    """Map SYN-GTM generateDynamicForm mark → SoT form-spec.v1."""
    fields = producer.get("fields") or [
        {"name": "email", "type": "email", "required": True},
        {"name": "company", "type": "string", "required": True, "maxLength": 255},
    ]
    return {
        "contractVersion": "form-spec.v1",
        "formId": producer["formId"],
        "funnelId": producer.get("funnelId"),
        "campaignId": producer.get("campaignId"),
        "ownerSystem": "360",
        "fields": fields,
    }


def to_integration_pre_call_brief(producer: dict, *, booking_id: str, atlas_client_code: str | None = None, generated_at: str) -> dict:
    """Mirror Copilot `toIntegrationPreCallBrief` @ fe3db75 — adapter only; SoT meaning unchanged."""
    findings = producer.get("structuredFindings") or []
    verified = [f for f in findings if f.get("factClass") == "VERIFIED CLIENT INPUT"]
    inferred = [f for f in findings if f.get("factClass") in {"AI INFERENCE", "AI RECOMMENDATION"}]
    provenance = f"Provenance: {len(verified)} verified client input · {len(inferred)} AI inference/recommendation (not client facts)."
    summary = f"{producer['executiveSummary']}\n\n{provenance}"[:5000]
    attribution = producer.get("attribution") or {}
    mapped = {
        "contractVersion": "pre-call-brief.v1",
        "briefId": f"pcb-{producer['assessmentId']}",
        "bookingId": booking_id,
        "companyName": producer["company"],
        "summary": summary,
        "painHypotheses": (producer.get("painPoints") or [])[:20],
        "suggestedQuestions": (producer.get("recommendedTalkTracks") or [])[:20],
        "generatedAt": generated_at,
        "ownerSystem": "copilot",
        "observationOnly": True,
        "attribution": {
            "source": attribution.get("source", "agent-copilot"),
            "campaignId": attribution.get("campaignId"),
            "diagnosticId": producer["assessmentId"],
        },
    }
    if atlas_client_code:
        mapped["atlasClientCode"] = atlas_client_code
    return mapped


class CompatibilityTests(unittest.TestCase):
    def test_cc006_adapter_maps_to_canonical(self):
        local = {
            "contractVersion": "gcc-atlas-signal.v1",
            "signalId": "sig-1",
            "kind": "expansion_ready",
            "clientCode": "ACME01",
            "engagementId": "eng-1",
            "gccOrganizationId": "org-gcc-1",
            "emittedAt": "2026-08-20T12:00:00Z",
            "summary": "Expansion ready",
            "severity": "high",
            "payload": {"score": 9},
            "requiresAtlasAction": True,
            "capitalOpsEligible": False,
        }
        assert_valid("peers/gcc-atlas-signal.v1.json", local)
        canonical = map_gcc_atlas_signal(local)
        assert_valid("gcc-value-signal.v1.json", canonical)
        self.assertEqual(canonical["signalType"], "expansion_opportunity")
        self.assertNotEqual(canonical["gccOrganizationId"], canonical["clientCode"])

    def test_gtm_sync_ratified(self):
        assert_valid(
            "360-atlas-gtm-sync.v1.json",
            {
                "contractVersion": "360-atlas-gtm-sync.v1",
                "atlasHint": "HVCG_Leads",
                "leadId": "360-lead-1",
                "campaignId": "cmp-1",
                "icpVersion": "icp-2026.08",
                "icpScore": 81,
                "painHypotheses": ["cash gap"],
                "researchSummary": "Manufacturing ICP fit",
                "engagementState": "booked",
                "recommendedOffer": "FRAC-CFO",
                "attribution": {"source": "360-growth", "campaignId": "cmp-1"},
                "governance": {
                    "isCrm": False,
                    "observationOnly": True,
                    "liveDispatch": False,
                    "additiveOnly": True,
                    "doesNotModifyAtlasProductionBaseline": True,
                },
            },
        )

    def test_copilot_canonical_without_pascalcase_still_valid(self):
        payload = {
            "contractVersion": "atlas-lead-handoff.v1",
            "assessmentId": "mri-1",
            "organizationName": "Acme",
            "source": "agent-copilot",
            "observationOnly": True,
            "provenance": {
                "source": "agent-copilot",
                "confidence": 0.8,
                "assessmentVersion": "v1",
                "submittedAt": "2026-08-20T12:00:00Z",
                "campaign": "organic",
                "sourceAttribution": "mri",
                "idempotencyKey": "copilot|mri-1",
            },
            "assessment": {
                "assessmentId": "mri-1",
                "assessmentVersion": "v1",
                "status": "complete",
                "completeness": 100,
                "topOpportunityNames": ["AP"],
            },
            "observations": [{"label": "cash", "factClass": "AI OBSERVATION"}],
            "contact": {"email": "a@b.co"},
            "governance": {
                "observationOnly": True,
                "productionClientDataAllowed": False,
                "createsClientStage": False,
                "createsEntitlement": False,
                "createsOpportunity": False,
                "isCrm": False,
                "liveDispatch": False,
            },
        }
        assert_valid("atlas-lead-handoff.v1.json", payload)

    def test_copilot_matching_alias_allowed(self):
        payload = {
            "contractVersion": "atlas-lead-handoff.v1",
            "assessmentId": "mri-1",
            "AssessmentId": "mri-1",
            "organizationName": "Acme",
            "Company": "Acme",
            "source": "agent-copilot",
            "Source": "agent-copilot",
            "observationOnly": True,
            "provenance": {
                "source": "agent-copilot",
                "confidence": 0.8,
                "assessmentVersion": "v1",
                "submittedAt": "2026-08-20T12:00:00Z",
                "campaign": "organic",
                "sourceAttribution": "mri",
                "idempotencyKey": "copilot|mri-1",
            },
            "assessment": {
                "assessmentId": "mri-1",
                "assessmentVersion": "v1",
                "status": "complete",
                "completeness": 100,
                "topOpportunityNames": ["AP"],
            },
            "observations": [{"label": "cash", "factClass": "AI INFERENCE"}],
            "contact": {"email": "a@b.co"},
            "governance": {
                "observationOnly": True,
                "productionClientDataAllowed": False,
                "createsClientStage": False,
                "createsEntitlement": False,
                "createsOpportunity": False,
                "isCrm": False,
                "liveDispatch": False,
            },
        }
        assert_valid("atlas-lead-handoff.v1.json", payload)
        self.assertEqual(payload["AssessmentId"], payload["assessmentId"])

    def test_pascalcase_only_payload_rejected(self):
        # Missing camelCase assessmentId — must fail canonical schema
        errors = validate(
            "atlas-lead-handoff.v1.json",
            {
                "contractVersion": "atlas-lead-handoff.v1",
                "AssessmentId": "mri-1",
                "organizationName": "Acme",
                "source": "agent-copilot",
                "observationOnly": True,
                "provenance": {
                    "source": "agent-copilot",
                    "confidence": 0.8,
                    "assessmentVersion": "v1",
                    "submittedAt": "2026-08-20T12:00:00Z",
                    "campaign": "organic",
                    "sourceAttribution": "mri",
                    "idempotencyKey": "copilot|mri-1",
                },
                "assessment": {
                    "assessmentId": "mri-1",
                    "assessmentVersion": "v1",
                    "status": "complete",
                    "completeness": 100,
                    "topOpportunityNames": ["AP"],
                },
                "observations": [{"label": "cash", "factClass": "AI OBSERVATION"}],
                "contact": {},
                "governance": {
                    "observationOnly": True,
                    "productionClientDataAllowed": False,
                    "createsClientStage": False,
                    "createsEntitlement": False,
                    "createsOpportunity": False,
                    "isCrm": False,
                    "liveDispatch": False,
                },
            },
        )
        self.assertTrue(any("assessmentId" in e for e in errors))

    def test_copilot_pre_call_brief_adapter_maps_to_sot(self):
        producer = {
            "contractVersion": "gtm.pre-call-brief.v1",
            "assessmentId": "assess-meridian-mri",
            "company": "Meridian Field Services",
            "executiveSummary": "Operational estimates — not guarantees.",
            "painPoints": ["Collections workflow friction"],
            "recommendedTalkTracks": ["Pricing owned by Revenue OS."],
            "structuredFindings": [
                {"id": "ctx", "title": "Company", "statement": "Meridian", "factClass": "VERIFIED CLIENT INPUT", "confidence": 1, "kind": "business_context"},
                {"id": "inf", "title": "AR", "statement": "Aging", "factClass": "AI INFERENCE", "confidence": 0.7, "kind": "observed_problem"},
            ],
            "attribution": {"campaignId": "gtm-syn-d26", "source": "agent-copilot", "sourceAttribution": "gtm/fixture-d26"},
            "observationOnly": True,
            "commercialBinding": False,
            "liveOrchestration": False,
            "commercialAuthority": "revenue-os",
        }
        self.assertEqual(producer["commercialAuthority"], "revenue-os")
        sot = to_integration_pre_call_brief(
            producer,
            booking_id="booking-syn-d26-001",
            atlas_client_code="MERIDIAN01",
            generated_at="2026-08-20T20:00:00Z",
        )
        assert_valid("pre-call-brief.v1.json", sot)
        self.assertEqual(sot["ownerSystem"], "copilot")
        self.assertTrue(sot["observationOnly"])
        self.assertNotIn("liveDispatch", sot)
        self.assertNotIn("leadId", sot)
        self.assertNotIn("opportunityId", sot)

    def test_gtm_dry_run_booking_maps_to_sot(self):
        producer = {
            "ok": True,
            "dryRun": True,
            "requestId": "book-syn-1",
            "meetingId": "mtg-book-syn-1",
            "status": "confirmed",
            "attendeeEmail": "owner@summitridge.example",
            "companyId": "SYN-GTM-001",
            "campaignId": "cmp-SYN-GTM-001",
            "leadId": "lead-SYN-GTM-001",
            "slot": {"start": "2026-08-21T14:00:00.000Z", "end": "2026-08-21T14:45:00.000Z"},
        }
        sot = to_integration_booking_event(producer)
        assert_valid("booking-event.v1.json", sot)
        self.assertEqual(sot["bookingId"], "mtg-book-syn-1")
        self.assertEqual(sot["envelope"]["idempotencyKey"], "booking|mtg-book-syn-1")
        self.assertEqual(sot["status"], "confirmed")
        self.assertNotIn("liveDispatch", sot)
        with self.assertRaises(ValueError):
            to_integration_booking_event({**producer, "dryRun": False})

    def test_gtm_optimization_variant2_maps_to_sot(self):
        producer = {
            "version": "gtm-experiment.v1",
            "experimentId": "exp-cmp-gtm-001-v2",
            "parentCampaignId": "cmp-gtm-001",
            "variantCampaignId": "cmp-gtm-001-v2",
            "hypothesis": "Variant improves qualified reply rate with clearer hypothesis framing",
            "status": "rolled_back",
            "createdAt": "2026-08-20T20:00:00.000Z",
        }
        spec = to_integration_experiment_spec(producer)
        decision = to_integration_optimization_decision(producer, decided_at="2026-08-20T20:00:00Z")
        assert_valid("experiment-spec.v1.json", spec)
        assert_valid("optimization-decision.v1.json", decision)
        self.assertTrue(spec["variants"][0]["variantId"].endswith("-v2"))
        self.assertEqual(spec["status"], "abandoned")
        self.assertFalse(spec["paidAdsEnabled"])
        self.assertEqual(decision["decision"], "hold_for_owner")
        self.assertEqual(decision["decisionId"], "dec-exp-cmp-gtm-001-v2")
        self.assertFalse(decision["mutatesPaidAds"])

    def test_syn_gtm_early_funnel_marks_map_to_sot(self):
        discovered = {
            "companyId": "SYN-GTM-001",
            "legalName": "Summit Ridge Construction Group",
            "domain": "summitridge.example",
            "industry": "construction",
            "location": "Austin, TX",
            "url": "https://summitridge.example",
        }
        researched = {
            "companyId": "SYN-GTM-001",
            "company": "Summit Ridge Construction Group",
            "industry": "construction",
            "locations": ["Austin, TX"],
            "domain": "summitridge.example",
        }
        company = to_gtm_company_profile_v1(discovered)
        researched_profile = to_gtm_company_profile_v1(
            researched,
            pain_hypotheses=["capital_readiness"],
        )
        assert_valid("gtm-company-profile.v1.json", company)
        assert_valid("gtm-company-profile.v1.json", researched_profile)
        self.assertNotIn("atlasClientCode", researched_profile)

        pain = to_pain_hypothesis_v1(
            {
                "id": "SYN-GTM-001-capital_readiness",
                "kind": "capital_readiness",
                "statement": "Summit Ridge Construction Group may lack capital-readiness packaging for growth or transaction.",
                "confidence": 0.7,
                "status": "HYPOTHESIS",
            },
            company_id="SYN-GTM-001",
        )
        assert_valid("pain-hypothesis.v1.json", pain)
        self.assertTrue(pain["observationOnly"])

        score = to_gtm_lead_score_v1(
            {"total": 72, "version": "gtm-score.v1", "scoredAt": "2026-08-20T21:00:00Z", "explanations": {}},
            lead_id="lead-SYN-GTM-001",
            company_id="SYN-GTM-001",
        )
        assert_valid("gtm-lead-score.v1.json", score)
        self.assertTrue(score["observationOnly"])
        self.assertEqual(score["band"], "hot")

        campaign = to_campaign_spec_v1(
            {
                "version": "campaign-spec.v1",
                "campaignId": "cmp-SYN-GTM-001",
                "segment": "construction capital-ready",
                "status": "running_dry",
                "channels": ["email", "web"],
                "funnelId": "fun-SYN-GTM-001",
                "formId": "form-SYN-GTM-001",
            }
        )
        assert_valid("campaign-spec.v1.json", campaign)
        self.assertFalse(campaign["paidAdsEnabled"])
        self.assertEqual(campaign["status"], "ready")

        funnel = to_funnel_spec_v1(
            {
                "funnelId": "fun-SYN-GTM-001",
                "siteId": "fun-SYN-GTM-001",
                "campaignId": "cmp-SYN-GTM-001",
                "formId": "form-SYN-GTM-001",
                "pages": [{"pageId": "p1"}, {"pageId": "p2"}],
            }
        )
        form = to_form_spec_v1(
            {
                "formId": "form-SYN-GTM-001",
                "funnelId": "fun-SYN-GTM-001",
                "campaignId": "cmp-SYN-GTM-001",
            }
        )
        assert_valid("funnel-spec.v1.json", funnel)
        assert_valid("form-spec.v1.json", form)

    def test_gcc_gtm_feedback_ratified(self):
        assert_valid(
            "gcc-gtm-feedback.v1.json",
            {
                "contractVersion": "gcc-gtm-feedback.v1",
                "periodLabel": "2026-Q3",
                "serviceLine": "fractional-cfo",
                "clientRetentionSignal": "stable",
                "expansionSignal": "ready",
                "engagementHealth": "healthy",
                "valueRealization": "high",
                "outcomeCategories": ["cash"],
                "sensitiveFinancialExcluded": True,
            },
        )


if __name__ == "__main__":
    unittest.main()
