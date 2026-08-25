/**
 * Manny-only authorization for HVCG_Clients writes and tenant-wide fabric search.
 * Owner / Administrator roles are not wildcards. No env override. No inheritance.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { PmHttpError } from './errors.ts';

export const MANNY_ENTRA_OID = 'e4835ea2-3c45-493a-95f5-472f6339661d';

export function isMannyOid(oid: string | null | undefined): boolean {
  return typeof oid === 'string' && oid.trim().toLowerCase() === MANNY_ENTRA_OID;
}

export function isMannyPrincipal(principal: AtlasPrincipal): boolean {
  return isMannyOid(principal.userId);
}

export function assertMannyOnly(principal: AtlasPrincipal, action: string): void {
  if (isMannyPrincipal(principal)) return;
  throw new PmHttpError(
    403,
    'PM_MANNY_ONLY',
    `${action} is restricted to the authenticated HVCG owner principal.`,
  );
}

/** Service-runtime identity for scheduled fabric + business-memory sweeps (Hub MI path). */
export function bootstrapMannyPrincipal(allowedClientIds: string[] = []): AtlasPrincipal {
  const codes = allowedClientIds.filter((code) => typeof code === 'string' && code.trim() && code !== '*');
  return {
    userId: MANNY_ENTRA_OID,
    organizationId: 'hvcg',
    allowedClientIds: codes,
    roles: ['HVCG Owner'],
  };
}
