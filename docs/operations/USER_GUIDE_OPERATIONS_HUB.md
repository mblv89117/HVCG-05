# Operations Hub — User Guide

Operational command center for projects, tasks, approvals, risks, issues, decisions, milestones, and recurring work.

## Where to work

| Surface | Path | Purpose |
| --- | --- | --- |
| **Portfolio** (canonical) | `/portfolio` | Views, create project, work queue, approvals |
| **Project detail** | `/portfolio/:id` | Milestones, tasks, risks, issues, decisions, comments, documents, activity |
| **Executive (Ops Hub)** | `/executive` | Leadership metrics + portfolio escalations |
| **Executive Command Center** | ECC → Operations | Mirrored executive portfolio + escalations |
| Legacy Projects | `/projects` | Read-only style board; links to Portfolio |

## Portfolio views

Executive Portfolio · My Work · My Projects · At Risk · Blocked · Overdue · Awaiting Approval · Recently Updated · Completed · Archived

Use the search box to filter projects and tasks. Metrics strip shows active, at-risk, blocked, overdue, and pending approvals.

## Status vocabulary

Not Started · In Progress · On Track · At Risk · Blocked · Awaiting Approval · Completed · Archived

Health (Green / Yellow / Red) is derived from status, blockers, and overdue due dates.

## Common actions

| Action | Where |
| --- | --- |
| Create project | Portfolio → **New project** |
| Update project status / next action | Project detail → Ownership & status |
| Create milestone / task | Project detail toolbars |
| Assign / reassign / priority | Task row controls |
| Mark complete | **Complete** on task |
| Record blocker / log risk / log issue | Project detail actions |
| Request / approve / reject | Portfolio approval queue or project detail |
| Record decision / comment / attach document | Project detail sections |

## Roles

Role selector (Admin, Manager, Finance, Advisor, Assistant) gates modules. **Assistant** can access Portfolio and operations modules; Hiring remains restricted.

## Product rules (how the UI behaves)

- Next action is shown on every project and task row.
- Ownership is always visible (owner / assignee).
- Overdue and blocked work escalate into At Risk / Blocked / Overdue views and Executive escalations.
- Activity history is append-only on each project.
- Do not create a second task system — use Portfolio / project detail only.

## Integrations (approved direction)

Notifications module surfaces in-app alerts. Outlook, Teams, and Automation hooks are interface-ready; production wiring follows Dataverse / orchestration approval (see `docs/operations/IFACE_DATAVERSE_ORCHESTRATION.md`).

## Local run

```bash
cd apps/hvcg-operations-hub
npm install
npm run dev          # http://127.0.0.1:5176
npm run qa:all       # build + unit + Playwright offline QA
```
