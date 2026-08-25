/**
 * Canonical HVCG ClientCode validation.
 *
 * Authorization keys are HVCG_Clients.ClientCode values, not SharePoint item IDs,
 * display names, Client 360 UUIDs, or PM aliases.
 *
 * Group names are exactly `HVCG-Client-{ClientCode}`. Two ClientCodes that differ
 * only by case are distinct; this validator does not fold case.
 */

export const CLIENT_GROUP_PREFIX = 'HVCG-Client-';

/** Entra-safe, stable business identifier. Uppercase alphanumeric, 3–16 chars. */
const CLIENT_CODE_RE = /^[A-Z][A-Z0-9]{2,15}$/;

export function isCanonicalClientCode(raw: string | null | undefined): boolean {
  if (typeof raw !== 'string') return false;
  return CLIENT_CODE_RE.test(raw);
}

export function parseClientCodeFromGroupDisplayName(
  displayName: string,
  prefix = CLIENT_GROUP_PREFIX,
): string | null {
  if (!displayName.startsWith(prefix)) return null;
  const suffix = displayName.slice(prefix.length);
  if (!isCanonicalClientCode(suffix)) return null;
  return suffix;
}

export function clientGroupDisplayName(clientCode: string, prefix = CLIENT_GROUP_PREFIX): string | null {
  if (!isCanonicalClientCode(clientCode)) return null;
  return `${prefix}${clientCode}`;
}
