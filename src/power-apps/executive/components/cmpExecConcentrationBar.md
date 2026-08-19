# Component — cmpExecConcentrationBar

**Type:** Canvas component  
**Metric:** ATLAS-M-005 Client concentration

## Inputs

| Property | Type | Description |
|----------|------|-------------|
| `TopClients` | Table | Top 5 `{ Title, ClientCode, MonthlyRetainer }` |
| `Top3Share` | Number | `nfExecConcentrationTop3` (0–1) |
| `OnSelectClient` | Behavior | Drill to client |

## Visual

- Horizontal bars for top 5 retainers (simplest chart)
- KPI text: `Top-3 share: {Text(Top3Share, "0%")}` or `—` if blank
- Meta: Source HVCG_Clients · Owner/Finance only

## Security

Hide entire component when `!nfShowExecFullHome` (or finance viewer flag).
