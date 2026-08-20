"""Validate all contract schemas load and accept golden fixtures / reject spoofs."""
from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tests" / "integrations"))

from harness.schema_loader import SCHEMA_DIR, assert_valid, load_schema, validate  # noqa: E402

REQUIRED_SCHEMAS = [
    "typed-ref.v1.json",
    "trace-context.v1.json",
    "write-envelope.v1.json",
    "attribution-lineage.v1.json",
    "idempotency-keys.v1.json",
    "website-lead-upsert.v1.json",
    "eva-crm-payload.v1.json",
    "atlas-lead-intake.v1.json",
    "360-atlas-lead.v1.json",
    "gtm-company-profile.v1.json",
    "gtm-lead-score.v1.json",
    "pain-hypothesis.v1.json",
    "campaign-spec.v1.json",
    "funnel-spec.v1.json",
    "form-spec.v1.json",
    "nurture-plan.v1.json",
    "booking-event.v1.json",
    "pre-call-brief.v1.json",
    "experiment-spec.v1.json",
    "optimization-decision.v1.json",
    "agent-copilot-handoff.v1.json",
    "atlas-lead-handoff.v1.json",
    "agent-copilot-assessment-handoff.v1.json",
    "opportunity-commercial-context.v1.json",
    "offer-recommendation.v1.json",
    "pricing-recommendation.v1.json",
    "proposal-context.v1.json",
    "engagement-created.v1.json",
    "client-activation.v1.json",
    "client-activation-event.v1.json",
    "revenue-outcome.v1.json",
    "closed-won-learning-event.v1.json",
    "atlas-gcc-client-activation.v1.json",
    "atlas-to-gcc-handoff.v1.json",
    "gcc-value-signal.v1.json",
    "360-atlas-gtm-sync.v1.json",
    "gcc-gtm-feedback.v1.json",
    "peers/gcc-atlas-signal.v1.json",
]


class ContractSchemaTests(unittest.TestCase):
    def test_all_required_schemas_exist(self):
        missing = [n for n in REQUIRED_SCHEMAS if not (SCHEMA_DIR / n).exists()]
        self.assertEqual(missing, [], f"Missing schemas: {missing}")

    def test_schemas_have_ids_and_parse(self):
        for name in REQUIRED_SCHEMAS:
            data = load_schema(name)
            self.assertIn("$id", data)
            self.assertTrue(data["$id"].startswith("https://highvaluecapitalgroup.com/contracts/"))

    def test_idempotency_registry_covers_critical_edges(self):
        data = load_schema("idempotency-keys.v1.json")
        patterns = data["properties"]["patterns"]["default"]
        keys = {p["pattern"].split("|")[0] for p in patterns}
        for prefix in ["eva", "website", "360", "copilot", "client-from-lead", "opp-from-lead", "client-activate", "gcc-activate", "nurture", "precall", "booking", "experiment", "optimize", "engagement", "gcc-signal", "learn-won"]:
            self.assertIn(prefix, keys, f"Missing idempotency prefix {prefix}")

    def test_website_lead_minimal_valid(self):
        assert_valid(
            "website-lead-upsert.v1.json",
            {"leadId": "w-1", "submissionType": "Website-Funding", "contact": {"email": "a@b.co"}},
        )

    def test_client_code_pattern_rejects_uuid(self):
        errors = validate(
            "gtm-company-profile.v1.json",
            {
                "contractVersion": "gtm-company-profile.v1",
                "companyId": "360-co-1",
                "legalName": "X",
                "ownerSystem": "360",
                "atlasClientCode": "not-a-client-code",
            },
        )
        self.assertTrue(any("atlasClientCode" in e or "pattern" in e for e in errors))

    def test_offer_cannot_drop_observation_only(self):
        errors = validate(
            "offer-recommendation.v1.json",
            {
                "contractVersion": "offer-recommendation.v1",
                "recommendationId": "r1",
                "opportunityId": "o1",
                "sku": "X",
                "observationOnly": False,
                "createsCommitment": False,
            },
        )
        self.assertTrue(errors)

    def test_nurture_plan_observation_only(self):
        # GTM-native createNurturePlan shape @ e0dd445 (nurturePlanSchema.strict())
        assert_valid(
            "nurture-plan.v1.json",
            {
                "planId": "nurture-360-co-001",
                "companyId": "360-co-001",
                "campaignId": "cmp-gtm-001",
                "goal": "prepare_lead_before_manny_call",
                "steps": [
                    {
                        "stepId": "n1",
                        "kind": "executive_memo",
                        "message": "Share personalized High Value summary.",
                    }
                ],
                "createdAt": "2026-08-20T12:00:00Z",
            },
        )
        errors = validate(
            "nurture-plan.v1.json",
            {
                "planId": "nurture-bad",
                "companyId": "360-co-001",
                "campaignId": "cmp-gtm-001",
                "goal": "prepare_lead_before_manny_call",
                "steps": [
                    {
                        "stepId": "n1",
                        "kind": "executive_memo",
                        "message": "Must not live-send.",
                    }
                ],
                "createdAt": "2026-08-20T12:00:00Z",
                "liveSend": True,
            },
        )
        self.assertTrue(errors)

    def test_pre_call_brief_observation_only(self):
        # Copilot toIntegrationPreCallBrief output @ fe3db75 (docs/copilot/pre-call-brief-fixture-d26.json)
        assert_valid(
            "pre-call-brief.v1.json",
            {
                "contractVersion": "pre-call-brief.v1",
                "briefId": "pcb-assess-meridian-mri",
                "bookingId": "booking-syn-d26-001",
                "companyName": "Meridian Field Services",
                "atlasClientCode": "MERIDIAN01",
                "summary": "Operational estimates — not guarantees. Provenance: verified vs inference.",
                "painHypotheses": ["Collections workflow friction"],
                "suggestedQuestions": ["Discuss path — pricing owned by Revenue OS."],
                "generatedAt": "2026-08-20T20:00:00.000Z",
                "ownerSystem": "copilot",
                "observationOnly": True,
                "attribution": {
                    "source": "agent-copilot",
                    "campaignId": "gtm-syn-d26",
                    "diagnosticId": "assess-meridian-mri",
                },
            },
        )
        errors = validate(
            "pre-call-brief.v1.json",
            {
                "contractVersion": "pre-call-brief.v1",
                "briefId": "pcb-bad",
                "bookingId": "booking-bad",
                "generatedAt": "2026-08-20T20:00:00.000Z",
                "ownerSystem": "copilot",
                "observationOnly": False,
            },
        )
        self.assertTrue(errors)
        live_dispatch_errors = validate(
            "pre-call-brief.v1.json",
            {
                "contractVersion": "pre-call-brief.v1",
                "briefId": "pcb-bad-dispatch",
                "bookingId": "booking-bad",
                "generatedAt": "2026-08-20T20:00:00.000Z",
                "ownerSystem": "copilot",
                "observationOnly": True,
                "liveDispatch": True,
            },
        )
        self.assertTrue(live_dispatch_errors)

    def test_booking_event_dry_run_idempotent(self):
        from harness.journeys import envelope

        env = envelope(
            key="booking|book-syn-1",
            source="360",
            dest="atlas",
            entity="booking",
            operation="create",
            version="booking-event.v1",
            correlation="journey-a-corr-001",
            event_id="evt-book-001",
            entity_id="book-syn-1",
            campaign_id="cmp-gtm-001",
        )
        assert_valid(
            "booking-event.v1.json",
            {
                "contractVersion": "booking-event.v1",
                "bookingId": "book-syn-1",
                "envelope": env,
                "leadRef": {"system": "360", "entity": "lead", "id": "360-lead-001"},
                "contactEmail": "jordan@acme.example",
                "startsAt": "2026-08-21T14:00:00Z",
                "endsAt": "2026-08-21T14:45:00Z",
                "status": "requested",
                "meetingProvider": "microsoft-mock-dry-run",
                "attribution": {"source": "360-growth", "campaignId": "cmp-gtm-001"},
            },
        )
        live_dispatch_errors = validate(
            "booking-event.v1.json",
            {
                "contractVersion": "booking-event.v1",
                "bookingId": "book-live-bad",
                "envelope": env,
                "startsAt": "2026-08-21T14:00:00Z",
                "status": "confirmed",
                "liveDispatch": True,
            },
        )
        self.assertTrue(live_dispatch_errors)

    def test_optimization_decision_cannot_mutate_paid_ads(self):
        assert_valid(
            "experiment-spec.v1.json",
            {
                "contractVersion": "experiment-spec.v1",
                "experimentId": "exp-cmp-gtm-001-v2",
                "campaignId": "cmp-gtm-001",
                "hypothesis": "Variant 2 improves qualified reply rate with clearer hypothesis framing",
                "status": "abandoned",
                "variants": [{"variantId": "cmp-gtm-001-v2", "name": "Variant 2", "allocationPct": 0}],
                "ownerSystem": "360",
                "paidAdsEnabled": False,
            },
        )
        assert_valid(
            "optimization-decision.v1.json",
            {
                "contractVersion": "optimization-decision.v1",
                "decisionId": "opt-exp-cmp-gtm-001-v2",
                "experimentId": "exp-cmp-gtm-001-v2",
                "decision": "kill",
                "rationale": "Live Level 4 refused. Dry-run Variant 2 rolled back.",
                "decidedAt": "2026-08-20T20:00:00Z",
                "ownerSystem": "360",
                "requiresOwnerApproval": True,
                "mutatesPaidAds": False,
            },
        )
        errors = validate(
            "optimization-decision.v1.json",
            {
                "contractVersion": "optimization-decision.v1",
                "decisionId": "opt-bad",
                "experimentId": "exp-bad",
                "decision": "scale",
                "decidedAt": "2026-08-20T20:00:00Z",
                "ownerSystem": "360",
                "mutatesPaidAds": True,
            },
        )
        self.assertTrue(errors)


if __name__ == "__main__":
    unittest.main()
