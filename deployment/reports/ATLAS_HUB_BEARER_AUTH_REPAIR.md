# Atlas Hub Bearer Auth Repair — Production Acceptance

- Generated: 2026-07-22T18:45:00Z
- Branch: `fix/atlas-usable-operating-layer`

## Phase 1 — Failing request table

| Field | Actual value |
|---|---|
| Browser page origin | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` |
| Request URL | `https://app-atlas-integration-hub.azurewebsites.net/api/pm/projects/:id` (and related `/api/pm/*`) |
| Same-origin or cross-origin | **Cross-origin** |
| HTTP status | **401** |
| Authorization header present? | **No** on failing calls (Hub middleware `missing_bearer`) |
| Credential mode | `credentials: omit` (Bearer only; cookies not used) |
| API expected audience | SPA client id `49d20328-fe3c-40ec-9d0e-99f57e4646e4` (Entra ID token) plus configured hub/SPA audiences |
| API expected issuer | `https://login.microsoftonline.com/3df46563-86f3-4414-87fd-84ba967741ef/v2.0` (and AAD v1 STS variants) |
| API expected role | Scope roles via `x-atlas-roles` after Bearer identity proof (`HVCG Owner` in UI) |
| Middleware rejecting request | `apps/atlas-integration-api/src/middleware/auth.ts` → `requirePrincipal` → `unauthorized('Microsoft sign-in required (Bearer token missing)')` |
| Root cause | PM pages called Hub **before** MSAL ID token was attached; optional Authorization was omitted. Clients worked because that page gated on `accessToken`. 401 was mislabeled as Project not found. |

## Phase 2 — Architecture (documented, then repaired)

### Static Web App
- MSAL SPA public client (not SWA Easy Auth for Hub).
- Footer role from Entra ID token claims via `RoleProvider`.
- `staticwebapp.config.json` SPA fallback only; no linked backend.

### Frontend
- API base: `VITE_INTEGRATION_API_BASE=https://app-atlas-integration-hub.azurewebsites.net`
- Auth: MSAL → `acquireHubBearerToken()` → Entra **ID token** (aud=SPA)
- Prior bug: `useHubAuth` set token asynchronously; `pmApi` only added Authorization **if** `auth.accessToken` already present

### Integration Hub
- App Service Easy Auth: **disabled**
- Custom Bearer JWT validation (`INTEGRATION_REQUIRE_AUTH=true`)
- `x-atlas-*` never authenticate alone
- Direct anonymous Hub access remains blocked

## Phase 3 — Chosen architecture

**Alternative (intentional): Entra ID token for Integration Hub (cross-origin).**

Not SWA linked backend (would be a larger platform change; current Hub already validates SPA ID tokens).

Implemented:

1. Central `hubFetchJson` always acquires Bearer before protected calls
2. One silent retry on `missing_bearer` / invalid token
3. Never send Graph nonce access tokens as Hub Bearer
4. Pages wait for `tokenReady` / `hasBearer`
5. 401 ≠ Project not found

Consent: **not required** (existing SPA + openid/profile/email ID token path).

## Phase 5 — SHA mismatch explained

Previous Production footer SHA `a3a945b…` was **correct for the injected env at build time**:

- Feature JS **was** deployed (`Sync from Microsoft`, project recovery UI present in `index-BHJBaIol.js`)
- Deploy script set `VITE_ATLAS_BUILD_SHA=$(git rev-parse HEAD)` **before** committing `7660672`/`b409ca4`
- Therefore code ≠ stamped SHA

This repair rebuilds **after** commit so stamped SHA matches deployed commit.

## Security (unchanged posture)

| Test | Expected | Actual |
|---|---|---|
| No identity `/api/pm/portfolio` | 401 | 401 |
| Forged `x-atlas-*` only | 401 | 401 |
| Hub Easy Auth | Off | Off |

## Owner note

Do **not** click Sync until `/projects` returns **200** with Bearer attached after hard-refresh of the existing session.
