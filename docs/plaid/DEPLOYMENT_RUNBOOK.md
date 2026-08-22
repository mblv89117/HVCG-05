# Plaid Deployment Runbook

## Components

- `apps/atlas-plaid-api` — Node HTTP API (package as Azure Function / Container App later)
- `apps/hvcg-client-portal` — Financial Connections UI (`/banking`)
- Key Vault: `kv-atlas-hvcg-ebc84d85`

## Local Sandbox

```bash
cd .worktrees/plaid-integration
# Owner creates .secrets/plaid.env (see OWNER_ACTIONS_PLAID.md)
set -a && source .secrets/plaid.env && set +a
cd apps/atlas-plaid-api && npm install && npm run start
# separate terminal:
cd apps/hvcg-client-portal && npm install && npm run dev
# open http://127.0.0.1:5173/banking
```

## Deployed (target)

1. Deploy API with Managed Identity → Key Vault Secrets User  
2. Map secrets: `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_TOKEN_ENCRYPTION_KEY`, `PLAID_WEBHOOK_URL`  
3. Set `PLAID_ENV=sandbox` until Production GO  
4. Configure SWA / portal `VITE_PLAID_API_BASE` to API HTTPS origin  
5. Allow CORS origins for portal host only  
6. TLS 1.2+ enforced at App Gateway / Azure default  

## Health check

`GET /health` → `{ plaidConfigured: true, env: "sandbox" }`

## Rollback

1. Disable Connect Bank button via feature flag (portal)  
2. Scale API to 0  
3. Do not delete audit/store history  
