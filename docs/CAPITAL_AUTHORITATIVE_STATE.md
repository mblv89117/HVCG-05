# Capital authoritative state — Phase 3.5

**As of:** 2026-08-18  
**Worktree:** `.worktrees/atlas-capital-operations`  
**Not provisioned this sprint:** `HVCG_CapitalFactReviews` (schema designed; owner batch later)

SharePoint `HVCG_*` remains Atlas’s operational system of record. The Hub overlay JSON under App Service `/home` is an acceleration / durability adapter, not a second CRM.

Production scale: App Service plan `asp-atlas-integration-hub` **B1 Linux, 1 worker, no autoscale**. Overlay atomic rename is **single-instance safe only**. `multiInstanceSafe=false`.

## Classification

| State | Classification | Store today | Target |
|-------|----------------|-------------|--------|
| Capital opportunities, stages (non-SYN Graph) | AUTHORITATIVE | `HVCG_CapitalOpportunities` | unchanged |
| Document request checklist (non-SYN Graph) | AUTHORITATIVE | `HVCG_DocumentRequests` | unchanged |
| Lender outreach / recorded submissions | AUTHORITATIVE | `HVCG_LenderOutreach` | unchanged |
| Lender organizations | AUTHORITATIVE | `HVCG_Lenders` | unchanged |
| Sourced product criteria | AUTHORITATIVE (catalog) | in-app `lender-catalog.ts` | do **not** provision `HVCG_LenderProducts` |
| SYN* Graph writes | closed in production | overlay for SYN checklist/stage/strategy patches | keep Graph closed |
| Extracted facts | AUTHORITATIVE until SharePoint schema is live | overlay `reviews[].extractedFacts` | `HVCG_CapitalFactReviews` |
| Human VERIFY / CORRECT / REJECT | AUTHORITATIVE | overlay `factReviews` + fact `reviewer` / timestamps | same list |
| Corrections (`originalValue` / `correctedValue`) | AUTHORITATIVE | overlay | same list |
| Rejections | AUTHORITATIVE | overlay | same list |
| SourceRefs | AUTHORITATIVE | overlay (and Graph fields where mapped) | same list |
| Document associations (DriveId/ItemId) | AUTHORITATIVE | overlay `documents` | keep overlay; library item is the file SoR |
| Underwriting summaries | RECONSTRUCTIBLE + RUNTIME CACHE | overlay `underwriting` | regenerate from facts + opportunity |
| Strategy drafts / Manny package | RUNTIME CACHE | overlay `strategies` | Manny flags also on opportunity when Graph allows |
| Audit events (fact review, ingest, strategy decision) | AUDIT RECORD | Hub integration audit + overlay `factReviews` | do not silently drop |
| SHA-256 | RUNTIME CACHE | overlay documents | duplicate detection only, not authorization |
| Lender match bands | RECONSTRUCTIBLE | computed | never persist as certainty |

## Overlay role

- Path: `INTEGRATION_DATA_DIR/capital-overlay/capital-intelligence-overlay.json` (production: `/home/webapp_data/integrations/capital-overlay/`).
- Survives App Service recycle and zip `--clean` of wwwroot because it is under `/home`, not `HOME===/home`.
- Missing overlay on first start: empty facts (valid).
- Corrupt / empty / future `schemaVersion`: **fail closed** (capital routes 503). Health reports `overlayCorrupt` / `overlayUnsupportedSchema` without pretending the brain is empty.

## Option selected

**Option B (designed, not applied):** minimal SharePoint list `HVCG_CapitalFactReviews` for human-reviewed evidence. Overlay remains the live acceleration store until an owner schema window provisions the list. Do not add a database.

**Option C rejected as the long-term SoR** for VERIFIED facts: durable JSON on a single B1 instance meets recycle/redeploy for current HVCG scale, but is not the audit/backup/concurrency contract for multi-admin human evidence.

## Concurrency

- In-process overlay write lock + temp+rename.
- Safe on the **actual** production model: 1 Linux instance.
- Two simultaneous fact reviews on one process: last-writer-wins after serialized writes; lost-update across instances is **unproven and unsupported**.
- Do not claim multi-instance safety.

## Migration

Not required to keep production running. When `HVCG_CapitalFactReviews` is provisioned: dual-write overlay + Graph, then dual-read, then overlay becomes cache.
