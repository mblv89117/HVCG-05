/**
 * Auth + tenant isolation middleware.
 * Production: validate Entra JWT and map groups → client access.
 * Dev: accept trusted headers from portal after MSAL session (never trust in Prod without JWT).
 */

export interface AtlasPrincipal {
  userId: string;
  email?: string;
  organizationId: string;
  allowedClientIds: string[];
  roles: string[];
}

export function parsePrincipal(headers: Headers): AtlasPrincipal | null {
  const userId = headers.get('x-atlas-user-id');
  const orgId = headers.get('x-atlas-organization-id') || 'org-hvcg';
  const clients = headers.get('x-atlas-client-ids');
  if (!userId || !clients) return null;
  return {
    userId,
    email: headers.get('x-atlas-user-email') || undefined,
    organizationId: orgId,
    allowedClientIds: clients.split(',').map((s) => s.trim()).filter(Boolean),
    roles: (headers.get('x-atlas-roles') || 'ClientContact').split(','),
  };
}

export function assertClientAccess(principal: AtlasPrincipal, clientId: string): void {
  if (principal.allowedClientIds.includes('*')) return;
  if (!principal.allowedClientIds.includes(clientId)) {
    const err = new Error('Access denied: client not in principal scope');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

export function headersFromIncoming(raw: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') headers.set(k, v);
  }
  return headers;
}
