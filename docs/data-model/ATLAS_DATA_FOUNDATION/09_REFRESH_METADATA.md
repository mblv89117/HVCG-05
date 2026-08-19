# 09 — Refresh Metadata

## Purpose

Track freshness for analytical and imported data without implying transactional SharePoint rows are stale.

## Standard metadata fields

| Field | Applies to | Meaning |
|-------|------------|---------|
| SourceSystem | KpiRecord, EV Assessment, Forecast, imported rows | Origin system |
| LastRefreshedAt | Same | UTC timestamp of last successful refresh |
| DataProvenance | Same | sample\|test\|imported\|calculated\|verified |
| RefreshJobId | Optional | Automation / AI job id |
| RefreshStatus | Optional | Success, Partial, Failed |

## Recommended refresh cadence

| Dataset | Dev | Production |
|---------|-----|------------|
| Executive KPI snapshots | Manual / on demand | Owner-approved schedule only |
| Power BI semantic model | Manual or ≤4×/day | Owner-approved only |
| CRM / Tasks / Projects (transactional) | Near real-time (list) | Same — no snapshot required |
| EV assessments | On finance publish | On finance publish |
| AI insights | On human approval | On human approval |

## Source system registry

| SourceSystem value | Description |
|--------------------|-------------|
| `SharePoint` | Direct list read |
| `PowerBI` | Measure materialization into KpiRecords |
| `ImportPack` | Controlled CSV/JSON import |
| `Manual` | Human entry in app |
| `AIJob` | Derived from approved AI output |
| `ExternalAccounting` | Linked ID refresh only |

## Lineage (minimal)

```
SourceSystem → (optional transform) → Entity row → LastRefreshedAt
                                      ↘ AuditEvent (on verified promotion)
```

Promotion to `verified` **must** write an AuditEvent with ActorEmail and prior provenance.
