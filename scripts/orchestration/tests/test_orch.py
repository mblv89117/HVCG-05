#!/usr/bin/env python3
"""Unit tests for Atlas orchestration task engine."""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))

import atlas_orch as orch  # noqa: E402


class OrchTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        # Minimal orch tree
        (self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "queue" / "tasks").mkdir(parents=True)
        (self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "locks" / "active").mkdir(parents=True)
        (self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "heartbeats" / "agents").mkdir(parents=True)
        (self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "reviews").mkdir(parents=True)
        (self.tmp / ".git").mkdir()
        task = {
            "id": "ATLAS-T-9999",
            "sprint": 99,
            "title": "Test task",
            "description": "d",
            "assignedAgent": "elite-ui",
            "priority": "P1",
            "status": "Ready",
            "dependencies": [],
            "affectedPaths": ["apps/atlas-elite-os/"],
            "acceptanceCriteria": ["done"],
            "commitReferences": [],
            "artifacts": [],
        }
        orch.save_json(
            self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "queue" / "tasks" / "ATLAS-T-9999.json",
            task,
        )
        orch.save_json(
            self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "locks" / "index.json",
            {"activeLockIds": [], "policy": {}},
        )
        orch.save_json(
            self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "reviews" / "queue.json",
            {"waiting": []},
        )

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp)

    def test_claim_start_complete(self) -> None:
        t = orch.claim_task(self.tmp, "ATLAS-T-9999", "elite-ui", branch="cursor/test")
        self.assertEqual(t["status"], "Claimed")
        t = orch.start_task(self.tmp, "ATLAS-T-9999", "elite-ui")
        self.assertEqual(t["status"], "In Progress")
        orch.heartbeat(self.tmp, "elite-ui", current_task="ATLAS-T-9999", action="testing")
        hb = orch.load_json(
            self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "heartbeats" / "agents" / "elite-ui.json"
        )
        self.assertEqual(hb["currentTask"], "ATLAS-T-9999")
        t = orch.complete_task(self.tmp, "ATLAS-T-9999", "elite-ui", summary="ok", commits=["abc"])
        self.assertEqual(t["status"], "Waiting Review")
        locks = list((self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "locks" / "active").glob("LOCK-*.json"))
        self.assertGreaterEqual(len(locks), 1)

    def test_claim_wrong_agent(self) -> None:
        with self.assertRaises(SystemExit):
            orch.claim_task(self.tmp, "ATLAS-T-9999", "azure-platform")

    def test_allocate_branch_unique_pattern(self) -> None:
        sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
        import git_worktree_guard as gwg  # noqa: E402

        name = gwg.allocate_branch_name("documentation", "onboarding", "ATLAS-T-1305")
        self.assertEqual(name, "cursor/documentation/onboarding-atlas-t-1305")
        self.assertIn("documentation", gwg.suggest_worktree_path("documentation", "onboarding"))


if __name__ == "__main__":
    unittest.main()
