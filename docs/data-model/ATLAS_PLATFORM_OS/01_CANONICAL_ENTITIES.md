# 01 — Canonical Platform Entities

**Rule:** Exactly one logical entity per concept. Physical store may temporarily keep a legacy list name until a rename migration; logical name is authoritative for contracts and Dataverse.

## Entity register

| # | Canonical | Logical name | Business key | Physical V1 (SharePoint) | Dataverse target | Graph touchpoint |
|---|-----------|--------------|--------------|--------------------------|------------------|------------------|
| 1 | Organization | `Organization` | `OrganizationCode` | `HVCG_Organizations` | `hvcg_atlasorganization` | — |
| 2 | Workspace | `Workspace` | `WorkspaceCode` | `HVCG_Workspaces` | `hvcg_atlasworkspace` | Group (optional) |
| 3 | Identity | `Identity` | `EntraObjectId` | `HVCG_Identities` | `hvcg_atlasidentity` | User / ServicePrincipal |
| 4 | User | `User` | `UserKey` / Email | **Canonicalize** `HVCG_TeamMembers` → logical User (no second list) | `hvcg_atlasuser` | User |
| 5 | Team | `Team` | `TeamCode` | `HVCG_Teams` | `hvcg_atlasteam` | Group |
| 6 | Role | `Role` | `RoleCode` | `HVCG_Roles` | `hvcg_atlasrole` | App role / SG |
| 7 | Permission | `Permission` | `PermissionCode` | `HVCG_Permissions` | `hvcg_atlaspermission` | — |
| 8 | Client | `Client` | `ClientCode` | `HVCG_Clients` | `hvcg_atlasclient` | — |
| 9 | Project | `Project` | `ProjectKey` | `HVCG_Projects` (+ InternalProjects as `ProjectKind`) | `hvcg_atlasproject` | — |
| 10 | Task | `Task` | `TaskKey` | `HVCG_Tasks` (AI task queues become `TaskFamily`) | `hvcg_atlastask` | Planner/To Do optional later |
| 11 | Workflow | `Workflow` | `WorkflowCode` | `HVCG_Workflows` | `hvcg_atlasworkflow` | — |
| 12 | Queue | `Queue` | `QueueCode` | `HVCG_Queues` | `hvcg_atlasqueue` | — |
| 13 | Automation | `Automation` | `AutomationCode` | `HVCG_Automations` | `hvcg_atlasautomation` | — |
| 14 | Agent | `Agent` | `AgentCode` | **Canonicalize** `HVCG_AIWorkers` | `hvcg_atlasagent` | — |
| 15 | Conversation | `Conversation` | `ConversationKey` | **Canonicalize** `HVCG_PortalMessages` (+ thread model) | `hvcg_atlasconversation` | Chat optional |
| 16 | Decision | `Decision` | `DecisionKey` | `HVCG_Decisions` | `hvcg_atlasdecision` | — |
| 17 | Approval | `Approval` | `ApprovalKey` | **Canonicalize** Approvals / Expense / AIApprovals via `ApprovalKind` | `hvcg_atlasapproval` | Approvals connector link |
| 18 | Notification | `Notification` | `NotificationKey` | `HVCG_Notifications` | `hvcg_atlasnotification` | Teams/Outlook send only |
| 19 | Event | `Event` | `EventKey` | `HVCG_Events` (absorb OperationalAlerts as `EventKind`) | `hvcg_atlasevent` | — |
| 20 | Timeline | `TimelineEntry` | `TimelineKey` | `HVCG_Timeline` (absorb Notes / OpportunityActivities / Communications) | `hvcg_atlastimeline` | — |
| 21 | Document | `Document` | `DocumentKey` | Metadata list `HVCG_Documents` → **Library DriveItem** (bytes never in list) | `hvcg_atlasdocument` | DriveItem |
| 22 | Artifact | `Artifact` | `ArtifactKey` | `HVCG_Artifacts` (Deliverables, AIOutputs, generated docs) | `hvcg_atlasartifact` | DriveItem optional |
| 23 | Metric | `Metric` | `MetricCode`+Period | **Canonicalize** `HVCG_KpiRecords` | `hvcg_atlasmetric` | — |
| 24 | Dashboard | `Dashboard` | `DashboardCode` | `HVCG_Dashboards` | `hvcg_atlasdashboard` | — |
| 25 | Widget | `Widget` | `WidgetCode` | `HVCG_Widgets` | `hvcg_atlaswidget` | — |
| 26 | Audit | `Audit` | `AuditKey` | **Canonicalize** `HVCG_AuditEvents` (+ AIAuditLog as `AuditChannel`) | `hvcg_atlasaudit` | Purview complement |
| 27 | Integration | `Integration` | `IntegrationCode` | `HVCG_Integrations` | `hvcg_atlasintegration` | Connector refs |

## Common platform columns (all tenant-scoped entities)

| Column | Purpose |
|--------|---------|
| `TenantId` | Entra tenant GUID (isolation root) |
| `OrganizationId` / `OrganizationCode` | Org scope |
| `WorkspaceId` / `WorkspaceCode` | Workspace scope |
| `ClientCode` | When client-scoped |
| `SchemaVersion` | Row writer platform schema version |
| `DataProvenance` | sample\|test\|imported\|calculated\|verified |
| `SourceSystem` | Origin |
| `LastRefreshedAt` | Freshness |
| `IsArchived` / `ArchivedAt` | Soft archive |
| `HVCG_IdempotencyKey` | Import idempotency |
| `CreatedByIdentityId` / `ModifiedByIdentityId` | Link to Identity |

## Product entities (not platform — do not duplicate platform concepts)

These **extend** the OS; they must FK to Client / Project / Task / Approval / etc.:

Opportunity, Engagement, Contact, CapitalOpportunity, Lender, Investor, FinancingCondition, Budget, Forecast, EnterpriseValueAssessment, ValueDriver, Invoice, Risk, Issue, Milestone, DocumentRequest, …

If a product feature needs “a task,” it uses **Task**. If it needs “an approval,” it uses **Approval** with `ApprovalKind`.

## Identity vs User

| Entity | Stores | Does not store |
|--------|--------|----------------|
| **Identity** | EntraObjectId, IdentityType (User/App/SP), UPN, accountEnabled link | Passwords, tokens |
| **User** | App profile, capacity, primary team, display prefs | Auth secrets |

Authentication remains **Entra ID**. Atlas never becomes an IdP.
