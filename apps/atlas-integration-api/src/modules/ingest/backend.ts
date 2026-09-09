/**
 * Module ingest persistence backends.
 * - development-json: local events.json (tests / explicit local only)
 * - azure-table: durable Azure Table Storage (production)
 *
 * Production must not silently fall back to JSON.
 */
import type { AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';
import { upsertIngestJson, type StoredIngest } from './store.ts';
import {
  resolveAzureTableIngestConfig,
  upsertIngestAzureTable,
} from './azureTableStore.ts';

export type ModuleIngestBackend = 'development-json' | 'azure-table';

export function resolveModuleIngestBackend(
  env: NodeJS.Dict<string> = process.env,
): ModuleIngestBackend {
  const raw = (env.INTEGRATION_MODULE_INGEST_BACKEND || '').trim().toLowerCase();
  if (raw === 'azure-table' || raw === 'azure_table' || raw === 'table') {
    return 'azure-table';
  }
  if (raw === 'development-json' || raw === 'json' || raw === 'local-json') {
    return 'development-json';
  }
  if ((env.NODE_ENV || '').toLowerCase() === 'production') {
    return 'azure-table';
  }
  return 'development-json';
}

export function assertModuleIngestBackendSafe(
  backend: ModuleIngestBackend,
  env: NodeJS.Dict<string> = process.env,
): void {
  const isProd = (env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProd && backend === 'development-json') {
    throw new Error(
      'Unsafe configuration: INTEGRATION_MODULE_INGEST_BACKEND=development-json is not allowed when NODE_ENV=production',
    );
  }
}

export async function upsertModuleIngest(opts: {
  backend: ModuleIngestBackend;
  dataDir: string;
  keyId: string;
  envelope: AtlasIntegrationEnvelope;
  env?: NodeJS.Dict<string>;
}): Promise<{ replay: boolean; record: StoredIngest }> {
  assertModuleIngestBackendSafe(opts.backend, opts.env ?? process.env);

  if (opts.backend === 'development-json') {
    return upsertIngestJson({
      dataDir: opts.dataDir,
      keyId: opts.keyId,
      envelope: opts.envelope,
    });
  }

  const tableCfg = resolveAzureTableIngestConfig(opts.env ?? process.env);
  if (!tableCfg) {
    throw new Error('MODULE_INGEST_AZURE_TABLE_UNCONFIGURED');
  }
  return upsertIngestAzureTable({
    cfg: tableCfg,
    keyId: opts.keyId,
    envelope: opts.envelope,
  });
}
