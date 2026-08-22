/** Provider identifiers for the Universal Integration Layer. */
export type ProviderId =
  | 'microsoft'
  | 'google'
  | 'github'
  | 'plaid'
  | 'quickbooks'
  | 'docusign'
  | 'payment'
  | 'crm'
  | 'storage'
  | 'local-storage'
  | 'external-drive'
  | 'custom';

export type AuthType =
  | 'oauth2_delegated'
  | 'oauth2_application'
  | 'github_app'
  | 'fine_grained_pat'
  | 'api_key'
  | 'service_account'
  | 'managed_identity'
  | 'certificate';

export type PermissionMode =
  | 'read_only_discovery'
  | 'managed_synchronization'
  | 'workflow_execution'
  | 'elevated_administrative';

export type ConnectionStatus =
  | 'Available'
  | 'Connecting'
  | 'Connected'
  | 'NeedsReauthorization'
  | 'Syncing'
  | 'Error'
  | 'Disabled'
  | 'Disconnected'
  | 'Revoked';

export type EnvironmentId = 'local' | 'test' | 'staging' | 'production';

/** Standard adapter actions — unsupported ops return UnsupportedOperationError. */
export type AdapterAction =
  | 'connect'
  | 'disconnect'
  | 'verifyConnection'
  | 'refreshAuthentication'
  | 'getConnectionStatus'
  | 'listResources'
  | 'searchRecords'
  | 'fetchRecord'
  | 'fetchChanges'
  | 'createRecord'
  | 'updateRecord'
  | 'uploadFile'
  | 'downloadFile'
  | 'subscribeToChanges'
  | 'processWebhook'
  | 'syncNow'
  | 'getSyncHistory'
  | 'getErrors';

export const WRITE_ACTIONS: AdapterAction[] = [
  'createRecord',
  'updateRecord',
  'uploadFile',
  'subscribeToChanges',
];

export const READ_ACTIONS: AdapterAction[] = [
  'verifyConnection',
  'getConnectionStatus',
  'listResources',
  'searchRecords',
  'fetchRecord',
  'fetchChanges',
  'downloadFile',
  'syncNow',
  'getSyncHistory',
  'getErrors',
];
