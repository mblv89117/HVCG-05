#!/usr/bin/env python3
"""Bridge Master PM agent-comms status requests to orchestration heartbeats.

Order of operations (mandatory):
  1. Publish PROJECT_ATLAS/ORCHESTRATION heartbeat
  2. Optionally ACK the .agent-comms REQUEST message

Does not send Outlook, Teams, Graph, or any external notification.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

COMMS_STATUS_MAP = {
    "IDLE": "Idle",
    "READY": "Ready",
    "IN_PROGRESS": "In Progress",
    "BLOCKED": "Blocked",
    "OFFLINE": "Offline",
}


def find_repo_root(start: Optional[Path] = None) -> Path:
    env = os.environ.get("HVCG_REPO_ROOT")
    if env:
        return Path(env).resolve()
    cur = (start or Path.cwd()).resolve()
    for p in [cur, *cur.parents]:
        if (p / "PROJECT_ATLAS" / "ORCHESTRATION").is_dir() and (
            (p / ".git").exists() or (p / ".git").is_file() or (p / ".agent-comms").is_dir()
        ):
            return p
    raise SystemExit("Could not locate repo root with PROJECT_ATLAS/ORCHESTRATION")


def _load_atlas_orch(repo: Path):
    orch_lib = repo / "scripts" / "orchestration" / "lib"
    if not orch_lib.is_dir():
        # Worktree may only have orchestration; fall back to main checkout sibling
        raise SystemExit(f"Missing orchestration lib at {orch_lib}")
    sys.path.insert(0, str(orch_lib))
    import atlas_orch as orch  # noqa: WPS433

    return orch


def map_comms_status(status: Optional[str]) -> str:
    if not status:
        return "In Progress"
    key = status.strip().upper().replace(" ", "_")
    if key in COMMS_STATUS_MAP:
        return COMMS_STATUS_MAP[key]
    # Already an orchestration-style label
    return status


def publish_orchestration_heartbeat(
    repo: Path,
    *,
    agent_id: str,
    status: str,
    task: Optional[str] = None,
    branch: Optional[str] = None,
    action: Optional[str] = None,
    progress: Optional[float] = None,
    blockers: Optional[List[str]] = None,
    next_action: Optional[str] = None,
    eta: Optional[str] = None,
) -> Dict[str, Any]:
    orch = _load_atlas_orch(repo)
    return orch.heartbeat(
        repo,
        agent_id,
        current_task=task,
        branch=branch,
        status=map_comms_status(status),
        action=action,
        progress=progress,
        blockers=blockers or [],
        next_action=next_action,
        eta=eta,
    )


def try_ack_comms_message(repo: Path, *, agent_id: str, message_id: str) -> Optional[Dict[str, Any]]:
    """Best-effort ACK via agent-comms when the library is present."""
    comms_py = repo / "scripts" / "agent-comms" / "lib" / "comms.py"
    if not comms_py.is_file():
        # Allow main-repo scripts when running from a sparse worktree
        main_guess = repo
        for parent in repo.parents:
            candidate = parent / "scripts" / "agent-comms" / "lib" / "comms.py"
            if candidate.is_file():
                # Prefer HVCG main when worktree is nested under .worktrees/
                if (parent / ".agent-comms").is_dir() or (parent / "scripts" / "agent-comms").is_dir():
                    sys.path.insert(0, str(candidate.parent))
                    break
        else:
            return {"skipped": True, "reason": "agent-comms lib not found"}
    else:
        sys.path.insert(0, str(comms_py.parent))

    try:
        from comms import AgentComms  # noqa: WPS433
    except ImportError:
        return {"skipped": True, "reason": "comms import failed"}

    # AgentComms resolves root from env / discovery; pin HVCG_REPO_ROOT for shared .agent-comms
    os.environ.setdefault("HVCG_REPO_ROOT", str(repo))
    # If worktree has no .agent-comms, use parent main repo
    root_for_comms = repo
    if not (repo / ".agent-comms").is_dir():
        for parent in repo.parents:
            if (parent / ".agent-comms").is_dir():
                root_for_comms = parent
                os.environ["HVCG_REPO_ROOT"] = str(parent)
                break

    comms = AgentComms(root_for_comms)
    return comms.ack_message(agent_id=agent_id, message_id=message_id)


def sync(
    *,
    agent_id: str,
    status: str = "In Progress",
    task: Optional[str] = None,
    branch: Optional[str] = None,
    action: Optional[str] = None,
    progress: Optional[float] = None,
    blockers: Optional[List[str]] = None,
    next_action: Optional[str] = None,
    eta: Optional[str] = None,
    ack_message: Optional[str] = None,
    repo: Optional[Path] = None,
) -> Dict[str, Any]:
    root = repo or find_repo_root()
    hb = publish_orchestration_heartbeat(
        root,
        agent_id=agent_id,
        status=status,
        task=task,
        branch=branch,
        action=action,
        progress=progress,
        blockers=blockers,
        next_action=next_action,
        eta=eta,
    )
    result: Dict[str, Any] = {
        "orchestrationHeartbeat": hb,
        "ack": None,
        "order": ["orchestrationHeartbeat", "ack"],
    }
    if ack_message:
        result["ack"] = try_ack_comms_message(root, agent_id=agent_id, message_id=ack_message)
    return result


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Sync agent-comms status response to orchestration heartbeat")
    p.add_argument("--agent", required=True, help="Orchestration agentId (e.g. communications)")
    p.add_argument("--status", default="In Progress")
    p.add_argument("--task", default=None)
    p.add_argument("--branch", default=None)
    p.add_argument("--action", default=None)
    p.add_argument("--progress", type=float, default=None)
    p.add_argument("--blocker", action="append", default=[])
    p.add_argument("--next", dest="next_action", default=None)
    p.add_argument("--eta", default=None)
    p.add_argument("--ack-message", default=None, help="Optional .agent-comms messageId to ACK after heartbeat")
    p.add_argument("--root", default=None, help="Repo root override")
    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    repo = Path(args.root).resolve() if args.root else None
    try:
        out = sync(
            agent_id=args.agent,
            status=args.status,
            task=args.task,
            branch=args.branch,
            action=args.action,
            progress=args.progress,
            blockers=args.blocker or None,
            next_action=args.next_action,
            eta=args.eta,
            ack_message=args.ack_message,
            repo=repo,
        )
    except SystemExit as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
