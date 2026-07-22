/**
 * Auth + tenant isolation middleware.
 * Production (INTEGRATION_REQUIRE_AUTH=true): require a validated Entra JWT
 * (Authorization: Bearer). Client-supplied x-atlas-* headers may carry org/client
 * scope AFTER identity is proven — they are never authentication by themselves.
 * Dev (requireAuth=false): optional headers / anonymous admin principal for local work.
 */

import type { IncomingMessage } from 'node:http';
import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader, type JWTPayload } from 'jose';
import type { AppConfig } from '../config.ts';

export interface AtlasPrincipal {
  userId: string;
  email?: string;
  organizationId: string;
  allowedClientIds: string[];
  roles: string[];
}

type AuthFailure = Error & { status: number; code?: string };

function unauthorized(message: string, code = 'unauthorized'): never {
  const err = new Error(message) as AuthFailure;
  err.status = 401;
  err.code = code;
  throw err;
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

function jwksCandidates(tenantId: string) {
  return [
    // Entra ID token / v2 access tokens
    `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    // Azure AD v1 access tokens (e.g. Graph from some clients)
    `https://login.microsoftonline.com/${tenantId}/discovery/keys`,
  ].map(jwksForUrl);
}

function bearerToken(headers: Headers): string | null {
  const raw = headers.get('authorization') || headers.get('Authorization');
  if (!raw) return null;
  const m = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return m?.[1] || null;
}

function scopeFromHeaders(headers: Headers): {
  organizationId: string;
  allowedClientIds: string[];
  roles: string[];
  emailHint?: string;
} {
  const clients = headers.get('x-atlas-client-ids');
  return {
    organizationId: headers.get('x-atlas-organization-id') || 'org-hvcg',
    allowedClientIds: clients
      ? clients.split(',').map((s) => s.trim()).filter(Boolean)
      : ['*'],
    roles: (headers.get('x-atlas-roles') || 'Staff').split(',').map((s) => s.trim()).filter(Boolean),
    emailHint: headers.get('x-atlas-user-email') || undefined,
  };
}

/**
 * Header-only principal (dev / tests). Never used when requireAuth is true.
 */
export function parsePrincipal(headers: Headers): AtlasPrincipal | null {
  const userId = headers.get('x-atlas-user-id');
  const clients = headers.get('x-atlas-client-ids');
  if (!userId || !clients) return null;
  return {
    userId,
    email: headers.get('x-atlas-user-email') || undefined,
    organizationId: headers.get('x-atlas-organization-id') || 'org-hvcg',
    allowedClientIds: clients.split(',').map((s) => s.trim()).filter(Boolean),
    roles: (headers.get('x-atlas-roles') || 'ClientContact').split(','),
  };
}

export function assertClientAccess(principal: AtlasPrincipal, clientId: string): void {
  if (principal.allowedClientIds.includes('*')) return;
  if (!principal.allowedClientIds.includes(clientId)) {
    const err = new Error('Access denied: client not in principal scope') as AuthFailure;
    err.status = 403;
    throw err;
  }
}

export function headersFromIncoming(raw: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') headers.set(k, v);
    else if (Array.isArray(v) && v[0]) headers.set(k, v[0]);
  }
  return headers;
}

function claimString(payload: JWTPayload, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const v = payload[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

async function validateEntraJwt(token: string, cfg: AppConfig): Promise<JWTPayload> {
  const tenantId = cfg.microsoft.tenantId;
  if (!tenantId || tenantId === 'common') {
    unauthorized('Entra tenant not configured for JWT validation', 'tenant_unconfigured');
  }
  const audiences = cfg.acceptedAudiences;
  if (!audiences.length) {
    unauthorized('No accepted JWT audiences configured', 'audience_unconfigured');
  }

  // Microsoft Graph access tokens often include a JWT header `nonce` and are not
  // validatable by third-party APIs. Hub auth requires an Entra ID token (aud=SPA)
  // or an access token issued for an accepted hub/SPA audience.
  try {
    const header = decodeProtectedHeader(token);
    if (header.nonce) {
      unauthorized(
        'Microsoft Graph access tokens cannot authenticate the hub; sign in and send an Entra ID token',
        'graph_nonce_token',
      );
    }
  } catch {
    unauthorized('Malformed Microsoft token', 'malformed_token');
  }

  const issuers = [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
    `https://login.microsoftonline.com/${tenantId}/`,
  ];

  let payload: JWTPayload | undefined;
  let lastError: unknown;
  for (const jwks of jwksCandidates(tenantId)) {
    try {
      const result = await jwtVerify(token, jwks, {
        audience: audiences,
        issuer: issuers,
        clockTolerance: 60,
      });
      payload = result.payload;
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!payload) {
    void lastError;
    unauthorized('Invalid or expired Microsoft token', 'invalid_token');
  }

  const tid = claimString(payload, 'tid');
  if (tid && tid.toLowerCase() !== tenantId.toLowerCase()) {
    unauthorized('Token tenant mismatch', 'tenant_mismatch');
  }

  return payload;
}

function principalFromJwt(payload: JWTPayload, headers: Headers): AtlasPrincipal {
  const userId = claimString(payload, 'oid', 'sub');
  if (!userId) unauthorized('Token missing subject', 'missing_subject');
  const scope = scopeFromHeaders(headers);
  const email =
    claimString(payload, 'preferred_username', 'email', 'upn', 'unique_name') || scope.emailHint;
  return {
    userId,
    email,
    organizationId: scope.organizationId,
    allowedClientIds: scope.allowedClientIds,
    roles: scope.roles,
  };
}

/**
 * Resolve the caller principal.
 * - requireAuth=false: header principal or local admin bypass
 * - requireAuth=true: Entra Bearer JWT required; x-atlas-* used only for scope
 */
export async function requirePrincipal(
  req: IncomingMessage,
  cfg: AppConfig,
): Promise<AtlasPrincipal> {
  const headers = headersFromIncoming(req.headers);

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
    unauthorized('Microsoft sign-in required (Bearer token missing)', 'missing_bearer');
  }

  const payload = await validateEntraJwt(token, cfg);
  return principalFromJwt(payload, headers);
}
