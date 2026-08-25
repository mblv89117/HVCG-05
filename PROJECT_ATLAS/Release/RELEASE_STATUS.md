# Release Status — Project Atlas

**As of:** 2026-07-21  
**Authority:** Integration & Release Manager  
**Recommendation:** **CONDITIONAL GO for Owner Local UAT** · **NO-GO for tag `atlas-v1.0.0-production`** until SWA redeploy + Power Automate + E2E QA GO — see [ATLAS_PRODUCTION_READINESS.md](../../deployment/reports/ATLAS_PRODUCTION_READINESS.md)

## Current integration

| Field | Value |
|-------|-------|
| Integration branch | `cursor/atlas-integration-release` |
| Repository path | `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-integration-release` |
| Current commit | `9a26e78` (RC1 — verify with `git rev-parse HEAD`) |
| Base commit | `35ca684` (`cursor/elite-ui-release-recovery`) |
| Overall build status | **PASS** (`npm run build`) |
| Local runtime status | **PASS** — Elite OS responding |
| Local URL | **http://127.0.0.1:5180/** |
| Plaid API (optional) | **http://127.0.0.1:8787/** — running; `plaidConfigured: false` until secrets |

## Startup (exact)

```bash
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-integration-release"
npm install --cache .npm-cache   # if needed
npm run dev                     # Elite OS → http://127.0.0.1:5180
```

Optional Plaid API (Sandbox; no secrets → honest not-configured):

```bash
# After owner creates .secrets/plaid.env (see OWNER_ACTIONS.md) — never paste secrets in chat:
set -a && source .secrets/plaid.env && set +a
npm run start -w @hvcg/atlas-plaid-api   # → http://127.0.0.1:8787
```

## Integrated modules

| Module | Status |
|--------|--------|
| Unified shell + nav | Integrated |
| Entra login UX | Integrated (needs client ID for live sign-in) |
| Client selector | Integrated (command bar) |
| Home / Executive Dashboard | Integrated |
| Clients / Projects / Tasks / Documents | Integrated |
| Financial Intelligence | Integrated (pending verified data labels) |
| Banking Connections (Plaid) | Integrated UI + API |
| Accounting Connections (QBO) | Surface only — **BLOCKED** |
| Knowledge | Integrated (catalog rail) |
| Automations | Status surface |
| Reports | Hub links |
| Administration / Settings / Notifications | Integrated |
| Azure deploy scripts | Present |

## Deferred modules

- Full Client Portal shell  
- Finance Intelligence mock app  
- Executive Intelligence separate app  
- Operations Hub  
- AI Governance control plane  
- Orchestration Sprint 12 merge  
- Revenue Sprint 4  
- QuickBooks read-only Phase 1 implementation  

## Open defects

See [DEFECT_LIST.md](./DEFECT_LIST.md).

## Security status

| Check | Result |
|-------|--------|
| Secrets in git | **PASS** — no secrets committed; `.secrets` gitignored |
| Plaid tokens in browser | **PASS** — API-only; Link public token exchange server-side |
| Tenant isolation unit tests | **PASS** (plaid API tests) |
| Entra JWT enforced on Plaid | **BLOCKED** until configured (`PLAID_REQUIRE_AUTH` / Entra) |
| Cross-tenant UI shortcuts | Not introduced |
| Fabricated financial success | **PASS** — pending labels / honest 503 |

## QA status

| Gate | Result |
|------|--------|
| Written QA GO | **NOT ISSUED** |
| Recovery tests | **PASS** |
| Plaid unit tests | **PASS** (5/5) |
| Plaid Sandbox Link E2E | **BLOCKED** — owner secrets |
| QuickBooks Sandbox | **NOT APPLICABLE** |
| Auth smoke (live Entra) | **BLOCKED** — client ID / owner registration |
| Route HTTP smoke | **PASS** (200 all primary paths) |

## Deployment status

| Target | Status |
|--------|--------|
| Local owner UAT | **READY** at http://127.0.0.1:5180 (LaunchAgents) |
| Production SharePoint | **PASS** — Command Center 82/82 lists, 7 clients (Graph verified 2026-07-21) |
| Dev SWA | Live https://zealous-rock-0090c7e1e.7.azurestaticapps.net — **redeploy from this branch still required** |
| Azure staging | **NOT READY** — see AZURE_STAGING_READINESS.md |
| Tag `atlas-v1.0.0-production` | **HOLD** |

## Production readiness

**Schema/data gate: PASS.** Tag still **HOLD** for: SWA redeploy (or waiver), Power Automate production, E2E QA written GO. See `deployment/reports/ATLAS_PRODUCTION_READINESS.md`.

## Owner actions

See [OWNER_ACTIONS.md](./OWNER_ACTIONS.md).
