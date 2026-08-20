"""Opportunity Commercial Workspace — Atlas owns state; recommendations are advisory."""

from __future__ import annotations

import sys
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from .catalogs import COMMERCIAL_CLASSES, get_offer, get_service_line, recommend_offer, sku_for_offer
from .gates import COPILOT_HAS_COMMERCIAL_AUTHORITY, WON_ACTIVATES_CLIENT
from .paths import BUSINESS
from .store import IdempotentStore

if str(BUSINESS) not in sys.path:
    sys.path.insert(0, str(BUSINESS))

from commercial_rules import validate_opportunity_commercial  # noqa: E402

STAGE_MAP = {
    "LEAD": "Discovery",
    "FREE_FIT": "Discovery",
    "QUALIFIED_OPPORTUNITY": "Assessment",
    "PAID_DIAGNOSTIC": "Assessment",
    "PROPOSAL_DRAFT": "Proposal",
    "PROPOSAL_APPROVAL": "Proposal",
    "NEGOTIATION": "Negotiation",
    "CLOSED_WON": "Won",
    "ENGAGEMENT": "Won",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class CommercialWorkspace:
    """In-memory commercial configuration for one opportunity."""

    def __init__(self, store: IdempotentStore | None = None) -> None:
        self.store = store or IdempotentStore()

    def configure(
        self,
        *,
        opportunity_id: str,
        client_code: str,
        stage: str,
        owner_principal: str,
        lead_id: str | None = None,
        estimated_value: float | None = None,
        currency: str = "USD",
        attribution: dict[str, Any] | None = None,
        etag: str = "1",
    ) -> dict[str, Any]:
        key = f"opp-commercial|{opportunity_id}"
        record = {
            "opportunityId": opportunity_id,
            "clientCode": client_code,
            "leadId": lead_id,
            "stage": stage,
            "ownerPrincipal": owner_principal,
            "estimatedValue": estimated_value,
            "currency": currency,
            "commercialClass": None,
            "serviceLineCode": None,
            "offerCode": None,
            "pricingBasis": None,
            "acceptedOfferRecommendationId": None,
            "acceptedPricingRecommendationId": None,
            "approvedScope": False,
            "approvedEconomics": False,
            "attribution": deepcopy(attribution) if attribution else None,
            "etag": etag,
            "updatedAt": _now(),
        }
        result = self.store.put(key, record, collision="return-existing")
        return result

    def get(self, opportunity_id: str) -> dict[str, Any] | None:
        return self.store.get(f"opp-commercial|{opportunity_id}")

    def recommend_offer_observation(
        self,
        *,
        recommendation_id: str,
        opportunity_id: str,
        need: str,
        source_system: str = "atlas",
        confidence: float = 0.8,
    ) -> dict[str, Any]:
        workspace = self.get(opportunity_id)
        if not workspace:
            return {"errors": ["commercial workspace not configured"], "contract": None}
        rule = recommend_offer(need)
        if not rule:
            return {"errors": ["no deterministic offer mapping — human must classify"], "contract": None}
        offer = get_offer(rule["offerCode"])
        if not offer:
            return {"errors": [f"mapped offer {rule['offerCode']} missing from catalog"], "contract": None}
        contract = {
            "contractVersion": "offer-recommendation.v1",
            "recommendationId": recommendation_id,
            "opportunityId": opportunity_id,
            "clientCode": workspace["clientCode"],
            "sku": sku_for_offer(offer),
            "packageName": offer.get("name"),
            "rationale": f"{rule['need']} → {offer['offerCode']}",
            "confidence": confidence,
            "sourceSystem": source_system,
            "observationOnly": True,
            "createsCommitment": False,
        }
        self.store.put(f"offer-rec|{recommendation_id}", contract, collision="return-existing")
        return {"errors": [], "contract": contract, "rule": rule, "offer": offer}

    def accept_offer(
        self,
        *,
        opportunity_id: str,
        recommendation_id: str,
        operator: str,
        commercial_class: str | None = None,
    ) -> dict[str, Any]:
        if not operator:
            return {"errors": ["operator required — Copilot cannot accept"], "workspace": self.get(opportunity_id)}
        rec = self.store.get(f"offer-rec|{recommendation_id}")
        if not rec:
            return {"errors": ["unknown offer recommendation"], "workspace": self.get(opportunity_id)}
        workspace = self.get(opportunity_id)
        if not workspace:
            return {"errors": ["commercial workspace not configured"], "workspace": None}
        from .catalogs import list_offers

        offer = None
        for item in list_offers(active_only=False, include_restricted=True):
            if sku_for_offer(item) == rec.get("sku") or item.get("name") == rec.get("packageName"):
                offer = item
                break
        if not offer:
            return {"errors": ["offer sku not in catalog"], "workspace": workspace}
        cls = commercial_class or offer.get("category")
        if cls not in COMMERCIAL_CLASSES:
            return {"errors": [f"invalid commercial class {cls}"], "workspace": workspace}
        updated = deepcopy(workspace)
        updated["offerCode"] = offer["offerCode"]
        updated["serviceLineCode"] = offer.get("serviceLine")
        updated["commercialClass"] = cls
        updated["acceptedOfferRecommendationId"] = recommendation_id
        updated["acceptedBy"] = operator
        updated["updatedAt"] = _now()
        updated["etag"] = str(int(updated.get("etag") or "1") + 1)
        self.store.put(f"opp-commercial|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "workspace": self.get(opportunity_id), "observationPromoted": True}

    def accept_pricing(
        self,
        *,
        opportunity_id: str,
        recommendation_id: str,
        operator: str,
        pricing_basis: str = "SETUP",
    ) -> dict[str, Any]:
        if not operator:
            return {"errors": ["operator required"], "workspace": self.get(opportunity_id)}
        rec = self.store.get(f"price-rec|{recommendation_id}")
        if not rec:
            return {"errors": ["unknown pricing recommendation"], "workspace": self.get(opportunity_id)}
        workspace = self.get(opportunity_id)
        if not workspace:
            return {"errors": ["commercial workspace not configured"], "workspace": None}
        updated = deepcopy(workspace)
        updated["pricingBasis"] = pricing_basis
        updated["acceptedPricingRecommendationId"] = recommendation_id
        updated["pricingAcceptedBy"] = operator
        updated["approvedEconomics"] = False
        updated["updatedAt"] = _now()
        self.store.put(f"opp-commercial|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "workspace": self.get(opportunity_id)}

    def store_pricing_recommendation(self, contract: dict[str, Any]) -> dict[str, Any]:
        return self.store.put(f"price-rec|{contract['recommendationId']}", contract, collision="return-existing")

    def approve_scope_and_economics(self, *, opportunity_id: str, operator: str) -> dict[str, Any]:
        workspace = self.get(opportunity_id)
        if not workspace:
            return {"errors": ["commercial workspace not configured"], "workspace": None}
        if not workspace.get("offerCode") or not workspace.get("pricingBasis"):
            return {"errors": ["offer and pricing must be operator-accepted first"], "workspace": workspace}
        updated = deepcopy(workspace)
        updated["approvedScope"] = True
        updated["approvedEconomics"] = True
        updated["scopeApprovedBy"] = operator
        updated["updatedAt"] = _now()
        self.store.put(f"opp-commercial|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "workspace": self.get(opportunity_id)}

    def validate(self, opportunity_id: str) -> dict[str, Any]:
        workspace = self.get(opportunity_id)
        if not workspace:
            return {"ok": False, "errors": ["commercial workspace not configured"]}
        stage = STAGE_MAP.get(workspace["stage"], workspace["stage"])
        errors = validate_opportunity_commercial(
            stage=stage,
            commercial_class=workspace.get("commercialClass"),
            service_line_code=workspace.get("serviceLineCode"),
            offer_code=workspace.get("offerCode"),
            pricing_basis=workspace.get("pricingBasis"),
            approved_scope=bool(workspace.get("approvedScope")),
            approved_economics=bool(workspace.get("approvedEconomics")),
        )
        if workspace.get("serviceLineCode") and not get_service_line(workspace["serviceLineCode"]):
            errors.append(f"unknown service line {workspace['serviceLineCode']}")
        return {
            "ok": not errors,
            "errors": errors,
            "stage": workspace["stage"],
            "opportunityStage": stage,
            "wonActivatesClient": WON_ACTIVATES_CLIENT,
            "copilotAuthority": COPILOT_HAS_COMMERCIAL_AUTHORITY,
        }

    def to_context(self, opportunity_id: str) -> dict[str, Any]:
        workspace = self.get(opportunity_id)
        if not workspace:
            raise ValueError("commercial workspace not configured")
        context: dict[str, Any] = {
            "contractVersion": "opportunity-commercial-context.v1",
            "opportunityId": workspace["opportunityId"],
            "clientCode": workspace["clientCode"],
            "stage": workspace["stage"],
        }
        if workspace.get("leadId"):
            context["leadId"] = workspace["leadId"]
        if workspace.get("ownerPrincipal"):
            context["ownerPrincipal"] = workspace["ownerPrincipal"]
        if workspace.get("estimatedValue") is not None:
            context["estimatedValue"] = workspace["estimatedValue"]
        if workspace.get("currency"):
            context["currency"] = workspace["currency"]
        if workspace.get("attribution"):
            context["attribution"] = workspace["attribution"]
        if workspace.get("etag"):
            context["etag"] = str(workspace["etag"])
        return context
