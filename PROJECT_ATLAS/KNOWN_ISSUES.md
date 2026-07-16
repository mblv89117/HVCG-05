# KNOWN_ISSUES

**As of:** 2026-07-16 04:10 UTC

## Blockers / open gates

| Issue | Status | Evidence |
|-------|--------|----------|
| Sprint 3 uncommitted | **CLOSED** — committed @ `0073bf4` | `origin/cursor/revenue-sprint3-conversion` |
| Canvas unpublished | D-002 / OA-CRM-09 | RC-1 acceptance; Deployment Engineer handoff |
| Pilot client import | NOT STARTED / BLOCKED | GO_LIVE_STATUS Track 2 |
| Public website / DNS | NOT STARTED | BL-PUBLISH-1 |
| Client outbound / portal invite | Open BL-C1 | OWNER_DECISIONS |
| Full Command Center SP schema on Prod | Only 4 CRM lists confirmed provisioned for smoke; full schema NOT fully provisioned | DEPLOYMENT_ENGINEER_HANDOFF §3 |
| Soft UAT conversion CTA copy | Human QA pending | `.worktrees/revenue-sprint3/docs/business-launch/FUNNEL_STATUS.md` / handoff |
| Dev HTTP callback URL for live UI POST | Optional / not fully wired | Revenue handoff |
| Agent registry ownership drift | Stale `crm` worktreePath/ownedPaths vs live worktrees | `.agent-comms/registry.json` vs [OWNERSHIP.md](OWNERSHIP.md) |

## Technical debt (Revenue)

### Sprint 4 QA backlog

| ID | Status | Priority | Estimate | Recommended sprint | Dependency |
|---|---|---|---|---|---|
| TD-001 — Config assignee email | Resolved @ `7e4eb10` | P2 | 0.25 day | Sprint 4 closure | Pipeline config |
| TD-002 — Config capital signal points | Resolved @ `7e4eb10` | P2 | 0.25 day | Sprint 4 closure | Qualification config |
| TD-003 — Proposal timeline configuration | Resolved @ `7e4eb10` | P2 | 0.25 day | Sprint 4 closure | Pricing timeline |
| TD-004 — Unify qualification models | Open | P1 | 1 day | Proposed Sprint 5 | Canonical vocabulary |
| TD-005 — Single-source config generation | Open | P1 | 0.5 day | Proposed Sprint 5 | Generator + test hook |
| TD-006 — Trigger-condition safety | Open | P1 | 0.5 day | Proposed Sprint 5 | Explicit approval-gate decision |

Source:
`.worktrees/revenue-sprint4/docs/business-launch/funnel/sprint4/QA_FINDINGS_BACKLOG.md`.

### Prior Revenue debt

From RevenueSystemsEngineer handoff:

1. Fractional CFO / Exit / Acquisition / Modeling prices `OWNER REVIEW REQUIRED`
2. Second phone `725.577.6511` routing undefined vs `702.906.6444`
3. Conversion rules vs Sprint 2 `recommendations.js` (under revenue/master-pm EVA `js/`) duplication
4. Staging/preview copies via rsync — single SoR after commit
5. Full browser / axe a11y not run (static heuristics only)

## Documentation drift

| Stale / conflicting | Prefer instead |
|---------------------|----------------|
| Master PM go-live status still describing Prod blocked (2026-07-15 era) | `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/` + `.worktrees/deployment-engineer/deployment/release-ops/GO_LIVE_STATUS.md` |
| Bare `releases/Track-1-Live-Internal/` on main checkout | Does **not** exist — use deployment-engineer worktree path |

## Risks

| Risk | Mitigation noted in repo |
|------|--------------------------|
| Overclaiming funding/valuation in EVA | Disclaimers + valuation gate |
| Legacy HVS reprice | Name guard BLOCK |
| Schema break Sprint 1↔3 | Locked `schemaOnly` + contract tests |
| Premature Prod/publish | Freeze gates + Sprint 4 remains Dev/Staging only |
| Managed solution cannot be re-exported from Prod | Import-anchor zip + live snapshots in freeze package |
