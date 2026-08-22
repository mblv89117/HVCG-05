# Master PM Status Report — Executive Dashboard Product Track

**Date:** 2026-07-19  
**Author:** Master Project Manager  
**Scope:** Product development only (Runtime / ATLAS-R / Cloud Agents paused)

---

## Current repository state

| Area | State |
|------|--------|
| **Product SoR (Elite OS)** | `.worktrees/track10-elite-ui` · branch `cursor/master-pm/executive-dashboard-s14` |
| **Deployed Dev SWA** | https://zealous-rock-0090c7e1e.7.azurestaticapps.net — still older Sprint 11 build until redeploy |
| **Azure Production** | HVCG Production `ebc84d85-…` foundations complete (Sprint 11) |
| **Orchestration** | `.worktrees/sprint12-engineering-orchestration` — Sprint 13 stabilization + new Sprint 14 product backlog |
| **Dataverse Dev** | Model-driven Command Center live; Elite OS MSAL + adapters present |

**Critical gap:** Newest Executive Dashboard UI was ahead of git and ahead of SWA. This sprint commits product SoR and advances modules toward daily-usable release.

---

## Current working modules

- Elite OS shell (Fluent / design system, responsive nav, Entra MSAL)
- Executive Home (KPI cards pending-safe, alerts, AI brief UI, approvals via Dataverse when signed in)
- Clients + **HVCG** + **Colorado Craft Beef** workspaces (relationship facts; no invented dollars)
- Financials / Revenue / Capital / EV / Documents / AI routes (structured, pending-safe)
- Projects & Tasks (repository-derived portfolio + action center — this update)
- Administration → model-driven Dataverse app
- Parallel mocks (Client Portal, Ops Hub, Finance Ops, Revenue OS) exist as references — **not** competing frontends for this release

---

## Incomplete modules

- Live finance / pipeline dollars (blocked until verified sources)
- SharePoint document readiness binding
- Entra app-role RBAC (scaffold only; default Owner)
- App Insights in Elite OS
- Client Portal guest flows (owner-gated)
- Revenue OS / Ops / Finance **integration into Elite** (not separate daily apps)
- SWA redeploy of latest Elite OS

---

## Major defects

1. SWA served Sprint 11 sample-dollar dashboard while track10 had pending-safe UI  
2. Fake notification badge (`4`) — **fixed** to toast stack count  
3. Dataverse briefs ignored for AI panel — **fixed** to merge when present  
4. Projects/Tasks were empty scaffolds — **fixed** with repository-derived rows  
5. Global search did not navigate — **fixed**  
6. Mobile nav stayed open after navigate — **fixed**

---

## Architectural risks

- Dual UX stacks (Elite vs ECC mocks) — mitigate: **Elite OS only** for executive daily use  
- Fabricated finance — mitigate: pending labels + owner-verified CCB gate  
- Uncommitted Elite UI — mitigate: commit Sprint 14 branch now  
- CORS / signed-in SWA still a QA gate for live Dataverse

---

## Highest-value sprint priorities (Sprint 14 — Executive Dashboard Release)

1. **P0** Commit + redeploy Elite OS to Dev SWA (Manny’s daily URL)  
2. **P0** Owner UAT Home + HVCG + CCB workspaces  
3. **P1** Wire remaining Home panels to Dataverse where tables exist (alerts/initiatives)  
4. **P1** App Insights + CORS QA gate  
5. **P2** Deepen Financials/Revenue when verified connectors ready  
6. **P2** Client Portal / Ops / Finance only as adapters into Elite — no new shells

---

## Agent assignments

| Agent | Assignment |
|-------|------------|
| **elite-ui** | Sprint 14 Executive Dashboard product SoR; SWA redeploy |
| **qa-release** | UAT checklist; CORS+SWA gate; release approval |
| **azure-platform** | App Insights secret/config assist |
| **power-platform** | Dataverse table readiness for alerts/briefs/KPIs |
| **data-engineering** | `hvcg_atlas*` inventory map (ATLAS-T-1307) |
| **system-architect** | Block duplicate apps; Microsoft-native only |
| **security** | RBAC Entra app roles design review |
| **documentation** | Keep HOW_MANNY + deploy/rollback current |
| **ai-governance** | AI brief labeling / no hallucinated finance |

Paused: Runtime, Cloud Agents, ATLAS-R.

---

## Dependencies

CORS QA → signed-in Dataverse on SWA → Owner UAT → verified CCB financials before any dollar UI → Prod PP (later, owner-gated)

---

## Owner blockers

1. **Owner UAT** on Dev SWA after redeploy  
2. **Verified CCB financial package** before any client-facing dollars  
3. Prod Power Platform promotion — deferred  

---

## Target release scope (Definition of Done — this track)

Manny can daily use Dev SWA Executive Dashboard with: Home, KPI cards (pending or live), alerts, AI brief, Clients (HVCG+CCB), Projects, Tasks, Capital/EV/Financials/Revenue/Documents structures, Admin, responsive nav, role scaffold; QA approved; docs current; deploy/rollback; committed + tagged. Placeholders alone are **not** Done.
