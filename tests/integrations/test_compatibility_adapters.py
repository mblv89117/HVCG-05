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


GTM_EXPERIMENT_STATUS_TO_SOT = {
    "observed": "draft",
    "analyzed": "draft",
    "hypothesized": "draft",
    "variant_generated": "draft",
    "qa_passed": "draft",
    "compliance_checked": "draft",
    "experimenting": "running",
    "measured": "running",
    "attributed": "running",
    "learned": "completed",
    "promoted": "completed",
    "rolled_back": "abandoned",
}


def to_integration_booking_event(producer: dict, *, envelope: dict) -> dict:
    """Map GTM SYN-GTM dry-run calendar booking @ 14d8e4d → SoT booking-event.v1."""
    slot = producer.get("slot") or {}
    return {
        "contractVersion": "booking-event.v1",
        "bookingId": producer.get("requestId") or producer.get("bookingId"),
        "envelope": envelope,
        "leadRef": {
            "system": "360",
            "entity": "lead",
            "id": producer.get("leadId") or f"lead-{producer.get('companyId', 'unknown')}",
        },
        "contactEmail": producer["attendeeEmail"],
        "startsAt": slot.get("start") or producer["startsAt"],
        "endsAt": slot.get("end") or producer.get("endsAt"),
        "status": "requested",
        "meetingProvider": "microsoft-mock-dry-run",
        "attribution": {
            "source": "360-growth",
            "campaignId": producer.get("campaignId"),
        },
    }


def to_integration_experiment_spec(producer: dict) -> dict:
    """Map GTM gtm-experiment.v1 / runOptimizationCycle @ 14d8e4d → SoT experiment-spec.v1."""
    status = GTM_EXPERIMENT_STATUS_TO_SOT[producer["status"]]
    return {
        "contractVersion": "experiment-spec.v1",
        "experimentId": producer["experimentId"],
        "campaignId": producer["parentCampaignId"],
        "hypothesis": producer["hypothesis"],
        "status": status,
        "variants": [
            {
                "variantId": producer["variantCampaignId"],
                "name": "Variant 2",
                "allocationPct": 0,
            }
        ],
        "ownerSystem": "360",
        "paidAdsEnabled": False,
    }


def to_integration_optimization_decision(producer: dict, *, decided_at: str) -> dict:
    """Map GTM Variant 2 rollback (live Level 4 refused) → SoT optimization-decision.v1."""
    decision = "kill" if producer["status"] == "rolled_back" else "hold_for_owner"
    if producer["status"] == "promoted":
        decision = "scale"
    return {
        "contractVersion": "optimization-decision.v1",
        "decisionId": f"opt-{producer['experimentId']}",
        "experimentId": producer["experimentId"],
        "decision": decision,
        "rationale": "Live Level 4 refused. Variant 2 remains dry-run; mutatesPaidAds stays false.",
        "decidedAt": decided_at,
        "ownerSystem": "360",
        "requiresOwnerApproval": True,
        "mutatesPaidAds": False,
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
        from harness.journeys import envelope

        producer = {
            "ok": True,
            "dryRun": True,
            "requestId": "book-syn-1",
            "attendeeEmail": "owner@summitridge.example",
            "companyId": "SYN-GTM-001",
            "campaignId": "cmp-SYN-GTM-001",
            "leadId": "lead-SYN-GTM-001",
            "slot": {"start": "2026-08-21T14:00:00.000Z", "end": "2026-08-21T14:45:00.000Z"},
        }
        self.assertTrue(producer["dryRun"])
        env = envelope(
            key="booking|book-syn-1",
            source="360",
            dest="atlas",
            entity="booking",
            operation="create",
            version="booking-event.v1",
            correlation="syn-gtm-d6",
            event_id="evt-book-syn-1",
            entity_id="book-syn-1",
            campaign_id=producer["campaignId"],
        )
        sot = to_integration_booking_event(producer, envelope=env)
        assert_valid("booking-event.v1.json", sot)
        self.assertEqual(sot["envelope"]["idempotencyKey"], "booking|book-syn-1")
        self.assertNotIn("liveDispatch", sot)

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
        self.assertEqual(decision["decision"], "kill")
        self.assertFalse(decision["mutatesPaidAds"])

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
