/**
 * Shared QuickBooks Online contracts for Atlas.
 * Browser-safe types only — never include access/refresh tokens here.
 */

export const QBO_ACCOUNTING_SCOPE = 'com.intuit.quickbooks.accounting' as const;

export const QBO_SYNC_ENTITIES = [
  'Account',
  'Customer',
  'Vendor',
  'Invoice',
  'Bill',
  'Payment',
  'Deposit',
  'Purchase',
  'JournalEntry',
  'Class',
  'Department',
  'Item',
  'ProfitAndLoss',
  'BalanceSheet',
  'CashFlow',
  'GeneralLedger',
] as const;

export type QboSyncEntity = (typeof QBO_SYNC_ENTITIES)[number];

export type QboConnectionStatus =
  | 'Connected'
  | 'Syncing'
  | 'NeedsReauthorization'
  | 'Error'
  | 'Disconnected'
  | 'PendingOAuth';

export type QboOAuthStatus = 'not_configured' | 'ready' | 'authorized' | 'expired' | 'revoked';

export type QboTokenStatus = 'missing' | 'valid' | 'expiring_soon' | 'refresh_required' | 'revoked';

export type QboSyncStatus = 'idle' | 'running' | 'succeeded' | 'failed' | 'partial' | 'interrupted';

export type DataProvenance =
  | 'VerifiedBank'
  | 'ClientEntered'
  | 'ImportedAccounting'
  | 'EstimatedDerived'
  | 'AtlasGenerated';

export type DataSourceLineage = 'Plaid' | 'QuickBooks' | 'ManualEntry' | 'AtlasGenerated';

export interface TenantScope {
  organizationId: string;
  clientId: string;
  clientCode: string;
}

export interface QboCompanySummary {
  /** Display name from QBO CompanyInfo */
  companyName: string;
  /** Shown to authorized operators; never log in full in audit */
  realmId: string;
  country?: string;
  fiscalYearStartMonth?: string;
}

export interface QboEntitySyncSummary {
  entity: QboSyncEntity;
  recordCount: number;
  lastCheckpoint: string | null;
  lastSyncedAt: string | null;
  status: QboSyncStatus;
  errorMessage: string | null;
}

export interface QboConnectionHealth {
  healthy: boolean;
  oauthStatus: QboOAuthStatus;
  tokenStatus: QboTokenStatus;
  syncStatus: QboSyncStatus;
  lastSuccessfulSyncAt: string | null;
  consecutiveFailures: number;
  lastErrorMessage: string | null;
}

export interface QboConnectionSummary {
  connectionId: string;
  company: QboCompanySummary;
  status: QboConnectionStatus;
  oauthStatus: QboOAuthStatus;
  tokenStatus: QboTokenStatus;
  syncStatus: QboSyncStatus;
  lastSyncedAt: string | null;
  consentRecordId: string;
  createdAt: string;
  health: QboConnectionHealth;
  entitySummaries: QboEntitySyncSummary[];
  provenance: 'ImportedAccounting';
  source: 'QuickBooks';
}

export interface QboAuthorizeStartResponse {
  authorizeUrl: string;
  state: string;
  expiresAt: string;
}

export interface QboSyncRequest {
  connectionId: string;
  clientId: string;
  /** Optional subset; default = all Phase 1 entities */
  entities?: QboSyncEntity[];
}

export interface QboDisconnectRequest {
  connectionId: string;
  clientId: string;
  reason?: string;
}

/** Finance Intelligence — imported accounting snapshot (never VerifiedBank) */
export interface ImportedAccountingSnapshot {
  clientId: string;
  clientCode: string;
  asOf: string;
  companyName: string | null;
  connectionCount: number;
  accountCount: number;
  invoiceOpenTotal: number | null;
  billOpenTotal: number | null;
  provenance: 'ImportedAccounting';
  source: 'QuickBooks';
  connectionStatuses: QboConnectionStatus[];
}
