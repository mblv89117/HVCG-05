/** Cast helper for brand rgba values that Griffel's strict CSS types reject. */
export function brandStyles<T extends Record<string, object>>(styles: T): T {
  return styles;
}
