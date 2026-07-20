import type {
  DataProvenance,
  DataSourceLineage,
  QboConnectionStatus,
  QboOAuthStatus,
  QboSyncEntity,
  QboSyncStatus,
  QboTokenStatus,
} from '../../../../packages/atlas-qbo-contracts/src/index.ts';

export interface ConsentRecord {
  id: string;
  organizationId: string;
  clientId: string;
  version: string;
  acceptedAt: string;
  acceptedBy: string;
  textDigest: string;
}

/** Short-lived OAuth CSRF state */
export interface OAuthStateRecord {
  state: string;
  organizationId: string;
  clientId: string;
  clientCode: string;
  actorId: string;
  consentRecordId: string;
  mode: 'connect' | 'reconnect';
  reconnectConnectionId?: string;
  createdAt: string;
  expiresAt: string;
  consumedAt: string | null;
}

export interface QboConnectionRecord {
  id: string;
  organizationId: string;
  clientId: string;
  clientCode: string;
  realmId: string;
  companyName: string;
  country: string | null;
  /** AES-GCM ciphertext — never expose */
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string | null;
  status: QboConnectionStatus;
  oauthStatus: QboOAuthStatus;
  tokenStatus: QboTokenStatus;
  syncStatus: QboSyncStatus;
  consentRecordId: string;
  lastSyncedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  consecutiveFailures: number;
  errorCode: string | null;
  errorMessage: string | null;
  /** JSON map of entity → ISO checkpoint */
  syncCheckpoints: Record<string, string | null>;
  /** Resume pointer when sync interrupted */
  syncResume: {
    runId: string;
    nextEntityIndex: number;
    entities: QboSyncEntity[];
    startedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dataSource: 'QuickBooks';
  provenance: 'ImportedAccounting';
}

export interface AccountingEntityRecord {
  id: string;
  organizationId: string;
  clientId: string;
  connectionId: string;
  realmId: string;
  entityType: QboSyncEntity | 'BankTransaction';
  externalId: string;
  payload: Record<string, unknown>;
  amount: number | null;
  currency: string | null;
  txnDate: string | null;
  displayName: string | null;
  provenance: DataProvenance;
  source: DataSourceLineage;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ReportSnapshotRecord {
  id: string;
  organizationId: string;
  clientId: string;
  connectionId: string;
  reportType: 'ProfitAndLoss' | 'BalanceSheet' | 'CashFlow' | 'GeneralLedger';
  asOf: string;
  payload: Record<string, unknown>;
  provenance: 'ImportedAccounting';
  source: 'QuickBooks';
  createdAt: string;
}

export interface StoreSnapshot {
  consents: ConsentRecord[];
  oauthStates: OAuthStateRecord[];
  connections: QboConnectionRecord[];
  entities: AccountingEntityRecord[];
  reports: ReportSnapshotRecord[];
}

export const CDC_ENTITIES = [
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
] as const;
