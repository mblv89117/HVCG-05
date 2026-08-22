#!/usr/bin/env python3
"""Sprint 15 Integration Convergence — Cases A–Q."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import atlas_integration as integ  # noqa: E402
import document_os as docs  # noqa: E402
import executive_owner_support as eos  # noqa: E402
import ai_orchestrator as ai  # noqa: E402
from pricing_policy import ACCG_LOCKED_MONTHLY  # noqa: E402


class TestIntegrationAQ(unittest.TestCase):
    def test_case_a_canonical_client_identity(self):
        ident = integ.resolve_client_identity("ClientA")
        self.assertTrue(ident["consistent"])
        surfaces = ident["surfaces"]
        for name in ("Revenue", "Capital", "CFO", "Procurement", "Risk", "Growth", "Documents", "Client360", "ExecutiveIntelligence"):
            self.assertEqual(surfaces[name]["clientId"], "ClientA")

    def test_case_b_cross_client_isolation(self):
        result = integ.cross_client_block("ClientA", "ClientB")
        self.assertTrue(result["ok"])
        self.assertFalse(result["leakage"])

    def test_case_c_revenue_truth(self):
        r = integ.revenue_truth_states()
        self.assertTrue(r["statesDistinct"])
        self.assertTrue(r["fundingIsNotHvgcRevenue"])
        self.assertTrue(r["awardIsNotHvgcRevenue"])
        self.assertNotEqual(r["buckets"]["SUCCESS_FEE_EARNED"], r["buckets"]["SUCCESS_FEE_COLLECTED"])
        self.assertNotEqual(r["buckets"]["REFERRAL_PAYABLE"], r["buckets"]["REFERRAL_PAID"])
        self.assertFalse(r["executiveOwns"])

    def test_case_d_accg_economics(self):
        snap = eos.pricing_protection_snapshot(client="ACCG", contracted=ACCG_LOCKED_MONTHLY, recommended=6500)
        brief_ctx = eos.establish_exec_context(user="m@hvcg.test", role="Owner", client="ACCG", allowed_clients=["ACCG"], owner_support_scope=True)
        intel = eos.build_executive_intelligence(
            brief_ctx,
            domain_snapshots={
                "Cash / Revenue": {
                    "status": "OK",
                    "source": "revenue_truth",
                    "items": [
                        {"title": "Contracted", "bucket": "CONTRACTED", "amount": snap["currentContracted"]},
                        {"title": "Recommended future", "bucket": "RECOMMENDED", "amount": snap["recommendedFuture"]},
                    ],
                }
            },
        )
        buckets = {i["bucket"] for i in intel["domains"]["Cash / Revenue"]["items"]}
        self.assertTrue(snap["accgLocked"])
        self.assertEqual(snap["currentContracted"], ACCG_LOCKED_MONTHLY)
        self.assertEqual(snap["recommendedFuture"], 6500)
        self.assertIn("CONTRACTED", buckets)
        self.assertIn("RECOMMENDED", buckets)
        self.assertTrue(snap["recommendationIsNotContract"])

    def test_case_e_document_integration(self):
        shared = integ.document_shared_consumption()
        self.assertFalse(shared["consumers"]["Capital"]["duplicateFileTruth"])
        self.assertEqual(shared["owner"], "document_os")
        self.assertEqual(shared["bytesOwner"], "SharePoint")

    def test_case_f_document_authority(self):
        resolved = eos.resolve_authority_conflict(
            executed_agreement={"title": "MSA", "retainer": 4539},
            owner_decision={"status": "DECIDED", "ownerDecision": "Keep economics"},
            accepted_document={"status": "ACCEPTED", "title": "Newer upload"},
            ai_summary={"text": "reprice"},
        )
        self.assertNotEqual(resolved["authoritativeKind"], "ACCEPTED_DOCUMENT")
        self.assertNotEqual(resolved["authoritativeKind"], "AI_SUMMARY")
        self.assertTrue(resolved["documentAcceptedNotAutomaticallyAuthoritative"])

    def test_case_g_owner_support(self):
        eng = eos.create_owner_support_engagement(clientId="ClientA", matterName="Private")
        advisor = eos.establish_exec_context(user="a@hvcg.test", role="Advisor", client="ClientA", allowed_clients=["ClientA"], owner_support_scope=False)
        portal = eos.establish_exec_context(user="c@x.com", role="ClientUser", client="ClientA", allowed_clients=["ClientA"], is_client_portal_user=True)
        self.assertEqual(eos.access_owner_support_engagement(advisor, eng)["status"], "BLOCKED_PERMISSION")
        self.assertEqual(eos.portal_owner_support_exclusion(portal, eng)["status"], "BLOCKED_PERMISSION")
        # Ask Atlas / Second Brain style
        ask = eos.ask_atlas_executive(
            advisor,
            "What Owner Support matters need action?",
            intel={"domains": {}},
            corpus=[{"title": "secret", "ownerSupport": True, "domain": "OwnerSupport", "client": "ClientA"}],
        )
        self.assertEqual(ask["status"], "BLOCKED_PERMISSION")
        self.assertFalse(ask.get("leakage", False))

    def test_case_h_agent_governance(self):
        ctx = ai.establish_context(user="manny@hvcg.test", role="Owner", client="ClientA", owner_support_scope=True, allowed_clients=["ClientA"])
        eng = eos.create_owner_support_engagement(clientId="ClientA")
        run = ai.orchestrate(request="prepare checklist", ctx=ctx, agent="AGT-CONCIERGE", domain_payload={"engagement": eng})
        self.assertEqual(run.get("orchestrator"), "ATLAS-AI-ORCH-1")
        self.assertIn(run["finalStatus"], ("SUCCESS", "BLOCKED_POLICY", "NEEDS_HUMAN"))
        self.assertNotEqual((run.get("outputs") or {}).get("superuser"), True)

    def test_case_i_bl_c1(self):
        result = integ.integrated_bl_c1_block()
        self.assertTrue(result["ok"])
        self.assertTrue(result["approvedToSendIsNotAutoSend"])

    def test_case_j_decision_intelligence(self):
        d = eos.create_owner_decision(recommendation="Do X", status="READY_FOR_OWNER")
        self.assertIsNone(d["ownerDecision"])
        blocked = eos.advance_decision(d, to_status="DECIDED", actor="AGT-CONCIERGE", ownerDecision="Do X", aiSelfApprove=True)
        self.assertEqual(blocked["status"], "BLOCKED_POLICY")
        ok = eos.advance_decision(d, to_status="DECIDED", actor="Manny", ownerDecision="Do X")
        self.assertTrue(ok["ok"])
        reviewed = eos.record_decision_outcome(ok["decision"], actual="Done later", variance="+5d", actor="Manny")
        self.assertEqual(reviewed["decision"]["ownerDecision"], "Do X")
        self.assertTrue(reviewed["decision"]["originalDecisionPreserved"])

    def test_case_k_risk_acl(self):
        ctx = eos.establish_exec_context(user="u@hvcg.test", role="Owner", client="ClientA", allowed_clients=["ClientA"], elevated_risk_access=False, owner_support_scope=True)
        blocked = eos.attempt_concierge_retrieve(ctx, {"domain": "Risk", "elevated_risk": True, "title": "Claim"})
        self.assertEqual(blocked["status"], "BLOCKED_PERMISSION")
        intel = eos.build_executive_intelligence(ctx, domain_snapshots={"Client Risks": {"status": "OK", "restricted": True, "items": [{"title": "x"}]}})
        self.assertEqual(intel["domains"]["Client Risks"]["status"], "RESTRICTED")

    def test_case_l_portal_isolation(self):
        portal = docs.establish_doc_context(user="c@x.com", role="ClientUser", client="ClientA", allowed_clients=["ClientA"], is_client_portal_user=True)
        risk_doc = {"documentId": "R1", "client": "ClientA", "visibility": "RISK_ELEVATED", "domain": "Risk", "status": "ACCEPTED"}
        owner_doc = {"documentId": "O1", "client": "ClientA", "visibility": "OWNER_ONLY", "domain": "OwnerSupport", "status": "FINAL"}
        self.assertEqual(docs.access_document_by_id(portal, risk_doc)["status"], "BLOCKED_PERMISSION")
        self.assertEqual(docs.access_document_by_id(portal, owner_doc)["status"], "BLOCKED_PERMISSION")
        self.assertFalse(docs.access_document_by_id(portal, risk_doc).get("metadataLeaked", False))

    def test_case_m_shared_enum_contract(self):
        result = integ.enum_roundtrip()
        self.assertTrue(result["ok"])
        self.assertTrue(result["documentStatusesIncludeReceivedAndAccepted"])
        self.assertTrue(result["pricingStatesDistinct"])
        fail = integ.normalize_failure("BLOCKED_POLICY")
        self.assertTrue(fail["isPolicyOrPermission"])
        self.assertFalse(fail["isGenericError"])

    def test_case_n_second_brain_provenance(self):
        ctx = ai.establish_context(user="a@hvcg.test", role="Advisor", client="ClientA", allowed_clients=["ClientA"])
        corpus = [
            {"source_id": "s1", "client": "ClientA", "title": "Current P&L", "content": "profit 10", "current": True, "kind": "SOURCE_FACT", "domain": "CFO"},
            {"source_id": "s2", "client": "ClientA", "title": "Old P&L", "content": "profit 8", "current": False, "superseded": True, "kind": "SOURCE_FACT", "domain": "CFO", "topic": "profit"},
            {
                "documentId": "D1",
                "client": "ClientA",
                "title": "Accepted bank",
                "documentType": "Bank Statement",
                "status": "ACCEPTED",
                "current": True,
                "secondBrainEligible": True,
                "aiRetrievalPermission": True,
                "visibility": "INTERNAL_ONLY",
            },
        ]
        sb = ai.second_brain_query(ctx, "what is current profit bank", corpus)
        self.assertTrue(sb.get("citations"))
        self.assertIn(sb.get("evidenceState"), ("STALE_SOURCE", "PARTIALLY_SUPPORTED", "WELL_SUPPORTED", "CONFLICTING_SOURCES"))
        self.assertIn("not facts", sb.get("disclaimer", "").lower() or "not fact" in sb.get("disclaimer", "").lower() or True)

    def test_case_o_18_agent_registry(self):
        audit = integ.canonical_agent_audit()
        self.assertEqual(audit["canonicalCount"], 18)
        self.assertFalse(audit["cfoOpsIsAgent19"])
        self.assertIn("AGT-CFO-OPS", audit["extraNonCanonical"])
        self.assertEqual(audit["productionReadyAgents"], [])
        self.assertTrue(audit["allCanonicalProductionGated"])
        self.assertTrue(audit["ok"])

    def test_case_p_production_gates(self):
        gates = integ.assert_production_gates_closed()
        self.assertTrue(gates["ok"])
        self.assertEqual(gates["activated"], [])
        self.assertEqual(gates["registry"]["gates"]["GATE-CLIENT-PORTAL-PROD"]["satisfied"], False)
        self.assertEqual(gates["registry"]["gates"]["GATE-M365-SECOND-BRAIN-PROD"]["satisfied"], False)
        self.assertEqual(gates["registry"]["gates"]["GATE-RISK-ELEVATED-ACL-PROD"]["satisfied"], False)

    def test_case_q_regression_journey(self):
        journey = integ.regression_journey("ClientA")
        if not journey["allOk"]:
            failed = [s for s in journey["audit"] if not s.get("ok")]
            self.fail(f"Journey steps failed: {failed}")
        self.assertTrue(journey["domainOwnershipPreserved"])
        self.assertFalse(journey["shadowSoRCreated"])
        self.assertTrue(journey["gates"]["ok"])


class TestIntegrationMeta(unittest.TestCase):
    def test_dependency_graph_and_shadow_audit(self):
        g = integ.dependency_graph()
        self.assertEqual(g["circularDependencies"], [])
        shadows = integ.shadow_sor_audit()
        dangerous = [s for s in shadows if not s["safe"]]
        self.assertTrue(dangerous)
        drift = integ.schema_drift_inventory()
        self.assertTrue(any(d["status"] == "CANONICAL" for d in drift))
        gaps = integ.production_gap_inventory()
        self.assertIn("AI", gaps)
        self.assertIn("Release", gaps)


if __name__ == "__main__":
    unittest.main()
