"""Development Free Fit runtime — binds BA complete_free_fit to Dev persistence.

Canonical calculation: revenue_conversion.complete_free_fit
Persistence: .data/dev-free-fit/ (gitignored) — Development-only, not Production SoR.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import atlas_security as sec
import lead_intake as leads
import revenue_conversion as rev
from commercial_rules import COMMERCIAL_CLASSES, load_decision_engine, recommend_offer

RUNTIME_LABEL = "DEV_FREE_FIT_ADAPTER"
STORE_DIR = Path(__file__).resolve().parents[2] / ".data" / "dev-free-fit"

OWNER_DECISIONS = (
    "ACCEPT_RECOMMENDATION",
    "REQUEST_MORE_INFO",
    "DO_NOT_ADVANCE",
    "CHOOSE_ALTERNATE_PATH",
)

SERVICE_LINE_LABELS = {
    "SL-CAPITAL": "Capital Advisory & Lender Readiness",
    "SL-CFO": "Fractional CFO & Strategic Finance",
    "SL-FCFO": "Fractional CFO & Strategic Finance",
    "SL-PROCUREMENT": "Contract Procurement & Government Readiness",
    "SL-RISK": "Risk, Claims & Liability Reduction",
    "SL-GROWTH": "Growth & Operating Systems",
    "SL-OWNER": "Executive Owner Support",
    "SL-AI": "Agentic AI & Second Brain Systems",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _id() -> str:
    return f"FIT-DEV-{uuid.uuid4().hex[:10].upper()}"


def store_path() -> Path:
    from runtime_env import assert_persist_allowed

    assert_persist_allowed("free_fit_runtime")
    STORE_DIR.mkdir(parents=True, exist_ok=True)
    return STORE_DIR / "assessments.json"


def _load_all() -> list[dict[str, Any]]:
    p = store_path()
    if not p.exists():
        return []
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return list(data.get("assessments") or [])
    except json.JSONDecodeError:
        return []


def _save_all(rows: list[dict[str, Any]]) -> None:
    store_path().write_text(
        json.dumps(
            {
                "adapter": RUNTIME_LABEL,
                "canonicalEngine": "revenue_conversion.complete_free_fit",
                "productionCrm": False,
                "assessments": rows,
                "updatedAt": _now(),
            },
            indent=2,
        ),
        encoding="utf-8",
    )


def questionnaire_definition(*, include_restricted: bool = False) -> dict[str, Any]:
    policy = rev.load_free_fit_policy()
    engine = load_decision_engine()
    needs = []
    for rule in engine.get("rules") or []:
        if rule.get("restricted") and not include_restricted:
            continue
        needs.append(
            {
                "need": rule["need"],
                "diagnostic": rule.get("diagnostic"),
                "offerCode": rule.get("offerCode"),
                "restricted": bool(rule.get("restricted")),
            }
        )
    return {
        "ok": True,
        "status": "SUCCESS",
        "skuCode": policy.get("skuCode"),
        "name": policy.get("name"),
        "purpose": policy.get("purpose"),
        "is": policy.get("is"),
        "isNot": policy.get("isNot"),
        "allowedCapture": policy.get("allowedCapture"),
        "needOptions": needs,
        "urgencyOptions": ["Low", "Normal", "High", "Urgent"],
        "revenueRangeOptions": [
            "Under $1M",
            "$1M–$5M",
            "$5M–$15M",
            "$15M–$50M",
            "$50M+",
            "Not specified",
        ],
        "ownerDecisions": list(OWNER_DECISIONS),
        "commercialClasses": list(COMMERCIAL_CLASSES),
        "note": "Free Fit = qualification only — not free consulting",
    }


def get_assessment(assessment_id: str) -> dict[str, Any]:
    for row in _load_all():
        if row.get("assessmentId") == assessment_id:
            return {"ok": True, "status": "SUCCESS", "assessment": row}
    return {"ok": False, "status": "FORBIDDEN", "message": "Assessment not found", "leakage": False}


def get_by_lead(lead_id: str) -> dict[str, Any]:
    rows = [r for r in _load_all() if r.get("leadId") == lead_id]
    rows.sort(key=lambda x: x.get("completedAt") or "", reverse=True)
    return {
        "ok": True,
        "status": "SUCCESS",
        "count": len(rows),
        "assessments": rows,
        "latest": rows[0] if rows else None,
    }


def _commercial_class_for_offer(offer_code: str | None) -> str | None:
    if not offer_code:
        return None
    offer = rev.load_offers_by_code().get(offer_code)
    if not offer:
        return None
    cat = offer.get("category")
    return cat if cat in COMMERCIAL_CLASSES else None


def _next_action_from_engine(assessment: dict[str, Any]) -> str:
    if assessment.get("qualificationResult") == "Disqualified":
        return "Do Not Advance"
    if assessment.get("qualificationResult") == "Pending":
        return "Gather missing information"
    if assessment.get("recommendedDiagnostic"):
        return "Prepare Paid Diagnostic"
    cls = assessment.get("recommendedCommercialClass")
    if cls == "RECURRING_RETAINER":
        return "Prepare Retainer Proposal"
    if cls == "PREMIUM_SPECIAL_PROJECT":
        return "Prepare Premium Special Project"
    if assessment.get("recommendedOffer"):
        return "Prepare Structured Offer"
    return "Review Free Fit recommendation"


def _next_action_from_owner(decision: str, assessment: dict[str, Any]) -> str:
    if decision == "DO_NOT_ADVANCE":
        return "Do Not Advance"
    if decision == "REQUEST_MORE_INFO":
        return "Gather missing information"
    if decision == "CHOOSE_ALTERNATE_PATH":
        return "Owner selected alternate commercial path — prepare follow-up"
    # ACCEPT_RECOMMENDATION
    return _next_action_from_engine(assessment)


def complete_assessment(
    *,
    lead_id: str,
    need_type: str,
    revenue_range: str | None = None,
    capital_goal: str | None = None,
    urgency: str | None = None,
    primary_issue: str | None = None,
    actor: str | None = None,
) -> dict[str, Any]:
    lead_res = leads.get_lead(lead_id)
    if not lead_res.get("ok"):
        return {
            "ok": False,
            "status": "FORBIDDEN",
            "message": "Lead not found or unauthorized",
            "leakage": False,
        }
    lead = lead_res["lead"]

    # Reject restricted Owner Support need unless explicitly allowed later
    rule = recommend_offer(need_type)
    if rule and rule.get("restricted"):
        return {
            "ok": False,
            "status": "FORBIDDEN",
            "message": "Owner Support path is restricted — not available on general Free Fit surface",
            "leakage": False,
        }

    assessment_id = _id()
    engine = rev.complete_free_fit(
        assessment_id=assessment_id,
        lead_id=lead_id,
        advisor=actor,
        need_type=need_type,
        source=lead.get("Source"),
        revenue_range=revenue_range,
        capital_goal=capital_goal or primary_issue or lead.get("BusinessNeed"),
        urgency=urgency,
        referral_source=lead.get("LeadSourceDetail"),
    )
    if engine.get("errors"):
        return {"ok": False, "status": "FORBIDDEN", "message": "; ".join(engine["errors"]), "errors": engine["errors"]}

    raw = engine["assessment"]
    commercial_class = _commercial_class_for_offer(raw.get("recommended_offer"))
    service_code = raw.get("recommended_service_line")
    # Hide Owner Support label amplification
    if service_code == "SL-OWNER":
        service_code = None

    record = {
        "assessmentId": raw["assessment_id"],
        "leadId": lead_id,
        "adapter": RUNTIME_LABEL,
        "productionCrm": False,
        "version": 1,
        "sku": engine.get("sku"),
        "fee": engine.get("fee", 0),
        "completedAt": raw.get("date") or _now(),
        "advisor": actor,
        "answers": {
            "needType": need_type,
            "revenueRange": revenue_range,
            "capitalGoal": capital_goal,
            "urgency": urgency,
            "primaryIssue": primary_issue,
            "source": lead.get("Source"),
            "referralSource": lead.get("LeadSourceDetail"),
        },
        "qualificationResult": raw.get("qualification_result"),
        "recommendedDiagnostic": raw.get("recommended_diagnostic"),
        "recommendedServiceLineCode": service_code,
        "recommendedServiceDomain": SERVICE_LINE_LABELS.get(service_code or "", service_code),
        "recommendedOffer": raw.get("recommended_offer"),
        "recommendedCommercialClass": commercial_class,
        "atlasRecommendation": {
            "qualificationResult": raw.get("qualification_result"),
            "diagnostic": raw.get("recommended_diagnostic"),
            "serviceDomain": SERVICE_LINE_LABELS.get(service_code or "", service_code),
            "offerCode": raw.get("recommended_offer"),
            "commercialClass": commercial_class,
            "note": "Atlas recommendation only — not Owner approval",
        },
        "ownerDecision": None,
        "ownerDecisionStatus": "PENDING_OWNER",
        "ownerDecisionAt": None,
        "ownerDecisionBy": None,
        "nextAction": "Review Free Fit recommendation",
        "contractedEconomicsCreated": False,
        "proposalSent": False,
        "convertedToClient": False,
        "isClient360Client": False,
        "blC1Active": True,
        "sent": False,
        "notes": raw.get("notes"),
    }
    record["engineNextAction"] = _next_action_from_engine(record)

    rows = _load_all()
    rows.append(record)
    _save_all(rows)

    # Update lead — remain prospect
    leads.patch_lead(
        lead_id,
        {
            "FreeFitAssessmentId": assessment_id,
            "FreeFitResult": record["qualificationResult"],
            "LeadStatus": "Contacted" if record["qualificationResult"] != "Disqualified" else "Disqualified",
            "NextAction": record["nextAction"],
            "IsClient360Client": False,
            "ConvertedClientId": None,
            "ContractedEconomicsCreated": False,
        },
        actor=actor,
    )

    audit = sec.security_audit_event(
        action="freefit.completed",
        policy_result="ALLOW",
        allow=True,
        actor=actor,
        event_type="freefit_completed",
        environment="DEV",
        matter=assessment_id,
    )
    return {
        "ok": True,
        "status": "SUCCESS",
        "assessment": record,
        "leadId": lead_id,
        "ownerDecisionRequired": True,
        "contractedEconomicsCreated": False,
        "proposalSent": False,
        "convertedToClient": False,
        "audit": audit,
    }


def record_owner_decision(
    *,
    assessment_id: str,
    decision: str,
    alternate_commercial_class: str | None = None,
    notes: str | None = None,
    actor: str | None = None,
) -> dict[str, Any]:
    if decision not in OWNER_DECISIONS:
        return {"ok": False, "status": "FORBIDDEN", "message": f"Invalid owner decision: {decision}"}

    rows = _load_all()
    found = None
    for row in rows:
        if row.get("assessmentId") == assessment_id:
            found = row
            break
    if not found:
        return {"ok": False, "status": "FORBIDDEN", "message": "Assessment not found", "leakage": False}

    if decision == "CHOOSE_ALTERNATE_PATH":
        if alternate_commercial_class not in COMMERCIAL_CLASSES:
            return {
                "ok": False,
                "status": "FORBIDDEN",
                "message": f"alternateCommercialClass must be one of {COMMERCIAL_CLASSES}",
            }

    found["ownerDecision"] = decision
    found["ownerDecisionStatus"] = "OWNER_RECORDED"
    found["ownerDecisionAt"] = _now()
    found["ownerDecisionBy"] = actor
    found["ownerDecisionNotes"] = notes
    if decision == "CHOOSE_ALTERNATE_PATH":
        found["ownerSelectedCommercialClass"] = alternate_commercial_class
    found["nextAction"] = _next_action_from_owner(decision, found)
    # Recommendation remains distinct — never auto-equals owner approval
    found["ownerApprovedRecommendation"] = decision == "ACCEPT_RECOMMENDATION"
    found["contractedEconomicsCreated"] = False
    found["proposalSent"] = False
    found["convertedToClient"] = False

    _save_all(rows)
    leads.patch_lead(
        found["leadId"],
        {
            "NextAction": found["nextAction"],
            "FreeFitOwnerDecision": decision,
            "IsClient360Client": False,
            "ContractedEconomicsCreated": False,
        },
        actor=actor,
    )
    audit = sec.security_audit_event(
        action="freefit.owner_decision",
        policy_result="ALLOW",
        allow=True,
        actor=actor,
        event_type="freefit_owner_decision",
        environment="DEV",
        matter=assessment_id,
    )
    return {
        "ok": True,
        "status": "SUCCESS",
        "assessment": found,
        "ownerDecisionRequired": False,
        "contractedEconomicsCreated": False,
        "proposalSent": False,
        "audit": audit,
    }


def attempt_external_followup() -> dict[str, Any]:
    return sec.attempt_external_tool(tool_id="TOOL-EXTERNAL-SEND", via="free_fit_runtime")
