"""Product-train adapters. Consume Integration SoT — no semantic forks."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .gates import AUTO_PROVISION_ACCESS, LIVE_DISPATCH, MUTATES_PAID_ADS
from .schemas import assert_valid, validate
from .store import IdempotentStore

PASCAL_ALIASES = {
    "AssessmentId": "assessmentId",
    "OrganizationName": "organizationName",
    "LeadId": "leadId",
    "Company": "organizationName",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def envelope(
    *,
    key: str,
    source: str,
    dest: str,
    entity: str,
    operation: str,
    version: str,
    correlation: str,
    event_id: str,
    entity_id: str,
    replay: str = "return-existing",
    identity_class: str = "hvcg_human",
) -> dict[str, Any]:
    return {
        "idempotencyKey": key,
        "sourceSystem": source,
        "destinationSystem": dest,
        "entity": entity,
        "operation": operation,
        "version": version,
        "replaySemantics": replay,
        "trace": {
            "correlationId": correlation,
            "sourceSystem": source,
            "destinationSystem": dest,
            "eventId": event_id,
            "entityId": entity_id,
            "timestamp": _now(),
            "version": version,
            "outcome": "accepted",
        },
        "actor": {"identityClass": identity_class, "principalId": f"{source}-revos", "scopes": [f"{entity}:write"]},
    }


def reject_pascal_only(payload: dict[str, Any]) -> list[str]:
    """CC-001: camelCase is required; PascalCase aliases must equal camelCase."""
    errors: list[str] = []
    for alias, canonical in PASCAL_ALIASES.items():
        if alias in payload and canonical not in payload:
            errors.append(f"PascalCase-only field {alias} rejected; camelCase {canonical} is SoT")
        elif alias in payload and payload[alias] != payload.get(canonical):
            errors.append(f"alias {alias} must equal {canonical}")
    return errors


def accept_gtm_lead(payload: dict[str, Any], store: IdempotentStore | None = None) -> dict[str, Any]:
    """Keep GTM commercial interface compatible. Do not remap lead-intake meaning."""
    alias_errors = reject_pascal_only(payload)
    if alias_errors:
        return {"ok": False, "errors": alias_errors, "accepted": False}

    schema_errors = validate("360-atlas-lead.v1.json", payload)
    if schema_errors:
        return {"ok": False, "errors": schema_errors, "accepted": False}

    if payload.get("observationOnly") is not True:
        return {"ok": False, "errors": ["GTM lead remains observationOnly"], "accepted": False}
    if payload.get("paidAdsRequested") is not False or LIVE_DISPATCH:
        return {"ok": False, "errors": ["paid ads / live dispatch must stay false"], "accepted": False}
    if payload.get("governance", {}).get("liveDispatch", False):
        return {"ok": False, "errors": ["CC-001 liveDispatch must be false"], "accepted": False}

    idem = payload["provenance"]["idempotencyKey"]
    if not idem.startswith("360|"):
        return {"ok": False, "errors": ["GTM idempotency must stay 360|{leadId}"], "accepted": False}

    store = store or IdempotentStore()
    result = store.put(idem, {"kind": "gtm-lead", "payload": payload}, collision="return-existing")
    return {
        "ok": True,
        "accepted": True,
        "created": result["created"],
        "replayed": result["replayed"],
        "liveDispatch": False,
        "semanticFork": False,
    }


def ingest_copilot_recommendation(
    payload: dict[str, Any],
    *,
    store: IdempotentStore | None = None,
) -> dict[str, Any]:
    """CC-002: Copilot recommendations stay advisory. Revenue owns commercial accept."""
    alias_errors = reject_pascal_only(payload)
    if alias_errors:
        return {"ok": False, "errors": alias_errors, "promoted": False}

    if payload.get("observationOnly") is not True:
        return {"ok": False, "errors": ["Copilot payload must be observationOnly"], "promoted": False}
    if payload.get("createsCommitment") is True:
        return {"ok": False, "errors": ["Copilot cannot create commercial commitments"], "promoted": False}

    store = store or IdempotentStore()
    rec_id = payload.get("recommendationId") or payload.get("assessmentId") or "unknown"
    result = store.put(f"copilot-rec|{rec_id}", payload, collision="return-existing")
    return {
        "ok": True,
        "promoted": False,
        "advisory": True,
        "commercialAuthority": "revenue-os",
        "created": result["created"],
        "replayed": result["replayed"],
    }


def emit_gcc_handoff(
    *,
    client_code: str,
    display_name: str,
    opportunity_id: str,
    authorized_by: str,
    store: IdempotentStore | None = None,
    correlation: str = "revos-gcc-001",
) -> dict[str, Any]:
    """CC-003: persist-only GCC handoff. autoProvisionAccess=false."""
    if AUTO_PROVISION_ACCESS:
        raise RuntimeError("autoProvisionAccess must remain false")
    key = f"gcc-activate|{client_code}|active"
    env = envelope(
        key=key,
        source="atlas",
        dest="gcc",
        entity="client",
        operation="handoff",
        version="atlas-to-gcc-handoff.v1",
        correlation=correlation,
        event_id=f"evt-gcc-{client_code}",
        entity_id=client_code,
    )
    payload = {
        "contractVersion": "atlas-to-gcc-handoff.v1",
        "emittedAt": _now(),
        "idempotencyKey": key,
        "client": {
            "clientCode": client_code,
            "displayName": display_name,
            "clientStage": "Active Client",
        },
        "activation": {
            "opportunityId": opportunity_id,
            "authorizedBy": authorized_by,
            "authorizedAt": _now(),
        },
        "gcc": {"action": "prepare_tenant_mapping"},
        "governance": {
            "autoProvisionAccess": False,
            "duplicateAtlasCrm": False,
        },
        "envelope": env,
    }
    assert_valid("atlas-to-gcc-handoff.v1.json", payload)
    store = store or IdempotentStore()
    result = store.put(key, payload, collision="return-existing")
    return {
        "ok": True,
        "handoff": result["item"],
        "created": result["created"],
        "replayed": result["replayed"],
        "autoProvisionAccess": False,
        "liveDispatch": False,
    }


def emit_closed_won_learning(
    *,
    outcome_id: str,
    lessons: list[str],
    store: IdempotentStore | None = None,
    correlation: str = "revos-learn-001",
) -> dict[str, Any]:
    key = f"learn-won|{outcome_id}"
    env = envelope(
        key=key,
        source="atlas",
        dest="360",
        entity="gtm_experiment",
        operation="signal",
        version="closed-won-learning-event.v1",
        correlation=correlation,
        event_id=f"evt-learn-{outcome_id}",
        entity_id=outcome_id,
    )
    payload = {
        "contractVersion": "closed-won-learning-event.v1",
        "eventId": f"learn-{outcome_id}",
        "outcomeId": outcome_id,
        "ownerSystem": "atlas",
        "destinationSystem": "360",
        "mutatesPaidAds": MUTATES_PAID_ADS,
        "lessons": lessons,
        "envelope": env,
    }
    assert_valid("closed-won-learning-event.v1.json", payload)
    store = store or IdempotentStore()
    result = store.put(key, payload, collision="return-existing")
    return {
        "ok": True,
        "event": result["item"],
        "created": result["created"],
        "replayed": result["replayed"],
        "mutatesPaidAds": False,
    }
