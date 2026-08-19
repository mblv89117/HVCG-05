# Project Atlas Contradiction Report

| Field | Value |
|---|---|
| Purpose | Record conflicting Atlas guidance and exact proposed resolution |
| Owner | Documentation & Knowledge Manager |
| Status | READY FOR QA |
| Last verified | 2026-07-16 |
| Constraint | Authoritative Atlas was read-only; fixes require Atlas owner approval |

## Open contradictions

| ID | Severity | Conflicting documents | Conflict | Authority / proposed resolution |
|---|---|---|---|---|
| ATLAS-CON-001 | HIGH | `Sprints/README.md` vs `CURRENT_STATE.md`, `SPRINT_INDEX.md`, `Sprints/Sprint4.md` | Folder index says Sprint 4 `NOT STARTED`; current sources say `COMPLETE (Dev/Staging)` at `7e4eb10` | Update `Sprints/README.md` to complete Dev/Staging and cite Sprint 4 page |
| ATLAS-CON-002 | MEDIUM | `Releases/Release_Candidate_RC-1.md` vs current state | RC-1 correctly records pre-Sprint 4 status but contains `NOT STARTED` without a prominent superseded-status banner | Preserve historical release; add banner: “Historical pre-Sprint 4 checkpoint—use CURRENT_STATE for current status” |
| ATLAS-CON-003 | MEDIUM | `VALIDATION_REPORT.md` verdict vs current files | Report says no contradictory sprint status remained, but later Sprint 4 updates left `Sprints/README.md` stale | Add superseding validation note or issue a new validation report |
| ATLAS-CON-004 | MEDIUM | `CONTINUATION/CURRENT_STATE.md` and root `CURRENT_STATE.md` | Both hold live-state prose, creating two frequently changing sources | Keep root `CURRENT_STATE.md` as SoR; continuation file becomes a pointer/portable snapshot with verification stamp |

## External drift

| ID | Severity | Source | Resolution owner |
|---|---|---|---|
| ATLAS-EXT-001 | HIGH | Master PM go-live status describes an earlier Production-blocked state | Master PM + Deployment Engineer |
| ATLAS-EXT-002 | HIGH | `.agent-comms/registry.json` CRM ownership differs from Atlas/live worktrees | Agent bus owner + Master PM |

## Authority and naming conflicts

| ID | Severity | Conflict | Authority / proposed resolution |
|---|---|---|---|
| ATLAS-CON-005 | HIGH | Some guidance may treat root `PROJECT_ATLAS/` as SoR while DEC-0011 names `cursor/project-atlas-rc1` authoritative | Keep `.worktrees/project-atlas-authoritative/PROJECT_ATLAS/` as SoR; treat root and sprint copies as stale/proposals until promoted |
| ATLAS-CON-006 | MEDIUM | Codename collision: institutional `PROJECT_ATLAS/` vs deployment framework `deployment/atlas/` | Always disambiguate as Project Atlas vs Deployment Atlas; never merge their ownership |
| ATLAS-CON-007 | MEDIUM | Bare evidence paths such as `docs/business-launch/` and `releases/Track-1-Live-Internal/` are missing on main | Require `.worktrees/<owner>/…` qualification plus branch/commit when material |

## QA remediation sequence

1. Correct `Sprints/README.md`.
2. Add historical/superseded banners to RC-1 and prior reports without rewriting history.
3. Issue a new validation report that supersedes the current verdict.
4. Reduce continuation current-state content to a clearly labeled portable snapshot or pointer.
5. Re-run status and relative-link checks.

