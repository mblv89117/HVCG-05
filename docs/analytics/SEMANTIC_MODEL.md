# Atlas Analytics Semantic Model

**Dataset name:** `HVCG_Atlas_Analytics`  
**Extends:** `HVCG_CEO_Command` / `HVCG_OS_Enterprise`  
**Physical JSON:** `src/power-bi/analytics/atlas-analytics-semantic-model.json`  
**Measures:** `src/power-bi/analytics/measures.dax`

## Grain & keys

| Preference | Key |
|------------|-----|
| Cross-fact join | `ClientCode` (text) |
| Drillthrough | SharePoint list item ID |
| Date | `DimDate[Date]` |

## Star schema

```
DimDate
DimClient ──┬── FactOpportunity          (pipeline, conversion)
            ├── FactEngagement           (engagement revenue)
            ├── FactInvoice              (revenue trend, cash, AR)
            ├── FactFinancialMilestone   (milestone performance)
            ├── FactCapitalOpportunity   (financing pipeline)
            ├── FactFundingMilestone     (capital readiness)
            ├── FactDocumentRequest      (document completion)
            ├── FactEnterpriseValue      (EV progress)
            ├── FactTask                 (overdue rate)
            ├── FactApproval             (turnaround)
            ├── FactAutomationLog        (workflow failures)
            └── FactAuditEvent           (user adoption)
DimProject ── FactTask
DimTeamMember ── FactTimeEntry / FactAuditEvent
DimPipelineStage
```

## Fact → metric map

| Fact | Metrics |
|------|---------|
| FactInvoice | ATLAS-M-001, M-018, M-019 |
| FactOpportunity | ATLAS-M-002, M-003 |
| FactEngagement | ATLAS-M-004 |
| DimClient | ATLAS-M-005, M-006, M-017 |
| DimProject / FactProject | ATLAS-M-007 |
| FactTask | ATLAS-M-008 |
| FactApproval | ATLAS-M-009 |
| FactFinancialMilestone | ATLAS-M-010 |
| FactFundingMilestone | ATLAS-M-011 |
| FactDocumentRequest | ATLAS-M-012 |
| FactCapitalOpportunity | ATLAS-M-013 |
| FactEnterpriseValue | ATLAS-M-014 |
| FactAuditEvent | ATLAS-M-015 |
| FactAutomationLog | ATLAS-M-016 |

## Calculated columns / PQ rules

1. Exclude `DataProvenance ∈ {sample, test}` from production measures when column exists.
2. `FactOpportunity[IsOpen] = WinLossStatus = "Open"`.
3. `FactTask[IsOpen]` = status not in Done/Cancelled/Completed.
4. Never synthesize historical Invoice months in Power Query.

## Security

V1: workspace audience + SharePoint ACL (no RLS). Finance pages Owner/Finance only.  
Future: RLS by `ClientCode` ∩ `HVCG-Client-{Code}` when Dataverse/Premium path approved.
