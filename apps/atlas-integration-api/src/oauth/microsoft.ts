import type { AppConfig } from '../config.ts';

export const MICROSOFT_SCOPES = [
  'openid',
  'offline_access',
  'User.Read',
  'Mail.Read',
  'Calendars.Read',
  'Contacts.Read',
  'Files.Read.All',
  'Sites.Read.All',
];

export interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
}

/**
 * Authority for OAuth authorize/token.
 * Use `organizations` so HVCG + HVS (and other work tenants) can each connect
 * without requiring the account to exist in the HVCG home tenant.
 * Requires the Entra app registration to be multi-tenant.
 */
export function microsoftAuthAuthority(cfg: AppConfig): string {
  const authTenant =
    process.env.MICROSOFT_AUTH_TENANT ||
    (cfg.microsoft.tenantId === 'common' ||
    cfg.microsoft.tenantId === 'organizations' ||
    cfg.microsoft.tenantId === 'consumers'
      ? cfg.microsoft.tenantId
      : 'organizations');
  return authTenant;
}

export function buildMicrosoftAuthorizeUrl(
  cfg: AppConfig,
  state: string,
  scopes: string[] = MICROSOFT_SCOPES,
): string {
  const { clientId, redirectUri } = cfg.microsoft;
  const authority = microsoftAuthAuthority(cfg);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: scopes.join(' '),
    state,
    prompt: 'select_account',
  });
  return `https://login.microsoftonline.com/${authority}/oauth2/v2.0/authorize?${params}`;
}

export async function exchangeMicrosoftCode(
  cfg: AppConfig,
  code: string,
): Promise<MicrosoftTokenResponse> {
  const { clientId, clientSecret, redirectUri } = cfg.microsoft;
  const authority = microsoftAuthAuthority(cfg);
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    scope: MICROSOFT_SCOPES.join(' '),
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  const resp = await fetch(`https://login.microsoftonline.com/${authority}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Microsoft token exchange failed: ${resp.status} ${text.slice(0, 200)}`);
  }
  return (await resp.json()) as MicrosoftTokenResponse;
}

export async function refreshMicrosoftToken(
  cfg: AppConfig,
  refreshToken: string,
): Promise<MicrosoftTokenResponse> {
  const { clientId, clientSecret } = cfg.microsoft;
  const authority = microsoftAuthAuthority(cfg);
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: MICROSOFT_SCOPES.join(' '),
  });
  if (clientSecret) body.set('client_secret', clientSecret);

  const resp = await fetch(`https://login.microsoftonline.com/${authority}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    throw new Error(`Microsoft token refresh failed: ${resp.status}`);
  }
  return (await resp.json()) as MicrosoftTokenResponse;
}

export async function fetchMicrosoftProfile(accessToken: string): Promise<{
  id: string;
  displayName: string;
  mail?: string;
  userPrincipalName: string;
}> {
  const resp = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) {
    throw new Error(`Graph /me failed: ${resp.status}`);
  }
  return (await resp.json()) as {
    id: string;
    displayName: string;
    mail?: string;
    userPrincipalName: string;
  };
}

export async function graphFetch<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = path.startsWith('http') ? path : `https://graph.microsoft.com/v1.0${path}`;
  let attempt = 0;
  while (true) {
    attempt++;
    const resp = await fetch(url, {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(init?.headers as Record<string, string>),
      },
    });
    if (resp.status === 429 || resp.status === 503) {
      if (attempt >= 6) {
        const text = await resp.text();
        throw new Error(`Graph request failed ${resp.status}: ${text.slice(0, 300)}`);
      }
      const retryAfter = Number(resp.headers.get('retry-after') || '2');
      await new Promise((r) => setTimeout(r, Math.min(30_000, (retryAfter || 2) * 1000 * attempt)));
      continue;
    }
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Graph request failed ${resp.status}: ${text.slice(0, 300)}`);
    }
    if (resp.status === 204) return {} as T;
    return (await resp.json()) as T;
  }
}
