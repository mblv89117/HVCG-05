#!/usr/bin/env python3
"""Score EVA staging JSON → lead score + SKU + CRM row fields for HVCG_Leads."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Normalized legal-name fragments from LEGACY_HVS_CLIENT_REGISTER (v1 static guard).
# Keep lowercase; matching is substring on company legal name.
LEGACY_NAME_FRAGMENTS = (
    "accg",
    "prodigy games",
    "that's kava",
    "thats kava",
    "christie's place",
    "christies place",
    "hart family dental",
    "outstanding auto detailing",
    "arboretum",
    "pierlo",
    "baker's travertine",
    "integrity lift",
    "lien partners",
    "lv appraisals",
    "colorado beef",
    "frocovery",
    "victory contracting",
)

RATE_CARD = "HVCG-PRICE-2026-07-15-v1"


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def legacy_guard(legal_name: str) -> str:
    n = _norm(legal_name)
    if not n:
        return "FAIL_MISSING_NAME"
    for frag in LEGACY_NAME_FRAGMENTS:
        if frag in n:
            return "BLOCK"
    return "PASS"


def service_interest(company: dict, band: str) -> str:
    cap = (company.get("capital") or "").lower()
    books = str(company.get("books") or "")
    tl = str(company.get("timeline") or "")
    if books in ("1", "2") and tl in ("3", "4") and cap in ("debt", "equity", "both"):
        return "Fractional CFO"
    if band in ("A", "B") and cap in ("debt", "equity"):
        return "Capital Advisory"
    if cap == "both":
        return "Hybrid"
    if band in ("C", "D", "E", "F") or cap in ("none", ""):
        return "Assessment"
    return "Assessment"


def score(payload: dict) -> dict:
    eva = payload.get("eva") or {}
    company = payload.get("company") or {}
    contact = payload.get("contact") or {}
    s = 0
    band = eva.get("band") or "C"
    proxy = int(eva.get("composite_score_proxy") or 0)
    if band == "A" or proxy >= 75:
        s += 40
    elif band == "B" or proxy >= 55:
        s += 25
    else:
        s += 10
    tl = str(company.get("timeline") or "")
    if tl in ("3", "4"):
        s += 20
    rev = str(company.get("revenueBand") or "")
    if rev in ("3", "4"):
        s += 15
    books = str(company.get("books") or "")
    if books in ("3", "4"):
        s += 15
    role = (contact.get("role") or "").lower()
    if "owner" in role or "cfo" in role or "ceo" in role:
        s += 10
    cap = (company.get("capital") or "").lower()
    if cap in ("debt", "equity", "both"):
        s += 10
    s = min(100, s)
    priority = "Sales Priority" if s >= 70 else ("Nurture" if s >= 40 else "Educate")
    sku = eva.get("recommended_sku") or "SKU-FRA"
    return {
        "lead_score": s,
        "priority": priority,
        "recommended_sku": sku,
        "owner_approval_required": True,
        "auto_contact": False,
        "next_task": (
            "Draft unsent proposal via PROPOSAL_GENERATOR.md if priority Sales Priority"
            if priority == "Sales Priority"
            else "Route to Capital Readiness / nurture — no auto-email"
        ),
    }


def build_crm_row(payload: dict) -> dict:
    """Map EVA payload → HVCG_Leads create fields (Dev)."""
    eva = dict(payload.get("eva") or {})
    company = payload.get("company") or {}
    contact = payload.get("contact") or {}
    consent = payload.get("consent") or {}

    legal = (company.get("legalName") or payload.get("Title") or "").strip()
    guard = legacy_guard(legal)
    eva["legacy_guard"] = guard
    if "rate_card_version" not in eva:
        eva["rate_card_version"] = RATE_CARD
    eva["owner_approval_required"] = True

    scored = score({**payload, "eva": eva})
    band = eva.get("band") or "C"
    session = (
        payload.get("sessionId")
        or payload.get("session_id")
        or (payload.get("submittedAt") or "unknown")
    )
    email = (contact.get("email") or "").strip().lower()
    name = (contact.get("name") or "").strip()
    if not name:
        parts = [contact.get("firstName") or "", contact.get("lastName") or ""]
        name = " ".join(p for p in parts if p).strip()

    is_referral = "advisor" in (contact.get("role") or "").lower() or "referral" in (
        contact.get("role") or ""
    ).lower()

    notes = {
        "eva_summary": {
            "eva_variant": eva.get("variant") or "EVA-FREE",
            "composite_score": eva.get("composite_score_proxy"),
            "band": band,
            "confidence_index": eva.get("confidence_index"),
            "flags": eva.get("flags") or [],
            "recommended_path": (
                "Capital Advisory + Capital Readiness"
                if band in ("A", "B")
                else "Funding Readiness / discovery"
            ),
            "recommended_sku_primary": scored["recommended_sku"],
            "rate_card_version": eva.get("rate_card_version") or RATE_CARD,
            "legacy_guard": guard,
            "priority": scored["priority"],
            "next_step": "CAPITAL_READINESS",
            "owner_approval_required": True,
            "proposed_price_estimate_only": eva.get("proposed_price"),
        },
        "eva_answers": {
            "Q0.1": legal,
            "Q0.6": f"{name} / {contact.get('role') or ''} / {email}",
            "Q2.1": company.get("revenueBand"),
            "Q12.1": company.get("capital"),
            "Q12.4": company.get("timeline"),
            "challenge": company.get("challenge"),
            "valueDriverThemes": company.get("valueDriverThemes") or [],
            "books": company.get("books"),
            "consent": consent,
        },
        "crm": {
            "assessmentType": "EVA",
            "recommendedNextStep": "CAPITAL_READINESS",
            "auto_contact": False,
            "environment": "Dev",
            "lead_score": scored["lead_score"],
            "priority": scored["priority"],
        },
    }

    row = {
        "Title": legal,
        "ContactName": name,
        "Email": email,
        "Phone": (contact.get("phone") or "").strip(),
        "Source": payload.get("source") or "Website-EVA",
        "LeadStatus": "New",
        "ServiceInterest": service_interest(company, band),
        "LeadScore": scored["lead_score"],
        "Notes": json.dumps(notes, ensure_ascii=False),
        "HVCG_IdempotencyKey": f"eva|{session}",
        "LeadSourceDetail": payload.get("leadSourceDetail") or "eva-payload-v1",
        "IsReferral": is_referral,
        # Currency fields intentionally omitted — owner approval required
        "_meta": {
            "legacy_guard": guard,
            "create_allowed": guard == "PASS" and bool(legal) and bool(email),
            "block_reason": (
                None
                if guard == "PASS"
                else "Legacy HVS name match — do not apply HVCG pricing; route to migration"
            ),
            "scoring": scored,
            "owner_approval_required": True,
            "auto_contact": False,
            "environment": "Dev",
        },
    }
    return row


if __name__ == "__main__":
    raw = sys.stdin.read() if not sys.argv[1:] else Path(sys.argv[1]).read_text()
    payload = json.loads(raw)
    mode = "crm" if "--crm" in sys.argv[1:] or (len(sys.argv) > 2 and sys.argv[2] == "--crm") else "score"
    # Allow: script.py file.json [--crm]
    args = [a for a in sys.argv[1:] if a != "--crm"]
    if args:
        payload = json.loads(Path(args[0]).read_text())
    if "--crm" in sys.argv:
        print(json.dumps(build_crm_row(payload), indent=2))
    else:
        print(json.dumps(score(payload), indent=2))
