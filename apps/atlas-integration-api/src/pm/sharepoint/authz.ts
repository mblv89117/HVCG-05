/**
 * Server authorization for SharePoint PM.
 * Client projects: exact canonical ClientCode entitlement.
 * Internal: IsInternalProject=true AND no ClientCode; staff roles only.
 * Missing ClientCode is not internal. No wildcard. Administrator is not staff.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';

export const INTERNAL_STAFF_ROLES = ['HVCG Team Member', 'HVCG Owner'] as const;
export const CLIENT_FACING_ROLES = ['Client Executive', 'Read-Only Advisor'] as const;

export type ProjectClassification =
  | { kind: 'client'; clientCode: string }
  | { kind: 'internal' }
  | { kind: 'invalid'; reason: 'missing_client' | 'internal_with_client' | 'malformed_client' };

export function isInternalStaff(principal: AtlasPrincipal): boolean {
  return (
    principal.roles.includes('HVCG Team Member') || principal.roles.includes('HVCG Owner')
  );
}

export function isClientFacingRole(principal: AtlasPrincipal): boolean {
  return (
    principal.roles.includes('Client Executive') || principal.roles.includes('Read-Only Advisor')
  );
}

/** Hub-audience app tokens have no JWT roles but can be entitled via Graph groups. */
export function isRolelessEntitledCaller(principal: AtlasPrincipal): boolean {
  return principal.roles.length === 0 && entitledClientCodes(principal).length > 0;
}

export function canAccessOperatorDesk(principal: AtlasPrincipal): boolean {
  if (isClientFacingRole(principal)) return false;
  if (isInternalStaff(principal)) return true;
  return isRolelessEntitledCaller(principal);
}

export function classifyProjectFields(input: {
  clientCode?: string | null;
  isInternal?: boolean | null;
}): ProjectClassification {
  const code = (input.clientCode || '').trim();
  const internal = input.isInternal === true;
  if (internal && code) return { kind: 'invalid', reason: 'internal_with_client' };
  if (internal && !code) return { kind: 'internal' };
  if (!internal && !code) return { kind: 'invalid', reason: 'missing_client' };
  if (!isCanonicalClientCode(code) || code === '*') {
    return { kind: 'invalid', reason: 'malformed_client' };
  }
  return { kind: 'client', clientCode: code };
}

/**
 * Wildcard '*' is never a production client scope, including SharePoint PM.
 */
export function canAccessClassification(
  principal: AtlasPrincipal,
  classification: ProjectClassification,
): boolean {
  if (classification.kind === 'invalid') return false;
  if (classification.kind === 'internal') return isInternalStaff(principal);
  if (!isCanonicalClientCode(classification.clientCode) || classification.clientCode === '*') {
    return false;
  }
  return principal.allowedClientIds.includes(classification.clientCode);
}

export function entitledClientCodes(principal: AtlasPrincipal): string[] {
  const out: string[] = [];
  for (const code of principal.allowedClientIds) {
    if (code === '*') continue;
    if (isCanonicalClientCode(code)) out.push(code);
  }
  return out;
}
