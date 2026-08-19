# Documentation Index

| Field | Value |
|-------|--------|
| Title | Documentation Index |
| Purpose | Single navigable entry point for HVCG project knowledge |
| Audience | All agents, developers, operators, owner |
| Owner | docs |
| Status | DRAFT |
| Last verified | 2026-07-15 |
| Source | Inventory across 15 worktrees / branches |
| Related | [DOCUMENTATION_MAP](DOCUMENTATION_MAP.md), [DOCUMENTATION_STANDARDS](DOCUMENTATION_STANDARDS.md), [GLOSSARY](GLOSSARY.md), [../DOCUMENTATION_STATUS.md](../DOCUMENTATION_STATUS.md) |
| Known limitations | Module docs for executive/portal/finance/ops/AI live primarily in module worktrees until merged; do not treat MAIN copy as complete |

## Authority order (resolve contradictions here)

1. **Program status:** `.worktrees/master-pm-orchestrator/MASTER_*.md` (master-pm)
2. **Architecture:** `.worktrees/system-architect/docs/architecture/` (architect) — prefer `SYSTEM_ARCHITECTURE.md` over stub `docs/architecture/ARCHITECTURE.md`
3. **Release / QA:** `.worktrees/qa-release-manager/docs/qa/` and `docs/release/` (integration)
4. **Module facts:** module worktree `docs/<module>/` + module `PROJECT_STATUS.md` / `HANDOFF.md`
5. **Navigation / glossary / debt:** this branch (`docs` agent)

When two sources disagree, **do not invent a merge**. Open a `REQUEST` on `.agent-comms/` to the owning agent.

## Stewardship documents (docs agent)

| Document | Path |
|----------|------|
| Index (this file) | `docs/INDEX.md` |
| Docs home | `docs/README.md` |
| Map | `docs/DOCUMENTATION_MAP.md` |
| Standards | `docs/DOCUMENTATION_STANDARDS.md` |
| Glossary | `docs/GLOSSARY.md` |
| Onboarding | `docs/ONBOARDING.md` |
| Known limitations | `docs/KNOWN_LIMITATIONS.md` |
| Status | `DOCUMENTATION_STATUS.md` |
| Debt | `DOCUMENTATION_DEBT.md` |
| Changelog | `DOCUMENTATION_CHANGELOG.md` |

## Executive / program

| Topic | Authoritative location |
|-------|------------------------|
| Project status | `.worktrees/master-pm-orchestrator/MASTER_PROJECT_STATUS.md` |
| Roadmap | `.worktrees/master-pm-orchestrator/MASTER_ROADMAP.md` |
| Decisions | `.worktrees/master-pm-orchestrator/MASTER_DECISION_LOG.md` |
| Risks | `.worktrees/master-pm-orchestrator/MASTER_RISK_REGISTER.md` |
| Dependencies | `.worktrees/master-pm-orchestrator/MASTER_DEPENDENCY_MAP.md` |
| Integration plan | `.worktrees/master-pm-orchestrator/MASTER_INTEGRATION_PLAN.md` |
| Release readiness | `.worktrees/master-pm-orchestrator/MASTER_RELEASE_READINESS.md` |
| Next actions | `.worktrees/master-pm-orchestrator/MASTER_NEXT_ACTIONS.md` |
| Agent directory | `.worktrees/master-pm-orchestrator/MASTER_AGENT_DIRECTORY.md` |

## Architecture

| Topic | Authoritative location |
|-------|------------------------|
| System architecture | `.worktrees/system-architect/docs/architecture/SYSTEM_ARCHITECTURE.md` |
| ADRs | `.worktrees/system-architect/docs/architecture/ARCHITECTURE_DECISIONS/` |
| Shared components | `.worktrees/system-architect/docs/architecture/SHARED_COMPONENT_CATALOG.md` |
| Naming | `.worktrees/system-architect/docs/architecture/NAMING_CONVENTIONS.md` |
| Data model | `.worktrees/system-architect/docs/data-model/` (also mirrored under `docs/data-model/` on some trees) |
| Root architecture stub | `ARCHITECTURE.md` (root) / `docs/architecture/ARCHITECTURE.md` (pointer only) |

## Modules (implementation docs — worktree-local until merged)

| Module | Agent | Docs root |
|--------|-------|-----------|
| CRM | crm | `docs/crm/` (present on MAIN; versions diverge across CRM worktrees — see debt) |
| Executive | executive | `.worktrees/executive-command-center/docs/executive/` |
| Operations | operations | `.worktrees/operations-hub/docs/operations/` |
| Finance | finance | `.worktrees/finance-operations/docs/finance/` |
| Client portal | client-portal | `.worktrees/client-portal-data-rooms/docs/portal/` |
| AI governance | ai-governance | `.worktrees/ai-governance-work-queues/docs/ai/` (+ shared `docs/ai/` on MAIN) |

## QA and release

| Topic | Authoritative location |
|-------|------------------------|
| RC status | `.worktrees/qa-release-manager/docs/release/RELEASE_CANDIDATE_STATUS.md` |
| Defect log | `.worktrees/qa-release-manager/docs/qa/QA_DEFECT_LOG.md` |
| QA dashboard | `.worktrees/qa-release-manager/docs/qa/QA_RELEASE_DASHBOARD.md` |
| Conflict report | `.worktrees/qa-release-manager/docs/qa/QA_CONFLICT_REPORT.md` |
| Version artifacts | `releases/v1.0.0/`, `releases/v1.1.0/` |
| Root release notes pointer | `RELEASE.md` |

**Release documentation gate** (docs verifies before integration marks RC ready): release notes, changelog, migration, deployment checklist, rollback, known issues, module docs match shipped behavior, user-facing changes documented, version alignment, no secrets.

## Operations / deployment (shared tree)

| Topic | Path |
|-------|------|
| Deployment guide | `docs/deployment/DEPLOYMENT_GUIDE.md` |
| Admin guide | `docs/deployment/ADMIN_GUIDE.md` |
| PnP auth | `docs/deployment/PNP_AUTHENTICATION.md` |
| Install scripts | `deployment/install/` |
| Health scripts | `deployment/health/` |
| Backup / restore | `deployment/backup/` |

## SOPs / training / security

| Topic | Path |
|-------|------|
| SOPs | `docs/sops/` |
| Training | `docs/training/` |
| Security model | `docs/security/` |
| Agent communications | `docs/agents/AGENT_COMMUNICATIONS.md` |

## Planned steward folders (scaffolded)

| Folder | Intent |
|--------|--------|
| `docs/USER_GUIDES/` | Role-based end-user guides |
| `docs/ADMIN_GUIDES/` | Admin runbooks (pointers + nets) |
| `docs/TROUBLESHOOTING/` | Symptom-oriented articles |
| `docs/KNOWLEDGE_BASE/` | Searchable taxonomy stubs |
| `docs/ARCHIVE/` | Deprecated docs with pointers |

**Note:** Do not create `docs/RELEASES/` on this volume — it collides with integration-owned `docs/release/` on case-insensitive APFS. Use `docs/release/` (integration) and `releases/`.

## Change history

- 2026-07-15 — Initial index from cross-worktree inventory.
