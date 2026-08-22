# Atlas v1.0.1 Production Release Record

- Generated: 2026-07-22T04:45:00Z
- **Verdict: GO**
- Branch: `fix/atlas-production-hardening`
- Release gate: `deployment/reports/ATLAS_V1_PRODUCTION_ABSOLUTE_GO.md`

## Git

| Item | Value |
|------|-------|
| Commit (release) | `dceea798fe18a83ba46043d802931a988480f8db` |
| Annotated tag | `atlas-v1.0.1-production` |
| Tag object | `8b12146c7e3c452e98ba2865a889baede055b11c` |
| Tag peels to commit | `dceea798fe18a83ba46043d802931a988480f8db` |
| Prior production tag | `atlas-v1.0.0-production` → `6a346aa736ba5ecaaff701c3561b1d4b1befd564` (**unchanged**) |

## Production URLs

- SWA: https://zealous-rock-0090c7e1e.7.azurestaticapps.net
- Integration Hub: https://app-atlas-integration-hub.azurewebsites.net
- SharePoint Command Center: https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter
- SharePoint Clients: https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients

## Artifacts

- Managed solution: `releases/v1.0.1/packages/HVCGAtlasProduction_1.0.1.0_managed.zip`
- Unmanaged solution: `releases/v1.0.1/packages/HVCGAtlasProduction_1.0.1.0.zip`
- Rollback package: `deployment/reports/recovery-backup-20260721-atlas-v101/`
- Related Command Center managed (1.1.5): `releases/v1.1.5/packages/HVCGCommandCenterDev_1.1.5.0_managed.zip`

## Build under UAT

- SHA (SWA deploy under test): `8d3c7d58102543e80ca2ef9fa364d59c980abed2`
- Built at: `2026-07-22T03:31:05Z`
- Asset: `index-CxXf2tXp.js`

## Gates (all GREEN)

1. AtlasClientRef migration + legacy ClientId preserved
2. Five functional flows Succeeded (DeliverableApproval real lifecycle Approve → SP Approved)
3. Safety: `hvcg_EnableClientEmails=false`; MissingDocumentReminders / RenewalReminders / Eva **Off** (live Dataverse)
4. Hosted Hub is Production Client 360 path
5. Anon + forged-header API **401**; signed-out `/clients` locked
6. Owner UAT: Microsoft sign-in; authenticated `/api/client360` **200** / **7** clients; sign-out clears access
7. HVCGAtlasProduction 1.0.1.0 packages present
8. HVS source files not modified
9. `atlas-v1.0.0-production` untouched

## Rollback instructions

1. **Do not move** `atlas-v1.0.0-production`.
2. Restore SharePoint / flow / config from `deployment/reports/recovery-backup-20260721-atlas-v101/` (and prior `recovery-backup-20260721-052723/` if needed).
3. Re-import prior managed package if solution rollback required (`releases/v1.1.5/...` or config unmanaged zip in recovery backup).
4. Redeploy prior SWA build / hub revision associated with `atlas-v1.0.0-production` (`6a346aa…`) if UI/API rollback needed.
5. Re-confirm safety env vars: `hvcg_EnableClientEmails=false`; email reminder / Eva flows remain Off.

## Owner remaining actions

- Push branch + tag when ready (not pushed by this release agent):
  - `git push -u origin fix/atlas-production-hardening`
  - `git push origin atlas-v1.0.1-production`
- Optional: import/publish `HVCGAtlasProduction_1.0.1.0_managed.zip` to Production if not already applied via prior deploy path.
