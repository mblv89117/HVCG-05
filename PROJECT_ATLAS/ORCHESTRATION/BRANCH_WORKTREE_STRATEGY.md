# Branch & Worktree Uniqueness Strategy

**Status:** Active (Sprint 12 / Atlas Orchestration)  
**Incident:** `'cursor/agent-communications' is already used by another worktree`  
**Related:** `MIGRATION_WORKTREE_UNIQUENESS.md`, ADR-0003, `registry/branches.json`

---

## Hard rules

1. **One branch ↔ one worktree.** A branch may be checked out in at most one worktree. Git enforces this; agents must not attempt to violate it.
2. **Every specialist agent uses a dedicated branch and worktree.** No sharing `cursor/agent-communications` or any other agent’s attached branch.
3. **Allocate before checkout.** Use the naming convention (below) or `allocate-branch.sh` so names cannot collide.
4. **Never discard work.** No `git reset --hard`, branch delete of foreign work, or worktree remove without Owner/Master PM approval.
5. **Protected branches** (specialists must not attach):
   - `main` / `master`
   - `cursor/agent-communications` (main checkout only)
   - `cursor/v1.1.0-intelligence-ai-ops` (integration history line)

---

## Naming convention (guarantees uniqueness)

| Kind | Pattern | Example |
|------|---------|---------|
| **Branch** | `cursor/<agentId>/<purpose>[-<taskId>]` | `cursor/documentation/onboarding-ATLAS-T-1305` |
| **Worktree path** | `.worktrees/<agentId>-<purpose>` | `.worktrees/documentation-onboarding` |
| Legacy (still valid if exclusive) | `cursor/<flat-slug>` or `agent/<module>-<slug>` | `cursor/qa-release-manager`, `agent/crm-dev-validation` |

`<agentId>` must match `registry/agents.json`.  
`<purpose>` is a short kebab slug for the task theme.  
`<taskId>` optional but recommended for parallel tasks by the same agent.

---

## Required agent workflow

```bash
# 1. Allocate unique names (does not create git objects yet)
bash scripts/orchestration/allocate-branch.sh \
  --agent documentation --purpose onboarding --task ATLAS-T-1305

# 2. Create worktree + branch ONLY if branch is free
bash scripts/orchestration/ensure-agent-worktree.sh \
  --agent documentation --purpose onboarding --task ATLAS-T-1305 \
  --base cursor/orchestration-sprint12

# 3. Guard before any switch/checkout
bash scripts/orchestration/check-branch-available.sh \
  --branch cursor/documentation/onboarding-ATLAS-T-1305 \
  --worktree .worktrees/documentation-onboarding \
  --agent documentation

# 4. Claim with the SAME branch/worktree pair
bash scripts/orchestration/claim-task.sh ATLAS-T-1305 --agent documentation \
  --branch cursor/documentation/onboarding-ATLAS-T-1305 \
  --worktree .worktrees/documentation-onboarding
```

`claim-task` / `atlas_orch.py claim` **refuse** claims whose branch is already attached to a different worktree or is protected.

---

## What caused the Sprint 12 conflict

| Worktree | Branch |
|----------|--------|
| Main repo `.` | `cursor/agent-communications` |
| Sprint 12 `.worktrees/sprint12-engineering-orchestration` | attempted `git switch cursor/agent-communications` → **FAIL** |

Sprint 12 now uses dedicated branch **`cursor/orchestration-sprint12`**.

---

## Registry

Live attachments are recorded in `registry/branches.json` (`active[]`).  
Refresh after structural changes:

```bash
python3 scripts/orchestration/lib/git_worktree_guard.py audit
```

---

## Anti-patterns (forbidden)

- Checking out `cursor/agent-communications` inside `.worktrees/*`
- Two agents claiming the same branch name
- Pointing two registry entries at the same worktree with different branches without updating git
- Deleting another agent’s worktree to “free” a branch
- Force-push / history rewrite to resolve conflicts
