"""UAT-ENV-002 — Local Owner Dev auth contract (Cases A–G).

Validates Elite source gates and BA security semantics without weakening Production.
"""

from __future__ import annotations

import re
import unittest
from pathlib import Path

BA_ROOT = Path(__file__).resolve().parents[3]
ELITE = BA_ROOT / "apps" / "atlas-elite-os" / "src"
AUTH_TS = BA_ROOT / "apps" / "atlas-integration-api" / "src" / "middleware" / "auth.ts"


class DevOwnerAuthContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.dev_owner = (ELITE / "security" / "devOwnerSession.ts").read_text(encoding="utf-8")
        self.rbac = (ELITE / "security" / "rbac.ts").read_text(encoding="utf-8")
        self.hub_auth = AUTH_TS.read_text(encoding="utf-8") if AUTH_TS.exists() else ""

    def test_case_a_development_local_owner_allowed(self) -> None:
        # Explicit flag OR Vite DEV on local/development
        self.assertIn("VITE_ALLOW_DEV_OWNER_LOGIN", self.dev_owner)
        self.assertIn("import.meta.env.DEV", self.dev_owner)
        self.assertTrue(
            ("env === 'local'" in self.dev_owner)
            or ('env === "local"' in self.dev_owner)
        )

    def test_case_b_production_local_owner_denied(self) -> None:
        self.assertRegex(
            self.dev_owner,
            r"if \(env === ['\"]production['\"] \|\| env === ['\"]staging['\"]\) return false;",
        )

    def test_case_c_missing_entra_does_not_gate_dev_owner(self) -> None:
        fn = re.search(
            r"export function isDevOwnerLoginAllowed\(\)[\s\S]*?\n\}",
            self.dev_owner,
        )
        self.assertIsNotNone(fn)
        body = fn.group(0)  # type: ignore[union-attr]
        self.assertNotIn("VITE_ENTRA", body)
        self.assertNotIn("entraClientId", body)

    def test_case_d_production_fails_closed_without_entra_pattern(self) -> None:
        cfg = (ELITE / "microsoft" / "config.ts").read_text(encoding="utf-8")
        self.assertIn("isEntraConfigured", cfg)
        # Production/staging hard-deny Local Owner
        self.assertIn("staging", self.dev_owner)

    def test_case_e_anonymous_private_access_require_auth(self) -> None:
        req = (ELITE / "security" / "RequireMicrosoftAuth.tsx").read_text(encoding="utf-8")
        self.assertIn("Unauthenticated", req)
        self.assertIn("/access-denied", req)

    def test_case_f_client_isolation_not_bypassed_by_role_alone(self) -> None:
        self.assertIn("allowedClientIds", self.hub_auth)
        sec = (BA_ROOT / "config" / "business" / "atlas_security.py").read_text(encoding="utf-8")
        self.assertIn("require_client_context", sec)
        self.assertIn("lead.create", sec)  # pre-client ops exempt by design

    def test_case_g_owner_support_risk_not_dismantled(self) -> None:
        sec = (BA_ROOT / "config" / "business" / "atlas_security.py").read_text(encoding="utf-8")
        self.assertIn("elevated_risk_access", sec)
        self.assertIn("owner_support_scope", sec)


if __name__ == "__main__":
    unittest.main()
