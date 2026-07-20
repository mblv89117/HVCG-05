/**
 * Browser client for Atlas Plaid API.
 * Never requests or stores access tokens.
 */

export interface PortalAuthHeaders {
  userId: string;
  organizationId: string;
  clientIds: string[];
  email?: string;
  roles?: string[];
}

function headers(auth: PortalAuthHeaders): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-atlas-user-id': auth.userId,
    'x-atlas-organization-id': auth.organizationId,
    'x-atlas-client-ids': auth.clientIds.join(','),
    ...(auth.email ? { 'x-atlas-user-email': auth.email } : {}),
    'x-atlas-roles': (auth.roles || ['ClientContact']).join(','),
  };
}

const base = () =>
  (import.meta as ImportMeta & { env?: { VITE_PLAID_API_BASE?: string } }).env?.VITE_PLAID_API_BASE ||
  'http://127.0.0.1:8787';

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { message?: string }).message || (data as { error?: string }).error || res.statusText);
    (err as Error & { status: number; body: unknown }).status = res.status;
    (err as Error & { body: unknown }).body = data;
    throw err;
  }
  return data;
}

export async function fetchConnections(auth: PortalAuthHeaders, clientId: string) {
  const res = await fetch(`${base()}/api/plaid/connections?clientId=${encodeURIComponent(clientId)}`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ connections: import('@hvcg/atlas-plaid-contracts').ConnectionSummary[] }>;
}

export async function createLinkToken(auth: PortalAuthHeaders, clientId: string) {
  const res = await fetch(`${base()}/api/plaid/link-token`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ clientId }),
  });
  return parse(res) as Promise<{ linkToken: string; expiration: string; requestId: string }>;
}

export async function exchangePublicToken(
  auth: PortalAuthHeaders,
  input: {
    clientId: string;
    clientCode: string;
    publicToken: string;
    consentAcceptedAt: string;
    consentVersion: string;
  },
) {
  const res = await fetch(`${base()}/api/plaid/exchange-token`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(input),
  });
  return parse(res);
}

export async function syncConnection(auth: PortalAuthHeaders, clientId: string, connectionId: string) {
  const res = await fetch(`${base()}/api/plaid/sync`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ clientId, connectionId }),
  });
  return parse(res);
}

export async function disconnectConnection(
  auth: PortalAuthHeaders,
  clientId: string,
  connectionId: string,
  reason?: string,
) {
  const res = await fetch(`${base()}/api/plaid/disconnect`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ clientId, connectionId, reason }),
  });
  return parse(res);
}

export async function fetchCashSnapshot(auth: PortalAuthHeaders, clientId: string, clientCode: string) {
  const res = await fetch(
    `${base()}/api/plaid/cash-snapshot?clientId=${encodeURIComponent(clientId)}&clientCode=${encodeURIComponent(clientCode)}`,
    { headers: headers(auth) },
  );
  return parse(res);
}
