/**
 * Durable Azure Table Storage backend for module ingest.
 * PartitionKey = clientCode (tenant isolation).
 * RowKey = sanitized idempotency key.
 */
import { createHmac } from 'node:crypto';
import type { AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';
import type { StoredIngest } from './store.ts';

const TABLE_API = '2021-04-10';

export type AzureTableIngestConfig = {
  accountName: string;
  accountKey: string;
  tableName: string;
};

function sanitizeRowKey(raw: string): string {
  return raw.replace(/[\\/#?\u0000-\u001f]/g, '_').slice(0, 1024);
}

function sharedKeyLite(
  accountName: string,
  accountKey: string,
  date: string,
  resourcePath: string,
): string {
  const canonicalizedResource = `/${accountName}/${resourcePath}`;
  const stringToSign = `${date}\n${canonicalizedResource}`;
  const sig = createHmac('sha256', Buffer.from(accountKey, 'base64'))
    .update(stringToSign, 'utf8')
    .digest('base64');
  return `SharedKeyLite ${accountName}:${sig}`;
}

async function tableRequest(
  cfg: AzureTableIngestConfig,
  method: string,
  resourcePath: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const date = new Date().toUTCString();
  const auth = sharedKeyLite(cfg.accountName, cfg.accountKey, date, resourcePath);
  const headers: Record<string, string> = {
    Accept: 'application/json;odata=nometadata',
    'x-ms-date': date,
    'x-ms-version': TABLE_API,
    Authorization: auth,
    DataServiceVersion: '3.0',
    MaxDataServiceVersion: '3.0',
  };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`https://${cfg.accountName}.table.core.windows.net/${resourcePath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 200) };
    }
  }
  return { status: res.status, json };
}

function entityPath(table: string, partitionKey: string, rowKey: string): string {
  const pk = encodeURIComponent(partitionKey).replace(/'/g, "''");
  const rk = encodeURIComponent(rowKey).replace(/'/g, "''");
  return `${table}(PartitionKey='${pk}',RowKey='${rk}')`;
}

export async function upsertIngestAzureTable(opts: {
  cfg: AzureTableIngestConfig;
  keyId: string;
  envelope: AtlasIntegrationEnvelope;
}): Promise<{ replay: boolean; record: StoredIngest }> {
  const clientCode = opts.envelope.clientCode;
  const rowKey = sanitizeRowKey(opts.envelope.idempotencyKey);
  const path = entityPath(opts.cfg.tableName, clientCode, rowKey);

  const existing = await tableRequest(opts.cfg, 'GET', path);
  if (existing.status === 200 && existing.json && typeof existing.json === 'object') {
    const row = existing.json as Record<string, unknown>;
    if (row.envelopeJson) {
      return {
        replay: true,
        record: {
          receivedAt: String(row.receivedAt || ''),
          keyId: String(row.keyId || ''),
          envelope: JSON.parse(String(row.envelopeJson)) as AtlasIntegrationEnvelope,
        },
      };
    }
  }

  const record: StoredIngest = {
    receivedAt: new Date().toISOString(),
    keyId: opts.keyId,
    envelope: opts.envelope,
  };

  const entity = {
    PartitionKey: clientCode,
    RowKey: rowKey,
    receivedAt: record.receivedAt,
    keyId: record.keyId,
    eventType: opts.envelope.eventType,
    source: opts.envelope.source,
    correlationId: opts.envelope.correlationId,
    authorityClass: opts.envelope.authorityClass,
    envelopeJson: JSON.stringify(opts.envelope),
  };

  const insert = await tableRequest(opts.cfg, 'POST', opts.cfg.tableName, entity);
  if (insert.status === 201 || insert.status === 204) {
    return { replay: false, record };
  }
  if (insert.status === 409) {
    const again = await tableRequest(opts.cfg, 'GET', path);
    if (again.status === 200 && again.json && typeof again.json === 'object') {
      const row = again.json as Record<string, unknown>;
      return {
        replay: true,
        record: {
          receivedAt: String(row.receivedAt || record.receivedAt),
          keyId: String(row.keyId || opts.keyId),
          envelope: JSON.parse(String(row.envelopeJson || JSON.stringify(opts.envelope))),
        },
      };
    }
  }
  throw new Error(`MODULE_INGEST_DURABLE_WRITE_FAILED:${insert.status}`);
}


export async function listIngestsByClientCode(opts: {
  cfg: AzureTableIngestConfig;
  clientCode: string;
  maxItems?: number;
}): Promise<StoredIngest[]> {
  const maxItems = Math.min(Math.max(opts.maxItems ?? 50, 1), 200);
  const filter = encodeURIComponent(`PartitionKey eq '${opts.clientCode.replace(/'/g, "''")}'`);
  const resourcePath = `${opts.cfg.tableName}?$filter=${filter}&$top=${maxItems}`;
  const listed = await tableRequest(opts.cfg, 'GET', resourcePath);
  if (listed.status !== 200 || !listed.json || typeof listed.json !== 'object') {
    return [];
  }
  const value = (listed.json as { value?: unknown }).value;
  if (!Array.isArray(value)) return [];
  const out: StoredIngest[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') continue;
    const rec = row as Record<string, unknown>;
    if (!rec.envelopeJson) continue;
    try {
      out.push({
        receivedAt: String(rec.receivedAt || ''),
        keyId: String(rec.keyId || ''),
        envelope: JSON.parse(String(rec.envelopeJson)) as AtlasIntegrationEnvelope,
      });
    } catch {
      // skip corrupt durable rows; fail closed for that row only
    }
  }
  return out;
}

export function resolveAzureTableIngestConfig(
  env: NodeJS.Dict<string> = process.env,
): AzureTableIngestConfig | null {
  const accountName = (env.INTEGRATION_MODULE_INGEST_STORAGE_ACCOUNT || '').trim();
  const accountKey = (env.INTEGRATION_MODULE_INGEST_STORAGE_KEY || '').trim();
  const tableName = (env.INTEGRATION_MODULE_INGEST_TABLE || 'AtlasModuleIngestEvents').trim();
  if (!accountName || !accountKey || !tableName) return null;
  return { accountName, accountKey, tableName };
}
