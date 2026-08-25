/**
 * Server-controlled Graph membership lookup for Atlas staff client groups.
 *
 * Uses the Hub confidential client (client credentials) — never end-user
 * Microsoft connector tokens. Tokens are not logged or returned.
 *
 * Primary: POST /directoryObjects/{oid}/checkMemberGroups (works for users).
 * Fallback when that call is 401/403 (observed for application SP oids without
 * Application.Read.All): GET /groups/{id}/members/microsoft.graph.user and
 * /members/microsoft.graph.servicePrincipal. Those succeed with GroupMember.Read.All.
 * Default /members and /transitiveMembers omit service principals — do not use them.
 * Fail closed on 401/403. No Graph writes.
 */

import type { AppConfig } from '../config.ts';

const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
/** Directory objects (users and application service principals). `/users/{id}` is user-only. */
export const GRAPH_CHECK_MEMBER_GROUPS_BASE = 'https://graph.microsoft.com/v1.0/directoryObjects';
export const GRAPH_GROUPS_BASE = 'https://graph.microsoft.com/v1.0/groups';
export const GRAPH_MEMBER_TYPES = ['user', 'servicePrincipal'] as const;
export type GraphMemberType = (typeof GRAPH_MEMBER_TYPES)[number];

export function checkMemberGroupsUrl(oid: string): string {
  return `${GRAPH_CHECK_MEMBER_GROUPS_BASE}/${encodeURIComponent(oid)}/checkMemberGroups`;
}

export function groupMembersByTypeUrl(groupId: string, type: GraphMemberType): string {
  const q = new URLSearchParams({ $select: 'id', $top: '999' });
  return `${GRAPH_GROUPS_BASE}/${encodeURIComponent(groupId)}/members/microsoft.graph.${type}?${q.toString()}`;
}

export function isAllowedGroupMembersNextLink(next: string, groupId: string): boolean {
  try {
    const u = new URL(next);
    if (u.protocol !== 'https:') return false;
    if (u.hostname !== 'graph.microsoft.com') return false;
    const prefix = `/v1.0/groups/${encodeURIComponent(groupId)}/members`;
    return u.pathname.startsWith(prefix);
  } catch {
    return false;
  }
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

function oidEquals(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ status: number; json: unknown } | 'failed'> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...init, signal: controller.signal });
    let json: unknown = null;
    try {
      json = await resp.json();
    } catch {
      json = null;
    }
    return { status: resp.status, json };
  } catch {
    return 'failed';
  } finally {
    clearTimeout(timer);
  }
}

function memberIdsFromPage(json: unknown): string[] | 'failed' {
  if (!json || typeof json !== 'object') return 'failed';
  const value = (json as { value?: unknown }).value;
  if (!Array.isArray(value)) return 'failed';
  const ids: string[] = [];
  for (const item of value) {
    if (item && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string') {
      const id = (item as { id: string }).id;
      if (id) ids.push(id);
    } else if (typeof item === 'string' && item) {
      ids.push(item);
    }
  }
  return ids;
}

/**
 * Walk typed group members pages. Fail-closed on 401/403 or unsafe nextLink.
 */
export async function groupContainsOid(
  token: string,
  groupId: string,
  oid: string,
  timeoutMs: number,
): Promise<boolean | 'failed'> {
  for (const type of GRAPH_MEMBER_TYPES) {
    let url: string | null = groupMembersByTypeUrl(groupId, type);
    const seen = new Set<string>();
    while (url) {
      if (seen.has(url) || seen.size > 20) return 'failed';
      seen.add(url);
      const page = await fetchJson(
        url,
        { method: 'GET', headers: { authorization: `Bearer ${token}`, accept: 'application/json' } },
        timeoutMs,
      );
      if (page === 'failed') return 'failed';
      if (page.status === 401 || page.status === 403) return 'failed';
      if (!page.status || page.status >= 400) return 'failed';
      const ids = memberIdsFromPage(page.json);
      if (ids === 'failed') return 'failed';
      if (ids.some((id) => oidEquals(id, oid))) return true;
      const next =
        page.json && typeof page.json === 'object'
          ? (page.json as { '@odata.nextLink'?: unknown })['@odata.nextLink']
          : undefined;
      if (typeof next === 'string' && next) {
        if (!isAllowedGroupMembersNextLink(next, groupId)) return 'failed';
        url = next;
      } else {
        url = null;
      }
    }
  }
  return false;
}

async function lookupViaGroupMembers(
  token: string,
  oid: string,
  groupIds: string[],
  timeoutMs: number,
): Promise<string[] | 'failed'> {
  const memberIds: string[] = [];
  for (const groupId of groupIds) {
    const hit = await groupContainsOid(token, groupId, oid, timeoutMs);
    if (hit === 'failed') return 'failed';
    if (hit) memberIds.push(groupId);
  }
  return memberIds;
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
  let authDenied = false;
  for (let i = 0; i < groupIds.length; i += 20) {
    const batch = groupIds.slice(i, i + 20);
    const page = await fetchJson(
      checkMemberGroupsUrl(oid),
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ groupIds: batch }),
      },
      graphTimeoutMs(cfg),
    );
    if (page === 'failed') return 'failed';
    if (page.status === 401 || page.status === 403) {
      authDenied = true;
      break;
    }
    if (!page.status || page.status >= 400) return 'failed';
    const json = page.json as { value?: unknown };
    if (!Array.isArray(json?.value)) return 'failed';
    for (const id of json.value) {
      if (typeof id === 'string' && id) memberIds.push(id);
    }
  }
  if (authDenied) {
    return lookupViaGroupMembers(token, oid, groupIds, graphTimeoutMs(cfg));
  }
  return memberIds;
}
