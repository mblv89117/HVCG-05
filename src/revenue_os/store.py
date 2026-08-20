"""In-memory idempotent store. Dev/synthetic adapter — not a production SoR."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


class IdempotentStore:
    """Replay-safe keyed store.

    collisionBehavior:
      - return-existing: first write wins; replay returns the original
      - update-existing: replay merges non-terminal fields
      - reject-conflict: replay with different payload fails
    """

    def __init__(self) -> None:
        self._items: dict[str, dict[str, Any]] = {}
        self._audit: list[dict[str, Any]] = []

    def put(
        self,
        key: str,
        payload: dict[str, Any],
        *,
        collision: str = "return-existing",
    ) -> dict[str, Any]:
        existing = self._items.get(key)
        if existing is None:
            stored = deepcopy(payload)
            stored["_idempotencyKey"] = key
            self._items[key] = stored
            self._audit.append({"key": key, "result": "created"})
            return {"created": True, "replayed": False, "item": deepcopy(stored)}

        if collision == "return-existing":
            self._audit.append({"key": key, "result": "returned-existing"})
            return {"created": False, "replayed": True, "item": deepcopy(existing)}

        if collision == "reject-conflict":
            if existing != payload and {k: v for k, v in existing.items() if k != "_idempotencyKey"} != payload:
                self._audit.append({"key": key, "result": "rejected-conflict"})
                return {
                    "created": False,
                    "replayed": True,
                    "conflict": True,
                    "item": deepcopy(existing),
                    "error": "idempotency conflict",
                }
            self._audit.append({"key": key, "result": "returned-existing"})
            return {"created": False, "replayed": True, "item": deepcopy(existing)}

        if collision == "update-existing":
            if existing.get("terminal"):
                self._audit.append({"key": key, "result": "terminal-preserved"})
                return {"created": False, "replayed": True, "item": deepcopy(existing)}
            merged = deepcopy(existing)
            for field, value in payload.items():
                if field not in {"status", "terminal"} or not existing.get("terminal"):
                    merged[field] = deepcopy(value)
            merged["_idempotencyKey"] = key
            self._items[key] = merged
            self._audit.append({"key": key, "result": "updated-existing"})
            return {"created": False, "replayed": True, "item": deepcopy(merged)}

        raise ValueError(f"unknown collision behavior: {collision}")

    def get(self, key: str) -> dict[str, Any] | None:
        item = self._items.get(key)
        return deepcopy(item) if item else None

    def list_prefix(self, prefix: str) -> list[dict[str, Any]]:
        return [deepcopy(v) for k, v in self._items.items() if k.startswith(prefix)]

    def audit(self) -> list[dict[str, Any]]:
        return list(self._audit)
