/**
 * Narrow Microsoft Graph v1.0 transport for capital lists.
 *
 * Capital has its own allowlist. Do not call capabilityForPmList.
 * PM project/task IDs are rejected unless they happen to equal a configured
 * capital list ID (they must not).
 *
 * Does not follow nextLink off graph.microsoft.com or onto another list/site.
 */

import {
  GRAPH_API_VERSION,
  GRAPH_ORIGIN,
  parsePmGraphListItemsUrl,
  type GraphListItem,
  type GraphListPage,
  type GraphTransportDeps,
  type PmGraphTransport,
} from '../../pm/sharepoint/graph.ts';
import type { PmGraphTokenProvider } from '../../pm/sharepoint/token.ts';
import { CAPITAL_BACKEND_UNAVAILABLE, CapitalHttpError, capitalInfrastructureError } from '../errors.ts';
import type { SharePointCapitalSettings } from './settings.ts';

export type { GraphListItem, GraphListPage };
export type CapitalGraphTransport = PmGraphTransport;
export type CapitalListCapability = 'read' | 'write';

export type CapitalGraphResourceAllowlist = Pick<
  SharePointCapitalSettings,
  'siteId' | 'opportunitiesListId' | 'documentRequestsListId' | 'lenderOutreachListId'
> & {
  lendersListId?: string;
  clientsListId?: string;
};

const DEFAULT_TOP = 100;
const TIMEOUT_MS = 15_000;

function rejected(message: string): never {
  throw capitalInfrastructureError(CAPITAL_BACKEND_UNAVAILABLE, message);
}

function normalizeGuid(value: string): string {
  return value.trim().toLowerCase();
}

export function capabilityForCapitalList(
  allowlist: CapitalGraphResourceAllowlist,
  listId: string,
): CapitalListCapability {
  const id = normalizeGuid(listId);
  if (!id) rejected('SharePoint capital list is not in the approved resource allowlist.');
  if (id === normalizeGuid(allowlist.opportunitiesListId)) return 'write';
  if (id === normalizeGuid(allowlist.documentRequestsListId)) return 'write';
  if (id === normalizeGuid(allowlist.lenderOutreachListId)) return 'write';
  if (allowlist.clientsListId && id === normalizeGuid(allowlist.clientsListId)) return 'read';
  if (allowlist.lendersListId && id === normalizeGuid(allowlist.lendersListId)) return 'read';
  rejected('SharePoint capital list is not in the approved resource allowlist.');
}

function assertWritable(capability: CapitalListCapability): void {
  if (capability !== 'write') {
    rejected('SharePoint capital list does not allow this operation.');
  }
}

function assertSafeNextLink(nextLink: string, siteId: string, listId: string): URL {
  const parsed = parsePmGraphListItemsUrl(nextLink);
  if (!parsed) rejected('SharePoint capital pagination link was rejected.');
  if (normalizeGuid(parsed.siteId) !== normalizeGuid(siteId)) {
    rejected('SharePoint capital pagination link was rejected.');
  }
  if (normalizeGuid(parsed.listId) !== normalizeGuid(listId)) {
    rejected('SharePoint capital pagination link was rejected.');
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

export function createCapitalGraphTransport(
  allowlist: CapitalGraphResourceAllowlist,
  tokenProvider: PmGraphTokenProvider,
  deps: GraphTransportDeps = {},
): CapitalGraphTransport {
  const siteId = allowlist.siteId.trim();
  const siteEnc = encodeURIComponent(siteId);
  const doFetch = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;

  async function graphFetch(url: string, init: RequestInit): Promise<{ status: number; json: unknown }> {
    const parsed = parsePmGraphListItemsUrl(url);
    if (!parsed || normalizeGuid(parsed.siteId) !== normalizeGuid(siteId)) {
      rejected('SharePoint capital Graph request was rejected.');
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
        rejected('SharePoint capital Graph redirect was rejected.');
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
      if (err instanceof CapitalHttpError) throw err;
      if (err && typeof err === 'object' && 'code' in err && 'status' in err) throw err;
      rejected('SharePoint capital Graph request failed.');
    } finally {
      clearTimeout(timer);
    }
  }

  function mapStatus(status: number): never {
    if (status === 412) {
      throw new CapitalHttpError(412, 'CAPITAL_ETAG_CONFLICT', 'The SharePoint item was updated by another request.');
    }
    if (status === 404) {
      throw new CapitalHttpError(404, 'not_found', 'not_found');
    }
    if (status === 401 || status === 403) {
      throw capitalInfrastructureError(
        CAPITAL_BACKEND_UNAVAILABLE,
        'SharePoint capital permission or token was rejected.',
      );
    }
    throw capitalInfrastructureError(CAPITAL_BACKEND_UNAVAILABLE, 'SharePoint capital Graph request failed.');
  }

  function itemsCollectionUrl(listId: string, search: string): string {
    return `${GRAPH_ORIGIN}/${GRAPH_API_VERSION}/sites/${siteEnc}/lists/${encodeURIComponent(listId)}/items${search}`;
  }

  return {
    async listItems(listId, opts) {
      capabilityForCapitalList(allowlist, listId);
      let url: string;
      if (opts?.nextLink) {
        url = assertSafeNextLink(opts.nextLink, siteId, listId).toString();
      } else {
        const params = new URLSearchParams();
        params.set('$expand', 'fields');
        params.set('$top', String(opts?.top && opts.top > 0 ? Math.min(opts.top, 100) : DEFAULT_TOP));
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
      const next = typeof body['@odata.nextLink'] === 'string' ? body['@odata.nextLink'] : undefined;
      if (next) assertSafeNextLink(next, siteId, listId);
      return { items, nextLink: next };
    },

    async getItem(listId, itemId) {
      capabilityForCapitalList(allowlist, listId);
      const url = itemsCollectionUrl(listId, `/${encodeURIComponent(itemId)}?$expand=fields`);
      const { status, json } = await graphFetch(url, { method: 'GET' });
      if (status === 404) return null;
      if (status !== 200) mapStatus(status);
      const item = parseItem(json as Record<string, unknown>);
      return item.id ? item : null;
    },

    async createItem(listId, fields) {
      assertWritable(capabilityForCapitalList(allowlist, listId));
      const url = itemsCollectionUrl(listId, '');
      const { status, json } = await graphFetch(url, {
        method: 'POST',
        body: JSON.stringify({ fields }),
      });
      if (status !== 201 && status !== 200) mapStatus(status);
      const item = parseItem(json as Record<string, unknown>);
      if (!item.id) {
        throw capitalInfrastructureError(CAPITAL_BACKEND_UNAVAILABLE, 'SharePoint capital create returned no item id.');
      }
      return item;
    },

    async patchItemFields(listId, itemId, fields, etag) {
      assertWritable(capabilityForCapitalList(allowlist, listId));
      if (!etag || etag === '*') {
        throw new CapitalHttpError(400, 'CAPITAL_ETAG_REQUIRED', 'If-Match is required for SharePoint capital updates.');
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
      return parseItem({ id: itemId, fields: json as Record<string, unknown> });
    },
  };
}
