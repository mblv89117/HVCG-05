# 04 — Field Definitions (foundation entities)

Common columns on all new foundation lists unless noted:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Title | Text | Yes | Display title |
| OrganizationId | Lookup → Organizations | Yes* | *Except Organizations itself |
| WorkspaceId | Lookup → Workspaces | Yes* | *Except Organizations; optional on pure masters |
| ClientCode | Text (indexed) | When client-scoped | Denormalized join key |
| HVCG_IdempotencyKey | Text (indexed) | Importable rows | Stable import identity |
| DataProvenance | Choice | Yes on analytical | sample\|test\|imported\|calculated\|verified |
| SourceSystem | Text | Analytical | e.g. `SharePoint`, `Manual`, `PowerBI`, `ImportPack` |
| LastRefreshedAt | DateTime | Analytical | UTC |
| IsArchived | Boolean | No | Soft archive |
| ArchivedAt | DateTime | No | Set when archived |
| CopilotKeywords | Note | No | Grounding only; not SoR |

## HVCG_Organizations

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| OrganizationCode | Text | Yes | `ORG-HVCG`, `ORG-CCB` |
| LegalName | Text | Yes | Legal entity name |
| DBA | Text | No | Trade name |
| OrganizationType | Choice | Yes | Internal, Client, Partner |
| TaxIdLast4 | Text | No | Never store full TIN in Dev sample |
| PrimaryDomain | Text | No | e.g. hvcg.example |
| IsActive | Boolean | Yes | |

## HVCG_Workspaces

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| WorkspaceCode | Text | Yes | `WS-HVCG-INTERNAL`, `WS-CCB` |
| DisplayName | Text | Yes | HVCG Workspace / Colorado Craft Beef |
| WorkspaceType | Choice | Yes | Internal, Client, Executive |
| OrganizationId | Lookup | Yes | Owning org |
| DefaultClientCode | Text | No | For single-client workspaces |
| IsActive | Boolean | Yes | |

## HVCG_Roles

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| RoleCode | Text | Yes | Matches Entra / app role |
| DisplayName | Text | Yes | |
| EntraGroupHint | Text | No | e.g. HVCG-Role-Owner |
| Scope | Choice | Yes | Tenant, Organization, Workspace, Client |

## HVCG_Notes

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| NoteKey | Text | Yes | Stable id |
| RegardingType | Choice | Yes | Client, Opportunity, Project, Task, CapitalOpportunity, Engagement, Other |
| RegardingKey | Text | Yes | Business key of target |
| Body | Note | Yes | |
| AuthorEmail | Text | Yes | |
| Visibility | Choice | Yes | Internal, ClientVisible |

## HVCG_FinancialPeriods

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| PeriodCode | Text | Yes | `YYYY-MM` |
| StartDate / EndDate | Date | Yes | |
| PeriodType | Choice | Yes | Month (v1) |
| IsClosed | Boolean | Yes | |

## HVCG_KpiRecords

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| KpiCode | Text | Yes | Matches KPI catalog |
| FinancialPeriodId | Lookup | Yes | |
| ValueNumber | Number | No | |
| ValueText | Text | No | |
| Unit | Text | No | USD, %, count |
| CalculationMethod | Note | No | Document formula |
| DataProvenance | Choice | Yes | **Never invent verified** |

## HVCG_Forecasts

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| ForecastCode | Text | Yes | |
| FinancialPeriodId | Lookup | Yes | |
| ForecastCategory | Choice | Yes | Align with Opportunity.ForecastCategory |
| Status | Choice | Yes | Draft, Published, Superseded |

## HVCG_FinancingConditions

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| CapitalOpportunityId | Lookup | Yes | |
| ConditionType | Choice | Yes | Collateral, Covenant, Guarantor, Insurance, Reporting, Other |
| Status | Choice | Yes | Open, Satisfied, Waived, Failed |
| DueDate | Date | No | |

## HVCG_EnterpriseValueAssessments

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| AssessmentCode | Text | Yes | |
| ClientCode | Text | Yes | |
| AsOfDate | Date | Yes | |
| Method | Choice | Yes | Income, Market, Asset, Hybrid, Qualitative |
| EnterpriseValueLow / High | Currency | No | Only when provenance allows |
| Currency | Text | Yes | USD default |
| Status | Choice | Yes | Draft, In Review, Accepted, Superseded |
| DataProvenance | Choice | Yes | |

## HVCG_ValueDrivers

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| AssessmentId | Lookup | Yes | |
| DriverCode | Text | Yes | |
| DriverName | Text | Yes | |
| ImpactDirection | Choice | Yes | Positive, Negative, Neutral |
| WeightPct | Number | No | 0–100 |

## HVCG_AIInsights

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| InsightKey | Text | Yes | |
| InsightType | Choice | Yes | Risk, Opportunity, Action, Summary, Anomaly |
| Summary | Note | Yes | |
| Confidence | Number | No | 0–1 |
| SourceJobId | Lookup/Text | No | AIJobs link |
| HumanApprovalStatus | Choice | Yes | Pending, Approved, Rejected |
| DataProvenance | Choice | Yes | Default `calculated` until approved |

Existing list field catalogs remain in `src/sharepoint/lists/HVCG_*.json`.
