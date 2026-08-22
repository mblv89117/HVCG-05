/**
 * Governed document-request overlay. Metadata only — no file bytes in Atlas.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { assertWritableClientCode } from './knowledgeClassification.ts';

export const DOCUMENT_REQUESTS_FILENAME = 'client-document-requests.json';

export const DOCUMENT_REQUEST_STATUSES = ['requested', 'received', 'cancelled'] as const;
export type DocumentRequestStatus = (typeof DOCUMENT_REQUEST_STATUSES)[number];

export type DocumentRequestRecord = {
  id: string;
  clientCode: string;
  title: string;
  status: DocumentRequestStatus;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  provenance: 'hub_governed_overlay';
  binariesInAtlas: false;
};

export function isDocumentRequestStatus(value: unknown): value is DocumentRequestStatus {
  return typeof value === 'string' && (DOCUMENT_REQUEST_STATUSES as readonly string[]).includes(value);
}

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

export function updateDocumentRequest(
  dataDir: string,
  input: { clientCode: string; id: string; status: DocumentRequestStatus; updatedBy: string },
): DocumentRequestRecord | undefined {
  if (!isCanonicalClientCode(input.clientCode) || !input.id.trim()) return undefined;
  assertWritableClientCode(input.clientCode, 'document-request update');
  if (!isDocumentRequestStatus(input.status)) return undefined;
  const store = loadStore(dataDir);
  const row = store.requests.find((item) => item.id === input.id && item.clientCode === input.clientCode);
  if (!row) return undefined;
  row.status = input.status;
  row.updatedAt = new Date().toISOString();
  row.updatedBy = input.updatedBy;
  saveStore(dataDir, store);
  return row;
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
