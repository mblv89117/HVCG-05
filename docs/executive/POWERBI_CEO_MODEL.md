# Executive Command Center — Power BI CEO Model

**Semantic model:** `HVCG_CEO_Command`  
**Artifacts:** `src/power-bi/executive/ceo-semantic-model.json`, `measures.dax`  
**Audience:** Owner workspace group only for Cash & AR page  

## Build steps (Maker / BI owner — Dev only)

1. Create dataset in Power BI workspace **HVCG OS** (Dev-capable).  
2. Get data → SharePoint Online List → Command Center Dev site.  
3. Import lists mapped in `ceo-semantic-model.json`.  
4. Create relationships on `ClientCode` (and Email for capacity).  
5. Paste measures from `measures.dax`.  
6. Build pages: CEO Overview, Pipeline & Forecast, Cash & AR, Capital Book, Capacity & Delivery, Exceptions Queue.  
7. Publish; set audience to Owner Entra group.  
8. Do **not** embed production bank or QuickBooks connectors.

## Page → KPI map

See model JSON `pages[]` and `docs/executive/KPI_DEFINITIONS.md`.

## Refresh

Dev: manual or ≤4×/day. Production refresh requires separate owner approval (out of scope for this branch).

## Alignment with canvas

Canvas `nfExec*` formulas mirror the same filters for near-real-time triage; BI is for trends and concentration analysis.
