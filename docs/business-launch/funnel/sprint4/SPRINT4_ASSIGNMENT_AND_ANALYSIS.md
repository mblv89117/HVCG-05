# Revenue Sprint 4 — Assignment & Required Analysis

**Authority:** Master Project Management Agent
**Assigned:** 2026-07-16T22:24:00Z
**Owner:** HVCG Owner
**Executing agent:** Revenue Systems Engineer (reactivated for Sprint 4)
**Branch:** `cursor/revenue-sprint4-activation`
**Worktree:** `.worktrees/revenue-sprint4`
**Base tip:** Phase 1 @ `7fd8bf270dc080eea9a3326184707169a3b120ca` on Sprint 3 tip `0073bf4`
**Environment:** Development / Staging only
**Commit/push:** Owner-approved Dev/Staging commit `7e4eb10`; deploy remains prohibited

## Assignment decision

Owner assigned Revenue Sprint 4 with five sales-engine modules. This supersedes the Atlas gate “Sprint 4 READY TO START — NOT STARTED.”

Phase 1 (conversion activation framework) already exists on this branch and is **retained / not redesigned**. Sprint 4 delivery under this assignment is **Phase 2 — Automated Sales Engine**, additive on Phase 1 + Sprint 3 conversion.

## Impact Analysis

| Area | Impact | Breaking? |
|------|--------|-----------|
| Sprint 3 conversion engine | Consumed as input; not modified | No |
| Sprint 4 Phase 1 activation | Extended via optional Phase 2 modules | No |
| Locked EVA CRM `schemaOnly` keys | Unchanged | No |
| Track 1 Production | Untouched | No |
| LeadQualified / EvaForm flows | Referenced Draft-only; not modified | No |
| Client outbound / email / Teams | Explicitly blocked | No |
| Existing-client / legacy pricing | Legacy guard BLOCK remains | No |
| Executive / Ops / Portal / Finance apps | Not modified; dashboard data layer only | No |

## Dependency Analysis

1. Sprint 3 `HVCG_EVA_CONVERSION.build()`
2. Sprint 4 Phase 1 `HVCG_EVA_ACTIVATION` + nurture framework
3. `PRICING_ENGINE_SPEC` / rate card version `HVCG-PRICE-2026-07-15-v1`
4. SharePoint list contracts: Leads, Opportunities, Proposals (Draft), RevenueForecastLines
5. Existing Draft flows for opportunity / onboarding / workspace (not activated)
6. Owner-review SKUs: FCFO / EXIT / ACQ / MODEL

## Architecture Review

Reuse composition:

`EVA answers → conversion-engine → pricing-engine (config) → sales-qualification (config) → proposal-generator → pipeline-automation (Draft shells) → executive-revenue-dashboard data model → activation.build() additive blob`

No duplicate conversion logic. No CRM schema mutation. No Production writes. Future PDF / portal / live CRM integrations consume Draft objects without redesign.

## Module Ownership Review

| Module | Owner | Paths |
|--------|-------|-------|
| AI Pricing Engine | Revenue Systems Engineer | `eva/js/pricing-engine.js`, `funnel/sprint4/config/pricing-engine.config.json` |
| Proposal Generator | Revenue Systems Engineer | `eva/js/proposal-generator.js` |
| Sales Qualification Engine | Revenue Systems Engineer | `eva/js/sales-qualification-engine.js`, qualification config |
| Pipeline Automation (Draft) | Revenue Systems Engineer | `eva/js/pipeline-automation.js`, pipeline config |
| Executive Revenue Dashboard data | Revenue Systems Engineer | `eva/js/executive-revenue-dashboard.js` (+ extend local board) |
| Shared Atlas roots | Master PM | After handoff only |
| Production / Track 1 | Deployment Engineer | Frozen — out of scope |

## Security Review

- No client communications enabled.
- No secrets added.
- Legacy guard enforced before pricing / pipeline Draft creation.
- Money fields for CRM `schemaOnly` remain blank until owner quote.
- Draft proposals default to `ProposalStatus: Draft`.
- Pipeline shells set `communications_enabled: false`, `production_writes: false`.

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Hard-coded pricing drift | High | Config JSON is sole rate/rule source |
| Auto-qualify into Prod | Critical | `auto_qualify: false`; Prod stage BLOCKED |
| Owner-review SKU pricing applied | High | Confidence + OWNER_APPROVAL_REQUIRED flags |
| Atlas / branch tip desync | Medium | Master PM reconciles after owner review |
| Phase 1 regression | Medium | Keep S3 + S4 Phase 1 test suites green |

## Testing Plan

1. Unit: each Phase 2 engine
2. Integration: conversion → pricing → qualification → proposal → pipeline → dashboard
3. Regression: `run_conversion_tests.js` (33/33) + `run_activation_tests.js`
4. Security: outbound/Prod/auto-qualify flags remain false
5. Performance: local engine builds under interactive latency
6. Documentation + Atlas validation

## Rollback Plan

1. Remove Phase 2 script tags / activation wiring.
2. Delete Phase 2 JS + configs if required.
3. Revert to Phase 1 tip `7fd8bf2` behavior (activation only).
4. Track 1 / Production require no rollback (untouched).

## Deployment Plan

- **Dev/Staging only.** No PAC deploy, no flow activation, no DNS, no canvas publish.
- Optional later: persist Draft proposal/pipeline blobs into Dev Notes after owner approval.
- Production remains frozen.

## Atlas Documentation Plan

Update after implementation (Master PM): CURRENT_STATE, CHANGELOG, NEXT_ACTIONS, SPRINT_INDEX / Sprint4, Track2, ROADMAP, DEPLOYMENT_STATUS (no Prod change), Agent handoff, CONTINUATION live files, QA notes, release notes (Dev/Staging).

## Deliverables checklist

- [x] Implementation Plan (this doc + Phase 2 spec)
- [x] Task Breakdown / Engineering Sequence (below)
- [x] Estimated Effort
- [x] Risks / Dependencies / Acceptance Criteria
- [x] Developer / QA / Deployment / Atlas checklists

## Engineering sequence

1. Configs for pricing + qualification + pipeline
2. Pricing engine
3. Sales qualification engine
4. Proposal generator
5. Pipeline automation (Draft)
6. Executive revenue dashboard data layer
7. Wire into activation.build
8. Tests + regression
9. Atlas + handoff
10. Stop for owner review (no Sprint 5)

## Estimated effort

| Workstream | Estimate |
|------------|----------|
| Analysis + configs | 0.5 day |
| Five engines + wiring | 1.5 days |
| Tests + QA packet | 0.5 day |
| Atlas sync + handoff | 0.5 day |
| **Total** | **~3 days** (single Revenue agent + Master PM docs) |

## Acceptance criteria

1. Pricing engine returns configurable recommended services, retainer, success fee, timeline, confidence, reasoning — no hard-coded business rules in engine code.
2. Proposal generator produces Draft proposal data with required fields + PDF placeholder.
3. Qualification engine classifies into the five bands via configurable scoring.
4. Pipeline automation produces Draft opportunity / project / folder / checklist / portal / onboarding shells without communications or Prod writes.
5. Executive revenue dashboard data model exposes required KPIs; local board extended, not redesigned.
6. Sprint 3 + Phase 1 tests still pass; Phase 2 suite passes.
7. Atlas synchronized; handoff complete.
8. No merge/deploy/Prod/email/Teams/DNS without separate owner approval.

## Completion outcome

Owner decision: **APPROVE WITH MINOR CHANGES**. DEF-S4-001–003 were
resolved before the clean commit. Sprint 4 was committed and pushed to
`origin/cursor/revenue-sprint4-activation` @ `7e4eb10`. No merge,
deployment, Production mutation, communication activation, or Sprint 5
implementation occurred.
