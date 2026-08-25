import type { ConnectionStatus, DataProvenance } from '../../../../packages/atlas-plaid-contracts/src/index.ts';

export interface ConsentRecord {
  id: string;
  organizationId: string;
  clientId: string;
  version: string;
  acceptedAt: string;
  acceptedBy: string;
  ipHash?: string;
  textDigest: string;
}

export interface PlaidItemRecord {
  id: string; // atlas connection id
  organizationId: string;
  clientId: string;
  clientCode: string;
  itemId: string;
  /** AES-GCM ciphertext — never expose */
  accessTokenCiphertext: string;
  institutionId: string;
  institutionName: string;
  status: ConnectionStatus;
  products: string[];
  consentRecordId: string;
  lastSyncedAt: string | null;
  syncCursor: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  dataSource: 'Plaid';
}

export interface FinancialAccountRecord {
  id: string;
  organizationId: string;
  clientId: string;
  connectionId: string;
  itemId: string;
  accountId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask: string;
  currentBalance: number | null;
  availableBalance: number | null;
  isoCurrencyCode: string | null;
  status: ConnectionStatus;
  lastSyncedAt: string | null;
  provenance: DataProvenance;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface BankTransactionRecord {
  id: string;
  organizationId: string;
  clientId: string;
  connectionId: string;
  accountId: string;
  transactionId: string;
  amount: number;
  date: string;
  name: string;
  merchantName?: string;
  pending: boolean;
  category?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface LiabilityRecord {
  id: string;
  organizationId: string;
  clientId: string;
  connectionId: string;
  accountId: string;
  type: string;
  lastPaymentAmount?: number;
  lastPaymentDate?: string;
  lastStatementBalance?: number;
  minimumPaymentAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEventRecord {
  id: string;
  webhookType: string;
  webhookCode: string;
  itemId?: string;
  payloadDigest: string;
  receivedAt: string;
  processedAt: string | null;
  status: 'queued' | 'processed' | 'ignored' | 'error';
}

export interface StoreSnapshot {
  consents: ConsentRecord[];
  items: PlaidItemRecord[];
  accounts: FinancialAccountRecord[];
  transactions: BankTransactionRecord[];
  liabilities: LiabilityRecord[];
  webhooks: WebhookEventRecord[];
}
