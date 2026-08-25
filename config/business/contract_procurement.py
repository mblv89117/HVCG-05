"""HVCG Contract Procurement & Government Readiness OS (Development) — Sprint 8 BA-E.

Advisory readiness / registration preparation / pursuit support.
Does not submit SAM, vendor registrations, or bids. Does not certify eligibility.
Pricing from OFF-PROC-READY / OFF-GOV-SETUP — not hard-coded in UI.
Reuses Capital, CFO, Proposal, Document Checklist — no duplicate shells.
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

OFFER_PROC = "OFF-PROC-READY"
OFFER_GOV = "OFF-GOV-SETUP"
SERVICE_LINE = "SL-PROCUREMENT"
BL_C1_ACTIVE = True
AGENT_PROCURE = "AGT-PROCURE"
AGENT_GOV_REG = "AGT-GOV-REG"
AGENT_PROPOSAL = "AGT-PROPOSAL"
AGENT_DOC = "AGT-DOC-CHECKLIST"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_proc_policy() -> dict[str, Any]:
    return load_json("procurement-operating-policy.json")


def load_compliance() -> dict[str, Any]:
    return load_json("compliance-language.json")


def offer_pricing_ref(offer_code: str) -> dict[str, Any]:
    offers = {o["offerCode"]: o for o in load_json("offer-catalog.json")["offers"]}
    o = offers.get(offer_code) or {}
    return {
        "offerCode": offer_code,
        "serviceLine": SERVICE_LINE,
        "name": o.get("name"),
        "pricingStatus": o.get("pricingStatus") or "from_catalog",
        "setupFeeGuidance": o.get("setupFeeGuidance"),
        "monthlyRetainerOption": o.get("monthlyRetainerOption"),
        "successFeeApplicable": o.get("successFeeApplicable"),
        "hardCodedInUiForbidden": True,
        "note": "Use canonical HVCG pricing — do not hard-code fees in Procurement UI.",
    }


# --- Engagement ---


@dataclass
class ProcurementEngagement:
    client: str
    engagement_id: str
    offer_code: str = OFFER_PROC
    opportunity_id: str | None = None
    procurement_type: str = "Mixed"
    public_private: str = "Private"
    government_level: str | None = None
    industry: str | None = None
    service_categories: list[str] = field(default_factory=list)
    naics: list[str] = field(default_factory=list)
    geographic_scope: str | None = None
    target_contract_size: float | None = None
    target_buyers: list[str] = field(default_factory=list)
    assigned_advisor: str | None = None
    readiness_status: str = "UNKNOWN"
    registration_status: str = "NOT_STARTED"
    capability_statement_status: str = "Not Started"
    past_performance_status: str = "Not Started"
    compliance_status: str = "Not Started"
    pipeline_status: str = "Not Started"
    proposal_support_status: str = "Not Started"
    start_date: str | None = None
    target_readiness_date: str | None = None
    client_classification: str | None = None
    contracted_current: float | None = None
    revenue_lineage: dict[str, Any] = field(default_factory=dict)


def create_procurement_engagement(**kwargs: Any) -> dict[str, Any]:
    eng = ProcurementEngagement(**{k: v for k, v in kwargs.items() if k in ProcurementEngagement.__dataclass_fields__})
    policy = load_proc_policy()
    out = asdict(eng)
    out["pricingRef"] = offer_pricing_ref(eng.offer_code)
    out["disclaimer"] = policy["disclaimer"]
    out["blC1Active"] = BL_C1_ACTIVE
    out["legacyPricingProtected"] = bool(
        eng.client_classification and is_legacy_client(eng.client_classification)
    ) or (eng.client or "").upper() in {"ACCG", "AMERICAN CAPITAL CONSULTING GROUP"}
    if eng.contracted_current is not None:
        out["contractedCurrent"] = eng.contracted_current
    out["createdAt"] = _now()
    out["audit"] = [{"action": "ENGAGEMENT_CREATED", "at": _now()}]
    return out


# --- Readiness ---


@dataclass
class ReadinessEvidence:
    requirement: str
    status: str
    evidence: str | None = None
    evidence_date: str | None = None
    source: str | None = None
    expiration_date: str | None = None
    missing_item: str | None = None
    advisor_note: str | None = None
    ai_observation: str | None = None
    dimension: str = "Entity Readiness"


def assess_procurement_readiness(
    *,
    engagement_id: str,
    evidences: list[ReadinessEvidence | dict],
    public_private: str = "Private",
) -> dict[str, Any]:
    policy = load_proc_policy()
    rows = []
    for e in evidences:
        row = asdict(e) if isinstance(e, ReadinessEvidence) else dict(e)
        if row.get("ai_observation"):
            row["aiAuthoritative"] = False
            row["note"] = "AI observations are not authoritative compliance determinations."
        rows.append(row)

    by_dim: dict[str, list[dict]] = {}
    for r in rows:
        by_dim.setdefault(r.get("dimension") or "Entity Readiness", []).append(r)

    gaps = [r for r in rows if r.get("status") in {"MISSING", "EXPIRED", "INSUFFICIENT", "NOT_READY"}]
    unknown = [r for r in rows if r.get("status") in {"UNKNOWN", None}]

    if not rows:
        overall = "UNKNOWN"
    elif any(r.get("status") == "EXPIRED" for r in rows):
        overall = "REMEDIATION_REQUIRED"
    elif gaps and len(gaps) >= 3:
        overall = "NOT_READY"
    elif gaps:
        overall = "READY_WITH_GAPS"
    elif unknown:
        overall = "UNKNOWN"
    else:
        overall = "READY"

    # Government path requires registration dimension attention
    if public_private == "Government" and not any(
        (r.get("dimension") or "").startswith("Registration") for r in rows
    ):
        if overall == "READY":
            overall = "READY_WITH_GAPS"
        gaps.append({"requirement": "Registration evidence", "missing_item": "Government registration status", "status": "MISSING"})

    return {
        "engagementId": engagement_id,
        "overallStatus": overall,
        "dimensions": by_dim,
        "evidence": rows,
        "gaps": gaps,
        "numericScoreForbidden": True,
        "note": "Status-based readiness — no arbitrary numeric score.",
        "allowedStatuses": policy["readinessStatuses"],
        "assessedAt": _now(),
        "aiObservationsNotAuthoritative": True,
    }


# --- Registrations / Government setup ---


@dataclass
class GovernmentRegistration:
    registration_type: str
    agency_portal: str
    identifier: str | None = None
    status: str = "NOT_STARTED"
    started_date: str | None = None
    submitted_date: str | None = None
    approved_date: str | None = None
    expiration_date: str | None = None
    renewal_date: str | None = None
    required_documents: list[str] = field(default_factory=list)
    assigned_owner: str | None = None
    source_evidence: str | None = None
    notes: str | None = None
    external_submission_approval: bool = False


def create_registration(reg: GovernmentRegistration | dict) -> dict[str, Any]:
    row = asdict(reg) if isinstance(reg, GovernmentRegistration) else dict(reg)
    if row.get("status") == "ACTIVE" and not row.get("identifier"):
        row["warnings"] = ["ACTIVE without identifier — verify before representing as registered"]
    row["canAutoSubmit"] = False
    row["updatedAt"] = _now()
    return row


def advance_registration(reg: dict[str, Any], new_status: str, *, actor: str) -> dict[str, Any]:
    policy = load_proc_policy()
    allowed = policy["registrationStatuses"]
    out = deepcopy(reg)
    errors: list[str] = []
    if new_status not in allowed:
        errors.append(f"Invalid status {new_status}")
        return {"errors": errors, "registration": out}
    if new_status == "SUBMITTED_EXTERNALLY" and not out.get("external_submission_approval"):
        errors.append("Human external submission approval required")
        out["status"] = "SUBMISSION_GATED"
        return {"errors": errors, "registration": out, "autoSubmitBlocked": True}
    if new_status in {"APPROVED_TO_SUBMIT", "SUBMISSION_GATED"}:
        out["status"] = new_status
        out["autoSubmitBlocked"] = True
        out["blC1"] = True
    else:
        out["status"] = new_status
    out["audit"] = out.get("audit") or []
    out["audit"].append({"to": new_status, "actor": actor, "at": _now()})
    return {"errors": errors, "registration": out}


def government_setup_checklist(*, entity_complete: bool, ownership_complete: bool, banking_noted: bool, naics: list[str]) -> dict[str, Any]:
    items = [
        {"item": "Legal entity information", "status": "COMPLETE" if entity_complete else "MISSING"},
        {"item": "Ownership information", "status": "COMPLETE" if ownership_complete else "MISSING"},
        {"item": "Banking information (where required)", "status": "NOTED" if banking_noted else "PENDING", "minimizeStorage": True},
        {"item": "UEI", "status": "PENDING"},
        {"item": "SAM.gov status", "status": "NOT_STARTED"},
        {"item": "NAICS", "status": "COMPLETE" if naics else "MISSING", "codes": naics},
        {"item": "Capability statement", "status": "PENDING"},
        {"item": "Points of contact", "status": "PENDING"},
    ]
    missing = [i for i in items if i["status"] in {"MISSING", "NOT_STARTED", "PENDING"}]
    return {
        "offerCode": OFFER_GOV,
        "items": items,
        "path": "Government Contractor Setup",
        "readyForHumanReview": entity_complete and ownership_complete and bool(naics),
        "missingCount": len(missing),
        "canAutoSubmitSam": False,
        "agent": AGENT_GOV_REG,
    }


def run_government_registration_agent(payload: dict[str, Any]) -> dict[str, Any]:
    checklist = government_setup_checklist(
        entity_complete=bool(payload.get("entityComplete")),
        ownership_complete=bool(payload.get("ownershipComplete")),
        banking_noted=bool(payload.get("bankingNoted")),
        naics=list(payload.get("naics") or []),
    )
    draft = {
        "registrationType": payload.get("registrationType") or "SAM.gov",
        "agencyPortal": "SAM.gov",
        "status": "IN_PREPARATION",
        "required_documents": checklist["items"],
        "draftInputsOnly": True,
    }
    return {
        "agent": AGENT_GOV_REG,
        "checklist": checklist,
        "draftRegistration": draft,
        "may": load_proc_policy()["agentMay"],
        "mustNot": [
            "submit official SAM.gov registration",
            "certify representations",
            "attest to ownership",
            "accept terms",
            "provide false information",
        ],
        "canAutoSubmit": False,
        "humanApprovalRequired": True,
    }


# --- NAICS ---


def propose_naics(codes: list[dict[str, Any]], *, ai_suggested: bool = False) -> dict[str, Any]:
    rows = []
    for c in codes:
        rows.append(
            {
                **c,
                "aiSuggested": ai_suggested or bool(c.get("aiSuggested")),
                "humanReviewRequired": True,
                "officialDetermination": False,
                "note": "Suggested codes are not official determinations.",
            }
        )
    return {"naics": rows, "clientConfirmationRequired": True, "advisorReviewRequired": True}


# --- Capability statement ---


@dataclass
class CapabilityClaim:
    field: str
    value: Any
    source: str
    verified: bool = False


def build_capability_statement(
    *,
    company_name: str,
    claims: list[CapabilityClaim | dict],
    created_by: str,
    version: int = 1,
) -> dict[str, Any]:
    rows = []
    invented: list[str] = []
    for c in claims:
        row = asdict(c) if isinstance(c, CapabilityClaim) else dict(c)
        if not row.get("source") or row.get("source") in {"AI", "Invented", "Unknown"}:
            invented.append(row.get("field") or "?")
            row["blocked"] = True
            row["reason"] = "Material claim requires verified source — AI may not invent facts."
        rows.append(row)
    return {
        "companyName": company_name,
        "version": version,
        "createdBy": created_by,
        "createdAt": _now(),
        "claims": rows,
        "blockedInventedClaims": invented,
        "approved": False,
        "canPublish": False,
        "truthRule": "Every material claim must have a source.",
        "sections": [
            "Company Name",
            "Core Competencies",
            "Differentiators",
            "Past Performance",
            "Certifications",
            "NAICS",
            "UEI / identifiers",
            "Contact Information",
            "Geographic Coverage",
            "Key Clients / projects where authorized",
            "Company facts",
        ],
    }


def approve_capability_statement(stmt: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    out = deepcopy(stmt)
    if out.get("blockedInventedClaims"):
        return {**out, "errors": ["Cannot approve while invented/unsourced claims remain"], "approved": False}
    out["approved"] = True
    out["approvedBy"] = advisor
    out["approvedAt"] = _now()
    out["approvalType"] = "CapabilityStatement"
    return out


# --- Past performance / licenses / insurance / labor ---


@dataclass
class PastPerformance:
    client_agency: str
    project: str
    contract_type: str | None = None
    description: str | None = None
    period: str | None = None
    contract_value: float | None = None
    scope: str | None = None
    performance_result: str | None = None
    reference_contact: str | None = None
    permission_to_use: bool = False
    source_evidence: str | None = None
    verification_status: str = "Unverified"


def register_past_performance(items: list[PastPerformance | dict]) -> dict[str, Any]:
    rows = []
    for i in items:
        row = asdict(i) if isinstance(i, PastPerformance) else dict(i)
        if not row.get("source_evidence"):
            row["verification_status"] = "Unverified"
            row["cannotFabricate"] = True
        if row.get("permission_to_use") is False:
            row["exposeExternally"] = False
        rows.append(row)
    return {"records": rows, "fabricateForbidden": True, "confidentialWithoutAuth": True}


@dataclass
class LicenseOrCert:
    type: str
    issuer: str
    identifier: str | None = None
    effective_date: str | None = None
    expiration: str | None = None
    status: str = "Unknown"
    document: str | None = None
    verification_date: str | None = None


def register_licenses(items: list[LicenseOrCert | dict]) -> dict[str, Any]:
    rows = [asdict(i) if isinstance(i, LicenseOrCert) else dict(i) for i in items]
    for r in rows:
        if r.get("status") == "Application Pending":
            r["claimAsCertifiedForbidden"] = True
    return {"records": rows, "applicationIsNotCertification": True}


@dataclass
class InsuranceEvidence:
    policy_type: str
    carrier: str | None = None
    limit: float | None = None
    effective_date: str | None = None
    expiration: str | None = None
    certificate: str | None = None
    requirement_match: str = "UNKNOWN"
    broker_contact: str | None = None
    verification_status: str = "Unverified"


def assess_insurance(items: list[InsuranceEvidence | dict], *, required_limit: float | None = None) -> dict[str, Any]:
    rows = [asdict(i) if isinstance(i, InsuranceEvidence) else dict(i) for i in items]
    gaps = []
    for r in rows:
        if required_limit is not None and (r.get("limit") is None or float(r["limit"]) < required_limit):
            r["requirement_match"] = "UNMET"
            gaps.append({"policy": r.get("policy_type"), "flag": "LIMIT_BELOW_REQUIREMENT", "action": "Broker/advisor review"})
        elif r.get("requirement_match") == "UNKNOWN":
            gaps.append({"policy": r.get("policy_type"), "flag": "UNVERIFIED", "action": "Broker/advisor review"})
    return {
        "policies": rows,
        "gaps": gaps,
        "bindingCoverageOpinionForbidden": True,
        "note": "Flag for broker/advisor review — HVCG does not provide binding coverage opinions.",
    }


def workforce_documentation(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "items": items,
        "legalOpinionForbidden": True,
        "note": "Documentation/coordination support only — no final employment-law or prevailing-wage legal opinions without qualified review.",
    }


# --- Opportunities / bid-no-bid / requirements ---


@dataclass
class ProcurementOpportunity:
    name: str
    buyer_agency: str
    solicitation_number: str | None = None
    public_private: str = "Private"
    contract_type: str | None = None
    service_category: str | None = None
    naics: str | None = None
    location: str | None = None
    estimated_value: float | None = None
    posted_date: str | None = None
    questions_due: str | None = None
    proposal_due: str | None = None
    award_date: str | None = None
    source: str = "Manual"
    source_url: str | None = None
    retrieved_at: str | None = None
    last_verified: str | None = None
    owner: str | None = None
    fit: str | None = None
    strategic_value: str | None = None
    competition: str | None = None
    readiness: str | None = None
    pursuit_status: str = "Identified"


def register_opportunity(opp: ProcurementOpportunity | dict) -> dict[str, Any]:
    row = asdict(opp) if isinstance(opp, ProcurementOpportunity) else dict(opp)
    row["retrieved_at"] = row.get("retrieved_at") or _now()
    row["provenance"] = {
        "source": row.get("source"),
        "sourceUrl": row.get("source_url"),
        "retrievedAt": row["retrieved_at"],
        "lastVerified": row.get("last_verified"),
        "owner": row.get("owner"),
    }
    row["liveExternalFeedActive"] = False
    row["fabricateForbidden"] = True
    row["valueKind"] = "Estimated Opportunity Value"
    return row


def bid_no_bid(
    *,
    opportunity_id: str,
    factors: dict[str, Any],
    ai_recommendation: str | None,
    advisor_conclusion: str,
    decision_maker: str,
    result: str,
) -> dict[str, Any]:
    policy = load_proc_policy()
    if result not in policy["bidNoBidResults"]:
        return {"errors": [f"Invalid result {result}"], "decision": None}
    return {
        "opportunityId": opportunity_id,
        "factors": factors,
        "aiRecommendation": ai_recommendation,
        "aiMayNotCommit": True,
        "advisorConclusion": advisor_conclusion,
        "decisionMaker": decision_maker,
        "decisionDate": _now(),
        "result": result,
        "humanApprovalRequired": True,
        "approved": False,
        "approvalType": "BidNoBid",
        "audit": True,
    }


def approve_bid_no_bid(decision: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    out = deepcopy(decision)
    out["approved"] = True
    out["approvedBy"] = advisor
    out["approvedAt"] = _now()
    return out


def requirements_matrix(requirements: list[dict[str, Any]]) -> dict[str, Any]:
    rows = []
    for r in requirements:
        kind = r.get("kind") or "SOURCE_REQUIREMENT"
        rows.append(
            {
                **r,
                "kind": kind,
                "note": "Separate SOURCE_REQUIREMENT from HVCG_INTERPRETATION and CLIENT_RESPONSE.",
            }
        )
    invented = [r for r in rows if r.get("invented") or (r.get("kind") == "SOURCE_REQUIREMENT" and r.get("sourceMissing"))]
    return {
        "requirements": rows,
        "inventedSourceRequirementsForbidden": True,
        "flagged": invented,
    }


def compliance_matrix(source_requirements: list[str], interpretations: list[str] | None = None, client_responses: list[str] | None = None) -> dict[str, Any]:
    return {
        "sourceRequirements": [{"text": s, "kind": "SOURCE_REQUIREMENT"} for s in source_requirements],
        "hvcgInterpretations": [{"text": i, "kind": "HVCG_INTERPRETATION"} for i in (interpretations or [])],
        "clientResponses": [{"text": c, "kind": "CLIENT_RESPONSE"} for c in (client_responses or [])],
        "inventedRequirementsForbidden": True,
    }


# --- Proposals / pricing ---


def draft_procurement_proposal(*, opportunity_id: str, sections: dict[str, str], pricing_draft: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        "opportunityId": opportunity_id,
        "reusesProposalSystem": True,
        "duplicateProposalEngineForbidden": True,
        "agent": AGENT_PROPOSAL,
        "sections": {
            "Executive Summary": sections.get("exec"),
            "Technical Approach": sections.get("technical"),
            "Staffing": sections.get("staffing"),
            "Past Performance": sections.get("past_performance"),
            "Schedule": sections.get("schedule"),
            "Compliance Matrix": sections.get("compliance"),
            "Pricing Narrative": sections.get("pricing_narrative"),
            "Attachments": sections.get("attachments"),
            "Required Forms": sections.get("forms"),
            "Assumptions": sections.get("assumptions"),
            "Exceptions": sections.get("exceptions"),
        },
        "pricingDraft": pricing_draft,
        "pricingApproved": False,
        "canCommitBidPricing": False,
        "canSubmitBid": False,
        "approvalTypes": ["ProposalPricing", "ProposalSubmission"],
        "createdAt": _now(),
    }


def approve_proposal_pricing(proposal: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    out = deepcopy(proposal)
    out["pricingApproved"] = True
    out["pricingApprovedBy"] = advisor
    out["pricingApprovedAt"] = _now()
    out["canCommitBidPricing"] = False  # still requires separate submission approval
    return out


# --- Document checklist (reuse pattern) ---


def build_procurement_document_checklist(
    *,
    public_private: str,
    contract_type: str | None = None,
    agency: str | None = None,
    industry: str | None = None,
) -> dict[str, Any]:
    base = ["Entity documents", "Insurance certificates", "Licenses/certifications", "Capability statement", "Past performance"]
    if public_private == "Government":
        items = base + ["SAM.gov evidence", "UEI", "NAICS confirmation", "Representations checklist (draft only)"]
    else:
        items = base + ["Vendor registration (if required)", "NDA (if required)"]
    if contract_type and "construction" in contract_type.lower():
        items += ["Safety documentation", "Bonding evidence (if required)"]
    if industry:
        items.append(f"Industry-specific docs ({industry})")
    return {
        "agent": AGENT_DOC,
        "publicPrivate": public_private,
        "agency": agency,
        "contractType": contract_type,
        "items": [{"item": i, "status": "Required"} for i in items],
        "universalChecklistForbidden": True,
        "note": "Conditional checklist — not one universal list.",
    }


# --- Capital / CFO connections ---


def recommend_capital_from_procurement(
    *,
    opportunity_id: str,
    client: str,
    reason: str,
    amount: float | None,
    advisor: str,
) -> dict[str, Any]:
    return {
        "flag": "CAPITAL_SUPPORT_RECOMMENDED",
        "fromOpportunity": opportunity_id,
        "client": client,
        "reason": reason,
        "suggestedAmount": amount,
        "path": "Procurement Opportunity → Capital Need → Human Approval → Capital Opportunity → Capital Readiness",
        "reuseCapitalEngine": True,
        "duplicateCapitalArchitectureForbidden": True,
        "canContactLender": False,
        "humanApprovalRequired": True,
        "approved": False,
        "requestedBy": advisor,
        "at": _now(),
    }


def approve_and_run_capital(rec: dict[str, Any], diagnostic_payload: dict[str, Any], *, advisor: str) -> dict[str, Any]:
    if not rec.get("approved"):
        rec = deepcopy(rec)
        rec["approved"] = True
        rec["approvedBy"] = advisor
    if run_capital_readiness_diagnostic is None:
        return {"errors": ["capital_readiness unavailable"], "diagnostic": None}
    diag = run_capital_readiness_diagnostic(diagnostic_payload)
    return {
        "errors": [],
        "recommendation": rec,
        "diagnostic": diag,
        "canContactLender": False,
        "engine": "capital_readiness",
        "lineage": {"procurementOpportunityId": rec.get("fromOpportunity")},
    }


def recommend_cfo_from_procurement(*, opportunity_id: str, client: str, reason: str) -> dict[str, Any]:
    return {
        "flag": "CFO_REVIEW_RECOMMENDED",
        "fromOpportunity": opportunity_id,
        "client": client,
        "reason": reason,
        "reuseCfoEngine": True,
        "duplicateFinanceArchitectureForbidden": True,
        "nextStep": "Create/extend OFF-FCFO-OP engagement with pursuit context",
        "contextPreserved": True,
        "at": _now(),
    }


def handoff_to_cfo(*, opportunity_id: str, client: str, cash_need: str) -> dict[str, Any]:
    if cfo is None:
        return {"errors": ["fractional_cfo unavailable"]}
    eng = cfo.create_cfo_engagement(
        client=client,
        engagement_id=f"CFO-FROM-PROC-{opportunity_id}",
        assigned_advisor="Manny Barela",
        internal_notes=f"Procurement handoff: {cash_need}",
    )
    return {
        "errors": [],
        "cfoEngagement": eng,
        "context": {"procurementOpportunityId": opportunity_id, "cashNeed": cash_need},
        "engine": "fractional_cfo",
    }


# --- Capacity / awards / success fee / post-award ---


def capacity_signals(signals: dict[str, Any]) -> dict[str, Any]:
    return {
        "signals": signals,
        "autoRepresentCapableForbidden": True,
        "note": "Decision-support only — do not automatically represent client as capable.",
    }


def create_award_record(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("isForecastOnly"):
        return {"errors": ["Do not record forecasted opportunities as awards"], "award": None}
    return {
        "award": {
            **payload,
            "valueKind": "Awarded Contract Value",
            "notCollectedRevenue": True,
            "notHvcgRevenue": True,
            "sourceEvidence": payload.get("sourceEvidence"),
            "createdAt": _now(),
        },
        "errors": [],
    }


def success_fee_metadata(*, fee_pct: float | None, fee_base: str | None, trigger: str | None, agreement_ref: str | None, award_amount: float | None) -> dict[str, Any]:
    return {
        "feePct": fee_pct,
        "feeBase": fee_base,
        "trigger": trigger,
        "agreementReference": agreement_ref,
        "complianceReviewRequired": True,
        "awardAmount": award_amount,
        "collectedAmount": None,
        "feeStatus": "Not Recognized" if not agreement_ref else "Pending Trigger",
        "autoRecognizeForbidden": True,
        "note": "Do not recognize success fee merely because an award occurred — use executed agreement terms.",
    }


def post_award_foundation(*, award_id: str) -> dict[str, Any]:
    return {
        "awardId": award_id,
        "items": [
            "contract kickoff",
            "compliance requirements",
            "insurance renewals",
            "reporting calendar",
            "deliverables",
            "invoicing milestones",
            "subcontractor requirements",
            "change orders",
            "renewal / option dates",
            "closeout items",
        ],
        "handoff": {
            "opsProject": True,
            "cfoCashPlanning": True,
            "capitalIfMobilization": True,
            "clientSuccess": True,
        },
        "duplicateFullPmPlatformForbidden": True,
        "reuseOpsHub": True,
    }


def expiration_monitor(records: list[dict[str, Any]]) -> dict[str, Any]:
    tasks = []
    for r in records:
        exp = r.get("expiration") or r.get("expiration_date")
        status = r.get("status")
        if status == "EXPIRED" or (exp and status == "RENEWAL_DUE"):
            tasks.append(
                {
                    "type": r.get("type") or r.get("registration_type") or "Item",
                    "action": "Internal renewal task",
                    "expiration": exp,
                    "externalSubmissionGated": True,
                }
            )
    return {"tasks": tasks, "externalRenewalSubmissionGated": True}


# --- Readiness report / external gates / agent runtime ---


def draft_readiness_report(ctx: dict[str, Any]) -> dict[str, Any]:
    policy = load_proc_policy()
    body = f"""# PROCUREMENT READINESS REPORT (DRAFT)

# Executive Summary
{ctx.get('execSummary', '')}

# Target Contract Strategy
{ctx.get('strategy', '')}

# Registration Status
{ctx.get('registration', '')}

# NAICS / Service Alignment
{ctx.get('naics', '')}

# Certifications / Licenses
{ctx.get('certs', '')}

# Insurance
{ctx.get('insurance', '')}

# Capability Statement
{ctx.get('capability', '')}

# Past Performance
{ctx.get('pastPerformance', '')}

# Workforce / Capacity
{ctx.get('workforce', '')}

# Financial / Capital Readiness
{ctx.get('financial', '')}

# Gaps
{ctx.get('gaps', '')}

# Recommended Actions
{ctx.get('actions', '')}

# Pursuit Readiness
{ctx.get('pursuit', '')}

# Advisor Conclusion
[ADVISOR_JUDGMENT] pending human review

# Limitations
{policy['disclaimer']}
"""
    return {
        "version": ctx.get("version") or 1,
        "period": ctx.get("period"),
        "body": body,
        "approved": False,
        "canAutoSend": False,
        "humanReviewRequired": True,
        "disclaimer": policy["disclaimer"],
        "createdAt": _now(),
    }


def attempt_external_procurement_action(*, action: str) -> dict[str, Any]:
    blocked = {
        "sam_submit",
        "vendor_registration_submit",
        "proposal_submit",
        "pricing_send",
        "contracting_officer_email",
        "portal_upload",
        "accept_terms",
        "sign_documents",
    }
    return {
        "action": action,
        "allowed": False,
        "blC1Active": BL_C1_ACTIVE,
        "reason": "External submission / communication gated — authorized human action required.",
        "blockedActions": sorted(blocked),
    }


def run_contract_procurement_agent(payload: dict[str, Any]) -> dict[str, Any]:
    eng = payload.get("engagement") or create_procurement_engagement(
        client=payload.get("client") or "Unknown",
        engagement_id=payload.get("engagementId") or "PROC-AGENT",
        offer_code=payload.get("offerCode") or OFFER_PROC,
        public_private=payload.get("publicPrivate") or "Private",
    )
    readiness = payload.get("readiness") or assess_procurement_readiness(
        engagement_id=eng["engagement_id"] if "engagement_id" in eng else eng.get("engagement_id") or eng.get("engagementId") or "PROC",
        evidences=payload.get("evidences") or [],
        public_private=payload.get("publicPrivate") or eng.get("public_private") or "Private",
    )
    checklist = build_procurement_document_checklist(
        public_private=payload.get("publicPrivate") or "Private",
        contract_type=payload.get("contractType"),
        agency=payload.get("agency"),
        industry=payload.get("industry"),
    )
    return {
        "agent": AGENT_PROCURE,
        "engagement": eng,
        "readiness": readiness,
        "checklist": checklist,
        "may": load_proc_policy()["agentMay"],
        "mustNot": load_proc_policy()["agentMustNot"],
        "canSubmitBid": False,
        "canSubmitRegistration": False,
        "humanApprovalRequired": True,
        "riskLevel": "HIGH",
    }
