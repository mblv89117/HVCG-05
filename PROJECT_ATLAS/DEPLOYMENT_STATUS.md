# DEPLOYMENT_STATUS

**As of:** 2026-07-16 23:20 UTC
**Status SoR:** [CURRENT_STATE.md](CURRENT_STATE.md)

| Environment | Status | Package / tip | Notes |
|-------------|--------|---------------|-------|
| HVCG Development | Active Dev | RC-1 baseline; Revenue Sprints 1–4; Track 9 EOS Sprint 1 (local) | EOS uncommitted pending owner |
| HVCG Production | **LIVE—INTERNAL** (Track 1 **FROZEN**) | `Track 1 Live - Internal` | **no EOS / Sprint 4 Prod deploy** |
| Website | Staging/preview only | go-live track3 / staging HTML | No DNS |
| Pilot data Prod | Not imported | Pre-import reports in master-pm go-live | Owner gate |
| Revenue Sprint 2–3 tip | Committed | `origin/cursor/revenue-sprint3-conversion` @ `0073bf4` | COMPLETE |
| Revenue Sprint 4 Phase 1 | Committed | `origin/cursor/revenue-sprint4-activation` @ `7fd8bf2` | Activation framework |
| Revenue Sprint 4 Phase 2 | Committed | `origin/cursor/revenue-sprint4-activation` @ `7e4eb10` | Sales engine Dev/Staging only |
| Atlas authoritative tip | Committed | `origin/cursor/project-atlas-rc1` @ `bd07e61` | Sprint 4 Atlas reconciliation |
| EOS Sprint 1 | Local worktree | `cursor/track9-eos-sprint1` | **NOT committed** — owner review |

## Freeze packages

| Package | Path |
|---------|------|
| RC-1 Development Baseline | `releases/RC-1-Development-Baseline/` |
| Track 1 Live — Internal | `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/` |
| Sprint 1 managed export (pre-Prod pack) | `.worktrees/master-pm-orchestrator/docs/business-launch/go-live/sprint1/packages/` |

## Runbooks

- `.worktrees/deployment-engineer/deployment/release-ops/DEPLOYMENT_RUNBOOK.md`
- `.worktrees/deployment-engineer/deployment/release-ops/ROLLBACK_RUNBOOK.md`
- `releases/RC-1-Development-Baseline/guides/ROLLBACK_GUIDE.md`
- `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/guides/ROLLBACK.md`

## Do not

Activate extra Prod flows · publish canvas · enable client email/Teams notify · import pilot · change DNS — without new owner approval (Track-1 freeze gates).

## Status authority

Match [CURRENT_STATE.md](CURRENT_STATE.md). Track-1 package lives only under the deployment-engineer worktree (not repo-root `releases/Track-1-Live-Internal/`).

## Pre-Sprint 4 checkpoint

[Release Candidate RC-1](Releases/Release_Candidate_RC-1.md) verifies committed deployment and Revenue anchors. It does **not** include or validate existing dirty working-tree files.
