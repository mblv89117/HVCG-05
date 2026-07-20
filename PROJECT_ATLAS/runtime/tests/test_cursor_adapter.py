#!/usr/bin/env python3
"""Unit tests for Cursor Cloud adapter (mocked HTTP)."""

from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

RUNTIME = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RUNTIME))

from adapters.cursor.client import CursorApiError, CursorCloudClient, load_api_key
from adapters.cursor.dispatcher import build_create_payload, dispatch_task


class TestLoadApiKey(unittest.TestCase):
    def test_env_wins(self):
        with patch.dict("os.environ", {"CURSOR_API_KEY": "test-key-123"}, clear=False):
            self.assertEqual(load_api_key(secrets_dir=Path("/nonexistent")), "test-key-123")

    def test_file_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "cursor_api_key"
            p.write_text("file-key\n", encoding="utf-8")
            with patch.dict("os.environ", {}, clear=True):
                # Ensure env key absent
                import os

                os.environ.pop("CURSOR_API_KEY", None)
                with patch("subprocess.run") as run:
                    run.return_value = MagicMock(returncode=1, stdout="")
                    self.assertEqual(load_api_key(secrets_dir=Path(tmp)), "file-key")


class TestBuildPayload(unittest.TestCase):
    def test_work_on_required_branch(self):
        task = {
            "taskId": "ATLAS-R-001",
            "title": "Validate",
            "assignedRole": "documentation-manager",
            "repoUrl": "https://github.com/mblv89117/HVCG-05",
            "requiredBranch": "cursor/documentation-manager/runtime-validation-ATLAS-R-001",
            "authorizedPaths": ["PROJECT_ATLAS/ORCHESTRATION/runtime-validation.md"],
            "prompt": "do the thing",
            "workOnCurrentBranch": True,
            "autoCreatePR": False,
            "model": "composer-2.5",
            "dispatch": {"method": "cursor-cloud-agents-api"},
        }
        payload = build_create_payload(task)
        self.assertTrue(payload["workOnCurrentBranch"])
        self.assertFalse(payload["autoCreatePR"])
        self.assertEqual(
            payload["repos"][0]["startingRef"],
            "cursor/documentation-manager/runtime-validation-ATLAS-R-001",
        )
        self.assertEqual(payload["model"]["id"], "composer-2.5")


class TestDispatchMocked(unittest.TestCase):
    def test_happy_path_records_run(self):
        task = {
            "taskId": "ATLAS-R-001",
            "title": "Validate Cursor Cloud Agent Dispatch",
            "assignedRole": "documentation-manager",
            "repoUrl": "https://github.com/mblv89117/HVCG-05",
            "requiredBranch": "cursor/documentation-manager/runtime-validation-ATLAS-R-001",
            "authorizedPaths": ["PROJECT_ATLAS/ORCHESTRATION/runtime-validation.md"],
            "prompt": "create runtime-validation.md only",
            "workOnCurrentBranch": True,
            "autoCreatePR": False,
            "dispatch": {
                "method": "cursor-cloud-agents-api",
                "pollIntervalSeconds": 0.01,
                "timeoutSeconds": 5,
            },
        }
        client = MagicMock()
        client.create_agent.return_value = {
            "agent": {
                "id": "bc-11111111-1111-1111-1111-111111111111",
                "url": "https://cursor.com/agents/bc-11111111-1111-1111-1111-111111111111",
                "latestRunId": "run-22222222-2222-2222-2222-222222222222",
            },
            "run": {
                "id": "run-22222222-2222-2222-2222-222222222222",
                "status": "CREATING",
            },
        }
        client.get_run.return_value = {
            "id": "run-22222222-2222-2222-2222-222222222222",
            "agentId": "bc-11111111-1111-1111-1111-111111111111",
            "status": "FINISHED",
            "durationMs": 12000,
            "result": "Created runtime-validation.md",
            "git": {
                "branches": [
                    {
                        "repoUrl": "github.com/mblv89117/HVCG-05",
                        "branch": "cursor/documentation-manager/runtime-validation-ATLAS-R-001",
                    }
                ]
            },
        }

        with tempfile.TemporaryDirectory() as tmp:
            runs = Path(tmp) / "runs"
            result = dispatch_task(
                task,
                client=client,
                api_key="unused",
                runs_dir=runs,
                poll=True,
            )
            self.assertEqual(result["status"], "finished")
            self.assertEqual(result["cloudAgentId"], "bc-11111111-1111-1111-1111-111111111111")
            self.assertEqual(result["cloudRunId"], "run-22222222-2222-2222-2222-222222222222")
            saved = json.loads((runs / "ATLAS-R-001.json").read_text(encoding="utf-8"))
            self.assertEqual(saved["status"], "finished")

    def test_missing_key_blocks(self):
        task = {
            "taskId": "ATLAS-R-999",
            "title": "x",
            "assignedRole": "documentation-manager",
            "repoUrl": "https://github.com/mblv89117/HVCG-05",
            "requiredBranch": "cursor/x",
            "authorizedPaths": ["a.md"],
            "prompt": "x",
            "dispatch": {"method": "cursor-cloud-agents-api"},
        }
        with tempfile.TemporaryDirectory() as tmp:
            with patch(
                "adapters.cursor.dispatcher.load_api_key",
                side_effect=CursorApiError("CURSOR_API_KEY not found"),
            ):
                result = dispatch_task(task, runs_dir=Path(tmp), poll=False)
            self.assertEqual(result["status"], "blocked")


if __name__ == "__main__":
    unittest.main()
