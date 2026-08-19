# Evidence — SWA Dev live test

**URL:** https://zealous-rock-0090c7e1e.7.azurestaticapps.net  
**Tester:** qa-release  
**When:** 2026-07-20  
**Auth state:** Signed out (MSAL Sign-in available; no interactive Owner credentials used in this session)

## Deploy smoke

| Check | Result |
|-------|--------|
| GET `/` | HTTP 200, title `Atlas Elite OS — Development / UAT` |
| Asset | `/assets/index-CoxUs8Ew.js` (~884 KB) |
| SPA routes `/financials`…`/admin` | All HTTP 200 (rewrite) |
| Secrets in HTML/JS | No client_secret / password / JWT patterns |
| Security headers | HSTS, X-Content-Type-Options nosniff, X-Frame-Options SAMEORIGIN |
| Dollar literals in deployed bundle | Present at runtime UI (sample finance KPIs) |

## UI observations (browser)

1. Env banner: DEVELOPMENT / UAT — NO LIVE CLIENT ACTIONS — PASS
2. Nav shows **Soon** on AI, Clients, Capital, Projects, Documents — FAIL (placeholders)
3. `/clients` shows gated placeholder: "Client Workspace comes next" — FAIL
4. Home signed-out: Sample fallback banner — expected when unsigned
5. Home KPIs include **Revenue 1.25M USD** and **Funding pipeline 4.8M USD** labeled Development sample — **FAIL fabricated finance**
6. Approvals table visible with sample + repository-derived rows — partial
7. AI Command Center marked "Development stubs only" — labeled, not live
8. Admin page exposes model-driven Dataverse admin deep link — PASS structure
9. Mobile (~390px): hamburger nav present; sample finance KPIs still shown
10. Light/dark toggle present; search field present

## Source branch comparison

- Worktree: `.worktrees/track10-elite-ui` @ `cursor/master-pm/executive-dashboard-s14`
- Source AppShell removes Soon badges and adds full module routes
- `npm run build -w @hvcg/atlas-elite-os` **FAILS** (TS2322 Modules.tsx; TS2307 ModuleScaffold wrong import path)
- Local `dist` hash `index-DuofCbpK.js` ≠ deployed `index-CoxUs8Ew.js` — deploy lag + candidate not buildable
