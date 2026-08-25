#!/usr/bin/env python3
"""Sprint 8 Contract Procurement — fixtures A–J + E2E + Capital/CFO handoffs."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import contract_procurement as proc  # noqa: E402
import capital_readiness as cr  # noqa: E402
import pricing_policy  # noqa: E402


class TestProcurementFixtures(unittest.TestCase):
    def test_case_a_government_ready(self) -> None:
        readiness = proc.assess_procurement_readiness(
            engagement_id="PROC-A",
            public_private="Government",
            evidences=[
                proc.ReadinessEvidence("Entity", "READY", evidence="SOS filing", source="Client", dimension="Entity Readiness"),
                proc.ReadinessEvidence("SAM", "READY", evidence="Active UEI", source="SAM print", dimension="Registration Readiness"),
                proc.ReadinessEvidence("Capability", "READY", evidence="v3 approved", source="Vault", dimension="Capability Statement"),
                proc.ReadinessEvidence("Insurance", "READY", evidence="COI", source="Broker", dimension="Licensing / Insurance"),
                proc.ReadinessEvidence("Past Perf", "READY", evidence="2 verified jobs", source="Registry", dimension="Past Performance"),
            ],
        )
        self.assertEqual(readiness["overallStatus"], "READY")

    def test_case_b_new_government_contractor(self) -> None:
        checklist = proc.government_setup_checklist(
            entity_complete=False, ownership_complete=False, banking_noted=False, naics=[]
        )
        self.assertEqual(checklist["path"], "Government Contractor Setup")
        self.assertEqual(checklist["offerCode"], "OFF-GOV-SETUP")
        self.assertGreater(checklist["missingCount"], 0)

    def test_case_c_missing_insurance(self) -> None:
        ins = proc.assess_insurance(
            [proc.InsuranceEvidence("GL", carrier="X", limit=500000)],
            required_limit=2_000_000,
        )
        self.assertTrue(ins["gaps"])
        self.assertEqual(ins["gaps"][0]["flag"], "LIMIT_BELOW_REQUIREMENT")

    def test_case_d_expired_registration(self) -> None:
        reg = proc.create_registration(
            proc.GovernmentRegistration("SAM.gov", "SAM.gov", identifier="UEI123", status="EXPIRED", expiration_date="2025-01-01")
        )
        mon = proc.expiration_monitor([reg])
        self.assertTrue(mon["tasks"])
        self.assertTrue(mon["externalRenewalSubmissionGated"])

    def test_case_e_missing_past_performance(self) -> None:
        readiness = proc.assess_procurement_readiness(
            engagement_id="PROC-E",
            evidences=[
                proc.ReadinessEvidence("Past Performance", "MISSING", missing_item="No verified past performance", dimension="Past Performance"),
            ],
        )
        self.assertIn(readiness["overallStatus"], {"READY_WITH_GAPS", "NOT_READY", "REMEDIATION_REQUIRED"})
        pp = proc.register_past_performance([])
        self.assertTrue(pp["fabricateForbidden"])

    def test_case_f_private_sector_pursuit(self) -> None:
        eng = proc.create_procurement_engagement(
            client="Private Co", engagement_id="PROC-F", offer_code="OFF-PROC-READY", public_private="Private"
        )
        checklist = proc.build_procurement_document_checklist(public_private="Private")
        self.assertFalse(any("SAM.gov" in i["item"] for i in checklist["items"]))
        self.assertEqual(eng["pricingRef"]["offerCode"], "OFF-PROC-READY")

    def test_case_g_capital_constraint(self) -> None:
        rec = proc.recommend_capital_from_procurement(
            opportunity_id="OPP-G",
            client="Cash Tight Co",
            reason="Mobilization liquidity insufficient",
            amount=350000,
            advisor="Manny Barela",
        )
        self.assertEqual(rec["flag"], "CAPITAL_SUPPORT_RECOMMENDED")
        self.assertFalse(rec["canContactLender"])

    def test_case_h_bid_pricing_needs_human(self) -> None:
        prop = proc.draft_procurement_proposal(
            opportunity_id="OPP-H",
            sections={"exec": "Draft", "pricing_narrative": "AI draft narrative"},
            pricing_draft={"bid": 1000000, "margin": "AI suggested"},
        )
        self.assertFalse(prop["pricingApproved"])
        self.assertFalse(prop["canCommitBidPricing"])
        approved = proc.approve_proposal_pricing(prop, advisor="Manny Barela")
        self.assertTrue(approved["pricingApproved"])
        self.assertFalse(approved["canSubmitBid"])

    def test_case_i_submission_blocked(self) -> None:
        for action in ["sam_submit", "proposal_submit", "contracting_officer_email", "portal_upload"]:
            r = proc.attempt_external_procurement_action(action=action)
            self.assertFalse(r["allowed"])
            self.assertTrue(r["blC1Active"])

    def test_case_j_accg_pricing_protected(self) -> None:
        eng = proc.create_procurement_engagement(
            client="ACCG",
            engagement_id="PROC-ACCG",
            client_classification="HVS_LEGACY_CLIENT",
            contracted_current=pricing_policy.accg_locked_monthly(),
        )
        self.assertTrue(eng["legacyPricingProtected"])
        self.assertEqual(eng["contractedCurrent"], 4539.0)


class TestProcurementE2E(unittest.TestCase):
    def test_e2e_procurement_stops_before_submit(self) -> None:
        eng = proc.create_procurement_engagement(
            client="E2E Proc Co",
            engagement_id="PROC-E2E",
            offer_code="OFF-PROC-READY",
            public_private="Government",
            assigned_advisor="Manny Barela",
            revenue_lineage={"leadId": "L-1", "fitId": "FIT-1", "offerCode": "OFF-PROC-READY"},
        )
        self.assertEqual(eng["revenue_lineage"]["offerCode"], "OFF-PROC-READY")

        readiness = proc.assess_procurement_readiness(
            engagement_id="PROC-E2E",
            public_private="Government",
            evidences=[
                proc.ReadinessEvidence("Entity", "READY", evidence="Articles", source="Vault", dimension="Entity Readiness"),
                proc.ReadinessEvidence("SAM", "READY_WITH_GAPS", evidence="Draft only", source="Internal", dimension="Registration Readiness", missing_item="Human submit"),
                proc.ReadinessEvidence("Capability", "READY", evidence="v1", source="Vault", dimension="Capability Statement"),
            ],
        )
        self.assertIn(readiness["overallStatus"], {"READY_WITH_GAPS", "READY", "REMEDIATION_REQUIRED", "NOT_READY"})

        reg_agent = proc.run_government_registration_agent(
            {"entityComplete": True, "ownershipComplete": True, "bankingNoted": True, "naics": ["236220"], "registrationType": "SAM.gov"}
        )
        self.assertFalse(reg_agent["canAutoSubmit"])
        reg = proc.create_registration(proc.GovernmentRegistration("SAM.gov", "SAM.gov", status="READY_FOR_REVIEW"))
        gated = proc.advance_registration(reg, "APPROVED_TO_SUBMIT", actor="Manny Barela")
        self.assertEqual(gated["registration"]["status"], "APPROVED_TO_SUBMIT")
        self.assertTrue(gated["registration"]["autoSubmitBlocked"])
        blocked_submit = proc.advance_registration(gated["registration"], "SUBMITTED_EXTERNALLY", actor="system")
        self.assertTrue(blocked_submit.get("autoSubmitBlocked") or blocked_submit["errors"])

        stmt = proc.build_capability_statement(
            company_name="E2E Proc Co",
            created_by="AGT-PROCURE",
            claims=[
                proc.CapabilityClaim("years_in_business", 12, source="SOS filing", verified=True),
                proc.CapabilityClaim("employees", 50, source="AI", verified=False),
            ],
        )
        self.assertIn("employees", stmt["blockedInventedClaims"])
        stmt2 = proc.build_capability_statement(
            company_name="E2E Proc Co",
            created_by="advisor",
            claims=[proc.CapabilityClaim("years_in_business", 12, source="SOS filing", verified=True)],
        )
        stmt2 = proc.approve_capability_statement(stmt2, advisor="Manny Barela")
        self.assertTrue(stmt2["approved"])

        pp = proc.register_past_performance(
            [proc.PastPerformance("Agency X", "Job 1", source_evidence="PO-9", permission_to_use=True, verification_status="Verified")]
        )
        self.assertEqual(len(pp["records"]), 1)

        opp = proc.register_opportunity(
            proc.ProcurementOpportunity(
                name="Facility Maint",
                buyer_agency="City",
                solicitation_number="RFQ-1",
                public_private="Government",
                estimated_value=500000,
                source="Manual",
                owner="Manny Barela",
            )
        )
        self.assertEqual(opp["valueKind"], "Estimated Opportunity Value")
        self.assertFalse(opp["liveExternalFeedActive"])

        decision = proc.bid_no_bid(
            opportunity_id="RFQ-1",
            factors={"fit": "High", "capacity": "Medium", "margin": "Acceptable"},
            ai_recommendation="PURSUE_WITH_CONDITIONS",
            advisor_conclusion="Pursue after insurance uplift",
            decision_maker="Manny Barela",
            result="PURSUE_WITH_CONDITIONS",
        )
        decision = proc.approve_bid_no_bid(decision, advisor="Manny Barela")
        self.assertTrue(decision["approved"])

        reqs = proc.requirements_matrix(
            [
                {"requirement": "COI $2M", "category": "insurance", "mandatory": True, "kind": "SOURCE_REQUIREMENT"},
                {"requirement": "Suggest bonding", "category": "financial", "kind": "HVCG_INTERPRETATION"},
            ]
        )
        self.assertTrue(reqs["inventedSourceRequirementsForbidden"])
        comp = proc.compliance_matrix(["Provide COI"], ["Client should request broker update"], ["Broker engaged"])
        self.assertEqual(comp["sourceRequirements"][0]["kind"], "SOURCE_REQUIREMENT")

        prop = proc.draft_procurement_proposal(
            opportunity_id="RFQ-1",
            sections={"exec": "Ready", "technical": "Approach"},
            pricing_draft={"bid": 480000},
        )
        prop = proc.approve_proposal_pricing(prop, advisor="Manny Barela")
        self.assertTrue(prop["pricingApproved"])
        self.assertFalse(prop["canSubmitBid"])
        self.assertFalse(proc.attempt_external_procurement_action(action="proposal_submit")["allowed"])

        agent = proc.run_contract_procurement_agent(
            {"client": "E2E Proc Co", "engagementId": "PROC-E2E", "publicPrivate": "Government", "evidences": []}
        )
        self.assertEqual(agent["agent"], "AGT-PROCURE")
        self.assertFalse(agent["canSubmitBid"])

        report = proc.draft_readiness_report({"execSummary": "Near ready", "gaps": "Insurance"})
        self.assertFalse(report["canAutoSend"])
        self.assertIn("does not guarantee", report["disclaimer"].lower())

    def test_government_setup_stops_before_submit(self) -> None:
        agent = proc.run_government_registration_agent(
            {"entityComplete": True, "ownershipComplete": True, "bankingNoted": True, "naics": ["541611"]}
        )
        reg = proc.create_registration(agent["draftRegistration"])
        out = proc.advance_registration({**reg, "external_submission_approval": False}, "APPROVED_TO_SUBMIT", actor="Manny")
        self.assertEqual(out["registration"]["status"], "APPROVED_TO_SUBMIT")
        self.assertFalse(proc.attempt_external_procurement_action(action="sam_submit")["allowed"])

    def test_procurement_to_capital(self) -> None:
        rec = proc.recommend_capital_from_procurement(
            opportunity_id="RFQ-CAP", client="Mob Co", reason="Mobilization", amount=250000, advisor="Manny"
        )
        rec["approved"] = True
        result = proc.approve_and_run_capital(
            rec,
            {
                "client": "Mob Co",
                "businessAgeYears": 4,
                "request": {
                    "amount_requested": 250000,
                    "preferred_capital_type": "Working Capital",
                    "use_of_funds": [{"category": "Working Capital", "amount": 250000}],
                },
                "documentsReceived": {"YTD_PL": "ACCEPTED"},
                "provenancedValues": [cr.pv("revenue", 2_000_000, source="P&L", source_date="2026-07-01")],
                "debtLines": [],
                "signals": [{"code": "MOBILIZATION_CASH"}],
            },
            advisor="Manny Barela",
        )
        self.assertEqual(result["errors"], [])
        self.assertEqual(result["engine"], "capital_readiness")
        self.assertFalse(result["canContactLender"])
        self.assertEqual(result["lineage"]["procurementOpportunityId"], "RFQ-CAP")

    def test_procurement_to_cfo(self) -> None:
        flag = proc.recommend_cfo_from_procurement(
            opportunity_id="RFQ-CFO", client="Margin Co", reason="Cash/margin/WIP planning for pursuit"
        )
        self.assertEqual(flag["flag"], "CFO_REVIEW_RECOMMENDED")
        handoff = proc.handoff_to_cfo(opportunity_id="RFQ-CFO", client="Margin Co", cash_need="mobilization + payroll")
        self.assertEqual(handoff["errors"], [])
        self.assertEqual(handoff["engine"], "fractional_cfo")
        self.assertEqual(handoff["context"]["procurementOpportunityId"], "RFQ-CFO")


if __name__ == "__main__":
    unittest.main()
