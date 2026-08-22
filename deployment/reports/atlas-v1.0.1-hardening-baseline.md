# Atlas v1.0.1 Production Hardening — Baseline

- **Branch:** fix/atlas-production-hardening
- **Baseline commit:** 8d3c7d58102543e80ca2ef9fa364d59c980abed2
- **Started (local):** 2026-07-21T22:05:35Z
- **Prior tag (do not move):** atlas-v1.0.0-production
- **Target tag:** atlas-v1.0.1-production
- **Prior managed package:** HVCGCommandCenterDev 1.1.5.0
- **Prod Dataverse:** https://orgee2f7545.crm.dynamics.com
- **Prod SP:** https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter
- **SWA:** https://zealous-rock-0090c7e1e.7.azurestaticapps.net
- **Account:** manny@highvaluecapitalgroup.com / manuel@highvaluecapitalgroup.com
- **EnableClientEmails:** false (until Manny authorizes)
- **Do not touch:** HVS source files; client-email / MissingDocumentReminders / RenewalReminders remain OFF

## Rollback
1. Redeploy managed zip from releases/v1.1.5/artifacts/HVCGCommandCenterDev_1.1.5.0_managed.zip if needed
2. Restore SharePoint from backups/production/<timestamp> via Restore-HVCGOS.ps1
3. Revert git to baseline commit above
4. Do NOT rewrite atlas-v1.0.0-production tag
