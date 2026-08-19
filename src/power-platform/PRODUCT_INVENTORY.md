# Power Platform — Product Inventory & Release Status

**Environment:** HVCG Development (`https://org1131a2b0.crm.dynamics.com`)  
**Audience:** Elite UI · Architecture · Data Engineering · Automation · Security · QA  
**Date:** 2026-07-20  
**SoR decision:** Elite OS SPA = Executive Dashboard UX · Model-driven Atlas Command Center = admin SoR · Canvas specs deferred (no `.msapp`)

---

## 1. Solution inventory (live Dev)

| Unique name | Friendly name | Version | Managed | Role |
|---|---|---|---|---|
| `HVCGProjectAtlasCommandCenterDEV` | HVCG Project Atlas Command Center (DEV) | 1.0.0.0 | No | Dataverse `hvcg_atlas*` + model-driven admin |
| `HVCGCommandCenterDev` | HVCG Command Center DEV | 1.1.0.1 | No | SharePoint-backed flows + env vars |
| `HVCGOS` / `HVCGOS_managed` | Packaging scaffolds | 1.1.0.0 | Manifest only | Future managed promotion artifact |

### Model-driven apps

| App | App ID | Status |
|---|---|---|
| **Atlas Command Center** | `dea8a490-4b82-f111-ab0e-6045bd0193e8` | Published — admin backend |
| Project Atlas Command Center | `60d2602c-…` | Saved — not published (superseded naming) |

### Canvas Power Apps

| Item | Status |
|---|---|
| Specs under `src/power-apps/` | Present (screens, formulas, CRM layouts) |
| Published `.msapp` | **0** — do not rebuild this sprint |

---

## 2. Data planes (do not duplicate)

| Plane | Purpose | Consumers |
|---|---|---|
| **Dataverse `hvcg_atlas*`** | Atlas ops: approvals, briefs, revenue KPIs, tracks, risks, sprints, releases | Elite OS MSAL adapters · model-driven admin |
| **SharePoint `HVCG_*` lists (82)** | Command Center delivery: clients, projects, tasks, capital, CRM, docs, AI queues | Power Automate · future list-bound admin · not Elite KPI dollars |
| **Elite OS workspace catalog** | HVCG + Colorado Craft Beef relationship facts | `apps/atlas-elite-os` (track10 worktree) |

Living map: `DATAVERSE_ATLAS_INVENTORY.json` · SharePoint schemas: `src/sharepoint/lists/`

---

## 3. Completed / reusable components

| Component | Maturity | Notes |
|---|---|---|
| Atlas Dataverse tables (Dev) | **Live** | Row counts: approvals 5, briefs 1, revenue KPIs 6, risks 4, agents 6, blockers 3, sprints 6, releases 4 |
| Elite OS Dataverse adapters | **Reusable** | Approvals / KPIs / briefs read + Dev-only approval PATCH |
| SharePoint list schemas (82) | **Reusable** | Provision via deploy scripts; productVersion 1.1.0 |
| Connection references catalog | **Reusable** | SharePoint, Outlook, Teams, Approvals |
| Env var catalog | **Reusable** | Site URLs + Teams gates (Teams IDs empty until UAT) |
| CRM notify flows (×4) | **Near-ready** | Definitions real; Teams gate **Off**; some Compose stubs |
| ClientOnboarding | **Partial** | Engagement create works; child workspace/project Compose stubs |
| Core delivery flows (×10) | **Scaffold** | Build sheets exist; definitions Log→Compose only |
| Canvas app | **Spec only** | Deferred — Elite OS is UX SoR |

---

## 4. Broken / incomplete (product impact)

| Gap | Impact | Priority modules |
|---|---|---|
| Scaffold flows for workspace, docs, tasks, approvals, health | No automated onboarding / doc readiness / escalations | Clients · Projects · Documents · Tasks · Approvals |
| Trigger mismatch (`DeliverableApproval`, `ExecutiveDecisionEscalation` sheets vs manual defs) | Maker import would not match design | Approvals · Administration |
| CRM flows not in solution `Workflows/` | Incomplete packaging | Capital · Notifications |
| Empty Teams channel IDs + notify Off | No Teams access until Dev UAT | Teams · Notifications |
| `REQUIRED` Exec/Ops emails | Flows cannot email until set | Notifications · Administration |
| No CCB/HVCG SharePoint client seeds (pre-fix) | Workspace UX relied on SPA-only catalog | HVCG · CCB workspaces |
| Dual-store risk (SP Clients vs future Dataverse clients) | Needs Architecture ADR before expanding Dataverse CRM | Architecture |

---

## 5. Connection references

| Logical name | Connector | Status |
|---|---|---|
| `hvcg_sharedsharepointonline` | SharePoint | Connected (Manny Dev) |
| `hvcg_sharedoffice365` | Outlook | Connected |
| `hvcg_sharedteams` | Teams | Connected |
| `hvcg_sharedapprovals` | Approvals | Connected — **not wired in most defs** |

Source: `connection-references/HVCG_ConnectionReferences.json`

---

## 6. Environment variables

| Schema name | Default | Gap |
|---|---|---|
| `hvcg_CommandCenterSiteUrl` | Dev Command Center site | OK |
| `hvcg_ClientsSiteUrl` | Dev Clients hub | OK |
| `hvcg_KnowledgeSiteUrl` | Dev Knowledge | Unused by current defs |
| `hvcg_ExecutiveEmail` | `REQUIRED` | Must set for Digests/escalations |
| `hvcg_OpsEmail` | `REQUIRED` | Must set |
| `hvcg_EnableClientEmails` | `false` | Keep Off |
| `hvcg_CrmEnableTeamsNotify` | `false` | Keep Off until test channels |
| `hvcg_TeamsCrm*` / `hvcg_TeamsCapital*` | empty | Populate for Teams UAT |
| `hvcg_CrmTestRecipient` | placeholder | Owner UPN only |
| `hvcg_ProductVersion` | `1.1.0` | Missing from solution EnvVar XML |
| `hvcg_ExecEnableEmailDigest` | `false` (added) | Executive weekly brief gate |

---

## 7. Delegation / performance review

| Surface | Finding |
|---|---|
| Elite OS Dataverse queries | `$top=5–20` + `$select` — delegated; OK for dashboard |
| SharePoint canvas formulas (if rebuilt) | Would need Filter/LookUp discipline — **N/A this release** |
| Flow foreach create-doc | Cap batch size; use idempotency keys (`HVCG_IdempotencyKey`) |
| Model-driven views | Prefer indexed columns on Atlas tables for admin grids |

---

## 8. Known limitations

1. Production Power Platform promotion is **owner-gated** — Dev only for agent work.
2. Canvas Command Center is **not** the Executive Dashboard.
3. Most automation definitions are scaffolds — build sheets are the design SoR until replaced.
4. Colorado Craft Beef financials must stay **pending** until verified source (no invented dollars).
5. Teams notifies remain Off until channel IDs + Security review.

---

## 9. Production verification (blocked)

| Check | Dev | Prod |
|---|---|---|
| Model-driven admin opens | Yes | Owner gate |
| Elite OS → Dataverse CORS | Verified | N/A / gate |
| Flow smoke (CRM package) | Prior PASS; Teams Off | Not started |
| Managed solution import | Artifact pattern only | Owner gate |

---

## 10. Immediate Power Platform build backlog

1. Seed HVCG + CCB SharePoint client/workspace records (pending-safe) — **this package**
2. Implement `CreateDocumentRequests` + `DeliverableApproval` real definitions — **this package**
3. Finish `ClientOnboarding` child calls (workspace → project → docs)
4. Implement `OverdueTaskEscalation` + `MissingDocumentReminders`
5. Package CRM four flows into solution Workflows
6. Populate Dev Teams test channel IDs (Owner/Security)
7. Architecture ADR: SharePoint Command Center vs Dataverse Atlas boundaries
8. Model-driven sitemap links to Elite OS SWA + CCB/HVCG views
