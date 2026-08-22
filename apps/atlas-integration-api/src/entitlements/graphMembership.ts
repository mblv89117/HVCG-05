/**
 * Server-controlled Graph membership lookup for Atlas staff client groups.
 *
 * Uses the Hub confidential client (client credentials) — never end-user
 * Microsoft connector tokens. Tokens are not logged or returned.
 */

import type { AppConfig } from '../config.ts';

const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
/** Directory objects (users and application service principals). `/users/{id}` is user-only. */
export const GRAPH_CHECK_MEMBER_GROUPS_BASE = 'https://graph.microsoft.com/v1.0/directoryObjects';

export function checkMemberGroupsUrl(oid: string): string {
  return `${GRAPH_CHECK_MEMBER_GROUPS_BASE}/${encodeURIComponent(oid)}/checkMemberGroups`;
}

type TokenCache = { accessToken: string; expiresAtMs: number };

let tokenCache: TokenCache | null = null;

function graphTimeoutMs(cfg: AppConfig): number {
  return cfg.clientEntitlement.graphTimeoutMs;
}

export function resetGraphTokenCacheForTests(): void {
  tokenCache = null;
}

export async function getGraphAppToken(cfg: AppConfig, nowMs = Date.now()): Promise<string | null> {
  const tenantId = cfg.microsoft.tenantId;
  const clientId = cfg.microsoft.clientId;
  const clientSecret = cfg.microsoft.clientSecret;
  if (!tenantId || tenantId === 'common' || tenantId === 'organizations' || tenantId === 'consumers') {
    return null;
  }
  if (!clientId || !clientSecret) return null;
  if (tokenCache && tokenCache.expiresAtMs > nowMs + 5_000) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
    scope: GRAPH_SCOPE,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), graphTimeoutMs(cfg));
  try {
    const resp = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    if (!resp.ok) return null;
    const json = (await resp.json()) as { access_token?: unknown; expires_in?: unknown };
    if (typeof json.access_token !== 'string' || !json.access_token) return null;
    const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600;
    tokenCache = {
      accessToken: json.access_token,
      expiresAtMs: nowMs + Math.max(30, expiresIn - 60) * 1000,
    };
    return tokenCache.accessToken;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Returns group IDs from `groupIds` that the directory object (user or
 * application service principal) is a member of. Fail closed → [] / 'failed'.
 */
export async function checkMemberGroups(
  cfg: AppConfig,
  oid: string,
  groupIds: string[],
): Promise<string[] | 'failed'> {
  if (!oid || !groupIds.length) return [];
  const token = await getGraphAppToken(cfg);
  if (!token) return 'failed';

  const memberIds: string[] = [];
  for (let i = 0; i < groupIds.length; i += 20) {
    const batch = groupIds.slice(i, i + 20);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), graphTimeoutMs(cfg));
    try {
      const resp = await fetch(checkMemberGroupsUrl(oid), {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ groupIds: batch }),
        signal: controller.signal,
      });
      if (!resp.ok) return 'failed';
      const json = (await resp.json()) as { value?: unknown };
      if (!Array.isArray(json.value)) return 'failed';
      for (const id of json.value) {
        if (typeof id === 'string' && id) memberIds.push(id);
      }
    } catch {
      return 'failed';
    } finally {
      clearTimeout(timer);
    }
  }
  return memberIds;
}
