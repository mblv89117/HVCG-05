"""Translate Hub JSON dispatch into canonical config/business without rewriting engines."""

from __future__ import annotations

import uuid
from typing import Any

from .config import BaServiceConfig, ensure_business_on_path


class PrincipalProjectionError(ValueError):
    status = "FORBIDDEN"


def new_correlation_id() -> str:
    return f"CORR-{uuid.uuid4().hex[:12].upper()}"


def validate_principal_projection(
    cfg: BaServiceConfig,
    principal: Any,
) -> dict[str, Any]:
    if not isinstance(principal, dict):
        raise PrincipalProjectionError("principal projection is required")
    user_id = str(principal.get("userId") or "").strip()
    if not user_id:
        raise PrincipalProjectionError("principal.userId is required")
    roles = principal.get("roles")
    if not isinstance(roles, list) or any(not isinstance(r, str) for r in roles):
        raise PrincipalProjectionError("principal.roles must be a list of strings")
    allowed = principal.get("allowedClientIds")
    if not isinstance(allowed, list) or any(not isinstance(c, str) for c in allowed):
        raise PrincipalProjectionError("principal.allowedClientIds must be a list of strings")
    environment = str(principal.get("environment") or "").strip()
    if not environment:
        raise PrincipalProjectionError("principal.environment is required")
    if cfg.is_production or cfg.is_staging:
        if environment.upper() == "DEV" or environment.lower() in ("development", "dev", "local"):
            raise PrincipalProjectionError("production cannot report DEV environment semantics")
        if "*" in allowed:
            raise PrincipalProjectionError("wildcard client scope is not accepted")
    if "*" in allowed:
        owner_or_admin = any(
            str(r).lower() in ("hvcg owner", "owner", "administrator", "admin") for r in roles
        )
        if owner_or_admin and (cfg.is_production or cfg.is_staging):
            raise PrincipalProjectionError("Owner/Admin does not imply wildcard client access")
    return {
        "userId": user_id,
        "email": principal.get("email"),
        "organizationId": principal.get("organizationId") or "org-hvcg",
        "allowedClientIds": allowed,
        "roles": roles,
        "environment": environment,
    }


def dispatch_request(cfg: BaServiceConfig, body: dict[str, Any], correlation_id: str) -> dict[str, Any]:
    ensure_business_on_path(cfg.business_dir)
    import atlas_security as sec  # noqa: WPS433 — canonical engines, loaded after path insert

    op = body.get("op")
    if not isinstance(op, str) or not op.strip():
        return {
            "ok": False,
            "status": "FORBIDDEN",
            "message": "op is required",
            "correlationId": correlation_id,
        }
    payload = body.get("payload") if isinstance(body.get("payload"), dict) else {}
    try:
        principal = validate_principal_projection(cfg, body.get("principal"))
    except PrincipalProjectionError as exc:
        return {
            "ok": False,
            "status": "FORBIDDEN",
            "message": str(exc),
            "correlationId": correlation_id,
            "leakage": False,
        }
    req = {
        "op": op.strip(),
        "principal": principal,
        "payload": payload,
        "correlationId": correlation_id,
    }
    out = sec.dispatch_ba_request(req)
    if not isinstance(out, dict):
        return {
            "ok": False,
            "status": "FORBIDDEN",
            "message": "invalid_engine_response",
            "correlationId": correlation_id,
        }
    out.setdefault("correlationId", correlation_id)
    return out
