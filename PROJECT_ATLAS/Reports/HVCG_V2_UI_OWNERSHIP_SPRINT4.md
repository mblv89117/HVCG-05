# UI Ownership / Integration Strategy — BA V2 Sprint 4

**CR:** CR-HVCG-BA-V2-001  
**As of:** 2026-08-11  
**Rule:** Do not copy Revenue UI into the BA branch. Do not create a competing shell.

## Canonical surfaces

| Surface | Canonical worktree | Branch tip (inspected) | Notes |
|---------|-------------------|------------------------|-------|
| Revenue / Opportunity Elite UI | `.worktrees/revenue-pipeline-product` | `cursor/revenue-pipeline-product` @ `923d475` (+ dirty local WIP) | Owns `RevenuePage.tsx`, `OpportunityDetailPage.tsx`, `revenuePipeline.ts` |
| Client 360 / Live Clients | `.worktrees/atlas-usable-operating-layer` | `fix/atlas-usable-operating-layer` @ `2d7155d` | Production Absolute GO line; `LiveClientDetailPage` |
| BA V2 catalogs / conversion services | `.worktrees/hvcg-business-architecture-v2` | `cursor/hvcg-business-architecture-v2` | Config + `revenue_conversion.py`; no React shell |

## Conflicts found

- `revenue-pipeline-product` has **uncommitted local WIP** (Revenue/Opportunity pages, rbac, executive dashboard). Sprint 4 must **extend** those files, not reset them.
- Client 360 lives on the **Production Absolute GO** line — UI additions are Development commits on that branch/worktree but **must not be deployed** under this CR.

## Integration method

1. **Sprint 4A Revenue UX** — implement in `revenue-pipeline-product` by extending existing Revenue/Opportunity modules; consume BA V2 catalog JSON via a local `baV2Catalog` adapter (read-only import/copy of config snapshots synchronized from BA branch — not a second catalog SoR).
2. **Sprint 4 Client Migration UI** — primary list/detail experience in `revenue-pipeline-product` (`/revenue/migrations`); Client 360 Migration/Revenue panels added to `LiveClientDetailPage` in usable-operating-layer as internal-only sections.
3. **No BA-branch React app.** BA branch remains SoR for requirements, schemas, conversion services, and Atlas docs.
4. **Merge later** via owner-gated integration into Absolute GO / Elite release line — not part of Sprint 4.

## Catalog sync rule

Elite UI must not hard-code V2 prices. Adapter loads from BA V2 config files (copied or path-referenced in Dev). Single commercial SoR remains `config/business/` on the BA branch.
