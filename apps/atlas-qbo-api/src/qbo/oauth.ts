import { createHash, randomBytes } from 'node:crypto';
import type { AppConfig } from '../config.ts';
import { QBO_ACCOUNTING_SCOPE } from '../../../../packages/atlas-qbo-contracts/src/index.ts';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  xRefreshTokenExpiresIn?: number;
  tokenType: string;
}

export function buildAuthorizeUrl(
  cfg: AppConfig,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: 'code',
    scope: QBO_ACCOUNTING_SCOPE,
    state,
  });
  return `${cfg.authorizeBaseUrl}?${params.toString()}`;
}

export function createOAuthState(): string {
  return randomBytes(24).toString('hex');
}

export function basicAuthHeader(cfg: AppConfig): string {
  return `Basic ${Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')}`;
}

export async function exchangeAuthorizationCode(
  cfg: AppConfig,
  code: string,
): Promise<TokenPair> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.redirectUri,
  });
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: {
      authorization: basicAuthHeader(cfg),
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`oauth_exchange_failed:${res.status}:${text.slice(0, 120)}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in?: number;
    token_type: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    xRefreshTokenExpiresIn: data.x_refresh_token_expires_in,
    tokenType: data.token_type,
  };
}

export async function refreshAccessToken(
  cfg: AppConfig,
  refreshToken: string,
): Promise<TokenPair> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: {
      authorization: basicAuthHeader(cfg),
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`oauth_refresh_failed:${res.status}:${text.slice(0, 120)}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    x_refresh_token_expires_in?: number;
    token_type: string;
  };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    xRefreshTokenExpiresIn: data.x_refresh_token_expires_in,
    tokenType: data.token_type,
  };
}

export async function revokeToken(cfg: AppConfig, token: string): Promise<void> {
  const body = new URLSearchParams({ token });
  const res = await fetch(cfg.revokeUrl, {
    method: 'POST',
    headers: {
      authorization: basicAuthHeader(cfg),
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
  });
  if (!res.ok && res.status !== 200) {
    // Intuit returns 200 on success; treat non-2xx as soft failure for disconnect
    const text = await res.text();
    throw new Error(`oauth_revoke_failed:${res.status}:${text.slice(0, 80)}`);
  }
}

export function consentDigest(version: string): string {
  return createHash('sha256').update(version).digest('hex');
}

export function computeTokenStatus(
  accessExpiresAt: string,
  refreshExpiresAt: string | null,
): 'valid' | 'expiring_soon' | 'refresh_required' | 'revoked' {
  const now = Date.now();
  const accessMs = new Date(accessExpiresAt).getTime();
  if (refreshExpiresAt && new Date(refreshExpiresAt).getTime() < now) return 'revoked';
  if (accessMs <= now) return 'refresh_required';
  if (accessMs - now < 5 * 60 * 1000) return 'expiring_soon';
  return 'valid';
}
