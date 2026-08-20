"""Pricing rules. Recommendations are observation-only until operator accept."""

from __future__ import annotations

import sys
from typing import Any

from .catalogs import get_offer, sku_for_offer
from .gates import LEGACY_AUTO_REPRICE
from .paths import BUSINESS

if str(BUSINESS) not in sys.path:
    sys.path.insert(0, str(BUSINESS))

from pricing_policy import (  # noqa: E402
    ACCG_LOCKED_MONTHLY,
    CURRENT_NEW_CLIENT_RATE_CARD,
    HISTORICAL_RATE_CARD_V1,
    is_legacy_client,
    load_json,
    pricing_for_client,
)


def load_rate_card() -> dict[str, Any]:
    return load_json("pricing-rate-card-v2.json")


def _band(offer: dict[str, Any]) -> dict[str, float | None]:
    setup = offer.get("setupFeeGuidance") or {}
    retainer = offer.get("monthlyRetainerOption") or {}
    list_price = setup.get("typical") or setup.get("max") or setup.get("min")
    floor = setup.get("min")
    recommended = setup.get("typical") or setup.get("min")
    return {
        "listPrice": float(list_price) if list_price is not None else None,
        "floorPrice": float(floor) if floor is not None else None,
        "recommendedSetup": float(recommended) if recommended is not None else None,
        "recommendedRetainer": float(retainer["min"]) if retainer.get("min") is not None else None,
    }


def apply_complexity(band: dict[str, float | None], offer: dict[str, Any], *, complexity: str | None, urgency: str | None) -> dict[str, float | None]:
    setup = offer.get("setupFeeGuidance") or {}
    retainer = offer.get("monthlyRetainerOption") or {}
    out = dict(band)
    if complexity == "premium" or urgency == "urgent":
        if setup.get("max") is not None:
            out["recommendedSetup"] = float(setup["max"])
        if retainer.get("max") is not None:
            out["recommendedRetainer"] = float(retainer["max"])
    return out


def recommend_pricing(
    *,
    recommendation_id: str,
    opportunity_id: str,
    offer_code: str,
    commercial_class: str,
    client_classification: str,
    contracted_current: float | None = None,
    complexity: str | None = None,
    urgency: str | None = None,
    currency: str = "USD",
) -> dict[str, Any]:
    offer = get_offer(offer_code)
    if not offer:
        return {"errors": [f"Unknown offer {offer_code}"], "recommendation": None, "contract": None}

    band = apply_complexity(_band(offer), offer, complexity=complexity, urgency=urgency)
    legacy = is_legacy_client(client_classification)
    if legacy and LEGACY_AUTO_REPRICE:
        raise RuntimeError("legacy auto-reprice gate must stay false")

    display = pricing_for_client(
        classification=client_classification,
        contracted_current=contracted_current,
        recommended_future=band["recommendedRetainer"] if legacy else None,
        new_client_rate_card_target=band["recommendedRetainer"],
    )

    success = None
    if offer.get("successFeeApplicable") and not legacy:
        card = load_rate_card()
        success = {
            "type": "SUCCESS_FEE",
            "guidancePercent": card.get("successFeeGuidancePercent", {}).get("debtFinancing"),
            "earnedNeCollected": True,
            "createsCommitment": False,
        }

    internal = {
        "offerCode": offer_code,
        "sku": sku_for_offer(offer),
        "commercialClass": commercial_class,
        "recommendedSetupFee": None if legacy else band["recommendedSetup"],
        "recommendedRetainer": None if legacy else band["recommendedRetainer"],
        "recommendedSuccessFee": success,
        "floorPrice": band["floorPrice"],
        "listPrice": None if legacy else band["listPrice"],
        "pricingVersion": CURRENT_NEW_CLIENT_RATE_CARD if not legacy else HISTORICAL_RATE_CARD_V1,
        "pricingStateForNewEconomics": "CURRENT_RATE_CARD" if not legacy else "RECOMMENDED_FUTURE",
        "isApprovedPrice": False,
        "observationOnly": True,
        "createsCommitment": False,
        "legacyProtection": display,
        "accgLockApplies": client_classification in {"HVS_LEGACY_CLIENT", "HVS LEGACY CLIENT"}
        and contracted_current == ACCG_LOCKED_MONTHLY,
        "approvalRequired": True,
    }

    contract = {
        "contractVersion": "pricing-recommendation.v1",
        "recommendationId": recommendation_id,
        "opportunityId": opportunity_id,
        "currency": currency,
        "listPrice": internal["listPrice"] if internal["listPrice"] is not None else 0,
        "recommendedPrice": internal["recommendedSetupFee"] if internal["recommendedSetupFee"] is not None else 0,
        "floorPrice": internal["floorPrice"] if internal["floorPrice"] is not None else 0,
        "observationOnly": True,
        "createsCommitment": False,
    }
    return {"errors": [], "recommendation": internal, "contract": contract}


def referral_economics_guidance() -> dict[str, Any]:
    card = load_rate_card()
    guidance = card.get("referralCompensationGuidance") or {}
    return {
        "payoutBasis": guidance.get("payoutBasis", "COLLECTED_CLEARED_REVENUE_ONLY"),
        "requiresHumanApproval": True,
        "autonomousPayoutForbidden": True,
        "eligibleNePayableNePaid": True,
        "guidance": guidance,
    }
