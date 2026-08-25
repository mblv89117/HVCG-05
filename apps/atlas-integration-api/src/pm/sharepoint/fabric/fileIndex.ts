/**
 * File-index row markers. Metadata + source link only. No binary copy.
 */

export const FILE_INDEX_MARKER = 'File metadata index';
export const FILE_RESTRICTED_MARKER = 'RESTRICTED — metadata and source link only';

export function isFileIndexRow(item: {
  summary?: unknown;
  sourceItemId?: unknown;
  channel?: unknown;
}): boolean {
  const summary = String(item.summary || '');
  const src = String(item.sourceItemId || '');
  return (
    summary.includes(FILE_INDEX_MARKER) ||
    summary.includes(FILE_RESTRICTED_MARKER) ||
    src.startsWith('file:')
  );
}

export function extractSourceUrl(summary: string): string | undefined {
  const match = /\bSource:\s*(https:\/\/[^\s]+)/.exec(summary);
  if (!match) return undefined;
  return match[1].replace(/[.,;)]+$/, '');
}

const ANONYMOUS_SHARE_RE =
  /(?:[?&](?:share|guestaccess|skydriveshare)=)|guestaccess\.aspx|_layouts\/15\/guestaccess/i;
const SAS_RE = /(?:[?&](?:sv|sig|se|sp|spr|srt|ss|st|sig)=)|blob\.core\.windows\.net/i;
const AUTHORITATIVE_HOST_RE =
  /(^|\.)sharepoint\.com$|(^|\.)sharepoint\.us$|(^|\.)office\.com$|(^|\.)office365\.com$|^onedrive\.live\.com$/i;

/**
 * Graph/SharePoint item webUrl only. Drops anonymous sharing links and SAS.
 * Never returns a generated or unsigned URL.
 */
export function authoritativeSourceUrl(raw?: string): string | undefined {
  const trimmed = (raw || '').trim().replace(/[.,;)]+$/, '');
  if (!/^https:\/\//i.test(trimmed)) return undefined;
  if (ANONYMOUS_SHARE_RE.test(trimmed) || SAS_RE.test(trimmed)) return undefined;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (!AUTHORITATIVE_HOST_RE.test(host)) return undefined;
    return trimmed;
  } catch {
    return undefined;
  }
}

const PROVEN_GRAPH_ID_RE = /^[A-Za-z0-9!._~+=-]{1,512}$/;

export interface ProvenDriveItemRef {
  driveId: string;
  itemId: string;
}

/** Graph drive/item ids copied from the indexer. Never invented from webUrl. */
export function isProvenGraphId(raw?: string): boolean {
  const id = (raw || '').trim();
  if (!id) return false;
  if (id.toLowerCase().startsWith('library:')) return false;
  if (id.includes('/') || id.includes('\\') || id.includes('..') || /\s/.test(id)) return false;
  return PROVEN_GRAPH_ID_RE.test(id);
}

export function extractProvenDriveItemRef(
  summary: string,
  extras?: { sourceItemId?: unknown; driveId?: unknown; itemId?: unknown },
): ProvenDriveItemRef | undefined {
  const fieldDrive = typeof extras?.driveId === 'string' ? extras.driveId.trim() : '';
  const fieldItem = typeof extras?.itemId === 'string' ? extras.itemId.trim() : '';
  const driveMatch = /\bDrive:([A-Za-z0-9!._~+=-]+)/.exec(summary || '');
  const itemMatch = /\bItem:([A-Za-z0-9!._~+=-]+)/.exec(summary || '');
  const keyMatch = /\bKey:file:([A-Za-z0-9!._~+=-]+)/.exec(summary || '');
  const src = typeof extras?.sourceItemId === 'string' ? extras.sourceItemId.trim() : '';
  const srcItem = src.startsWith('file:') ? src.slice('file:'.length) : src;
  const driveId = fieldDrive || driveMatch?.[1] || '';
  const itemId = fieldItem || itemMatch?.[1] || keyMatch?.[1] || srcItem;
  if (!isProvenGraphId(driveId) || !isProvenGraphId(itemId)) return undefined;
  return { driveId, itemId };
}

export function fileIndexSummary(opts: {
  restricted: boolean;
  webUrl?: string;
  idempotencyKey: string;
  driveId?: string;
  itemId?: string;
}): string {
  const head = opts.restricted
    ? `${FILE_RESTRICTED_MARKER}. Binary not stored.`
    : `${FILE_INDEX_MARKER}. Binary remains in OneDrive/SharePoint.`;
  const source = opts.webUrl ? ` Source: ${opts.webUrl}` : '';
  const proven =
    isProvenGraphId(opts.driveId) && isProvenGraphId(opts.itemId)
      ? ` Drive:${opts.driveId} Item:${opts.itemId}`
      : '';
  return `${head}${source}${proven} Key:${opts.idempotencyKey}`.slice(0, 2000);
}

/** Mail attachment metadata-only index. Never stores bytes or anonymous share URLs. */
export function attachmentIndexSummary(opts: {
  webUrl?: string;
  parentMessageId: string;
  attachmentId: string;
  contentType?: string;
  size?: number;
  idempotencyKey: string;
}): string {
  const source = opts.webUrl ? ` Source: ${opts.webUrl}` : '';
  const parent = opts.parentMessageId ? ` Parent:${opts.parentMessageId}` : '';
  const att = opts.attachmentId ? ` Att:${opts.attachmentId}` : '';
  const type = opts.contentType ? ` Type:${opts.contentType}` : '';
  const size = typeof opts.size === 'number' && Number.isFinite(opts.size) ? ` Size:${Math.max(0, Math.floor(opts.size))}` : '';
  return `${FILE_RESTRICTED_MARKER}. Binary not stored.${source}${parent}${att}${type}${size} Key:${opts.idempotencyKey}`.slice(
    0,
    2000,
  );
}

const MAIL_ATT_KEY_RE = /\bKey:(mail-att:[^\s]+)/;
const PARENT_ID_RE = /\bParent:([A-Za-z0-9!._~+=-]{1,512})/;
const ATT_ID_RE = /\bAtt:([A-Za-z0-9!._~+=-]{1,512})/;
const ATT_TYPE_RE = /\bType:([^\s]+)/;
const ATT_SIZE_RE = /\bSize:(\d+)/;
const GRAPH_ID_SAFE_RE = /^[A-Za-z0-9!._~+=-]{1,512}$/;

export interface MailAttachmentIndexRef {
  parentMessageId: string;
  attachmentId: string;
  contentType?: string;
  size?: number;
  idempotencyKey?: string;
}

/** Already-indexed outlook-mail-attachment metadata. Never invents ids. */
export function isMailAttachmentIndexRow(item: {
  summary?: unknown;
  sourceItemId?: unknown;
  provenanceSource?: unknown;
}): boolean {
  const summary = String(item.summary || '');
  const src = String(item.sourceItemId || '');
  const provenance = String(item.provenanceSource || '');
  if (provenance === 'outlook-mail-attachment') return true;
  if (src.startsWith('mail-att:')) return true;
  if (MAIL_ATT_KEY_RE.test(summary)) return true;
  return summary.includes(FILE_RESTRICTED_MARKER) && PARENT_ID_RE.test(summary) && ATT_ID_RE.test(summary);
}

function safeGraphishId(raw?: string): string {
  const id = (raw || '').trim();
  return GRAPH_ID_SAFE_RE.test(id) ? id : '';
}

/**
 * Parent message id / attachment id / contentType / size copied from the
 * existing fabric index summary. No binary, no anonymous URL, no invented ids.
 */
export function extractMailAttachmentRef(
  summary: string,
  extras?: { sourceItemId?: unknown; conversationId?: unknown; sourceMessageId?: unknown },
): MailAttachmentIndexRef | undefined {
  const keyMatch = MAIL_ATT_KEY_RE.exec(summary || '');
  const key = keyMatch?.[1] || '';
  const keyTail = key.startsWith('mail-att:') ? key.slice('mail-att:'.length) : '';
  const colon = keyTail.lastIndexOf(':');
  const parentFromKey = colon > 0 ? keyTail.slice(0, colon) : '';
  const attFromKey = colon > 0 ? keyTail.slice(colon + 1) : '';
  const parent = safeGraphishId(
    (typeof extras?.conversationId === 'string' ? extras.conversationId : '') ||
      PARENT_ID_RE.exec(summary || '')?.[1] ||
      parentFromKey,
  );
  const attachment = safeGraphishId(
    (typeof extras?.sourceMessageId === 'string' ? extras.sourceMessageId : '') ||
      ATT_ID_RE.exec(summary || '')?.[1] ||
      attFromKey ||
      (typeof extras?.sourceItemId === 'string' && !String(extras.sourceItemId).startsWith('file:')
        ? extras.sourceItemId
        : ''),
  );
  if (!parent || !attachment) return undefined;
  const contentType = ATT_TYPE_RE.exec(summary || '')?.[1];
  const sizeRaw = ATT_SIZE_RE.exec(summary || '')?.[1];
  const size = sizeRaw ? Number(sizeRaw) : undefined;
  return {
    parentMessageId: parent,
    attachmentId: attachment,
    ...(contentType ? { contentType } : {}),
    ...(typeof size === 'number' && Number.isFinite(size) ? { size } : {}),
    ...(key ? { idempotencyKey: key } : {}),
  };
}
