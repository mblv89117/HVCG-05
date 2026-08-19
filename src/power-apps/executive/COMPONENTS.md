# Component specs — Executive Command Center (Power Apps)

Build these as canvas **components** (or tightly scoped containers) on `scrHomeExec`.

## cmpExecKpiTile

| Property | Type | Notes |
|----------|------|-------|
| `Label` | Text input | e.g. "Pipeline $" |
| `Value` | Text input | Pre-formatted or number |
| `Subtitle` | Text input | Optional period label |
| `Accent` | Color input | Health/attention color |
| `OnSelect` | Behavior | Navigate / set context |

**Layout:** Title (12pt) → Value (28pt semibold) → Subtitle (10pt). Min width 140px. No nested cards inside hero strip — flat tiles on one row.

## cmpExecQueueGallery

| Property | Type | Notes |
|----------|------|-------|
| `Items` | Table | Decision/risk/approval rows |
| `TitleField` | Text | Default Title |
| `MetaField` | Text | ClientCode / Deadline |
| `EmptyText` | Text | Friendly empty state |
| `OnSelectItem` | Behavior | Set var + Navigate detail |

**Template:** Left accent bar by severity; Title; Meta; chevron.

## cmpExecHealthStrip

| Property | Type |
|----------|------|
| `GreenCount`, `YellowCount`, `RedCount` | Number |

Horizontal three-segment bar + counts. Bound to `nfExecClientHealth*`.

## cmpExecCapacityPulse

| Property | Type |
|----------|------|
| `UtilizationPct` | Number |
| `AvailableHours` | Number |

Shows utilization gauge (simple progress) + available hours label.

## cmpExecCapitalStatus

Grouped counts by FundingStatus from `nfExecCapitalBook`. Simple horizontal gallery of status chips with counts — not a decorative card grid.

## Analytics product components

| Spec | Metric focus |
|------|----------------|
| [cmpExecMetricMeta.md](./components/cmpExecMetricMeta.md) | Source + refresh honesty |
| [cmpExecTrendSpark.md](./components/cmpExecTrendSpark.md) | ATLAS-M-001 |
| [cmpExecConcentrationBar.md](./components/cmpExecConcentrationBar.md) | ATLAS-M-005 |
| [cmpExecOpsSignalRow.md](./components/cmpExecOpsSignalRow.md) | M-008, M-011, M-012, M-015, M-016 |
| [cmpExecHealthStrip](#cmpexechealthstrip) | ATLAS-M-006 |

## Screen wiring checklist

| Component instance | Formula binding |
|--------------------|-----------------|
| tilePipeline | Value = `Text(nfExecPipelineWeighted, "$#,##0")` |
| tileMRR | `Text(nfExecMRR, "$#,##0")` |
| tilePastDue | `Text(nfExecPastDueRetainerAR, "$#,##0")` |
| tileForecast | `Text(nfExecForecastWeighted, "$#,##0")` |
| tileCash | `Text(nfExecCashCollected, "$#,##0")` |
| tileAR | `Text(nfExecOutstandingAR, "$#,##0")` |
| tileCapital | `Text(nfExecCapitalPipeline, "$#,##0")` |
| tileProjects | `Text(nfExecProjectsAtRiskCount, "0")` |
| galDecisions | Items = `nfExecDecisionQueue` |
| galApprovals | Items = `nfExecApprovalsWaiting` |
| galRisks | Items = `nfExecMajorRisks` |
| galMeetings | Items = `nfExecMeetings14d` |
| healthStrip | `nfExecClientHealthGreen/Yellow/Red` |
| capacityPulse | Utilization + Available hours |
| opsSignals | `cmpExecOpsSignalRow` bindings |
| concentration | `nfExecConcentrationTop3` + top clients |
| metricMeta | `nfExecSourceMeta` |

Visible finance tiles: `nfExecIsFinanceViewer`.

Canonical metric IDs: `docs/analytics/METRIC_CATALOG.md`.
