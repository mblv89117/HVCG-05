"""Canonical in-tree BA bridge — no sibling worktree required."""

from __future__ import annotations

import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BRIDGE = ROOT / "config" / "business" / "ba_bridge.py"


class CanonicalBaBridgeTests(unittest.TestCase):
    def test_bridge_exists_in_tree(self) -> None:
        self.assertTrue(BRIDGE.is_file(), f"missing {BRIDGE}")

    def test_security_ping(self) -> None:
        req = {
            "op": "security.ping",
            "principal": {
                "userId": "gate3-test",
                "email": "gate3@example.invalid",
                "organizationId": "org-hvcg",
                "allowedClientIds": ["*"],
                "roles": ["HVCG Owner"],
                "environment": "DEV",
            },
            "payload": {},
            "correlationId": "GATE3-PING",
        }
        proc = subprocess.run(
            [sys.executable, str(BRIDGE)],
            input=json.dumps(req),
            capture_output=True,
            text=True,
            cwd=str(ROOT / "config" / "business"),
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        out = json.loads(proc.stdout.strip().splitlines()[-1])
        self.assertTrue(out.get("ok"), out)
        self.assertEqual(out.get("status"), "SUCCESS")
        self.assertIn("hub→ba_bridge", str(out.get("binding")))

    def test_freefit_definition(self) -> None:
        req = {
            "op": "freefit.definition",
            "principal": {
                "userId": "gate3-test",
                "roles": ["HVCG Owner"],
                "organizationId": "org-hvcg",
                "allowedClientIds": ["*"],
            },
            "payload": {},
        }
        proc = subprocess.run(
            [sys.executable, str(BRIDGE)],
            input=json.dumps(req),
            capture_output=True,
            text=True,
            cwd=str(ROOT / "config" / "business"),
            check=False,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        out = json.loads(proc.stdout.strip().splitlines()[-1])
        self.assertTrue(out.get("ok"), out)
        self.assertGreaterEqual(len(out.get("needOptions") or []), 5)


if __name__ == "__main__":
    unittest.main()
