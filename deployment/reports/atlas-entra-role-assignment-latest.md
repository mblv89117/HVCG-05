# Atlas Entra Role Assignment — Manny HVCG Owner

**Generated (UTC):** 2026-07-22T05:52:00Z  
**Status:** ASSIGNED (owner must re-login for token claims)  
**Auth weakened:** No  
**Code/redeploy:** Not required

## Verdict

Manny (`manny@highvaluecapitalgroup.com`) was signed in but Atlas correctly resolved **Unresolved** because the Production SPA registration had **no app roles**, and the only prior assignment was **Default Access** (`00000000-…`), which does not emit a recognizable Atlas `roles` claim.

**Fix applied via Graph (Entra only):** defined six Atlas app roles on SPA `49d20328-…`, then assigned **HVCG Owner** to Manny.

## Mechanism

| Layer | Mechanism |
|-------|-----------|
| Identity | Entra MSAL SPA (`VITE_ENTRA_CLIENT_ID`) |
| Authorization | **App roles** on SPA registration → ID token `roles` claim |
| Not used | Security groups, static owner allow-list, hub role matrix for SPA gate |
| Frontend | `account.idTokenClaims.roles` → `resolveAtlasRole` → `normalizeRole` |
| Production | Local Owner / `VITE_ALLOW_ROLE_SIM` disabled when env is production/staging |

### Code path (unchanged)

1. `RoleProvider` reads MSAL `idTokenClaims`
2. `resolveAtlasRole` inspects `roles` / `extension_AtlasRole` / `atlas_role`
3. `normalizeRole('HVCG_Owner')` → alias `hvcg_owner` → **`HVCG Owner`**
4. Missing recognizable role → **`Unresolved`** → `/access-denied` (“No authorized Atlas role”)

Hub (`auth.ts`) validates JWT audience for API calls; the Elite OS access-denied gate is SPA claim-based and was the failure mode here.

## Identifiers

| Item | Value |
|------|-------|
| Tenant | `3df46563-86f3-4414-87fd-84ba967741ef` |
| SPA appId (client) | `49d20328-fe3c-40ec-9d0e-99f57e4646e4` |
| SPA app objectId | `85562351-0732-406d-b9e1-2604e23571ee` |
| SPA servicePrincipalId | `de32a483-f097-4d78-81ae-d5544c2a1384` |
| SPA displayName | `HVCG-Atlas-Elite-OS-DEV` (used by Absolute GO SWA) |
| Hub appId | `99dd84b0-33f7-481b-86db-d76287b124f6` (no app roles needed for this fix) |
| User UPN | `manny@highvaluecapitalgroup.com` |
| User objectId | `e4835ea2-3c45-493a-95f5-472f6339661d` |
| SWA | `https://zealous-rock-0090c7e1e.7.azurestaticapps.net` |

## App roles defined (SPA)

Entra **rejects spaces** in app role `value`. Claim values use underscores; frontend aliases map them to display roles.

| displayName | value (token claim) | appRoleId |
|-------------|---------------------|-----------|
| HVCG Owner | `HVCG_Owner` | `a1000001-0001-4000-8000-000000000001` |
| HVCG Team Member | `HVCG_Team_Member` | `a1000001-0001-4000-8000-000000000002` |
| Client Executive | `Client_Executive` | `a1000001-0001-4000-8000-000000000003` |
| Client Team Member | `Client_Team_Member` | `a1000001-0001-4000-8000-000000000004` |
| Read-Only Advisor | `Read_Only_Advisor` | `a1000001-0001-4000-8000-000000000005` |
| Administrator | `Administrator` | `a1000001-0001-4000-8000-000000000006` |

## Assignment

| Field | Value |
|-------|-------|
| Assignment id | `ol6D5EU8OkmV9UcvYzlmHfEQhXY6gclPr6nzGMyucew` |
| principalId | `e4835ea2-3c45-493a-95f5-472f6339661d` (Manny) |
| resourceId | `de32a483-f097-4d78-81ae-d5544c2a1384` (SPA SP) |
| appRoleId | `a1000001-0001-4000-8000-000000000001` (HVCG Owner) |
| createdDateTime | `2026-07-22T05:51:32.5499088Z` |

Prior Default Access assignment remains (`00000000-…`); it is harmless and does not grant Atlas capabilities.

## Token claim expected after re-login

```json
"roles": ["HVCG_Owner"]
```

- Token type: SPA **ID token** (`aud` = `49d20328-fe3c-40ec-9d0e-99f57e4646e4`)
- Frontend resolves to Atlas role **`HVCG Owner`** (full matrix: Command Center, clients, finance, admin)

## Must sign out / sign in?

**YES.** Existing MSAL session caches an ID token without `HVCG_Owner`. Sign out (or clear site sessionStorage) and sign in again as `manny@`.

## Browser verification

| Check | Status |
|-------|--------|
| Entra `appRoleAssignedTo` lists HVCG Owner | PASS |
| Claim → `normalizeRole` → HVCG Owner | PASS (code path) |
| Live `/access-denied` cleared after re-login | **PENDING** — requires owner interactive sign-out/in (MFA) |
| Command Center + `/clients` | **PENDING** — after re-login |

## Mismatches checked

| Risk | Result |
|------|--------|
| displayName vs value | Spaces in displayName OK; claim value is `HVCG_Owner` (aliases match) |
| App vs service principal | Roles defined on application; SP synced; assignment on SP |
| Prod vs Dev app IDs | Absolute GO SWA uses this SPA client ID |
| manny vs manuel | `manny@` valid; `manuel@` not a user |
| Groups vs app roles | App roles (correct for current RBAC) |
| Anonymous / matrix bypass | Not used |

## Remaining owner actions

1. Open Atlas SWA → **Sign out** completely  
2. **Sign in** as `manny@highvaluecapitalgroup.com`  
3. Confirm Access Denied is gone and role shows **HVCG Owner**  
4. Open Command Center and `/clients`

## Evidence files

- `deployment/reports/atlas-entra-role-assignment-latest.md`
- `deployment/reports/atlas-entra-role-assignment-latest.json`
