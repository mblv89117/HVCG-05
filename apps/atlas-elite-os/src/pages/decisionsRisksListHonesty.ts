import { GLOBAL_AUTO_RESPOND } from '../policy/globalAutoRespond';

/**
 * W2P decisions / risks list honesty for State → Related Work and the card.
 * Renders the Hub combined HVCG_Decisions + HVCG_Risks payload only.
 * Sentences match Hub clientTruth and the Ask Atlas decisions_risks answer.
 * Owner approvals and Approval Center items are not this list.
 */

export const DECISIONS_RISKS_LIST_SLICE = 6;

export const DECISIONS_RISKS_MISSING_SENTENCE =
  'No entitled HVCG_Decisions or HVCG_Risks rows. decisionsRisks=MISSING. Atlas does not invent decisions, risks, owners, severity, or due dates.';

const HVCG_DECISIONS_ALLOWLIST_MISS = 'HVCG_Decisions is not in the Hub Graph Selected allowlist';
const HVCG_RISKS_ALLOWLIST_MISS = 'HVCG_Risks is not in the Hub Graph Selected allowlist';

export type DecisionsRisksSide = 'HVCG_Decisions' | 'HVCG_Risks';
export type DecisionsRisksListKind = 'decision' | 'risk';

export function decisionsRisksNotQueriedSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  const base =
    'HVCG_Decisions and HVCG_Risks were not queried. Atlas does not treat that as an empty decisions or risks list.';
  return detail ? `${base} ${detail}` : base;
}

export function decisionsRisksSourceUnavailableSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  return [
    'Atlas cannot read the entitled HVCG_Decisions / HVCG_Risks slice.',
    'decisionsRisks=SOURCE_UNAVAILABLE.',
    detail || 'HVCG_Decisions / HVCG_Risks list walk did not complete.',
    'Partial rows are not the decisions or risks list.',
    'Atlas does not invent decisions, risks, owners, severity, or due dates.',
  ].join(' ');
}

export function decisionsRisksListLabel(row: {
  title: string;
  status?: string;
  kind: DecisionsRisksListKind;
}): string {
  const prefix = row.kind === 'risk' ? 'Risk' : 'Decision';
  const status = (row.status || '').trim();
  return status ? `${prefix}: ${row.title} (${status})` : `${prefix}: ${row.title}`;
}

export function decisionsRisksIndexedSentence(
  rows: Array<{ title: string; status?: string; kind: DecisionsRisksListKind }>,
): string {
  const labels = rows.slice(0, DECISIONS_RISKS_LIST_SLICE).map((row) => decisionsRisksListLabel(row));
  const extra = rows.length - labels.length;
  const more = extra > 0 ? ` +${extra} more.` : '';
  return `${rows.length} entitled HVCG_Decisions / HVCG_Risks row(s). decisionsRisks=INDEXED. ${labels.join('; ')}.${more}`;
}

export function decisionsRisksMixedSentence(
  queriedList: DecisionsRisksSide,
  unqueriedList: DecisionsRisksSide,
  rows: Array<{ title: string; status?: string; kind: DecisionsRisksListKind }>,
): string {
  const labels = rows.slice(0, DECISIONS_RISKS_LIST_SLICE).map((row) => decisionsRisksListLabel(row));
  const extra = rows.length - labels.length;
  const more = extra > 0 ? ` +${extra} more.` : '';
  const titles = labels.length ? `${labels.join('; ')}.${more}` : 'The queried list has no entitled rows.';
  return [
    `${queriedList} was queried.`,
    `${unqueriedList} was not queried.`,
    'Atlas does not treat the unqueried list as empty.',
    titles,
    'decisionsRisks combined section is not fully indexed.',
  ].join(' ');
}

/**
 * Same Ask Atlas sentence Hub returns for the decisions_risks topic.
 * Flags stay false; this is display text. No page_cap clause is invented here.
 */
export function decisionsRisksListAskAtlasSentence(
  summary: string,
  completeness: string,
  classification: string,
): string {
  return [
    summary,
    `decisionsRisks=${completeness}/${classification}.`,
    'Current decisions and risks list is the hygiene-kept HVCG_Decisions and HVCG_Risks slice for this ClientCode only.',
    'Owner approvals are not this list.',
    'Approval Center items are not this list.',
    'Hygiene-quarantined rows are not this list.',
    'Atlas does not invent decisions, risks, owners, severity, or due dates.',
    `GLOBAL_AUTO_RESPOND=${GLOBAL_AUTO_RESPOND}; capitalSubmit=false; canExecute=false.`,
  ].join(' ');
}

export type DecisionsRisksListRow = {
  id: string;
  title: string;
  kind: DecisionsRisksListKind;
  status?: string;
};

export type DecisionsRisksListHonesty =
  | { kind: 'indexed'; count: number; slice: DecisionsRisksListRow[]; sentence: string }
  | { kind: 'missing'; sentence: string }
  | { kind: 'source_unavailable'; sentence: string }
  | { kind: 'not_queried'; sentence: string }
  | { kind: 'mixed'; count: number; slice: DecisionsRisksListRow[]; sentence: string };

type DecisionsRisksSection = {
  status?: string;
  queried?: boolean;
  reason?: string;
  items?: Array<Record<string, unknown>>;
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function rowKind(item: Record<string, unknown>): DecisionsRisksListKind | null {
  const entity = asText(item.entityType).toLowerCase();
  const source = asText(item.sourceList);
  if (entity === 'decision' || source === 'HVCG_Decisions') return 'decision';
  if (entity === 'risk' || source === 'HVCG_Risks') return 'risk';
  return null;
}

/**
 * Read the combined section reason. queried:false is never mixed, including the
 * both-ungranted sentence that contains the HVCG_Risks allowlist substring.
 */
export function decisionsRisksMixedGrant(
  section: DecisionsRisksSection | undefined,
): { queriedList: DecisionsRisksSide; unqueriedList: DecisionsRisksSide } | null {
  if (!section?.queried || section.status === 'SOURCE_UNAVAILABLE') return null;
  const reason = section.reason || '';
  const decisionsUngranted = reason.includes(HVCG_DECISIONS_ALLOWLIST_MISS);
  const risksUngranted = reason.includes(HVCG_RISKS_ALLOWLIST_MISS);
  if (decisionsUngranted && !risksUngranted) {
    return { queriedList: 'HVCG_Risks', unqueriedList: 'HVCG_Decisions' };
  }
  if (risksUngranted && !decisionsUngranted) {
    return { queriedList: 'HVCG_Decisions', unqueriedList: 'HVCG_Risks' };
  }
  return null;
}

function entitledRows(
  section: DecisionsRisksSection,
  clientCode: string,
  mixed: { queriedList: DecisionsRisksSide; unqueriedList: DecisionsRisksSide } | null,
): DecisionsRisksListRow[] {
  const rows: DecisionsRisksListRow[] = [];
  for (const [index, item] of (section.items || []).entries()) {
    if (asText(item.clientCode).toUpperCase() !== clientCode) continue;
    const kind = rowKind(item);
    if (!kind) continue;
    if (mixed?.queriedList === 'HVCG_Decisions' && kind !== 'decision') continue;
    if (mixed?.queriedList === 'HVCG_Risks' && kind !== 'risk') continue;
    const title = asText(item.title).replace(/\s+/g, ' ');
    if (!title) continue;
    const status = asText(item.status);
    rows.push({
      id: asText(item.id) || `decisions-risks-${index}`,
      title,
      kind,
      ...(status ? { status } : {}),
    });
  }
  return rows;
}

/**
 * One combined list from the Hub decisionsRisks section.
 * A truncated section contributes no titles. Status is copied only when present.
 */
export function decisionsRisksListHonesty(
  section: DecisionsRisksSection | undefined,
  clientCode: string,
): DecisionsRisksListHonesty {
  const scoped = (clientCode || '').trim().toUpperCase();
  if (section?.status === 'SOURCE_UNAVAILABLE') {
    return {
      kind: 'source_unavailable',
      sentence: decisionsRisksListAskAtlasSentence(
        decisionsRisksSourceUnavailableSentence(section.reason),
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
      ),
    };
  }
  const mixed = decisionsRisksMixedGrant(section);
  if (mixed && section) {
    const rows = entitledRows(section, scoped, mixed);
    return {
      kind: 'mixed',
      count: rows.length,
      slice: rows.slice(0, DECISIONS_RISKS_LIST_SLICE),
      sentence: decisionsRisksListAskAtlasSentence(
        decisionsRisksMixedSentence(mixed.queriedList, mixed.unqueriedList, rows),
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
      ),
    };
  }
  if (!section?.queried) {
    return {
      kind: 'not_queried',
      sentence: decisionsRisksListAskAtlasSentence(
        decisionsRisksNotQueriedSentence(section?.reason),
        'NOT_CERTIFIED',
        'NOT_CERTIFIED',
      ),
    };
  }
  const rows = entitledRows(section, scoped, null);
  if (!rows.length) {
    return {
      kind: 'missing',
      sentence: decisionsRisksListAskAtlasSentence(
        DECISIONS_RISKS_MISSING_SENTENCE,
        'MISSING',
        'MISSING',
      ),
    };
  }
  return {
    kind: 'indexed',
    count: rows.length,
    slice: rows.slice(0, DECISIONS_RISKS_LIST_SLICE),
    sentence: decisionsRisksListAskAtlasSentence(
      decisionsRisksIndexedSentence(rows),
      'INDEXED',
      'CONFIRMED',
    ),
  };
}

export function decisionsRisksChipLabel(kind: DecisionsRisksListHonesty['kind']): string {
  if (kind === 'indexed') return 'decisionsRisks=INDEXED';
  if (kind === 'missing') return 'decisionsRisks=MISSING';
  if (kind === 'source_unavailable') return 'decisionsRisks=SOURCE_UNAVAILABLE';
  if (kind === 'mixed') return 'Not fully indexed';
  return 'Not queried';
}
