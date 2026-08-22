# Client 360 Auth Security — Latest

- Generated: `2026-07-22T04:41:34Z`
- Branch: `fix/atlas-production-hardening`
- **Security verdict: GREEN**
- **ownerConfirmed: true** @ `2026-07-22T04:41:34Z`
- Commit/tag: **allowed** (Absolute GO)

## What was broken
1. **Missing route guard** — `ClientsRoute` explicitly allowed `Unauthenticated` to render `ClientsPage`.
2. **Snapshot-on-401 / snapshot-when-unsigned** — `fetchClient360` loaded `client360-snapshot.json` when Bearer missing **and** when hub returned 401/403.
3. **Production shipped client PII in public snapshot** — deploy script refreshed live clients into `public/client360-snapshot.json`.
4. **Nav leak** — Favorites/search showed client names while signed out.

## Fixes
- `RequireMicrosoftAuth` route guard on `/clients`, client detail, and private Atlas routes
- `api.ts`: snapshot only if explicit sample fallback **and** never on 401/403; Production hard-disables fallback
- Deploy writes **empty** snapshot when `VITE_ALLOW_SAMPLE_FALLBACK=false`
- AppShell hides client favorites/workspace dropdown when unsigned

## Build under test
- SWA: https://zealous-rock-0090c7e1e.7.azurestaticapps.net
- Hub: https://app-atlas-integration-hub.azurewebsites.net
- SHA: `8d3c7d58102543e80ca2ef9fa364d59c980abed2`
- Built at: `2026-07-22T03:31:05Z`
- Asset: `index-CxXf2tXp.js`
- Flags: `VITE_ATLAS_ENV=production`, `VITE_ALLOW_SAMPLE_FALLBACK=false`, `VITE_ALLOW_DEV_OWNER_LOGIN=false`

## Probes (no tokens logged)

| Test | Result | Evidence |
|------|--------|----------|
| A signed-out `/clients` | **PASS** | Owner UAT + prior automation: locked/redirect; no protected data |
| A anonymous API | **PASS** | `GET .../api/client360` → **401** (reconfirmed 2026-07-22T04:41:34Z) |
| B forged x-atlas-* only | **PASS** | **401** — headers alone never auth (reconfirmed) |
| C authenticated manny@ | **PASS** | Owner UAT: `/api/client360` **200**, **7** live clients |
| D sign out + refresh | **PASS** | Owner UAT: protected access removed |

## Public snapshot
`source: disabled-in-production`, `clients: []`
