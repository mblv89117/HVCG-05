# Analytics Refresh Strategy

## Principles

1. Decision queues (decisions, risks, approvals waiting) prefer **direct SharePoint** in Power Apps.
2. Trends, medians, and concentration prefer **imported Power BI** semantic model.
3. Every surface shows **source** + **as-of / last refresh**.
4. Production refresh schedules require Owner approval — Dev may use manual / 4× daily.

## By surface

| Surface | Mechanism | Target latency | Notes |
|---------|-----------|----------------|-------|
| scrHomeExec tiles | Named formulas + Refresh() | Seconds–minutes | User-triggered Refresh control |
| CEO BI Overview | Import dataset | ≤ 6 hours Dev | Owner-gated Prod |
| Revenue trend (M-001) | BI import | 4×/day Dev | Do not fabricate months |
| Conversion / turnaround | BI import | Daily | Need completed dates |
| Workflow failures (M-016) | Apps gallery + BI | Near real-time Ops | Failed last 7d |
| User adoption (M-015) | BI daily | 24h | AuditEvents lag OK |
| Elite OS (future App Insights) | Azure Monitor | Near real-time | Show “unavailable” until wired |

## Period defaults

| Metric | Default period |
|--------|----------------|
| Cash / revenue trend | MTD tile; T12M chart |
| Conversion / turnaround / milestones rate | Rolling 90d |
| Adoption / failures | Rolling 7d (primary), 30d (secondary) |
| Pipeline / capital / health / concentration | Point-in-time |

## Failure behavior

- Dataset refresh fail → last successful refresh timestamp + banner; do not show stale as live without label.
- Missing columns → BLANK tile, not zero.
- Sample provenance rows → excluded from production measures.

## Ownership

| Role | Responsibility |
|------|----------------|
| Analytics | Definitions, model, refresh docs |
| Data Engineering | List schema / migrations affecting measures |
| Deployment / Power Platform | Connection refs, gateway, schedule enablement |
| Owner | Production schedule approval |
