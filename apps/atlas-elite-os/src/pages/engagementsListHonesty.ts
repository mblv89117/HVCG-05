import { GLOBAL_AUTO_RESPOND } from '../policy/globalAutoRespond';

/**
 * W2N engagements list honesty for State → Related Work and the Engagements card.
 * Renders the Hub HVCG_Engagements payload only. Sentences match Hub clientTruth
 * and the Ask Atlas engagements answer built from that payload.
 * EngagementTypePrimary, recovered filenames, and summary/Scope/Background are not this list.
 */

export const ENGAGEMENTS_LIST_SLICE = 6;

export const ENGAGEMENTS_MISSING_SENTENCE =
  'No entitled HVCG_Engagements rows. engagements=MISSING. EngagementTypePrimary is not this list. Atlas does not invent engagements, scopes, fees, dates, or obligations.';

export function engagementsNotQueriedSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  const base =
    'HVCG_Engagements was not queried. Atlas does not treat that as an empty engagement list. EngagementTypePrimary is not this list.';
  return detail ? `${base} ${detail}` : base;
}

export function engagementsSourceUnavailableSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  return [
    'Atlas cannot read the entitled HVCG_Engagements slice.',
    'engagements=SOURCE_UNAVAILABLE.',
    detail || 'HVCG_Engagements list walk did not complete.',
    'Partial rows are not the engagement list.',
    'EngagementTypePrimary is not this list.',
    'Atlas does not invent engagements, scopes, fees, dates, or obligations.',
  ].join(' ');
}

export function engagementListLabel(row: { title: string; status?: string }): string {
  const status = (row.status || '').trim();
  return status ? `${row.title} (${status})` : row.title;
}

export function engagementsIndexedSentence(rows: Array<{ title: string; status?: string }>): string {
  const labels = rows.slice(0, ENGAGEMENTS_LIST_SLICE).map((row) => engagementListLabel(row));
  const extra = rows.length - labels.length;
  const more = extra > 0 ? ` +${extra} more.` : '';
  return `${rows.length} entitled HVCG_Engagements row(s). engagements=INDEXED. ${labels.join('; ')}.${more}`;
}

/**
 * Same Ask Atlas sentence Hub returns for the engagements topic.
 * Flags stay false; this is display text. No page_cap clause is invented here.
 */
export function engagementsListAskAtlasSentence(
  summary: string,
  completeness: string,
  classification: string,
): string {
  return [
    summary,
    `engagements=${completeness}/${classification}.`,
    'Current engagement list is the entitled HVCG_Engagements slice for this ClientCode only.',
    'EngagementTypePrimary on HVCG_Clients is not this list.',
    'Recovered engagement/agreement filenames are not this list.',
    'Atlas does not invent engagements, scopes, fees, dates, or obligations.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

export type EngagementsListRow = { id: string; title: string; status?: string };

export type EngagementsListHonesty =
  | { kind: 'indexed'; count: number; slice: EngagementsListRow[]; sentence: string }
  | { kind: 'missing'; sentence: string }
  | { kind: 'source_unavailable'; sentence: string }
  | { kind: 'not_queried'; sentence: string };

type EngagementsSection = {
  status?: string;
  queried?: boolean;
  reason?: string;
  items?: Array<Record<string, unknown>>;
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * One list from the Hub engagements section. Foreign-coded rows are dropped.
 * A truncated section contributes no titles. Status is copied only when present.
 */
export function engagementsListHonesty(
  section: EngagementsSection | undefined,
  clientCode: string,
): EngagementsListHonesty {
  const scoped = (clientCode || '').trim().toUpperCase();
  if (section?.status === 'SOURCE_UNAVAILABLE') {
    return {
      kind: 'source_unavailable',
      sentence: engagementsListAskAtlasSentence(
        engagementsSourceUnavailableSentence(section.reason),
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
      ),
    };
  }
  if (!section?.queried) {
    return {
      kind: 'not_queried',
      sentence: engagementsListAskAtlasSentence(
        engagementsNotQueriedSentence(section?.reason),
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
      ),
    };
  }
  const rows: EngagementsListRow[] = [];
  for (const [index, item] of (section.items || []).entries()) {
    if (asText(item.clientCode).toUpperCase() !== scoped) continue;
    const title = asText(item.title).replace(/\s+/g, ' ');
    if (!title) continue;
    const status = asText(item.status);
    rows.push({
      id: asText(item.id) || `engagement-${index}`,
      title,
      ...(status ? { status } : {}),
    });
  }
  if (!rows.length) {
    return {
      kind: 'missing',
      sentence: engagementsListAskAtlasSentence(ENGAGEMENTS_MISSING_SENTENCE, 'MISSING', 'MISSING'),
    };
  }
  return {
    kind: 'indexed',
    count: rows.length,
    slice: rows.slice(0, ENGAGEMENTS_LIST_SLICE),
    sentence: engagementsListAskAtlasSentence(
      engagementsIndexedSentence(rows),
      'INDEXED',
      'CONFIRMED',
    ),
  };
}

export function engagementsChipLabel(kind: EngagementsListHonesty['kind']): string {
  if (kind === 'indexed') return 'engagements=INDEXED';
  if (kind === 'missing') return 'engagements=MISSING';
  if (kind === 'source_unavailable') return 'engagements=SOURCE_UNAVAILABLE';
  return 'Not queried';
}
