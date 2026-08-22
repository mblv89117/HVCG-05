/**
 * Entitled attention items from governed document-request overlay.
 * SYNQA is labeled and never counted as a real customer operationalization.
 */

import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { classifyHubClientRow, isSyntheticQaClient } from './knowledgeClassification.ts';
import { listDocumentRequests, type DocumentRequestRecord } from './documentRequests.ts';

export type AttentionClassification = 'SYNTHETIC_QA' | 'CLIENT';

export type ClientAttentionItem = {
  id: string;
  clientCode: string;
  title: string;
  kind: 'document_request';
  queue: 'Needs Action' | 'Waiting';
  status: DocumentRequestRecord['status'];
  href: string;
  provenance: 'CONFIRMED';
  source: 'hub_governed_overlay';
  classification: AttentionClassification;
  invented: false;
  binariesInAtlas: false;
};

export function attentionClassification(clientCode: string): AttentionClassification {
  return isSyntheticQaClient(clientCode) || classifyHubClientRow({ clientCode }).entityKind === 'synthetic_qa'
    ? 'SYNTHETIC_QA'
    : 'CLIENT';
}

export function attentionFromDocumentRequest(row: DocumentRequestRecord): ClientAttentionItem | null {
  if (!isCanonicalClientCode(row.clientCode)) return null;
  if (row.status === 'cancelled' || row.status === 'received') return null;
  return {
    id: row.id,
    clientCode: row.clientCode,
    title: row.title,
    kind: 'document_request',
    queue: 'Needs Action',
    status: row.status,
    href: `/api/pm/clients/${row.clientCode}/document-requests`,
    provenance: 'CONFIRMED',
    source: 'hub_governed_overlay',
    classification: attentionClassification(row.clientCode),
    invented: false,
    binariesInAtlas: false,
  };
}

export function listClientAttention(dataDir: string, clientCode: string): ClientAttentionItem[] {
  if (!isCanonicalClientCode(clientCode)) return [];
  return listDocumentRequests(dataDir, clientCode)
    .map(attentionFromDocumentRequest)
    .filter((row): row is ClientAttentionItem => Boolean(row));
}

export function listEntitledAttention(dataDir: string, clientCodes: string[]): ClientAttentionItem[] {
  const seen = new Set<string>();
  const out: ClientAttentionItem[] = [];
  for (const code of clientCodes) {
    if (!isCanonicalClientCode(code) || seen.has(code)) continue;
    seen.add(code);
    out.push(...listClientAttention(dataDir, code));
  }
  return out;
}

export function realClientsNeedingAttention(items: ClientAttentionItem[]): string[] {
  return [...new Set(items.filter((row) => row.classification === 'CLIENT').map((row) => row.clientCode))].sort();
}
