/**
 * Related operating context on already-authorized DocumentOperatingRecord
 * items. Copies entitled search / project / thread / capital / already-indexed
 * outlook-mail-attachment / HVCG_Meetings payloads only.
 * OPEN_SOURCE: ADAPT existing authorizedSearch.documents / .projects /
 * .threads / .capitalSubmissions / fabric mail-attachment index rows /
 * entitled search extras.meetings (kind=meeting).
 * REJECT a knowledge graph, document product, SDK, queue, Graph /search/query,
 * or a second calendar/meeting product.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { entitledClientCodes, isInternalStaff } from '../sharepoint/authz.ts';
import { authoritativeSourceUrl } from '../sharepoint/fabric/fileIndex.ts';
import { isMannyPrincipal } from '../sharepoint/manny.ts';
import {
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type DocumentOperatingRecord,
  type RelatedDocumentAttachmentRef,
  type RelatedDocumentCapitalRef,
  type RelatedDocumentContractRef,
  type RelatedDocumentEmailRef,
  type RelatedDocumentMeetingRef,
  type RelatedDocumentProjectRef,
} from './types.ts';

/** Keep related lists bounded so search stays small. */
export const DOCUMENT_RELATED_CONTEXT_PAGE_SIZE = 5;

/**
 * Title/source already names a contract / SOW / proposal / capital packet.
 * Do not invent a contract-type taxonomy beyond this existing evidence.
 */
const CONTRACT_EVIDENCE_RE =
  /\b(sow|scope of work|statement of work|contract|agreement|engagement letter|proposal|capital packet)\b/i;

function canonicalClientCode(raw?: string): string | undefined {
  const code = (raw || '').trim();
  return isCanonicalClientCode(code) ? code : undefined;
}

function mayReceiveRelatedContext(principal: AtlasPrincipal, clientCode?: string): boolean {
  const code = canonicalClientCode(clientCode);
  if (code) return entitledClientCodes(principal).includes(code);
  return isMannyPrincipal(principal) || isInternalStaff(principal);
}

/**
 * Same canonical ClientCode, or both unscoped. Never cross ClientCodes.
 * Unscoped never receives a scoped relation.
 */
function sameRelatedScope(documentCode?: string, otherCode?: string): boolean {
  const left = canonicalClientCode(documentCode);
  const right = canonicalClientCode(otherCode);
  if (left && right) return left === right;
  return !left && !right;
}

function takeBound<T>(rows: T[]): T[] {
  return rows.slice(0, DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
}

function relatedEmails(
  item: DocumentOperatingRecord,
  search: AtlasAuthorizedSearch,
): RelatedDocumentEmailRef[] {
  const out: RelatedDocumentEmailRef[] = [];
  const seen = new Set<string>();
  const parentId = (item.parentMessageId || '').trim();
  const consider = (thread: {
    id: string;
    title: string;
    clientCode?: string;
    conversationId?: string;
    classification: RelatedDocumentEmailRef['classification'];
    webUrl?: string;
  }, preferParent: boolean) => {
    if (thread.id === item.id) return;
    if (!sameRelatedScope(item.clientCode, thread.clientCode)) return;
    const isParent =
      Boolean(parentId) && (thread.conversationId === parentId || thread.id === parentId);
    if (preferParent && !isParent) return;
    const key = thread.conversationId || thread.id;
    if (seen.has(key) || seen.has(thread.id)) return;
    seen.add(key);
    seen.add(thread.id);
    const webUrl = authoritativeSourceUrl(thread.webUrl);
    out.push({
      id: thread.id,
      title: thread.title,
      ...(thread.conversationId ? { conversationId: thread.conversationId } : {}),
      ...(isParent || parentId === thread.conversationId || parentId === thread.id
        ? { parentMessageId: parentId || thread.conversationId || thread.id }
        : {}),
      classification: thread.classification,
      ...(webUrl ? { webUrl } : {}),
    });
  };
  if (parentId) {
    for (const thread of search.threads.items) {
      consider(thread, true);
      if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) return out;
    }
  }
  for (const thread of search.threads.items) {
    consider(thread, false);
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
  }
  return out;
}

function relatedAttachments(
  item: DocumentOperatingRecord,
  search: AtlasAuthorizedSearch,
): RelatedDocumentAttachmentRef[] {
  const out: RelatedDocumentAttachmentRef[] = [];
  const seen = new Set<string>();
  const consider = (row: {
    id: string;
    title: string;
    clientCode?: string;
    parentMessageId?: string;
    attachmentId?: string;
    contentType?: string;
    size?: number;
    classification?: RelatedDocumentAttachmentRef['classification'];
    provenance?: RelatedDocumentAttachmentRef['classification'];
    webUrl?: string;
  }) => {
    const attachmentId = (row.attachmentId || '').trim();
    const parentMessageId = (row.parentMessageId || '').trim();
    if (!attachmentId && !parentMessageId) return;
    if (!sameRelatedScope(item.clientCode, row.clientCode)) return;
    const key = attachmentId ? `${parentMessageId}:${attachmentId}` : row.id;
    if (seen.has(key) || seen.has(row.id)) return;
    seen.add(key);
    seen.add(row.id);
    const webUrl = authoritativeSourceUrl(row.webUrl);
    const classification =
      row.classification === 'CONFIRMED' ||
      row.classification === 'LIKELY' ||
      row.classification === 'PROPOSED' ||
      row.classification === 'HONEST_EMPTY'
        ? row.classification
        : row.provenance === 'CONFIRMED' ||
            row.provenance === 'LIKELY' ||
            row.provenance === 'PROPOSED' ||
            row.provenance === 'HONEST_EMPTY'
          ? row.provenance
          : 'PROPOSED';
    out.push({
      id: row.id,
      title: row.title,
      ...(parentMessageId ? { parentMessageId } : {}),
      ...(attachmentId ? { attachmentId } : {}),
      ...(row.contentType ? { contentType: row.contentType } : {}),
      ...(typeof row.size === 'number' && Number.isFinite(row.size) ? { size: row.size } : {}),
      classification,
      binariesInAtlas: false,
      ...(webUrl ? { webUrl } : {}),
    });
  };
  for (const doc of search.documents.items) {
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
    consider(doc);
  }
  for (const hit of search.hits) {
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
    if (hit.kind !== 'document') continue;
    consider(hit);
  }
  return takeBound(out);
}

function relatedProjects(
  item: DocumentOperatingRecord,
  search: AtlasAuthorizedSearch,
): RelatedDocumentProjectRef[] {
  const out: RelatedDocumentProjectRef[] = [];
  const seen = new Set<string>();
  for (const project of search.projects.items) {
    if (project.id === item.id) continue;
    if (!sameRelatedScope(item.clientCode, project.clientCode)) continue;
    if (seen.has(project.id)) continue;
    seen.add(project.id);
    out.push({
      id: project.id,
      title: project.title,
      ...(project.clientCode ? { clientCode: project.clientCode } : {}),
      classification: project.classification,
      source: project.source,
      historicalHvs: project.historicalHvs,
      hubMiRow: project.hubMiRow,
      invented: false,
    });
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
  }
  return out;
}

function contractEvidence(title: string, source: string): 'CONFIRMED' | null {
  if (CONTRACT_EVIDENCE_RE.test(title) || CONTRACT_EVIDENCE_RE.test(source)) return 'CONFIRMED';
  return null;
}

function relatedContracts(
  item: DocumentOperatingRecord,
  search: AtlasAuthorizedSearch,
): RelatedDocumentContractRef[] {
  const out: RelatedDocumentContractRef[] = [];
  const seen = new Set<string>([item.id]);
  const consider = (row: { id: string; title: string; source?: string; clientCode?: string; webUrl?: string }) => {
    if (seen.has(row.id)) return;
    if (!sameRelatedScope(item.clientCode, row.clientCode)) return;
    const classification = contractEvidence(row.title, row.source || '');
    if (!classification) return;
    seen.add(row.id);
    const webUrl = authoritativeSourceUrl(row.webUrl);
    out.push({
      id: row.id,
      title: row.title,
      source: row.source || 'HVCG_Communications/file-index',
      classification,
      ...(webUrl ? { webUrl } : {}),
    });
  };
  for (const doc of search.documents.items) {
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
    consider(doc);
  }
  for (const hit of search.hits) {
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
    if (hit.kind !== 'document') continue;
    consider(hit);
  }
  return takeBound(out);
}

function meetingClassification(
  row: {
    classification?: RelatedDocumentMeetingRef['classification'];
    provenance?: RelatedDocumentMeetingRef['classification'];
  },
): RelatedDocumentMeetingRef['classification'] {
  if (
    row.classification === 'CONFIRMED' ||
    row.classification === 'LIKELY' ||
    row.classification === 'PROPOSED' ||
    row.classification === 'HONEST_EMPTY'
  ) {
    return row.classification;
  }
  if (
    row.provenance === 'CONFIRMED' ||
    row.provenance === 'LIKELY' ||
    row.provenance === 'PROPOSED' ||
    row.provenance === 'HONEST_EMPTY'
  ) {
    return row.provenance;
  }
  return 'PROPOSED';
}

function relatedMeetings(
  item: DocumentOperatingRecord,
  search: AtlasAuthorizedSearch,
): RelatedDocumentMeetingRef[] {
  const out: RelatedDocumentMeetingRef[] = [];
  const seen = new Set<string>();
  const consider = (row: {
    id: string;
    title: string;
    clientCode?: string;
    date?: string;
    modifiedAt?: string;
    classification?: RelatedDocumentMeetingRef['classification'];
    provenance?: RelatedDocumentMeetingRef['classification'];
    webUrl?: string;
    webLink?: string;
    sourceEventId?: string;
  }) => {
    if (row.id === item.id) return;
    if (!sameRelatedScope(item.clientCode, row.clientCode)) return;
    const key = row.sourceEventId || row.id;
    if (seen.has(key) || seen.has(row.id)) return;
    seen.add(key);
    seen.add(row.id);
    const webUrl = authoritativeSourceUrl(row.webUrl || row.webLink);
    const date = (row.date || row.modifiedAt || '').trim() || undefined;
    const sourceEventId = (row.sourceEventId || '').trim() || undefined;
    out.push({
      id: row.id,
      title: row.title,
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      ...(date ? { date } : {}),
      classification: meetingClassification(row),
      ...(webUrl ? { webUrl } : {}),
      ...(sourceEventId ? { sourceEventId } : {}),
    });
  };
  for (const hit of search.hits) {
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
    if (hit.kind !== 'meeting') continue;
    consider(hit);
  }
  return takeBound(out);
}

function relatedCapital(
  item: DocumentOperatingRecord,
  search: AtlasAuthorizedSearch,
): RelatedDocumentCapitalRef[] {
  const out: RelatedDocumentCapitalRef[] = [];
  const seen = new Set<string>();
  for (const row of search.capitalSubmissions.items) {
    if (row.id === item.id) continue;
    if (!sameRelatedScope(item.clientCode, row.clientCode)) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({
      id: row.id,
      title: row.title,
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      policyClass: CAPITAL_SUBMISSION_POLICY_CLASS,
      financingStatus: CAPITAL_SUBMISSION_FINANCING_STATUS,
      financingStatusClassification: 'HONEST_EMPTY',
      lenderCriteriaInvented: false,
      invented: false,
    });
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
  }
  return out;
}

export function attachRelatedContextToDocument(
  principal: AtlasPrincipal,
  item: DocumentOperatingRecord,
  search: AtlasAuthorizedSearch,
): DocumentOperatingRecord {
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedEmail = relatedEmails(item, search);
  const relatedProject = relatedProjects(item, search);
  const relatedContract = relatedContracts(item, search);
  const capitalRelationship = relatedCapital(item, search);
  const relatedMeetingsList = relatedMeetings(item, search);
  const relatedAttachmentsList = relatedAttachments(item, search);
  return {
    ...item,
    ...(relatedEmail.length ? { relatedEmail } : {}),
    ...(relatedProject.length ? { relatedProject } : {}),
    ...(relatedContract.length ? { relatedContract } : {}),
    ...(capitalRelationship.length ? { capitalRelationship } : {}),
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
    ...(relatedAttachmentsList.length ? { relatedAttachments: relatedAttachmentsList } : {}),
  };
}

export function attachRelatedContextToDocuments(
  principal: AtlasPrincipal,
  items: DocumentOperatingRecord[],
  search: AtlasAuthorizedSearch,
): DocumentOperatingRecord[] {
  return items.map((item) => attachRelatedContextToDocument(principal, item, search));
}
