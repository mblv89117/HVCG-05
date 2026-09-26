/**
 * W2K meetings list honesty for State → Related Work.
 * Renders the Hub HVCG_Meetings payload only. Sentences match Hub clientTruth.
 * The workspace timeline is not this list.
 */

export const MEETINGS_LIST_SLICE = 6;

export const MEETINGS_MISSING_SENTENCE =
  'No entitled HVCG_Meetings rows. meetings=MISSING. Atlas does not invent meetings, attendees, notes, decisions, or next actions.';

export function meetingsNotQueriedSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  const base = 'HVCG_Meetings was not queried. Atlas does not treat that as an empty meeting list.';
  return detail ? `${base} ${detail}` : base;
}

export function meetingsSourceUnavailableSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  return [
    'Atlas cannot read the entitled HVCG_Meetings slice.',
    'meetings=SOURCE_UNAVAILABLE.',
    detail || 'HVCG_Meetings list walk did not complete.',
    'Partial rows are not the meeting list.',
    'Atlas does not invent meetings, attendees, notes, decisions, or next actions.',
  ].join(' ');
}

export function meetingsIndexedSentence(rows: Array<{ title: string; date?: string }>): string {
  const labels = rows.slice(0, MEETINGS_LIST_SLICE).map((row) =>
    row.date ? `${row.title} (${row.date})` : `${row.title} (date not recorded)`,
  );
  const shown = labels.length;
  const more = rows.length > shown ? ` Showing ${shown} of ${rows.length}.` : '';
  return `${rows.length} entitled HVCG_Meetings row(s). meetings=INDEXED. ${labels.join('; ')}.${more}`;
}

export type MeetingsListRow = { id: string; title: string; date?: string };

export type MeetingsListHonesty =
  | { kind: 'indexed'; count: number; slice: MeetingsListRow[]; sentence: string }
  | { kind: 'missing'; sentence: string }
  | { kind: 'source_unavailable'; sentence: string }
  | { kind: 'not_queried'; sentence: string };

type MeetingsSection = {
  status?: string;
  queried?: boolean;
  reason?: string;
  items?: Array<Record<string, unknown>>;
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function meetingDay(value: unknown): string | undefined {
  const match = asText(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1];
}

/**
 * One list from the Hub meetings section. Foreign and unstamped rows are dropped.
 * A truncated section contributes no titles.
 */
export function meetingsListHonesty(
  section: MeetingsSection | undefined,
  clientCode: string,
): MeetingsListHonesty {
  const scoped = (clientCode || '').trim().toUpperCase();
  if (section?.status === 'SOURCE_UNAVAILABLE') {
    return {
      kind: 'source_unavailable',
      sentence: meetingsSourceUnavailableSentence(section.reason),
    };
  }
  if (!section?.queried) {
    return {
      kind: 'not_queried',
      sentence: meetingsNotQueriedSentence(section?.reason),
    };
  }
  const rows: MeetingsListRow[] = [];
  for (const [index, item] of (section.items || []).entries()) {
    if (asText(item.clientCode).toUpperCase() !== scoped) continue;
    const title = asText(item.title).replace(/\s+/g, ' ');
    if (!title) continue;
    const date = meetingDay(item.date);
    rows.push({
      id: asText(item.id) || `meeting-${index}`,
      title,
      ...(date ? { date } : {}),
    });
  }
  if (!rows.length) {
    return { kind: 'missing', sentence: MEETINGS_MISSING_SENTENCE };
  }
  return {
    kind: 'indexed',
    count: rows.length,
    slice: rows.slice(0, MEETINGS_LIST_SLICE),
    sentence: meetingsIndexedSentence(rows),
  };
}
