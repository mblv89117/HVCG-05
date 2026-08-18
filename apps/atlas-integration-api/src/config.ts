/**
 * Runtime configuration — secrets from env / Key Vault inject only.
 * Never log secret values.
 */

import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import type { ProviderId } from '@hvcg/atlas-integration-core';
import { isCanonicalClientCode } from './entitlements/clientCode.ts';
import type { UserBasicLookup } from './entitlements/userLookup.ts';
import type { CapitalGraphTransport } from './capital/sharepoint/graph.ts';
import type { SharePointCapitalSettings } from './capital/sharepoint/settings.ts';
import {
  resolveSharePointCapitalSettings,
  SharePointCapitalSettingsError,
} from './capital/sharepoint/settings.ts';
import type { PmGraphTransport } from './pm/sharepoint/graph.ts';
import type { SharePointPmSettings } from './pm/sharepoint/settings.ts';
import { resolveSharePointPmSettings, SharePointPmSettingsError } from './pm/sharepoint/settings.ts';
import { createManagedIdentityTokenProvider, type PmGraphTokenProvider } from './pm/sharepoint/token.ts';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

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

export interface BaClientSettings {
  baseUrl: string | null;
  timeoutMs: number;
  healthTimeoutMs: number;
}

/**
 * BA HTTP client settings. Hub starts without a BA URL.
 * Production cannot use localhost and cannot use http.
 */
export function resolveBaClientSettings(env: EnvMap = process.env): BaClientSettings {
  const isProduction = (env.NODE_ENV || 'development') === 'production';
  const raw = (env.INTEGRATION_BA_BASE_URL || '').trim().replace(/\/$/, '');
  const timeoutMs = Math.min(Math.max(Number(env.INTEGRATION_BA_TIMEOUT_MS || 15_000) || 15_000, 1_000), 30_000);
  const healthTimeoutMs = Math.min(
    Math.max(Number(env.INTEGRATION_BA_HEALTH_TIMEOUT_MS || 800) || 800, 100),
    5_000,
  );
  if (!raw) {
    return { baseUrl: null, timeoutMs, healthTimeoutMs };
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new UnsafeHubConfigurationError('INTEGRATION_BA_BASE_URL is not a valid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UnsafeHubConfigurationError('INTEGRATION_BA_BASE_URL must be http or https');
  }
  if (isProduction && LOOPBACK_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new UnsafeHubConfigurationError('INTEGRATION_BA_BASE_URL must not be localhost in production');
  }
  if (isProduction && parsed.protocol !== 'https:') {
    throw new UnsafeHubConfigurationError('INTEGRATION_BA_BASE_URL must be https in production');
  }
  return { baseUrl: raw, timeoutMs, healthTimeoutMs };
}

const BA_APPLICATION_ID_URI = /^api:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Production Hub→BA tokens come only from the App Service managed-identity endpoint
 * for INTEGRATION_BA_RESOURCE (BA Application ID URI). Static INTEGRATION_BA_S2S_TOKEN
 * is never used in production. Unset BA URL keeps the provider unset (fail closed at invoke).
 */
export function resolveProductionBaS2sToken(
  env: EnvMap = process.env,
  ba: BaClientSettings = resolveBaClientSettings(env),
): (() => Promise<string | undefined>) | undefined {
  const isProduction = (env.NODE_ENV || 'development') === 'production';
  if (!isProduction || !ba.baseUrl) return undefined;

  const resource = (env.INTEGRATION_BA_RESOURCE || '').trim();
  const clientId = (env.AZURE_CLIENT_ID || '').trim();
  if (!resource) {
    throw new UnsafeHubConfigurationError(
      'INTEGRATION_BA_RESOURCE is required when INTEGRATION_BA_BASE_URL is set in production',
    );
  }
  if (!BA_APPLICATION_ID_URI.test(resource)) {
    throw new UnsafeHubConfigurationError('INTEGRATION_BA_RESOURCE must be an api:// application ID URI');
  }
  if (!clientId) {
    throw new UnsafeHubConfigurationError(
      'AZURE_CLIENT_ID is required when INTEGRATION_BA_BASE_URL is set in production',
    );
  }
  const provider = createManagedIdentityTokenProvider(clientId, { resource });
  return async () => {
    try {
      return await provider.getToken();
    } catch {
      return undefined;
    }
  };
}

export type PmBackendMode = 'development-json' | 'unavailable' | 'sharepoint';
export type PmBackendClassification = 'development-local' | 'unavailable' | 'sharepoint-graph';

export interface HubPmBackend {
  mode: PmBackendMode;
  classification: PmBackendClassification;
  /** True only when local JSON is an explicit, non-production opt-in. */
  localJsonAuthorized: boolean;
  sharepoint?: SharePointPmSettings;
  credentialMode?: 'managed_identity' | 'none' | 'development-json';
  configComplete?: boolean;
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
 * - `sharepoint` — production Graph repository when site/list/managed-identity IDs are valid
 *
 * Production plus local JSON is rejected at configuration time (fail closed).
 * SharePoint is never selected silently and never falls back to JSON.
 */
export function resolvePmBackend(env: EnvMap = process.env): HubPmBackend {
  const isProduction = (env.NODE_ENV || 'development') === 'production';
  const raw = (env.INTEGRATION_PM_BACKEND || '').trim().toLowerCase();
  const localJsonRequested = raw === 'development-json' || raw === 'local-json';
  const unavailableRequested =
    raw === '' || raw === 'unavailable' || raw === 'none' || raw === 'not-configured';
  const sharepointRequested = raw === 'sharepoint';

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
      credentialMode: 'development-json',
      configComplete: true,
    };
  }

  if (unavailableRequested) {
    return {
      mode: 'unavailable',
      classification: 'unavailable',
      localJsonAuthorized: false,
      credentialMode: 'none',
      configComplete: false,
    };
  }

  if (sharepointRequested) {
    try {
      const sharepoint = resolveSharePointPmSettings(env);
      return {
        mode: 'sharepoint',
        classification: 'sharepoint-graph',
        localJsonAuthorized: false,
        sharepoint,
        credentialMode: 'managed_identity',
        configComplete: true,
      };
    } catch (err) {
      if (err instanceof SharePointPmSettingsError) {
        throw new UnsafeHubConfigurationError(err.message);
      }
      throw err;
    }
  }

  throw new UnsafeHubConfigurationError(
    `Unsafe configuration: INTEGRATION_PM_BACKEND=${raw} is not an approved PM backend. Approved values: development-json (non-production only), sharepoint (explicit site/list IDs), or unset/unavailable.`,
  );
}

export type CapitalBackendMode = 'development-json' | 'unavailable' | 'sharepoint';
export type CapitalBackendClassification = 'development-local' | 'unavailable' | 'sharepoint-graph';

export interface HubCapitalBackend {
  mode: CapitalBackendMode;
  classification: CapitalBackendClassification;
  /** True only when local JSON is an explicit, non-production opt-in. */
  localJsonAuthorized: boolean;
  sharepoint?: SharePointCapitalSettings;
  credentialMode?: 'managed_identity' | 'none' | 'development-json';
  configComplete?: boolean;
}

/**
 * Capital persistence mode.
 *
 * `capital-operations.json` is development/local state only. It is not SharePoint,
 * not production, and not an approved operational system of record.
 *
 * Approved values:
 * - unset / `unavailable` / `none` — capital persistence is not configured
 * - `development-json` or `local-json` — explicit local JSON (non-production only)
 * - `sharepoint` — Graph repository when site/list/managed-identity IDs are valid
 *
 * Production plus local JSON is rejected at configuration time (fail closed).
 * SharePoint is never selected silently and never falls back to JSON.
 * Capital list IDs are never mixed into the PM allowlist.
 */
export function resolveCapitalBackend(env: EnvMap = process.env): HubCapitalBackend {
  const isProduction = (env.NODE_ENV || 'development') === 'production';
  const raw = (env.INTEGRATION_CAPITAL_BACKEND || '').trim().toLowerCase();
  const localJsonRequested = raw === 'development-json' || raw === 'local-json';
  const unavailableRequested =
    raw === '' || raw === 'unavailable' || raw === 'none' || raw === 'not-configured';
  const sharepointRequested = raw === 'sharepoint';

  if (isProduction && localJsonRequested) {
    throw new UnsafeHubConfigurationError(
      'Unsafe configuration: the development capital JSON store (INTEGRATION_CAPITAL_BACKEND=development-json) is not allowed when NODE_ENV=production. capital-operations.json is development/local state only and is not an approved production operational system of record.',
    );
  }

  if (localJsonRequested) {
    return {
      mode: 'development-json',
      classification: 'development-local',
      localJsonAuthorized: true,
      credentialMode: 'development-json',
      configComplete: true,
    };
  }

  if (unavailableRequested) {
    return {
      mode: 'unavailable',
      classification: 'unavailable',
      localJsonAuthorized: false,
      credentialMode: 'none',
      configComplete: false,
    };
  }

  if (sharepointRequested) {
    try {
      const sharepoint = resolveSharePointCapitalSettings(env);
      return {
        mode: 'sharepoint',
        classification: 'sharepoint-graph',
        localJsonAuthorized: false,
        sharepoint,
        credentialMode: 'managed_identity',
        configComplete: true,
      };
    } catch (err) {
      if (err instanceof SharePointCapitalSettingsError) {
        throw new UnsafeHubConfigurationError(err.message);
      }
      throw err;
    }
  }

  throw new UnsafeHubConfigurationError(
    `Unsafe configuration: INTEGRATION_CAPITAL_BACKEND=${raw} is not an approved capital backend. Approved values: development-json (non-production only), sharepoint (explicit site/list IDs), or unset/unavailable.`,
  );
}

const GROUP_ID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export interface HubClientEntitlement {
  enabled: boolean;
  groupPrefix: string;
  /** Entra group object ID → canonical ClientCode. Runtime config, not a source roster. */
  approvedGroups: Map<string, string>;
  cacheTtlMs: number;
  cacheMaxEntries: number;
  graphTimeoutMs: number;
}

/**
 * Parse `groupId:ClientCode,groupId:ClientCode`.
 * Any malformed GUID, malformed ClientCode, wildcard, duplicate group ID,
 * or duplicate ClientCode fails the entire map (empty). No last-write-wins.
 * Does not fold ClientCode case. Empty/unset input is a valid empty map.
 */
export function parseApprovedClientGroups(raw: string | undefined): Map<string, string> {
  const empty = new Map<string, string>();
  if (!raw || !raw.trim()) return empty;
  const out = new Map<string, string>();
  const seenCodes = new Set<string>();
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon <= 0) return empty;
    const groupId = trimmed.slice(0, colon).trim();
    const code = trimmed.slice(colon + 1).trim();
    if (!GROUP_ID_RE.test(groupId)) return empty;
    if (!isCanonicalClientCode(code) || code === '*') return empty;
    if (out.has(groupId) || seenCodes.has(code)) return empty;
    out.set(groupId, code);
    seenCodes.add(code);
  }
  return out;
}

export function resolveClientEntitlement(env: EnvMap = process.env): HubClientEntitlement {
  const enabled = parseEnvFlag(env.INTEGRATION_CLIENT_ENTITLEMENT_ENABLED) !== false;
  const ttlRaw = Number(env.INTEGRATION_CLIENT_ENTITLEMENT_CACHE_TTL_MS);
  const cacheTtlMs = Number.isFinite(ttlRaw) && ttlRaw >= 0 ? ttlRaw : 120_000;
  const timeoutRaw = Number(env.INTEGRATION_CLIENT_ENTITLEMENT_GRAPH_TIMEOUT_MS);
  const graphTimeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : 3_000;
  return {
    enabled,
    groupPrefix: (env.INTEGRATION_CLIENT_GROUP_PREFIX || 'HVCG-Client-').trim() || 'HVCG-Client-',
    approvedGroups: parseApprovedClientGroups(env.INTEGRATION_CLIENT_ENTITLEMENT_GROUPS),
    cacheTtlMs: Math.min(cacheTtlMs, 300_000),
    cacheMaxEntries: 512,
    graphTimeoutMs: Math.min(graphTimeoutMs, 10_000),
  };
}

export function loadConfig() {
  const security = resolveHubRuntimeSecurity();
  const pmBackend = resolvePmBackend();
  const capitalBackend = resolveCapitalBackend();
  const clientEntitlement = resolveClientEntitlement();
  const ba = resolveBaClientSettings();
  return {
    port: Number(process.env.INTEGRATION_API_PORT || 8790),
    host: security.host,
    tokenEncryptionKeyB64: resolveEncryptionKey(),
    dataDir: process.env.INTEGRATION_DATA_DIR || defaultDataDir(),
    requireAuth: security.requireAuth,
    insecureDevAuth: security.insecureDevAuth,
    isProduction: security.isProduction,
    pmBackend,
    capitalBackend,
    /**
     * Test-only JWT verifier. Production loadConfig never sets this.
     * Authenticated identity still comes from the verified payload, never from request headers.
     */
    clientEntitlement,
    verifyAccessToken: undefined as
      | ((token: string) => Promise<Record<string, unknown>>)
      | undefined,
    /**
     * Test-only client-scope resolver. Production loadConfig never sets this.
     * When unset, Hub resolves HVCG-Client-* membership via Graph using oid.
     */
    resolveAllowedClientIds: undefined as
      | ((oid: string | undefined) => Promise<string[]>)
      | undefined,
    /** Test-only directory lookup. Production uses Hub confidential-client Graph. */
    lookupUserBasic: undefined as UserBasicLookup | undefined,
    /** Test-only PM Graph transport. Production uses managed-identity Graph. */
    pmGraphTransport: undefined as PmGraphTransport | undefined,
    /** Test-only capital Graph transport. Production uses managed-identity Graph. */
    capitalGraphTransport: undefined as CapitalGraphTransport | undefined,
    /** Test-only PM token provider. Production uses the App Service managed-identity local token endpoint. */
    pmTokenProvider: undefined as PmGraphTokenProvider | undefined,
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
    /**
     * Shared secret for Autonomous Marketing POST /api/website/leads.
     * Same value as SWA INTAKE_ADMIN_KEY. Empty disables the route (503).
     * Does not grant Hub Bearer access and is not a Graph/BA token.
     */
    websiteIntakeKey: (process.env.INTEGRATION_WEBSITE_INTAKE_KEY || '').trim(),
    websiteLeadOwnerEmail: (
      process.env.INTEGRATION_WEBSITE_LEAD_OWNER_EMAIL || 'manny@highvaluecapitalgroup.com'
    ).trim(),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:8790',
    ba,
    /**
     * Production: App Service managed-identity token for INTEGRATION_BA_RESOURCE.
     * Tests may replace this hook. Production never uses INTEGRATION_BA_S2S_TOKEN.
     */
    baS2sToken: resolveProductionBaS2sToken(process.env, ba),
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
