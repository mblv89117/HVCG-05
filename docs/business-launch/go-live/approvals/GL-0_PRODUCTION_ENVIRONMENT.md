# GL-0 — Create or select HVCG Production environment

**One action. Do this first.**  
**COO will not run device-code auth for you unless this fails.**

## Why
`pac env list` currently shows **only** HVCG Development. Production deployment cannot start without a Production environment.

## Click-by-click

1. Open [Power Platform admin center](https://admin.powerplatform.microsoft.com/environments) signed in as `manny@highvaluecapitalgroup.com`.
2. Confirm whether an environment named like **HVCG Production** / **HVCG Prod** already exists.
3. **If it exists:** reply to COO with exact **Display name**, **Environment URL** (`*.crm.dynamics.com`), and **Environment ID**.
4. **If it does not exist:**  
   a. **+ New environment**  
   b. Name: `HVCG Production`  
   c. Type: **Production**  
   d. Region: same as Development  
   e. Create Dataverse: **Yes**  
   f. Security group: restrict to HVCG staff only  
   g. Create  
   h. Reply with Display name, URL, Environment ID.
5. Also list Production SharePoint site URLs you want for: Command Center · Clients · Knowledge (must **not** end with `-Dev`).

## After you reply
COO fills `deploymentSettings-production.json` (private), packs managed solution, and returns the **final** Production Deployment Approval request for your GO/NO-GO.
