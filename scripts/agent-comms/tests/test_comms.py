#!/usr/bin/env python3
"""Tests for HVCG agent communications."""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))

from comms import AgentComms, CommsError, iso_now  # noqa: E402


class CommsTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = Path(tempfile.mkdtemp(prefix="hvcg-comms-"))
        self.comms = AgentComms(self.tmp)
        self.comms.bootstrap()
        for agent in self.comms.load_registry()["agents"]:
            self.comms.heartbeat(agent, status="IN_PROGRESS")

    def tearDown(self) -> None:
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_bootstrap_creates_structure(self) -> None:
        for agent in ("master-pm", "crm", "executive", "operations", "finance", "client-portal", "ai-governance", "integration"):
            self.assertTrue((self.tmp / ".agent-comms" / "inbox" / agent).is_dir())
            self.assertTrue((self.tmp / ".agent-comms" / "outbox" / agent).is_dir())
        self.assertTrue((self.tmp / ".agent-comms" / "registry.json").exists())
        self.assertTrue((self.tmp / ".agent-comms" / "templates" / "message.json").exists())

    def test_send_and_receive(self) -> None:
        msg = self.comms.send_message(
            from_agent="crm",
            to=["master-pm"],
            subject="Hello",
            body="CRM online",
            msg_type="INFO",
        )
        inbox = self.comms.read_inbox("master-pm")
        self.assertEqual(len(inbox), 1)
        self.assertEqual(inbox[0]["messageId"], msg["messageId"])
        outbox = list((self.tmp / ".agent-comms" / "outbox" / "crm").glob("*.json"))
        self.assertEqual(len(outbox), 1)

    def test_acknowledgement_updates_original(self) -> None:
        msg = self.comms.send_message(
            from_agent="master-pm",
            to=["crm"],
            subject="Please ACK",
            body="Confirm receipt",
            requires_acknowledgement=True,
        )
        result = self.comms.ack_message("crm", msg["messageId"], note="Got it")
        self.assertEqual(result["ack"]["type"], "ACK")
        updated = self.comms.find_messages_by_id(msg["messageId"])
        self.assertTrue(all(m["status"] == "ACKNOWLEDGED" for _, m in updated))

    def test_threaded_replies(self) -> None:
        msg = self.comms.send_message(
            from_agent="operations",
            to=["master-pm"],
            subject="Need guidance",
            body="Question",
            msg_type="REQUEST",
        )
        reply = self.comms.reply_message("master-pm", msg["messageId"], body="Proceed with Option A")
        self.assertEqual(reply["threadId"], msg["threadId"])
        self.assertEqual(reply["replyTo"], msg["messageId"])

    def test_duplicate_prevention(self) -> None:
        mid = "11111111-1111-1111-1111-111111111111"
        self.comms.send_message(
            from_agent="crm",
            to=["master-pm"],
            subject="Once",
            body="Once",
            message_id=mid,
        )
        with self.assertRaises(CommsError):
            self.comms.send_message(
                from_agent="crm",
                to=["master-pm"],
                subject="Twice",
                body="Twice",
                message_id=mid,
            )

    def test_atomic_writes(self) -> None:
        msg = self.comms.send_message(
            from_agent="finance",
            to=["master-pm"],
            subject="Atomic",
            body="complete",
        )
        path = next((self.tmp / ".agent-comms" / "inbox" / "master-pm").glob("*.json"))
        # File must be valid JSON, no temp leftovers
        with path.open() as fh:
            data = json.load(fh)
        self.assertEqual(data["messageId"], msg["messageId"])
        temps = list((self.tmp / ".agent-comms").rglob("*.tmp"))
        self.assertEqual(temps, [])

    def test_automatic_escalation_blocker(self) -> None:
        msg = self.comms.send_message(
            from_agent="finance",
            to=["operations"],
            subject="Blocked on vendor list",
            body="Cannot proceed",
            msg_type="BLOCKER",
            priority="HIGH",
        )
        self.assertIn("master-pm", msg["cc"] + msg["to"])
        pm_inbox = self.comms.read_inbox("master-pm")
        self.assertTrue(any(m["messageId"] == msg["messageId"] for m in pm_inbox))

    def test_automatic_escalation_decision(self) -> None:
        msg = self.comms.send_message(
            from_agent="executive",
            to=["operations"],
            subject="Choose KPI set",
            body="A or B",
            msg_type="DECISION",
        )
        self.assertIn("master-pm", msg["cc"] + msg["to"])

    def test_conflict_detection(self) -> None:
        # Give two agents overlapping ownership on a path used in the message
        self.comms.register_agent(
            "crm",
            owned_paths=["docs/shared/STATUS.md"],
            status="IN_PROGRESS",
        )
        self.comms.register_agent(
            "operations",
            owned_paths=["docs/shared/STATUS.md"],
            status="IN_PROGRESS",
        )
        msg = self.comms.send_message(
            from_agent="crm",
            to=["operations"],
            subject="Editing shared status",
            body="Touching shared file",
            related_files=["docs/shared/STATUS.md"],
        )
        self.assertEqual(msg["type"], "CONFLICT")
        self.assertIn("master-pm", msg["cc"] + msg["to"])
        self.assertIn("integration", msg["cc"] + msg["to"])

    def test_stale_heartbeat_detection(self) -> None:
        registry = self.comms.load_registry()
        old = (datetime.now(timezone.utc) - timedelta(minutes=45)).strftime("%Y-%m-%dT%H:%M:%SZ")
        registry["agents"]["ai-governance"]["status"] = "IN_PROGRESS"
        registry["agents"]["ai-governance"]["lastHeartbeat"] = old
        self.comms.save_registry(registry)
        agents = self.comms.list_agents()
        stale = [a for a in agents if a["agentId"] == "ai-governance"][0]
        self.assertTrue(stale["stale"])
        # Fresh heartbeat clears stale
        self.comms.heartbeat("ai-governance")
        fresh = [a for a in self.comms.list_agents() if a["agentId"] == "ai-governance"][0]
        self.assertFalse(fresh["stale"])

    def test_lock_acquisition(self) -> None:
        lock = self.comms.acquire_lock(
            "crm",
            ["docs/crm/OPPORTUNITY_MANAGEMENT.md"],
            reason="Updating acceptance report refs",
            ttl_minutes=30,
        )
        self.assertEqual(lock["owner"], "crm")
        self.assertIn("expiresAt", lock)
        locks = self.comms.list_locks()
        self.assertEqual(len(locks), 1)

    def test_lock_collision(self) -> None:
        self.comms.acquire_lock("crm", ["docs/crm/foo.md"], reason="crm edit")
        with self.assertRaises(CommsError):
            self.comms.acquire_lock("operations", ["docs/crm/foo.md"], reason="ops edit")

    def test_archive_behavior(self) -> None:
        msg = self.comms.send_message(
            from_agent="crm",
            to=["master-pm"],
            subject="Done",
            body="Complete",
        )
        self.comms.resolve_message("master-pm", msg["messageId"], resolution="Closed")
        # Mark original resolved already done by resolve_message
        archived = self.comms.archive_resolved()
        self.assertTrue(len(archived) >= 1)
        # Archive keeps copy; nothing permanently deleted from archive
        archived_files = list((self.tmp / ".agent-comms" / "archive").rglob("*.json"))
        self.assertTrue(archived_files)
        for path in archived_files:
            self.assertTrue(path.exists())
            json.loads(path.read_text())

    def test_critical_creates_event(self) -> None:
        msg = self.comms.send_message(
            from_agent="crm",
            to=["master-pm"],
            subject="Critical outage signal",
            body="Simulated",
            priority="CRITICAL",
            msg_type="BLOCKER",
        )
        events = list((self.tmp / ".agent-comms" / "events").glob("*.json"))
        self.assertTrue(any(msg["messageId"][:8] in e.name for e in events))

    def test_watch_inbox_non_consuming(self) -> None:
        self.comms.send_message(
            from_agent="crm",
            to=["master-pm"],
            subject="Watch me",
            body="Still here",
        )
        before = list((self.tmp / ".agent-comms" / "inbox" / "master-pm").glob("*.json"))
        self.comms.watch_inbox("master-pm", once=True)
        after = list((self.tmp / ".agent-comms" / "inbox" / "master-pm").glob("*.json"))
        self.assertEqual(len(before), len(after))

    def test_secret_rejection(self) -> None:
        with self.assertRaises(CommsError):
            self.comms.send_message(
                from_agent="crm",
                to=["master-pm"],
                subject="creds",
                body="password=SuperSecret123",
            )


if __name__ == "__main__":
    unittest.main()
