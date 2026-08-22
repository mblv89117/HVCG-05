/**
 * Fail-closed Ask Atlas view model.
 * Displays only Hub operatorDesk.askAtlas fields. Does not re-rank or invent items.
 */

import {
  ASK_ATLAS_QUESTION,
  type AskAtlasAnswer,
  type AskAtlasAttentionItem,
} from '../integrations/hub/askAtlas';

export const ASK_ATLAS_TITLE = 'Ask Atlas — What needs attention';

export const ASK_ATLAS_UNSIGNED_COPY =
  'Ask Atlas attention is fail-closed without a Hub Bearer token. Sign in with Microsoft. Atlas does not show entitled attention items while signed out.';

export const ASK_ATLAS_DENIED_COPY =
  'Hub denied Ask Atlas. Entitled attention items are not shown.';

export const ASK_ATLAS_EMPTY_COPY =
  'No entitled attention items in this picture. Atlas does not invent work, amounts, lenders, or Hub-MI rows.';

export const ASK_ATLAS_HONESTY_COPY =
  'Classification stays labeled. Atlas does not invent amounts, lenders, LTV, or Hub-MI rows.';

export type AskAtlasViewKind = 'loading' | 'unsigned' | 'denied' | 'error' | 'empty' | 'items';

export interface AskAtlasViewItem {
  id: string;
  state: string;
  why: string;
  basedOn: string;
  classification: string;
  provenance: string;
  client?: string;
  clientCode?: string;
}

export interface AskAtlasView {
  kind: AskAtlasViewKind;
  title: string;
  question: string | null;
  subtitle: string;
  ranking: string[];
  items: AskAtlasViewItem[];
  emptyReason: string | null;
  invented: false;
}

export interface AskAtlasViewInput {
  signed: boolean;
  payload?: AskAtlasAnswer | null;
  loading?: boolean;
  error?: string | null;
  status?: number | null;
}

function asItem(row: AskAtlasAttentionItem, index: number): AskAtlasViewItem | null {
  const id = String(row?.id || '').trim() || `hub-item-${index}`;
  const state = String(row?.state || '').trim();
  const why = String(row?.why || '').trim();
  const basedOn = String(row?.basedOn || row?.evidence || '').trim();
  const classification = String(row?.classification || '').trim();
  const provenance = String(row?.provenance || classification).trim();
  if (!state || !why || !basedOn || !classification) return null;
  const client = String(row?.client || '').trim() || undefined;
  const clientCode = String(row?.clientCode || '').trim() || undefined;
  return {
    id,
    state,
    why,
    basedOn,
    classification,
    provenance,
    ...(client ? { client } : {}),
    ...(clientCode ? { clientCode } : {}),
  };
}

function closedView(
  kind: Exclude<AskAtlasViewKind, 'items' | 'loading'>,
  subtitle: string,
  emptyReason: string,
): AskAtlasView {
  return {
    kind,
    title: ASK_ATLAS_TITLE,
    question: null,
    subtitle,
    ranking: [],
    items: [],
    emptyReason,
    invented: false,
  };
}

/**
 * Build the Ask Atlas surface. Unsigned callers never receive payload items,
 * even if a fixture is passed (fail-closed).
 */
export function askAtlasView(input: AskAtlasViewInput): AskAtlasView {
  if (!input.signed) {
    return closedView('unsigned', ASK_ATLAS_UNSIGNED_COPY, ASK_ATLAS_UNSIGNED_COPY);
  }

  if (input.loading && !input.payload) {
    return {
      kind: 'loading',
      title: ASK_ATLAS_TITLE,
      question: ASK_ATLAS_QUESTION,
      subtitle: 'Loading entitled Ask Atlas attention from Hub…',
      ranking: [],
      items: [],
      emptyReason: null,
      invented: false,
    };
  }

  const status = input.status ?? 0;
  if (status === 401 || status === 403) {
    return closedView('denied', ASK_ATLAS_DENIED_COPY, ASK_ATLAS_DENIED_COPY);
  }

  const payload = input.payload;
  if (!payload) {
    return closedView(
      'error',
      input.error || 'Ask Atlas could not be loaded from Hub.',
      input.error || 'Ask Atlas could not be loaded from Hub.',
    );
  }

  const honestEmpty = payload.honestEmpty === true || !payload.items?.length;
  const ranking = Array.isArray(payload.ranking) ? payload.ranking.map((row) => String(row)) : [];
  const question = payload.question || ASK_ATLAS_QUESTION;

  if (honestEmpty) {
    return {
      kind: 'empty',
      title: ASK_ATLAS_TITLE,
      question,
      subtitle: ASK_ATLAS_HONESTY_COPY,
      ranking,
      items: [],
      emptyReason: ASK_ATLAS_EMPTY_COPY,
      invented: false,
    };
  }

  // Preserve Hub payload order. Do not re-rank.
  const items = payload.items.map(asItem).filter((row): row is AskAtlasViewItem => Boolean(row));

  if (!items.length) {
    return {
      kind: 'empty',
      title: ASK_ATLAS_TITLE,
      question,
      subtitle: ASK_ATLAS_HONESTY_COPY,
      ranking,
      items: [],
      emptyReason: ASK_ATLAS_EMPTY_COPY,
      invented: false,
    };
  }

  return {
    kind: 'items',
    title: ASK_ATLAS_TITLE,
    question,
    subtitle: ranking.length
      ? `Ranked from entitled operator queues: ${ranking.join(' → ')}. ${ASK_ATLAS_HONESTY_COPY}`
      : ASK_ATLAS_HONESTY_COPY,
    ranking,
    items,
    emptyReason: null,
    invented: false,
  };
}

export function serializeAskAtlasCopy(view: AskAtlasView): string {
  const lines = [view.title, view.question, view.subtitle, view.emptyReason].filter(Boolean) as string[];
  if (view.ranking.length) lines.push(view.ranking.join(' → '));
  for (const item of view.items) {
    lines.push(
      [
        item.state,
        item.why,
        `Based on: ${item.basedOn}`,
        item.classification,
        item.provenance,
        item.client,
        item.clientCode,
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }
  return lines.join('\n');
}
