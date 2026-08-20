#!/usr/bin/env python3
"""CC-001 / CC-002 / CC-003 compatibility tests."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from revenue_os.compatibility import (  # noqa: E402
    accept_gtm_lead,
    emit_gcc_handoff,
    ingest_copilot_recommendation,
)
from revenue_os.gates import GATES  # noqa: E402
from revenue_os.journey import _gtm_fixture  # noqa: E402


class CompatibilityTests(unittest.TestCase):
    def test_cc001_rejects_pascalcase_only(self) -> None:
        payload = _gtm_fixture()
        payload.pop("leadId")
        payload["LeadId"] = "360-lead-revos-001"
        result = accept_gtm_lead(payload)
        self.assertFalse(result["ok"])
        self.assertTrue(any("PascalCase-only" in e for e in result["errors"]))

    def test_cc001_accepts_camelcase_gtm(self) -> None:
        result = accept_gtm_lead(_gtm_fixture())
        self.assertTrue(result["ok"], result)
        self.assertFalse(result["semanticFork"])
        self.assertFalse(result["liveDispatch"])

    def test_cc002_copilot_stays_advisory(self) -> None:
        result = ingest_copilot_recommendation(
            {
                "contractVersion": "offer-recommendation.v1",
                "recommendationId": "copilot-1",
                "opportunityId": "opp-1",
                "sku": "SKU-CAP-CORE",
                "observationOnly": True,
                "createsCommitment": False,
                "sourceSystem": "copilot",
            }
        )
        self.assertTrue(result["ok"])
        self.assertFalse(result["promoted"])
        self.assertEqual(result["commercialAuthority"], "revenue-os")

    def test_cc002_rejects_commitment(self) -> None:
        result = ingest_copilot_recommendation(
            {
                "recommendationId": "copilot-2",
                "observationOnly": True,
                "createsCommitment": True,
            }
        )
        self.assertFalse(result["ok"])

    def test_cc003_gcc_handoff_no_auto_provision(self) -> None:
        first = emit_gcc_handoff(
            client_code="ACME01",
            display_name="Acme",
            opportunity_id="opp-1",
            authorized_by="manny",
        )
        replay = emit_gcc_handoff(
            client_code="ACME01",
            display_name="Acme",
            opportunity_id="opp-1",
            authorized_by="manny",
            store=first["handoff"] and None,
        )
        self.assertTrue(first["ok"])
        self.assertFalse(first["autoProvisionAccess"])
        self.assertFalse(GATES["autoProvisionAccess"])
        # second call uses a new store unless we pass the same one
        shared = emit_gcc_handoff(
            client_code="BRON01",
            display_name="Bronco",
            opportunity_id="opp-2",
            authorized_by="manny",
        )
        from revenue_os.store import IdempotentStore

        store = IdempotentStore()
        a = emit_gcc_handoff(
            client_code="WEST01",
            display_name="West",
            opportunity_id="opp-3",
            authorized_by="manny",
            store=store,
        )
        b = emit_gcc_handoff(
            client_code="WEST01",
            display_name="West",
            opportunity_id="opp-3",
            authorized_by="manny",
            store=store,
        )
        self.assertTrue(a["created"])
        self.assertTrue(b["replayed"])
        self.assertFalse(a["autoProvisionAccess"])
        self.assertFalse(replay["autoProvisionAccess"])
        self.assertTrue(shared["ok"])


if __name__ == "__main__":
    unittest.main()
