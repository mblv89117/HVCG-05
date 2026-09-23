/**
 * Keyword routes for the dev-stub AI command panel.
 * Live Ask Atlas (a Hub runner is attached) answers document and capital
 * questions in the drawer. Opening Capital Command Center is not a substitute
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
  if (lower.includes('bank')) return '/banking';
  // Document is checked before later keywords, matching the original else-if
  // chain. A live runner skips this branch and may still match a later keyword.
  if (lower.includes('document') && !opts.liveAskAtlas) return '/documents';
  if (lower.includes('client')) return '/clients';
  if (lower.includes('financial')) return '/financials';
  if (lower.includes('capital') && !opts.liveAskAtlas) return '/capital';
  return null;
}
