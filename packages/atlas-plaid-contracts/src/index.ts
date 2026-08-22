/**
 * Shared Plaid / bank-connection contracts for Atlas.
 * Browser-safe types only — never include access tokens here.
 */

export const APPROVED_PLAID_PRODUCTS = [
  'auth',
  'balance',
  'identity',
  'liabilities',
  'statements',
  'transactions',
] as const;

export type ApprovedPlaidProduct = (typeof APPROVED_PLAID_PRODUCTS)[number];

export type ConnectionStatus =
  | 'Connected'
  | 'Syncing'
  | 'NeedsReauthorization'
  | 'Error'
  | 'Disconnected';

export type DataProvenance =
  | 'VerifiedBank'
  | 'ClientEntered'
  | 'ImportedAccounting'
  | 'EstimatedDerived';

export interface TenantScope {
  organizationId: string;
  clientId: string;
  clientCode: string;
}

export interface InstitutionSummary {
  institutionId: string;
  name: string;
}

export interface AccountSummary {
  accountId: string;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask: string; // last 4 only
  currentBalance: number | null;
  availableBalance: number | null;
  isoCurrencyCode: string | null;
  status: ConnectionStatus;
  lastSyncedAt: string | null;
  provenance: DataProvenance;
}

export interface ConnectionSummary {
  connectionId: string;
  itemId: string;
  institution: InstitutionSummary;
  status: ConnectionStatus;
  accounts: AccountSummary[];
  lastSyncedAt: string | null;
  consentRecordId: string;
  createdAt: string;
}

export interface LinkTokenResponse {
  linkToken: string;
  expiration: string;
  requestId: string;
}

export interface ExchangeTokenRequest {
  publicToken: string;
  clientId: string;
  consentAcceptedAt: string;
  consentVersion: string;
}

export interface SyncRequest {
  connectionId: string;
  clientId: string;
}

export interface DisconnectRequest {
  connectionId: string;
  clientId: string;
  reason?: string;
}

/** Finance Intelligence mapping — verified cash KPI */
export interface VerifiedCashSnapshot {
  clientId: string;
  clientCode: string;
  asOf: string;
  totalCurrentBalance: number;
  totalAvailableBalance: number | null;
  accountCount: number;
  institutionCount: number;
  provenance: 'VerifiedBank';
  source: 'Plaid';
  connectionStatuses: ConnectionStatus[];
}
