# Executive Command Center Sprint 1 — Architecture

**Status:** **COMPLETE** with mock data; commit/push approved  
**App:** `apps/hvcg-executive-command-center/`  
**Runtime:** React 19 + TypeScript + Vite  
**Scope:** Internal leadership dashboard only

## Architecture summary

```text
AppShell
├── role-filtered navigation
├── tenant / refresh context
└── route outlet
    ├── Today's Overview
    ├── Revenue
    ├── Clients
    ├── Operations
    ├── Financial
    ├── AI Intelligence
    └── Notifications

DashboardProvider
├── current role
├── allowed dashboards
├── notification visibility / read state
└── CommandCenterData adapter
    └── mockData (Sprint 1 only)
```

## Reusable widget system

| Primitive | Responsibility |
|-----------|----------------|
| `MetricCard` | Label, value, detail, trend, tone, role visibility |
| `Section` | Consistent dashboard panel with title, subtitle, action |
| `BarChart` | Stage/source/category comparisons |
| `LineChart` | Forecast and monthly trend visualization |
| `NotificationList` | Unified cross-domain alert rendering and read state |
| `Progress` | Funding, confidence, and completion indicators |
| `Badge` | Health, risk, stage, and status vocabulary |
| `Icon` | Dependency-free internal SVG icon set |
| Activity feed patterns | Cross-system event chronology |
| Table patterns | Opportunities and future register views |

## Data contract

`CommandCenterData` is the dashboard-facing contract. Pages consume normalized data, not subsystem-specific records. Sprint 1 binds that contract to `mockData`.

Future adapters can implement the same contract:

```text
RevenueAdapter ─┐
PortalAdapter  ─┤
FinanceAdapter ─┼─> CommandCenterData ─> widgets
CRMAdapter     ─┤
OpsAdapter     ─┤
AIAdapter      ─┘
```

This isolates dashboards from Revenue, Portal, Finance, CRM, and Operations implementation details. No source subsystem was modified.

## Role model

| Role | Default access |
|------|----------------|
| Owner | All dashboards and notifications |
| Executive | All dashboards and notifications |
| Advisor | Overview, Revenue, Clients, AI, Notifications |
| Operations | Overview, Clients, Operations, AI, Notifications |
| Finance | Overview, Revenue, Financial, AI, Notifications |
| Assistant | Overview, Clients, Operations, Notifications |

Routes are protected as well as hidden from navigation. Notifications are filtered by allowed role. Sprint 1 role switching is a QA control, not authentication.

## Future multi-tenant boundary

The data contract includes `tenantId` and `tenantName`. A production adapter must:

1. resolve tenant from trusted identity claims;
2. apply tenant filters before aggregation;
3. enforce row-level authorization server-side;
4. keep notification read state tenant-scoped;
5. prevent client or tenant identifiers from leaking into global caches.

No multi-tenant backend is implemented in Sprint 1.

## Performance posture

- No charting or icon dependencies
- SVG charts render from normalized arrays
- Production bundle: approximately 272 KB JS / 23 KB CSS before gzip
- Local Playwright load check: 7 ms
- Mobile layout avoids horizontal overflow at 390×844

## Integration guardrails

- Mock-only data source
- No network calls in dashboard code
- No Revenue, Portal, Activation Framework, CRM schema, Track 1, or Production imports
- No DNS, email, or SMS behavior
- RC-1 remains locked
