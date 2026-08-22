/**
 * Narrow Graph READ client for the information fabric.
 * Not an arbitrary Graph proxy. GET plus Search POST only.
 * Manny mailbox/drive only. Known HVCG/HVS site/drive reads only.
 * Does not send mail, write files, or browse other employees' mailboxes.
 * Does not allow tenant-wide /sites?search=.
 */

import { MANNY_ENTRA_OID } from '../manny.ts';
import { pmInfrastructureError, PmHttpError } from '../errors.ts';
import type { PmGraphTokenProvider } from '../token.ts';

export const GRAPH_ORIGIN = 'https://graph.microsoft.com';
const GRAPH_HOST = 'graph.microsoft.com';
const TIMEOUT_MS = 20_000;

export interface FabricGraphClient {
  getJson(pathAndQuery: string): Promise<{ status: number; json: Record<string, unknown> }>;
  postJson(pathAndQuery: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> }>;
}

const ALLOWED_GET: RegExp[] = [
  /^\/v1\.0\/users\/[0-9a-f-]{36}\/messages(\?|$|\/)/i,
  /^\/v1\.0\/users\/[0-9a-f-]{36}\/calendar\/events(\?|$|\/)/i,
  /^\/v1\.0\/users\/[0-9a-f-]{36}\/contacts(\?|$|\/)/i,
  /^\/v1\.0\/users\/[0-9a-f-]{36}\/drive(\/root(\/children)?|\/recent)(\?|$)/i,
  /^\/v1\.0\/groups(\?|$)/i,
  /^\/v1\.0\/groups\/[0-9a-f-]{36}\/sites\/root(\?|$)/i,
  /^\/v1\.0\/sites\/[^/]+(\?|$)/i,
  /^\/v1\.0\/sites\/[a-z0-9.-]+:\/sites\/[A-Za-z0-9._-]+(\?|$)/i,
  /^\/v1\.0\/sites\/[^/]+\/drives(\?|$)/i,
  /^\/v1\.0\/drives\/[^/]+\/root(\/children|\/delta)?(\?|$)/i,
  /^\/v1\.0\/drives\/[^/]+\/items\/[^/]+\/children(\?|$)/i,
  /^\/v1\.0\/teams(\?|$)/i,
  /^\/v1\.0\/teams\/[0-9a-f-]{36}\/channels(\?|$)/i,
  /^\/v1\.0\/teams\/[0-9a-f-]{36}\/channels\/[^/]+\/messages(\?|$)/i,
  /^\/v1\.0\/users\/[0-9a-f-]{36}\/chats(\?|$)/i,
  /^\/v1\.0\/chats\/[^/]+\/messages(\?|$)/i,
  /^\/v1\.0\/users\/[0-9a-f-]{36}\/onlineMeetings(\?|$)/i,
  /^\/v1\.0\/users\/[0-9a-f-]{36}\/todo\/lists(\?|$)/i,
];

const ALLOWED_POST: RegExp[] = [/^\/v1\.0\/search\/query$/i];

export function isAllowedFabricGraphPath(path: string, method: 'GET' | 'POST' = 'GET'): boolean {
  if (method === 'POST') return ALLOWED_POST.some((re) => re.test(path));
  if (/\/sites\b/i.test(path) && /[?&]search=/i.test(path)) return false;
  return ALLOWED_GET.some((re) => re.test(path));
}

function assertSafeFabricUrl(raw: string, method: 'GET' | 'POST' = 'GET'): URL {
  let url: URL;
  try {
    url = new URL(raw, GRAPH_ORIGIN);
  } catch {
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Fabric Graph URL was rejected.');
  }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== GRAPH_HOST) {
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Fabric Graph URL was rejected.');
  }
  if (url.username || url.password) {
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Fabric Graph URL was rejected.');
  }
  if (url.searchParams.has('search')) {
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Fabric Graph path is not allowlisted.');
  }
  const path = url.pathname;
  if (!isAllowedFabricGraphPath(path, method)) {
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Fabric Graph path is not allowlisted.');
  }
  const userMatch = /\/users\/([0-9a-f-]{36})\//i.exec(path);
  if (userMatch && userMatch[1].toLowerCase() !== MANNY_ENTRA_OID) {
    throw new PmHttpError(403, 'PM_MANNY_ONLY', 'Fabric Graph user paths are restricted to the owner mailbox.');
  }
  return url;
}

export function createFabricGraphClient(
  tokenProvider: PmGraphTokenProvider,
  deps: { fetch?: typeof fetch; timeoutMs?: number } = {},
): FabricGraphClient {
  const doFetch = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;
  async function request(
    method: 'GET' | 'POST',
    pathAndQuery: string,
    body?: unknown,
  ): Promise<{ status: number; json: Record<string, unknown> }> {
    const url = assertSafeFabricUrl(
      pathAndQuery.startsWith('https://') ? pathAndQuery : `${GRAPH_ORIGIN}${pathAndQuery}`,
      method,
    );
    const token = await tokenProvider.getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        authorization: `Bearer ${token}`,
        accept: 'application/json',
      };
      if (method === 'POST') headers['content-type'] = 'application/json';
      const resp = await doFetch(url.toString(), {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
        signal: controller.signal,
        redirect: 'manual',
      });
      if (resp.status >= 300 && resp.status < 400) {
        throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Fabric Graph redirect was rejected.');
      }
      const text = await resp.text();
      let json: Record<string, unknown> = {};
      if (text) {
        try {
          const parsed = JSON.parse(text) as unknown;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            json = parsed as Record<string, unknown>;
          }
        } catch {
          json = { error: { code: 'invalid_json' } };
        }
      }
      return { status: resp.status, json };
    } catch (err) {
      if (err instanceof PmHttpError) throw err;
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Fabric Graph request failed.');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    getJson(pathAndQuery: string) {
      return request('GET', pathAndQuery);
    },
    postJson(pathAndQuery: string, body: unknown) {
      return request('POST', pathAndQuery, body);
    },
  };
}
