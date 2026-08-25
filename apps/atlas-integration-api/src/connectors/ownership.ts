/**
 * Connection ownership is an independent security boundary.
 *
 * A principal may operate a connection only when:
 *   connection.ownerUserId === authenticatedPrincipal.userId
 *
 * `authenticatedPrincipal.userId` comes from the verified Hub JWT
 * (oid, with Gate 8B-1 sub fallback). Email, headers, query parameters,
 * ClientCode membership, and Hub roles do not authorize ownership.
 *
 * Ownerless records fail closed. Do not infer an owner.
 */

import type { ConnectionRecord } from '@hvcg/atlas-integration-core';
import type { IntegrationRepository } from '../store/repository.ts';

export function hasTrustedOwner(
  conn: ConnectionRecord | undefined | null,
): conn is ConnectionRecord {
  return Boolean(conn && typeof conn.ownerUserId === 'string' && conn.ownerUserId.trim() !== '');
}

export function connectionOwnedByPrincipal(
  conn: ConnectionRecord | undefined | null,
  principalUserId: string | undefined,
): boolean {
  if (!principalUserId || !principalUserId.trim()) return false;
  if (!hasTrustedOwner(conn)) return false;
  return conn.ownerUserId === principalUserId;
}

/**
 * Locate a connection and verify ownership before any credential or provider use.
 * Returns undefined for both missing IDs and IDs owned by another principal
 * so callers can emit the same 404. Does not load or decrypt credentials.
 */
export function getOwnedConnection(
  repo: IntegrationRepository,
  connectionId: string,
  principalUserId: string | undefined,
): ConnectionRecord | undefined {
  if (!principalUserId || !principalUserId.trim()) return undefined;
  const conn = repo.getConnection(connectionId);
  if (!connectionOwnedByPrincipal(conn, principalUserId)) return undefined;
  return conn;
}
