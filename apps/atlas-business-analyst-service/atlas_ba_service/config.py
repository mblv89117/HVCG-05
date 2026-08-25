"""BA service configuration. Production fails closed if Entra placeholders are empty."""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path


class BaServiceConfigError(RuntimeError):
    """Fail-closed configuration error. Safe to surface to operators; contains no secrets."""


MAX_BODY_BYTES = 65_536
DISPATCH_TIMEOUT_SEC = 12.0
HEALTH_PATH = "/health"
DISPATCH_PATH = "/dispatch"
DEFAULT_APP_ROLE = "Atlas.BA.Invoke"
ACCESS_TOKEN_VERSION = "2.0"

_TEST_AUTH_KEYS = (
    "BA_TEST_AUTH_TOKEN",
    "BA_TEST_JWT_HS256_SECRET",
)
_UNSUPPORTED_ENV_KEYS = (
    "BA_JWT_VERIFY_KEY",
)


def _flag(raw: str | None) -> bool:
    if raw is None or raw.strip() == "":
        return False
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _csv(raw: str | None) -> tuple[str, ...]:
    if not raw:
        return ()
    return tuple(part.strip() for part in raw.split(",") if part.strip())


def resolve_business_dir(env: dict[str, str] | None = None) -> Path:
    source = env if env is not None else os.environ
    override = (source.get("HVCG_BA_BUSINESS_DIR") or "").strip()
    if override:
        path = Path(override).expanduser().resolve()
        if not (path / "ba_bridge.py").is_file():
            raise BaServiceConfigError("HVCG_BA_BUSINESS_DIR is set but ba_bridge.py was not found")
        return path
    here = Path(__file__).resolve()
    in_tree = here.parents[3] / "config" / "business"
    if (in_tree / "ba_bridge.py").is_file():
        return in_tree
    raise BaServiceConfigError(
        "Canonical BA engines not found at config/business/ba_bridge.py. "
        "Set HVCG_BA_BUSINESS_DIR to the engines directory."
    )


def ensure_business_on_path(business_dir: Path) -> None:
    raw = str(business_dir)
    if raw not in sys.path:
        sys.path.insert(0, raw)


@dataclass(frozen=True)
class BaServiceConfig:
    atlas_env: str
    is_production: bool
    is_staging: bool
    require_auth: bool
    entra_tenant_id: str
    api_audience: str
    authorized_caller_oid: str
    authorized_azp: tuple[str, ...]
    required_app_role: str
    access_token_version: str
    require_idtyp: bool
    jwks_url: str
    test_auth_token: str
    test_jwt_hs256_secret: str
    jwt_verify_key: str
    business_dir: Path
    host: str
    port: int
    max_body_bytes: int
    dispatch_timeout_sec: float
    local_ai_enabled: bool
    qbo_enabled: bool

    @property
    def persist_writes(self) -> bool:
        return not (self.is_production or self.is_staging)

    @property
    def expected_issuer(self) -> str:
        return f"https://login.microsoftonline.com/{self.entra_tenant_id}/v2.0"


def load_config(env: dict[str, str] | None = None) -> BaServiceConfig:
    source = env if env is not None else os.environ
    atlas_env = (source.get("BA_ATLAS_ENV") or source.get("ATLAS_ENV") or "local").strip().lower()
    if atlas_env in ("prod",):
        atlas_env = "production"
    if atlas_env in ("stage",):
        atlas_env = "staging"
    is_production = atlas_env == "production"
    is_staging = atlas_env == "staging"
    production_like = is_production or is_staging

    test_auth_token = (source.get("BA_TEST_AUTH_TOKEN") or "").strip()
    test_jwt_secret = (source.get("BA_TEST_JWT_HS256_SECRET") or "").strip()
    local_ai = _flag(source.get("LOCAL_AI_ENABLED") or source.get("BA_LOCAL_AI_ENABLED"))
    qbo = _flag(source.get("BA_QBO_ENABLED") or source.get("QBO_ENABLED"))
    unsupported = [k for k in _UNSUPPORTED_ENV_KEYS if (source.get(k) or "").strip()]
    if unsupported:
        raise BaServiceConfigError(
            "static JWT verify keys cannot be loaded from the environment; production uses JWKS"
        )

    if production_like:
        present_test = [k for k in _TEST_AUTH_KEYS if (source.get(k) or "").strip()]
        if present_test:
            raise BaServiceConfigError(
                "test-only BA authentication variables are not allowed in production/staging"
            )
        if local_ai:
            raise BaServiceConfigError("local AI is not allowed in production/staging")
        if qbo:
            raise BaServiceConfigError("QBO is deferred and must remain disabled in production/staging")

    require_auth_raw = source.get("BA_REQUIRE_AUTH")
    if require_auth_raw is None or require_auth_raw.strip() == "":
        require_auth = True
    else:
        require_auth = _flag(require_auth_raw)
    if production_like and not require_auth:
        raise BaServiceConfigError("BA_REQUIRE_AUTH cannot be disabled in production/staging")

    tenant = (source.get("BA_ENTRA_TENANT_ID") or "").strip()
    audience = (source.get("BA_API_AUDIENCE") or "").strip()
    authorized_caller_oid = (source.get("BA_AUTHORIZED_CALLER_OID") or "").strip()
    authorized_azp = _csv(source.get("BA_AUTHORIZED_AZP"))
    required_app_role = (source.get("BA_REQUIRED_APP_ROLE") or DEFAULT_APP_ROLE).strip()
    version_raw = (source.get("BA_ACCESS_TOKEN_VERSION") or "2").strip()
    if version_raw in ("2", "2.0"):
        access_token_version = ACCESS_TOKEN_VERSION
    else:
        access_token_version = version_raw
    idtyp_raw = source.get("BA_REQUIRE_IDTYP")
    if idtyp_raw is None or idtyp_raw.strip() == "":
        require_idtyp = True
    else:
        require_idtyp = _flag(idtyp_raw)

    jwks_url = (source.get("BA_JWKS_URL") or "").strip()
    if tenant and not jwks_url:
        jwks_url = f"https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys"

    if production_like:
        if access_token_version != ACCESS_TOKEN_VERSION:
            raise BaServiceConfigError("production/staging BA auth requires BA_ACCESS_TOKEN_VERSION=2")
        if not require_idtyp:
            raise BaServiceConfigError("BA_REQUIRE_IDTYP cannot be disabled in production/staging")
        if not required_app_role:
            raise BaServiceConfigError("BA_REQUIRED_APP_ROLE is required in production/staging")
        if not tenant or not audience or not authorized_caller_oid:
            raise BaServiceConfigError(
                "production/staging BA auth requires BA_ENTRA_TENANT_ID, BA_API_AUDIENCE, "
                "and BA_AUTHORIZED_CALLER_OID"
            )

    host = (source.get("BA_HOST") or "127.0.0.1").strip() or "127.0.0.1"
    try:
        port = int(source.get("BA_PORT") or "8794")
    except ValueError as exc:
        raise BaServiceConfigError("BA_PORT must be an integer") from exc

    return BaServiceConfig(
        atlas_env=atlas_env,
        is_production=is_production,
        is_staging=is_staging,
        require_auth=require_auth,
        entra_tenant_id=tenant,
        api_audience=audience,
        authorized_caller_oid=authorized_caller_oid,
        authorized_azp=authorized_azp,
        required_app_role=required_app_role,
        access_token_version=access_token_version if access_token_version else ACCESS_TOKEN_VERSION,
        require_idtyp=require_idtyp,
        jwks_url=jwks_url,
        test_auth_token=test_auth_token,
        test_jwt_hs256_secret=test_jwt_secret,
        jwt_verify_key="",
        business_dir=resolve_business_dir(source),
        host=host,
        port=port,
        max_body_bytes=MAX_BODY_BYTES,
        dispatch_timeout_sec=DISPATCH_TIMEOUT_SEC,
        local_ai_enabled=False if production_like else local_ai,
        qbo_enabled=False if production_like else qbo,
    )
