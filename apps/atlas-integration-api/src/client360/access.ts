/**
 * Client 360 authorization.
 *
 * Client 360 entities are keyed by ingest-time random UUIDs. ClientCode is
 * resolved only via the trusted identity registry mapping — never from
 * display name, email, or domain heuristics.
 *
 * Unmapped Client 360 IDs fail closed.
 */

import { isCanonicalClientCode } from '../entitlements/clientCode.ts';
import { resolveClient360IdToClientCode } from '../identity/registry.ts';

export const CLIENT360_UNMAPPED_CODE = 'client_identifier_unmapped';

export class Client360UnmappedError extends Error {
  readonly status = 403;
  readonly code = CLIENT360_UNMAPPED_CODE;

  constructor() {
    super('Access denied');
    this.name = 'Client360UnmappedError';
  }
}

/**
 * Validate a candidate ClientCode for authorization.
 * Missing, non-string, wildcard, and malformed values fail closed.
 */
export function trustedClientCodeOrNull(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (raw === '*') return null;
  if (!isCanonicalClientCode(raw)) return null;
  return raw;
}

/**
 * Resolve a Client 360 entity id to a canonical ClientCode via trusted map.
 * Returns null when no verified mapping exists (fail closed).
 */
export function resolveClient360ClientCode(client360Id: string): string | null {
  return trustedClientCodeOrNull(resolveClient360IdToClientCode(client360Id));
}

export function assertClient360Mapped(client360Id: string): string {
  const code = trustedClientCodeOrNull(resolveClient360ClientCode(client360Id));
  if (!code) throw new Client360UnmappedError();
  return code;
}
