# ATLAS-R-002 Blocked — Invalid Cursor API Key

**Status:** Blocked (owner-only secret required)  
**Worktree:** `/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/sprint12-engineering-orchestration`  
**Control branch:** `cursor/orchestration-sprint12`  
**Control tip at dispatch:** `9891e1df6df8d9be426a8e3ca45ffcdd49584656`

## Execution facts

| Field | Value |
|---|---|
| Task ID | ATLAS-R-002 |
| Dispatch method | cursor-cloud-agents-api |
| Start | 2026-07-20T01:08:22Z |
| End | 2026-07-20T01:08:22Z |
| Status | blocked |
| Cloud Agent run ID | null (not created) |
| Branch prepared | `cursor/documentation-manager/runtime-validation-ATLAS-R-002` @ `9891e1d` (pushed; empty of validation file) |
| Commit hash (validation change) | null |
| Files changed | none |
| Retry count | 0 |
| Usage | null |
| Error | HTTP 401 `Invalid User API Key` |

## Auth diagnosis (no secret values)

- `CURSOR_API_KEY` env: absent  
- `PROJECT_ATLAS/runtime/secrets/cursor_api_key` file: absent  
- Keychain service `CURSOR_API_KEY`: present  
- Loaded credential length: 182  
- Looks like Cursor user key prefix (`key_` / `cursor_` / `crsr_`): false (hex-like)  
- `POST /v1/agents` Basic: 401  
- `GET /v1/models` Basic: 401  
- `GET /v1/models` Bearer: 401  

## Validation branch

Pushed intentionally for the run; **not merged**. No cloud-agent commit was made on it.

## Owner action required (exactly one)

Replace Keychain service `CURSOR_API_KEY` with a **valid Cursor User API Key** from [Cursor Dashboard → Integrations / API Keys](https://cursor.com/dashboard/integrations), then re-run ATLAS-R-002.

Why: the dispatcher and validation branch are ready; the API rejects the current Keychain value, and creating a valid API key is owner-only.


## Resume auth check (2026-07-20T01:15:47Z)

| Field | Value |
|---|---|
| Endpoint | `GET https://api.cursor.com/v1/models` |
| HTTP status | `401` |
| Response body | `{{"code":"error","message":"Invalid User API Key"}}` |
| Keychain mdat | `20260720010111Z` (unchanged since first failure) |
| Env / file key | absent |
| Dispatch attempted on resume | **No** |
