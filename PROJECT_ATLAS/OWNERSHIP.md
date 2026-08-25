# OWNERSHIP

**As of:** 2026-07-16 04:10 UTC  
**Protocols:** `docs/agents/FILE_LOCK_PROTOCOL.md`, `docs/agents/MASTER_PM_ROUTING.md`

## Atlas ownership

| Path | Owner |
|------|-------|
| `PROJECT_ATLAS/**` | Master PM (orientation SoR). Other agents may propose updates via PR/handoff; do not silently overwrite Track freeze facts. |

## Execution ownership (high level)

| Area | Owner role | Primary paths |
|------|------------|---------------|
| Track 1 Prod freeze | Deployment Engineer | `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/`, `.worktrees/deployment-engineer/deployment/release-ops/` |
| Revenue OS / EVA / Sprint 1–3 | Revenue Systems Engineer | `.worktrees/revenue-sprint3/docs/business-launch/...`, `.worktrees/revenue-sprint3/tests/revenue/` |
| Program / business launch docs | Master PM | `.worktrees/master-pm-orchestrator/docs/business-launch/` |
| Agent comms bus | Integration / Master PM | `.agent-comms/`, `docs/agents/`, `scripts/agent-comms/` |
| CRM module docs / solutions | CRM Engineer(s) | `docs/crm/`, `src/power-automate/`, `.worktrees/crm-*` |
| Client portal | client-portal agent | `.worktrees/client-portal-data-rooms` |
| AI governance | ai-governance agent | `.worktrees/ai-governance-work-queues` |
| Finance ops | finance agent | `.worktrees/finance-operations` |
| Operations hub | operations agent | `.worktrees/operations-hub` |
| Executive command | executive agent | `.worktrees/executive-command-center` |

## Collision rules

1. Acquire lock before editing contested paths.  
2. Track 1 freeze artifacts: Deployment Engineer + owner only.  
3. Do not rebuild Agent Comms (D-004 — owner rule in `.agent-comms` bus messages; tip `2c064b3`) without owner.  
4. Revenue staging EVA: prefer `.worktrees/revenue-sprint3` as Sprint 2–3 SoR until commit; sync copies are mirrors.  
5. Escalate CONFLICT to `master-pm` + `integration`.  

## Registry drift (known)

`.agent-comms/registry.json` may list stale `worktreePath` / `ownedPaths` for some agents (e.g. `crm` historically pointing at master-pm business-launch). **Prefer this Atlas OWNERSHIP table + live `git worktree list`** over the registry when they conflict. Do not “fix” ownership by editing Production or code from Atlas validation alone.

## Things no agent owns alone

- Owner financial/legal approvals  
- Production writes  
- Public DNS  
- Client outbound contact
