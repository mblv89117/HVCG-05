# Atlas Metric Catalog (Canonical)

**Version:** 1.0.0  
**Machine-readable:** [metric-catalog.json](./metric-catalog.json)  
**Aliases:** `docs/executive/KPI_DEFINITIONS.md` (`KPI-##`), `docs/executive/KPI_CATALOG.md` (`E-##`) — same formulas; do not diverge.

**Display rules:** Currency `$#,##0`. Missing / unknown → `—` (BLANK). Never fabricate history. Exclude rows where `DataProvenance` ∈ {`sample`,`test`} from production tiles when the column exists.

---

## ATLAS-M-001 — Revenue trend

| Field | Definition |
|-------|------------|
| **Name** | Revenue trend |
| **Business meaning** | How recognized / collected revenue is moving over time so leadership can spot growth, stall, or seasonality. |
| **Formula** | Monthly: `SUM(Invoices[AmountCollected])` by calendar month of collection/invoice date. Secondary series: `SUM(FinancialMilestones[RecognizedAmount])` where present. |
| **Data source** | `HVCG_Invoices`, `HVCG_FinancialMilestones` |
| **Refresh frequency** | Apps: on screen refresh. BI: 4×/day Dev; Prod per owner schedule. |
| **Reporting period** | Trailing 12 months (default); toggle MTD / QTD / YTD |
| **Owner** | Analytics (definition); Finance Ops (data quality) |
| **Limitations** | Not bank-synced. Collection date may lag InvoiceDate. Blank months stay blank — do not zero-fill invented history. |
| **Filters** | ClientCode, InvoiceType, period |
| **Security** | Owner / Admin / Finance viewer |
| **Visual** | Single line chart (cash collected by month) |
| **Aliases** | — |

---

## ATLAS-M-002 — Weighted pipeline

| Field | Definition |
|-------|------------|
| **Name** | Weighted pipeline |
| **Business meaning** | Probability-weighted open opportunity value — the sales book that can convert. |
| **Formula** | `SUM(WeightedValue)` where `WinLossStatus = "Open"` |
| **Data source** | `HVCG_Opportunities` |
| **Refresh frequency** | Near real-time (Apps); BI import schedule |
| **Reporting period** | Point-in-time (open book) |
| **Owner** | Analytics; Revenue Systems (pipeline hygiene) |
| **Limitations** | Depends on Probability/WeightedValue quality. Commit subset is ATLAS-M-002b (`ForecastCategory = Commit`). |
| **Filters** | Stage, ForecastCategory, SalesOwnerEmail, ClientCode |
| **Security** | Owner+ |
| **Visual** | KPI tile + optional bar by stage |
| **Aliases** | KPI-01, E-01 |

---

## ATLAS-M-003 — Conversion rate

| Field | Definition |
|-------|------------|
| **Name** | Conversion rate (win rate 90d) |
| **Business meaning** | Share of closed opportunities won in the last 90 days. |
| **Formula** | `Won ÷ (Won + Lost)` where closed date in last 90 days; status ∈ {Won, Lost} |
| **Data source** | `HVCG_Opportunities` (prefer `HVCG_WinLossAnalyses` when populated) |
| **Refresh frequency** | Daily BI; Apps on refresh |
| **Reporting period** | Rolling 90 days |
| **Owner** | Analytics; Revenue Systems |
| **Limitations** | Small-N noise. Excludes still-open deals. |
| **Filters** | SalesOwnerEmail, EngagementType / Stage path |
| **Security** | Owner+ |
| **Visual** | KPI % + sparkline optional |
| **Aliases** | KPI-12 |

---

## ATLAS-M-004 — Engagement revenue

| Field | Definition |
|-------|------------|
| **Name** | Engagement revenue |
| **Business meaning** | Contracted value of active engagements (retainer + engagement value), for portfolio revenue view. |
| **Formula** | Active engagements: `SUM(Coalesce(EngagementValue, 0)) + SUM(MonthlyRetainer)` where `EngagementStatus` ∈ active set (`Active`, `In Progress`, `On Track`). Prefer EngagementValue when set; do not double-count retainer already rolled into EngagementValue (Ops rule: if EngagementValue blank, add MonthlyRetainer × remaining months only in BI forecast views — **tile uses MRR-style sum of MonthlyRetainer + SetupFee outstanding separately**). **Canonical tile:** `SUM(MonthlyRetainer) + SUM(Coalesce(EngagementValue,0))` for active engagements, with limitation note when both populated. |
| **Data source** | `HVCG_Engagements` |
| **Refresh frequency** | Near real-time Apps; BI schedule |
| **Reporting period** | Point-in-time active book |
| **Owner** | Analytics; Client / Ops |
| **Limitations** | EngagementValue vs MonthlyRetainer may overlap if both filled — show tooltip “verify EngagementValue includes retainer.” Never invent missing EngagementValue. |
| **Filters** | ClientCode, EngagementType, EngagementStatus |
| **Security** | Owner / Finance |
| **Visual** | KPI tile; table by engagement on drill |
| **Aliases** | — |

---

## ATLAS-M-005 — Client concentration

| Field | Definition |
|-------|------------|
| **Name** | Client concentration |
| **Business meaning** | How dependent revenue is on the largest clients (risk of concentration). |
| **Formula** | Top-1 / Top-3 share of Active Client `MonthlyRetainer` (or `ClientLifetimeValue` when Owner toggles LTV mode). `TopNRetainer ÷ TotalActiveMRR` |
| **Data source** | `HVCG_Clients` |
| **Refresh frequency** | Daily |
| **Reporting period** | Point-in-time |
| **Owner** | Analytics; Owner (interpretation) |
| **Limitations** | MRR-only misses success-fee heavy clients. LTV mode uses ClientLifetimeValue when verified. |
| **Filters** | ClientStage = Active Client, IsActive |
| **Security** | Owner / Finance (hidden from contractors) |
| **Visual** | Horizontal bar (top 5) + % KPI for Top-3 |
| **Aliases** | — |

---

## ATLAS-M-006 — Client health

| Field | Definition |
|-------|------------|
| **Name** | Client health |
| **Business meaning** | Distribution of active clients by OverallHealth for early intervention. |
| **Formula** | Counts of Active Clients by `OverallHealth` ∈ {Green, Yellow, Red}; Red count is executive attention signal. |
| **Data source** | `HVCG_Clients` |
| **Refresh frequency** | Near real-time |
| **Reporting period** | Point-in-time |
| **Owner** | Analytics; Ops Manager |
| **Limitations** | Manual health field — not auto-derived from AR/docs unless Ops rules applied. |
| **Filters** | ClientStage, Owner |
| **Security** | Owner+ |
| **Visual** | Stacked bar or three count chips (G/Y/R) |
| **Aliases** | KPI-11, E-10 (Red count) |

---

## ATLAS-M-007 — Project health

| Field | Definition |
|-------|------------|
| **Name** | Project health |
| **Business meaning** | Count of delivery projects at risk (Red/Yellow). |
| **Formula** | `COUNTROWS` where `ProjectHealth` ∈ {Red, Yellow} |
| **Data source** | `HVCG_Projects` |
| **Refresh frequency** | Near real-time |
| **Reporting period** | Point-in-time |
| **Owner** | Analytics; Project delivery |
| **Limitations** | Health is PM-maintained. Does not equal overdue task rate. |
| **Filters** | ClientCode, ProjectOwner |
| **Security** | Owner+ / OpsMgr |
| **Visual** | KPI count; list on drill |
| **Aliases** | KPI-08, E-09 |

---

## ATLAS-M-008 — Overdue task rate

| Field | Definition |
|-------|------------|
| **Name** | Overdue task rate |
| **Business meaning** | Share of open tasks that are overdue — operational drag signal. |
| **Formula** | `COUNTROWS(IsOverdue=true ∧ Status not Done/Cancelled) ÷ COUNTROWS(open tasks)` |
| **Data source** | `HVCG_Tasks` |
| **Refresh frequency** | Near real-time Apps; hourly BI preferred |
| **Reporting period** | Point-in-time |
| **Owner** | Analytics; Ops |
| **Limitations** | Includes low-priority chores unless filtered `Priority ∈ {High,Critical}` for exec view. |
| **Filters** | OwnerEmail, ClientCode, Priority, ProjectId |
| **Security** | Owner / OpsMgr / assigned PM (client-scoped) |
| **Visual** | KPI %; optional by-owner bar |
| **Aliases** | — |

---

## ATLAS-M-009 — Approval turnaround

| Field | Definition |
|-------|------------|
| **Name** | Approval turnaround |
| **Business meaning** | Median calendar days from approval request to completion — how fast decisions clear. |
| **Formula** | Median of `CompletedDate − RequestedDate` for `ApprovalStatus ∈ {Approved, Rejected}` completed in period. Pending queue count is companion signal (KPI-16). |
| **Data source** | `HVCG_Approvals` (primary); ExpenseApprovals / Deliverables as secondary when Approvals row missing |
| **Refresh frequency** | Daily BI |
| **Reporting period** | Rolling 30 / 90 days |
| **Owner** | Analytics; Administration / Owner for SLA |
| **Limitations** | Incomplete CompletedDate → exclude from median (do not invent). Small-N: show sample size. |
| **Filters** | ApprovalType, ApproverEmail |
| **Security** | Owner / OpsMgr |
| **Visual** | KPI days + pending count chip |
| **Aliases** | — |

---

## ATLAS-M-010 — Milestone performance

| Field | Definition |
|-------|------------|
| **Name** | Milestone performance |
| **Business meaning** | On-time / at-risk financial milestone execution. |
| **Formula** | On-time rate: paid/completed on or before DueDate ÷ milestones due in period. At-risk $: `SUM(Amount)` where `RevenueAtRisk = true` OR `IsPastDue = true`. |
| **Data source** | `HVCG_FinancialMilestones` |
| **Refresh frequency** | Daily |
| **Reporting period** | Rolling 90 days (rate); point-in-time (at-risk $) |
| **Owner** | Analytics; Finance Ops |
| **Limitations** | PaymentStatus hygiene required. Success fees estimated ≠ collected. |
| **Filters** | ClientCode, MilestoneType, IsRetainer, IsSuccessFee |
| **Security** | Owner / Finance |
| **Visual** | KPI % + at-risk $ tile |
| **Aliases** | KPI-23 (at-risk $) |

---

## ATLAS-M-011 — Capital-readiness progress

| Field | Definition |
|-------|------------|
| **Name** | Capital-readiness progress |
| **Business meaning** | How ready open capital deals are (critical funding milestones + linked docs). |
| **Formula** | For open capital book (`FundingStatus ∉ {Closed, Declined, Withdrawn}`): `Completed critical FundingMilestones ÷ Total critical FundingMilestones`. Companion: linked `DocumentRequests` completion (see M-012 filtered by CapitalOpportunityId). |
| **Data source** | `HVCG_FundingMilestones`, `HVCG_CapitalOpportunities` |
| **Refresh frequency** | Daily |
| **Reporting period** | Point-in-time |
| **Owner** | Analytics; Capital Advisory |
| **Limitations** | Requires IsCritical flags. Deals with zero milestones → BLANK (not 100%). |
| **Filters** | ClientCode, FundingStatus, CapitalOpportunityId |
| **Security** | Owner / CapitalAdvisor |
| **Visual** | Progress % by deal (table); portfolio average KPI |
| **Aliases** | — |

---

## ATLAS-M-012 — Document-completion rate

| Field | Definition |
|-------|------------|
| **Name** | Document-completion rate |
| **Business meaning** | Share of document requests closed (Accepted / Waived) vs still open — readiness for delivery and capital. |
| **Formula** | `COUNTROWS(RequestStatus ∈ {Accepted, Waived}) ÷ COUNTROWS(RequestStatus ∉ {Cancelled})` for scoped set. Critical-only mode: `IsCritical = true`. |
| **Data source** | `HVCG_DocumentRequests` |
| **Refresh frequency** | Near real-time |
| **Reporting period** | Point-in-time open requests + closed in period toggle |
| **Owner** | Analytics; Ops |
| **Limitations** | Waived counts as complete for readiness, not for compliance audits. |
| **Filters** | ClientCode, IsCritical, CapitalOpportunityId, ProjectId |
| **Security** | Role + client ACL |
| **Visual** | KPI %; funnel optional (Requested → Received → Accepted) |
| **Aliases** | KPI-14 (SLA variant) |

---

## ATLAS-M-013 — Active financing pipeline

| Field | Definition |
|-------|------------|
| **Name** | Active financing pipeline |
| **Business meaning** | Weighted capital / financing book still alive. |
| **Formula** | `SUM(Coalesce(WeightedValue, TargetAmount * FundingProbability/100))` where `FundingStatus ∉ {Closed, Declined, Withdrawn}` |
| **Data source** | `HVCG_CapitalOpportunities` |
| **Refresh frequency** | Near real-time |
| **Reporting period** | Point-in-time |
| **Owner** | Analytics; Capital Advisory |
| **Limitations** | Probability quality drives weight. Closed deals excluded. |
| **Filters** | FundingStatus, ClientCode |
| **Security** | Owner / CapitalAdvisor |
| **Visual** | KPI $ + stacked by FundingStatus |
| **Aliases** | KPI-07, E-08 |

---

## ATLAS-M-014 — Enterprise-value progress

| Field | Definition |
|-------|------------|
| **Name** | Enterprise-value progress |
| **Business meaning** | Status of EV assessments — how far clients are through valuation work (not an appraisal). |
| **Formula** | Counts by `Status` (Draft / In Review / Accepted). Progress KPI: `Accepted ÷ (Draft + In Review + Accepted)` excluding Superseded. Midpoint display: `AVERAGE((EnterpriseValueLow + EnterpriseValueHigh)/2)` for **Accepted** only, and only when `DataProvenance = verified` (never sample/test). |
| **Data source** | `HVCG_EnterpriseValueAssessments` |
| **Refresh frequency** | Daily |
| **Reporting period** | Point-in-time |
| **Owner** | Analytics; Capital / Revenue (assessment authors) |
| **Limitations** | **Not a formal appraisal.** Ranges are illustrative until verified. Exclude sample/test provenance from production tiles. |
| **Filters** | ClientCode, Method, Status, DataProvenance |
| **Security** | Owner / Capital / Finance |
| **Visual** | Status counts; verified midpoint $ only with disclaimer |
| **Aliases** | — |

---

## ATLAS-M-015 — User adoption

| Field | Definition |
|-------|------------|
| **Name** | User adoption |
| **Business meaning** | How many internal users are actively using Atlas systems. |
| **Formula** | Distinct `ActorEmail` on `HVCG_AuditEvents` in last 7 and 30 days, intersected with active `HVCG_TeamMembers`. Companion: Power Apps / SWA session counts when App Insights enabled (Elite OS) — **not fabricated**; show “unavailable” until wired. |
| **Data source** | `HVCG_AuditEvents`, `HVCG_TeamMembers`; optional App Insights |
| **Refresh frequency** | Daily |
| **Reporting period** | Rolling 7d / 30d |
| **Owner** | Analytics; Master PM (adoption goals) |
| **Limitations** | AuditEvents under-count silent readers. Not a substitute for Entra sign-in logs. |
| **Filters** | PrimaryRole |
| **Security** | Owner / Admin |
| **Visual** | KPI distinct users 7d / 30d |
| **Aliases** | — |

---

## ATLAS-M-016 — Workflow failures

| Field | Definition |
|-------|------------|
| **Name** | Workflow failures |
| **Business meaning** | Automation reliability — failed flow runs needing attention. |
| **Formula** | `COUNTROWS` where `Status = Failed` in last 7 days; failure rate = Failed ÷ (Succeeded + Failed) in period. |
| **Data source** | `HVCG_AutomationLogs` |
| **Refresh frequency** | Near real-time Ops; daily exec digest |
| **Reporting period** | Rolling 7 / 30 days |
| **Owner** | Analytics; Automation / Deployment |
| **Limitations** | Only flows that write AutomationLogs. SkippedDuplicate ≠ failure. |
| **Filters** | FlowName, ClientCode |
| **Security** | Owner / Admin / OpsMgr |
| **Visual** | KPI count + top failing flows table |
| **Aliases** | — |

---

## Supporting executive tiles (unchanged aliases)

| ATLAS ID | Name | Alias |
|----------|------|-------|
| ATLAS-M-017 | MRR | KPI-02, E-03 |
| ATLAS-M-018 | Outstanding AR | KPI-06, E-04 |
| ATLAS-M-019 | Cash collected | KPI-05, E-05 |
| ATLAS-M-020 | Revenue forecast weighted | KPI-04, E-07 |
| ATLAS-M-021 | Team utilization | KPI-09, E-14 |
| ATLAS-M-022 | Approvals waiting (queue) | KPI-16, E-12 |

Full formulas for supporting tiles: `docs/executive/KPI_DEFINITIONS.md` — must stay aligned with this catalog.
