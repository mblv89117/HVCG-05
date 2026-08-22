"""Commercial validation for HVCG BA V2 (Revenue OS progressive rules)."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

BUSINESS = Path(__file__).resolve().parent

COMMERCIAL_CLASSES = (
    "STRUCTURED_OFFER",
    "RECURRING_RETAINER",
    "PREMIUM_SPECIAL_PROJECT",
)

# Stages aligned to HVCG_Opportunities.Stage
LEAD_LIKE = {"Discovery"}
QUALIFIED_LIKE = {"Assessment", "Proposal", "Negotiation"}
PROPOSAL_LIKE = {"Proposal", "Negotiation"}
WON_LIKE = {"Won"}


def load_offers() -> list[dict[str, Any]]:
    data = json.loads((BUSINESS / "offer-catalog.json").read_text(encoding="utf-8"))
    return list(data["offers"])


def load_decision_engine() -> dict[str, Any]:
    return json.loads((BUSINESS / "offer-decision-engine.json").read_text(encoding="utf-8"))


def recommend_offer(need: str) -> dict[str, Any] | None:
    engine = load_decision_engine()
    key = need.strip().lower()
    for rule in engine["rules"]:
        if rule["need"].strip().lower() == key:
            return rule
    return None


def public_offers_only(include_restricted: bool = False) -> list[dict[str, Any]]:
    offers = load_offers()
    if include_restricted:
        return offers
    return [o for o in offers if o.get("public", True) and not o.get("restricted")]


def validate_opportunity_commercial(
    *,
    stage: str,
    commercial_class: str | None,
    service_line_code: str | None,
    offer_code: str | None,
    pricing_basis: str | None,
    approved_scope: bool = False,
    approved_economics: bool = False,
) -> list[str]:
    """Return list of validation errors. Empty = pass.

    Progressive rules:
    - Lead/Discovery: unclassified OK
    - Qualified (Assessment+): CommercialClass required
    - Proposal+: ServiceLine + Offer + pricing basis required
    - Won: approved scope + economics required
    """
    errors: list[str] = []
    stage_norm = (stage or "").strip()

    if stage_norm in LEAD_LIKE:
        return errors

    if stage_norm in QUALIFIED_LIKE or stage_norm in WON_LIKE:
        if not commercial_class:
            errors.append("CommercialClass required for qualified opportunities")
        elif commercial_class not in COMMERCIAL_CLASSES:
            errors.append(f"CommercialClass must be one of {COMMERCIAL_CLASSES}")

    if stage_norm in PROPOSAL_LIKE or stage_norm in WON_LIKE:
        if not service_line_code:
            errors.append("ServiceLineCode required at Proposal")
        if not offer_code:
            errors.append("OfferCode required at Proposal")
        if not pricing_basis:
            errors.append("PricingBasis required at Proposal")
        if offer_code:
            codes = {o["offerCode"] for o in load_offers()}
            if offer_code not in codes:
                errors.append(f"Unknown OfferCode: {offer_code}")

    if stage_norm in WON_LIKE:
        if not approved_scope:
            errors.append("Approved scope required for Closed Won / Engagement")
        if not approved_economics:
            errors.append("Approved economics required for Closed Won / Engagement")

    return errors


def qualification_weak_flag(answers: list[bool]) -> str | None:
    """If fewer than 4 of 6 checklist answers are True, flag for human review."""
    if len(answers) != 6:
        raise ValueError("qualification checklist requires 6 boolean answers")
    if sum(1 for a in answers if a) < 4:
        return "DECLINE_OR_PREMIUM_PRICE_REVIEW"
    return None
