import type {
  AdapterAction,
  AuthType,
  ConnectionStatus,
  EnvironmentId,
  PermissionMode,
  ProviderId,
} from './provider.ts';

export interface SourceProvenance {
  provider: ProviderId;
  sourceSystem: string;
  sourceAccount: string;
  sourceTenant?: string;
  sourceRecordId: string;
  sourceUrl?: string;
  originalCreatedAt?: string;
  originalModifiedAt?: string;
  importedAt: string;
  lastSynchronizedAt: string;
  contentHash?: string;
  atlasRecordId: string;
  confidenceLevel: number;
  permissionClassification: PermissionMode;
}

export type CanonicalEntityKind =
  | 'Organization'
  | 'Person'
  | 'Client'
  | 'Prospect'
  | 'Engagement'
  | 'Project'
  | 'Matter'
  | 'Communication'
  | 'Email'
  | 'Conversation'
  | 'Meeting'
  | 'CalendarEvent'
  | 'Document'
  | 'Attachment'
  | 'Task'
  | 'Decision'
  | 'Commitment'
  | 'Invoice'
  | 'Payment'
  | 'FundingRequest'
  | 'Proposal'
  | 'Agreement'
  | 'Note'
  | 'Deliverable'
  | 'Repository'
  | 'PullRequest'
  | 'Issue'
  | 'WorkflowRun'
  | 'Connection'
  | 'SyncJob'
  | 'SyncError'
  | 'SourceRecord';

export interface CanonicalRecord {
  kind: CanonicalEntityKind;
  id: string;
  title: string;
  summary?: string;
  fields: Record<string, unknown>;
  provenance: SourceProvenance;
}

export interface ConnectionRecord {
  id: string;
  providerId: ProviderId;
  providerName: string;
  /** Legal / operating entity owning this connection */
  businessEntity: BusinessEntityId;
  accountName: string;
  /** Primary login or mailbox SMTP */
  accountEmail?: string;
  accountDisplayName?: string;
  tenantOrOrg?: string;
  /** Entra tenant GUID, Google customer id, GitHub org login, etc. */
  tenantId?: string;
  domain?: string;
  mailboxType?: MailboxType;
  ownerUserId: string;
  authType: AuthType;
  permissionMode: PermissionMode;
  scopes: string[];
  status: ConnectionStatus;
  environment: EnvironmentId;
  connectedAt: string;
  lastTokenRefreshAt?: string;
  lastSuccessfulSyncAt?: string;
  nextScheduledSyncAt?: string;
  discoveryCompletedAt?: string;
  recordsDiscovered: number;
  recordsImported: number;
  errorState?: string;
  requiresReauthorization: boolean;
  autoSyncEnabled: boolean;
  resourceSelections: ResourceSelection[];
  /** Always unique per connection — never shared across accounts */
  encryptedCredentialsRef: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  disconnectedAt?: string;
}

/** HVCG / HVS / legacy operating entities */
export type BusinessEntityId =
  | 'HVS'
  | 'HVCG'
  | 'legacy'
  | 'personal_business'
  | 'unknown'
  | string;

export type MailboxType =
  | 'user'
  | 'shared'
  | 'alias'
  | 'group'
  | 'archive'
  | 'delegated'
  | 'service'
  | 'organization'
  | 'n/a';

export interface ResourceSelection {
  resourceType: string;
  resourceId: string;
  displayName: string;
  path?: string;
  webUrl?: string;
  mailboxType?: MailboxType;
  businessEntity?: BusinessEntityId;
  selected: boolean;
  metadata?: Record<string, unknown>;
}

export interface DiscoveredResource {
  id: string;
  connectionId: string;
  providerId: ProviderId;
  resourceType: string;
  resourceId: string;
  displayName: string;
  path?: string;
  webUrl?: string;
  mailboxType?: MailboxType;
  businessEntity?: BusinessEntityId;
  selected: boolean;
  discoveredAt: string;
  metadata?: Record<string, unknown>;
}

export interface SyncJobRecord {
  id: string;
  connectionId: string;
  providerId: ProviderId;
  trigger: 'manual' | 'scheduled' | 'webhook' | 'initial' | 'incremental';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'partial' | 'cancelled';
  startedAt?: string;
  finishedAt?: string;
  checkpoint?: string;
  recordsImported: number;
  recordsSkipped: number;
  duplicatesPrevented: number;
  errorCount: number;
  detail?: string;
}

export interface SyncErrorRecord {
  id: string;
  connectionId: string;
  syncJobId?: string;
  providerId: ProviderId;
  code: string;
  message: string;
  retryable: boolean;
  attempts: number;
  nextRetryAt?: string;
  deadLetter: boolean;
  createdAt: string;
  lastAttemptAt: string;
  context?: Record<string, unknown>;
}

export interface AuditEventRecord {
  id: string;
  at: string;
  actorUserId: string;
  action: string;
  providerId?: ProviderId;
  connectionId?: string;
  /** Source account email / login for multi-account audit trails */
  sourceAccount?: string;
  businessEntity?: string;
  outcome: 'success' | 'denied' | 'failure' | 'info';
  detail: string;
  sensitive: boolean;
}

export interface IntegrationRegistryEntry {
  providerId: ProviderId;
  providerName: string;
  adapterVersion: string;
  authenticationType: AuthType[];
  availableActions: AdapterAction[];
  unsupportedActions: AdapterAction[];
  requiredPermissions: string[];
  optionalPermissions: string[];
  webhookSupport: boolean;
  deltaSyncSupport: boolean;
  rateLimits: { requestsPerMinute?: number; notes?: string };
  healthCheckEndpoint?: string;
  documentationLink: string;
  lastTestedAt?: string;
  owner: string;
  deploymentStatus: 'scaffold' | 'development' | 'qa' | 'production' | 'disabled';
  defaultPermissionMode: PermissionMode;
}

export interface TokenHealth {
  healthy: boolean;
  expiresAt?: string;
  lastRefreshAt?: string;
  refreshSupported: boolean;
  requiresReauthorization: boolean;
  detail?: string;
}

export interface ConnectionHealthSummary {
  connectionId: string;
  providerId: ProviderId;
  status: ConnectionStatus;
  tokenHealth: TokenHealth;
  lastSuccessfulSyncAt?: string;
  nextScheduledSyncAt?: string;
  webhookStatus: 'active' | 'inactive' | 'unsupported' | 'error';
  recordsImported: number;
  recordsSkipped: number;
  duplicatesPrevented: number;
  openErrorCount: number;
}
