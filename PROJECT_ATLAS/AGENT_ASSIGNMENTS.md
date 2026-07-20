# AGENT_ASSIGNMENTS

**As of:** 2026-07-19 (Master PM program audit)  
**Sources:** `git worktree list`, specialist handoffs, Elite RC1 Release pack  
**Note:** `.agent-comms/registry.json` heartbeats (Jul 15) are **stale** — prefer this table.

## Active git worktrees (program-critical)

| Worktree | Branch | HEAD | Role / status |
|----------|--------|------|---------------|
| `.` (repo root) | `cursor/agent-communications` | `912d3ca` | Orientation / parallel auth docs |
| `.worktrees/atlas-integration-release` | `cursor/atlas-integration-release` | `95ec0fa` | **Integration & Release — Elite RC1 SoR** |
| `.worktrees/elite-ui-release-recovery` | `cursor/elite-ui-release-recovery` | `35ca684` | Elite recovery base / rollback |
| `.worktrees/track10-elite-ui` | `cursor/track10-elite-microsoft-ui` | `cd2bd72` | Track 10 UAT package — **freeze forks** |
| `.worktrees/plaid-integration` | `cursor/plaid-integration` | `6d78514` | Plaid / Banking tip |
| `.worktrees/quickbooks-integration` | `cursor/quickbooks-integration` | `c892215` | QBO tip (**unmerged**) |
| `.worktrees/finance-intelligence-sprint1` | `cursor/finance-intelligence-sprint1` | `c287508` | Finance Intel Sprint 1 (deferred) |
| `.worktrees/finance-operations` | `cursor/finance-operations` | `c79d35b` | Finance Ops READY |
| `.worktrees/client-portal-data-rooms` | `cursor/client-portal-data-rooms` | `b8b2005` | Portal DR READY |
| `.worktrees/client-portal-sprint1` | `cursor/client-portal-sprint1` | `1d399eb` | Portal React MVP (adapter only) |
| `.worktrees/executive-command-center` | `cursor/executive-command-center-active` | `e074cfc` | ECC package READY |
| `.worktrees/executive-intelligence-sprint1` | `cursor/executive-intelligence-sprint1` | `5bb42c2` | Exec Intel mock (deferred) |
| `.worktrees/ai-governance-sprint1` | `cursor/ai-governance-sprint1` | `0dc0c6f` | AI Gov SPA (deferred) |
| `.worktrees/ai-governance-work-queues` | `cursor/ai-governance-work-queues` | `fc1fa79` | AI list schemas READY |
| `.worktrees/operations-hub` | `cursor/operations-hub` | `a584f61` | Ops Hub SP READY |
| `.worktrees/operations-hub-sprint1` | `cursor/operations-hub-sprint1` | `0f8f6da` | Ops Sprint1 mock (deferred) |
| `.worktrees/deployment-engineer` | `cursor/deployment-engineer` | `c726f1e` | Track 1 freeze |
| `.worktrees/deployment-manager-sprint1` | `cursor/deployment-manager-sprint1` | `2290456` | Deploy manager scaffold (stale on S4) |
| `.worktrees/revenue-sprint3` | `cursor/revenue-sprint3-conversion` | `0073bf4` | Revenue S2–3 COMPLETE |
| `.worktrees/revenue-sprint4` | `cursor/revenue-sprint4-activation` | `bf34c93` | Revenue S4 COMPLETE |
| `.worktrees/project-atlas-authoritative` | `cursor/project-atlas-rc1` | `bd07e61` | Atlas Revenue reconcile |
| `.worktrees/sprint11-azure-production-migration` | `cursor/sprint11-azure-production-migration` | `a386d81` | Azure Sprint 11 COMPLETE |
| `.worktrees/track9-eos-sprint2` | `cursor/track9-eos-sprint2` | `d778f23` | EOS S2 COMPLETE |
| `.worktrees/qa-release-manager` | `cursor/qa-release-manager` | `2c064b3` | QA — **rebase to RC1 required** |
| `.worktrees/documentation-knowledge-manager` | `cursor/documentation-knowledge-manager` | `2c064b3` | Docs — refresh to RC1 |
| `.worktrees/master-pm-orchestrator` | `cursor/master-pm-orchestrator` | `b75b19b` | Historical Master PM (stale tip) |
| `.worktrees/system-architect` | `cursor/system-architect` | `b75b19b` | Architecture |
| CRM worktrees (`crm-*`) | `agent/crm-*` | various | CRM packages / Maker OA lineage |

## Specialist → primary worktree

| Specialist | Primary worktree | Completion posture |
|------------|------------------|--------------------|
| Master PM / Executive PMO | This Atlas tree + `master-pm-orchestrator` | Audit refreshed 2026-07-19 |
| Integration & Release | `atlas-integration-release` | RC1 CONDITIONAL GO / Prod NO-GO |
| Security Engineering | Plaid/Portal QA security docs | Sandbox CONDITIONAL; Prod NO-GO |
| QuickBooks Integration | `quickbooks-integration` | Tip ~75%; not in RC1 |
| Finance Intelligence | `finance-intelligence-sprint1` | Sprint1 mock COMPLETE; deferred |
| Data Engineering | sample-data / import packs | Pilot gated |
| Client Portal | `client-portal-data-rooms` + `client-portal-sprint1` | READY / MVP awaiting adapter |
| Knowledge / Documentation | `documentation-knowledge-manager` | Rebase to RC1 |
| Revenue OS | `revenue-sprint4` | S4 COMPLETE Dev/Staging |
| Executive Intelligence | `executive-intelligence-sprint1` + ECC | Deferred / READY package |
| Administration | Elite Admin routes in RC1 | Live role QA pending |
| AI Governance | `ai-governance-sprint1` + `ai-governance-work-queues` | Deferred / READY |
| Azure Platform | `sprint11-azure-production-migration` | Sprint11 COMPLETE |
| Power Platform / CRM | CRM WTs | Offline PASS; Maker/canvas gated |
| QA | `qa-release-manager` | Must adopt RC1 SoR |

## Coordination

- Bus: `.agent-comms/` + `docs/agents/`  
- Locks: [FILE_LOCK_PROTOCOL.md](../docs/agents/FILE_LOCK_PROTOCOL.md)  
- Routing: [MASTER_PM_ROUTING.md](../docs/agents/MASTER_PM_ROUTING.md)  
- Shared Atlas roots remain Master PM lock (see prior PARALLEL_WORKSTREAM_CONTROL — superseded for priority by Elite RC1 freeze)
