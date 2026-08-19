# Project Atlas Documentation Master Index

| Field | Value |
|---|---|
| Purpose | Single navigation and authority map for Atlas documentation |
| Audience | Owner, agents, developers, QA, and operations |
| Owner | Documentation & Knowledge Manager |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |
| Review source | `cursor/project-atlas-rc1` at `.worktrees/project-atlas-authoritative/PROJECT_ATLAS/` |
| Proposed target | `PROJECT_ATLAS/Documentation/` on the authoritative Atlas branch after QA approval |
| Limitation | This package is uncommitted and does not supersede authoritative Atlas until promoted |

## Authority

1. `PROJECT_ATLAS/CURRENT_STATE.md` — live status source of truth.
2. `PROJECT_ATLAS/CONTINUATION/STARTUP_SEQUENCE.md` — continuation workflow.
3. `PROJECT_ATLAS/DECISIONS.md` and `PROJECT_ATLAS/CONTINUATION/DECISION_HISTORY.md` — decisions.
4. `PROJECT_ATLAS/ARCHITECTURE.md` — architecture index; detailed architecture remains outside Atlas.
5. Track, Sprint, Agent, Release, QA, Evidence, Report, and Handoff documents — scoped detail.

Chat history is never authoritative.

## Review scope

- Authoritative Atlas: 65 Markdown files on `cursor/project-atlas-rc1`.
- Parallel Atlas variants: Track 9, Revenue, AI Governance, Operations, Deployment, and other sprint worktrees.
- External evidence referenced by Atlas: root architecture/data-model docs, deployment freeze packages, Revenue OS worktrees, QA reports, and Git evidence.
- All parallel workspaces were read-only. No application, deployment, environment, or external system was changed.

## Canonical guides and controls

| Need | Document |
|---|---|
| Documentation rules | [DOCUMENTATION_STANDARDS.md](DOCUMENTATION_STANDARDS.md) |
| Folder placement | [FOLDER_STANDARDS.md](FOLDER_STANDARDS.md) |
| File and identifier naming | [NAMING_STANDARDS.md](NAMING_STANDARDS.md) |
| Architecture navigation | [ARCHITECTURE_GUIDE.md](ARCHITECTURE_GUIDE.md) |
| User orientation | [USER_GUIDE.md](USER_GUIDE.md) |
| Developer workflow | [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) |
| Operations workflow | [OPERATIONS_GUIDE.md](OPERATIONS_GUIDE.md) |
| Fast orientation | [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) |
| Orchestration onboarding | [ORCHESTRATION_AGENT_ONBOARDING.md](ORCHESTRATION_AGENT_ONBOARDING.md) |
| Sprint 12 Data Engineering registration | [SPRINT12_DATA_ENGINEERING_REGISTRATION.md](SPRINT12_DATA_ENGINEERING_REGISTRATION.md) |
| **Product docs (Elite OS)** | [product/START_HERE.md](product/START_HERE.md) · [product/MASTER_PM_PRODUCT_DOCS_STATUS.md](product/MASTER_PM_PRODUCT_DOCS_STATUS.md) |
| Interfaces and APIs | [API_CATALOG.md](API_CATALOG.md) |
| Decision navigation | [DECISION_HISTORY_INDEX.md](DECISION_HISTORY_INDEX.md) |
| Topic cross-references | [CROSS_REFERENCES.md](CROSS_REFERENCES.md) |
| Duplicate disposition | [DUPLICATE_REGISTER.md](DUPLICATE_REGISTER.md) |
| Contradictory guidance | [CONTRADICTION_REPORT.md](CONTRADICTION_REPORT.md) |
| Link findings | [BROKEN_LINK_REPORT.md](BROKEN_LINK_REPORT.md) |
| Health, risks, and debt | [DOCUMENTATION_HEALTH_REPORT.md](DOCUMENTATION_HEALTH_REPORT.md) |
| QA review packet | [QA_HANDOFF.md](QA_HANDOFF.md) |

## Existing Atlas indexes

| Domain | Canonical existing document |
|---|---|
| Full project navigation | `PROJECT_ATLAS/PROJECT_INDEX.md` |
| Tracks | `PROJECT_ATLAS/TRACK_INDEX.md` |
| Sprints | `PROJECT_ATLAS/SPRINT_INDEX.md` |
| Agents | `PROJECT_ATLAS/AGENT_INDEX.md` |
| Releases | `PROJECT_ATLAS/RELEASES.md` |
| Reports | `PROJECT_ATLAS/Reports/README.md` |
| Decisions | `PROJECT_ATLAS/DECISIONS.md` |

## Assumptions

- The dedicated `cursor/project-atlas-rc1` worktree remains the authoritative Atlas until an owner-approved successor is recorded.
- “Eliminate duplicates” means selecting one authority and replacing duplicate prose with links during promotion; this review does not delete or rewrite another agent’s files.
- All external dependencies are treated as mocked or unavailable for this documentation review. Repository evidence is the only validation source.

