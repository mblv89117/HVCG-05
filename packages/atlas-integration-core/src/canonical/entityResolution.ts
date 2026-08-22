/**
 * Infer High Value Solution / HVCG business entity from email domain or tenant hints.
 */
export type BusinessEntityGuess = 'HVS' | 'HVCG' | 'legacy' | 'personal_business' | 'unknown';

const HVS_DOMAINS = [
  'highvaluesolution',
  'highvaluesolutions',
  'hvsllc',
  'hvsolution',
];

const HVCG_DOMAINS = [
  'highvaluecapital',
  'highvaluecapitalgroup',
  'hvcg',
  'hvcgroup',
];

const LEGACY_HINTS = [
  'barela',
  'manny',
  'onmicrosoft.com',
];

export function inferBusinessEntity(input: {
  email?: string | null;
  domain?: string | null;
  displayName?: string | null;
  tenantOrOrg?: string | null;
}): BusinessEntityGuess {
  const hay = [
    input.email,
    input.domain,
    input.displayName,
    input.tenantOrOrg,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const domain = (input.domain || extractDomain(input.email) || '').toLowerCase();

  if (HVCG_DOMAINS.some((d) => domain.includes(d) || hay.includes(d))) return 'HVCG';
  if (HVS_DOMAINS.some((d) => domain.includes(d) || hay.includes(d))) return 'HVS';
  if (LEGACY_HINTS.some((d) => hay.includes(d))) return 'legacy';
  if (domain.endsWith('gmail.com') || domain.endsWith('outlook.com') || domain.endsWith('hotmail.com')) {
    return 'personal_business';
  }
  return 'unknown';
}

export function extractDomain(email?: string | null): string | undefined {
  if (!email || !email.includes('@')) return undefined;
  return email.split('@')[1]?.toLowerCase();
}

/**
 * Soft entity-resolution keys for Client 360 — uncertain matches stay unmerged.
 */
export function clientMatchKeys(fields: {
  emails?: string[];
  phones?: string[];
  legalName?: string;
  businessName?: string;
  domains?: string[];
}): string[] {
  const keys: string[] = [];
  for (const e of fields.emails || []) {
    const n = e.trim().toLowerCase();
    if (n) keys.push(`email:${n}`);
  }
  for (const d of fields.domains || []) {
    const n = d.trim().toLowerCase();
    if (n) keys.push(`domain:${n}`);
  }
  for (const p of fields.phones || []) {
    const digits = p.replace(/\D/g, '');
    if (digits.length >= 10) keys.push(`phone:${digits.slice(-10)}`);
  }
  if (fields.legalName) keys.push(`legal:${normalizeName(fields.legalName)}`);
  if (fields.businessName) keys.push(`biz:${normalizeName(fields.businessName)}`);
  return [...new Set(keys)];
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Overlap of one or more strong keys ⇒ candidate match (not auto-merge). */
export function isConfidentClientMatch(a: string[], b: string[]): boolean {
  const strong = new Set(
    [...a, ...b].filter((k) => k.startsWith('email:') || k.startsWith('phone:')),
  );
  let hits = 0;
  for (const k of a) {
    if (b.includes(k) && (k.startsWith('email:') || k.startsWith('phone:'))) hits++;
  }
  return hits >= 1 && strong.size > 0;
}
