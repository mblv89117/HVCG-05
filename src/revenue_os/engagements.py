"""Engagement model, scope, renewals, success-fee/tail, and referral economics."""

from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timezone
from typing import Any

from .gates import (
    AUTO_PROVISION_ACCESS,
    AUTONOMOUS_REFERRAL_PAYOUT,
    WON_ACTIVATES_CLIENT,
    WON_CREATES_GCC_TENANT,
)
from .store import IdempotentStore

ENGAGEMENT_STATES = (
    "DRAFT",
    "PROPOSED",
    "ACTIVE",
    "RENEWAL_DUE",
    "RENEWED",
    "ON_HOLD",
    "COMPLETED",
    "CANCELLED",
)

SUCCESS_FEE_STATES = ("GUIDANCE", "EARNED", "INVOICED", "COLLECTED")
REFERRAL_STATES = ("ELIGIBLE", "PAYABLE", "PAID")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _today() -> str:
    return date.today().isoformat()


class EngagementService:
    def __init__(self, store: IdempotentStore | None = None) -> None:
        self.store = store or IdempotentStore()

    def create_from_closed_won(
        self,
        *,
        engagement_id: str,
        opportunity_id: str,
        client_code: str,
        sku: str,
        offer_code: str,
        commercial_class: str,
        scope_summary: str,
        setup_fee: float | None,
        retainer: float | None,
        term_months: int | None,
        success_fee_applicable: bool,
        attribution: dict[str, Any] | None = None,
        project_id: str | None = None,
        envelope: dict[str, Any],
    ) -> dict[str, Any]:
        key = f"engagement|{opportunity_id}"
        record = {
            "engagementId": engagement_id,
            "opportunityId": opportunity_id,
            "clientCode": client_code,
            "sku": sku,
            "offerCode": offer_code,
            "commercialClass": commercial_class,
            "status": "ACTIVE",
            "scope": {
                "summary": scope_summary,
                "version": 1,
                "changeOrders": [],
            },
            "economics": {
                "setupFee": setup_fee,
                "retainer": retainer,
                "termMonths": term_months,
                "successFee": {
                    "applicable": success_fee_applicable,
                    "state": "GUIDANCE" if success_fee_applicable else None,
                    "earnedAmount": 0.0,
                    "collectedAmount": 0.0,
                    "tailMonthsRemaining": 12 if success_fee_applicable else 0,
                },
                "referral": None,
            },
            "renewal": {
                "due": False,
                "noticeRequiredDays": 30,
                "history": [],
            },
            "startsOn": _today(),
            "projectId": project_id,
            "autoProvisionAccess": AUTO_PROVISION_ACCESS,
            "wonActivatesClient": WON_ACTIVATES_CLIENT,
            "wonCreatesGccTenant": WON_CREATES_GCC_TENANT,
            "createdAt": _now(),
            "attribution": deepcopy(attribution) if attribution else None,
            "envelope": envelope,
        }
        result = self.store.put(key, record, collision="return-existing")
        return {
            "errors": [],
            "engagement": result["item"],
            "created": result["created"],
            "replayed": result["replayed"],
            "idempotencyKey": key,
        }

    def get_for_opportunity(self, opportunity_id: str) -> dict[str, Any] | None:
        return self.store.get(f"engagement|{opportunity_id}")

    def update_scope(
        self,
        opportunity_id: str,
        *,
        summary: str,
        actor: str,
        change_order_id: str | None = None,
    ) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement:
            return {"errors": ["engagement not found"], "engagement": None}
        updated = deepcopy(engagement)
        updated["scope"]["summary"] = summary
        updated["scope"]["version"] = int(updated["scope"].get("version") or 1) + 1
        if change_order_id:
            updated["scope"]["changeOrders"].append(
                {"changeOrderId": change_order_id, "actor": actor, "at": _now(), "summary": summary}
            )
        self.store.put(f"engagement|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "engagement": self.get_for_opportunity(opportunity_id)}

    def mark_renewal_due(self, opportunity_id: str) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement:
            return {"errors": ["engagement not found"], "engagement": None}
        updated = deepcopy(engagement)
        updated["status"] = "RENEWAL_DUE"
        updated["renewal"]["due"] = True
        self.store.put(f"engagement|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "engagement": self.get_for_opportunity(opportunity_id)}

    def renew(self, opportunity_id: str, *, actor: str, term_months: int) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement:
            return {"errors": ["engagement not found"], "engagement": None}
        if engagement["status"] not in {"ACTIVE", "RENEWAL_DUE"}:
            return {"errors": [f"cannot renew from {engagement['status']}"], "engagement": engagement}
        updated = deepcopy(engagement)
        updated["status"] = "RENEWED"
        updated["economics"]["termMonths"] = term_months
        updated["renewal"]["due"] = False
        updated["renewal"]["history"].append({"actor": actor, "at": _now(), "termMonths": term_months})
        self.store.put(f"engagement|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "engagement": self.get_for_opportunity(opportunity_id)}

    def accrue_success_fee(self, opportunity_id: str, *, amount: float, event: str) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement:
            return {"errors": ["engagement not found"], "engagement": None}
        fee = engagement["economics"]["successFee"]
        if not fee.get("applicable"):
            return {"errors": ["success fee not applicable"], "engagement": engagement}
        updated = deepcopy(engagement)
        updated["economics"]["successFee"]["state"] = "EARNED"
        updated["economics"]["successFee"]["earnedAmount"] = float(amount)
        updated["economics"]["successFee"]["triggerEvent"] = event
        self.store.put(f"engagement|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "engagement": self.get_for_opportunity(opportunity_id)}

    def collect_success_fee(self, opportunity_id: str, *, amount: float) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement:
            return {"errors": ["engagement not found"], "engagement": None}
        fee = engagement["economics"]["successFee"]
        if fee.get("state") != "EARNED":
            return {"errors": ["SUCCESS_FEE_EARNED required before COLLECTED"], "engagement": engagement}
        updated = deepcopy(engagement)
        updated["economics"]["successFee"]["state"] = "COLLECTED"
        updated["economics"]["successFee"]["collectedAmount"] = float(amount)
        self.store.put(f"engagement|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "engagement": self.get_for_opportunity(opportunity_id)}

    def tick_tail(self, opportunity_id: str) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement:
            return {"errors": ["engagement not found"], "engagement": None}
        updated = deepcopy(engagement)
        remaining = int(updated["economics"]["successFee"].get("tailMonthsRemaining") or 0)
        updated["economics"]["successFee"]["tailMonthsRemaining"] = max(0, remaining - 1)
        self.store.put(f"engagement|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "engagement": self.get_for_opportunity(opportunity_id)}

    def record_referral(
        self,
        opportunity_id: str,
        *,
        partner_id: str,
        collected_revenue: float | None,
    ) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement:
            return {"errors": ["engagement not found"], "engagement": None}
        state = "ELIGIBLE"
        if collected_revenue and collected_revenue > 0:
            state = "ELIGIBLE"
        updated = deepcopy(engagement)
        updated["economics"]["referral"] = {
            "partnerId": partner_id,
            "state": state,
            "collectedRevenue": collected_revenue,
            "payoutBasis": "COLLECTED_CLEARED_REVENUE_ONLY",
            "payoutAllowed": False,
            "autonomousPayoutForbidden": True,
            "autonomousReferralPayout": AUTONOMOUS_REFERRAL_PAYOUT,
        }
        self.store.put(f"engagement|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "engagement": self.get_for_opportunity(opportunity_id)}

    def mark_referral_payable(self, opportunity_id: str, *, approver: str) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement or not engagement["economics"].get("referral"):
            return {"errors": ["referral not recorded"], "engagement": engagement}
        if not approver:
            return {"errors": ["human approval required"], "engagement": engagement}
        collected = engagement["economics"]["referral"].get("collectedRevenue") or 0
        if collected <= 0:
            return {"errors": ["REFERRAL_PAYABLE requires collected cleared revenue"], "engagement": engagement}
        updated = deepcopy(engagement)
        updated["economics"]["referral"]["state"] = "PAYABLE"
        updated["economics"]["referral"]["approvedBy"] = approver
        updated["economics"]["referral"]["payoutAllowed"] = False
        self.store.put(f"engagement|{opportunity_id}", updated, collision="update-existing")
        return {"errors": [], "engagement": self.get_for_opportunity(opportunity_id)}

    def to_created_event(self, opportunity_id: str) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement:
            raise ValueError("engagement not found")
        event: dict[str, Any] = {
            "contractVersion": "engagement-created.v1",
            "engagementId": engagement["engagementId"],
            "clientCode": engagement["clientCode"],
            "opportunityId": engagement["opportunityId"],
            "sku": engagement.get("sku"),
            "startsOn": engagement.get("startsOn"),
            "envelope": engagement["envelope"],
        }
        if engagement.get("projectId"):
            event["projectId"] = engagement["projectId"]
        if engagement.get("attribution"):
            event["attribution"] = engagement["attribution"]
        return event

    def to_revenue_outcome(
        self,
        *,
        outcome_id: str,
        opportunity_id: str,
        amount: float,
        outcome_type: str = "closed_won",
        closed_at: str | None = None,
        currency: str = "USD",
    ) -> dict[str, Any]:
        engagement = self.get_for_opportunity(opportunity_id)
        if not engagement:
            raise ValueError("engagement not found")
        return {
            "contractVersion": "revenue-outcome.v1",
            "outcomeId": outcome_id,
            "clientCode": engagement["clientCode"],
            "opportunityId": opportunity_id,
            "engagementId": engagement["engagementId"],
            "amount": amount,
            "currency": currency,
            "outcomeType": outcome_type,
            "closedAt": closed_at or _now(),
            "attribution": engagement.get("attribution") or None,
        }
