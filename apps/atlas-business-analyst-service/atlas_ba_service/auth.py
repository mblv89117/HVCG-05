"""BA service authentication boundary.

Intended future trust (not provisioned in this gate):

  Hub managed identity -> Entra access token -> BA API audience
  -> BA validates token -> BA accepts Hub principal projection

The BA service does not trust browser authentication, Elite-generated roles,
x-atlas-roles, x-atlas-client-ids, or anonymous production calls.

Test-only authenticators exist solely for local/test and cannot be enabled
when BA_ATLAS_ENV is production or staging.
"""

from __future__ import annotations

import time
from typing import Any

import jwt

from .config import BaServiceConfig

_HEADER_SPOOF = (
    "x-atlas-roles",
    "x-atlas-client-ids",
    "x-atlas-user-id",
    "x-atlas-organization-id",
)


class BaAuthError(Exception):
    def __init__(self, message: str, status_code: int = 401) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    raw = authorization.strip()
    if raw.lower().startswith("bearer "):
        token = raw[7:].strip()
        return token or None
    return None


def _aud_ok(claim: Any, expected: str) -> bool:
    if not expected:
        return False
    if isinstance(claim, str):
        return claim == expected
    if isinstance(claim, (list, tuple)):
        return expected in claim
    return False


def authenticate_request(
    cfg: BaServiceConfig,
    *,
    authorization: str | None,
    extra_headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Return a caller descriptor. Never logs the token."""
    headers = {str(k).lower(): str(v) for k, v in (extra_headers or {}).items()}
    for spoof in _HEADER_SPOOF:
        headers.pop(spoof, None)

    if not cfg.require_auth:
        if cfg.is_production or cfg.is_staging:
            raise BaAuthError("anonymous production calls are not allowed", 401)
        return {"mode": "unauthenticated-local", "azp": None}

    token = _bearer(authorization)
    if not token:
        raise BaAuthError("missing bearer token", 401)

    if cfg.test_auth_token:
        if cfg.is_production or cfg.is_staging:
            raise BaAuthError("test authentication is not allowed in production", 401)
        if token == cfg.test_auth_token:
            return {"mode": "test-token", "azp": "test-hub"}
        raise BaAuthError("invalid bearer token", 401)

    if cfg.test_jwt_hs256_secret:
        if cfg.is_production or cfg.is_staging:
            raise BaAuthError("test authentication is not allowed in production", 401)
        return _validate_test_jwt(cfg, token)

    if not (cfg.entra_tenant_id and cfg.api_audience and cfg.authorized_azp):
        raise BaAuthError("BA service authentication is not configured", 503)

    raise BaAuthError(
        "Entra JWKS validation is prepared but the BA API application is not provisioned in this gate",
        503,
    )


def _validate_test_jwt(cfg: BaServiceConfig, token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            cfg.test_jwt_hs256_secret,
            algorithms=["HS256"],
            audience=cfg.api_audience or None,
            options={
                "require": ["exp", "aud", "tid"],
                "verify_aud": bool(cfg.api_audience),
            },
        )
    except jwt.ExpiredSignatureError as exc:
        raise BaAuthError("token expired", 401) from exc
    except jwt.InvalidAudienceError as exc:
        raise BaAuthError("wrong audience", 401) from exc
    except jwt.InvalidTokenError as exc:
        raise BaAuthError("invalid bearer token", 401) from exc

    tid = str(payload.get("tid") or "")
    if cfg.entra_tenant_id and tid != cfg.entra_tenant_id:
        raise BaAuthError("wrong tenant", 401)

    azp = str(payload.get("azp") or payload.get("appid") or "")
    if cfg.authorized_azp and azp not in cfg.authorized_azp:
        raise BaAuthError("unauthorized Hub caller", 403)

    now = int(time.time())
    if int(payload.get("exp") or 0) < now:
        raise BaAuthError("token expired", 401)
    return {"mode": "test-jwt", "azp": azp, "tid": tid, "aud": payload.get("aud")}
