#!/usr/bin/env python3
"""Foundation tests for HVCG Business Architecture V2 catalog + pricing locks."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import pricing_policy  # noqa: E402

BUSINESS = ROOT / "config" / "business"


class TestBusinessCatalog(unittest.TestCase):
    def test_seven_service_lines(self) -> None:
        data = json.loads((BUSINESS / "service-lines.json").read_text(encoding="utf-8"))
        codes = [s["code"] for s in data["serviceLines"]]
        self.assertEqual(len(codes), 7)
        self.assertIn("SL-OWNER", codes)
        owner = next(s for s in data["serviceLines"] if s["code"] == "SL-OWNER")
        self.assertTrue(owner["restricted"])
        self.assertFalse(owner["public"])

    def test_thirteen_offers_and_no_hardcoded_duplicate_names_required(self) -> None:
        data = json.loads((BUSINESS / "offer-catalog.json").read_text(encoding="utf-8"))
        self.assertEqual(len(data["offers"]), 13)
        codes = [o["offerCode"] for o in data["offers"]]
        self.assertEqual(len(codes), len(set(codes)))
        owner_offer = next(o for o in data["offers"] if o["offerCode"] == "OFF-OWNER-SUPPORT")
        self.assertFalse(owner_offer["public"])
        self.assertTrue(owner_offer.get("restricted"))

    def test_rate_card_v2_is_current_for_new_clients(self) -> None:
        card = json.loads((BUSINESS / "pricing-rate-card-v2.json").read_text(encoding="utf-8"))
        self.assertEqual(card["status"], "CURRENT_RATE_CARD")
        self.assertEqual(card["lockedCurrentRateCard"]["status"], "HISTORICAL")
        self.assertEqual(
            pricing_policy.active_selling_rate_card_id(),
            "HVCG-PRICE-2026-08-11-v2",
        )
        self.assertEqual(
            pricing_policy.historical_rate_card_id(),
            "HVCG-PRICE-2026-07-15-v1",
        )

    def test_legacy_cannot_receive_proposed_or_section_b_auto_apply(self) -> None:
        self.assertFalse(
            pricing_policy.can_apply_rate_card_to_client("HVS_LEGACY_CLIENT", "PROPOSED")
        )
        self.assertFalse(
            pricing_policy.can_apply_rate_card_to_client("HVS_LEGACY_CLIENT", "CURRENT_RATE_CARD")
        )
        self.assertTrue(
            pricing_policy.can_apply_rate_card_to_client("HVCG_NEW_CLIENT", "CURRENT_RATE_CARD")
        )
        self.assertFalse(
            pricing_policy.can_apply_rate_card_to_client("HVCG_NEW_CLIENT", "PROPOSED")
        )

    def test_accg_lock_and_recommended_not_silent_overwrite(self) -> None:
        self.assertEqual(pricing_policy.accg_locked_monthly(), 4539.0)
        display = pricing_policy.resolve_display_prices(
            contracted_current=4539.0,
            recommended_future=15000.0,
            rate_card_target=12500.0,
        )
        self.assertEqual(display["CONTRACTED_CURRENT"], 4539.0)
        self.assertEqual(display["RECOMMENDED_FUTURE"], 15000.0)
        # Without approvals, contracted stays
        self.assertEqual(
            pricing_policy.apply_recommended_as_contracted(
                4539.0, 15000.0, owner_approved=False, agreement_executed=False
            ),
            4539.0,
        )
        self.assertEqual(
            pricing_policy.apply_recommended_as_contracted(
                4539.0, 15000.0, owner_approved=True, agreement_executed=False
            ),
            4539.0,
        )
        self.assertEqual(
            pricing_policy.apply_recommended_as_contracted(
                4539.0, 15000.0, owner_approved=True, agreement_executed=True
            ),
            15000.0,
        )

    def test_migration_seed_does_not_fabricate_unknown_clients(self) -> None:
        seed = json.loads((BUSINESS / "client-migration-seed.json").read_text(encoding="utf-8"))
        by_name = {r["clientName"]: r for r in seed["records"]}
        for name in ("Final Installment", "Nabro Holdings", "Jay’s Landscaping", "Randy / Generational"):
            rec = by_name[name]
            self.assertEqual(rec["classification"], "UNKNOWN")
            self.assertIsNone(rec["confirmedRevenue"])
            self.assertIsNone(rec["currentContractedPrice"]["amount"])
        accg = by_name["ACCG"]
        self.assertEqual(accg["currentContractedPrice"]["amount"], 4539)
        self.assertTrue(accg["currentContractedPrice"]["verified"])
        self.assertEqual(accg["migrationAction"], "Retain")


if __name__ == "__main__":
    unittest.main()
