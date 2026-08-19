#!/usr/bin/env python3
"""Release readiness monitor — orchestration queue + heartbeats + track map.

Does not deploy. Writes status/LATEST.json and status/LATEST.md.
"""
from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

TRACKS = {
    "Elite UI": ["elite-ui"],
    "Operations Hub": ["operations-hub", "operations"],  # may be worktree-only
    "Revenue Systems": ["revenue-systems"],
    "Client Portal": ["client-workspace", "client-portal"],
    "Finance Intelligence": ["finance-intelligence", "finance"],
    "Security": ["security-engineering", "security"],
    "Data Engineering": ["data-engineering"],
}

MERGE_STATUSES = {
    "Waiting Review",
    "QA Review",
    "QA",
    "Architecture Review",
    "Security Review",
    "Approved",
    "Merged",
}

READY_STATUSES = {"Ready"}


def iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def find_orch() -> Path:
    # scripts → release-coordination → deployment → worktree
    worktree = Path(__file__).resolve().parents[3]
    main = Path("/Volumes/MacMiniPro2TB/HVCG Project Management System")
    candidates = [
        main / ".worktrees/sprint12-engineering-orchestration/PROJECT_ATLAS/ORCHESTRATION",
        worktree / "PROJECT_ATLAS/ORCHESTRATION",
        main / "PROJECT_ATLAS/ORCHESTRATION",
    ]
    for c in candidates:
        if c.is_dir() and (c / "queue/index.json").exists():
            return c
    raise SystemExit("ORCHESTRATION not found")


def load(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def worktrees() -> list[dict]:
    try:
        out = subprocess.check_output(
            ["git", "worktree", "list", "--porcelain"],
            cwd="/Volumes/MacMiniPro2TB/HVCG Project Management System",
            text=True,
        )
    except Exception as e:
        return [{"error": str(e)}]
    items = []
    cur: dict = {}
    for line in out.splitlines():
        if line.startswith("worktree "):
            if cur:
                items.append(cur)
            cur = {"worktree": line.split(" ", 1)[1]}
        elif line.startswith("HEAD "):
            cur["head"] = line.split(" ", 1)[1][:12]
        elif line.startswith("branch "):
            cur["branch"] = line.split(" ", 1)[1].replace("refs/heads/", "")
    if cur:
        items.append(cur)
    return items


def main() -> int:
    orch = find_orch()
    q = load(orch / "queue/index.json")
    tasks = q.get("tasks", [])
    hb_dir = orch / "heartbeats/agents"
    heartbeats = {}
    if hb_dir.is_dir():
        for p in hb_dir.glob("*.json"):
            heartbeats[p.stem] = load(p)

    track_status = {}
    for track, agents in TRACKS.items():
        matched_tasks = [
            t
            for t in tasks
            if t.get("assignedAgent") in agents
            or any(a in (t.get("title") or "").lower() for a in [track.lower().split()[0]])
        ]
        agent_hb = []
        for a in agents:
            if a in heartbeats:
                agent_hb.append(
                    {
                        "agentId": a,
                        "status": heartbeats[a].get("status"),
                        "action": heartbeats[a].get("currentAction"),
                        "task": heartbeats[a].get("currentTask"),
                    }
                )
        ready = [t for t in matched_tasks if t.get("status") in READY_STATUSES]
        mergeish = [t for t in matched_tasks if t.get("status") in MERGE_STATUSES]
        track_status[track] = {
            "agents": agents,
            "heartbeats": agent_hb,
            "readyTasks": ready,
            "mergeCandidates": mergeish,
            "allTasks": matched_tasks,
            "signal": (
                "MERGE_CANDIDATE"
                if mergeish
                else ("READY_WORK" if ready else ("ACTIVE_HB" if agent_hb else "QUIET"))
            ),
        }

    merge_candidates = [t for t in tasks if t.get("status") in MERGE_STATUSES]
    ready_all = [t for t in tasks if t.get("status") in READY_STATUSES]

    # Standing refuse: no QA GO recorded for active release board
    release_board = load(orch / "releases/board.json") if (orch / "releases/board.json").exists() else {}
    reviews = load(orch / "reviews/queue.json") if (orch / "reviews/queue.json").exists() else {}

    snapshot = {
        "generatedAt": iso(),
        "coordinator": "deployment-manager",
        "role": "Release Deployment Coordinator",
        "deployAuthorized": False,
        "qaFormalGo": False,
        "refuseStanding": [
            "REFUSE-QA-NOGO: no formal QA GO recorded for current RC"
        ],
        "orchestration": str(orch),
        "releaseBoard": release_board,
        "reviewsWaiting": reviews.get("waiting", []),
        "readyTaskCount": len(ready_all),
        "mergeCandidateCount": len(merge_candidates),
        "readyTasks": ready_all,
        "mergeCandidates": merge_candidates,
        "tracks": track_status,
        "worktrees": worktrees(),
        "nextActions": [
            "Continue monitoring; do not deploy",
            "When merge candidates clear QA with formal GO, produce RC package",
            "Notify Master PM on READY_FOR_QA only after refuse gates PASS",
        ],
    }

    out_dir = Path(__file__).resolve().parents[1] / "status"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "LATEST.json").write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")

    lines = [
        f"# Release Coordinator Status — {snapshot['generatedAt']}",
        "",
        f"**Deploy authorized:** `{snapshot['deployAuthorized']}` (requires QA GO)",
        f"**Ready tasks:** {snapshot['readyTaskCount']} · **Merge candidates:** {snapshot['mergeCandidateCount']}",
        "",
        "## Tracks",
        "",
        "| Track | Signal | Ready tasks | Merge candidates | Heartbeat |",
        "|-------|--------|-------------|------------------|-----------|",
    ]
    for track, info in track_status.items():
        hb = "; ".join(
            f"{h['agentId']}={h['status']}" for h in info.get("heartbeats") or []
        ) or "—"
        lines.append(
            f"| {track} | {info['signal']} | {len(info['readyTasks'])} | {len(info['mergeCandidates'])} | {hb} |"
        )
    lines += [
        "",
        "## Merge candidates",
        "",
    ]
    if merge_candidates:
        for t in merge_candidates:
            lines.append(
                f"- `{t['id']}` [{t.get('priority')}] {t.get('assignedAgent')}: {t.get('title')} — **{t.get('status')}**"
            )
    else:
        lines.append("_None_")
    lines += [
        "",
        "## Standing refuse",
        "",
    ]
    for r in snapshot["refuseStanding"]:
        lines.append(f"- {r}")
    lines.append("")
    (out_dir / "LATEST.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"ok": True, "generatedAt": snapshot["generatedAt"], "mergeCandidateCount": len(merge_candidates), "readyTaskCount": len(ready_all)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
