# Sprint 4 QA Findings and Technical Debt

**QA verdict:** APPROVE WITH MINOR CHANGES
**Owner decision:** Approved for clean Dev/Staging commit
**Date:** 2026-07-16

## Six independent QA findings

| ID | Severity | Finding | Commit disposition |
|---|---|---|---|
| DEF-S4-001 | Low | Draft onboarding assignee email was embedded in pipeline code | **Resolved:** moved to pipeline config |
| DEF-S4-002 | Low | Capital-intent signal used embedded `100` / `40` points | **Resolved:** moved to qualification config |
| DEF-S4-003 | Low | Proposal timeline used an embedded eight-week fallback | **Resolved:** no embedded fallback; missing timeline requires owner scoping |
| DEF-S4-004 | Low | Phase 1 qualification workflow and Phase 2 sales qualification use different vocabularies | **Backlog:** document/canonicalize one operator-facing vocabulary before broader adoption |
| DEF-S4-005 | Low | Config exists as JSON and generated browser `.config.js`, creating drift risk | **Backlog:** add a committed generator/check to CI; JSON remains source |
| DEF-S4-006 | Info | Pipeline trigger includes `&& !auto_qualify`; behavior would invert if the flag changed | **Backlog:** replace with an explicit manual-approval gate before any auto-qualify design |

## Additional technical debt

1. Add malformed-input, missing-config, legacy-block pricing, and XSS fixture tests.
2. Replace staging forecast `×3` heuristics with an approved configurable forecast model.
3. Persist proposal and pipeline Drafts to Development CRM only through a separately approved Change Request.
4. Complete human soft UAT of EVA → sales engine → dashboard.
5. Obtain owner-approved FCFO / EXIT / ACQ / MODEL rate cards.
6. Reconcile authoritative Atlas updates on `cursor/project-atlas-rc1` through a separate Atlas commit.

None of these items authorizes Production, outbound communications, flow activation, or Sprint 5.
