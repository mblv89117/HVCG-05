# Atlas Hub Access-Token Correction

- Generated: 2026-07-22T18:55:00Z
- Branch: `fix/atlas-usable-operating-layer`
- Status: **NOT Production-accepted** — authenticated owner 200s still pending

## Critical finding (prior build `40d2396`)

Production and source used **`AuthenticationResult.idToken`**, not `accessToken`.

Evidence from Production bundle `index-ChdNTBM5.js`:

```
scopes:["openid","profile","email"] … if(r.idToken)return r.idToken
```

That build must **not** be called repaired for Microsoft identity correctness.

## Correction implemented

| Item | Value |
|---|---|
| Hub API app | `Atlas Integration Hub (Dev)` `99dd84b0-33f7-481b-86db-d76287b124f6` |
| Identifier URI | `api://99dd84b0-33f7-481b-86db-d76287b124f6` |
| Delegated scope | `access_as_user` (`api://99dd84b0-33f7-481b-86db-d76287b124f6/access_as_user`) |
| Scope GUID | `90cdcffc-19f0-49ea-8341-f43af4eee6eb` |
| SPA pre-authorized | `HVCG-Atlas-Elite-OS-DEV` `49d20328-fe3c-40ec-9d0e-99f57e4646e4` |
| Admin consent | Granted (`AllPrincipals` oauth2PermissionGrant for `access_as_user`) |
| MSAL property | **`accessToken`** via `acquireToken(getHubApiScopes())` |
| Hub audiences | `api://99dd84b0-…`, `99dd84b0-…` (`INTEGRATION_ACCEPTED_AUDIENCES`) |
| Required scope | `access_as_user` (`INTEGRATION_REQUIRED_SCOPE`) |
| `INTEGRATION_REQUIRE_AUTH` | `true` (unchanged / not weakened) |

## Consent

Admin consent for Hub `access_as_user` was applied during this repair. **No additional owner login loop required** before the hard-refresh verification. If silent acquisition fails once with AADSTS65001, stop and report — do not retry interactive loops.

## Race gate

Pages wait for `tokenReady` / `hasBearer` before Hub calls. `hubFetchJson` acquires access token before `fetch`. Missing token → auth message, not Project not found. Hub 401 → `setAuthFailure`. Hub 404 → Project not found.

## Tests

`npm run test:hub-auth -w @hvcg/atlas-elite-os` (source assertions).

## Pending (do not claim acceptance)

- Authenticated owner portfolio 200
- Valid project detail 200
- Live missing-project 404
- Wrong-role 403
- Seven clients / documents 200
- Real project / task / document counts

## Manny manual check (no sign-out)

1. Hard-refresh authenticated Atlas tab
2. Footer SHA must match this access-token deploy (not claim until stamped)
3. Footer still `HVCG Owner`
4. Open `/projects`
5. Portfolio request 200
6. Do not click Sync until `/projects` loads
