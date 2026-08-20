#!/usr/bin/env python3
"""Proposal engine tests."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from revenue_os.pricing import recommend_pricing  # noqa: E402
from revenue_os.proposals import ProposalEngine  # noqa: E402
from revenue_os.schemas import assert_valid  # noqa: E402


class ProposalTests(unittest.TestCase):
    def test_draft_and_block_send(self) -> None:
        engine = ProposalEngine()
        pricing = recommend_pricing(
            recommendation_id="p1",
            opportunity_id="opp-9",
            offer_code="OFF-CAP-DIAG",
            commercial_class="STRUCTURED_OFFER",
            client_classification="HVCG_NEW_CLIENT",
        )
        draft = engine.draft(
            proposal_id="prop-9",
            opportunity_id="opp-9",
            client_code="ACME01",
            client_name="Acme",
            commercial_class="STRUCTURED_OFFER",
            offer_code="OFF-CAP-DIAG",
            pricing_recommendation=pricing["recommendation"],
        )
        self.assertEqual(draft["errors"], [])
        self.assertFalse(draft["proposal"]["autoSend"])
        self.assertFalse(draft["proposal"]["liveDispatch"])
        engine.transition("prop-9", "INTERNAL_REVIEW", actor="a")
        engine.transition("prop-9", "APPROVED_TO_SEND", actor="o")
        blocked = engine.transition("prop-9", "SENT", actor="a")
        self.assertTrue(blocked["errors"])
        accepted = engine.accept_internally("prop-9", actor="o")
        self.assertEqual(accepted["errors"], [])
        ctx = engine.to_context("prop-9")
        self.assertEqual(ctx["status"], "accepted")
        self.assertFalse(ctx["autoSend"])
        assert_valid("proposal-context.v1.json", ctx)


if __name__ == "__main__":
    unittest.main()
