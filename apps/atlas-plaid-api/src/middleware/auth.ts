/**
 * Auth + tenant isolation middleware.
 *
 * OD-005 / ATLAS-RT-03: when requireAuth is true, Entra Bearer JWT is the only
 * trust anchor. Client-controlled x-atlas-* headers never authorize.
 * When requireAuth is false, explicit insecure-dev principal only.
 */

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { AppConfig } from '../config.ts';

export interface AtlasPrincipal {
  userId: string;
  email?: string;
  organizationId: string;
  /** Client IDs this principal may access */
  allowedClientIds: string[];
  roles: string[];
}

const jwksByUrl = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksForUrl(url: string) {
  let jwks = jwksByUrl.get(url);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url));
    jwksByUrl.set(url, jwks);
  }
  return jwks;
}

function bearerToken(headers: Headers): string | null {
  const raw = headers.get('authorization') || headers.get('Authorization');
  if (!raw) return null;
  const m = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return m?.[1] || null;
}

function claimString(payload: JWTPayload, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = payload[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function collectClaimValues(payload: JWTPayload, key: string): unknown[] {
  const v = payload[key];
  if (Array.isArray(v)) return v;
  if (v == null) return [];
  return [v];
}

/** Header parser retained for tests / explicit insecure-dev only — never production auth. */
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
  if (!principal.allowedClientIds.includes(clientId)) {
    const err = new Error('Access denied: client not in principal scope');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

function principalFromVerifiedPayload(payload: JWTPayload): AtlasPrincipal {
  const userId = claimString(payload, 'oid', 'sub') || '';
  if (!userId) {
    const err = new Error('Unauthorized: token missing oid/sub');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  const roles = collectClaimValues(payload, 'roles')
    .concat(collectClaimValues(payload, 'groups'))
    .map((v) => String(v).trim())
    .filter(Boolean);
  const clients = collectClaimValues(payload, 'allowed_client_ids')
    .concat(collectClaimValues(payload, 'client_ids'))
    .map((v) => String(v).trim())
    .filter(Boolean);
  return {
    userId,
    email: claimString(payload, 'preferred_username', 'email', 'upn'),
    organizationId: claimString(payload, 'tid', 'organization_id') || 'org-hvcg',
    allowedClientIds: clients,
    roles: roles.length ? roles : ['ClientContact'],
  };
}

export async function verifyEntraAccessToken(
  token: string,
  cfg: AppConfig,
): Promise<JWTPayload> {
  const tenantId = cfg.entraTenantId;
  const audience = cfg.entraAudience;
  if (!tenantId || !audience) {
    const err = new Error(
      'Plaid auth misconfigured: set PLAID_ENTRA_TENANT_ID and PLAID_ENTRA_AUDIENCE',
    );
    (err as Error & { status: number; code?: string }).status = 503;
    (err as Error & { code?: string }).code = 'auth_misconfigured';
    throw err;
  }
  const issuerCandidates = [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
  ];
  const jwksUrls = [
    `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    `https://login.microsoftonline.com/${tenantId}/discovery/keys`,
  ];
  let lastErr: unknown;
  for (const jwksUrl of jwksUrls) {
    for (const issuer of issuerCandidates) {
      try {
        const { payload } = await jwtVerify(token, jwksForUrl(jwksUrl), {
          audience,
          issuer,
        });
        return payload;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  const err = new Error('Unauthorized: invalid Bearer token');
  (err as Error & { status: number; cause?: unknown }).status = 401;
  (err as Error & { cause?: unknown }).cause = lastErr;
  throw err;
}

/**
 * Resolve caller principal.
 * requireAuth=true → verified Entra JWT only (headers ignored).
 * requireAuth=false → insecure-dev principal.
 */
export async function requireVerifiedPrincipal(
  headers: Headers,
  cfg: AppConfig,
): Promise<AtlasPrincipal> {
  if (!cfg.requireAuth) {
    return (
      parsePrincipal(headers) || {
        userId: 'dev-user',
        organizationId: 'org-hvcg',
        allowedClientIds: ['*'],
        roles: ['Admin'],
      }
    );
  }
  const token = bearerToken(headers);
  if (!token) {
    const err = new Error('Unauthorized: Bearer token required');
    (err as Error & { status: number; code?: string }).status = 401;
    (err as Error & { code?: string }).code = 'missing_bearer';
    throw err;
  }
  const payload = await verifyEntraAccessToken(token, cfg);
  return principalFromVerifiedPayload(payload);
}
