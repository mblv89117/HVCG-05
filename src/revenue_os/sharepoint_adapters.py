"""Candidate-only Dev SharePoint adapters for HVCG_Proposals / HVCG_Engagements.

Consumes Integration SoT proposal-context.v1 and engagement-created.v1 without
redefining contract meaning. Maps onto frozen list columns only — no schema
thaw, no live Graph, no ACCG01 writes, no Hub/Elite production persistence.
"""

from __future__ import annotations

import json
from copy import deepcopy
from typing import Any

from .gates import LIVE_DISPATCH, LIVE_GRAPH_WRITES, PRODUCTION_WRITES
from .paths import REPO_ROOT
from .schemas import validate
from .store import IdempotentStore

LIST_PROPOSALS = "HVCG_Proposals"
LIST_ENGAGEMENTS = "HVCG_Engagements"
SHAREPOINT_SCHEMA_DIR = REPO_ROOT / "src" / "sharepoint" / "lists"

# Same isolation allowlist as Elite fail-closed — not a price remap.
LOADED_COMMERCIAL_CONTEXTS: dict[str, str] = {
    "opp-revos-001": "ACME01",
}
LOCKED_CLIENT_CODES = frozenset({"ACCG01"})

# Contract status → existing HVCG_Proposals.ProposalStatus choices (no thaw).
PROPOSAL_STATUS_TO_FROZEN = {
    "draft": "Draft",
    "internal_review": "Internal Review",
    "ready": "Internal Review",
    "sent": "Sent",
    "accepted": "Accepted",
    "declined": "Rejected",
    "expired": "Withdrawn",
}

# SKU / offer → existing HVCG_Engagements.EngagementType choices (no thaw).
ENGAGEMENT_TYPE_TO_FROZEN = {
    "SKU-CAP-CORE": "Capital Advisory",
    "OFF-CAP-PKG": "Capital Advisory",
}


def frozen_column_names(list_title: str) -> set[str]:
    path = SHAREPOINT_SCHEMA_DIR / f"{list_title}.json"
    schema = json.loads(path.read_text(encoding="utf-8"))
    if schema.get("title") != list_title:
        raise ValueError(f"frozen schema title mismatch for {list_title}")
    return {column["internalName"] for column in schema["columns"]}


def _fail(errors: list[str], **extra: Any) -> dict[str, Any]:
    return {
        "ok": False,
        "persisted": False,
        "created": False,
        "replayed": False,
        "liveGraphWrite": False,
        "mode": "fixture",
        "candidate": None,
        "errors": errors,
        **extra,
    }


def assert_writable_context(opportunity_id: str | None, client_code: str | None) -> list[str]:
    """Fail closed unless opportunityId matches a loaded ClientCode context."""
    errors: list[str] = []
    oid = (opportunity_id or "").strip()
    code = (client_code or "").strip()
    if not oid:
        errors.append("opportunityId is required. SharePoint adapter fails closed.")
    if not code:
        errors.append("clientCode is required. SharePoint adapter is ClientCode-scoped.")
    if code in LOCKED_CLIENT_CODES:
        errors.append("ACCG01 writes are forbidden. Fail closed.")
    loaded = LOADED_COMMERCIAL_CONTEXTS.get(oid)
    if oid and loaded is None:
        errors.append(
            f"No loaded commercial context for opportunity '{oid}'. "
            "Fail closed — unmatched opportunities are not persisted."
        )
    elif oid and code and loaded and code != loaded:
        errors.append(
            f"ClientCode '{code}' does not match loaded commercial context "
            f"'{loaded}' for opportunity '{oid}'. Fail closed."
        )
    return errors


def _refuse_live_writes(live_graph: bool) -> list[str]:
    if live_graph or LIVE_GRAPH_WRITES or PRODUCTION_WRITES:
        return [
            "Live Graph / production SharePoint writes are default-off. "
            "Adapters persist fixture candidates only."
        ]
    return []


def _assert_frozen_fields(list_title: str, fields: dict[str, Any]) -> list[str]:
    extra = set(fields) - frozen_column_names(list_title)
    if extra:
        return [f"schema thaw refused for {list_title}: unknown columns {sorted(extra)}"]
    return []


def _store_key(list_title: str, idempotency_key: str) -> str:
    return f"sp-candidate|{list_title}|{idempotency_key}"


def persist_proposal_candidate(
    context: dict[str, Any],
    *,
    store: IdempotentStore | None = None,
    live_graph: bool = False,
) -> dict[str, Any]:
    """Map proposal-context.v1 onto a frozen HVCG_Proposals candidate. Fixture only."""
    live_errors = _refuse_live_writes(live_graph)
    if live_errors:
        return _fail(live_errors, listTitle=LIST_PROPOSALS)

    schema_errors = validate("proposal-context.v1.json", context)
    if schema_errors:
        return _fail(schema_errors, listTitle=LIST_PROPOSALS)

    if context.get("autoSend") is True:
        return _fail(["autoSend must remain false"], listTitle=LIST_PROPOSALS)

    scope_errors = assert_writable_context(context.get("opportunityId"), context.get("clientCode"))
    if scope_errors:
        return _fail(scope_errors, listTitle=LIST_PROPOSALS)

    status = context["status"]
    frozen_status = PROPOSAL_STATUS_TO_FROZEN.get(status)
    if frozen_status is None:
        return _fail([f"no frozen ProposalStatus mapping for {status}"], listTitle=LIST_PROPOSALS)

    idempotency_key = f"proposal|{context['opportunityId']}|{context['proposalId']}"
    fields = {
        "Title": context["proposalId"],
        "OpportunityId": context["opportunityId"],
        "ProposalStatus": frozen_status,
        "VersionLabel": "v1",
        "HVCG_IdempotencyKey": idempotency_key,
    }
    thaw_errors = _assert_frozen_fields(LIST_PROPOSALS, fields)
    if thaw_errors:
        return _fail(thaw_errors, listTitle=LIST_PROPOSALS)

    candidate = {
        "listTitle": LIST_PROPOSALS,
        "mode": "fixture",
        "liveGraphWrite": False,
        "liveDispatch": LIVE_DISPATCH,
        "autoSend": False,
        "scope": {
            "clientCode": context["clientCode"],
            "opportunityId": context["opportunityId"],
        },
        "fields": fields,
        "contract": {
            "contractVersion": context["contractVersion"],
            "proposalId": context["proposalId"],
            "status": status,
            "offerSku": context.get("offerSku"),
        },
    }
    return _put_candidate(store, LIST_PROPOSALS, idempotency_key, candidate)


def persist_engagement_candidate(
    event: dict[str, Any],
    *,
    store: IdempotentStore | None = None,
    live_graph: bool = False,
) -> dict[str, Any]:
    """Map engagement-created.v1 onto a frozen HVCG_Engagements candidate. Fixture only."""
    live_errors = _refuse_live_writes(live_graph)
    if live_errors:
        return _fail(live_errors, listTitle=LIST_ENGAGEMENTS)

    schema_errors = validate("engagement-created.v1.json", event)
    if schema_errors:
        return _fail(schema_errors, listTitle=LIST_ENGAGEMENTS)

    scope_errors = assert_writable_context(event.get("opportunityId"), event.get("clientCode"))
    if scope_errors:
        return _fail(scope_errors, listTitle=LIST_ENGAGEMENTS)

    expected_key = f"engagement|{event['opportunityId']}"
    envelope_key = event.get("envelope", {}).get("idempotencyKey")
    if envelope_key and envelope_key != expected_key:
        return _fail(
            [f"engagement idempotency must stay {expected_key} (SoT)"],
            listTitle=LIST_ENGAGEMENTS,
        )

    sku = event.get("sku") or ""
    engagement_type = ENGAGEMENT_TYPE_TO_FROZEN.get(sku, "Other")
    fields: dict[str, Any] = {
        "Title": event["engagementId"],
        "ClientId": event["clientCode"],
        "ClientCode": event["clientCode"],
        "EngagementType": engagement_type,
        "ServicePackage": sku or None,
        "EngagementStatus": "Draft",
        "StartDate": event.get("startsOn"),
        "HVCG_IdempotencyKey": expected_key,
    }
    fields = {key: value for key, value in fields.items() if value is not None}
    thaw_errors = _assert_frozen_fields(LIST_ENGAGEMENTS, fields)
    if thaw_errors:
        return _fail(thaw_errors, listTitle=LIST_ENGAGEMENTS)

    candidate = {
        "listTitle": LIST_ENGAGEMENTS,
        "mode": "fixture",
        "liveGraphWrite": False,
        "autoProvisionAccess": False,
        "scope": {
            "clientCode": event["clientCode"],
            "opportunityId": event["opportunityId"],
        },
        "fields": fields,
        "contract": {
            "contractVersion": event["contractVersion"],
            "engagementId": event["engagementId"],
        },
    }
    return _put_candidate(store, LIST_ENGAGEMENTS, expected_key, candidate)


def _put_candidate(
    store: IdempotentStore | None,
    list_title: str,
    idempotency_key: str,
    candidate: dict[str, Any],
) -> dict[str, Any]:
    store = store or IdempotentStore()
    result = store.put(_store_key(list_title, idempotency_key), candidate, collision="return-existing")
    item = result["item"]
    return {
        "ok": True,
        "persisted": True,
        "created": result["created"],
        "replayed": result["replayed"],
        "liveGraphWrite": False,
        "mode": "fixture",
        "listTitle": list_title,
        "idempotencyKey": idempotency_key,
        "candidate": deepcopy(item),
        "errors": [],
    }


def list_candidates(store: IdempotentStore, list_title: str) -> list[dict[str, Any]]:
    return store.list_prefix(f"sp-candidate|{list_title}|")
