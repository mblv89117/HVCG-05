# Power BI Enterprise Semantic Model — HVCG OS

## Dataset name

`HVCG_OS_Enterprise`

## Fact tables

| Fact | Source list | Grain |
|------|-------------|-------|
| FactOpportunity | HVCG_Opportunities | Opportunity |
| FactCapitalOpportunity | HVCG_CapitalOpportunities | Capital deal |
| FactFinancialMilestone | HVCG_FinancialMilestones | Milestone |
| FactInvoice | HVCG_Invoices | Invoice |
| FactTask | HVCG_Tasks | Task |
| FactDocumentRequest | HVCG_DocumentRequests | Request |
| FactTimeEntry | HVCG_TimeEntries | Entry |
| FactRevenueForecast | HVCG_RevenueForecastLines | Month × source |
| FactExpense | HVCG_ExpenseApprovals | Expense |
| FactAIWork | UNION of AI_* queues (Power Query append) | AI item |

## Dimensions

DimClient, DimEngagement, DimProject, DimTeamMember, DimDate, DimCapitalSource, DimReferralPartner, DimPipelineStage (from Opportunity Stage).

**Relationship key:** prefer `ClientCode` (text) for stable star joins; keep SharePoint IDs for drillthrough.

## Core measures (DAX sketch)

```dax
MRR = CALCULATE(SUM(DimClient[MonthlyRetainer]), DimClient[ClientStage]="Active Client")

Pipeline Value = SUM(FactOpportunity[WeightedValue])

Capital Pipeline = SUM(FactCapitalOpportunity[WeightedValue])

Cash Collected = SUM(FactInvoice[AmountCollected])

Outstanding AR = SUMX(FILTER(FactInvoice, FactInvoice[InvoiceStatus] IN {"Sent","Partial","Past Due"}),
    FactInvoice[Amount] - COALESCE(FactInvoice[AmountCollected],0))

Revenue Forecast Weighted = SUM(FactRevenueForecast[WeightedAmount])

Projects Red = CALCULATE(COUNTROWS(DimProject), DimProject[ProjectHealth]="Red")

Utilization % =
DIVIDE(
  CALCULATE(SUM(FactTimeEntry[Hours]), FactTimeEntry[IsBillable]=TRUE()),
  SUM(DimTeamMember[CapacityHoursPerWeek]) * DISTINCTCOUNT(DimDate[Week])
)

Client Health Red = CALCULATE(DISTINCTCOUNT(DimClient[ClientCode]), DimClient[OverallHealth]="Red")

AI Pending Review = CALCULATE(COUNTROWS(FactAIWork), FactAIWork[AIStatus]="Needs Human Review")

Success Fee Expected = CALCULATE(SUM(FactFinancialMilestone[Amount]), FactFinancialMilestone[IsSuccessFee]=TRUE(), FactFinancialMilestone[PaymentStatus]<>"Paid")
```

## CEO dashboard pages

1. **Command** — MRR, Cash Collected, Outstanding AR, Pipeline, Capital Pipeline, Projects by health  
2. **Sales** — funnel, win/loss, referral partner ROI  
3. **Capital** — funding status, probability-weighted, expected close calendar  
4. **Delivery** — tasks overdue, utilization, capacity  
5. **Risk & Decisions** — executive queue  
6. **AI Ops** — queue depths (internal)  

## Copilot for Power BI

Keep measure names business-friendly; add descriptions on columns `Client Lifetime Value`, `Funding Probability`, `Overall Health`.

## Deployment

Import from SharePoint Lists → publish to workspace `HVCG OS` → app audiences: Owner (CEO), Ops, Capital Advisor (capital pages only).
