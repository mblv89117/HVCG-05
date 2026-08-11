#!/usr/bin/env python3
"""Sprint 3 Revenue conversion engine tests."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import pricing_policy  # noqa: E402
import revenue_conversion as rc  # noqa: E402


class TestSprint3Conversion(unittest.TestCase):
    def test_free_fit_blocks_substantive_work(self) -> None:
        fit = rc.FreeFitAssessment(
            assessment_id="FF-1",
            lead_id="L1",
            date="2026-08-11",
            advisor="advisor@hvcg.test",
            need_type="Funding but disorganized",
            revenue_range="1-5M",
            capital_goal="500k",
            urgency="High",
            service_fit="SL-CAPITAL",
            qualification_result="Qualified",
            recommended_diagnostic="DIAG-FULL-CAPITAL",
            recommended_service_line="SL-CAPITAL",
            recommended_offer="OFF-CAP-DIAG",
            disqualification_reason=None,
            notes="",
            source="Website",
            substantive_outputs_attempted=["DSCR analysis", "Lender package creation"],
        )
        errs = rc.validate_free_fit(fit)
        self.assertGreaterEqual(len(errs), 2)

    def test_free_fit_complete_routes_to_diagnostic(self) -> None:
        out = rc.complete_free_fit(
            assessment_id="FF-2",
            lead_id="L2",
            advisor="a@hvcg.test",
            need_type="Funding but disorganized",
            source="Podcast",
        )
        self.assertEqual(out["errors"], [])
        self.assertEqual(out["fee"], 0)
        self.assertEqual(out["assessment"]["recommended_offer"], "OFF-CAP-DIAG")

    def test_new_client_uses_v2_pricing(self) -> None:
        out = rc.recommend_pricing(
            offer_code="OFF-CAP-PKG",
            commercial_class="STRUCTURED_OFFER",
            client_classification="HVCG_NEW_CLIENT",
        )
        self.assertEqual(out["errors"], [])
        rec = out["recommendation"]
        self.assertEqual(rec["pricingVersion"], "HVCG-PRICE-2026-08-11-v2")
        self.assertEqual(rec["pricingStateForNewEconomics"], "CURRENT_RATE_CARD")
        self.assertFalse(rec["isApprovedPrice"])
        self.assertIsNotNone(rec["recommendedSetupFee"])

    def test_legacy_gets_recommended_future_not_overwrite(self) -> None:
        out = rc.recommend_pricing(
            offer_code="OFF-FCFO-OP",
            commercial_class="RECURRING_RETAINER",
            client_classification="HVS_LEGACY_CLIENT",
            contracted_current=4539.0,
        )
        rec = out["recommendation"]
        self.assertEqual(rec["pricingStateForNewEconomics"], "RECOMMENDED_FUTURE")
        self.assertIsNone(rec["recommendedRetainer"])
        self.assertEqual(rec["legacyProtection"]["CONTRACTED_CURRENT"], 4539.0)
        self.assertEqual(
            rc.protect_contracted_price(4539.0, 15000.0, owner_approved=False, agreement_executed=False),
            4539.0,
        )

    def test_accg_lock(self) -> None:
        self.assertEqual(pricing_policy.accg_locked_monthly(), 4539.0)
        out = rc.recommend_pricing(
            offer_code="OFF-FCFO-OP",
            commercial_class="RECURRING_RETAINER",
            client_classification="HVS_LEGACY_CLIENT",
            contracted_current=4539.0,
        )
        self.assertTrue(out["recommendation"]["accgLockApplies"])

    def test_override_requires_audit(self) -> None:
        base = rc.recommend_pricing(
            offer_code="OFF-CAP-PKG",
            commercial_class="STRUCTURED_OFFER",
            client_classification="HVCG_NEW_CLIENT",
        )["recommendation"]
        bad = rc.apply_manual_pricing_override(
            recommendation=base, override_setup=1.0, override_retainer=1.0, approver="", reason=""
        )
        self.assertTrue(bad["errors"])
        good = rc.apply_manual_pricing_override(
            recommendation=base,
            override_setup=30000.0,
            override_retainer=12000.0,
            approver="manny@hvcg.test",
            reason="Enterprise complexity",
        )
        self.assertEqual(good["errors"], [])
        self.assertEqual(good["override"]["type"], "MANUAL_PRICING_OVERRIDE")
        self.assertTrue(good["override"]["stillNotContracted"])

    def test_proposal_uses_canonical_offer_and_blocks_send(self) -> None:
        rec = rc.recommend_pricing(
            offer_code="OFF-CAP-PKG",
            commercial_class="STRUCTURED_OFFER",
            client_classification="HVCG_NEW_CLIENT",
        )["recommendation"]
        draft = rc.draft_proposal(
            client_name="Acme",
            opportunity_id="O1",
            commercial_class="STRUCTURED_OFFER",
            offer_code="OFF-CAP-PKG",
            pricing_recommendation=rec,
        )
        self.assertEqual(draft["errors"], [])
        self.assertIn("Lender-Ready Capital Package", draft["proposal"]["body"])
        self.assertFalse(draft["proposal"]["canAutoSend"])
        sent = rc.transition_proposal(draft["proposal"], "SENT", actor="system")
        self.assertTrue(any("BL-C1" in e for e in sent["errors"]))
        approved = rc.transition_proposal(draft["proposal"], "APPROVED_TO_SEND", actor="owner")
        self.assertEqual(approved["errors"], [])
        self.assertEqual(approved["proposal"]["status"], "APPROVED_TO_SEND")

    def test_referral_payout_collected_only(self) -> None:
        chain = rc.referral_attribution_chain(
            referral_partner_id="RP1",
            lead_id="L1",
            opportunity_id="O1",
            diagnostic_id="D1",
            proposal_id="P1",
            engagement_id="E1",
            invoice_id="I1",
            collected_revenue=None,
        )
        self.assertEqual(chain["payoutBasis"], "COLLECTED_CLEARED_REVENUE_ONLY")
        self.assertFalse(chain["payoutAllowed"])

    def test_diagnostic_bypass_requires_reason(self) -> None:
        bad = rc.create_diagnostic(
            diagnostic_id="D1",
            diagnostic_type="DIAG-FULL-CAPITAL",
            client_id=None,
            opportunity_id="O1",
            bypass=True,
            bypass_reason=None,
        )
        self.assertTrue(bad["errors"])
        good = rc.create_diagnostic(
            diagnostic_id="D2",
            diagnostic_type="DIAG-FULL-CAPITAL",
            client_id=None,
            opportunity_id="O1",
            bypass=True,
            bypass_reason="Qualified opportunity already defined",
        )
        self.assertEqual(good["errors"], [])
        self.assertTrue(good["diagnostic"]["diagnostic_bypass"])

    def test_outcome_selling_maps_loan_help(self) -> None:
        mapped = rc.map_outcome_need("Help with loan")
        self.assertEqual(mapped["mappedOfferCode"], "OFF-CAP-DIAG")
        self.assertTrue(mapped["humanConfirmationRequired"])

    def test_dev_lists_not_production(self) -> None:
        for name in ("HVCG_FitAssessments", "HVCG_Diagnostics"):
            schema = json.loads((ROOT / f"src/sharepoint/lists/{name}.json").read_text())
            self.assertFalse(schema["provisioning"]["productionAuthorized"])


if __name__ == "__main__":
    unittest.main()
