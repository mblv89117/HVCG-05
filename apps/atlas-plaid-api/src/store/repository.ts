import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type {
  BankTransactionRecord,
  ConsentRecord,
  FinancialAccountRecord,
  LiabilityRecord,
  PlaidItemRecord,
  StoreSnapshot,
  WebhookEventRecord,
} from './types.ts';

const empty = (): StoreSnapshot => ({
  consents: [],
  items: [],
  accounts: [],
  transactions: [],
  liabilities: [],
  webhooks: [],
});

export class PlaidRepository {
  private data: StoreSnapshot;
  private path: string;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.path = join(dataDir, 'plaid-store.json');
    if (existsSync(this.path)) {
      this.data = JSON.parse(readFileSync(this.path, 'utf8')) as StoreSnapshot;
    } else {
      this.data = empty();
      this.persist();
    }
  }

  private persist() {
    // Access token ciphertexts are encrypted; still restrict file perms via umask in deploy.
    writeFileSync(this.path, JSON.stringify(this.data, null, 2), { mode: 0o600 });
  }

  saveConsent(c: ConsentRecord) {
    this.data.consents.push(c);
    this.persist();
  }

  upsertItem(item: PlaidItemRecord) {
    const i = this.data.items.findIndex((x) => x.id === item.id);
    if (i >= 0) this.data.items[i] = item;
    else this.data.items.push(item);
    this.persist();
  }

  getItem(connectionId: string): PlaidItemRecord | undefined {
    return this.data.items.find((x) => x.id === connectionId && !x.deletedAt);
  }

  getItemByPlaidItemId(itemId: string): PlaidItemRecord | undefined {
    return this.data.items.find((x) => x.itemId === itemId && !x.deletedAt);
  }

  listItemsForClient(clientId: string): PlaidItemRecord[] {
    return this.data.items.filter((x) => x.clientId === clientId && !x.deletedAt);
  }

  findActiveItemForInstitution(clientId: string, institutionId: string): PlaidItemRecord | undefined {
    return this.data.items.find(
      (x) =>
        x.clientId === clientId &&
        x.institutionId === institutionId &&
        !x.deletedAt &&
        x.status !== 'Disconnected',
    );
  }

  replaceAccounts(connectionId: string, accounts: FinancialAccountRecord[]) {
    this.data.accounts = this.data.accounts.filter((a) => a.connectionId !== connectionId);
    this.data.accounts.push(...accounts);
    this.persist();
  }

  listAccountsForClient(clientId: string): FinancialAccountRecord[] {
    return this.data.accounts.filter((a) => a.clientId === clientId && !a.deletedAt);
  }

  upsertTransactions(rows: BankTransactionRecord[]) {
    for (const row of rows) {
      const i = this.data.transactions.findIndex((t) => t.transactionId === row.transactionId);
      if (i >= 0) this.data.transactions[i] = row;
      else this.data.transactions.push(row);
    }
    this.persist();
  }

  listTransactionsForClient(clientId: string): BankTransactionRecord[] {
    return this.data.transactions.filter((t) => t.clientId === clientId);
  }

  replaceLiabilities(connectionId: string, rows: LiabilityRecord[]) {
    this.data.liabilities = this.data.liabilities.filter((l) => l.connectionId !== connectionId);
    this.data.liabilities.push(...rows);
    this.persist();
  }

  listLiabilitiesForClient(clientId: string): LiabilityRecord[] {
    return this.data.liabilities.filter((l) => l.clientId === clientId);
  }

  saveWebhook(ev: WebhookEventRecord) {
    const existing = this.data.webhooks.find((w) => w.id === ev.id);
    if (existing) return; // idempotent
    this.data.webhooks.push(ev);
    this.persist();
  }

  markWebhook(id: string, status: WebhookEventRecord['status']) {
    const w = this.data.webhooks.find((x) => x.id === id);
    if (w) {
      w.status = status;
      w.processedAt = new Date().toISOString();
      this.persist();
    }
  }
}
