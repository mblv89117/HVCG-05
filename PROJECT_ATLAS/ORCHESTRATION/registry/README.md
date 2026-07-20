# Atlas Orchestration Registry Index

**Version:** 2.0  
**Updated:** 2026-07-20  
**Authority:** Master PM (Owner directive Sprint 12)

| Registry | Path | Purpose |
|----------|------|---------|
| AGENT_REGISTRY | `registry/AGENT_REGISTRY.json` / `agents.json` | All engineering + governance + ops agents |
| OPERATIONAL_AGENT_REGISTRY | `registry/OPERATIONAL_AGENT_REGISTRY.json` | Executive / Finance intelligence |
| PRODUCT_MODULE_REGISTRY | `registry/PRODUCT_MODULE_REGISTRY.json` | Product vs agent vs infrastructure |
| BRANCH_REGISTRY | `registry/BRANCH_REGISTRY.json` | Live exclusive branches + protected |
| WORKTREE_REGISTRY | `registry/WORKTREE_REGISTRY.json` | Live worktrees + session mapping |
| SESSION_RECONCILIATION | `registry/SESSION_RECONCILIATION.json` | Cursor session ↔ agent mapping + migration plan |
| TASK_QUEUE | `queue/tasks/` + `queue/index.json` | Work system of record |
| SPRINT_BOARD | `sprints/` + `scripts/orchestration/board.sh` | Sprint status |
| HEARTBEAT_REGISTRY | `heartbeats/agents/` | Live agent status |
| LOCK_REGISTRY | `locks/active/` + `locks/index.json` | Path/task/branch locks |
| REVIEW_QUEUE | `reviews/queue.json` | Independent review routing |
| MERGE_QUEUE | `releases/merge-queue.json` | Merge serialization |
| RELEASE_BOARD | `releases/board.json` | Promotion pipeline |
| DECISION_HISTORY | `decisions/` | ADRs + owner decisions |
| RISK_REGISTER | `memory/risks.json` | Engineering/operational risks |
| ENVIRONMENTS | `registry/environments.json` | Azure Prod subscription + tags |

**Retired agents:** `registry/retired_agents.json`

**Branch policy:** `BRANCH_WORKTREE_STRATEGY.md`  
**Migration:** `MIGRATION_WORKTREE_UNIQUENESS.md`
