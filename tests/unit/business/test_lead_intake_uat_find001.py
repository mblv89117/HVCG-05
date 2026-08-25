"""UAT-FIND-001 — Development lead intake remediation pack (Cases A–L)."""

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

import lead_intake as leads  # noqa: E402
import atlas_security as sec  # noqa: E402


class LeadIntakeRemediationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        self.patcher = mock.patch.object(leads, "STORE_DIR", self.tmp)
        self.patcher.start()

    def tearDown(self) -> None:
        self.patcher.stop()
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _create(self, **kwargs):
        defaults = dict(
            title="Atlas UAT Prospect 01",
            contact_name="Jordan Test",
            source="Referral Partner",
            lead_source_detail="UAT Referral Partner",
            service_interest="Capital Advisory",
            business_need="Growth capital + financial readiness",
            notes="UAT-only sanitized prospect",
            actor="Manny",
        )
        defaults.update(kwargs)
        return leads.create_lead(**defaults)

    def test_case_a_create_prospect(self) -> None:
        r = self._create()
        self.assertTrue(r["ok"])
        self.assertEqual(r["lead"]["LeadStatus"], "New")
        self.assertTrue(str(r["lead"]["LeadId"]).startswith("LEAD-DEV-"))

    def test_case_b_persist(self) -> None:
        r = self._create()
        got = leads.get_lead(r["lead"]["LeadId"])
        self.assertTrue(got["ok"])
        self.assertEqual(got["lead"]["Title"], "Atlas UAT Prospect 01")

    def test_case_c_list(self) -> None:
        self._create()
        listed = leads.list_leads()
        self.assertGreaterEqual(listed["count"], 1)
        self.assertEqual(listed["leads"][0]["Title"], "Atlas UAT Prospect 01")

    def test_case_d_source(self) -> None:
        r = self._create()
        self.assertEqual(r["lead"]["Source"], "Referral Partner")
        self.assertEqual(r["lead"]["LeadSourceDetail"], "UAT Referral Partner")
        self.assertTrue(r["lead"]["IsReferral"])

    def test_case_e_need(self) -> None:
        r = self._create()
        self.assertEqual(r["lead"]["ServiceInterest"], "Capital Advisory")
        self.assertIn("Growth capital", r["lead"]["BusinessNeed"])

    def test_case_f_lifecycle_not_client(self) -> None:
        r = self._create()
        self.assertTrue(leads.assert_not_client(r["lead"]))
        self.assertEqual(r["lead"]["LifecycleLabel"], "PROSPECT / LEAD")
        self.assertFalse(r["lead"]["IsClient360Client"])

    def test_case_g_next_action(self) -> None:
        r = self._create()
        self.assertEqual(r["lead"]["NextAction"], leads.NEXT_ACTION_FREE_FIT)

    def test_case_h_no_contract(self) -> None:
        r = self._create()
        self.assertFalse(r["lead"]["ContractedEconomicsCreated"])

    def test_case_i_blc1(self) -> None:
        block = leads.attempt_external_followup()
        self.assertEqual(block["status"], "BLOCKED_POLICY")
        self.assertFalse(block.get("sent"))

    def test_case_j_duplicate(self) -> None:
        a = self._create()
        self.assertTrue(a["ok"])
        b = self._create()
        self.assertFalse(b["ok"])
        self.assertEqual(b["status"], "DUPLICATE")
        self.assertFalse(b.get("silentDuplicateCreated"))
        self.assertEqual(b["existingLeadId"], a["lead"]["LeadId"])

    def test_case_k_persistence_refresh(self) -> None:
        r = self._create()
        # Reload from disk as new process would
        raw = json.loads((self.tmp / "leads.json").read_text(encoding="utf-8"))
        self.assertEqual(raw["canonicalContract"], "HVCG_Leads")
        self.assertFalse(raw["productionCrm"])
        ids = [x["LeadId"] for x in raw["leads"]]
        self.assertIn(r["lead"]["LeadId"], ids)

    def test_case_l_client360_boundary(self) -> None:
        r = self._create()
        self.assertNotEqual(r["lead"]["LeadStatus"], "Converted")
        self.assertIsNone(r["lead"]["ConvertedClientId"])
        self.assertEqual(r["lead"]["ConversionBoundary"], leads.CONVERSION_BOUNDARY)

    def test_dispatch_bridge_ops(self) -> None:
        principal = {
            "userId": "uat-owner",
            "email": "owner@hvcg.test",
            "roles": ["HVCG Owner"],
            "allowedClientIds": ["*"],
        }
        created = sec.dispatch_ba_request(
            {
                "op": "lead.create",
                "principal": principal,
                "payload": {
                    "title": "Bridge Prospect Co",
                    "contactName": "Pat",
                    "source": "Referral Partner",
                    "leadSourceDetail": "Partner X",
                    "serviceInterest": "Capital Advisory",
                    "businessNeed": "capital",
                },
            }
        )
        self.assertTrue(created.get("ok"), created)
        listed = sec.dispatch_ba_request({"op": "lead.list", "principal": principal, "payload": {}})
        self.assertTrue(listed.get("ok"))
        self.assertGreaterEqual(listed.get("count"), 1)


if __name__ == "__main__":
    unittest.main()
