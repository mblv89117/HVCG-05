# 11 — Analytics Model Support

## Current state

Logical CEO model: `src/power-bi/executive/ceo-semantic-model.json`  
Facts today: Opportunity, CapitalOpportunity, Invoice, FinancialMilestone, RevenueForecast, Decision, Risk, Meeting, TimeEntry, Project  
Dims today: Client, TeamMember, Date, PipelineStage

## Foundation extensions (additive)

| Object | Type | Source | Key |
|--------|------|--------|-----|
| DimOrganization | Dimension | HVCG_Organizations | OrganizationCode |
| DimWorkspace | Dimension | HVCG_Workspaces | WorkspaceCode |
| DimPeriod | Dimension | HVCG_FinancialPeriods | PeriodCode |
| FactKpi | Fact | HVCG_KpiRecords | KpiCode + PeriodCode + Org (+ Client) |
| FactEvAssessment | Fact | HVCG_EnterpriseValueAssessments | AssessmentCode |
| FactFinancingCondition | Fact | HVCG_FinancingConditions | Condition id |
| FactAiInsight | Fact | HVCG_AIInsights (Approved only) | InsightKey |

## Performance guidance

1. Keep transactional list queries thin for apps; materialize KPIs into `KpiRecords` for dashboard tiles.
2. Power BI Import mode (existing) — do not DirectQuery SharePoint for exec tiles.
3. RLS (future): filter on WorkspaceCode / OrganizationCode; V1 docs note no RLS — Security must approve before Prod.
4. Avoid calculating heavy CLV in report visuals when a verified/calculated KpiRecord exists.

## Measure provenance

| Measure | Provenance expectation |
|---------|------------------------|
| PipelineWeighted | calculated from Opportunities |
| CashCollected | calculated/imported from Invoices |
| Executive KPI strip | prefer KpiRecords with LastRefreshedAt |
| EV range | from Assessments only — not free text |

## Coordination

Analytics owns DAX/report UX; Data Engineering owns Fact/Dim source contracts and period spine.
