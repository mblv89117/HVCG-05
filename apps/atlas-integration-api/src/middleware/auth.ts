/**
 * Auth + tenant isolation middleware.
 *
 * When requireAuth is true (the default): Entra Hub API Bearer token is the
 * trust anchor. Roles come from verified JWT claims. Staff client scope comes
 * from server-side Entra HVCG-Client-* group membership for the verified oid.
 * Client-controlled x-atlas-* headers have zero authorization effect.
 *
 * When requireAuth is false: only explicit loopback insecure-development mode
 * (validated in config) may use a local principal. That mode is never the default.
 */

import type { IncomingMessage } from 'node:http';
import { createRemoteJWKSet, jwtVerify, decodeProtectedHeader, type JWTPayload } from 'jose';
import type { AppConfig } from '../config.ts';
import { isCanonicalClientCode } from '../entitlements/clientCode.ts';
import { resolveAllowedClientIdsFromConfig } from '../entitlements/resolver.ts';

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

function forbidden(message: string, code = 'forbidden'): never {
  const err = new Error(message) as AuthFailure;
  err.status = 403;
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
    `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
    `https://login.microsoftonline.com/${tenantId}/discovery/keys`,
  ].map(jwksForUrl);
}

function bearerToken(headers: Headers): string | null {
  const raw = headers.get('authorization') || headers.get('Authorization');
  if (!raw) return null;
  const m = /^Bearer\s+(\S+)/i.exec(raw.trim());
  return m?.[1] || null;
}

/**
 * Canonical Hub roles accepted from verified token claims.
 * Administrator is distinct from HVCG Owner.
 * Unknown values are ignored (not elevated).
 */
export const HUB_ROLE_ALIASES: Record<string, string> = {
  administrator: 'Administrator',
  admin: 'Administrator',
  'atlas administrator': 'Administrator',
  atlas_administrator: 'Administrator',
  'hvcg owner': 'HVCG Owner',
  owner: 'HVCG Owner',
  hvcg_owner: 'HVCG Owner',
  'hvcg team member': 'HVCG Team Member',
  'team member': 'HVCG Team Member',
  hvcg_team_member: 'HVCG Team Member',
  'client executive': 'Client Executive',
  client_executive: 'Client Executive',
  'client team member': 'Client Team Member',
  client_team_member: 'Client Team Member',
  'read-only advisor': 'Read-Only Advisor',
  read_only_advisor: 'Read-Only Advisor',
  advisor: 'Read-Only Advisor',
  staff: 'Staff',
};

export function normalizeHubRole(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (!key) return null;
  if (HUB_ROLE_ALIASES[key]) return HUB_ROLE_ALIASES[key];
  const known = new Set(Object.values(HUB_ROLE_ALIASES));
  const exact = [...known].find((r) => r.toLowerCase() === key);
  return exact || null;
}

export function isHubAdministrator(principal: AtlasPrincipal): boolean {
  return principal.roles.includes('Administrator');
}

export function assertAdministrator(principal: AtlasPrincipal): void {
  if (!isHubAdministrator(principal)) {
    forbidden('Administrator role required', 'forbidden');
  }
}

/**
 * Header-only principal for explicit insecure development mode.
 * Never used when requireAuth is true.
 */
export function parsePrincipal(headers: Headers): AtlasPrincipal | null {
  const userId = headers.get('x-atlas-user-id');
  const clients = headers.get('x-atlas-client-ids');
  if (!userId || !clients) return null;
  const roles = (headers.get('x-atlas-roles') || '')
    .split(',')
    .map((s) => normalizeHubRole(s))
    .filter((r): r is string => Boolean(r));
  return {
    userId,
    email: headers.get('x-atlas-user-email') || undefined,
    organizationId: headers.get('x-atlas-organization-id') || 'org-hvcg',
    allowedClientIds: clients.split(',').map((s) => s.trim()).filter(Boolean),
    roles,
  };
}

export const INSECURE_DEV_PRINCIPAL: AtlasPrincipal = {
  userId: 'dev-user',
  organizationId: 'org-hvcg',
  allowedClientIds: ['*'],
  roles: ['Administrator'],
};

export function assertClientAccess(principal: AtlasPrincipal, clientId: string): void {
  if (principal.allowedClientIds.includes('*')) return;
  if (!isCanonicalClientCode(clientId) || clientId === '*') {
    forbidden('Access denied: client not in principal scope', 'forbidden');
  }
  if (!principal.allowedClientIds.includes(clientId)) {
    forbidden('Access denied: client not in principal scope', 'forbidden');
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

function collectClaimValues(payload: JWTPayload, ...keys: string[]): unknown[] {
  const out: unknown[] = [];
  for (const key of keys) {
    const v = payload[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) out.push(...v);
    else out.push(v);
  }
  return out;
}

/** Roles from verified token claims only. Unknown values ignored. Never defaults to Admin/Owner. */
export function rolesFromVerifiedPayload(payload: JWTPayload): string[] {
  const raw = collectClaimValues(payload, 'roles', 'extension_AtlasRole', 'atlas_role');
  const roles = new Set<string>();
  for (const item of raw) {
    const n = normalizeHubRole(typeof item === 'string' ? item : String(item));
    if (n) roles.add(n);
  }
  return [...roles];
}

/**
 * Legacy JWT client-claim parser. Not an authorization path.
 * Production staff client scope is server-resolved Entra group membership.
 * Wildcard '*' is never accepted.
 */
export function clientIdsFromVerifiedPayload(payload: JWTPayload): string[] {
  const raw = collectClaimValues(
    payload,
    'extension_AtlasClientIds',
    'atlas_client_ids',
    'client_ids',
  );
  const ids = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    for (const part of item.split(',')) {
      const id = part.trim();
      if (id && id !== '*') ids.add(id);
    }
  }
  return [...ids];
}

export function principalFromVerifiedPayload(payload: JWTPayload): AtlasPrincipal {
  const userId = claimString(payload, 'oid', 'sub');
  if (!userId) unauthorized('Token missing subject', 'missing_subject');
  return {
    userId,
    email: claimString(payload, 'preferred_username', 'email', 'upn', 'unique_name'),
    organizationId: 'org-hvcg',
    allowedClientIds: [],
    roles: rolesFromVerifiedPayload(payload),
  };
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

  try {
    const header = decodeProtectedHeader(token);
    if (header.nonce) {
      unauthorized(
        'Microsoft Graph access tokens cannot authenticate the hub; request a Hub API access token',
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

  assertRequiredScope(payload, cfg);

  return payload;
}

function assertRequiredScope(payload: JWTPayload, cfg: AppConfig): void {
  const required = cfg.requiredScope;
  if (!required) return;
  if (tokenHasRequiredHubScope(payload, required)) return;
  unauthorized(`Missing required API scope (${required})`, 'missing_scope');
}

/**
 * Hub API audience is already verified before this runs.
 * Graph nonce tokens are rejected earlier.
 * Azure CLI `az account get-access-token --resource api://{hub-app-id}` tokens
 * carry `scp=access_as_user` when consented; some resource tokens omit scp
 * but still have oid after Hub-audience verification.
 */
export function tokenHasRequiredHubScope(payload: JWTPayload, required: string): boolean {
  if (!required) return true;
  const scp = claimString(payload, 'scp', 'scope') || '';
  const scopes = scp.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  if (scopes.some((s) => s === required || s.endsWith(`/${required}`))) return true;
  const roleValues = collectClaimValues(payload, 'roles').map((v) => String(v).trim());
  if (roleValues.some((s) => s === required || s.endsWith(`/${required}`))) return true;
  if (!scopes.length && claimString(payload, 'oid', 'sub')) return true;
  return false;
}

/**
 * Resolve the caller principal.
 * - requireAuth=true: verified Entra Hub API access token; headers never authorize
 * - requireAuth=false: explicit insecure-dev loopback principal only
 */
export async function requirePrincipal(
  req: IncomingMessage,
  cfg: AppConfig,
): Promise<AtlasPrincipal> {
  const headers = headersFromIncoming(req.headers);

  if (!cfg.requireAuth) {
    if (!cfg.insecureDevAuth) {
      unauthorized('Microsoft sign-in required (Bearer token missing)', 'missing_bearer');
    }
    return parsePrincipal(headers) || { ...INSECURE_DEV_PRINCIPAL };
  }

  const token = bearerToken(headers);
  if (!token) {
    unauthorized('Microsoft sign-in required (Bearer token missing)', 'missing_bearer');
  }

  const payload = cfg.verifyAccessToken
    ? ((await cfg.verifyAccessToken(token)) as JWTPayload)
    : await validateEntraJwt(token, cfg);
  const principal = principalFromVerifiedPayload(payload);
  const oid = claimString(payload, 'oid');
  principal.allowedClientIds = await resolveAllowedClientIdsFromConfig(oid, cfg);
  return principal;
}
