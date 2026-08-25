#!/usr/bin/env python3
"""Sprint 12 Revenue Truth — cases A–N + cross-domain + AI E2E."""

from __future__ import annotations

import sys
import unittest
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import revenue_truth as rt  # noqa: E402
import pricing_policy  # noqa: E402


class TestCasesAN(unittest.TestCase):
    def test_case_a_normal_retainer(self) -> None:
        inv = rt.create_invoice(
            client="Retainer Co",
            engagement_id="ENG-A",
            invoice_number="INV-A",
            original_amount=5000,
            invoice_date="2026-08-01",
            due_date="2026-08-15",
        )
        fps: set[str] = set()
        pay = rt.create_payment(
            client="Retainer Co",
            amount=5000,
            payment_date="2026-08-10",
            bank_processor_reference="BNK-A-1",
            known_fingerprints=fps,
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        self.assertTrue(res["ok"])
        self.assertEqual(res["invoice"]["status"], "PAID")
        self.assertEqual(res["invoice"]["amountCollected"], 5000)
        self.assertEqual(res["invoice"]["balanceDue"], 0)
        self.assertEqual(res["status"], "RECONCILED")

    def test_case_b_partial_payment(self) -> None:
        inv = rt.create_invoice(
            client="Partial Co",
            engagement_id="ENG-B",
            invoice_number="INV-B",
            original_amount=5000,
            invoice_date="2026-08-01",
            due_date="2026-08-15",
        )
        pay = rt.create_payment(
            client="Partial Co",
            amount=2000,
            payment_date="2026-08-10",
            bank_processor_reference="BNK-B",
            known_fingerprints=set(),
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        self.assertEqual(res["invoice"]["amountCollected"], 2000)
        self.assertEqual(res["invoice"]["balanceDue"], 3000)
        self.assertEqual(res["invoice"]["status"], "PARTIALLY_PAID")

    def test_case_c_duplicate_payment(self) -> None:
        fps: set[str] = set()
        p1 = rt.create_payment(
            client="Dup Co",
            amount=5000,
            payment_date="2026-08-10",
            bank_processor_reference="BNK-DUP",
            source_transaction_id="TX-DUP",
            known_fingerprints=fps,
        )
        p2 = rt.create_payment(
            client="Dup Co",
            amount=5000,
            payment_date="2026-08-10",
            bank_processor_reference="BNK-DUP",
            source_transaction_id="TX-DUP",
            known_fingerprints=fps,
        )
        self.assertFalse(p1.get("duplicate"))
        self.assertTrue(p2.get("duplicate"))
        inv = rt.create_invoice(
            client="Dup Co",
            engagement_id="ENG-C",
            invoice_number="INV-C",
            original_amount=5000,
            invoice_date="2026-08-01",
            due_date="2026-08-15",
        )
        r1 = rt.reconcile_payment_to_invoice(inv, p1)
        r2 = rt.reconcile_payment_to_invoice(r1["invoice"], p2)
        self.assertEqual(r1["invoice"]["amountCollected"], 5000)
        self.assertFalse(r2["ok"])
        self.assertEqual(r1["invoice"]["amountCollected"], 5000)  # no double count via r2

    def test_case_d_capital_funding(self) -> None:
        fee = rt.create_success_fee(
            client="Cap Co",
            engagement_id="ENG-D",
            offer="OFF-CAP",
            agreement_reference="AGR-SF-2PCT",
            fee_type="Capital",
            percentage=2.0,
            trigger="funded_capital",
            domain="Capital",
        )
        ev = rt.evaluate_capital_success_fee(
            fee, requested=1_200_000, submitted=1_000_000, approved=1_000_000, closed=1_000_000, funded=1_000_000
        )
        self.assertEqual(ev["capitalTruth"]["fundedCapital"], 1_000_000)
        self.assertEqual(ev["potentialFee"], 20_000)
        self.assertEqual(ev["hvcgCollectedSuccessFee"], 0)
        self.assertEqual(ev["earnedAmount"], 0)
        self.assertEqual(ev["status"], "TRIGGER_REVIEW")

    def test_case_e_procurement_award(self) -> None:
        fee = rt.create_success_fee(
            client="Proc Co",
            engagement_id="ENG-E",
            offer="OFF-PROC",
            agreement_reference="AGR-PROC",
            fee_type="Procurement",
            percentage=1.0,
            trigger="award",
            domain="Procurement",
        )
        ev = rt.evaluate_procurement_success_fee(
            fee, estimated_value=4_000_000, bid_amount=3_500_000, award_amount=3_000_000
        )
        self.assertEqual(ev["procurementTruth"]["awardAmount"], 3_000_000)
        self.assertEqual(ev["hvcgCollectedRevenue"], 0)

    def test_case_f_risk_recovery(self) -> None:
        fee = rt.create_success_fee(
            client="Risk Co",
            engagement_id="ENG-F",
            offer="OFF-RISK",
            agreement_reference="AGR-RISK",
            fee_type="Recovery",
            percentage=10.0,
            trigger="paid_recovery",
            domain="Risk",
        )
        ev = rt.evaluate_risk_success_fee(
            fee,
            claimed=100_000,
            verified_loss=80_000,
            requested_recovery=80_000,
            approved_recovery=60_000,
            paid_recovery=55_000,
        )
        self.assertEqual(ev["riskTruth"]["claimedAmount"], 100_000)
        self.assertEqual(ev["riskTruth"]["approvedRecovery"], 60_000)
        self.assertEqual(ev["riskTruth"]["paidRecovery"], 55_000)

    def test_case_g_referral(self) -> None:
        partner = rt.create_referral_partner(
            name="Partner G",
            agreement="REF-AGR-G",
            compensation_structure={"basis": "ELIGIBLE_COLLECTED_HVCG_REVENUE", "ratePct": 15},
        )
        elig = rt.calculate_referral_eligibility(
            partner=partner,
            client="Cap Co",
            engagement_id="ENG-G",
            offer="OFF-CAP",
            eligible_collected_revenue=20_000,
            revenue_type="success_fee",
        )
        self.assertEqual(elig["potentialPayout"], 3000)
        self.assertTrue(elig["approvalRequired"])
        apr = rt.create_referral_payout_approval(elig)
        approved = rt.approve_referral_payout(apr, approver="Manny")
        self.assertEqual(approved["referralState"], "PAYABLE")
        blocked = rt.attempt_mark_referral_paid("PAYABLE", approval_status="APPROVED")
        self.assertEqual(blocked["status"], "BLOCKED_POLICY")

    def test_case_h_refund(self) -> None:
        inv = rt.create_invoice(
            client="Refund Co",
            engagement_id="ENG-H",
            invoice_number="INV-H",
            original_amount=5000,
            invoice_date="2026-08-01",
            due_date="2026-08-15",
        )
        pay = rt.create_payment(
            client="Refund Co",
            amount=5000,
            payment_date="2026-08-10",
            bank_processor_reference="BNK-H",
            known_fingerprints=set(),
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        ref = rt.record_refund(res["invoice"], res["payment"], amount=1000, reason="goodwill", approver="Manny")
        col = rt.collected_revenue([ref["invoice"]])
        self.assertEqual(col["grossCollected"], 5000)
        self.assertEqual(col["refunds"], 1000)
        self.assertEqual(col["netCollected"], 4000)

    def test_case_i_write_off(self) -> None:
        inv = rt.create_invoice(
            client="WO Co",
            engagement_id="ENG-I",
            invoice_number="INV-I",
            original_amount=5000,
            invoice_date="2026-08-01",
            due_date="2026-08-15",
        )
        pay = rt.create_payment(
            client="WO Co",
            amount=3000,
            payment_date="2026-08-10",
            bank_processor_reference="BNK-I",
            known_fingerprints=set(),
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        wo = rt.record_write_off(res["invoice"], amount=2000, reason="uncollectible", approver="Manny")
        self.assertEqual(wo["invoice"]["amountCollected"], 3000)
        self.assertEqual(wo["invoice"]["balanceDue"], 0)
        self.assertEqual(wo["invoice"]["status"], "WRITTEN_OFF")
        col = rt.collected_revenue([wo["invoice"]])
        self.assertEqual(col["netCollected"], 3000)

    def test_case_j_source_conflict(self) -> None:
        inv = rt.create_invoice(
            client="Conflict Co",
            engagement_id="ENG-J",
            invoice_number="INV-J",
            original_amount=5000,
            invoice_date="2026-08-01",
            due_date="2026-08-15",
        )
        pay = rt.create_payment(
            client="Conflict Co",
            amount=5000,
            payment_date="2026-08-10",
            bank_processor_reference="BNK-J",
            known_fingerprints=set(),
        )
        pay["conflictingAmount"] = 4500
        res = rt.reconcile_payment_to_invoice(inv, pay)
        self.assertEqual(res["status"], "SOURCE_CONFLICT")
        self.assertFalse(res["ok"])
        manual = rt.manual_reconcile(
            invoice=inv,
            payment=pay,
            resolution="Use bank amount",
            user="Manny",
            evidence="Bank statement",
            reason="Processor lag",
            chosen_amount=5000,
        )
        self.assertTrue(manual["ok"])
        self.assertTrue(manual["manualAudit"]["originalValuesPreserved"])

    def test_case_k_accg(self) -> None:
        econ = rt.create_contracted_economics(
            client="ACCG",
            engagement_id="ENG-ACCG",
            retainer=99999,
            client_classification="LEGACY",
            recommended_future_pricing={"monthly": 7500},
            agreement_reference="BL-ACCG-PRICE",
        )
        self.assertEqual(econ["retainer"], pricing_policy.ACCG_LOCKED_MONTHLY)
        self.assertTrue(econ["legacy_pricing_protected"])
        self.assertTrue(econ["recommended_future_pricing"]["doesNotOverwriteContracted"])
        inv = rt.create_invoice(
            client="ACCG",
            engagement_id="ENG-ACCG",
            invoice_number="INV-ACCG",
            original_amount=4539,
            invoice_date="2026-08-01",
            due_date="2026-08-15",
            agreement_reference="BL-ACCG-PRICE",
        )
        pay = rt.create_payment(
            client="ACCG",
            amount=4539,
            payment_date="2026-08-10",
            bank_processor_reference="BNK-ACCG",
            known_fingerprints=set(),
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        self.assertEqual(res["invoice"]["status"], "PAID")
        protected = rt.protect_accg_contract(econ)
        self.assertEqual(protected["retainer"], 4539.0)

    def test_case_l_bl_c1(self) -> None:
        inv = rt.create_invoice(
            client="Overdue Co",
            engagement_id="ENG-L",
            invoice_number="INV-L",
            original_amount=5000,
            invoice_date="2026-06-01",
            due_date=(date.today() - timedelta(days=40)).isoformat(),
        )
        rt._refresh_invoice_status(inv)
        draft = rt.draft_collection_reminder(inv)
        self.assertEqual(draft["status"], "DRAFT")
        send = rt.attempt_send_collection_reminder(draft)
        self.assertEqual(send["status"], "BLOCKED_POLICY")
        self.assertTrue(send["blC1Active"])

    def test_case_m_referral_payout_bypass(self) -> None:
        blocked = rt.attempt_mark_referral_paid("ELIGIBLE", approval_status=None)
        self.assertEqual(blocked["status"], "BLOCKED_POLICY")

    def test_case_n_success_fee_without_agreement(self) -> None:
        fee = rt.create_success_fee(
            client="NoAgr Co",
            engagement_id="ENG-N",
            offer="OFF-CAP",
            agreement_reference=None,
            fee_type="Capital",
            percentage=2.0,
            trigger="funded",
        )
        self.assertEqual(fee["status"], "MISSING_AGREEMENT")
        self.assertEqual(fee["earnedAmount"], 0)


class TestE2E(unittest.TestCase):
    def test_revenue_reconciliation_e2e(self) -> None:
        econ = rt.create_contracted_economics(
            client="E2E Co",
            engagement_id="ENG-E2E",
            setup_fee=10000,
            retainer=5000,
            offer_code="OFF-GROWTH-OS",
            agreement_reference="AGR-E2E",
        )
        inv = rt.create_invoice(
            client="E2E Co",
            engagement_id="ENG-E2E",
            invoice_number="INV-E2E",
            original_amount=5000,
            invoice_date="2026-08-01",
            due_date="2026-08-15",
            agreement_reference="AGR-E2E",
        )
        fps: set[str] = set()
        p1 = rt.create_payment(
            client="E2E Co",
            amount=2000,
            payment_date="2026-08-05",
            bank_processor_reference="E2E-1",
            known_fingerprints=fps,
        )
        r1 = rt.reconcile_payment_to_invoice(inv, p1)
        p2 = rt.create_payment(
            client="E2E Co",
            amount=3000,
            payment_date="2026-08-12",
            bank_processor_reference="E2E-2",
            known_fingerprints=fps,
        )
        r2 = rt.reconcile_payment_to_invoice(r1["invoice"], p2)
        col = rt.collected_revenue([r2["invoice"]])
        partner = rt.create_referral_partner(
            name="E2E Partner",
            agreement="REF-E2E",
            compensation_structure={"ratePct": 10},
        )
        elig = rt.calculate_referral_eligibility(
            partner=partner,
            client="E2E Co",
            engagement_id="ENG-E2E",
            offer="OFF-GROWTH-OS",
            eligible_collected_revenue=col["netCollected"],
        )
        apr = rt.create_referral_payout_approval(elig)
        approved = rt.approve_referral_payout(apr, approver="Manny")
        stop = rt.attempt_mark_referral_paid("PAYABLE", approval_status="APPROVED")
        self.assertEqual(econ["state"], "CONTRACTED")
        self.assertEqual(r2["invoice"]["status"], "PAID")
        self.assertEqual(col["netCollected"], 5000)
        self.assertEqual(approved["referralState"], "PAYABLE")
        self.assertEqual(stop["status"], "BLOCKED_POLICY")
        self.assertTrue(rt.BL_C1_ACTIVE)

    def test_capital_to_revenue_e2e(self) -> None:
        fee = rt.create_success_fee(
            client="CapE2E",
            engagement_id="ENG-CAP",
            offer="OFF-CAP",
            agreement_reference="AGR-CAP",
            fee_type="Capital",
            percentage=2.0,
            trigger="funded",
        )
        reviewed = rt.evaluate_capital_success_fee(
            fee, requested=1e6, submitted=1e6, approved=1e6, closed=1e6, funded=1e6
        )
        earned = rt.verify_success_fee_earned(reviewed, eligible_base=1_000_000, reviewer="Manny")
        inv = rt.create_invoice(
            client="CapE2E",
            engagement_id="ENG-CAP",
            invoice_number="INV-SF",
            original_amount=earned["earnedAmount"],
            invoice_date="2026-08-01",
            due_date="2026-08-15",
            revenue_category="Success Fee",
            agreement_reference="AGR-CAP",
        )
        pay = rt.create_payment(
            client="CapE2E",
            amount=20_000,
            payment_date="2026-08-20",
            bank_processor_reference="SF-PAY",
            known_fingerprints=set(),
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        earned["collectedAmount"] = res["invoice"]["amountCollected"]
        earned["status"] = "COLLECTED"
        partner = rt.create_referral_partner(name="Cap Partner", agreement="REF-CAP", compensation_structure={"ratePct": 15})
        elig = rt.calculate_referral_eligibility(
            partner=partner,
            client="CapE2E",
            engagement_id="ENG-CAP",
            offer="OFF-CAP",
            eligible_collected_revenue=20_000,
        )
        self.assertEqual(reviewed["capitalTruth"]["fundedCapital"], 1_000_000)
        self.assertEqual(earned["earnedAmount"], 20_000)
        self.assertEqual(res["invoice"]["amountCollected"], 20_000)
        self.assertEqual(elig["potentialPayout"], 3000)
        self.assertNotEqual(reviewed["capitalTruth"]["fundedCapital"], res["invoice"]["amountCollected"])

    def test_procurement_to_revenue_e2e(self) -> None:
        fee = rt.create_success_fee(
            client="ProcE2E",
            engagement_id="ENG-P",
            offer="OFF-PROC",
            agreement_reference="AGR-P",
            fee_type="Procurement",
            percentage=1.0,
            trigger="award",
            domain="Procurement",
        )
        ev = rt.evaluate_procurement_success_fee(
            fee, estimated_value=5e6, bid_amount=3.2e6, award_amount=3e6
        )
        earned = rt.verify_success_fee_earned(ev, eligible_base=3_000_000, reviewer="Manny")
        inv = rt.create_invoice(
            client="ProcE2E",
            engagement_id="ENG-P",
            invoice_number="INV-P",
            original_amount=earned["earnedAmount"],
            invoice_date="2026-08-01",
            due_date="2026-08-15",
            revenue_category="Success Fee",
        )
        pay = rt.create_payment(
            client="ProcE2E",
            amount=earned["earnedAmount"],
            payment_date="2026-08-25",
            bank_processor_reference="PROC-PAY",
            known_fingerprints=set(),
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        self.assertEqual(ev["procurementTruth"]["awardAmount"], 3_000_000)
        self.assertEqual(res["invoice"]["amountCollected"], 30_000)
        self.assertNotEqual(ev["procurementTruth"]["awardAmount"], res["invoice"]["amountCollected"])

    def test_risk_to_revenue_e2e(self) -> None:
        fee = rt.create_success_fee(
            client="RiskE2E",
            engagement_id="ENG-R",
            offer="OFF-RISK",
            agreement_reference="AGR-R",
            fee_type="Recovery",
            percentage=10.0,
            trigger="paid_recovery",
            domain="Risk",
        )
        ev = rt.evaluate_risk_success_fee(
            fee,
            claimed=100_000,
            verified_loss=80_000,
            requested_recovery=80_000,
            approved_recovery=60_000,
            paid_recovery=55_000,
            verified_savings=55_000,
        )
        earned = rt.verify_success_fee_earned(ev, eligible_base=55_000, reviewer="Manny")
        inv = rt.create_invoice(
            client="RiskE2E",
            engagement_id="ENG-R",
            invoice_number="INV-R",
            original_amount=earned["earnedAmount"],
            invoice_date="2026-08-01",
            due_date="2026-08-15",
            revenue_category="Success Fee",
        )
        pay = rt.create_payment(
            client="RiskE2E",
            amount=5500,
            payment_date="2026-08-28",
            bank_processor_reference="RISK-PAY",
            known_fingerprints=set(),
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        self.assertEqual(ev["riskTruth"]["claimedAmount"], 100_000)
        self.assertEqual(ev["riskTruth"]["paidRecovery"], 55_000)
        self.assertEqual(earned["earnedAmount"], 5500)
        self.assertEqual(res["invoice"]["amountCollected"], 5500)

    def test_ai_revenue_e2e(self) -> None:
        econ = rt.create_contracted_economics(
            client="AI Co", engagement_id="ENG-AI", retainer=5000, agreement_reference="AGR-AI"
        )
        inv = rt.create_invoice(
            client="AI Co",
            engagement_id="ENG-AI",
            invoice_number="INV-AI",
            original_amount=5000,
            invoice_date="2026-08-01",
            due_date="2026-08-15",
        )
        pay = rt.create_payment(
            client="AI Co",
            amount=5000,
            payment_date="2026-08-10",
            bank_processor_reference="AI-PAY",
            known_fingerprints=set(),
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        partner = rt.create_referral_partner(
            name="AI Partner", agreement="REF-AI", compensation_structure={"ratePct": 10}
        )
        elig = rt.calculate_referral_eligibility(
            partner=partner,
            client="AI Co",
            engagement_id="ENG-AI",
            offer="OFF-GROWTH-OS",
            eligible_collected_revenue=5000,
        )
        truth = rt.client_revenue_truth(
            client="AI Co",
            economics=econ,
            invoices=[res["invoice"]],
            referral={
                "potentialPayout": elig["potentialPayout"],
                "eligibleRevenueBase": elig["eligibleRevenueBase"],
                "payable": 0,
                "paid": 0,
            },
        )
        ans = rt.second_brain_revenue_answer(truth)
        labels = {a["label"]: a["value"] for a in ans["answerKinds"]}
        self.assertEqual(labels["Invoiced"], 5000)
        self.assertEqual(labels["Collected"], 5000)
        self.assertEqual(labels["ReferralEligibleBase"], 5000)
        self.assertEqual(labels["ReferralEligible"], 500)
        self.assertEqual(labels["ReferralPaid"], 0)

    def test_agt_invoice_and_referral_e2e(self) -> None:
        inv = rt.create_invoice(
            client="Agent Co",
            engagement_id="ENG-AG",
            invoice_number="INV-AG",
            original_amount=5000,
            invoice_date="2026-06-01",
            due_date=(date.today() - timedelta(days=45)).isoformat(),
        )
        rt._refresh_invoice_status(inv)
        agent = rt.run_invoice_agent(invoices=[inv], payments=[])
        self.assertGreaterEqual(agent["overdue"], 1)
        self.assertTrue(agent["reminderDrafts"])
        send = rt.attempt_send_collection_reminder(agent["reminderDrafts"][0])
        self.assertEqual(send["status"], "BLOCKED_POLICY")

        partner = rt.create_referral_partner(
            name="Ref Agent", agreement="REF-AG", compensation_structure={"ratePct": 10}
        )
        elig = rt.calculate_referral_eligibility(
            partner=partner,
            client="Agent Co",
            engagement_id="ENG-AG",
            offer="OFF-X",
            eligible_collected_revenue=5000,
        )
        ref_agent = rt.run_referral_agent(partner=partner, eligibility=elig)
        self.assertEqual(ref_agent["status"], "NEEDS_HUMAN")
        approved = rt.approve_referral_payout(ref_agent["approval"], approver="Manny")
        self.assertEqual(approved["referralState"], "PAYABLE")
        self.assertFalse(approved["payoutExecutionAuthorized"])

    def test_owner_brief_e2e(self) -> None:
        inv = rt.create_invoice(
            client="Brief Co",
            engagement_id="ENG-BR",
            invoice_number="INV-BR",
            original_amount=5000,
            invoice_date="2026-08-01",
            due_date=(date.today() - timedelta(days=10)).isoformat(),
        )
        pay = rt.create_payment(
            client="Brief Co",
            amount=2000,
            payment_date="2026-08-05",
            bank_processor_reference="BR-1",
            known_fingerprints=set(),
        )
        res = rt.reconcile_payment_to_invoice(inv, pay)
        brief = rt.owner_brief_revenue(
            invoices=[res["invoice"]],
            payments=[res["payment"]],
            success_fees=[{"earnedAmount": 1000, "collectedAmount": 0}],
            referral_payables=[{"calculatedAmount": 300}],
        )
        self.assertEqual(brief["collectedRevenue"], 2000)
        self.assertEqual(brief["outstandingAR"], 3000)
        self.assertFalse(brief["fabricatedMetrics"])
        cards = rt.ecc_revenue_truth_cards(
            pipeline=100000, proposed=20000, contracted=5000, invoiced=5000, collected=2000
        )
        self.assertEqual(len(cards), 5)
        self.assertEqual({c["bucket"] for c in cards}, {"Pipeline", "Proposed", "Contracted", "Invoiced", "Collected"})


if __name__ == "__main__":
    unittest.main()
