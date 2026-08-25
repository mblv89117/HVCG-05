/**
 * Short-lived Graph driveItem preview for already-indexed files.
 * Metadata + proven drive/item ids only. No binary copy.
 * OPEN_SOURCE: microsoft-graph-client (MIT) evaluated 2026-08-24.
 * DECISION: ADAPT the existing allowlisted Fabric Graph helper.
 * REJECT a second preview service, SDK, or queue.
 */

import { describeGraphListWriteError } from '../indexWrite.ts';
import {
  authoritativeSourceUrl,
  isProvenGraphId,
  type ProvenDriveItemRef,
} from './fileIndex.ts';
import type { FabricGraphClient } from './graph.ts';

export const DOCUMENT_PREVIEW_BASED_ON =
  'Microsoft Graph POST /drives/{id}/items/{id}/preview';
/** Graph preview sessions are short-lived. Expiry is honest, not permanent. */
export const DOCUMENT_PREVIEW_TTL_MS = 5 * 60 * 1000;
export const DOCUMENT_PREVIEW_PAGE_SIZE = 5;

export type DocumentPreviewStatus = 'ready' | 'skipped' | 'error';

export interface DocumentPreviewFields {
  previewStatus: DocumentPreviewStatus;
  previewExpiresAt?: string;
  previewGetUrl?: string;
  previewPostUrl?: string;
  previewSkipReason?: string;
  basedOn: typeof DOCUMENT_PREVIEW_BASED_ON;
}

const PREVIEW_HOST_RE =
  /(^|\.)sharepoint\.com$|(^|\.)sharepoint\.us$|(^|\.)office\.com$|(^|\.)office365\.com$|(^|\.)onedrive\.com$|^onedrive\.live\.com$|(^|\.)microsoft\.com$/i;
const ANONYMOUS_SHARE_RE =
  /(?:[?&](?:share|guestaccess|skydriveshare)=)|guestaccess\.aspx|_layouts\/15\/guestaccess/i;
const SAS_RE = /(?:[?&](?:sv|sig|se|sp|spr|srt|ss|st|sig)=)|blob\.core\.windows\.net/i;

function isUnsupportedPreviewStatus(status: number): boolean {
  return status === 400 || status === 403 || status === 404 || status === 405;
}

export function indexedDocumentPreviewPath(ref: ProvenDriveItemRef): string | undefined {
  if (!isProvenGraphId(ref.driveId) || !isProvenGraphId(ref.itemId)) return undefined;
  return `/v1.0/drives/${ref.driveId}/items/${ref.itemId}/preview`;
}

/**
 * Graph-returned embed preview URLs only. Drops anonymous shares and SAS.
 * Not an authoritative document permalink.
 */
export function isGraphPreviewEmbedUrl(raw?: string): boolean {
  const trimmed = (raw || '').trim();
  if (!/^https:\/\//i.test(trimmed)) return false;
  if (ANONYMOUS_SHARE_RE.test(trimmed) || SAS_RE.test(trimmed)) return false;
  if (authoritativeSourceUrl(trimmed)) return true;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    return PREVIEW_HOST_RE.test(host);
  } catch {
    return false;
  }
}

function graphPreviewReason(status: number, json: Record<string, unknown>): string {
  const info = describeGraphListWriteError(status, json);
  const detail = [info.graphCode, info.sanitizedMessage].filter(Boolean).join(': ');
  return detail
    ? `Graph rejected driveItem preview HTTP ${status} (${detail})`
    : `Graph rejected driveItem preview HTTP ${status}`;
}

function skipped(reason: string): DocumentPreviewFields {
  return {
    previewStatus: 'skipped',
    previewSkipReason: reason,
    basedOn: DOCUMENT_PREVIEW_BASED_ON,
  };
}

function errored(reason: string): DocumentPreviewFields {
  return {
    previewStatus: 'error',
    previewSkipReason: reason,
    basedOn: DOCUMENT_PREVIEW_BASED_ON,
  };
}

export function mapGraphPreviewResponse(
  status: number,
  json: Record<string, unknown>,
  now = new Date(),
): DocumentPreviewFields {
  if (isUnsupportedPreviewStatus(status)) {
    return skipped(`${graphPreviewReason(status, json)}; scheduled file index remains`);
  }
  if (status !== 200 && status !== 201) {
    if (status === 0) {
      return errored('Graph preview request failed before an HTTP response');
    }
    return errored(graphPreviewReason(status, json));
  }
  const getUrl = typeof json.getUrl === 'string' ? json.getUrl.trim() : '';
  const postUrl = typeof json.postUrl === 'string' ? json.postUrl.trim() : '';
  const safeGet = getUrl && isGraphPreviewEmbedUrl(getUrl) ? getUrl : undefined;
  const safePost = postUrl && isGraphPreviewEmbedUrl(postUrl) ? postUrl : undefined;
  if (!safeGet && !safePost) {
    return skipped('Graph preview returned no usable short-lived URL');
  }
  return {
    previewStatus: 'ready',
    previewExpiresAt: new Date(now.getTime() + DOCUMENT_PREVIEW_TTL_MS).toISOString(),
    ...(safeGet ? { previewGetUrl: safeGet } : {}),
    ...(safePost ? { previewPostUrl: safePost } : {}),
    basedOn: DOCUMENT_PREVIEW_BASED_ON,
  };
}

export async function requestIndexedDocumentPreview(
  fabric: FabricGraphClient,
  ref: ProvenDriveItemRef,
  now = new Date(),
): Promise<DocumentPreviewFields> {
  const path = indexedDocumentPreviewPath(ref);
  if (!path) {
    return skipped('no proven drive/item id from the existing indexer');
  }
  try {
    const { status, json } = await fabric.postJson(path, {});
    return mapGraphPreviewResponse(status, json, now);
  } catch (err) {
    const message = err instanceof Error && err.message.trim() ? err.message.trim().slice(0, 180) : '';
    return errored(
      message
        ? `Graph preview request failed: ${message}`
        : 'Graph preview request failed before an HTTP response',
    );
  }
}
