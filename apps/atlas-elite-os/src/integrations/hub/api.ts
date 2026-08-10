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
  outputPayload?: unknown;
  requiresMannyApproval: boolean;
  mannyDecision: string;
  retryCount: number;
  recommendedNextAction: string | null;
  auditCorrelationId: string;
  wroteAuthoritativeBusinessRecord: boolean;
  syntheticBanner: string;
  executorMode?: string;
  processingDurationMs?: number | null;
  injectionWarnings?: string[];
  redactionSummary?: unknown;
  ollamaMetrics?: unknown;
  modelRouting?: unknown;
  timeProtection?: unknown;
  contentPackId?: string | null;
  meetingDraft?: unknown;
  documentReviewPack?: unknown;
  clientOperationsPack?: unknown;
  phase?: string;
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
  decision:
    | 'Approved'
    | 'Rejected'
    | 'Returned for Revision'
    | 'Archived'
    | 'No Action Required'
    | 'Automation Candidate'
    | 'Eliminate',
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

export async function fetchLocalAiOllamaDiscovery(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/ollama/discovery`, { headers: headers(auth) });
  return parse(res) as Promise<{
    discovery: {
      healthy: boolean;
      version?: string;
      baseUrl: string;
      selectedModel: string | null;
      models: Array<{ name: string; contextLength?: number; parameterSize?: string }>;
      openWebUiDetected: boolean;
      openWebUiNote: string;
      loopbackBound: boolean;
      error?: string;
    };
    executor: Record<string, unknown>;
  }>;
}

export async function processLocalAiJob(
  auth: AtlasHubAuthHeaders,
  aiJobId: string,
  force = false,
) {
  const res = await fetch(`${base()}/api/local-ai/jobs/${encodeURIComponent(aiJobId)}/process`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ force }),
  });
  return parse(res) as Promise<{ job: LocalAiJob }>;
}

export async function cancelLocalAiJob(auth: AtlasHubAuthHeaders, aiJobId: string) {
  const res = await fetch(`${base()}/api/local-ai/jobs/${encodeURIComponent(aiJobId)}/cancel`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({}),
  });
  return parse(res) as Promise<{ job: LocalAiJob }>;
}

export async function retryLocalAiJob(auth: AtlasHubAuthHeaders, aiJobId: string, force = false) {
  const res = await fetch(`${base()}/api/local-ai/jobs/${encodeURIComponent(aiJobId)}/retry`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ force }),
  });
  return parse(res) as Promise<{ job: LocalAiJob }>;
}

export async function fetchLocalAiModelRouting(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/model-routing`, { headers: headers(auth) });
  return parse(res) as Promise<{ routing: Record<string, unknown> }>;
}

export async function fetchLocalAiPerformance(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/performance`, { headers: headers(auth) });
  return parse(res) as Promise<{ dashboard: Record<string, unknown> }>;
}

export async function fetchLocalAiApprovalQueue(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/approval-queue`, { headers: headers(auth) });
  return parse(res) as Promise<{ items: unknown[]; generatedAt: string }>;
}

export async function fetchLocalAiContentPacks(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/content-packs`, { headers: headers(auth) });
  return parse(res) as Promise<{ packs: LocalAiContentPack[] }>;
}

export async function fetchLocalAiContentPack(auth: AtlasHubAuthHeaders, packId: string) {
  const res = await fetch(`${base()}/api/local-ai/content-packs/${encodeURIComponent(packId)}`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ pack: LocalAiContentPack }>;
}

export async function createLocalAiContentPack(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  const res = await fetch(`${base()}/api/local-ai/content-packs`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(body),
  });
  return parse(res) as Promise<{ pack: LocalAiContentPack }>;
}

export async function decideLocalAiContentPackRedaction(
  auth: AtlasHubAuthHeaders,
  packId: string,
  decision: string,
  editedRedactedContent?: string,
) {
  const res = await fetch(
    `${base()}/api/local-ai/content-packs/${encodeURIComponent(packId)}/redaction-decision`,
    {
      method: 'POST',
      headers: headers(auth),
      body: JSON.stringify({ decision, editedRedactedContent }),
    },
  );
  return parse(res) as Promise<{ pack: LocalAiContentPack }>;
}

export async function processLocalAiContentPack(
  auth: AtlasHubAuthHeaders,
  packId: string,
  force = true,
) {
  const res = await fetch(
    `${base()}/api/local-ai/content-packs/${encodeURIComponent(packId)}/process`,
    {
      method: 'POST',
      headers: headers(auth),
      body: JSON.stringify({ force }),
    },
  );
  return parse(res) as Promise<{ pack: LocalAiContentPack; job: LocalAiJob }>;
}

export async function postLocalAiModelCompare(
  auth: AtlasHubAuthHeaders,
  body: { operation: string; sourceContent: string },
) {
  const res = await fetch(`${base()}/api/local-ai/model-compare`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(body),
  });
  return parse(res) as Promise<{ comparison: Record<string, unknown> }>;
}

export interface LocalAiContentPack {
  packId: string;
  status: string;
  clientLabel: string;
  requestedOperation: string;
  sensitivity: string;
  redactionDecision: string;
  estimatedChars: number;
  estimatedTokensApprox: number;
  redactedContent?: string;
  originalContent?: string;
  redactionPreview?: unknown;
  injectionPreview?: unknown;
  linkedAiJobId?: string | null;
}

/** Phase 4B-1 staged document (draft review only — no file movement). */
export interface LocalAiStagedDocument {
  stagedFileId: string;
  correlationId: string;
  status: string;
  originalFilename: string;
  safeFilename: string;
  extension: string;
  sizeBytes: number;
  checksumSha256: string;
  createdAt: string;
  expiresAt: string;
  malwareScanStatus: string;
  malwareScanNote?: string;
  malwareScan?: Record<string, unknown> | null;
  extraction?: {
    method?: string;
    embeddedTextChars?: number;
    ocrTextChars?: number;
    pageCount?: number | null;
    warnings?: string[];
    pages?: Array<{
      page: number;
      sourceKind: string;
      confidence: number | null;
      text?: string;
    }>;
    ocr?: {
      engine: string;
      version: string;
      pagesProcessed: number;
      pagesSkipped: number;
      averageConfidence: number | null;
      failedPages: number[];
      durationMs: number;
      disclaimer: string;
    } | null;
  } | null;
  reviewPackage?: Record<string, unknown> | null;
  mannyDecision?: string | null;
  errorDetail?: string | null;
  draftOnly?: true;
}

export async function fetchLocalAiStagedDocuments(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/documents`, { headers: headers(auth) });
  return parse(res) as Promise<{ documents: LocalAiStagedDocument[] }>;
}

export async function fetchLocalAiStagedDocument(auth: AtlasHubAuthHeaders, stagedFileId: string) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/${encodeURIComponent(stagedFileId)}`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ document: LocalAiStagedDocument }>;
}

export async function stageLocalAiDocument(
  auth: AtlasHubAuthHeaders,
  body: { originalFilename: string; contentBase64: string; declaredMime?: string },
) {
  const res = await fetch(`${base()}/api/local-ai/documents/stage`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(body),
  });
  return parse(res) as Promise<{ document: LocalAiStagedDocument }>;
}

export async function processLocalAiStagedDocument(
  auth: AtlasHubAuthHeaders,
  stagedFileId: string,
  body?: { clientLabel?: string; projectLabel?: string | null; forceOcr?: boolean },
) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/${encodeURIComponent(stagedFileId)}/process`,
    {
      method: 'POST',
      headers: headers(auth),
      body: JSON.stringify(body || {}),
    },
  );
  return parse(res) as Promise<{ document: LocalAiStagedDocument }>;
}

export async function cancelLocalAiStagedDocument(auth: AtlasHubAuthHeaders, stagedFileId: string) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/${encodeURIComponent(stagedFileId)}/cancel`,
    { method: 'POST', headers: headers(auth), body: '{}' },
  );
  return parse(res) as Promise<{ cancelled: boolean }>;
}

export async function decideLocalAiStagedDocument(
  auth: AtlasHubAuthHeaders,
  stagedFileId: string,
  decision: string,
  corrections?: Record<string, unknown>,
) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/${encodeURIComponent(stagedFileId)}/decision`,
    {
      method: 'POST',
      headers: headers(auth),
      body: JSON.stringify({ decision, corrections }),
    },
  );
  return parse(res) as Promise<{ document: LocalAiStagedDocument }>;
}

export async function compareLocalAiStagedDocuments(
  auth: AtlasHubAuthHeaders,
  leftStagedFileId: string,
  rightStagedFileId: string,
) {
  const res = await fetch(`${base()}/api/local-ai/documents/compare`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ leftStagedFileId, rightStagedFileId }),
  });
  return parse(res) as Promise<{ comparison: Record<string, unknown> }>;
}

export async function createLocalAiMultiDocumentPack(
  auth: AtlasHubAuthHeaders,
  body: { stagedFileIds: string[]; clientLabel: string },
) {
  const res = await fetch(`${base()}/api/local-ai/documents/multi-pack`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(body),
  });
  return parse(res) as Promise<{ pack: Record<string, unknown> }>;
}

export async function purgeLocalAiStagedDocument(auth: AtlasHubAuthHeaders, stagedFileId: string) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/${encodeURIComponent(stagedFileId)}/purge`,
    { method: 'POST', headers: headers(auth), body: '{}' },
  );
  return parse(res) as Promise<{ document: LocalAiStagedDocument }>;
}

export async function fetchLocalAiDocumentFixtures(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/documents/fixtures`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ fixtures: unknown[] }>;
}

export async function searchLocalAiDocuments(
  auth: AtlasHubAuthHeaders,
  filters: Record<string, unknown>,
) {
  const res = await fetch(`${base()}/api/local-ai/documents/search`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(filters),
  });
  return parse(res) as Promise<{ documents: LocalAiStagedDocument[] }>;
}

export async function fetchLocalAiMultiDocumentPacks(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/documents/multi-pack`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ packs: Array<Record<string, unknown>> }>;
}

export async function fetchLocalAiDocumentRecovery(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/documents/recovery`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{
    interrupted: Array<Record<string, unknown>>;
    recoveryNote: string;
  }>;
}

export async function fetchLocalAiDocumentStorageHealth(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/documents/storage/health`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{
    health: Record<string, unknown>;
    migration: Record<string, unknown>;
  }>;
}

export async function fetchLocalAiRetentionPreview(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/documents/storage/retention-preview`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ candidates: Array<Record<string, unknown>> }>;
}

export async function backupLocalAiDocumentStore(
  auth: AtlasHubAuthHeaders,
  body?: {
    dryRun?: boolean;
    profile?: string;
    encrypted?: boolean;
    passphrase?: string;
    includeStagedOriginals?: boolean;
  },
) {
  const res = await fetch(`${base()}/api/local-ai/documents/storage/backup`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify(body || {}),
  });
  return parse(res) as Promise<{ backup: Record<string, unknown> }>;
}

export async function fetchLocalAiRetentionPolicies(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/documents/storage/retention-policies`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ policies: Array<Record<string, unknown>> }>;
}

export async function createLocalAiRetentionBatch(auth: AtlasHubAuthHeaders, notes?: string) {
  const res = await fetch(`${base()}/api/local-ai/documents/storage/retention-batch`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ notes }),
  });
  return parse(res) as Promise<{ batch: Record<string, unknown> }>;
}

export async function fetchLocalAiDocumentHolds(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/documents/storage/holds`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ holds: Array<Record<string, unknown>> }>;
}

export async function fetchLocalAiPackWorkspace(auth: AtlasHubAuthHeaders, packId: string) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/multi-pack/${encodeURIComponent(packId)}/workspace`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ workspace: Record<string, unknown> }>;
}

export async function analyzeLocalAiPack(auth: AtlasHubAuthHeaders, packId: string) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/multi-pack/${encodeURIComponent(packId)}/analyze`,
    { method: 'POST', headers: headers(auth), body: '{}' },
  );
  return parse(res) as Promise<{ analysis: Record<string, unknown> }>;
}

export async function fetchLocalAiIntegrityCheck(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/documents/storage/integrity`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ report: Record<string, unknown> }>;
}

export async function fetchLocalAiResumeEligibility(
  auth: AtlasHubAuthHeaders,
  stagedFileId: string,
) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/${encodeURIComponent(stagedFileId)}/resume-eligibility`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ eligibility: Record<string, unknown> }>;
}

export async function fetchLocalAiDocumentCorrections(
  auth: AtlasHubAuthHeaders,
  stagedFileId: string,
) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/${encodeURIComponent(stagedFileId)}/corrections`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ corrections: Array<Record<string, unknown>> }>;
}

export async function fetchLocalAiDocumentDecisions(
  auth: AtlasHubAuthHeaders,
  stagedFileId: string,
) {
  const res = await fetch(
    `${base()}/api/local-ai/documents/${encodeURIComponent(stagedFileId)}/decisions`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ decisions: Array<Record<string, unknown>> }>;
}

/** Phase 5A — Local synthetic EVA sandbox (EvaIntakeEnabled remains false). */
export async function fetchLocalAiEvaSandbox(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/eva/sandbox`, { headers: headers(auth) });
  return parse(res) as Promise<{
    banner: Record<string, unknown>;
    flags: Record<string, boolean>;
    scenarios: Array<{ kind: string; banners: Record<string, string> }>;
  }>;
}

export async function fetchLocalAiEvaScenarios(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/eva/scenarios`, { headers: headers(auth) });
  return parse(res) as Promise<{ scenarios: Array<{ kind: string; payload: Record<string, unknown> }> }>;
}

export async function fetchLocalAiEvaSubmissions(auth: AtlasHubAuthHeaders, status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${base()}/api/local-ai/eva/submissions${q}`, { headers: headers(auth) });
  return parse(res) as Promise<{ submissions: Array<Record<string, unknown>> }>;
}

export async function fetchLocalAiEvaSubmission(auth: AtlasHubAuthHeaders, submissionId: string) {
  const res = await fetch(
    `${base()}/api/local-ai/eva/submissions/${encodeURIComponent(submissionId)}`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ submission: Record<string, unknown> }>;
}

export async function submitLocalAiEvaIntake(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  const res = await fetch(`${base()}/api/local-ai/eva/intake`, {
    method: 'POST',
    headers: { ...headers(auth), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parse(res) as Promise<{
    ok: boolean;
    duplicate?: boolean;
    submission?: Record<string, unknown> | null;
    error?: string | null;
    errors?: string[];
    correlationId: string;
    reviewMode?: string | null;
  }>;
}

export async function decideLocalAiEvaSubmission(
  auth: AtlasHubAuthHeaders,
  submissionId: string,
  decision: string,
  notes?: string,
) {
  const res = await fetch(
    `${base()}/api/local-ai/eva/submissions/${encodeURIComponent(submissionId)}/decision`,
    {
      method: 'POST',
      headers: { ...headers(auth), 'content-type': 'application/json' },
      body: JSON.stringify({ decision, notes }),
    },
  );
  return parse(res) as Promise<{ submission: Record<string, unknown> }>;
}

export async function fetchLocalAiEvaQueue(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/eva/queue`, { headers: headers(auth) });
  return parse(res) as Promise<{
    queue: Array<Record<string, unknown>>;
    revisionQueue?: Array<Record<string, unknown>>;
    banner: Record<string, unknown>;
  }>;
}

export async function fetchLocalAiEvaPerformance(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/local-ai/eva/performance`, { headers: headers(auth) });
  return parse(res) as Promise<{ performance: Record<string, unknown> }>;
}

export async function fetchLocalAiEvaAudit(auth: AtlasHubAuthHeaders, submissionId?: string) {
  const q = submissionId ? `?submissionId=${encodeURIComponent(submissionId)}` : '';
  const res = await fetch(`${base()}/api/local-ai/eva/audit${q}`, { headers: headers(auth) });
  return parse(res) as Promise<{
    events: Array<Record<string, unknown>>;
    failures: Array<Record<string, unknown>>;
  }>;
}

export async function cancelLocalAiEvaSubmission(auth: AtlasHubAuthHeaders, submissionId: string) {
  const res = await fetch(
    `${base()}/api/local-ai/eva/submissions/${encodeURIComponent(submissionId)}/cancel`,
    { method: 'POST', headers: headers(auth) },
  );
  return parse(res) as Promise<{ submission: Record<string, unknown> }>;
}

export async function retryLocalAiEvaAi(auth: AtlasHubAuthHeaders, submissionId: string) {
  const res = await fetch(
    `${base()}/api/local-ai/eva/submissions/${encodeURIComponent(submissionId)}/retry-ai`,
    { method: 'POST', headers: headers(auth) },
  );
  return parse(res) as Promise<{ submission: Record<string, unknown> }>;
}

/** Phase 6A — Website Studio control plane (no Production deploy). */
export async function fetchWebsiteStudioHealth(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/website-studio/health`, { headers: headers(auth) });
  return parse(res) as Promise<Record<string, unknown>>;
}

export async function fetchWebsiteStudioDashboard(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/website-studio/dashboard`, { headers: headers(auth) });
  return parse(res) as Promise<{ dashboard: Record<string, unknown> }>;
}

export async function fetchWebsiteStudioWebsites(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/website-studio/websites`, { headers: headers(auth) });
  return parse(res) as Promise<{ websites: Array<Record<string, unknown>> }>;
}

export async function fetchWebsiteStudioPages(auth: AtlasHubAuthHeaders, websiteId: string) {
  const res = await fetch(
    `${base()}/api/website-studio/websites/${encodeURIComponent(websiteId)}/pages`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ pages: Array<Record<string, unknown>> }>;
}

export async function fetchWebsiteStudioBlocks(
  auth: AtlasHubAuthHeaders,
  websiteId: string,
  pageId?: string,
) {
  const q = pageId ? `?pageId=${encodeURIComponent(pageId)}` : '';
  const res = await fetch(
    `${base()}/api/website-studio/websites/${encodeURIComponent(websiteId)}/blocks${q}`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ blocks: Array<Record<string, unknown>> }>;
}

export async function fetchWebsiteStudioMedia(auth: AtlasHubAuthHeaders, websiteId: string) {
  const res = await fetch(
    `${base()}/api/website-studio/websites/${encodeURIComponent(websiteId)}/media`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ media: Array<Record<string, unknown>> }>;
}

export async function fetchWebsiteStudioForms(auth: AtlasHubAuthHeaders, websiteId: string) {
  const res = await fetch(
    `${base()}/api/website-studio/websites/${encodeURIComponent(websiteId)}/forms`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ forms: Array<Record<string, unknown>> }>;
}

export async function fetchWebsiteStudioSeo(
  auth: AtlasHubAuthHeaders,
  websiteId: string,
  pageId: string,
) {
  const res = await fetch(
    `${base()}/api/website-studio/websites/${encodeURIComponent(websiteId)}/pages/${encodeURIComponent(pageId)}/seo`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ seo: Record<string, unknown>; issues: unknown[] }>;
}

export async function fetchWebsiteStudioChangeRequests(
  auth: AtlasHubAuthHeaders,
  websiteId?: string,
) {
  const q = websiteId ? `?websiteId=${encodeURIComponent(websiteId)}` : '';
  const res = await fetch(`${base()}/api/website-studio/change-requests${q}`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ changeRequests: Array<Record<string, unknown>> }>;
}

export async function postWebsiteStudioNaturalLanguage(
  auth: AtlasHubAuthHeaders,
  body: { text: string; websiteId?: string; pageId?: string },
) {
  const res = await fetch(`${base()}/api/website-studio/natural-language`, {
    method: 'POST',
    headers: { ...headers(auth), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parse(res) as Promise<{
    changeRequest: Record<string, unknown>;
    filesModified: boolean;
  }>;
}

export async function postWebsiteStudioAiAssist(
  auth: AtlasHubAuthHeaders,
  body: {
    websiteId: string;
    operation: string;
    content?: string;
    changeRequestId?: string;
  },
) {
  const res = await fetch(`${base()}/api/website-studio/ai/assist`, {
    method: 'POST',
    headers: { ...headers(auth), 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parse(res) as Promise<{
    proposal: string;
    changeRequest: Record<string, unknown>;
    mayDeploy: boolean;
    mayPush: boolean;
  }>;
}

export async function decideWebsiteStudioChangeRequest(
  auth: AtlasHubAuthHeaders,
  changeRequestId: string,
  decision: 'approve' | 'reject' | 'cancel',
  notes?: string,
) {
  const res = await fetch(
    `${base()}/api/website-studio/change-requests/${encodeURIComponent(changeRequestId)}/decision`,
    {
      method: 'POST',
      headers: { ...headers(auth), 'content-type': 'application/json' },
      body: JSON.stringify({ decision, notes }),
    },
  );
  return parse(res) as Promise<{ changeRequest: Record<string, unknown> }>;
}

export async function applyWebsiteStudioLocal(
  auth: AtlasHubAuthHeaders,
  changeRequestId: string,
  body?: { sandboxRoot?: string; repoPath?: string },
) {
  const res = await fetch(
    `${base()}/api/website-studio/change-requests/${encodeURIComponent(changeRequestId)}/apply-local`,
    {
      method: 'POST',
      headers: { ...headers(auth), 'content-type': 'application/json' },
      body: JSON.stringify(body || {}),
    },
  );
  return parse(res) as Promise<{
    applied: boolean;
    pushed: boolean;
    deployed: boolean;
    diff: string | null;
    changeRequest: Record<string, unknown>;
  }>;
}

export async function postWebsiteStudioPreview(
  auth: AtlasHubAuthHeaders,
  changeRequestId: string,
) {
  const res = await fetch(
    `${base()}/api/website-studio/change-requests/${encodeURIComponent(changeRequestId)}/preview`,
    { method: 'POST', headers: headers(auth) },
  );
  return parse(res) as Promise<{ preview: Record<string, unknown> }>;
}

export async function scaffoldWebsiteStudioDeployment(
  auth: AtlasHubAuthHeaders,
  changeRequestId: string,
) {
  const res = await fetch(
    `${base()}/api/website-studio/change-requests/${encodeURIComponent(changeRequestId)}/deployment-scaffold`,
    { method: 'POST', headers: headers(auth) },
  );
  return parse(res) as Promise<{ deployment: Record<string, unknown>; executed: boolean }>;
}

export async function fetchWebsiteStudioDeployments(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/website-studio/deployments`, { headers: headers(auth) });
  return parse(res) as Promise<{ deployments: Array<Record<string, unknown>> }>;
}

export async function fetchWebsiteStudioRollbacks(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/website-studio/rollbacks`, { headers: headers(auth) });
  return parse(res) as Promise<{ rollbacks: Array<Record<string, unknown>> }>;
}

export async function fetchWebsiteStudioAudit(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/website-studio/audit`, { headers: headers(auth) });
  return parse(res) as Promise<{ audit: Array<Record<string, unknown>> }>;
}

/** Phase 6B — HVCG real-repo pilot */
export async function bootstrapWebsiteStudioPhase6b(
  auth: AtlasHubAuthHeaders,
  body?: { naturalLanguage?: string; worktreePath?: string },
) {
  const res = await fetch(`${base()}/api/website-studio/phase6b/bootstrap`, {
    method: 'POST',
    headers: { ...headers(auth), 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  return parse(res) as Promise<Record<string, unknown>>;
}

export async function fetchWebsiteStudioReviewPanel(
  auth: AtlasHubAuthHeaders,
  changeRequestId: string,
) {
  const res = await fetch(
    `${base()}/api/website-studio/change-requests/${encodeURIComponent(changeRequestId)}/review-panel`,
    { headers: headers(auth) },
  );
  return parse(res) as Promise<{ panel: Record<string, unknown> }>;
}

export async function setWebsiteStudioFinalWording(
  auth: AtlasHubAuthHeaders,
  changeRequestId: string,
  body: { selectedVariantId?: string | null; customWording?: string | null; rejectAll?: boolean },
) {
  const res = await fetch(
    `${base()}/api/website-studio/change-requests/${encodeURIComponent(changeRequestId)}/final-wording`,
    {
      method: 'POST',
      headers: { ...headers(auth), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return parse(res) as Promise<{ changeRequest: Record<string, unknown>; filesModified: boolean }>;
}

export async function approveWebsiteStudioFinalWording(
  auth: AtlasHubAuthHeaders,
  changeRequestId: string,
) {
  const res = await fetch(
    `${base()}/api/website-studio/change-requests/${encodeURIComponent(changeRequestId)}/approve-final-wording`,
    { method: 'POST', headers: headers(auth) },
  );
  return parse(res) as Promise<{ changeRequest: Record<string, unknown>; filesModified: boolean }>;
}
