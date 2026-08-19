# Glossary

| Field | Value |
|-------|--------|
| Title | HVCG Documentation Glossary |
| Purpose | Canonical terms, aliases, owners, and related docs |
| Audience | All agents and contributors |
| Owner | docs |
| Status | DRAFT |
| Last verified | 2026-07-15 |
| Source | Architecture + master-pm + README evidence |
| Related | [INDEX](INDEX.md), [DOCUMENTATION_STANDARDS](DOCUMENTATION_STANDARDS.md) |
| Known limitations | Incomplete; expand as module agents confirm terms |

| Canonical term | Aliases | Definition | Owning module | Related docs |
|----------------|---------|------------|---------------|--------------|
| HVCG OS | HVCG Project Management System | Microsoft 365 operating system for High Value Capital Group | master-pm | README.md |
| SharePoint Lists SoR | Lists, Microsoft Lists | Version 1 system of record for operational data | architect | ADR-0001, SYSTEM_ARCHITECTURE.md |
| Command Center | HVCG OS Command Center, HVCG Command Center | Power Apps canvas shell | architect / modules | SYSTEM_ARCHITECTURE.md |
| Development environment | Dev, HVCG Development | Non-production environment for smoke and build | integration | docs/deployment/ |
| Production | Prod | Live environment — untouched unless owner + QA gate | integration / master-pm | MASTER_RELEASE_READINESS.md |
| Agent communications bus | `.agent-comms/`, bus | Repository-backed JSON messaging between agents | master-pm (infra) | docs/agents/AGENT_COMMUNICATIONS.md |
| docs | Documentation and Knowledge Manager | Canonical documentation steward agent | docs | DOCUMENTATION_STATUS.md |
| architect | System Architect | Owns technical architecture and ADRs | architect | docs/architecture/ |
| master-pm | Master Project Manager | Owns program status, priorities, MASTER_* files | master-pm | MASTER_PROJECT_STATUS.md |
| integration | QA/Release, QA Integration Release Manager | Owns QA gates and release candidate verdict | integration | docs/release/ |
| crm | Opportunity CRM | CRM module agent | crm | docs/crm/ |
| executive | Executive Command Center | Executive dashboards / KPI module | executive | docs/executive/ (worktree) |
| operations | Operations Hub | Operations module agent | operations | docs/operations/ (worktree) |
| finance | Finance Operations | Finance module agent | finance | docs/finance/ (worktree) |
| client-portal | Client Portal & Data Rooms | Portal / data rooms module | client-portal | docs/portal/ (worktree) |
| ai-governance | AI Governance & Work Queues | AI orchestration and human-gated queues | ai-governance | docs/ai/ |
| Intelligence Layer | HVCG_Relationships | Cross-domain graph edges on SharePoint Lists | architect / AI | docs/intelligence/ |
| ADR | Architecture Decision Record | Accepted technical decision | architect | ARCHITECTURE_DECISIONS/ |
| RC | Release Candidate | Package meeting integration release criteria | integration | RELEASE_CANDIDATE_STATUS.md |
| D-001 | OA-CRM-05 | Owner decision: Maker connector consent | master-pm / crm | MASTER_DECISION_LOG.md |
| D-002 | OA-CRM-09 | Owner decision: CRM canvas Maker build | master-pm / crm | MASTER_DECISION_LOG.md |
| D-003 | Merge approval | Owner decision when Master issues merge packet | master-pm | MASTER_DECISION_LOG.md |
| READY FOR INTEGRATION | Ready handoff | Module claims offline acceptance and awaits QA | integration | Module HANDOFF.md |
| VERIFIED (docs) | — | Document checked against repository evidence by docs | docs | DOCUMENTATION_STANDARDS.md |
| STALE (docs) | — | Document past review interval or contradictory to evidence | docs | DOCUMENTATION_STANDARDS.md |
| Exclusive module indexes | Exclusive indexes | Module-owned index files not shared across agents | architect | ADR-0003 |
| Shared connection references | Connection refs | Shared Power Platform connection references | architect | ADR-0002 |
| Human-gated AI | No autonomous send | AI outputs require human approval before external send | ai-governance | docs/ai/AI_GOVERNANCE.md |

## Change history

- 2026-07-15 — Initial glossary from inventory and architecture terms.
