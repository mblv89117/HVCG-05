#!/usr/bin/env bash
# Generate a 32-byte AES key for PLAID_TOKEN_ENCRYPTION_KEY.
# Print instructions only — does not write secrets into the repo.
set -euo pipefail
KEY=$(openssl rand -base64 32)
echo "Generated encryption key (base64). Store it securely:"
echo ""
echo "  Local:  export PLAID_TOKEN_ENCRYPTION_KEY='<paste>'"
echo "          or write to .secrets/plaid.env (gitignored)"
echo ""
echo "  Azure:  az keyvault secret set \\"
echo "            --vault-name kv-atlas-hvcg-ebc84d85 \\"
echo "            --name plaid-token-encryption-key \\"
echo "            --value '<paste>'"
echo ""
echo "Key material (copy once, then clear terminal history):"
echo "$KEY"
