# 01 — Data Inventory

**Audit date:** 2026-07-20  
**Branch context:** `cursor/orchestration-sprint12`  
**Provenance of this inventory:** `calculated` from repo schemas (not a live tenant export)

## 1. Systems audited

| System | In-repo artifacts | Live inventory |
|--------|-------------------|----------------|
| SharePoint Lists | 82 list JSON schemas (`src/sharepoint/lists/`) | Not exported in this pack |
| SharePoint Libraries | Client library template | Documents only |
| Dataverse `hvcg_atlas*` | Naming standard only; **0 Entity XML** | CORS/docs only |
| Power BI | `src/power-bi/executive/ceo-semantic-model.json` | Not deployed from this branch |
| Frontend types | **Absent** on this branch (no `apps/`, no `*.ts`) | Elite OS lives elsewhere |
| Migrations | 4 active packs + diffs under `releases/migrations/` | — |
| Sample / test data | `sample-data/**` | Synthetic only |

## 2. SharePoint list inventory (by domain)

| Domain | Lists (count) | Notes |
|--------|---------------|-------|
| CRM | Clients, Contacts, ReferralPartners, Leads, Referrals, Opportunities, OpportunityActivities, DiscoveryCalls, Proposals, WinLossAnalyses (10) | Core pipeline |
| Delivery | Engagements, Projects, Workstreams, Milestones, Tasks, DocumentRequests, Deliverables, Meetings, Communications, Decisions, Risks, Issues, ChangeRequests, Assumptions, Dependencies, Approvals (16) | Ops registers |
| Capital | CapitalSources, Lenders, Investors, CapitalOpportunities, FundingMilestones, InvestorOutreach, LenderOutreach (7) | Advisory desk |
| Finance ops | Invoices, FinancialMilestones, CollectionsActivities, Budgets, ExpenseApprovals, RevenueForecastLines (6) | Not GL |
| Ops hub | TeamMembers, TimeEntries, Templates, SOPs, Policies, Vendors, SoftwareInventory, Subscriptions, RecurringExpenses, InternalProjects, MeetingPlaybooks, SalesScripts, TrainingCatalog (13) | Internal |
| Intelligence | Relationships (1) | Graph edges |
| AI Ready | 10 × `HVCG_AI_*` queues | Human-gated |
| AI Orchestration | AIWorkers, AIPrompts, AIToolRegistry, AIContext, AIJobs, AIJobSteps, AIOutputs, AIApprovals, AIFeedback, AIAuditLog, AICostTracking (11) | Job spine |
| Portal prep | PortalAccess, PortalMessages, PortalDeliverableLinks (3) | V2 |
| Platform | OperationalAlerts, SystemInfo, AutomationLogs, Notifications, AuditEvents (5) | Operability |
| **Total** | **82** | Index `_index.json` v2.3 / product 1.1.0 |

Doc drift fixed by this inventory: dictionary said 67; architecture said 81; index has **82**.

## 3. Required-entity coverage

| Required entity | Coverage | Artifact |
|-----------------|----------|----------|
| organizations | **Gap** | New `HVCG_Organizations` |
| clients | OK | `HVCG_Clients` |
| contacts | OK | `HVCG_Contacts` |
| users | Partial | `HVCG_TeamMembers` + Entra |
| roles | Gap (catalog) | New `HVCG_Roles` (+ Entra groups) |
| referral sources | OK (split) | Partners + Referrals |
| opportunities | OK | `HVCG_Opportunities` |
| engagements | OK | `HVCG_Engagements` |
| projects | OK | `HVCG_Projects` |
| milestones | OK | `HVCG_Milestones` (+ funding/financial) |
| tasks | OK | `HVCG_Tasks` |
| approvals | OK | `HVCG_Approvals` |
| risks / issues / decisions / meetings | OK | Dedicated lists |
| notes | Gap | New `HVCG_Notes` |
| financial periods | Gap | New `HVCG_FinancialPeriods` |
| KPI records | Gap | New `HVCG_KpiRecords` |
| budgets | OK | `HVCG_Budgets` |
| forecasts | Partial | Lines only → add header |
| capital opportunities | OK | `HVCG_CapitalOpportunities` |
| lenders / investors | OK | Dedicated + CapitalSources |
| financing conditions | Gap | New `HVCG_FinancingConditions` |
| documents | Library | Template library — not a list |
| document requests | OK | `HVCG_DocumentRequests` |
| enterprise value assessments | Gap | New list (replace free-text range) |
| value drivers | Gap | New `HVCG_ValueDrivers` |
| AI insights | Gap | New `HVCG_AIInsights` |
| notifications / audit events | OK | Existing lists |

## 4. Duplicate / inconsistency hotspots

1. **ClientCode vs ClientId** applied unevenly (Opportunities & Budgets lack ClientCode; AuditEvents lack ClientId).
2. Amount synonyms: `WeightedValue` / `WeightedAmount`, `AmountCollected` / `CollectedAmount`.
3. Overloaded `Status` / `ApprovalStatus` / `EscalationStatus` choice sets.
4. Commercial fields duplicated on Client, Engagement, Opportunity.
5. `EnterpriseValueRange` free text on Clients — not an assessment entity.
6. KPI fixture uses `TermSheet`; schema uses `Term Sheet`.
7. Dual SoR narrative: V1 Lists SoR vs Atlas Dataverse target without shipped tables.

## 5. Workspace support map

| Surface | Primary entities needed |
|---------|-------------------------|
| Executive Dashboard | Organization, Workspace, Client, Opportunity, CapitalOpportunity, Invoice, KpiRecord, Decision, Risk, Meeting |
| HVCG workspace | Organization=`ORG-HVCG`, Workspace=`WS-HVCG-INTERNAL`, internal projects, team, ops hub |
| Colorado Craft Beef workspace | Organization=`ORG-CCB`, Workspace=`WS-CCB`, Client linked to HVCG engagement |
| CRM / projects / tasks / revenue / capital / EV / documents / analytics / AI | Mapped in §3; gaps listed for notes, periods, KPIs, financing conditions, EV, AI insights |
