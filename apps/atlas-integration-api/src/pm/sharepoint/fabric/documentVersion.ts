/**
 * Graph driveItem version metadata for already-indexed files.
 * Proven drive/item ids only. No binary copy, no downloadUrl, no anonymous links.
 * OPEN_SOURCE: microsoft-graph-client (MIT) evaluated 2026-08-24.
 * DECISION: ADAPT the existing allowlisted Fabric Graph helper.
 * REJECT a second versioning product, SDK, or queue.
 */

import { describeGraphListWriteError } from '../indexWrite.ts';
import { isProvenGraphId, type ProvenDriveItemRef } from './fileIndex.ts';
import type { FabricGraphClient } from './graph.ts';

export const DOCUMENT_VERSION_BASED_ON =
  'Microsoft Graph GET /drives/{id}/items/{id}/versions';
export const DOCUMENT_VERSION_PAGE_SIZE = 5;

export type DocumentVersionStatus = 'ready' | 'skipped' | 'error';

export interface DocumentVersionEntry {
  id: string;
  lastModifiedDateTime?: string;
  size?: number;
}

export interface DocumentVersionFields {
  versionStatus: DocumentVersionStatus;
  versionSkipReason?: string;
  currentVersionId?: string;
  versionCount?: number;
  versions?: DocumentVersionEntry[];
  versionBasedOn: typeof DOCUMENT_VERSION_BASED_ON;
}

const VERSION_ID_RE = /^[A-Za-z0-9._-]{1,64}$/;
const GRAPH_VERSION_UNSUPPORTED = new Set([400, 403, 404, 405]);

function asArray(json: Record<string, unknown>): Record<string, unknown>[] {
  const value = json.value;
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
}

function isSafeVersionId(raw?: string): boolean {
  const id = (raw || '').trim();
  if (!id) return false;
  if (/^https?:\/\//i.test(id) || id.includes('/') || id.includes('\\') || /\s/.test(id)) return false;
  return VERSION_ID_RE.test(id);
}

function isoOrUndefined(raw: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms).toISOString();
}

function finiteSize(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return Math.max(0, Math.floor(raw));
}

export function indexedDocumentVersionsPath(ref: ProvenDriveItemRef): string | undefined {
  if (!isProvenGraphId(ref.driveId) || !isProvenGraphId(ref.itemId)) return undefined;
  return `/v1.0/drives/${ref.driveId}/items/${ref.itemId}/versions?$select=id,lastModifiedDateTime,size&$top=${DOCUMENT_VERSION_PAGE_SIZE}`;
}

function skipped(reason: string): DocumentVersionFields {
  return {
    versionStatus: 'skipped',
    versionSkipReason: reason,
    versionBasedOn: DOCUMENT_VERSION_BASED_ON,
  };
}

function errored(reason: string): DocumentVersionFields {
  return {
    versionStatus: 'error',
    versionSkipReason: reason,
    versionBasedOn: DOCUMENT_VERSION_BASED_ON,
  };
}

function graphVersionReason(status: number, json: Record<string, unknown>): string {
  const info = describeGraphListWriteError(status, json);
  const detail = [info.graphCode, info.sanitizedMessage].filter(Boolean).join(': ');
  return detail
    ? `Graph rejected driveItem versions HTTP ${status} (${detail})`
    : `Graph rejected driveItem versions HTTP ${status}`;
}

function mapVersionRow(row: Record<string, unknown>): DocumentVersionEntry | undefined {
  const id = typeof row.id === 'string' ? row.id.trim() : '';
  if (!isSafeVersionId(id)) return undefined;
  const lastModifiedDateTime = isoOrUndefined(row.lastModifiedDateTime);
  const size = finiteSize(row.size);
  return {
    id,
    ...(lastModifiedDateTime ? { lastModifiedDateTime } : {}),
    ...(typeof size === 'number' ? { size } : {}),
  };
}

export function mapGraphVersionResponse(
  status: number,
  json: Record<string, unknown>,
): DocumentVersionFields {
  if (GRAPH_VERSION_UNSUPPORTED.has(status)) {
    return skipped(`${graphVersionReason(status, json)}; scheduled file index remains`);
  }
  if (status !== 200) {
    if (status === 0) {
      return errored('Graph versions request failed before an HTTP response');
    }
    return errored(graphVersionReason(status, json));
  }
  const mapped = asArray(json)
    .map(mapVersionRow)
    .filter((row): row is DocumentVersionEntry => Boolean(row))
    .slice(0, DOCUMENT_VERSION_PAGE_SIZE);
  const current = mapped[0];
  return {
    versionStatus: 'ready',
    ...(current ? { currentVersionId: current.id } : {}),
    versionCount: mapped.length,
    ...(mapped.length ? { versions: mapped } : {}),
    versionBasedOn: DOCUMENT_VERSION_BASED_ON,
  };
}

export async function requestIndexedDocumentVersions(
  fabric: FabricGraphClient,
  ref: ProvenDriveItemRef,
): Promise<DocumentVersionFields> {
  const path = indexedDocumentVersionsPath(ref);
  if (!path) {
    return skipped('no proven drive/item id from the existing indexer');
  }
  try {
    const { status, json } = await fabric.getJson(path);
    return mapGraphVersionResponse(status, json);
  } catch (err) {
    const message = err instanceof Error && err.message.trim() ? err.message.trim().slice(0, 180) : '';
    return errored(
      message
        ? `Graph versions request failed: ${message}`
        : 'Graph versions request failed before an HTTP response',
    );
  }
}
