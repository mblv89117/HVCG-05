/**
 * Narrow Microsoft Graph v1.0 transport for the four MVP PM lists.
 * Does not enumerate site lists. Does not follow nextLink off graph.microsoft.com.
 */

import { pmInfrastructureError, PmHttpError } from './errors.ts';
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

const GRAPH_ORIGIN = 'https://graph.microsoft.com';
const GRAPH_HOST = 'graph.microsoft.com';
const DEFAULT_TOP = 100;
const TIMEOUT_MS = 15_000;

function assertSafeNextLink(nextLink: string, siteId: string): URL {
  let url: URL;
  try {
    url = new URL(nextLink);
  } catch {
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'SharePoint PM pagination link was rejected.');
  }
  if (url.protocol !== 'https:' || url.hostname !== GRAPH_HOST) {
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'SharePoint PM pagination link was rejected.');
  }
  if (!url.pathname.startsWith('/v1.0/sites/')) {
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'SharePoint PM pagination link was rejected.');
  }
  if (!decodeURIComponent(url.pathname).includes(siteId)) {
    throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'SharePoint PM pagination link was rejected.');
  }
  return url;
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
  siteId: string,
  tokenProvider: PmGraphTokenProvider,
): PmGraphTransport {
  async function graphFetch(url: string, init: RequestInit): Promise<{ status: number; json: unknown }> {
    const token = await tokenProvider.getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const resp = await fetch(url, {
        ...init,
        headers: {
          authorization: `Bearer ${token}`,
          accept: 'application/json',
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...(init.headers || {}),
        },
        signal: controller.signal,
      });
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
      if (err && typeof err === 'object' && 'code' in err) throw err;
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'SharePoint PM Graph request failed.');
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

  const siteEnc = encodeURIComponent(siteId);

  return {
    async listItems(listId, opts) {
      let url: string;
      if (opts?.nextLink) {
        url = assertSafeNextLink(opts.nextLink, siteId).toString();
      } else {
        const params = new URLSearchParams();
        params.set('$expand', 'fields');
        params.set('$top', String(opts?.top && opts.top > 0 ? Math.min(opts.top, 100) : DEFAULT_TOP));
        if (opts?.filter) params.set('$filter', opts.filter);
        url = `${GRAPH_ORIGIN}/v1.0/sites/${siteEnc}/lists/${encodeURIComponent(listId)}/items?${params.toString()}`;
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
      if (next) assertSafeNextLink(next, siteId);
      return { items, nextLink: next };
    },

    async getItem(listId, itemId) {
      const url = `${GRAPH_ORIGIN}/v1.0/sites/${siteEnc}/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}?$expand=fields`;
      const { status, json } = await graphFetch(url, { method: 'GET' });
      if (status === 404) return null;
      if (status !== 200) mapStatus(status);
      const item = parseItem(json as Record<string, unknown>);
      return item.id ? item : null;
    },

    async createItem(listId, fields) {
      const url = `${GRAPH_ORIGIN}/v1.0/sites/${siteEnc}/lists/${encodeURIComponent(listId)}/items`;
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
      if (!etag || etag === '*') {
        throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');
      }
      const url = `${GRAPH_ORIGIN}/v1.0/sites/${siteEnc}/lists/${encodeURIComponent(listId)}/items/${encodeURIComponent(itemId)}/fields`;
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
