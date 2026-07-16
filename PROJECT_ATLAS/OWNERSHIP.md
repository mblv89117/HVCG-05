# OWNERSHIP

**As of:** 2026-07-16 19:52 UTC  
**Protocols:** `docs/agents/FILE_LOCK_PROTOCOL.md`, `docs/agents/MASTER_PM_ROUTING.md`

## Atlas ownership

| Path | Owner |
|------|-------|
| `PROJECT_ATLAS/**` | Master PM (orientation SoR). Other agents may propose updates via PR/handoff; do not silently overwrite Track freeze facts. |

## Execution ownership (high level)

| Area | Owner role | Primary paths |
|------|------------|---------------|
| Track 1 Prod freeze | Deployment Engineer | `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/`, `.worktrees/deployment-engineer/deployment/release-ops/` |
| Revenue OS / EVA / Sprint 1–4 Phase 1 | Revenue Systems Engineer | `.worktrees/revenue-sprint4/` (authoritative Phase 1 tip `7fd8bf2`) |
| Program / business launch docs | Master PM | `.worktrees/master-pm-orchestrator/docs/business-launch/` |
| Agent comms bus | Integration / Master PM | `.agent-comms/`, `docs/agents/`, `scripts/agent-comms/` |
| CRM module docs / solutions | CRM Engineer(s) | `docs/crm/`, `src/power-automate/`, `.worktrees/crm-*` |
| Client portal | Client Portal Engineer | `.worktrees/client-portal-sprint1` (complete @ `8c8806b`) |
| AI governance | ai-governance agent | `.worktrees/ai-governance-work-queues` |
| Finance ops | finance agent | `.worktrees/finance-operations` |
| Operations hub | operations agent | `.worktrees/operations-hub` |
| Executive command | Executive Command Center Engineer | `.worktrees/executive-command-center-sprint1` |

## Collision rules

1. Acquire lock before editing contested paths.  
2. Track 1 freeze artifacts: Deployment Engineer + owner only.  
3. Do not rebuild Agent Comms (D-004 — owner rule in `.agent-comms` bus messages; tip `2c064b3`) without owner.  
4. Revenue: the Revenue Systems Engineer is authoritative; do not modify the completed Sprint 4 Phase 1 branch from another workstream.  
5. Escalate CONFLICT to `master-pm` + `integration`.  

## Registry drift (known)

`.agent-comms/registry.json` may list stale `worktreePath` / `ownedPaths` for some agents (e.g. `crm` historically pointing at master-pm business-launch). **Prefer this Atlas OWNERSHIP table + live `git worktree list`** over the registry when they conflict. Do not “fix” ownership by editing Production or code from Atlas validation alone.

## Things no agent owns alone

- Owner financial/legal approvals  
- Production writes  
- Public DNS  
- Client outbound contact
