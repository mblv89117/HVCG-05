# 02 — Deprecation Map (collapse duplicates)

**Goal:** One schema per concept. Legacy lists remain readable during dual-read; writers move to canonical; then archive.

| Legacy / split store | Canonical | Strategy | Phase |
|----------------------|-----------|----------|-------|
| `HVCG_TeamMembers` | **User** | Logical rename only in contracts; physical list kept until rename migration | P0 |
| `HVCG_AIWorkers` | **Agent** | Add `AgentCode`; treat AIWorkers as Agent physical store (alias) | P0 |
| `HVCG_Approvals` + `HVCG_ExpenseApprovals` + `HVCG_AIApprovals` | **Approval** | New unified list OR add `ApprovalKind` on Approvals + migrate rows; stop new writes to specialty lists | P1 |
| `HVCG_AI_Tasks` (+ other AI queues as work items) | **Task** + **Queue** | Task with `TaskFamily=AI`; Queue defines inbox; do not create parallel task schemas | P1 |
| `HVCG_Notes` + `HVCG_OpportunityActivities` + `HVCG_Communications` | **TimelineEntry** | Timeline is canonical activity stream; specialty views filter `EntryType` | P1 |
| `HVCG_PortalMessages` | **Conversation** | Thread = Conversation; messages as Timeline or ConversationMessage child (v1: Conversation stores thread + latest) | P1 |
| `HVCG_KpiRecords` | **Metric** | Logical alias; keep list name until Dataverse publish uses Metric | P0 |
| `HVCG_AuditEvents` + `HVCG_AIAuditLog` | **Audit** | AuditChannel = Business \| AI \| Automation; append-only | P1 |
| `HVCG_OperationalAlerts` | **Event** | EventKind = Alert \| Signal \| Domain | P1 |
| `HVCG_Deliverables` + `HVCG_AIOutputs` + `HVCG_AI_GeneratedDocuments` | **Artifact** | ArtifactKind discriminator; library link for files | P1 |
| `HVCG_InternalProjects` | **Project** | ProjectKind = Internal \| Client | P1 |
| `HVCG_AutomationLogs` | **Event** or Automation run child | Prefer Event with EventKind=AutomationRun; keep log list as projection until cutover | P2 |
| Free-text role fields on many lists | **Role** + **Permission** | Stop encoding access in free text; map to RoleCode | P1 |
| Module-specific Client/Project clones | **Forbidden** | Reject in Architecture review | Always |

## Non-goals

- Do **not** delete legacy lists in Production in platform-os-1.0.  
- Do **not** dual-write forever — set an end date per entity after UAT.  
- Do **not** invent a second Document binary store (Graph/SharePoint library remains file SoR).

## Writer policy (after Phase P0 approve)

| Operation | Allowed target |
|-----------|----------------|
| New user profile | User (TeamMembers physical) |
| New agent registration | Agent (AIWorkers physical) |
| New metric snapshot | Metric (KpiRecords physical) |
| New platform automation catalog row | Automation |
| New dashboard/widget definition | Dashboard / Widget |
| New integration registration | Integration |

Product modules must not add `HVCG_CRM_Users`, `HVCG_Capital_Tasks`, etc.
