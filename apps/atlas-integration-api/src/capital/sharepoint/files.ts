/**
 * Capital SharePoint file ingest — Graph drive GET only.
 * Never follows a user-supplied webUrl. Sites.Read.All is sufficient.
 * List allowlist stays separate; this module does not write files.
 */

import { GRAPH_API_VERSION, GRAPH_ORIGIN } from '../../pm/sharepoint/graph.ts';
import type { PmGraphTokenProvider } from '../../pm/sharepoint/token.ts';
import { CapitalHttpError, capitalInfrastructureError, forbidden, unprocessable } from '../errors.ts';
import { clientCodeFromSharePointPath, MAX_INGEST_BYTES } from '@hvcg/atlas-capital-core';

export interface CapitalFileMetadata {
  driveId: string;
  itemId: string;
  name: string;
  mimeType?: string;
  size: number;
  webUrl?: string;
  createdAt?: string;
  modifiedAt?: string;
  parentPath?: string;
  libraryClientCode: string | null;
}

export interface CapitalFileSource {
  getItem(driveId: string, itemId: string): Promise<CapitalFileMetadata>;
  getContent(driveId: string, itemId: string, maxBytes?: number): Promise<Buffer>;
}

const TIMEOUT_MS = 20_000;
const ID_RE = /^[A-Za-z0-9!._-]+$/;

function rejected(message: string): never {
  throw capitalInfrastructureError('CAPITAL_BACKEND_UNAVAILABLE', message);
}

export function assertSafeDriveIds(driveId: string, itemId: string): void {
  if (!driveId || !itemId || !ID_RE.test(driveId) || !ID_RE.test(itemId)) {
    unprocessable('driveId and itemId are required SharePoint identifiers');
  }
}

export function assertFileBelongsToClient(meta: CapitalFileMetadata, clientCode: string): void {
  const fromPath = meta.libraryClientCode || clientCodeFromSharePointPath(meta.parentPath || '') || clientCodeFromSharePointPath(meta.webUrl || '');
  if (!fromPath) {
    forbidden('SharePoint file is not in an HVCG_{ClientCode} library');
  }
  if (fromPath !== clientCode) {
    forbidden('SharePoint file does not belong to the authorized client');
  }
}

export class MemoryCapitalFileSource implements CapitalFileSource {
  readonly items = new Map<string, { meta: CapitalFileMetadata; bytes: Buffer }>();

  seed(meta: CapitalFileMetadata, bytes: Buffer): void {
    this.items.set(`${meta.driveId}:${meta.itemId}`, { meta, bytes });
  }

  async getItem(driveId: string, itemId: string): Promise<CapitalFileMetadata> {
    const hit = this.items.get(`${driveId}:${itemId}`);
    if (!hit) throw new CapitalHttpError(404, 'not_found', 'SharePoint file not found');
    return hit.meta;
  }

  async getContent(driveId: string, itemId: string, maxBytes = MAX_INGEST_BYTES): Promise<Buffer> {
    const hit = this.items.get(`${driveId}:${itemId}`);
    if (!hit) throw new CapitalHttpError(404, 'not_found', 'SharePoint file not found');
    if (hit.bytes.length > maxBytes) unprocessable('File exceeds ingest size limit');
    return hit.bytes;
  }
}

export function createGraphCapitalFileSource(
  tokenProvider: PmGraphTokenProvider,
  deps: { fetch?: typeof fetch; timeoutMs?: number } = {},
): CapitalFileSource {
  const doFetch = deps.fetch ?? fetch;
  const timeoutMs = deps.timeoutMs ?? TIMEOUT_MS;

  async function graphGet(url: string, asBuffer: boolean): Promise<{ status: number; json?: unknown; bytes?: Buffer }> {
    const parsed = new URL(url);
    if (parsed.origin !== GRAPH_ORIGIN) rejected('SharePoint file Graph request was rejected.');
    if (!parsed.pathname.startsWith(`/${GRAPH_API_VERSION}/drives/`)) {
      rejected('SharePoint file Graph request was rejected.');
    }
    const token = await tokenProvider.getToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await doFetch(url, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}`, accept: asBuffer ? '*/*' : 'application/json' },
        signal: controller.signal,
        redirect: 'manual',
      });
      if (resp.status >= 300 && resp.status < 400) rejected('SharePoint file Graph redirect was rejected.');
      if (asBuffer) {
        const bytes = Buffer.from(await resp.arrayBuffer());
        return { status: resp.status, bytes };
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
      rejected('SharePoint file Graph request failed.');
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async getItem(driveId, itemId) {
      assertSafeDriveIds(driveId, itemId);
      const url = `${GRAPH_ORIGIN}/${GRAPH_API_VERSION}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}?$select=id,name,size,file,webUrl,parentReference,createdDateTime,lastModifiedDateTime`;
      const { status, json } = await graphGet(url, false);
      if (status === 404) throw new CapitalHttpError(404, 'not_found', 'SharePoint file not found');
      if (status === 401 || status === 403) {
        throw capitalInfrastructureError('CAPITAL_BACKEND_UNAVAILABLE', 'SharePoint file permission or token was rejected.');
      }
      if (status !== 200) rejected('SharePoint file Graph request failed.');
      const row = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
      const parent = row.parentReference && typeof row.parentReference === 'object' ? (row.parentReference as Record<string, unknown>) : {};
      const file = row.file && typeof row.file === 'object' ? (row.file as Record<string, unknown>) : {};
      const parentPath = typeof parent.path === 'string' ? parent.path : '';
      const webUrl = typeof row.webUrl === 'string' ? row.webUrl : '';
      return {
        driveId,
        itemId: typeof row.id === 'string' ? row.id : itemId,
        name: typeof row.name === 'string' ? row.name : 'unknown',
        mimeType: typeof file.mimeType === 'string' ? file.mimeType : undefined,
        size: typeof row.size === 'number' ? row.size : 0,
        webUrl,
        createdAt: typeof row.createdDateTime === 'string' ? row.createdDateTime : undefined,
        modifiedAt: typeof row.lastModifiedDateTime === 'string' ? row.lastModifiedDateTime : undefined,
        parentPath,
        libraryClientCode: clientCodeFromSharePointPath(parentPath) || clientCodeFromSharePointPath(webUrl),
      };
    },

    async getContent(driveId, itemId, maxBytes = MAX_INGEST_BYTES) {
      assertSafeDriveIds(driveId, itemId);
      const url = `${GRAPH_ORIGIN}/${GRAPH_API_VERSION}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`;
      const { status, bytes } = await graphGet(url, true);
      if (status === 404) throw new CapitalHttpError(404, 'not_found', 'SharePoint file not found');
      if (status === 401 || status === 403) {
        throw capitalInfrastructureError('CAPITAL_BACKEND_UNAVAILABLE', 'SharePoint file permission or token was rejected.');
      }
      if (status !== 200 || !bytes) rejected('SharePoint file Graph request failed.');
      if (bytes.length > maxBytes) unprocessable('File exceeds ingest size limit');
      return bytes;
    },
  };
}
