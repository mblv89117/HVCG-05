# Owner Actions — Plaid Secrets (DO NOT PASTE SECRETS INTO CHAT)

**Vault:** `kv-atlas-hvcg-ebc84d85`  
**URI:** `https://kv-atlas-hvcg-ebc84d85.vault.azure.net/`

## 1. Confirm environment

Reply in Atlas/Master PM channel with: **Sandbox** (required first) or **Production** (blocked until Sandbox QA GO).

## 2. Sandbox Client ID (local)

Create a gitignored file (never commit):

```bash
cd .worktrees/plaid-integration
mkdir -p .secrets
chmod 700 .secrets
cat > .secrets/plaid.env <<'EOF'
PLAID_ENV=sandbox
PLAID_CLIENT_ID=<paste_from_Plaid_dashboard>
PLAID_SECRET=<paste_from_Plaid_dashboard>
PLAID_TOKEN_ENCRYPTION_KEY=<from_generate_script>
PLAID_WEBHOOK_URL=
PLAID_API_PORT=8787
PLAID_REQUIRE_AUTH=true
EOF
chmod 600 .secrets/plaid.env
```

Load before starting the API:

```bash
set -a && source .secrets/plaid.env && set +a
npm run start -w @hvcg/atlas-plaid-api
```

## 3. Sandbox secrets → Azure Key Vault

```bash
az keyvault secret set --vault-name kv-atlas-hvcg-ebc84d85 --name plaid-client-id-sandbox --value '<FROM_PLAID_DASHBOARD>'
az keyvault secret set --vault-name kv-atlas-hvcg-ebc84d85 --name plaid-secret-sandbox --value '<FROM_PLAID_DASHBOARD>'
bash scripts/plaid/generate-encryption-key.sh
# then:
az keyvault secret set --vault-name kv-atlas-hvcg-ebc84d85 --name plaid-token-encryption-key --value '<GENERATED_KEY>'
```

## 4. Webhook domain

Provide an HTTPS public URL for `POST /api/plaid/webhook` (Azure Function / App Service).  
Set secret name `plaid-webhook-url` after approval.

## 5. Production secrets

**Do not create Production Plaid secrets until Sandbox QA GO + Security GO.**

Planned names: `plaid-client-id-production`, `plaid-secret-production`.

## Never

- Paste secrets into Cursor chat, Slack, email, or tickets  
- Commit `.secrets/` or Key Vault values  
- Put Plaid secret in any `VITE_*` variable  
