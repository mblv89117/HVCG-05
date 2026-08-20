"""Service Catalog and Offer Catalog — Revenue commercial authority."""

from __future__ import annotations

import json
from typing import Any

from .paths import BUSINESS

COMMERCIAL_CLASSES = (
    "STRUCTURED_OFFER",
    "RECURRING_RETAINER",
    "PREMIUM_SPECIAL_PROJECT",
)

CATALOG_RULE = (
    "No custom consulting without a category. "
    "No category without an offer. "
    "No offer without a price. "
    "No price without a signed scope."
)


def _load(name: str) -> dict[str, Any]:
    return json.loads((BUSINESS / name).read_text(encoding="utf-8"))


def load_service_catalog() -> dict[str, Any]:
    return _load("service-lines.json")


def load_offer_catalog() -> dict[str, Any]:
    return _load("offer-catalog.json")


def load_decision_engine() -> dict[str, Any]:
    return _load("offer-decision-engine.json")


def list_service_lines(*, public_only: bool = False, active_only: bool = True) -> list[dict[str, Any]]:
    lines = list(load_service_catalog()["serviceLines"])
    if active_only:
        lines = [s for s in lines if s.get("active", True)]
    if public_only:
        lines = [s for s in lines if s.get("public", True) and not s.get("restricted")]
    return lines


def get_service_line(code: str) -> dict[str, Any] | None:
    for line in load_service_catalog()["serviceLines"]:
        if line["code"] == code:
            return line
    return None


def list_offers(
    *,
    public_only: bool = False,
    active_only: bool = True,
    service_line: str | None = None,
    include_restricted: bool = False,
) -> list[dict[str, Any]]:
    offers = list(load_offer_catalog()["offers"])
    if active_only:
        offers = [o for o in offers if o.get("active", True)]
    if public_only and not include_restricted:
        offers = [o for o in offers if o.get("public", True) and not o.get("restricted")]
    if service_line:
        offers = [o for o in offers if o.get("serviceLine") == service_line]
    return offers


def get_offer(offer_code: str) -> dict[str, Any] | None:
    for offer in load_offer_catalog()["offers"]:
        if offer["offerCode"] == offer_code:
            return offer
    return None


def sku_for_offer(offer: dict[str, Any]) -> str:
    mapped = offer.get("legacySkuMap") or []
    if mapped:
        return str(mapped[0])
    return str(offer["offerCode"])


def validate_service_catalog() -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    for line in load_service_catalog()["serviceLines"]:
        code = line.get("code")
        if not code:
            errors.append("service line missing code")
            continue
        if code in seen:
            errors.append(f"duplicate service line {code}")
        seen.add(code)
        if not line.get("name"):
            errors.append(f"{code} missing name")
    if len(seen) < 7:
        errors.append("expected seven HVCG service lines")
    return errors


def validate_offer_catalog() -> list[str]:
    errors: list[str] = []
    service_codes = {s["code"] for s in load_service_catalog()["serviceLines"]}
    seen: set[str] = set()
    for offer in load_offer_catalog()["offers"]:
        code = offer.get("offerCode")
        if not code:
            errors.append("offer missing offerCode")
            continue
        if code in seen:
            errors.append(f"duplicate offer {code}")
        seen.add(code)
        if offer.get("category") not in COMMERCIAL_CLASSES:
            errors.append(f"{code} category must be a commercial class")
        if offer.get("serviceLine") not in service_codes:
            errors.append(f"{code} serviceLine is not in the Service Catalog")
        setup = offer.get("setupFeeGuidance") or {}
        retainer = offer.get("monthlyRetainerOption")
        if setup.get("min") is None and not retainer:
            errors.append(f"{code} has no price guidance (violates catalog rule)")
        if not offer.get("pricingVersionId"):
            errors.append(f"{code} missing pricingVersionId")
        if offer.get("active") and not offer.get("name"):
            errors.append(f"{code} active offer missing name")
    if len(seen) < 13:
        errors.append("expected thirteen productized offers")
    return errors


def recommend_offer(need: str) -> dict[str, Any] | None:
    key = (need or "").strip().lower()
    for rule in load_decision_engine()["rules"]:
        if rule["need"].strip().lower() == key:
            return rule
    return None


def catalog_integrity() -> dict[str, Any]:
    service_errors = validate_service_catalog()
    offer_errors = validate_offer_catalog()
    return {
        "rule": CATALOG_RULE,
        "serviceLines": len(list_service_lines(active_only=False)),
        "offers": len(list_offers(active_only=False, include_restricted=True)),
        "errors": service_errors + offer_errors,
        "ok": not (service_errors or offer_errors),
    }
