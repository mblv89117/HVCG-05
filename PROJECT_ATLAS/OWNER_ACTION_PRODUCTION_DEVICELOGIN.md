# Project Atlas — Owner Actions (Production)

**Status (2026-07-21):** Production SharePoint DeviceLogin / schema deploy is **COMPLETE**.

## Completed

- Production site https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter
- 82/82 lists · 1170 fields compliant · 7 clients imported (ACCG01…LIEN01)
- Graph live probe confirmed `HVCG_Clients` = 7
- Elite local Clients UI + HVS link-first docs verified for priority clients
- Hub `:8790` + Elite `:5180` healthy; LaunchAgents installed

## ONE owner action now (hosted Atlas UI)

Local LaunchAgents keep hub/Elite on this Mac after Cursor closes — they are **not** a public Production URL.

Preferred durable path (repo config): **Azure Static Web Apps** `swa-atlas-elite-os-dev`.

```bash
az login
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-integration-release"
./scripts/deploy-swa-dev.sh
```

1. Sign in to Azure as the HVCG Production subscription owner (`ebc84d85-b5ff-4c4b-add1-b0a8de31b319`)
2. Wait for script to print `Deploy submitted: https://…azurestaticapps.net`
3. Reply in Atlas chat: **SWA redeploy complete**

Public URL after redeploy: https://zealous-rock-0090c7e1e.7.azurestaticapps.net

## Already working (no wait)

- Atlas Elite (Mac): http://127.0.0.1:5180/clients  
- ACCG HVS links: http://127.0.0.1:5180/clients/client-accg01  
- Hub health: http://127.0.0.1:8790/health  
- Production SharePoint lists + 7 clients  

## Not inventing (cert unattended auth)

No PnP client certificate enroll script exists in-repo. DeviceLogin remains the supported schema path. Cert/Key Vault enroll for app `836fb743-6439-4836-b1f2-4a144ce2f762` is deferred until unattended deploy is explicitly required.

## Remaining before tag `atlas-v1.0.0-production`

- SWA redeploy (this action) or owner waiver  
- Power Automate production  
- E2E QA written GO  
- Tag
