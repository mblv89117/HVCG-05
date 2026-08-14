/**
 * Elite client for BA routes via Integration Hub (Phase 0 binding).
 * Fixture fallback only when Hub/BA unavailable — callers should prefer live Hub.
 */
import { hubFetchJson, type HubHttpError } from './hubFetch';
import type { AtlasHubAuthHeaders } from './api';

export async function baHealth(auth: AtlasHubAuthHeaders, correlationId?: string) {
  return hubFetchJson(auth, '/api/ba/health', {
    headers: correlationId ? { 'x-correlation-id': correlationId } : undefined,
  });
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

export type DevLead = {
  LeadId: string;
  Title: string;
  ContactName?: string | null;
  Source?: string | null;
  LeadSourceDetail?: string | null;
  LeadStatus?: string;
  ServiceInterest?: string | null;
  BusinessNeed?: string | null;
  Notes?: string | null;
  NextAction?: string | null;
  LifecycleLabel?: string | null;
  ConversionBoundary?: string | null;
  IsClient360Client?: boolean;
  ContractedEconomicsCreated?: boolean;
};

export async function baLeadCreate(auth: AtlasHubAuthHeaders, body: Record<string, unknown>) {
  // Dev UAT Hub often runs INTEGRATION_REQUIRE_AUTH=false — send x-atlas scope headers only.
  return hubFetchJson(auth, '/api/ba/leads/create', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: import.meta.env.DEV,
  });
}

export async function baLeadList(auth: AtlasHubAuthHeaders) {
  return hubFetchJson(auth, '/api/ba/leads/list', {
    method: 'POST',
    body: '{}',
    skipAuth: import.meta.env.DEV,
  });
}

export async function baLeadGet(auth: AtlasHubAuthHeaders, leadId: string) {
  return hubFetchJson(auth, '/api/ba/leads/get', {
    method: 'POST',
    body: JSON.stringify({ leadId }),
    skipAuth: import.meta.env.DEV,
  });
}

export async function baFreeFitDefinition(auth: AtlasHubAuthHeaders, includeRestricted = false) {
  return hubFetchJson(auth, '/api/ba/freefit/definition', {
    method: 'POST',
    body: JSON.stringify({ includeRestricted }),
    skipAuth: import.meta.env.DEV,
  });
}

export async function baFreeFitComplete(auth: AtlasHubAuthHeaders, body: Record<string, unknown>) {
  return hubFetchJson(auth, '/api/ba/freefit/complete', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: import.meta.env.DEV,
  });
}

export async function baFreeFitGet(auth: AtlasHubAuthHeaders, assessmentId: string) {
  return hubFetchJson(auth, '/api/ba/freefit/get', {
    method: 'POST',
    body: JSON.stringify({ assessmentId }),
    skipAuth: import.meta.env.DEV,
  });
}

export type { HubHttpError };
