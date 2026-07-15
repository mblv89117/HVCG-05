# Power BI — HVCG_CEO_Command

**Model package:** `src/power-bi/executive/HVCG_CEO_Command.model.json`  
**Measures:** `src/power-bi/executive/measures.dax`  
**Enterprise reference:** `docs/architecture/POWERBI_ENTERPRISE_MODEL.md`

## Build steps (owner / BI maker)

1. Create dataset from SharePoint lists on Dev Command Center site (or reuse `HVCG_OS_Enterprise` and build CEO **app** with page subset).  
2. Paste measures; verify relationships via `ClientCode`.  
3. Build pages: Command, Sales, Capital, Delivery, RiskAndDecisions.  
4. Publish to workspace `HVCG OS`.  
5. App audience: Owner (+ Admin). Exclude Contractors.

## RLS

V1: **audience-only** (no RLS expressions). V2 may add Owner email filters.

## Do not

- Embed Production SharePoint  
- Grant Contractor app access  
- Duplicate CRM Maker solution packaging into PBIX binary in git (keep JSON + DAX as source of truth)
