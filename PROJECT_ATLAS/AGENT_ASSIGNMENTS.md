# AGENT_ASSIGNMENTS (Orchestration-aligned)

**As of:** Sprint 12  
**Work SoR:** [`ORCHESTRATION/`](ORCHESTRATION/README.md)  
**Message bus:** `.agent-comms/`

## How agents start

```bash
bash scripts/orchestration/list-ready.sh --agent <agentId>
```

`agentId` values live in [`ORCHESTRATION/registry/agents.json`](ORCHESTRATION/registry/agents.json).

## Role → agentId

| Role | agentId |
|------|---------|
| Master PM | `master-pm` |
| System Architect | `system-architect` |
| Deployment Manager | `deployment-manager` |
| QA & Release | `qa-release` |
| Documentation Manager | `documentation` |
| AI Governance | `ai-governance` |
| Elite UI | `elite-ui` |
| Power Platform | `power-platform` |
| Azure Platform | `azure-platform` |
| Data Engineering | `data-engineering` | [Agents/DataEngineer.md](Agents/DataEngineer.md) · [REG-DATA-ENGINEERING-S12](ORCHESTRATION/registry/registrations/REG-DATA-ENGINEERING-S12.json) |
| Security Engineering | `security` |
| Revenue Systems | `revenue-systems` |
| Client Workspace | `client-workspace` |
| Knowledge Platform | `knowledge-platform` |
| Communications | `communications` |
| Analytics | `analytics` |
| Automation | `automation` |
| Administration | `administration` |

## Protocol

See [`ORCHESTRATION/AGENT_PROTOCOL.md`](ORCHESTRATION/AGENT_PROTOCOL.md) and [`ORCHESTRATION/CONSTITUTION.md`](ORCHESTRATION/CONSTITUTION.md).

Legacy worktree tables in older docs remain historical; **path ownership and Ready queue** supersede stale `.agent-comms/registry.json` worktree fields.
