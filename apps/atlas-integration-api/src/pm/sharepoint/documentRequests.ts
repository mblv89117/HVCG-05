/**
 * Governed document-request overlay. Metadata only — no file bytes in Atlas.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { assertWritableClientCode } from './knowledgeClassification.ts';

export const DOCUMENT_REQUESTS_FILENAME = 'client-document-requests.json';

export type DocumentRequestRecord = {
  id: string;
  clientCode: string;
  title: string;
  status: 'requested' | 'received' | 'cancelled';
  createdAt: string;
  createdBy: string;
  provenance: 'hub_governed_overlay';
  binariesInAtlas: false;
};

type Store = { requests: DocumentRequestRecord[] };

function emptyStore(): Store {
  return { requests: [] };
}

function storePath(dataDir: string): string {
  return join(dataDir, DOCUMENT_REQUESTS_FILENAME);
}

function loadStore(dataDir: string): Store {
  const path = storePath(dataDir);
  if (!existsSync(path)) return emptyStore();
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<Store>;
    const requests = Array.isArray(parsed.requests) ? parsed.requests : [];
    return {
      requests: requests.filter(
        (row) =>
          row &&
          typeof row.id === 'string' &&
          isCanonicalClientCode(row.clientCode) &&
          row.binariesInAtlas === false &&
          row.provenance === 'hub_governed_overlay',
      ),
    };
  } catch {
    return emptyStore();
  }
}

function saveStore(dataDir: string, store: Store): void {
  const path = storePath(dataDir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

export function listDocumentRequests(dataDir: string, clientCode: string): DocumentRequestRecord[] {
  if (!isCanonicalClientCode(clientCode)) return [];
  return loadStore(dataDir).requests.filter((row) => row.clientCode === clientCode);
}

export function createDocumentRequest(
  dataDir: string,
  input: { clientCode: string; title: string; createdBy: string },
): DocumentRequestRecord {
  assertWritableClientCode(input.clientCode, 'document-request create');
  const title = input.title.trim().slice(0, 200);
  if (!title) {
    throw new Error('title_required');
  }
  const record: DocumentRequestRecord = {
    id: randomUUID(),
    clientCode: input.clientCode,
    title,
    status: 'requested',
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    provenance: 'hub_governed_overlay',
    binariesInAtlas: false,
  };
  const store = loadStore(dataDir);
  store.requests.push(record);
  saveStore(dataDir, store);
  return record;
}
