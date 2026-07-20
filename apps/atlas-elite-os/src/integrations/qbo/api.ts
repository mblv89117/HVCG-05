/**
 * Browser client for Atlas QuickBooks Online API.
 * Never requests or stores access/refresh tokens.
 */

export interface AtlasQboAuthHeaders {
  userId: string;
  organizationId: string;
  clientIds: string[];
  email?: string;
  roles?: string[];
}

function headers(auth: AtlasQboAuthHeaders): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-atlas-user-id': auth.userId,
    'x-atlas-organization-id': auth.organizationId,
    'x-atlas-client-ids': auth.clientIds.join(','),
    ...(auth.email ? { 'x-atlas-user-email': auth.email } : {}),
    'x-atlas-roles': (auth.roles || ['Staff']).join(','),
  };
}

const base = () =>
  (import.meta as ImportMeta & { env?: { VITE_QBO_API_BASE?: string } }).env?.VITE_QBO_API_BASE ||
  'http://127.0.0.1:8788';

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as { message?: string }).message || (data as { error?: string }).error || res.statusText,
    );
    (err as Error & { status: number; body: unknown }).status = res.status;
    (err as Error & { body: unknown }).body = data;
    throw err;
  }
  return data;
}

export async function fetchQboHealth() {
  const res = await fetch(`${base()}/health`);
  return parse(res) as Promise<{
    ok: boolean;
    qboConfigured: boolean;
    env: string;
  }>;
}

export async function fetchConnections(auth: AtlasQboAuthHeaders, clientId: string) {
  const res = await fetch(`${base()}/api/qbo/connections?clientId=${encodeURIComponent(clientId)}`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{
    connections: import('@hvcg/atlas-qbo-contracts').QboConnectionSummary[];
    qboConfigured: boolean;
    oauthStatus: string;
  }>;
}

export async function startOAuth(
  auth: AtlasQboAuthHeaders,
  input: {
    clientId: string;
    clientCode: string;
    consentAcceptedAt: string;
    consentVersion: string;
    mode?: 'connect' | 'reconnect';
    connectionId?: string;
  },
) {
  const res = await fetch(`${base()}/api/qbo/oauth/start`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(input),
  });
  return parse(res) as Promise<{ authorizeUrl: string; state: string; expiresAt: string }>;
}

export async function syncConnection(
  auth: AtlasQboAuthHeaders,
  clientId: string,
  connectionId: string,
  resume = true,
) {
  const res = await fetch(`${base()}/api/qbo/sync`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ clientId, connectionId, resume }),
  });
  return parse(res);
}

export async function disconnectConnection(
  auth: AtlasQboAuthHeaders,
  clientId: string,
  connectionId: string,
  reason?: string,
) {
  const res = await fetch(`${base()}/api/qbo/disconnect`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ clientId, connectionId, reason }),
  });
  return parse(res);
}

export async function fetchAccountingSnapshot(
  auth: AtlasQboAuthHeaders,
  clientId: string,
  clientCode: string,
) {
  const res = await fetch(
    `${base()}/api/qbo/accounting-snapshot?clientId=${encodeURIComponent(clientId)}&clientCode=${encodeURIComponent(clientCode)}`,
    { headers: headers(auth) },
  );
  return parse(res);
}
