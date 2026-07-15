# Finance Ops — Power Apps BUILD notes (brief)

**Audience:** Maker / parent integrator after merge  
**Exclusive package:** `src/power-apps/finance/*`  
**Do not:** edit locked `NamedFormulas.fx` or CRM screens from this branch; interrupt CRM Maker OA; publish Prod.

## Prerequisites

1. Dev Command Center SharePoint site available.  
2. Existing Finance lists present (`HVCG_Invoices`, …).  
3. Exclusive stubs provisioned **after** parent appends them to `lists/_index.json` and runs schema repair (owner-attended later — not this sprint).

## Maker paste order

1. Create or open `HVCG_ProjectCommandCenter_DEV`.  
2. Add SharePoint connections for Finance lists above.  
3. Paste formula helpers from `FinanceNamedFormulas.fx` into app (or parent-append to shared `NamedFormulas.fx` per recommendations).  
4. Build screens from stubs in this folder:  
   - `scrFinance` (hub)  
   - `scrFinanceInvoiceDetail`  
   - `scrFinanceCollections`  
   - `scrFinanceBudgetsExpenses`  
5. Wire nav from Ops Home / client detail Finance section → `scrFinance` only when `nfIsFinanceViewer`.  
6. Leave collections-notify flows **Off**.

## Visibility rules

- Hide Amount / AR tiles unless finance viewer.  
- Contractors: no Finance nav.  
- Demo data only until acceptance.

## Out of scope this sprint

- Binary `.msapp` in git  
- Live connector consent (owner later)  
- Production
