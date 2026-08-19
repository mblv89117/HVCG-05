# KPI Definitions

Every displayed KPI includes:

| Field | Description |
|-------|-------------|
| current value / displayValue | Numeric when known; incomplete label otherwise |
| reporting period | Bound calendar or `Not bound` / `Unbound` |
| prior-period comparison | Delta text or `Not yet calculated` |
| trend / trendLabel | up · down · flat · unknown |
| source | Human-readable origin |
| last refresh | Timestamp |
| status | Actual · Budget · Forecast · Scenario · Indicative · Incomplete |
| drill-down | In-app route |
| data-quality | Verified · Repository-derived · Mock demo · Awaiting verified data · Data connection pending · Not yet calculated |

## HVCG (Mock demo)

Revenue, Gross Profit, Gross Margin, OpEx, EBITDA, Cash, Runway, AR, AP, Working Capital, MRR, ARR, Client Concentration, Document Readiness.

## CCB (Incomplete)

Same financial area shell; all `currentValue = null` with incomplete quality labels. No invented dollars.
