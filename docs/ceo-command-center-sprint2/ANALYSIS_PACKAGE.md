# Track 7 — Atlas CEO Command Center
# Executive Command Center Sprint 2 — Pre-Implementation Analysis

**Authority:** HVCG Owner / Master PM
**Date:** 2026-07-17
**Branch:** `cursor/track7-ceo-command-center-sprint2`
**Worktree:** `.worktrees/ceo-command-center-sprint2`
**Base:** EOS Sprint 2 branch tip `d778f23`
**Environment:** Development / UAT only
**Commit/push/deploy:** Prohibited pending QA and owner approval

## Track determination

This sprint belongs in **Track 7 — Internal Operations**. Atlas already
defines Track 7 as owning operations hub, executive command, finance
operations, SharePoint Command Center operations, and internal SOPs.

No new track is required. Track 9 is a read-only engineering-data
dependency; Revenue Track 2 is a read-only revenue-data dependency.

The existing mock-only Executive Command Center Sprint 1 application is
the UI baseline. This sprint is therefore **Executive Command Center
Sprint 2 — Atlas CEO Command Center UAT**.

---

## 1. Impact Analysis

| Area | Impact | Breaking? |
|------|--------|-----------|
| Track 7 executive command | Extends existing React/Vite Sprint 1 app | No |
| Project Atlas | Adds build-time read-only snapshot and sprint docs | No |
| Track 9 EOS | Consumes EOS data model / snapshot | No |
| Revenue Track 2 | Consumes documented dashboard contract only | No |
| Client Portal / Operations / AI | Reuses sample contracts and labels | No |
| Production / Track 1 | No runtime connection or mutation | No |

The prior mock dashboard contains realistic-looking invented values. This
sprint replaces or explicitly labels those values so no sample amount can
be mistaken for live HVCG data.

## 2. Dependency Analysis

1. Existing app: `apps/hvcg-executive-command-center/` from
   `cursor/executive-command-center-sprint1`.
2. Atlas status/index/decision/deployment Markdown files.
3. Track 9 EOS snapshot/schema from `apps/hvcg-engineering-os/`.
4. Revenue Sprint 4 `executive-revenue-dashboard.js` data contract.
5. Agent registry / worktree model (snapshot only).
6. Existing Track 7 operations/executive architecture and data map.
7. Client Portal and AI Governance fixture contracts (Development sample
   only).

No new Microsoft 365, Dataverse, Graph, Power Automate, email, Teams,
payment, portal invitation, or Production connection is required.

## 3. Module Ownership Review

| Module | Owner | Paths |
|--------|-------|-------|
| CEO Command Center app | Track 7 Executive / Master PM | `apps/hvcg-executive-command-center/**` |
| Atlas snapshot adapter | Master PM | app `src/data` + `scripts` |
| Engineering summary | Track 9 model (read-only) | adapter only |
| Revenue summary | Track 2 model (read-only) | adapter only |
| Approval Inbox | Track 7 UI; source systems retain ownership | placeholder actions only |
| Atlas sprint docs | Master PM | `PROJECT_ATLAS/**`, sprint docs |

Shared Revenue, Track 1, deployment, and existing specialist worktrees
remain unchanged.

## 4. Existing Asset Reuse Review

| Asset | Reuse decision |
|-------|----------------|
| Executive Command Center Sprint 1 React shell, routes, styles, tests | Extend directly |
| Executive architecture / data map / KPI catalog | Reference; do not duplicate SOR |
| Track 9 EOS snapshot and release model | Consume via adapter |
| Revenue Sprint 4 executive dashboard model | Implement compatible read-only adapter |
| Operations Hub data conventions | Reuse status/queue concepts |
| Client Portal fixtures | Development sample only, clearly labeled |
| AI Governance workstream | Show governance status only; no agent execution |
| Deployment Manager | Display gates / rollback evidence only |
| Atlas | Primary repository-derived status source |

## 5. Data Source Inventory

Every displayed item carries one of these labels:

- **Repository-derived** — generated from committed Atlas/EOS evidence.
- **Development sample** — explicit non-live fixture.
- **Unavailable** — no safe source exists.
- **Live** — reserved; no live sources enabled in this sprint.

| Domain | Source | Sprint mode |
|--------|--------|-------------|
| Company / tracks / decisions / risks | Project Atlas Markdown snapshot | Repository-derived |
| Engineering / agents / releases | Track 9 EOS + git worktree snapshot | Repository-derived |
| Revenue status | Track 2 Atlas + Sprint 4 dashboard contract | Repository-derived status; numeric values unavailable |
| Client details | Client Portal fixture contract | Development sample |
| Cash / finance | Existing executive semantic spec | Unavailable (no live finance connection) |
| Operations | Track 7 Atlas/workstream status | Repository-derived |
| Approval queue | Atlas owner gates + local placeholder workflow | Repository-derived requests; actions local-only |
| Morning brief | Deterministic synthesis of above | Mixed, item-level source labels |

## 6. Security Review

- React rendering escapes dynamic text by default.
- No `dangerouslySetInnerHTML`.
- Adapter validates source labels and stale timestamps.
- Approval actions update in-memory Development state only.
- No secrets, credentials, tokens, tenant URLs, or client private data in
  app fixtures.
- No API calls to Production or Microsoft 365.
- No cross-client drillthrough; sample clients are fictional and labeled.
- No autonomous agent launch/stop/reassign.
- No outbound communications.
- No approval bypass: every action says “Development placeholder”.

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Sample data mistaken for live data | High | Persistent source badges and unavailable states |
| Dashboard becomes a second SOR | High | Build-time adapters; Atlas remains authority |
| Duplicating EOS / Revenue logic | High | Consume contracts, do not recalculate engines |
| Stale repository snapshot | Medium | Generated-at timestamp + stale warning |
| Dense technical UX | Medium | Executive home by exceptions; drill-down routes |
| Placeholder approval mistaken for execution | High | Confirmation banner; no external handler |
| Sensitive client data leakage | High | Fictional sample records only |

## 8. Testing Plan

1. Unit: adapters, source labels, health mapping, brief generation.
2. Integration: all seven modules render from one validated model.
3. Regression: prior route navigation and role protection.
4. Atlas-source validation: required Track 1/2/7/9 facts.
5. Revenue compatibility: Sprint 4 dashboard contract field names.
6. EOS compatibility: snapshot fields / deployment gates.
7. Protected-path: no Revenue, Track 1, Production modifications.
8. Security/XSS: malicious strings render as text; no unsafe HTML APIs.
9. Missing/stale data: unavailable and stale labels.
10. UAT: desktop navigation, decisions, drill-down, morning brief.

## 9. Rollback Plan

Discard this uncommitted worktree or reset the feature branch to
`d778f23`. No Production rollback exists because no deployment or live
connection is performed.

## 10. Implementation Sequence

1. Produce this analysis and UAT plan.
2. Copy the existing Sprint 1 React app into the isolated branch.
3. Replace mock-only model with source-aware Atlas CEO model.
4. Add build-time repository adapters and interface specifications.
5. Implement Executive Home and Morning Brief.
6. Implement Approval Inbox and Agent Control Center.
7. Implement Portfolio, Revenue/Clients, Engineering/Release views.
8. Add tests and run build/UAT automation.
9. Synchronize Atlas, QA handoff, user guide, release draft.
10. Stop uncommitted for QA.

## 11. Acceptance Criteria

- [x] One desktop Development/UAT application opens locally.
- [x] Seven required modules exist.
- [x] Every status/metric identifies its source type.
- [x] No invented value appears as live.
- [x] Approval actions are local Development placeholders.
- [x] Atlas portfolio includes Tracks 1–9.
- [x] Revenue numeric data is unavailable unless supplied by a safe
      Development adapter.
- [x] EOS summary consumes existing model and preserves deployment gates.
- [x] Morning brief is deterministic and evidence-based.
- [x] Unit/integration/regression/security/stale/missing/UAT tests pass.
- [x] Owner guide, QA handoff, release draft, and Atlas sync exist.
- [x] No protected system/path changed.
- [x] No commit/push/merge/deploy.

## 12. UAT Plan

See `docs/ceo-command-center-sprint2/uat/UAT_PLAN.md`.
