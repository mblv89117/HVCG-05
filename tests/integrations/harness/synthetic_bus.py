"""In-memory idempotent store for synthetic cross-system journeys (no production I/O)."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class WriteResult:
    outcome: str
    created: bool
    entity_id: str
    payload: dict[str, Any]


@dataclass
class SyntheticBus:
    """Simulates cross-system writes with idempotency and failure injection."""

    store: dict[str, dict[str, Any]] = field(default_factory=dict)
    events: list[dict[str, Any]] = field(default_factory=list)
    fail_next: set[str] = field(default_factory=set)
    drop_response_keys: set[str] = field(default_factory=set)

    def write(self, key: str, entity: str, payload: dict[str, Any], *, force_fail: bool = False) -> WriteResult:
        if force_fail or key in self.fail_next:
            self.fail_next.discard(key)
            result = WriteResult(outcome="failed", created=False, entity_id="", payload=payload)
            self.events.append({"key": key, "entity": entity, "result": result.outcome})
            return result

        if key in self.store:
            existing = self.store[key]
            result = WriteResult(
                outcome="duplicate",
                created=False,
                entity_id=existing["entity_id"],
                payload=existing["payload"],
            )
            self.events.append({"key": key, "entity": entity, "result": result.outcome})
            if key in self.drop_response_keys:
                # Simulate response loss after persist — caller must retry.
                self.drop_response_keys.discard(key)
            return result

        entity_id = payload.get("id") or payload.get("leadId") or payload.get("assessmentId") or key
        self.store[key] = {"entity": entity, "entity_id": str(entity_id), "payload": payload}
        result = WriteResult(outcome="accepted", created=True, entity_id=str(entity_id), payload=payload)
        self.events.append({"key": key, "entity": entity, "result": result.outcome})
        if key in self.drop_response_keys:
            self.drop_response_keys.discard(key)
            # Persist succeeded; response lost — retry should see duplicate.
        return result

    def count(self, entity: str) -> int:
        return sum(1 for v in self.store.values() if v["entity"] == entity)
