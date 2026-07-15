# Executive Command Center — Data Map

**Module:** CEO / Executive Command Center  
**Join key:** Prefer `ClientCode` (text). Retain SharePoint IDs for drillthrough.

## 1. Entity → KPI domain

| Domain | Primary lists | Secondary | CEO surface |
|--------|---------------|-----------|-------------|
| Pipeline | `HVCG_Opportunities`, `HVCG_Leads`, `HVCG_Proposals` | `HVCG_WinLossAnalyses`, `HVCG_ReferralPartners` | Pipeline $, Commit forecast, win rate |
| MRR / retainers | `HVCG_Clients`, `HVCG_Engagements` | `HVCG_FinancialMilestones` | MRR, renewals, concentration |
| Forecast | `HVCG_RevenueForecastLines`, Opportunities `ForecastCategory` | FinancialMilestones success fees | Weighted forecast |
| Cash | `HVCG_Invoices` (`AmountCollected`) | CollectionsActivities | Cash MTD/YTD |
| AR | `HVCG_Invoices` (Sent/Partial/Past Due) | FinancialMilestones `IsPastDue` | Outstanding AR, past-due retainers |
| Capital | `HVCG_CapitalOpportunities` | Lenders, Investors, FundingMilestones | Capital pipeline $ |
| Capacity | `HVCG_TeamMembers`, `HVCG_TimeEntries` | Projects, Tasks | Utilization, available hours |
| Approvals | `HVCG_Deliverables`, `HVCG_ExpenseApprovals`, Approvals connector items | ChangeRequests | Approvals waiting |
| Risks | `HVCG_Risks`, `HVCG_Issues`, Projects health | Clients `OverallHealth` | Major risks, red clients/projects |
| Decisions | `HVCG_Decisions` | Clients/Projects `RequiresExecutiveAttention` | Executive queue |
| Meetings | `HVCG_Meetings` | Relationships `NextPlannedInteraction` | Next 14 days |

## 2. Star schema (logical)

```
                    DimDate
                       │
DimClient ──┬── FactOpportunity
            ├── FactCapitalOpportunity
            ├── FactInvoice
            ├── FactFinancialMilestone
            ├── FactRevenueForecast
            ├── FactTask (exec: approver / critical only)
            └── FactDecision / FactRisk / FactMeeting
DimTeamMember ── FactTimeEntry
DimProject ──── FactTask
DimPipelineStage (from Opportunity.Stage)
```

Power BI physical mapping: `src/power-bi/executive/ceo-semantic-model.json` and `docs/executive/POWERBI_CEO_MODEL.md`.

## 3. Field inventory (executive-critical)

### Clients (`HVCG_Clients`)
| Field | Use |
|-------|-----|
| ClientCode, Title | Identity |
| ClientStage, IsActive | MRR filter (`Active Client`) |
| MonthlyRetainer | MRR |
| ClientLifetimeValue | Concentration / Q14 |
| OverallHealth, RiskLevel | Health distribution |
| PaymentStatus | Past-due signal |
| RequiresExecutiveAttention | Exec attention rail |
| CopilotSummary, CopilotKeywords | Brief grounding |

### Opportunities
| Field | Use |
|-------|-----|
| WinLossStatus, Stage, ForecastCategory | Pipeline / commit |
| Amount, Probability, WeightedValue | Pipeline $ |
| ExpectedCloseDate, NextActionDate | Aging / urgency |
| SalesOwnerEmail | Owner drill |
| CapitalHandoffStatus | Capital adjacency |
| RequiresExecutiveAttention | Queue union |

### Capital opportunities
| Field | Use |
|-------|-----|
| FundingStatus, FundingProbability, TargetAmount, WeightedValue | Capital pipeline |
| ExpectedCloseDate | Calendar |
| RequiresExecutiveAttention | Queue |

### Invoices / finance
| Field | Use |
|-------|-----|
| Amount, AmountCollected, InvoiceStatus, DueDate, InvoiceType | Cash + AR |
| FinancialMilestones: Amount, IsPastDue, RevenueAtRisk, PaymentStatus, MilestoneType | Revenue at risk / success fees |
| RevenueForecastLines: WeightedAmount, ForecastCategory, ForecastMonth | Forecast strip (no ClientCode on list — join via OpportunityId when expanded) |

### Capacity
| Field | Use |
|-------|-----|
| CapacityHoursPerWeek, CurrentUtilizationPct, AvailableHoursThisWeek, BillableTargetPct | Capacity tiles |
| TimeEntries Hours + IsBillable | Utilization calc (BI) |

### Registers / meetings
| Field | Use |
|-------|-----|
| Decisions: DecisionStatus, RequiresExecutiveAttention, Deadline, EscalationReason, DecisionMakerEmail | Decision queue |
| Risks: RiskLevel, RiskStatus, RequiresExecutiveAttention | Major risks |
| Meetings: MeetingDate, CommunicationOwnerEmail | Upcoming meetings |
| Deliverables: RequiresExecutiveApproval, ClientApprovalStatus, InternalReviewStatus, DeliverableStatus | Approvals |
| ExpenseApprovals: ApprovalStatus, Amount, RequestedByEmail | Expense approvals |
| Proposals: ProposalStatus, ProposalAmount, ExpiryDate | Awaiting decision |
| Relationships: StrategicValue, NextPlannedInteraction, Source/Target ClientCode | Strategic this week |

## 4. View mapping

Canonical executive views live in **`src/sharepoint/views/executive-views.json`** (this module).  
Baseline / shared views remain in `command-center-views.json` (owned by platform; do not edit here).

| View title | List | Maps to KPI / screen |
|------------|------|----------------------|
| CEO Active MRR Clients | Clients | MRR tile |
| CEO Needs Attention | Clients | Attention rail |
| CEO Open Pipeline | Opportunities | Pipeline $ |
| CEO Commit Forecast | Opportunities | Commit forecast |
| CEO Outstanding AR | Invoices | AR tile |
| CEO Cash Collected MTD | Invoices | Cash (filter by InvoiceDate) |
| CEO Active Capital Book | CapitalOpportunities | Capital pipeline |
| CEO Executive Decision Queue | Decisions | Decisions gallery |
| CEO Major Risks | Risks | Risks gallery |
| CEO Approvals Waiting | Deliverables | Approvals |
| CEO Expense Approvals Open | ExpenseApprovals | Approvals |
| CEO Capacity Snapshot | TeamMembers | Capacity |
| CEO Upcoming Meetings | Meetings | Meetings |
| CEO Projects At Risk | Projects | Delivery health |
| CEO Revenue At Risk | FinancialMilestones | Revenue at risk |
| CEO Forecast Lines Open | RevenueForecastLines | Forecast |

## 5. Data freshness expectations

| Domain | Expected lag | Notes |
|--------|--------------|-------|
| Decisions / Risks | Near real-time (list) | Power Apps direct |
| Pipeline / Capital | Near real-time | Apps; BI import schedule 4–8×/day |
| Invoices / AR | Same-day Ops update | Not bank sync |
| Time / utilization | Weekly Ops refresh of utilization fields OR BI from TimeEntries | Prefer BI for trend |

## 6. Security notes

- Owner group: all CEO pages and Restricted Financial.  
- Ops may see delivery risk but not necessarily full AR/MRR concentration in the Power BI Owner app.  
- Copilot respects SharePoint ACLs; banned content rules in `COPILOT_EXECUTIVE.md`.
