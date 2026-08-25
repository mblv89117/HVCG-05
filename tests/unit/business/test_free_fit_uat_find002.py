"""UAT-FIND-002 — Free Fit remediation pack (Cases A–P)."""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import free_fit_runtime as ff  # noqa: E402
import lead_intake as leads  # noqa: E402
import atlas_security as sec  # noqa: E402
from commercial_rules import COMMERCIAL_CLASSES  # noqa: E402


class FreeFitRemediationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_leads = Path(tempfile.mkdtemp())
        self.tmp_fit = Path(tempfile.mkdtemp())
        self.p_leads = mock.patch.object(leads, "STORE_DIR", self.tmp_leads)
        self.p_fit = mock.patch.object(ff, "STORE_DIR", self.tmp_fit)
        self.p_leads.start()
        self.p_fit.start()
        created = leads.create_lead(
            title="Atlas UAT Prospect 01",
            contact_name="Jordan Test",
            source="Referral Partner",
            lead_source_detail="UAT Referral Partner",
            service_interest="Capital Advisory",
            business_need="Growth capital + financial readiness",
            notes="UAT-only sanitized prospect",
            actor="Manny",
        )
        self.lead_id = created["lead"]["LeadId"]

    def tearDown(self) -> None:
        self.p_leads.stop()
        self.p_fit.stop()
        shutil.rmtree(self.tmp_leads, ignore_errors=True)
        shutil.rmtree(self.tmp_fit, ignore_errors=True)

    def _complete(self, **kwargs):
        defaults = dict(
            lead_id=self.lead_id,
            need_type="Funding but disorganized",
            revenue_range="$1M–$5M",
            capital_goal="Growth capital + financial readiness",
            urgency="Normal",
            primary_issue="Growth capital + financial readiness",
            actor="Manny",
        )
        defaults.update(kwargs)
        return ff.complete_assessment(**defaults)

    def test_case_a_start_assessment(self) -> None:
        r = self._complete()
        self.assertTrue(r["ok"], r)
        self.assertTrue(str(r["assessment"]["assessmentId"]).startswith("FIT-DEV-"))

    def test_case_b_lead_linkage(self) -> None:
        r = self._complete()
        self.assertEqual(r["assessment"]["leadId"], self.lead_id)

    def test_case_c_questions(self) -> None:
        q = ff.questionnaire_definition()
        self.assertTrue(q["ok"])
        self.assertGreaterEqual(len(q["needOptions"]), 5)
        self.assertTrue(all(not n.get("restricted") for n in q["needOptions"]))

    def test_case_d_complete(self) -> None:
        r = self._complete()
        self.assertEqual(r["assessment"]["qualificationResult"], "Qualified")
        self.assertEqual(r["assessment"]["recommendedOffer"], "OFF-CAP-DIAG")

    def test_case_e_persistence(self) -> None:
        r = self._complete()
        got = ff.get_assessment(r["assessment"]["assessmentId"])
        self.assertTrue(got["ok"])
        raw = json.loads((self.tmp_fit / "assessments.json").read_text(encoding="utf-8"))
        self.assertFalse(raw["productionCrm"])

    def test_case_f_service_routing(self) -> None:
        r = self._complete()
        self.assertEqual(r["assessment"]["recommendedServiceLineCode"], "SL-CAPITAL")
        self.assertIn("Capital", r["assessment"]["recommendedServiceDomain"] or "")

    def test_case_g_paid_diagnostic(self) -> None:
        r = self._complete()
        self.assertEqual(r["assessment"]["recommendedDiagnostic"], "DIAG-FULL-CAPITAL")

    def test_case_h_commercial_class(self) -> None:
        r = self._complete()
        self.assertIn(r["assessment"]["recommendedCommercialClass"], COMMERCIAL_CLASSES)

    def test_case_i_owner_boundary(self) -> None:
        r = self._complete()
        self.assertEqual(r["assessment"]["ownerDecisionStatus"], "PENDING_OWNER")
        self.assertTrue(r["ownerDecisionRequired"])
        self.assertIsNone(r["assessment"]["ownerDecision"])

    def test_case_j_no_contract(self) -> None:
        r = self._complete()
        self.assertFalse(r["contractedEconomicsCreated"])
        self.assertFalse(r["assessment"]["contractedEconomicsCreated"])

    def test_case_k_no_proposal_send(self) -> None:
        r = self._complete()
        self.assertFalse(r["proposalSent"])
        self.assertFalse(r["assessment"]["proposalSent"])

    def test_case_l_blc1(self) -> None:
        block = ff.attempt_external_followup()
        self.assertEqual(block["status"], "BLOCKED_POLICY")
        self.assertFalse(block.get("sent"))

    def test_case_m_prospect_remains_prospect(self) -> None:
        r = self._complete()
        lead = leads.get_lead(self.lead_id)["lead"]
        self.assertNotEqual(lead.get("LeadStatus"), "Converted")
        self.assertFalse(lead.get("IsClient360Client"))
        self.assertFalse(r["convertedToClient"])

    def test_case_n_next_action(self) -> None:
        r = self._complete()
        self.assertEqual(r["assessment"]["nextAction"], "Review Free Fit recommendation")
        decided = ff.record_owner_decision(
            assessment_id=r["assessment"]["assessmentId"],
            decision="ACCEPT_RECOMMENDATION",
            actor="Manny",
        )
        self.assertTrue(decided["ok"])
        self.assertEqual(decided["assessment"]["nextAction"], "Prepare Paid Diagnostic")

    def test_case_o_reload(self) -> None:
        r = self._complete()
        listed = ff.get_by_lead(self.lead_id)
        self.assertEqual(listed["latest"]["assessmentId"], r["assessment"]["assessmentId"])

    def test_case_p_unauthorized_lead(self) -> None:
        bad = ff.complete_assessment(
            lead_id="LEAD-DEV-DOESNOTEXIST",
            need_type="Funding but disorganized",
            actor="Manny",
        )
        self.assertFalse(bad["ok"])
        self.assertEqual(bad["status"], "FORBIDDEN")
        self.assertFalse(bad.get("leakage"))

    def test_dispatch_bridge(self) -> None:
        principal = {
            "userId": "uat-owner",
            "email": "owner@hvcg.test",
            "roles": ["HVCG Owner"],
            "allowedClientIds": ["*"],
        }
        defined = sec.dispatch_ba_request({"op": "freefit.definition", "principal": principal, "payload": {}})
        self.assertTrue(defined.get("ok"))
        completed = sec.dispatch_ba_request(
            {
                "op": "freefit.complete",
                "principal": principal,
                "payload": {
                    "leadId": self.lead_id,
                    "needType": "Funding but disorganized",
                    "revenueRange": "$1M–$5M",
                    "urgency": "Normal",
                },
            }
        )
        self.assertTrue(completed.get("ok"), completed)


if __name__ == "__main__":
    unittest.main()
