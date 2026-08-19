#!/usr/bin/env python3
"""Tests for agent-comms ↔ orchestration heartbeat bridge."""

from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
sys.path.insert(0, str(ROOT / "scripts" / "orchestration" / "lib"))

import atlas_orch as orch  # noqa: E402
import orch_heartbeat_bridge as bridge  # noqa: E402


class BridgeTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp())
        (self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "queue" / "tasks").mkdir(parents=True)
        (self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "locks" / "active").mkdir(parents=True)
        (self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "heartbeats" / "agents").mkdir(parents=True)
        (self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "reviews").mkdir(parents=True)
        (self.tmp / "scripts" / "orchestration" / "lib").mkdir(parents=True)
        # Point bridge at real atlas_orch by copying module path via symlink-like write of stub index files
        shutil.copy(
            ROOT / "scripts" / "orchestration" / "lib" / "atlas_orch.py",
            self.tmp / "scripts" / "orchestration" / "lib" / "atlas_orch.py",
        )
        (self.tmp / ".git").mkdir()
        orch.save_json(
            self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "locks" / "index.json",
            {"activeLockIds": [], "policy": {}},
        )
        orch.save_json(
            self.tmp / "PROJECT_ATLAS" / "ORCHESTRATION" / "heartbeats" / "index.json",
            {"agents": {}},
        )

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp)

    def test_map_comms_status(self) -> None:
        self.assertEqual(bridge.map_comms_status("IN_PROGRESS"), "In Progress")
        self.assertEqual(bridge.map_comms_status("IDLE"), "Idle")
        self.assertEqual(bridge.map_comms_status("Blocked"), "Blocked")

    def test_sync_writes_orchestration_heartbeat_before_ack(self) -> None:
        order: list[str] = []

        def fake_ack(*_a, **_k):
            order.append("ack")
            return {"status": "ACKNOWLEDGED"}

        with mock.patch.object(bridge, "try_ack_comms_message", side_effect=fake_ack):
            result = bridge.sync(
                agent_id="communications",
                status="IN_PROGRESS",
                task="ATLAS-T-1306",
                action="bridge test",
                progress=50.0,
                ack_message="msg-1",
                repo=self.tmp,
            )
            order.insert(0, "orchestrationHeartbeat")

        hb_path = (
            self.tmp
            / "PROJECT_ATLAS"
            / "ORCHESTRATION"
            / "heartbeats"
            / "agents"
            / "communications.json"
        )
        self.assertTrue(hb_path.is_file())
        hb = json.loads(hb_path.read_text(encoding="utf-8"))
        self.assertEqual(hb["currentTask"], "ATLAS-T-1306")
        self.assertEqual(hb["status"], "In Progress")
        self.assertEqual(hb["currentAction"], "bridge test")
        self.assertEqual(result["order"], ["orchestrationHeartbeat", "ack"])
        self.assertEqual(order, ["orchestrationHeartbeat", "ack"])
        self.assertEqual(result["ack"]["status"], "ACKNOWLEDGED")

    def test_sync_without_ack(self) -> None:
        result = bridge.sync(
            agent_id="communications",
            status="Idle",
            action="awaiting Ready queue",
            repo=self.tmp,
        )
        self.assertIsNone(result["ack"])
        self.assertEqual(result["orchestrationHeartbeat"]["status"], "Idle")


if __name__ == "__main__":
    unittest.main()
