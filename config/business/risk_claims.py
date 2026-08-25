"""HVCG Risk, Claims & Liability Reduction OS (Development) — Sprint 9 BA-F.

Sensitive matter case files with elevated human/professional controls.
Distinct from ops HVCG_Risks. Does not provide legal/tax/insurance opinions,
file appeals, contact agencies/insurers/attorneys, or settle claims.
Pricing from OFF-RISK-REVIEW / OFF-TAX-UE / OFF-CLAIMS — not hard-coded in UI.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any

from pricing_policy import is_legacy_client, load_json

try:
    from capital_readiness import run_capital_readiness_diagnostic
except ImportError:  # pragma: no cover
    run_capital_readiness_diagnostic = None  # type: ignore

try:
    import fractional_cfo as cfo
except ImportError:  # pragma: no cover
    cfo = None  # type: ignore

try:
    import contract_procurement as proc
except ImportError:  # pragma: no cover
    proc = None  # type: ignore

OFFER_RISK = "OFF-RISK-REVIEW"
OFFER_TAX_UE = "OFF-TAX-UE"
OFFER_CLAIMS = "OFF-CLAIMS"
SERVICE_LINE = "SL-RISK"
BL_C1_ACTIVE = True
AGENT_TAX = "AGT-TAX-APPEAL"
AGENT_UE = "AGT-UE-CLAIM"
AGENT_INS = "AGT-INS-REVIEW"
AGENT_CLAIMS = "AGT-CLAIMS"
AGENT_HR = "AGT-HR-DOCS"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_risk_policy() -> dict[str, Any]:
    return load_json("risk-operating-policy.json")


def load_compliance() -> dict[str, Any]:
    return load_json("compliance-language.json")


def offer_pricing_ref(offer_code: str) -> dict[str, Any]:
    offers = {o["offerCode"]: o for o in load_json("offer-catalog.json")["offers"]}
    o = offers.get(offer_code) or {}
    return {
        "offerCode": offer_code,
        "serviceLine": SERVICE_LINE,
        "name": o.get("name"),
        "category": o.get("category") or "PREMIUM_SPECIAL_PROJECT",
        "setupFeeGuidance": o.get("setupFeeGuidance"),
        "successFeeApplicable": o.get("successFeeApplicable"),
        "hardCodedInUiForbidden": True,
        "note": "Use canonical HVCG V2 pricing — do not hard-code fees in Risk UI.",
    }


def resolve_matter_type(matter_type: str, subtype: str | None = None) -> dict[str, Any]:
    policy = load_risk_policy()
    types = policy["matterTypes"]
    if matter_type not in types:
        return {"ok": False, "error": f"Undefined matter type bypasses risk controls: {matter_type}"}
    if subtype and subtype not in types[matter_type] and subtype != "Other special situation":
        if matter_type != "OTHER_SPECIAL":
            return {"ok": False, "error": f"Subtype {subtype} not allowed under {matter_type}"}
    return {"ok": True, "matterType": matter_type, "subtype": subtype}


# --- Matter ---


@dataclass
class RiskMatter:
    matter_id: str
    client: str
    matter_type: str
    subtype: str | None = None
    engagement_id: str | None = None
    opportunity_id: str | None = None
    offer_code: str = OFFER_RISK
    open_date: str | None = None
    incident_notice_date: str | None = None
    agency_carrier_counterparty: str | None = None
    jurisdiction: str | None = None
    amount_at_risk: float | None = None
    potential_recovery: float | None = None
    verified_savings: float | None = None
    deadline: str | None = None
    severity: str = "MEDIUM"
    status: str = "INTAKE"
    assigned_advisor: str | None = None
    licensed_professional_required: bool = True
    professional_contact: str | None = None
    evidence_completeness: str = "Unknown"
    communication_gate: str = "BL-C1"
    resolution: str | None = None
    closed_date: str | None = None
    client_classification: str | None = None
    contracted_current: float | None = None
    revenue_lineage: dict[str, Any] = field(default_factory=dict)


def classify_risk_level(
    *,
    deadline_days: int | None,
    dollar_exposure: float | None,
    legal_sensitive: bool = False,
    regulatory_sensitive: bool = False,
    employment_sensitive: bool = False,
    insurance_sensitive: bool = False,
    operational_impact: str = "Medium",
    document_completeness: str = "Partial",
) -> dict[str, Any]:
    score = 0
    if deadline_days is not None and deadline_days <= 7:
        score += 3
    elif deadline_days is not None and deadline_days <= 30:
        score += 2
    if dollar_exposure is not None and dollar_exposure >= 250000:
        score += 3
    elif dollar_exposure is not None and dollar_exposure >= 50000:
        score += 2
    if legal_sensitive:
        score += 2
    if regulatory_sensitive:
        score += 2
    if employment_sensitive:
        score += 2
    if insurance_sensitive:
        score += 1
    if operational_impact.lower() in {"high", "critical"}:
        score += 2
    if document_completeness.lower() in {"poor", "missing", "unknown"}:
        score += 1
    if score >= 8:
        level = "CRITICAL"
    elif score >= 5:
        level = "HIGH"
    elif score >= 3:
        level = "MEDIUM"
    else:
        level = "LOW"
    return {
        "level": level,
        "note": "Risk level does not equal legal liability.",
        "factors": {
            "deadlineDays": deadline_days,
            "dollarExposure": dollar_exposure,
            "legalSensitive": legal_sensitive,
            "regulatorySensitive": regulatory_sensitive,
            "employmentSensitive": employment_sensitive,
            "insuranceSensitive": insurance_sensitive,
            "operationalImpact": operational_impact,
            "documentCompleteness": document_completeness,
        },
    }


def create_risk_matter(**kwargs: Any) -> dict[str, Any]:
    mt = resolve_matter_type(kwargs.get("matter_type") or "TAX_REGULATORY", kwargs.get("subtype"))
    if not mt["ok"]:
        return {"errors": [mt["error"]], "matter": None}
    matter = RiskMatter(**{k: v for k, v in kwargs.items() if k in RiskMatter.__dataclass_fields__})
    policy = load_risk_policy()
    compliance = load_compliance()
    out = asdict(matter)
    out["pricingRef"] = offer_pricing_ref(matter.offer_code)
    out["disclaimer"] = policy["disclaimer"]
    out["complianceLanguage"] = {k: compliance["language"].get(k) for k in policy["complianceKeys"]}
    out["elevatedAccess"] = True
    out["opsRisksDistinct"] = True
    out["blC1Active"] = BL_C1_ACTIVE
    out["legacyPricingProtected"] = bool(
        matter.client_classification and is_legacy_client(matter.client_classification)
    ) or (matter.client or "").upper() in {
        "ACCG",
        "AMERICAN CAPITAL CONSULTING GROUP",
        "PRODIGY GAMES",
        "THAT'S KAVA",
        "THATS KAVA",
    }
    if matter.contracted_current is not None:
        out["contractedCurrent"] = matter.contracted_current
    out["createdAt"] = _now()
    out["audit"] = [{"action": "MATTER_CREATED", "at": _now()}]
    return {"errors": [], "matter": out}


# --- Evidence / timeline / deadlines ---


@dataclass
class EvidenceItem:
    evidence_id: str
    matter_id: str
    type: str
    description: str
    source: str
    date: str | None = None
    received_date: str | None = None
    file: str | None = None
    custodian: str | None = None
    verification_status: str = "Unverified"
    confidentiality: str = "Restricted"
    relevance: str = "Relevant"
    included_in_response: bool = False
    internal_note: str | None = None
    checksum: str | None = None
    truth_class: str = "VERIFIED_FACT"


def register_evidence(items: list[EvidenceItem | dict]) -> dict[str, Any]:
    rows = []
    for i in items:
        row = asdict(i) if isinstance(i, EvidenceItem) else dict(i)
        row["originalImmutable"] = True
        row["aiSummarySeparate"] = True
        row["advisorAnnotationSeparate"] = True
        row["aiMustNotReplaceSource"] = True
        rows.append(row)
    return {"register": rows, "preserveOriginal": True}


@dataclass
class TimelineEvent:
    date: str
    event: str
    event_type: str
    source_evidence: str | None = None
    actor: str | None = None
    significance: str | None = None
    disputed: bool = False
    advisor_note: str | None = None
    ai_drafted: bool = False


def build_timeline(events: list[TimelineEvent | dict], *, human_reviewed: bool = False) -> dict[str, Any]:
    rows = [asdict(e) if isinstance(e, TimelineEvent) else dict(e) for e in events]
    return {
        "events": sorted(rows, key=lambda x: x.get("date") or ""),
        "humanReviewRequired": True,
        "humanReviewed": human_reviewed,
        "aiMayAssist": True,
    }


@dataclass
class Deadline:
    label: str
    date: str
    source: str
    confidence: str = "Medium"
    verified_by_human: bool = False
    deadline_type: str = "Response due"


def track_deadlines(deadlines: list[Deadline | dict]) -> dict[str, Any]:
    rows = []
    alerts = []
    for d in deadlines:
        row = asdict(d) if isinstance(d, Deadline) else dict(d)
        if not row.get("verified_by_human"):
            row["authoritative"] = False
            alerts.append({"type": "UNVERIFIED_DEADLINE", "label": row.get("label"), "note": "AI-extracted dates are not authoritative without review."})
        rows.append(row)
    return {"deadlines": rows, "alerts": alerts, "aiNotAuthoritativeWithoutReview": True}


def deadline_alerts(*, upcoming: list[str] | None = None, missed: list[str] | None = None, missing_evidence: bool = False, professional_review_required: bool = False) -> dict[str, Any]:
    alerts = []
    for u in upcoming or []:
        alerts.append({"type": "UPCOMING_DEADLINE", "label": u, "externalSend": False})
    for m in missed or []:
        alerts.append({"type": "MISSED_DEADLINE", "label": m, "externalSend": False})
    if missing_evidence:
        alerts.append({"type": "EVIDENCE_MISSING", "externalSend": False})
    if professional_review_required:
        alerts.append({"type": "PROFESSIONAL_REVIEW_REQUIRED", "externalSend": False})
    return {"alerts": alerts, "externalCommunicationGated": True}


# --- Exposure / Risk Reduction review ---


def exposure_register(items: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    for i in items:
        row = dict(i)
        if row.get("potential_dollar_range") is None and row.get("invented"):
            return {"errors": ["Do not invent exposure amounts"], "items": []}
        if row.get("potential_dollar_range") is None:
            row["potential_dollar_range"] = "UNKNOWN"
        rows.append(row)
    return {"items": rows, "inventExposureForbidden": True}


def risk_reduction_review(*, matter_id: str, inventory: list[str], gaps: list[str], actions: list[str]) -> dict[str, Any]:
    policy = load_risk_policy()
    return {
        "matterId": matter_id,
        "offerCode": OFFER_RISK,
        "outputs": {
            "matterInventory": inventory,
            "exposureMap": "See exposure register",
            "documentGapList": gaps,
            "riskRegister": "See risk register",
            "priorityActions": actions,
            "professionalReviewNeeds": True,
            "internalControlsRecommendations": actions,
            "advisorSummary": "DRAFT — human review required",
        },
        "isLegalOpinion": False,
        "isCpaOpinion": False,
        "disclaimer": policy["disclaimer"],
    }


# --- Tax / Regulatory ---


def start_tax_matter(payload: dict[str, Any]) -> dict[str, Any]:
    created = create_risk_matter(
        matter_id=payload.get("matter_id") or "TAX-1",
        client=payload.get("client") or "Unknown",
        matter_type="TAX_REGULATORY",
        subtype=payload.get("subtype") or "Revenue department notice",
        offer_code=OFFER_TAX_UE,
        agency_carrier_counterparty=payload.get("agency"),
        amount_at_risk=payload.get("claimed_amount"),
        deadline=payload.get("response_deadline"),
        assigned_advisor=payload.get("advisor"),
        revenue_lineage=payload.get("revenue_lineage") or {},
        client_classification=payload.get("client_classification"),
        contracted_current=payload.get("contracted_current"),
    )
    if created["errors"]:
        return created
    matter = created["matter"]
    matter["status"] = "NOTICE_RECEIVED"
    matter["taxData"] = {
        "agency": payload.get("agency"),
        "noticeType": payload.get("notice_type"),
        "period": payload.get("period"),
        "originalAssessment": payload.get("original_assessment"),
        "penalties": payload.get("penalties"),
        "interest": payload.get("interest"),
        "claimedAmount": payload.get("claimed_amount"),
        "clientPosition": payload.get("client_position"),
        "responseDeadline": payload.get("response_deadline"),
        "appealRights": payload.get("appeal_rights"),
        "appealRightsSourceSupported": bool(payload.get("appeal_rights_source")),
        "professionalReview": "REQUIRED_BEFORE_EXTERNAL_ACTION",
    }
    if matter["taxData"]["appealRights"] and not matter["taxData"]["appealRightsSourceSupported"]:
        matter["taxData"]["appealRights"] = None
        matter["taxData"]["note"] = "Appeal rights not independently determined without source + human review."
    return {"errors": [], "matter": matter}


def transition_tax_workflow(matter: dict[str, Any], new_state: str, *, actor: str, professional_cleared: bool = False) -> dict[str, Any]:
    policy = load_risk_policy()
    out = deepcopy(matter)
    errors: list[str] = []
    if new_state not in policy["taxWorkflowStates"]:
        return {"errors": [f"Invalid state {new_state}"], "matter": out}
    externalish = {"APPROVED_TO_SEND", "EXTERNAL_SUBMISSION_GATED", "AWAITING_RESPONSE"}
    if new_state in externalish:
        review = (out.get("taxData") or {}).get("professionalReview") or out.get("professionalReviewStatus")
        if review in {"REQUIRED_BEFORE_EXTERNAL_ACTION", "RECOMMENDED", "REQUESTED", "IN_REVIEW", "ISSUES_RAISED", None} and not professional_cleared:
            errors.append("Professional review required before external action")
            out["status"] = "PROFESSIONAL_REVIEW_REQUIRED"
            return {"errors": errors, "matter": out, "blocked": True}
        if new_state == "APPROVED_TO_SEND":
            out["status"] = "APPROVED_TO_SEND"
            out["autoSendBlocked"] = True
            out["blC1"] = True
        else:
            out["status"] = new_state
            out["autoSendBlocked"] = True
    else:
        out["status"] = new_state
    out.setdefault("audit", []).append({"to": new_state, "actor": actor, "at": _now()})
    return {"errors": errors, "matter": out}


def run_tax_appeal_agent(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("requestTaxOpinion") or payload.get("requestLegalAdvice"):
        return {
            "agent": AGENT_TAX,
            "blocked": True,
            "reason": "Agent may not provide tax opinions or legal advice.",
            "canSubmitAppeal": False,
        }
    return {
        "agent": AGENT_TAX,
        "riskLevel": "HIGH",
        "extractedNotice": payload.get("notice"),
        "timelineDraft": payload.get("timeline_draft"),
        "missingRecords": payload.get("missing") or [],
        "amountComparison": payload.get("comparison"),
        "responseDraft": payload.get("response_draft") or "DRAFT — professional review required",
        "questionsForProfessional": payload.get("questions") or ["Please review draft response for tax/legal accuracy."],
        "caseSummary": "Internal draft only",
        "may": [
            "extract notice details",
            "organize documents",
            "build timeline",
            "identify missing records",
            "compare claimed amounts to records",
            "draft response materials",
            "draft questions for CPA/tax attorney",
            "prepare internal case summary",
        ],
        "mustNot": [
            "provide a tax opinion",
            "provide legal advice",
            "submit an appeal",
            "sign agency correspondence",
            "represent the client",
            "make unsupported conclusions",
        ],
        "canSubmitAppeal": False,
        "humanProfessionalReviewRequired": True,
    }


# --- Unemployment / HR ---


def create_unemployment_matter(payload: dict[str, Any]) -> dict[str, Any]:
    created = create_risk_matter(
        matter_id=payload.get("matter_id") or "UE-1",
        client=payload.get("client") or "Unknown",
        matter_type="UNEMPLOYMENT_WORKFORCE",
        subtype=payload.get("subtype") or "Unemployment claim",
        offer_code=OFFER_TAX_UE,
        deadline=payload.get("response_deadline"),
        assigned_advisor=payload.get("advisor"),
        licensed_professional_required=True,
    )
    if created["errors"]:
        return created
    matter = created["matter"]
    matter["ueData"] = {
        "employeeRef": payload.get("employee_ref") or "RESTRICTED",
        "employmentPeriod": payload.get("employment_period"),
        "separationDate": payload.get("separation_date"),
        "separationType": payload.get("separation_type"),
        "claimNotice": payload.get("claim_notice"),
        "responseDeadline": payload.get("response_deadline"),
        "sensitiveEmployeeDataRestricted": True,
        "employmentCounselReview": "REQUIRED" if payload.get("sensitive_employment_issue") else "RECOMMENDED",
    }
    matter["professionalReviewStatus"] = (
        "REQUIRED_BEFORE_EXTERNAL_ACTION" if payload.get("sensitive_employment_issue") else "RECOMMENDED"
    )
    return {"errors": [], "matter": matter}


def run_ue_claim_agent(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("determineLegalEligibility") or payload.get("submitAppeal"):
        return {"agent": AGENT_UE, "blocked": True, "reason": "May not determine eligibility or submit appeals.", "canSubmit": False}
    return {
        "agent": AGENT_UE,
        "riskLevel": "HIGH",
        "chronologyDraft": payload.get("chronology"),
        "evidenceGaps": payload.get("gaps") or [],
        "appealSupportMemoDraft": "INTERNAL DRAFT",
        "evidenceIndexDraft": payload.get("evidence_index"),
        "questions": payload.get("questions") or [],
        "may": ["organize separation records", "build chronology", "identify evidence gaps", "draft internal memo", "draft evidence index", "prepare questions"],
        "mustNot": [
            "determine legal eligibility",
            "submit appeals autonomously",
            "represent the employer",
            "contact employee/agency without approval",
            "terminate employees",
            "make protected-class decisions",
        ],
        "canSubmit": False,
        "canContactEmployeeOrAgency": False,
    }


def hr_boundary_check(action: str) -> dict[str, Any]:
    blocked = {
        "terminate_employee",
        "determine_protected_class",
        "final_employment_law_conclusion",
        "send_legal_sensitive_employee_communication",
    }
    return {
        "action": action,
        "allowed": action not in blocked,
        "agent": AGENT_HR,
        "note": load_compliance()["language"]["hrTermination"],
    }


# --- Insurance ---


@dataclass
class InsurancePolicy:
    carrier: str
    policy_type: str
    policy_number: str | None = None
    effective_date: str | None = None
    expiration: str | None = None
    limits: float | None = None
    deductible: float | None = None
    endorsements: str | None = None
    broker: str | None = None
    policy_document: str | None = None
    verification_date: str | None = None


def register_policies(policies: list[InsurancePolicy | dict]) -> dict[str, Any]:
    rows = [asdict(p) if isinstance(p, InsurancePolicy) else dict(p) for p in policies]
    expired = [r for r in rows if r.get("status") == "EXPIRED" or r.get("expired")]
    return {"policies": rows, "expired": expired, "confidential": True}


def insurance_review(policies: list[dict[str, Any]], *, required_limit: float | None = None) -> dict[str, Any]:
    questions = []
    for p in policies:
        if p.get("limits") is None:
            questions.append(f"Confirm stated limits for {p.get('policy_type')}")
        if required_limit is not None and p.get("limits") is not None and float(p["limits"]) < required_limit:
            questions.append(f"Limit below requirement for {p.get('policy_type')} — broker review")
        if p.get("expired") or p.get("status") == "EXPIRED":
            questions.append(f"Expired policy {p.get('policy_type')} — risk/procurement signal")
    return {
        "coverageSummary": "Document organization only",
        "limitSummary": [p.get("limits") for p in policies],
        "deductibleSummary": [p.get("deductible") for p in policies],
        "questions": questions,
        "bindingCoverageOpinionForbidden": True,
        "canStateClaimCovered": False,
        "compliance": load_compliance()["language"]["insuranceReview"],
    }


def run_insurance_review_agent(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("stateCovered") or payload.get("bindCoverage") or payload.get("sellInsurance"):
        return {"agent": AGENT_INS, "blocked": True, "reason": "May not sell/bind/determine coverage.", "canContactCarrier": False}
    review = insurance_review(payload.get("policies") or [], required_limit=payload.get("required_limit"))
    return {
        "agent": AGENT_INS,
        "riskLevel": "HIGH",
        "review": review,
        "brokerMemoDraft": "DRAFT for broker review",
        "may": ["organize policies", "extract stated limits", "identify expirations", "compare to requirements", "identify questions", "prepare broker-review memo"],
        "mustNot": ["sell insurance", "bind coverage", "make final coverage determinations", "state a claim is covered", "contact carrier/broker without approval"],
        "canContactCarrierOrBroker": False,
    }


# --- Claims / Loss ---


def create_incident_matter(payload: dict[str, Any]) -> dict[str, Any]:
    created = create_risk_matter(
        matter_id=payload.get("matter_id") or "CLM-1",
        client=payload.get("client") or "Unknown",
        matter_type="CLAIMS_RECOVERY",
        subtype=payload.get("subtype") or "Theft",
        offer_code=OFFER_CLAIMS,
        incident_notice_date=payload.get("incident_date"),
        assigned_advisor=payload.get("advisor"),
        revenue_lineage=payload.get("revenue_lineage") or {},
    )
    if created["errors"]:
        return created
    matter = created["matter"]
    matter["incident"] = {
        "incidentDate": payload.get("incident_date"),
        "discoveryDate": payload.get("discovery_date"),
        "location": payload.get("location"),
        "incidentType": payload.get("incident_type"),
        "description": payload.get("description"),
        "estimatedLoss": payload.get("estimated_loss"),
        "verifiedLoss": payload.get("verified_loss"),
        "rawEvidenceImmutable": True,
    }
    matter["professionalReviewStatus"] = "REQUIRED_BEFORE_EXTERNAL_ACTION"
    return {"errors": [], "matter": matter}


def loss_schedule(items: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    for i in items:
        row = dict(i)
        kind = row.get("kind") or ("VERIFIED_DOCUMENTED_LOSS" if row.get("verified") else "ESTIMATED_LOSS")
        if kind not in load_risk_policy()["lossKinds"]:
            kind = "ESTIMATED_LOSS"
        row["kind"] = kind
        if row.get("amount") is None:
            row["amount"] = "UNKNOWN"
        rows.append(row)
    return {
        "items": rows,
        "distinctions": load_risk_policy()["lossKinds"],
        "note": "ESTIMATED_LOSS ≠ VERIFIED_DOCUMENTED_LOSS ≠ CLAIMED_AMOUNT ≠ RECOVERED_AMOUNT",
    }


def recovery_outcome(*, claimed: float | None = None, offered: float | None = None, approved: float | None = None, paid: float | None = None, collected: float | None = None) -> dict[str, Any]:
    return {
        "Claimed": claimed,
        "Offered": offered,
        "Approved": approved,
        "Paid": paid,
        "Collected": collected,
        "complete": collected is not None and collected > 0,
        "note": "Recovery is not complete until payment is actually received where applicable.",
    }


def draft_claim_package(ctx: dict[str, Any]) -> dict[str, Any]:
    policy = load_risk_policy()
    body = f"""# CLAIM-SUPPORT PACKAGE (DRAFT)

# Incident Summary
{ctx.get('summary', '')}

# Timeline
{ctx.get('timeline', '')}

# Parties
{ctx.get('parties', '')}

# Evidence Index
{ctx.get('evidence', '')}

# Loss Schedule
{ctx.get('loss', '')}

# Financial Impact
{ctx.get('financial', '')}

# Supporting Documents
{ctx.get('documents', '')}

# Insurance / Contract Context
{ctx.get('insurance', '')}

# Recovery Actions
{ctx.get('actions', '')}

# Open Questions
{ctx.get('questions', '')}

# Professional Review
REQUIRED

# HVCG Limitations
{policy['disclaimer']}
"""
    return {
        "body": body,
        "approved": False,
        "humanReviewMandatory": True,
        "canAutoSend": False,
        "canContactInsurer": False,
        "canContactAttorney": False,
        "createdAt": _now(),
    }


def run_claims_agent(payload: dict[str, Any]) -> dict[str, Any]:
    blocked_actions = {"send_insurer", "contact_attorney", "settle", "admit_liability", "threaten", "make_legal_claim"}
    if payload.get("action") in blocked_actions:
        return {"agent": AGENT_CLAIMS, "blocked": True, "reason": f"Prohibited: {payload.get('action')}", "canSend": False}
    return {
        "agent": AGENT_CLAIMS,
        "riskLevel": "HIGH",
        "timelineDraft": payload.get("timeline"),
        "lossScheduleDraft": payload.get("loss"),
        "missingDocs": payload.get("missing") or [],
        "claimSupportPacket": draft_claim_package(payload.get("package") or {}),
        "communicationDrafts": "DRAFT only",
        "questionsForProfessionals": payload.get("questions") or [],
        "may": [
            "organize incident evidence",
            "generate timeline",
            "build loss schedule draft",
            "identify missing documentation",
            "prepare claim-support packet",
            "prepare communication drafts",
            "prepare questions for attorney/insurer",
        ],
        "mustNot": [
            "send insurer communications",
            "contact attorneys",
            "settle claims",
            "make binding coverage conclusions",
            "admit liability",
            "threaten counterparties",
            "make legal claims autonomously",
        ],
        "canSend": False,
    }


# --- Professional referral / communications / approvals ---


def professional_referral(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "professional": payload.get("professional"),
        "firm": payload.get("firm"),
        "specialty": payload.get("specialty"),
        "matterId": payload.get("matter_id"),
        "referralReason": payload.get("reason"),
        "clientApproval": bool(payload.get("client_approval")),
        "contactAuthorization": bool(payload.get("contact_authorization")),
        "documentsShared": payload.get("documents_shared") or [],
        "status": payload.get("status") or "REQUESTED",
        "autoTransmitForbidden": True,
        "approvalType": "ProfessionalReferral",
    }


def set_professional_review(status: str) -> dict[str, Any]:
    allowed = load_risk_policy()["professionalReviewStatuses"]
    if status not in allowed:
        return {"errors": [f"Invalid status {status}"], "status": None}
    return {"status": status, "completeOnlyWithEvidence": True}


def communication_log_entry(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "date": payload.get("date") or _now(),
        "party": payload.get("party"),
        "direction": payload.get("direction"),
        "channel": payload.get("channel"),
        "status": "DRAFT" if BL_C1_ACTIVE else payload.get("status"),
        "humanApprover": payload.get("approver"),
        "matterId": payload.get("matter_id"),
        "summary": payload.get("summary"),
        "attachment": payload.get("attachment"),
        "externalAction": False,
        "blC1Active": BL_C1_ACTIVE,
        "aiCreatedRemainsDraft": True,
    }


def attempt_external_risk_action(*, action: str) -> dict[str, Any]:
    blocked = {
        "contact_agency",
        "file_appeal",
        "contact_insurer",
        "contact_broker",
        "contact_opposing_party",
        "contact_attorney",
        "contact_employee",
        "send_demand",
        "submit_claim",
        "settle_matter",
        "provide_tax_opinion",
        "state_coverage_conclusion",
    }
    return {
        "action": action,
        "allowed": False,
        "blC1Active": BL_C1_ACTIVE,
        "reason": "External / licensed action gated — authorized human (and professional where required) needed.",
        "blockedActions": sorted(blocked),
    }


# --- Outcomes / success fee / verified savings ---


def verified_savings(*, original_claimed: float | None, revised_claimed: float | None, verified_reduction: float | None, avoided_future: float | None = None) -> dict[str, Any]:
    return {
        "originalClaimedAmount": original_claimed,
        "revisedClaimedAmount": revised_claimed,
        "verifiedReduction": verified_reduction,
        "avoidedFutureCost": avoided_future,
        "fabricateForbidden": True,
        "feeBasis": verified_reduction,
        "note": "Do not fabricate savings; fee basis uses verified outcomes + agreement terms.",
    }


def success_fee_controls(*, agreement_ref: str | None, fee_pct: float | None, fee_base: str | None, trigger: str | None, verified_outcome: float | None, claimed_amount: float | None = None) -> dict[str, Any]:
    errors = []
    if not agreement_ref:
        errors.append("Agreement reference required")
    if verified_outcome is None and claimed_amount is not None:
        errors.append("Cannot calculate success fee from claimed/theoretical amounts without verified outcome + agreement")
    return {
        "agreement": agreement_ref,
        "feePct": fee_pct,
        "feeBase": fee_base,
        "trigger": trigger,
        "verifiedOutcome": verified_outcome,
        "feeStatus": "Pending" if not errors else "Blocked",
        "errors": errors,
        "autoFromClaimedForbidden": True,
    }


def close_matter(matter: dict[str, Any], *, resolution: str, outcome_evidence: str | None) -> dict[str, Any]:
    out = deepcopy(matter)
    if not outcome_evidence:
        return {"errors": ["Outcome values require evidence"], "matter": out}
    out["resolution"] = resolution
    out["closed_date"] = _now()
    out["status"] = "RESOLVED"
    out["closeout"] = {
        "resolution": resolution,
        "outcomeEvidence": outcome_evidence,
        "amountAtRisk": out.get("amount_at_risk"),
        "verifiedReduction": out.get("verified_savings"),
        "lessonsLearnedSanitized": True,
        "secondBrainFeedConfidentialFactsForbidden": True,
    }
    return {"errors": [], "matter": out}


def risk_register_items(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {"items": items, "notLegalRiskAnalysis": True}


def corrective_action(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "issue": payload.get("issue"),
        "rootCause": payload.get("root_cause"),
        "correctiveAction": payload.get("action"),
        "owner": payload.get("owner"),
        "dueDate": payload.get("due_date"),
        "evidenceRequired": payload.get("evidence_required"),
        "status": payload.get("status") or "Open",
        "reuseOpsHub": True,
    }


# --- Cross-system ---


def signal_to_cfo(*, matter_id: str, client: str, exposure: float | None, note: str) -> dict[str, Any]:
    out: dict[str, Any] = {
        "matterId": matter_id,
        "client": client,
        "approvedFinancialExposure": exposure,
        "note": note,
        "createAccountingEntriesForbidden": True,
        "reuseCfoEngine": True,
    }
    if cfo is not None:
        eng = cfo.create_cfo_engagement(
            client=client,
            engagement_id=f"CFO-FROM-RISK-{matter_id}",
            internal_notes=f"Risk exposure signal: {note}",
        )
        out["cfoEngagement"] = eng
        out["engine"] = "fractional_cfo"
    return out


def signal_to_capital(*, matter_id: str, client: str, reason: str, amount: float | None, advisor: str) -> dict[str, Any]:
    flag = {
        "fromMatter": matter_id,
        "client": client,
        "reason": reason,
        "suggestedAmount": amount,
        "humanReviewedRiskFlag": True,
        "reuseCapitalEngine": True,
        "duplicateCapitalRiskCalcForbidden": True,
        "canContactLender": False,
        "approved": False,
        "requestedBy": advisor,
    }
    return flag


def approve_capital_risk_flag(flag: dict[str, Any], diagnostic_payload: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    f = deepcopy(flag)
    f["approved"] = True
    f["approvedBy"] = advisor
    if run_capital_readiness_diagnostic is None:
        return {"errors": ["capital_readiness unavailable"], "diagnostic": None}
    diag = run_capital_readiness_diagnostic(diagnostic_payload)
    return {"errors": [], "flag": f, "diagnostic": diag, "engine": "capital_readiness", "canContactLender": False}


def signal_to_procurement(*, matter_id: str, insurance_expired: bool = False, missing_limits: bool = False, workforce_issue: bool = False) -> dict[str, Any]:
    signals = []
    if insurance_expired:
        signals.append("EXPIRED_INSURANCE")
    if missing_limits:
        signals.append("MISSING_INSURANCE_LIMITS")
    if workforce_issue:
        signals.append("WORKFORCE_COMPLIANCE_ISSUE")
    return {
        "matterId": matter_id,
        "signals": signals,
        "autoDisqualifyForbidden": True,
        "reuseProcurementEngine": True,
        "note": "Approved signals only — do not automatically disqualify client.",
        "procurementAvailable": proc is not None,
    }
