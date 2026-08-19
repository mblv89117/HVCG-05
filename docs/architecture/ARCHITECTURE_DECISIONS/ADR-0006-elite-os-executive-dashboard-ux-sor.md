# ADR-0006 — Elite OS as HVCG Executive Dashboard UX System of Record

| Field | Value |
|-------|--------|
| ID | ADR-0006 |
| Title | Elite OS (React + Fluent + SWA) is the Executive Dashboard UX SoR |
| Status | **Accepted** |
| Date | 2026-07-20 |
| Decision owner | system-architect |
| Product focus | HVCG Executive Dashboard (production-ready path on HVCG Development) |

## Context

Atlas product UI has fragmented across:

1. **Atlas Elite OS** — React + TypeScript + Fluent UI v9 + MSAL on Azure Static Web Apps (`apps/atlas-elite-os`, `@hvcg/atlas-design-system`) — Track 10  
2. **Model-driven Power App** — admin backend on Dataverse Dev (`org1131a2b0` / app `dea8a490-…`)  
3. **Canvas Command Center** — unpublished (D-002 / OA-CRM-09); specs only  
4. **Legacy mock SPAs** — `apps/hvcg-engineering-os/js/executive-dashboard.js` and EVA `executive-revenue-dashboard.js` copies across worktrees  

Master PM Sprint 14 release targets Elite OS as the daily executive surface. Living orchestration memory already states: Elite OS = premium executive UI; model-driven = admin SoR.

## Problem

Without a binding ADR, teams may rebuild a second canvas executive app, continue mock SPAs, or invent a non-Microsoft frontend/database — creating coupling, demo risk (fabricated KPIs), and deployment ambiguity.

## Options considered

1. **Canvas-first** executive UI (publish HVCG Command Center canvas)  
2. **Elite OS SPA** as executive UX; model-driven admin retained; SharePoint remains operational list SoR for classic CRM/PM; Dataverse holds Atlas executive tables (`hvcg_atlas*`)  
3. **Custom non-Microsoft** stack (rejected — Constitution / Microsoft-native rule)

## Decision

**Option 2 — APPROVED target architecture.**

| Surface | Role |
|---------|------|
| `apps/atlas-elite-os` on Azure SWA | **Executive Dashboard UX SoR** (Manny daily command) |
| `@hvcg/atlas-design-system` | **Only** approved Fluent component library for Elite modules |
| Model-driven Power App | **Administrative backend SoR** (grids, makers, security roles) |
| Dataverse (`hvcg_atlas*`) | Executive product records (approvals, revenue KPIs, briefs, …) for SPA + MDA |
| SharePoint lists (`HVCG_*`) | Operational CRM / delivery / capital / finance-ops SoR (classic HVCG OS) |
| Power Automate | Automation fabric (Dev); no live client comms without owner gate |
| Graph / SharePoint via Graph | Profile, calendar, documents |
| Power BI | Analytics (enterprise model); not a second transactional store |
| Entra ID + MSAL | Sole identity for Elite OS |

**Explicit freezes for this product line**

- Do **not** rebuild or publish a competing canvas Executive Dashboard this release.  
- Do **not** enhance `hvcg-engineering-os` / EVA executive mock dashboards as product UX — mark abandoned for exec home.  
- Do **not** introduce a second database, identity provider, or workflow engine.  
- Sample/fallback data must be **labeled**; never invent financial figures.

## Rationale

- Matches Track 10 Microsoft-native architecture and Master PM Executive Dashboard status.  
- Separates premium UX (React) from admin density (model-driven) without forking Microsoft platforms.  
- Dual-write risk controlled by domain: operational lists stay SharePoint; executive Atlas tables stay Dataverse; bridge on business keys (`ClientCode`, workspace ids).  
- SWA + Entra + Dataverse CORS is the hosted path already partially live (`zealous-rock-0090c7e1e…`).

## Consequences

- All new executive modules (Clients, Capital, Projects, Documents, AI, Financials) ship **inside Elite OS** using design-system components + adapters.  
- Power Platform agent focuses on Dataverse schema, security roles, MDA — not canvas rebuild.  
- Architect reviews any proposal to move operational SharePoint entities wholesale to Dataverse (phased; not big-bang).  
- Multi-tenant SaaS readiness = **workspace model** (`internal` | `client`) now; full org isolation later — no premature tenancy platform.

## Affected modules

elite-ui, power-platform, executive, crm, finance, capital, portal, ai-governance, deployment, qa-release, documentation, system-architect.

## Migration impact

None destructive. Redirect navigation/Teams tabs to SWA URL. Leave SharePoint data in place. Optionally sync selected KPI fields into `hvcg_atlasrevenuekpis` via approved flows later.

## Security impact

User-delegated tokens only in SPA; no secrets in git; `blockLiveClientComms=true`; Production PP owner-gated. See Track10 Security Matrix.

## Testing impact

UAT on SWA Dev; Dataverse CORS; MSAL redirect; connection banner must show `dataverse` vs `sample-fallback`; QA blocks release on placeholders and unlabeled finance.

## Rollback

1. Remove Teams/sitemap link to Elite OS  
2. Revert SWA deployment revision  
3. Model-driven admin + Dataverse + SharePoint remain  

## Related files / branches

- `.worktrees/track10-elite-ui` / `cursor/track10-elite-ui`  
- `PROJECT_ATLAS/Architecture/Track10MicrosoftNative.md`  
- `PROJECT_ATLAS/Architecture/Track10_Hosting_Teams_Rollback.md`  
- Master PM: `MASTER_PM_STATUS_EXECUTIVE_DASHBOARD.md`  
