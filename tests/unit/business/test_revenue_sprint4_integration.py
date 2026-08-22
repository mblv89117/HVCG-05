#!/usr/bin/env python3
"""Sprint 4 Dev integration tests — commercial path across BA V2 modules.

Minimum paths stop at APPROVED_TO_SEND. No external send. No Production mutation.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import pricing_policy  # noqa: E402
import revenue_conversion as rc  # noqa: E402


class TestSprint4CommercialIntegration(unittest.TestCase):
    def test_happy_path_lead_fit_diagnostic_pricing_proposal_approval_stop(self) -> None:
        audit: list[str] = []

        fit = rc.complete_free_fit(
            assessment_id="FF-S4-1",
            lead_id="LEAD-S4-1",
            advisor="manny@hvcg.test",
            need_type="Funding but disorganized",
            source="Referral Partner",
            referral_source="Randy Kamin — Generational Group",
        )
        self.assertEqual(fit["errors"], [])
        assessment = fit["assessment"]
        self.assertEqual(assessment["qualification_result"], "Qualified")
        self.assertEqual(assessment["recommended_offer"], "OFF-CAP-DIAG")
        audit.append(f"free_fit:{assessment['assessment_id']}:{assessment['qualification_result']}")

        diag = rc.create_diagnostic(
            diagnostic_id="DIAG-S4-1",
            diagnostic_type=assessment["recommended_diagnostic"] or "DIAG-FULL-CAPITAL",
            client_id="CLIENT-NEW-1",
            opportunity_id="OPP-S4-1",
        )
        self.assertEqual(diag["errors"], [])
        diagnostic = diag["diagnostic"]
        diagnostic["status"] = "COMPLETED"
        diagnostic["human_approval"] = True
        diagnostic["completion_date"] = "2026-08-11"
        diagnostic["recommended_offer"] = assessment["recommended_offer"]
        audit.append(f"diagnostic:{diagnostic['diagnostic_id']}:{diagnostic['status']}")

        pricing = rc.recommend_pricing(
            offer_code=assessment["recommended_offer"],
            commercial_class="STRUCTURED_OFFER",
            client_classification="HVCG_NEW_CLIENT",
        )
        self.assertEqual(pricing["errors"], [])
        rec = pricing["recommendation"]
        self.assertEqual(rec["pricingVersion"], "HVCG-PRICE-2026-08-11-v2")
        self.assertFalse(rec["isApprovedPrice"])
        audit.append(f"pricing:{rec['pricingVersion']}")

        draft = rc.draft_proposal(
            client_name="New HVCG Prospect LLC",
            opportunity_id="OPP-S4-1",
            commercial_class="STRUCTURED_OFFER",
            offer_code=assessment["recommended_offer"],
            pricing_recommendation=rec,
        )
        self.assertEqual(draft["errors"], [])
        proposal = draft["proposal"]
        self.assertEqual(proposal["status"], "DRAFT")
        self.assertFalse(proposal["canAutoSend"])
        audit.append(f"proposal_draft:{proposal['offerCode']}")

        approval = rc.create_proposal_approval(proposal, requester="advisor@hvcg.test")
        self.assertEqual(approval["ApprovalType"], "Proposal")
        self.assertEqual(approval["ApprovalStatus"], "Pending")
        audit.append("approval:pending")

        reviewed = rc.transition_proposal(proposal, "INTERNAL_REVIEW", actor="advisor@hvcg.test")
        self.assertEqual(reviewed["errors"], [])
        approved = rc.transition_proposal(reviewed["proposal"], "APPROVED_TO_SEND", actor="manny@hvcg.test")
        self.assertEqual(approved["errors"], [])
        self.assertEqual(approved["proposal"]["status"], "APPROVED_TO_SEND")
        audit.append("proposal:APPROVED_TO_SEND")

        blocked = rc.transition_proposal(approved["proposal"], "SENT", actor="system")
        self.assertTrue(any("BL-C1" in e for e in blocked["errors"]))
        self.assertEqual(blocked["proposal"]["status"], "APPROVED_TO_SEND")
        audit.append("bl_c1:blocked_SENT")

        chain = rc.referral_attribution_chain(
            referral_partner_id="RP-RANDY",
            lead_id="LEAD-S4-1",
            opportunity_id="OPP-S4-1",
            diagnostic_id="DIAG-S4-1",
            proposal_id="PROP-S4-1",
            engagement_id=None,
            invoice_id=None,
            collected_revenue=None,
        )
        self.assertFalse(chain["payoutAllowed"])
        self.assertEqual(proposal["pricingVersionId"], "HVCG-PRICE-2026-08-11-v2")
        self.assertEqual(assessment["referral_source"], "Randy Kamin — Generational Group")
        self.assertGreaterEqual(len(audit), 6)

    def test_bypass_path_auditable(self) -> None:
        fit = rc.complete_free_fit(
            assessment_id="FF-S4-BYPASS",
            lead_id="LEAD-S4-BYPASS",
            advisor="manny@hvcg.test",
            need_type="Ready for financing",
            source="Website",
        )
        self.assertEqual(fit["assessment"]["recommended_offer"], "OFF-CAP-PKG")

        bypass = rc.create_diagnostic(
            diagnostic_id="DIAG-S4-BYPASS",
            diagnostic_type="DIAG-FULL-CAPITAL",
            client_id=None,
            opportunity_id="OPP-S4-BYPASS",
            bypass=True,
            bypass_reason="Qualified opportunity already defined; lender package complete",
        )
        self.assertEqual(bypass["errors"], [])
        self.assertTrue(bypass["diagnostic"]["diagnostic_bypass"])
        self.assertTrue(bypass["diagnostic"]["bypass_reason"])

        rec = rc.recommend_pricing(
            offer_code="OFF-CAP-PKG",
            commercial_class="STRUCTURED_OFFER",
            client_classification="HVCG_NEW_CLIENT",
        )["recommendation"]
        draft = rc.draft_proposal(
            client_name="Bypass Co",
            opportunity_id="OPP-S4-BYPASS",
            commercial_class="STRUCTURED_OFFER",
            offer_code="OFF-CAP-PKG",
            pricing_recommendation=rec,
        )["proposal"]
        approved = rc.transition_proposal(draft, "APPROVED_TO_SEND", actor="manny@hvcg.test")
        blocked = rc.transition_proposal(approved["proposal"], "SENT", actor="system")
        self.assertTrue(any("BL-C1" in e for e in blocked["errors"]))

    def test_legacy_accg_recommended_future_never_overwrites_contracted(self) -> None:
        contracted = pricing_policy.accg_locked_monthly()
        out = rc.recommend_pricing(
            offer_code="OFF-FCFO-OP",
            commercial_class="RECURRING_RETAINER",
            client_classification="HVS_LEGACY_CLIENT",
            contracted_current=contracted,
        )
        rec = out["recommendation"]
        self.assertEqual(rec["pricingStateForNewEconomics"], "RECOMMENDED_FUTURE")
        self.assertEqual(rec["legacyProtection"]["CONTRACTED_CURRENT"], contracted)
        self.assertTrue(rec["accgLockApplies"])
        # Recommendation must not mutate active contracted economics
        self.assertEqual(
            rc.protect_contracted_price(
                contracted,
                15000.0,
                owner_approved=False,
                agreement_executed=False,
            ),
            contracted,
        )
        # Even with owner approval alone (no executed agreement), contracted stays
        self.assertEqual(
            rc.protect_contracted_price(
                contracted,
                15000.0,
                owner_approved=True,
                agreement_executed=False,
            ),
            contracted,
        )


if __name__ == "__main__":
    unittest.main()
