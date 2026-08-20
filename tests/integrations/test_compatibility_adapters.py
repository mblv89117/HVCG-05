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
