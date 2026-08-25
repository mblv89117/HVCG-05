/**
 * Indexed mail preview helpers. Metadata already stored on HVCG_Communications.
 * Does not fetch Outlook bodies.
 */

import { FILE_INDEX_MARKER, FILE_RESTRICTED_MARKER } from './fileIndex.ts';

export function extractMailConversationId(
  summary: string,
  extras?: { conversationId?: unknown; sourceItemId?: unknown; id?: unknown },
): string | undefined {
  const fromField = typeof extras?.conversationId === 'string' ? extras.conversationId.trim() : '';
  if (fromField) return fromField;
  const key = /\bKey:mail:([^\s]+)/.exec(summary || '');
  if (key?.[1]) return key[1];
  const source = typeof extras?.sourceItemId === 'string' ? extras.sourceItemId.trim() : '';
  if (source && !source.startsWith('file:')) return source;
  return undefined;
}

export function indexedPreviewOnly(summary: string): string {
  const raw = (summary || '').trim();
  if (!raw) return '';
  if (raw.includes(FILE_INDEX_MARKER) || raw.includes(FILE_RESTRICTED_MARKER)) return '';
  return raw
    .replace(/\s*Source:\s*https:\/\/\S+/gi, '')
    .replace(/\s*Key:[^\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
