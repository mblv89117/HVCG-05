# UAT-ENV-002 — Local Owner Development Authentication Failure

**ID:** `UAT-ENV-002`  
**Classification:** `UAT_ENVIRONMENT / LOCAL_OWNER_DEV_AUTH_NOT_WORKING`  
**State:** `CLOSED_REMEDIATED`  
**As of:** 2026-08-12  
**Related:** UAT-01 temporarily `BLOCKED_ENVIRONMENT` → restored to `OWNER_ACTION_REQUIRED` after browser proof  
**UAT-FIND-001:** remains `REMEDIATED_READY_FOR_RETEST` (not closed)

## Symptom (Owner-observed)

- Clicking Local Owner Development path → **Sign-in required**
- Toast/copy: Entra SPA client ID missing · set `VITE_ENTRA_CLIENT_ID`
- Footer: **role Unauthenticated**

## Root cause

Provenance-locked Elite restart set `VITE_ATLAS_*` / Hub base but **omitted** `VITE_ALLOW_DEV_OWNER_LOGIN=true`.

Canonical gate `isDevOwnerLoginAllowed()` required that exact flag (and denied production/staging). Without it:

1. Local Owner button path disabled  
2. UI fell through to Entra-missing control  
3. Missing `VITE_ENTRA_CLIENT_ID` was misread as the blocker — Entra absence was **not** the primary defect; the Local Owner allow-flag was  

Environment remained Vite `DEV=true` / non-Production; Atlas env after fix is `local`.

## Remediation

1. `.env.local` (gitignored): `VITE_ALLOW_DEV_OWNER_LOGIN=true`, `VITE_ATLAS_ENV=local`, Hub `:8792`, provenance SHA  
2. Harden `isDevOwnerLoginAllowed()`: also allow when Vite `import.meta.env.DEV` and Atlas env is `local`|`development` — still hard-deny production/staging  
3. Access-denied / AppShell copy: Development may use Local Owner without Entra  
4. Restart Elite from `atlas-usable-operating-layer` on `:5180`

## Hub `REQUIRE_AUTH=false` note

UAT Hub `:8792` with `REQUIRE_AUTH=false` accepts header principal **or** falls back to local `dev-user` / Admin / `*` if headers absent. This is a controlled Dev Hub posture — **not** Production auth. Elite Local Owner still sends Dev principal headers on BA lead calls; fail-closed Entra Hub remains on `:8793` for preflight. Anonymous unrestricted Hub access is a documented UAT residual risk — not used as the Elite security model.

## Browser E2E (proven)

Local Owner (Dev) → session (**End Local Owner**, role **HVCG Owner**) → Clients → **New Prospect** → `/clients/intake` with **Create prospect** form. No Sign-in required. No Entra client ID required.

## Prevention

- Persist Local Owner allow in gitignored `.env.local` for UAT  
- Vite DEV fallback so provenance restarts cannot silently disable Local Owner  
- Keep `CORRECT_RUNTIME_PROVENANCE` + Local Owner gate in session precheck  

## Distinct from UAT-ENV-001

| Finding | Issue |
|---------|--------|
| UAT-ENV-001 | Wrong worktree on `:5180` |
| UAT-ENV-002 | Local Owner Dev auth flag / UX path broken |
