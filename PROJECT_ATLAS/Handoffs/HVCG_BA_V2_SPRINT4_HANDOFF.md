# HVCG BA V2 — Sprint 4 Handoff (Development)

**CR:** CR-HVCG-BA-V2-001  
**Sprint:** 4 — Revenue Experience + Client Migration  
**Date:** 2026-08-11  
**Production:** NO DEPLOY · NO CLIENT CONTACT · BL-C1 ACTIVE

## Sprint 3 commit

- Branch: `cursor/hvcg-business-architecture-v2`
- SHA: `71944e12e71c734e61a478822cf5e2b377115849`
- Message: `feat(atlas): BA-B revenue conversion engine and Fit/Diagnostic Dev path [CR-HVCG-BA-V2-001]`

## Worktrees touched (not merged)

| Worktree | Branch | Role |
|----------|--------|------|
| `.worktrees/hvcg-business-architecture-v2` | `cursor/hvcg-business-architecture-v2` | Catalogs, conversion services, integration tests, coverage/ADR |
| `.worktrees/revenue-pipeline-product` | `cursor/revenue-pipeline-product` | Elite Revenue commercial UI, migration page (canonical Revenue UI) |
| `.worktrees/atlas-usable-operating-layer` | `fix/atlas-usable-operating-layer` | Client 360 Revenue + Migration tabs |

## UI ownership / integration

- Revenue UI owner path: `revenue-pipeline-product` (registry agent `revenue-systems`).
- Prior dirty WIP restored from `stash@{0}` (OpportunityDetailPage/RevenuePage were untracked); knowledge-rail dependency removed from RevenuePage to avoid pulling unrelated untracked knowledge module.
- BA V2 catalogs synced as read-only snapshots into `apps/atlas-elite-os/src/commercial/catalog/` — **no competing Revenue shell** on BA branch.
- Integration method: catalog snapshot + TypeScript commercial engine + Opportunity workbench extension; Client 360 panels remain on usable-operating-layer.

## Tests

- BA V2: 32 tests OK including `test_revenue_sprint4_integration.py` (happy path, bypass, ACCG legacy).
- Elite OS: `tsc -p tsconfig.json --noEmit` OK after Sprint 4 UI adds.

## Not done / stop

- Do **not** auto-start Sprint 5 (Capital Readiness) until Owner review.
- Sprint 4 commits on revenue / usable-operating-layer / BA residual require Owner authorization to commit (not auto-committed here beyond Sprint 3).
