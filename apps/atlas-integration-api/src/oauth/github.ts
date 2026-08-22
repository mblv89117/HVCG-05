import { createHmac, createSign, timingSafeEqual } from 'node:crypto';
import type { AppConfig } from '../config.ts';

export interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
  refresh_token?: string;
  expires_in?: number;
}

export function buildGitHubAuthorizeUrl(cfg: AppConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: cfg.github.clientId,
    redirect_uri: cfg.github.redirectUri,
    scope: 'read:user read:org repo read:project',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params}`;
}

export async function exchangeGitHubCode(
  cfg: AppConfig,
  code: string,
): Promise<GitHubTokenResponse> {
  const resp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: cfg.github.clientId,
      client_secret: cfg.github.clientSecret,
      code,
      redirect_uri: cfg.github.redirectUri,
    }),
  });
  if (!resp.ok) {
    throw new Error(`GitHub token exchange failed: ${resp.status}`);
  }
  const data = (await resp.json()) as GitHubTokenResponse & { error?: string };
  if (data.error) throw new Error(`GitHub OAuth error: ${data.error}`);
  return data;
}

export function createGitHubAppJwt(cfg: AppConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iat: now - 60,
      exp: now + 600,
      iss: cfg.github.appId,
    }),
  ).toString('base64url');
  const signInput = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(signInput);
  sign.end();
  const signature = sign.sign(cfg.github.privateKey, 'base64url');
  return `${signInput}.${signature}`;
}

export async function getGitHubInstallationToken(
  cfg: AppConfig,
  installationId: number,
): Promise<{ token: string; expires_at: string }> {
  const jwt = createGitHubAppJwt(cfg);
  const resp = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${jwt}`,
        accept: 'application/vnd.github+json',
      },
    },
  );
  if (!resp.ok) {
    throw new Error(`GitHub installation token failed: ${resp.status}`);
  }
  return (await resp.json()) as { token: string; expires_at: string };
}

export async function fetchGitHubUser(accessToken: string): Promise<{
  id: number;
  login: string;
  name?: string;
}> {
  const resp = await fetch('https://api.github.com/user', {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
    },
  });
  if (!resp.ok) throw new Error(`GitHub /user failed: ${resp.status}`);
  return (await resp.json()) as { id: number; login: string; name?: string };
}

export async function githubFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub API failed ${resp.status}: ${text.slice(0, 300)}`);
  }
  if (resp.status === 204) return {} as T;
  return (await resp.json()) as T;
}

export function verifyGitHubWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | undefined,
): boolean {
  if (!secret || !signatureHeader) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}

export function buildGitHubAppInstallUrl(cfg: AppConfig, state: string): string {
  return `https://github.com/apps/${encodeURIComponent(cfg.github.appId)}/installations/new?state=${encodeURIComponent(state)}`;
}
