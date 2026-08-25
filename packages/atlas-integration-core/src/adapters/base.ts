import type {
  AdapterAction,
  ConnectionStatus,
  PermissionMode,
  ProviderId,
} from '../types/provider.ts';
import {
  PermissionDeniedError,
  UnsupportedOperationError,
  type ConnectRequest,
  type ConnectResult,
  type FetchChangesRequest,
  type FetchChangesResult,
  type FetchRecordRequest,
  type FileTransferRequest,
  type FileTransferResult,
  type IntegrationAdapter,
  type ListResourcesRequest,
  type MutateRecordRequest,
  type ResourceDescriptor,
  type SearchRecordsRequest,
  type SyncNowRequest,
  type SyncNowResult,
  type WebhookProcessRequest,
} from '../types/adapter.ts';
import type {
  CanonicalRecord,
  SyncErrorRecord,
  SyncJobRecord,
  TokenHealth,
} from '../types/records.ts';
import { WRITE_ACTIONS } from '../types/provider.ts';

/**
 * Base adapter: unsupported actions throw UnsupportedOperationError.
 * Enforces read-only discovery by default for write actions.
 */
export abstract class BaseIntegrationAdapter implements IntegrationAdapter {
  abstract readonly providerId: ProviderId;
  abstract readonly adapterVersion: string;
  protected abstract supportedActions: ReadonlySet<AdapterAction>;

  /** Resolve current permission mode for a connection — subclasses override. */
  protected abstract getPermissionMode(connectionId: string): PermissionMode;

  supports(action: AdapterAction): boolean {
    return this.supportedActions.has(action);
  }

  protected ensure(action: AdapterAction): void {
    if (!this.supports(action)) {
      throw new UnsupportedOperationError(this.providerId, action);
    }
  }

  protected ensureWritable(connectionId: string, action: AdapterAction): void {
    this.ensure(action);
    const mode = this.getPermissionMode(connectionId);
    if (mode === 'read_only_discovery' && WRITE_ACTIONS.includes(action)) {
      throw new PermissionDeniedError(mode, action);
    }
    if (
      mode === 'managed_synchronization' &&
      action === 'createRecord' &&
      // createRecord allowed only in workflow+ modes for free-form creates
      false
    ) {
      throw new PermissionDeniedError(mode, action);
    }
    if (
      mode !== 'workflow_execution' &&
      mode !== 'elevated_administrative' &&
      (action === 'createRecord' || action === 'updateRecord')
    ) {
      // Managed sync may update Atlas-owned resources via subclass override of this gate.
      if (mode === 'managed_synchronization') return;
      throw new PermissionDeniedError(mode, action);
    }
  }

  abstract connect(request: ConnectRequest): Promise<ConnectResult>;
  abstract disconnect(connectionId: string): Promise<void>;
  abstract verifyConnection(connectionId: string): Promise<{ ok: boolean; detail: string }>;
  abstract refreshAuthentication(connectionId: string): Promise<TokenHealth>;
  abstract getConnectionStatus(connectionId: string): Promise<ConnectionStatus>;

  async listResources(_request: ListResourcesRequest): Promise<{
    items: ResourceDescriptor[];
    nextCursor?: string;
  }> {
    this.ensure('listResources');
    throw new UnsupportedOperationError(this.providerId, 'listResources');
  }

  async searchRecords(_request: SearchRecordsRequest): Promise<{
    items: CanonicalRecord[];
    nextCursor?: string;
  }> {
    this.ensure('searchRecords');
    throw new UnsupportedOperationError(this.providerId, 'searchRecords');
  }

  async fetchRecord(_request: FetchRecordRequest): Promise<CanonicalRecord> {
    this.ensure('fetchRecord');
    throw new UnsupportedOperationError(this.providerId, 'fetchRecord');
  }

  async fetchChanges(_request: FetchChangesRequest): Promise<FetchChangesResult> {
    this.ensure('fetchChanges');
    throw new UnsupportedOperationError(this.providerId, 'fetchChanges');
  }

  async createRecord(request: MutateRecordRequest): Promise<CanonicalRecord> {
    this.ensureWritable(request.connectionId, 'createRecord');
    throw new UnsupportedOperationError(this.providerId, 'createRecord');
  }

  async updateRecord(request: MutateRecordRequest): Promise<CanonicalRecord> {
    this.ensureWritable(request.connectionId, 'updateRecord');
    throw new UnsupportedOperationError(this.providerId, 'updateRecord');
  }

  async uploadFile(request: FileTransferRequest): Promise<FileTransferResult> {
    this.ensureWritable(request.connectionId, 'uploadFile');
    throw new UnsupportedOperationError(this.providerId, 'uploadFile');
  }

  async downloadFile(_request: FileTransferRequest): Promise<FileTransferResult> {
    this.ensure('downloadFile');
    throw new UnsupportedOperationError(this.providerId, 'downloadFile');
  }

  async subscribeToChanges(
    connectionId: string,
    _callbackUrl: string,
  ): Promise<{ subscriptionId: string }> {
    this.ensureWritable(connectionId, 'subscribeToChanges');
    throw new UnsupportedOperationError(this.providerId, 'subscribeToChanges');
  }

  async processWebhook(
    _request: WebhookProcessRequest,
  ): Promise<{ accepted: boolean; detail: string }> {
    this.ensure('processWebhook');
    throw new UnsupportedOperationError(this.providerId, 'processWebhook');
  }

  async syncNow(_request: SyncNowRequest): Promise<SyncNowResult> {
    this.ensure('syncNow');
    throw new UnsupportedOperationError(this.providerId, 'syncNow');
  }

  async getSyncHistory(_connectionId: string, _limit?: number): Promise<SyncJobRecord[]> {
    this.ensure('getSyncHistory');
    return [];
  }

  async getErrors(_connectionId: string, _limit?: number): Promise<SyncErrorRecord[]> {
    this.ensure('getErrors');
    return [];
  }
}
