# AGENT_ASSIGNMENTS

**As of:** 2026-07-16 04:10 UTC  
**Sources:** `docs/agents/AGENT_COMMUNICATIONS.md`, `git worktree list`, Deployment Engineer / Revenue Systems handoffs

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

## Atlas agent handbooks → runtime agentIds

| Atlas handbook | Comms `agentId` (when registered) | Primary worktree |
|----------------|-----------------------------------|------------------|
| [Agents/MasterPM.md](Agents/MasterPM.md) | `master-pm` | `.worktrees/master-pm-orchestrator` |
| [Agents/DeploymentEngineer.md](Agents/DeploymentEngineer.md) | (deployment-engineer) | `.worktrees/deployment-engineer` |
| [Agents/RevenueSystemsEngineer.md](Agents/RevenueSystemsEngineer.md) | — | `.worktrees/revenue-sprint3` |
| [Agents/CRMEngineer.md](Agents/CRMEngineer.md) | `crm` / crm-* WTs | CRM worktrees |
| [Agents/WebsiteEngineer.md](Agents/WebsiteEngineer.md) | — | master-pm / revenue staging |
| [Agents/QAEngineer.md](Agents/QAEngineer.md) | — | `.worktrees/qa-release-manager`, `.worktrees/crm-testing-qa` |
| [Agents/AutomationEngineer.md](Agents/AutomationEngineer.md) | — | `.worktrees/crm-power-automate`, master-pm automation |
| [Agents/UIUXEngineer.md](Agents/UIUXEngineer.md) | — | staging website / EVA UI |
| [Agents/DataEngineer.md](Agents/DataEngineer.md) | — | sample-data, import packs, SharePoint schema |
| [Agents/FutureAgents.md](Agents/FutureAgents.md) | `executive`, `operations`, `finance`, `client-portal`, `ai-governance`, `integration` | matching worktrees |

## Registry note

`.agent-comms/registry.json` is useful for inbox/heartbeat paths but can be **stale** on `worktreePath`/`ownedPaths`. Prefer the worktree table above + [OWNERSHIP.md](OWNERSHIP.md). Deployment Engineer and Revenue Systems Engineer are **not** first-class `agentId`s in the registry; they operate via worktrees/handoffs.

## Coordination

- Bus: `.agent-comms/` + `docs/agents/`  
- Locks: [FILE_LOCK_PROTOCOL.md](../docs/agents/FILE_LOCK_PROTOCOL.md)  
- Routing: [MASTER_PM_ROUTING.md](../docs/agents/MASTER_PM_ROUTING.md)
