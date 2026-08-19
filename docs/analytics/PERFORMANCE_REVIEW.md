# Analytics Performance Review

**Scope:** Executive home + Atlas Analytics semantic model  
**Date:** 2026-07-20  
**Reviewer:** Analytics Product Team

## Targets

| Surface | Target |
|---------|--------|
| scrHomeExec first paint (cached collections) | < 3s on desktop |
| Named formula KPI strip | No nested ForAll over full Tasks for home |
| BI Overview page | < 5s interactive after dataset cached |
| Import dataset size (Dev) | Prefer views / filtered PQ over full history dumps |

## Design choices for performance

1. **Home uses pre-filtered executive views**, not whole-list scans where views exist.
2. **Trends and medians are BI-only** — Apps show tile stubs or last BI snapshot fields when needed.
3. **Overdue task rate on exec home** defaults to High/Critical filter to shrink cardinality.
4. **Concentration** computed in BI or from Active MRR view (≤ hundreds of clients), not engagement×invoice crossjoin on canvas.
5. **Automation failures** limited to last 7 days view.
6. Avoid cards/visual clutter — fewer visuals = fewer queries.

## Known risks

| Risk | Mitigation |
|------|------------|
| SharePoint list throttling | Indexed ClientCode, Status, IsOverdue; use views |
| Canvas Sum over large Invoices | Prefer executive cash/AR views |
| EV list not yet in all tenants | Tile shows unavailable until list provisioned |
| App Insights not wired | M-015 secondary series shows “unavailable” |

## Validation checklist

- [ ] No home screen formula walks all TimeEntries
- [ ] BI relationships on ClientCode are many-to-one where intended
- [ ] Sample/test provenance filtered in production measures
- [ ] Phone layout loads Decisions before Capital (see executive layout-phone)

## Verdict

**Pass for packaging** with Dev-scale assumptions. Prod scale re-check after Owner UAT and real list volumes.
