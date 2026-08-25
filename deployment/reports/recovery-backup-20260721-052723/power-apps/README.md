# HVCG_ProjectCommandCenter — Power Apps Specification

**Type:** Canvas app (Power Apps for Microsoft 365)  
**Data:** SharePoint Lists on HVCG-CommandCenter  
**Audience:** Internal staff (role-based)

## Design Principles

- Plain business language (no SharePoint jargon in labels)
- Mobile-responsive (phone form factors for tasks & approvals)
- Ops Assistant can run daily work after ≤2h training
- Executive Home shows **attention items only**
- Sensitive finance fields visible only to Owner / Admin / Ops Manager

## Navigation

| Screen | Name | Purpose |
|--------|------|---------|
| scrHomeOps | Operations Home | Delivery command center |
| scrHomeExec | Executive / CEO Home | Firm OS dashboard |
| scrCRM | CRM Pipeline | Dashboard KPIs, leads, stage board/list, next-action, timeline preview |
| scrOpportunityDetail | Opportunity Detail | Deal workspace: timeline, proposals, capital bridge, Copilot, next-action |
| scrCapital | Capital Desk | Raises, lenders, investors |
| scrOpsHub | Operations Hub | SOPs, vendors, training |
| scrClients | Clients | Client master |
| scrClientDetail | Client Detail | Timeline + related |
| scrProjects | Projects | Project list + health |
| scrProjectDetail | Project Overview | Tasks, docs, deliverables |
| scrMyTasks | My Tasks | Owner = current user |
| scrDocRequests | Document Requests | Missing docs |
| scrDeliverables | Deliverables | Review/approve |
| scrMeetings | Meetings | Log & view |
| scrRegisters | Registers | Decisions/Risks/Issues/Changes |
| scrFinance | Financial Ops | Invoices, milestones, budgets |
| scrAIQueues | AI Work Queues | Human review of AI outputs |
| scrQuickCreate | Quick Create | Client, Task, Meeting, Decision, Lead, Capital Opp |

## Role-based start screen

```
If(
  User().Email in HVCG_OwnerEmails || LookUp(HVCG_TeamMembers, Email=User().Email).PrimaryRole = "Owner",
  Navigate(scrHomeExec),
  Navigate(scrHomeOps)
)
```

## Operations Home tiles (counts)

- Overdue tasks  
- Missing critical documents  
- Deliverables awaiting review  
- Onboarding in progress (projects with template general-client-onboarding not complete)  
- Upcoming meetings (7 days)  
- Past-due financial milestones  
- Blocked tasks  
- Stalled projects (no task activity 14 days — field/Flow maintained later)

## Executive Home

Gallery filtered `RequiresExecutiveAttention = true` across Decisions, Clients, Projects, Issues, ChangeRequests (union collection on start).

Columns: Client, Item, Reason, Deadline, Link.

## Client Detail sections

1. Header: name, stage, health, owners  
2. Snapshot cards: open tasks, missing docs, next meeting, retainer status  
3. Tabs: Projects | Documents | Deliverables | Meetings | Registers | Timeline  
4. Timeline = merge of Communications + Meetings + stage changes (AuditEvents)

## Quick Create patterns

- **New Client:** patch HVCG_Clients; optional “Activate & Onboard” toggle sets stage Active Client (triggers flow)  
- **New Task:** defaults Project from context  
- **Log Meeting:** uses meeting template fields; on save optionally create tasks from action lines  
- **Decision for Manny:** sets RequiresExecutiveAttention=true

## Filters & saved views

Use collections + Filter. Predefined: My work, Critical overdue, Yellow/Red health, Renewals 60 days.

## Accessibility

- Tab index on forms  
- Color not sole indicator (health text + icon)  
- Contrast AA  

## Opportunity CRM module

- Screen specs: `screens/scrCRM.md`, `screens/scrOpportunityDetail.md`
- Desktop/phone layout notes: `crm/layout-desktop.md`, `crm/layout-phone.md`
- Maker rebuild steps: `docs/crm/POWER_APPS_BUILD_GUIDE.md`
- Domain / flows: `docs/crm/OPPORTUNITY_MANAGEMENT.md`

Nav: global **CRM** → `scrCRM`; board/list **Open** → `scrOpportunityDetail` (`varSelectedOpportunity`). Capital badge → `scrCapital` when `CapitalOpportunityId` is set.

## Formula modules

See `src/power-apps/formulas/` for reusable named formulas to paste into App.Formulas (Power Fx). CRM block includes `nfVisiblePipeline`, `nfCanEditCRM`, `nfOverdueNextActions`, stage/handoff colors.

## Build instructions (tenant)

1. Create blank canvas app `HVCG_ProjectCommandCenter`  
2. Add SharePoint connections to all HVCG_* lists  
3. Rebuild screens per this map (or import when `.msapp` available)  
4. Share app with Entra role groups  

Binary `.msapp` cannot be authored in this repo environment; formulas + screen map are the source of truth for rebuild.
