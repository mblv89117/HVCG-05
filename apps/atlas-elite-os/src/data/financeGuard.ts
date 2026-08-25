/**
 * DEF-ELITE-001 — Guard against fabricated / sample financial display values.
 * Approved pending labels only when verified financial figures are unavailable.
 */

export const APPROVED_PENDING_LABELS = [
  'Awaiting verified data',
  'Data connection pending',
  'Not yet calculated',
  'No verified records available',
] as const;

/** Patterns that indicate invented or demo money amounts */
const FABRICATED_FINANCE_RE =
  /(?:\$\s*\d)|(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?)|(?:\d+(?:\.\d+)?\s*[MmBb]\b)|(?:\b1\.25M\b)|(?:\b4\.8M\b)|(?:Revenue\s*\(sample\))/i;

export function looksLikeFabricatedFinance(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = String(value).trim();
  if (!v) return false;
  if (APPROVED_PENDING_LABELS.some((l) => v.toLowerCase() === l.toLowerCase())) return false;
  // Em-dash / pending markers are safe
  if (v === '—' || v === '-' || /^pending/i.test(v)) return false;
  return FABRICATED_FINANCE_RE.test(v);
}

export function sanitizeFinancialDisplay(
  value: string | null | undefined,
  fallback: (typeof APPROVED_PENDING_LABELS)[number] = 'Awaiting verified data',
): string {
  const v = value == null ? '' : String(value).trim();
  if (!v) return fallback;
  if (looksLikeFabricatedFinance(v)) return fallback;
  return v;
}

export function assertNoFabricatedFinanceInBundle(sourceText: string): string[] {
  const hits: string[] = [];
  const needles = ['1.25M', '4.8M', 'Revenue (sample)', '$1.25', '$4.8'];
  for (const n of needles) {
    if (sourceText.includes(n)) hits.push(n);
  }
  return hits;
}
