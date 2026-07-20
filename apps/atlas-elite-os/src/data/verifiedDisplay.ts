/**
 * Production-safe display values for Executive Dashboard widgets.
 * Never invent financial figures. Only show verified production data or approved pending labels.
 */

export type PendingDisplayLabel =
  | 'Awaiting verified data'
  | 'Pending verification'
  | 'Not yet calculated';

export const PENDING_LABELS = {
  awaiting: 'Awaiting verified data' as const,
  pending: 'Pending verification' as const,
  notCalculated: 'Not yet calculated' as const,
};

const FABRICATED_PATTERNS = [
  /^\$?\d[\d,]*(\.\d+)?\s*(k|m|mm|b|bn|usd|%)?$/i,
  /^\d+(\.\d+)?%$/,
  /^sample/i,
  /^demo/i,
  /^placeholder/i,
  /^lorem/i,
  /^todo/i,
];

export function looksLikeFabricatedFinance(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  const allowedPending = new Set<string>([
    PENDING_LABELS.awaiting,
    PENDING_LABELS.pending,
    PENDING_LABELS.notCalculated,
    'Awaiting verified source',
    'Data connection pending',
    'Unavailable',
    '—',
    '-',
  ]);
  if (allowedPending.has(v)) return false;
  return FABRICATED_PATTERNS.some((re) => re.test(v));
}

/**
 * Normalize Dataverse / adapter KPI into a safe display string.
 * `verified` must come from an approved Microsoft source field — never inferred from format alone.
 */
export function safeKpiDisplay(
  rawValue: string | undefined | null,
  opts: { verified: boolean; emptyLabel?: PendingDisplayLabel },
): string {
  const empty = opts.emptyLabel || PENDING_LABELS.awaiting;
  const raw = (rawValue || '').trim();
  if (!raw) return empty;
  if (!opts.verified) {
    if (looksLikeFabricatedFinance(raw)) return PENDING_LABELS.pending;
    // Non-numeric operational text may pass through only when explicitly verified
    return PENDING_LABELS.pending;
  }
  if (looksLikeFabricatedFinance(raw) && !opts.verified) return PENDING_LABELS.pending;
  return raw;
}

export function mapLegacyAvailability(
  availability: string,
): PendingDisplayLabel {
  const a = availability.toLowerCase();
  if (a.includes('not yet') || a.includes('calculat')) return PENDING_LABELS.notCalculated;
  if (a.includes('connection') || a.includes('pending verification')) return PENDING_LABELS.pending;
  return PENDING_LABELS.awaiting;
}

export function isVerifiedDataSource(label: string | undefined | null): boolean {
  const s = (label || '').toLowerCase();
  return (
    s.includes('verified') ||
    s === 'live' ||
    s === 'production' ||
    s.includes('dataverse verified')
  );
}
