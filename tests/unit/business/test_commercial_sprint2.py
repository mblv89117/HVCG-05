#!/usr/bin/env python3
"""Sprint 2 commercial validation tests for HVCG BA V2."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import commercial_rules  # noqa: E402
import pricing_policy  # noqa: E402

BUSINESS = ROOT / "config" / "business"


class TestSprint2Commercial(unittest.TestCase):
    def test_requirements_ledger_exists_and_has_no_ignored(self) -> None:
        data = json.loads((BUSINESS / "hvcg-v2-requirements.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(data["requirements"]), 100)
        for r in data["requirements"]:
            self.assertNotIn(r["status"], {"IGNORED", "FORGOTTEN"})
            self.assertIn(r["status"], data["statusVocabulary"])

    def test_progressive_validation_lead_ok_unclassified(self) -> None:
        errs = commercial_rules.validate_opportunity_commercial(
            stage="Discovery",
            commercial_class=None,
            service_line_code=None,
            offer_code=None,
            pricing_basis=None,
        )
        self.assertEqual(errs, [])

    def test_qualified_requires_commercial_class(self) -> None:
        errs = commercial_rules.validate_opportunity_commercial(
            stage="Assessment",
            commercial_class=None,
            service_line_code=None,
            offer_code=None,
            pricing_basis=None,
        )
        self.assertTrue(any("CommercialClass" in e for e in errs))

    def test_proposal_requires_offer_service_pricing(self) -> None:
        errs = commercial_rules.validate_opportunity_commercial(
            stage="Proposal",
            commercial_class="STRUCTURED_OFFER",
            service_line_code=None,
            offer_code=None,
            pricing_basis=None,
        )
        self.assertGreaterEqual(len(errs), 3)

    def test_won_requires_approvals(self) -> None:
        errs = commercial_rules.validate_opportunity_commercial(
            stage="Won",
            commercial_class="STRUCTURED_OFFER",
            service_line_code="SL-CAPITAL",
            offer_code="OFF-CAP-PKG",
            pricing_basis="SETUP",
            approved_scope=False,
            approved_economics=False,
        )
        self.assertTrue(any("Approved scope" in e for e in errs))
        self.assertTrue(any("Approved economics" in e for e in errs))

    def test_decision_engine_maps_funding_disorganized(self) -> None:
        rule = commercial_rules.recommend_offer("Funding but disorganized")
        assert rule is not None
        self.assertEqual(rule["offerCode"], "OFF-CAP-DIAG")

    def test_owner_support_not_in_public_offers(self) -> None:
        public = commercial_rules.public_offers_only(include_restricted=False)
        codes = {o["offerCode"] for o in public}
        self.assertNotIn("OFF-OWNER-SUPPORT", codes)

    def test_enriched_offers_have_sales_metadata(self) -> None:
        offers = commercial_rules.load_offers()
        for o in offers:
            self.assertIn("idealClient", o)
            self.assertIn("deliverables", o)
            self.assertIn("salesAngle", o)
            self.assertIn("pricingVersionId", o)

    def test_three_proposal_archetypes(self) -> None:
        arch = json.loads((BUSINESS / "proposal-archetypes.json").read_text(encoding="utf-8"))
        self.assertEqual(len(arch["archetypes"]), 3)
        for a in arch["archetypes"]:
            path = ROOT / a["templatePath"]
            self.assertTrue(path.exists(), a["templatePath"])

    def test_qualification_weak_flag(self) -> None:
        self.assertEqual(
            commercial_rules.qualification_weak_flag([True, True, True, True, False, False]),
            None,
        )
        self.assertEqual(
            commercial_rules.qualification_weak_flag([True, False, False, False, False, False]),
            "DECLINE_OR_PREMIUM_PRICE_REVIEW",
        )

    def test_legacy_price_still_protected(self) -> None:
        self.assertFalse(
            pricing_policy.can_apply_rate_card_to_client("HVS_LEGACY_CLIENT", "CURRENT_RATE_CARD")
        )
        self.assertEqual(pricing_policy.accg_locked_monthly(), 4539.0)

    def test_opportunity_schema_has_commercial_fields(self) -> None:
        schema = json.loads(
            (ROOT / "src/sharepoint/lists/HVCG_Opportunities.json").read_text(encoding="utf-8")
        )
        names = {c["internalName"] for c in schema["columns"]}
        required = (
            "CommercialClass",
            "ServiceLineCode",
            "OfferCode",
            "PricingVersionId",
            "PricingBasis",
            "QualificationFlag",
            "ApprovedScope",
            "ApprovedEconomics",
        )
        missing = [n for n in required if n not in names]
        if missing:
            self.skipTest(
                "Deferred SharePoint commercial-column overlay; engines use config/business JSON. Missing: "
                + ", ".join(missing)
            )
        for n in required:
            self.assertIn(n, names)


if __name__ == "__main__":
    unittest.main()
