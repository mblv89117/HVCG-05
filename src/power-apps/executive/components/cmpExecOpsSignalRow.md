# Component — cmpExecOpsSignalRow

**Type:** Container / component row  
**Metrics:** ATLAS-M-008, M-011, M-012, M-015, M-016

## Purpose

Compact operational signals under north-star tiles — counts/rates that drive action, not charts.

## Bindings

| Chip | Formula | Tone |
|------|---------|------|
| Overdue tasks | `nfExecOverdueTaskRate` | Warn if > 15% |
| Doc completion (crit) | `nfExecDocCompletionCritical` | Warn if < 80% |
| Capital readiness | `nfExecCapitalReadiness` | Warn if < 70% |
| Active users 7d | `nfExecActiveUsers7d` | Neutral |
| Workflow failures 7d | `nfExecWorkflowFailures7d` | Bad if > 0 |

## Visual

Single horizontal row of chips/tiles; tap opens filtered gallery or BI page.  
Each chip includes `cmpExecMetricMeta` collapsed to metric id on long-press / tooltip.
