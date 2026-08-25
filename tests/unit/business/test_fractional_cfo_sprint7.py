#!/usr/bin/env python3
"""Sprint 7 Fractional CFO — fixtures A–J + E2E + CFO→Capital."""

from __future__ import annotations

import sys
import unittest
from dataclasses import asdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import fractional_cfo as cfo  # noqa: E402
import capital_readiness as cr  # noqa: E402
import pricing_policy  # noqa: E402


def _weeks(opening=100000, collections=20000, payroll=15000, vendors=10000, debt=3000, n=13):
    weeks = []
    for i in range(1, n + 1):
        weeks.append(
            cfo.CashWeek(
                week_number=i,
                week_ending=f"2026-09-{i:02d}" if i < 31 else "2026-09-30",
                opening_cash=opening if i == 1 else 0,
                customer_collections=collections,
                payroll=payroll,
                vendors=vendors,
                debt_service=debt,
                input_origins={"customer_collections": "Open AR", "payroll": "Scheduled Expense"},
            )
        )
    return weeks


class TestCfoFixtures(unittest.TestCase):
    def test_case_a_healthy_company(self) -> None:
        eng = cfo.create_cfo_engagement(client="Healthy Co", engagement_id="CFO-A", assigned_advisor="Manny Barela")
        self.assertEqual(eng["pricingRef"]["offerCode"], "OFF-FCFO-OP")
        self.assertTrue(eng["pricingRef"]["hardCodedInUiForbidden"])
        fc = cfo.build_13_week_forecast(_weeks(opening=200000), scenario="BASE", created_by="Manny")
        fc = cfo.approve_forecast(fc, advisor="Manny Barela")
        self.assertFalse(any(a["code"] == "PROJECTED_NEGATIVE_CASH" for a in fc["alerts"]))
        ar = cfo.ar_summary(
            [cfo.ArInvoice("Cust1", "INV1", "2026-07-01", "2026-07-31", 10000, 5000)],
            as_of="2026-08-05",
        )
        self.assertEqual(ar["totalOpenAR"], 5000)

    def test_case_b_cash_crunch_forecast(self) -> None:
        weeks = _weeks(opening=30000, collections=5000, payroll=25000, vendors=15000, debt=5000)
        fc = cfo.build_13_week_forecast(weeks, scenario="CONSERVATIVE", assumptions="tight collections")
        self.assertTrue(any(a["code"] in {"PROJECTED_NEGATIVE_CASH", "MINIMUM_CASH_THRESHOLD_BREACH", "PAYROLL_COVERAGE_RISK"} for a in fc["alerts"]))

    def test_case_c_ar_problem_90_plus(self) -> None:
        ar = cfo.ar_summary(
            [
                cfo.ArInvoice("BigCust", "INV9", "2025-12-01", "2026-01-01", 80000, 80000),
                cfo.ArInvoice("Other", "INV2", "2026-07-01", "2026-07-20", 5000, 5000),
            ],
            as_of="2026-08-11",
        )
        self.assertGreater(ar["aging"]["90+"], 0)
        self.assertGreater(ar["concentration"]["topCustomerPct"], 50)

    def test_case_d_ap_pressure(self) -> None:
        ap = cfo.ap_summary(
            [cfo.ApBill("VendorA", "B1", "2026-08-15", 90000, critical_vendor=True)],
            cash=20000,
        )
        self.assertTrue(ap["apPressure"])
        self.assertEqual(ap["flag"], "AP_EXCEEDS_NEAR_TERM_CASH")

    def test_case_e_wip_construction(self) -> None:
        wip = cfo.wip_summary(
            [
                cfo.WipProject(
                    project="Job-1",
                    contract_value=500000,
                    billed_to_date=200000,
                    cost_to_date=180000,
                    estimated_cost_to_complete=200000,
                    earned_revenue=250000,
                )
            ],
            applicable=True,
        )
        self.assertEqual(wip["status"], "PRESENT")
        self.assertIsNotNone(wip["projects"][0]["underbilling"])
        na = cfo.wip_summary(None, applicable=False)
        self.assertEqual(na["status"], "NOT_APPLICABLE")

    def test_case_f_source_conflict(self) -> None:
        conflicts = cr.detect_source_conflicts(
            [
                cr.pv("revenue", 2_000_000, source="QuickBooks", kind="FACT"),
                cr.pv("revenue", 1_700_000, source="Accountant FS", kind="FACT"),
            ]
        )
        self.assertTrue(any(c["code"] == "SOURCE_CONFLICT" for c in conflicts))

    def test_case_g_missing_financials_cycle(self) -> None:
        cycle = cfo.start_monthly_cycle(period="2026-07", engagement_id="CFO-G")
        cycle["missingPeriod"] = True
        bad = cfo.transition_monthly_cycle(cycle, "CLIENT_REVIEW_READY", actor="system")
        self.assertTrue(bad["errors"])

    def test_case_h_capital_opportunity_from_cfo(self) -> None:
        rec = cfo.recommend_capital_opportunity_from_cfo(
            engagement_id="CFO-H",
            client="Need Capital Co",
            reason="13-week forecast shows sustained liquidity gap",
            amount=400000,
            advisor="Manny Barela",
        )
        self.assertFalse(rec["approved"])
        self.assertFalse(rec["recommendation"]["canContactLender"])
        approved = cfo.approve_capital_recommendation(rec, advisor="Manny Barela")
        result = cfo.run_cross_sell_to_capital(
            approved,
            {
                "client": "Need Capital Co",
                "businessAgeYears": 5,
                "request": {
                    "amount_requested": 400000,
                    "preferred_capital_type": "Working Capital",
                    "use_of_funds": [{"category": "Working Capital", "amount": 400000}],
                },
                "documentsReceived": {"YTD_PL": "ACCEPTED", "BANK_STMTS": "ACCEPTED"},
                "provenancedValues": [cr.pv("revenue", 3_000_000, source="P&L", source_date="2026-07-01")],
                "debtLines": [],
                "signals": [{"code": "NEGATIVE_CASH_FLOW"}],
            },
        )
        self.assertEqual(result["errors"], [])
        self.assertFalse(result["canContactLender"])
        self.assertEqual(result["engine"], "capital_readiness")

    def test_case_i_legacy_accg_pricing_protected(self) -> None:
        eng = cfo.create_cfo_engagement(
            client="ACCG",
            engagement_id="CFO-ACCG",
            client_classification="HVS_LEGACY_CLIENT",
            contracted_current=pricing_policy.accg_locked_monthly(),
        )
        self.assertTrue(eng["legacyPricingProtected"])
        self.assertEqual(eng["contractedCurrent"], 4539.0)

    def test_case_j_forecast_miss(self) -> None:
        fc = cfo.build_13_week_forecast(_weeks(opening=100000, collections=20000), scenario="BASE")
        fc = cfo.approve_forecast(fc, advisor="Manny")
        cmp_ = cfo.forecast_vs_actual(fc, {"collections": 10000, "payroll": 15000 * 13, "ending_cash": 50000, "revenue": 10000})
        self.assertTrue(any(v["metric"] == "collections" and v["material"] for v in cmp_["variances"]))


class TestCfoEndToEnd(unittest.TestCase):
    def test_e2e_monthly_cfo_cadence_stops_before_client_send(self) -> None:
        eng = cfo.create_cfo_engagement(client="E2E CFO Co", engagement_id="CFO-E2E", assigned_advisor="Manny Barela", wip_applicable=False)
        for _ in range(7):
            eng = cfo.advance_onboarding(eng)
        self.assertEqual(eng["onboardingState"], "MONTHLY_CADENCE_READY")

        sources = cfo.register_financial_sources(
            [
                cfo.FinancialSource("E2E CFO Co", "QuickBooks Online", "FINANCIAL_STATEMENTS", "PENDING_LIVE_SOURCE", adapter_status="PENDING_LIVE_SOURCE", authority_class="SOURCE_ACCOUNTING_DATA"),
                cfo.FinancialSource("E2E CFO Co", "Upload", "AR", "Manual", adapter_status="Manual", authority_class="CLIENT_PROVIDED_DATA", as_of_date="2026-08-01"),
            ]
        )
        self.assertTrue(all(s["connection_status"] != "Connected" or s.get("adapter_status") != "PENDING_LIVE_SOURCE" for s in sources["sources"]))

        cycle = cfo.start_monthly_cycle(period="2026-07", engagement_id="CFO-E2E")
        for st in ["DATA_COLLECTION", "DATA_VALIDATION", "FINANCIAL_REVIEW", "FORECAST_UPDATE", "KPI_REVIEW"]:
            cycle = cfo.transition_monthly_cycle(cycle["cycle"] if "cycle" in cycle else cycle, st, actor="advisor")["cycle"]

        fc = cfo.build_13_week_forecast(_weeks(), scenario="BASE", created_by="Manny")
        # include AI suggested field requiring approval
        fc["weeks"][0]["input_origins"]["other_inflows"] = "AI Suggested Estimate"
        fc["weeks"][0]["aiSuggestedFieldsPendingApproval"] = ["other_inflows"]
        fc["version"]["aiSuggestedRequiresHumanApproval"] = True
        fc = cfo.approve_forecast(fc, advisor="Manny Barela")
        self.assertFalse(fc["version"]["aiSuggestedRequiresHumanApproval"])

        ar = cfo.ar_summary([cfo.ArInvoice("A", "1", "2026-07-01", "2026-07-15", 10000, 2000)], as_of="2026-08-01")
        ap = cfo.ap_summary([cfo.ApBill("V", "B1", "2026-08-10", 3000)], cash=50000)
        wip = cfo.wip_summary(None, applicable=False)
        wc = cfo.working_capital(
            current_assets=cr.pv("current_assets", 200000, source="BS"),
            current_liabilities=cr.pv("current_liabilities", 80000, source="BS"),
            ar=ar["totalOpenAR"],
            ap=ap["totalOpenAP"],
        )
        self.assertEqual(wc["status"], "CALCULATED")
        budget = cfo.budget_vs_actual({"Revenue": 100000, "Payroll": 40000}, {"Revenue": 95000, "Payroll": 42000})
        kpis = cfo.kpi_scorecard(
            {
                "Revenue": {"actual": 95000, "target": 100000, "targetOrigin": "client-approved target", "source": "P&L", "prior": 90000},
                "Cash": {"actual": 120000, "source": "Bank", "kind": "BANK_DATA"},
            }
        )
        issues = [asdict(cfo.FinancialIssue("stale AR", "Medium", "90+ aging", "Advisor", "accelerate collections"))]
        decisions = [asdict(cfo.OwnerDecision("accelerate collection", "2026-08-11", "Owner", "AR aging"))]

        cycle = cfo.advisor_interpret(
            cycle,
            advisor="Manny Barela",
            conclusion="Maintain BASE forecast; focus collections",
            facts=["Cash on bank statement dated 2026-08-01 is present"],
            calculations=[f"Working capital={wc['workingCapital']}"],
            ai_obs=["Collections appear slower than plan"],
        )
        tr = cfo.transition_monthly_cycle(cycle, "ADVISOR_INTERPRETATION", actor="Manny Barela")
        cycle = tr["cycle"]
        tr = cfo.transition_monthly_cycle(cycle, "CLIENT_REVIEW_READY", actor="Manny Barela")
        self.assertEqual(tr["errors"], [])
        cycle = tr["cycle"]
        self.assertFalse(cycle["clientSend"]["allowed"])

        report = cfo.draft_management_report(
            {
                "period": "2026-07",
                "execSummary": "Stable with AR focus",
                "cash": "Bank-derived cash present",
                "forecast": "BASE approved",
                "ar": str(ar["aging"]),
                "ap": str(ap["totalOpenAP"]),
                "wc": str(wc["workingCapital"]),
                "budget": str(budget["rows"]),
                "wip": wip["status"],
                "kpi": str(kpis["scorecard"]),
                "capital": "Monitor Stable",
                "sourceSnapshot": "snap-2026-07",
            }
        )
        report = cfo.approve_management_report(report, advisor="Manny Barela")
        self.assertFalse(report["canAutoSend"])
        self.assertFalse(cfo.attempt_external_cfo_send(channel="client_report")["allowed"])
        self.assertFalse(cfo.attempt_external_cfo_send(channel="bookkeeper")["allowed"])
        self.assertFalse(cfo.attempt_external_cfo_send(channel="cpa")["allowed"])

        monitor = cfo.capital_readiness_monitor(prior_score=70, latest_score=72, material_flags=[])
        self.assertEqual(monitor["status"], "Stable")
        self.assertTrue(monitor["autoRegenerateForbidden"])
        self.assertTrue(cfo.recurring_cfo_tasks("CFO-E2E"))
        self.assertTrue(issues and decisions)


if __name__ == "__main__":
    unittest.main()
