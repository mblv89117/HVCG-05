# Finance Operations — Data Map

**Module:** Finance Operations  
**Branch:** `cursor/finance-operations`  
**Rule:** Existing schemas under `src/sharepoint/lists/HVCG_*.json` are the source of truth. This document maps them; it does **not** change shared list JSON or `lists/_index.json`.

## 1. Entity relationship (operational)

```
HVCG_Clients
    │
    ├── HVCG_Engagements
    │
    ├── HVCG_FinancialMilestones ◄── InvoiceId ── HVCG_Invoices
    │         │
    │         └── BudgetId ──► HVCG_Budgets
    │                                 │
    │                                 └── HVCG_ExpenseApprovals
    │
    ├── HVCG_CollectionsActivities ──► InvoiceId
    │
    └── HVCG_RevenueForecastLines ──► OpportunityId / CapitalOpportunityId
```

## 2. Core Finance lists

### 2.1 HVCG_FinancialMilestones

| Field | Type | Notes |
|-------|------|-------|
| Title | Text | Required |
| ClientId | Lookup→Clients | Required |
| EngagementId | Lookup→Engagements | Optional |
| ClientCode | Text | Indexed denormalized key |
| MilestoneType | Choice | Proposal, Setup Fee, Monthly Retainer, Success Fee*, Expense, Budget Cap, Renewal, Other |
| Amount | Currency | Required |
| DueDate | DateTime | Indexed |
| PaymentStatus | Choice | Not Invoiced … Written Off |
| Probability / WeightedValue | Number / Currency | Forecast |
| InvoiceReference | Text | Free-text ref |
| InvoiceId | Lookup→Invoices | Prefer over free text when present |
| BudgetId | Lookup→Budgets | Optional |
| IsPastDue / RevenueAtRisk / WorkContinuingWithoutPayment | Boolean | Ops + exec signals |
| CollectionsStatus | Choice | Reminder ladder |
| ForecastMonth | Text | YYYY-MM style |
| IsRetainer / IsSuccessFee | Boolean | Filters |
| RecognizedAmount / CollectedAmount | Currency | Operational recognition |

### 2.2 HVCG_Invoices

| Field | Type | Notes |
|-------|------|-------|
| Title | Text | Required |
| ClientId | Lookup→Clients | Required |
| ClientCode | Text | Indexed |
| EngagementId | Lookup→Engagements | Optional |
| InvoiceNumber | Text | Indexed |
| InvoiceDate / DueDate | DateTime | |
| Amount / AmountCollected | Currency | AR = Amount − AmountCollected (app measure) |
| InvoiceStatus | Choice | Draft, Sent, Partial, Paid, Past Due, Void |
| InvoiceType | Choice | Retainer, Setup, Success Fee, Expense, Other |
| ExternalAccountingId | Text | Future QuickBooks id |
| FileLink | URL | PDF / folder |
| Notes | Note | |
| HVCG_IdempotencyKey | Text | Automation safety |

### 2.3 HVCG_CollectionsActivities

| Field | Type | Notes |
|-------|------|-------|
| Title | Text | Required |
| InvoiceId | Lookup→Invoices | Required |
| ClientId | Lookup→Clients | Optional |
| ActivityDate | DateTime | Required |
| ActivityType | Choice | Reminder, Call, Email, Payment Plan, Escalation, WriteOff |
| OwnerEmail | Text | |
| Outcome | Note | |
| NextActionDate | DateTime | Queue |
| RequiresExecutiveAttention | Boolean | Executive feed |

### 2.4 HVCG_Budgets

| Field | Type | Notes |
|-------|------|-------|
| Title | Text | Required |
| ClientId | Lookup→Clients | Required |
| EngagementId | Lookup→Engagements | Optional |
| ApprovedBudget | Currency | Required |
| BudgetUsed | Currency | Roll-up from expenses / burn (manual or flow later) |
| DiscretionarySpendLimit / Used | Currency | Client discretionary |
| BudgetStatus | Choice | On Track, Watch, Over |
| OwnerEmail / Notes | Text / Note | |

### 2.5 HVCG_ExpenseApprovals

| Field | Type | Notes |
|-------|------|-------|
| Title | Text | Required |
| ClientId / EngagementId / BudgetId | Lookups | Optional links |
| Amount | Currency | Required |
| ExpenseDate | DateTime | |
| Category | Choice | Travel, Software, Contractor, Filing, Marketing, Other |
| RequestedByEmail / ApproverEmail | Text | |
| ApprovalStatus | Choice | Pending, Approved, Rejected |
| IsClientBillable / IsDiscretionaryClientSpend | Boolean | |
| ReceiptLink | URL | Process: required before Approve when billable |
| Notes | Note | |

### 2.6 HVCG_RevenueForecastLines

| Field | Type | Notes |
|-------|------|-------|
| Title | Text | Required |
| ClientId | Lookup→Clients | Optional |
| OpportunityId | Lookup→Opportunities | CRM |
| CapitalOpportunityId | Lookup→CapitalOpportunities | Capital |
| ForecastMonth | Text | Required (YYYY-MM) |
| RevenueType | Choice | MRR, Setup, Success Fee, Other |
| Amount / Probability / WeightedAmount | Currency / Number | |
| ForecastCategory | Choice | Pipeline, Best Case, Commit, Closed |
| OwnerEmail | Text | |

## 3. Adjacent lists (read / recommend only)

| List | Domain owner | Finance use |
|------|--------------|-------------|
| `HVCG_Subscriptions` | Operations | Ops software spend visibility |
| `HVCG_RecurringExpenses` | Operations | Internal cost cadence |
| `HVCG_FundingMilestones` | Capital | Do not confuse with FinancialMilestones |
| `HVCG_Clients` fee / RetainerPaymentStatus fields | CRM / platform | Surface in scrClientDetail Finance section |

## 4. Measures (app / BI — not stored columns)

| Measure | Formula (conceptual) |
|---------|----------------------|
| Outstanding AR | Sum(Invoices where Status in Sent, Partial, Past Due) of (Amount − AmountCollected) |
| Past-due AR | Same filter Status = Past Due or DueDate < Today |
| Active retainer MRR | Sum of retainer milestones Not Past Due with IsRetainer |
| Budget remaining | ApprovedBudget − BudgetUsed |
| Commit forecast | Sum WeightedAmount where ForecastCategory = Commit |

## 5. Exclusive net-new stubs (`HVCG_Finance*`) — WO2

Existing `HVCG_Invoices` / Collections / Budgets / ExpenseApprovals remain SoR (**not** duplicated). Net-new exclusive stubs:

| List | Purpose | Key fields |
|------|---------|------------|
| `HVCG_FinanceARSnapshots` | Point-in-time AR aging | SnapshotDate, AmountOutstanding, 0–30/31–60/61–90/90+ buckets, SnapshotScope |
| `HVCG_FinanceCashReceipts` | Payment applications | ReceiptDate, AmountReceived, InvoiceId, PaymentMethod |
| `HVCG_FinancePaymentPlans` | Structured collection plans | PlanStatus, TotalPlanAmount, Cadence, NextInstallmentDate |

JSON paths: `src/sharepoint/lists/HVCG_Finance*.json` (`moduleExclusive: true`).  
**Not** in `lists/_index.json` until parent append (see `SHARED_FILE_RECOMMENDATIONS.md` + `HVCG_FinanceEXCLUSIVE_README.md`).
