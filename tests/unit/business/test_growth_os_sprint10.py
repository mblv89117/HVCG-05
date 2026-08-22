#!/usr/bin/env python3
"""Sprint 10 Growth OS — fixtures A–J + E2E + routing + SOP + accountability."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import growth_os as g  # noqa: E402
import pricing_policy  # noqa: E402


class TestGrowthFixtures(unittest.TestCase):
    def test_case_a_scaling_business(self) -> None:
        eng = g.create_growth_engagement(
            client="Scale Co",
            engagement_id="GRW-A",
            business_objective="Install operating cadence",
            growth_stage="Scaling",
            assigned_advisor="Manny Barela",
        )
        self.assertEqual(eng["pricingRef"]["offerCode"], "OFF-GROWTH-OS")
        baseline = g.operating_baseline(
            {
                "Strategy": "FUNCTIONAL",
                "Revenue / Sales": "STRONG",
                "Process Documentation": "MATERIAL_GAP",
                "People / Accountability": "NEEDS_IMPROVEMENT",
            }
        )
        self.assertEqual(baseline["errors"], [])
        plan = g.create_90_day_plan(
            client="Scale Co",
            engagement_id="GRW-A",
            period_start="2026-09-01",
            period_end="2026-11-30",
            primary_objective="Operating cadence",
            created_by="Manny",
            priorities=[
                g.Priority("CRM process", "Clean pipeline", "Sales Lead", "Stage hygiene"),
                g.Priority("Weekly cadence", "Accountability", "COO", "Meeting held"),
                g.Priority("Core SOPs", "Documented ops", "Ops Lead", "3 SOPs active"),
            ],
        )
        self.assertFalse(plan["focusWarning"])
        self.assertEqual(plan["status"], "DRAFT")

    def test_case_b_too_many_priorities(self) -> None:
        prios = [g.Priority(f"P{i}", "o", "owner", "m") for i in range(10)]
        plan = g.create_90_day_plan(
            client="Busy Co",
            engagement_id="GRW-B",
            period_start="2026-09-01",
            period_end="2026-11-30",
            primary_objective="Everything",
            created_by="AI",
            priorities=prios,
        )
        self.assertTrue(plan["focusWarning"])
        self.assertIn("3–5", plan["focusWarningMessage"])

    def test_case_c_kpi_without_source(self) -> None:
        sc = g.kpi_scorecard(
            [
                {
                    "name": "Mystery KPI",
                    "domain": "Financial",
                    "definition": "",
                    "formula": None,
                    "owner": "CFO",
                    "source": "Unknown",
                    "source_system": "CFO",
                    "frequency": "Weekly",
                    "available": False,
                    "source_missing": True,
                    "actual": None,
                }
            ]
        )
        self.assertEqual(sc["scorecard"][0]["health"], "NO_DATA")
        self.assertIn("validationError", sc["scorecard"][0])

    def test_case_d_missed_commitments(self) -> None:
        reg = g.commitment_register(
            [
                {"commitment": "Fix CRM", "owner": "Sam", "due_date": "2026-08-01", "carryover_count": 3, "status": "Overdue"},
                {"commitment": "Write SOP", "owner": "Alex", "due_date": "2026-08-10", "carryover_count": 2, "overdue": True, "status": "Open"},
            ]
        )
        self.assertTrue(reg["accountabilityFlags"])
        self.assertTrue(reg["punitiveHrJudgmentForbidden"])
        self.assertTrue(reg["autonomousEmployeeDisciplineForbidden"])

    def test_case_e_cash_routes_cfo(self) -> None:
        r = g.create_issue(title="Cash crunch", domain_hint="cash forecast", impact="High", owner="Advisor")
        self.assertEqual(r["routedTo"], "CFO")

    def test_case_f_capital_routes(self) -> None:
        r = g.create_issue(title="Need funding", domain_hint="capital raise", impact="High", owner="Advisor")
        self.assertEqual(r["routedTo"], "Capital")

    def test_case_g_risk_routes(self) -> None:
        r = g.create_issue(title="Insurance expired", domain_hint="insurance gap", impact="High", owner="Advisor")
        self.assertEqual(r["routedTo"], "Risk")

    def test_case_h_procurement_routes(self) -> None:
        r = g.create_issue(title="Gov contract RFP", domain_hint="contract opportunity", impact="Med", owner="Advisor")
        self.assertEqual(r["routedTo"], "Procurement")

    def test_case_i_undocumented_process(self) -> None:
        cov = g.process_documentation_coverage(critical=10, documented=2, approved=1, current=1, owner_assigned=3)
        self.assertLess(cov["coveragePct"], 50)
        sop = g.draft_sop(title="Onboarding", process="Client onboarding", owner="Ops", steps=["A", "B"], created_by="AI")
        self.assertEqual(sop["status"], "DRAFT")
        self.assertFalse(sop["canAutoActivate"])

    def test_case_j_automation_candidate(self) -> None:
        opp = g.automation_opportunity(
            {
                "process": "Invoice follow-up",
                "classification": "AUTOMATION_CANDIDATE",
                "agent_candidate": "AGT-INVOICE",
                "benefit": "Hours saved",
            }
        )
        self.assertTrue(opp["autoDeployForbidden"])
        self.assertTrue(opp["feedsLaterAgentOrchestration"])


class TestGrowthE2E(unittest.TestCase):
    def test_e2e_growth_os_stops_before_send(self) -> None:
        eng = g.create_growth_engagement(
            client="E2E Growth Co",
            engagement_id="GRW-E2E",
            assigned_advisor="Manny Barela",
            revenue_lineage={"leadId": "L1", "fitId": "F1", "offerCode": "OFF-GROWTH-OS"},
            contracted_current=pricing_policy.accg_locked_monthly() if False else None,
        )
        self.assertEqual(eng["revenue_lineage"]["offerCode"], "OFF-GROWTH-OS")
        g.operating_baseline({"Strategy": "NEEDS_IMPROVEMENT", "Operations": "MATERIAL_GAP", "AI Readiness": "UNKNOWN"})
        plan = g.create_90_day_plan(
            client="E2E Growth Co",
            engagement_id="GRW-E2E",
            period_start="2026-09-01",
            period_end="2026-11-30",
            primary_objective="Install OS",
            created_by="Manny",
            priorities=[
                g.Priority("Cadence", "Weekly reviews", "Manny", "Reviews held", related_kpi="Commitments On-Time"),
                g.Priority("SOPs", "Document core", "Ops", "2 SOPs active"),
                g.Priority("Pipeline hygiene", "Revenue process", "Sales", "Stage accuracy"),
            ],
        )
        plan = g.approve_90_day_plan(plan, advisor="Manny Barela")
        self.assertEqual(plan["status"], "ACTIVE")

        sc = g.kpi_scorecard(
            [
                {
                    "name": "Cash",
                    "domain": "Financial",
                    "definition": "Ending cash",
                    "formula": "Bank balance",
                    "owner": "CFO",
                    "source": "Approved CFO output",
                    "source_system": "CFO",
                    "frequency": "Weekly",
                    "target": 100000,
                    "target_origin": "CLIENT_APPROVED",
                    "actual": 95000,
                },
                {
                    "name": "Pipeline",
                    "domain": "Sales",
                    "definition": "Qualified pipeline $",
                    "formula": "Sum open qualified",
                    "owner": "Sales",
                    "source": "Revenue OS",
                    "source_system": "Revenue",
                    "frequency": "Weekly",
                    "target": 500000,
                    "target_origin": "HVCG_RECOMMENDED",
                    "actual": 480000,
                },
            ]
        )
        self.assertEqual(sc["scorecard"][0]["sourceOfRecord"], "CFO")
        self.assertIn(sc["scorecard"][0]["health"], {"ON_TRACK", "WATCH", "OFF_TRACK"})

        g.create_initiative(objective="Stand up weekly review", owner="Manny", related_priority="Cadence")
        meeting = g.weekly_operating_review(client="E2E Growth Co", date="2026-09-08", kpi_snapshot=sc)
        self.assertEqual(len(meeting["agenda"]), 12)
        g.record_meeting({"client": "E2E Growth Co", "ai_draft": "Draft notes", "human_summary": None})

        commits = g.commitment_register(
            [g.Commitment("Publish agenda template", "Ops", "2026-09-15", related_priority="Cadence")]
        )
        self.assertTrue(commits["punitiveHrJudgmentForbidden"])

        issues = g.route_cross_domain_issues(
            [
                {"title": "Cash tight", "domain_hint": "cash", "impact": "High", "owner": "CFO lead"},
                {"title": "Need loan", "domain_hint": "capital", "impact": "High", "owner": "Advisor"},
                {"title": "Expired COI", "domain_hint": "insurance", "impact": "Med", "owner": "Risk"},
                {"title": "City RFP", "domain_hint": "contract", "impact": "Med", "owner": "Proc"},
            ]
        )
        self.assertEqual(issues["byDomain"]["CFO"], ["Cash tight"])
        self.assertEqual(issues["byDomain"]["Capital"], ["Need loan"])
        self.assertEqual(issues["byDomain"]["Risk"], ["Expired COI"])
        self.assertEqual(issues["byDomain"]["Procurement"], ["City RFP"])

        g.decision_register([{"decision": "Adopt weekly cadence", "decision_maker": "Owner", "date": "2026-09-08"}])
        sop = g.draft_sop(title="Weekly Review", process="WOR", owner="Manny", steps=["Prep", "Meet", "Commit"], created_by="AGT-SUCCESS")
        approved = g.advance_sop({**sop, "status": "APPROVED", "aiGenerated": True}, "ACTIVE", actor="Manny")
        # need APPROVED first properly
        sop2 = g.draft_sop(title="Weekly Review", process="WOR", owner="Manny", steps=["Prep"], created_by="Manny")
        r1 = g.advance_sop(sop2, "IN_REVIEW", actor="Manny")
        r2 = g.advance_sop(r1["sop"], "APPROVED", actor="Manny")
        r3 = g.advance_sop(r2["sop"], "ACTIVE", actor="Manny")
        self.assertEqual(r3["errors"], [])
        self.assertEqual(r3["sop"]["status"], "ACTIVE")

        blocked_active = g.advance_sop(sop, "ACTIVE", actor="system")
        self.assertTrue(blocked_active["errors"])

        g.automation_opportunity({"process": "Follow-ups", "classification": "AUTOMATION_CANDIDATE"})
        status = g.client_status_draft({"wins": "Cadence live", "recommendations": "Keep focus"})
        self.assertFalse(status["canAutoSend"])
        success = g.run_client_success_agent({"status_draft": status["body"], "missed": []})
        self.assertFalse(success["canAutoSend"])
        self.assertFalse(g.attempt_external_growth_action(action="send_client_report")["allowed"])
        crm = g.run_crm_update_agent({"activity": "Weekly review logged", "next_actions": ["SOP"]})
        self.assertFalse(crm["canOverwriteFinancialTruth"])
        self.assertTrue(g.run_crm_update_agent({"alterContractedEconomics": True})["blocked"])

        recs = g.growth_recommendations(["cfo_gap", "capital_need", "risk_exposure"])
        self.assertTrue(recs["humanReviewRequired"])
        ecc = g.ecc_growth_summary({"priority_health": "ON_TRACK", "kpi_health": "WATCH", "overdue": 0})
        self.assertTrue(ecc["duplicateSourceCalculationsForbidden"])

    def test_cross_domain_routing(self) -> None:
        routed = g.route_cross_domain_issues(
            [
                {"title": "Cash problem", "domain_hint": "cash problem", "impact": "H", "owner": "A"},
                {"title": "Financing need", "domain_hint": "capital need", "impact": "H", "owner": "A"},
                {"title": "Insurance issue", "domain_hint": "insurance issue", "impact": "M", "owner": "A"},
                {"title": "Contract opportunity", "domain_hint": "contract opportunity", "impact": "M", "owner": "A"},
            ]
        )
        self.assertEqual(set(routed["byDomain"].keys()), {"CFO", "Capital", "Risk", "Procurement"})

    def test_sop_lifecycle(self) -> None:
        sop = g.draft_sop(title="Billing", process="AR", owner="Ops", steps=["Invoice"], created_by="AI")
        self.assertTrue(sop["aiGenerated"])
        bad = g.advance_sop(sop, "ACTIVE", actor="system")
        self.assertTrue(bad["errors"])
        s = g.advance_sop(sop, "IN_REVIEW", actor="human")["sop"]
        s = g.advance_sop(s, "APPROVED", actor="human")["sop"]
        s = g.advance_sop(s, "ACTIVE", actor="human")["sop"]
        self.assertEqual(s["status"], "ACTIVE")
        old = g.advance_sop(s, "SUPERSEDED", actor="human")["sop"]
        self.assertEqual(old["status"], "SUPERSEDED")
        self.assertIn("supersededAt", old)

    def test_accountability_no_hr_judgment(self) -> None:
        reg = g.commitment_register(
            [
                {"commitment": "A", "owner": "Pat", "due_date": "2026-07-01", "carryover_count": 4, "status": "Overdue"},
                {"commitment": "B", "owner": "Pat", "due_date": "2026-07-08", "carryover_count": 2, "overdue": True},
            ]
        )
        self.assertEqual(len(reg["repeatedCarryovers"]), 2)
        self.assertTrue(reg["punitiveHrJudgmentForbidden"])
        issue = g.create_issue(title="Repeated miss on commitments", domain_hint="process accountability", impact="Med", owner="Advisor")
        self.assertEqual(issue["routedTo"], "Ops")

    def test_legacy_pricing_protected(self) -> None:
        eng = g.create_growth_engagement(
            client="ACCG",
            engagement_id="GRW-ACCG",
            client_classification="HVS_LEGACY_CLIENT",
            contracted_current=pricing_policy.accg_locked_monthly(),
        )
        self.assertTrue(eng["legacyPricingProtected"])
        self.assertEqual(eng["contractedCurrent"], 4539.0)


if __name__ == "__main__":
    unittest.main()
