/**
 * Runtime configuration — secrets from env / Key Vault inject only.
 * Never log secret values.
 */

export type QboEnv = 'sandbox' | 'production';

export function loadConfig() {
  const qboEnv = (process.env.QBO_ENV || 'sandbox') as QboEnv;
  return {
    port: Number(process.env.QBO_API_PORT || 8788),
    qboEnv,
    clientId: process.env.QBO_CLIENT_ID || '',
    clientSecret: process.env.QBO_CLIENT_SECRET || '',
    redirectUri:
      process.env.QBO_REDIRECT_URI || 'http://127.0.0.1:8788/api/qbo/oauth/callback',
    /** 32-byte key as base64 — from Key Vault `qbo-token-encryption-key` */
    tokenEncryptionKeyB64: process.env.QBO_TOKEN_ENCRYPTION_KEY || '',
    dataDir: process.env.QBO_DATA_DIR || new URL('../.data', import.meta.url).pathname,
    requireAuth: process.env.QBO_REQUIRE_AUTH !== 'false',
    allowedOrigins: (
      process.env.QBO_ALLOWED_ORIGINS ||
      'http://127.0.0.1:5180,http://localhost:5180,http://127.0.0.1:5173,http://localhost:5173'
    ).split(','),
    syncIntervalMs: Number(process.env.QBO_SYNC_INTERVAL_MS || 15 * 60 * 1000),
    frontendSuccessRedirect:
      process.env.QBO_FRONTEND_SUCCESS_REDIRECT || 'http://127.0.0.1:5180/accounting',
    frontendErrorRedirect:
      process.env.QBO_FRONTEND_ERROR_REDIRECT || 'http://127.0.0.1:5180/accounting',
    authorizeBaseUrl: 'https://appcenter.intuit.com/connect/oauth2',
    tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    revokeUrl: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
    apiBaseUrl:
      qboEnv === 'production'
        ? 'https://quickbooks.api.intuit.com'
        : 'https://sandbox-quickbooks.api.intuit.com',
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;

export function assertQboConfigured(cfg: AppConfig): void {
  if (!cfg.clientId || !cfg.clientSecret) {
    throw new Error(
      'QuickBooks credentials not configured. Set QBO_CLIENT_ID and QBO_CLIENT_SECRET via local .secrets or Azure Key Vault. See QuickBooksOwnerActions.md.',
    );
  }
  if (!cfg.tokenEncryptionKeyB64) {
    throw new Error(
      'QBO_TOKEN_ENCRYPTION_KEY missing. Generate with scripts/qbo/generate-encryption-key.sh and store in Key Vault.',
    );
  }
}

export function isQboConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.clientId && cfg.clientSecret && cfg.tokenEncryptionKeyB64);
}
