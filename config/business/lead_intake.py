"""Development Lead Intake — canonical HVCG_Leads contract (non-Production).

Thin Dev persistence for Owner UAT-01. Does NOT write Track 1 Production CRM.
Does NOT create a second CRM SoR — schema mirrors HVCG_Leads list columns.
Future Track 1 replacement: swap adapter; keep field contract.
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import atlas_security as sec

RUNTIME_LABEL = "DEV_LEAD_ADAPTER"
STORE_DIR = Path(__file__).resolve().parents[2] / ".data" / "dev-leads"
LEAD_STATUSES = ("New", "Contacted", "Qualified", "Disqualified", "Converted")
SERVICE_INTERESTS = (
    "Assessment",
    "Capital Advisory",
    "Fractional CFO",
    "Operational Consulting",
    "Growth",
    "Retainer",
    "Success Fee",
    "Hybrid",
    "Other",
)
NEXT_ACTION_FREE_FIT = "Complete Free Fit & Readiness Assessment"
CONVERSION_BOUNDARY = "READY_FOR_CLIENT_CONVERSION"  # handoff marker — not auto-conversion


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id() -> str:
    return f"LEAD-DEV-{uuid.uuid4().hex[:10].upper()}"


def lead_sources() -> list[str]:
    # attribution-taxonomy.json is JSONC (leading block comment) — strip before parse.
    path = Path(__file__).resolve().parent / "attribution-taxonomy.json"
    raw = path.read_text(encoding="utf-8")
    raw = re.sub(r"/\*.*?\*/", "", raw, count=1, flags=re.DOTALL).strip()
    tax = json.loads(raw)
    return list(tax.get("leadSources") or [])


def store_path() -> Path:
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    return STORE_DIR / "leads.json"


def _load_all() -> list[dict[str, Any]]:
    p = store_path()
    if not p.exists():
        return []
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return list(data.get("leads") or [])
    except json.JSONDecodeError:
        return []


def _save_all(leads: list[dict[str, Any]]) -> None:
    store_path().write_text(
        json.dumps(
            {
                "adapter": RUNTIME_LABEL,
                "canonicalContract": "HVCG_Leads",
                "productionCrm": False,
                "track1Frozen": True,
                "leads": leads,
                "updatedAt": _now(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def normalize_company(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip()).lower()


def find_duplicate(company: str, contact: str | None = None) -> dict[str, Any] | None:
    key = normalize_company(company)
    ckey = (contact or "").strip().lower()
    for lead in _load_all():
        if normalize_company(lead.get("Title") or "") != key:
            continue
        if ckey and (lead.get("ContactName") or "").strip().lower() != ckey:
            continue
        return lead
    return None


def create_lead(
    *,
    title: str,
    contact_name: str | None = None,
    email: str | None = None,
    source: str | None = None,
    lead_source_detail: str | None = None,
    service_interest: str | None = None,
    business_need: str | None = None,
    notes: str | None = None,
    force_duplicate: bool = False,
    actor: str | None = None,
) -> dict[str, Any]:
    """Create Development lead using HVCG_Leads field names."""
    title = (title or "").strip()
    if not title:
        return {"ok": False, "status": "MISSING_CONTEXT", "message": "Title (company) required"}

    sources = lead_sources()
    src = source or "Other"
    if src not in sources:
        return {"ok": False, "status": "FORBIDDEN", "message": f"Source must be canonical: {sources}"}

    svc = service_interest or "Other"
    if svc not in SERVICE_INTERESTS:
        return {"ok": False, "status": "FORBIDDEN", "message": f"ServiceInterest invalid: {svc}"}

    dup = find_duplicate(title, contact_name)
    if dup and not force_duplicate:
        return {
            "ok": False,
            "status": "DUPLICATE",
            "message": "Matching prospect already exists — open existing or forceDistinct",
            "existingLeadId": dup.get("LeadId"),
            "existing": {
                "LeadId": dup.get("LeadId"),
                "Title": dup.get("Title"),
                "LeadStatus": dup.get("LeadStatus"),
            },
            "silentDuplicateCreated": False,
        }

    lead_id = _id()
    is_referral = src == "Referral Partner" or bool(lead_source_detail)
    need = (business_need or "").strip()
    note_parts = [n for n in [notes, f"Business need: {need}" if need else None] if n]
    lead = {
        "LeadId": lead_id,
        "Title": title,
        "ContactName": (contact_name or "").strip() or None,
        "Email": (email or "").strip() or None,
        "Source": src,
        "LeadSourceDetail": (lead_source_detail or "").strip() or None,
        "IsReferral": is_referral,
        "LeadStatus": "New",
        "ServiceInterest": svc,
        "BusinessNeed": need or None,
        "Notes": "\n".join(note_parts) if note_parts else None,
        "ConvertedClientId": None,
        "ConvertedOpportunityId": None,
        "NextAction": NEXT_ACTION_FREE_FIT,
        "ConversionBoundary": CONVERSION_BOUNDARY,
        "LifecycleLabel": "PROSPECT / LEAD",
        "IsClient360Client": False,
        "ContractedEconomicsCreated": False,
        "Adapter": RUNTIME_LABEL,
        "ProductionCrm": False,
        "CreatedAt": _now(),
        "UpdatedAt": _now(),
        "CreatedBy": actor or "dev-uat",
        "HVCG_IdempotencyKey": f"uat-{lead_id}",
    }

    leads = _load_all()
    leads.append(lead)
    _save_all(leads)

    audit = sec.security_audit_event(
        action="intake.created",
        policy_result="ALLOW",
        allow=True,
        actor=actor,
        event_type="intake_created",
        environment="DEV",
        matter=lead_id,
    )
    return {
        "ok": True,
        "status": "SUCCESS",
        "lead": lead,
        "audit": audit,
        "blC1Active": True,
        "sent": False,
        "productionCrmWritten": False,
    }


def get_lead(lead_id: str) -> dict[str, Any]:
    for lead in _load_all():
        if lead.get("LeadId") == lead_id:
            return {"ok": True, "status": "SUCCESS", "lead": lead}
    return {"ok": False, "status": "FORBIDDEN", "message": "Lead not found", "leakage": False}


def list_leads() -> dict[str, Any]:
    leads = sorted(_load_all(), key=lambda x: x.get("CreatedAt") or "", reverse=True)
    return {
        "ok": True,
        "status": "SUCCESS",
        "count": len(leads),
        "leads": leads,
        "adapter": RUNTIME_LABEL,
        "productionCrm": False,
        "note": "Prospects/Leads — not Client 360 active clients",
    }


def patch_lead(lead_id: str, fields: dict[str, Any], *, actor: str | None = None) -> dict[str, Any]:
    """Development-only field patch — does not convert to Client / Production CRM."""
    leads = _load_all()
    for i, lead in enumerate(leads):
        if lead.get("LeadId") != lead_id:
            continue
        forbidden = {"ConvertedClientId", "IsClient360Client", "ContractedEconomicsCreated"}
        for k, v in fields.items():
            if k in ("LeadId", "Adapter", "ProductionCrm", "CreatedAt"):
                continue
            # Allow explicit False/None for boundary fields
            if k in forbidden and v not in (False, None):
                continue
            lead[k] = v
        lead["UpdatedAt"] = _now()
        if actor:
            lead["UpdatedBy"] = actor
        # Hard boundaries
        lead["ProductionCrm"] = False
        if fields.get("IsClient360Client") is not True:
            lead["IsClient360Client"] = False
        if fields.get("ContractedEconomicsCreated") is not True:
            lead["ContractedEconomicsCreated"] = False
        leads[i] = lead
        _save_all(leads)
        sec.security_audit_event(
            action="intake.updated",
            policy_result="ALLOW",
            allow=True,
            actor=actor,
            event_type="intake_updated",
            environment="DEV",
            matter=lead_id,
        )
        return {"ok": True, "status": "SUCCESS", "lead": lead}
    return {"ok": False, "status": "FORBIDDEN", "message": "Lead not found", "leakage": False}


def attempt_external_followup() -> dict[str, Any]:
    return sec.attempt_external_tool(tool_id="TOOL-EXTERNAL-SEND", via="lead_intake")


def assert_not_client(lead: dict[str, Any]) -> bool:
    return (
        lead.get("LeadStatus") != "Converted"
        and not lead.get("ConvertedClientId")
        and not lead.get("IsClient360Client")
        and not lead.get("ContractedEconomicsCreated")
    )
