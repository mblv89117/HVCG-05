"""Deterministic BA service contract tests. Synthetic data only."""

from __future__ import annotations

import os
import sys
import time
import unittest
from pathlib import Path

import jwt
from starlette.testclient import TestClient

ROOT = Path(__file__).resolve().parents[3]
SERVICE_ROOT = ROOT / "apps" / "atlas-business-analyst-service"
BUSINESS = ROOT / "config" / "business"
sys.path.insert(0, str(SERVICE_ROOT))

from atlas_ba_service.app import create_app  # noqa: E402
from atlas_ba_service.config import BaServiceConfigError, load_config  # noqa: E402
from atlas_ba_service.dispatch import validate_principal_projection  # noqa: E402

HS_SECRET = "ba-test-hs256-not-for-production"
TENANT = "11111111-1111-1111-1111-111111111111"
AUDIENCE = "api://ba-test-audience"
AZP = "hub-test-azp"


def _env(**overrides: str) -> dict[str, str]:
    base = {
        "BA_ATLAS_ENV": "test",
        "BA_REQUIRE_AUTH": "true",
        "BA_ENTRA_TENANT_ID": TENANT,
        "BA_API_AUDIENCE": AUDIENCE,
        "BA_AUTHORIZED_AZP": AZP,
        "BA_AUTHORIZED_CALLER_OID": "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff",
        "BA_REQUIRED_APP_ROLE": "Atlas.BA.Invoke",
        "BA_TEST_JWT_HS256_SECRET": HS_SECRET,
        "HVCG_BA_BUSINESS_DIR": str(BUSINESS),
        "LOCAL_AI_ENABLED": "false",
        "BA_QBO_ENABLED": "false",
    }
    base.update(overrides)
    return base


def _cfg(**overrides: str):
    return load_config(_env(**overrides))


def _client(**overrides: str) -> TestClient:
    return TestClient(create_app(_cfg(**overrides)))


def _jwt(*, aud: str = AUDIENCE, tid: str = TENANT, azp: str = AZP, exp_offset: int = 600) -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "aud": aud,
            "tid": tid,
            "azp": azp,
            "exp": now + exp_offset,
            "iat": now,
            "iss": f"https://login.microsoftonline.com/{tid}/v2.0",
        },
        HS_SECRET,
        algorithm="HS256",
    )


def _principal(**overrides):
    p = {
        "userId": "oid-user-1",
        "email": "analyst@example.invalid",
        "organizationId": "org-hvcg",
        "allowedClientIds": ["ACCG01"],
        "roles": ["HVCG Team Member"],
        "environment": "test",
    }
    p.update(overrides)
    return p


class BaServiceContractTests(unittest.TestCase):
    def test_01_health(self) -> None:
        res = _client().get("/health")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["service"], "atlas-business-analyst")
        self.assertEqual(body["localAi"]["enabled"], False)
        self.assertEqual(body["qbo"]["enabled"], False)

    def test_02_valid_authenticated_dispatch(self) -> None:
        token = _jwt()
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}", "x-correlation-id": "CORR-TEST-02"},
            json={"op": "security.ping", "principal": _principal(), "payload": {}},
        )
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["status"], "SUCCESS")
        self.assertEqual(body["correlationId"], "CORR-TEST-02")

    def test_03_anonymous_denied(self) -> None:
        res = _client().post("/dispatch", json={"op": "security.ping", "principal": _principal()})
        self.assertEqual(res.status_code, 401)
        self.assertFalse(res.json()["ok"])

    def test_04_wrong_audience_denied(self) -> None:
        token = _jwt(aud="api://wrong-audience")
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}"},
            json={"op": "security.ping", "principal": _principal()},
        )
        self.assertEqual(res.status_code, 401)
        self.assertIn("audience", res.json()["message"])

    def test_05_wrong_tenant_denied(self) -> None:
        token = _jwt(tid="22222222-2222-2222-2222-222222222222")
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}"},
            json={"op": "security.ping", "principal": _principal()},
        )
        self.assertEqual(res.status_code, 401)
        self.assertIn("tenant", res.json()["message"])

    def test_06_unauthorized_hub_caller_denied(self) -> None:
        token = _jwt(azp="elite-spa-not-hub")
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}"},
            json={"op": "security.ping", "principal": _principal()},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("unauthorized Hub caller", res.json()["message"])

    def test_07_malformed_json_denied(self) -> None:
        token = _jwt()
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}", "content-type": "application/json"},
            content=b"{not-json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["message"], "malformed_json")

    def test_08_oversized_input_denied(self) -> None:
        token = _jwt()
        huge = {"op": "security.ping", "principal": _principal(), "payload": {"blob": "x" * 70_000}}
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}"},
            json=huge,
        )
        self.assertEqual(res.status_code, 413)

    def test_09_invalid_operation(self) -> None:
        token = _jwt()
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}"},
            json={"op": "not.a.real.op", "principal": _principal(), "payload": {}},
        )
        self.assertEqual(res.status_code, 403)
        self.assertFalse(res.json()["ok"])

    def test_10_correlation_id_propagation(self) -> None:
        token = _jwt()
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}", "x-correlation-id": "CORR-PROP-10"},
            json={"op": "security.ping", "principal": _principal(), "payload": {}, "correlationId": "BODY-IGNORED-IF-HEADER"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["correlationId"], "CORR-PROP-10")
        self.assertEqual(res.headers.get("x-correlation-id"), "CORR-PROP-10")

    def test_11_stateless_operation_success(self) -> None:
        token = _jwt()
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}"},
            json={"op": "gates.registry", "principal": _principal(), "payload": {}},
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertTrue(res.json().get("ok"))
        self.assertIn("gates", res.json())

    def test_12_production_data_write_blocked(self) -> None:
        with self.assertRaises(BaServiceConfigError):
            load_config(
                _env(
                    BA_ATLAS_ENV="production",
                    BA_TEST_JWT_HS256_SECRET=HS_SECRET,
                )
            )
        # Engine-level production persist: set BA_ATLAS_ENV for dispatch process
        prev = os.environ.get("BA_ATLAS_ENV")
        os.environ["BA_ATLAS_ENV"] = "production"
        try:
            sys.path.insert(0, str(BUSINESS))
            import atlas_security as sec

            out = sec.dispatch_ba_request(
                {
                    "op": "lead.create",
                    "principal": _principal(environment="production", roles=["HVCG Owner"], allowedClientIds=["ACCG01"]),
                    "payload": {"title": "Synthetic Co"},
                    "correlationId": "CORR-PROD-LEAD",
                }
            )
            self.assertFalse(out.get("ok"))
            self.assertEqual(out.get("status"), "PRODUCTION_GATED")
        finally:
            if prev is None:
                os.environ.pop("BA_ATLAS_ENV", None)
            else:
                os.environ["BA_ATLAS_ENV"] = prev

    def test_13_production_local_ai_absent(self) -> None:
        with self.assertRaises(BaServiceConfigError) as ctx:
            load_config(
                _env(
                    BA_ATLAS_ENV="production",
                    BA_TEST_JWT_HS256_SECRET="",
                    LOCAL_AI_ENABLED="true",
                )
            )
        self.assertIn("local AI", str(ctx.exception))
        cfg = load_config(
            _env(
                BA_ATLAS_ENV="production",
                BA_TEST_JWT_HS256_SECRET="",
                LOCAL_AI_ENABLED="false",
            )
        )
        self.assertFalse(cfg.local_ai_enabled)

    def test_14_production_qbo_absent(self) -> None:
        with self.assertRaises(BaServiceConfigError) as ctx:
            load_config(
                _env(
                    BA_ATLAS_ENV="production",
                    BA_TEST_JWT_HS256_SECRET="",
                    BA_QBO_ENABLED="true",
                )
            )
        self.assertIn("QBO", str(ctx.exception))
        cfg = load_config(_env(BA_ATLAS_ENV="production", BA_TEST_JWT_HS256_SECRET="", BA_QBO_ENABLED="false"))
        self.assertFalse(cfg.qbo_enabled)

    def test_15_client_context_mismatch_denied(self) -> None:
        token = _jwt()
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}"},
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
        self.assertIn(res.json().get("status"), ("WRONG_CLIENT", "BLOCKED_PERMISSION", "FORBIDDEN"))
        self.assertFalse(res.json().get("leakage", False))

    def test_16_owner_admin_not_wildcard(self) -> None:
        cfg = _cfg(BA_ATLAS_ENV="production", BA_TEST_JWT_HS256_SECRET="")
        with self.assertRaises(Exception):
            validate_principal_projection(
                cfg,
                _principal(roles=["HVCG Owner"], allowedClientIds=["*"], environment="production"),
            )
        with self.assertRaises(Exception):
            validate_principal_projection(
                cfg,
                _principal(roles=["Administrator"], allowedClientIds=["*"], environment="production"),
            )
        accepted = validate_principal_projection(
            cfg,
            _principal(roles=["HVCG Owner"], allowedClientIds=["ACCG01"], environment="production"),
        )
        self.assertEqual(accepted["allowedClientIds"], ["ACCG01"])
        self.assertNotIn("*", accepted["allowedClientIds"])

    def test_23_no_developer_machine_paths(self) -> None:
        banned = ("/Users/", "/Volumes/")
        runtime = SERVICE_ROOT / "atlas_ba_service"
        for path in runtime.rglob("*.py"):
            text = path.read_text(encoding="utf-8")
            for needle in banned:
                self.assertNotIn(needle, text, f"{path} contains a workstation path prefix")

    def test_25_secret_scan(self) -> None:
        needles = ("IDENTITY_HEADER", "BEGIN PRIVATE KEY", "swa-deploy-token", "eyJhbGciOi")
        for path in (SERVICE_ROOT / "atlas_ba_service").rglob("*.py"):
            text = path.read_text(encoding="utf-8")
            for needle in needles:
                self.assertNotIn(needle, text, f"{path} contains {needle}")

    def test_production_missing_auth_config_fails_closed(self) -> None:
        with self.assertRaises(BaServiceConfigError):
            load_config(
                {
                    "BA_ATLAS_ENV": "production",
                    "HVCG_BA_BUSINESS_DIR": str(BUSINESS),
                }
            )

    def test_x_atlas_headers_are_not_trust(self) -> None:
        token = _jwt()
        res = _client().post(
            "/dispatch",
            headers={
                "authorization": f"Bearer {token}",
                "x-atlas-roles": "Administrator",
                "x-atlas-client-ids": "*",
            },
            json={
                "op": "doc.access",
                "principal": _principal(roles=["HVCG Team Member"], allowedClientIds=["ACCG01"]),
                "payload": {
                    "client": "LIEN01",
                    "document": {"documentId": "D1", "client": "LIEN01", "visibility": "INTERNAL_ONLY", "status": "ACCEPTED"},
                },
            },
        )
        self.assertEqual(res.status_code, 403)

    def test_freefit_definition_stateless(self) -> None:
        token = _jwt()
        res = _client().post(
            "/dispatch",
            headers={"authorization": f"Bearer {token}"},
            json={"op": "freefit.definition", "principal": _principal(), "payload": {}},
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertTrue(res.json().get("ok"))


if __name__ == "__main__":
    unittest.main()
