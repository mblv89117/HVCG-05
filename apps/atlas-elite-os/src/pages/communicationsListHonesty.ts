import { GLOBAL_AUTO_RESPOND } from '../policy/globalAutoRespond';

/**
 * W2Q communications list honesty for State → Related Work and the thread card.
 * Renders non-file-index rows from the Hub HVCG_Communications payload only.
 * Sentences match Hub clientTruth and the Ask Atlas communications_list answer.
 * File-index rows stay the document index. The certified communications= line
 * is not this sentence. No send or reply control.
 */

export const COMMUNICATIONS_LIST_SLICE = 6;

const FILE_INDEX_MARKER = 'File metadata index';
const FILE_RESTRICTED_MARKER = 'RESTRICTED — metadata and source link only';

export const COMMUNICATIONS_LIST_MISSING_SENTENCE =
  'No entitled HVCG_Communications thread rows. communicationsList=MISSING. File-index rows are the document index. They are not threads. Atlas does not invent threads, recipients, channels, direction, sent times, or message text.';

/** Same three markers as Hub isFileIndexRow. Does not redefine that function. */
export function isCommunicationsFileIndexRow(item: {
  summary?: unknown;
  sourceItemId?: unknown;
}): boolean {
  const summary = String(item.summary || '');
  const src = String(item.sourceItemId || '');
  return summary.includes(FILE_INDEX_MARKER) || summary.includes(FILE_RESTRICTED_MARKER) || src.startsWith('file:');
}

export function communicationsListNotQueriedSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  const base =
    'HVCG_Communications was not queried. Atlas does not treat that as an empty communications list.';
  return detail ? `${base} ${detail}` : base;
}

export function communicationsListSourceUnavailableSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  return [
    'Atlas cannot read the entitled HVCG_Communications slice.',
    'communicationsList=SOURCE_UNAVAILABLE.',
    detail || 'HVCG_Communications list walk did not complete.',
    'Partial rows are not the communications list.',
    'File-index rows are not shown as threads.',
    'Atlas does not invent threads, recipients, channels, direction, sent times, or message text.',
  ].join(' ');
}

export function communicationsListLabel(row: {
  title: string;
  channel?: string;
  direction?: string;
  date?: string;
}): string {
  const bits = [row.channel, row.direction, row.date].map((part) => (part || '').trim()).filter(Boolean);
  return bits.length ? `${row.title} (${bits.join(', ')})` : row.title;
}

export function communicationsListIndexedSentence(
  rows: Array<{ title: string; channel?: string; direction?: string; date?: string }>,
): string {
  const labels = rows.slice(0, COMMUNICATIONS_LIST_SLICE).map((row) => communicationsListLabel(row));
  const extra = rows.length - labels.length;
  const more = extra > 0 ? ` +${extra} more.` : '';
  return `${rows.length} entitled HVCG_Communications thread row(s). communicationsList=INDEXED. ${labels.join('; ')}.${more}`;
}

/**
 * Same Ask Atlas sentence Hub returns for the communications_list topic.
 * Flags stay false; this is display text. No page_cap clause is invented here.
 */
export function communicationsListAskAtlasSentence(
  summary: string,
  completeness: string,
  classification: string,
): string {
  return [
    summary,
    `communicationsList=${completeness}/${classification}.`,
    'Current communications list is the hygiene-unfiltered HVCG_Communications slice for this ClientCode, excluding file-index rows.',
    'File-index rows are the document index.',
    'They are not threads.',
    'The workspace timeline is not this list.',
    'Atlas does not invent threads, recipients, channels, direction, sent times, or message text.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

export type CommunicationsListRow = {
  id: string;
  title: string;
  channel?: string;
  direction?: string;
  date?: string;
};

export type CommunicationsListHonesty =
  | { kind: 'indexed'; count: number; slice: CommunicationsListRow[]; sentence: string }
  | { kind: 'missing'; sentence: string }
  | { kind: 'source_unavailable'; sentence: string }
  | { kind: 'not_queried'; sentence: string };

type CommunicationsSection = {
  status?: string;
  queried?: boolean;
  reason?: string;
  items?: Array<Record<string, unknown>>;
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Thread rows from the Hub communications section. File-index rows are dropped.
 * Foreign-coded rows are dropped. A truncated section contributes no titles.
 * Channel, direction, and date are copied only when present. Status is not shown.
 */
export function communicationsListHonesty(
  section: CommunicationsSection | undefined,
  clientCode: string,
): CommunicationsListHonesty {
  const scoped = (clientCode || '').trim().toUpperCase();
  if (section?.status === 'SOURCE_UNAVAILABLE') {
    return {
      kind: 'source_unavailable',
      sentence: communicationsListAskAtlasSentence(
        communicationsListSourceUnavailableSentence(section.reason),
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
      ),
    };
  }
  if (!section?.queried) {
    return {
      kind: 'not_queried',
      sentence: communicationsListAskAtlasSentence(
        communicationsListNotQueriedSentence(section?.reason),
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
      ),
    };
  }
  const rows: CommunicationsListRow[] = [];
  for (const [index, item] of (section.items || []).entries()) {
    if (isCommunicationsFileIndexRow(item)) continue;
    if (asText(item.clientCode).toUpperCase() !== scoped) continue;
    const title = asText(item.title).replace(/\s+/g, ' ');
    if (!title) continue;
    const channel = asText(item.channel);
    const direction = asText(item.direction);
    const date = asText(item.date);
    rows.push({
      id: asText(item.id) || `communication-${index}`,
      title,
      ...(channel ? { channel } : {}),
      ...(direction ? { direction } : {}),
      ...(date ? { date } : {}),
    });
  }
  if (!rows.length) {
    return {
      kind: 'missing',
      sentence: communicationsListAskAtlasSentence(
        COMMUNICATIONS_LIST_MISSING_SENTENCE,
        'MISSING',
        'MISSING',
      ),
    };
  }
  return {
    kind: 'indexed',
    count: rows.length,
    slice: rows.slice(0, COMMUNICATIONS_LIST_SLICE),
    sentence: communicationsListAskAtlasSentence(
      communicationsListIndexedSentence(rows),
      'INDEXED',
      'CONFIRMED',
    ),
  };
}

export function communicationsListChipLabel(kind: CommunicationsListHonesty['kind']): string {
  if (kind === 'indexed') return 'communicationsList=INDEXED';
  if (kind === 'missing') return 'communicationsList=MISSING';
  if (kind === 'source_unavailable') return 'communicationsList=SOURCE_UNAVAILABLE';
  return 'Not queried';
}
