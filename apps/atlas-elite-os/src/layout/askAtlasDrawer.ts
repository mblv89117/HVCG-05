export interface AskAtlasDrawerItem {
  state: string;
  client?: string;
  clientCode?: string;
  classification: string;
  why: string;
  basedOn: string;
}

export type AskAtlasRoute =
  | 'hub_runtime_onboarding'
  | 'hub_runtime'
  | 'signed_attention'
  | 'unsigned_fail_closed';

const ROSTER_CODES = ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01'] as const;

const CLIENT_NAME_HINTS: Record<string, string[]> = {
  ACCG01: ['accg'],
  PDG01: ['prodigy'],
  HFD01: ['hart'],
  CCB01: ['colorado craft beef', 'colorado beef'],
  LIEN01: ['lien'],
};

/** Mirrors Hub mapsToOnboardingContextIntent — Elite must not send these to SharePoint search. */
export function mapsToOnboardingStatusIntent(prompt: string): boolean {
  const q = prompt.toLowerCase();
  return (
    q.includes('onboarding') &&
    (q.includes('where are we') ||
      q.includes('missing') ||
      q.includes('blocked') ||
      q.includes('waiting on') ||
      q.includes('kickoff') ||
      q.includes('kick off') ||
      q.includes('approve') ||
      q.includes('document') ||
      q.includes('start') ||
      q.includes('run') ||
      q.includes('execute') ||
      q.includes('activate') ||
      q.includes('begin') ||
      q.includes('status'))
  );
}

export function routeAskAtlasPrompt(
  prompt: string,
  opts: { hasBearer: boolean },
): AskAtlasRoute {
  if (!opts.hasBearer) return 'unsigned_fail_closed';
  if (mapsToOnboardingStatusIntent(prompt)) return 'hub_runtime_onboarding';
  return 'hub_runtime';
}

function codeTokenBoundary(code: string): RegExp {
  return new RegExp(`(?:^|[^A-Z0-9])${code}(?:[^A-Z0-9]|$)`, 'i');
}

export function resolveClientScopeFromPrompt(prompt: string): {
  clientCode?: string;
  explicit: boolean;
} {
  const upper = prompt.toUpperCase();
  const exact = ROSTER_CODES.filter((code) => codeTokenBoundary(code).test(upper));
  if (exact.length === 1) return { clientCode: exact[0], explicit: true };
  const lower = prompt.toLowerCase();
  for (const code of ROSTER_CODES) {
    const hints = CLIENT_NAME_HINTS[code] || [];
    if (hints.some((hint) => lower.includes(hint))) return { clientCode: code, explicit: true };
  }
  const forMatch = prompt.trim().match(/\bfor\s+(.+?)[?.!]*$/i);
  if (forMatch?.[1]) {
    const token = forMatch[1].trim();
    const prefix = ROSTER_CODES.filter(
      (code) => code.startsWith(token.toUpperCase()) && token.length < code.length,
    );
    if (prefix.length === 1) return { clientCode: prefix[0], explicit: true };
  }
  return { explicit: false };
}

function relevantItems(prompt: string, items: AskAtlasDrawerItem[]): AskAtlasDrawerItem[] {
  const scope = resolveClientScopeFromPrompt(prompt);
  let scoped = items;
  if (scope.clientCode) {
    scoped = scoped.filter(
      (item) =>
        item.clientCode === scope.clientCode ||
        (!item.clientCode && !item.client),
    );
  }
  const lower = prompt.toLowerCase();
  if (lower.includes('capital')) {
    return scoped.filter(
      (item) =>
        item.state === 'Capital' ||
        /capital/i.test(item.why) ||
        /capital/i.test(item.basedOn),
    );
  }
  if (lower.includes('overdue')) return scoped.filter((item) => item.state === 'Overdue');
  if (lower.includes('blocked')) return scoped.filter((item) => item.state === 'Blocked');
  if (lower.includes('decision')) return scoped.filter((item) => item.state === 'Decision Required');
  if (lower.includes('waiting')) return scoped.filter((item) => item.state === 'Waiting');
  if (lower.includes('risk')) return scoped.filter((item) => item.state === 'At Risk');
  return scoped;
}

export function summarizeAskAtlasPrompt(
  prompt: string,
  items: AskAtlasDrawerItem[],
  error?: string | null,
): string {
  if (error) return `Ask Atlas could not load signed operator context: ${error}`;
  const relevant = relevantItems(prompt, items);
  if (!relevant.length) {
    return 'No entitled attention items for this request. Atlas does not invent work, amounts, lenders, or client rows.';
  }
  const lines = relevant.slice(0, 3).map((item, index) => {
    const who = [item.client, item.clientCode].filter(Boolean).join(' / ');
    const prefix = `${index + 1}. ${item.state}${who ? ` - ${who}` : ''}`;
    return `${prefix}: ${item.why} Based on: ${item.basedOn} (${item.classification}).`;
  });
  return `Ask Atlas found ${relevant.length} entitled attention item${relevant.length === 1 ? '' : 's'}:\n${lines.join('\n')}`;
}
