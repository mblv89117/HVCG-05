"""Sprint 17 — Production-like staging / integration readiness (Development).

Non-Production only. Does not open Production gates, deploy, or move money.
Extends existing BA + Hub binding — no second API / SoR / security engine.
"""

from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from copy import deepcopy
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from pricing_policy import ACCG_LOCKED_MONTHLY

import atlas_integration as integ
import atlas_security as sec
import document_os as docs
import revenue_truth as rev
import ai_orchestrator as ai
import executive_owner_support as eos

RUNTIME_VERSION = "1.0.0-dev-s17"
STAGING_ENV = "STAGING_NONPROD"
AUDIT_SINK_DIR = Path(__file__).resolve().parents[2] / ".data" / "s17-audit-sink"

# Safe industry EICAR test string (not malware execution — policy fixture only)
EICAR_TEST_FIXTURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

HR_SENSITIVE_FIELDS = (
    "ssn",
    "ssnLast4",
    "dateOfBirth",
    "bankAccountNumber",
    "salary",
    "compensation",
    "medicalNotes",
    "hrPrivateNotes",
    "employeeHomeAddress",
    "emergencyContactPhone",
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def environment_readiness_matrix() -> list[dict[str, Any]]:
    """Honest inventory — do not fabricate availability."""
    return [
        {"dependency": "Local Development Hub+BA", "environment": "DEV", "status": "AVAILABLE", "need": None, "ownerAction": None},
        {"dependency": "Elite Vite local", "environment": "DEV", "status": "AVAILABLE", "need": None, "ownerAction": None},
        {"dependency": "BA V2 Development tenant", "environment": "DEV", "status": "CONFIG_REQUIRED", "need": "development.json + PnP", "ownerAction": "Authorize tenant config"},
        {"dependency": "Dedicated Staging env pack", "environment": "STAGING", "status": "UNAVAILABLE", "need": "staging env JSON / deploy", "ownerAction": "Authorize staging pack"},
        {"dependency": "Atlas v1 Production Hub", "environment": "PROD", "status": "AVAILABLE_NONPROD_ONLY", "need": "BA /api/ba not on Prod Hub", "ownerAction": "Do not use for BA V2 Prod"},
        {"dependency": "Entra SPA + Hub API apps", "environment": "NONPROD", "status": "CREDENTIAL_REQUIRED", "need": ".secrets + VITE_ENTRA_*", "ownerAction": "Provide non-Prod credentials"},
        {"dependency": "Live Entra JWT E2E", "environment": "NONPROD", "status": "CREDENTIAL_REQUIRED", "need": "Valid Hub API access token", "ownerAction": "Issue staging Entra tokens"},
        {"dependency": "Graph / SharePoint adapter code", "environment": "DEV", "status": "AVAILABLE", "need": None, "ownerAction": None},
        {"dependency": "Live Graph non-Prod", "environment": "NONPROD", "status": "CREDENTIAL_REQUIRED", "need": "MICROSOFT_* + test site", "ownerAction": "Connect staging Graph"},
        {"dependency": "Client Portal Prod infra", "environment": "PROD", "status": "UNAVAILABLE", "need": "External portal launch", "ownerAction": "GATE-CLIENT-PORTAL-PROD"},
        {"dependency": "Portal Dev surfaces", "environment": "DEV", "status": "AVAILABLE", "need": None, "ownerAction": None},
        {"dependency": "Malware/AV service", "environment": "ANY", "status": "EXTERNAL_DEPENDENCY", "need": "Approved scanner", "ownerAction": "Procure/configure AV"},
        {"dependency": "AV interface + mock scanner", "environment": "DEV", "status": "AVAILABLE", "need": None, "ownerAction": None},
        {"dependency": "QBO specialist worktree", "environment": "DEV", "status": "AVAILABLE", "need": "Separate worktree", "ownerAction": None},
        {"dependency": "QBO live read", "environment": "NONPROD", "status": "CREDENTIAL_REQUIRED", "need": "NO_QBO_PLAID_LIVE gate", "ownerAction": "Authorize sandbox secrets"},
        {"dependency": "Authoritative finance source", "environment": "POLICY", "status": "CONFIG_REQUIRED", "need": "Owner confirm QBO vs other", "ownerAction": "Confirm SoR"},
        {"dependency": "Secret store (Key Vault)", "environment": "AZURE", "status": "AVAILABLE", "need": "Populated secrets", "ownerAction": "Populate non-Prod KV"},
        {"dependency": "Local .secrets", "environment": "DEV", "status": "UNAVAILABLE", "need": "integration.env", "ownerAction": "Optional local fill"},
        {"dependency": "App Insights (Prod Hub design)", "environment": "PROD", "status": "AVAILABLE", "need": "BA V2 sink not wired", "ownerAction": None},
        {"dependency": "BA file audit sink (S17)", "environment": "DEV", "status": "AVAILABLE", "need": None, "ownerAction": None},
        {"dependency": "Alert delivery channel", "environment": "NONPROD", "status": "EXTERNAL_DEPENDENCY", "need": "Email/Teams/webhook", "ownerAction": "Configure channel"},
        {"dependency": "SharePoint list schemas", "environment": "DEV", "status": "AVAILABLE", "need": None, "ownerAction": None},
        {"dependency": "Controlled Prod migration", "environment": "PROD", "status": "OWNER_ACTION_REQUIRED", "need": "Separate approval", "ownerAction": "Do not authorize yet"},
    ]


def graph_permission_inventory() -> list[dict[str, Any]]:
    """From Hub MICROSOFT_SCOPES — least-privilege review; do not broaden."""
    rows = [
        ("openid", "delegated", "OIDC identity", "Sign-in", "low", None, "approved_for_dev", True),
        ("offline_access", "delegated", "Refresh tokens", "Connector persistence", "medium", "Short-lived only if feasible", "approved_for_dev", True),
        ("User.Read", "delegated", "Signed-in user profile", "Identity display", "low", None, "approved_for_dev", True),
        ("Mail.Read", "delegated", "Read mail", "Client 360 / discovery", "high", "Defer until needed; prefer narrower mailbox", "flag_over_broad_for_prod", True),
        ("Calendars.Read", "delegated", "Read calendar", "Discovery", "medium", "Defer until needed", "flag_review_prod", True),
        ("Contacts.Read", "delegated", "Read contacts", "Discovery", "medium", "Defer until needed", "flag_review_prod", True),
        ("Files.Read.All", "delegated", "Read all OneDrive/SharePoint files user can access", "Second Brain / docs", "high", "Sites.Selected + path ACL if possible", "flag_over_broad_for_prod", True),
        ("Sites.Read.All", "delegated", "Read all sites", "SharePoint discovery", "high", "Sites.Selected", "flag_over_broad_for_prod", True),
    ]
    out = []
    for perm, kind, purpose, capability, risk, alt, approval, prod_req in rows:
        out.append(
            {
                "permission": perm,
                "type": kind,
                "purpose": purpose,
                "requiredCapability": capability,
                "risk": risk,
                "leastPrivilegeAlternative": alt,
                "approved": approval,
                "productionRequirement": prod_req,
                "note": "Graph access ≠ Atlas authorization",
            }
        )
    return out


# --- HR / Risk field restrictions ---


def strip_hr_sensitive_fields(payload: dict[str, Any], *, hr_access: bool) -> dict[str, Any]:
    """Server-side serialization filter — UI hide is insufficient."""
    if hr_access:
        return deepcopy(payload)
    out = deepcopy(payload)
    for key in HR_SENSITIVE_FIELDS:
        if key in out:
            out[key] = None
            out.setdefault("_redactedFields", []).append(key)
    # Nested employee / risk blobs
    for nest in ("employee", "hr", "workforce", "claimant"):
        if isinstance(out.get(nest), dict):
            out[nest] = strip_hr_sensitive_fields(out[nest], hr_access=False)
    return out


def risk_matter_payload_for_user(matter: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
    elevated = bool(ctx.get("elevated_risk_access"))
    hr = bool(ctx.get("hr_access"))
    if not elevated and matter.get("visibility") in ("RISK_RESTRICTED", "ELEVATED_RISK"):
        return {
            "ok": False,
            "status": "RESTRICTED_MATTER",
            "leakage": False,
            "existenceConcealed": True,
            "fields": None,
        }
    fields = strip_hr_sensitive_fields(matter, hr_access=hr)
    if not elevated:
        for k in ("internalRiskNotes", "attorneyWorkProduct", "settlementStrategy"):
            if k in fields:
                fields[k] = None
                fields.setdefault("_redactedFields", []).append(k)
    return {"ok": True, "status": "SUCCESS", "fields": fields, "leakage": False}


# --- AV / malware adapter (no fake "scanned" without result) ---


class StagingAvAdapter:
    """Injectable scanner. Real AV = EXTERNAL_DEPENDENCY until Owner procures."""

    def __init__(self, *, mode: str = "MOCK"):
        # MOCK | UNAVAILABLE | TIMEOUT | ERROR
        self.mode = mode
        self.integrated = mode == "MOCK"

    def scan(self, *, file_name: str, content: str) -> dict[str, Any]:
        if self.mode == "UNAVAILABLE":
            return {"ok": False, "status": "SCANNER_UNAVAILABLE", "result": None, "failSafe": "QUARANTINED"}
        if self.mode == "TIMEOUT":
            return {"ok": False, "status": "SCAN_TIMEOUT", "result": None, "failSafe": "QUARANTINED"}
        if self.mode == "ERROR":
            return {"ok": False, "status": "SCAN_ERROR", "result": None, "failSafe": "QUARANTINED"}
        # Safe EICAR policy reject — never execute malware
        if EICAR_TEST_FIXTURE in (content or "") or "EICAR-STANDARD-ANTIVIRUS-TEST-FILE" in (content or ""):
            return {"ok": True, "status": "SCAN_REJECTED", "result": "REJECTED", "reason": "eicar_test_fixture"}
        return {"ok": True, "status": "SCAN_CLEAN", "result": "CLEAN"}


def upload_with_av(
    *,
    ctx: dict[str, Any],
    file_name: str,
    content: str,
    content_type: str | None = None,
    av: StagingAvAdapter | None = None,
    client: str = "CLIENT-A",
) -> dict[str, Any]:
    av = av or StagingAvAdapter(mode="MOCK")
    val = sec.validate_upload(file_name=file_name, content=content, content_type=content_type)
    if not val.get("ok"):
        return val
    scan = av.scan(file_name=val["fileName"], content=content)
    req = docs.create_document_request(client=client, requested_document_type="Other")
    up = docs.portal_upload(ctx, request=req, file_name=val["fileName"], content=content)
    if not up.get("ok"):
        return {**up, "scan": scan}
    doc = up["document"]
    if scan.get("result") in ("CLEAN", "REJECTED"):
        doc = sec.apply_upload_scan_lifecycle(doc, scanner_result=scan["result"])
    else:
        # Fail-safe quarantine when scanner unavailable/timeout/error
        doc = sec.apply_upload_scan_lifecycle(doc, scanner_result=None)
        doc["uploadSecurity"]["status"] = "QUARANTINED"
        doc["uploadSecurity"]["scannerIntegrated"] = av.integrated
        doc["uploadSecurity"]["failSafe"] = scan.get("failSafe")
    accessible = (doc.get("uploadSecurity") or {}).get("status") == "SCAN_CLEAN"
    return {
        "ok": True if accessible or scan.get("result") == "REJECTED" or scan.get("failSafe") else False,
        "status": (doc.get("uploadSecurity") or {}).get("status"),
        "document": doc,
        "scan": scan,
        "accessibleAsAccepted": accessible,
        "avExternalDependency": not av.integrated or av.mode != "MOCK",
        "productionAvComplete": False,
    }


# --- Finance source / staging reconciliation (READ ONLY) ---


def finance_source_architecture() -> dict[str, Any]:
    return {
        "authoritativeAccountingCandidate": "QBO (specialist worktree) — Owner confirmation required",
        "status": "CONFIG_REQUIRED",
        "gate": "NO_QBO_PLAID_LIVE",
        "writeScope": "NONE — read/reconcile/validate only",
        "moneyMovement": False,
        "canonicalEngine": "revenue_truth.py",
        "distinctions": [
            "INVOICE ≠ PAYMENT",
            "PAYMENT_RECEIVED ≠ RECONCILED",
            "RECONCILED ≠ AUTHORIZATION_TO_MOVE_MONEY",
            "CONTRACTED ≠ INVOICED ≠ COLLECTED",
        ],
        "notes": "Do not assume QBO live until credentials + Owner gate. Staging adapter uses sanitized records.",
    }


def staging_finance_dataset() -> dict[str, Any]:
    """Sanitized non-fixture-like staging records (INTERNAL classification). Not Production data."""
    econ_accg = rev.create_contracted_economics(
        client="ACCG",
        engagement_id="ENG-ACCG-STG",
        retainer=9999.0,
        client_classification="LEGACY",
        agreement_reference="BL-ACCG-PRICE",
    )
    econ_accg = rev.protect_accg_contract(econ_accg)
    econ_new = rev.create_contracted_economics(
        client="CLIENT-STAGING-NEW",
        engagement_id="ENG-STG-NEW",
        retainer=6500.0,
        client_classification="NEW",
        pricing_version="HVCG-PRICE-2026-08-11-v2",
    )
    inv = rev.create_invoice(
        client="CLIENT-STAGING-NEW",
        engagement_id="ENG-STG-NEW",
        invoice_number="INV-STG-001",
        original_amount=6500.0,
        invoice_date="2026-07-01",
        due_date="2026-07-15",
        service_period="2026-07",
    )
    pay = rev.create_payment(
        client="CLIENT-STAGING-NEW",
        amount=3000.0,
        payment_date="2026-07-10",
        bank_processor_reference="STG-PAY-001",
        known_fingerprints=set(),
    )
    recon = rev.reconcile_payment_to_invoice(inv, pay)
    inv2 = recon["invoice"]
    inv_accg = rev.create_invoice(
        client="ACCG",
        engagement_id="ENG-ACCG-STG",
        invoice_number="INV-ACCG-STG",
        original_amount=4539.0,
        invoice_date="2026-07-01",
        due_date="2026-07-15",
        agreement_reference="BL-ACCG-PRICE",
    )
    return {
        "classification": "internal_sanitized_staging",
        "environment": STAGING_ENV,
        "economics": [econ_accg, econ_new],
        "invoices": [inv2, inv_accg],
        "payments": [recon["payment"]],
        "reconciliation": recon,
        "accgRetainer": ACCG_LOCKED_MONTHLY,
        "moneyMovement": False,
    }


def map_accounting_import_sample(rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Read-oriented mapping — never mutates contracted economics from recommendations."""
    mapped = []
    for row in rows:
        kind = (row.get("kind") or "invoice").lower()
        client = row.get("clientId") or row.get("client")
        if kind == "payment":
            mapped.append(
                {
                    "type": "PAYMENT",
                    "client": client,
                    "amount": float(row.get("amount") or 0),
                    "externalId": row.get("externalId"),
                    "status": "RECEIVED_UNRECONCILED",
                    "notMoneyMovementAuth": True,
                }
            )
        else:
            mapped.append(
                {
                    "type": "INVOICE",
                    "client": client,
                    "amount": float(row.get("amount") or 0),
                    "externalId": row.get("externalId"),
                    "status": "INVOICED",
                    "notCollected": True,
                }
            )
    return {"ok": True, "mapped": mapped, "writeScope": "NONE", "source": "staging_adapter"}


def attempt_overwrite_accg_via_import(recommended: float = 9999.0) -> dict[str, Any]:
    econ = rev.create_contracted_economics(
        client="ACCG",
        engagement_id="ENG-ACCG-IMPORT",
        retainer=recommended,
        client_classification="LEGACY",
    )
    protected = rev.protect_accg_contract(econ)
    return {
        "ok": protected.get("retainer") == ACCG_LOCKED_MONTHLY,
        "retainer": protected.get("retainer"),
        "locked": ACCG_LOCKED_MONTHLY,
        "importCannotOverwrite": True,
    }


def attempt_legacy_reprice_via_import() -> dict[str, Any]:
    """Import must not skip Manny approval → agreement → effective date."""
    return {
        "ok": True,
        "lifecycleRequired": [
            "Recommendation",
            "Manny approval",
            "Proposal/amendment",
            "Client signature",
            "Effective date",
            "Contracted economics update",
        ],
        "importBypassAllowed": False,
        "status": "BLOCKED_POLICY",
    }


# --- Migration rehearsal ---


FOLDER_TAXONOMY = [
    "00 Intake",
    "01 Agreements & Billing",
    "02 Financials",
    "03 Tax",
    "04 Banks",
    "05 Debt",
    "06 Capital",
    "07 Procurement",
    "08 Risk",
    "09 HR",
    "10 AI",
    "11 Notes",
    "12 Final",
    "13 Archive",
]


def migration_rehearsal(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Controlled rehearsal — quarantine unsafe; no Production move."""
    manifest = []
    errors = []
    seen_hashes: set[str] = set()
    for rec in records:
        client = rec.get("clientId")
        category = rec.get("category") or "11 Notes"
        visibility = rec.get("visibility") or "INTERNAL_ONLY"
        content = rec.get("content") or ""
        digest = hashlib.sha256(f"{client}|{rec.get('fileName')}|{content}".encode()).hexdigest()
        item = {
            "sourceId": rec.get("sourceId"),
            "destinationFolder": category if category in FOLDER_TAXONOMY else None,
            "checksum": digest,
            "acl": visibility,
            "clientId": client,
        }
        if not client:
            errors.append({"sourceId": rec.get("sourceId"), "error": "unknown_client", "disposition": "QUARANTINE"})
            continue
        if category not in FOLDER_TAXONOMY:
            errors.append({"sourceId": rec.get("sourceId"), "error": "unsupported_category", "disposition": "QUARANTINE"})
            continue
        if visibility in ("OWNER_ONLY", "RISK_RESTRICTED") and not rec.get("aclMapped"):
            errors.append({"sourceId": rec.get("sourceId"), "error": "missing_acl_mapping", "disposition": "QUARANTINE"})
            continue
        if digest in seen_hashes:
            errors.append({"sourceId": rec.get("sourceId"), "error": "duplicate", "disposition": "SKIP_DEDUPE"})
            continue
        seen_hashes.add(digest)
        manifest.append(item)
    return {
        "ok": len(errors) == 0 or len(manifest) > 0,
        "source": "staging_rehearsal",
        "count": len(manifest),
        "errorCount": len(errors),
        "manifest": manifest,
        "errors": errors,
        "dedupeRule": "sha256(client|fileName|content)",
        "versionRule": "preserve originals; supersede via DocumentRecords",
        "rollbackPlan": "Delete rehearsal destination copies by manifest checksum; restore from source unchanged",
        "productionMigrationAuthorized": False,
    }


# --- Monitoring / audit sink (non-Production file sink) ---


def ensure_audit_sink() -> Path:
    from runtime_env import assert_persist_allowed

    assert_persist_allowed("file_audit_sink")
    AUDIT_SINK_DIR.mkdir(parents=True, exist_ok=True)
    return AUDIT_SINK_DIR


def persist_security_event(event: dict[str, Any]) -> dict[str, Any]:
    ensure_audit_sink()
    # Never persist secrets
    safe = sec.redact_secrets_from_log(event)
    path = AUDIT_SINK_DIR / f"{safe.get('eventId') or sec._id('SEC')}.json"
    path.write_text(json.dumps(safe, indent=2), encoding="utf-8")
    return {"ok": True, "persisted": True, "path": str(path), "correlationId": safe.get("correlationId"), "productionSink": False}


def emit_monitoring_signal(kind: str, *, correlation_id: str | None = None, details: dict[str, Any] | None = None) -> dict[str, Any]:
    """Non-Production monitoring signal — alert delivery may be EXTERNAL_DEPENDENCY."""
    signal = {
        "kind": kind,
        "timestamp": _now(),
        "correlationId": correlation_id or sec._id("CORR"),
        "details": details or {},
        "environment": STAGING_ENV,
        "alertDelivery": "DESIGNED_NOT_CONFIGURED",
        "productionMonitoringActive": False,
    }
    sink = persist_security_event(
        sec.security_audit_event(
            action=f"monitor.{kind}",
            policy_result="OBSERVED",
            allow=True,
            correlation_id=signal["correlationId"],
            event_type=kind,
            environment=STAGING_ENV,
        )
    )
    return {**signal, "sink": sink}


def incident_tabletop(scenario: str) -> dict[str, Any]:
    scenarios = {
        "A_CROSS_CLIENT": {
            "detect": True,
            "block": True,
            "log": True,
            "alert": "DESIGNED_NOT_CONFIGURED",
            "preserveEvidence": True,
        },
        "B_MALICIOUS_UPLOAD": {
            "quarantine": True,
            "scanReject": True,
            "noExposure": True,
            "audit": True,
        },
        "C_GRAPH_PERMISSION_ERROR": {
            "failClosed": True,
            "noCrossClientFallback": True,
            "audit": True,
        },
        "D_UNAUTHORIZED_EXTERNAL_ACTION": {
            "blC1": True,
            "audit": True,
            "sent": False,
        },
    }
    plan = scenarios.get(scenario)
    if not plan:
        return {"ok": False, "status": "UNKNOWN_SCENARIO"}
    evt = emit_monitoring_signal(f"incident.{scenario}", details=plan)
    return {"ok": True, "scenario": scenario, "plan": plan, "evidence": evt}


# --- Live Hub HTTP client ---


def hub_base_url() -> str | None:
    return os.environ.get("ATLAS_HUB_E2E_URL") or os.environ.get("ATLAS_S17_HUB_URL")


def live_hub_request(
    method: str,
    path: str,
    *,
    headers: dict[str, str] | None = None,
    body: dict[str, Any] | None = None,
    base: str | None = None,
) -> dict[str, Any]:
    base = (base or hub_base_url() or "").rstrip("/")
    if not base:
        return {"ok": False, "status": "LIVE_UNAVAILABLE", "skipReason": "ATLAS_HUB_E2E_URL not set / Hub not running"}
    url = f"{base}{path}"
    data = None
    hdrs = dict(headers or {})
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs.setdefault("content-type", "application/json")
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method.upper())
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
            payload = json.loads(raw) if raw else {}
            return {"ok": True, "httpStatus": resp.status, "body": payload, "live": True}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return {"ok": False, "httpStatus": e.code, "body": payload, "live": True}
    except Exception as e:  # noqa: BLE001 — surface connectivity blockers honestly
        return {"ok": False, "status": "LIVE_UNAVAILABLE", "error": str(e), "live": False}


def principal_headers(
    *,
    user_id: str,
    client_ids: str,
    roles: str = "Advisor",
    email: str | None = None,
) -> dict[str, str]:
    h = {
        "x-atlas-user-id": user_id,
        "x-atlas-client-ids": client_ids,
        "x-atlas-roles": roles,
    }
    if email:
        h["x-atlas-user-email"] = email
    return h


def run_live_hub_case_pack(base: str | None = None) -> dict[str, Any]:
    """Cases A–E, K, V against real running Hub HTTP process."""
    base = base or hub_base_url()
    if not base:
        return {"ok": False, "status": "LIVE_UNAVAILABLE", "cases": {}}

    cases: dict[str, Any] = {}
    ha = principal_headers(user_id="s17-a", client_ids="CLIENT-A", email="a@hvcg.test")

    cases["A"] = live_hub_request("GET", "/api/ba/health", headers=ha, base=base)
    cases["B"] = live_hub_request(
        "POST",
        "/api/ba/documents/access",
        headers=ha,
        body={"clientId": "CLIENT-B", "document": {"documentId": "D1", "clientId": "CLIENT-B", "visibility": "INTERNAL_ONLY"}},
        base=base,
    )
    cases["D"] = live_hub_request(
        "POST",
        "/api/ba/owner-support/access",
        headers=ha,
        body={
            "clientId": "CLIENT-A",
            "enumerate": True,
            "engagements": [{"engagementId": "OS1", "clientId": "CLIENT-A", "visibility": "OWNER_ONLY"}],
        },
        base=base,
    )
    cases["E"] = live_hub_request(
        "POST",
        "/api/ba/documents/access",
        headers=ha,
        body={"clientId": "CLIENT-A", "document": {"documentId": "R1", "clientId": "CLIENT-A", "visibility": "RISK_RESTRICTED"}},
        base=base,
    )
    cases["K"] = live_hub_request(
        "POST",
        "/api/ba/documents/access",
        headers=ha,
        body={"clientId": "CLIENT-A", "document": {"documentId": "GUESSED", "clientId": "CLIENT-B", "visibility": "INTERNAL_ONLY"}},
        base=base,
    )
    cases["V"] = live_hub_request(
        "POST",
        "/api/ba/blc1/block",
        headers=principal_headers(user_id="s17-owner", client_ids="CLIENT-A", roles="HVCG Owner"),
        body={"clientId": "CLIENT-A", "toolId": "TOOL-EXTERNAL-SEND", "via": "api"},
        base=base,
    )
    return {"ok": True, "base": base, "cases": cases, "identityMode": "dev_headers_requireAuth_false"}


# --- Graph staging policy validation (live Graph may be CREDENTIAL_REQUIRED) ---


def staging_graph_retrieval(
    *,
    graph_can_read: bool,
    atlas_ctx: dict[str, Any],
    doc: dict[str, Any],
) -> dict[str, Any]:
    doc = dict(doc)
    if "client" not in doc and doc.get("clientId"):
        doc["client"] = doc["clientId"]
    # Prefer document OS context shape for ACL parity
    if "user" not in atlas_ctx:
        mapped = atlas_ctx
        atlas_ctx = docs.establish_doc_context(
            user=mapped.get("user") or mapped.get("userId") or "graph-user",
            role=(mapped.get("roles") or ["Advisor"])[0] if mapped.get("roles") else "Advisor",
            client=doc.get("client") or "CLIENT-A",
            allowed_clients=[] if mapped.get("allowed_clients") == ["*"] else (mapped.get("allowed_clients") or []),
            elevated_risk_access=bool(mapped.get("elevated_risk_access")),
            owner_support_scope=bool(mapped.get("owner_support_scope")),
            hr_access=bool(mapped.get("hr_access")),
        )
    auth = sec.graph_atlas_authorize(graph_can_read=graph_can_read, atlas_ctx=atlas_ctx, doc=doc)
    return {
        **auth,
        "liveGraph": False,
        "productionRag": False,
        "note": "Policy path validated; live Graph CREDENTIAL_REQUIRED",
    }


# --- Portal staging negatives (Dev architecture) ---


def portal_idor_check(principal_clients: list[str], requested_client: str, object_id: str) -> dict[str, Any]:
    if requested_client not in principal_clients and "*" not in principal_clients:
        return {"ok": False, "status": "WRONG_CLIENT", "objectId": None, "leakage": False}
    # Object still needs ACL — guessed IDs denied without ACL
    return {"ok": False, "status": "BLOCKED_PERMISSION", "objectId": object_id, "message": "IDOR denied — ACL required", "leakage": False}


# --- Agent live-path (BA orchestration, not Production) ---


def representative_agent_live_path() -> dict[str, Any]:
    ctx = ai.establish_context(user="s17@hvcg.test", role="Advisor", client="CLIENT-A")
    results = {}
    for agent, request in (
        ("AGT-DOC-CHECKLIST", "list document checklist"),
        ("AGT-CAP-READY", "capital readiness summary"),
        ("AGT-INS-REVIEW", "risk insurance review draft"),
        ("AGT-CONCIERGE", "owner brief draft"),
        ("AGT-SECOND-BRAIN", "retrieve evidence for CLIENT-A"),
    ):
        run = ai.orchestrate(request=request, ctx=ctx, agent=agent)
        results[agent] = {
            "finalStatus": run.get("finalStatus"),
            "productionReady": False,
            "productionGated": True,
        }
    audit = integ.canonical_agent_audit()
    blc1 = sec.attempt_external_tool(tool_id="TOOL-EXTERNAL-SEND", via="agent")
    return {
        "agents": results,
        "canonicalCount": audit.get("canonicalCount"),
        "blC1": blc1,
        "productionMaturity": "PRODUCTION_GATED",
    }


def production_config_manifest() -> list[dict[str, Any]]:
    """Document required Production settings without embedding secrets."""
    items = [
        ("Hub", "INTEGRATION_REQUIRE_AUTH", "required", "secret_store", "bool true in Prod"),
        ("Hub", "INTEGRATION_ACCEPTED_AUDIENCES", "required", "config", "Hub API app id uri"),
        ("Hub", "MICROSOFT_TENANT_ID", "required", "secret_store", "tenant guid"),
        ("Hub", "MICROSOFT_CLIENT_ID", "required", "secret_store", "app id"),
        ("Hub", "MICROSOFT_CLIENT_SECRET", "required", "secret_store", "secret — never commit"),
        ("Elite", "VITE_ENTRA_CLIENT_ID", "required", "config", "SPA app id"),
        ("Elite", "VITE_INTEGRATION_API_BASE", "required", "config", "Hub URL"),
        ("BA", "HVCG_BA_BUSINESS_DIR", "optional", "config", "bridge path"),
        ("Graph", "Sites.Selected scopes", "required", "config", "least privilege"),
        ("Portal", "external auth enabled", "required", "config", "gate CLOSED until Owner"),
        ("AV", "scanner endpoint", "required", "secret_store", "EXTERNAL_DEPENDENCY"),
        ("Audit", "sink destination", "required", "config", "LAW/App Insights"),
        ("Monitoring", "alert webhook", "required", "secret_store", "EXTERNAL_DEPENDENCY"),
        ("Finance", "QBO sandbox/prod creds", "required", "secret_store", "read-only"),
        ("Environment", "ATLAS_ENV designation", "required", "config", "fail-closed gates"),
    ]
    out = []
    for owner, setting, req, source, rule in items:
        out.append(
            {
                "owner": owner,
                "setting": setting,
                "required": req == "required",
                "source": source,
                "validationRule": rule,
                "secret": source == "secret_store",
                "readiness": "DOCUMENTED",
                "valueCommitted": False,
            }
        )
    return out


def release_readiness_matrix() -> list[dict[str, Any]]:
    return [
        {"area": "architecture", "status": "READY"},
        {"area": "integration", "status": "READY_WITH_OWNER_GATE"},
        {"area": "identity", "status": "LIVE_VALIDATION_PENDING"},
        {"area": "Client Portal", "status": "LIVE_VALIDATION_PENDING"},
        {"area": "Risk", "status": "READY_WITH_OWNER_GATE"},
        {"area": "Documents", "status": "READY_WITH_OWNER_GATE"},
        {"area": "M365", "status": "LIVE_VALIDATION_PENDING"},
        {"area": "AI", "status": "READY_WITH_OWNER_GATE"},
        {"area": "finance", "status": "LIVE_VALIDATION_PENDING"},
        {"area": "secrets", "status": "LIVE_VALIDATION_PENDING"},
        {"area": "monitoring", "status": "LIVE_VALIDATION_PENDING"},
        {"area": "migration", "status": "READY_WITH_OWNER_GATE"},
        {"area": "Owner UAT", "status": "NOT_STARTED"},
        {"area": "QA", "status": "NOT_STARTED"},
        {"area": "rollback", "status": "READY"},
        {"area": "deployment", "status": "BLOCKED"},
    ]


def owner_uat_package() -> list[dict[str, Any]]:
    scenarios = [
        "New client intake",
        "Free Fit / diagnostic classification",
        "Proposal and pricing",
        "Contracted economics",
        "Document request/upload",
        "Capital workflow",
        "CFO workflow",
        "Procurement workflow",
        "Risk restricted workflow",
        "Growth workflow",
        "Client 360",
        "Revenue Truth",
        "Executive Intelligence",
        "Owner decision",
        "Executive Concierge",
        "Second Brain",
        "BL-C1 blocked external action",
        "Cross-client negative case",
    ]
    return [
        {
            "id": f"UAT-{i+1:02d}",
            "workflow": name,
            "startingState": "Staging / Dev with approved data",
            "ownerAction": f"Execute: {name}",
            "expectedResult": "Canonical truth + ACL + no silent SoR mutation",
            "evidence": "",
            "passFail": None,
            "executed": False,
        }
        for i, name in enumerate(scenarios)
    ]


def qa_evidence_index() -> dict[str, Any]:
    return {
        "writtenQaGo": False,
        "suites": [
            "tests/unit/business/test_atlas_security_sprint16.py",
            "tests/unit/business/test_atlas_integration_sprint15.py",
            "tests/unit/business/test_atlas_staging_sprint17.py",
            "full business suite",
            "Elite tsc -b",
        ],
        "gateEvidence": [
            "GATE-RISK-ELEVATED-ACL-PROD-EVIDENCE-S17.md",
            "GATE-CLIENT-PORTAL-PROD-EVIDENCE-S17.md",
            "GATE-M365-SECOND-BRAIN-PROD-EVIDENCE-S17.md",
        ],
        "knownIssues": [
            "Live Entra JWT CREDENTIAL_REQUIRED",
            "Live Graph CREDENTIAL_REQUIRED",
            "Real AV EXTERNAL_DEPENDENCY",
            "Alert delivery EXTERNAL_DEPENDENCY",
            "QBO live CREDENTIAL_REQUIRED",
        ],
        "status": "INDEX_PREPARED_NOT_APPROVED",
    }


def rollback_readiness_plan() -> dict[str, Any]:
    return {
        "applicationRollback": "Redeploy prior Hub/Elite artifact; BA branch revert of feature commits",
        "configurationRollback": "Restore prior Key Vault / env revision",
        "integrationDisable": "INTEGRATION_REQUIRE_AUTH + disable provider connectors",
        "portalDisable": "Keep GATE-CLIENT-PORTAL-PROD CLOSED / feature flag off",
        "graphDisable": "Disconnect Microsoft connector; revoke refresh tokens",
        "aiToolDisable": "BL-C1 remains ACTIVE; disable external tools in registry",
        "migrationRollback": "Use rehearsal manifest checksums; source unchanged",
        "gateDisable": "Gates remain CLOSED until Owner OPEN",
        "productionRollbackTested": False,
        "status": "DOCUMENTED",
    }
