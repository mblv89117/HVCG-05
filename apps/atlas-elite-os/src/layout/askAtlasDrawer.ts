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
      q.includes('approve') ||
      q.includes('document'))
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

function relevantItems(prompt: string, items: AskAtlasDrawerItem[]): AskAtlasDrawerItem[] {
  const lower = prompt.toLowerCase();
  if (lower.includes('capital')) {
    return items.filter(
      (item) =>
        item.state === 'Capital' ||
        /capital/i.test(item.why) ||
        /capital/i.test(item.basedOn),
    );
  }
  if (lower.includes('overdue')) return items.filter((item) => item.state === 'Overdue');
  if (lower.includes('blocked')) return items.filter((item) => item.state === 'Blocked');
  if (lower.includes('decision')) return items.filter((item) => item.state === 'Decision Required');
  if (lower.includes('waiting')) return items.filter((item) => item.state === 'Waiting');
  if (lower.includes('risk')) return items.filter((item) => item.state === 'At Risk');
  return items;
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
