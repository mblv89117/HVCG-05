# AGENT_ASSIGNMENTS

**As of:** 2026-07-20  
**Status:** DRAFT update for ATLAS-T-1305 (orchestration discovery) — pending claim unlock / review  
**Sources:** `PROJECT_ATLAS/ORCHESTRATION/registry/agents.json`, `docs/agents/AGENT_COMMUNICATIONS.md`, `git worktree list`, Deployment Engineer / Revenue Systems handoffs

## Engineering Orchestration (required first)

**Work SoR:** `PROJECT_ATLAS/ORCHESTRATION/`  
**Message bus:** `.agent-comms/`

Every specialist session must:

1. Run `bash scripts/orchestration/list-ready.sh --agent <orchestration-agentId>`
2. Claim Ready work before editing owned paths
3. Publish heartbeats while working
4. If no Ready work: heartbeat `Idle` and monitor completed engineering tasks for documentation impact

Onboarding guide: [Documentation/ORCHESTRATION_AGENT_ONBOARDING.md](Documentation/ORCHESTRATION_AGENT_ONBOARDING.md)  
Protocol: `PROJECT_ATLAS/ORCHESTRATION/AGENT_PROTOCOL.md`  
Constitution: `PROJECT_ATLAS/ORCHESTRATION/CONSTITUTION.md`

### Orchestration agentId map (registry)

| Orchestration `agentId` | Role | Comms `agentId` (when present) |
|-------------------------|------|--------------------------------|
| `master-pm` | Master PM | `master-pm` |
| `system-architect` | System Architect | `architect` (when registered) |
| `deployment-manager` | Deployment Manager | `deployment-engineer` (when registered) |
| `qa-release` | QA & Release | `integration` (when registered) |
| `documentation` | Documentation Manager | `documentation-manager` |
| `ai-governance` | AI Governance | `ai-governance` |
| `elite-ui` | Elite UI | — |
| `power-platform` | Power Platform | `crm` (when used) |
| `azure-platform` | Azure Platform | — |
| `data-engineering` | Data Engineering | — (registered Sprint 12; see [Documentation/SPRINT12_DATA_ENGINEERING_REGISTRATION.md](Documentation/SPRINT12_DATA_ENGINEERING_REGISTRATION.md)) |
| `security` | Security | — |
| `revenue-systems` | Revenue Systems | `revenue-systems` (when registered) |
| `client-workspace` | Client Workspace | `client-portal` |
| `knowledge-platform` | Knowledge Platform | — |
| `communications` | Communications | — |
| `analytics` | Analytics | — |
| `automation` | Automation | — |
| `administration` | Administration | — |

## Active git worktrees

| Worktree | Branch | HEAD | Typical role |
|----------|--------|------|--------------|
| `.` (repo root) | `cursor/agent-communications` | `2c064b3` | Agent Comms SoR (D-004 — do not fork/rebuild without owner) |
| `.worktrees/deployment-engineer` | `cursor/deployment-engineer` | `c726f1e` | Deployment Engineer |
| `.worktrees/revenue-sprint3` | `cursor/revenue-sprint3-conversion` | `0073bf4` (**COMPLETE** Sprint 1–3) | Revenue Systems (role COMPLETE) |
| `.worktrees/master-pm-orchestrator` | `cursor/master-pm-orchestrator` | `b75b19b` | Master PM |
| `.worktrees/system-architect` | `cursor/system-architect` | `b75b19b` | Architecture |
| `.worktrees/crm-dev-validation-commit` | `agent/crm-dev-validation` | `7c226e6` | CRM Dev validation / RC-1 lineage |
| `.worktrees/crm-docs-owner` | `agent/crm-docs-owner` | `d39efa2` | CRM docs |
| `.worktrees/crm-integration` | `agent/crm-integration` | `bbfeec9` | Integration |
| `.worktrees/crm-migration-audit` | `agent/crm-migration-audit` | `e6c5d72` | Migration audit |
| `.worktrees/crm-power-automate` | `agent/crm-power-automate` | `4c3d709` | Power Automate |
| `.worktrees/crm-testing-qa` | `agent/crm-testing-qa` | `fdd5f11` | CRM QA |
| `.worktrees/qa-release-manager` | `cursor/qa-release-manager` | `2c064b3` | QA / release |
| `.worktrees/documentation-knowledge-manager` | `cursor/documentation-knowledge-manager` | `2c064b3` | Docs |
| `.worktrees/executive-command-center` | `cursor/executive-command-center` | `e074cfc` | Executive |
| `.worktrees/operations-hub` | `cursor/operations-hub` | `a584f61` | Operations |
| `.worktrees/finance-operations` | `cursor/finance-operations` | `c79d35b` | Finance |
| `.worktrees/client-portal-data-rooms` | `cursor/client-portal-data-rooms` | `b8b2005` | Client portal |
| `.worktrees/ai-governance-work-queues` | `cursor/ai-governance-work-queues` | `fc1fa79` | AI governance |
| `.worktrees/sprint12-engineering-orchestration` | (hosts ORCHESTRATION tree) | — | Orchestration platform working tree |
| `.worktrees/project-atlas-authoritative` | `cursor/project-atlas-rc1` | `bd07e61` | Authoritative Atlas orientation |

## Atlas agent handbooks → runtime agentIds

| Atlas handbook | Orchestration `agentId` | Comms `agentId` (when registered) | Primary worktree |
|----------------|-------------------------|-----------------------------------|------------------|
| [Agents/MasterPM.md](Agents/MasterPM.md) | `master-pm` | `master-pm` | `.worktrees/master-pm-orchestrator` |
| [Agents/DeploymentEngineer.md](Agents/DeploymentEngineer.md) | `deployment-manager` | `deployment-engineer` | `.worktrees/deployment-engineer` |
| [Agents/RevenueSystemsEngineer.md](Agents/RevenueSystemsEngineer.md) | `revenue-systems` | — | `.worktrees/revenue-sprint3` / revenue-sprint4 |
| [Agents/CRMEngineer.md](Agents/CRMEngineer.md) | `power-platform` | `crm` / crm-* WTs | CRM worktrees |
| [Agents/WebsiteEngineer.md](Agents/WebsiteEngineer.md) | — | — | master-pm / revenue staging |
| [Agents/QAEngineer.md](Agents/QAEngineer.md) | `qa-release` | `integration` | `.worktrees/qa-release-manager`, `.worktrees/crm-testing-qa` |
| [Agents/AutomationEngineer.md](Agents/AutomationEngineer.md) | `automation` | — | `.worktrees/crm-power-automate`, master-pm automation |
| [Agents/UIUXEngineer.md](Agents/UIUXEngineer.md) | `elite-ui` | — | Elite OS / staging website |
| [Agents/DataEngineer.md](Agents/DataEngineer.md) | `data-engineering` | — | sample-data, import packs, SharePoint schema |
| [Agents/FutureAgents.md](Agents/FutureAgents.md) | see registry | `executive`, `operations`, `finance`, `client-portal`, `ai-governance` | matching worktrees |
| Documentation Manager | `documentation` | `documentation-manager` | `.worktrees/documentation-knowledge-manager` |

## Registry note

`.agent-comms/registry.json` is useful for inbox/heartbeat paths but can be **stale** on `worktreePath`/`ownedPaths`. Prefer the worktree table above + [OWNERSHIP.md](OWNERSHIP.md) + `ORCHESTRATION/registry/agents.json`.

## Coordination

- Work SoR: `PROJECT_ATLAS/ORCHESTRATION/`  
- Bus: `.agent-comms/` + `docs/agents/`  
- Locks: orchestration locks + [FILE_LOCK_PROTOCOL.md](../docs/agents/FILE_LOCK_PROTOCOL.md)  
- Routing: [MASTER_PM_ROUTING.md](../docs/agents/MASTER_PM_ROUTING.md)
