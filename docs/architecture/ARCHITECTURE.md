# ARCHITECTURE — HVCG OS (Version 1.5 / Pre-Deploy)

## Product identity

**HVCG OS** is the operating system for High Value Capital Group LLC — not only project management. It covers CRM, capital advisory, delivery, finance operations, knowledge, executive command, and AI-ready queues on Microsoft 365.

Naming prefix remains `HVCG_`. App name: **HVCG OS Command Center**.

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
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        Operations Hub      AI Work Queues     Portal Prep (V2)
        Knowledge/SOPs      (human-approved)   (entities ready)
```

## Domains & systems of record

| Domain | Primary lists | Notes |
|--------|---------------|-------|
| CRM | Leads, ReferralPartners, Referrals, DiscoveryCalls, Opportunities, Proposals, WinLossAnalyses, Clients, Contacts | Pipeline & CLV on Client/Opportunity |
| Capital | CapitalOpportunities, CapitalSources, Lenders, Investors, FundingMilestones, Lender/Investor Outreach | Document requests can bind to capital deals |
| Delivery | Engagements, Projects, Tasks, Deliverables, Meetings, Registers | Existing V1 core retained |
| Finance Ops | Invoices, FinancialMilestones, CollectionsActivities, Budgets, ExpenseApprovals, RevenueForecastLines | Not a GL; links to accounting IDs |
| Operations Hub | SOPs, Templates, Policies, Vendors, SoftwareInventory, Subscriptions, RecurringExpenses, InternalProjects, MeetingPlaybooks, SalesScripts, TrainingCatalog | Knowledge Center files |
| AI Ready | 10 dedicated AI_* queues | HumanApprovalRequired default true |
| Portal V2 prep | PortalAccess, PortalMessages, PortalDeliverableLinks + PortalVisible flags | No Power Pages in V1 |
| Platform | AutomationLogs, Notifications, AuditEvents, TeamMembers, TimeEntries | Operability |

## Count

**67** SharePoint lists (extended from 27). Provisioning remains idempotent via `Deploy-HVCGDevelopment.ps1`.

## Unchanged technology decisions

- SharePoint Lists SOR (not Dataverse) for V1.5  
- Standard Power Automate connectors  
- Canvas Power Apps  
- Dev external sharing disabled  
- Premium products deferred (see LICENSING / SCALABILITY)

## Copilot readiness

Managed metadata-style fields: `CopilotKeywords`, `CopilotSummary` on key entities; content types and Knowledge library tagging documented in `docs/architecture/COPILOT_READY.md`.

## Reporting

Enterprise semantic model: `docs/architecture/POWERBI_ENTERPRISE_MODEL.md`.
