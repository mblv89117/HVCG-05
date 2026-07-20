"""Dispatch Atlas tasks to Cursor Cloud Agents and record run results."""

from __future__ import annotations

import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .client import CursorApiError, CursorCloudClient, load_api_key

TERMINAL_STATUSES = {"FINISHED", "ERROR", "CANCELLED", "EXPIRED"}


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_create_payload(task: Dict[str, Any]) -> Dict[str, Any]:
    branch = task["requiredBranch"]
    starting = task.get("startingRef") or branch
    payload: Dict[str, Any] = {
        "prompt": {"text": task["prompt"]},
        "name": f"{task['taskId']} {task.get('title', '')}".strip()[:100],
        "repos": [
            {
                "url": task["repoUrl"],
                "startingRef": starting,
            }
        ],
        "workOnCurrentBranch": bool(task.get("workOnCurrentBranch", True)),
        "autoCreatePR": bool(task.get("autoCreatePR", False)),
        "skipReviewerRequest": True,
    }
    model = task.get("model")
    if model:
        payload["model"] = {"id": model}
    return payload


def _git_head_on_branch(repo_root: Path, branch: str) -> Optional[str]:
    try:
        proc = subprocess.run(
            ["git", "ls-remote", "origin", f"refs/heads/{branch}"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0 or not proc.stdout.strip():
            return None
        return proc.stdout.strip().split()[0]
    except Exception:
        return None


def _git_files_changed(repo_root: Path, branch: str, base_ref: str) -> List[str]:
    try:
        proc = subprocess.run(
            ["git", "diff", "--name-only", f"{base_ref}...origin/{branch}"],
            cwd=str(repo_root),
            capture_output=True,
            text=True,
            check=False,
        )
        if proc.returncode != 0:
            return []
        return [line.strip() for line in proc.stdout.splitlines() if line.strip()]
    except Exception:
        return []


def write_run_result(path: Path, result: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")


def poll_until_terminal(
    client: CursorCloudClient,
    agent_id: str,
    run_id: str,
    *,
    interval_seconds: float = 10,
    timeout_seconds: float = 1800,
) -> Dict[str, Any]:
    deadline = time.time() + timeout_seconds
    last: Dict[str, Any] = {}
    while time.time() < deadline:
        last = client.get_run(agent_id, run_id)
        status = str(last.get("status", "")).upper()
        if status in TERMINAL_STATUSES:
            return last
        time.sleep(interval_seconds)
    raise CursorApiError(
        f"Timed out after {timeout_seconds}s waiting for run {run_id}",
        body=last,
    )


def dispatch_task(
    task: Dict[str, Any],
    *,
    client: Optional[CursorCloudClient] = None,
    api_key: Optional[str] = None,
    repo_root: Optional[Path] = None,
    runs_dir: Optional[Path] = None,
    poll: bool = True,
) -> Dict[str, Any]:
    """
    Create a Cloud Agent for the task, optionally poll to completion,
    and write a structured run result under PROJECT_ATLAS/runtime/runs/.
    """
    started = utc_now()
    task_id = task["taskId"]
    role = task["assignedRole"]
    method = task.get("dispatch", {}).get("method", "cursor-cloud-agents-api")
    runs = runs_dir or Path(__file__).resolve().parents[2] / "runs"
    out_path = runs / f"{task_id}.json"

    result: Dict[str, Any] = {
        "taskId": task_id,
        "agentRole": role,
        "dispatchMethod": method,
        "cloudAgentId": None,
        "cloudRunId": None,
        "branch": task.get("requiredBranch"),
        "commitHash": None,
        "filesChanged": [],
        "startedAt": started,
        "endedAt": None,
        "status": "pending",
        "errorDetails": None,
        "agentUrl": None,
        "resultText": None,
        "durationMs": None,
        "raw": {},
    }
    write_run_result(out_path, result)

    try:
        key = api_key or load_api_key()
        cli = client or CursorCloudClient(key)
        payload = build_create_payload(task)
        created = cli.create_agent(payload)
        agent = created.get("agent") or {}
        run = created.get("run") or {}
        agent_id = agent.get("id")
        run_id = run.get("id") or agent.get("latestRunId")

        result.update(
            {
                "status": "dispatched",
                "cloudAgentId": agent_id,
                "cloudRunId": run_id,
                "agentUrl": agent.get("url"),
                "raw": {"create": {"agentId": agent_id, "runId": run_id}},
            }
        )
        write_run_result(out_path, result)

        if not poll:
            return result

        dispatch_cfg = task.get("dispatch") or {}
        run_payload = poll_until_terminal(
            cli,
            str(agent_id),
            str(run_id),
            interval_seconds=float(dispatch_cfg.get("pollIntervalSeconds", 10)),
            timeout_seconds=float(dispatch_cfg.get("timeoutSeconds", 1800)),
        )
        status = str(run_payload.get("status", "")).upper()
        mapped = {
            "FINISHED": "finished",
            "ERROR": "error",
            "CANCELLED": "cancelled",
            "EXPIRED": "expired",
        }.get(status, "error")

        branch = task.get("requiredBranch")
        git = run_payload.get("git") or {}
        branches = git.get("branches") or []
        if branches:
            branch = branches[0].get("branch") or branch

        commit_hash = None
        files_changed: List[str] = []
        root = repo_root
        if root and branch:
            # Refresh remotes then inspect tip / diff vs pre-dispatch tip if known.
            subprocess.run(
                ["git", "fetch", "origin", branch],
                cwd=str(root),
                capture_output=True,
                check=False,
            )
            commit_hash = _git_head_on_branch(root, branch)
            base = (task.get("metadata") or {}).get("preDispatchCommit")
            if base and commit_hash:
                files_changed = _git_files_changed(root, branch, base)

        result.update(
            {
                "status": mapped,
                "endedAt": utc_now(),
                "branch": branch,
                "commitHash": commit_hash,
                "filesChanged": files_changed,
                "resultText": run_payload.get("result"),
                "durationMs": run_payload.get("durationMs"),
                "errorDetails": None
                if mapped == "finished"
                else (run_payload.get("result") or f"Run status {status}"),
                "raw": {
                    "create": result["raw"].get("create"),
                    "run": {
                        "id": run_payload.get("id"),
                        "status": run_payload.get("status"),
                        "durationMs": run_payload.get("durationMs"),
                        "git": git,
                    },
                },
            }
        )
        write_run_result(out_path, result)
        return result
    except CursorApiError as exc:
        result.update(
            {
                "status": "blocked" if exc.status in (401, 403, None) and "API_KEY" in str(exc) else "error",
                "endedAt": utc_now(),
                "errorDetails": str(exc),
                "raw": {"errorStatus": exc.status, "errorBody": exc.body},
            }
        )
        if "CURSOR_API_KEY not found" in str(exc):
            result["status"] = "blocked"
        write_run_result(out_path, result)
        return result
