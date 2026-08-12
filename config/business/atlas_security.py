"""Atlas Security & Production Hardening (Development) — Sprint 16.

Fail-closed. Extends existing BA modules — does not create a second security
engine, file store, portal, or governance plane.
Elite↔BA binding: Integration Hub invokes ba_bridge.py (one API architecture).
Production gates remain CLOSED unless live evidence exists.
"""

from __future__ import annotations

import hashlib
import re
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from pricing_policy import ACCG_LOCKED_MONTHLY, load_json

import ai_orchestrator as ai
import atlas_integration as integ
import document_os as docs
import executive_owner_support as eos

BL_C1_ACTIVE = True
RUNTIME_VERSION = "1.0.0-dev-s16"
RISK_GATE = "GATE-RISK-ELEVATED-ACL-PROD"
PORTAL_GATE = "GATE-CLIENT-PORTAL-PROD"
M365_GATE = "GATE-M365-SECOND-BRAIN-PROD"

UPLOAD_SCAN_STATES = (
    "RECEIVED",
    "QUARANTINED",
    "SCAN_PENDING",
    "SCAN_CLEAN",
    "SCAN_REJECTED",
)

TOOL_SIDE_EFFECT_CLASSES = {
    "READ": "read-only",
    "WRITE_INTERNAL": "internal record update",
    "DRAFT": "draft generation",
    "APPROVAL_REQUIRED": "approval-required",
    "EXTERNAL_COMMUNICATION": "external communication",
    "SUBMISSION": "submission",
    "FINANCIAL_MONEY": "financial/money movement",
    "DESTRUCTIVE": "destructive",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def security_audit_event(**kwargs: Any) -> dict[str, Any]:
    """Canonical security event — no secrets / no document body."""
    return {
        "eventId": _id("SEC"),
        "timestamp": _now(),
        "correlationId": kwargs.get("correlation_id") or _id("CORR"),
        "actor": kwargs.get("actor"),
        "client": kwargs.get("client"),
        "matter": kwargs.get("matter"),
        "document": kwargs.get("document"),
        "agent": kwargs.get("agent"),
        "tool": kwargs.get("tool"),
        "action": kwargs.get("action"),
        "policyResult": kwargs.get("policy_result"),
        "allow": bool(kwargs.get("allow")),
        "approvalRef": kwargs.get("approval_ref"),
        "environment": kwargs.get("environment") or "DEV",
        "eventType": kwargs.get("event_type") or "security",
    }


# --- Principal / fail-closed ---


def map_hub_principal(principal: dict[str, Any] | None) -> dict[str, Any]:
    """Map Integration Hub AtlasPrincipal → BA contexts. Fail closed if missing."""
    if not principal or not principal.get("userId"):
        return {"ok": False, "status": "UNAUTHORIZED", "message": "Missing identity — fail closed"}
    roles = [str(r) for r in (principal.get("roles") or [])]
    role_l = " ".join(roles).lower()
    owner_scope = any(x in role_l for x in ("owner", "hvcg owner"))
    elevated = "risk-elevated" in role_l or "risk_elevated" in role_l
    allowed = list(principal.get("allowedClientIds") or [])
    return {
        "ok": True,
        "user": principal.get("email") or principal["userId"],
        "userId": principal["userId"],
        "roles": roles,
        "allowed_clients": allowed,
        "owner_support_scope": owner_scope,
        "elevated_risk_access": elevated,
        "hr_access": "hr" in role_l or "hr-" in role_l,
        "organizationId": principal.get("organizationId") or "org-hvcg",
        "environment": principal.get("environment") or "DEV",
    }


def require_identity(mapped: dict[str, Any]) -> dict[str, Any]:
    if not mapped.get("ok"):
        return mapped
    return {"ok": True}


def require_client_context(mapped: dict[str, Any], client: str | None) -> dict[str, Any]:
    if not mapped.get("ok"):
        return mapped
    if not client:
        return {"ok": False, "status": "MISSING_CONTEXT", "message": "Client context required — fail closed"}
    allowed = mapped.get("allowed_clients") or []
    if allowed and "*" not in allowed and client not in allowed:
        return {"ok": False, "status": "WRONG_CLIENT", "message": "Client A must never see Client B", "leakage": False}
    return {"ok": True, "client": client}


# --- Upload security / scan lifecycle ---


def normalize_upload_filename(name: str) -> dict[str, Any]:
    raw = name or ""
    # Path traversal / absolute paths
    if ".." in raw or raw.startswith("/") or "\\" in raw or ":" in raw.split("/")[0]:
        return {"ok": False, "status": "BLOCKED_POLICY", "eventType": "upload_rejected", "message": "path_traversal_or_unsafe_name"}
    base = raw.replace("\\", "/").split("/")[-1]
    base = re.sub(r"[^\w.\- ()]", "_", base)[:180]
    if not base or base in (".", ".."):
        return {"ok": False, "status": "BLOCKED_POLICY", "eventType": "upload_rejected", "message": "empty_filename"}
    return {"ok": True, "fileName": base}


def validate_upload(*, file_name: str, content: str, content_type: str | None = None, max_bytes: int = 25_000_000) -> dict[str, Any]:
    fn = normalize_upload_filename(file_name)
    if not fn.get("ok"):
        return fn
    size = len(content.encode("utf-8", errors="ignore"))
    if size > max_bytes:
        return {"ok": False, "status": "BLOCKED_POLICY", "eventType": "upload_rejected", "message": "oversized"}
    # Extension vs content-type mismatch (lightweight)
    ext = (fn["fileName"].rsplit(".", 1)[-1].lower() if "." in fn["fileName"] else "")
    ct = (content_type or "").lower()
    if ext in ("pdf",) and ct and "pdf" not in ct and "octet-stream" not in ct and ct != "application/pdf":
        return {"ok": False, "status": "BLOCKED_POLICY", "eventType": "upload_rejected", "message": "extension_mismatch"}
    return {"ok": True, "fileName": fn["fileName"], "size": size, "scanStatus": "SCAN_PENDING"}


def apply_upload_scan_lifecycle(doc: dict[str, Any], *, scanner_result: str | None = None) -> dict[str, Any]:
    """Scanner interface/state machine — LIVE_VALIDATION_REQUIRED for real AV."""
    out = deepcopy(doc)
    out["uploadSecurity"] = {
        "lifecycle": list(UPLOAD_SCAN_STATES),
        "status": "QUARANTINED",
        "scannerIntegrated": False,
        "liveValidationRequired": True,
        "fakeVirusScannedFlag": False,
    }
    out["status"] = "RECEIVED"
    if scanner_result == "CLEAN":
        out["uploadSecurity"]["status"] = "SCAN_CLEAN"
    elif scanner_result == "REJECTED":
        out["uploadSecurity"]["status"] = "SCAN_REJECTED"
        out["status"] = "REJECTED"
        out["visibility"] = "INTERNAL_ONLY"
        out["portalVisibility"] = "NOT_CLIENT_VISIBLE"
        out["secondBrainEligible"] = False
        out["aiRetrievalPermission"] = False
    else:
        out["uploadSecurity"]["status"] = "SCAN_PENDING"
        # unscanned must not become normal ACCEPTED accessible content
        if out.get("status") == "ACCEPTED":
            out["status"] = "RECEIVED"
    out["accessibleAsAccepted"] = out["uploadSecurity"]["status"] == "SCAN_CLEAN" and out.get("status") in (
        "ACCEPTED",
        "APPROVED",
        "FINAL",
    )
    return out


def secure_download_authorize(ctx: dict[str, Any], doc: dict[str, Any]) -> dict[str, Any]:
    """Re-authorize at request time — ID/path/URL alone insufficient."""
    access = docs.access_document_by_id(ctx, doc)
    event = security_audit_event(
        actor=ctx.get("user"),
        client=doc.get("client"),
        document=doc.get("documentId"),
        action="document_download",
        policy_result=access.get("status"),
        allow=bool(access.get("ok")),
        event_type="document_access" if access.get("ok") else "restricted_document",
    )
    if not access.get("ok"):
        return {
            "ok": False,
            "status": access.get("status", "BLOCKED_PERMISSION"),
            "metadataLeaked": False,
            "audit": event,
            "message": "Possessing ID/path/URL is not authorization",
        }
    # Quarantine / rejected scans
    scan = (doc.get("uploadSecurity") or {}).get("status")
    if scan in ("QUARANTINED", "SCAN_PENDING", "SCAN_REJECTED"):
        return {
            "ok": False,
            "status": "BLOCKED_POLICY",
            "eventType": "upload_rejected" if scan == "SCAN_REJECTED" else "scan_pending",
            "audit": event,
            "message": "Unscanned/rejected upload not downloadable as accepted content",
        }
    return {"ok": True, "document": access.get("document"), "audit": event}


# --- Owner Support metadata concealment ---


def owner_support_enumerate(ctx: dict[str, Any], engagements: list[dict[str, Any]]) -> dict[str, Any]:
    """Unauthorized users must not learn restricted matters exist."""
    gate = eos.can_access_owner_support(ctx)
    if not gate.get("ok"):
        return {
            "ok": False,
            "status": "BLOCKED_PERMISSION",
            "engagements": [],
            "count": None,  # conceal existence
            "existenceConcealed": True,
            "leakage": False,
            "audit": security_audit_event(
                actor=ctx.get("user"),
                action="owner_support_enumerate",
                policy_result="BLOCKED_PERMISSION",
                allow=False,
                event_type="restricted_matter",
            ),
        }
    visible = []
    for eng in engagements:
        access = eos.access_owner_support_engagement(ctx, eng)
        if access.get("status") == "SUCCESS":
            visible.append(access["engagement"])
    return {"ok": True, "engagements": visible, "count": len(visible), "existenceConcealed": False}


# --- Environment / config fail-closed ---


def validate_environment_config(cfg: dict[str, Any]) -> dict[str, Any]:
    """Detect dangerous Production-like states without real secrets."""
    issues = []
    env = (cfg.get("environment") or "DEV").upper()
    if env == "PRODUCTION":
        if cfg.get("useTestCredentials"):
            issues.append("Production mode with test credentials")
        if cfg.get("portalEnabled") and not cfg.get("authConfigured"):
            issues.append("Portal enabled without auth configuration")
        if cfg.get("graphEnabled") and not cfg.get("graphPermissionConfigured"):
            issues.append("Graph enabled without permission configuration")
        if cfg.get("externalToolEnabled") and not cfg.get("approvalPolicyEnabled"):
            issues.append("External tool enabled without approval policy")
        if cfg.get("documentDownloadEnabled") and not cfg.get("aclEnforced"):
            issues.append("Document download enabled without ACL enforcement")
        if not cfg.get("auditDestination"):
            issues.append("Missing audit destination")
        if cfg.get("productionSecretsPresent"):
            issues.append("Production secrets must not be embedded in Development config")
    if not cfg.get("environment"):
        issues.append("Missing environment designation")
    if issues:
        return {
            "ok": False,
            "status": "PRODUCTION_GATED",
            "eventType": "configuration_unsafe",
            "issues": issues,
            "failClosed": True,
        }
    return {"ok": True, "environment": env, "failClosed": True}


def redact_secrets_from_log(payload: dict[str, Any]) -> dict[str, Any]:
    sensitive = ("token", "secret", "password", "apiKey", "authorization", "client_secret", "refresh")
    out = {}
    for k, v in payload.items():
        if any(s in k.lower() for s in sensitive):
            out[k] = "[REDACTED]"
        elif isinstance(v, dict):
            out[k] = redact_secrets_from_log(v)
        else:
            out[k] = v
    return out


# --- Graph / Second Brain authorization parity ---


def graph_atlas_authorize(*, graph_can_read: bool, atlas_ctx: dict[str, Any], doc: dict[str, Any]) -> dict[str, Any]:
    """Graph technical access ≠ Atlas user authorization."""
    if not graph_can_read:
        return {"ok": False, "status": "MISSING_EVIDENCE", "message": "Upstream unavailable"}
    view = docs.can_view_document(atlas_ctx, doc)
    if not view.get("ok"):
        return {
            "ok": False,
            "status": view.get("status", "BLOCKED_PERMISSION"),
            "message": "Atlas ACL denies despite Graph accessibility",
            "graphCanRead": True,
            "atlasAuthorized": False,
            "gate": view.get("gate") or M365_GATE,
        }
    return {"ok": True, "graphCanRead": True, "atlasAuthorized": True}


# --- Tool classification / BL-C1 ---


def classify_tool(tool: dict[str, Any]) -> str:
    mode = (tool.get("mode") or "READ").upper()
    if tool.get("externalAction") or tool.get("sideEffects") and "send" in str(tool.get("toolId", "")).lower():
        return "EXTERNAL_COMMUNICATION"
    if "PAY" in str(tool.get("toolId", "")).upper() or "REFUND" in str(tool.get("toolId", "")).upper():
        return "FINANCIAL_MONEY"
    if mode == "READ":
        return "READ"
    if tool.get("approvalRequired"):
        return "APPROVAL_REQUIRED"
    if tool.get("sideEffects"):
        return "WRITE_INTERNAL"
    return "DRAFT"


def attempt_external_tool(*, tool_id: str, via: str = "agent") -> dict[str, Any]:
    if BL_C1_ACTIVE:
        return {
            "ok": False,
            "status": "BLOCKED_POLICY",
            "blC1Active": True,
            "approvedToSendIsNotAutoSend": True,
            "via": via,
            "toolId": tool_id,
            "sent": False,
            "audit": security_audit_event(
                action="external_tool_attempt",
                tool=tool_id,
                policy_result="BLOCKED_POLICY",
                allow=False,
                event_type="bl_c1_blocked",
            ),
        }
    return {"ok": False, "status": "BLOCKED_POLICY", "sent": False}


# --- Gate evidence helpers ---


def gate_evidence_skeleton(gate_id: str) -> dict[str, Any]:
    common = {
        "GATE-RISK-ELEVATED-ACL-PROD": [
            "server-side matter authorization",
            "cross-client isolation",
            "restricted employee-related fields",
            "role-based sensitive-field access",
            "document ACL",
            "AI permission parity",
            "audit logging",
            "unauthorized-user negative tests",
        ],
        "GATE-CLIENT-PORTAL-PROD": [
            "external authentication",
            "client isolation",
            "server-side document authorization",
            "document-level permission enforcement",
            "Risk/HR/Owner Support exclusion",
            "secure upload",
            "malware/security controls",
            "audit logging",
            "download authorization",
            "secure SharePoint integration",
            "secrets/configuration",
            "monitoring + rollback",
            "Owner approval",
        ],
        "GATE-M365-SECOND-BRAIN-PROD": [
            "identity model reviewed",
            "client permission parity",
            "Risk ACL parity",
            "restricted document filtering",
            "source/version/freshness controls",
            "audit logging",
            "prompt-injection defenses",
            "cross-client negative tests",
            "Production secrets management",
            "monitoring",
            "Owner authorization",
        ],
    }
    rows = []
    for req in common.get(gate_id, []):
        rows.append(
            {
                "control": req,
                "codeEvidence": "atlas_security / document_os / executive_owner_support / ai_orchestrator",
                "testEvidence": "test_atlas_security_sprint16.py",
                "nonProductionValidation": "DEV",
                "productionValidationRequired": True,
                "status": "IMPLEMENTED_IN_DEV",
                "blocker": "LIVE_VALIDATION_REQUIRED",
            }
        )
    return {
        "gateId": gate_id,
        "gateStatus": "CLOSED",
        "satisfied": False,
        "requirements": rows,
        "note": "Development evidence ≠ Production satisfaction",
    }


def threat_model() -> list[dict[str, Any]]:
    return [
        {"threat": "cross-client data leakage", "control": "assert_client_access + BA allowed_clients", "tests": "A/B/EB-B"},
        {"threat": "IDOR/direct object access", "control": "secure_download_authorize", "tests": "F/G"},
        {"threat": "permission escalation", "control": "concierge_permission_parity", "tests": "K"},
        {"threat": "Owner Support exposure", "control": "DENY unless authorized + concealment", "tests": "C/D"},
        {"threat": "Risk/HR exposure", "control": "elevated_risk_access / hr_access", "tests": "E"},
        {"threat": "prompt injection", "control": "untrusted document content", "tests": "J"},
        {"threat": "compromised service credential", "control": "Graph≠Atlas auth; secrets redaction", "tests": "P/Graph"},
        {"threat": "over-broad Graph access", "control": "graph_atlas_authorize", "tests": "M365 pack"},
        {"threat": "unauthorized external agent action", "control": "BL-C1", "tests": "L/M"},
        {"threat": "upload malware", "control": "scan lifecycle; AV LIVE_VALIDATION_REQUIRED", "tests": "H/I"},
        {"threat": "sensitive log leakage", "control": "redact_secrets_from_log", "tests": "P"},
        {"threat": "shadow SoR wrong decisions", "control": "authority precedence", "tests": "integration F"},
        {"threat": "Production configuration mistakes", "control": "validate_environment_config", "tests": "O"},
    ]


# --- Dispatch for Hub bridge ---


def dispatch_ba_request(req: dict[str, Any]) -> dict[str, Any]:
    """Hub → BA operations. Fail closed."""
    correlation = req.get("correlationId") or _id("CORR")
    principal = req.get("principal")
    mapped = map_hub_principal(principal)
    if not mapped.get("ok"):
        return {**mapped, "ok": False, "correlationId": correlation, "audit": security_audit_event(action="dispatch", policy_result="UNAUTHORIZED", allow=False, correlation_id=correlation, event_type="unauthorized")}

    op = req.get("op") or ""
    payload = req.get("payload") or {}
    client = payload.get("client") or payload.get("clientId")

    # Ops that require client
    needs_client = op not in ("gates.registry", "security.ping", "contracts.load")
    if needs_client:
        cc = require_client_context(mapped, client)
        if not cc.get("ok"):
            return {**cc, "correlationId": correlation}

    if op == "security.ping":
        return {"ok": True, "status": "SUCCESS", "runtime": RUNTIME_VERSION, "binding": "hub→ba_bridge"}

    if op == "gates.registry":
        return {"ok": True, "status": "SUCCESS", "gates": integ.production_gate_registry()}

    if op == "doc.access":
        ctx = docs.establish_doc_context(
            user=mapped["user"],
            role=(mapped["roles"][0] if mapped["roles"] else "Advisor"),
            client=client,
            allowed_clients=mapped["allowed_clients"] if "*" not in (mapped.get("allowed_clients") or []) else [],
            elevated_risk_access=mapped["elevated_risk_access"],
            hr_access=mapped.get("hr_access"),
            owner_support_scope=mapped["owner_support_scope"],
            is_client_portal_user=bool(payload.get("isClientPortalUser")),
        )
        # If allow-list is ['*'], don't pass restrictive list
        if mapped.get("allowed_clients") == ["*"]:
            ctx = docs.establish_doc_context(
                user=mapped["user"],
                role=(mapped["roles"][0] if mapped["roles"] else "Advisor"),
                client=client,
                elevated_risk_access=mapped["elevated_risk_access"],
                owner_support_scope=mapped["owner_support_scope"],
                is_client_portal_user=bool(payload.get("isClientPortalUser")),
            )
        doc = payload.get("document") or {}
        result = secure_download_authorize(ctx, doc)
        result["correlationId"] = correlation
        result["ok"] = bool(result.get("ok"))
        return result

    if op == "doc.upload":
        ctx = docs.establish_doc_context(
            user=mapped["user"],
            role="ClientUser" if payload.get("isClientPortalUser") else "Advisor",
            client=client,
            allowed_clients=[] if mapped.get("allowed_clients") == ["*"] else mapped.get("allowed_clients") or [],
            is_client_portal_user=bool(payload.get("isClientPortalUser")),
        )
        val = validate_upload(file_name=payload.get("fileName") or "", content=payload.get("content") or "", content_type=payload.get("contentType"))
        if not val.get("ok"):
            return {**val, "correlationId": correlation}
        req_doc = payload.get("request") or docs.create_document_request(client=client, requested_document_type=payload.get("documentType") or "Other")
        up = docs.portal_upload(ctx, request=req_doc, file_name=val["fileName"], content=payload.get("content") or "")
        if up.get("ok") and up.get("document"):
            up["document"] = apply_upload_scan_lifecycle(up["document"], scanner_result=payload.get("scannerResult"))
        up["correlationId"] = correlation
        return up

    if op == "owner.access":
        ctx = eos.establish_exec_context(
            user=mapped["user"],
            role=(mapped["roles"][0] if mapped["roles"] else "Advisor"),
            client=client,
            allowed_clients=[] if mapped.get("allowed_clients") == ["*"] else mapped.get("allowed_clients") or [],
            owner_support_scope=mapped["owner_support_scope"],
            elevated_risk_access=mapped["elevated_risk_access"],
            is_client_portal_user=bool(payload.get("isClientPortalUser")),
        )
        eng = payload.get("engagement") or eos.create_owner_support_engagement(clientId=client)
        if payload.get("enumerate"):
            return {**owner_support_enumerate(ctx, payload.get("engagements") or [eng]), "correlationId": correlation}
        access = eos.access_owner_support_engagement(ctx, eng)
        access["correlationId"] = correlation
        access["ok"] = access.get("status") == "SUCCESS"
        return access

    if op == "ai.orchestrate":
        ctx = ai.establish_context(
            user=mapped["user"],
            role=(mapped["roles"][0] if mapped["roles"] else "Advisor"),
            client=client,
            allowed_clients=[] if mapped.get("allowed_clients") == ["*"] else mapped.get("allowed_clients") or [],
            owner_support_scope=mapped["owner_support_scope"],
            elevated_risk_access=mapped["elevated_risk_access"],
        )
        if payload.get("attemptExternalSend"):
            block = attempt_external_tool(tool_id="TOOL-EXTERNAL-SEND", via="elite_ba_route")
            return {**block, "correlationId": correlation}
        run = ai.orchestrate(
            request=payload.get("request") or "",
            ctx=ctx,
            agent=payload.get("agent"),
            corpus=payload.get("corpus"),
            domain_payload=payload.get("domainPayload"),
            is_action=bool(payload.get("isAction")),
        )
        return {"ok": run.get("finalStatus") in ("SUCCESS", "NEEDS_HUMAN", "BLOCKED_POLICY", "BLOCKED_PERMISSION", "MISSING_DATA"), "status": run.get("finalStatus"), "run": run, "correlationId": correlation}

    if op == "exec.intelligence":
        ctx = eos.establish_exec_context(
            user=mapped["user"],
            role=(mapped["roles"][0] if mapped["roles"] else "Advisor"),
            client=client,
            allowed_clients=[] if mapped.get("allowed_clients") == ["*"] else mapped.get("allowed_clients") or [],
            owner_support_scope=mapped["owner_support_scope"],
            elevated_risk_access=mapped["elevated_risk_access"],
        )
        intel = eos.build_executive_intelligence(ctx, domain_snapshots=payload.get("domainSnapshots") or {})
        return {"ok": True, "status": "SUCCESS", "intelligence": intel, "correlationId": correlation, "authorizationBypass": False}

    if op == "blc1.block":
        return {**attempt_external_tool(tool_id=payload.get("toolId") or "TOOL-EXTERNAL-SEND", via=payload.get("via") or "api"), "correlationId": correlation}

    return {"ok": False, "status": "FORBIDDEN", "message": f"Unknown op {op}", "correlationId": correlation}


def simulate_elite_ba_binding(op: str, principal: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    """Phase 0 binding proof without requiring Hub process — same dispatch contract Hub uses."""
    return dispatch_ba_request({"op": op, "principal": principal, "payload": payload, "correlationId": _id("EB")})
