#!/usr/bin/env python3
"""Atlas Engineering Orchestration runtime (repo-state task engine)."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

TASK_ID_RE = re.compile(r"^ATLAS-T-\d{4,}$")
DEFAULT_LOCK_TTL = 120


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().strftime("%Y-%m-%dT%H:%M:%SZ")


def find_repo_root(start: Optional[Path] = None) -> Path:
    env = os.environ.get("HVCG_REPO_ROOT")
    if env:
        return Path(env).resolve()
    cur = (start or Path.cwd()).resolve()
    for p in [cur, *cur.parents]:
        if (p / "PROJECT_ATLAS" / "ORCHESTRATION").is_dir() and (p / ".git").exists():
            return p
        if (p / "PROJECT_ATLAS" / "ORCHESTRATION").is_dir() and (p / ".git").is_file():
            return p
    raise SystemExit("Could not locate repo root containing PROJECT_ATLAS/ORCHESTRATION")


def orch_root(repo: Path) -> Path:
    return repo / "PROJECT_ATLAS" / "ORCHESTRATION"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def task_path(repo: Path, task_id: str) -> Path:
    return orch_root(repo) / "queue" / "tasks" / f"{task_id}.json"


def rebuild_index(repo: Path) -> Dict[str, Any]:
    tasks_dir = orch_root(repo) / "queue" / "tasks"
    entries = []
    for p in sorted(tasks_dir.glob("ATLAS-T-*.json")):
        t = load_json(p)
        entries.append(
            {
                "id": t["id"],
                "sprint": t.get("sprint"),
                "status": t.get("status"),
                "assignedAgent": t.get("assignedAgent"),
                "priority": t.get("priority"),
                "title": t.get("title"),
            }
        )
    index = {"updatedAt": iso_now(), "tasks": entries}
    save_json(orch_root(repo) / "queue" / "index.json", index)
    return index


def list_tasks(
    repo: Path,
    *,
    status: Optional[str] = None,
    agent: Optional[str] = None,
    sprint: Optional[int] = None,
) -> List[Dict[str, Any]]:
    out = []
    for p in sorted((orch_root(repo) / "queue" / "tasks").glob("ATLAS-T-*.json")):
        t = load_json(p)
        if status and t.get("status") != status:
            continue
        if agent and t.get("assignedAgent") != agent:
            continue
        if sprint is not None and int(t.get("sprint", -1)) != sprint:
            continue
        out.append(t)
    priority_order = {"P0": 0, "P1": 1, "P2": 2, "P3": 3}
    out.sort(key=lambda x: (priority_order.get(x.get("priority", "P3"), 9), x["id"]))
    return out


def claim_task(repo: Path, task_id: str, agent_id: str, *, branch: Optional[str] = None, worktree: Optional[str] = None) -> Dict[str, Any]:
    path = task_path(repo, task_id)
    if not path.exists():
        raise SystemExit(f"Unknown task {task_id}")
    t = load_json(path)
    if t.get("status") not in ("Ready", "Planned", "Backlog"):
        if t.get("claimedBy") == agent_id and t.get("status") in ("Claimed", "In Progress"):
            return t
        raise SystemExit(f"Task {task_id} not claimable (status={t.get('status')}, claimedBy={t.get('claimedBy')})")
    if t.get("assignedAgent") and t["assignedAgent"] != agent_id:
        # Allow claim if explicitly assigned to this agent only
        raise SystemExit(f"Task {task_id} assigned to {t['assignedAgent']}, not {agent_id}")
    # Dependency check
    for dep in t.get("dependencies") or []:
        dep_path = task_path(repo, dep)
        if dep_path.exists():
            dep_t = load_json(dep_path)
            if dep_t.get("status") not in ("Closed", "Released", "Merged", "Approved"):
                raise SystemExit(f"Dependency {dep} not complete (status={dep_t.get('status')})")
    t["status"] = "Claimed"
    t["claimedBy"] = agent_id
    t["claimedAt"] = iso_now()
    t["updatedAt"] = iso_now()
    if branch:
        t["branch"] = branch
    if worktree:
        t["worktree"] = worktree
    save_json(path, t)
    # Task lock
    acquire_lock(
        repo,
        lock_type="task",
        resource=task_id,
        holder=agent_id,
        task_id=task_id,
        ttl_minutes=DEFAULT_LOCK_TTL,
    )
    for ap in t.get("affectedPaths") or []:
        acquire_lock(
            repo,
            lock_type="directory" if ap.endswith("/") else "file",
            resource=ap,
            holder=agent_id,
            task_id=task_id,
            ttl_minutes=DEFAULT_LOCK_TTL,
        )
    rebuild_index(repo)
    return t


def start_task(repo: Path, task_id: str, agent_id: str) -> Dict[str, Any]:
    path = task_path(repo, task_id)
    t = load_json(path)
    if t.get("claimedBy") != agent_id:
        raise SystemExit("Only claim holder can start task")
    t["status"] = "In Progress"
    t["updatedAt"] = iso_now()
    save_json(path, t)
    rebuild_index(repo)
    return t


def complete_task(
    repo: Path,
    task_id: str,
    agent_id: str,
    *,
    summary: str,
    commits: Optional[List[str]] = None,
    artifacts: Optional[List[str]] = None,
    next_status: str = "Waiting Review",
) -> Dict[str, Any]:
    path = task_path(repo, task_id)
    t = load_json(path)
    if t.get("claimedBy") != agent_id:
        raise SystemExit("Only claim holder can complete task")
    t["status"] = next_status
    t["completionSummary"] = summary
    t["updatedAt"] = iso_now()
    if commits:
        t["commitReferences"] = list(dict.fromkeys((t.get("commitReferences") or []) + commits))
    if artifacts:
        t["artifacts"] = list(dict.fromkeys((t.get("artifacts") or []) + artifacts))
    save_json(path, t)
    rebuild_index(repo)
    # refresh review queue
    rq_path = orch_root(repo) / "reviews" / "queue.json"
    rq = load_json(rq_path) if rq_path.exists() else {"waiting": []}
    if next_status == "Waiting Review":
        rq.setdefault("waiting", [])
        if task_id not in rq["waiting"]:
            rq["waiting"].append(task_id)
        rq["updatedAt"] = iso_now()
        save_json(rq_path, rq)
    return t


def set_status(repo: Path, task_id: str, status: str, agent_id: str) -> Dict[str, Any]:
    path = task_path(repo, task_id)
    t = load_json(path)
    t["status"] = status
    t["updatedAt"] = iso_now()
    if status in ("Closed", "Released", "Cancelled", "Merged"):
        release_locks_for_task(repo, task_id)
    save_json(path, t)
    rebuild_index(repo)
    return t


def heartbeat(
    repo: Path,
    agent_id: str,
    *,
    current_task: Optional[str] = None,
    branch: Optional[str] = None,
    status: str = "In Progress",
    action: Optional[str] = None,
    progress: Optional[float] = None,
    blockers: Optional[List[str]] = None,
    next_action: Optional[str] = None,
    eta: Optional[str] = None,
) -> Dict[str, Any]:
    hb = {
        "agentId": agent_id,
        "currentTask": current_task,
        "currentBranch": branch,
        "status": status,
        "currentAction": action,
        "progressPercent": progress,
        "lastActivity": iso_now(),
        "estimatedCompletion": eta,
        "blockers": blockers or [],
        "nextAction": next_action,
        "heartbeatTime": iso_now(),
    }
    path = orch_root(repo) / "heartbeats" / "agents" / f"{agent_id}.json"
    save_json(path, hb)
    idx_path = orch_root(repo) / "heartbeats" / "index.json"
    idx = load_json(idx_path) if idx_path.exists() else {"agents": {}}
    idx.setdefault("agents", {})[agent_id] = f"heartbeats/agents/{agent_id}.json"
    idx["updatedAt"] = iso_now()
    save_json(idx_path, idx)
    # renew locks held by agent
    renew_locks(repo, agent_id)
    return hb


def acquire_lock(
    repo: Path,
    *,
    lock_type: str,
    resource: str,
    holder: str,
    task_id: Optional[str] = None,
    ttl_minutes: int = DEFAULT_LOCK_TTL,
) -> Dict[str, Any]:
    locks_dir = orch_root(repo) / "locks" / "active"
    # conflict check
    for p in locks_dir.glob("LOCK-*.json"):
        existing = load_json(p)
        if existing.get("resource") == resource and existing.get("holder") != holder:
            exp = existing.get("expiresAt")
            if exp and exp > iso_now():
                raise SystemExit(
                    f"CONFLICT: {resource} locked by {existing.get('holder')} until {exp} (lock {existing.get('lockId')})"
                )
    lock_id = f"LOCK-{uuid.uuid4().hex[:10].upper()}"
    now = utc_now()
    lock = {
        "lockId": lock_id,
        "type": lock_type,
        "resource": resource,
        "holder": holder,
        "taskId": task_id,
        "acquiredAt": iso_now(),
        "expiresAt": (now + timedelta(minutes=ttl_minutes)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "heartbeatAt": iso_now(),
        "ttlMinutes": ttl_minutes,
    }
    save_json(locks_dir / f"{lock_id}.json", lock)
    idx_path = orch_root(repo) / "locks" / "index.json"
    idx = load_json(idx_path) if idx_path.exists() else {"activeLockIds": [], "policy": {}}
    ids = set(idx.get("activeLockIds") or [])
    ids.add(lock_id)
    idx["activeLockIds"] = sorted(ids)
    idx["updatedAt"] = iso_now()
    save_json(idx_path, idx)
    return lock


def renew_locks(repo: Path, holder: str) -> int:
    n = 0
    locks_dir = orch_root(repo) / "locks" / "active"
    for p in locks_dir.glob("LOCK-*.json"):
        lock = load_json(p)
        if lock.get("holder") != holder:
            continue
        ttl = int(lock.get("ttlMinutes") or DEFAULT_LOCK_TTL)
        if ttl >= 100000:
            lock["heartbeatAt"] = iso_now()
        else:
            lock["heartbeatAt"] = iso_now()
            lock["expiresAt"] = (utc_now() + timedelta(minutes=ttl)).strftime("%Y-%m-%dT%H:%M:%SZ")
        save_json(p, lock)
        n += 1
    return n


def release_locks_for_task(repo: Path, task_id: str) -> int:
    n = 0
    locks_dir = orch_root(repo) / "locks" / "active"
    idx_path = orch_root(repo) / "locks" / "index.json"
    idx = load_json(idx_path) if idx_path.exists() else {"activeLockIds": []}
    active = set(idx.get("activeLockIds") or [])
    for p in list(locks_dir.glob("LOCK-*.json")):
        lock = load_json(p)
        if lock.get("taskId") == task_id:
            active.discard(lock["lockId"])
            p.unlink()
            n += 1
    idx["activeLockIds"] = sorted(active)
    idx["updatedAt"] = iso_now()
    save_json(idx_path, idx)
    return n


def conflicts_report(repo: Path) -> List[Dict[str, Any]]:
    locks_dir = orch_root(repo) / "locks" / "active"
    by_resource: Dict[str, List[Dict[str, Any]]] = {}
    now = iso_now()
    stale = []
    for p in locks_dir.glob("LOCK-*.json"):
        lock = load_json(p)
        by_resource.setdefault(lock["resource"], []).append(lock)
        if lock.get("expiresAt") and lock["expiresAt"] < now:
            stale.append({"kind": "expired", "lock": lock})
    multi = [
        {"kind": "multi-holder", "resource": r, "locks": ls}
        for r, ls in by_resource.items()
        if len({x["holder"] for x in ls}) > 1
    ]
    return stale + multi


def board(repo: Path) -> Dict[str, Any]:
    tasks = list_tasks(repo)
    by_status: Dict[str, int] = {}
    for t in tasks:
        by_status[t.get("status", "?")] = by_status.get(t.get("status", "?"), 0) + 1
    return {
        "updatedAt": iso_now(),
        "countsByStatus": by_status,
        "ready": [
            {"id": t["id"], "title": t["title"], "agent": t.get("assignedAgent"), "priority": t.get("priority")}
            for t in tasks
            if t.get("status") == "Ready"
        ],
        "inFlight": [
            {"id": t["id"], "title": t["title"], "agent": t.get("claimedBy") or t.get("assignedAgent"), "status": t.get("status")}
            for t in tasks
            if t.get("status") in ("Claimed", "In Progress", "Blocked", "Waiting Review", "QA")
        ],
    }


def register_agent(repo: Path, agent: Dict[str, Any]) -> None:
    path = orch_root(repo) / "registry" / "agents.json"
    data = load_json(path)
    existing = {a["agentId"]: i for i, a in enumerate(data["agents"])}
    if agent["agentId"] in existing:
        data["agents"][existing[agent["agentId"]]] = agent
    else:
        data["agents"].append(agent)
    data["updatedAt"] = iso_now()
    save_json(path, data)


def cmd_main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(prog="atlas-orch", description="Atlas Engineering Orchestration CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_ready = sub.add_parser("list-ready", help="List Ready tasks")
    p_ready.add_argument("--agent")
    p_ready.add_argument("--sprint", type=int)

    p_list = sub.add_parser("list", help="List tasks")
    p_list.add_argument("--status")
    p_list.add_argument("--agent")
    p_list.add_argument("--sprint", type=int)

    p_claim = sub.add_parser("claim", help="Claim a Ready task")
    p_claim.add_argument("task_id")
    p_claim.add_argument("--agent", required=True)
    p_claim.add_argument("--branch")
    p_claim.add_argument("--worktree")

    p_start = sub.add_parser("start", help="Mark claimed task In Progress")
    p_start.add_argument("task_id")
    p_start.add_argument("--agent", required=True)

    p_complete = sub.add_parser("complete", help="Complete task into Waiting Review")
    p_complete.add_argument("task_id")
    p_complete.add_argument("--agent", required=True)
    p_complete.add_argument("--summary", required=True)
    p_complete.add_argument("--commit", action="append", default=[])
    p_complete.add_argument("--artifact", action="append", default=[])
    p_complete.add_argument("--status", default="Waiting Review")

    p_status = sub.add_parser("set-status", help="Set task status")
    p_status.add_argument("task_id")
    p_status.add_argument("--status", required=True)
    p_status.add_argument("--agent", required=True)

    p_hb = sub.add_parser("heartbeat", help="Publish agent heartbeat")
    p_hb.add_argument("--agent", required=True)
    p_hb.add_argument("--task")
    p_hb.add_argument("--branch")
    p_hb.add_argument("--status", default="In Progress")
    p_hb.add_argument("--action")
    p_hb.add_argument("--progress", type=float)
    p_hb.add_argument("--blocker", action="append", default=[])
    p_hb.add_argument("--next")
    p_hb.add_argument("--eta")

    sub.add_parser("board", help="Sprint board summary")
    sub.add_parser("conflicts", help="Report lock conflicts / expired locks")
    sub.add_parser("reindex", help="Rebuild queue index")

    args = parser.parse_args(argv)
    repo = find_repo_root()

    if args.cmd == "list-ready":
        tasks = list_tasks(repo, status="Ready", agent=args.agent, sprint=args.sprint)
        for t in tasks:
            print(f"{t['id']}\t{t.get('priority')}\t{t.get('assignedAgent')}\t{t['title']}")
        return 0
    if args.cmd == "list":
        tasks = list_tasks(repo, status=args.status, agent=args.agent, sprint=args.sprint)
        for t in tasks:
            print(f"{t['id']}\t{t.get('status')}\t{t.get('priority')}\t{t.get('assignedAgent')}\t{t['title']}")
        return 0
    if args.cmd == "claim":
        t = claim_task(repo, args.task_id, args.agent, branch=args.branch, worktree=args.worktree)
        print(json.dumps({"claimed": t["id"], "status": t["status"]}, indent=2))
        return 0
    if args.cmd == "start":
        t = start_task(repo, args.task_id, args.agent)
        print(json.dumps({"id": t["id"], "status": t["status"]}, indent=2))
        return 0
    if args.cmd == "complete":
        t = complete_task(
            repo,
            args.task_id,
            args.agent,
            summary=args.summary,
            commits=args.commit,
            artifacts=args.artifact,
            next_status=args.status,
        )
        print(json.dumps({"id": t["id"], "status": t["status"]}, indent=2))
        return 0
    if args.cmd == "set-status":
        t = set_status(repo, args.task_id, args.status, args.agent)
        print(json.dumps({"id": t["id"], "status": t["status"]}, indent=2))
        return 0
    if args.cmd == "heartbeat":
        hb = heartbeat(
            repo,
            args.agent,
            current_task=args.task,
            branch=args.branch,
            status=args.status,
            action=args.action,
            progress=args.progress,
            blockers=args.blocker,
            next_action=args.next,
            eta=args.eta,
        )
        print(json.dumps(hb, indent=2))
        return 0
    if args.cmd == "board":
        print(json.dumps(board(repo), indent=2))
        return 0
    if args.cmd == "conflicts":
        print(json.dumps(conflicts_report(repo), indent=2))
        return 0
    if args.cmd == "reindex":
        print(json.dumps(rebuild_index(repo), indent=2))
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(cmd_main())
