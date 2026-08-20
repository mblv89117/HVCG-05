"""MSA / SOW / commercial document workflow. No live send, no e-sign."""

from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from .gates import AUTO_SEND_DOCUMENT, LIVE_DISPATCH
from .store import IdempotentStore

DOCUMENT_TYPES = ("MSA", "SOW", "CHANGE_ORDER", "RENEWAL_ADDENDUM", "SUCCESS_FEE_RIDER")

STATES = (
    "DRAFT",
    "INTERNAL_REVIEW",
    "APPROVED_TO_SEND",
    "SENT",
    "NEGOTIATION",
    "SIGNED",
    "ACTIVATED",
    "DECLINED",
    "EXPIRED",
    "SUPERSEDED",
)

ALLOWED = {
    "DRAFT": {"INTERNAL_REVIEW", "SUPERSEDED"},
    "INTERNAL_REVIEW": {"APPROVED_TO_SEND", "DRAFT", "SUPERSEDED"},
    "APPROVED_TO_SEND": {"SUPERSEDED"},
    "SENT": {"NEGOTIATION", "SIGNED", "DECLINED", "EXPIRED"},
    "NEGOTIATION": {"SIGNED", "DECLINED", "EXPIRED", "SUPERSEDED"},
    "SIGNED": {"ACTIVATED"},
    "ACTIVATED": set(),
    "DECLINED": set(),
    "EXPIRED": set(),
    "SUPERSEDED": set(),
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class DocumentWorkflow:
    def __init__(self, store: IdempotentStore | None = None) -> None:
        self.store = store or IdempotentStore()

    def create(
        self,
        *,
        document_id: str,
        document_type: str,
        opportunity_id: str,
        client_code: str,
        proposal_id: str | None,
        title: str,
        contracting_entity: str = "High Value Capital Group",
        term_months: int | None = None,
        scope_summary: str = "",
        economics: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if document_type not in DOCUMENT_TYPES:
            return {"errors": [f"unknown document type {document_type}"], "document": None}
        key = f"doc|{document_type}|{opportunity_id}|{document_id}"
        record = {
            "contractVersion": "commercial-document.v1",
            "documentId": document_id,
            "documentType": document_type,
            "opportunityId": opportunity_id,
            "clientCode": client_code,
            "proposalId": proposal_id,
            "title": title,
            "contractingEntity": contracting_entity,
            "status": "DRAFT",
            "version": 1,
            "termMonths": term_months,
            "scopeSummary": scope_summary,
            "economics": economics or {},
            "autoSend": AUTO_SEND_DOCUMENT,
            "liveDispatch": LIVE_DISPATCH,
            "esignEnabled": False,
            "createsCommitment": False,
            "createdAt": _now(),
        }
        result = self.store.put(key, record, collision="return-existing")
        return {
            "errors": [],
            "document": result["item"],
            "created": result["created"],
            "replayed": result["replayed"],
            "idempotencyKey": key,
        }

    def _key(self, document: dict[str, Any]) -> str:
        return f"doc|{document['documentType']}|{document['opportunityId']}|{document['documentId']}"

    def get(self, document_type: str, opportunity_id: str, document_id: str) -> dict[str, Any] | None:
        return self.store.get(f"doc|{document_type}|{opportunity_id}|{document_id}")

    def transition(self, document: dict[str, Any], new_status: str, *, actor: str) -> dict[str, Any]:
        if new_status not in STATES:
            return {"errors": [f"invalid status {new_status}"], "document": document}
        current = document["status"]
        if new_status not in ALLOWED.get(current, set()):
            return {"errors": [f"illegal transition {current} → {new_status}"], "document": document}
        if new_status == "SENT":
            return {
                "errors": ["BL-C1: commercial documents cannot auto-send; liveDispatch remains false"],
                "document": document,
                "liveDispatch": LIVE_DISPATCH,
            }
        updated = deepcopy(document)
        updated["status"] = new_status
        updated["lastTransition"] = {"to": new_status, "actor": actor, "at": _now()}
        if new_status == "SUPERSEDED":
            updated["version"] = int(updated.get("version") or 1) + 1
            updated["terminal"] = True
        self.store.put(self._key(updated), updated, collision="update-existing")
        return {"errors": [], "document": self.store.get(self._key(updated))}

    def execute_wet_ink(
        self,
        document: dict[str, Any],
        *,
        actor: str,
        signature_evidence: str,
    ) -> dict[str, Any]:
        """Record a governed wet-ink / offline signature. Does not call e-sign or send."""
        if document["status"] not in {"APPROVED_TO_SEND", "INTERNAL_REVIEW", "DRAFT"}:
            return {"errors": ["document not ready for wet-ink execution"], "document": document}
        if not signature_evidence:
            return {"errors": ["signature evidence required"], "document": document}
        updated = deepcopy(document)
        updated["status"] = "SIGNED"
        updated["signatureEvidence"] = signature_evidence
        updated["createsCommitment"] = True
        updated["liveDispatch"] = False
        updated["lastTransition"] = {"to": "SIGNED", "actor": actor, "at": _now()}
        self.store.put(self._key(updated), updated, collision="update-existing")
        return {"errors": [], "document": self.store.get(self._key(updated))}

    def activate(self, document: dict[str, Any], *, actor: str) -> dict[str, Any]:
        if document.get("status") != "SIGNED":
            return {"errors": ["only signed documents can activate"], "document": document}
        return self.transition(document, "ACTIVATED", actor=actor)

    def to_contract(self, document: dict[str, Any]) -> dict[str, Any]:
        return {
            "contractVersion": "commercial-document.v1",
            "documentId": document["documentId"],
            "documentType": document["documentType"],
            "opportunityId": document["opportunityId"],
            "clientCode": document["clientCode"],
            "proposalId": document.get("proposalId"),
            "title": document["title"],
            "status": document["status"],
            "version": document.get("version", 1),
            "autoSend": False,
            "liveDispatch": False,
            "esignEnabled": False,
        }
