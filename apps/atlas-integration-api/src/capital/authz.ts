/**
 * Capital HTTP isolation — same rule as Hub PM.
 * Owner/Administrator do not bypass ClientCode entitlements.
 * Manny strategy/shortlist approval is HVCG Owner only.
 */

import {
  canAccessCapitalClient,
  entitledCapitalClientCodes,
  isCapitalClientCode,
  isMannyApprover as coreIsMannyApprover,
} from '@hvcg/atlas-capital-core';
import type { AtlasPrincipal } from '../middleware/auth.ts';
import { CapitalHttpError } from './errors.ts';

export function entitledClientCodes(principal: AtlasPrincipal): string[] {
  return entitledCapitalClientCodes(principal.allowedClientIds);
}

export function canAccessClient(principal: AtlasPrincipal, clientCode: string): boolean {
  return canAccessCapitalClient(principal.allowedClientIds, clientCode);
}

export function isMannyApprover(principal: AtlasPrincipal): boolean {
  return coreIsMannyApprover(principal.roles);
}

export function isCapitalPrivileged(_principal: AtlasPrincipal): boolean {
  return false;
}

export function assertClientScope(principal: AtlasPrincipal): void {
  if (entitledClientCodes(principal).length === 0) {
    throw new CapitalHttpError(403, 'forbidden', 'Access denied: no entitled clients');
  }
}

export function assertCanAccessClient(principal: AtlasPrincipal, clientCode: string): void {
  if (!isCapitalClientCode(clientCode)) {
    throw new CapitalHttpError(422, 'unprocessable', 'Canonical ClientCode required');
  }
  if (!canAccessClient(principal, clientCode)) {
    throw new CapitalHttpError(403, 'forbidden', 'Access denied: client not in principal scope');
  }
}

export function assertMannyApprover(principal: AtlasPrincipal): void {
  if (!isMannyApprover(principal)) {
    throw new CapitalHttpError(403, 'forbidden', 'HVCG Owner approval required');
  }
}

export function filterByClientAccess<T extends { clientCode: string }>(
  principal: AtlasPrincipal,
  records: T[],
): T[] {
  return records.filter((r) => canAccessClient(principal, r.clientCode));
}
