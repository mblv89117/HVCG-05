# RELEASES

**As of:** 2026-07-16 22:46 UTC

## Freeze / candidate packages

| Name | Location | Status |
|------|----------|--------|
| Release Candidate RC-1 (pre-Sprint 4 Atlas checkpoint) | [Releases/Release_Candidate_RC-1.md](Releases/Release_Candidate_RC-1.md) | **VERIFIED / COMMITTED** historical checkpoint |
| Revenue Sprint 4 Phase 2 (Dev/Staging) | [Releases/Revenue_Sprint4_Phase2_DevStaging_Notes.md](Releases/Revenue_Sprint4_Phase2_DevStaging_Notes.md) | Implementation `7e4eb10`; branch tip `bf34c93`; no Production deploy |
| Track 1 Live — Internal | `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/` | **INTERNALLY_PRODUCTION_READY** · Prod |
| RC-1 Development Baseline | `releases/RC-1-Development-Baseline/` (also mirrored in deployment-engineer WT) | Development Baseline Complete |
| Sprint 1 managed export pack | `.worktrees/master-pm-orchestrator/docs/business-launch/go-live/sprint1/packages/` | Pre/go-live packaging evidence |
| v1.0.0 | `releases/v1.0.0/` | Historical SharePoint OS release |
| v1.1.0 | `releases/v1.1.0/` | Historical |
| Migrations | `releases/migrations/` | Schema migration JSON |

## Track 1 identity (from version.json)

- Tag: `Track 1 Live - Internal`
- Solution: HVCGCommandCenterDev **1.1.0.1** managed
- Frozen package SHA-256: `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf`
- Source RC-1 commit: `0f8d8ebf6542a1ea1ec679b6e382b3e00a366319`
- Git tag SHA: `302615956cea80c238172931f5901792f548f59c`

## How releases work

1. Prove in **Development** (RC-1 pattern: smoke + validation + version.json).
2. Owner approval for Production.
3. Import managed package; bind connections; smoke; declare freeze package under `releases/` or worktree `releases/`.
4. Rollback guides ship with the freeze (e.g. `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/guides/ROLLBACK.md`, RC-1 `guides/ROLLBACK_GUIDE.md`).
5. Atlas [Releases/](Releases/) holds pointers/summaries — binary packages stay in `releases/` / worktree `releases/`.

## Runbooks

- `.worktrees/deployment-engineer/deployment/release-ops/DEPLOYMENT_RUNBOOK.md`
- `.worktrees/deployment-engineer/deployment/release-ops/ROLLBACK_RUNBOOK.md`
