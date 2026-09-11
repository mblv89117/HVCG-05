/**
 * Durable Azure Table Storage backend for module ingest.
 * PartitionKey = clientCode (tenant isolation).
 * RowKey = sanitized idempotency key.
 *
 * SharedKeyLite signs CanonicalizedResource ONLY (no $filter/$top/continuation
 * query parameters). Request URL may still carry those query params.
 */
import { createHmac } from 'node:crypto';
import type { AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';
import type { StoredIngest } from './store.ts';

const TABLE_API = '2021-04-10';
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_MAX_ROWS = 500;

export type AzureTableIngestConfig = {
  accountName: string;
  accountKey: string;
  tableName: string;
};

export type AzureTableListSuccess = {
  status: 'SUCCESS_WITH_ROWS' | 'SUCCESS_EMPTY';
  records: StoredIngest[];
  truncated: boolean;
  pageCount: number;
  httpStatus: 200;
};

export type AzureTableListError = {
  status: 'UNAVAILABLE' | 'ERROR';
  records: [];
  truncated: false;
  pageCount: number;
  httpStatus: number;
  reason: string;
};

export type AzureTableListResult = AzureTableListSuccess | AzureTableListError;

function sanitizeRowKey(raw: string): string {
  return raw.replace(/[\\/#?\u0000-\u001f]/g, '_').slice(0, 1024);
}

/** Resource path that SharedKeyLite signs — never includes OData/query strings. */
export function canonicalResourcePathForSignature(resourcePath: string): string {
  const q = resourcePath.indexOf('?');
  return q === -1 ? resourcePath : resourcePath.slice(0, q);
}

export function buildSharedKeyLiteStringToSign(opts: {
  accountName: string;
  date: string;
  signedResourcePath: string;
}): string {
  const resource = canonicalResourcePathForSignature(opts.signedResourcePath);
  const canonicalizedResource = `/${opts.accountName}/${resource}`;
  return `${opts.date}\n${canonicalizedResource}`;
}

export function buildSharedKeyLiteAuthorization(opts: {
  accountName: string;
  accountKey: string;
  date: string;
  signedResourcePath: string;
}): { authorization: string; stringToSign: string; signedResourcePath: string } {
  const signedResourcePath = canonicalResourcePathForSignature(opts.signedResourcePath);
  const stringToSign = buildSharedKeyLiteStringToSign({
    accountName: opts.accountName,
    date: opts.date,
    signedResourcePath,
  });
  const sig = createHmac('sha256', Buffer.from(opts.accountKey, 'base64'))
    .update(stringToSign, 'utf8')
    .digest('base64');
  return {
    authorization: `SharedKeyLite ${opts.accountName}:${sig}`,
    stringToSign,
    signedResourcePath,
  };
}

type TableResponse = {
  status: number;
  json: unknown;
  headers: Headers;
};

async function tableRequest(
  cfg: AzureTableIngestConfig,
  method: string,
  opts: {
    /** Path (+ optional query) used for the HTTP request URL. */
    requestPath: string;
    /** Path signed by SharedKeyLite (table or entity only; no query). */
    signedResourcePath: string;
    body?: unknown;
  },
): Promise<TableResponse> {
  const date = new Date().toUTCString();
  const auth = buildSharedKeyLiteAuthorization({
    accountName: cfg.accountName,
    accountKey: cfg.accountKey,
    date,
    signedResourcePath: opts.signedResourcePath,
  });
  const headers: Record<string, string> = {
    Accept: 'application/json;odata=nometadata',
    'x-ms-date': date,
    'x-ms-version': TABLE_API,
    Authorization: auth.authorization,
    DataServiceVersion: '3.0',
    MaxDataServiceVersion: '3.0',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`https://${cfg.accountName}.table.core.windows.net/${opts.requestPath}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
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
  return { status: res.status, json, headers: res.headers };
}

function entityPath(table: string, partitionKey: string, rowKey: string): string {
  const pk = encodeURIComponent(partitionKey).replace(/'/g, "''");
  const rk = encodeURIComponent(rowKey).replace(/'/g, "''");
  return `${table}(PartitionKey='${pk}',RowKey='${rk}')`;
}

function parseStoredRows(value: unknown): StoredIngest[] {
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

export async function upsertIngestAzureTable(opts: {
  cfg: AzureTableIngestConfig;
  keyId: string;
  envelope: AtlasIntegrationEnvelope;
}): Promise<{ replay: boolean; record: StoredIngest }> {
  const clientCode = opts.envelope.clientCode;
  const rowKey = sanitizeRowKey(opts.envelope.idempotencyKey);
  const path = entityPath(opts.cfg.tableName, clientCode, rowKey);

  const existing = await tableRequest(opts.cfg, 'GET', {
    requestPath: path,
    signedResourcePath: path,
  });
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

  const insert = await tableRequest(opts.cfg, 'POST', {
    requestPath: opts.cfg.tableName,
    signedResourcePath: opts.cfg.tableName,
    body: entity,
  });
  if (insert.status === 201 || insert.status === 204) {
    return { replay: false, record };
  }
  if (insert.status === 409) {
    const again = await tableRequest(opts.cfg, 'GET', {
      requestPath: path,
      signedResourcePath: path,
    });
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

function continuationFromHeaders(headers: Headers): { NextPartitionKey?: string; NextRowKey?: string } | null {
  const npk = headers.get('x-ms-continuation-NextPartitionKey');
  const nrk = headers.get('x-ms-continuation-NextRowKey');
  if (!npk && !nrk) return null;
  const out: { NextPartitionKey?: string; NextRowKey?: string } = {};
  if (npk) out.NextPartitionKey = npk;
  if (nrk) out.NextRowKey = nrk;
  return out;
}

/**
 * List durable ingest rows for a ClientCode.
 * Uses continuation tokens until exhausted or maxRows safety ceiling.
 * Never collapses auth/5xx into an empty-success result.
 */
export async function listIngestsByClientCode(opts: {
  cfg: AzureTableIngestConfig;
  clientCode: string;
  pageSize?: number;
  maxRows?: number;
}): Promise<AzureTableListResult> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? DEFAULT_PAGE_SIZE, 1), 1000);
  const maxRows = Math.min(Math.max(opts.maxRows ?? DEFAULT_MAX_ROWS, pageSize), 5000);
  const filter = encodeURIComponent(`PartitionKey eq '${opts.clientCode.replace(/'/g, "''")}'`);
  const signedResourcePath = opts.cfg.tableName;

  const records: StoredIngest[] = [];
  let pageCount = 0;
  let continuation: { NextPartitionKey?: string; NextRowKey?: string } | null = null;
  let truncated = false;

  while (records.length < maxRows) {
    const take = Math.min(pageSize, maxRows - records.length);
    let requestPath = `${opts.cfg.tableName}?$filter=${filter}&$top=${take}`;
    if (continuation?.NextPartitionKey) {
      requestPath += `&NextPartitionKey=${encodeURIComponent(continuation.NextPartitionKey)}`;
    }
    if (continuation?.NextRowKey) {
      requestPath += `&NextRowKey=${encodeURIComponent(continuation.NextRowKey)}`;
    }

    let listed: TableResponse;
    try {
      listed = await tableRequest(opts.cfg, 'GET', {
        requestPath,
        signedResourcePath,
      });
    } catch (err) {
      return {
        status: 'UNAVAILABLE',
        records: [],
        truncated: false,
        pageCount,
        httpStatus: 0,
        reason: err instanceof Error ? err.message : 'azure_table_fetch_failed',
      };
    }

    pageCount += 1;
    if (listed.status === 401 || listed.status === 403) {
      return {
        status: 'ERROR',
        records: [],
        truncated: false,
        pageCount,
        httpStatus: listed.status,
        reason: `azure_table_auth_failed:${listed.status}`,
      };
    }
    if (listed.status === 500 || listed.status === 503 || listed.status >= 400) {
      return {
        status: listed.status >= 500 ? 'UNAVAILABLE' : 'ERROR',
        records: [],
        truncated: false,
        pageCount,
        httpStatus: listed.status,
        reason: `azure_table_http_${listed.status}`,
      };
    }
    if (listed.status !== 200 || !listed.json || typeof listed.json !== 'object') {
      return {
        status: 'ERROR',
        records: [],
        truncated: false,
        pageCount,
        httpStatus: listed.status,
        reason: `azure_table_unexpected_status:${listed.status}`,
      };
    }

    const pageRows = parseStoredRows((listed.json as { value?: unknown }).value);
    records.push(...pageRows);

    continuation = continuationFromHeaders(listed.headers);
    if (!continuation) break;
    if (records.length >= maxRows) {
      truncated = true;
      break;
    }
  }

  if (continuation) truncated = true;

  if (records.length === 0) {
    return {
      status: 'SUCCESS_EMPTY',
      records: [],
      truncated: false,
      pageCount,
      httpStatus: 200,
    };
  }
  return {
    status: 'SUCCESS_WITH_ROWS',
    records,
    truncated,
    pageCount,
    httpStatus: 200,
  };
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
