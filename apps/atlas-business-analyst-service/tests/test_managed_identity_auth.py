"""Production managed-identity authorization contract tests. Synthetic data only.

RSA signatures are verified. HS256 test authenticators are not used here.
"""

from __future__ import annotations

import base64
import json
import sys
import time
import unittest
from dataclasses import replace
from pathlib import Path

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from starlette.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
SERVICE_ROOT = ROOT / "apps" / "atlas-business-analyst-service"
BUSINESS = ROOT / "config" / "business"
sys.path.insert(0, str(SERVICE_ROOT))

from atlas_ba_service.app import create_app  # noqa: E402
from atlas_ba_service.auth import BaAuthError, authenticate_request, validate_entra_access_token  # noqa: E402
from atlas_ba_service.config import BaServiceConfigError, load_config  # noqa: E402

TENANT = "11111111-1111-1111-1111-111111111111"
AUDIENCE = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
CALLER_OID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff"
AZP = "cccccccc-dddd-4eee-8fff-000000000001"
ROLE = "Atlas.BA.Invoke"


def _rsa_pair():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    return private_pem, public_pem.decode("utf-8")


PRIVATE_PEM, PUBLIC_PEM = _rsa_pair()
OTHER_PRIVATE_PEM, _OTHER_PUBLIC = _rsa_pair()


def _prod_env(**overrides: str) -> dict[str, str]:
    base = {
        "BA_ATLAS_ENV": "production",
        "BA_REQUIRE_AUTH": "true",
        "BA_ENTRA_TENANT_ID": TENANT,
        "BA_API_AUDIENCE": AUDIENCE,
        "BA_AUTHORIZED_CALLER_OID": CALLER_OID,
        "BA_AUTHORIZED_AZP": AZP,
        "BA_REQUIRED_APP_ROLE": ROLE,
        "BA_ACCESS_TOKEN_VERSION": "2",
        "BA_REQUIRE_IDTYP": "true",
        "HVCG_BA_BUSINESS_DIR": str(BUSINESS),
        "LOCAL_AI_ENABLED": "false",
        "BA_QBO_ENABLED": "false",
    }
    base.update(overrides)
    return base


def _prod_cfg(**overrides: str):
    return replace(load_config(_prod_env(**overrides)), jwt_verify_key=PUBLIC_PEM)


def _claims(**overrides):
    now = int(time.time())
    payload = {
        "aud": AUDIENCE,
        "iss": f"https://login.microsoftonline.com/{TENANT}/v2.0",
        "tid": TENANT,
        "oid": CALLER_OID,
        "azp": AZP,
        "ver": "2.0",
        "idtyp": "app",
        "roles": [ROLE],
        "nbf": now - 30,
        "iat": now - 30,
        "exp": now + 600,
    }
    payload.update(overrides)
    return payload


def _token(claims: dict | None = None, *, key=PRIVATE_PEM, alg: str = "RS256") -> str:
    headers = {"alg": alg, "typ": "JWT"}
    return jwt.encode(claims or _claims(), key, algorithm=alg, headers=headers)


def _client(cfg=None) -> TestClient:
    return TestClient(create_app(cfg or _prod_cfg()))


def _principal(**overrides):
    p = {
        "userId": "oid-user-1",
        "email": "analyst@example.invalid",
        "organizationId": "org-hvcg",
        "allowedClientIds": ["ACCG01"],
        "roles": ["HVCG Team Member"],
        "environment": "production",
    }
    p.update(overrides)
    return p


class ProductionManagedIdentityAuthTests(unittest.TestCase):
    def test_01_correct_app_only_token_accepted(self) -> None:
        caller = validate_entra_access_token(_prod_cfg(), _token())
        self.assertEqual(caller["mode"], "entra-v2-app-only")
        self.assertEqual(caller["oid"], CALLER_OID)
        self.assertIn(ROLE, caller["roles"])
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {_token()}", "x-correlation-id": "CORR-MI-01"},
            json={"op": "security.ping", "principal": _principal(), "payload": {}},
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertTrue(res.json().get("ok"))

    def test_02_wrong_tenant_denied(self) -> None:
        token = _token(_claims(tid="22222222-2222-2222-2222-222222222222"))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("tenant", ctx.exception.message)

    def test_03_wrong_audience_denied(self) -> None:
        token = _token(_claims(aud="99999999-9999-4999-8999-999999999999"))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("audience", ctx.exception.message)

    def test_04_wrong_caller_oid_denied(self) -> None:
        token = _token(_claims(oid="dddddddd-eeee-4fff-8000-111111111111"))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("unauthorized Hub caller", ctx.exception.message)

    def test_05_wrong_client_actor_azp_denied(self) -> None:
        token = _token(_claims(azp="eeeeeeee-ffff-4000-8000-222222222222"))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("unauthorized Hub caller", ctx.exception.message)

    def test_06_missing_required_app_role_denied(self) -> None:
        token = _token(_claims(roles=[]))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("missing required app role", ctx.exception.message)

    def test_07_wrong_app_role_denied(self) -> None:
        token = _token(_claims(roles=["Directory.Read.All"]))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("wrong app role", ctx.exception.message)

    def test_08_delegated_user_token_denied(self) -> None:
        token = _token(_claims(scp="access_as_user", idtyp="user", roles=["HVCG Team Member"]))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("delegated", ctx.exception.message)

    def test_09_token_without_app_only_proof_denied(self) -> None:
        token = _token(_claims(idtyp=""))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("app-only", ctx.exception.message)

    def test_10_v1_shaped_token_denied(self) -> None:
        claims = _claims(ver="1.0")
        claims.pop("azp", None)
        claims["appid"] = AZP
        token = _token(claims)
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("token version", ctx.exception.message)

    def test_11_v2_shaped_token_accepted(self) -> None:
        caller = validate_entra_access_token(_prod_cfg(), _token(_claims(ver="2.0")))
        self.assertEqual(caller["ver"], "2.0")
        self.assertEqual(caller["azp"], AZP)

    def test_12_expired_token_denied(self) -> None:
        now = int(time.time())
        token = _token(_claims(nbf=now - 1200, iat=now - 1200, exp=now - 60))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("expired", ctx.exception.message)

    def test_13_not_before_token_denied(self) -> None:
        now = int(time.time())
        token = _token(_claims(nbf=now + 600, iat=now, exp=now + 1200))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("not yet valid", ctx.exception.message)

    def test_14_malformed_token_denied(self) -> None:
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), "not-a-jwt")
        self.assertIn("malformed", ctx.exception.message)

    def test_15_unsigned_token_denied(self) -> None:
        def _b64url(raw: bytes) -> str:
            return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

        header = _b64url(json.dumps({"alg": "none", "typ": "JWT"}, separators=(",", ":")).encode())
        payload = _b64url(json.dumps(_claims(), separators=(",", ":")).encode())
        token = f"{header}.{payload}."
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("unsigned", ctx.exception.message)

    def test_16_wrong_signing_key_denied(self) -> None:
        token = _token(_claims(), key=OTHER_PRIVATE_PEM)
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("signing key", ctx.exception.message)

    def test_17_principal_projection_client_mismatch_denied(self) -> None:
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {_token()}"},
            json={
                "op": "doc.access",
                "principal": _principal(allowedClientIds=["ACCG01"]),
                "payload": {
                    "client": "LIEN01",
                    "document": {
                        "documentId": "D1",
                        "client": "LIEN01",
                        "visibility": "INTERNAL_ONLY",
                        "status": "ACCEPTED",
                    },
                },
            },
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(res.json().get("leakage", False))

    def test_18_wildcard_allowed_clients_denied_in_production(self) -> None:
        from atlas_ba_service.dispatch import validate_principal_projection

        with self.assertRaises(Exception):
            validate_principal_projection(
                _prod_cfg(),
                _principal(roles=["HVCG Owner"], allowedClientIds=["*"]),
            )

    def test_19_anonymous_denied(self) -> None:
        res = _client().post("/dispatch", json={"op": "security.ping", "principal": _principal()})
        self.assertEqual(res.status_code, 401)

    def test_20_test_authenticator_impossible_in_production(self) -> None:
        with self.assertRaises(BaServiceConfigError):
            load_config(_prod_env(BA_TEST_AUTH_TOKEN="nope"))
        with self.assertRaises(BaServiceConfigError):
            load_config(_prod_env(BA_TEST_JWT_HS256_SECRET="nope"))
        with self.assertRaises(BaServiceConfigError):
            load_config(_prod_env(BA_ATLAS_ENV="staging", BA_TEST_AUTH_TOKEN="nope"))
        cfg = _prod_cfg()
        self.assertEqual(cfg.test_auth_token, "")
        self.assertEqual(cfg.test_jwt_hs256_secret, "")
        with self.assertRaises(BaAuthError):
            authenticate_request(
                replace(cfg, test_auth_token="injected"),
                authorization="Bearer injected",
            )

    def test_azp_alone_is_not_sufficient(self) -> None:
        token = _token(_claims(oid="dddddddd-eeee-4fff-8000-111111111111", azp=AZP))
        with self.assertRaises(BaAuthError):
            validate_entra_access_token(_prod_cfg(), token)

    def test_missing_azp_on_v2_token_denied(self) -> None:
        token = _token(_claims(azp=""))
        with self.assertRaises(BaAuthError) as ctx:
            validate_entra_access_token(_prod_cfg(), token)
        self.assertIn("v2 caller", ctx.exception.message)

    def test_production_requires_caller_oid_not_only_azp(self) -> None:
        env = _prod_env()
        env.pop("BA_AUTHORIZED_CALLER_OID")
        env["BA_AUTHORIZED_CALLER_OID"] = ""
        with self.assertRaises(BaServiceConfigError) as ctx:
            load_config(env)
        self.assertIn("BA_AUTHORIZED_CALLER_OID", str(ctx.exception))

    def test_production_cannot_disable_idtyp(self) -> None:
        with self.assertRaises(BaServiceConfigError):
            load_config(_prod_env(BA_REQUIRE_IDTYP="false"))

    def test_production_rejects_v1_token_version_config(self) -> None:
        with self.assertRaises(BaServiceConfigError):
            load_config(_prod_env(BA_ACCESS_TOKEN_VERSION="1"))

    def test_verify_key_cannot_come_from_environment(self) -> None:
        with self.assertRaises(BaServiceConfigError) as ctx:
            load_config(_prod_env(BA_JWT_VERIFY_KEY=PUBLIC_PEM))
        self.assertIn("JWKS", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
