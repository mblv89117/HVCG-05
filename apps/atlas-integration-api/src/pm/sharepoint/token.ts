/**
 * Production PM Graph token via the Azure App Service managed-identity local token endpoint.
 *
 * Platform contract (App Service / Functions):
 * - IDENTITY_ENDPOINT — local token-service URL injected by the runtime
 * - IDENTITY_HEADER — rotating platform secret, sent only as X-IDENTITY-HEADER
 * - GET api-version=2019-08-01&resource=https://graph.microsoft.com&client_id=<UAMI>
 *
 * This is not VM IMDS (169.254.169.254 + Metadata: true).
 * There is no Azure CLI, DefaultAzureCredential, Hub client-secret, or connector fallback.
 * Tests inject env/fetch; they never call the live token service.
 */

import { PmHttpError, pmInfrastructureError } from './errors.ts';
import { isGuid } from './ids.ts';

export interface PmGraphTokenProvider {
  getToken(): Promise<string>;
}

export const APP_SERVICE_MSI_API_VERSION = '2019-08-01';
export const GRAPH_TOKEN_RESOURCE = 'https://graph.microsoft.com';

const VM_IMDS_HOST = '169.254.169.254';
const TOKEN_TIMEOUT_MS = 5_000;
const TOKEN_REFRESH_SKEW_MS = 60_000;

export interface ManagedIdentityTokenProviderDeps {
  env?: NodeJS.Dict<string | undefined>;
  fetch?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
  /** Token resource URI. Defaults to Microsoft Graph. Hub→BA uses the BA Application ID URI. */
  resource?: string;
}

function acquisitionFailed(): never {
  throw pmInfrastructureError(
    'PM_TOKEN_ACQUISITION_FAILED',
    'Managed identity token acquisition failed.',
  );
}

function isLoopbackHost(host: string): boolean {
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function isLinkLocalIPv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const oct = parts.map((p) => Number(p));
  if (oct.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return oct[0] === 169 && oct[1] === 254;
}

function parseIdentityEndpoint(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:') return null;
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (host === VM_IMDS_HOST) return null;
  if (!isLoopbackHost(host) && !isLinkLocalIPv4(host)) return null;
  if (!/^\/msi\/token\/?$/i.test(url.pathname)) return null;
  return url;
}

function parseExpiresOn(value: unknown, nowMs: number): number | null {
  let seconds: number | null = null;
  if (typeof value === 'number' && Number.isFinite(value)) seconds = value;
  else if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) seconds = n;
  }
  if (seconds == null) return null;
  const ms = seconds > 1e12 ? seconds : seconds * 1000;
  return ms > nowMs ? ms : null;
}

export function createManagedIdentityTokenProvider(
  clientId: string,
  deps: ManagedIdentityTokenProviderDeps = {},
): PmGraphTokenProvider {
  const id = clientId.trim();
  let cached: { token: string; expiresAtMs: number } | null = null;

  return {
    async getToken() {
      if (!isGuid(id)) acquisitionFailed();

      const now = deps.now ? deps.now() : Date.now();
      if (cached && cached.expiresAtMs - TOKEN_REFRESH_SKEW_MS > now) {
        return cached.token;
      }

      const env = deps.env ?? process.env;
      const endpointRaw = typeof env.IDENTITY_ENDPOINT === 'string' ? env.IDENTITY_ENDPOINT.trim() : '';
      const identityHeader = typeof env.IDENTITY_HEADER === 'string' ? env.IDENTITY_HEADER.trim() : '';
      if (!endpointRaw || !identityHeader) acquisitionFailed();

      const endpoint = parseIdentityEndpoint(endpointRaw);
      if (!endpoint) acquisitionFailed();

      const resource = (deps.resource || GRAPH_TOKEN_RESOURCE).trim();
      if (!resource) acquisitionFailed();

      endpoint.searchParams.set('api-version', APP_SERVICE_MSI_API_VERSION);
      endpoint.searchParams.set('resource', resource);
      endpoint.searchParams.set('client_id', id);
      endpoint.searchParams.delete('principal_id');
      endpoint.searchParams.delete('object_id');
      endpoint.searchParams.delete('mi_res_id');

      const timeoutMs = deps.timeoutMs ?? TOKEN_TIMEOUT_MS;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const doFetch = deps.fetch ?? fetch;

      try {
        const resp = await doFetch(endpoint.toString(), {
          method: 'GET',
          headers: { 'X-IDENTITY-HEADER': identityHeader },
          signal: controller.signal,
          redirect: 'manual',
        });

        if (resp.status >= 300 && resp.status < 400) acquisitionFailed();
        if (!resp.ok) acquisitionFailed();

        let json: unknown;
        try {
          json = await resp.json();
        } catch {
          acquisitionFailed();
        }
        if (!json || typeof json !== 'object' || Array.isArray(json)) acquisitionFailed();
        const rec = json as Record<string, unknown>;
        if (typeof rec.access_token !== 'string' || !rec.access_token) acquisitionFailed();
        const expiresAtMs = parseExpiresOn(rec.expires_on, now);
        if (expiresAtMs == null) acquisitionFailed();

        cached = { token: rec.access_token, expiresAtMs };
        return rec.access_token;
      } catch (err) {
        if (err instanceof PmHttpError) throw err;
        acquisitionFailed();
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
