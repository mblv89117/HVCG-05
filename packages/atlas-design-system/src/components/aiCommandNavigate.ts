/**
 * Keyword routes for the dev-stub AI command panel.
 * Live Ask Atlas (a Hub runner is attached) answers bank, client, financial,
 * document, and capital questions in the drawer. Opening Banking Connections,
 * Clients, Financials, Documents, or Capital Command Center is not a substitute
 * for a finished Hub answer.
 */
export type AiCommandNavigatePath =
  | '/banking'
  | '/documents'
  | '/clients'
  | '/financials'
  | '/capital';

export function aiCommandNavigatePath(
  prompt: string,
  opts: { liveAskAtlas: boolean },
): AiCommandNavigatePath | null {
  const lower = prompt.trim().toLowerCase();
  if (!lower) return null;
  // Dev stub only. A live runner stays in the drawer (null) for every keyword
  // below, matching the document and capital gates. Document is checked before
  // later keywords, matching the original else-if chain, so a stub prompt that
  // mentions both document and client opens /documents. "finance" is not
  // "financial" and does not take the /financials route.
  if (lower.includes('bank') && !opts.liveAskAtlas) return '/banking';
  if (lower.includes('document') && !opts.liveAskAtlas) return '/documents';
  if (lower.includes('client') && !opts.liveAskAtlas) return '/clients';
  if (lower.includes('financial') && !opts.liveAskAtlas) return '/financials';
  if (lower.includes('capital') && !opts.liveAskAtlas) return '/capital';
  return null;
}
