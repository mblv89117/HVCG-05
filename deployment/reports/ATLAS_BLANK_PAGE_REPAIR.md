# Atlas Blank-Page Repair — Hub Token Bootstrap

- Generated: 2026-07-22T19:20:00Z
- Status: **Shell regression repaired. Not Production-accepted for operating data.**

## Phase 1 — Deployed artifact table

| Resource or stage | Status | Evidence |
|---|---|---|
| index.html | 200 | Production `/projects` returns HTML with `atlas-boot` + `#root` |
| main JavaScript asset | 200 `text/javascript` | `index-DxXdyo7B.js` (superseded by latest deploy asset) |
| CSS | 200 | `index-ZTMcapBL.css` |
| dynamic chunks | N/A single bundle | No separate lazy chunk 404s observed |
| React mount | Pass | `#root` mounts AppShell (`data-atlas-shell`) |
| MSAL initialize | Pass (timeout guarded) | AuthProvider awaits `getMsal()` with 10s timeout |
| handleRedirectPromise | Pass | Called once inside `getMsal()` |
| Static Web Apps `/.auth/me` | 200 `clientPrincipal: null` (anon automation) | Hint only; short timeout; not authorization |
| account resolution | Pass | `getActiveAccount` / optional `ssoSilent` |
| Hub token acquisition | Silent only | `acquireHubAccessTokenSilent` — **no auto-popup** |
| initial Projects request | Pending owner session | Not claimed |

## Root cause (74fe886 blank / non-recoverable UX)

1. **Primary:** Hub token helper reused `acquireToken()`, which on `InteractionRequiredAuthError` **automatically called `acquireTokenPopup` during page bootstrap** (hard refresh, no user gesture). For an existing MSAL session without a cached Hub API access token, this fired on every Projects load and could hang, conflict (`interaction_in_progress` under StrictMode), or leave the UI in a non-recoverable state **without an error boundary**.
2. **Amplifier:** No pre-React fallback / root error boundary — any uncaught startup exception emptied `#root` (true blank page).
3. **Follow-on in first repair attempt:** Boot splash awaited `/.auth/me` and stayed fullscreen over React until auth finished — looked blank/stuck. Fixed by hiding splash on React mount.

Exact exception class expected on authenticated hard refresh without Hub AT: **`InteractionRequiredAuthError`** (silent Hub scope acquisition). Auto-popup path removed.

## Dual-session proof

| State | Actual result |
|---|---|
| `/.auth/me` has client principal | Automation: `null`. SWA AAD login endpoint exists (`/.auth/login/aad`). |
| SWA role includes `HVCG Owner` | Not used for Hub auth; UI role from MSAL app-role claims |
| `msalInstance.getActiveAccount()` | Resolved after init when sessionStorage has account |
| Hub scope | `api://99dd84b0-33f7-481b-86db-d76287b124f6/access_as_user` |
| Silent acquisition | Yes, after account available |
| Interactive | **Only** via explicit **Authorize Atlas Integration Hub** button |

## Identity registrations (Production currently using Dev names)

| Component | Current registration | Environment intended | Correct for Production? |
|---|---|---|---|
| Static Web App | `swa-atlas-elite-os-dev` | Dev naming on Free SKU hosting Production URL | Temporary / naming debt |
| MSAL SPA client | `HVCG-Atlas-Elite-OS-DEV` `49d20328-…` | Dev app registration | Temporary — works; separate Prod app recommended later |
| Integration Hub API | `Atlas Integration Hub (Dev)` `99dd84b0-…` | Dev API app | Temporary — same |
| Delegated scope | `access_as_user` | Shared | OK if intentional |

Implications: shared Dev app registrations for Production traffic increase blast radius for consent/config mistakes. Not the blank-page root cause; documented only.

## Deployed commits

- Blank-page repair: `0c77650`, splash fix `03fbf2f`, MSAL timeout `latest on branch`
- Production asset after final deploy: see live `index-*.js`
- Footer SHA must match deployed `VITE_ATLAS_BUILD_SHA`

## Security

| Test | Result |
|---|---|
| Anonymous Hub | 401 |
| Forged `x-atlas-*` | 401 |
| `INTEGRATION_REQUIRE_AUTH` | true |
| External automations | not enabled |

## Still pending (do not claim acceptance)

- Authenticated owner portfolio 200
- HVCG Owner in footer after Manny hard-refresh
- Real project/task/document counts
- Seven clients / documents 200
