# Excel / Power Query Ops Pack Spec

Use when Power BI Pro is unavailable.

## Queries

Connect to each HVCG_* list via SharePoint Online list connector.

## Sheets

| Sheet | Content |
|-------|---------|
| Exec_Attention | Filter RequiresExecutiveAttention |
| Overdue_Tasks | IsOverdue |
| Missing_Docs | Open critical requests |
| Renewals_60 | RenewalDate within 60 days |
| Finance_PastDue | IsPastDue |
| Client_Master | Active clients summary |

Refresh weekly or on-demand. Store workbook on HVCG-Knowledge `/Reports/` (not a system of record).
