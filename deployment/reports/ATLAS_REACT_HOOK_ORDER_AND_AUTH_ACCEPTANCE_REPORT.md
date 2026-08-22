# Atlas React Hook-Order (#310) and Authenticated Operating-Layer Acceptance Report

- Generated: 2026-07-22T20:00:00Z
- Branch: `fix/atlas-usable-operating-layer`
- Worktree: `.worktrees/atlas-usable-operating-layer`
- Status: **React #310 root cause identified and repaired. Controlled tests passed. Awaiting owner Microsoft sign-in return on Production after deploy.**

## Root cause

| Field | Value |
|---|---|
| Exact component | `PortfolioPage` |
| Source file | `apps/atlas-elite-os/src/pages/PortfolioPage.tsx` |
| Exact violation | Two `useMemo` hooks (`owners`, `filtered`) were declared **after** Hub-auth early returns (`!auth.tokenReady`, `interaction_required`, `!auth.hasBearer`) |
| React error | Development: `Rendered more hooks than during the previous render.` Production minified: **React error #310** |
| Triggering transition | Post–Microsoft sign-in Hub bootstrap: `tokenReady: false` → `tokenReady: true` / `hasBearer: true` (or Authorize Hub click reaching bearer-ready) |
| Previous hook count | Prefix hooks only (useHubAuth tree + navigate + 14× useState + useCallback + useEffect) — **stop before useMemos** |
| Failing hook count | Same prefix **+ 2** (`useMemo` owners, `useMemo` filtered) |
| Introduced / amplified by | `0c77650` (auth early returns expanded above existing useMemos). Production crash SHA `df6c9ce` only added MSAL init timeout and did not fix this. |

### Violation table

| Component | Source file | Previous state | New state | Hooks before | Hooks after | Violation |
|---|---|---|---|---|---|---|
| `PortfolioPage` | `PortfolioPage.tsx` | `!tokenReady` / interaction / no bearer (spinner or authorize UI) | Hub bearer ready | N | N+2 (`useMemo`×2) | **Yes — React #310** |
| `ProjectDetailPage` | `ProjectDetailPage.tsx` | same auth gates | ready | stable | stable | No |
| `useHubAuth` | `useHubAuth.ts` | idle → ready | ready | fixed | fixed | No |
| `MicrosoftAuthProvider` | `AuthProvider.tsx` | boot → ready | ready | fixed | fixed | No |
| `RequireMicrosoftAuth` | `RequireMicrosoftAuth.tsx` | loading → signed-in | signed-in | fixed | fixed | No |

### Full non-minified React error (controlled reproduction)

```
React has detected a change in the order of Hooks called by BrokenProjectsAuthGate.
This will lead to bugs and errors if not fixed.

   Previous render            Next render
   ------------------------------------------------------
1. useState                   useState
2. undefined                  useMemo
```

Component stack (Production): root recovery boundary caught render failure on `/projects` → `PortfolioPage` under `RequireMicrosoftAuth` after sign-in return. Correlation ID shown to owner: `atlas-mrwh4v6-gh8q2f`. Build SHA: `df6c9cea38bce06e8c82fdbbdde071f3267ff87d`.

## Exact code correction

Moved both `useMemo` calls **above** all Hub-auth early returns so every render of `PortfolioPage` calls the same Hooks in the same order. Network work remains gated by `auth.tokenReady` / `auth.hasBearer` inside `refresh` / `useEffect` (non-Hook conditionals).

Additional related hardening in this repair:

- Hosted SWA sign-in uses full-page `/.auth/login/aad?post_login_redirect_uri=…` (does not wait for MSAL/Hub). Local Vite retains MSAL popup.
- ESLint `react-hooks/rules-of-hooks: error` enabled for all frontend TS/TSX under `apps/atlas-elite-os/src`.
- Auth-transition + React render regression tests added (including intentional broken-pattern contrast that throws #310).

## Files changed

- `apps/atlas-elite-os/src/pages/PortfolioPage.tsx` — hook-order fix
- `apps/atlas-elite-os/src/startup/swaSignIn.ts` — safe SWA Microsoft sign-in navigation
- `apps/atlas-elite-os/src/microsoft/auth/AuthProvider.tsx` — SWA sign-in on hosted hosts
- `apps/atlas-elite-os/eslint.config.js` — Rules of Hooks gate
- `apps/atlas-elite-os/package.json` / root `package.json` / `package-lock.json` — lint/test deps + scripts
- `apps/atlas-elite-os/scripts/hub-access-token-tests.mjs` — #310 guard
- `apps/atlas-elite-os/scripts/auth-transition-tests.mjs` — transition contracts
- `apps/atlas-elite-os/scripts/hook-order-render-tests.mjs` — React render reproduction
- `apps/atlas-elite-os/public/client360-snapshot.json` — empty production snapshot (no PII)
- `deployment/reports/ATLAS_REACT_HOOK_ORDER_AND_AUTH_ACCEPTANCE_REPORT.md` — this report

## Test commands and exit codes

| Command | Exit |
|---|---|
| `npm run test:hub-auth -w @hvcg/atlas-elite-os` | 0 |
| `npm run test:auth-transitions -w @hvcg/atlas-elite-os` | 0 |
| `npm run test:hook-order -w @hvcg/atlas-elite-os` | 0 |
| `npm run test:routes -w @hvcg/atlas-elite-os` | 0 |
| `npm run test:recovery -w @hvcg/atlas-elite-os` | 0 |
| `npm run test:hard-refresh -w @hvcg/atlas-elite-os` | 0 |
| `npm run test:all -w @hvcg/atlas-elite-os` | 0 |
| `npm run lint:hooks -w @hvcg/atlas-elite-os` | 0 (0 Rules-of-Hooks errors) |
| `npm run lint -w @hvcg/atlas-elite-os` | 0 (unused-import warnings only; not hook violations) |
| `VITE_ATLAS_BUILD_SHA=$(git rev-parse HEAD) npm run build -w @hvcg/atlas-elite-os` | 0 |
| `npm run test:integration-api` | 0 (10/10) |

Rules-of-Hooks lint results: **no `react-hooks/rules-of-hooks` errors** across `src/**/*.{ts,tsx}`. Pre-existing unused-import warnings remain; they do not affect hook order.

## Controlled sign-in-return evidence

| Check | Result |
|---|---|
| Dist `index.html` contains `atlas-boot` + `#root` | Pass |
| Dist bundle contains SWA `/.auth/login/aad` helper | Pass |
| Dist bundle contains Authorize Hub explicit action | Pass |
| React render transitions (acquiring → interaction → ready) without #310 | Pass |
| Broken pattern still throws hook-order error (contrast) | Pass |
| StrictMode retained in `main.tsx` | Pass |
| Root error boundary retained | Pass |
| Full Microsoft interactive return | **Owner action required after Production deploy** (do not ask until deploy verified) |

## Hub security contract (live Production Hub)

| Test | Result |
|---|---|
| Anonymous `GET /api/pm/portfolio` | **401** |
| Forged Bearer + `x-atlas-*` + forged `x-ms-client-principal` | **401** Malformed Microsoft token |
| `INTEGRATION_REQUIRE_AUTH` | **true** |
| ID-token-as-bearer architecture | **Not restored** (accessToken path retained) |

## Entra / SWA naming debt (follow-up; not crash cause)

| Component | Current registration | Current environment | Intended environment | Immediate action |
|---|---|---|---|---|
| Static Web App | `swa-atlas-elite-os-dev` | Hosts Production URL | Production-named SWA | Naming debt — do not replace mid-repair |
| MSAL SPA | `HVCG-Atlas-Elite-OS-DEV` `49d20328-…` | Shared with Production traffic | Dedicated Production SPA | Follow-up |
| Integration Hub API | `Atlas Integration Hub (Dev)` `99dd84b0-…` | Shared | Dedicated Production API app | Follow-up |
| Delegated scope | `access_as_user` | Shared | Same scope name OK | Keep |

## Production deployment

| Field | Value |
|---|---|
| Deploy commit SHA | `bc16ed656727f6ae5f4396d18b0dc8f609b545d0` |
| Production asset filename | `assets/index-BJdw2xIC.js` |
| CSS asset | `assets/index-ZTMcapBL.css` |
| Footer / bundle SHA | `bc16ed656727f6ae5f4396d18b0dc8f609b545d0` embedded in JS |
| index.html | 200 `text/html` |
| JS MIME | 200 `text/javascript` |
| CSS MIME | 200 `text/css` |
| SWA AAD login | 302 to identity redirect |
| Production tags | `atlas-v1.0.0-production` and `atlas-v1.0.1-production` **unchanged** |
| Deployed URL | https://zealous-rock-0090c7e1e.7.azurestaticapps.net |

## Production acceptance (owner sequence — deploy asset verified)

**Stop condition met:** Microsoft interactive sign-in can only be completed by the owner.

### Exact owner instruction (one session)

1. Open exactly: `https://zealous-rock-0090c7e1e.7.azurestaticapps.net/projects`
2. Confirm footer / diagnostics show build SHA starting with `bc16ed6` (not `df6c9ce`).
3. Confirm Atlas shell renders (no blank page; no “Atlas hit a recoverable error” on normal load).
4. Click **Sign in with Microsoft** once.
5. Account: `manny@highvaluecapitalgroup.com`
6. Complete MFA only if Microsoft requests it.
7. Expect return to `/projects` with **no React #310** and **no recovery screen**.
8. Footer role: **HVCG Owner**.
9. If Hub consent is still required, click **Authorize Atlas Integration Hub** exactly once.
10. Expect Projects portfolio to load (authenticated 200).

Do not open a second login popup/tab. Do not clear cookies unless this sequence fails with a documented cache mismatch.

## Operating-data validation

Deferred until authenticated Projects API returns 200 under the owner session. Do not invent counts.

## Confirmations

- No access token, cookie, or secret committed or printed.
- No security control weakened.
- External email / MissingDocumentReminders / RenewalReminders / Eva intake **not enabled**.
- HVS source files not modified.
- Both Production tags remain at prior objects (`6a346aa…` / `8b12146…`).
