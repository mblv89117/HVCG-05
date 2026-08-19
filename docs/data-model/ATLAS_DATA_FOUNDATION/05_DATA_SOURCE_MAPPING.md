# 05 — Data-Source Mapping

## Operational sources → foundation entities

| Consumer | Reads from | Join | Write path |
|----------|------------|------|------------|
| Executive Dashboard | Clients, Opportunities, CapitalOpportunities, Invoices, FinancialMilestones, RevenueForecastLines, Decisions, Risks, Meetings, TeamMembers, **KpiRecords (new)** | ClientCode, PeriodCode | KPIs via approved refresh job only |
| HVCG workspace | InternalProjects, TeamMembers, SOPs, Tasks (HVCG client/internal), Ops hub | Organization=`ORG-HVCG`, Workspace=`WS-HVCG-INTERNAL` | Staff apps / flows |
| Colorado Craft Beef workspace | Client CCB + projects/tasks/docs/capital for that ClientCode | Workspace=`WS-CCB` | Client-scoped UI |
| CRM | Leads → Opportunities → Clients/Contacts/Referrals | ClientCode after win | Model-driven / canvas / lists |
| Projects / Tasks | Projects, Workstreams, Milestones, Tasks | ProjectId, ClientCode | Delivery OS |
| Revenue | Invoices, FinancialMilestones, Forecasts/Lines, Budgets | ClientCode, Period | Finance ops (not GL) |
| Capital advisory | CapitalOpportunities, Lenders, Investors, FundingMilestones, FinancingConditions | ClientCode, OpportunityId | Capital desk |
| Financial intelligence / EV | EnterpriseValueAssessments, ValueDrivers, Budgets, Forecasts | ClientCode, Period | Finance Intelligence (verified gate) |
| Documents | Libraries + DocumentRequests + Deliverables | Client library path | Upload via request links |
| Analytics / Power BI | Semantic model over lists (+ KpiRecords) | ClientCode | Import refresh |
| AI insights | AIInsights ← AIJobs/AIOutputs (after human approval) | ClientCode / WorkspaceId | AI Governance gated |

## Integration map (no duplicate SoR)

| Integration | Direction | Mapping rule |
|-------------|-----------|--------------|
| Entra ID | → UserProfile / Roles | Email + ObjectId; groups authorize |
| SharePoint Libraries | ↔ DocumentRequest | Store URL / DriveItemId only |
| External accounting | ← Invoice.ExternalAccountingId | Link only; no GL lines in Atlas |
| Teams / Outlook | ← Notifications, Meeting metadata | No second task store |
| Elite OS / frontend | ← contracts in `docs/data-model/contracts/` | Same business keys |
| Dataverse (future) | ← SharePoint via migration pack | Preserve ClientCode / OrganizationCode |

## Module anti-duplication rules

| Do | Do not |
|----|--------|
| Reference `ClientCode` | Create per-module Client tables |
| Store EV in Assessments | Encode EV only as free text on Client |
| Store KPI snapshots in KpiRecords | Hard-code KPI values in frontend |
| Link documents by URL | Copy structured opportunity rows into libraries |
| Use FinancialPeriods | Invent ad-hoc month strings per list |

## Workspace seed mapping (logical)

| WorkspaceCode | OrganizationCode | Default ClientCode | Purpose |
|---------------|------------------|--------------------|---------|
| WS-HVCG-INTERNAL | ORG-HVCG | — | HVCG internal operations |
| WS-HVCG-EXEC | ORG-HVCG | — | Executive Dashboard cross-client (role-gated) |
| WS-CCB | ORG-CCB | CCB01 | Colorado Craft Beef client workspace |
