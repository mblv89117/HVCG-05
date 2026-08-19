# 02 — Normalized Schema

Logical model for Project Atlas. Physical V1 implementation remains SharePoint Lists; Dataverse `hvcg_atlas*` is the approved **target** naming for Atlas ops entities after Architecture + Power Platform promotion.

## Design principles

1. **One schema, many workspaces** — HVCG and Colorado Craft Beef share entities; isolation via `OrganizationId` + `WorkspaceId` + `ClientCode`.
2. **No module clones** — CRM, capital, delivery, finance, EV, AI all reference the same Client/Project/Task spine.
3. **Documents stay in libraries** — list rows hold requests, metadata links, and audit — never file bytes.
4. **Provenance everywhere analytical** — `DataProvenance`, `SourceSystem`, `LastRefreshedAt`.
5. **Additive migration** — new lists/columns first; dual-write; deprecate free-text later.

## Canonical entity spine

```
Organization 1──* Workspace
Organization 1──* Client          (client org served by HVCG)
Workspace    1──* Client          (workspace membership / visibility)
Client       1──* Contact
Client       1──* Engagement 1──* Project 1──* Milestone
Project      1──* Task
Client       1──* Opportunity
Opportunity  0──1 CapitalOpportunity
CapitalOpportunity 1──* FinancingCondition
Client       1──* EnterpriseValueAssessment 1──* ValueDriver
*            ──* Note (polymorphic RegardingType/RegardingKey)
FinancialPeriod 1──* Budget | ForecastLine | KpiRecord
```

## New entities (foundation v1)

| Entity | List | Key fields |
|--------|------|------------|
| Organization | `HVCG_Organizations` | OrganizationCode, LegalName, OrganizationType (`Internal`/`Client`/`Partner`), IsActive |
| Workspace | `HVCG_Workspaces` | WorkspaceCode, OrganizationId, WorkspaceType (`Internal`/`Client`/`Executive`), DisplayName |
| Role | `HVCG_Roles` | RoleCode, DisplayName, EntraGroupHint, Scope (`Tenant`/`Organization`/`Workspace`/`Client`) |
| Note | `HVCG_Notes` | NoteKey, RegardingType, RegardingKey, Body, AuthorEmail, ClientCode, OrganizationId, WorkspaceId |
| FinancialPeriod | `HVCG_FinancialPeriods` | PeriodCode (`2026-07`), StartDate, EndDate, PeriodType (`Month`), IsClosed |
| KpiRecord | `HVCG_KpiRecords` | KpiCode, PeriodId, OrganizationId, WorkspaceId, ClientCode?, ValueNumber, ValueText, Unit, DataProvenance, SourceSystem, LastRefreshedAt, CalculationMethod |
| ForecastHeader | `HVCG_Forecasts` | ForecastCode, PeriodId, ForecastCategory, OwnerEmail, Status |
| FinancingCondition | `HVCG_FinancingConditions` | CapitalOpportunityId, ConditionType, Status, DueDate, Description |
| EnterpriseValueAssessment | `HVCG_EnterpriseValueAssessments` | AssessmentCode, ClientCode, AsOfDate, Method, EnterpriseValueLow, EnterpriseValueHigh, Currency, DataProvenance, Status |
| ValueDriver | `HVCG_ValueDrivers` | AssessmentId, DriverCode, DriverName, ImpactDirection, WeightPct, Notes |
| AiInsight | `HVCG_AIInsights` | InsightKey, ClientCode?, OrganizationId, WorkspaceId, InsightType, Summary, Confidence, SourceJobId, HumanApprovalStatus, DataProvenance |

## Existing entity hardening (columns to add)

| List | Additive columns |
|------|------------------|
| All transactional client-scoped lists missing keys | `OrganizationId`, `WorkspaceId` (Lookup), ensure `ClientCode` where Power BI joins require it |
| `HVCG_Opportunities`, `HVCG_Budgets` | `ClientCode` (indexed text) |
| `HVCG_AuditEvents` | `ClientId`, `OrganizationId`, `WorkspaceId`, `DataProvenance` |
| `HVCG_Clients` | `OrganizationId`, `WorkspaceId`, `PrimaryAssessmentId` (lookup; deprecate reliance on `EnterpriseValueRange` text) |
| `HVCG_RevenueForecastLines` | `ForecastId`, `FinancialPeriodId` |
| `HVCG_TeamMembers` | `OrganizationId`, `PrimaryWorkspaceId`, `EntraObjectId` |

## Controlled vocabularies (standardize)

| Concept | Canonical choices |
|---------|-------------------|
| Health | `Green`, `Yellow`, `Red` |
| ApprovalStatus | `Not Required`, `Pending`, `Approved`, `Rejected`, `Cancelled` |
| DataProvenance | `sample`, `test`, `imported`, `calculated`, `verified` |
| FundingStatus | Keep schema spelling with spaces (`Term Sheet`, not `TermSheet`) |
| InvoiceStatus | `Draft`, `Sent`, `Partial`, `Paid`, `Past Due`, `Void` |
| PaymentStatus | `Not Invoiced`, `Invoiced`, `Partial`, `Paid`, `Past Due`, `Written Off` |

## Archival behavior

| Class | Behavior |
|-------|----------|
| Active transactional | Soft-archive: `IsArchived=true`, `ArchivedAt`, retain in list |
| Audit / AI audit | Append-only; no update/delete in app layer |
| KPI snapshots | Immutable once `DataProvenance=verified`; corrections = new row |
| Documents | Library retention + Purview labels; list metadata may archive independently |
| Closed FinancialPeriod | `IsClosed=true` blocks new budget/forecast edits without Finance override role |

## Calculated fields (documented, not stored as verified)

| Field | Source | Method |
|-------|--------|--------|
| Opportunity.WeightedValue | Amount × Probability | calculated |
| CapitalOpportunity.WeightedValue | TargetAmount × FundingProbability | calculated |
| Client.ClientLifetimeValue | Engagement history + pipeline | calculated unless Finance marks verified |
| KpiRecord.Value* | Measure definition in KPI catalog | calculated or imported |
| Utilization | TimeEntries ÷ Capacity | calculated in BI |

**Rule:** UI may show calculated values; only Finance Intelligence may promote a KPI to `verified`.
