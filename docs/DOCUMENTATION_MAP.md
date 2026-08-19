# Documentation Map

| Field | Value |
|-------|--------|
| Title | Documentation Map |
| Purpose | Show hierarchy, owners, and discoverability taxonomy |
| Audience | docs, master-pm, architect, integration, module agents |
| Owner | docs |
| Status | DRAFT |
| Last verified | 2026-07-15 |
| Source | Cross-worktree inventory (15 trees, 166 unique markdown relpaths, 914 instances) |
| Related | [INDEX](INDEX.md), [DOCUMENTATION_STANDARDS](DOCUMENTATION_STANDARDS.md) |
| Known limitations | Percentages and completeness are inventory-based, not release-verified |

## Hierarchy

```text
1. Executive / program          → master-pm MASTER_*.md
2. Architecture                 → architect docs/architecture/ + ADRs
3. Developer                    → README, ARCHITECTURE, docs/agents/, tests/
4. Operations                   → docs/deployment/, deployment/*, docs/sops/
5. Module                       → docs/<module>/ in owning worktree
6. User                         → docs/USER_GUIDES/ (scaffold) + docs/training/
7. Release                      → integration docs/release/, docs/qa/, releases/
8. Knowledge stewardship        → docs INDEX/MAP/GLOSSARY + DOCUMENTATION_*
```

## Knowledge-base taxonomy

| Topic | Primary docs |
|-------|----------------|
| Architecture | `SYSTEM_ARCHITECTURE.md`, ADRs, `ARCHITECTURE.md` |
| Development | README quick start, module build guides, `docs/agents/` |
| Deployment | `docs/deployment/`, `deployment/` scripts |
| Power Apps | Module `POWER_APPS_BUILD_GUIDE.md` where present |
| Power Automate | Module flow guides / owner guides |
| SharePoint | List schemas under `src/sharepoint/`, data-model docs |
| Dataverse | Deferred v1 — see licensing / architecture |
| Power BI | architecture + executive Power BI specs |
| Copilot | `docs/architecture/COPILOT_READY.md`, module Copilot docs |
| Security | `docs/security/` |
| CRM | `docs/crm/` |
| Finance | `.worktrees/finance-operations/docs/finance/` |
| Operations | `.worktrees/operations-hub/docs/operations/` |
| Portal | `.worktrees/client-portal-data-rooms/docs/portal/` |
| AI Governance | `docs/ai/` + AI worktree lists |
| Agent Communications | `docs/agents/AGENT_COMMUNICATIONS.md`, `.agent-comms/` |
| QA and Release | `docs/qa/`, `docs/release/` (qa-release-manager worktree) |
| Troubleshooting | `docs/TROUBLESHOOTING/` (scaffold) |
| SOPs | `docs/sops/` |

## Worktree documentation footprint (inventory)

| Worktree | Unique doc-only files (approx) | Notes |
|----------|--------------------------------|-------|
| MAIN | 15 unique + shared | Active CRM dirty; agent-comms branch tip |
| executive-command-center | 22 unique | Full `docs/executive/` |
| client-portal-data-rooms | 17 unique | Full `docs/portal/` |
| qa-release-manager | 16 unique | `docs/qa/`, `docs/release/` |
| master-pm-orchestrator | 10 unique | `MASTER_*.md` control plane |
| system-architect | 9 unique | Architecture pack + ADRs |
| finance-operations | 6 unique | `docs/finance/` |
| operations-hub | 3 unique | `docs/operations/` |
| crm-* worktrees | CRM doc variants | Conflicting CRM report hashes |
| documentation-knowledge-manager | Steward docs (this branch) | Canonical nav being built |

## Conflict hotspots (same path, different content)

| Path | Issue |
|------|-------|
| `PROJECT_STATUS.md` | Diverges across nearly all worktrees |
| `PROJECT_HANDOFF.md` | Multiple hashes |
| `NEXT_SESSION.md` | Multiple hashes |
| `docs/crm/ACCEPTANCE_REPORT.md` | MAIN vs others disagree |
| `docs/crm/CONSOLIDATED_ACCEPTANCE_REPORT.md` | crm-integration differs |
| `docs/crm/PARALLEL_AGENT_MAP.md` | crm-docs-owner / crm-integration differ |
| `docs/crm/OPPORTUNITY_MANAGEMENT.md` | Older CRM worker trees differ |
| `AGENT_COMMS_ACTIVATE.md` | Per-agent activate copies |

**Policy:** Treat module handoffs in the **owning worktree** as facts for that module. Treat MAIN CRM reports as live-smoke working copies pending CRM reconciliation (see master-pm hygiene note). Docs agent does not rewrite module reports without REQUEST + lock.

## Missing steward surfaces (created or scaffolded this session)

- `docs/INDEX.md`, `docs/README.md`, `docs/DOCUMENTATION_MAP.md`, `docs/DOCUMENTATION_STANDARDS.md`, `docs/GLOSSARY.md`
- `docs/ONBOARDING.md`, `docs/KNOWN_LIMITATIONS.md`
- `DOCUMENTATION_STATUS.md`, `DOCUMENTATION_DEBT.md`, `DOCUMENTATION_CHANGELOG.md`
- Folders: `USER_GUIDES/`, `ADMIN_GUIDES/`, `TROUBLESHOOTING/`, `ARCHIVE/`, `KNOWLEDGE_BASE/`

## Change history

- 2026-07-15 — Initial map from inventory.
