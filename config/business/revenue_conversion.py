"""HVCG Revenue OS conversion services (Development) — BA V2 Sprint 3.

Reuses SharePoint CRM + BA V2 catalogs. Does not create a second Revenue OS.
BL-C1: proposals cannot auto-send.
"""

from __future__ import annotations

import json
from copy import deepcopy
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from commercial_rules import recommend_offer, validate_opportunity_commercial
from pricing_policy import (
    CURRENT_NEW_CLIENT_RATE_CARD,
    HISTORICAL_RATE_CARD_V1,
    accg_locked_monthly,
    apply_recommended_as_contracted,
    is_legacy_client,
    load_json,
    pricing_for_client,
)

BUSINESS = Path(__file__).resolve().parents[2] / "config" / "business"
TEMPLATES = Path(__file__).resolve().parents[2] / "templates" / "proposals"

BL_C1_ACTIVE = True

PROPOSAL_STATUSES = [
    "NOT_STARTED",
    "DRAFT",
    "INTERNAL_REVIEW",
    "OWNER_APPROVAL_REQUIRED",
    "APPROVED_TO_SEND",
    "SENT",
    "CLIENT_REVIEW",
    "ACCEPTED",
    "DECLINED",
    "EXPIRED",
    "SUPERSEDED",
]

# Align BA V2 states to existing SP ProposalStatus where possible
SP_STATUS_MAP = {
    "DRAFT": "Draft",
    "INTERNAL_REVIEW": "Internal Review",
    "SENT": "Sent",
    "CLIENT_REVIEW": "Negotiation",
    "ACCEPTED": "Accepted",
    "DECLINED": "Rejected",
    "SUPERSEDED": "Withdrawn",
}

OUTCOME_MAP = {
    "help with loan": ("OFF-CAP-DIAG", "Capital Readiness / Lender-Ready Capital Package"),
    "loan help": ("OFF-CAP-PKG", "Lender-Ready Capital Package"),
    "clean up financials": ("OFF-FCFO-OP", "CFO Readiness / Fractional CFO"),
    "help with sam": ("OFF-GOV-SETUP", "Government Contractor Setup"),
    "help with a claim": ("OFF-CLAIMS", "Risk / Recovery"),
    "need systems": ("OFF-GROWTH-OS", "Growth Operating System"),
    "automate business": ("OFF-AI-OPS", "AI Second Brain / AI Operations"),
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_free_fit_policy() -> dict[str, Any]:
    return load_json("free-fit-assessment.json")


def load_offers_by_code() -> dict[str, dict[str, Any]]:
    return {o["offerCode"]: o for o in load_json("offer-catalog.json")["offers"]}


def load_rate_card() -> dict[str, Any]:
    return load_json("pricing-rate-card-v2.json")


# --- Free Fit ---


@dataclass
class FreeFitAssessment:
    assessment_id: str
    lead_id: str | None
    date: str
    advisor: str | None
    need_type: str | None
    revenue_range: str | None
    capital_goal: str | None
    urgency: str | None
    service_fit: str | None
    qualification_result: str  # Qualified | Disqualified | Pending
    recommended_diagnostic: str | None
    recommended_service_line: str | None
    recommended_offer: str | None
    disqualification_reason: str | None
    notes: str | None
    source: str | None
    converted_to_diagnostic: bool = False
    converted_to_opportunity: bool = False
    referral_source: str | None = None
    substantive_outputs_attempted: list[str] = field(default_factory=list)


def validate_free_fit(assessment: FreeFitAssessment) -> list[str]:
    """Free fit cannot produce prohibited substantive diagnostic deliverables."""
    policy = load_free_fit_policy()
    prohibited = set(policy["prohibitedSubstantiveWork"])
    errors: list[str] = []
    for item in assessment.substantive_outputs_attempted:
        if item in prohibited:
            errors.append(f"Free Fit must not include substantive work: {item}")
    if assessment.qualification_result not in {"Qualified", "Disqualified", "Pending"}:
        errors.append("qualification_result invalid")
    return errors


def complete_free_fit(
    *,
    assessment_id: str,
    lead_id: str | None,
    advisor: str | None,
    need_type: str,
    source: str | None = None,
    revenue_range: str | None = None,
    capital_goal: str | None = None,
    urgency: str | None = None,
    referral_source: str | None = None,
) -> dict[str, Any]:
    rule = recommend_offer(need_type) if need_type else None
    # Prefer decision engine; fall back to outcome selling map
    offer_code = rule["offerCode"] if rule else None
    diagnostic = rule.get("diagnostic") if rule else None
    service_line = None
    if offer_code:
        offer = load_offers_by_code().get(offer_code)
        service_line = offer["serviceLine"] if offer else None
    if not offer_code:
        mapped = OUTCOME_MAP.get(need_type.strip().lower())
        if mapped:
            offer_code, _ = mapped
            offer = load_offers_by_code().get(offer_code)
            service_line = offer["serviceLine"] if offer else None

    assessment = FreeFitAssessment(
        assessment_id=assessment_id,
        lead_id=lead_id,
        date=_now(),
        advisor=advisor,
        need_type=need_type,
        revenue_range=revenue_range,
        capital_goal=capital_goal,
        urgency=urgency,
        service_fit=service_line,
        qualification_result="Qualified" if offer_code else "Pending",
        recommended_diagnostic=diagnostic,
        recommended_service_line=service_line,
        recommended_offer=offer_code,
        disqualification_reason=None,
        notes="Free Fit & Readiness Assessment — qualification/routing only",
        source=source,
        referral_source=referral_source,
    )
    errors = validate_free_fit(assessment)
    return {"assessment": asdict(assessment), "errors": errors, "fee": 0, "sku": "SKU-FRA"}


# --- Diagnostics ---


@dataclass
class DiagnosticRecord:
    diagnostic_id: str
    diagnostic_type: str
    client_id: str | None
    opportunity_id: str | None
    fee: float
    pricing_version: str
    status: str
    required_documents: list[str]
    documents_received: list[str]
    findings_fact: list[str]
    findings_ai_inference: list[str]
    findings_advisor_conclusion: list[str]
    score: float | None
    risk_flags: list[str]
    recommended_offer: str | None
    recommended_pricing: dict[str, Any] | None
    human_approval: bool
    completion_date: str | None
    proposal_trigger: bool
    diagnostic_bypass: bool = False
    bypass_reason: str | None = None


def create_diagnostic(
    *,
    diagnostic_id: str,
    diagnostic_type: str,
    client_id: str | None,
    opportunity_id: str | None,
    fee: float | None = None,
    bypass: bool = False,
    bypass_reason: str | None = None,
) -> dict[str, Any]:
    if bypass and not bypass_reason:
        return {"errors": ["Diagnostic bypass requires reason"], "diagnostic": None}
    card = load_rate_card()
    # default fee from capital diagnostic mid if not provided
    default_fee = 5000.0
    for level in load_json("diagnostics.json").get("levels", []):
        if level["code"] == diagnostic_type or level.get("name") == diagnostic_type:
            default_fee = float(level.get("approxFee") or default_fee)
            break
    rec = DiagnosticRecord(
        diagnostic_id=diagnostic_id,
        diagnostic_type=diagnostic_type,
        client_id=client_id,
        opportunity_id=opportunity_id,
        fee=float(fee if fee is not None else default_fee),
        pricing_version=CURRENT_NEW_CLIENT_RATE_CARD,
        status="NOT_STARTED" if not bypass else "BYPASSED",
        required_documents=[],
        documents_received=[],
        findings_fact=[],
        findings_ai_inference=[],
        findings_advisor_conclusion=[],
        score=None,
        risk_flags=[],
        recommended_offer=None,
        recommended_pricing=None,
        human_approval=False,
        completion_date=None,
        proposal_trigger=False,
        diagnostic_bypass=bypass,
        bypass_reason=bypass_reason,
    )
    return {"diagnostic": asdict(rec), "errors": [], "rateCardStatus": card["status"]}


# --- Pricing recommendation ---


def recommend_pricing(
    *,
    offer_code: str,
    commercial_class: str,
    client_classification: str,
    contracted_current: float | None = None,
    urgency: str | None = None,
    complexity: str | None = None,
    capital_amount: float | None = None,
) -> dict[str, Any]:
    offers = load_offers_by_code()
    offer = offers.get(offer_code)
    if not offer:
        return {"errors": [f"Unknown offer {offer_code}"], "recommendation": None}

    setup = offer.get("setupFeeGuidance") or {}
    retainer = offer.get("monthlyRetainerOption") or {}
    card = load_rate_card()

    setup_target = setup.get("typical") or setup.get("min")
    if complexity == "premium" and setup.get("max") is not None:
        setup_target = setup.get("max")
    if urgency == "urgent" and setup.get("max") is not None:
        setup_target = setup.get("max")

    retainer_target = None
    if retainer:
        retainer_target = retainer.get("min")
        if complexity == "premium":
            retainer_target = retainer.get("max") or retainer_target

    success = None
    if offer.get("successFeeApplicable"):
        # guidance only from rate card debt financing mid
        success = {
            "type": "SUCCESS_FEE",
            "guidancePercent": card.get("successFeeGuidancePercent", {}).get("debtFinancing"),
            "note": "Guidance only — not a contractual commitment",
        }

    hourly = None
    if commercial_class == "PREMIUM_SPECIAL_PROJECT":
        hourly = card.get("premiumHourly", {}).get("specialProjectFloor", 500)

    display = pricing_for_client(
        classification=client_classification,
        contracted_current=contracted_current,
        recommended_future=retainer_target if is_legacy_client(client_classification) else None,
        new_client_rate_card_target=retainer_target,
    )

    approval_required = True
    recommendation = {
        "offerCode": offer_code,
        "serviceLine": offer.get("serviceLine"),
        "commercialClass": commercial_class,
        "recommendedSetupFee": None if is_legacy_client(client_classification) else setup_target,
        "recommendedRetainer": None if is_legacy_client(client_classification) else retainer_target,
        "recommendedSuccessFee": None if is_legacy_client(client_classification) else success,
        "recommendedMinimumTermMonths": offer.get("minimumTermMonths"),
        "recommendedPremiumHourly": None if is_legacy_client(client_classification) else hourly,
        "pricingVersion": CURRENT_NEW_CLIENT_RATE_CARD
        if not is_legacy_client(client_classification)
        else HISTORICAL_RATE_CARD_V1,
        "pricingStateForNewEconomics": "CURRENT_RATE_CARD"
        if not is_legacy_client(client_classification)
        else "RECOMMENDED_FUTURE",
        "rationale": [
            f"Offer {offer.get('name')}",
            f"Class {commercial_class}",
            f"Client classification {client_classification}",
            f"Complexity={complexity} urgency={urgency} capital_amount={capital_amount}",
        ],
        "approvalRequired": approval_required,
        "isApprovedPrice": False,
        "complianceFlag": offer.get("complianceRequirements") or [],
        "legacyProtection": display,
        "accgLockApplies": client_classification in {"HVS_LEGACY_CLIENT", "HVS LEGACY CLIENT"}
        and contracted_current == accg_locked_monthly(),
    }
    return {"errors": [], "recommendation": recommendation}


def apply_manual_pricing_override(
    *,
    recommendation: dict[str, Any],
    override_setup: float | None,
    override_retainer: float | None,
    approver: str,
    reason: str,
) -> dict[str, Any]:
    if not approver or not reason:
        return {"errors": ["MANUAL_PRICING_OVERRIDE requires approver and reason"], "override": None}
    return {
        "errors": [],
        "override": {
            "type": "MANUAL_PRICING_OVERRIDE",
            "approver": approver,
            "reason": reason,
            "date": _now(),
            "originalRecommendation": deepcopy(recommendation),
            "approvedOverride": {
                "setupFee": override_setup,
                "retainer": override_retainer,
            },
            "stillNotContracted": True,
        },
    }


# --- Proposal draft ---


def _archetype_for_class(commercial_class: str) -> str:
    if commercial_class == "RECURRING_RETAINER":
        return "RECURRING_RETAINER"
    if commercial_class == "PREMIUM_SPECIAL_PROJECT":
        return "PREMIUM_SPECIAL_PROJECT"
    return "STRUCTURED_OFFER"


def draft_proposal(
    *,
    client_name: str,
    opportunity_id: str,
    commercial_class: str,
    offer_code: str,
    pricing_recommendation: dict[str, Any],
    proposed_setup: float | None = None,
    proposed_retainer: float | None = None,
    situation: str = "",
    objective: str = "",
) -> dict[str, Any]:
    offers = load_offers_by_code()
    offer = offers.get(offer_code)
    if not offer:
        return {"errors": [f"Unknown offer {offer_code}"], "proposal": None}

    arch = _archetype_for_class(commercial_class)
    templates = {
        "STRUCTURED_OFFER": TEMPLATES / "STRUCTURED_OFFER.md",
        "RECURRING_RETAINER": TEMPLATES / "MONTHLY_RETAINER.md",
        "PREMIUM_SPECIAL_PROJECT": TEMPLATES / "PREMIUM_SPECIAL_PROJECT.md",
    }
    compliance = load_json("compliance-language.json")
    body = templates[arch].read_text(encoding="utf-8")
    replacements = {
        "{{client_situation}}": situation or f"{client_name} — {offer.get('painPoint','')}",
        "{{objective}}": objective or offer.get("salesAngle", ""),
        "{{scope}}": offer.get("description", ""),
        "{{deliverables}}": "\n".join(f"- {d}" for d in (offer.get("deliverables") or [])),
        "{{client_responsibilities}}": "\n".join(f"- {i}" for i in (offer.get("requiredInputs") or [])),
        "{{timeline}}": "To be confirmed with advisor",
        "{{fee_summary}}": (
            f"Setup: {proposed_setup if proposed_setup is not None else pricing_recommendation.get('recommendedSetupFee')}; "
            f"Retainer: {proposed_retainer if proposed_retainer is not None else pricing_recommendation.get('recommendedRetainer')}"
        ),
        "{{pricing_version_id}}": pricing_recommendation.get("pricingVersion", CURRENT_NEW_CLIENT_RATE_CARD),
        "{{offer_name}}": offer.get("name", ""),
        "{{offer_code}}": offer_code,
        "{{additional_exclusions}}": "",
        "{{compliance_general}}": compliance["language"]["generalAdvisory"],
        "{{compliance_contextual}}": compliance["language"].get("financing", ""),
        "{{next_steps}}": "Internal approval required before send (BL-C1).",
        "{{monthly_role}}": offer.get("description", ""),
        "{{included_support}}": "\n".join(f"- {d}" for d in (offer.get("deliverables") or [])),
        "{{meeting_cadence}}": "As defined in engagement",
        "{{response_expectations}}": "Business days — advisor defined",
        "{{setup_fee}}": str(proposed_setup if proposed_setup is not None else pricing_recommendation.get("recommendedSetupFee")),
        "{{monthly_retainer}}": str(proposed_retainer if proposed_retainer is not None else pricing_recommendation.get("recommendedRetainer")),
        "{{minimum_term}}": str(offer.get("minimumTermMonths") or "N/A"),
        "{{renewal_termination}}": "Per agreement",
        "{{special_projects_policy}}": compliance.get("outOfScopeRetainer", ""),
        "{{special_situation}}": situation,
        "{{immediate_risks}}": "",
        "{{strategic_objective}}": objective or offer.get("salesAngle", ""),
        "{{work_phases}}": "Phase plan to be confirmed",
        "{{documentation_needed}}": "\n".join(f"- {i}" for i in (offer.get("requiredInputs") or [])),
        "{{professional_coordination}}": "As required with licensed professionals",
        "{{project_fee}}": str(proposed_setup if proposed_setup is not None else pricing_recommendation.get("recommendedSetupFee")),
        "{{hourly_or_replenishing}}": str(pricing_recommendation.get("recommendedPremiumHourly") or ""),
        "{{success_fee}}": json.dumps(pricing_recommendation.get("recommendedSuccessFee")),
        "{{urgency_premium}}": "",
        "{{limitations}}": compliance["language"]["generalAdvisory"],
        "{{approval_points}}": "Human approval required before external use",
    }
    for k, v in replacements.items():
        body = body.replace(k, str(v if v is not None else ""))

    status = "DRAFT"
    proposal = {
        "opportunityId": opportunity_id,
        "clientName": client_name,
        "commercialClass": commercial_class,
        "offerCode": offer_code,
        "archetype": arch,
        "pricingVersionId": pricing_recommendation.get("pricingVersion"),
        "recommendedPricing": pricing_recommendation,
        "proposedSetup": proposed_setup if proposed_setup is not None else pricing_recommendation.get("recommendedSetupFee"),
        "proposedRetainer": proposed_retainer if proposed_retainer is not None else pricing_recommendation.get("recommendedRetainer"),
        "status": status,
        "sharePointProposalStatus": SP_STATUS_MAP.get(status, "Draft"),
        "body": body,
        "isApprovedPrice": False,
        "blC1Active": BL_C1_ACTIVE,
        "canAutoSend": False,
    }
    return {"errors": [], "proposal": proposal}


def transition_proposal(proposal: dict[str, Any], new_status: str, *, actor: str) -> dict[str, Any]:
    if new_status not in PROPOSAL_STATUSES:
        return {"errors": [f"Invalid status {new_status}"], "proposal": proposal}
    # BL-C1: cannot move to SENT without breaking lock in Sprint 3
    if new_status in {"SENT", "CLIENT_REVIEW"} and BL_C1_ACTIVE:
        return {
            "errors": ["BL-C1 active: proposal cannot auto-send or mark SENT in Sprint 3"],
            "proposal": proposal,
        }
    if new_status == "APPROVED_TO_SEND" and proposal.get("status") not in {
        "OWNER_APPROVAL_REQUIRED",
        "INTERNAL_REVIEW",
        "DRAFT",
    }:
        # allow from internal review path
        pass
    updated = deepcopy(proposal)
    updated["status"] = new_status
    updated["sharePointProposalStatus"] = SP_STATUS_MAP.get(new_status, updated.get("sharePointProposalStatus"))
    updated["lastTransition"] = {"to": new_status, "actor": actor, "at": _now()}
    return {"errors": [], "proposal": updated}


def create_proposal_approval(proposal: dict[str, Any], *, requester: str) -> dict[str, Any]:
    """Reuse HVCG_Approvals shape — Proposal approval type."""
    return {
        "Title": f"Proposal approval — {proposal.get('offerCode')} — {proposal.get('clientName')}",
        "RelatedList": "HVCG_Proposals",
        "ApprovalType": "Proposal",
        "ApprovalStatus": "Pending",
        "RequestedDate": _now(),
        "Requester": requester,
        "Payload": {
            "client": proposal.get("clientName"),
            "opportunityId": proposal.get("opportunityId"),
            "offerCode": proposal.get("offerCode"),
            "commercialClass": proposal.get("commercialClass"),
            "pricingVersionId": proposal.get("pricingVersionId"),
            "recommendedPricing": proposal.get("recommendedPricing"),
            "proposedSetup": proposal.get("proposedSetup"),
            "proposedRetainer": proposal.get("proposedRetainer"),
            "legacyProtection": (proposal.get("recommendedPricing") or {}).get("legacyProtection"),
            "blC1Active": True,
            "allowedActions": [
                "Approve",
                "Reject",
                "Request Change",
                "Override Pricing",
                "Escalate Compliance Review",
            ],
        },
    }


# --- Outcome selling ---


def map_outcome_need(raw_need: str) -> dict[str, Any]:
    key = (raw_need or "").strip().lower()
    if key in OUTCOME_MAP:
        offer_code, label = OUTCOME_MAP[key]
        return {
            "rawNeed": raw_need,
            "mappedOfferCode": offer_code,
            "mappedLabel": label,
            "humanConfirmationRequired": True,
            "fabricatedScopeForbidden": True,
        }
    rule = recommend_offer(raw_need)
    if rule:
        return {
            "rawNeed": raw_need,
            "mappedOfferCode": rule["offerCode"],
            "mappedLabel": rule["offerCode"],
            "humanConfirmationRequired": True,
            "fabricatedScopeForbidden": True,
        }
    return {
        "rawNeed": raw_need,
        "mappedOfferCode": None,
        "mappedLabel": None,
        "humanConfirmationRequired": True,
        "fabricatedScopeForbidden": True,
        "errors": ["No deterministic mapping — human must classify"],
    }


# --- Referral attribution chain ---


def referral_attribution_chain(
    *,
    referral_partner_id: str | None,
    lead_id: str | None,
    opportunity_id: str | None,
    diagnostic_id: str | None,
    proposal_id: str | None,
    engagement_id: str | None,
    invoice_id: str | None,
    collected_revenue: float | None,
) -> dict[str, Any]:
    return {
        "referralPartnerId": referral_partner_id,
        "leadId": lead_id,
        "opportunityId": opportunity_id,
        "diagnosticId": diagnostic_id,
        "proposalId": proposal_id,
        "engagementId": engagement_id,
        "invoiceId": invoice_id,
        "collectedRevenue": collected_revenue,
        "payoutBasis": "COLLECTED_CLEARED_REVENUE_ONLY",
        "payoutAllowed": False,
        "autonomousPayoutForbidden": True,
        "note": "Sprint 3 preserves attribution only — no payout approval automation",
    }


# --- Conversion path orchestrator ---


def conversion_step(
    *,
    stage: str,
    commercial_class: str | None = None,
    service_line_code: str | None = None,
    offer_code: str | None = None,
    pricing_basis: str | None = None,
    approved_scope: bool = False,
    approved_economics: bool = False,
) -> dict[str, Any]:
    """Progressive Revenue OS validation along the commercial path."""
    # Map conversion stages onto Opportunity Stage vocabulary used by commercial_rules
    stage_map = {
        "LEAD": "Discovery",
        "FREE_FIT": "Discovery",
        "QUALIFIED_OPPORTUNITY": "Assessment",
        "PAID_DIAGNOSTIC": "Assessment",
        "PROPOSAL_DRAFT": "Proposal",
        "PROPOSAL_APPROVAL": "Proposal",
        "ENGAGEMENT": "Won",
    }
    opp_stage = stage_map.get(stage, stage)
    errors = validate_opportunity_commercial(
        stage=opp_stage,
        commercial_class=commercial_class,
        service_line_code=service_line_code,
        offer_code=offer_code,
        pricing_basis=pricing_basis,
        approved_scope=approved_scope,
        approved_economics=approved_economics,
    )
    return {"stage": stage, "opportunityStage": opp_stage, "errors": errors, "ok": not errors}


def protect_contracted_price(
    contracted_current: float | None,
    recommended_future: float | None,
    *,
    owner_approved: bool = False,
    agreement_executed: bool = False,
) -> float | None:
    return apply_recommended_as_contracted(
        contracted_current,
        recommended_future,
        owner_approved=owner_approved,
        agreement_executed=agreement_executed,
    )
