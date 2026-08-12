/**
 * Elite client for BA routes via Integration Hub (Phase 0 binding).
 * Fixture fallback only when Hub/BA unavailable — callers should prefer live Hub.
 */
import { hubFetchJson, type HubHttpError } from './hubFetch';
import type { AtlasHubAuthHeaders } from './api';

export async function baHealth(auth: AtlasHubAuthHeaders) {
  return hubFetchJson(auth, '/api/ba/health');
}

export async function baDocumentAccess(
  auth: AtlasHubAuthHeaders,
  body: { clientId: string; document: Record<string, unknown>; isClientPortalUser?: boolean },
) {
  return hubFetchJson(auth, '/api/ba/documents/access', { method: 'POST', body: JSON.stringify(body) });
}

export async function baOwnerSupportAccess(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  return hubFetchJson(auth, '/api/ba/owner-support/access', { method: 'POST', body: JSON.stringify(body) });
}

export async function baOrchestrate(auth: AtlasHubAuthHeaders, body: Record<string, unknown>) {
  return hubFetchJson(auth, '/api/ba/ai/orchestrate', { method: 'POST', body: JSON.stringify(body) });
}

export async function baExecutiveIntelligence(auth: AtlasHubAuthHeaders, body: Record<string, unknown>) {
  return hubFetchJson(auth, '/api/ba/executive/intelligence', { method: 'POST', body: JSON.stringify(body) });
}

export type { HubHttpError };
