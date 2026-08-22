import type {
  AdapterAction,
  ConnectionStatus,
  PermissionMode,
  ProviderId,
} from './provider.ts';
import type {
  CanonicalRecord,
  ConnectionRecord,
  SyncErrorRecord,
  SyncJobRecord,
  TokenHealth,
} from './records.ts';

export class UnsupportedOperationError extends Error {
  readonly action: AdapterAction;
  readonly providerId: ProviderId;

  constructor(providerId: ProviderId, action: AdapterAction, reason?: string) {
    super(
      reason ||
        `Provider ${providerId} does not support action "${action}". See integration registry.`,
    );
    this.name = 'UnsupportedOperationError';
    this.providerId = providerId;
    this.action = action;
  }
}

export class PermissionDeniedError extends Error {
  constructor(mode: PermissionMode, action: AdapterAction) {
    super(`Action "${action}" is not permitted in permission mode "${mode}".`);
    this.name = 'PermissionDeniedError';
  }
}

export interface ConnectRequest {
  ownerUserId: string;
  environment: ConnectionRecord['environment'];
  permissionMode: PermissionMode;
  redirectUri: string;
  scopes?: string[];
  resourceHints?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ConnectResult {
  /** When interactive OAuth is required */
  authorizationUrl?: string;
  state?: string;
  connection?: ConnectionRecord;
}

export interface ListResourcesRequest {
  connectionId: string;
  resourceType?: string;
  cursor?: string;
  limit?: number;
  query?: string;
}

export interface ResourceDescriptor {
  resourceType: string;
  resourceId: string;
  displayName: string;
  path?: string;
  webUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface SearchRecordsRequest {
  connectionId: string;
  query: string;
  resourceTypes?: string[];
  cursor?: string;
  limit?: number;
}

export interface FetchRecordRequest {
  connectionId: string;
  resourceType: string;
  recordId: string;
}

export interface FetchChangesRequest {
  connectionId: string;
  deltaToken?: string;
  resourceType?: string;
  limit?: number;
}

export interface FetchChangesResult {
  records: CanonicalRecord[];
  nextDeltaToken?: string;
  hasMore: boolean;
}

export interface MutateRecordRequest {
  connectionId: string;
  resourceType: string;
  recordId?: string;
  payload: Record<string, unknown>;
}

export interface FileTransferRequest {
  connectionId: string;
  resourceId: string;
  path?: string;
  fileName?: string;
  contentType?: string;
  /** Base64 for upload; ignored on download */
  contentBase64?: string;
}

export interface FileTransferResult {
  resourceId: string;
  fileName: string;
  contentType?: string;
  contentBase64?: string;
  webUrl?: string;
  sizeBytes?: number;
}

export interface WebhookProcessRequest {
  connectionId?: string;
  headers: Record<string, string>;
  body: unknown;
  rawBody?: string;
}

export interface SyncNowRequest {
  connectionId: string;
  mode?: 'full' | 'incremental';
  resourceTypes?: string[];
}

export interface SyncNowResult {
  job: SyncJobRecord;
  records: CanonicalRecord[];
}

/** Standard provider-adapter contract for Project Atlas. */
export interface IntegrationAdapter {
  readonly providerId: ProviderId;
  readonly adapterVersion: string;

  supports(action: AdapterAction): boolean;

  connect(request: ConnectRequest): Promise<ConnectResult>;
  disconnect(connectionId: string): Promise<void>;
  verifyConnection(connectionId: string): Promise<{ ok: boolean; detail: string }>;
  refreshAuthentication(connectionId: string): Promise<TokenHealth>;
  getConnectionStatus(connectionId: string): Promise<ConnectionStatus>;

  listResources(request: ListResourcesRequest): Promise<{
    items: ResourceDescriptor[];
    nextCursor?: string;
  }>;
  searchRecords(request: SearchRecordsRequest): Promise<{
    items: CanonicalRecord[];
    nextCursor?: string;
  }>;
  fetchRecord(request: FetchRecordRequest): Promise<CanonicalRecord>;
  fetchChanges(request: FetchChangesRequest): Promise<FetchChangesResult>;

  createRecord(request: MutateRecordRequest): Promise<CanonicalRecord>;
  updateRecord(request: MutateRecordRequest): Promise<CanonicalRecord>;
  uploadFile(request: FileTransferRequest): Promise<FileTransferResult>;
  downloadFile(request: FileTransferRequest): Promise<FileTransferResult>;

  subscribeToChanges(connectionId: string, callbackUrl: string): Promise<{ subscriptionId: string }>;
  processWebhook(request: WebhookProcessRequest): Promise<{ accepted: boolean; detail: string }>;

  syncNow(request: SyncNowRequest): Promise<SyncNowResult>;
  getSyncHistory(connectionId: string, limit?: number): Promise<SyncJobRecord[]>;
  getErrors(connectionId: string, limit?: number): Promise<SyncErrorRecord[]>;
}

export function assertSupported(adapter: IntegrationAdapter, action: AdapterAction): void {
  if (!adapter.supports(action)) {
    throw new UnsupportedOperationError(adapter.providerId, action);
  }
}

export function assertWritable(mode: PermissionMode, action: AdapterAction): void {
  if (mode === 'read_only_discovery') {
    if (
      action === 'createRecord' ||
      action === 'updateRecord' ||
      action === 'uploadFile' ||
      action === 'subscribeToChanges'
    ) {
      throw new PermissionDeniedError(mode, action);
    }
  }
  if (mode === 'managed_synchronization') {
    if (action === 'subscribeToChanges') {
      // managed sync may update metadata / Atlas-owned folders only — subscriptions OK
    }
  }
  if (mode !== 'elevated_administrative' && action === 'createRecord') {
    // Workflow mode and elevated only for free-form creates; managed sync uses update/upload.
  }
}
