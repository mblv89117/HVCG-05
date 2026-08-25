# Atlas Hub Bearer Auth Repair — Production Acceptance

- Generated: 2026-07-22T18:50:00Z
- Branch: `fix/atlas-usable-operating-layer`
- Deployed commit (footer + bundle): `40d2396bdce807e4e832d2206452add243744005`
- Production SWA: `https://zealous-rock-0090c7e1e.7.azurestaticapps.net`
- Hub: `https://app-atlas-integration-hub.azurewebsites.net`
- Asset: `/assets/index-ChdNTBM5.js`

## 1. Exact root cause of missing Bearer

PM pages (`PortfolioPage`, `ProjectDetailPage`, My Work, Documents, Command Center) fired Hub `fetch` as soon as React mounted, while `useHubAuth` was still acquiring the MSAL **ID token** asynchronously.

`pmApi` / prior clients only attached `Authorization` when `auth.accessToken` was already set. Race → request with **no Authorization header** → Hub `requirePrincipal` → `missing_bearer` → UI often labeled the failure **Project not found**.

Clients page already gated on `accessToken`; Projects did not.

## 2. Exact failing endpoint(s)

Cross-origin:

- `GET https://app-atlas-integration-hub.azurewebsites.net/api/pm/projects/:id`
- Related: `/api/pm/portfolio`, `/api/pm/my-work`, `/api/pm/documents`, command-center PM routes

Observed Production error body:

`{"error":"unauthorized","message":"Microsoft sign-in required (Bearer token missing)"}`

## Phase 1 table

| Field | Actual value |
|---|---|
| Browser page origin | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` |
| Request URL | `https://app-atlas-integration-hub.azurewebsites.net/api/pm/*` (detail used UUID `fd6c7c89-3780-4997-a801-dcf0ccd55706`) |
| Same-origin or cross-origin | **Cross-origin** |
| HTTP status | **401** |
| Authorization header present? | **No** on failing calls |
| Credential mode | `credentials: omit` (Bearer only; SWA cookies not sent to Hub) |
| API expected audience | SPA client id `49d20328-fe3c-40ec-9d0e-99f57e4646e4` (Entra ID token) + Hub app client `99dd84b0-33f7-481b-86db-d76287b124f6` |
| API expected issuer | `https://login.microsoftonline.com/3df46563-86f3-4414-87fd-84ba967741ef/v2.0` (+ AAD v1 STS variants) |
| API expected role | After Bearer proof, scope roles via `x-atlas-roles` (UI `HVCG Owner`) |
| Middleware rejecting request | `apps/atlas-integration-api/src/middleware/auth.ts` → `requirePrincipal` → `missing_bearer` |
| Root cause | Bearer race / optional Authorization on PM paths; 401 mislabeled as 404 |

## 3. Chosen secure authentication architecture

**Entra ID token for Integration Hub (cross-origin)** — intentional existing design.

Not SWA linked backend: Hub already validates SPA ID tokens; Easy Auth is off; linking would be a larger platform change.

Implemented:

1. Central `hubFetchJson` **always** acquires Bearer before protected calls
2. Silent retry on `missing_bearer` / invalid token
3. Never send Graph nonce access tokens as Hub Bearer (`acquireHubBearerToken` ID-token only)
4. Pages wait for `tokenReady` / `hasBearer`
5. 401 / 403 / 404 separated in Project detail and portfolio

Consent: **not required**.

## 4. Files changed

- `apps/atlas-elite-os/src/integrations/hub/hubFetch.ts` (new)
- `apps/atlas-elite-os/src/integrations/hub/useHubAuth.ts`
- `apps/atlas-elite-os/src/integrations/hub/pmApi.ts`
- `apps/atlas-elite-os/src/integrations/hub/api.ts`
- `apps/atlas-elite-os/src/microsoft/auth/msal.ts`
- `apps/atlas-elite-os/src/pages/PortfolioPage.tsx`
- `apps/atlas-elite-os/src/pages/ProjectDetailPage.tsx`
- `apps/atlas-elite-os/src/pages/MyWorkPage.tsx`
- `apps/atlas-elite-os/src/pages/DocumentsOperatingPage.tsx`
- `apps/atlas-elite-os/src/pages/CommandCenterPage.tsx`
- `deployment/reports/ATLAS_HUB_BEARER_AUTH_REPAIR.md`

Commits: `c59a4d6`, `40d2396`

## 5. Azure resources changed

- **Redeployed** Production Static Web App `swa-atlas-elite-os-dev` (production env) with stamped SHA `40d2396…`
- Integration Hub App Service: **no auth settings weakened**; no anonymous open
- No SWA linked-backend change

## 6. Entra resources changed

None.

## 7. Consent required?

No.

## 8. Actual deployed commit

`40d2396bdce807e4e832d2206452add243744005`

Proven in:

- Production HTML → `index-ChdNTBM5.js`
- Bundle contains full SHA string (3 occurrences)
- Footer screenshot (automation, signed-out): `SHA 40d2396bdce807e4e832d2206452add243744005`

## 9. Previous SHA mismatch (`a3a945b…`)

Production **did** receive feature JS earlier, but deploy stamped `VITE_ATLAS_BUILD_SHA=$(git rev-parse HEAD)` **before** the feature commits were created, so footer showed merge base `a3a945b…` while branch tip was `b409ca4` / `7660672`.

This deploy stamps SHA **after** commit.

## 10. Sanitized API tests (automation session)

| Test | Expected | Actual | Pass/Fail |
|---|---|---|---|
| Authenticated owner `/api/pm/portfolio` | 200 | **Not run in automation** (browser session Unauthenticated; do not force Manny re-login) | Pending owner hard-refresh |
| Valid project detail | 200 | Pending owner session | Pending |
| Missing project | 404 | Code path present; not live-proven | Pending |
| No identity | 401 | 401 `Bearer token missing` | Pass |
| Wrong role | 403 | Not live-proven this pass | Pending |
| Forged Atlas header only | 401 | 401 `Bearer token missing` | Pass |
| Forged `x-ms-client-principal` + Atlas headers | 401 | 401 | Pass |
| Bad Bearer | 401 | 401 | Pass |
| Seven clients | 200 | Pending authenticated UI | Pending |
| Documents query | 200 | Pending authenticated UI | Pending |

## 11. Browser evidence

Automation opened Production `/projects` while signed out → route guard → `/access-denied` with footer SHA `40d2396…`. Screenshot: `prod-projects-signed-out.png`.

**Owner action (not re-login):** hard-refresh existing Production tab so MSAL cache + new bundle load; confirm footer SHA `40d2396…` and `/projects` portfolio 200.

## 12–15. Data counts

Deferred until authenticated owner `/api/pm/portfolio` returns 200. Do **not** claim usable operating layer data until then. Do **not** click Sync until that 200 is observed.

## 16. Anonymous / forged blocked

Confirmed against live Hub with `INTEGRATION_REQUIRE_AUTH=true`. Forged `x-atlas-*` and forged `x-ms-client-principal` do not authenticate.

## Hub auth posture (unchanged)

| Setting | Value |
|---|---|
| Easy Auth | Off / null |
| `INTEGRATION_REQUIRE_AUTH` | `true` |
| Tenant | `3df46563-86f3-4414-87fd-84ba967741ef` |
| SPA audience | `49d20328-fe3c-40ec-9d0e-99f57e4646e4` |
| Hub app client id | `99dd84b0-33f7-481b-86db-d76287b124f6` |
| CORS origins | Production + preview SWA hosts only |

## Owner note

Do **not** click Sync until `/projects` returns **200** with Bearer attached after hard-refresh of the existing session.
