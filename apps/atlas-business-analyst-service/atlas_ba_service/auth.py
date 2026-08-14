"""BA service authentication boundary.

Intended future trust (not provisioned in this gate):

  Hub managed identity -> Entra v2 access token -> BA API audience
  -> BA validates signature, issuer, tenant, audience, app-only, caller oid, app role
  -> BA accepts Hub principal projection (end-user context)

Selected token version: v2.0 (resource-controlled via requestedAccessTokenVersion=2).

Production authorization is layered. azp/appid alone is never sufficient.
The immutable caller check is the managed-identity service-principal oid.
"""

from __future__ import annotations

from typing import Any

import jwt

from .config import ACCESS_TOKEN_VERSION, BaServiceConfig

_HEADER_SPOOF = (
    "x-atlas-roles",
    "x-atlas-client-ids",
    "x-atlas-user-id",
    "x-atlas-organization-id",
)

_PRODUCTION_ALG = "RS256"


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


def _roles_claim(payload: dict[str, Any]) -> list[str]:
    raw = payload.get("roles")
    if raw is None:
        return []
    if isinstance(raw, str):
        return [part for part in raw.split() if part]
    if isinstance(raw, (list, tuple)):
        return [str(item) for item in raw if str(item).strip()]
    return []


def _signing_key(cfg: BaServiceConfig, token: str) -> Any:
    if cfg.jwt_verify_key:
        return cfg.jwt_verify_key
    if not cfg.jwks_url:
        raise BaAuthError("BA service authentication is not configured", 503)
    try:
        client = jwt.PyJWKClient(cfg.jwks_url, cache_keys=True)
        return client.get_signing_key_from_jwt(token).key
    except Exception as exc:
        raise BaAuthError("token signing key could not be resolved", 401) from exc


def validate_entra_access_token(cfg: BaServiceConfig, token: str) -> dict[str, Any]:
    """Validate a Microsoft Entra v2 application-only access token. Never logs the token."""
    if not (
        cfg.entra_tenant_id
        and cfg.api_audience
        and cfg.authorized_caller_oid
        and cfg.required_app_role
    ):
        raise BaAuthError("BA service authentication is not configured", 503)

    try:
        header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as exc:
        raise BaAuthError("malformed token", 401) from exc
    alg = str(header.get("alg") or "")
    if alg == "none" or not alg:
        raise BaAuthError("unsigned token", 401)
    if alg != _PRODUCTION_ALG:
        raise BaAuthError("invalid token algorithm", 401)

    try:
        key = _signing_key(cfg, token)
        payload = jwt.decode(
            token,
            key,
            algorithms=[_PRODUCTION_ALG],
            audience=cfg.api_audience,
            issuer=cfg.expected_issuer,
            options={
                "require": ["exp", "nbf", "aud", "iss"],
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_aud": True,
                "verify_iss": True,
            },
            leeway=0,
        )
    except jwt.ExpiredSignatureError as exc:
        raise BaAuthError("token expired", 401) from exc
    except jwt.ImmatureSignatureError as exc:
        raise BaAuthError("token not yet valid", 401) from exc
    except jwt.InvalidAudienceError as exc:
        raise BaAuthError("wrong audience", 401) from exc
    except jwt.InvalidIssuerError as exc:
        raise BaAuthError("invalid issuer", 401) from exc
    except jwt.InvalidSignatureError as exc:
        raise BaAuthError("wrong signing key", 401) from exc
    except jwt.InvalidTokenError as exc:
        raise BaAuthError("invalid bearer token", 401) from exc

    ver = str(payload.get("ver") or "")
    if ver != ACCESS_TOKEN_VERSION:
        raise BaAuthError("token version not accepted", 401)

    tid = str(payload.get("tid") or "")
    if tid != cfg.entra_tenant_id:
        raise BaAuthError("wrong tenant", 401)

    azp = str(payload.get("azp") or "").strip()
    if not azp:
        raise BaAuthError("missing v2 caller claim", 401)
    if cfg.authorized_azp and azp not in cfg.authorized_azp:
        raise BaAuthError("unauthorized Hub caller", 403)

    if payload.get("scp"):
        raise BaAuthError("delegated user token is not accepted", 401)

    idtyp = str(payload.get("idtyp") or "").strip()
    if cfg.require_idtyp:
        if not idtyp:
            raise BaAuthError("missing app-only token type", 401)
        if idtyp != "app":
            raise BaAuthError("token is not application-only", 401)

    oid = str(payload.get("oid") or "").strip()
    if not oid:
        raise BaAuthError("missing caller oid", 401)
    if oid != cfg.authorized_caller_oid:
        raise BaAuthError("unauthorized Hub caller", 403)

    roles = _roles_claim(payload)
    if not roles:
        raise BaAuthError("missing required app role", 403)
    if cfg.required_app_role not in roles:
        raise BaAuthError("wrong app role", 403)

    return {
        "mode": "entra-v2-app-only",
        "oid": oid,
        "azp": azp,
        "tid": tid,
        "aud": payload.get("aud"),
        "roles": roles,
        "idtyp": idtyp,
        "ver": ver,
    }


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

    if cfg.is_production or cfg.is_staging:
        if cfg.test_auth_token or cfg.test_jwt_hs256_secret:
            raise BaAuthError("test authentication is not allowed in production", 401)
        return validate_entra_access_token(cfg, token)

    if cfg.test_auth_token:
        if token == cfg.test_auth_token:
            return {"mode": "test-token", "azp": "test-hub"}
        raise BaAuthError("invalid bearer token", 401)

    if cfg.test_jwt_hs256_secret:
        return _validate_test_jwt(cfg, token)

    return validate_entra_access_token(cfg, token)


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

    return {"mode": "test-jwt", "azp": azp, "tid": tid, "aud": payload.get("aud")}
