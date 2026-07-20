# Migration Plan — Worktree / Branch Uniqueness

**Goal:** Every specialist agent has a dedicated branch + worktree. Preserve all existing work. No history rewrite. No deletes without Owner approval.

**Trigger:** Sprint 12 attempt to check out `cursor/agent-communications` while the main checkout already held it.

---

## Phase 0 — Completed in this change (safe, non-destructive)

| Action | Result |
|--------|--------|
| Audit all worktrees/branches | Recorded in `registry/branches.json` |
| Document convention + guards | `BRANCH_WORKTREE_STRATEGY.md`, ADR-0003 |
| Guard scripts | `git_worktree_guard.py`, `allocate-branch.sh`, `check-branch-available.sh`, `ensure-agent-worktree.sh` |
| Claim enforcement | `atlas_orch.claim_task` rejects in-use / protected branches |
| Sprint 12 dedicated branch | Renamed in-place to `cursor/orchestration-sprint12` (same commits; no rewrite) |
| Detached `operations-hub` | Reattached to existing `cursor/operations-hub` (tip matched; clean) |
| Detached `executive-command-center` | New branch `cursor/executive-command-center-active` from HEAD (preserves staged docs) |

---

## Phase 1 — Registry / task metadata alignment (Master PM, no git destroy)

For each orchestration task still pointing at a wrong branch:

| Task / doc claim | Wrong | Correct exclusive pair |
|------------------|-------|-------------------------|
| Sprint 12 tasks ATLAS-T-1201…1205 | `cursor/sprint12-engineering-orchestration` (branch exists but was **not** the attached worktree branch) | `cursor/orchestration-sprint12` + `.worktrees/sprint12-engineering-orchestration` |
| ATLAS-T-1306 | `cursor/comms-orch-bridge` (renamed away) | `cursor/orchestration-sprint12` |
| Documentation ATLAS-T-1305 | Keep `cursor/documentation-knowledge-manager` **only in** `.worktrees/documentation-knowledge-manager` | Never switch that worktree to `agent-communications` |

Update task JSON `branch` / `worktree` fields to match `git worktree list`. Do not force other agents to stop mid-flight.

---

## Phase 2 — Agents sharing conceptual lines (migrate when idle)

These are **not** git branch collisions today (each has its own branch), but tips sometimes match. Migrate to `cursor/<agentId>/<purpose>` when the agent is Idle:

| Current branch | Worktree | Migration when idle |
|----------------|----------|---------------------|
| `cursor/documentation-knowledge-manager` | `.worktrees/documentation-knowledge-manager` | `git branch -m cursor/documentation/knowledge-manager` **inside that worktree only** |
| `cursor/qa-release-manager` | `.worktrees/qa-release-manager` | `cursor/qa-release/manager` |
| `cursor/master-pm-orchestrator` | `.worktrees/master-pm-orchestrator` | optional `cursor/master-pm/orchestrator` |
| `cursor/system-architect` | `.worktrees/system-architect` | optional `cursor/system-architect/main` |
| Legacy CRM `agent/crm-*` | `.worktrees/crm-*` | Keep until CRM milestone closes; new CRM work uses `cursor/crm/<purpose>` |

**How to rename safely (per worktree):**

```bash
cd .worktrees/<that-worktree>
git status   # must be able to switch; commit or stash only that agent’s files
git branch -m cursor/<agentId>/<purpose>
# update heartbeat + registry/branches.json + .agent-comms registry branch field
# push new name: git push -u origin HEAD
# leave old remote branch until Owner confirms (do not delete yet)
```

---

## Phase 3 — Stale / overlapping Sprint worktrees (Owner decision)

Multiple worktrees share the **same commit tip** (not the same branch) — fine for git, confusing for humans:

- `track7-atlas-powerapps-uat`, `track7-ceo-command-center-sprint2`, `track9-eos-sprint2` @ `d778f23`
- `documentation-knowledge-manager` & `qa-release-manager` @ `2c064b3`
- main `agent-communications` & `track10-elite-ui` @ `912d3ca`

**Action:** When those tracks are Idle, create forward branches with unique names for new commits; do not collapse worktrees.

Orphan / unused local branch (no worktree): `cursor/sprint12-engineering-orchestration` @ older tip — **keep** until Master PM confirms; do not delete.

Branch `cursor/power-platform-ATLAS-T-1301-dataverse-cors` was briefly attached to the Sprint 12 worktree by another session — left as a local branch name; Sprint 12 worktree returned to `cursor/orchestration-sprint12`. Power Platform should get its **own** worktree before continuing ATLAS-T-1301.

---

## Phase 4 — agent-comms registry hygiene

`.agent-comms/registry.json` has drifted (example: `crm.worktreePath` pointed at master-pm worktree). Master PM / communications should refresh each agent’s `branch` + `worktreePath` to match `git worktree list` without moving checkouts.

---

## Rollback of this migration package

- Policy/docs/scripts: revert the commit on `cursor/orchestration-sprint12`.
- Branch renames: rename back with `git branch -m` (no history rewrite).
- Do **not** delete worktrees to roll back.

---

## Owner manual actions (required)

1. **Do not** ask specialists to check out `cursor/agent-communications`.
2. Confirm Power Platform work for ATLAS-T-1301 uses a **new** worktree (not Sprint 12’s).
3. When ready, authorize remote push of `cursor/orchestration-sprint12` and optional cleanup of unused remote branch names (delete only after confirm).
4. Approve Phase 2 renames during an Idle window if you want strict `cursor/<agentId>/…` everywhere.
5. Refresh Cursor windows / agent chats so each agent opens **its** worktree path, not the main repo.
