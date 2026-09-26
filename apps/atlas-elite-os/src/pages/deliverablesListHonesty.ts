import { GLOBAL_AUTO_RESPOND } from '../policy/globalAutoRespond';

/**
 * W2O deliverables list honesty for State → Related Work and the Deliverables card.
 * Renders the Hub HVCG_Deliverables payload only. Sentences match Hub clientTruth
 * and the Ask Atlas deliverables answer built from that payload.
 * The document index and recovered filenames are not this list.
 */

export const DELIVERABLES_LIST_SLICE = 6;

export const DELIVERABLES_MISSING_SENTENCE =
  'No entitled HVCG_Deliverables rows. deliverables=MISSING. Atlas does not invent deliverables, due dates, statuses, or acceptance.';

export function deliverablesNotQueriedSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  const base =
    'HVCG_Deliverables was not queried. Atlas does not treat that as an empty deliverable list.';
  return detail ? `${base} ${detail}` : base;
}

export function deliverablesSourceUnavailableSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  return [
    'Atlas cannot read the entitled HVCG_Deliverables slice.',
    'deliverables=SOURCE_UNAVAILABLE.',
    detail || 'HVCG_Deliverables list walk did not complete.',
    'Partial rows are not the deliverable list.',
    'Atlas does not invent deliverables, due dates, statuses, or acceptance.',
  ].join(' ');
}

export function deliverableListLabel(row: { title: string; status?: string }): string {
  const status = (row.status || '').trim();
  return status ? `${row.title} (${status})` : row.title;
}

export function deliverablesIndexedSentence(rows: Array<{ title: string; status?: string }>): string {
  const labels = rows.slice(0, DELIVERABLES_LIST_SLICE).map((row) => deliverableListLabel(row));
  const extra = rows.length - labels.length;
  const more = extra > 0 ? ` +${extra} more.` : '';
  return `${rows.length} entitled HVCG_Deliverables row(s). deliverables=INDEXED. ${labels.join('; ')}.${more}`;
}

/**
 * Same Ask Atlas sentence Hub returns for the deliverables topic.
 * Flags stay false; this is display text. No page_cap clause is invented here.
 */
export function deliverablesListAskAtlasSentence(
  summary: string,
  completeness: string,
  classification: string,
): string {
  return [
    summary,
    `deliverables=${completeness}/${classification}.`,
    'Current deliverable list is the entitled HVCG_Deliverables slice for this ClientCode only.',
    'The document index is not this list.',
    'Recovered filenames are not this list.',
    'Atlas does not invent deliverables, due dates, statuses, or acceptance.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

export type DeliverablesListRow = { id: string; title: string; status?: string };

export type DeliverablesListHonesty =
  | { kind: 'indexed'; count: number; slice: DeliverablesListRow[]; sentence: string }
  | { kind: 'missing'; sentence: string }
  | { kind: 'source_unavailable'; sentence: string }
  | { kind: 'not_queried'; sentence: string };

type DeliverablesSection = {
  status?: string;
  queried?: boolean;
  reason?: string;
  items?: Array<Record<string, unknown>>;
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * One list from the Hub deliverables section. Foreign-coded rows are dropped.
 * A truncated section contributes no titles. Status is copied only when present.
 */
export function deliverablesListHonesty(
  section: DeliverablesSection | undefined,
  clientCode: string,
): DeliverablesListHonesty {
  const scoped = (clientCode || '').trim().toUpperCase();
  if (section?.status === 'SOURCE_UNAVAILABLE') {
    return {
      kind: 'source_unavailable',
      sentence: deliverablesListAskAtlasSentence(
        deliverablesSourceUnavailableSentence(section.reason),
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
      ),
    };
  }
  if (!section?.queried) {
    return {
      kind: 'not_queried',
      sentence: deliverablesListAskAtlasSentence(
        deliverablesNotQueriedSentence(section?.reason),
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
      ),
    };
  }
  const rows: DeliverablesListRow[] = [];
  for (const [index, item] of (section.items || []).entries()) {
    if (asText(item.clientCode).toUpperCase() !== scoped) continue;
    const title = asText(item.title).replace(/\s+/g, ' ');
    if (!title) continue;
    const status = asText(item.status);
    rows.push({
      id: asText(item.id) || `deliverable-${index}`,
      title,
      ...(status ? { status } : {}),
    });
  }
  if (!rows.length) {
    return {
      kind: 'missing',
      sentence: deliverablesListAskAtlasSentence(DELIVERABLES_MISSING_SENTENCE, 'MISSING', 'MISSING'),
    };
  }
  return {
    kind: 'indexed',
    count: rows.length,
    slice: rows.slice(0, DELIVERABLES_LIST_SLICE),
    sentence: deliverablesListAskAtlasSentence(
      deliverablesIndexedSentence(rows),
      'INDEXED',
      'CONFIRMED',
    ),
  };
}

export function deliverablesChipLabel(kind: DeliverablesListHonesty['kind']): string {
  if (kind === 'indexed') return 'deliverables=INDEXED';
  if (kind === 'missing') return 'deliverables=MISSING';
  if (kind === 'source_unavailable') return 'deliverables=SOURCE_UNAVAILABLE';
  return 'Not queried';
}
