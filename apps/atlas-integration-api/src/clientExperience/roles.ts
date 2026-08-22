/**
 * Client-experience principals are distinct from Atlas operators.
 * Client-only callers never inherit operator desk or unrestricted /api/pm access.
 */

import type { AtlasPrincipal } from '../middleware/auth.ts';

export const CLIENT_ROLES = ['Client Executive', 'Client Team Member'] as const;
export const OPERATOR_ROLES = ['HVCG Owner', 'HVCG Team Member', 'Administrator'] as const;

export function hasClientRole(principal: AtlasPrincipal): boolean {
  return principal.roles.some((role) => (CLIENT_ROLES as readonly string[]).includes(role));
}

export function hasOperatorRole(principal: AtlasPrincipal): boolean {
  return principal.roles.some((role) => (OPERATOR_ROLES as readonly string[]).includes(role));
}

/** True when the caller is a client principal and not HVCG staff/owner/admin. */
export function isClientOnlyPrincipal(principal: AtlasPrincipal): boolean {
  return hasClientRole(principal) && !hasOperatorRole(principal);
}

export function isOperatorPrincipal(principal: AtlasPrincipal): boolean {
  return hasOperatorRole(principal);
}

const CLIENT_ENTITLED_PM = [
  /^\/api\/pm\/clients\/[^/]+\/(portal|document-requests|attention|workspace|brief|commercial-context)$/,
  /^\/api\/pm\/clients\/[^/]+$/,
  /^\/api\/pm\/documents$/,
  /^\/api\/pm\/search$/,
  /^\/api\/pm\/my-work$/,
];

/** Client-only callers may use entitled-honest portal/document/search paths. Operator collections stay denied. */
export function isClientEntitledPmPath(path: string): boolean {
  return CLIENT_ENTITLED_PM.some((pattern) => pattern.test(path));
}
