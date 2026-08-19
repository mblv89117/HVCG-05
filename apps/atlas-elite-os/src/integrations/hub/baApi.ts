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

export type FreeFitAssessment = {
  assessmentId: string;
  leadId: string;
  completedAt?: string;
  qualificationResult?: string;
  recommendedDiagnostic?: string | null;
  recommendedServiceDomain?: string | null;
  recommendedServiceLineCode?: string | null;
  recommendedOffer?: string | null;
  recommendedCommercialClass?: string | null;
  atlasRecommendation?: Record<string, unknown>;
  ownerDecision?: string | null;
  ownerDecisionStatus?: string;
  nextAction?: string;
  engineNextAction?: string;
  contractedEconomicsCreated?: boolean;
  proposalSent?: boolean;
  convertedToClient?: boolean;
  answers?: Record<string, unknown>;
};

export type FreeFitDefinition = {
  needOptions?: Array<{ need: string; diagnostic?: string; offerCode?: string; restricted?: boolean }>;
  urgencyOptions?: string[];
  revenueRangeOptions?: string[];
  ownerDecisions?: string[];
  commercialClasses?: string[];
  purpose?: string;
  is?: string[];
  isNot?: string[];
  name?: string;
};

export async function baFreeFitDefinition(auth: AtlasHubAuthHeaders) {
  return hubFetchJson(auth, '/api/ba/freefit/definition', {
    method: 'POST',
    body: '{}',
    skipAuth: import.meta.env.DEV,
  });
}

export async function baFreeFitByLead(auth: AtlasHubAuthHeaders, leadId: string) {
  return hubFetchJson(auth, '/api/ba/freefit/by-lead', {
    method: 'POST',
    body: JSON.stringify({ leadId }),
    skipAuth: import.meta.env.DEV,
  });
}

export async function baFreeFitComplete(
  auth: AtlasHubAuthHeaders,
  body: {
    leadId: string;
    needType: string;
    revenueRange?: string;
    capitalGoal?: string;
    urgency?: string;
    primaryIssue?: string;
  },
) {
  return hubFetchJson(auth, '/api/ba/freefit/complete', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: import.meta.env.DEV,
  });
}

export async function baFreeFitOwnerDecision(
  auth: AtlasHubAuthHeaders,
  body: {
    assessmentId: string;
    decision: string;
    alternateCommercialClass?: string;
    notes?: string;
  },
) {
  return hubFetchJson(auth, '/api/ba/freefit/owner-decision', {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuth: import.meta.env.DEV,
  });
}

export type { HubHttpError };
