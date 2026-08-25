import type { PlaidRepository } from '../store/repository.ts';
import type { VerifiedCashSnapshot } from '../../../../packages/atlas-plaid-contracts/src/index.ts';

/**
 * Map Plaid store → Finance Intelligence / Executive Dashboard verified cash KPI.
 * Never marks estimated values as VerifiedBank.
 */
export function buildVerifiedCashSnapshot(
  repo: PlaidRepository,
  clientId: string,
  clientCode: string,
): VerifiedCashSnapshot | { provenance: 'Unavailable'; reason: string } {
  const accounts = repo.listAccountsForClient(clientId).filter((a) => a.status === 'Connected');
  const items = repo.listItemsForClient(clientId).filter((i) => i.status !== 'Disconnected');
  if (accounts.length === 0) {
    return { provenance: 'Unavailable', reason: 'No verified bank accounts connected' };
  }
  const totalCurrent = accounts.reduce((s, a) => s + (a.currentBalance ?? 0), 0);
  const availParts = accounts.map((a) => a.availableBalance).filter((v): v is number => v != null);
  return {
    clientId,
    clientCode,
    asOf: new Date().toISOString(),
    totalCurrentBalance: totalCurrent,
    totalAvailableBalance: availParts.length ? availParts.reduce((a, b) => a + b, 0) : null,
    accountCount: accounts.length,
    institutionCount: new Set(items.map((i) => i.institutionId)).size,
    provenance: 'VerifiedBank',
    source: 'Plaid',
    connectionStatuses: items.map((i) => i.status),
  };
}
