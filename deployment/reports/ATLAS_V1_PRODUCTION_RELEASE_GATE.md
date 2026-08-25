# Atlas Production Release Gate Report

**When:** 2026-07-21T18:00:00Z (approx)  
**Branch:** `fix/atlas-production-readiness`  
**Production URL:** https://zealous-rock-0090c7e1e.7.azurestaticapps.net  
**Prod SharePoint:** https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter  
**Prod Dataverse:** https://orgee2f7545.crm.dynamics.com  

## Gates 1–9

| # | Gate | Result | Evidence |
|---|------|--------|----------|
| 1 | Entra redirect URIs | **PASS** | `HVCG-Atlas-Elite-OS-DEV` (`49d20328-…`) SPA URIs include SWA origin + trailing slash + local 5180. Hub OAuth remains `http://localhost:8790/api/oauth/microsoft/callback` (Mac-local hub). |
| 2 | CORS / API allowlists | **PASS** | Hub `INTEGRATION_ALLOWED_ORIGINS` includes SWA origin (LaunchAgent + code default). OPTIONS reflects `access-control-allow-origin: https://zealous-rock-…`. Dataverse SPA access uses MSAL (no separate CORS portal step required). |
| 3 | Production config on SWA | **PASS** | Live bundle: `VITE_ATLAS_ENV=production`, `VITE_SHAREPOINT_SITE_URL=…/HVCG-CommandCenter`, `VITE_DATAVERSE_URL=https://orgee2f7545.crm.dynamics.com`, banner `PRODUCTION — OWNER GATES REQUIRED`. |
| 4 | Browser public URL | **PASS*** | Chrome headless: shell + Sign in with Microsoft; `/clients` shows all **7** canonical clients; `/clients/client-accg01` shows **500 linked docs**. Owner interactive MFA sign-in **not** completed in-agent (cursor-ide-browser tabs unavailable). |
| 5 | Persistence E2E (Prod SP) | **PASS** | `scripts/prod-persistence-e2e.mjs` → client/project/task/document_request/time_entry/decision/financial_milestone/ai_approval all create/read/patch/delete. Report: `deployment/reports/prod-persistence-e2e-latest.json`. |
| 6 | Desktop + mobile smoke | **PASS** | Desktop 1280 + mobile 390 viewports; Production banner + clients list. Screenshots under `deployment/reports/swa-*.png`. |
| 7 | Power Automate Production | **CONDITIONAL PASS** | 15 HVCG workflows present in Prod Dataverse. Packages on disk validated (`src/power-automate/`). `HVCG_LeadQualifiedCreateOpportunity` Activated; others Draft. External client sends skipped. Remaining Draft→On needs Maker connection consent (owner). |
| 8 | Security / smoke / recovery / audit | **PASS** | Elite recovery tests PASS; hub integration tests 7/7 PASS; `Invoke-HVCGPreDeploymentTests.ps1` RESULT PASS. |
| 9 | Commit | **PASS** | See git history for this release package. |

\*HTTPS SWA cannot call Mac-local `http://127.0.0.1:8790` (mixed content). Mitigated with deploy-time `client360-snapshot.json` (7 clients + HVS link-first docs) and hub fallback in Elite API client.

## Definition of Done

| Item | Status |
|------|--------|
| Prod SharePoint 82 lists / 7 clients | Met (Graph live) |
| Public SWA Production config | Met |
| 7 clients on public URL | Met |
| HVS doc links (ACCG 500 URLs in snapshot + detail chip) | Met |
| Persistence on Production lists | Met |
| No secrets in git | Met |
| Owner MFA Microsoft sign-in verified end-to-end | **Gap** — control present; interactive MFA not run |
| Hosted HTTPS Integration Hub | **Gap** — snapshot fallback; Mac hub still source of live ingest |
| All PA flows Activated (non-email) | **Gap** — Draft flows need Maker consent |

**DoD verdict:** **CONDITIONAL GO** for Production SWA + SharePoint persistence. Tag `atlas-v1.0.0-production` cut with honest gaps above (no P0 open that blocks list/clients/persistence).

## ONE owner action (if continuing PA enablement)

1. Open [Power Automate Maker](https://make.powerautomate.com) → environment **HVCG Production**  
2. Open each Draft `HVCG_*` flow (skip email-to-external-client paths) → fix connection references → Turn on  
3. Do **not** enable external client email sends without explicit approval  

## Artifacts

- `deployment/reports/prod-persistence-e2e-latest.json`
- `deployment/reports/swa-browser-smoke-latest.json`
- `deployment/reports/swa-desktop-*.png` / `swa-mobile-*.png` / `swa-accg-detail.png`
- `apps/atlas-elite-os/public/client360-snapshot.json`
- `scripts/deploy-swa-dev.sh` (Production defaults + snapshot refresh)
- `scripts/prod-persistence-e2e.mjs`
