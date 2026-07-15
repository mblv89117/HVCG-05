# Executive KPI Catalog

All KPIs read existing SharePoint lists. Missing amounts stay blank — never invent.

| KPI ID | Label | Formula concept | Primary list(s) | Visibility |
|--------|-------|-----------------|-----------------|------------|
| E-01 | Pipeline $ | Sum WeightedValue where WinLossStatus=Open | Opportunities | Owner+ |
| E-02 | Commit forecast $ | Sum WeightedValue where ForecastCategory=Commit and Open | Opportunities | Owner+ |
| E-03 | MRR | Sum MonthlyRetainer Active Clients | Clients | Owner / finance viewer |
| E-04 | AR outstanding | Sum (Amount − AmountCollected) for Sent/Partial/Past Due | Invoices | Owner / finance |
| E-05 | Cash collected MTD | Sum AmountCollected where CollectedDate in month | Invoices | Owner / finance |
| E-06 | Past-due retainers | Count FinancialMilestones IsPastDue OR Invoice Past Due | FinancialMilestones / Invoices | Owner / finance |
| E-07 | Revenue forecast weighted | Sum WeightedAmount open forecast lines | RevenueForecastLines | Owner / finance |
| E-08 | Capital pipeline $ | Sum WeightedValue open capital ops | CapitalOpportunities | Owner+ |
| E-09 | Projects Red/Yellow | Count ProjectHealth in Red,Yellow | Projects | Owner+ |
| E-10 | Client health Red | Count OverallHealth=Red Active | Clients | Owner+ |
| E-11 | Exec decision queue | Count RequiresExecutiveAttention=true open | Decisions (+ Clients, Risks, Issues, CRs, Capital) | Owner |
| E-12 | Approvals waiting | Pending Approvals + ExpenseApprovals + Deliverables needing exec | Approvals, ExpenseApprovals, Deliverables | Owner |
| E-13 | Major risks | RiskLevel High/Critical and open | Risks | Owner+ |
| E-14 | Capacity utilization | Billable hours / capacity | TimeEntries, TeamMembers | Owner / OpsMgr |
| E-15 | Proposals awaiting | ProposalStatus Sent | Proposals | Owner+ |
| E-16 | Strategic relationships | StrategicValue High/Critical | Relationships | Owner |

## Executive attention union (app collection)

OnStart / OnVisible: union rows where `RequiresExecutiveAttention = true` from:

- HVCG_Decisions  
- HVCG_Clients  
- HVCG_Projects  
- HVCG_Risks  
- HVCG_Issues  
- HVCG_ChangeRequests  
- HVCG_CapitalOpportunities  

Normalize columns: `SourceList`, `ItemId`, `ClientCode`, `Title`, `EscalationReason`, `OwnerEmail`, `DueOrTargetDate`.

## Explicit exclusions

Routine overdue tasks, draft AI emails, non-critical doc reminders, contractor queues.
