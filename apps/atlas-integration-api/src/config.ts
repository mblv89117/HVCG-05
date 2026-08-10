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

export function loadConfig() {
  const isLocal = (process.env.NODE_ENV || 'development') !== 'production';
  const port = Number(process.env.INTEGRATION_API_PORT || 8790);
  // Local-first bind. Override with INTEGRATION_API_HOST=0.0.0.0 only if separately authorized.
  const host = (process.env.INTEGRATION_API_HOST || '127.0.0.1').trim() || '127.0.0.1';
  const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`;
  return {
    port,
    host,
    tokenEncryptionKeyB64: resolveEncryptionKey(),
    dataDir: process.env.INTEGRATION_DATA_DIR || defaultDataDir(),
    requireAuth: process.env.INTEGRATION_REQUIRE_AUTH
      ? process.env.INTEGRATION_REQUIRE_AUTH !== 'false'
      : !isLocal,
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
    /** Entra JWT audiences accepted for hub Bearer auth (SPA id token, hub app, Graph). */
    acceptedAudiences: (
      process.env.INTEGRATION_ACCEPTED_AUDIENCES ||
      [
        process.env.INTEGRATION_SPA_CLIENT_ID || '',
        process.env.MICROSOFT_CLIENT_ID || '',
        'https://graph.microsoft.com',
        '00000003-0000-0000-c000-000000000000',
      ]
        .filter(Boolean)
        .join(',')
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    publicBaseUrl,
    microsoft: {
      tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
      clientId: process.env.MICROSOFT_CLIENT_ID || '',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
      redirectUri:
        process.env.MICROSOFT_REDIRECT_URI ||
        `${publicBaseUrl}/api/oauth/microsoft/callback`,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        `${publicBaseUrl}/api/oauth/google/callback`,
    },
    github: {
      appId: process.env.GITHUB_APP_ID || '',
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
      clientId: process.env.GITHUB_APP_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_APP_CLIENT_SECRET || '',
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
      redirectUri:
        process.env.GITHUB_REDIRECT_URI ||
        `${publicBaseUrl}/api/oauth/github/callback`,
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
