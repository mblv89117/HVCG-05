/**
 * Narrow Microsoft Graph v1.0 transport for the four MVP PM lists.
 *
 * Defense-in-depth: even though a Lists.SelectedOperations.Selected token may
 * observe unrelated Command Center catalog/schema metadata when used directly,
 * this transport cannot enumerate site lists, read columns, read list metadata,
 * call /permissions, or follow redirects. Only configured Projects/Tasks/
 * Milestones/Clients item operations on the configured site are permitted.
 *
 * Does not follow nextLink off graph.microsoft.com or onto another list/site.
 */

import { pmInfrastructureError, PmHttpError } from './errors.ts';
import type { SharePointPmSettings } from './settings.ts';
import type { PmGraphTokenProvider } from './token.ts';

export interface GraphListItem {
  id: string;
  etag: string;
  fields: Record<string, unknown>;
}

export interface GraphListPage {
  items: GraphListItem[];
  nextLink?: string;
}

export interface PmGraphTransport {
  listItems(
    listId: string,
    opts?: { filter?: string; top?: number; nextLink?: string },
  ): Promise<GraphListPage>;
  getItem(listId: string, itemId: string): Promise<GraphListItem | null>;
  createItem(listId: string, fields: Record<string, unknown>): Promise<GraphListItem>;
  patchItemFields(
    listId: string,
    itemId: string,
    fields: Record<string, unknown>,
    etag: string,
  ): Promise<GraphListItem>;
}

export type PmGraphResourceAllowlist = Pick<
  SharePointPmSettings,
  'siteId' | 'projectsListId' | 'tasksListId' | 'milestonesListId' | 'clientsListId'
> & {
  leadsListId?: string;
};

export type PmListCapability = 'read' | 'write';

export const GRAPH_ORIGIN = 'https://graph.microsoft.com';
export const GRAPH_HOST = 'graph.microsoft.com';
export const GRAPH_API_VERSION = 'v1.0';

const DEFAULT_TOP = 100;
const TIMEOUT_MS = 15_000;

export interface GraphTransportDeps {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

function rejected(message: string): never {
  throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', message);
}

function normalizeGuid(value: string): string {
  return value.trim().toLowerCase();
}

export function capabilityForPmList(
  allowlist: PmGraphResourceAllowlist,
  listId: string,
): PmListCapability {
  const id = normalizeGuid(listId);
  if (!id) rejected('SharePoint PM list is not in the approved resource allowlist.');
  if (id === normalizeGuid(allowlist.projectsListId)) return 'write';
  if (id === normalizeGuid(allowlist.tasksListId)) return 'write';
  if (id === normalizeGuid(allowlist.milestonesListId)) return 'write';
  if (id === normalizeGuid(allowlist.clientsListId)) return 'read';
  if (allowlist.leadsListId && id === normalizeGuid(allowlist.leadsListId)) return 'write';
  rejected('SharePoint PM list is not in the approved resource allowlist.');
}

function assertWritable(capability: PmListCapability): void {
  if (capability !== 'write') {
    rejected('SharePoint PM list does not allow this operation.');
  }
}

function isForbiddenGraphSegment(segment: string): boolean {
  const s = segment.toLowerCase();
  return s === 'columns' || s === 'permissions' || s === 'drive' || s === 'sites';
}

/**
 * Parse a Graph list-items URL. Returns null when the path is not an items
 * collection/item URL on /v1.0/sites/{site}/lists/{list}/items.
 */
export function parsePmGraphListItemsUrl(raw: string): {
  hostname: string;
  protocol: string;
  siteId: string;
  listId: string;
} | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.hostname.toLowerCase() !== GRAPH_HOST) return null;
  if (url.port && url.port !== '443') return null;
  if (url.username || url.password) return null;
  const pathname = url.pathname;
  const prefix = `/${GRAPH_API_VERSION}/sites/`;
  if (!pathname.toLowerCase().startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length);
  const listsMarker = '/lists/';
  const listsAt = rest.toLowerCase().indexOf(listsMarker);
  if (listsAt < 0) return null;
  let siteId: string;
  let afterLists: string;
  try {
    siteId = decodeURIComponent(rest.slice(0, listsAt));
    afterLists = decodeURIComponent(rest.slice(listsAt + listsMarker.length));
  } catch {
    return null;
  }
  const segments = afterLists.split('/').filter(Boolean);
  if (segments.length < 2) return null;
  const listId = segments[0];
  if (segments.some(isForbiddenGraphSegment)) return null;
  if (segments[1].toLowerCase() !== 'items') return null;
  if (!siteId || !listId) return null;
  if (pathname.toLowerCase().includes('/columns') || pathname.toLowerCase().includes('/permissions')) {
    return null;
  }
  return { hostname: url.hostname.toLowerCase(), protocol: url.protocol, siteId, listId };
}

function assertSafeNextLink(nextLink: string, siteId: string, listId: string): URL {
  const parsed = parsePmGraphListItemsUrl(nextLink);
  if (!parsed) rejected('SharePoint PM pagination link was rejected.');
  if (normalizeGuid(parsed.siteId) !== normalizeGuid(siteId)) {
    rejected('SharePoint PM pagination link was rejected.');
  }
  if (normalizeGuid(parsed.listId) !== normalizeGuid(listId)) {
    rejected('SharePoint PM pagination link was rejected.');
  }
  return new URL(nextLink);
}

function parseItem(raw: Record<string, unknown>): GraphListItem {
  const id = raw.id != null ? String(raw.id) : '';
  const etag =
    (typeof raw['@odata.etag'] === 'string' && raw['@odata.etag']) ||
    (typeof raw.eTag === 'string' && raw.eTag) ||
    '';
  const fields =
    raw.fields && typeof raw.fields === 'object' && !Array.isArray(raw.fields)
      ? (raw.fields as Record<string, unknown>)
      : {};
  const fieldEtag = typeof fields['@odata.etag'] === 'string' ? fields['@odata.etag'] : '';
  return { id, etag: etag || fieldEtag, fields };
}

export function createGraphTransport(
  allowlist: PmGraphResourceAllowlist,
  tokenProvider: PmGraphTokenProvider,
  deps: GraphTransportDeps = {},
): PmGraphTransport {
  const siteId = allowlist.siteId.trim();
  const siteEnc = encodeURIComponent(siteId);
  const doFetch = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;

  async function graphFetch(url: string, init: RequestInit): Promise<{ status: number; json: unknown }> {
    const parsed = parsePmGraphListItemsUrl(url);
    if (!parsed || normalizeGuid(parsed.siteId) !== normalizeGuid(siteId)) {
      rejected('SharePoint PM Graph request was rejected.');
    }
    const token = await tokenProvider.getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await doFetch(url, {
        ...init,
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/json',
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...(init.headers || {}),
        },
        signal: controller.signal,
        redirect: 'manual',
      });
      if (resp.status >= 300 && resp.status < 400) {
        rejected('SharePoint PM Graph redirect was rejected.');
      }
      const text = await resp.text();
      let json: unknown = {};
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = { error: { code: 'invalid_json' } };
        }
      }
      return { status: resp.status, json };
    } catch (err) {
      if (err instanceof PmHttpError) throw err;
      if (err && typeof err === 'object' && 'code' in err && 'status' in err) throw err;
      rejected('SharePoint PM Graph request failed.');
    } finally {
      clearTimeout(timer);
    }
  }

  function mapStatus(status: number): never {
    if (status === 412) {
      throw new PmHttpError(412, 'PM_ETAG_CONFLICT', 'The SharePoint item was updated by another request.');
    }
    if (status === 404) {
      throw new PmHttpError(404, 'not_found', 'not_found');
    }
    if (status === 401 || status === 403) {
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'SharePoint PM permission or token was rejected.');
    }
    if (status >= 500) {
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'SharePoint PM Graph request failed.');
    }
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'SharePoint PM Graph request failed.');
  }

  function itemsCollectionUrl(listId: string, search: string): string {
    return `${GRAPH_ORIGIN}/${GRAPH_API_VERSION}/sites/${siteEnc}/lists/${encodeURIComponent(listId)}/items${search}`;
  }

  return {
    async listItems(listId, opts) {
      capabilityForPmList(allowlist, listId);
      let url: string;
      if (opts?.nextLink) {
        url = assertSafeNextLink(opts.nextLink, siteId, listId).toString();
      } else {
        const params = new URLSearchParams();
        params.set('$expand', 'fields');
        params.set('$top', String(opts?.top && opts.top > 0 ? Math.min(opts.top, 100) : DEFAULT_TOP));
        // Never send $filter to Graph. Lists.SelectedOperations.Selected treats
        // fields/ filters as 403, which Elite surfaces as a token rejection.
        url = itemsCollectionUrl(listId, `?${params.toString()}`);
      }
      const { status, json } = await graphFetch(url, { method: 'GET' });
      if (status !== 200) mapStatus(status);
      const body = json as { value?: unknown[]; '@odata.nextLink'?: unknown };
      const values = Array.isArray(body.value) ? body.value : [];
      const items = values
        .filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object')
        .map(parseItem)
        .filter((i) => i.id);
      const next =
        typeof body['@odata.nextLink'] === 'string' ? body['@odata.nextLink'] : undefined;
      if (next) assertSafeNextLink(next, siteId, listId);
      return { items, nextLink: next };
    },

    async getItem(listId, itemId) {
      capabilityForPmList(allowlist, listId);
      const url = itemsCollectionUrl(listId, `/${encodeURIComponent(itemId)}?$expand=fields`);
      const { status, json } = await graphFetch(url, { method: 'GET' });
      if (status === 404) return null;
      if (status !== 200) mapStatus(status);
      const item = parseItem(json as Record<string, unknown>);
      return item.id ? item : null;
    },

    async createItem(listId, fields) {
      assertWritable(capabilityForPmList(allowlist, listId));
      const url = itemsCollectionUrl(listId, '');
      const { status, json } = await graphFetch(url, {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      if (status !== 201 && status !== 200) mapStatus(status);
      const item = parseItem(json as Record<string, unknown>);
      if (!item.id) {
        throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'SharePoint PM create returned no item id.');
      }
      return item;
    },

    async patchItemFields(listId, itemId, fields, etag) {
      assertWritable(capabilityForPmList(allowlist, listId));
      if (!etag || etag === '*') {
        throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');
      }
      const url = `${GRAPH_ORIGIN}/${GRAPH_API_VERSION}/sites/${siteEnc}/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/fields`;
      const { status, json } = await graphFetch(url, {
        method: 'PATCH',
        headers: { 'if-match': etag },
        body: JSON.stringify(fields),
      });
      if (status !== 200) mapStatus(status);
      const refreshed = await this.getItem(listId, itemId);
      if (refreshed) return refreshed;
      const item = parseItem({ id: itemId, fields: json as Record<string, unknown> });
      return item;
    },
  };
}
