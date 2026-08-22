/**
 * Fail-closed Ask Atlas view model.
 * Displays Hub runtime fields only. Does not re-rank or invent items.
 */

import {
  ASK_ATLAS_QUESTION,
  type AskAtlasAnswer,
  type AskAtlasAttentionItem,
  type AtlasAuthorizedSearch,
  type AtlasAuthorizedSearchHit,
  type AtlasClientContext,
  type OperatorRuntimeEnvelope,
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

export type AskAtlasViewKind =
  | 'loading'
  | 'unsigned'
  | 'denied'
  | 'error'
  | 'empty'
  | 'items'
  | 'client-context'
  | 'search';

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

export interface AskAtlasClientContextView {
  client?: string;
  clientCode?: string;
  why: string;
  basedOn: string;
  classification: string;
  evidenceClass: string;
  entitled: boolean;
  hubMiOperationalized: false | boolean;
  realClientsOperationalized: string[];
  recoveredKnowledgeOperationalized: boolean;
  honestEmpty: boolean;
}

export interface AskAtlasSearchHitView {
  id: string;
  title: string;
  why: string;
  basedOn: string;
  classification: string;
  provenance: string;
  clientCode?: string;
}

export interface AskAtlasSearchView {
  query: string;
  hitCount: number;
  hits: AskAtlasSearchHitView[];
  why: string;
  basedOn: string;
  classification: string;
  entitled: boolean;
  pictureComposed: boolean;
  honestEmpty: boolean;
}

export interface AskAtlasView {
  kind: AskAtlasViewKind;
  title: string;
  question: string | null;
  subtitle: string;
  ranking: string[];
  items: AskAtlasViewItem[];
  clientContext: AskAtlasClientContextView | null;
  authorizedSearch: AskAtlasSearchView | null;
  emptyReason: string | null;
  invented: false;
}

export interface AskAtlasViewInput {
  signed: boolean;
  payload?: AskAtlasAnswer | null;
  clientContext?: AtlasClientContext | null;
  authorizedSearch?: AtlasAuthorizedSearch | null;
  askedQuestion?: string | null;
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

function asClientContext(row: AtlasClientContext | null | undefined): AskAtlasClientContextView | null {
  if (!row || row.invented !== false) return null;
  const why = String(row.why || '').trim();
  const basedOn = String(row.basedOn || '').trim();
  const classification = String(row.classification || '').trim();
  const evidenceClass = String(row.evidenceClass || '').trim();
  if (!why || !basedOn || !classification || !evidenceClass) return null;
  const client = String(row.client?.client || '').trim() || undefined;
  const clientCode = String(row.client?.clientCode || '').trim() || undefined;
  return {
    ...(client ? { client } : {}),
    ...(clientCode ? { clientCode } : {}),
    why,
    basedOn,
    classification,
    evidenceClass,
    entitled: row.client?.entitled === true,
    hubMiOperationalized: row.client?.hubMiOperationalized === true,
    realClientsOperationalized: Array.isArray(row.realClientsOperationalized)
      ? row.realClientsOperationalized.map((code) => String(code))
      : [],
    recoveredKnowledgeOperationalized: row.recoveredKnowledgeOperationalized === true,
    honestEmpty: row.honestEmpty === true,
  };
}

function asSearchHit(row: AtlasAuthorizedSearchHit, index: number): AskAtlasSearchHitView | null {
  const id = String(row?.id || '').trim() || `hub-hit-${index}`;
  const title = String(row?.title || '').trim();
  const why = String(row?.why || '').trim();
  const basedOn = String(row?.basedOn || '').trim();
  const classification = String(row?.classification || '').trim();
  const provenance = String(row?.provenance || classification).trim();
  if (!title || !why || !basedOn || !classification) return null;
  const clientCode = String(row?.clientCode || '').trim() || undefined;
  return {
    id,
    title,
    why,
    basedOn,
    classification,
    provenance,
    ...(clientCode ? { clientCode } : {}),
  };
}

function asAuthorizedSearch(row: AtlasAuthorizedSearch | null | undefined): AskAtlasSearchView | null {
  if (!row || row.invented !== false) return null;
  const hits = Array.isArray(row.hits)
    ? row.hits.map(asSearchHit).filter((hit): hit is AskAtlasSearchHitView => Boolean(hit))
    : [];
  return {
    query: String(row.query || '').trim(),
    hitCount: Number.isFinite(row.hitCount) ? row.hitCount : hits.length,
    hits,
    why: String(row.why || '').trim(),
    basedOn: String(row.basedOn || '').trim(),
    classification: String(row.classification || '').trim(),
    entitled: row.entitled === true,
    pictureComposed: row.pictureComposed === true,
    honestEmpty: row.honestEmpty === true || hits.length === 0,
  };
}

function closedView(
  kind: Exclude<AskAtlasViewKind, 'items' | 'loading' | 'client-context' | 'search'>,
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
    clientContext: null,
    authorizedSearch: null,
    emptyReason,
    invented: false,
  };
}

function displayedQuestion(input: AskAtlasViewInput, payloadQuestion?: string): string {
  const asked = String(input.askedQuestion || '').trim();
  if (asked) return asked;
  if (payloadQuestion && payloadQuestion.trim()) return payloadQuestion.trim();
  return ASK_ATLAS_QUESTION;
}

/**
 * Build the Ask Atlas surface. Unsigned callers never receive payload items,
 * client context, or search hits, even if a fixture is passed (fail-closed).
 */
export function askAtlasView(input: AskAtlasViewInput): AskAtlasView {
  if (!input.signed) {
    return closedView('unsigned', ASK_ATLAS_UNSIGNED_COPY, ASK_ATLAS_UNSIGNED_COPY);
  }

  if (input.loading && !input.payload && !input.clientContext && !input.authorizedSearch) {
    return {
      kind: 'loading',
      title: ASK_ATLAS_TITLE,
      question: displayedQuestion(input),
      subtitle: 'Loading entitled Ask Atlas runtime from Hub…',
      ranking: [],
      items: [],
      clientContext: null,
      authorizedSearch: null,
      emptyReason: null,
      invented: false,
    };
  }

  const status = input.status ?? 0;
  if (status === 401 || status === 403) {
    return closedView('denied', ASK_ATLAS_DENIED_COPY, ASK_ATLAS_DENIED_COPY);
  }

  const payload = input.payload;
  const clientContext = asClientContext(input.clientContext);
  const authorizedSearch = asAuthorizedSearch(input.authorizedSearch);
  if (!payload && !clientContext && !authorizedSearch) {
    return closedView(
      'error',
      input.error || 'Ask Atlas could not be loaded from Hub.',
      input.error || 'Ask Atlas could not be loaded from Hub.',
    );
  }

  const ranking = Array.isArray(payload?.ranking) ? payload.ranking.map((row) => String(row)) : [];
  const question = displayedQuestion(input, payload?.question);
  const items = payload?.items?.length
    ? payload.items.map(asItem).filter((row): row is AskAtlasViewItem => Boolean(row))
    : [];
  const attentionEmpty = !payload || payload.honestEmpty === true || !items.length;
  const contextVisible = Boolean(clientContext && clientContext.honestEmpty === false);
  const searchVisible = Boolean(authorizedSearch && authorizedSearch.honestEmpty === false);
  const hasPicture = !attentionEmpty || contextVisible || searchVisible;

  if (!hasPicture) {
    return {
      kind: 'empty',
      title: ASK_ATLAS_TITLE,
      question,
      subtitle: ASK_ATLAS_HONESTY_COPY,
      ranking,
      items: [],
      clientContext: clientContext?.honestEmpty ? clientContext : null,
      authorizedSearch: authorizedSearch?.honestEmpty ? authorizedSearch : null,
      emptyReason: ASK_ATLAS_EMPTY_COPY,
      invented: false,
    };
  }

  const kind: AskAtlasViewKind = !attentionEmpty
    ? 'items'
    : contextVisible
      ? 'client-context'
      : 'search';

  return {
    kind,
    title: ASK_ATLAS_TITLE,
    question,
    subtitle: ranking.length
      ? `Ranked from entitled operator queues: ${ranking.join(' → ')}. ${ASK_ATLAS_HONESTY_COPY}`
      : ASK_ATLAS_HONESTY_COPY,
    ranking,
    items: attentionEmpty ? [] : items,
    clientContext: contextVisible ? clientContext : clientContext?.honestEmpty ? clientContext : null,
    authorizedSearch: searchVisible ? authorizedSearch : authorizedSearch?.honestEmpty ? authorizedSearch : null,
    emptyReason: null,
    invented: false,
  };
}

export function askAtlasViewFromRuntime(
  input: Omit<AskAtlasViewInput, 'payload' | 'clientContext' | 'authorizedSearch' | 'askedQuestion'> & {
    envelope?: OperatorRuntimeEnvelope | null;
  },
): AskAtlasView {
  return askAtlasView({
    ...input,
    payload: input.envelope?.askAtlas,
    clientContext: input.envelope?.clientContext,
    authorizedSearch: input.envelope?.authorizedSearch,
    askedQuestion: input.envelope?.askedQuestion,
  });
}

/** HTML-ish component contract used by tests and the Elite surface. */
export function renderAskAtlasMarkup(view: AskAtlasView): string {
  const items = view.items
    .map(
      (item) =>
        `<li data-state="${escapeAttr(item.state)}" data-classification="${escapeAttr(item.classification)}">` +
        `<span class="state">${escapeHtml(item.state)}</span> ` +
        `${escapeHtml(item.why)}` +
        (item.client || item.clientCode
          ? ` · ${escapeHtml([item.client, item.clientCode].filter(Boolean).join(' · '))}`
          : '') +
        `<br/><span class="based-on">Based on: ${escapeHtml(item.basedOn)} (${escapeHtml(item.classification)})</span>` +
        `</li>`,
    )
    .join('');
  const context = view.clientContext
    ? `<aside class="client-context" data-client-code="${escapeAttr(view.clientContext.clientCode || '')}" data-classification="${escapeAttr(view.clientContext.classification)}" data-evidence-class="${escapeAttr(view.clientContext.evidenceClass)}">` +
      `<p>${escapeHtml([view.clientContext.client, view.clientContext.clientCode].filter(Boolean).join(' · '))}</p>` +
      `<p>${escapeHtml(view.clientContext.why)}</p>` +
      `<p>Based on: ${escapeHtml(view.clientContext.basedOn)} (${escapeHtml(view.clientContext.classification)} · ${escapeHtml(view.clientContext.evidenceClass)})</p>` +
      `<p>realClientsOperationalized=${escapeHtml(view.clientContext.realClientsOperationalized.join(',') || '[]')}</p>` +
      `</aside>`
    : '';
  const hits = view.authorizedSearch?.hits
    .map(
      (hit) =>
        `<li data-classification="${escapeAttr(hit.classification)}">` +
        `${escapeHtml(hit.title)}` +
        (hit.clientCode ? ` · ${escapeHtml(hit.clientCode)}` : '') +
        `<br/><span class="based-on">Based on: ${escapeHtml(hit.basedOn)} (${escapeHtml(hit.classification)})</span>` +
        `<br/>${escapeHtml(hit.why)}` +
        `</li>`,
    )
    .join('') || '';
  const search = view.authorizedSearch
    ? `<aside class="authorized-search" data-hit-count="${escapeAttr(String(view.authorizedSearch.hitCount))}">` +
      `<p>${escapeHtml(view.authorizedSearch.why)}</p>` +
      `<p>Based on: ${escapeHtml(view.authorizedSearch.basedOn)} (${escapeHtml(view.authorizedSearch.classification)})</p>` +
      (hits ? `<ol class="hits">${hits}</ol>` : '') +
      `</aside>`
    : '';
  return [
    `<section data-kind="${escapeAttr(view.kind)}">`,
    `<h2>${escapeHtml(view.title)}</h2>`,
    view.question ? `<p class="question">${escapeHtml(view.question)}</p>` : '',
    `<p class="subtitle">${escapeHtml(view.subtitle)}</p>`,
    view.emptyReason ? `<p class="empty">${escapeHtml(view.emptyReason)}</p>` : '',
    items ? `<ol>${items}</ol>` : '',
    context,
    search,
    `</section>`,
  ]
    .filter(Boolean)
    .join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
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
  if (view.clientContext) {
    lines.push(
      [
        view.clientContext.client,
        view.clientContext.clientCode,
        view.clientContext.why,
        `Based on: ${view.clientContext.basedOn}`,
        view.clientContext.classification,
        view.clientContext.evidenceClass,
        `realClientsOperationalized=${view.clientContext.realClientsOperationalized.join(',') || '[]'}`,
      ]
        .filter(Boolean)
        .join(' · '),
    );
  }
  if (view.authorizedSearch) {
    lines.push(
      [
        `hitCount=${view.authorizedSearch.hitCount}`,
        view.authorizedSearch.why,
        `Based on: ${view.authorizedSearch.basedOn}`,
        view.authorizedSearch.classification,
      ]
        .filter(Boolean)
        .join(' · '),
    );
    for (const hit of view.authorizedSearch.hits) {
      lines.push(
        [hit.title, hit.why, `Based on: ${hit.basedOn}`, hit.classification, hit.provenance, hit.clientCode]
          .filter(Boolean)
          .join(' · '),
      );
    }
  }
  return lines.join('\n');
}
