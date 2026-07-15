# Executive Command Center — KPI Definitions

**Audience:** Owner  
**Currency:** USD stored in SharePoint Currency columns  
**Rule:** Never invent amounts; blank → show `—` / measure returns BLANK.

## North-star tiles (Row A)

| ID | KPI | Definition | Source | Filter | Formula sketch |
|----|-----|------------|--------|--------|----------------|
| KPI-01 | **Pipeline $** | Sum of weighted open opportunity value | Opportunities | `WinLossStatus = Open` | `SUM(WeightedValue)` |
| KPI-02 | **MRR** | Monthly recurring retainer of active clients | Clients | `IsActive && ClientStage = Active Client` | `SUM(MonthlyRetainer)` |
| KPI-03 | **Retainers past due** | Count (or $) of past-due retainer invoices / milestones | Invoices ∪ FinancialMilestones | InvoiceType=Retainer & status Past Due; OR Milestone retainer past due | Prefer **$ outstanding** for tile; count in tooltip |
| KPI-04 | **Revenue forecast (weighted)** | Sum of weighted forecast lines for open periods | RevenueForecastLines | Period ≥ current month start; exclude Cancelled/Closed if present | `SUM(WeightedAmount)` |
| KPI-05 | **Cash collected** | Amount collected in period | Invoices | MTD: InvoiceDate or collection date in month; YTD alternate | `SUM(AmountCollected)` |
| KPI-06 | **Outstanding AR** | Remaining balance on open invoices | Invoices | Status ∈ {Sent, Partial, Past Due} | `SUM(Amount - COALESCE(AmountCollected,0))` |
| KPI-07 | **Capital pipeline $** | Weighted capital book | CapitalOpportunities | FundingStatus ∉ {Closed, Declined} | `SUM(WeightedValue)` else `TargetAmount * FundingProbability/100` |
| KPI-08 | **Projects Red/Yellow** | Count of at-risk projects | Projects | ProjectHealth ∈ {Red, Yellow} | `COUNTROWS` |

## Operating pulse (Row B)

| ID | KPI | Definition | Source | Notes |
|----|-----|------------|--------|-------|
| KPI-09 | **Team utilization %** | Billable hours ÷ capacity | TimeEntries + TeamMembers | BI preferred; Apps may use `CurrentUtilizationPct` average for active members |
| KPI-10 | **Available capacity (hrs)** | Sum AvailableHoursThisWeek | TeamMembers | Active only |
| KPI-11 | **Client health** | Distribution Active Client by OverallHealth | Clients | Stacked bar / counts G/Y/R |
| KPI-12 | **Win rate (90d)** | Won ÷ (Won+Lost) last 90 days | Opportunities or WinLossAnalyses | Closed Date in window |
| KPI-13 | **Avg sales cycle (days)** | Mean days Discovery→Won | Opportunities / WinLoss | 90d closed-won |
| KPI-14 | **Doc collection SLA** | % critical docs accepted on-time | DocumentRequests | Ops metric; show on pulse only if Owner wants exception rate > threshold |

## My work / queues (Row C)

| ID | KPI | Definition | Source |
|----|-----|------------|--------|
| KPI-15 | **My task queue** | Open tasks where Owner or Approver = me | Tasks |
| KPI-16 | **Approvals waiting** | Deliverables requiring exec approval + open expense approvals | Deliverables, ExpenseApprovals |
| KPI-17 | **Critical decisions** | RequiresExecutiveAttention && status Proposed/Pending Decision | Decisions |
| KPI-18 | **Major risks** | Open risks High/Critical (or RequiresExecutiveAttention) | Risks |
| KPI-19 | **Upcoming meetings (14d)** | Meetings in next 14 days involving Owner | Meetings |

## Capital & relationships (Row D)

| ID | KPI | Definition | Source |
|----|-----|------------|--------|
| KPI-20 | **Capital by FundingStatus** | Counts / $ by status | CapitalOpportunities |
| KPI-21 | **Referral pipeline** | Referrals Received/Qualified | Referrals |
| KPI-22 | **Proposals awaiting decision** | Proposals Sent | Proposals |
| KPI-23 | **Revenue at risk $** | Sum Amount where RevenueAtRisk | FinancialMilestones |
| KPI-24 | **Strategic relationships this week** | Intelligence Q15 | Relationships + attention flags |

## Thresholds → executive attention

Align with `SOP_Executive_Escalation.md` and existing escalations:

| Signal | Escalate when |
|--------|---------------|
| Decision | RequiresExecutiveAttention = true |
| Project | Health = Red OR RequiresExecutiveAttention |
| Client | OverallHealth = Red OR Payment Past Due > 30d OR RequiresExecutiveAttention |
| Opportunity | WeightedValue ≥ org high-value threshold OR RequiresExecutiveAttention |
| Capital | FundingStatus stalled Beyond expected close OR RequiresExecutiveAttention |
| AR | Past Due > 14 days and Amount ≥ materiality (Ops-defined) |

## Display conventions

| Item | Rule |
|------|------|
| Currency | `$#,##0` (no cents on north-star tiles) |
| Empty | Em dash or blank measure — never `0` when data missing vs true zero: use `0` only when filtered set is empty of open items |
| Period toggle | Cash: MTD default; YTD via variable `varCashPeriod` |
| Color | Green / Yellow / Red via `nfHealthColor` / stage colors |

## Power Fx bindings (executive formulas file)

See `src/power-apps/formulas/ExecutiveNamedFormulas.fx` (`nfExec*` prefix).

## DAX bindings

See `docs/executive/POWERBI_CEO_MODEL.md` and `src/power-bi/executive/measures.dax`.
