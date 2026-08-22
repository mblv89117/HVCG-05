"""Production persistence policy tests for canonical BA engines."""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "config" / "business"))

import atlas_security as sec  # noqa: E402
import runtime_env as runtime  # noqa: E402


def _principal(**kw):
    d = dict(
        userId="u1",
        email="u1@hvcg.test",
        organizationId="org-hvcg",
        allowedClientIds=["ACCG01"],
        roles=["HVCG Owner"],
        environment="production",
    )
    d.update(kw)
    return d


class ProductionPersistTests(unittest.TestCase):
    def setUp(self) -> None:
        self.prev = os.environ.get("BA_ATLAS_ENV")
        os.environ["BA_ATLAS_ENV"] = "production"

    def tearDown(self) -> None:
        if self.prev is None:
            os.environ.pop("BA_ATLAS_ENV", None)
        else:
            os.environ["BA_ATLAS_ENV"] = self.prev

    def test_lead_create_gated(self) -> None:
        out = sec.dispatch_ba_request(
            {"op": "lead.create", "principal": _principal(), "payload": {"title": "Synthetic"}, "correlationId": "T1"}
        )
        self.assertEqual(out["status"], "PRODUCTION_GATED")
        self.assertFalse(out["ok"])

    def test_wildcard_owner_rejected(self) -> None:
        mapped = sec.map_hub_principal(_principal(allowedClientIds=["*"]))
        self.assertFalse(mapped.get("ok"))
        self.assertEqual(mapped.get("status"), "FORBIDDEN")

    def test_dev_environment_rejected(self) -> None:
        mapped = sec.map_hub_principal(_principal(environment="DEV"))
        self.assertFalse(mapped.get("ok"))

    def test_stateless_ping_ok(self) -> None:
        out = sec.dispatch_ba_request(
            {"op": "security.ping", "principal": _principal(), "payload": {}, "correlationId": "T-PING"}
        )
        self.assertTrue(out.get("ok"))
        self.assertEqual(out.get("environment"), "production")
        self.assertNotEqual(str(out.get("environment")).upper(), "DEV")

    def test_file_audit_sink_blocked(self) -> None:
        import atlas_staging_readiness as staging

        with self.assertRaises(runtime.ProductionPersistBlocked):
            staging.ensure_audit_sink()


if __name__ == "__main__":
    unittest.main()
