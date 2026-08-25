"""Owner UAT automated preflight regression."""

from __future__ import annotations

import os
import unittest
import urllib.request

import owner_uat as uat


def _up(url: str) -> bool:
    try:
        with urllib.request.urlopen(url.rstrip("/") + "/health", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


class OwnerUatPreflightTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.hub = os.environ.get("ATLAS_HUB_E2E_URL", "http://127.0.0.1:8792")
        cls.auth = os.environ.get("ATLAS_HUB_AUTH_URL", "http://127.0.0.1:8793")
        cls.live = _up(cls.hub) and _up(cls.auth)

    def test_preflight_and_scenarios(self) -> None:
        if not self.live:
            self.skipTest("UAT Hubs not running")
        os.environ["ATLAS_HUB_E2E_URL"] = self.hub
        os.environ["ATLAS_HUB_AUTH_URL"] = self.auth
        pre = uat.run_preflight()
        self.assertTrue(all(r["result"] == "PRECHECK_PASS" for r in pre), pre)
        scenarios = uat.run_automated_uat_scenarios()
        self.assertEqual(len(scenarios), 18)
        self.assertTrue(all(s["automatedPrecheck"] == "PRECHECK_PASS" for s in scenarios))
        self.assertTrue(all(s["ownerResult"] == "OWNER_ACTION_REQUIRED" for s in scenarios))
        outcome = uat.uat_outcome(scenarios)
        self.assertEqual(outcome["outcome"], "OWNER_UAT_PARTIAL")
        self.assertFalse(outcome["readyForWrittenQaReview"])
        self.assertEqual(uat.environment_record()["qboAuthoritativeSource"], "OWNER_PENDING")


if __name__ == "__main__":
    unittest.main()
