import type { AppConfig } from '../config.ts';

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'openid',
  'email',
  'profile',
];

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  id_token?: string;
}

export function buildGoogleAuthorizeUrl(
  cfg: AppConfig,
  state: string,
  scopes: string[] = GOOGLE_SCOPES,
): string {
  const params = new URLSearchParams({
    client_id: cfg.google.clientId,
    response_type: 'code',
    redirect_uri: cfg.google.redirectUri,
    scope: scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(
  cfg: AppConfig,
  code: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: cfg.google.clientId,
    client_secret: cfg.google.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: cfg.google.redirectUri,
  });
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google token exchange failed: ${resp.status} ${text.slice(0, 200)}`);
  }
  return (await resp.json()) as GoogleTokenResponse;
}

export async function refreshGoogleToken(
  cfg: AppConfig,
  refreshToken: string,
): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: cfg.google.clientId,
    client_secret: cfg.google.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!resp.ok) {
    throw new Error(`Google token refresh failed: ${resp.status}`);
  }
  return (await resp.json()) as GoogleTokenResponse;
}

export async function fetchGoogleProfile(accessToken: string): Promise<{
  sub: string;
  email: string;
  name: string;
}> {
  const resp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Google userinfo failed: ${resp.status}`);
  return (await resp.json()) as { sub: string; email: string; name: string };
}

export async function googleFetch<T>(
  accessToken: string,
  url: string,
  init?: RequestInit,
): Promise<T> {
  const resp = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(init?.headers as Record<string, string>),
    },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google API failed ${resp.status}: ${text.slice(0, 300)}`);
  }
  if (resp.status === 204) return {} as T;
  return (await resp.json()) as T;
}
