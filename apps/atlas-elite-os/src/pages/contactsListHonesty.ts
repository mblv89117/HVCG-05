/**
 * W2L contacts list honesty for State → Related Work.
 * Renders the Hub HVCG_Contacts payload only. Sentences match Hub clientTruth.
 * Proposed contactCandidates are not this list.
 */

export const CONTACTS_LIST_SLICE = 6;

export const CONTACTS_MISSING_SENTENCE =
  'No entitled HVCG_Contacts rows. contacts=MISSING. Atlas does not invent contacts, emails, phones, roles, or meeting attendees.';

export function contactsNotQueriedSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  const base = 'HVCG_Contacts was not queried. Atlas does not treat that as an empty contact list.';
  return detail ? `${base} ${detail}` : base;
}

export function contactsSourceUnavailableSentence(reason?: string): string {
  const detail = (reason || '').replace(/\s+/g, ' ').trim();
  return [
    'Atlas cannot read the entitled HVCG_Contacts slice.',
    'contacts=SOURCE_UNAVAILABLE.',
    detail || 'HVCG_Contacts list walk did not complete.',
    'Partial rows are not the contact list.',
    'Atlas does not invent contacts, emails, phones, roles, or meeting attendees.',
  ].join(' ');
}

export function contactListLabel(row: { title: string; email?: string; jobTitle?: string }): string {
  const email = (row.email || '').trim();
  const jobTitle = (row.jobTitle || '').trim();
  const identity = email ? `${row.title} <${email}>` : `${row.title} (email not recorded)`;
  return jobTitle ? `${identity}, ${jobTitle}` : identity;
}

export function contactsIndexedSentence(rows: Array<{ title: string; email?: string; jobTitle?: string }>): string {
  const labels = rows.slice(0, CONTACTS_LIST_SLICE).map((row) => contactListLabel(row));
  const extra = rows.length - labels.length;
  const more = extra > 0 ? ` +${extra} more.` : '';
  return `${rows.length} entitled HVCG_Contacts row(s). contacts=INDEXED. ${labels.join('; ')}.${more}`;
}

export type ContactsListRow = { id: string; title: string; email?: string; jobTitle?: string };

export type ContactsListHonesty =
  | { kind: 'indexed'; count: number; slice: ContactsListRow[]; sentence: string }
  | { kind: 'missing'; sentence: string }
  | { kind: 'source_unavailable'; sentence: string }
  | { kind: 'not_queried'; sentence: string };

type ContactsSection = {
  status?: string;
  queried?: boolean;
  reason?: string;
  items?: Array<Record<string, unknown>>;
};

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * One list from the Hub contacts section. Foreign and unstamped rows are dropped.
 * A truncated section contributes no names. Phone and role flags are not read.
 */
export function contactsListHonesty(
  section: ContactsSection | undefined,
  clientCode: string,
): ContactsListHonesty {
  const scoped = (clientCode || '').trim().toUpperCase();
  if (section?.status === 'SOURCE_UNAVAILABLE') {
    return {
      kind: 'source_unavailable',
      sentence: contactsSourceUnavailableSentence(section.reason),
    };
  }
  if (!section?.queried) {
    return {
      kind: 'not_queried',
      sentence: contactsNotQueriedSentence(section?.reason),
    };
  }
  const rows: ContactsListRow[] = [];
  for (const [index, item] of (section.items || []).entries()) {
    if (asText(item.clientCode).toUpperCase() !== scoped) continue;
    const title = asText(item.title).replace(/\s+/g, ' ');
    if (!title) continue;
    const email = asText(item.email);
    const jobTitle = asText(item.jobTitle);
    rows.push({
      id: asText(item.id) || `contact-${index}`,
      title,
      ...(email ? { email } : {}),
      ...(jobTitle ? { jobTitle } : {}),
    });
  }
  if (!rows.length) {
    return { kind: 'missing', sentence: CONTACTS_MISSING_SENTENCE };
  }
  return {
    kind: 'indexed',
    count: rows.length,
    slice: rows.slice(0, CONTACTS_LIST_SLICE),
    sentence: contactsIndexedSentence(rows),
  };
}
