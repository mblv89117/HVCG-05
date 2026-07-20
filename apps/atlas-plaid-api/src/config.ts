/**
 * Runtime configuration — secrets from env / Key Vault inject only.
 * Never log secret values.
 */

export type PlaidEnv = 'sandbox' | 'development' | 'production';

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v == null || v === '') {
    throw new Error(`Missing required configuration: ${name}`);
  }
  return v;
}

export function loadConfig() {
  const plaidEnv = (process.env.PLAID_ENV || 'sandbox') as PlaidEnv;
  return {
    port: Number(process.env.PLAID_API_PORT || 8787),
    plaidEnv,
    /** Public client id — still not for browser embedding of secret */
    plaidClientId: process.env.PLAID_CLIENT_ID || '',
    plaidSecret: process.env.PLAID_SECRET || '',
    /** 32-byte key as base64 — from Key Vault `plaid-token-encryption-key` */
    tokenEncryptionKeyB64: process.env.PLAID_TOKEN_ENCRYPTION_KEY || '',
    webhookUrl: process.env.PLAID_WEBHOOK_URL || '',
    dataDir: process.env.PLAID_DATA_DIR || new URL('../.data', import.meta.url).pathname,
    requireAuth: process.env.PLAID_REQUIRE_AUTH !== 'false',
    allowedOrigins: (process.env.PLAID_ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173').split(','),
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;

export function assertPlaidConfigured(cfg: AppConfig): void {
  if (!cfg.plaidClientId || !cfg.plaidSecret) {
    throw new Error(
      'Plaid credentials not configured. Set PLAID_CLIENT_ID and PLAID_SECRET via local .secrets or Azure Key Vault. See OWNER_ACTIONS_PLAID.md.',
    );
  }
  if (!cfg.tokenEncryptionKeyB64) {
    throw new Error(
      'PLAID_TOKEN_ENCRYPTION_KEY missing. Generate with scripts/plaid/generate-encryption-key.sh and store in Key Vault.',
    );
  }
}

export function isPlaidConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.plaidClientId && cfg.plaidSecret && cfg.tokenEncryptionKeyB64);
}
