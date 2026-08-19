# SHARED COMPONENT CATALOG — HVCG OS

| Field | Value |
|-------|--------|
| Owner | architect |
| Status | ACTIVE |
| As of | 2026-07-15 |

Catalog of reusable / shared building blocks. Module-exclusive components are listed only when they define a pattern others should copy.

## 1. Connection references (shared)

| Logical name | Connector | Steward |
|--------------|-----------|---------|
| `hvcg_sharedsharepointonline` | SharePoint | platform / CRM solution owners |
| `hvcg_sharedoffice365` | Office 365 Outlook | platform |
| `hvcg_sharedteams` | Teams | platform |
| `hvcg_sharedapprovals` | Approvals | platform |

Source of truth file: `src/power-platform/connection-references/HVCG_ConnectionReferences.json` (must stay hash-aligned across packages).

## 2. Environment variables (shared)

| Logical name | Purpose |
|--------------|---------|
| `hvcg_CommandCenterSiteUrl` | Primary Command Center SharePoint site |
| `hvcg_ClientsSiteUrl` | Clients hub site |
| `hvcg_KnowledgeSiteUrl` | Knowledge / ops content site |
| `hvcg_ExecutiveEmail` | Executive notify target |
| `hvcg_OpsEmail` | Operations notify target |
| `hvcg_EnableClientEmails` | Client-facing email kill switch |
| `hvcg_CrmEnableTeamsNotify` | CRM Teams notify flag |
| `hvcg_CrmTestRecipient` | Non-prod redirect target |
| `hvcg_TeamsCrmChannelId` / `GroupId` | CRM Teams routing |
| `hvcg_TeamsCapitalChannelId` / `GroupId` | Capital Teams routing |

## 3. Shared SharePoint lists (core contracts)

Stewardship = schema change authority (consumers may read/write data).

| List | Steward | Consumers |
|------|---------|-----------|
| `HVCG_Clients` | CRM | All modules |
| `HVCG_Leads`, `HVCG_Opportunities`, `HVCG_OpportunityActivities` | CRM | Exec, AI, Finance (downstream) |
| `HVCG_Projects`, `HVCG_Tasks`, `HVCG_Deliverables` | Delivery/CRM | Portal, Ops, Exec, AI |
| `HVCG_Invoices`, `HVCG_Budgets`, `HVCG_CollectionsActivities`, `HVCG_FinancialMilestones` | Finance | Exec, Ops |
| `HVCG_Approvals` | **Shared (architect gate)** | Ops, Finance, Delivery, AI |
| `HVCG_Notifications`, `HVCG_AuditEvents`, `HVCG_AutomationLogs`, `HVCG_OperationalAlerts` | Platform | All |
| `HVCG_Relationships` | Intelligence / platform | Exec, AI |
| `HVCG_AIJobs` (+ orchestration set) | AI Governance | All (enqueue only via approved APIs/flows) |

## 4. Module-exclusive components (approved pattern)

| Component | Owner | Pattern to copy |
|-----------|-------|-----------------|
| `HVCG_DataRooms`, `HVCG_DataRoomParticipants`, `HVCG_PortalAuditLog`, `HVCG_PortalStatusUpdates` | client-portal | Exclusive lists + `*/portal/_module_index.json` |
| `HVCG_FinanceARSnapshots`, `HVCG_FinanceCashReceipts`, `HVCG_FinancePaymentPlans` | finance | `HVCG_Finance*` prefix; do not overload core invoice schema without review |
| `HVCG_Ops*` flows | operations | Module prefix on flows; exclusive `operations-hub-views.json` |
| `HVCG_ExecutiveWeeklyBrief` | executive | Executive-prefixed automation |

## 5. Shared indexes (LOCKED)

| File | Rule |
|------|------|
| `src/power-automate/flows/_index.json` | Append-only via Master/architect-coordinated parent replay |
| `src/power-automate/definitions/_index.json` | Same |
| `src/sharepoint/lists/_index.json` | Same |
| `src/sharepoint/views/command-center-views.json` | Same |

Modules MUST use exclusive indexes (e.g. portal `_module_index.json`) instead of mutating these.

## 6. Cross-cutting flow patterns (do not duplicate)

| Concern | Canonical approach | Avoid |
|---------|--------------------|-------|
| Renewals | Clarify Ops vs platform ownership before adding peers | Parallel `HVCG_RenewalReminders` + `HVCG_OpsRenewalAlerts` without contract |
| Approvals routing | `HVCG_Approvals` row + Approvals connector; Ops router for Ops types | Forking Approvals columns per module without review |
| Audit | Domain audit list OR `HVCG_AuditEvents` with `RelatedList` | Silent dual-write divergence |
| Weekly digests | Audience-prefixed flows (`Executive`, `Ops`) | One mega-flow for all audiences |

## 7. Schema file format

List schemas use:

```json
{
  "title": "HVCG_Entity",
  "description": "...",
  "template": "...",
  "columns": [ { "name": "ClientCode", "type": "Text", ... } ],
  "views": [ ... ]
}
```

Architect reviews compare `columns[].name` + `type` (not Git path copies alone).
