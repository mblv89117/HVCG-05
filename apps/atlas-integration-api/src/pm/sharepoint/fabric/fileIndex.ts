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

export function fileIndexSummary(opts: {
  restricted: boolean;
  webUrl?: string;
  idempotencyKey: string;
}): string {
  const head = opts.restricted
    ? `${FILE_RESTRICTED_MARKER}. Binary not stored.`
    : `${FILE_INDEX_MARKER}. Binary remains in OneDrive/SharePoint.`;
  const source = opts.webUrl ? ` Source: ${opts.webUrl}` : '';
  return `${head}${source} Key:${opts.idempotencyKey}`.slice(0, 2000);
}
