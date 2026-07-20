# QuickBooks Owner Actions

Owner-only steps. **Never paste Client Secret, encryption keys, or tokens into chat.**

## 1. Create Intuit Developer app (Sandbox)

1. Sign in at [Intuit Developer](https://developer.intuit.com/).
2. Create an app with **Accounting** scope (`com.intuit.quickbooks.accounting`).
3. Add Redirect URI exactly:
   - Local: `http://127.0.0.1:8788/api/qbo/oauth/callback`
   - Deployed: `https://<api-host>/api/qbo/oauth/callback`
4. Copy **Client ID** and **Client Secret** (Sandbox).

## 2. Generate token encryption key

```bash
bash scripts/qbo/generate-encryption-key.sh
```

Store output as Key Vault secret `qbo-token-encryption-key` (and locally in `.secrets/qbo.env` only).

## 3. Azure Key Vault secrets

Vault: `kv-atlas-hvcg-ebc84d85`

| Secret name | Env var |
|-------------|---------|
| `qbo-client-id-sandbox` | `QBO_CLIENT_ID` |
| `qbo-client-secret-sandbox` | `QBO_CLIENT_SECRET` |
| `qbo-token-encryption-key` | `QBO_TOKEN_ENCRYPTION_KEY` |
| `qbo-redirect-uri` | `QBO_REDIRECT_URI` |

Do **not** create `VITE_*` secrets for Client Secret or tokens.

## 4. Local `.secrets/qbo.env`

```bash
cp apps/atlas-qbo-api/.env.example .secrets/qbo.env
# fill QBO_CLIENT_ID, QBO_CLIENT_SECRET, QBO_TOKEN_ENCRYPTION_KEY
# ensure .secrets/ is gitignored
```

## 5. Verify without faking

```bash
set -a && source .secrets/qbo.env && set +a
npm run start -w @hvcg/atlas-qbo-api
curl -s http://127.0.0.1:8788/health
# expect qboConfigured: true
```

Open `/accounting` → accept consent → **Connect QuickBooks** → complete Intuit Sandbox company selection.

## 6. Production GO (later)

Blocked until QA sign-off:

- Switch Intuit app to Production keys
- New Key Vault secrets (`*-production`)
- `QBO_ENV=production`
- Update redirect URI allowlist
- Confirm lineage still separates Plaid vs QBO

## Out of scope for Owner chat

Agents must not request secrets in conversation. If credentials are unavailable, the branch remains mergeable with honest `qboConfigured: false` / HTTP 503 behavior.
