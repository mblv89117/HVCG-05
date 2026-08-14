/**
 * Canonical HVCG ClientCode validation (Elite mirror of Hub entitlements/clientCode).
 * Authorization keys are HVCG_Clients.ClientCode values, not Client 360 UUIDs.
 */
const CLIENT_CODE_RE = /^[A-Z][A-Z0-9]{2,15}$/;

export function isCanonicalClientCode(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  return CLIENT_CODE_RE.test(raw);
}
