# Plaid Credential Rotation Runbook

## When to rotate

- Suspected exposure  
- Quarterly schedule  
- Environment promotion (Sandbox → Development → Production)  
- Staff offboarding with Key Vault access  

## Steps

1. Generate new encryption key only if ciphertext must be re-wrapped (breaking — requires re-link of Items). Prefer rotating **Plaid secret** first.
2. In Plaid Dashboard, rotate Sandbox/Production secret.
3. Update Key Vault:
   ```bash
   az keyvault secret set --vault-name kv-atlas-hvcg-ebc84d85 --name plaid-secret-sandbox --value '<NEW>'
   ```
4. Restart API instances to pick up new secret.
5. Verify `GET /health` and a Sandbox Link test.
6. Audit: record rotation event (no secret values) in change log.

## Never

- Commit new secrets  
- Share secrets in chat  
- Leave old secrets in shell history (clear history after)
