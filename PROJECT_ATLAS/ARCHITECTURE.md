# ARCHITECTURE

**As of:** 2026-07-16 04:20 UTC (index note added 2026-08-17)  
**Role:** Atlas **index only** — not a second architecture SoR.

**Atlas Capital Operations (2026-08-17):** an **internal Project Atlas / HVCG OS module**, not an eighth HVCG platform. SharePoint `HVCG_*` remains V1 SoR. Do not migrate capital to Dataverse. Module docs: [docs/CAPITAL_OPERATIONS_ARCHITECTURE.md](../docs/CAPITAL_OPERATIONS_ARCHITECTURE.md) · [docs/CAPITAL_OPERATIONS_DISCOVERY.md](../docs/CAPITAL_OPERATIONS_DISCOVERY.md). Seven-system index: [docs/architecture/HVCG_SYSTEM_INDEX.md](../docs/architecture/HVCG_SYSTEM_INDEX.md).

## Canonical architecture sources (outside Atlas)

| Priority | Location |
|----------|----------|
| 1 | Repo / worktree root `ARCHITECTURE.md` and `docs/architecture/` |
| 2 | `docs/data-model/` (ERD, dictionary) |
| 3 | Freeze packages: `releases/RC-1-Development-Baseline/`, `.worktrees/deployment-engineer/releases/Track-1-Live-Internal/` |

Do **not** copy full architecture prose into Atlas. Link out. Future dated notes/diagrams may live in [Architecture/](Architecture/) only as pointers or ADRs that cite evidence.

## Platform shape (summary — repository-backed)

```
Clients / Staff
    → Power Apps (canvas — not published Prod) + SharePoint lists
    → Power Automate flows (Prod: 1 Activated LeadQualified; others Draft)
    → Dataverse solutions (HVCGCommandCenterDev lineage)
    → SharePoint: Command Center / Clients / Knowledge sites (Dev + Prod URLs in deployment settings)
Website staging (static HTML + EVA app JS)
    → intended Forms/HTTP → HVCG_EvaFormCreateLead → Leads (Dev proven; Prod gated)
```

## Key solution facts (from freeze packages)

| Item | Value | Source |
|------|-------|--------|
| Solution | HVCGCommandCenterDev | RC-1 `version.json` |
| Dev proven version | 1.1.0.1 | RC-1 |
| Prod | Track 1 Live — Internal managed import | Track-1-Live-Internal README |

## Connection references (4)

SharePoint Online · Office 365 Outlook · Teams · Approvals — see `releases/RC-1-Development-Baseline/docs/CONNECTION_REFERENCES.md` and Prod binding evidence under `.worktrees/deployment-engineer/deployment/release-ops/`.

## Notification policy

- `hvcg_CrmEnableTeamsNotify=false`  
- `hvcg_EnableClientEmails=false`  

## Revenue OS front door

EVA multi-step app under staging `assessments/eva/` (Sprint 2–3; SoR `.worktrees/revenue-sprint3/...` until commit) with CRM payload schema v1 and conversion engine (Sprint 3).
