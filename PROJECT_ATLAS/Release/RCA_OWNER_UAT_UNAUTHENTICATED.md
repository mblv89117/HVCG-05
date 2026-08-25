# RCA — Owner UAT "Unauthenticated" / Access Denied

**Date:** 2026-07-19  
**Environment:** Local Elite OS @ http://127.0.0.1:5180/  
**Branch:** `cursor/atlas-integration-release`  
**Authority:** Master PM / Security (RBAC preserved)

---

## Symptoms

1. Footer showed `role: Unauthenticated`.
2. Navigating to Banking / Accounting / Financial Intelligence redirected to Access Denied with title **"No authorized Atlas role"**.
3. Shell otherwise loaded successfully (RBAC fail-closed as designed).

---

## Root cause

| Layer | Finding |
|-------|---------|
| Identity | No MSAL account — `VITE_ENTRA_CLIENT_ID` was empty, so Entra sign-in was not configured. |
| Role resolution | `resolveAtlasRole({ signedIn: false })` correctly returns **`Unauthenticated`**. |
| UX trap | Nav still listed finance items for Unauthenticated guests, but `FinanceRoute` requires `can('viewFinance')` which is **false** for Unauthenticated → `/access-denied`. |
| Misleading copy | Access Denied always said “No authorized Atlas role” (meant for **Unresolved** / signed-in-without-claims), which confused Owner UAT. |

**Not a broken RBAC matrix.** The app refused elevated modules because no Atlas role was established.

RBAC was **not** disabled. Silent automatic Owner grant was **not** added on page load.

---

## Decision — authorization model

| Environment | How Owner / Admin is granted |
|-------------|------------------------------|
| **local / development** | Explicit **Local Owner (Dev)** button (`VITE_ALLOW_DEV_OWNER_LOGIN=true`). Grants `HVCG Owner` (includes Administrator capabilities: Admin, Finance, Clients, etc.). Session stored in `sessionStorage` only. |
| **staging / production** | Local Owner login **hard-disabled** regardless of env flags. Requires Entra SPA + app roles `HVCG Owner` and/or `Administrator` on the user’s token (`roles` / `extension_AtlasRole` / `atlas_role`). |

Permanent production path remains Entra app role assignment per Track 10 registration docs.

---

## Fix implemented

1. `src/security/devOwnerSession.ts` — gated Local Owner session helpers.  
2. `AuthProvider` — activate / clear Local Owner; banner marks DEV ONLY session.  
3. `RoleProvider` / `rbac.ts` — apply DEV Owner role only when session active and env ≠ production/staging.  
4. Command bar — **Local Owner (Dev)** / **End Local Owner** controls.  
5. Access Denied — distinguishes Unauthenticated vs Unresolved; offers Local Owner when allowed.  
6. `.env.local` (gitignored) enables Local Owner for Owner UAT; `.env.example` documents flags.  
7. Recovery tests assert production/staging cannot honor DEV Owner session.

---

## Owner UAT steps (local)

1. Restart Elite OS after `.env.local` change:  
   `cd .worktrees/atlas-integration-release && npm run dev`  
2. Open http://127.0.0.1:5180/  
3. Click **Local Owner (Dev)** in the command bar.  
4. Confirm footer shows `role HVCG Owner` and banner includes `LOCAL OWNER SESSION (DEV ONLY)`.  
5. Walk: Executive, Banking, Accounting, Clients, Projects, Financial Intelligence, Knowledge, Reports, Settings, Administration.

---

## Permanent Entra assignment (shared / prod)

1. Set `VITE_ENTRA_CLIENT_ID` to the HVCG SPA registration (see Track 10 Entra docs).  
2. Define app roles: `HVCG Owner`, `Administrator`, …  
3. Assign the owner account those roles in Entra.  
4. Build with `VITE_ATLAS_ENV=production` (Local Owner disabled).  
5. Sign in with Microsoft — token `roles` claim must include the Atlas role.

---

## Security posture

- RBAC matrix unchanged for production.  
- No default Owner on anonymous browse.  
- DEV Owner requires explicit click + non-production env + `VITE_ALLOW_DEV_OWNER_LOGIN=true`.  
- Staging treated like production for this override (must use Entra).
