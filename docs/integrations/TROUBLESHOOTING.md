# Integration Hub Troubleshooting

## Hub offline in Connections Center

1. Confirm API: `curl -s http://127.0.0.1:8790/health`  
2. Start: `INTEGRATION_ALLOW_EPHEMERAL_KEY=1 npm run dev:integration-api`  
3. Confirm `VITE_INTEGRATION_API_BASE` matches the API origin  

## Provider shows “needs credentials”

Set the corresponding Client ID/Secret in `.secrets/integration.env` and restart the API. Health payload lists `providers.microsoft|google|github`.

## OAuth callback fails

- Redirect URI must **exactly** match the app registration  
- State must not be reused (one-time)  
- Clock skew: ensure system time is accurate  

## Tokens expire / NeedsReauthorization

Use **Reauthorize** in Connections Center. Atlas sends one actionable reauth request; refresh tokens are used automatically when valid.

## Sync errors / retries

Failed records are isolated. Check **Errors** and **Sync Jobs** tabs. Dead-letter after max retry attempts. Fix the underlying issue (permissions, rate limit) then **Sync** again.

## Revoked access

Provider revoke → verify fails → status `NeedsReauthorization` / `Revoked`. Disconnect or reauthorize. Do not bypass MFA or Conditional Access.

## Secrets rotation

1. Create new Key Vault / env secret version  
2. Restart Integration Hub  
3. Reauthorize connections if refresh tokens were bound to old client secret  
4. Revoke old secret after validation  

## Disaster recovery

Connection metadata + encrypted tokens live under `INTEGRATION_DATA_DIR` (local) or durable store (Azure). Restore encrypted store + encryption key together; key loss means reauthorization for all providers.
