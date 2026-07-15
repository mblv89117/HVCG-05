# IMPLEMENTATION PLAN

## Guiding Principles

1. Ship a secure, deployable V1 core before advanced AI or premium platforms.
2. Prefer Microsoft-native low-code; custom Graph/PnP only for provisioning and gaps.
3. Continue phases automatically; batch owner actions.
4. Security and client isolation first.

## Phase Overview

| Phase | Name | Deliverables | Status |
|-------|------|--------------|--------|
| 0 | Repository assessment | Assessment doc | Done |
| 1 | Discovery & planning | Requirements, assumptions, personas, MVP | Done |
| 2 | Architecture | ARCHITECTURE, security, licensing decisions | Done |
| 3 | Data foundation | List schemas, libraries, PnP scripts, sample data | In progress |
| 4 | Project templates | 18 templates + seed JSON | Pending |
| 5 | Automation | 10 priority flows + catalog | Pending |
| 6 | Application | Power Apps specs + formulas + screen map | Pending |
| 7 | Reporting | Power BI specs / Excel fallback | Pending |
| 8 | Testing | Plans, cases, results templates | Pending |
| 9 | Deployment prep | Scripts, checklists, rollback | Pending |
| 10 | Handoff | Admin/User guides, backlog, changelog | Pending |

## Detailed Work Packages

### WP-3 Data Foundation
- Site architecture JSON
- List definitions for all V1 entities
- Client document library template (00–23)
- Content types + indexed columns
- Views for Command Center queries
- Entra group + SP permission scripts
- Sample clients/projects/tasks

### WP-4 Templates
- One JSON schema for templates
- 18 project template seed files
- Document-request checklists per service
- Deliverable + meeting templates

### WP-5 Automations
1. HVCG_ClientOnboarding  
2. HVCG_CreateProjectFromTemplate  
3. HVCG_CreateClientWorkspace  
4. HVCG_CreateDocumentRequests  
5. HVCG_MissingDocumentReminders  
6. HVCG_OverdueTaskEscalation  
7. HVCG_DeliverableApproval  
8. HVCG_RenewalReminders  
9. HVCG_ExecutiveDecisionEscalation  
10. HVCG_WeeklyStatusSummary  

### WP-6 App
- Navigation: Home Ops | Executive | Clients | Projects | Tasks | Docs | Deliverables | Meetings | Registers | Finance
- Role-based start screen
- Quick create patterns

### WP-7 Reporting
- Dataset mapping from Lists
- DAX measures for health, overdue, pipeline
- Page wireframes

### WP-8–10
- Test suites mapped to FR IDs
- Deploy to Dev then Prod checklist
- Training outline (≤2h ops, ≤30m executive)

## Sequencing Rule

Do not wait for tenant admin to finish documentation, schemas, scripts, templates, flow definitions, app specs, or tests. Only live provisioning and connector consent require owner actions.

## Effort Orientation (order of magnitude)

| Work | Relative effort |
|------|-----------------|
| Data + templates | High |
| Automations definitions | High |
| Power Apps | Medium–High |
| Reporting specs | Medium |
| Docs / security / deploy | Medium |
| Live tenant configure | Owner + agent assist |

## Exit Criteria per Phase

Each phase updates `PROJECT_STATUS.md`, `CHANGELOG.md`, `BACKLOG.md`, and leaves a single **next executable task**.
