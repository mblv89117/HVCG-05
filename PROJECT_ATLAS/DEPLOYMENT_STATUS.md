# DEPLOYMENT_STATUS

**As of:** 2026-07-16 19:01 UTC
**Status SoR:** [CURRENT_STATE.md](CURRENT_STATE.md)

| Environment | Status | Package / tip | Notes |
|-------------|--------|---------------|-------|
| HVCG Development | Active Dev | RC-1 baseline; Revenue Sprint 2–3 on Dev/Staging code tip | Revenue code: `0073bf4` |
| HVCG Production | **LIVE—INTERNAL** (Track 1 **FROZEN**) | `Track 1 Live - Internal` | 1 flow Activated; gates Off |
| Website | Staging/preview only | go-live track3 / staging HTML | No DNS |
| Pilot data Prod | Not imported | Pre-import reports in master-pm go-live | Owner gate |
| Revenue engineering tip | Committed | `origin/cursor/revenue-sprint3-conversion` @ `0073bf49411408cced88873805b432bce4eefb31` | Sprint 1–3 COMPLETE; Sprint 4 READY TO START / NOT STARTED |
| Atlas checkpoint baseline | Committed / remote synchronized | `origin/cursor/agent-communications` @ `692d27668e2144ec0e62360941c249dfd3d92db4` | RC-1 documentation update currently uncommitted |

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
