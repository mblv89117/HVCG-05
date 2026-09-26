/**
 * W2R projects caption residual. Elite display only.
 * A loaded workspace already carries the hygiene-kept HVCG_Projects set.
 * Count > 0 is projects=PARTIAL. Count === 0 is projects=MISSING.
 * No indexed projects token. No second filter, no recovered titles, no write control.
 * A failed workspace never reaches this card, so these helpers do not classify a failed load.
 */

export function projectsChipLabel(count: number): 'projects=PARTIAL' | 'projects=MISSING' {
  return count > 0 ? 'projects=PARTIAL' : 'projects=MISSING';
}

/** Related work when the loaded project array is empty. Does not instruct create. */
export const PROJECTS_MISSING_RELATED_SENTENCE =
  'No hygiene-kept HVCG_Projects rows on this ClientCode. projects=MISSING. Recovered HVS filenames are not this list. Atlas does not invent project names.';

/** Caption under the kept name links when the loaded project array is non-empty. */
export const PROJECTS_PARTIAL_CAPTION =
  'These rows are the hygiene-kept HVCG_Projects set already on this payload. projects=PARTIAL. Recovered HVS filenames are not this list.';

/**
 * Related-projects empty description when writePolicy is read_only.
 * The page already says create is hidden. This line does not say to create.
 */
export const PROJECTS_READ_ONLY_EMPTY_DESCRIPTION =
  'Queried HVCG_Projects returned no entitled rows. projects=MISSING.';
