# Project Atlas Duplicate Register

| Field | Value |
|---|---|
| Purpose | Select canonical sources and define safe disposition for duplicate guidance |
| Owner | Documentation & Knowledge Manager |
| Status | IN REVIEW |
| Last verified | 2026-07-16 |
| Constraint | No source document was deleted or modified in another workspace |

## Duplicate classes

| Duplicate class | Canonical source | Duplicate locations | Proposed disposition |
|---|---|---|---|
| Live project status | `CURRENT_STATE.md` | `CONTINUATION/CURRENT_STATE.md`, Track/Sprint/Agent summaries | Keep scoped summaries; replace full repeated tables with link |
| Startup instructions | `CONTINUATION/STARTUP_SEQUENCE.md` | `START_HERE.md`, `CHATGPT_CONTINUATION_PROMPT.md`, README/handoff startup prose | Keep entry links; remove alternate workflows |
| Architecture narrative | External root/docs architecture | Atlas `ARCHITECTURE.md`, `Architecture/README.md`, track architecture pages | Atlas remains index; track pages retain only track-specific interfaces |
| Decisions | `CONTINUATION/DECISION_HISTORY.md` history; `DECISIONS.md` active index | `Decisions/README.md`, status pages | Keep index/pointer; do not duplicate reasoning |
| Track/Sprint indexes | `TRACK_INDEX.md`, `SPRINT_INDEX.md` | `Tracks/README.md`, `Sprints/README.md`, `PROJECT_INDEX.md` | Keep short navigation links only |
| Release navigation | `RELEASES.md` | `Releases/README.md`, release pages | Keep folder index and per-release detail; no repeated global status |
| Agent ownership | `AGENT_ASSIGNMENTS.md` + `OWNERSHIP.md` | `AGENT_INDEX.md`, `Agents/README.md`, role handbooks | Role pages link to ownership; no independent workspace map |
| Validation/reconciliation | `VALIDATION_REPORT.md` latest health verdict | `Reports/Atlas_Reconciliation_Sprint4.md` | Preserve historical report; label date/scope and superseding report |
| Atlas copies across worktrees | `cursor/project-atlas-rc1` | Track 9, AI, Revenue, Operations, Deployment sprint copies | Treat as proposals/snapshots; never as authority |

## Required stale-content fixes

- `Sprints/README.md` must change Sprint 4 from `NOT STARTED` to `COMPLETE (Dev/Staging)` and link to `Sprints/Sprint4.md`.
- `Releases/Release_Candidate_RC-1.md` must remain historical but gain a prominent pre-Sprint 4 checkpoint banner.
- `VALIDATION_REPORT.md` must be superseded because its “no contradictory sprint status” verdict predates the stale `Sprints/README.md` discovery.
- See [CONTRADICTION_REPORT.md](CONTRADICTION_REPORT.md).

## Elimination procedure

1. Preserve historical records and decisions.
2. Add a `DEPRECATED` or `SUPERSEDED` banner to non-canonical live guidance during Atlas-owner promotion.
3. Replace duplicate prose with a one-paragraph scoped summary and relative canonical link.
4. Move obsolete, non-historical documents to `Archive/` only with owner approval.
5. Run link and status validation.
6. Record each disposition in `CHANGELOG.md`.

## Residual duplication accepted

Track, Sprint, Agent, Release, QA, and Handoff pages may retain a short local summary because they are portable review artifacts. They must not become independent sources for current status, ownership, architecture, or decisions.

