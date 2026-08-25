# Track 1 — Production (Internal CRM)

**Status:** **FROZEN — LIVE—INTERNAL**  
**As of:** 2026-07-16 04:20 UTC  

## What Track 1 owns

Internal Production CRM slice: managed solution import, connection binding, minimal Activated flows, smoke, freeze package — **not** public website, **not** pilot import, **not** canvas.

## Freeze package

- Path: `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/`  
- Tag: `Track 1 Live - Internal` / git `Track-1-Live-Internal` @ `302615956cea80c238172931f5901792f548f59c`  
- Branch tip that declared freeze: `c726f1e` on `cursor/deployment-engineer`  
- README: `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/README.md`  
- GO_LIVE mirror: `.worktrees/deployment-engineer/deployment/release-ops/GO_LIVE_STATUS.md`

## Production identity

| Field | Value |
|-------|-------|
| Env | HVCG Production |
| Env ID | `f141a2cf-ae13-eb59-84c4-25817d899105` |
| URL | `https://orgee2f7545.crm.dynamics.com/` |
| Solution | HVCGCommandCenterDev 1.1.0.1 managed |
| Flows | **1** Activated: `HVCG_LeadQualifiedCreateOpportunity` · **14** Draft |
| Gates | Teams notify Off · client emails Off · no canvas · no pilot · no DNS |

## Must not change without new owner approval

See freeze README gates (extra flows, canvas, notify/email flags, pilot import, DNS).

## Related

- [../DEPLOYMENT_STATUS.md](../DEPLOYMENT_STATUS.md)  
- [../Agents/DeploymentEngineer.md](../Agents/DeploymentEngineer.md)  
- RC-1 precursor: `releases/RC-1-Development-Baseline/`  
