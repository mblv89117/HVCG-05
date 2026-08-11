# Sprint 4 Revenue commit — restored WIP note

**Worktree:** `.worktrees/revenue-pipeline-product`  
**Branch:** `cursor/revenue-pipeline-product`  
**CR:** CR-HVCG-BA-V2-001

## Intentionally included (foundation + Sprint 4)

Restored from local `stash@{0}` (was required for Opportunity/Revenue surfaces that Sprint 4 extends):

- `RevenuePage.tsx`, `OpportunityDetailPage.tsx` (were untracked in stash)
- `revenuePipeline.ts` pipeline engine + CCB fixtures
- Revenue RBAC (`canAccessRevenue`, capability matrix)
- App routes for `/revenue` and opportunity detail
- Modules re-export of `RevenuePage`
- Executive dashboard revenue wiring present in stash
- `docs/revenue/*`, `tests/revenue/*`
- `.agent-comms/registry.json` revenue-systems agent registration

Sprint 4 additions on top:

- `src/commercial/` + catalog snapshots from BA V2
- `CommercialWorkbench.tsx`, `ClientMigrationPage.tsx`
- ACCG expansion opportunity fixture
- `/revenue/migrations` route
- `public/ba-v2/` Dev catalog mirror

## Explicitly excluded (unrelated WIP)

- Knowledge rail module (`integrations/knowledge/*`) — present in stash untracked set but **not restored**; RevenuePage knowledge import removed to avoid broken dependency.
- Any Production deploy configs, env secrets, or SWA publish artifacts — none included.

## Sync note

Catalog JSON under `src/commercial/catalog/` and `public/ba-v2/` are **Dev snapshots** of BA `config/business/`. BA branch remains commercial SoR.
