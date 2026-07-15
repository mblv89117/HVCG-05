# ARCHITECTURE — HVCG OS (Version 1.1.0)

## Product identity

**HVCG OS** is the operating system for High Value Capital Group LLC — not only project management. It covers CRM, capital advisory, delivery, finance operations, knowledge, executive command, intelligence layer, AI orchestration, and AI-ready queues on Microsoft 365.

Naming prefix remains `HVCG_`. App name: **HVCG OS Command Center**.  
**Current product version:** 1.1.0 (additive upgrade from 1.0.0).

## Capability map

```
                    ┌─────────────────────────┐
                    │   Executive Command     │
                    │   Center (CEO view)     │
                    └────────────┬────────────┘
         ┌──────────────┬────────┴────────┬──────────────┐
         ▼              ▼                 ▼              ▼
     CRM / Sales   Capital Advisory   Delivery OS    Finance Ops
         │              │                 │              │
         └──────────────┴────────┬────────┴──────────────┘
                                 ▼
                    SharePoint Lists (SOR) + Libraries
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
  Intelligence Layer      Operations Hub          AI Orchestration
  (HVCG_Relationships)    Knowledge/SOPs          (AIJobs, AIContext,
         │                  Vendors, etc.           AIPrompts, etc.)
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        AI Work Queues     Portal Prep (V2)   Backup / Monitoring
        (human-approved)   (entities ready)   (OperationalAlerts)
```

## Domains & systems of record

| Domain | Primary lists | Notes |
|--------|---------------|-------|
| CRM | Leads, ReferralPartners, Referrals, DiscoveryCalls, Opportunities, Proposals, WinLossAnalyses, Clients, Contacts | Pipeline & CLV on Client/Opportunity |
| Capital | CapitalOpportunities, CapitalSources, Lenders, Investors, FundingMilestones, Lender/Investor Outreach | Document requests can bind to capital deals |
| Delivery | Engagements, Projects, Tasks, Deliverables, Meetings, Registers | Existing V1 core retained |
| Finance Ops | Invoices, FinancialMilestones, CollectionsActivities, Budgets, ExpenseApprovals, RevenueForecastLines | Not a GL; links to accounting IDs |
| Operations Hub | SOPs, Templates, Policies, Vendors, SoftwareInventory, Subscriptions, RecurringExpenses, InternalProjects, MeetingPlaybooks, SalesScripts, TrainingCatalog | Knowledge Center files |
| **Intelligence** | **Relationships** | Cross-domain graph edges; `IsCrossClient` for isolation; query catalog in `docs/intelligence/` |
| **AI Orchestration** | **AIWorkers, AIJobs, AIJobSteps, AIContext, AIPrompts, AIToolRegistry, AIOutputs, AIApprovals, AIFeedback, AIAuditLog, AICostTracking** | Foundation for agents; links to specialized queues via `JobId` |
| AI Ready | 10 dedicated `HVCG_AI_*` queues | HumanApprovalRequired default true; retained alongside orchestration |
| **Monitoring** | **OperationalAlerts**, AutomationLogs, SystemInfo | Operational health + deployment signals |
| Portal V2 prep | PortalAccess, PortalMessages, PortalDeliverableLinks + PortalVisible flags | No Power Pages in V1 |
| Platform | AutomationLogs, Notifications, AuditEvents, TeamMembers, TimeEntries | Operability |

## Count

**81** SharePoint lists (extended from 68 in v1.0.0). Provisioning remains idempotent via `Install-HVCGOS.ps1` / `Deploy-HVCGDevelopment.ps1`.

## Intelligence Layer (v1.1.0)

`HVCG_Relationships` stores normalized **graph edges** between entities across domains — not a dedicated graph database. Each row represents a directed relationship (source entity type/ID → target entity type/ID) with metadata (relationship type, strength, status, `ClientCode`, `IsCrossClient`).

**Design intent:** Answer cross-domain questions ("who is connected to this capital opportunity?") via indexed SharePoint queries rather than deep lookup chains.

**Query catalog:** `docs/intelligence/INTELLIGENCE_QUERY_CATALOG.md`

**Migration path (V2+):** When relationship volume or query complexity exceeds SharePoint comfort, migrate edges to:
- **Dataverse** — relational integrity + row-level security
- **Microsoft Graph** — people/org relationships
- **Azure Cosmos DB** — document + graph API at scale
- **Dedicated graph DB** — Neo4j / Gremlin for complex traversals

Business keys (`ClientCode`, `RelationshipId`) are preserved for migration packs.

## AI Orchestration Foundation (v1.1.0)

The orchestration layer coordinates AI work without replacing specialized queues:

| List | Role |
|------|------|
| AIWorkers | Registered agent/worker definitions |
| AIJobs | Job lifecycle (status, approval, cost) |
| AIJobSteps | Step-by-step execution trace |
| AIContext | Scoped context assembly per job |
| AIPrompts | Versioned prompt templates |
| AIToolRegistry | Allowed tools/connectors per worker |
| AIOutputs | Generated artifacts awaiting review |
| AIApprovals | Human approval queue |
| AIFeedback | Quality feedback loop |
| AIAuditLog | Immutable audit trail |
| AICostTracking | Token/cost attribution |

Existing `HVCG_AI_*` queues (DraftEmails, MeetingSummaries, etc.) remain for domain-specific routing and link to orchestration via `JobId`.

**Governance:** `docs/ai/AI_CONTEXT_POLICY.md`, `AI_GOVERNANCE.md`, `AI_APPROVAL_MATRIX.md`, `AI_SECURITY_MODEL.md`

**Hard rule:** `ExternalSendBlocked=true` — no autonomous external communications (email, Teams, portal messages).

## Backup, restore & monitoring (v1.1.0)

- **Backup:** `deployment/backup/Backup-HVCGOS.ps1` — config + list data exports
- **Restore:** `deployment/restore/Restore-HVCGOS.ps1` — additive default; destructive overwrite requires explicit confirmation
- **DR playbook:** `DISASTER_RECOVERY.md`
- **Operational health:** `deployment/health/Invoke-HVCGOSOperationalHealth.ps1`
- **Alerts:** `HVCG_OperationalAlerts` list
- **Dashboard spec:** `docs/reporting/SYSTEM_HEALTH_DASHBOARD.md`

## Unchanged technology decisions

- SharePoint Lists SOR (not Dataverse) for V1.x  
- Standard Power Automate connectors  
- Canvas Power Apps  
- Dev external sharing disabled  
- Premium products deferred (see LICENSING / SCALABILITY)

## Copilot readiness

Managed metadata-style fields: `CopilotKeywords`, `CopilotSummary` on key entities; content types and Knowledge library tagging documented in `docs/architecture/COPILOT_READY.md`.

## Reporting

Enterprise semantic model: `docs/architecture/POWERBI_ENTERPRISE_MODEL.md`.  
System Health Dashboard: `docs/reporting/SYSTEM_HEALTH_DASHBOARD.md`.
