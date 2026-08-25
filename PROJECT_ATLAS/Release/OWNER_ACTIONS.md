# Owner Actions — Atlas Integration Release

**Do not paste secrets into Cursor chat, Slack, or tickets.**

## 1. Open the integrated app (now)

1. Confirm servers (Integration agent may already have them running):
   - UI: http://127.0.0.1:5180/
   - Optional API: http://127.0.0.1:8787/health → expect `"plaidConfigured":false` until step 2
2. Navigate primary items: Home, Executive Dashboard, Clients, Projects, Tasks, Documents, Financial Intelligence, Banking, Accounting, Knowledge, Automations, Reports, Administration, Settings.
3. Use the **client dropdown** in the command bar to switch HVCG vs Colorado Craft Beef.

## 2. Add Plaid Sandbox secrets securely (local)

```bash
cd "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/atlas-integration-release"
mkdir -p .secrets && chmod 700 .secrets
cp apps/atlas-plaid-api/.env.example .secrets/plaid.env
# Edit .secrets/plaid.env in a local editor — fill PLAID_CLIENT_ID, PLAID_SECRET
bash scripts/plaid/generate-encryption-key.sh
# Put generated key into PLAID_TOKEN_ENCRYPTION_KEY in .secrets/plaid.env
chmod 600 .secrets/plaid.env
set -a && source .secrets/plaid.env && set +a
npm run start -w @hvcg/atlas-plaid-api
```

Confirm: `curl -s http://127.0.0.1:8787/health` shows `"plaidConfigured":true`.

## 3. Azure Key Vault (Sandbox names only)

Vault: `kv-atlas-hvcg-ebc84d85`

```bash
az keyvault secret set --vault-name kv-atlas-hvcg-ebc84d85 --name plaid-client-id-sandbox --value '<FROM_PLAID_DASHBOARD>'
az keyvault secret set --vault-name kv-atlas-hvcg-ebc84d85 --name plaid-secret-sandbox --value '<FROM_PLAID_DASHBOARD>'
az keyvault secret set --vault-name kv-atlas-hvcg-ebc84d85 --name plaid-token-encryption-key --value '<GENERATED_KEY>'
```

**Do not create Production Plaid secrets until Sandbox QA GO.**

## 4. Entra SPA registration

Set local (gitignored) Vite env for Elite OS per Microsoft architecture docs:

- `VITE_ENTRA_CLIENT_ID`
- Related redirect URI for `http://127.0.0.1:5180`

## 5. Decisions needed

| Decision | Options |
|----------|---------|
| QuickBooks | Assign specialist agent vs defer |
| Client Portal merge | After BL-C1 |
| Redeploy Dev SWA from integration branch | After QA ACK |
| Production | Blocked until QA written GO |

Full Plaid owner doc: `PROJECT_ATLAS/QA/PlaidIntegration/OWNER_ACTIONS_PLAID.md`
