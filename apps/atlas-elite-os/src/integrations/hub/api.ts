/**
 * Browser client for Atlas Universal Integration Hub API.
 * Never requests or stores access/refresh tokens in the browser.
 */

export interface AtlasHubAuthHeaders {
  userId: string;
  organizationId: string;
  clientIds: string[];
  email?: string;
  roles?: string[];
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

export async function fetchClient360(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/client360`, { headers: headers(auth) });
  const data = (await parse(res)) as { candidates?: Client360Candidate[]; clients?: Client360Candidate[] };
  return { clients: data.clients || data.candidates || [] };
}

export async function fetchClient360Detail(auth: AtlasHubAuthHeaders, clientId: string) {
  const res = await fetch(`${base()}/api/client360/${encodeURIComponent(clientId)}`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{ client: Client360Candidate }>;
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
