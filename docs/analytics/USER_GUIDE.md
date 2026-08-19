# Atlas Analytics — User Guide

**For:** Owner and Ops leadership  
**Surfaces:** Executive Command Center (Power Apps) and Power BI `HVCG_Atlas_Analytics`

## What this is for

Use analytics to answer: *What needs a decision this week?*  
Not to browse every operational chart.

## How to read a tile

1. **Value** — currency, count, or percent  
2. **Label** — metric name  
3. **Meta** — source list + as-of / refresh  
4. **Blank (—)** — data missing or not applicable — **not** zero  

If a banner says **SAMPLE** or provenance is sample/test, do not treat as live portfolio.

## Executive home (recommended path)

1. Scan north-star dollars (pipeline, MRR, cash, AR, capital).  
2. Check Red client / project health.  
3. Clear decision and approval queues.  
4. Open domain page only when a tile asks a follow-up.

## Filters

| Filter | Use |
|--------|-----|
| Cash period MTD/YTD | Cash collected tile |
| Client | Drill one client (permissions apply) |
| Critical docs only | Document completion for capital readiness |
| High/Critical tasks | Overdue rate without chore noise |

## Domain questions (cheat sheet)

| You want… | Open… | Metric |
|-----------|-------|--------|
| Revenue movement | Revenue | Revenue trend |
| Sales book | Revenue / Exec | Weighted pipeline |
| Win rate | Revenue | Conversion rate |
| Retainer concentration | Clients | Client concentration |
| Who is Red | Clients | Client health |
| Delivery risk | Projects | Project health |
| Task drag | Tasks / Workload | Overdue task rate |
| Slow approvals | Operations | Approval turnaround |
| Milestone risk | Finance | Milestone performance |
| Raise readiness | Capital | Capital-readiness + docs |
| Financing $ | Capital | Active financing pipeline |
| EV work status | Enterprise value | EV progress |
| Who uses Atlas | Operations | User adoption |
| Broken flows | Operations | Workflow failures |

## Permissions

Finance and concentration tiles: Owner / Admin / Finance viewer.  
Contractors and guests: denied on Executive finance.  
Client-scoped roles only see permitted ClientCode rows.

## Disclaimers

- Enterprise value midpoints are **not appraisals**.  
- Cash/AR are SharePoint Ops records, not bank feeds.  
- Definitions: `docs/analytics/METRIC_CATALOG.md` (canonical).

## Support

Metric disputes → Analytics Product Team (do not fork formulas in a local report).  
Data entry errors → Ops / list owners.  
Production BI schedule → Owner approval.
