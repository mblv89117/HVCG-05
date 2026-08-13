/**
 * Client 360 authorization.
 *
 * Client 360 entities are keyed by ingest-time random UUIDs and matched by
 * email/domain/display-name heuristics. There is no deterministic,
 * server-owned mapping from a Client 360 UUID to HVCG_Clients.ClientCode.
 *
 * Do not compare the UUID to the Entra ClientCode allow-list.
 * Do not infer ClientCode from display name, email, or domain.
 * Until an architecture/data remediation provides a trusted mapping,
 * every client-specific Client 360 route fails closed.
 */

import { isCanonicalClientCode } from '../entitlements/clientCode.ts';

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
 * Resolve a Client 360 entity id to a canonical ClientCode.
 * Always null: no trusted mapping exists in canonical architecture.
 */
export function resolveClient360ClientCode(_client360Id: string): string | null {
  return null;
}

export function assertClient360Mapped(client360Id: string): string {
  const code = trustedClientCodeOrNull(resolveClient360ClientCode(client360Id));
  if (!code) throw new Client360UnmappedError();
  return code;
}
