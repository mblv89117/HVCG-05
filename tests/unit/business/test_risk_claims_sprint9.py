#!/usr/bin/env python3
"""Sprint 9 Risk/Claims — fixtures A–N + E2E tax/claims + cross-system + legacy."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import risk_claims as risk  # noqa: E402
import capital_readiness as cr  # noqa: E402
import pricing_policy  # noqa: E402


class TestRiskFixtures(unittest.TestCase):
    def test_case_a_agency_notice(self) -> None:
        m = risk.start_tax_matter(
            {
                "matter_id": "TAX-A",
                "client": "Agency Co",
                "agency": "State DOR",
                "notice_type": "Assessment",
                "claimed_amount": 80000,
                "response_deadline": "2026-09-01",
                "appeal_rights": "30 days",
                "appeal_rights_source": "Notice page 2",
            }
        )
        self.assertEqual(m["errors"], [])
        self.assertEqual(m["matter"]["status"], "NOTICE_RECEIVED")
        dl = risk.track_deadlines([risk.Deadline("Response due", "2026-09-01", "Notice", verified_by_human=True)])
        self.assertTrue(dl["deadlines"][0]["verified_by_human"])
        tl = risk.build_timeline([risk.TimelineEvent("2026-08-01", "Notice received", "Notice", source_evidence="EV-1")])
        self.assertTrue(tl["humanReviewRequired"])

    def test_case_b_missing_records(self) -> None:
        agent = risk.run_tax_appeal_agent({"missing": ["bank statements", "payroll"], "notice": {}})
        self.assertIn("bank statements", agent["missingRecords"])
        self.assertFalse(agent["canSubmitAppeal"])

    def test_case_c_professional_review_required(self) -> None:
        m = risk.start_tax_matter({"matter_id": "TAX-C", "client": "X", "agency": "DOR", "claimed_amount": 10})["matter"]
        m["status"] = "RESPONSE_DRAFT"
        blocked = risk.transition_tax_workflow(m, "APPROVED_TO_SEND", actor="system", professional_cleared=False)
        self.assertTrue(blocked.get("blocked"))
        self.assertEqual(blocked["matter"]["status"], "PROFESSIONAL_REVIEW_REQUIRED")

    def test_case_d_ai_tax_opinion_blocked(self) -> None:
        r = risk.run_tax_appeal_agent({"requestTaxOpinion": True})
        self.assertTrue(r["blocked"])
        self.assertFalse(risk.attempt_external_risk_action(action="provide_tax_opinion")["allowed"])

    def test_case_e_complete_separation_file(self) -> None:
        m = risk.create_unemployment_matter(
            {
                "matter_id": "UE-E",
                "client": "Employer Co",
                "separation_date": "2026-07-01",
                "separation_type": "Involuntary",
                "response_deadline": "2026-08-20",
            }
        )
        self.assertEqual(m["errors"], [])
        agent = risk.run_ue_claim_agent({"chronology": "ok", "evidence_index": ["policy", "payroll"], "gaps": []})
        self.assertFalse(agent["canSubmit"])
        self.assertIn("INTERNAL DRAFT", agent["appealSupportMemoDraft"])

    def test_case_f_sensitive_employment_issue(self) -> None:
        m = risk.create_unemployment_matter({"matter_id": "UE-F", "client": "Y", "sensitive_employment_issue": True})["matter"]
        self.assertEqual(m["professionalReviewStatus"], "REQUIRED_BEFORE_EXTERNAL_ACTION")
        self.assertEqual(m["ueData"]["employmentCounselReview"], "REQUIRED")
        self.assertFalse(risk.hr_boundary_check("terminate_employee")["allowed"])

    def test_case_g_submit_appeal_blocked(self) -> None:
        self.assertTrue(risk.run_ue_claim_agent({"submitAppeal": True})["blocked"])
        self.assertFalse(risk.attempt_external_risk_action(action="file_appeal")["allowed"])

    def test_case_h_policy_review(self) -> None:
        policies = [risk.InsurancePolicy("Acme", "GL", limits=1_000_000, expiration="2026-12-01")]
        reg = risk.register_policies(policies)
        rev = risk.insurance_review(reg["policies"], required_limit=2_000_000)
        self.assertTrue(rev["questions"])
        self.assertTrue(rev["bindingCoverageOpinionForbidden"])

    def test_case_i_coverage_conclusion_blocked(self) -> None:
        r = risk.run_insurance_review_agent({"stateCovered": True})
        self.assertTrue(r["blocked"])
        self.assertFalse(risk.attempt_external_risk_action(action="state_coverage_conclusion")["allowed"])

    def test_case_j_expired_policy_signal(self) -> None:
        sig = risk.signal_to_procurement(matter_id="INS-J", insurance_expired=True)
        self.assertIn("EXPIRED_INSURANCE", sig["signals"])
        self.assertTrue(sig["autoDisqualifyForbidden"])

    def test_case_k_theft_loss_package(self) -> None:
        m = risk.create_incident_matter(
            {"matter_id": "CLM-K", "client": "Loss Co", "incident_date": "2026-06-01", "incident_type": "Theft", "estimated_loss": 50000}
        )
        self.assertEqual(m["errors"], [])
        loss = risk.loss_schedule([{"category": "Cash", "amount": 50000, "source": "Police report", "verified": False}])
        self.assertEqual(loss["items"][0]["kind"], "ESTIMATED_LOSS")
        pkg = risk.draft_claim_package({"summary": "Theft", "loss": str(loss)})
        self.assertTrue(pkg["humanReviewMandatory"])
        self.assertFalse(pkg["canAutoSend"])

    def test_case_l_incomplete_loss_evidence(self) -> None:
        loss = risk.loss_schedule(
            [
                {"category": "Inventory", "amount": 10000, "verified": False},
                {"category": "Equipment", "amount": 8000, "source": "Invoice", "verified": True},
            ]
        )
        kinds = {i["kind"] for i in loss["items"]}
        self.assertIn("ESTIMATED_LOSS", kinds)
        self.assertIn("VERIFIED_DOCUMENTED_LOSS", kinds)

    def test_case_m_attorney_communication_blocked(self) -> None:
        self.assertTrue(risk.run_claims_agent({"action": "contact_attorney"})["blocked"])
        self.assertFalse(risk.attempt_external_risk_action(action="contact_attorney")["allowed"])

    def test_case_n_recovery_payment_distinctions(self) -> None:
        out = risk.recovery_outcome(claimed=100000, offered=70000, approved=60000, paid=60000, collected=None)
        self.assertFalse(out["complete"])
        out2 = risk.recovery_outcome(claimed=100000, collected=60000)
        self.assertTrue(out2["complete"])


class TestLegacyAndE2E(unittest.TestCase):
    def test_legacy_client_pricing_protected(self) -> None:
        m = risk.create_risk_matter(
            matter_id="RISK-LEGACY",
            client="Prodigy Games",
            matter_type="CLAIMS_RECOVERY",
            subtype="Recovery matter",
            offer_code="OFF-CLAIMS",
            client_classification="HVS_LEGACY_CLIENT",
            contracted_current=7500.0,
        )
        self.assertTrue(m["matter"]["legacyPricingProtected"])
        self.assertEqual(m["matter"]["contractedCurrent"], 7500.0)
        accg = risk.create_risk_matter(
            matter_id="RISK-ACCG",
            client="ACCG",
            matter_type="TAX_REGULATORY",
            subtype="Other agency notice",
            offer_code="OFF-TAX-UE",
            contracted_current=pricing_policy.accg_locked_monthly(),
        )
        self.assertTrue(accg["matter"]["legacyPricingProtected"])
        self.assertEqual(accg["matter"]["contractedCurrent"], 4539.0)

    def test_e2e_tax_agency_stops_before_send(self) -> None:
        m = risk.start_tax_matter(
            {
                "matter_id": "TAX-E2E",
                "client": "E2E Tax Co",
                "agency": "State",
                "claimed_amount": 45000,
                "response_deadline": "2026-09-15",
                "appeal_rights": "Per notice",
                "appeal_rights_source": "Notice",
                "revenue_lineage": {"leadId": "L1", "fitId": "F1", "offerCode": "OFF-TAX-UE"},
                "advisor": "Manny Barela",
            }
        )["matter"]
        self.assertEqual(m["revenue_lineage"]["offerCode"], "OFF-TAX-UE")
        self.assertEqual(m["pricingRef"]["offerCode"], "OFF-TAX-UE")

        ev = risk.register_evidence(
            [risk.EvidenceItem("EV1", "TAX-E2E", "Notice", "Agency notice", "Upload", truth_class="AGENCY_STATEMENT")]
        )
        self.assertTrue(ev["preserveOriginal"])
        risk.track_deadlines([risk.Deadline("Response due", "2026-09-15", "Notice", verified_by_human=True)])
        risk.build_timeline([risk.TimelineEvent("2026-08-01", "Notice", "Notice", "EV1")], human_reviewed=True)

        for st in ["INTAKE", "DOCUMENT_COLLECTION", "TIMELINE_REVIEW", "FACT_RECONCILIATION", "RESPONSE_DRAFT"]:
            m = risk.transition_tax_workflow(m, st, actor="advisor")["matter"]

        agent = risk.run_tax_appeal_agent({"notice": {"amount": 45000}, "response_draft": "Draft letter"})
        self.assertFalse(agent["canSubmitAppeal"])

        m["taxData"]["professionalReview"] = "CLEARED"
        cleared = risk.transition_tax_workflow(m, "APPROVED_TO_SEND", actor="Manny Barela", professional_cleared=True)
        self.assertEqual(cleared["errors"], [])
        self.assertTrue(cleared["matter"]["autoSendBlocked"])
        self.assertFalse(risk.attempt_external_risk_action(action="contact_agency")["allowed"])
        self.assertFalse(risk.attempt_external_risk_action(action="file_appeal")["allowed"])
        log = risk.communication_log_entry({"party": "Agency", "summary": "Draft response", "matter_id": "TAX-E2E"})
        self.assertEqual(log["status"], "DRAFT")

    def test_e2e_claims_stops_before_send(self) -> None:
        m = risk.create_incident_matter(
            {
                "matter_id": "CLM-E2E",
                "client": "E2E Claims Co",
                "incident_date": "2026-05-01",
                "incident_type": "Theft",
                "estimated_loss": 120000,
                "revenue_lineage": {"offerCode": "OFF-CLAIMS"},
            }
        )["matter"]
        loss = risk.loss_schedule(
            [
                {"category": "Cash", "amount": 40000, "source": "Bank", "verified": True},
                {"category": "Inventory", "amount": 80000, "verified": False},
            ]
        )
        pkg = risk.draft_claim_package({"summary": "Theft", "loss": str(loss)})
        agent = risk.run_claims_agent({"timeline": "…", "loss": loss, "package": {"summary": "Theft"}})
        self.assertFalse(agent["canSend"])
        self.assertFalse(pkg["canContactInsurer"])
        self.assertFalse(risk.attempt_external_risk_action(action="contact_insurer")["allowed"])
        self.assertFalse(risk.attempt_external_risk_action(action="settle_matter")["allowed"])
        fee = risk.success_fee_controls(
            agreement_ref=None, fee_pct=0.2, fee_base="recovered", trigger="collected", verified_outcome=None, claimed_amount=120000
        )
        self.assertTrue(fee["errors"])

    def test_cross_system_risk_signals(self) -> None:
        cfo_sig = risk.signal_to_cfo(matter_id="X1", client="X Co", exposure=200000, note="Open agency assessment")
        self.assertTrue(cfo_sig["createAccountingEntriesForbidden"])
        self.assertEqual(cfo_sig["engine"], "fractional_cfo")

        flag = risk.signal_to_capital(matter_id="X1", client="X Co", reason="Unresolved liability", amount=200000, advisor="Manny")
        result = risk.approve_capital_risk_flag(
            flag,
            {
                "client": "X Co",
                "businessAgeYears": 6,
                "request": {
                    "amount_requested": 200000,
                    "preferred_capital_type": "Working Capital",
                    "use_of_funds": [{"category": "Working Capital", "amount": 200000}],
                },
                "documentsReceived": {"YTD_PL": "ACCEPTED"},
                "provenancedValues": [cr.pv("revenue", 1_500_000, source="P&L", source_date="2026-07-01")],
                "debtLines": [],
                "signals": [{"code": "OPEN_LIABILITY"}],
            },
            advisor="Manny Barela",
        )
        self.assertEqual(result["errors"], [])
        self.assertEqual(result["engine"], "capital_readiness")
        self.assertFalse(result["canContactLender"])

        proc_sig = risk.signal_to_procurement(matter_id="X1", insurance_expired=True, missing_limits=True)
        self.assertTrue(proc_sig["reuseProcurementEngine"])
        self.assertTrue(proc_sig["autoDisqualifyForbidden"])

    def test_undefined_matter_type_blocked(self) -> None:
        bad = risk.create_risk_matter(matter_id="BAD", client="Z", matter_type="FREE_TEXT_BYPASS")
        self.assertTrue(bad["errors"])

    def test_risk_level_not_liability(self) -> None:
        lvl = risk.classify_risk_level(
            deadline_days=5,
            dollar_exposure=300000,
            legal_sensitive=True,
            regulatory_sensitive=True,
            document_completeness="Poor",
        )
        self.assertEqual(lvl["level"], "CRITICAL")
        self.assertIn("does not equal legal liability", lvl["note"])


if __name__ == "__main__":
    unittest.main()
