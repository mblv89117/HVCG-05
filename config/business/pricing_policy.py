"""Business catalog pricing policy helpers (Development foundation).

Owner 2026-08-11: HVCG-PRICE-2026-08-11-v2 is CURRENT for new HVCG clients.
BL-P1 / v1 is preserved as HISTORICAL (not deleted).
Legacy / ACCG contracted prices remain protected.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
BUSINESS = ROOT / "config" / "business"

HISTORICAL_RATE_CARD_V1 = "HVCG-PRICE-2026-07-15-v1"
CURRENT_NEW_CLIENT_RATE_CARD = "HVCG-PRICE-2026-08-11-v2"
# Back-compat aliases
LOCKED_CURRENT_RATE_CARD = HISTORICAL_RATE_CARD_V1  # historical BL-P1 id
PROPOSED_RATE_CARD_V2 = CURRENT_NEW_CLIENT_RATE_CARD
ACCG_LOCKED_MONTHLY = 4539.0

PRICE_STATES = (
    "CONTRACTED_CURRENT",
    "HISTORICAL",
    "CURRENT_RATE_CARD",
    "RECOMMENDED_FUTURE",
    "PROPOSED",
    "APPROVED_FUTURE",
    "EFFECTIVE_NEW",
)

LEGACY_CLASSES = {
    "HVS_LEGACY_CLIENT",
    "HVS LEGACY CLIENT",
    "HVS_TRANSITIONING_CLIENT",
    "HVS TRANSITIONING CLIENT",
}


def load_json(name: str) -> dict[str, Any]:
    path = BUSINESS / name
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def active_selling_rate_card_id(proposed_activated: bool | None = None) -> str:
    """Return the rate card id for new-client selling (V2 current as of 2026-08-11)."""
    # proposed_activated retained for back-compat; ignored after owner activation
    return CURRENT_NEW_CLIENT_RATE_CARD


def historical_rate_card_id() -> str:
    return HISTORICAL_RATE_CARD_V1


def is_legacy_client(classification: str) -> bool:
    return (classification or "").strip() in LEGACY_CLASSES


def can_apply_rate_card_to_client(classification: str, rate_card_status: str) -> bool:
    """New-client CURRENT_RATE_CARD never auto-applies to legacy HVS classes."""
    if is_legacy_client(classification):
        return False
    if rate_card_status == "PROPOSED":
        return False
    return rate_card_status in {"CURRENT_RATE_CARD", "ACTIVE"}


def resolve_display_prices(
    *,
    contracted_current: float | None,
    recommended_future: float | None,
    rate_card_target: float | None,
) -> dict[str, float | None]:
    """Keep contracted distinct from recommended / rate-card guidance."""
    return {
        "CONTRACTED_CURRENT": contracted_current,
        "RECOMMENDED_FUTURE": recommended_future,
        "CURRENT_RATE_CARD": rate_card_target,
    }


def apply_recommended_as_contracted(
    contracted_current: float | None,
    recommended_future: float | None,
    *,
    owner_approved: bool,
    agreement_executed: bool,
) -> float | None:
    """Recommended future never becomes contracted without approvals + agreement."""
    if not owner_approved or not agreement_executed:
        return contracted_current
    if recommended_future is None:
        return contracted_current
    return recommended_future


def pricing_for_client(
    *,
    classification: str,
    contracted_current: float | None,
    recommended_future: float | None,
    new_client_rate_card_target: float | None,
) -> dict[str, Any]:
    """Return display economics with correct state labels for legacy vs new."""
    if is_legacy_client(classification):
        return {
            "appliesNewClientRateCard": False,
            "CONTRACTED_CURRENT": contracted_current,
            "RECOMMENDED_FUTURE": recommended_future,
            "CURRENT_RATE_CARD": None,
            "note": "Legacy/protected — V2 economics are RECOMMENDED_FUTURE only",
        }
    return {
        "appliesNewClientRateCard": True,
        "CONTRACTED_CURRENT": contracted_current,
        "RECOMMENDED_FUTURE": recommended_future,
        "CURRENT_RATE_CARD": new_client_rate_card_target,
        "rateCardVersionId": CURRENT_NEW_CLIENT_RATE_CARD,
    }


def accg_locked_monthly() -> float:
    return ACCG_LOCKED_MONTHLY
