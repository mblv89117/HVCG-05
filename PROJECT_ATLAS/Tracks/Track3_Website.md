# Track 3 — Website

**Status:** **IN PROGRESS** (staging / preview) · public DNS **NOT STARTED**  
**As of:** 2026-07-16 04:11 UTC  
**Sources:** GO_LIVE_STATUS (deployment-engineer); OWNER_DECISIONS BL-W1-STAGING closed for testing; BL-PUBLISH-1 open

## What Track 3 owns

Public marketing site, staging HTML (~business-launch website), Track3 preview package, Forms→website transition toward EVA.

## Evidence locations

| Area | Path |
|------|------|
| Staging site | `.worktrees/master-pm-orchestrator/docs/business-launch/website/staging/` |
| EVA app (synced) | `.worktrees/master-pm-orchestrator/docs/business-launch/website/staging/assessments/eva/` (SoR until commit: `.worktrees/revenue-sprint3/.../assessments/eva/`) |
| Go-live preview | `.worktrees/master-pm-orchestrator/docs/business-launch/go-live/track3-website/` |
| Preview serve | `.worktrees/master-pm-orchestrator/docs/business-launch/go-live/track3-website/serve_preview.sh` → historically `http://127.0.0.1:8765` |
| Preview deploy notes | `.worktrees/deployment-engineer/deployment/release-ops/WEBSITE_PREVIEW_DEPLOYMENT.md` |
| Public launch plan | `.worktrees/deployment-engineer/deployment/release-ops/WEBSITE_PUBLIC_LAUNCH_PLAN.md` |

## Gates

- Staging testing: approved (BL-W1-STAGING)  
- Public publish / DNS: **BL-PUBLISH-1 / GL-PUBLISH-1** required  
- No Prod website publish as part of Track 1 freeze  

## Related agents

[../Agents/WebsiteEngineer.md](../Agents/WebsiteEngineer.md), [../Agents/UIUXEngineer.md](../Agents/UIUXEngineer.md), Revenue (EVA)
