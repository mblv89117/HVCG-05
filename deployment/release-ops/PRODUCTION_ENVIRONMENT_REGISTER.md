# PRODUCTION ENVIRONMENT REGISTER

**Status:** GL-0 COMPLETE — ready for Track 1 import approval (not executed)  
**Last audited:** 2026-07-16T02:08Z  
**Evidence:** PPAC + PAC + SharePoint Active sites screenshot  

## Production Power Platform

| Field | Value |
|-------|-------|
| Display name | HVCG Production |
| Type | Production |
| State | Ready |
| Dataverse | Yes |
| Managed Environment | No |
| Region | United States |
| Environment ID | `f141a2cf-ae13-eb59-84c4-25817d899105` |
| Organization ID | `a34bbff3-b380-f111-8068-6045bd0a1f11` |
| Unique name | `unqa34bbff3b380f11180686045bd0a1` |
| Environment URL | `https://orgee2f7545.crm.dynamics.com/` |
| Security group | **None** (intentional unrestricted — owner 2026-07-15) |
| Created by | Manuel Barela |

## Production SharePoint

| Purpose | Display name | URL |
|---------|--------------|-----|
| Command Center | HVCG Project Command Center | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter` |
| Clients Hub | HVCG Clients Hub | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients` |
| Knowledge | HVCG Knowledge Center | `https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Knowledge` |

**Forbidden for Prod settings:** any `*-Dev` SharePoint URL.

## Development (reference only)

| Field | Value |
|-------|-------|
| Display name | HVCG Development |
| Environment ID | `c03b1329-4394-ece7-acc9-c50794b3db1e` |
| Environment URL | `https://org1131a2b0.crm.dynamics.com/` |
| SharePoint | `…/HVCG-CommandCenter-Dev`, `…/HVCG-Clients-Dev`, `…/HVCG-Knowledge-Dev` |

## Connection references (Prod) — pending Maker consent after import approval

| Logical name | ConnectionId |
|--------------|--------------|
| hvcg_sharedsharepointonline | UNKNOWN |
| hvcg_sharedoffice365 | UNKNOWN |
| hvcg_sharedteams | UNKNOWN |
| hvcg_sharedapprovals | UNKNOWN |

## Managed package (prepared, not imported)

| Field | Value |
|-------|-------|
| Path | `deployment/release-ops/packages/HVCGCommandCenterDev_managed_1.1.0.1.zip` |
| SHA-256 | `515c692c213c4618e437b8d71fc62e2b708a52b2c5d8794a4384adb32d337cdf` |
| Version | 1.1.0.1 |

## GL-0 checklist

- [x] HVCG Production exists
- [x] Type = Production
- [x] Dataverse = Yes
- [x] Environment ID / Org URL recorded
- [x] Visible in `pac env list`
- [x] Security group recorded (**None**)
- [x] Prod SharePoint URLs recorded
- [x] Managed solution package prepared
- [x] COO notified GL-0 complete
