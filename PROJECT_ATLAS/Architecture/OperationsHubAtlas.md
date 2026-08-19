# Operations Hub Atlas — Architecture

**Status:** **READY FOR QA** · mock / development only  
**App:** `apps/hvcg-operations-hub/`  
**Runtime:** React 19 + TypeScript + Vite 7  
**Scope:** Full internal Operations Hub module set from Project Atlas mission

## Architecture summary

```text
AppShell (grouped nav)
├── Command: Executive · Operations · Scorecards · Weekly · Quarterly · KPIs
├── People & process: Meetings · SOP · HR · Hiring · Training · Team · Human
├── Delivery & assets: Projects · Vendors · Assets · AI
└── Systems: Notifications · Calendar Arch · Documentation

OpsProvider
├── role + allowedModules
├── SOP filters
├── notification read state
└── OperationsData (mockData only)
```

## Calendar integration architecture (design-only)

No live Microsoft Graph, Google Calendar, or MeetSync connections.

| Layer | Decision | Status |
|-------|----------|--------|
| Identity | Tenant claims only | Designed |
| Adapter | `CalendarAdapter` → Meeting Center + Notifications | Designed |
| Sync policy | Read-only pull first; write-back gated | Planned |
| Privacy | Role-filtered meeting visibility | Designed |
| Provider | MeetSync deferred | Deferred |

## Data contract

`OperationsData` extended with scorecards, weekly reviews, quarterly plans, company KPIs, HR, hiring, training, vendors, assets, documentation, and calendar architecture notes. Pages consume mock records only.

## Role model (summary)

| Role | Access pattern |
|------|----------------|
| Owner / Operations | All modules |
| PM | Command + delivery subset (no HR/hiring/vendors/assets/quarterly) |
| Finance | Executive, ops, KPIs, vendors, assets, docs, projects, SOP, notifications |
| Advisor | Executive, ops, weekly, quarterly, KPIs, meetings, notifications, docs |
| Assistant | Ops, meetings, SOP, training, notifications, docs, team |

## Isolation

- Branch: `cursor/operations-hub-sprint1`
- No production integrations
- Protected subsystems untouched
