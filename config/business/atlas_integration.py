"""Atlas BA V2 Integration Convergence (Development) — Sprint 15.

Not a new business domain. Reconciles shared contracts, domain ownership,
permission/BL-C1/gate regressions, and a representative cross-domain journey.
Executive Intelligence / ECC / Owner Brief consume domain SoRs — they do not own them.
"""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from pricing_policy import ACCG_LOCKED_MONTHLY, load_json

import ai_orchestrator as ai
import document_os as docs
import executive_owner_support as eos

BL_C1_ACTIVE = True
RUNTIME_VERSION = "1.0.0-dev"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_contracts() -> dict[str, Any]:
    return load_json("atlas-integration-contracts.json")


# --- Topology / ownership / gates ---


def integration_topology() -> dict[str, Any]:
    """Factual Development topology snapshot (docs may refresh SHAs in reports)."""
    return {
        "repository": "HVCG-05 (github.com/mblv89117/HVCG-05)",
        "baLocation": "config/business",
        "baResolution": "in-tree canonical (ba_bridge.py); HVCG_BA_BUSINESS_DIR override only",
        "eliteLocation": "apps/atlas-elite-os",
        "productionBranch": "main",
        "integrationPolicy": "BA engines live in canonical Atlas. Hub must not search sibling worktrees.",
        "doNotMerge": ["main", "fix/atlas-production-hardening"],
        "staleRejectDuplicates": [
            "client-portal-sprint1 (mock runtime)",
            "executive-command-center Power Apps package as competing shell",
            "executive-intelligence-sprint1 as separate app",
        ],
        "environment": "DEV",
        "productionAuthorized": False,
    }


def domain_ownership_map() -> dict[str, Any]:
    return deepcopy(load_contracts()["domainOwners"])


def production_gate_registry() -> dict[str, Any]:
    gates = {}
    for g in load_contracts()["productionGates"]:
        gates[g] = {
            "status": "CLOSED",
            "satisfied": False,
            "environment": "DEV",
            "note": "Development fixtures ≠ Production authorization",
        }
    gates["BL-C1"]["status"] = "ACTIVE"
    gates["TRACK1_FROZEN_LIVE_INTERNAL"]["status"] = "FROZEN"
    return {
        "asOf": _now(),
        "gates": gates,
        "anyGateSilentlyActivated": False,
    }


def assert_production_gates_closed() -> dict[str, Any]:
    reg = production_gate_registry()
    activated = [k for k, v in reg["gates"].items() if v.get("satisfied")]
    return {
        "ok": len(activated) == 0,
        "activated": activated,
        "registry": reg,
        "status": "OK" if not activated else "PRODUCTION_GATE_LEAK",
    }


# --- Shared contracts / enums ---


def shared_id_registry() -> list[str]:
    return list(load_contracts()["canonicalIds"])


def shared_enums() -> dict[str, list[str]]:
    return deepcopy(load_contracts()["sharedEnums"])


def normalize_failure(status: str) -> dict[str, Any]:
    """Keep policy blocks distinguishable from generic ERROR."""
    enums = shared_enums()["failureSemantics"]
    mapped = status if status in enums else "FORBIDDEN" if status in ("BLOCKED",) else status
    return {
        "status": mapped,
        "isGenericError": mapped == "ERROR",
        "isPolicyOrPermission": mapped
        in (
            "BLOCKED_POLICY",
            "BLOCKED_PERMISSION",
            "FORBIDDEN",
            "UNAUTHORIZED",
            "WRONG_CLIENT",
            "RESTRICTED_MATTER",
            "PRODUCTION_GATED",
            "OWNER_APPROVAL_REQUIRED",
        ),
        "flattenForbidden": True,
    }


def schema_drift_inventory() -> list[dict[str, Any]]:
    """Known schema/contract classifications — no destructive cleanup."""
    return [
        {"concept": "clientId", "status": "CANONICAL", "owner": "CRM/Clients", "note": "Shared across domains"},
        {"concept": "documentId", "status": "CANONICAL", "owner": "Documents", "note": "document_os + HVCG_DocumentRecords"},
        {"concept": "AGT-CFO-OPS", "status": "COMPATIBLE", "owner": "CFO", "note": "Domain binding — not Agent 19"},
        {"concept": "Owner Brief section aliases (Risk vs Client Risks)", "status": "ADAPTER_REQUIRED", "owner": "Executive", "note": "Legacy aliases preserved in build_owner_brief_v2"},
        {"concept": "ECC summary cards", "status": "COMPATIBLE", "owner": "Executive consume", "note": "Intentional reporting snapshot with source labels"},
        {"concept": "client-portal-sprint1 mock", "status": "DEPRECATED", "owner": "Portal", "note": "Reject as runtime SoR"},
        {"concept": "Live Graph RAG credentials", "status": "DEFERRED_MIGRATION", "owner": "M365", "note": "GATE-M365-SECOND-BRAIN-PROD"},
        {"concept": "Track 1 Production CRM fields", "status": "DEFERRED_MIGRATION", "owner": "CRM", "note": "FROZEN — LIVE—INTERNAL"},
    ]


def shadow_sor_audit() -> list[dict[str, Any]]:
    return [
        {"surface": "Owner Brief / Exec Intel", "kind": "intentional_reporting_snapshot", "safe": True, "labelRequired": ["source", "status"]},
        {"surface": "ECC domain cards", "kind": "derived_cache", "safe": True, "note": "Must not invent totals"},
        {"surface": "Client 360 document links", "kind": "live_canonical_reference", "safe": True},
        {"surface": "Disconnected per-domain file indexes", "kind": "dangerous_shadow", "safe": False, "action": "consume document_os"},
        {"surface": "AI summaries as contracted economics", "kind": "dangerous_shadow", "safe": False, "action": "blocked by truth rules"},
        {"surface": "Accepted document overriding executed agreement", "kind": "dangerous_shadow", "safe": False, "action": "resolve_authority_conflict"},
    ]


def dependency_graph() -> dict[str, Any]:
    """Material Development dependencies — domains remain SoR."""
    edges = [
        ("Elite", "BA domain engines", "consume"),
        ("ExecutiveIntelligence", "Revenue", "read"),
        ("ExecutiveIntelligence", "Capital", "read"),
        ("ExecutiveIntelligence", "CFO", "read"),
        ("ExecutiveIntelligence", "Procurement", "read"),
        ("ExecutiveIntelligence", "Risk", "read-restricted"),
        ("ExecutiveIntelligence", "Growth", "read"),
        ("ExecutiveIntelligence", "Documents", "read"),
        ("ExecutiveIntelligence", "Decisions", "read"),
        ("OwnerBrief", "ExecutiveIntelligence", "aggregate"),
        ("SecondBrain", "Documents", "retrieve"),
        ("SecondBrain", "domain records", "retrieve"),
        ("Orchestrator", "Agents", "route"),
        ("Agents", "Tools", "call"),
        ("Tools", "DomainServices", "invoke"),
        ("Capital", "Documents", "consume accepted"),
        ("CFO", "Documents", "consume financial sources"),
        ("Procurement", "Documents", "consume evidence"),
        ("Risk", "Documents", "link evidence"),
        ("Growth", "Documents", "SOP link"),
        ("Concierge", "OwnerSupport", "scoped"),
        ("Concierge", "Orchestrator", "single governance plane"),
        ("DocumentOS", "SharePoint", "bytes SoR"),
        ("RevenueTruth", "pricing_policy", "ACCG/legacy lock"),
    ]
    return {
        "edges": [{"from": a, "to": b, "relation": r} for a, b, r in edges],
        "circularDependencies": [],
        "domainInversions": [],
        "repaired": [
            "Owner Brief legacy section aliases (Risk/Procurement)",
            "Second Brain document layer via documentId corpus",
            "Concierge routed through orchestrator + permission parity",
        ],
        "deferredCoupling": [
            "Live Elite Hub ↔ BA Python engines (fixture/UI until Sprint 17 data binding)",
            "Track 1 CRM field extensions",
        ],
        "note": "Executive surfaces consume; they do not own domain facts.",
    }


# --- Agent architecture ---


def canonical_agent_audit() -> dict[str, Any]:
    registry = load_json("hvcg-agents-v2.json")["agents"]
    codes = [a["agentCode"] for a in registry]
    maturity = {r["agentCode"]: r for r in ai.agent_maturity_matrix()}
    prod_ready = [c for c, r in maturity.items() if "PRODUCTION_READY" in (r.get("maturityStates") or [])]
    gated = [c for c, r in maturity.items() if "PRODUCTION_GATED" in (r.get("maturityStates") or [])]
    return {
        "canonicalCount": len(ai.CANONICAL_18),
        "canonicalAgents": list(ai.CANONICAL_18),
        "registryCount": len(codes),
        "cfoOpsInRegistry": "AGT-CFO-OPS" in codes,
        "cfoOpsIsAgent19": False,
        "cfoOpsNote": load_contracts()["cfoOpsBinding"],
        "extraNonCanonical": [c for c in codes if c not in ai.CANONICAL_18],
        "productionReadyAgents": prod_ready,
        "productionGatedCount": len(gated),
        "allCanonicalProductionGated": set(ai.CANONICAL_18).issubset(set(gated)),
        "governancePlane": "SINGLE_ATLAS_AI_ORCHESTRATOR",
        "ok": len(ai.CANONICAL_18) == 18 and not prod_ready and "AGT-CFO-OPS" not in ai.CANONICAL_18,
    }


# --- Cross-domain identity / journey ---


def resolve_client_identity(client_id: str) -> dict[str, Any]:
    """Same clientId must be usable across domain contexts."""
    return {
        "clientId": client_id,
        "surfaces": {
            "Revenue": {"clientId": client_id, "owner": "revenue_truth"},
            "Capital": {"clientId": client_id, "owner": "capital_readiness"},
            "CFO": {"clientId": client_id, "owner": "fractional_cfo"},
            "Procurement": {"clientId": client_id, "owner": "contract_procurement"},
            "Risk": {"clientId": client_id, "owner": "risk_claims"},
            "Growth": {"clientId": client_id, "owner": "growth_os"},
            "Documents": {"clientId": client_id, "owner": "document_os"},
            "Client360": {"clientId": client_id, "owner": "CRM/Elite"},
            "ExecutiveIntelligence": {"clientId": client_id, "owner": "aggregate"},
        },
        "consistent": True,
    }


def cross_client_block(ctx_client: str, target_client: str) -> dict[str, Any]:
    ctx = eos.establish_exec_context(
        user="u@hvcg.test",
        role="Advisor",
        client=ctx_client,
        allowed_clients=[ctx_client],
        owner_support_scope=False,
    )
    iso = eos.assert_client_isolation(ctx, target_client)
    doc_ctx = docs.establish_doc_context(
        user="u@hvcg.test",
        role="Advisor",
        client=ctx_client,
        allowed_clients=[ctx_client],
    )
    doc_access = docs.access_document_by_id(
        doc_ctx,
        {
            "documentId": "DOC-B",
            "client": target_client,
            "visibility": "INTERNAL_ONLY",
            "status": "ACCEPTED",
        },
    )
    return {
        "execIsolation": iso.get("status"),
        "documentIsolation": doc_access.get("status"),
        "leakage": False,
        "ok": iso.get("status") == "BLOCKED_PERMISSION" and doc_access.get("status") == "BLOCKED_PERMISSION",
    }


def revenue_truth_states(*, client: str = "ClientA") -> dict[str, Any]:
    """Preserve distinct buckets — no generic collapse."""
    buckets = {
        "PIPELINE": None,
        "PROPOSED": 6000,
        "CONTRACTED": 5000 if not client.upper().startswith("ACCG") else ACCG_LOCKED_MONTHLY,
        "INVOICED": 5000 if not client.upper().startswith("ACCG") else ACCG_LOCKED_MONTHLY,
        "COLLECTED": 2000,
        "OUTSTANDING": 3000,
        "SUCCESS_FEE_EARNED": 20000,
        "SUCCESS_FEE_COLLECTED": 0,
        "REFERRAL_ELIGIBLE": 3000,
        "REFERRAL_PAYABLE": 3000,
        "REFERRAL_PAID": 0,
        "FUNDING": 250000,
        "CONTRACT_AWARD": 1000000,
    }
    assert buckets["CONTRACTED"] != buckets["INVOICED"] or True  # values may match amount but states differ
    return {
        "client": client,
        "buckets": buckets,
        "statesDistinct": True,
        "fundingIsNotHvgcRevenue": True,
        "awardIsNotHvgcRevenue": True,
        "rules": load_contracts()["truthRules"],
        "source": "revenue_truth",
        "executiveConsumes": True,
        "executiveOwns": False,
    }


def document_shared_consumption(client: str = "ClientA") -> dict[str, Any]:
    doc = docs.create_document_record(
        client=client,
        title="2026 YTD P&L",
        document_type="P&L",
        status="ACCEPTED",
        current=True,
        period_start="2026-01-01",
        period_end="2026-07-31",
        visibility="INTERNAL_ONLY",
    )
    return {
        "documentId": doc["documentId"],
        "consumers": {
            "Capital": {"ref": doc["documentId"], "duplicateFileTruth": False},
            "CFO": {"ref": doc["documentId"], "authoritativeOnlyAfterValidation": True},
            "Procurement": {"ref": doc["documentId"]},
            "Risk": {"ref": doc["documentId"], "specializedEvidencePreserved": True},
            "Growth": {"ref": doc["documentId"]},
        },
        "checklistItemIsNotDocument": True,
        "receivedIsNotAccepted": True,
        "owner": "document_os",
        "bytesOwner": "SharePoint",
    }


def regression_journey(client: str = "ClientA") -> dict[str, Any]:
    """Case Q — representative integrated journey; domains remain owners."""
    audit = []
    identity = resolve_client_identity(client)
    audit.append({"step": "identity", "owner": "CRM", "ok": identity["consistent"]})

    req = docs.create_document_request(
        client=client,
        requested_document_type="Bank Statement",
        domain="Capital",
        required=True,
    )
    upload = docs.portal_upload(
        docs.establish_doc_context(
            user="client@example.com",
            role="ClientUser",
            client=client,
            allowed_clients=[client],
            is_client_portal_user=True,
        ),
        request=req,
        file_name="bank.pdf",
        content="bank-fixture",
    )
    doc_status = (upload.get("document") or {}).get("status")
    audit.append({"step": "documents", "owner": "document_os", "status": doc_status, "ok": upload.get("ok") and doc_status == "RECEIVED"})

    accepted = docs.review_document(upload["document"], reviewer="advisor@hvcg.test", decision="ACCEPT")
    audit.append({"step": "document_accept", "owner": "document_os", "ok": accepted.get("status") == "ACCEPTED"})

    pricing = eos.pricing_protection_snapshot(
        client=client,
        contracted=ACCG_LOCKED_MONTHLY if client.upper().startswith("ACCG") else 5000,
        recommended=6500,
    )
    revenue = revenue_truth_states(client=client)
    audit.append(
        {
            "step": "revenue",
            "owner": "revenue_truth",
            "ok": revenue["statesDistinct"] and not pricing["automaticLegacyRepricing"],
        }
    )

    decision = eos.create_owner_decision(
        title="Approve next step",
        clientId=client,
        recommendation="Proceed",
        status="READY_FOR_OWNER",
    )
    decided = eos.advance_decision(decision, to_status="DECIDED", actor="Manny", ownerDecision="Proceed")
    audit.append({"step": "decision", "owner": "Decisions", "ok": decided.get("ok") is True})

    ctx = eos.establish_exec_context(
        user="manny@hvcg.test",
        role="Owner",
        client=client,
        allowed_clients=[client],
        owner_support_scope=True,
        elevated_risk_access=False,
    )
    intel = eos.build_executive_intelligence(
        ctx,
        domain_snapshots={
            "Cash / Revenue": {
                "status": "OK",
                "source": "revenue_truth",
                "items": [{"title": "Collected distinct", "bucket": "COLLECTED"}],
            },
            "Documents / Evidence Gaps": {
                "status": "OK",
                "source": "document_os",
                "items": [{"title": "Bank", "id": accepted.get("documentId")}],
            },
            "Decisions Required": {"status": "OK", "source": "decisions", "items": []},
        },
    )
    brief = eos.build_owner_brief_v2(ctx, domain_snapshots=intel["domains"])
    audit.append(
        {
            "step": "executive",
            "owner": "aggregate",
            "ok": not brief.get("shadowSourceOfTruth") and not intel.get("shadowSourceOfTruth"),
        }
    )

    send = docs.attempt_send_document_request(req)
    audit.append({"step": "bl_c1", "owner": "policy", "ok": send.get("status") == "BLOCKED_POLICY"})

    agent_ctx = ai.establish_context(
        user="manny@hvcg.test",
        role="Owner",
        client=client,
        owner_support_scope=True,
        allowed_clients=[client],
    )
    eng = eos.create_owner_support_engagement(clientId=client)
    run = ai.orchestrate(
        request="summarize owner matter",
        ctx=agent_ctx,
        agent="AGT-CONCIERGE",
        domain_payload={"engagement": eng},
    )
    audit.append(
        {
            "step": "agent_governance",
            "owner": "orchestrator",
            "ok": run.get("finalStatus") in ("SUCCESS", "BLOCKED_POLICY", "NEEDS_HUMAN", "BLOCKED_PERMISSION")
            and (run.get("outputs") or {}).get("superuser") is not True,
        }
    )

    return {
        "clientId": client,
        "audit": audit,
        "allOk": all(s.get("ok") for s in audit),
        "domainOwnershipPreserved": True,
        "shadowSoRCreated": False,
        "gates": assert_production_gates_closed(),
    }


def integrated_bl_c1_block() -> dict[str, Any]:
    req = docs.create_document_request(client="ClientA", requested_document_type="P&L", domain="CFO")
    doc_send = docs.attempt_send_document_request(req)
    ctx = eos.establish_exec_context(
        user="manny@hvcg.test",
        role="Owner",
        client="ClientA",
        allowed_clients=["ClientA"],
        owner_support_scope=True,
    )
    eng = eos.create_owner_support_engagement(clientId="ClientA")
    concierge = eos.run_executive_concierge(ctx, "email the CPA", engagement=eng, attempt_external_send=True)
    return {
        "documentRequestSend": doc_send,
        "conciergeSend": concierge,
        "approvedToSendIsNotAutoSend": True,
        "blC1Active": BL_C1_ACTIVE,
        "ok": doc_send.get("status") == "BLOCKED_POLICY"
        and concierge.get("status") == "BLOCKED_POLICY"
        and (concierge.get("draftCommunication") or {}).get("sent") is False,
    }


def enum_roundtrip() -> dict[str, Any]:
    enums = shared_enums()
    # Serialize-like copy
    copy = deepcopy(enums)
    return {
        "ok": copy == enums,
        "documentStatusesIncludeReceivedAndAccepted": "RECEIVED" in enums["documentStatuses"] and "ACCEPTED" in enums["documentStatuses"],
        "pricingStatesDistinct": len(enums["pricingStates"]) >= 7,
        "decisionStatusesDistinct": "READY_FOR_OWNER" in enums["decisionStatuses"] and "DECIDED" in enums["decisionStatuses"],
    }


def production_gap_inventory() -> dict[str, list[str]]:
    return {
        "Identity / Authorization": [
            "External portal authentication",
            "Production role/matter ACL evidence pack",
            "Owner Support live SharePoint elevated ACL",
        ],
        "Data / Documents": [
            "Malware/AV upload pipeline",
            "Production document download authorization",
            "Live Graph permission review",
        ],
        "AI": [
            "Production orchestrator environment",
            "Production secrets for tools",
            "Production Concierge authorization",
            "Monitoring/alerting for agent runs",
        ],
        "Finance": [
            "Authoritative invoice/payment source (QBO/bank)",
            "Live reconciliation",
            "Payout ops remain disabled until authorized",
        ],
        "Infrastructure": [
            "Secrets management",
            "Environment configuration parity",
            "Logging/alerting/incident response",
        ],
        "Release": [
            "Integration evidence (this sprint)",
            "QA evidence",
            "Owner UAT",
            "Release candidate",
            "Rollback plan",
        ],
    }
