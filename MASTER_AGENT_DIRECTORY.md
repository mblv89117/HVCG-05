# MASTER_AGENT_DIRECTORY.md

**Owner:** Master PM  
**As of:** 2026-07-15 15:27 PT  
**Bus registry:** `.agent-comms/registry.json`

## Registered agents

| Agent ID | Display name | Branch | Worktree | Owned paths (registry) | Escalation | Master status call |
|----------|--------------|--------|----------|------------------------|------------|--------------------|
| `master-pm` | Master Project Manager | `cursor/master-pm-orchestrator` | `.worktrees/master-pm-orchestrator` | `MASTER_*.md`, master docs, bus routing | self | IN PROGRESS |
| `crm` | CRM Module | registry: `cursor/v1.1.0-intelligence-ai-ops` (workspace currently on `cursor/agent-communications`) | `.` (MAIN) | `docs/crm/`, CRM apps/flows/solutions | master-pm | BLOCKED (live smoke) |
| `executive` | Executive Command Center | `cursor/executive-command-center` | `.worktrees/executive-command-center` | `docs/executive/`, exec apps/flows | master-pm | READY FOR INTEGRATION |
| `operations` | Operations Hub | `cursor/operations-hub` | `.worktrees/operations-hub` | `docs/operations/`, ops apps/flows | master-pm | IN PROGRESS |
| `finance` | Finance Operations | `cursor/finance-operations` | `.worktrees/finance-operations` | `docs/finance/`, finance apps/flows | master-pm | NOT STARTED |
| `client-portal` | Client Portal & Data Rooms | `cursor/client-portal-data-rooms` | `.worktrees/client-portal-data-rooms` | `docs/portal/`, portal apps/flows | master-pm | IN PROGRESS |
| `ai-governance` | AI Governance & Work Queues | `cursor/ai-governance-work-queues` | `.worktrees/ai-governance-work-queues` | `docs/ai/`, AI apps/flows | master-pm | IN PROGRESS |
| `integration` | Integration | `agent/crm-integration` | `.worktrees/crm-integration` | `PARALLEL_AGENT_MAP.md`, releases/, install/ | master-pm | IN PROGRESS |

## Agent Communications (canonical)

| Item | Value |
|------|--------|
| Tip | `2c064b3` on `cursor/agent-communications` (committed + pushed) |
| Paths | `.agent-comms/`, `scripts/agent-comms/**`, `docs/agents/*COMMS*` |
| Rule | Use this only — **no rebuild** without Manny (D-004) |

## Workstreams without dedicated registry ID

| Workstream | Branch | Recommended agent | Notes |
|------------|--------|-------------------|-------|
| Agent Communications Infrastructure | `cursor/agent-communications` | Register `agent-comms` **or** assign to `integration` for merge | Infra COMPLETE / READY FOR INTEGRATION; owner of `.agent-comms/` tooling |
| Idle CRM specialists | `agent/crm-docs-owner`, `crm-migration-audit`, `crm-power-automate`, `crm-testing-qa`, (+ remote `crm-power-apps`, `crm-teams-copilot`) | None — **retire when safe** | VALIDATED; do not edit while CRM live smoke runs |

## Contact / coordination

| Method | Use |
|--------|-----|
| `.agent-comms/` inbox/outbox | Official SoR |
| Heartbeat | ≥ every 15m while IN_PROGRESS |
| `AGENT_BOOTSTRAP_PROMPT.md` | Manual paste into Cursor chats (API injection unavailable) |
| Master dashboard | `./scripts/agent-comms/master-dashboard.sh` |

## Spawning / retiring recommendations

| Action | When |
|--------|------|
| Retire `agent/crm-*` worktrees | After CRM smoke PASS + MAIN clean park; no uncommitted work |
| Spawn Finance specialist | Already exists — activate work, don’t spawn duplicate |
| Spawn Release Manager | If `integration` overloaded once ≥2 modules READY |
| Register `agent-comms` | If communications maintenance continues post-merge |
