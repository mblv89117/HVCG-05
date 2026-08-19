# Component — cmpExecTrendSpark

**Type:** Canvas component (or BI embed stub)  
**Metric:** ATLAS-M-001 Revenue trend  
**Rule:** Prefer Power BI line for T12M. This Apps stub is a **placeholder** when BI not embedded — do not invent points.

## Inputs

| Property | Type | Description |
|----------|------|-------------|
| `Items` | Table | `{ MonthLabel, Amount }` from real invoice aggregates only |
| `EmptyText` | Text | Default: `No collection history in range` |
| `OnSelect` | Behavior | Open Revenue BI page |

## Visual

- Single sparkline / simple column chart — **one series only**
- No dual-axis, no forecast ribbons unless Owner-approved measure exists
- Footer: `cmpExecMetricMeta` with Source = HVCG_Invoices

## Empty / missing

If `Items` empty → show EmptyText, not a flat zero line presented as history.
