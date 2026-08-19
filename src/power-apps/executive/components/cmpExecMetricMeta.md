# Component — cmpExecMetricMeta

**Type:** Canvas component  
**Used on:** Every analytics tile / chart footer  
**Catalog:** `docs/analytics/METRIC_CATALOG.md`

## Purpose

Show honest source + refresh so users never confuse stale or sample data with live production.

## Inputs

| Property | Type | Description |
|----------|------|-------------|
| `MetricId` | Text | e.g. `ATLAS-M-002` |
| `SourceLabel` | Text | e.g. `HVCG_Opportunities` |
| `AsOfText` | Text | e.g. `As of 19 Jul 2026 17:00 PT` or `OnVisible refresh` |
| `IsSample` | Boolean | When true, show SAMPLE banner |

## Visual

- 10pt muted text: `{MetricId} · Source: {SourceLabel} · {AsOfText}`
- If `IsSample`: amber inline label **SAMPLE — not production**

## Accessibility

`AccessibleLabel` = full meta string including SAMPLE when set.
