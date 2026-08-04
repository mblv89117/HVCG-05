/**
 * Browser client for Atlas Universal Integration Hub API.
 * Sends MSAL Bearer when signed in. Never trusts atlas headers alone on the server.
 * Snapshot/sample fallback is offline/demo only — disabled in Production.
 */

import { microsoftConfig } from '../../microsoft/config';

export interface AtlasHubAuthHeaders {
  userId: string;
  organizationId: string;
  clientIds: string[];
  email?: string;
  roles?: string[];
  /** Entra ID token or Graph access token for hub Authorization header */
  accessToken?: string;
}

export type HubProviderId = 'microsoft' | 'google' | 'github';

export type BusinessEntityId = 'HVS' | 'HVCG' | 'legacy' | 'unknown' | string;

export type MailboxType = 'user' | 'shared' | 'alias' | 'group' | 'archive' | 'n/a' | string;

export interface ConnectOptions {
  permissionMode?: string;
  scopes?: string[];
  businessEntity?: BusinessEntityId;
  accountLabel?: string;
  mailboxType?: MailboxType;
}

function headers(auth: AtlasHubAuthHeaders): HeadersInit {
  const h: Record<string, string> = {
    'content-type': 'application/json',
    'x-atlas-user-id': auth.userId,
    'x-atlas-organization-id': auth.organizationId,
    'x-atlas-client-ids': auth.clientIds.join(','),
    ...(auth.email ? { 'x-atlas-user-email': auth.email } : {}),
    'x-atlas-roles': (auth.roles || ['Staff']).join(','),
  };
  if (auth.accessToken) {
    h.Authorization = `Bearer ${auth.accessToken}`;
  }
  return h;
}

const base = () =>
  (import.meta as ImportMeta & { env?: { VITE_INTEGRATION_API_BASE?: string } }).env
    ?.VITE_INTEGRATION_API_BASE || 'http://127.0.0.1:8790';

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as { message?: string }).message ||
        (data as { error?: string }).error ||
        res.statusText,
    );
    (err as Error & { status: number; body: unknown }).status = res.status;
    (err as Error & { body: unknown }).body = data;
    throw err;
  }
  return data;
}

export async function fetchHealth() {
  const res = await fetch(`${base()}/health`);
  return parse(res) as Promise<{
    ok: boolean;
    providers?: Record<string, boolean>;
  }>;
}

export async function fetchRegistry(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/integrations/registry`, { headers: headers(auth) });
  return parse(res) as Promise<{
    providers: Array<{
      providerId: HubProviderId;
      providerName: string;
      adapterVersion: string;
      authenticationType: string[];
      availableActions: string[];
      unsupportedActions: string[];
      requiredPermissions: string[];
      optionalPermissions: string[];
      webhookSupport: boolean;
      deltaSyncSupport: boolean;
      deploymentStatus: string;
      defaultPermissionMode: string;
      documentationLink: string;
    }>;
  }>;
}

export async function fetchSourceOfTruth(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/integrations/source-of-truth`, {
    headers: headers(auth),
  });
  return parse(res);
}

export async function fetchConnections(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/connections`, { headers: headers(auth) });
  return parse(res) as Promise<{ connections: ConnectionSummary[] }>;
}

export interface ConnectionSummary {
  id: string;
  providerId: HubProviderId;
  providerName: string;
  businessEntity?: BusinessEntityId;
  accountName: string;
  accountEmail?: string;
  accountDisplayName?: string;
  tenantOrOrg?: string;
  domain?: string;
  mailboxType?: MailboxType;
  ownerUserId: string;
  authType: string;
  permissionMode: string;
  scopes: string[];
  status: string;
  environment: string;
  connectedAt: string;
  lastTokenRefreshAt?: string;
  lastSuccessfulSyncAt?: string;
  nextScheduledSyncAt?: string;
  discoveryCompletedAt?: string;
  recordsDiscovered?: number;
  recordsImported?: number;
  errorState?: string;
  requiresReauthorization: boolean;
  autoSyncEnabled: boolean;
  resourceSelections: Array<{
    resourceType: string;
    resourceId: string;
    displayName: string;
    path?: string;
    selected: boolean;
  }>;
}

export interface InventoryConnectionRow {
  id: string;
  businessEntity?: BusinessEntityId;
  provider: HubProviderId;
  accountEmail?: string;
  accountDisplayName?: string;
  tenantOrOrg?: string;
  domain?: string;
  mailboxType?: MailboxType;
  ownerUserId: string;
  authType: string;
  scopes: string[];
  status: string;
  lastSuccessfulSyncAt?: string;
  recordsDiscovered?: number;
  recordsImported?: number;
  errors?: string;
  requiresReauthorization: boolean;
  discoveryCompletedAt?: string;
}

export interface InventoryResponse {
  connections: InventoryConnectionRow[];
  discoveredByConnection: Record<string, unknown[]>;
  client360: unknown[];
  summary: Record<string, unknown>;
}

export interface DiscoveredResourceResponse {
  resources: Array<{
    connectionId: string;
    resourceType: string;
    resourceId: string;
    displayName: string;
    path?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export async function fetchConnectionHealth(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(`${base()}/api/connections/${encodeURIComponent(connectionId)}/health`, {
    headers: headers(auth),
  });
  return parse(res);
}

export async function startConnect(
  auth: AtlasHubAuthHeaders,
  provider: HubProviderId,
  body?: ConnectOptions,
) {
  const payload: Record<string, unknown> = {
    permissionMode: body?.permissionMode || 'read_only_discovery',
    scopes: body?.scopes,
    businessEntity: body?.businessEntity,
    accountLabel: body?.accountLabel,
    mailboxType: body?.mailboxType,
  };
  const res = await fetch(`${base()}/api/connections/${provider}/connect`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(payload),
  });
  return parse(res) as Promise<{
    authorizationUrl?: string;
    state?: string;
    connectionId?: string;
    connection?: ConnectionSummary;
    message?: string;
  }>;
}

export async function fetchInventory(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/inventory`, { headers: headers(auth) });
  return parse(res) as Promise<InventoryResponse>;
}

export async function discoverConnection(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(
    `${base()}/api/connections/${encodeURIComponent(connectionId)}/discover`,
    { method: 'POST', headers: headers(auth) },
  );
  return parse(res) as Promise<{ resources: unknown[]; count: number }>;
}

export async function syncAll(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/sync/all`, {
    method: 'POST',
    headers: headers(auth),
  });
  return parse(res) as Promise<{ jobs: unknown[] }>;
}

export async function rebuildClient360(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/client360/rebuild`, {
    method: 'POST',
    headers: headers(auth),
  });
  return parse(res) as Promise<{ candidates: Client360Candidate[]; dashboard?: ExecutiveDashboard }>;
}

export interface Client360Candidate {
  id: string;
  displayName: string;
  legalName?: string;
  lifecycle?: string;
  emails?: string[];
  domains?: string[];
  phones?: string[];
  completenessScore?: number;
  recommendedNextActions?: string[];
  businessEntities?: string[];
  timeline?: Array<{
    at: string;
    kind: string;
    title: string;
    sourceRecordId: string;
    connectionId: string;
  }>;
  sourceRefs?: Array<{
    connectionId: string;
    sourceRecordId: string;
    kind: string;
    title: string;
    businessEntity?: string;
    occurredAt?: string;
  }>;
  associations?: {
    emails?: string[];
    documents?: string[];
    meetings?: string[];
    conversations?: string[];
    attachments?: string[];
  };
}

type Client360Snapshot = {
  generatedAt?: string;
  clients?: Array<
    Client360Candidate & {
      documentCount?: number;
      documents?: Client360Document[];
    }
  >;
};

let snapshotCache: Client360Snapshot | null | undefined;

/** Explicit offline/demo only. Never true in Production SWA builds. */
function sampleFallbackAllowed(): boolean {
  if (microsoftConfig.environment === 'production' || microsoftConfig.environment === 'staging') {
    return false;
  }
  return microsoftConfig.allowSampleFallback === true;
}

async function loadClient360Snapshot(): Promise<Client360Snapshot | null> {
  if (!sampleFallbackAllowed()) return null;
  if (snapshotCache !== undefined) return snapshotCache;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}client360-snapshot.json`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      snapshotCache = null;
      return null;
    }
    snapshotCache = (await res.json()) as Client360Snapshot;
    return snapshotCache;
  } catch {
    snapshotCache = null;
    return null;
  }
}

function isHubUnreachable(err: unknown): boolean {
  const msg = String((err as Error)?.message || err || '');
  return /failed to fetch|networkerror|load failed|mixed content|err_connection|econnrefused/i.test(msg);
}

function isAuthDenied(err: unknown): boolean {
  const status = (err as Error & { status?: number })?.status;
  if (status === 401 || status === 403) return true;
  const msg = String((err as Error)?.message || err || '');
  return /unauthorized|microsoft sign-in required|forbidden|bearer token/i.test(msg);
}

function signInRequiredError(): Error & { status: number } {
  return Object.assign(new Error('Sign in required for live Client 360'), { status: 401 });
}

async function snapshotClientsFallback(): Promise<{
  clients: Client360Candidate[];
  source: 'snapshot';
  snapshotGeneratedAt?: string;
} | null> {
  if (!sampleFallbackAllowed()) return null;
  const snap = await loadClient360Snapshot();
  if (!snap?.clients?.length) return null;
  return {
    clients: snap.clients.map(({ documents: _docs, documentCount: _n, ...c }) => c),
    source: 'snapshot' as const,
    snapshotGeneratedAt: snap.generatedAt,
  };
}

export async function fetchClient360(auth: AtlasHubAuthHeaders) {
  if (!auth.accessToken) {
    // Auth denial must never unlock snapshot client data.
    if (!sampleFallbackAllowed()) throw signInRequiredError();
    const snap = await snapshotClientsFallback();
    if (snap) return snap;
    throw signInRequiredError();
  }
  try {
    const res = await fetch(`${base()}/api/client360`, { headers: headers(auth) });
    const data = (await parse(res)) as { candidates?: Client360Candidate[]; clients?: Client360Candidate[] };
    return { clients: data.clients || data.candidates || [], source: 'hub' as const };
  } catch (err) {
    // 401/403 = sign-in problem, never treat as permission to show fallback clients.
    if (isAuthDenied(err)) throw err;
    if (!isHubUnreachable(err)) throw err;
    const snap = await snapshotClientsFallback();
    if (!snap) throw err;
    return snap;
  }
}

export async function fetchClient360Detail(auth: AtlasHubAuthHeaders, clientId: string) {
  if (!auth.accessToken) {
    if (!sampleFallbackAllowed()) throw signInRequiredError();
    const snap = await loadClient360Snapshot();
    const client = snap?.clients?.find((c) => c.id === clientId);
    if (!client) throw signInRequiredError();
    const { documents: _docs, documentCount: _n, ...rest } = client;
    return { client: rest };
  }
  try {
    const res = await fetch(`${base()}/api/client360/${encodeURIComponent(clientId)}`, {
      headers: headers(auth),
    });
    return parse(res) as Promise<{ client: Client360Candidate }>;
  } catch (err) {
    if (isAuthDenied(err)) throw err;
    if (!isHubUnreachable(err)) throw err;
    const snap = await loadClient360Snapshot();
    const client = snap?.clients?.find((c) => c.id === clientId);
    if (!client) throw err;
    const { documents: _docs, documentCount: _n, ...rest } = client;
    return { client: rest };
  }
}

export interface Client360Document {
  id: string;
  title: string;
  kind: string;
  webUrl?: string;
  path?: string;
  classification?: string;
  sensitivityRestricted?: boolean;
  sensitivityReasons?: string[];
  sourceTenant?: string;
  sourceAccount?: string;
  sourceRecordId?: string;
  migrationStatus?: string;
  modifiedAt?: string;
  searchVisible?: boolean;
}

export async function fetchClient360Documents(auth: AtlasHubAuthHeaders, clientId: string) {
  if (!auth.accessToken) {
    if (!sampleFallbackAllowed()) throw signInRequiredError();
    const snap = await loadClient360Snapshot();
    const client = snap?.clients?.find((c) => c.id === clientId);
    if (!client) throw signInRequiredError();
    const documents = client.documents || [];
    return {
      clientId,
      displayName: client.displayName,
      count: client.documentCount ?? documents.length,
      restrictedOmitted: true,
      documents,
    };
  }
  try {
    const res = await fetch(
      `${base()}/api/client360/${encodeURIComponent(clientId)}/documents`,
      { headers: headers(auth) },
    );
    return parse(res) as Promise<{
      clientId: string;
      displayName: string;
      count: number;
      restrictedOmitted: boolean;
      documents: Client360Document[];
    }>;
  } catch (err) {
    if (isAuthDenied(err)) throw err;
    if (!isHubUnreachable(err)) throw err;
    const snap = await loadClient360Snapshot();
    const client = snap?.clients?.find((c) => c.id === clientId);
    if (!client) throw err;
    const documents = client.documents || [];
    return {
      clientId,
      displayName: client.displayName,
      count: client.documentCount ?? documents.length,
      restrictedOmitted: true,
      documents,
    };
  }
}

export async function fetchMigrationSummary(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/client360/migration/summary`, {
    headers: headers(auth),
  });
  return parse(res);
}

export interface ExecutiveDashboard {
  generatedAt: string;
  totalClientsDiscovered: number;
  activeClients: number;
  formerClients: number;
  prospects: number;
  documentsIndexed: number;
  emailsIndexed: number;
  attachmentsIndexed: number;
  meetingsIndexed: number;
  contactsIndexed: number;
  sourceRecordsIndexed: number;
  microsoftConnectionsSynced: number;
  averageCompletenessScore: number;
  completenessDistribution: { high: number; medium: number; low: number };
  duplicateCandidates: number;
  clientsNeedingReview: number;
  topIncompleteClients: Array<{
    id: string;
    displayName: string;
    completenessScore: number;
    missingInformation: string[];
  }>;
  byBusinessEntity: Record<string, number>;
}

export async function ingestMicrosoftClient360(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/client360/ingest-microsoft`, {
    method: 'POST',
    headers: headers(auth),
  });
  return parse(res) as Promise<{
    jobs: unknown[];
    candidates: unknown[];
    dashboard: ExecutiveDashboard;
    connectionIds: string[];
  }>;
}

export async function fetchExecutiveDashboard(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/client360/executive-dashboard`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ dashboard: ExecutiveDashboard }>;
}

export async function fetchDiscovered(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(
    `${base()}/api/connections/${encodeURIComponent(connectionId)}/discovered`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<DiscoveredResourceResponse>;
}

export async function disconnectConnection(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(`${base()}/api/connections/${encodeURIComponent(connectionId)}/disconnect`, {
    method: 'POST',
    headers: headers(auth),
  });
  return parse(res);
}

export async function verifyConnection(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(`${base()}/api/connections/${encodeURIComponent(connectionId)}/verify`, {
    method: 'POST',
    headers: headers(auth),
  });
  return parse(res);
}

export async function syncConnection(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(`${base()}/api/connections/${encodeURIComponent(connectionId)}/sync`, {
    method: 'POST',
    headers: headers(auth),
  });
  return parse(res);
}

export async function reauthorizeConnection(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(
    `${base()}/api/connections/${encodeURIComponent(connectionId)}/reauthorize`,
    { method: 'POST', headers: headers(auth) },
  );
  return parse(res) as Promise<{ authorizationUrl?: string; state?: string }>;
}

export async function searchConnection(
  auth: AtlasHubAuthHeaders,
  connectionId: string,
  query: string,
  resourceTypes?: string[],
) {
  const res = await fetch(`${base()}/api/connections/${encodeURIComponent(connectionId)}/search`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ query, resourceTypes }),
  });
  return parse(res);
}

export async function listResources(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(
    `${base()}/api/connections/${encodeURIComponent(connectionId)}/resources`,
    { headers: headers(auth) },
  );
  return parse(res);
}

export async function fetchSyncJobs(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(
    `${base()}/api/connections/${encodeURIComponent(connectionId)}/sync-jobs`,
    { headers: headers(auth) },
  );
  return parse(res);
}

export async function fetchErrors(auth: AtlasHubAuthHeaders, connectionId: string) {
  const res = await fetch(
    `${base()}/api/connections/${encodeURIComponent(connectionId)}/errors`,
    { headers: headers(auth) },
  );
  return parse(res);
}

export async function fetchAdminDashboard(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/admin/dashboard`, { headers: headers(auth) });
  return parse(res);
}

export async function fetchAudit(auth: AtlasHubAuthHeaders, limit = 50) {
  const res = await fetch(`${base()}/api/audit?limit=${limit}`, { headers: headers(auth) });
  return parse(res);
}

/* —— Local AI Operations (Phase 1 mock control plane) —— */

export interface LocalAiJob {
  aiJobId: string;
  sourceRecordType: string;
  sourceRecordId: string;
  requestedOperation: string;
  workValueTier: string;
  processingStatus: string;
  validationStatus: string;
  confidence: number | null;
  outputSummary: string | null;
  requiresMannyApproval: boolean;
  mannyDecision: string;
  retryCount: number;
  recommendedNextAction: string | null;
  auditCorrelationId: string;
  wroteAuthoritativeBusinessRecord: boolean;
  syntheticBanner: string;
}

export interface LocalAiCommandCenter {
  generatedAt: string;
  featureFlags: Record<string, boolean>;
  evaIntakeEnabled: boolean;
  evaSubmissionsAwaitingReview: unknown[];
  aiDraftsAwaitingApproval: LocalAiJob[];
  highValueClientDecisions: LocalAiJob[];
  capitalDecisions: LocalAiJob[];
  pricingAndScopeApprovals: LocalAiJob[];
  externalCommunicationsAwaitingApproval: LocalAiJob[];
  majorRisksAndBlockers: LocalAiJob[];
  criticalDeadlines: unknown[];
  failedAiJobs: LocalAiJob[];
  lowConfidenceAiOutputs: LocalAiJob[];
  workImproperlyRoutedToManny: unknown[];
  estimatedMannyTimeSavedMinutes: number;
  draftReadyCount: number;
  operationsOpen: number;
  syntheticNotice: string;
}

export async function fetchLocalAiFlags(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/flags`, { headers: headers(auth) });
  return parse(res) as Promise<{ flags: Record<string, boolean>; safety: Record<string, unknown> }>;
}

export async function fetchLocalAiCommandCenter(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/command-center`, { headers: headers(auth) });
  return parse(res) as Promise<{ commandCenter: LocalAiCommandCenter }>;
}

export async function fetchLocalAiJobs(auth: AtlasHubAuthHeaders, status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${base()}/api/local-ai/jobs${q}`, { headers: headers(auth) });
  return parse(res) as Promise<{ jobs: LocalAiJob[] }>;
}

export async function fetchLocalAiJob(auth: AtlasHubAuthHeaders, aiJobId: string) {
  const res = await fetch(`${base()}/api/local-ai/jobs/${encodeURIComponent(aiJobId)}`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ job: LocalAiJob; audit: unknown[] }>;
}

export async function postLocalAiMannyDecision(
  auth: AtlasHubAuthHeaders,
  aiJobId: string,
  decision: 'Approved' | 'Rejected' | 'Returned for Revision',
  actor = 'Manny',
) {
  const res = await fetch(
    `${base()}/api/local-ai/jobs/${encodeURIComponent(aiJobId)}/manny-decision`,
    {
      method: 'POST',
      headers: headers(auth),
      body: JSON.stringify({ decision, actor }),
    },
  );
  return parse(res) as Promise<{ job: LocalAiJob }>;
}

export async function fetchLocalAiOperationsQueue(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/operations-queue`, { headers: headers(auth) });
  return parse(res) as Promise<{ items: unknown[] }>;
}
