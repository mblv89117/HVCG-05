# Operations Hub Sprint 1 — Architecture

**Status:** **PHASE 1 COMPLETE** (mock data); commit/push approved  
**App:** `apps/hvcg-operations-hub/`  
**Runtime:** React 19 + TypeScript + Vite 7  
**Design language:** Cloned from Executive Command Center Sprint 1 (forest/sage/gold tokens) — ECC sources not modified  
**Scope:** Internal operations delivery workspace only

## Architecture summary

```text
AppShell
├── role-filtered navigation
├── tenant / mock refresh context
└── route outlet
    ├── Operations Dashboard
    ├── Team Dashboard
    ├── Project Dashboard
    ├── SOP Library
    ├── AI Workforce
    ├── Human Workforce
    └── Notifications Center

OpsProvider
├── current role
├── allowed modules
├── SOP search / category / favorites filters
├── notification visibility / read state
└── OperationsData adapter
    └── mockData (Sprint 1 only)
```

## Modules (Phase 1)

| Module | Route | Responsibility |
|--------|-------|----------------|
| Operations | `/` | Due/waiting tasks, blockers, meetings, follow-ups, approvals, releases, doc health |
| Team | `/team` | Members, roles, availability, workload vs capacity |
| Projects | `/projects` | Client + internal boards with status, priority, progress, owner |
| SOP Library | `/sop` | Search, categories, favorites, approval, version history (mock) |
| AI Workforce | `/ai` | Master PM, Revenue, Portal, ECC, Finance, Deployment, QA, Documentation |
| Human Workforce | `/human` | Employees, contractors, advisors, assignments, capacity, skills |
| Notifications | `/notifications` | QA, release, client docs, proposal, sprint complete, deployment pending |

## Reusable UI primitives

| Primitive | Responsibility |
|-----------|----------------|
| `MetricCard` | Label, value, detail, trend, tone |
| `Section` | Panel with title/subtitle/action |
| `StatusPill` | Status vocabulary |
| `ProgressBar` | Workload / project progress |
| `Icon` | Dependency-free SVG set |
| Table / card / list patterns | Roster and board rendering |

## Data contract

`OperationsData` is the dashboard-facing contract. Pages consume normalized mock records only. Future adapters can bind live ops, HR, or agent-bus feeds without changing page components.

```text
OpsTaskAdapter ─┐
TeamAdapter     ─┤
ProjectAdapter  ─┼─> OperationsData ─> modules
SopAdapter      ─┤
AgentBusAdapter ─┤
NotifyAdapter   ─┘
```

No Revenue, Portal, ECC, Finance, CRM, Activation, or Track 1 source trees were modified.

## Role model

| Role | Default access |
|------|----------------|
| Owner | All modules |
| Operations | All modules |
| PM | Operations, Team, Projects, SOP, AI, Notifications |
| Finance | Operations, Projects, SOP, Notifications |
| Advisor | Operations, Projects, SOP, Notifications |
| Assistant | Operations, Team, SOP, Notifications |

Routes are protected and hidden from navigation. Notifications filter by `allowedRoles`. Role switching is a QA control, not authentication.

## Runtime ports

| Mode | Port |
|------|------|
| Dev | `5176` |
| Preview / Playwright | `4176` |

## Isolation boundaries

- Worktree: `.worktrees/operations-hub-sprint1`
- Branch: `cursor/operations-hub-sprint1`
- Base: ECC Sprint 1 tip `5bb42c2`
- Locked shared indexes untouched
- Legacy `cursor/operations-hub` is not used for this sprint

## QA package

- Unit: Vitest + Testing Library (`npm run test`)
- Browser: Playwright (`npm run qa`) → `PROJECT_ATLAS/QA/OperationsHubSprint1/`
- Full gate: `npm run qa:all`
