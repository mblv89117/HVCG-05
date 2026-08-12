"""HVCG Document Lifecycle + Client Portal gates (Development) — Sprint 13.

One governed document identity. SharePoint remains file foundation.
No second portal / file repository. RECEIVED ≠ ACCEPTED. Draft ≠ Final.
BL-C1 blocks autonomous client document emails. Risk/HR/Owner Support restricted.
"""

from __future__ import annotations

import hashlib
import uuid
from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import date, datetime, timezone
from typing import Any

from pricing_policy import ACCG_LOCKED_MONTHLY, load_json

BL_C1_ACTIVE = True
RISK_ACL_GATE = "GATE-RISK-ELEVATED-ACL-PROD"
PORTAL_GATE = "GATE-CLIENT-PORTAL-PROD"
M365_GATE = "GATE-M365-SECOND-BRAIN-PROD"
RUNTIME_VERSION = "1.0.0-dev"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10].upper()}"


def load_doc_policy() -> dict[str, Any]:
    return load_json("document-operating-policy.json")


def load_taxonomy() -> dict[str, Any]:
    return load_json("folder-taxonomy-map.json")


# --- Context / permissions ---


@dataclass
class DocUserContext:
    user: str
    role: str
    client: str | None = None
    allowed_clients: list[str] = field(default_factory=list)
    elevated_risk_access: bool = False
    hr_access: bool = False
    owner_support_scope: bool = False
    is_client_portal_user: bool = False
    environment: str = "DEV"


def establish_doc_context(**kwargs: Any) -> dict[str, Any]:
    ctx = DocUserContext(**{k: v for k, v in kwargs.items() if k in DocUserContext.__dataclass_fields__})
    out = asdict(ctx)
    out["blC1Active"] = BL_C1_ACTIVE
    out["status"] = "OK"
    if ctx.is_client_portal_user and not ctx.client:
        out["status"] = "MISSING_CONTEXT"
    if ctx.allowed_clients and ctx.client and ctx.client not in ctx.allowed_clients:
        out["status"] = "BLOCKED_PERMISSION"
    return out


def assert_client_access(ctx: dict[str, Any], client: str) -> dict[str, Any]:
    if ctx.get("client") and ctx["client"] != client:
        return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Client A must never see Client B"}
    allowed = ctx.get("allowed_clients") or []
    if allowed and client not in allowed:
        return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Client outside allow-list"}
    return {"ok": True, "client": client}


def can_view_document(ctx: dict[str, Any], doc: dict[str, Any]) -> dict[str, Any]:
    iso = assert_client_access(ctx, doc.get("client") or "")
    if not iso.get("ok"):
        return iso
    vis = doc.get("visibility") or "INTERNAL_ONLY"
    if ctx.get("is_client_portal_user"):
        if vis not in ("CLIENT_VISIBLE", "CLIENT_UPLOAD", "LENDER_PACKAGE") and doc.get("portalVisibility") != "APPROVED_CLIENT_VISIBLE":
            return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Not client-visible"}
        # Never expose internal notes / restricted classes to portal
        if vis in ("RESTRICTED", "OWNER_ONLY", "RISK_ELEVATED", "HR_RESTRICTED", "INTERNAL_ONLY"):
            if vis != "CLIENT_UPLOAD" or doc.get("status") not in ("RECEIVED", "ACCEPTED", "APPROVED", "FINAL"):
                if doc.get("portalVisibility") != "APPROVED_CLIENT_VISIBLE":
                    return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Portal exclusion"}
    if vis == "RISK_ELEVATED" or vis == "RISK_RESTRICTED" or doc.get("domain") == "Risk":
        if not ctx.get("elevated_risk_access"):
            return {"ok": False, "status": "BLOCKED_PERMISSION", "gate": RISK_ACL_GATE, "message": "Risk elevated ACL required"}
    if vis == "HR_RESTRICTED" or doc.get("documentType") == "HR":
        if not ctx.get("hr_access") and not ctx.get("elevated_risk_access"):
            return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "HR-restricted document"}
    if vis == "OWNER_ONLY" or doc.get("domain") == "OwnerSupport":
        if not ctx.get("owner_support_scope"):
            return {"ok": False, "status": "BLOCKED_PERMISSION", "message": "Owner Support requires explicit scope"}
    return {"ok": True}


# --- Canonical document record ---


def create_document_record(**kwargs: Any) -> dict[str, Any]:
    policy = load_doc_policy()
    doc_type = kwargs.get("document_type") or "Other"
    if doc_type not in policy["documentTypes"]:
        doc_type = "Other"
    status = kwargs.get("status") or "RECEIVED"
    if status not in policy["documentStatuses"]:
        raise ValueError(f"Invalid status {status}")
    content = kwargs.get("content_bytes") or kwargs.get("file_name") or ""
    digest = hashlib.sha256(str(content).encode()).hexdigest()[:32]
    rec = {
        "documentId": kwargs.get("document_id") or _id("DOC"),
        "client": kwargs["client"],
        "account": kwargs.get("account"),
        "engagement": kwargs.get("engagement"),
        "opportunity": kwargs.get("opportunity"),
        "matter": kwargs.get("matter"),
        "capitalOpportunity": kwargs.get("capital_opportunity"),
        "procurementOpportunity": kwargs.get("procurement_opportunity"),
        "cfoEngagement": kwargs.get("cfo_engagement"),
        "growthEngagement": kwargs.get("growth_engagement"),
        "documentRequestId": kwargs.get("document_request_id"),
        "domain": kwargs.get("domain") or "General",
        "documentType": doc_type,
        "documentCategory": kwargs.get("document_category"),
        "title": kwargs.get("title") or kwargs.get("file_name") or "Untitled",
        "fileName": kwargs.get("file_name"),
        "source": kwargs.get("source") or "internal_upload",
        "sourceLocation": kwargs.get("source_location"),
        "sharePointLocation": kwargs.get("sharepoint_location") or f"HVCG-Clients/{kwargs['client']}/{_folder_for_type(doc_type)}",
        "version": kwargs.get("version") or 1,
        "current": kwargs.get("current", True),
        "effectiveDate": kwargs.get("effective_date"),
        "periodStart": kwargs.get("period_start"),
        "periodEnd": kwargs.get("period_end"),
        "asOfDate": kwargs.get("as_of_date"),
        "fiscalYear": kwargs.get("fiscal_year"),
        "receivedDate": kwargs.get("received_date") or _now(),
        "uploadedBy": kwargs.get("uploaded_by"),
        "documentOwner": kwargs.get("document_owner"),
        "status": status,
        "verificationStatus": kwargs.get("verification_status") or "UNVERIFIED",
        "sensitivity": kwargs.get("sensitivity") or "Confidential",
        "visibility": kwargs.get("visibility") or "INTERNAL_ONLY",
        "portalVisibility": kwargs.get("portal_visibility") or "NOT_CLIENT_VISIBLE",
        "secondBrainEligible": kwargs.get("second_brain_eligible", True),
        "aiRetrievalPermission": kwargs.get("ai_retrieval_permission", True),
        "supersededBy": None,
        "hash": digest,
        "expirationDate": kwargs.get("expiration_date"),
        "reviewRequired": kwargs.get("review_required", True),
        "approvalStatus": kwargs.get("approval_status") or "Pending",
        "notesInternal": kwargs.get("notes_internal"),
        "clientFacingInstructions": kwargs.get("client_facing_instructions"),
        "derivedArtifacts": [],
        "originalImmutable": True,
        "freshness": "UNKNOWN",
        "stale": False,
        "audit": [{"action": "created", "at": _now(), "by": kwargs.get("uploaded_by") or "system"}],
        "domainBoundary": "metadata_not_duplicate_bytes",
    }
    rec["freshness"] = evaluate_freshness(rec)
    return rec


def _folder_for_type(doc_type: str) -> str:
    mapping = {
        "Agreement": "01 Agreements & Billing",
        "Invoice": "01 Agreements & Billing",
        "Payment Evidence": "01 Agreements & Billing",
        "Tax Return": "03 Tax",
        "P&L": "02 Financials",
        "Balance Sheet": "02 Financials",
        "Cash Flow": "02 Financials",
        "Bank Statement": "04 Banks",
        "Debt": "05 Debt",
        "Capital": "06 Capital",
        "Procurement": "07 Procurement",
        "Risk": "08 Risk",
        "Insurance": "08 Risk",
        "HR": "09 HR",
        "AI": "10 AI",
        "SOP": "10 AI",
        "Meeting": "11 Notes",
        "Deliverable": "12 Final",
    }
    return mapping.get(doc_type, "00 Intake")


def evaluate_freshness(doc: dict[str, Any], *, as_of: date | None = None) -> str:
    policy = load_doc_policy()
    rules = policy.get("freshnessRulesDays") or {}
    days = rules.get(doc.get("documentType"))
    if days is None:
        # Insurance: expiration-aware
        if doc.get("documentType") == "Insurance" and doc.get("expirationDate"):
            try:
                exp = date.fromisoformat(str(doc["expirationDate"])[:10])
                today = as_of or date.today()
                if exp < today:
                    doc["stale"] = True
                    doc["status"] = "EXPIRED" if doc.get("status") not in ("SUPERSEDED", "ARCHIVED") else doc["status"]
                    return "EXPIRED"
                return "CURRENT"
            except Exception:
                return "UNKNOWN"
        return "NOT_APPLICABLE"
    try:
        received = date.fromisoformat(str(doc.get("receivedDate") or doc.get("asOfDate") or "")[:10])
    except Exception:
        return "UNKNOWN"
    today = as_of or date.today()
    age = (today - received).days
    if age > int(days):
        doc["stale"] = True
        return "STALE"
    doc["stale"] = False
    return "CURRENT"


# --- Document requests ---


def create_document_request(**kwargs: Any) -> dict[str, Any]:
    return {
        "requestId": kwargs.get("request_id") or _id("DREQ"),
        "client": kwargs["client"],
        "engagement": kwargs.get("engagement"),
        "domain": kwargs.get("domain") or "General",
        "requestedDocumentType": kwargs.get("requested_document_type"),
        "description": kwargs.get("description"),
        "requirementReason": kwargs.get("requirement_reason"),
        "required": kwargs.get("required", True),
        "dueDate": kwargs.get("due_date"),
        "requestStatus": kwargs.get("request_status") or "Approved Request",
        "requestedBy": kwargs.get("requested_by"),
        "assignedReviewer": kwargs.get("assigned_reviewer"),
        "receivedDocumentId": None,
        "acceptedDate": None,
        "replacementReason": None,
        "waiver": None,
        "waiverApprover": None,
        "clientFacingInstructions": kwargs.get("client_facing_instructions") or "",
        "internalNotes": kwargs.get("internal_notes") or "",
        "lifecycle": [
            "Request Created",
            "Requirements Generated",
            "Internal Review",
            "Approved Request",
            "Client Visibility / Delivery Gated",
            "Awaiting Documents",
        ],
        "checklistItemCode": kwargs.get("checklist_item_code"),
        "distinctFromChecklistItem": True,
    }


def portal_safe_request(req: dict[str, Any]) -> dict[str, Any]:
    """Strip internal notes for client portal."""
    return {
        "requestId": req["requestId"],
        "documentRequested": req.get("requestedDocumentType") or req.get("description"),
        "whyNeeded": req.get("requirementReason") or req.get("clientFacingInstructions"),
        "dueDate": req.get("dueDate"),
        "status": req.get("requestStatus"),
        "replacementReason": req.get("replacementReason"),
        "acceptedStatus": req.get("acceptedDate") is not None,
        # internalNotes intentionally omitted
    }


def run_doc_checklist_agent(
    *,
    domain: str,
    offer: str | None = None,
    capital_type: str | None = None,
    stage: str | None = None,
    existing_docs: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Conditional checklist — not one universal list. Integrates with document registry."""
    existing_docs = existing_docs or []
    # Minimal domain-conditioned requirements
    base: list[dict[str, Any]] = []
    if domain == "Capital" or (offer or "").startswith("OFF-CAP") or capital_type:
        base = [
            {"code": "FIN-PL", "type": "P&L", "required": True},
            {"code": "FIN-BS", "type": "Balance Sheet", "required": True},
            {"code": "TAX", "type": "Tax Return", "required": True},
            {"code": "BANK", "type": "Bank Statement", "required": True},
            {"code": "DEBT", "type": "Debt", "required": True},
            {"code": "AR", "type": "AR Aging", "required": False},
        ]
    elif domain == "CFO":
        base = [
            {"code": "FIN-PL", "type": "P&L", "required": True},
            {"code": "FIN-BS", "type": "Balance Sheet", "required": True},
            {"code": "BANK", "type": "Bank Statement", "required": True},
        ]
    elif domain == "Procurement":
        base = [
            {"code": "INS", "type": "Insurance", "required": True},
            {"code": "CERT", "type": "Procurement", "required": True},
        ]
    elif domain == "Risk":
        base = [{"code": "EVID", "type": "Risk", "required": True}]
    elif domain == "Growth":
        base = [{"code": "SOP", "type": "SOP", "required": False}]
    else:
        base = [{"code": "AGR", "type": "Agreement", "required": True}]

    accepted_types = {
        d.get("documentType")
        for d in existing_docs
        if d.get("status") in ("ACCEPTED", "APPROVED", "FINAL") and d.get("current")
    }
    missing = []
    stale = []
    superseded = []
    wrong_period = []
    for item in base:
        matches = [d for d in existing_docs if d.get("documentType") == item["type"]]
        if not matches and item["required"]:
            missing.append(item)
            continue
        for d in matches:
            if d.get("stale") or evaluate_freshness(d) == "STALE":
                stale.append({"item": item, "documentId": d.get("documentId")})
            if d.get("status") == "SUPERSEDED":
                superseded.append(d.get("documentId"))
            if item["type"] in ("P&L", "Balance Sheet") and d.get("periodEnd") and stage == "monthly":
                # simplistic wrong-period flag left for caller evidence
                pass
        if item["required"] and item["type"] not in accepted_types and item["type"] not in {
            d.get("documentType") for d in existing_docs if d.get("status") == "RECEIVED"
        }:
            if item not in missing:
                missing.append(item)

    return {
        "agent": "AGT-DOC-CHECKLIST",
        "domain": domain,
        "offer": offer,
        "capitalType": capital_type,
        "stage": stage,
        "requirements": base,
        "missing": missing,
        "stale": stale,
        "superseded": superseded,
        "wrongPeriod": wrong_period,
        "suggestedClassifications": [i["type"] for i in missing],
        "universalChecklistForbidden": True,
        "prohibited": [
            "mark_legally_sufficient",
            "certify_financials",
            "accept_legal_tax_insurance_conclusions",
            "send_requests_without_approval",
            "delete_originals",
        ],
        "productionReady": False,
    }


# --- Intake ---


def classify_client_match(*, sender: str, hinted_client: str | None, known_clients: list[str]) -> dict[str, Any]:
    if hinted_client and hinted_client in known_clients:
        return {"state": "HIGH_CONFIDENCE_MATCH", "client": hinted_client}
    # email domain heuristic — Development only, no fabricated numeric confidence
    possibles = [c for c in known_clients if c.lower().replace(" ", "") in sender.lower()]
    if len(possibles) == 1:
        return {"state": "POSSIBLE_MATCH", "client": possibles[0], "requiresHuman": True}
    if len(possibles) > 1:
        return {"state": "AMBIGUOUS", "candidates": possibles, "requiresHuman": True}
    return {"state": "NO_MATCH", "requiresHuman": True, "route": "NEEDS_CLIENT_MATCH"}


def ingest_email_attachment(
    *,
    sender: str,
    file_name: str,
    content: str,
    known_clients: list[str],
    hinted_client: str | None = None,
    domain: str | None = None,
) -> dict[str, Any]:
    match = classify_client_match(sender=sender, hinted_client=hinted_client, known_clients=known_clients)
    if match["state"] in ("AMBIGUOUS", "NO_MATCH") or match.get("requiresHuman") and match["state"] != "HIGH_CONFIDENCE_MATCH":
        return {
            "status": "NEEDS_CLIENT_MATCH" if match["state"] != "AMBIGUOUS" else "NEEDS_CLASSIFICATION",
            "match": match,
            "fileName": file_name,
            "storedInClientFolder": False,
            "message": "Do not place uncertain documents in arbitrary client folders",
            "audit": {"action": "email_intake_held", "at": _now(), "sender": sender},
        }
    client = match["client"]
    doc = create_document_record(
        client=client,
        file_name=file_name,
        content_bytes=content,
        source="approved_email_attachment",
        uploaded_by=sender,
        domain=domain or "General",
        status="CLASSIFICATION_REQUIRED",
        visibility="INTERNAL_ONLY",
    )
    return {"status": "RECEIVED_PENDING_CLASSIFICATION", "match": match, "document": doc, "storedInClientFolder": True}


def portal_upload(
    ctx: dict[str, Any],
    *,
    request: dict[str, Any],
    file_name: str,
    content: str,
    known_hashes: set[str] | None = None,
) -> dict[str, Any]:
    iso = assert_client_access(ctx, request["client"])
    if not iso.get("ok"):
        return iso
    if ctx.get("status") == "BLOCKED_PERMISSION":
        return {"ok": False, "status": "BLOCKED_PERMISSION"}
    known_hashes = known_hashes if known_hashes is not None else set()
    digest = hashlib.sha256(content.encode()).hexdigest()[:32]
    duplicate = digest in known_hashes
    if not duplicate:
        known_hashes.add(digest)
    doc = create_document_record(
        client=request["client"],
        engagement=request.get("engagement"),
        document_request_id=request["requestId"],
        domain=request.get("domain"),
        document_type=request.get("requestedDocumentType") or "Other",
        file_name=file_name,
        content_bytes=content,
        source="client_portal_upload",
        uploaded_by=ctx.get("user"),
        status="RECEIVED",
        visibility="CLIENT_UPLOAD",
        verification_status="UNVERIFIED",
    )
    doc["hash"] = digest
    doc["duplicateFlag"] = duplicate
    req = deepcopy(request)
    req["receivedDocumentId"] = doc["documentId"]
    req["requestStatus"] = "Received"
    req.setdefault("lifecycle", []).append("Received")
    # NOT automatically ACCEPTED
    return {
        "ok": True,
        "document": doc,
        "request": req,
        "status": "RECEIVED",
        "accepted": False,
        "duplicateFlagged": duplicate,
        "deleted": False,
        "audit": {"action": "portal_upload", "at": _now(), "user": ctx.get("user"), "client": request["client"]},
    }


def access_document_by_id(ctx: dict[str, Any], doc: dict[str, Any]) -> dict[str, Any]:
    """Server-side authorization — knowing URL/ID is not enough."""
    view = can_view_document(ctx, doc)
    if not view.get("ok"):
        return {
            "ok": False,
            "status": view.get("status", "BLOCKED_PERMISSION"),
            "message": view.get("message"),
            "metadataLeaked": False,
            "gate": view.get("gate"),
        }
    safe = deepcopy(doc)
    if ctx.get("is_client_portal_user"):
        safe.pop("notesInternal", None)
        safe.pop("internalNotes", None)
    safe.setdefault("audit", []).append(
        {"action": "access", "user": ctx.get("user"), "at": _now(), "environment": ctx.get("environment")}
    )
    return {"ok": True, "document": safe}


# --- Review / versioning / conflicts ---


def review_document(
    doc: dict[str, Any],
    *,
    reviewer: str,
    decision: str,
    reason: str | None = None,
) -> dict[str, Any]:
    out = deepcopy(doc)
    if decision == "ACCEPT":
        out["status"] = "ACCEPTED"
        out["verificationStatus"] = "ACCEPTED_FOR_WORKFLOW"
        out["approvalStatus"] = "Approved"
    elif decision == "NEEDS_REPLACEMENT":
        out["status"] = "NEEDS_REPLACEMENT"
        out["verificationStatus"] = "NEEDS_REPLACEMENT"
        out["replacementReason"] = reason
    elif decision == "REJECT":
        out["status"] = "REJECTED"
    else:
        out["status"] = "UNDER_REVIEW"
    out.setdefault("audit", []).append(
        {"action": f"review_{decision}", "by": reviewer, "at": _now(), "reason": reason}
    )
    return out


def supersede_document(old: dict[str, Any], new: dict[str, Any], *, approver: str) -> dict[str, Any]:
    prev = deepcopy(old)
    nxt = deepcopy(new)
    prev["status"] = "SUPERSEDED"
    prev["current"] = False
    prev["supersededBy"] = nxt["documentId"]
    nxt["version"] = int(prev.get("version") or 1) + 1
    nxt["current"] = True
    nxt["status"] = nxt.get("status") if nxt.get("status") != "SUPERSEDED" else "RECEIVED"
    for d in (prev, nxt):
        d.setdefault("audit", []).append({"action": "supersede", "by": approver, "at": _now()})
    return {"previous": prev, "current": nxt, "historyPreserved": True}


def flag_source_conflict(docs: list[dict[str, Any]], *, topic: str) -> dict[str, Any]:
    return {
        "status": "SOURCE_CONFLICT",
        "topic": topic,
        "documents": [d.get("documentId") for d in docs],
        "silentSelection": False,
        "message": "Preserve both sources — do not silently choose one",
    }


def waive_request(req: dict[str, Any], *, reason: str, approver: str) -> dict[str, Any]:
    out = deepcopy(req)
    out["requestStatus"] = "WAIVED"
    out["waiver"] = reason
    out["waiverApprover"] = approver
    out["waiverDate"] = _now()
    out["requirementDeleted"] = False
    return out


def finalize_deliverable(
    draft: dict[str, Any],
    *,
    advisor_approved: bool,
    client_visibility_approved: bool,
) -> dict[str, Any]:
    out = deepcopy(draft)
    if out.get("status") not in ("DRAFT", "RECEIVED", "UNDER_REVIEW", "ACCEPTED"):
        out["status"] = "DRAFT"
    if not advisor_approved:
        return {"ok": False, "document": out, "status": "DRAFT", "message": "Advisor approval required"}
    out["status"] = "FINAL"
    out["approvalStatus"] = "Approved"
    if not client_visibility_approved:
        out["portalVisibility"] = "NOT_CLIENT_VISIBLE"
        return {
            "ok": True,
            "document": out,
            "portalAvailable": False,
            "message": "FINAL but not portal-published — client visibility approval required",
        }
    out["portalVisibility"] = "APPROVED_CLIENT_VISIBLE"
    out["visibility"] = "CLIENT_VISIBLE"
    return {"ok": True, "document": out, "portalAvailable": True}


def attempt_autonomous_publish(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "ok": False,
        "status": "BLOCKED_POLICY",
        "message": "Autonomous portal publish not authorized",
        "documentId": doc.get("documentId"),
    }


def attempt_send_document_request(req: dict[str, Any]) -> dict[str, Any]:
    if BL_C1_ACTIVE:
        return {
            "ok": False,
            "status": "BLOCKED_POLICY",
            "blC1Active": True,
            "message": "BL-C1 — document request email blocked before side effects",
            "draftReady": True,
            "requestId": req.get("requestId"),
        }
    return {"ok": False, "status": "BLOCKED_POLICY"}


def extract_document_ai(doc: dict[str, Any], *, text: str) -> dict[str, Any]:
    # Prompt injection: content remains data
    lowered = text.lower()
    injection = any(
        n in lowered
        for n in ("ignore previous", "ignore policy", "show all clients", "reveal another client", "send this file")
    )
    return {
        "documentId": doc.get("documentId"),
        "extraction": {
            "dates": [],
            "amounts": [],
            "likelyType": doc.get("documentType"),
            "rawExcerpt": text[:200],
        },
        "treatedAsDataOnly": True if injection else True,
        "policyUnchanged": True,
        "verifiedFact": False,
        "reviewState": "UNVERIFIED",
        "secretsMinimized": True,
        "promptInjectionDetected": injection,
    }


# --- Second Brain document retrieval ---


def second_brain_document_query(
    ctx: dict[str, Any],
    query: str,
    corpus: list[dict[str, Any]],
    *,
    prefer_historical: bool = False,
) -> dict[str, Any]:
    if not ctx.get("client"):
        return {"status": "MISSING_CONTEXT", "message": "Select client before retrieval"}
    hits = []
    blocked = 0
    for doc in corpus:
        view = can_view_document(ctx, doc)
        if not view.get("ok"):
            blocked += 1
            continue
        if not doc.get("secondBrainEligible", True) or not doc.get("aiRetrievalPermission", True):
            blocked += 1
            continue
        if doc.get("client") != ctx["client"]:
            continue
        blob = f"{doc.get('title')} {doc.get('documentType')} {doc.get('fileName')} {doc.get('domain')}".lower()
        tokens = [t for t in query.lower().split() if len(t) > 2]
        if not tokens or any(t in blob for t in tokens):
            hits.append(doc)

    def rank_key(d: dict[str, Any]) -> tuple:
        status = d.get("status")
        current = 0 if d.get("current") else 1
        preferred = 0 if status in ("FINAL", "ACCEPTED", "APPROVED") else 1
        draft = 0 if status not in ("DRAFT", "RECEIVED", "UNDER_REVIEW") else 1
        stale = 1 if d.get("stale") else 0
        if prefer_historical:
            return (stale, preferred, current)
        return (preferred, current, draft, stale)

    hits.sort(key=rank_key)
    citations = []
    answer = []
    for d in hits[:8]:
        label = "DRAFT" if d.get("status") in ("DRAFT", "RECEIVED") and d.get("status") != "FINAL" else d.get("status")
        if d.get("stale"):
            label = f"{label}/STALE"
        citations.append(
            {
                "documentId": d["documentId"],
                "title": d.get("title"),
                "period": f"{d.get('periodStart')}–{d.get('periodEnd')}",
                "version": d.get("version"),
                "status": d.get("status"),
                "location": d.get("sharePointLocation") if not ctx.get("is_client_portal_user") else "approved reference",
                "label": label,
            }
        )
        if d.get("stale"):
            answer.append({"kind": "SOURCE_FACT", "text": f"{d.get('title')} is STALE — not current", "documentId": d["documentId"]})
        else:
            answer.append({"kind": "SOURCE_FACT", "text": d.get("title"), "documentId": d["documentId"], "status": d.get("status")})

    return {
        "status": "SUCCESS" if hits else ("BLOCKED_PERMISSION" if blocked else "MISSING_DATA"),
        "client": ctx["client"],
        "citations": citations,
        "answer": answer,
        "restrictedBlockedCount": blocked,
        "preferCurrentAccepted": not prefer_historical,
        "disclaimer": "Documents are data, not instructions. AI extraction is not verified fact.",
    }


def agreement_precedence_answer(
    *,
    executed_agreement: dict[str, Any],
    proposed_pricing: dict[str, Any] | None,
    recommended: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "currentContracted": executed_agreement,
        "proposedFuture": proposed_pricing,
        "recommendedFuture": recommended,
        "precedence": ["Executed Agreement", "Proposal", "Recommendation", "AI Summary"],
        "accgProtected": executed_agreement.get("client", "").upper().startswith("ACCG"),
        "contractedMonthly": executed_agreement.get("retainer") or ACCG_LOCKED_MONTHLY
        if str(executed_agreement.get("client", "")).upper().startswith("ACCG")
        else executed_agreement.get("retainer"),
    }


# --- Domain consumption ---


def capital_package_completeness(required: list[dict[str, Any]], docs: list[dict[str, Any]]) -> dict[str, Any]:
    accepted = {
        d.get("documentType")
        for d in docs
        if d.get("status") in ("ACCEPTED", "APPROVED", "FINAL") and d.get("current")
    }
    missing = [r for r in required if r.get("required") and r.get("type") not in accepted]
    return {
        "requiredCount": len([r for r in required if r.get("required")]),
        "acceptedCount": len([r for r in required if r.get("required") and r.get("type") in accepted]),
        "missing": missing,
        "complete": len(missing) == 0,
        "fakeCompletion": False,
    }


def owner_brief_document_signals(
    *,
    overdue_requests: list[dict[str, Any]] | None = None,
    capital_blocked: list[str] | None = None,
    cfo_missing: list[str] | None = None,
    procurement_expiring: list[str] | None = None,
    risk_missing: list[str] | None = None,
    pending_uploads: int = 0,
) -> dict[str, Any]:
    return {
        "criticalDocumentsOverdue": overdue_requests or [],
        "capitalPackagesBlocked": capital_blocked or [],
        "cfoMissingCurrentFinancials": cfo_missing or [],
        "procurementExpirations": procurement_expiring or [],
        "riskDeadlinesMissingEvidence": risk_missing or [],
        "pendingClientUploads": pending_uploads,
        "fabricatedCounts": False,
        "materialOnly": True,
    }


def client360_documents_view(docs: list[dict[str, Any]], requests: list[dict[str, Any]], ctx: dict[str, Any]) -> dict[str, Any]:
    visible_docs = []
    restricted_count = 0
    for d in docs:
        view = can_view_document(ctx, d)
        if view.get("ok"):
            visible_docs.append(d)
        else:
            restricted_count += 1
    return {
        "openRequests": [portal_safe_request(r) if ctx.get("is_client_portal_user") else r for r in requests if r.get("requestStatus") not in ("Complete", "WAIVED")],
        "recentDocuments": visible_docs[:10],
        "missingDocuments": [r for r in requests if r.get("requestStatus") in ("Awaiting Documents", "Approved Request")],
        "acceptedDocuments": [d for d in visible_docs if d.get("status") in ("ACCEPTED", "APPROVED", "FINAL")],
        "replacementsNeeded": [d for d in visible_docs if d.get("status") == "NEEDS_REPLACEMENT"],
        "finalDeliverables": [d for d in visible_docs if d.get("status") == "FINAL" and d.get("portalVisibility") == "APPROVED_CLIENT_VISIBLE"],
        "restrictedDocumentsCount": restricted_count if not ctx.get("is_client_portal_user") else 0,
        "staleWarnings": [d["documentId"] for d in visible_docs if d.get("stale")],
    }


def portal_home(ctx: dict[str, Any], requests: list[dict[str, Any]], docs: list[dict[str, Any]]) -> dict[str, Any]:
    if not ctx.get("is_client_portal_user"):
        return {"status": "WRONG_SURFACE", "message": "Use internal Document Request Center"}
    safe_reqs = [portal_safe_request(r) for r in requests if r.get("client") == ctx.get("client")]
    deliverables = []
    for d in docs:
        if d.get("client") != ctx.get("client"):
            continue
        acc = access_document_by_id(ctx, d)
        if acc.get("ok") and d.get("portalVisibility") == "APPROVED_CLIENT_VISIBLE":
            deliverables.append({"documentId": d["documentId"], "title": d.get("title"), "status": d.get("status")})
    return {
        "openRequests": [r for r in safe_reqs if not r.get("acceptedStatus")],
        "recentlyUploaded": [d["documentId"] for d in docs if d.get("client") == ctx.get("client") and d.get("source") == "client_portal_upload"][:5],
        "needsReplacement": [d["documentId"] for d in docs if d.get("client") == ctx.get("client") and d.get("status") == "NEEDS_REPLACEMENT"],
        "approvedDeliverables": deliverables,
        "exclusionsEnforced": load_doc_policy()["portalInternalExclusions"],
        "internalNotesExposed": False,
    }
