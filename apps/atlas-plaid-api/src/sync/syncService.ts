import type { PlaidApi } from 'plaid';
import type { AppConfig } from '../config.ts';
import { encryptSecret, decryptSecret } from '../crypto/tokenVault.ts';
import type { PlaidRepository } from '../store/repository.ts';
import type {
  BankTransactionRecord,
  FinancialAccountRecord,
  LiabilityRecord,
  PlaidItemRecord,
} from '../store/types.ts';
import { audit } from '../audit/auditLog.ts';

export async function syncConnection(
  plaid: PlaidApi,
  repo: PlaidRepository,
  cfg: AppConfig,
  connectionId: string,
): Promise<{ accounts: number; transactions: number }> {
  const item = repo.getItem(connectionId);
  if (!item || item.status === 'Disconnected') {
    throw Object.assign(new Error('Connection not found or disconnected'), { status: 404 });
  }

  audit({
    action: 'sync_started',
    organizationId: item.organizationId,
    clientId: item.clientId,
    connectionId: item.id,
    itemId: item.itemId,
    outcome: 'success',
  });

  item.status = 'Syncing';
  item.updatedAt = new Date().toISOString();
  repo.upsertItem(item);

  try {
    const accessToken = decryptSecret(item.accessTokenCiphertext, cfg.tokenEncryptionKeyB64);

    // Accounts + balances
    const accountsResp = await plaid.accountsGet({ access_token: accessToken });
    const now = new Date().toISOString();
    const accounts: FinancialAccountRecord[] = accountsResp.data.accounts.map((a) => ({
      id: crypto.randomUUID(),
      organizationId: item.organizationId,
      clientId: item.clientId,
      connectionId: item.id,
      itemId: item.itemId,
      accountId: a.account_id,
      name: a.name,
      officialName: a.official_name || undefined,
      type: a.type,
      subtype: a.subtype || undefined,
      mask: a.mask || '****',
      currentBalance: a.balances.current ?? null,
      availableBalance: a.balances.available ?? null,
      isoCurrencyCode: a.balances.iso_currency_code || null,
      status: 'Connected',
      lastSyncedAt: now,
      provenance: 'VerifiedBank',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    }));
    repo.replaceAccounts(item.id, accounts);

    // Incremental transactions sync
    let cursor = item.syncCursor || undefined;
    let added = 0;
    let hasMore = true;
    while (hasMore) {
      const txResp = await plaid.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 100,
      });
      const mapped: BankTransactionRecord[] = txResp.data.added.map((t) => ({
        id: crypto.randomUUID(),
        organizationId: item.organizationId,
        clientId: item.clientId,
        connectionId: item.id,
        accountId: t.account_id,
        transactionId: t.transaction_id,
        amount: t.amount,
        date: t.date,
        name: t.name,
        merchantName: t.merchant_name || undefined,
        pending: t.pending,
        category: t.category || undefined,
        createdAt: now,
        updatedAt: now,
      }));
      // Removed / modified: upsert by transaction_id
      const modified: BankTransactionRecord[] = txResp.data.modified.map((t) => ({
        id: crypto.randomUUID(),
        organizationId: item.organizationId,
        clientId: item.clientId,
        connectionId: item.id,
        accountId: t.account_id,
        transactionId: t.transaction_id,
        amount: t.amount,
        date: t.date,
        name: t.name,
        merchantName: t.merchant_name || undefined,
        pending: t.pending,
        category: t.category || undefined,
        createdAt: now,
        updatedAt: now,
      }));
      repo.upsertTransactions([...mapped, ...modified]);
      added += mapped.length + modified.length;
      cursor = txResp.data.next_cursor;
      hasMore = txResp.data.has_more;
    }

    // Liabilities (best-effort — may be empty for Sandbox)
    try {
      const liab = await plaid.liabilitiesGet({ access_token: accessToken });
      const liabilities: LiabilityRecord[] = [];
      for (const c of liab.data.liabilities.credit || []) {
        liabilities.push({
          id: crypto.randomUUID(),
          organizationId: item.organizationId,
          clientId: item.clientId,
          connectionId: item.id,
          accountId: c.account_id || 'unknown',
          type: 'credit',
          lastPaymentAmount: c.last_payment_amount ?? undefined,
          lastPaymentDate: c.last_payment_date ?? undefined,
          lastStatementBalance: c.last_statement_balance ?? undefined,
          minimumPaymentAmount: c.minimum_payment_amount ?? undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
      repo.replaceLiabilities(item.id, liabilities);
    } catch {
      // Sandbox may not return liabilities for all institutions
    }

    const updated: PlaidItemRecord = {
      ...item,
      status: 'Connected',
      syncCursor: cursor || item.syncCursor,
      lastSyncedAt: now,
      updatedAt: now,
      errorCode: null,
      errorMessage: null,
    };
    // Re-encrypt not needed — ciphertext unchanged
    void encryptSecret;
    repo.upsertItem(updated);

    audit({
      action: 'sync_completed',
      organizationId: item.organizationId,
      clientId: item.clientId,
      connectionId: item.id,
      itemId: item.itemId,
      outcome: 'success',
      detail: `accounts=${accounts.length};transactions=${added}`,
    });

    return { accounts: accounts.length, transactions: added };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sync_failed';
    const failed: PlaidItemRecord = {
      ...item,
      status: message.toLowerCase().includes('item_login_required')
        ? 'NeedsReauthorization'
        : 'Error',
      errorCode: 'SYNC_ERROR',
      errorMessage: 'Synchronization failed', // do not leak Plaid internals
      updatedAt: new Date().toISOString(),
    };
    repo.upsertItem(failed);
    audit({
      action: 'sync_failure',
      organizationId: item.organizationId,
      clientId: item.clientId,
      connectionId: item.id,
      itemId: item.itemId,
      outcome: 'failure',
      detail: message.slice(0, 200),
    });
    throw err;
  }
}
