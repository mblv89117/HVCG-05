#!/usr/bin/env bash
# Generate a 32-byte AES key (base64) for QBO_TOKEN_ENCRYPTION_KEY.
# Store in Azure Key Vault as qbo-token-encryption-key — never commit.
set -euo pipefail
openssl rand -base64 32
