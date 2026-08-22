#!/usr/bin/env python3
"""Sprint 5 Capital Readiness — fixtures A–F + end-to-end path."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import capital_readiness as cr  # noqa: E402
import revenue_conversion as rc  # noqa: E402
import pricing_policy  # noqa: E402


def _docs_all_accepted(financing="Working Capital"):
    checklist = cr.build_document_checklist(financing_type=financing, amount=500000)
    return {i["code"]: "ACCEPTED" for i in checklist["required"]}


class TestCapitalReadinessFixtures(unittest.TestCase):
    def test_case_a_strong_business_high_score(self) -> None:
        result = cr.run_capital_readiness_diagnostic(
            {
                "client": "Strong Co",
                "opportunityId": "OPP-A",
                "diagnosticId": "DIAG-A",
                "businessAgeYears": 8,
                "request": {
                    "amount_requested": 500000,
                    "preferred_capital_type": "Working Capital",
                    "purpose": "Inventory + payroll expansion",
                    "timing": "90 days",
                    "working_capital_need": True,
                    "use_of_funds": [
                        {"category": "Inventory", "amount": 300000, "description": "SKU expansion"},
                        {"category": "Payroll", "amount": 200000, "description": "Crew"},
                    ],
                },
                "documentsReceived": _docs_all_accepted(),
                "debtLines": [
                    {
                        "creditor": "Bank A",
                        "current_balance": 100000,
                        "monthly_payment": 2500,
                        "collateral": "AR",
                        "source_evidence": "Debt schedule 2026-07-01",
                    }
                ],
                "provenancedValues": [
                    cr.pv("revenue", 4_500_000, source="QuickBooks P&L", period_end="2026-06-30", source_date="2026-07-05"),
                    cr.pv("cash", 350000, source="Bank Statement", source_date="2026-07-31"),
                    cr.pv("noi_or_ebitda", 600000, source="Advisor-normalized EBITDA", kind="ADVISOR_JUDGMENT"),
                    cr.pv("monthly_debt_service", 2500, source="Debt schedule", kind="CALCULATED"),
                ],
                "signals": [
                    {"code": "STRONG_REVENUE_HISTORY"},
                    {"code": "POSITIVE_CASH_FLOW"},
                    {"code": "RECURRING_CONTRACTS"},
                ],
            }
        )
        self.assertGreaterEqual(result["summary"]["readinessScore"], 85)
        self.assertEqual(result["summary"]["band"]["code"], "CAPITAL_READY")
        self.assertFalse(result["summary"]["canContactLender"])

    def test_case_b_missing_documents_not_invented_negatives(self) -> None:
        result = cr.run_capital_readiness_diagnostic(
            {
                "client": "Docs Missing Co",
                "businessAgeYears": 6,
                "request": {
                    "amount_requested": 400000,
                    "preferred_capital_type": "Working Capital",
                    "purpose": "WC",
                    "timing": "60 days",
                    "use_of_funds": [{"category": "Working Capital", "amount": 400000}],
                },
                "documentsReceived": {"YTD_PL": "ACCEPTED"},  # mostly missing
                "provenancedValues": [
                    cr.pv("revenue", 3_000_000, source="P&L", source_date="2026-07-01"),
                    cr.pv("cash", 200000, source="Bank", source_date="2026-07-01"),
                    cr.pv("noi_or_ebitda", 400000, source="P&L"),
                ],
                "debtLines": [{"creditor": "Bank", "current_balance": 50000, "monthly_payment": 1200}],
                "signals": [{"code": "POSITIVE_CASH_FLOW"}, {"code": "STRONG_REVENUE_HISTORY"}],
            }
        )
        missing = [d for d in result["summary"]["documentationCompleteness"]["details"] if d["status"] == "MISSING"]
        self.assertGreater(len(missing), 0)
        # Missing docs must not be labeled FAILED
        self.assertTrue(all(d["status"] != "FAILED" for d in missing))
        self.assertIn("DOCUMENTATION", result["summary"]["recommendedNextStep"])

    def test_case_c_high_debt_concern(self) -> None:
        result = cr.run_capital_readiness_diagnostic(
            {
                "client": "High Debt Co",
                "businessAgeYears": 5,
                "request": {
                    "amount_requested": 250000,
                    "preferred_capital_type": "Debt",
                    "purpose": "Refinance",
                    "timing": "30 days",
                    "refinance_need": True,
                    "use_of_funds": [{"category": "Debt Refinance", "amount": 250000}],
                },
                "documentsReceived": _docs_all_accepted("Debt"),
                "debtLines": [
                    {"creditor": "Lender1", "current_balance": 900000, "monthly_payment": 45000, "collateral": "All assets"}
                ],
                "provenancedValues": [
                    cr.pv("revenue", 2_000_000, source="P&L", source_date="2026-07-01"),
                    cr.pv("cash", 40000, source="Bank", source_date="2026-07-01"),
                    cr.pv("noi_or_ebitda", 200000, source="P&L"),
                    cr.pv("monthly_debt_service", 45000, source="Debt schedule"),
                ],
                "signals": [],
            }
        )
        codes = {c["code"] for c in result["summary"]["lenderConcerns"]}
        self.assertTrue("EXCESSIVE_DEBT_SERVICE_BURDEN" in codes or "TIGHT_DSCR" in codes)
        self.assertLess(result["summary"]["readinessScore"], 85)

    def test_case_d_source_conflict(self) -> None:
        result = cr.run_capital_readiness_diagnostic(
            {
                "client": "Conflict Co",
                "businessAgeYears": 4,
                "request": {
                    "amount_requested": 300000,
                    "preferred_capital_type": "Working Capital",
                    "purpose": "WC",
                    "use_of_funds": [{"category": "Working Capital", "amount": 300000}],
                },
                "documentsReceived": _docs_all_accepted(),
                "provenancedValues": [
                    cr.pv("revenue", 2_000_000, source="P&L", source_date="2026-06-30"),
                    cr.pv("revenue", 1_500_000, source="Tax return", source_date="2025-12-31"),
                ],
                "debtLines": [],
                "signals": [],
            }
        )
        self.assertTrue(any(c["code"] == "SOURCE_CONFLICT" for c in result["conflicts"]))
        self.assertEqual(result["summary"]["recommendedNextStep"], "CAPITAL_STRATEGY_REVIEW")

    def test_case_e_legacy_client_pricing_protected(self) -> None:
        result = cr.run_capital_readiness_diagnostic(
            {
                "client": "ACCG",
                "businessAgeYears": 10,
                "clientClassification": "HVS_LEGACY_CLIENT",
                "contractedCurrent": pricing_policy.accg_locked_monthly(),
                "request": {
                    "amount_requested": 750000,
                    "preferred_capital_type": "SBA",
                    "purpose": "Expansion",
                    "use_of_funds": [
                        {"category": "Expansion", "amount": 500000},
                        {"category": "Working Capital", "amount": 250000},
                    ],
                },
                "documentsReceived": _docs_all_accepted("SBA"),
                "provenancedValues": [
                    cr.pv("revenue", 5_000_000, source="P&L", source_date="2026-07-01"),
                    cr.pv("cash", 400000, source="Bank", source_date="2026-07-01"),
                    cr.pv("noi_or_ebitda", 700000, source="P&L"),
                ],
                "debtLines": [{"creditor": "Bank", "current_balance": 200000, "monthly_payment": 4000}],
                "signals": [{"code": "STRONG_REVENUE_HISTORY"}, {"code": "POSITIVE_CASH_FLOW"}],
            }
        )
        approved = cr.human_approve_readiness(
            result,
            advisor="Manny Barela",
            conclusion="Proceed to lender-ready package evaluation",
            approve_package_handoff=True,
        )
        self.assertTrue(approved["legacyPricingProtected"])
        self.assertEqual(approved["contractedCurrent"], 4539.0)
        self.assertEqual(approved["offerRecommendation"]["offerCode"], "OFF-CAP-PKG")
        self.assertFalse(approved["offerRecommendation"]["autoCreateProposal"])
        # Must not mutate contracted price
        self.assertEqual(approved["contractedCurrent"], pricing_policy.accg_locked_monthly())

    def test_case_f_insufficient_dscr_data(self) -> None:
        result = cr.run_capital_readiness_diagnostic(
            {
                "client": "No DSCR Inputs",
                "businessAgeYears": 3,
                "request": {
                    "amount_requested": 200000,
                    "preferred_capital_type": "Debt",
                    "purpose": "Equipment",
                    "use_of_funds": [{"category": "Equipment", "amount": 200000}],
                },
                "documentsReceived": _docs_all_accepted("Debt"),
                "provenancedValues": [
                    cr.pv("revenue", 1_200_000, source="P&L", source_date="2026-07-01"),
                    # no NOI / debt service
                ],
                "debtLines": [],
                "signals": [],
            }
        )
        self.assertEqual(result["dscr"]["status"], "INSUFFICIENT_DATA")
        self.assertIsNone(result["dscr"]["result"])


class TestCapitalEndToEnd(unittest.TestCase):
    def test_e2e_capital_to_approved_to_send_stop(self) -> None:
        fit = rc.complete_free_fit(
            assessment_id="FF-CAP-1",
            lead_id="LEAD-CAP-1",
            advisor="manny@hvcg.test",
            need_type="Funding but disorganized",
            source="Referral Partner",
            referral_source="Randy Kamin",
        )
        self.assertEqual(fit["assessment"]["recommended_offer"], "OFF-CAP-DIAG")

        diag = rc.create_diagnostic(
            diagnostic_id="DIAG-CAP-1",
            diagnostic_type=fit["assessment"]["recommended_diagnostic"] or "DIAG-FULL-CAPITAL",
            client_id="CLIENT-CAP-1",
            opportunity_id="OPP-CAP-1",
        )
        self.assertEqual(diag["errors"], [])

        capital = cr.run_capital_readiness_diagnostic(
            {
                "client": "E2E Capital Co",
                "opportunityId": "OPP-CAP-1",
                "diagnosticId": "DIAG-CAP-1",
                "businessAgeYears": 7,
                "request": {
                    "amount_requested": 600000,
                    "preferred_capital_type": "SBA",
                    "purpose": "Growth capital",
                    "timing": "120 days",
                    "use_of_funds": [
                        {"category": "Expansion", "amount": 400000},
                        {"category": "Working Capital", "amount": 200000},
                    ],
                },
                "documentsReceived": _docs_all_accepted("SBA"),
                "debtLines": [{"creditor": "Bank", "current_balance": 150000, "monthly_payment": 3500, "collateral": "RE"}],
                "provenancedValues": [
                    cr.pv("revenue", 6_000_000, source="QuickBooks", source_date="2026-07-15"),
                    cr.pv("cash", 500000, source="Bank Statement", source_date="2026-07-31"),
                    cr.pv("noi_or_ebitda", 900000, source="P&L"),
                    cr.pv("monthly_debt_service", 3500, kind="CALCULATED", source="debt_schedule"),
                ],
                "signals": [{"code": "STRONG_REVENUE_HISTORY"}, {"code": "POSITIVE_CASH_FLOW"}, {"code": "COMPLETE_DOCUMENTATION"}],
            }
        )
        self.assertTrue(capital["summary"]["humanApprovalRequired"])
        self.assertFalse(capital["summary"]["canContactLender"])

        approved = cr.human_approve_readiness(
            capital,
            advisor="Manny Barela",
            conclusion="Ready for Lender-Ready Capital Package",
            approve_package_handoff=True,
        )
        self.assertEqual(approved["packageHandoff"]["status"], "READY_FOR_PACKAGE_BUILD")
        self.assertFalse(approved["packageHandoff"]["canSubmitToLender"])
        self.assertEqual(approved["offerRecommendation"]["offerCode"], "OFF-CAP-PKG")

        pricing = rc.recommend_pricing(
            offer_code="OFF-CAP-PKG",
            commercial_class="STRUCTURED_OFFER",
            client_classification="HVCG_NEW_CLIENT",
            capital_amount=600000,
        )
        rec = pricing["recommendation"]
        draft = rc.draft_proposal(
            client_name="E2E Capital Co",
            opportunity_id="OPP-CAP-1",
            commercial_class="STRUCTURED_OFFER",
            offer_code="OFF-CAP-PKG",
            pricing_recommendation=rec,
        )["proposal"]
        approved_prop = rc.transition_proposal(draft, "APPROVED_TO_SEND", actor="Manny Barela")
        self.assertEqual(approved_prop["proposal"]["status"], "APPROVED_TO_SEND")
        blocked = rc.transition_proposal(approved_prop["proposal"], "SENT", actor="system")
        self.assertTrue(any("BL-C1" in e for e in blocked["errors"]))
        self.assertTrue(any(a["event"] == "human_approval" for a in approved["audit"]))
        self.assertIn("HVCG-PRICE-2026-08-11-v2", rec["pricingVersion"])


if __name__ == "__main__":
    unittest.main()
