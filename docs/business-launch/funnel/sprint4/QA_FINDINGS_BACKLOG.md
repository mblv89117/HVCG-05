# Sprint 4 QA Findings and Technical Debt

**QA verdict:** APPROVE WITH MINOR CHANGES
**Owner decision:** Approved for clean Dev/Staging commit
**Date:** 2026-07-16

## Technical-debt backlog converted from six QA findings

| ID | QA source | Item | Status | Priority | Estimate | Recommended sprint | Dependencies |
|---|---|---|---|---|---|---|---|
| TD-001 | DEF-S4-001 | Move Draft onboarding assignee email into pipeline configuration | **Resolved in `7e4eb10`** | P2 | 0.25 day | Sprint 4 closure | Pipeline config |
| TD-002 | DEF-S4-002 | Move capital-intent signal points into qualification configuration | **Resolved in `7e4eb10`** | P2 | 0.25 day | Sprint 4 closure | Qualification config |
| TD-003 | DEF-S4-003 | Remove embedded proposal timeline fallback; use configured or owner-scoped timeline | **Resolved in `7e4eb10`** | P2 | 0.25 day | Sprint 4 closure | Pricing timeline output |
| TD-004 | DEF-S4-004 | Unify Phase 1 Hot/Warm workflow and Phase 2 sales-qualification vocabulary | **Open** | P1 | 1 day | Proposed Sprint 5 | Owner-approved canonical vocabulary; dashboard mapping |
| TD-005 | DEF-S4-005 | Make JSON the single config source and generate/check browser `.config.js` artifacts | **Open** | P1 | 0.5 day | Proposed Sprint 5 | Node generator; CI/test hook |
| TD-006 | DEF-S4-006 | Replace `&& !auto_qualify` trigger semantics with an explicit manual-approval safety gate | **Open** | P1 | 0.5 day | Proposed Sprint 5 | Qualification decision; pipeline regression tests |

## Additional technical debt

1. Add malformed-input, missing-config, legacy-block pricing, and XSS fixture tests.
2. Replace staging forecast `×3` heuristics with an approved configurable forecast model.
3. Persist proposal and pipeline Drafts to Development CRM only through a separately approved Change Request.
4. Complete human soft UAT of EVA → sales engine → dashboard.
5. Obtain owner-approved FCFO / EXIT / ACQ / MODEL rate cards.
6. Reconcile authoritative Atlas updates on `cursor/project-atlas-rc1` through a separate Atlas commit.

None of these items authorizes Production, outbound communications, flow activation, or Sprint 5.
