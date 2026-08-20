"""Proposal Engine. Drafts are internal; auto-send is forbidden (BL-C1)."""

from __future__ import annotations

import sys
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from .catalogs import get_offer
from .gates import AUTO_SEND_PROPOSAL, LIVE_DISPATCH
from .paths import BUSINESS, PROPOSAL_TEMPLATES
from .store import IdempotentStore

if str(BUSINESS) not in sys.path:
    sys.path.insert(0, str(BUSINESS))

from pricing_policy import load_json  # noqa: E402

INTERNAL_STATUSES = [
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

CONTRACT_STATUS = {
    "DRAFT": "draft",
    "INTERNAL_REVIEW": "internal_review",
    "OWNER_APPROVAL_REQUIRED": "internal_review",
    "APPROVED_TO_SEND": "ready",
    "SENT": "sent",
    "CLIENT_REVIEW": "sent",
    "ACCEPTED": "accepted",
    "DECLINED": "declined",
    "EXPIRED": "expired",
    "SUPERSEDED": "expired",
}

ALLOWED_TRANSITIONS = {
    "DRAFT": {"INTERNAL_REVIEW", "OWNER_APPROVAL_REQUIRED", "SUPERSEDED"},
    "INTERNAL_REVIEW": {"OWNER_APPROVAL_REQUIRED", "APPROVED_TO_SEND", "DRAFT", "SUPERSEDED"},
    "OWNER_APPROVAL_REQUIRED": {"APPROVED_TO_SEND", "INTERNAL_REVIEW", "SUPERSEDED"},
    "APPROVED_TO_SEND": {"SUPERSEDED"},
    "SENT": {"CLIENT_REVIEW", "ACCEPTED", "DECLINED", "EXPIRED"},
    "CLIENT_REVIEW": {"ACCEPTED", "DECLINED", "EXPIRED"},
    "ACCEPTED": set(),
    "DECLINED": set(),
    "EXPIRED": set(),
    "SUPERSEDED": set(),
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _archetype(commercial_class: str) -> str:
    if commercial_class in {"RECURRING_RETAINER", "PREMIUM_SPECIAL_PROJECT"}:
        return commercial_class
    return "STRUCTURED_OFFER"


def _render(commercial_class: str, replacements: dict[str, str]) -> str:
    templates = {
        "STRUCTURED_OFFER": PROPOSAL_TEMPLATES / "STRUCTURED_OFFER.md",
        "RECURRING_RETAINER": PROPOSAL_TEMPLATES / "MONTHLY_RETAINER.md",
        "PREMIUM_SPECIAL_PROJECT": PROPOSAL_TEMPLATES / "PREMIUM_SPECIAL_PROJECT.md",
    }
    body = templates[_archetype(commercial_class)].read_text(encoding="utf-8")
    for key, value in replacements.items():
        body = body.replace(key, value)
    return body


class ProposalEngine:
    def __init__(self, store: IdempotentStore | None = None) -> None:
        self.store = store or IdempotentStore()

    def draft(
        self,
        *,
        proposal_id: str,
        opportunity_id: str,
        client_code: str,
        client_name: str,
        commercial_class: str,
        offer_code: str,
        pricing_recommendation: dict[str, Any],
        proposed_setup: float | None = None,
        proposed_retainer: float | None = None,
        situation: str = "",
        objective: str = "",
    ) -> dict[str, Any]:
        offer = get_offer(offer_code)
        if not offer:
            return {"errors": [f"Unknown offer {offer_code}"], "proposal": None}
        compliance = load_json("compliance-language.json")
        setup = proposed_setup if proposed_setup is not None else pricing_recommendation.get("recommendedSetupFee")
        retainer = proposed_retainer if proposed_retainer is not None else pricing_recommendation.get("recommendedRetainer")
        replacements = {
            "{{client_situation}}": situation or f"{client_name} — {offer.get('painPoint', '')}",
            "{{objective}}": objective or offer.get("salesAngle", ""),
            "{{scope}}": offer.get("description", ""),
            "{{deliverables}}": "\n".join(f"- {d}" for d in (offer.get("deliverables") or [])),
            "{{client_responsibilities}}": "\n".join(f"- {i}" for i in (offer.get("requiredInputs") or [])),
            "{{timeline}}": "To be confirmed with advisor",
            "{{fee_summary}}": f"Setup: {setup}; Retainer: {retainer}",
            "{{pricing_version_id}}": str(pricing_recommendation.get("pricingVersion") or ""),
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
            "{{setup_fee}}": str(setup),
            "{{monthly_retainer}}": str(retainer),
            "{{minimum_term}}": str(offer.get("minimumTermMonths") or "N/A"),
            "{{renewal_termination}}": "Per agreement",
            "{{special_projects_policy}}": str(compliance.get("outOfScopeRetainer") or ""),
            "{{special_situation}}": situation,
            "{{immediate_risks}}": "",
            "{{strategic_objective}}": objective or offer.get("salesAngle", ""),
            "{{work_phases}}": "Phase plan to be confirmed",
            "{{documentation_needed}}": "\n".join(f"- {i}" for i in (offer.get("requiredInputs") or [])),
            "{{professional_coordination}}": "As required with licensed professionals",
            "{{project_fee}}": str(setup),
            "{{hourly_or_replenishing}}": str(pricing_recommendation.get("recommendedPremiumHourly") or ""),
            "{{success_fee}}": str(pricing_recommendation.get("recommendedSuccessFee") or ""),
            "{{urgency_premium}}": "",
            "{{limitations}}": compliance["language"]["generalAdvisory"],
            "{{approval_points}}": "Human approval required before external use",
        }
        proposal = {
            "proposalId": proposal_id,
            "opportunityId": opportunity_id,
            "clientCode": client_code,
            "clientName": client_name,
            "commercialClass": commercial_class,
            "offerCode": offer_code,
            "offerSku": offer_code,
            "archetype": _archetype(commercial_class),
            "status": "DRAFT",
            "version": 1,
            "proposedSetup": setup,
            "proposedRetainer": retainer,
            "pricingVersionId": pricing_recommendation.get("pricingVersion"),
            "body": _render(commercial_class, replacements),
            "autoSend": AUTO_SEND_PROPOSAL,
            "liveDispatch": LIVE_DISPATCH,
            "isApprovedPrice": False,
            "createdAt": _now(),
        }
        result = self.store.put(f"proposal|{proposal_id}", proposal, collision="return-existing")
        return {"errors": [], "proposal": result["item"], "created": result["created"], "replayed": result["replayed"]}

    def transition(self, proposal_id: str, new_status: str, *, actor: str) -> dict[str, Any]:
        proposal = self.store.get(f"proposal|{proposal_id}")
        if not proposal:
            return {"errors": ["unknown proposal"], "proposal": None}
        if new_status not in INTERNAL_STATUSES:
            return {"errors": [f"invalid status {new_status}"], "proposal": proposal}
        current = proposal["status"]
        if new_status not in ALLOWED_TRANSITIONS.get(current, set()):
            return {"errors": [f"illegal transition {current} → {new_status}"], "proposal": proposal}
        if new_status in {"SENT", "CLIENT_REVIEW"}:
            return {
                "errors": ["BL-C1: proposal cannot auto-send; liveDispatch remains false"],
                "proposal": proposal,
                "liveDispatch": LIVE_DISPATCH,
            }
        updated = deepcopy(proposal)
        if new_status == "SUPERSEDED":
            updated["version"] = int(updated.get("version") or 1) + 1
        updated["status"] = new_status
        updated["lastTransition"] = {"to": new_status, "actor": actor, "at": _now()}
        self.store.put(f"proposal|{proposal_id}", updated, collision="update-existing")
        return {"errors": [], "proposal": self.store.get(f"proposal|{proposal_id}")}

    def accept_internally(self, proposal_id: str, *, actor: str) -> dict[str, Any]:
        """Operator records client acceptance without live send (synthetic / wet-ink path)."""
        proposal = self.store.get(f"proposal|{proposal_id}")
        if not proposal:
            return {"errors": ["unknown proposal"], "proposal": None}
        if proposal["status"] not in {"APPROVED_TO_SEND", "INTERNAL_REVIEW", "OWNER_APPROVAL_REQUIRED"}:
            return {"errors": ["proposal not ready for acceptance"], "proposal": proposal}
        updated = deepcopy(proposal)
        updated["status"] = "ACCEPTED"
        updated["acceptedWithoutLiveSend"] = True
        updated["liveDispatch"] = False
        updated["lastTransition"] = {"to": "ACCEPTED", "actor": actor, "at": _now()}
        self.store.put(f"proposal|{proposal_id}", updated, collision="update-existing")
        return {"errors": [], "proposal": self.store.get(f"proposal|{proposal_id}")}

    def to_context(self, proposal_id: str) -> dict[str, Any]:
        proposal = self.store.get(f"proposal|{proposal_id}")
        if not proposal:
            raise ValueError("unknown proposal")
        return {
            "contractVersion": "proposal-context.v1",
            "proposalId": proposal["proposalId"],
            "opportunityId": proposal["opportunityId"],
            "clientCode": proposal["clientCode"],
            "offerSku": proposal.get("offerSku") or proposal.get("offerCode"),
            "status": CONTRACT_STATUS.get(proposal["status"], "draft"),
            "autoSend": False,
        }
