# QuickBooks Runbook

## Components

- `apps/atlas-qbo-api` — Node HTTP API (port **8788**)
- `apps/atlas-elite-os` — Accounting Connections UI (`/accounting`)
- Key Vault: `kv-atlas-hvcg-ebc84d85`
- Branch: `cursor/quickbooks-integration`

## Local Sandbox

```bash
cd .worktrees/quickbooks-integration
# Owner creates .secrets/qbo.env (see QuickBooksOwnerActions.md)
set -a && source .secrets/qbo.env && set +a
npm install
npm run start -w @hvcg/atlas-qbo-api
# separate terminal:
npm run dev -w @hvcg/atlas-elite-os
# open http://127.0.0.1:5180/accounting
```

Optional SPA env: `VITE_QBO_API_BASE=http://127.0.0.1:8788`

## Health check

`GET http://127.0.0.1:8788/health` → `{ ok: true, qboConfigured: true|false, env: "sandbox" }`

If `qboConfigured: false`, Connect must return 503 — do not fake success.

## Deployed (target)

1. Deploy API with Managed Identity → Key Vault Secrets User
2. Map secrets:
   - `qbo-client-id-sandbox` → `QBO_CLIENT_ID`
   - `qbo-client-secret-sandbox` → `QBO_CLIENT_SECRET`
   - `qbo-token-encryption-key` → `QBO_TOKEN_ENCRYPTION_KEY`
   - `qbo-redirect-uri` → `QBO_REDIRECT_URI`
3. Keep `QBO_ENV=sandbox` until Production GO
4. Register Intuit redirect URI to the HTTPS callback: `/api/qbo/oauth/callback`
5. Set SPA `VITE_QBO_API_BASE` to API HTTPS origin
6. CORS allow Elite OS origin only
7. Scheduler runs in-process (`QBO_SYNC_INTERVAL_MS`); for multi-instance, move to queue worker later

## Sync operations

| Action | How |
|--------|-----|
| Manual sync | UI **Manual Sync** or `POST /api/qbo/sync` |
| Resume interrupted | Same endpoint with `resume: true` (default) |
| Scheduled | Automatic when credentials configured |
| Disconnect | UI **Disconnect** — revokes tokens at Intuit when possible |

## Incident triage

| Symptom | Check |
|---------|-------|
| 503 on Connect | Secrets missing / Key Vault mapping |
| NeedsReauthorization | Refresh expired — user must Reconnect |
| Sync interrupted | Manual Sync resumes from checkpoint |
| API unreachable | Process down on :8788; CORS/origin |
| Wrong lineage on Financials | Ensure UI uses `ImportedAccounting`, not Plaid cash |

## Rollback

1. Disable Connect via feature flag / stop `atlas-qbo-api`
2. Do not delete audit/store history
3. Plaid banking remains independent

## Tests

```bash
npm run test:qbo-api
```
