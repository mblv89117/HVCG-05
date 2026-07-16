# Connection References — RC-1 Development Baseline

**Solution:** `HVCGCommandCenterDev`  
**Proven in:** HVCG Development (4/4 bound)  

---

## Included connection references (4)

| Logical name | Connector | CRM smoke usage |
|--------------|-----------|-----------------|
| `hvcg_sharedsharepointonline` | SharePoint Online | **Required** — all 4 CRM flows |
| `hvcg_sharedoffice365` | Office 365 Outlook | Present; not required for current CRM smoke defs |
| `hvcg_sharedteams` | Microsoft Teams | Present; gated by `hvcg_CrmEnableTeamsNotify=false` |
| `hvcg_sharedapprovals` | Approvals | Present; not required for current CRM smoke defs |

---

## Target environment binding

On any future import (Owner-approved only):

1. Create or select connections in the target environment under the deploying identity.
2. Set `ConnectionReferences[].ConnectionId` in a private deployment settings file (template Values are empty).
3. Confirm `hvcg_sharedsharepointonline` points at the **target** SharePoint tenant/site context.
4. Do not enable Teams notification paths until channel env vars exist and Owner approves.

---

## Dev evidence

Connection refs were already solution members before the env-var packaging fix. Export `customizations.xml` lists all four `hvcg_shared*` references. Live Dev smoke used the SharePoint connection successfully.
