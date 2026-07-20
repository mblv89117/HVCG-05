# DEPLOYMENT_STATUS

**As of:** 2026-07-19 (Master PM program audit)  
**Status SoR:** [CURRENT_STATE.md](CURRENT_STATE.md)

| Environment | Status | Package / tip | Notes |
|-------------|--------|---------------|-------|
| Elite local Owner UAT | **READY** (CONDITIONAL GO) | `cursor/atlas-integration-release` @ `95ec0fa` | http://127.0.0.1:5180/ |
| HVCG Development | Active Dev | RC-1 baseline + CRM Dev; Revenue tips | Maker/canvas gates open |
| HVCG Production | **LIVE—INTERNAL** (Track 1 **FROZEN**) | Track 1 Live — Internal | 1 flow Activated; gates Off |
| Dev SWA (Elite prior) | Live at prior SHA | `ce59f8e` recovery line | RC1 **not** yet redeployed |
| Azure staging | **NOT READY** | Sprint 11 foundations | Key Vault injection BLOCKED |
| Production Elite / Plaid / QBO | **NO-GO** | — | All quality gates required |
| Website | Staging/preview only | Track 3 | No DNS |
| Pilot data Prod | Not imported | — | Owner gate |
| Revenue engineering | COMPLETE S1–S4 Dev/Staging | `0073bf4` / `bf34c93` | Not merged into Elite RC1 |

## Freeze / release packages

| Package | Path |
|---------|------|
| Elite Integration **RC1** | `.worktrees/atlas-integration-release/PROJECT_ATLAS/Release/` |
| Elite recovery / rollback base | `.worktrees/elite-ui-release-recovery` @ `35ca684` |
| Pre–Revenue Sprint 4 **RC-1** doc lock | [Releases/Release_Candidate_RC-1.md](Releases/Release_Candidate_RC-1.md) |
| RC-1 Development Baseline | `releases/RC-1-Development-Baseline/` |
| Track 1 Live — Internal | `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/` |

## Runbooks

- `.worktrees/atlas-integration-release/PROJECT_ATLAS/Release/RELEASE_CANDIDATE_1.md` (rollback section)  
- `.worktrees/deployment-engineer/deployment/release-ops/DEPLOYMENT_RUNBOOK.md`  
- `.worktrees/deployment-engineer/deployment/release-ops/ROLLBACK_RUNBOOK.md`  
- `releases/RC-1-Development-Baseline/guides/ROLLBACK_GUIDE.md`  

## Do not

Activate extra Prod flows · publish canvas · enable client email/Teams notify · import pilot · change DNS · cut over Production Elite — without new owner approval.
