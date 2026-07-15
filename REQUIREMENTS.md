# REQUIREMENTS — HVCG Project Management & Client Delivery System

## 1. Business Context

HVCG delivers capital advisory, fractional CFO, growth/ops consulting, and related services. The system is the internal operating backbone for delivery, not a public website and not a full accounting product.

## 2. Personas

| Persona | Goals | System needs |
|---------|-------|--------------|
| **Manny (Owner/Executive)** | Close deals, capital strategy, client relationships, exceptions | Executive view; decision queue; minimal noise |
| **Operations Manager** | Throughput, quality, SLA | Ops dashboard; onboarding; escalations |
| **Project Manager** | Delivery on time | Projects, tasks, docs, deliverables |
| **Financial Analyst / Capital Advisor** | Packages, models, underwriting quality | Docs, deliverables, approvals |
| **Operations Assistant** | Admin without complexity | Simple Power Apps forms; checklists |
| **Contractor / External Professional** | Limited scoped work | Least privilege; time-bound access |
| **Client Contact** (V1 indirect) | Provide docs, attend meetings | Email + secure links (no full app in V1) |

## 3. User Stories (V1 Priority)

1. As Ops, I can activate a client and have workspace, engagement, project, tasks, and document requests created automatically.
2. As PM, I can track tasks, blockers, and deliverables without opening raw SharePoint list settings.
3. As Analyst, I can see which client documents are missing and their status.
4. As Ops, I can send professional missing-document reminders without involving Manny.
5. As Manny, I only see decisions/escalations that meet executive rules.
6. As Admin, I can grant contractor access to one client folder set without exposing others.
7. As PM, I can create a project from a service template with phases and tasks pre-populated.
8. As Ops, I can record retainer/setup/success-fee operational milestones and past-due status.
9. As any internal user, I can log a meeting with decisions and action items.
10. As Admin, I can deploy the system from this repository using documented scripts.

## 4. Functional Requirements

### FR-CMD Command Center
- FR-CMD-01 Ops dashboard: active clients/projects, health, deadlines, overdue, missing docs, meetings, approvals, stalled, financial milestones, workload, risks.
- FR-CMD-02 Executive dashboard: decision queue, HV opportunities, risks, capital txns, revenue at risk, past-due, proposals, capacity, exceptions.

### FR-CLI Client Master
- FR-CLI-01 Single client record with legal name, DBA, contacts, industry, stage, owners, fees, capital fields, links to SP/Teams, related collections.
- FR-CLI-02 Stage model: Lead → Prospect → Assessment → Proposal → Active Client → On Hold → Alumni → Do Not Engage.

### FR-ENG Engagements & Projects
- FR-ENG-01 Multiple engagements/projects per client.
- FR-ENG-02 Template-based project creation with phases, milestones, tasks, doc requests, deliverables.
- FR-ENG-03 Task fields: owner, reviewer, approver, dates, priority, %, blockers, effort, evidence.

### FR-DOC Documents
- FR-DOC-01 Standard 00–23 client folder structure auto-created.
- FR-DOC-02 Document request register with status, reminders, escalation.
- FR-DOC-03 Versioning on; external sharing only via approved process.

### FR-COM Meetings & Comms
- FR-COM-01 Meeting log + template; follow-up tasks; no auto-send of substantive client email without approval flag.

### FR-REG Registers
- FR-REG-01 Decisions, Risks, Issues, Change Requests, Assumptions, Dependencies — related to client/engagement/project.

### FR-DEL Deliverables & Approvals
- FR-DEL-01 Deliverable tracking with draft/final dates, review/approve, evidence.

### FR-FIN Financial Milestones (operational)
- FR-FIN-01 Track fees, retainers, success fees, renewals, past-due, pipeline — not full GL.
- FR-FIN-02 Alerts for upcoming/past-due/renewal/success-fee/budget.

### FR-SEC Security
- FR-SEC-01 RBAC via Entra groups; client isolation; least privilege; audit logging.

### FR-AUT Automation
- FR-AUT-01 Onboarding, reminders, escalations, renewals, weekly digests, executive thresholds — idempotent, logged, recoverable.

### FR-RPT Reporting
- FR-RPT-01 Executive, Operations specs; Client-safe view deferred to V2 portal (email snapshot optional).

## 5. Nonfunctional Requirements

| ID | Requirement |
|----|-------------|
| NFR-01 | Usable by Ops Assistant after ≤2 hours training |
| NFR-02 | Mobile-responsive Power Apps layouts |
| NFR-03 | Deployable via repeatable scripts |
| NFR-04 | No secrets in source control |
| NFR-05 | Automations have error handling + logging list |
| NFR-06 | Support ≥50 active clients without redesign (Lists) |
| NFR-07 | Auditability of key create/update/approve actions |
| NFR-08 | Environment separation: Dev → Prod |

## 6. System Boundaries

**In scope:** Operational PM, document collection, delivery tracking, exec escalation, operational finance milestones.  
**Out of scope V1:** Accounting/ERP, payroll, CRM marketing automation platforms, autonomous legal/lending advice, public portals.

## 7. MVP / V1 Success Criteria

See brief §17 Definition of Version 1 Complete. Summary: deployable data model, onboard client, template projects, tasks, docs, deliverables, registers, escalations, financial milestones, permissions, packaged automations, usable UI, tests, deployment docs, sample data, known limits + backlog.

## 8. Future-State Backlog (V2+)

- Power Pages client portal
- Dataverse if volume/relationships exceed Lists comfort
- Copilot Studio process Q&A + draft SOPs (human approve)
- QuickBooks / banking payment status sync
- Per-client site collections for heightened isolation
- AI package consistency review (human-in-loop)

## 9. Licensing Considerations

Documented in `docs/licensing/LICENSING.md`. V1 preference: standard SharePoint/Lists/Power Automate/Power Apps for M365; defer premium.
