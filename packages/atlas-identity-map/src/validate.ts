/** Entra-safe ClientCode: uppercase alphanumeric, 3–16 chars, starts with letter. */
const CLIENT_CODE_RE = /^[A-Z][A-Z0-9]{2,15}$/;

/** Matches Hub entitlements CLIENT_GROUP_PREFIX. */
export const CLIENT_GROUP_PREFIX = 'HVCG-Client-';

export function isCanonicalClientCode(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  return CLIENT_CODE_RE.test(raw);
}

export function entraGroupForClientCode(clientCode: string): string | null {
  if (!isCanonicalClientCode(clientCode)) return null;
  return `${CLIENT_GROUP_PREFIX}${clientCode}`;
}
