# GL-0 Execution Log — Deployment Engineer owned

**Started:** 2026-07-16T01:42Z  

## Tenant inspection

| Source | Result |
|--------|--------|
| PAC | Only HVCG Development |
| PPAC screenshot Step 1 | HVCG Development (Sandbox) + Default (no Dataverse). **No Production.** |

## Step progress

| Step | Action | Status | Evidence |
|------|--------|--------|----------|
| 0 | PAC inspect | DONE | pac env list |
| 1 | Open PPAC Environments | DONE | Screenshot Environments list |
| 2 | Click + New | WAITING screenshot | — |

| 2 | Click + New | DONE | Screenshot New environment pane |
| 3 | Set Name = HVCG Production | WAITING | — |

### Step 2 form defaults observed (do not save)
- Name: test-na-74046103 (reject)
- Type: Sandbox (must become Production)
- Region: United States (OK)
- Database: No (must become Yes / Dataverse)
- Managed Environment: No (OK for now)

## Owner preference
2026-07-16: Owner requested multi-step batches (not one-click). Continuing with batched guidance for remaining GL-0.

### Add Dataverse form observed
- Language: English (United States) — keep
- Currency: USD — keep
- Security group: unset (Add disabled until set)
- Enable Dynamics 365 apps: No — keep (custom Dataverse solution; irreversible)
- Sample apps/data: No — keep

### Security group picker (owner screenshots)
- Options seen: None (open access); All Company; High Value Capital Group; many HVCG-DEV-Role-*
- Decision guidance issued: reject HVCG-DEV-Role-* for Prod; prefer High Value Capital Group or None if no Prod SG

## Security group lock (owner)
- **None** — intentional unrestricted for now (2026-07-15 owner directive)
- Risk: any tenant user can be added as Environment admin/maker until restricted later

## SharePoint probe (unauthenticated HTTP)
- `…/sites/HVCG-CommandCenter` → 404 (Prod site missing)
- `…/sites/HVCG-Clients` → 404 (Prod site missing)
- `…/sites/HVCG-Knowledge` → 404 (Prod site missing)
- `…/sites/HVCG-CommandCenter-Dev` → 403 (Dev exists; auth required)

## SharePoint Active sites (owner screenshot)
- HVCG Clients Hub - DEV → /sites/HVCG-Clients-Dev
- HVCG Knowledge Center - DEV → /sites/HVCG-Knowledge-Dev
- HVCG Project Command Center - DEV → /sites/HVCG-CommandCenter-… (truncateded)
- No Prod HVCG sites present → CREATE three Team sites

## GL-0 CLOSED 2026-07-16T02:08Z
Prod SP sites created and recorded:
- https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter
- https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients
- https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge
Security group: None (intentional)
Managed package hash: 515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf
Next: Track1 import requires separate owner approval — NOT executed.

## Post-import connection binding (owner screenshot)
- Env: HVCG Production confirmed in Maker
- Solution: HVCG Command Center DEV (managed) — 4 connection refs, Status Off
- Banner: cannot directly edit managed objects — bind via connection reference detail / unmanaged config if needed
- Cloud flows: 15 present; must remain Off

## Connection binding path
Owner blocked on managed connection refs → switching to unmanaged config solution:
- Name: HVCG Production Config
- Publisher: default / HVCG if available
- Add existing: 4 connection references from HVCGCommandCenterDev
