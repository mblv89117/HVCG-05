# Analytics Source Mappings

Join preference: **ClientCode**. Environment site URL from `HVCG_SITE_URL` (Dev default in semantic model JSON).

| Metric ID | Primary list | Columns used | Secondary |
|-----------|--------------|--------------|-----------|
| ATLAS-M-001 | HVCG_Invoices | AmountCollected, InvoiceDate, InvoiceType, ClientCode | FinancialMilestones.RecognizedAmount, ForecastMonth |
| ATLAS-M-002 | HVCG_Opportunities | WeightedValue, WinLossStatus, Stage, ForecastCategory, ClientCode | — |
| ATLAS-M-003 | HVCG_Opportunities | WinLossStatus, Closed/ExpectedCloseDate | WinLossAnalyses |
| ATLAS-M-004 | HVCG_Engagements | MonthlyRetainer, EngagementValue, EngagementStatus, ClientCode | — |
| ATLAS-M-005 | HVCG_Clients | MonthlyRetainer, ClientLifetimeValue, ClientStage, IsActive | — |
| ATLAS-M-006 | HVCG_Clients | OverallHealth, ClientStage, IsActive | — |
| ATLAS-M-007 | HVCG_Projects | ProjectHealth, ClientCode | — |
| ATLAS-M-008 | HVCG_Tasks | IsOverdue, TaskStatus/Status, Priority, OwnerEmail | — |
| ATLAS-M-009 | HVCG_Approvals | RequestedDate, CompletedDate, ApprovalStatus, ApprovalType | Deliverables, ExpenseApprovals |
| ATLAS-M-010 | HVCG_FinancialMilestones | Amount, DueDate, PaymentStatus, IsPastDue, RevenueAtRisk | — |
| ATLAS-M-011 | HVCG_FundingMilestones | Status, IsCritical, CompletedDate, CapitalOpportunityId | CapitalOpportunities.FundingStatus |
| ATLAS-M-012 | HVCG_DocumentRequests | RequestStatus, IsCritical, CapitalOpportunityId, ClientCode | — |
| ATLAS-M-013 | HVCG_CapitalOpportunities | WeightedValue, TargetAmount, FundingProbability, FundingStatus | — |
| ATLAS-M-014 | HVCG_EnterpriseValueAssessments | Status, EnterpriseValueLow/High, DataProvenance, ClientCode | ValueDrivers |
| ATLAS-M-015 | HVCG_AuditEvents | ActorEmail, EventDate | TeamMembers.Email, IsActive |
| ATLAS-M-016 | HVCG_AutomationLogs | Status, FlowName, Created/Modified | — |

## Executive view bindings

Reuse `src/sharepoint/views/executive-views.json` where present. New analytics views (optional Ops install):

| View title | List | Purpose |
|------------|------|---------|
| Analytics Active Engagements | HVCG_Engagements | M-004 |
| Analytics Open Tasks | HVCG_Tasks | M-008 |
| Analytics Approvals Completed | HVCG_Approvals | M-009 |
| Analytics Critical Funding MS | HVCG_FundingMilestones | M-011 |
| Analytics Doc Requests | HVCG_DocumentRequests | M-012 |
| Analytics EV Assessments | HVCG_EnterpriseValueAssessments | M-014 |
| Analytics Automation Failures | HVCG_AutomationLogs | M-016 |

## Provenance

Lists with `DataProvenance` must filter production measures. Fixture path `sample-data/analytics/` is **SAMPLE ONLY**.
