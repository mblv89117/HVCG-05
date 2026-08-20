#!/usr/bin/env python3
"""Pricing rules tests."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from revenue_os.pricing import recommend_pricing, referral_economics_guidance  # noqa: E402
from revenue_os.schemas import assert_valid  # noqa: E402


class PricingTests(unittest.TestCase):
    def test_new_client_observation_contract(self) -> None:
        out = recommend_pricing(
            recommendation_id="price-1",
            opportunity_id="opp-1",
            offer_code="OFF-CAP-PKG",
            commercial_class="STRUCTURED_OFFER",
            client_classification="HVCG_NEW_CLIENT",
        )
        self.assertEqual(out["errors"], [])
        self.assertTrue(out["contract"]["observationOnly"])
        self.assertFalse(out["contract"]["createsCommitment"])
        self.assertGreater(out["contract"]["recommendedPrice"], 0)
        assert_valid("pricing-recommendation.v1.json", out["contract"])
        self.assertFalse(out["recommendation"]["isApprovedPrice"])

    def test_legacy_does_not_overwrite_accg(self) -> None:
        out = recommend_pricing(
            recommendation_id="price-2",
            opportunity_id="opp-2",
            offer_code="OFF-FCFO-OP",
            commercial_class="RECURRING_RETAINER",
            client_classification="HVS_LEGACY_CLIENT",
            contracted_current=4539.0,
        )
        rec = out["recommendation"]
        self.assertEqual(rec["pricingStateForNewEconomics"], "RECOMMENDED_FUTURE")
        self.assertIsNone(rec["recommendedRetainer"])
        self.assertEqual(rec["legacyProtection"]["CONTRACTED_CURRENT"], 4539.0)
        self.assertTrue(rec["accgLockApplies"])

    def test_referral_guidance_collected_only(self) -> None:
        guidance = referral_economics_guidance()
        self.assertEqual(guidance["payoutBasis"], "COLLECTED_CLEARED_REVENUE_ONLY")
        self.assertTrue(guidance["autonomousPayoutForbidden"])


if __name__ == "__main__":
    unittest.main()
