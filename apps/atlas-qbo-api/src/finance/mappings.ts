import type { QboRepository } from '../store/repository.ts';
import type { ImportedAccountingSnapshot } from '../../../../packages/atlas-qbo-contracts/src/index.ts';

/**
 * Map QBO store → Finance Intelligence imported accounting snapshot.
 * Never marks values as VerifiedBank — that lineage belongs to Plaid only.
 */
export function buildImportedAccountingSnapshot(
  repo: QboRepository,
  clientId: string,
  clientCode: string,
): ImportedAccountingSnapshot | { provenance: 'Unavailable'; reason: string } {
  const connections = repo.listConnectionsForClient(clientId).filter((c) => c.status !== 'Disconnected');
  if (connections.length === 0) {
    return { provenance: 'Unavailable', reason: 'No QuickBooks company connected' };
  }

  const accounts = repo.listEntitiesForClient(clientId, 'Account');
  const invoices = repo.listEntitiesForClient(clientId, 'Invoice');
  const bills = repo.listEntitiesForClient(clientId, 'Bill');

  const invoiceOpen = invoices.reduce((s, r) => {
    const bal = r.payload.Balance;
    return s + (typeof bal === 'number' ? bal : 0);
  }, 0);
  const billOpen = bills.reduce((s, r) => {
    const bal = r.payload.Balance;
    return s + (typeof bal === 'number' ? bal : 0);
  }, 0);

  const primary = connections[0];
  return {
    clientId,
    clientCode,
    asOf: new Date().toISOString(),
    companyName: primary.companyName,
    connectionCount: connections.length,
    accountCount: accounts.length,
    invoiceOpenTotal: invoices.length ? invoiceOpen : null,
    billOpenTotal: bills.length ? billOpen : null,
    provenance: 'ImportedAccounting',
    source: 'QuickBooks',
    connectionStatuses: connections.map((c) => c.status),
  };
}
