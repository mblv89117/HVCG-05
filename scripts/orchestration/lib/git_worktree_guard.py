#!/usr/bin/env python3
"""Git worktree / branch uniqueness guards for Atlas orchestration.

Rules:
- A git branch may be checked out in at most one worktree.
- Agents must never `git switch` / `checkout` a branch already attached elsewhere.
- Prefer allocating a new unique branch per agent + task instead of sharing.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple


PROTECTED_BRANCHES = {
    "main",
    "master",
    "cursor/agent-communications",
    "cursor/v1.1.0-intelligence-ai-ops",
}


@dataclass
class WorktreeEntry:
    path: str
    head: str
    branch: Optional[str]  # refs/heads/... or None if detached


def find_git_common_dir(start: Path) -> Path:
    """Resolve the shared git dir for a worktree or main checkout."""
    cur = start.resolve()
    for _ in range(8):
        git_file = cur / ".git"
        if git_file.is_file():
            # worktree: gitdir: /path/to/main/.git/worktrees/name
            text = git_file.read_text().strip()
            if text.startswith("gitdir:"):
                gitdir = Path(text.split(":", 1)[1].strip())
                # climb to main .git
                if gitdir.name != ".git":
                    # .../.git/worktrees/<name>
                    return gitdir.parent.parent
                return gitdir
        if (cur / ".git").is_dir():
            return cur / ".git"
        if cur.parent == cur:
            break
        cur = cur.parent
    raise FileNotFoundError(f"No git directory above {start}")


def list_worktrees(repo: Path) -> List[WorktreeEntry]:
    """Return live worktree attachments. Empty list if git unavailable."""
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo), "worktree", "list", "--porcelain"],
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return []
    if proc.returncode != 0:
        return []
    entries: List[WorktreeEntry] = []
    cur: Dict[str, str] = {}
    for line in (proc.stdout or "").splitlines():
        if not line.strip():
            if cur.get("worktree"):
                entries.append(
                    WorktreeEntry(
                        path=cur["worktree"],
                        head=cur.get("HEAD", ""),
                        branch=cur.get("branch"),
                    )
                )
            cur = {}
            continue
        if " " in line:
            k, v = line.split(" ", 1)
            cur[k] = v
        else:
            cur[line] = "1"
    if cur.get("worktree"):
        entries.append(
            WorktreeEntry(
                path=cur["worktree"],
                head=cur.get("HEAD", ""),
                branch=cur.get("branch"),
            )
        )
    return entries


def branch_short_name(ref: Optional[str]) -> Optional[str]:
    if not ref:
        return None
    if ref.startswith("refs/heads/"):
        return ref[len("refs/heads/") :]
    return ref


def branch_holders(repo: Path) -> Dict[str, str]:
    """Map short branch name -> worktree path currently checking it out."""
    out: Dict[str, str] = {}
    for wt in list_worktrees(repo):
        name = branch_short_name(wt.branch)
        if name:
            out[name] = wt.path
    return out


def normalize_worktree_path(path: str) -> str:
    return str(Path(path).resolve())


def assert_branch_available(
    repo: Path,
    branch: str,
    *,
    intended_worktree: Optional[str] = None,
) -> None:
    """Raise SystemExit if branch is attached to a different worktree or is protected for specialists."""
    branch = branch.strip()
    if not branch:
        raise SystemExit("Branch name is empty")

    holders = branch_holders(repo)
    holder = holders.get(branch)
    if holder:
        intended = normalize_worktree_path(intended_worktree) if intended_worktree else None
        holder_n = normalize_worktree_path(holder)
        if intended and holder_n == intended:
            return
        # Same worktree path as repo itself when claiming without intended_worktree
        if intended is None and holder_n == normalize_worktree_path(str(repo)):
            return
        raise SystemExit(
            f"BRANCH_IN_USE: '{branch}' is already checked out in worktree:\n"
            f"  {holder}\n"
            f"Do not checkout/switch this branch elsewhere. Allocate a unique branch "
            f"(see PROJECT_ATLAS/ORCHESTRATION/BRANCH_WORKTREE_STRATEGY.md)."
        )


def assert_not_protected_for_specialist(branch: str, agent_id: str) -> None:
    if branch in PROTECTED_BRANCHES and agent_id not in {"master-pm", "communications"}:
        # communications / master-pm may touch agent-communications only from the main checkout
        if branch == "cursor/agent-communications":
            raise SystemExit(
                f"PROTECTED_BRANCH: '{branch}' is reserved for the main checkout / "
                f"agent-comms infrastructure. Specialist agent '{agent_id}' must use a "
                f"dedicated branch under the uniqueness convention."
            )


def allocate_branch_name(agent_id: str, purpose: str, task_id: Optional[str] = None) -> str:
    """Return a unique branch name: cursor/<agentId>/<purpose>[-<task>].

    purpose should be a short kebab slug. Task id is optional suffix for collision avoidance.
    """
    agent = re.sub(r"[^a-z0-9-]+", "-", agent_id.strip().lower()).strip("-")
    slug = re.sub(r"[^a-z0-9-]+", "-", purpose.strip().lower()).strip("-")
    if not agent or not slug:
        raise SystemExit("agent_id and purpose are required for allocate_branch_name")
    base = f"cursor/{agent}/{slug}"
    if task_id:
        tid = re.sub(r"[^a-zA-Z0-9-]+", "-", task_id).strip("-").lower()
        return f"{base}-{tid}"
    return base


def suggest_worktree_path(agent_id: str, purpose: str) -> str:
    agent = re.sub(r"[^a-z0-9-]+", "-", agent_id.strip().lower()).strip("-")
    slug = re.sub(r"[^a-z0-9-]+", "-", purpose.strip().lower()).strip("-")
    return f".worktrees/{agent}-{slug}"


def audit_report(repo: Path) -> Dict[str, object]:
    wts = list_worktrees(repo)
    holders = branch_holders(repo)
    detached = [
        {"path": w.path, "head": w.head[:12]}
        for w in wts
        if not w.branch
    ]
    return {
        "worktreeCount": len(wts),
        "attachedBranches": holders,
        "detachedWorktrees": detached,
        "protectedBranches": sorted(PROTECTED_BRANCHES),
        "convention": "cursor/<agentId>/<purpose>[-<taskId>]",
        "worktreeConvention": ".worktrees/<agentId>-<purpose>",
    }


def cmd_main(argv: Optional[List[str]] = None) -> int:
    argv = list(argv or sys.argv[1:])
    if not argv:
        print("Usage: git_worktree_guard.py audit|check-branch|allocate", file=sys.stderr)
        return 2
    cmd = argv[0]
    repo = Path.cwd()
    # Prefer HVCG root when nested under .worktrees
    for p in [repo, *repo.parents]:
        if (p / ".git").exists() or (p / "PROJECT_ATLAS" / "ORCHESTRATION").exists():
            # climb to real repo root with .git
            if (p / ".git").exists():
                repo = p
                break

    if cmd == "audit":
        print(json.dumps(audit_report(repo), indent=2))
        return 0
    if cmd == "check-branch":
        if len(argv) < 2:
            print("Usage: check-branch <branch> [--worktree <path>] [--agent <id>]", file=sys.stderr)
            return 2
        branch = argv[1]
        worktree = None
        agent = "unknown"
        if "--worktree" in argv:
            worktree = argv[argv.index("--worktree") + 1]
        if "--agent" in argv:
            agent = argv[argv.index("--agent") + 1]
        assert_not_protected_for_specialist(branch, agent)
        assert_branch_available(repo, branch, intended_worktree=worktree)
        print(json.dumps({"ok": True, "branch": branch}))
        return 0
    if cmd == "allocate":
        # allocate --agent X --purpose Y [--task T]
        agent = purpose = task = None
        i = 1
        while i < len(argv):
            if argv[i] == "--agent":
                agent = argv[i + 1]
                i += 2
            elif argv[i] == "--purpose":
                purpose = argv[i + 1]
                i += 2
            elif argv[i] == "--task":
                task = argv[i + 1]
                i += 2
            else:
                i += 1
        if not agent or not purpose:
            print("Usage: allocate --agent <id> --purpose <slug> [--task <id>]", file=sys.stderr)
            return 2
        name = allocate_branch_name(agent, purpose, task)
        wt = suggest_worktree_path(agent, purpose)
        # Ensure not colliding with live attachment (name should be new)
        holders = branch_holders(repo)
        if name in holders:
            name = allocate_branch_name(agent, f"{purpose}-x", task)
        print(json.dumps({"branch": name, "worktree": wt}, indent=2))
        return 0
    print(f"Unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(cmd_main())
