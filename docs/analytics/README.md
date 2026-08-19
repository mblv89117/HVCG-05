# Atlas Analytics Product

**Owner:** Analytics Product Team  
**Audience:** Owner, Ops Manager, Finance viewers (role-gated)  
**Rule:** Never present sample or fixture data as production. Missing values show as `—` / BLANK.

## Deliverables

| Artifact | Path |
|----------|------|
| Metric catalog (canonical) | [METRIC_CATALOG.md](./METRIC_CATALOG.md), [metric-catalog.json](./metric-catalog.json) |
| Semantic model | [SEMANTIC_MODEL.md](./SEMANTIC_MODEL.md), `src/power-bi/analytics/` |
| Source mappings | [SOURCE_MAPPINGS.md](./SOURCE_MAPPINGS.md) |
| Refresh strategy | [REFRESH_STRATEGY.md](./REFRESH_STRATEGY.md) |
| Dashboard specs | [DASHBOARDS.md](./DASHBOARDS.md) |
| Performance review | [PERFORMANCE_REVIEW.md](./PERFORMANCE_REVIEW.md) |
| QA evidence | [QA_EVIDENCE.md](./QA_EVIDENCE.md) |
| User documentation | [USER_GUIDE.md](./USER_GUIDE.md) |

## Surfaces

1. **Executive Dashboard** — Power Apps `scrHomeExec` + components under `src/power-apps/executive/`
2. **CEO / Analytics BI** — Power BI semantic model `HVCG_Atlas_Analytics` (extends `HVCG_CEO_Command`)
3. **Domain pages** — revenue, clients, projects/tasks, operations, capital, documents, enterprise value, finance, workload

## Canonical IDs

All product metrics use **`ATLAS-M-###`**. Legacy `KPI-##` / `E-##` IDs in `docs/executive/` are **aliases only** — do not invent parallel formulas.

## Product principles

- Decision density over chart density
- Simplest visual that answers the question
- Show source + last refresh on every surface
- Filters: ClientCode, period, Owner, health, FundingStatus
- Role and client permissions from `docs/executive/PERMISSIONS.md`
