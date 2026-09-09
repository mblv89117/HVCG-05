import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';

export type StoredIngest = {
  receivedAt: string;
  keyId: string;
  envelope: AtlasIntegrationEnvelope;
};

type StoreFile = { byIdempotencyKey: Record<string, StoredIngest> };

function storePath(dataDir: string): string {
  return join(dataDir, 'module-ingest', 'events.json');
}

export function loadIngestStore(dataDir: string): StoreFile {
  const p = storePath(dataDir);
  if (!existsSync(p)) return { byIdempotencyKey: {} };
  try {
    const raw = JSON.parse(readFileSync(p, 'utf8')) as StoreFile;
    return raw?.byIdempotencyKey ? raw : { byIdempotencyKey: {} };
  } catch {
    return { byIdempotencyKey: {} };
  }
}

export function saveIngestStore(dataDir: string, store: StoreFile): void {
  mkdirSync(join(dataDir, 'module-ingest'), { recursive: true });
  writeFileSync(storePath(dataDir), JSON.stringify(store, null, 2), 'utf8');
}

export function upsertIngest(opts: {
  dataDir: string;
  keyId: string;
  envelope: AtlasIntegrationEnvelope;
}): { replay: boolean; record: StoredIngest } {
  const store = loadIngestStore(opts.dataDir);
  const key = opts.envelope.idempotencyKey;
  const existing = store.byIdempotencyKey[key];
  if (existing) return { replay: true, record: existing };
  const record: StoredIngest = {
    receivedAt: new Date().toISOString(),
    keyId: opts.keyId,
    envelope: opts.envelope,
  };
  store.byIdempotencyKey[key] = record;
  saveIngestStore(opts.dataDir, store);
  return { replay: false, record };
}
