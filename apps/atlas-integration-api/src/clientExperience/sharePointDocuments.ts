/**
 * Real production client-document persistence.
 *
 * Approved backing store: SharePoint HVCG_DocumentRequests via the existing
 * Capital Graph allowlist (Lists.SelectedOperations.Selected). This is not the
 * SYNQA JSON overlay, not in-memory Hub state, and not a generated ID without
 * a durable item.
 *
 * Writes are isolated by ClientCode. Foreign ClientCode reads fail closed.
 * Does not provision libraries or touch another client's workspace.
 */

import { createHash, randomBytes } from 'node:crypto';
import { isCanonicalClientCode } from '../entitlements/clientCode.ts';
import { assertWritableClientCode } from '../pm/sharepoint/knowledgeClassification.ts';
import type { CapitalGraphTransport, GraphListItem } from '../capital/sharepoint/graph.ts';

export const SHAREPOINT_DOCUMENT_PROVENANCE = 'sharepoint_list_HVCG_DocumentRequests' as const;
export const OVERLAY_DOCUMENT_PROVENANCE = 'synthetic_qa_overlay' as const;
export const SHAREPOINT_DOCUMENT_LIST = 'HVCG_DocumentRequests' as const;
export const SHAREPOINT_LIST_TEXT_MAX = 60_000;
export const CX_DOCUMENT_KEY_PREFIX = 'cx-doc|';

export type ClientDocumentPersistenceClass =
  | typeof SHAREPOINT_DOCUMENT_PROVENANCE
  | 'hub_governed_overlay_SYNQA';

export type PersistedClientDocument = {
  itemId: string;
  clientCode: string;
  fileName: string;
  contentType: string;
  bytes: number;
  contentSha256: string;
  contentB64: string;
  provenance: typeof SHAREPOINT_DOCUMENT_PROVENANCE;
  persistenceClass: typeof SHAREPOINT_DOCUMENT_PROVENANCE;
  sharePointList: typeof SHAREPOINT_DOCUMENT_LIST;
};

export interface ClientDocumentBackingStore {
  readonly persistenceClass: typeof SHAREPOINT_DOCUMENT_PROVENANCE;
  readonly sharePointList: typeof SHAREPOINT_DOCUMENT_LIST;
  put(input: {
    clientCode: string;
    documentId: string;
    fileName: string;
    contentType: string;
    bytes: Buffer;
  }): Promise<PersistedClientDocument>;
  get(input: { clientCode: string; itemId: string }): Promise<PersistedClientDocument>;
}

export function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function asUtf8OrThrow(bytes: Buffer): string {
  const text = bytes.toString('utf8');
  const roundTrip = Buffer.from(text, 'utf8');
  if (roundTrip.length !== bytes.length || !roundTrip.equals(bytes)) {
    const err = new Error('SharePoint list persistence accepts UTF-8 certification text only.') as Error & {
      status: number;
      code: string;
    };
    err.status = 400;
    err.code = 'invalid_document';
    throw err;
  }
  return text;
}

function fail(status: number, code: string, message: string): never {
  const err = new Error(message) as Error & { status: number; code: string };
  err.status = status;
  err.code = code;
  throw err;
}

function assertClient(clientCode: string): string {
  if (!isCanonicalClientCode(clientCode) || clientCode === '*') fail(404, 'not_found', 'not_found');
  assertWritableClientCode(clientCode, 'client document persistence');
  return clientCode;
}

function fieldsFromItem(item: GraphListItem): Record<string, unknown> {
  return item.fields && typeof item.fields === 'object' ? item.fields : {};
}

function fieldString(fields: Record<string, unknown>, name: string): string {
  const value = fields[name];
  return typeof value === 'string' ? value : '';
}

function contentFromFields(fields: Record<string, unknown>, fileName: string): string {
  const notes = fieldString(fields, 'Notes');
  if (notes) return notes;
  const description = fieldString(fields, 'Description');
  if (description) return description;
  const title = fieldString(fields, 'Title');
  const marker = ' :: ';
  if (title.includes(marker)) return title.slice(title.indexOf(marker) + marker.length);
  if (title && title !== fileName) return title;
  fail(404, 'not_found', 'SharePoint document content was not found.');
}

function toPersisted(item: GraphListItem, expectedClientCode: string): PersistedClientDocument {
  const fields = fieldsFromItem(item);
  const clientCode = fieldString(fields, 'ClientCode');
  if (!clientCode || clientCode !== expectedClientCode) {
    fail(403, 'forbidden', 'SharePoint document does not belong to the authorized client.');
  }
  const key = fieldString(fields, 'TemplateItemKey') || fieldString(fields, 'HVCG_IdempotencyKey');
  if (!key.startsWith(CX_DOCUMENT_KEY_PREFIX)) {
    fail(404, 'not_found', 'SharePoint document is not a client-experience persistence object.');
  }
  const fileName = fieldString(fields, 'Title') || 'upload.txt';
  const text = contentFromFields(fields, fileName);
  const bytes = Buffer.from(text, 'utf8');
  return {
    itemId: item.id,
    clientCode,
    fileName,
    contentType: 'text/plain; charset=utf-8',
    bytes: bytes.length,
    contentSha256: sha256Hex(bytes),
    contentB64: bytes.toString('base64'),
    provenance: SHAREPOINT_DOCUMENT_PROVENANCE,
    persistenceClass: SHAREPOINT_DOCUMENT_PROVENANCE,
    sharePointList: SHAREPOINT_DOCUMENT_LIST,
  };
}

export function createMemoryClientDocumentStore(): ClientDocumentBackingStore {
  const items = new Map<string, { clientCode: string; fileName: string; contentType: string; bytes: Buffer }>();
  return {
    persistenceClass: SHAREPOINT_DOCUMENT_PROVENANCE,
    sharePointList: SHAREPOINT_DOCUMENT_LIST,
    async put(input) {
      const clientCode = assertClient(input.clientCode);
      if (input.bytes.length > SHAREPOINT_LIST_TEXT_MAX) {
        fail(400, 'invalid_document', 'Document exceeds the SharePoint list text limit.');
      }
      const text = asUtf8OrThrow(input.bytes);
      const itemId = `sp_${randomBytes(8).toString('hex')}`;
      items.set(itemId, {
        clientCode,
        fileName: input.fileName,
        contentType: input.contentType,
        bytes: Buffer.from(text, 'utf8'),
      });
      return toPersisted(
        {
          id: itemId,
          etag: '"1"',
          fields: {
            Title: input.fileName,
            ClientCode: clientCode,
            TemplateItemKey: `${CX_DOCUMENT_KEY_PREFIX}${clientCode}|${input.documentId}`,
            HVCG_IdempotencyKey: `${CX_DOCUMENT_KEY_PREFIX}${clientCode}|${input.documentId}`,
            Notes: text,
          },
        },
        clientCode,
      );
    },
    async get(input) {
      const clientCode = assertClient(input.clientCode);
      const row = items.get(input.itemId);
      if (!row) fail(404, 'not_found', 'not_found');
      if (row.clientCode !== clientCode) {
        fail(403, 'forbidden', 'SharePoint document does not belong to the authorized client.');
      }
      return toPersisted(
        {
          id: input.itemId,
          etag: '"1"',
          fields: {
            Title: row.fileName,
            ClientCode: row.clientCode,
            TemplateItemKey: `${CX_DOCUMENT_KEY_PREFIX}${row.clientCode}|${input.itemId}`,
            Notes: row.bytes.toString('utf8'),
          },
        },
        clientCode,
      );
    },
  };
}

export function createGraphClientDocumentStore(opts: {
  graph: CapitalGraphTransport;
  listId: string;
}): ClientDocumentBackingStore {
  const listId = opts.listId.trim();
  if (!listId) fail(503, 'persistence_unavailable', 'SharePoint document list is not configured.');

  async function writeWithNotes(
    clientCode: string,
    documentId: string,
    fileName: string,
    text: string,
    includeNotes: boolean,
  ): Promise<GraphListItem> {
    const fields: Record<string, unknown> = {
      Title: includeNotes ? fileName.slice(0, 255) : `${fileName.slice(0, 80)} :: ${text}`.slice(0, 255),
      ClientCode: clientCode,
      RequestStatus: 'Received',
      TemplateItemKey: `${CX_DOCUMENT_KEY_PREFIX}${clientCode}|${documentId}`,
      HVCG_IdempotencyKey: `${CX_DOCUMENT_KEY_PREFIX}${clientCode}|${documentId}`,
      DocumentCategory: 'Other',
      DateReceived: new Date().toISOString(),
    };
    if (includeNotes) fields.Notes = text;
    return opts.graph.createItem(listId, fields);
  }

  return {
    persistenceClass: SHAREPOINT_DOCUMENT_PROVENANCE,
    sharePointList: SHAREPOINT_DOCUMENT_LIST,
    async put(input) {
      const clientCode = assertClient(input.clientCode);
      if (input.bytes.length > SHAREPOINT_LIST_TEXT_MAX) {
        fail(400, 'invalid_document', 'Document exceeds the SharePoint list text limit.');
      }
      const text = asUtf8OrThrow(input.bytes);
      let item: GraphListItem;
      try {
        item = await writeWithNotes(clientCode, input.documentId, input.fileName, text, true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'SharePoint document create failed.';
        if (/field|column|Notes/i.test(message) || /400|invalid/i.test(message)) {
          item = await writeWithNotes(clientCode, input.documentId, input.fileName, text, false);
        } else {
          fail(503, 'persistence_unavailable', 'SharePoint document persistence failed.');
        }
      }
      if (!item?.id) fail(503, 'persistence_unavailable', 'SharePoint document create returned no item id.');
      const echoed = fieldString(fieldsFromItem(item), 'ClientCode');
      if (echoed && echoed !== clientCode) {
        fail(403, 'forbidden', 'SharePoint document does not belong to the authorized client.');
      }
      return {
        itemId: item.id,
        clientCode,
        fileName: input.fileName,
        contentType: input.contentType || 'text/plain; charset=utf-8',
        bytes: input.bytes.length,
        contentSha256: sha256Hex(input.bytes),
        contentB64: input.bytes.toString('base64'),
        provenance: SHAREPOINT_DOCUMENT_PROVENANCE,
        persistenceClass: SHAREPOINT_DOCUMENT_PROVENANCE,
        sharePointList: SHAREPOINT_DOCUMENT_LIST,
      };
    },
    async get(input) {
      const clientCode = assertClient(input.clientCode);
      const item = await opts.graph.getItem(listId, input.itemId);
      if (!item) fail(404, 'not_found', 'not_found');
      return toPersisted(item, clientCode);
    },
  };
}
