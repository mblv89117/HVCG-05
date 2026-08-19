# Project Atlas Documentation Health Report

| Field | Value |
|---|---|
| Purpose | Summarize documentation completeness, consistency, risk, and debt |
| Owner | Documentation & Knowledge Manager |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |
| Scope | Authoritative Atlas (65 Markdown files), parallel Atlas variants, and proposed documentation package |

## Executive summary

Atlas has a strong orientation core: an explicit authority branch, current-state source of truth, continuation workflow, track/sprint/agent indexes, decision history, deployment freeze records, and a prior link validation pass. Its main weakness is repeated status, startup, ownership, and architecture guidance across authoritative pages and parallel worktree copies. Those copies are useful handoff snapshots but are not consistently labeled as non-authoritative.

This package adds missing governance, audience guides, interface catalog, cross-references, duplicate disposition, and QA handoff. It changes documentation only and remains uncommitted.

## Inventory

| Area | Files |
|---|---:|
| Authoritative Atlas total | 65 |
| Agents | 11 |
| Tracks | 9 |
| Sprints | 7 |
| Continuation | 7 |
| Architecture | 2 |
| Releases | 3 |
| Reports | 2 |
| QA | 1 |
| Handoffs | 1 |
| Root/other indexes and placeholders | 22 |

Parallel Atlas copies also exist in Track 9, AI Governance, Operations, Deployment, Revenue, and sprint worktrees. They are proposals or snapshots; `cursor/project-atlas-rc1` remains authoritative.

## Health score

**70 / 100 — serviceable, with one high-priority status contradiction and governance work required.**

| Dimension | Score | Finding |
|---|---:|---|
| Authority clarity | 18/20 | Dedicated branch and SoR declared |
| Navigation | 16/20 | Strong indexes; no unified audience guide before this package |
| Evidence discipline | 16/20 | Commits/reports cited; some external path drift |
| Consistency | 7/20 | `Sprints/README.md` is stale; repeated status/startup/ownership prose and parallel copies |
| Operations/release safety | 8/10 | Freeze and gates clear |
| Link health | 5/5 | No known internal break in latest validation |
| API/interface discoverability | 0/5 | Missing before this package |

## Risks

| ID | Severity | Risk | Mitigation |
|---|---|---|---|
| DOC-RISK-001 | HIGH | Parallel Atlas copies may be mistaken for authority | Banner snapshots; link to authoritative branch |
| DOC-RISK-002 | HIGH | Repeated live status can drift | Keep `CURRENT_STATE.md` as sole status SoR |
| DOC-RISK-003 | HIGH | External worktree paths are not portable | Include branch/commit and owner |
| DOC-RISK-004 | MEDIUM | Architecture summaries can become a second SoR | Keep Atlas architecture index-only |
| DOC-RISK-005 | MEDIUM | Missing interface specs invite cross-track assumptions | Use `API_CATALOG.md` and interface proposals |
| DOC-RISK-006 | MEDIUM | Absolute environment URLs in handoffs may be over-trusted | Label external/mock and gate live use |
| DOC-RISK-007 | HIGH | Sprint 4 status conflicts in the Sprint folder index | Correct index and supersede validation verdict |
| DOC-RISK-008 | HIGH | Root/main Atlas and sprint copies can be mistaken for authority under DEC-0011 | Prefer `cursor/project-atlas-rc1`; banner all other copies |
| DOC-RISK-009 | MEDIUM | “Project Atlas” name also used by `deployment/atlas/` deployment framework | Disambiguate Project Atlas vs Deployment Atlas in all indexes |
| DOC-RISK-010 | MEDIUM | Bare evidence paths fail on main checkout | Always qualify worktree paths |

## Technical debt

| ID | Severity | Debt | Owner | Status |
|---|---|---|---|---|
| DOC-DEBT-ATLAS-001 | HIGH | Label non-authoritative Atlas copies across worktrees | Atlas owner / track owners | OPEN |
| DOC-DEBT-ATLAS-002 | HIGH | Replace repeated full status tables with scoped links | Atlas owner | OPEN |
| DOC-DEBT-ATLAS-003 | HIGH | Reconcile stale Master PM go-live status | Master PM / Deployment | OPEN |
| DOC-DEBT-ATLAS-004 | HIGH | Reconcile agent registry ownership drift | Bus owner / Master PM | OPEN |
| DOC-DEBT-ATLAS-005 | MEDIUM | Add metadata to all 65 authoritative documents | Documentation | OPEN |
| DOC-DEBT-ATLAS-006 | MEDIUM | Add missing website/portal/finance/canvas interface specs | Owning tracks | OPEN |
| DOC-DEBT-ATLAS-007 | MEDIUM | Promote user/developer/operations/quick-start guides | Atlas owner / QA | IN REVIEW |
| DOC-DEBT-ATLAS-008 | LOW | Normalize index naming and status vocabulary | Documentation | OPEN |
| DOC-DEBT-ATLAS-009 | HIGH | Correct stale Sprint 4 `NOT STARTED` entry and revalidate | Atlas owner / QA | OPEN |

## Recommended next sprint

**Atlas Documentation Governance Sprint 1 (documentation-only)**

1. QA-validate and promote this `Documentation/` package.
2. Add authority/snapshot banners to every parallel Atlas copy.
3. Correct Sprint 4 status in `Sprints/README.md`, banner historical RC-1, and issue a superseding validation report.
4. Add required metadata to all authoritative files.
5. Create interface specifications for website publish, portal outbound, payments, canvas publish, and Production SharePoint schema.
6. Re-run link, sensitive-content, path, branch, and commit validation.
7. Publish a health score and closed debt list.

No application work, merge, deployment, or external-system validation belongs in this sprint.

