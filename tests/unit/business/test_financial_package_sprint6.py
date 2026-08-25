#!/usr/bin/env python3
"""Sprint 6 Lender-Ready Capital Package — cases A–I + end-to-end."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import capital_readiness as cr  # noqa: E402
import financial_package as fp  # noqa: E402
import revenue_conversion as rc  # noqa: E402
import pricing_policy  # noqa: E402


def _docs_accepted(financing="SBA"):
    checklist = cr.build_document_checklist(financing_type=financing, amount=750000)
    return {i["code"]: "ACCEPTED" for i in checklist["required"]}


def _strong_readiness(client="Pkg Co", financing="SBA", amount=750000, classification="HVCG_NEW_CLIENT", contracted=None):
    result = cr.run_capital_readiness_diagnostic(
        {
            "client": client,
            "opportunityId": "OPP-PKG-1",
            "diagnosticId": "DIAG-PKG-1",
            "businessAgeYears": 8,
            "clientClassification": classification,
            "contractedCurrent": contracted,
            "request": {
                "amount_requested": amount,
                "preferred_capital_type": financing,
                "purpose": "Growth",
                "timing": "90 days",
                "use_of_funds": [
                    {"category": "Expansion", "amount": amount * 0.6},
                    {"category": "Working Capital", "amount": amount * 0.4},
                ],
            },
            "documentsReceived": _docs_accepted(financing),
            "debtLines": [{"creditor": "Bank", "current_balance": 120000, "monthly_payment": 3000, "collateral": "RE"}],
            "provenancedValues": [
                cr.pv("revenue", 5_000_000, source="QuickBooks", source_date="2026-07-15"),
                cr.pv("cash", 400000, source="Bank", source_date="2026-07-31"),
                cr.pv("noi_or_ebitda", 800000, source="P&L"),
            ],
            "signals": [{"code": "STRONG_REVENUE_HISTORY"}, {"code": "POSITIVE_CASH_FLOW"}],
        }
    )
    return cr.human_approve_readiness(
        result,
        advisor="Manny Barela",
        conclusion="Proceed to package",
        approve_package_handoff=True,
    )


def _base_room():
    return [
        fp.DataRoomItem("Entity docs", "Company / Entity", None, "v1", "2026-07-01", "VERIFIED", True, "Client", "LENDER_PACKAGE"),
        fp.DataRoomItem("YTD P&L", "Financial Statements", "2026-YTD", "v1", "2026-07-15", "VERIFIED", True, "QuickBooks", "LENDER_PACKAGE"),
        fp.DataRoomItem("Debt schedule", "Debt", "2026-07", "v1", "2026-07-10", "VERIFIED", True, "Client", "LENDER_PACKAGE"),
        fp.DataRoomItem("Internal strategy", "Supporting Information", None, "v1", "2026-07-01", "VERIFIED", True, "Advisor", "OWNER_ONLY", notes_internal="lender targeting"),
    ]


def _metrics():
    return [
        fp.PeriodBoundMetric("Revenue", 5_000_000, period_start="2025-01-01", period_end="2025-12-31", fiscal_year="2025", ytd_vs_full_year="FULL_YEAR", source="Tax return", provenance_kind="FACT", verification_status="VERIFIED", authority_class="SIGNED_TAX_RETURN"),
        fp.PeriodBoundMetric("Cash", 400000, as_of_date="2026-07-31", source="Bank Statement", provenance_kind="FACT", verification_status="VERIFIED", authority_class="BANK_STATEMENT"),
        fp.PeriodBoundMetric("EBITDA", None, unavailable=True, notes="unavailable"),
    ]


class TestPackageCases(unittest.TestCase):
    def test_case_a_complete_sba_package_to_gated_approval(self) -> None:
        readiness = _strong_readiness()
        pkg = fp.run_financial_package_agent(
            {
                "client": "Pkg Co",
                "opportunityId": "OPP-PKG-1",
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 750000,
                    "preferred_capital_type": "SBA",
                    "use_of_funds": [
                        {"category": "Expansion", "amount": 450000},
                        {"category": "Working Capital", "amount": 300000},
                    ],
                },
                "documentStatuses": _docs_accepted("SBA"),
                "debtLines": [{"creditor": "Bank", "current_balance": 120000, "monthly_payment": 3000, "collateral": "RE"}],
                "balanceSheetDebt": fp.PeriodBoundMetric("TotalDebt", 120000, period_end="2026-06-30", source="Balance sheet"),
                "metrics": _metrics(),
                "projections": [
                    fp.ProjectionLine("Revenue", 5_000_000, "HISTORICAL_ACTUAL", period="2025"),
                    fp.ProjectionLine("Revenue", 5_800_000, "HVCG_SCENARIO", scenario="Base", assumptions="modest growth", author="advisor"),
                ],
                "dataRoomItems": _base_room(),
                "provenancedValues": [
                    cr.pv("revenue", 5_000_000, source="Tax", source_date="2026-01-15"),
                ],
                "createdBy": "advisor@hvcg.test",
                "fiAdapterStatus": "PENDING_LIVE_SOURCE",
            }
        )
        self.assertNotEqual(pkg["state"], "NOT_STARTED")
        pkg = fp.approve_lender_memo(pkg, advisor="Manny Barela")
        pkg = fp.advisor_approve_package(pkg, advisor="Manny Barela", conclusion="Package ready")
        self.assertTrue(pkg.get("approvedForLenderSubmission") or pkg.get("state") == "SUBMISSION_GATED")
        blocked = fp.attempt_lender_submit(pkg, actor="system")
        self.assertFalse(blocked["allowed"])

    def test_case_b_missing_tax_return_incomplete(self) -> None:
        readiness = _strong_readiness()
        docs = _docs_accepted("SBA")
        docs["BIZ_TAX"] = "MISSING"
        docs["PERSONAL_TAX"] = "MISSING"
        pkg = fp.run_financial_package_agent(
            {
                "client": "Missing Tax Co",
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 750000,
                    "preferred_capital_type": "SBA",
                    "use_of_funds": [{"category": "Working Capital", "amount": 750000}],
                },
                "documentStatuses": docs,
                "metrics": _metrics(),
                "projections": [],
                "dataRoomItems": _base_room(),
            }
        )
        self.assertLess(pkg["completeness"]["packageCompletenessPercent"], 100)
        self.assertTrue(any(d["code"] in {"BIZ_TAX", "PERSONAL_TAX"} and d["status"] == "MISSING" for d in pkg["missingInformation"]))

    def test_case_c_conflicting_debt(self) -> None:
        readiness = _strong_readiness(financing="Debt", amount=400000)
        pkg = fp.run_financial_package_agent(
            {
                "client": "Debt Conflict Co",
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 400000,
                    "preferred_capital_type": "Debt",
                    "use_of_funds": [{"category": "Debt Refinance", "amount": 400000}],
                },
                "documentStatuses": _docs_accepted("Debt"),
                "debtLines": [{"creditor": "Bank", "current_balance": 500000, "monthly_payment": 8000}],
                "balanceSheetDebt": fp.PeriodBoundMetric("TotalDebt", 250000, period_end="2026-06-30", source="Balance sheet"),
                "metrics": _metrics(),
                "dataRoomItems": _base_room(),
            }
        )
        self.assertEqual(pkg["debtReconciliation"]["flag"], "DEBT_RECONCILIATION_REQUIRED")

    def test_case_d_projection_labeling_separated(self) -> None:
        readiness = _strong_readiness()
        pkg = fp.run_financial_package_agent(
            {
                "client": "Proj Co",
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 750000,
                    "preferred_capital_type": "SBA",
                    "use_of_funds": [{"category": "Expansion", "amount": 750000}],
                },
                "documentStatuses": _docs_accepted("SBA"),
                "projections": [
                    fp.ProjectionLine("Revenue", 5_000_000, "HISTORICAL_ACTUAL", period="2025"),
                    fp.ProjectionLine("Revenue", 6_000_000, "CLIENT_FORECAST", scenario="Growth", assumptions="client forecast"),
                ],
                "metrics": _metrics(),
                "dataRoomItems": _base_room(),
            }
        )
        self.assertTrue(pkg["projections"]["historicalActuals"])
        self.assertTrue(pkg["projections"]["projectionsAndForecasts"])
        self.assertTrue(all(p["kind"] != "HISTORICAL_ACTUAL" for p in pkg["projections"]["projectionsAndForecasts"]))

    def test_case_e_stale_financials_warning(self) -> None:
        readiness = _strong_readiness()
        pkg = fp.run_financial_package_agent(
            {
                "client": "Stale Co",
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 750000,
                    "preferred_capital_type": "SBA",
                    "use_of_funds": [{"category": "Working Capital", "amount": 750000}],
                },
                "documentStatuses": _docs_accepted("SBA"),
                "provenancedValues": [
                    cr.pv("revenue", 4_000_000, source="Old P&L", source_date="2024-01-01", period_end="2023-12-31"),
                ],
                "metrics": _metrics(),
                "dataRoomItems": _base_room(),
            }
        )
        self.assertTrue(any(f.get("code") == "STALE_DATA" for f in pkg["staleFlags"]))

    def test_case_f_use_of_funds_variance_qa_fail(self) -> None:
        readiness = _strong_readiness()
        pkg = fp.run_financial_package_agent(
            {
                "client": "UoF Co",
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 750000,
                    "preferred_capital_type": "SBA",
                    "use_of_funds": [{"category": "Working Capital", "amount": 500000}],
                },
                "documentStatuses": _docs_accepted("SBA"),
                "metrics": _metrics(),
                "dataRoomItems": _base_room(),
            }
        )
        self.assertFalse(pkg["useOfFundsReconciliation"]["reconciled"])
        pkg = fp.approve_lender_memo(pkg, advisor="Manny Barela")
        self.assertEqual(pkg["qa"]["result"], "FAIL")
        blocked = fp.transition_package(pkg, "APPROVED_FOR_LENDER_SUBMISSION", actor="Manny Barela")
        # Need advisor approval object first — still should fail QA
        pkg["advisorApproval"] = {"advisor": "Manny Barela", "conclusion": "try", "at": "now"}
        blocked = fp.transition_package(pkg, "APPROVED_FOR_LENDER_SUBMISSION", actor="Manny Barela")
        self.assertTrue(blocked["errors"])

    def test_case_g_restricted_document_excluded(self) -> None:
        readiness = _strong_readiness()
        pkg = fp.run_financial_package_agent(
            {
                "client": "Restrict Co",
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 750000,
                    "preferred_capital_type": "SBA",
                    "use_of_funds": [{"category": "Working Capital", "amount": 750000}],
                },
                "documentStatuses": _docs_accepted("SBA"),
                "metrics": _metrics(),
                "dataRoomItems": _base_room(),
            }
        )
        lender_docs = [d["document"] for d in pkg["dataRoomIndex"]["lenderFacingIndex"]]
        self.assertNotIn("Internal strategy", lender_docs)

    def test_case_h_data_changed_after_approval(self) -> None:
        readiness = _strong_readiness()
        pkg = fp.run_financial_package_agent(
            {
                "client": "Change Co",
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 750000,
                    "preferred_capital_type": "SBA",
                    "use_of_funds": [{"category": "Working Capital", "amount": 750000}],
                },
                "documentStatuses": _docs_accepted("SBA"),
                "debtLines": [{"creditor": "Bank", "current_balance": 120000, "monthly_payment": 3000}],
                "balanceSheetDebt": fp.PeriodBoundMetric("TotalDebt", 120000, period_end="2026-06-30", source="BS"),
                "metrics": _metrics(),
                "projections": [fp.ProjectionLine("Revenue", 5_000_000, "HISTORICAL_ACTUAL", period="2025")],
                "dataRoomItems": _base_room(),
                "sourceSnapshotHash": "snap-v1",
            }
        )
        pkg = fp.approve_lender_memo(pkg, advisor="Manny Barela")
        pkg = fp.advisor_approve_package(pkg, advisor="Manny Barela", conclusion="ok")
        self.assertTrue(pkg.get("approvedForLenderSubmission") or pkg.get("state") == "SUBMISSION_GATED")
        # Force approved flag for change detection if gated cleared it visually
        pkg["approvedForLenderSubmission"] = True
        pkg["sourceSnapshotHash"] = "snap-v1"
        changed = fp.detect_material_data_change(pkg, change_description="New P&L uploaded", new_source_hash="snap-v2")
        self.assertEqual(changed["state"], "REVIEW_REQUIRED_DATA_CHANGED")
        self.assertFalse(changed["approvedForLenderSubmission"])
        self.assertNotEqual(changed["version"]["package_version"], "v1")

    def test_case_i_accg_legacy_pricing_protected(self) -> None:
        readiness = _strong_readiness(
            client="ACCG",
            financing="SBA",
            amount=500000,
            classification="HVS_LEGACY_CLIENT",
            contracted=pricing_policy.accg_locked_monthly(),
        )
        pkg = fp.run_financial_package_agent(
            {
                "client": "ACCG",
                "clientClassification": "HVS_LEGACY_CLIENT",
                "contractedCurrent": pricing_policy.accg_locked_monthly(),
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 500000,
                    "preferred_capital_type": "SBA",
                    "use_of_funds": [{"category": "Expansion", "amount": 500000}],
                },
                "documentStatuses": _docs_accepted("SBA"),
                "metrics": _metrics(),
                "dataRoomItems": _base_room(),
            }
        )
        self.assertTrue(pkg["pricingLink"]["legacyPricingProtected"])
        self.assertEqual(pkg["pricingLink"]["contractedCurrent"], 4539.0)
        self.assertEqual(pkg["contractedCurrent"], 4539.0)


class TestPackageEndToEnd(unittest.TestCase):
    def test_e2e_package_path_stops_at_submission_gate(self) -> None:
        fit = rc.complete_free_fit(
            assessment_id="FF-PKG",
            lead_id="LEAD-PKG",
            advisor="manny@hvcg.test",
            need_type="Funding but disorganized",
            source="Referral Partner",
        )
        diag = rc.create_diagnostic(
            diagnostic_id="DIAG-PKG",
            diagnostic_type="DIAG-FULL-CAPITAL",
            client_id="C1",
            opportunity_id="OPP-PKG",
        )
        self.assertEqual(diag["errors"], [])
        readiness = _strong_readiness(client="E2E Package Co")
        self.assertEqual(readiness["packageHandoff"]["status"], "READY_FOR_PACKAGE_BUILD")

        pkg = fp.run_financial_package_agent(
            {
                "client": "E2E Package Co",
                "opportunityId": "OPP-PKG",
                "capitalOpportunityId": "CAP-OPP-1",
                "readinessResult": readiness,
                "readinessHandoff": readiness["packageHandoff"],
                "readinessApproval": readiness["summary"]["advisorConclusion"],
                "request": {
                    "amount_requested": 750000,
                    "preferred_capital_type": "SBA",
                    "use_of_funds": [
                        {"category": "Expansion", "amount": 450000},
                        {"category": "Working Capital", "amount": 300000},
                    ],
                },
                "documentStatuses": _docs_accepted("SBA"),
                "debtLines": [{"creditor": "Bank", "current_balance": 120000, "monthly_payment": 3000}],
                "balanceSheetDebt": fp.PeriodBoundMetric("TotalDebt", 120000, period_end="2026-06-30", source="BS"),
                "metrics": _metrics(),
                "projections": [
                    fp.ProjectionLine("Revenue", 5_000_000, "HISTORICAL_ACTUAL", period="2025"),
                    fp.ProjectionLine("Revenue", 5_500_000, "HVCG_SCENARIO", scenario="Base"),
                ],
                "dataRoomItems": _base_room(),
                "provenancedValues": [cr.pv("revenue", 5_000_000, source="Tax", source_date="2026-01-15")],
                "assignedAdvisor": "Manny Barela",
                "targetLender": "Example Bank (Dev)",
                "targetProduct": "SBA 7(a)",
            }
        )
        pkg = fp.approve_lender_memo(pkg, advisor="Manny Barela")
        pkg = fp.advisor_approve_package(pkg, advisor="Manny Barela", conclusion="Approved gated")
        self.assertIn(pkg["state"], {"SUBMISSION_GATED", "APPROVED_FOR_LENDER_SUBMISSION"})
        self.assertFalse(fp.attempt_lender_submit(pkg, actor="system")["allowed"])

        # Commercial continuity
        pricing = rc.recommend_pricing(
            offer_code="OFF-CAP-PKG",
            commercial_class="STRUCTURED_OFFER",
            client_classification="HVCG_NEW_CLIENT",
        )["recommendation"]
        draft = rc.draft_proposal(
            client_name="E2E Package Co",
            opportunity_id="OPP-PKG",
            commercial_class="STRUCTURED_OFFER",
            offer_code="OFF-CAP-PKG",
            pricing_recommendation=pricing,
        )["proposal"]
        approved = rc.transition_proposal(draft, "APPROVED_TO_SEND", actor="Manny Barela")
        blocked = rc.transition_proposal(approved["proposal"], "SENT", actor="system")
        self.assertTrue(any("BL-C1" in e for e in blocked["errors"]))
        self.assertEqual(pkg["pricingLink"]["pricingVersion"], "HVCG-PRICE-2026-08-11-v2")
        self.assertTrue(any(a["event"] == "advisor_package_approval" for a in pkg["audit"]))
        self.assertEqual(fit["assessment"]["recommended_offer"], "OFF-CAP-DIAG")


if __name__ == "__main__":
    unittest.main()
