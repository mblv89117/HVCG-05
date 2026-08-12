/**
 * Runtime configuration — secrets from env / Key Vault inject only.
 * Never log secret values.
 */

import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import type { ProviderId } from '@hvcg/atlas-integration-core';

function defaultDataDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '.data', 'integrations');
}

function resolveEncryptionKey(): string {
  const existing = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY || '';
  if (existing) return existing;
  if (process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY === '1') {
    const ephemeral = randomBytes(32).toString('base64');
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'Using ephemeral INTEGRATION_TOKEN_ENCRYPTION_KEY — tokens will not survive restart',
      }),
    );
    return ephemeral;
  }
  throw new Error(
    'INTEGRATION_TOKEN_ENCRYPTION_KEY missing. Set via Key Vault or INTEGRATION_ALLOW_EPHEMERAL_KEY=1 for local dev.',
  );
}

export class UnsafeHubConfigurationError extends Error {
  readonly code = 'unsafe_hub_configuration';
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeHubConfigurationError';
  }
}

export type EnvMap = Record<string, string | undefined>;

function parseEnvFlag(raw: string | undefined): boolean | undefined {
  if (raw === undefined || raw === '') return undefined;
  const v = raw.trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
  if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
  return undefined;
}

/** Loopback bind hosts that may host explicit insecure development auth. */
export function isLoopbackBindHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[|\]$/g, '');
  return h === '127.0.0.1' || h === '::1' || h === 'localhost';
}

export interface HubRuntimeSecurity {
  host: string;
  requireAuth: boolean;
  insecureDevAuth: boolean;
  isProduction: boolean;
}

/**
 * Fail-closed Hub bind + authentication policy.
 * Auth is required by default. Production cannot disable auth.
 * Insecure development auth requires an explicit opt-in and a loopback bind.
 */
export function resolveHubRuntimeSecurity(env: EnvMap = process.env): HubRuntimeSecurity {
  const isProduction = (env.NODE_ENV || 'development') === 'production';
  const host = (env.INTEGRATION_HOST || '127.0.0.1').trim() || '127.0.0.1';
  const loopback = isLoopbackBindHost(host);
  const allowInsecureDev = parseEnvFlag(env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH) === true;
  const requireAuthExplicit = parseEnvFlag(env.INTEGRATION_REQUIRE_AUTH);

  if (isProduction) {
    if (requireAuthExplicit === false) {
      throw new UnsafeHubConfigurationError(
        'Unsafe configuration: INTEGRATION_REQUIRE_AUTH=false is not allowed when NODE_ENV=production',
      );
    }
    if (allowInsecureDev) {
      throw new UnsafeHubConfigurationError(
        'Unsafe configuration: INTEGRATION_ALLOW_INSECURE_DEV_AUTH is not allowed when NODE_ENV=production',
      );
    }
    return { host, requireAuth: true, insecureDevAuth: false, isProduction };
  }

  const wantsInsecure = allowInsecureDev || requireAuthExplicit === false;
  if (wantsInsecure) {
    if (!allowInsecureDev) {
      throw new UnsafeHubConfigurationError(
        'Unsafe configuration: INTEGRATION_REQUIRE_AUTH=false requires INTEGRATION_ALLOW_INSECURE_DEV_AUTH=true',
      );
    }
    if (!loopback) {
      throw new UnsafeHubConfigurationError(
        'Unsafe configuration: insecure development auth is only allowed on a loopback bind (INTEGRATION_HOST=127.0.0.1, ::1, or localhost)',
      );
    }
    return { host, requireAuth: false, insecureDevAuth: true, isProduction };
  }

  return { host, requireAuth: true, insecureDevAuth: false, isProduction };
}

export type PmBackendMode = 'development-json' | 'unavailable';
export type PmBackendClassification = 'development-local' | 'unavailable';

export interface HubPmBackend {
  mode: PmBackendMode;
  classification: PmBackendClassification;
  /** True only when local JSON is an explicit, non-production opt-in. */
  localJsonAuthorized: boolean;
}

/**
 * PM persistence mode.
 *
 * `pm-store.json` is development/local state only. It is not SharePoint, not
 * production, and not an approved operational system of record.
 *
 * Approved values:
 * - unset / `unavailable` / `none` — PM persistence is not configured
 * - `development-json` or `local-json` — explicit local JSON (non-production only)
 *
 * Production plus local JSON is rejected at configuration time (fail closed).
 * Unknown values, including unimplemented backends such as SharePoint, are rejected.
 */
export function resolvePmBackend(env: EnvMap = process.env): HubPmBackend {
  const isProduction = (env.NODE_ENV || 'development') === 'production';
  const raw = (env.INTEGRATION_PM_BACKEND || '').trim().toLowerCase();
  const localJsonRequested = raw === 'development-json' || raw === 'local-json';
  const unavailableRequested =
    raw === '' || raw === 'unavailable' || raw === 'none' || raw === 'not-configured';

  if (isProduction && localJsonRequested) {
    throw new UnsafeHubConfigurationError(
      'Unsafe configuration: the development PM JSON store (INTEGRATION_PM_BACKEND=development-json) is not allowed when NODE_ENV=production. pm-store.json is development/local state only and is not an approved production operational system of record.',
    );
  }

  if (localJsonRequested) {
    return {
      mode: 'development-json',
      classification: 'development-local',
      localJsonAuthorized: true,
    };
  }

  if (unavailableRequested) {
    return {
      mode: 'unavailable',
      classification: 'unavailable',
      localJsonAuthorized: false,
    };
  }

  throw new UnsafeHubConfigurationError(
    `Unsafe configuration: INTEGRATION_PM_BACKEND=${raw} is not an approved PM backend. Approved values: development-json (non-production only), or unset/unavailable. SharePoint PM persistence is not implemented and must not be claimed.`,
  );
}

export function loadConfig() {
  const security = resolveHubRuntimeSecurity();
  const pmBackend = resolvePmBackend();
  return {
    port: Number(process.env.INTEGRATION_API_PORT || 8790),
    host: security.host,
    tokenEncryptionKeyB64: resolveEncryptionKey(),
    dataDir: process.env.INTEGRATION_DATA_DIR || defaultDataDir(),
    requireAuth: security.requireAuth,
    insecureDevAuth: security.insecureDevAuth,
    pmBackend,
    /**
     * Test-only JWT verifier. Production loadConfig never sets this.
     * Authenticated identity still comes from the verified payload, never from request headers.
     */
    verifyAccessToken: undefined as
      | ((token: string) => Promise<Record<string, unknown>>)
      | undefined,
    allowedOrigins: (
      process.env.INTEGRATION_ALLOWED_ORIGINS ||
      [
        'http://127.0.0.1:5180',
        'http://localhost:5180',
        'http://127.0.0.1:5173',
        'http://localhost:5173',
        'https://zealous-rock-0090c7e1e.7.azurestaticapps.net',
      ].join(',')
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    /** Entra JWT audiences accepted for hub Bearer auth (Hub API app only). */
    acceptedAudiences: (
      process.env.INTEGRATION_ACCEPTED_AUDIENCES ||
      [
        process.env.MICROSOFT_CLIENT_ID
          ? `api://${process.env.MICROSOFT_CLIENT_ID}`
          : '',
        process.env.MICROSOFT_CLIENT_ID || '',
      ]
        .filter(Boolean)
        .join(',')
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    /**
     * Required delegated scope in access-token `scp` (e.g. access_as_user).
     * Empty disables scope claim checks (dev only).
     */
    requiredScope: (process.env.INTEGRATION_REQUIRED_SCOPE || 'access_as_user').trim(),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:8790',
    microsoft: {
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      redirectUri:
        process.env.MICROSOFT_REDIRECT_URI ||
        `${process.env.PUBLIC_BASE_URL || 'http://localhost:8790'}/api/oauth/microsoft/callback`,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        `${process.env.PUBLIC_BASE_URL || 'http://localhost:8790'}/api/oauth/google/callback`,
    },
    github: {
      appId: process.env.GITHUB_APP_ID || '',
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      clientId: process.env.GITHUB_APP_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET || '',
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
      redirectUri:
        process.env.GITHUB_REDIRECT_URI ||
        `${process.env.PUBLIC_BASE_URL || 'http://localhost:8790'}/api/oauth/github/callback`,
    },
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;

export function isMicrosoftConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.microsoft.clientId);
}

export function isGoogleConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.google.clientId && cfg.google.clientSecret);
}

export function isGitHubConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.github.appId && cfg.github.privateKey);
}

export function isGitHubOAuthConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.github.clientId && cfg.github.clientSecret);
}

export function assertProviderConfigured(provider: ProviderId, cfg: AppConfig): void {
  if (provider === 'microsoft') {
    if (!isMicrosoftConfigured(cfg)) {
      throw Object.assign(new Error('Microsoft OAuth not configured. Set MICROSOFT_CLIENT_ID.'), {
        status: 503,
        code: 'microsoft_not_configured',
      });
    }
    return;
  }
  if (provider === 'google') {
    if (!isGoogleConfigured(cfg)) {
      throw Object.assign(
        new Error('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'),
        { status: 503, code: 'google_not_configured' },
      );
    }
    return;
  }
  if (provider === 'github') {
    if (!isGitHubOAuthConfigured(cfg) && !isGitHubConfigured(cfg)) {
      throw Object.assign(
        new Error(
          'GitHub not configured. Set GITHUB_APP_CLIENT_ID/SECRET or GITHUB_APP_ID/PRIVATE_KEY for App install.',
        ),
        { status: 503, code: 'github_not_configured' },
      );
    }
  }
}
