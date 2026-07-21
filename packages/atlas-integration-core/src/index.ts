export type {
  ProviderId,
  AuthType,
  PermissionMode,
  ConnectionStatus,
  EnvironmentId,
  AdapterAction,
} from './types/provider.ts';
export { WRITE_ACTIONS, READ_ACTIONS } from './types/provider.ts';

export type {
  SourceProvenance,
  CanonicalEntityKind,
  CanonicalRecord,
  ConnectionRecord,
  BusinessEntityId,
  MailboxType,
  ResourceSelection,
  DiscoveredResource,
  SyncJobRecord,
  SyncErrorRecord,
  AuditEventRecord,
  IntegrationRegistryEntry,
  TokenHealth,
  ConnectionHealthSummary,
} from './types/records.ts';

export type {
  IntegrationAdapter,
  ConnectRequest,
  ConnectResult,
  ListResourcesRequest,
  ResourceDescriptor,
  SearchRecordsRequest,
  FetchRecordRequest,
  FetchChangesRequest,
  FetchChangesResult,
  MutateRecordRequest,
  FileTransferRequest,
  FileTransferResult,
  WebhookProcessRequest,
  SyncNowRequest,
  SyncNowResult,
} from './types/adapter.ts';
export {
  UnsupportedOperationError,
  PermissionDeniedError,
  assertSupported,
  assertWritable,
} from './types/adapter.ts';

export { SOURCE_OF_TRUTH_RULES, rulesFor } from './canonical/sourceOfTruth.ts';
export type { FieldOwnershipRule, SourceOfTruthOwner } from './canonical/sourceOfTruth.ts';
export {
  inferBusinessEntity,
  extractDomain,
  clientMatchKeys,
  isConfidentClientMatch,
} from './canonical/entityResolution.ts';
export type { BusinessEntityGuess } from './canonical/entityResolution.ts';

export {
  encryptSecret,
  decryptSecret,
  deriveKey,
  redact,
  contentHash,
} from './security/tokenVault.ts';

export { IntegrationRegistry, unsupportedOf, ALL_ACTIONS } from './registry/registry.ts';
export { BaseIntegrationAdapter } from './adapters/base.ts';

export {
  withRetry,
  computeBackoff,
  sleep,
  RateLimiter,
  sourceDedupeKey,
  processIndependently,
  DEFAULT_RETRY,
} from './sync/engine.ts';
export type { RetryOptions, SyncCheckpoint, RecordProcessor } from './sync/engine.ts';
