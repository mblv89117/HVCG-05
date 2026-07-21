# Project Atlas — Owner Action Required (Production)

**Status:** ONE MFA / DeviceLogin required to provision Production SharePoint lists.

## Why

- Production sites exist:
  - https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter
  - https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge
  - https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients
- Graph probe shows **no HVCG_* lists** on production yet (Dev is fully provisioned + 7 clients imported).
- No PnP client certificate is present in the repo for unattended auth.
- PnP Client ID must remain **`836fb743-6439-4836-b1f2-4a144ce2f762`** (HVCG-PnP-PowerShell).

## Exact steps (do once)

```bash
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-integration-release"
pwsh -File ./deployment/Deploy-HVCGProduction.ps1 -DeviceLogin
```

1. Browser opens → sign in as **manuel@highvaluecapitalgroup.com**
2. Enter/approve the device code
3. Approve any PnP consent prompts
4. Wait until the script prints success
5. Reply in Atlas chat: **Production DeviceLogin complete**

## Already working (no wait)

- Atlas Elite: http://127.0.0.1:5180/clients  
- ACCG HVS links: http://127.0.0.1:5180/clients/client-accg01  
- Hub health: http://127.0.0.1:8790/health  
- LaunchAgents keep hub/Elite alive after Cursor closes  

## Will not do during this login

- No HVS OneDrive changes
- No sample/demo seed into Production
- No external client emails
