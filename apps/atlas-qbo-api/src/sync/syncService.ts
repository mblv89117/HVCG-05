import type {
  QboSyncEntity,
  QboEntitySyncSummary,
  QboConnectionSummary,
  QboConnectionHealth,
} from '../../../../packages/atlas-qbo-contracts/src/index.ts';
import { QBO_SYNC_ENTITIES } from '../../../../packages/atlas-qbo-contracts/src/index.ts';
import type { AppConfig } from '../config.ts';
import { redactRealmId } from '../crypto/tokenVault.ts';
import { audit } from '../audit/auditLog.ts';
import type { QboRepository } from '../store/repository.ts';
import type { AccountingEntityRecord, QboConnectionRecord } from '../store/types.ts';
import { CDC_ENTITIES } from '../store/types.ts';
import { withRetry } from './retry.ts';
import { createApiClient, ensureFreshTokens } from './tokenManager.ts';

const DEFAULT_ENTITIES: QboSyncEntity[] = [...QBO_SYNC_ENTITIES];

const QUERY_ENTITIES: Array<{ entity: QboSyncEntity; select: string }> = [
  { entity: 'Account', select: 'SELECT * FROM Account MAXRESULTS 1000' },
  { entity: 'Customer', select: 'SELECT * FROM Customer MAXRESULTS 1000' },
  { entity: 'Vendor', select: 'SELECT * FROM Vendor MAXRESULTS 1000' },
  { entity: 'Invoice', select: 'SELECT * FROM Invoice MAXRESULTS 1000' },
  { entity: 'Bill', select: 'SELECT * FROM Bill MAXRESULTS 1000' },
  { entity: 'Payment', select: 'SELECT * FROM Payment MAXRESULTS 1000' },
  { entity: 'Deposit', select: 'SELECT * FROM Deposit MAXRESULTS 1000' },
  { entity: 'Purchase', select: 'SELECT * FROM Purchase MAXRESULTS 1000' },
  { entity: 'JournalEntry', select: 'SELECT * FROM JournalEntry MAXRESULTS 1000' },
  { entity: 'Class', select: 'SELECT * FROM Class MAXRESULTS 1000' },
  { entity: 'Department', select: 'SELECT * FROM Department MAXRESULTS 1000' },
  { entity: 'Item', select: 'SELECT * FROM Item MAXRESULTS 1000' },
];

function asArray(value: unknown): Record<string, unknown>[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  return [value as Record<string, unknown>];
}

function mapEntityRows(
  conn: QboConnectionRecord,
  entityType: QboSyncEntity | 'BankTransaction',
  rows: Record<string, unknown>[],
): AccountingEntityRecord[] {
  const now = new Date().toISOString();
  return rows.map((row) => {
    const externalId = String(row.Id ?? row.id ?? crypto.randomUUID());
    const amountRaw = row.TotalAmt ?? row.Balance ?? row.Amount ?? null;
    const amount = typeof amountRaw === 'number' ? amountRaw : amountRaw != null ? Number(amountRaw) : null;
    return {
      id: crypto.randomUUID(),
      organizationId: conn.organizationId,
      clientId: conn.clientId,
      connectionId: conn.id,
      realmId: conn.realmId,
      entityType,
      externalId,
      payload: row,
      amount: Number.isFinite(amount as number) ? (amount as number) : null,
      currency: typeof row.CurrencyRef === 'object' && row.CurrencyRef
        ? String((row.CurrencyRef as { value?: string }).value || 'USD')
        : 'USD',
      txnDate: typeof row.TxnDate === 'string' ? row.TxnDate : typeof row.MetaData === 'object' && row.MetaData
        ? String((row.MetaData as { CreateTime?: string }).CreateTime || null)
        : null,
      displayName:
        (typeof row.Name === 'string' && row.Name) ||
        (typeof row.DisplayName === 'string' && row.DisplayName) ||
        (typeof row.DocNumber === 'string' && row.DocNumber) ||
        externalId,
      provenance: 'ImportedAccounting',
      source: 'QuickBooks',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  });
}

export function buildEntitySummaries(repo: QboRepository, conn: QboConnectionRecord): QboEntitySyncSummary[] {
  return DEFAULT_ENTITIES.map((entity) => ({
    entity,
    recordCount: repo.countEntities(conn.id, entity === 'Purchase' ? 'Purchase' : entity),
    lastCheckpoint: conn.syncCheckpoints[entity] ?? null,
    lastSyncedAt: conn.lastSyncedAt,
    status: conn.syncStatus,
    errorMessage: conn.errorMessage,
  }));
}

export function toConnectionSummary(repo: QboRepository, conn: QboConnectionRecord): QboConnectionSummary {
  const health: QboConnectionHealth = {
    healthy:
      conn.status === 'Connected' &&
      conn.oauthStatus === 'authorized' &&
      (conn.tokenStatus === 'valid' || conn.tokenStatus === 'expiring_soon') &&
      conn.consecutiveFailures < 3,
    oauthStatus: conn.oauthStatus,
    tokenStatus: conn.tokenStatus,
    syncStatus: conn.syncStatus,
    lastSuccessfulSyncAt: conn.lastSuccessfulSyncAt,
    consecutiveFailures: conn.consecutiveFailures,
    lastErrorMessage: conn.errorMessage,
  };
  return {
    connectionId: conn.id,
    company: {
      companyName: conn.companyName,
      realmId: conn.realmId,
      country: conn.country || undefined,
    },
    status: conn.status,
    oauthStatus: conn.oauthStatus,
    tokenStatus: conn.tokenStatus,
    syncStatus: conn.syncStatus,
    lastSyncedAt: conn.lastSyncedAt,
    consentRecordId: conn.consentRecordId,
    createdAt: conn.createdAt,
    health,
    entitySummaries: buildEntitySummaries(repo, conn),
    provenance: 'ImportedAccounting',
    source: 'QuickBooks',
  };
}

export interface SyncResult {
  connectionId: string;
  entitiesSynced: number;
  recordsUpserted: number;
  reportsSynced: number;
  resumed: boolean;
  incomplete: boolean;
}

/**
 * Incremental sync with CDC when checkpoint exists; full query bootstrap otherwise.
 * Supports resume via syncResume pointer after interruption.
 */
export async function syncConnection(
  repo: QboRepository,
  cfg: AppConfig,
  connectionId: string,
  options?: { entities?: QboSyncEntity[]; resume?: boolean },
): Promise<SyncResult> {
  const { accessToken, connection: fresh } = await ensureFreshTokens(repo, cfg, connectionId);
  let conn = fresh;

  const entities =
    options?.entities && options.entities.length > 0
      ? options.entities
      : conn.syncResume?.entities && options?.resume !== false
        ? conn.syncResume.entities
        : DEFAULT_ENTITIES;

  const startIndex =
    options?.resume !== false && conn.syncResume && conn.syncResume.entities.join() === entities.join()
      ? conn.syncResume.nextEntityIndex
      : 0;

  const runId = conn.syncResume?.runId || crypto.randomUUID();
  const resumed = startIndex > 0;

  audit({
    action: resumed ? 'sync_resumed' : 'sync_started',
    organizationId: conn.organizationId,
    clientId: conn.clientId,
    connectionId: conn.id,
    realmIdRedacted: redactRealmId(conn.realmId),
    outcome: 'success',
    detail: `runId=${runId};from=${startIndex};entities=${entities.length}`,
  });

  conn = {
    ...conn,
    status: 'Syncing',
    syncStatus: 'running',
    syncResume: { runId, nextEntityIndex: startIndex, entities, startedAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
  repo.upsertConnection(conn);

  const client = createApiClient(cfg, conn.realmId, accessToken);
  let recordsUpserted = 0;
  let entitiesSynced = 0;
  let reportsSynced = 0;

  try {
    // Refresh company metadata
    try {
      const info = await withRetry(() => client.getCompanyInfo());
      conn = {
        ...conn,
        companyName: info.CompanyName || conn.companyName,
        country: info.Country || conn.country,
      };
    } catch {
      /* keep existing */
    }

    for (let i = startIndex; i < entities.length; i++) {
      const entity = entities[i];
      const checkpoint = conn.syncCheckpoints[entity];

      if (
        entity === 'ProfitAndLoss' ||
        entity === 'BalanceSheet' ||
        entity === 'CashFlow' ||
        entity === 'GeneralLedger'
      ) {
        const reportName =
          entity === 'ProfitAndLoss'
            ? 'ProfitAndLoss'
            : entity === 'BalanceSheet'
              ? 'BalanceSheet'
              : entity === 'CashFlow'
                ? 'CashFlow'
                : 'GeneralLedger';
        const payload = await withRetry(() =>
          client.report(reportName, { accounting_method: 'Accrual' }),
        );
        const now = new Date().toISOString();
        repo.saveReport({
          id: crypto.randomUUID(),
          organizationId: conn.organizationId,
          clientId: conn.clientId,
          connectionId: conn.id,
          reportType: entity,
          asOf: now,
          payload,
          provenance: 'ImportedAccounting',
          source: 'QuickBooks',
          createdAt: now,
        });
        reportsSynced += 1;
        entitiesSynced += 1;
        conn.syncCheckpoints = { ...conn.syncCheckpoints, [entity]: now };
      } else if (checkpoint && CDC_ENTITIES.includes(entity as (typeof CDC_ENTITIES)[number])) {
        const cdc = await withRetry(() =>
          client.cdc([entity], checkpoint),
        );
        const queryResponse = (cdc.QueryResponse || cdc.CDCResponse || cdc) as Record<string, unknown>;
        // CDC may nest under CDCResponse[0].QueryResponse
        let rows: Record<string, unknown>[] = [];
        const cdcResp = asArray((cdc as { CDCResponse?: unknown }).CDCResponse);
        if (cdcResp.length) {
          for (const block of cdcResp) {
            const qr = (block.QueryResponse || {}) as Record<string, unknown>;
            rows = rows.concat(asArray(qr[entity]));
          }
        } else {
          rows = asArray(queryResponse[entity]);
        }
        const mapped = mapEntityRows(conn, entity, rows);
        // Purchases double as bank-side spend for Bank Transactions lineage
        if (entity === 'Purchase' || entity === 'Deposit') {
          const bankMapped = mapEntityRows(conn, 'BankTransaction', rows);
          repo.upsertEntities([...mapped, ...bankMapped]);
          recordsUpserted += mapped.length + bankMapped.length;
        } else {
          repo.upsertEntities(mapped);
          recordsUpserted += mapped.length;
        }
        entitiesSynced += 1;
        conn.syncCheckpoints = {
          ...conn.syncCheckpoints,
          [entity]: new Date().toISOString(),
        };
      } else {
        const q = QUERY_ENTITIES.find((x) => x.entity === entity);
        if (q) {
          const result = await withRetry(() => client.query(q.select));
          const qr = (result.QueryResponse || {}) as Record<string, unknown>;
          const rows = asArray(qr[entity]);
          const mapped = mapEntityRows(conn, entity, rows);
          if (entity === 'Purchase' || entity === 'Deposit') {
            const bankMapped = mapEntityRows(conn, 'BankTransaction', rows);
            repo.upsertEntities([...mapped, ...bankMapped]);
            recordsUpserted += mapped.length + bankMapped.length;
          } else {
            repo.upsertEntities(mapped);
            recordsUpserted += mapped.length;
          }
          entitiesSynced += 1;
          conn.syncCheckpoints = {
            ...conn.syncCheckpoints,
            [entity]: new Date().toISOString(),
          };
        }
      }

      conn.syncResume = {
        runId,
        nextEntityIndex: i + 1,
        entities,
        startedAt: conn.syncResume?.startedAt || new Date().toISOString(),
      };
      conn.updatedAt = new Date().toISOString();
      repo.upsertConnection(conn);
    }

    const now = new Date().toISOString();
    const completed: QboConnectionRecord = {
      ...conn,
      status: 'Connected',
      syncStatus: 'succeeded',
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
      consecutiveFailures: 0,
      errorCode: null,
      errorMessage: null,
      syncResume: null,
      updatedAt: now,
    };
    repo.upsertConnection(completed);

    audit({
      action: 'sync_completed',
      organizationId: completed.organizationId,
      clientId: completed.clientId,
      connectionId: completed.id,
      realmIdRedacted: redactRealmId(completed.realmId),
      outcome: 'success',
      detail: `entities=${entitiesSynced};records=${recordsUpserted};reports=${reportsSynced}`,
    });

    return {
      connectionId,
      entitiesSynced,
      recordsUpserted,
      reportsSynced,
      resumed,
      incomplete: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sync_failed';
    const needsReauth = /401|invalid_grant|token/i.test(message);
    const failed: QboConnectionRecord = {
      ...conn,
      status: needsReauth ? 'NeedsReauthorization' : 'Error',
      oauthStatus: needsReauth ? 'expired' : conn.oauthStatus,
      syncStatus: 'interrupted',
      consecutiveFailures: conn.consecutiveFailures + 1,
      errorCode: 'SYNC_ERROR',
      errorMessage: 'Synchronization failed — may resume from checkpoint',
      updatedAt: new Date().toISOString(),
      // Keep syncResume so interrupted syncs can resume
    };
    repo.upsertConnection(failed);
    audit({
      action: 'sync_failure',
      organizationId: conn.organizationId,
      clientId: conn.clientId,
      connectionId: conn.id,
      realmIdRedacted: redactRealmId(conn.realmId),
      outcome: 'failure',
      detail: message.slice(0, 200),
    });
    throw err;
  }
}
