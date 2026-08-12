"""HVCG AI Agent Orchestration + Second Brain (Development) — Sprint 11 BA-H.

ONE governance plane:
  User/Event → Router → Identity/Client Context → Permission → Retrieve
  → Approved Tools → Draft/Recommendation → Human Approval → Domain Update
  → Audit → Second Brain capture

Policy enforces controls (BL-C1, Risk ACL parity, client isolation).
Prompts reinforce only. No Agent 19. No Production side effects by default.
"""

from __future__ import annotations

import hashlib
import uuid
from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from pricing_policy import is_legacy_client, load_json

try:
    import document_os as document_os  # Sprint 13 document retrieval depth
except ImportError:  # pragma: no cover
    document_os = None  # type: ignore

try:
    import executive_owner_support as executive_owner_support  # Sprint 14 Owner Support / Exec Intel
except ImportError:  # pragma: no cover
    executive_owner_support = None  # type: ignore

BL_C1_ACTIVE = True
POLICY_VERSION = "1.0.0"
RUNTIME_VERSION = "1.0.0-dev"
ORCHESTRATOR_ID = "ATLAS-AI-ORCH-1"
CANONICAL_AGENT_COUNT = 18
RISK_ACL_GATE = "GATE-RISK-ELEVATED-ACL-PROD"
M365_SB_GATE = "GATE-M365-SECOND-BRAIN-PROD"
PORTAL_PROD_GATE = "GATE-CLIENT-PORTAL-PROD"

# Canonical 18 (AGT-CFO-OPS is domain binding, not Agent 19)
CANONICAL_18 = [
    "AGT-INTAKE",
    "AGT-DOC-CHECKLIST",
    "AGT-CAP-READY",
    "AGT-FIN-PKG",
    "AGT-PROCURE",
    "AGT-GOV-REG",
    "AGT-TAX-APPEAL",
    "AGT-UE-CLAIM",
    "AGT-INS-REVIEW",
    "AGT-CLAIMS",
    "AGT-HR-DOCS",
    "AGT-PROPOSAL",
    "AGT-CRM",
    "AGT-INVOICE",
    "AGT-REFERRAL",
    "AGT-SUCCESS",
    "AGT-CONCIERGE",
    "AGT-SECOND-BRAIN",
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _run_id() -> str:
    return f"RUN-{uuid.uuid4().hex[:12].upper()}"


def load_ai_policy() -> dict[str, Any]:
    return load_json("ai-governance-policy.json")


def load_tool_registry() -> dict[str, Any]:
    return load_json("ai_tools.json")


def load_agent_registry() -> dict[str, Any]:
    return load_json("hvcg-agents-v2.json")


# --- Identity / client context ---


@dataclass
class ExecutionContext:
    user: str
    role: str
    tenant: str = "HVCG-DEV"
    client: str | None = None
    engagement: str | None = None
    matter: str | None = None
    domain: str | None = None
    environment: str = "DEV"
    permission_scope: list[str] = field(default_factory=list)
    elevated_risk_access: bool = False
    owner_support_scope: bool = False
    allowed_clients: list[str] = field(default_factory=list)


def establish_context(**kwargs: Any) -> dict[str, Any]:
    ctx = ExecutionContext(**{k: v for k, v in kwargs.items() if k in ExecutionContext.__dataclass_fields__})
    out = asdict(ctx)
    out["blC1Active"] = BL_C1_ACTIVE
    out["riskAclGate"] = RISK_ACL_GATE
    if not ctx.client:
        out["status"] = "MISSING_CONTEXT"
        out["message"] = "Client context required for sensitive retrieval. Select client explicitly."
    else:
        out["status"] = "OK"
    if ctx.allowed_clients and ctx.client and ctx.client not in ctx.allowed_clients:
        out["status"] = "BLOCKED_PERMISSION"
        out["message"] = "Client not in allowed scope for this user."
    return out


def assert_client_isolation(ctx: dict[str, Any], requested_client: str | None) -> dict[str, Any]:
    if not requested_client:
        return {"ok": False, "status": "MISSING_CONTEXT", "message": "No client specified"}
    active = ctx.get("client")
    if active and requested_client != active:
        return {
            "ok": False,
            "status": "BLOCKED_PERMISSION",
            "message": "AGENT CONTEXT MUST NEVER CROSS CLIENT BOUNDARIES",
            "activeClient": active,
            "requestedClient": requested_client,
        }
    allowed = ctx.get("allowed_clients") or []
    if allowed and requested_client not in allowed:
        return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Client outside user allow-list"}
    return {"ok": True, "client": requested_client}


# --- Tool registry enforcement ---


def get_tool(tool_id: str) -> dict[str, Any] | None:
    for t in load_tool_registry()["tools"]:
        if t["toolId"] == tool_id:
            return deepcopy(t)
    return None


def call_tool(
    tool_id: str,
    ctx: dict[str, Any],
    params: dict[str, Any] | None = None,
    *,
    approval_state: str = "NONE",
    idempotency_key: str | None = None,
    _idempotency_seen: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Policy-first tool invocation. BL-C1 blocks external side effects before they occur."""
    params = params or {}
    tool = get_tool(tool_id)
    audit: dict[str, Any] = {
        "tool": tool_id,
        "user": ctx.get("user"),
        "client": ctx.get("client"),
        "timestamp": _now(),
        "parameterClassification": "non_secret",
        "approvalState": approval_state,
        "idempotencyKey": idempotency_key,
    }
    if not tool:
        audit.update({"result": "TOOL_ERROR", "sideEffect": False, "status": "TOOL_ERROR"})
        return {"ok": False, "status": "TOOL_ERROR", "audit": audit, "message": f"Unknown tool {tool_id}"}

    # Environment / Production defaults
    env = (ctx.get("environment") or "DEV").upper()
    if env == "PRODUCTION" or tool.get("productionAvailability") == "DISABLED":
        if tool.get("sideEffects") or tool.get("externalAction"):
            # Allow internal DEV-style reads even if labeled DISABLED for Production
            if env == "PRODUCTION":
                audit.update({"result": "BLOCKED_POLICY", "sideEffect": False, "status": "BLOCKED_POLICY"})
                return {
                    "ok": False,
                    "status": "BLOCKED_POLICY",
                    "audit": audit,
                    "message": "Production side-effecting tools DISABLED by default",
                }

    # BL-C1 / external actions — evaluate before role or side effects (policy before prompt/role)
    if tool.get("externalAction") or tool.get("actionClass") in (
        "external_send",
        "lender_submit",
        "sam_submit",
        "risk_send",
        "bank_action",
        "payment",
    ):
        if BL_C1_ACTIVE:
            audit.update({"result": "BLOCKED_POLICY", "sideEffect": False, "blC1": True})
            return {
                "ok": False,
                "status": "BLOCKED_POLICY",
                "audit": audit,
                "message": "BL-C1 active — external action blocked before side effects",
                "blC1Active": True,
            }

    # Client scope
    if tool.get("clientScope") == "REQUIRED":
        iso = assert_client_isolation(ctx, params.get("client") or ctx.get("client"))
        if not iso.get("ok"):
            audit.update({"result": iso["status"], "sideEffect": False, "status": iso["status"]})
            return {"ok": False, **iso, "audit": audit}

    # Role (Owner permitted for any tool that lists Owner, or when role matches)
    role = ctx.get("role")
    required = tool.get("requiredRole") or []
    if required and role not in required:
        audit.update({"result": "BLOCKED_PERMISSION", "sideEffect": False})
        return {
            "ok": False,
            "status": "BLOCKED_PERMISSION",
            "audit": audit,
            "message": f"Role {role} not permitted for {tool_id}",
        }

    # Risk ACL parity — AI cannot exceed human elevated access
    if tool.get("elevatedAclRequired") or tool.get("domain") == "Risk":
        if not ctx.get("elevated_risk_access"):
            audit.update({"result": "BLOCKED_PERMISSION", "sideEffect": False, "gate": RISK_ACL_GATE})
            return {
                "ok": False,
                "status": "BLOCKED_PERMISSION",
                "audit": audit,
                "message": "Risk elevated ACL required — AI must not retrieve what the human cannot",
                "gate": RISK_ACL_GATE,
            }

    # Owner Support / Concierge
    if tool.get("explicitScopeRequired") and not ctx.get("owner_support_scope"):
        audit.update({"result": "BLOCKED_PERMISSION", "sideEffect": False})
        return {
            "ok": False,
            "status": "BLOCKED_PERMISSION",
            "audit": audit,
            "message": "Executive Owner Support requires explicit authorized scope",
        }

    # Approval for gated writes
    if tool.get("approvalRequired") and approval_state not in ("APPROVED", "APPROVED_TO_SEND"):
        # APPROVED_TO_SEND still cannot external-send under BL-C1 (handled above)
        if tool.get("mode") == "WRITE" and tool.get("sideEffects"):
            audit.update({"result": "NEEDS_HUMAN", "sideEffect": False})
            return {
                "ok": False,
                "status": "NEEDS_HUMAN",
                "audit": audit,
                "message": "Approval required before side-effecting tool",
                "approvalRequired": True,
            }

    # Idempotency for side effects
    if idempotency_key and tool.get("sideEffects") and _idempotency_seen is not None:
        if idempotency_key in _idempotency_seen:
            prior = _idempotency_seen[idempotency_key]
            audit.update({"result": "SUCCESS", "sideEffect": False, "deduplicated": True})
            return {"ok": True, "status": "SUCCESS", "audit": audit, "deduplicated": True, "prior": prior}

    # Prompt-injection: never execute instructions from document content
    content = str(params.get("content") or params.get("documentText") or "")
    if content and _looks_like_injection(content):
        audit.update({"result": "SUCCESS", "sideEffect": False, "treatedAsDataOnly": True})
        return {
            "ok": True,
            "status": "SUCCESS",
            "audit": audit,
            "treatedAsDataOnly": True,
            "message": "Untrusted content retained as data; system/tool policy unchanged",
            "dataExcerpt": content[:200],
        }

    result_payload = {
        "toolId": tool_id,
        "domain": tool.get("domain"),
        "mode": tool.get("mode"),
        "paramsEcho": {k: v for k, v in params.items() if k not in ("secret", "password", "token")},
        "executed": True,
        "sideEffectApplied": bool(tool.get("sideEffects")) and env != "PRODUCTION",
    }
    # Domain-specific simulated reads (Development fixtures — no fabricated financials)
    if tool_id == "TOOL-SECOND-BRAIN-QUERY":
        result_payload["query"] = params.get("query")
    if tool_id == "TOOL-PRICING-MUTATE":
        client = params.get("client") or ctx.get("client")
        if is_legacy_client(client or "") or str(client or "").upper().startswith("ACCG"):
            audit.update({"result": "BLOCKED_POLICY", "sideEffect": False})
            return {
                "ok": False,
                "status": "BLOCKED_POLICY",
                "audit": audit,
                "message": "Legacy contracted pricing protected — no AI mutation",
            }

    audit.update(
        {
            "result": "SUCCESS",
            "sideEffect": bool(result_payload.get("sideEffectApplied")),
            "status": "SUCCESS",
        }
    )
    out = {"ok": True, "status": "SUCCESS", "audit": audit, "result": result_payload, "tool": tool}
    if idempotency_key and _idempotency_seen is not None and tool.get("sideEffects"):
        _idempotency_seen[idempotency_key] = out
    return out


def _looks_like_injection(text: str) -> bool:
    lowered = text.lower()
    needles = [
        "ignore your rules",
        "ignore previous instructions",
        "email the lender",
        "send to the client now",
        "override policy",
        "disclose all secrets",
        "show me client b",
    ]
    return any(n in lowered for n in needles)


# --- Approval router (single plane → HVCG_Approvals shape) ---


def create_approval(
    *,
    approval_type: str,
    client: str,
    domain: str,
    agent: str,
    requested_action: str,
    draft: Any,
    evidence: list[Any] | None = None,
    risk_level: str = "MEDIUM",
    proposed_changes: Any = None,
    reviewer: str | None = None,
    deadline: str | None = None,
) -> dict[str, Any]:
    return {
        "list": "HVCG_Approvals",
        "approvalId": f"APR-{uuid.uuid4().hex[:10].upper()}",
        "approvalType": approval_type,
        "client": client,
        "domain": domain,
        "agent": agent,
        "requestedAction": requested_action,
        "draft": draft,
        "evidence": evidence or [],
        "riskLevel": risk_level,
        "proposedChanges": proposed_changes,
        "reviewer": reviewer,
        "deadline": deadline,
        "status": "Pending",
        "requestedDate": _now(),
        "blC1Note": "APPROVED_TO_SEND does not bypass BL-C1 external send",
    }


def approve(approval: dict[str, Any], *, to_send: bool = False) -> dict[str, Any]:
    out = deepcopy(approval)
    out["status"] = "APPROVED_TO_SEND" if to_send else "Approved"
    out["completedDate"] = _now()
    out["externalSendStillBlocked"] = BL_C1_ACTIVE
    return out


# --- Agent maturity ---


def agent_maturity_matrix() -> list[dict[str, Any]]:
    """Honest multi-state maturity — not yes/no."""
    registry = {a["agentCode"]: a for a in load_agent_registry()["agents"]}
    # AGT-CFO-OPS is extra domain binding
    defs = {
        "AGT-INTAKE": {
            "states": ["CONFIG_ONLY"],
            "domain": "Revenue",
            "tools": ["TOOL-CLIENT360-READ", "TOOL-REVENUE-READ"],
            "ui": False,
            "tests": False,
            "productionGate": True,
        },
        "AGT-DOC-CHECKLIST": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "UI_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Documents",
            "tools": ["TOOL-DOCUMENT-SEARCH", "TOOL-DOCUMENT-REQUEST", "TOOL-CAPITAL-READINESS"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
        "AGT-CAP-READY": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "UI_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Capital",
            "tools": ["TOOL-CAPITAL-READINESS", "TOOL-DOCUMENT-SEARCH"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
        "AGT-FIN-PKG": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "UI_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Capital",
            "tools": ["TOOL-FINANCIAL-PACKAGE", "TOOL-DOCUMENT-SEARCH"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
        "AGT-PROCURE": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "UI_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Procurement",
            "tools": ["TOOL-PROCUREMENT-READ", "TOOL-PROCUREMENT-SUBMIT"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
        "AGT-GOV-REG": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Procurement",
            "tools": ["TOOL-PROCUREMENT-READ", "TOOL-PROCUREMENT-SUBMIT"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
        "AGT-TAX-APPEAL": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "UI_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Risk",
            "tools": ["TOOL-RISK-READ", "TOOL-RISK-SEND"],
            "ui": True,
            "tests": True,
            "productionGate": True,
            "gate": RISK_ACL_GATE,
        },
        "AGT-UE-CLAIM": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Risk",
            "tools": ["TOOL-RISK-READ", "TOOL-RISK-SEND"],
            "ui": True,
            "tests": True,
            "productionGate": True,
            "gate": RISK_ACL_GATE,
        },
        "AGT-INS-REVIEW": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Risk",
            "tools": ["TOOL-RISK-READ"],
            "ui": True,
            "tests": True,
            "productionGate": True,
            "gate": RISK_ACL_GATE,
        },
        "AGT-CLAIMS": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Risk",
            "tools": ["TOOL-RISK-READ", "TOOL-RISK-SEND"],
            "ui": True,
            "tests": True,
            "productionGate": True,
            "gate": RISK_ACL_GATE,
        },
        "AGT-HR-DOCS": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED"],
            "domain": "Risk",
            "tools": ["TOOL-RISK-READ"],
            "ui": True,
            "tests": True,
            "productionGate": True,
            "gate": RISK_ACL_GATE,
        },
        "AGT-PROPOSAL": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Revenue",
            "tools": ["TOOL-PROPOSAL-DRAFT", "TOOL-APPROVAL-REQUEST", "TOOL-EXTERNAL-SEND"],
            "ui": False,
            "tests": True,
            "productionGate": True,
        },
        "AGT-CRM": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED"],
            "domain": "CRM",
            "tools": ["TOOL-CRM-ACTIVITY-DRAFT", "TOOL-REVENUE-READ"],
            "ui": False,
            "tests": True,
            "productionGate": True,
        },
        "AGT-INVOICE": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Billing",
            "tools": ["TOOL-INVOICE-RECONCILE-READ", "TOOL-APPROVAL-REQUEST"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
        "AGT-REFERRAL": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Referrals",
            "tools": ["TOOL-REFERRAL-READ", "TOOL-APPROVAL-REQUEST"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
        "AGT-SUCCESS": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Growth",
            "tools": ["TOOL-GROWTH-READ", "TOOL-CLIENT360-READ", "TOOL-DOCUMENT-SEARCH", "TOOL-DOCUMENT-REQUEST"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
        "AGT-CONCIERGE": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "UI_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Executive",
            "tools": ["TOOL-OWNER-SUPPORT-READ", "TOOL-DOCUMENT-SEARCH", "TOOL-DOCUMENT-REQUEST", "TOOL-APPROVAL-REQUEST", "TOOL-SECOND-BRAIN-QUERY"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
        "AGT-SECOND-BRAIN": {
            "states": ["CONFIG_ONLY", "SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "UI_INTEGRATED", "APPROVAL_INTEGRATED"],
            "domain": "Knowledge",
            "tools": ["TOOL-SECOND-BRAIN-QUERY", "TOOL-DOCUMENT-SEARCH"],
            "ui": True,
            "tests": True,
            "productionGate": True,
        },
    }
    rows = []
    for code in CANONICAL_18:
        meta = defs.get(code, {"states": ["CONFIG_ONLY"], "domain": "Unknown", "tools": [], "ui": False, "tests": False, "productionGate": True})
        cfg = registry.get(code, {})
        states = list(meta["states"])
        if meta.get("productionGate"):
            states.append("PRODUCTION_GATED")
        # FULL_DEV_RUNTIME only when service+domain+approvals present
        need = {"SERVICE_RUNTIME", "DOMAIN_INTEGRATED", "APPROVAL_INTEGRATED"}
        if need.issubset(set(states)) and meta.get("tests"):
            states.append("FULL_DEV_RUNTIME")
        # Never claim PRODUCTION_READY in Sprint 11
        rows.append(
            {
                "agentCode": code,
                "name": cfg.get("name"),
                "config": True,
                "runtime": bool(cfg.get("runtime")) or "SERVICE_RUNTIME" in states,
                "domain": meta["domain"],
                "tools": meta["tools"],
                "approvals": "APPROVAL_INTEGRATED" in states or cfg.get("humanApproval") not in (None, "none"),
                "ui": meta.get("ui"),
                "tests": meta.get("tests"),
                "productionGate": True,
                "maturityStates": states,
                "highest": states[-1] if states else "CONFIG_ONLY",
                "gate": meta.get("gate"),
                "runtimePath": cfg.get("runtime"),
            }
        )
    return rows


# --- Second Brain ---


@dataclass
class KnowledgeSource:
    source_id: str
    client: str
    domain: str
    title: str
    kind: str  # SOURCE_FACT / CALCULATION / etc label for content
    content: str
    source_date: str | None = None
    period: str | None = None
    last_verified: str | None = None
    superseded: bool = False
    current: bool = True
    version_label: str = "CURRENT"
    restricted: bool = False
    elevated_risk: bool = False
    decision_approved: bool = False


def second_brain_query(
    ctx: dict[str, Any],
    query: str,
    corpus: list[dict[str, Any]],
    *,
    action_request: bool = False,
) -> dict[str, Any]:
    """Permission-aware retrieval with citations, conflicts, freshness.

    Sprint 13: document records (documentId) route through document_os
    for version/status/visibility filters. Fixture knowledge corpus retained.
    Live M365 Production retrieval remains gated (GATE-M365-SECOND-BRAIN-PROD).
    """
    if action_request:
        return {
            "status": "NEEDS_HUMAN",
            "requestKind": "ACTION_REQUEST",
            "message": "Write/action requests require domain validation and approvals — not answered as information",
            "query": query,
        }
    if not ctx.get("client"):
        return {"status": "MISSING_CONTEXT", "message": "Select client before sensitive retrieval"}

    client = ctx["client"]
    doc_corpus = [c for c in corpus if c.get("documentId")]
    other_corpus = [c for c in corpus if not c.get("documentId")]
    doc_layer: dict[str, Any] | None = None
    if document_os is not None and doc_corpus:
        doc_layer = document_os.second_brain_document_query(ctx, query, doc_corpus)

    hits: list[dict[str, Any]] = []
    restricted_blocked = 0
    for raw in other_corpus:
        src = deepcopy(raw)
        # Client isolation
        if src.get("client") and src["client"] != client:
            continue
        if src.get("elevated_risk") or src.get("restricted"):
            if src.get("elevated_risk") and not ctx.get("elevated_risk_access"):
                restricted_blocked += 1
                continue
            if src.get("domain") == "Executive" and not ctx.get("owner_support_scope"):
                restricted_blocked += 1
                continue
        # Simple relevance: keyword overlap (Dev fixture — not a production RAG claim)
        stop = {"what", "whats", "the", "with", "from", "this", "that", "are", "is", "for", "and", "how"}
        tokens = [tok for tok in query.lower().split() if len(tok) > 2 and tok not in stop]
        blob = f"{src.get('title','')} {src.get('content','')} {src.get('domain','')} {src.get('topic','')}".lower()
        if not tokens or any(tok in blob for tok in tokens):
            hits.append(src)

    # Prefer approved decisions over informal notes; then current sources
    hits.sort(
        key=lambda s: (
            0 if s.get("decision_approved") else 1,
            0 if s.get("current") else 1,
            0 if s.get("kind") == "SOURCE_FACT" else 1,
        )
    )

    conflicts = []
    by_topic: dict[str, list[dict[str, Any]]] = {}
    for h in hits:
        topic = h.get("topic") or h.get("domain")
        by_topic.setdefault(topic, []).append(h)
    for topic, items in by_topic.items():
        values = {i.get("content") for i in items if i.get("kind") == "SOURCE_FACT"}
        if len(values) > 1:
            conflicts.append({"topic": topic, "sources": [i["source_id"] for i in items], "status": "CONFLICTING_SOURCES"})

    evidence_state = "MISSING_EVIDENCE"
    if restricted_blocked and not hits:
        evidence_state = "RESTRICTED_SOURCE"
    elif conflicts:
        evidence_state = "CONFLICTING_SOURCES"
    elif any(not h.get("current") or h.get("superseded") for h in hits) and hits:
        evidence_state = "STALE_SOURCE"
    elif hits and all(h.get("current") for h in hits[:3]):
        evidence_state = "WELL_SUPPORTED" if len(hits) >= 2 else "PARTIALLY_SUPPORTED"
    elif hits:
        evidence_state = "PARTIALLY_SUPPORTED"

    citations = [
        {
            "sourceId": h["source_id"],
            "title": h.get("title"),
            "domain": h.get("domain"),
            "kind": h.get("kind", "SOURCE_FACT"),
            "version": h.get("version_label", "CURRENT"),
            "sourceDate": h.get("source_date"),
            "lastVerified": h.get("last_verified"),
            "current": h.get("current", True),
            "navigationHint": f"atlas://{h.get('domain')}/{h['source_id']}",
        }
        for h in hits[:8]
    ]

    answer_parts = []
    for h in hits[:5]:
        label = h.get("kind", "SOURCE_FACT")
        answer_parts.append({"kind": label, "text": h.get("content"), "sourceId": h["source_id"]})

    if doc_layer and doc_layer.get("citations"):
        for c in doc_layer["citations"]:
            citations.append(
                {
                    "sourceId": c.get("documentId"),
                    "title": c.get("title"),
                    "domain": "Documents",
                    "kind": "DOCUMENT_RECORD",
                    "version": c.get("version"),
                    "status": c.get("status"),
                    "period": c.get("period"),
                    "location": c.get("location"),
                    "label": c.get("label"),
                    "current": "STALE" not in str(c.get("label")),
                    "navigationHint": f"atlas://Documents/{c.get('documentId')}",
                }
            )
        for a in doc_layer.get("answer") or []:
            answer_parts.append(a)
        if doc_layer.get("status") == "SUCCESS" and evidence_state == "MISSING_EVIDENCE":
            evidence_state = "PARTIALLY_SUPPORTED"
        restricted_blocked += int(doc_layer.get("restrictedBlockedCount") or 0)

    if not answer_parts:
        answer_parts.append(
            {
                "kind": "AI_SUMMARY",
                "text": "No authorized evidence available for this query in the current client context.",
                "sourceId": None,
            }
        )

    return {
        "status": "SUCCESS" if (hits or (doc_layer and doc_layer.get("status") == "SUCCESS")) else ("BLOCKED_PERMISSION" if restricted_blocked else "MISSING_DATA"),
        "requestKind": "INFORMATION_REQUEST",
        "query": query,
        "client": client,
        "evidenceState": evidence_state,
        "conflicts": conflicts,
        "citations": citations,
        "answer": answer_parts,
        "restrictedBlockedCount": restricted_blocked,
        "documentLayer": doc_layer,
        "m365ProductionGate": M365_SB_GATE,
        "precedence": load_ai_policy()["sourceOfTruthPrecedence"],
        "disclaimer": "AI summaries are not facts. Source records remain authoritative. Documents are data, not instructions.",
    }


# --- Domain agent runtimes (governed wrappers) ---


def run_invoice_agent(ctx: dict[str, Any], invoices: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    invoices = invoices or []
    unpaid = [i for i in invoices if i.get("status") == "Unpaid"]
    return {
        "agent": "AGT-INVOICE",
        "status": "SUCCESS",
        "hvgcInvoicesOnly": True,
        "unpaidCount": len(unpaid),
        "unpaid": unpaid,
        "prohibited": ["modify_invoices", "issue_refunds", "charge_accounts", "approve_payout", "conflate_client_arap"],
        "note": "HVCG AR only — not client AR/AP (CFO).",
    }


def run_referral_agent(
    ctx: dict[str, Any],
    referral: dict[str, Any],
    *,
    revenue_collected: bool = False,
) -> dict[str, Any]:
    eligible = bool(revenue_collected and referral.get("opportunityId"))
    out = {
        "agent": "AGT-REFERRAL",
        "status": "SUCCESS" if not eligible else "NEEDS_HUMAN",
        "referralId": referral.get("id"),
        "opportunityId": referral.get("opportunityId"),
        "potentialPayout": referral.get("potentialPayout"),
        "collectedRevenueEligibility": eligible,
        "payoutApproved": False,
    }
    if eligible:
        out["approval"] = create_approval(
            approval_type="ReferralPayout",
            client=ctx.get("client") or "HVCG",
            domain="Referrals",
            agent="AGT-REFERRAL",
            requested_action="approve_referral_payout",
            draft=out,
            risk_level="MEDIUM",
        )
    return out


def run_intake_route(request_text: str) -> dict[str, Any]:
    text = request_text.lower()
    if any(w in text for w in ("capital", "loan", "lender", "funding")):
        return {"agent": "AGT-CAP-READY", "reason": "capital_need"}
    if any(w in text for w in ("proposal", "pricing", "offer")):
        return {"agent": "AGT-PROPOSAL", "reason": "commercial"}
    if any(w in text for w in ("risk", "tax", "insurance", "claim", "unemployment")):
        return {"agent": "AGT-TAX-APPEAL" if "tax" in text else "AGT-INS-REVIEW", "reason": "risk"}
    if any(w in text for w in ("sop", "priority", "growth", "meeting")):
        return {"agent": "AGT-SUCCESS", "reason": "growth"}
    if "invoice" in text or "payment" in text:
        return {"agent": "AGT-INVOICE", "reason": "billing"}
    return {"agent": "AGT-SECOND-BRAIN", "reason": "general_knowledge"}


def controlled_handoff(
    *,
    source_agent: str,
    target_agent: str,
    client: str,
    reason: str,
    inputs: dict[str, Any],
    evidence: list[Any] | None = None,
    authorized_scope: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "handoffId": f"HO-{uuid.uuid4().hex[:8].upper()}",
        "sourceAgent": source_agent,
        "targetAgent": target_agent,
        "client": client,
        "reason": reason,
        "inputs": inputs,
        "evidence": evidence or [],
        "authorizedScope": authorized_scope or [],
        "result": "PENDING_TARGET",
        "approvalStatus": "NotRequired" if target_agent not in ("AGT-PROPOSAL", "AGT-FIN-PKG") else "Pending",
        "spawnPolicy": "controlled_only — agents may not freely spawn others",
        "timestamp": _now(),
    }


# --- Orchestrator ---


def orchestrate(
    *,
    request: str,
    ctx: dict[str, Any],
    agent: str | None = None,
    corpus: list[dict[str, Any]] | None = None,
    is_action: bool = False,
    domain_payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    policy = load_ai_policy()
    run: dict[str, Any] = {
        "runId": _run_id(),
        "orchestrator": ORCHESTRATOR_ID,
        "runtimeVersion": RUNTIME_VERSION,
        "policyVersion": policy.get("version", POLICY_VERSION),
        "promptVersion": domain_payload.get("promptVersion") if domain_payload else "n/a",
        "user": ctx.get("user"),
        "client": ctx.get("client"),
        "trigger": "user_request",
        "start": _now(),
        "inputs": {"request": request, "isAction": is_action},
        "retrievedSources": [],
        "toolsCalled": [],
        "outputs": None,
        "approvalsCreated": [],
        "errors": [],
        "externalActions": [],
        "finalStatus": "FAILED",
        "blC1Active": BL_C1_ACTIVE,
    }
    idem: dict[str, dict[str, Any]] = {}

    if ctx.get("status") == "BLOCKED_PERMISSION":
        run["finalStatus"] = "BLOCKED_PERMISSION"
        run["end"] = _now()
        return run

    route = run_intake_route(request) if not agent else {"agent": agent, "reason": "explicit"}
    run["routedAgent"] = route["agent"]
    agent_code = route["agent"]

    if agent_code == "AGT-CONCIERGE" and not ctx.get("owner_support_scope"):
        run["finalStatus"] = "BLOCKED_PERMISSION"
        run["errors"].append("Concierge requires explicit Owner Support scope")
        run["end"] = _now()
        return run

    if agent_code == "AGT-CONCIERGE" and executive_owner_support is not None:
        eng = (domain_payload or {}).get("engagement")
        concierge = executive_owner_support.run_executive_concierge(
            ctx,
            request,
            engagement=eng,
            corpus=corpus,
            attempt_external_send=bool((domain_payload or {}).get("attemptExternalSend")),
            attempt_prohibited=(domain_payload or {}).get("attemptProhibited"),
        )
        tool_res = call_tool(
            "TOOL-OWNER-SUPPORT-READ",
            ctx,
            {"client": ctx.get("client"), "query": request},
            _idempotency_seen=idem,
        )
        run["toolsCalled"].append(tool_res.get("audit"))
        run["outputs"] = concierge
        run["finalStatus"] = concierge.get("status", "SUCCESS")
        run["end"] = _now()
        return run

    # Information path → Second Brain
    if agent_code == "AGT-SECOND-BRAIN" or (not is_action and agent_code in ("AGT-SUCCESS", "AGT-INTAKE")):
        sb = second_brain_query(ctx, request, corpus or [], action_request=is_action)
        tool_res = call_tool(
            "TOOL-SECOND-BRAIN-QUERY",
            ctx,
            {"client": ctx.get("client"), "query": request},
            _idempotency_seen=idem,
        )
        run["toolsCalled"].append(tool_res.get("audit"))
        run["retrievedSources"] = sb.get("citations") or []
        run["outputs"] = sb
        run["finalStatus"] = sb.get("status", "SUCCESS")
        run["end"] = _now()
        return run

    # Proposal path
    if agent_code == "AGT-PROPOSAL":
        draft = {
            "type": "ProposalDraft",
            "client": ctx.get("client"),
            "offerHint": (domain_payload or {}).get("offerCode", "OFF-GROWTH-OS"),
            "pricing": "from_catalog_only",
            "status": "DRAFT",
        }
        # Legacy protection
        client = ctx.get("client") or ""
        if is_legacy_client(client) or client.upper().startswith("ACCG"):
            draft["contractedProtected"] = True
            draft["recommendedFutureOnly"] = True
        apr = create_approval(
            approval_type="Proposal",
            client=client,
            domain="Revenue",
            agent="AGT-PROPOSAL",
            requested_action="approve_proposal_draft",
            draft=draft,
            risk_level="MEDIUM",
        )
        run["approvalsCreated"].append(apr)
        # Attempt external send — must fail under BL-C1 even after APPROVED_TO_SEND
        approved = approve(apr, to_send=True)
        send = call_tool(
            "TOOL-EXTERNAL-SEND",
            ctx,
            {"client": client, "payload": draft},
            approval_state=approved["status"],
            idempotency_key=f"send-{apr['approvalId']}",
            _idempotency_seen=idem,
        )
        run["toolsCalled"].append(send.get("audit"))
        run["outputs"] = {"draft": draft, "approval": approved, "sendAttempt": send}
        run["finalStatus"] = "NEEDS_HUMAN" if send.get("status") == "BLOCKED_POLICY" else send.get("status")
        run["stop"] = "APPROVED_TO_SEND → STOP (BL-C1)"
        run["end"] = _now()
        return run

    # Capital readiness with source conflict
    if agent_code == "AGT-CAP-READY":
        conflicts = (domain_payload or {}).get("conflicts") or []
        readiness = {
            "type": "CapitalReadinessResult",
            "client": ctx.get("client"),
            "missingDocuments": (domain_payload or {}).get("missingDocuments") or [],
            "conflicts": conflicts,
            "fabricatedResolution": False,
            "score": None if conflicts or (domain_payload or {}).get("missingDocuments") else (domain_payload or {}).get("score"),
        }
        if conflicts:
            readiness["status"] = "SOURCE_CONFLICT"
            run["finalStatus"] = "SOURCE_CONFLICT"
            run["outputs"] = readiness
            run["approvalsCreated"].append(
                create_approval(
                    approval_type="CapitalRecommendation",
                    client=ctx.get("client") or "",
                    domain="Capital",
                    agent="AGT-CAP-READY",
                    requested_action="human_resolve_source_conflict",
                    draft=readiness,
                    evidence=conflicts,
                    risk_level="HIGH",
                )
            )
        elif readiness["missingDocuments"]:
            run["finalStatus"] = "MISSING_DATA"
            run["outputs"] = readiness
        else:
            run["finalStatus"] = "NEEDS_HUMAN"
            run["outputs"] = readiness
        tool_res = call_tool("TOOL-CAPITAL-READINESS", ctx, {"client": ctx.get("client")}, _idempotency_seen=idem)
        run["toolsCalled"].append(tool_res.get("audit"))
        run["end"] = _now()
        return run

    # Risk / tax appeal
    if agent_code in ("AGT-TAX-APPEAL", "AGT-UE-CLAIM", "AGT-INS-REVIEW", "AGT-CLAIMS", "AGT-HR-DOCS"):
        risk_read = call_tool(
            "TOOL-RISK-READ",
            ctx,
            {"client": ctx.get("client"), "matter": ctx.get("matter")},
            _idempotency_seen=idem,
        )
        run["toolsCalled"].append(risk_read.get("audit"))
        if not risk_read.get("ok"):
            run["finalStatus"] = risk_read.get("status", "BLOCKED_PERMISSION")
            run["outputs"] = risk_read
            run["end"] = _now()
            return run
        draft = {
            "type": "RiskMatterSummary",
            "agent": agent_code,
            "client": ctx.get("client"),
            "matter": ctx.get("matter"),
            "professionalReviewRequired": True,
            "legalTaxInsuranceConclusion": False,
            "status": "DRAFT_SUPPORT_ONLY",
        }
        if (domain_payload or {}).get("requestConclusion"):
            run["finalStatus"] = "NEEDS_HUMAN"
            run["outputs"] = {
                "blockedConclusion": True,
                "message": "Legal/tax/insurance conclusions require licensed professional — AI constrained",
                "draft": draft,
            }
        else:
            apr = create_approval(
                approval_type="AgencyResponse",
                client=ctx.get("client") or "",
                domain="Risk",
                agent=agent_code,
                requested_action="professional_review_then_human_approval",
                draft=draft,
                risk_level="HIGH",
            )
            run["approvalsCreated"].append(apr)
            send = call_tool(
                "TOOL-RISK-SEND",
                ctx,
                {"client": ctx.get("client"), "draft": draft},
                approval_state="APPROVED",
                _idempotency_seen=idem,
            )
            run["toolsCalled"].append(send.get("audit"))
            run["outputs"] = {"draft": draft, "sendAttempt": send}
            run["finalStatus"] = "NEEDS_HUMAN"
            run["stop"] = "Professional review → Human approval → STOP (no external filing)"
        run["end"] = _now()
        return run

    # SOP via Growth / Second Brain
    if agent_code == "AGT-SUCCESS" and is_action and "sop" in request.lower():
        draft_sop = {
            "title": (domain_payload or {}).get("title", "Draft SOP"),
            "status": "DRAFT",
            "aiGenerated": True,
            "version": 1,
        }
        apr = create_approval(
            approval_type="SOPActivation",
            client=ctx.get("client") or "",
            domain="Growth",
            agent="AGT-SUCCESS",
            requested_action="activate_sop",
            draft=draft_sop,
            risk_level="MEDIUM",
        )
        run["approvalsCreated"].append(apr)
        activate = call_tool(
            "TOOL-SOP-ACTIVATE",
            ctx,
            {"client": ctx.get("client"), "sop": draft_sop},
            approval_state="NONE",
            _idempotency_seen=idem,
        )
        run["toolsCalled"].append(activate.get("audit"))
        run["outputs"] = {"sop": draft_sop, "activateAttempt": activate}
        run["finalStatus"] = "NEEDS_HUMAN"
        run["message"] = "AI cannot self-activate SOP"
        run["end"] = _now()
        return run

    # Invoice / Referral
    if agent_code == "AGT-INVOICE":
        run["outputs"] = run_invoice_agent(ctx, (domain_payload or {}).get("invoices"))
        run["finalStatus"] = "SUCCESS"
        run["end"] = _now()
        return run
    if agent_code == "AGT-REFERRAL":
        run["outputs"] = run_referral_agent(
            ctx,
            (domain_payload or {}).get("referral") or {},
            revenue_collected=bool((domain_payload or {}).get("revenueCollected")),
        )
        run["finalStatus"] = run["outputs"].get("status", "SUCCESS")
        if run["outputs"].get("approval"):
            run["approvalsCreated"].append(run["outputs"]["approval"])
        run["end"] = _now()
        return run

    # Procurement submit attempt
    if agent_code in ("AGT-PROCURE", "AGT-GOV-REG") and is_action:
        sub = call_tool(
            "TOOL-PROCUREMENT-SUBMIT",
            ctx,
            {"client": ctx.get("client")},
            approval_state="APPROVED",
            _idempotency_seen=idem,
        )
        run["toolsCalled"].append(sub.get("audit"))
        run["outputs"] = sub
        run["finalStatus"] = sub.get("status", "BLOCKED_POLICY")
        run["end"] = _now()
        return run

    # Default: Second Brain
    sb = second_brain_query(ctx, request, corpus or [], action_request=is_action)
    run["outputs"] = sb
    run["retrievedSources"] = sb.get("citations") or []
    run["finalStatus"] = sb.get("status", "SUCCESS")
    run["end"] = _now()
    return run


def owner_brief(domain_snapshots: dict[str, Any], ctx: dict[str, Any] | None = None) -> dict[str, Any]:
    """Development Owner Brief — no fabricated totals. Sprint 14 extends via executive_owner_support."""
    if executive_owner_support is not None:
        return executive_owner_support.build_owner_brief_v2(
            ctx or {"owner_support_scope": False, "elevated_risk_access": False},
            domain_snapshots=domain_snapshots,
        )
    sections = [
        "Revenue",
        "Cash / CFO",
        "Capital",
        "Procurement",
        "Risk",
        "Growth",
        "Client Success",
        "Approvals",
        "Critical Deadlines",
        "Decisions Required",
    ]
    brief = {"generatedAt": _now(), "environment": "DEV", "sections": {}, "fabricatedMetrics": False}
    for sec in sections:
        snap = domain_snapshots.get(sec)
        if snap is None:
            brief["sections"][sec] = {"status": "NO_DATA", "items": [], "note": "Unavailable — not invented"}
        else:
            brief["sections"][sec] = {
                "status": snap.get("status", "OK"),
                "items": snap.get("items") or [],
                "source": snap.get("source"),
                "restricted": snap.get("restricted", False),
            }
            if snap.get("restricted") and not (domain_snapshots.get("_elevated_risk_access") or (ctx or {}).get("elevated_risk_access")):
                brief["sections"][sec] = {
                    "status": "RESTRICTED",
                    "items": [],
                    "note": "Risk detail withheld — GATE-RISK-ELEVATED-ACL-PROD",
                }
    brief["disclaimer"] = "Material changes only. Domain SoRs remain authoritative."
    return brief


def record_feedback(run_id: str, mark: str, notes: str | None = None) -> dict[str, Any]:
    policy = load_ai_policy()
    if mark not in policy["feedbackMarks"]:
        return {"ok": False, "status": "FAILED", "message": "Invalid feedback mark"}
    return {
        "ok": True,
        "runId": run_id,
        "mark": mark,
        "notes": notes,
        "timestamp": _now(),
        "autoPromptMutation": False,
        "note": "Feedback captured for evaluation — does not auto-alter Production prompts",
    }


def agent_metrics_stub(runs: list[dict[str, Any]]) -> dict[str, Any]:
    by_status: dict[str, int] = {}
    for r in runs:
        s = r.get("finalStatus", "UNKNOWN")
        by_status[s] = by_status.get(s, 0) + 1
    return {
        "executions": len(runs),
        "byStatus": by_status,
        "policyBlocks": by_status.get("BLOCKED_POLICY", 0),
        "permissionBlocks": by_status.get("BLOCKED_PERMISSION", 0),
        "humanEscalations": by_status.get("NEEDS_HUMAN", 0),
        "optimizeFor": "quality_and_zero_leakage_not_volume",
    }
