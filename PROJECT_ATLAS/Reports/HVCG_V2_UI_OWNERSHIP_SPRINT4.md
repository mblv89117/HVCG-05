# UI Ownership / Integration Strategy — BA V2 Sprint 4

**CR:** CR-HVCG-BA-V2-001  
**As of:** 2026-08-11 (post Sprint 4 Dev implementation)  
**Rule:** Do not copy Revenue UI into the BA branch. Do not create a competing shell.

## Canonical surfaces

| Surface | Canonical worktree | Branch tip (inspected) | Owner / notes |
|---------|-------------------|------------------------|---------------|
| Revenue / Opportunity Elite UI | `.worktrees/revenue-pipeline-product` | `cursor/revenue-pipeline-product` @ `923d475` + Sprint 4 local Dev | Registry agent `revenue-systems`; owns Revenue/Opportunity pages |
| Client 360 / Live Clients | `.worktrees/atlas-usable-operating-layer` | `fix/atlas-usable-operating-layer` @ `2d7155d` + Sprint 4 local Dev | Absolute GO line; Revenue + Migration tabs internal-only |
| BA V2 catalogs / conversion services | `.worktrees/hvcg-business-architecture-v2` | `cursor/hvcg-business-architecture-v2` @ `71944e1` (+ S4 docs/tests residual) | Config + `revenue_conversion.py`; no React shell |

## Conflicts found

- `revenue-pipeline-product` had **stash WIP** including untracked `OpportunityDetailPage.tsx` / `RevenuePage.tsx`. Restored from `stash@{0}` before extending. Knowledge-rail import removed (knowledge module was not restored) to avoid a broken dependency.
- Client 360 lives on the **Production Absolute GO** line — UI additions are Development-only and **must not be deployed** under this CR.

## Integration method (executed)

1. **Catalog snapshots** copied into `revenue-pipeline-product/apps/atlas-elite-os/src/commercial/catalog/` (read-only Dev sync from BA `config/business/`).
2. **Commercial engine** `baV2Commercial.ts` + **CommercialWorkbench** mounted on Opportunity detail.
3. **Migration** at `/revenue/migrations` (`ClientMigrationPage.tsx`).
4. **Client 360** Revenue + Migration sections in `atlas-usable-operating-layer` (`Client360CommercialSections.tsx`).
5. **No BA-branch React app.** Merge later via owner-gated integration — not Sprint 4.

## Catalog sync rule

Elite UI must not hard-code V2 prices. Adapter loads from BA V2 config snapshots. Single commercial SoR remains `config/business/` on the BA branch.
