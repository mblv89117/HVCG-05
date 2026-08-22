"""Canonical BA runtime environment and production persistence policy.

Production and staging must not use `.data/` file adapters as a system of record.
This module does not invent ClientCodes, lists, or QBO/local-AI backends.
"""

from __future__ import annotations

import os
from typing import Any


class ProductionPersistBlocked(RuntimeError):
    """Raised when a `.data/` write is attempted in a production-like runtime."""

    status = "PRODUCTION_GATED"

    def __init__(self, adapter: str) -> None:
        super().__init__(f"{adapter} persistence is not a production system of record")
        self.adapter = adapter


_PRODUCTION = frozenset({"production", "prod"})
_STAGING = frozenset({"staging", "stage"})
_DEVELOPMENT = frozenset({"development", "dev", "local", "test", "uat"})


def normalize_atlas_environment(raw: Any) -> str | None:
    if raw is None:
        return None
    text = str(raw).strip().lower()
    if not text:
        return None
    if text in _PRODUCTION:
        return "production"
    if text in _STAGING:
        return "staging"
    if text in _DEVELOPMENT:
        return "development"
    return text


def configured_runtime_environment(env: dict[str, str] | None = None) -> str:
    """Process environment for the BA runtime. Does not read NODE_ENV.

    NODE_ENV is a Hub (Node) concern. BA production awareness is explicit:
    BA_ATLAS_ENV, then ATLAS_ENV. Default is local/development.
    """
    source = env if env is not None else os.environ
    raw = (source.get("BA_ATLAS_ENV") or source.get("ATLAS_ENV") or "local").strip()
    return normalize_atlas_environment(raw) or "development"


def is_production_runtime(env: dict[str, str] | None = None) -> bool:
    return configured_runtime_environment(env) == "production"


def is_staging_runtime(env: dict[str, str] | None = None) -> bool:
    return configured_runtime_environment(env) == "staging"


def persist_blocked(principal_environment: Any = None, env: dict[str, str] | None = None) -> bool:
    runtime = configured_runtime_environment(env)
    if runtime in ("production", "staging"):
        return True
    projected = normalize_atlas_environment(principal_environment)
    return projected in ("production", "staging")


def reports_dev_semantics(raw: Any) -> bool:
    if raw is None:
        return True
    text = str(raw).strip()
    if not text:
        return True
    return text.upper() == "DEV" or normalize_atlas_environment(text) == "development"


def assert_persist_allowed(adapter: str, principal_environment: Any = None) -> None:
    if persist_blocked(principal_environment):
        raise ProductionPersistBlocked(adapter)


PRODUCTION_GATED_OPS = frozenset(
    {
        "lead.create",
        "lead.list",
        "lead.get",
        "lead.blc1",
        "freefit.complete",
        "freefit.get",
        "freefit.by_lead",
        "freefit.owner_decision",
        "freefit.blc1",
        "doc.upload",
    }
)

STATELESS_SAFE_OPS = frozenset(
    {
        "security.ping",
        "gates.registry",
        "contracts.load",
        "freefit.definition",
        "doc.access",
        "owner.access",
        "exec.intelligence",
        "ai.orchestrate",
        "blc1.block",
    }
)
