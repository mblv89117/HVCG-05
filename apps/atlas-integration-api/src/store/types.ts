import type {
  AuditEventRecord,
  CanonicalRecord,
  ConnectionRecord,
  DiscoveredResource,
  ProviderId,
  SyncErrorRecord,
  SyncJobRecord,
} from '@hvcg/atlas-integration-core';

export interface CredentialBlob {
  connectionId: string;
  ciphertext: string;
  updatedAt: string;
}

export interface OAuthStateRecord {
  id: string;
  providerId: ProviderId;
  ownerUserId: string;
  permissionMode: ConnectionRecord['permissionMode'];
  redirectUri: string;
  scopes: string[];
  pendingConnectionId: string;
  /** Optional business entity hint from wizard */
  businessEntity?: string;
  accountLabel?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  expiresAt: string;
}

export interface CheckpointRecord {
  connectionId: string;
  resourceType: string;
  deltaToken?: string;
  cursor?: string;
  updatedAt: string;
}

export interface WebhookEventRecord {
  id: string;
  providerId: ProviderId;
  connectionId?: string;
  eventType: string;
  payloadDigest: string;
  receivedAt: string;
  processedAt?: string;
  status: 'queued' | 'processed' | 'failed' | 'ignored';
}

export type Client360Lifecycle = 'active' | 'former' | 'prospect' | 'unknown';

export interface Client360SourceRef {
  connectionId: string;
  providerId: ProviderId;
  sourceAccount: string;
  sourceRecordId: string;
  kind: string;
  title: string;
  occurredAt?: string;
  businessEntity?: string;
}

export interface Client360TimelineEvent {
  at: string;
  kind: string;
  title: string;
  sourceRecordId: string;
  connectionId: string;
}

export interface Client360Candidate {
  id: string;
  displayName: string;
  legalName?: string;
  lifecycle: Client360Lifecycle;
  matchKeys: string[];
  emails: string[];
  domains: string[];
  phones: string[];
  contacts: Array<{ name: string; email?: string; phone?: string; title?: string }>;
  sourceRefs: Client360SourceRef[];
  associations: {
    emails: string[];
    conversations: string[];
    attachments: string[];
    documents: string[];
    meetings: string[];
    notes: string[];
    projects: string[];
    invoices: string[];
    proposals: string[];
    fundingRequests: string[];
    agreements: string[];
    deliverables: string[];
  };
  timeline: Client360TimelineEvent[];
  completenessScore: number;
  missingInformation: string[];
  recommendedNextActions: string[];
  confidence: 'high' | 'review';
  duplicateCandidateIds: string[];
  connectionIds: string[];
  businessEntities: string[];
  updatedAt: string;
}

export interface Client360ExecutiveDashboard {
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
  completenessDistribution: {
    high: number;
    medium: number;
    low: number;
  };
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

export interface StoreSnapshot {
  connections: ConnectionRecord[];
  credentials: CredentialBlob[];
  oauthStates: OAuthStateRecord[];
  sourceRecords: CanonicalRecord[];
  sourceDedupeIndex: Record<string, string>;
  syncJobs: SyncJobRecord[];
  syncErrors: SyncErrorRecord[];
  auditEvents: AuditEventRecord[];
  checkpoints: CheckpointRecord[];
  webhooks: WebhookEventRecord[];
  discoveredResources: DiscoveredResource[];
  client360: Client360Candidate[];
}

export interface TokenPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  tokenType?: string;
  scope?: string;
  installationId?: number;
  accountLogin?: string;
  accountId?: string;
}
