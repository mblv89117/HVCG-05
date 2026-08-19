# Deployment Manager — Architecture

**App:** `apps/hvcg-deployment-manager/`  
**Stack:** React 19 · TypeScript · Vite · react-router-dom  
**Data:** `src/data/mockData.ts` only

## Structure

```
AppShell
├── role-filtered navigation
└── routes
    ├── Release Dashboard
    ├── Release Detail
    ├── Deployment Queue
    ├── Environment Promotion (mock)
    ├── Approval Workflow
    ├── Release Evidence
    ├── Rollback Dashboard
    ├── Environment Status
    ├── Deployment Calendar
    ├── Incident Dashboard
    └── Audit Trail

DeploymentProvider
├── role + allowed pages
└── mock DeploymentManagerData
```

## Boundaries

- Does not modify Revenue, Portal, ECC, Finance, Ops Hub, AI Governance, CRM schema, Activation Framework, Production, Track 1, or shared Atlas indexes.
- Cannot execute deployments. Promotion UI is display-only.
