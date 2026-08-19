# PRODUCTION DEPLOYMENT APPROVAL REQUEST (DRAFT — DO NOT EXECUTE)

**Status:** **NOT READY FOR APPROVAL SIGN-OFF** until GL-0 completes.  
**This is the package shape you will approve once Prod env exists.**

| Field | Value |
|-------|--------|
| Exact environment | **TBD — HVCG Production** (not visible in PAC today) |
| Exact package | RC-1 baseline → managed zip to be packed from `HVCGCommandCenterDev` 1.1.0.1 |
| Exact version | **1.1.0.1** (or next managed build stamped at pack time) |
| Components | Dataverse solution lists/flows/connection refs/env vars; **not** canvas until D-002; Teams notify **Off**; client email **Off** |
| Production values required | Prod Command Center / Clients / Knowledge SharePoint site URLs; Outlook/SharePoint/Teams/Approvals connection IDs; executive/ops UPNs |
| Expected downtime | ~15–45 min for solution import + binding (estimate) |
| Risks | Wrong site URLs; accidental Dev URL import; notification misfire if flags flipped; canvas gap |
| Rollback | `releases/RC-1-Development-Baseline/guides/ROLLBACK_GUIDE.md` + pre-deploy backup |
| Actions you must perform | (1) GL-0 create/select Prod env (2) Create Prod SP sites or confirm URLs (3) Consent connections in Prod Maker (4) Sign this approval |
| Recommendation | **Do not approve deploy yet.** Complete GL-0 first, then return this form filled for your **GO**. |

**COO will not import to Production until you reply with an explicit approval naming environment + package hash.**
