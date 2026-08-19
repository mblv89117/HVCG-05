/**
 * Canonical HVCG ClientCode validation (Elite mirror of Hub entitlements/clientCode).
 * Authorization keys are HVCG_Clients.ClientCode values, not Client 360 UUIDs.
 * Owner/Administrator are roles, not a wildcard client scope.
 */
const CLIENT_CODE_RE = /^[A-Z][A-Z0-9]{2,15}$/;

export function isCanonicalClientCode(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  return CLIENT_CODE_RE.test(raw);
}

/** Strip wildcard and non-canonical values. Never treats '*' as every-client access. */
export function entitledClientCodes(allowedClientIds: readonly string[]): string[] {
  const out: string[] = [];
  for (const code of allowedClientIds) {
    if (code === '*') continue;
    if (isCanonicalClientCode(code)) out.push(code);
  }
  return out;
}

/** Client isolation: explicit entitle only. Wildcard principal scope is denied. */
export function canAccessClient(allowedClientIds: readonly string[], clientCode: string): boolean {
  if (!isCanonicalClientCode(clientCode) || clientCode === '*') return false;
  return entitledClientCodes(allowedClientIds).includes(clientCode);
}
