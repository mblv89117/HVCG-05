/**
 * Centralized Integration Hub HTTP client.
 * Always acquires an Entra access token (aud = Hub API) before protected calls.
 * Never attaches idToken. x-atlas-* are scope only after Bearer identity is proven.
 */

import { acquireHubBearerToken } from '../../microsoft/auth/msal';
import type { AtlasHubAuthHeaders } from './api';

const base = () =>
  (import.meta as ImportMeta & { env?: { VITE_INTEGRATION_API_BASE?: string } }).env
    ?.VITE_INTEGRATION_API_BASE || 'http://127.0.0.1:8792';

export class HubHttpError extends Error {
  status: number;
  code?: string;
  body: unknown;

  constructor(status: number, message: string, body?: unknown, code?: string) {
    super(message);
    this.name = 'HubHttpError';
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

export function hubApiBase(): string {
  return base().replace(/\/$/, '');
}

function scopeHeaders(auth: AtlasHubAuthHeaders): Record<string, string> {
  return {
    'content-type': 'application/json',
    'x-atlas-user-id': auth.userId || '',
    'x-atlas-organization-id': auth.organizationId || 'org-hvcg',
    'x-atlas-client-ids': (auth.clientIds || []).join(','),
    ...(auth.email ? { 'x-atlas-user-email': auth.email } : {}),
    'x-atlas-roles': (auth.roles || ['Staff']).join(','),
  };
}

/**
 * Resolve a Hub API access token. Prefers an already-acquired access token.
 * Does not return ID tokens. Silent acquisition only (no auto-popup).
 */
export async function resolveHubBearer(
  preferred?: string | null,
): Promise<string | undefined> {
  if (preferred && preferred.trim()) return preferred.trim();
  try {
    const fresh = await acquireHubBearerToken();
    return fresh || undefined;
  } catch {
    return undefined;
  }
}

export async function hubFetchJson<T = unknown>(
  auth: AtlasHubAuthHeaders,
  path: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const url = path.startsWith('http') ? path : `${hubApiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = {
    ...scopeHeaders(auth),
    ...((init?.headers as Record<string, string>) || {}),
  };

  if (!init?.skipAuth) {
    const bearer = await resolveHubBearer(auth.accessToken);
    if (!bearer) {
      throw new HubHttpError(
        401,
        'Microsoft sign-in required (Bearer token missing)',
        { error: 'missing_bearer' },
        'missing_bearer',
      );
    }
    headers.Authorization = `Bearer ${bearer}`;
  }

  const doFetch = async (hdrs: Record<string, string>) => {
    const res = await fetch(url, {
      ...init,
      headers: hdrs,
      credentials: 'omit',
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  let { res, data } = await doFetch(headers);

  // One silent refresh if hub reports missing/invalid bearer
  const code = String((data as { error?: string; code?: string }).error || (data as { code?: string }).code || '');
  if (
    !init?.skipAuth &&
    res.status === 401 &&
    (code === 'missing_bearer' ||
      code === 'invalid_token' ||
      /Bearer token missing|Invalid or expired/i.test(String((data as { message?: string }).message || '')))
  ) {
    const retryToken = await resolveHubBearer(null);
    if (retryToken) {
      headers.Authorization = `Bearer ${retryToken}`;
      ({ res, data } = await doFetch(headers));
    }
  }

  if (!res.ok) {
    const message =
      (data as { message?: string }).message ||
      (data as { error?: string }).error ||
      res.statusText ||
      `HTTP ${res.status}`;
    throw new HubHttpError(res.status, message, data, code || undefined);
  }

  return data as T;
}
