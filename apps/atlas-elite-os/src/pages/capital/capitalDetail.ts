/**
 * Hub → Elite opportunity-detail mapping.
 * No Vite/MSAL imports — unit tests load this in Node.
 *
 * Hub `GET /api/capital/opportunities/:id` returns `applications[]`
 * (and historically duplicated that array on `application`). Elite must
 * never treat an array as a single package object.
 */

export const ATTEST_FORWARD: Record<string, string[]> = {
  PREPARED: ['CLIENT_CONFIRMATION_REQUIRED', 'CORRECTION_REQUIRED'],
  CLIENT_CONFIRMATION_REQUIRED: ['CLIENT_CONFIRMED', 'CORRECTION_REQUIRED'],
  CLIENT_CONFIRMED: ['APPROVED_FOR_SUBMISSION', 'CORRECTION_REQUIRED'],
  CORRECTION_REQUIRED: ['PREPARED', 'CLIENT_CONFIRMATION_REQUIRED'],
  APPROVED_FOR_SUBMISSION: ['CORRECTION_REQUIRED'],
};

export const ATTEST_LABELS: Record<string, string> = {
  PREPARED: 'Prepared',
  CLIENT_CONFIRMATION_REQUIRED: 'Request client confirmation',
  CLIENT_CONFIRMED: 'Mark client confirmed',
  APPROVED_FOR_SUBMISSION: 'Approve for recorded submission',
  CORRECTION_REQUIRED: 'Return for correction',
};

export function nextAttestationOptions(current?: string | null): string[] {
  const key = String(current || 'PREPARED').trim() || 'PREPARED';
  return ATTEST_FORWARD[key] || [];
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Coerce Hub application payload into a package array.
 * Accepts `applications[]`, a mistaken singular object, or an array
 * parked on `application` (Hub get() currently returns the same array
 * on both keys).
 */
export function coerceApplications(raw: unknown): unknown[] {
  const body = asObject(raw);
  if (Array.isArray(body.applications) && body.applications.length) {
    return body.applications;
  }
  if (Array.isArray(body.application)) return body.application;
  if (body.application && typeof body.application === 'object' && !Array.isArray(body.application)) {
    return [body.application];
  }
  if (Array.isArray(body.applications)) return body.applications;
  return [];
}

export function coerceClosing(raw: unknown): unknown[] {
  const body = asObject(raw);
  if (Array.isArray(body.closing)) return body.closing;
  const nested = asObject(body.closing);
  if (Array.isArray(nested.conditions)) return nested.conditions;
  if (Array.isArray(body.conditions)) return body.conditions;
  return [];
}

export function coerceComparison(raw: unknown): unknown | null {
  const body = asObject(raw);
  const comparison = body.comparison;
  if (comparison && typeof comparison === 'object' && !Array.isArray(comparison)) return comparison;
  if (Array.isArray(body.rows) && body.derivedNotQuoted === true) return body;
  return null;
}

/**
 * Normalize a Hub (or synthetic) opportunity payload for Elite workspace.
 * Always returns `applications[]` plus a convenience `application` (first package).
 */
export function normalizeOpportunityDetail(raw: unknown): Record<string, unknown> {
  const body = asObject(raw);
  const opportunity = body.opportunity && typeof body.opportunity === 'object' ? body.opportunity : body;
  const applications = coerceApplications(body);
  return {
    opportunity,
    checklist: asList(body.checklist),
    documents: asList(body.documents),
    underwriting: body.underwriting || null,
    strategy: body.strategy || null,
    matches: asList(body.matches),
    applications,
    application: applications[0] || null,
    submissions: asList(body.submissions),
    offers: asList(body.offers),
    closing: coerceClosing(body),
    fees: asList(body.fees),
    rfis: asList(body.rfis),
    comparison: coerceComparison(body),
    funding: body.funding && typeof body.funding === 'object' ? body.funding : null,
    decision: body.decision && typeof body.decision === 'object' ? body.decision : null,
    missingRequest: body.missingRequest || null,
  };
}

/** Demo/synthetic mutations stay on SYN* files — never live client ids. */
export function isSyntheticMutationTarget(id: string): boolean {
  return /^(cap-syn-|SYN)/i.test(String(id || '').trim());
}
