/**
 * Related operating context on already-authorized DocumentOperatingRecord
 * items, the inverse on MeetingOperatingRecord items, the inverse
 * project → meetings and project → documents links on
 * ProjectOperatingRecord items, the inverse
 * mail-thread → meetings, mail-thread → documents,
 * mail-thread suggestedDraft.suggestedAttachments,
 * mail-thread suggestedDraft.suggestedProjects, and
 * mail-thread suggestedDraft.routing links on
 * MailThreadOperatingRecord items, the
 * inverse capital-prepare → meetings, capital-prepare → documents,
 * and capital-prepare → research links on CapitalSubmissionPrepareRecord
 * items, the inverse
 * client-support → meetings,
 * client-support → documents,
 * client-support → projects,
 * client-support → threads,
 * client-support → capital,
 * client-support → attachments, and
 * client-support → research links on ClientSupportAgentRecord items,
 * the inverse onboarding → meetings, onboarding → documents,
 * onboarding → projects,
 * onboarding → threads,
 * onboarding → capital,
 * onboarding → attachments, and
 * onboarding → research links on OnboardingAgentRecord items, and the inverse
 * research-intelligence → meetings,
 * research-intelligence → documents,
 * research-intelligence → projects,
 * research-intelligence → threads, and
 * research-intelligence → capital links on
 * ResearchIntelligenceRecord items.
 * Copies entitled search / project / thread / capital / already-indexed
 * outlook-mail-attachment / HVCG_Meetings / document / research payloads only.
 * Documents, projects, and threads reuse the same researchRelationship
 * inverse already live on meetings / onboarding / client support / capital.
 * OPEN_SOURCE: ADAPT existing authorizedSearch.documents / .projects /
 * .threads / .capitalSubmissions / .meetings / .clientSupport / .onboarding
 * / .researchIntelligence / fabric mail-attachment index rows / entitled
 * search extras.meetings (kind=meeting) / hits kind=document / hits
 * kind=meeting / sameRelatedScope / entitledClientCodes /
 * authoritativeSourceUrl / DOCUMENT_RELATED_CONTEXT_PAGE_SIZE /
 * relatedMeetings() / relatedDocumentsForMeeting() / relatedProjects() /
 * relatedEmails() / relatedCapital() / relatedAttachments() /
 * relatedResearchForScopeItem().
 * REJECT a knowledge graph, document product, SDK, queue, Graph /search/query,
 * or a second calendar/meeting/document/search/capital/research product.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { entitledClientCodes, isInternalStaff } from '../sharepoint/authz.ts';
import { authoritativeSourceUrl } from '../sharepoint/fabric/fileIndex.ts';
import { isMannyPrincipal } from '../sharepoint/manny.ts';
import {
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  RESEARCH_INTELLIGENCE_FINANCING_STATUS,
  RESEARCH_INTELLIGENCE_FIT,
  RESEARCH_INTELLIGENCE_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type CapitalSubmissionPreparePayload,
  type CapitalSubmissionPrepareRecord,
  type ClientSupportAgentPayload,
  type ClientSupportAgentRecord,
  type DocumentOperatingRecord,
  type MailThreadOperatingPayload,
  type MailThreadOperatingRecord,
  type MeetingOperatingPayload,
  type MeetingOperatingRecord,
  type OnboardingAgentPayload,
  type OnboardingAgentRecord,
  type ProjectOperatingRecord,
  type ResearchIntelligencePayload,
  type ResearchIntelligenceRecord,
  type RelatedDocumentAttachmentRef,
  type RelatedDocumentCapitalRef,
  type RelatedDocumentContractRef,
  type RelatedDocumentEmailRef,
  type RelatedDocumentMeetingRef,
  type AskAtlasClassification,
  type MailThreadSuggestedDraftRouting,
  type RelatedDocumentProjectRef,
  type RelatedMeetingDocumentRef,
  type RelatedMeetingResearchRef,
} from './types.ts';

/** Shared isolation key for document, meeting, project, and thread related-context attach. */
type RelatedScopeItem = {
  id: string;
  clientCode?: string;
  parentMessageId?: string;
};

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
  item: RelatedScopeItem,
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
  const threads = search.threads?.items || [];
  if (parentId) {
    for (const thread of threads) {
      consider(thread, true);
      if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) return out;
    }
  }
  for (const thread of threads) {
    consider(thread, false);
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
  }
  return out;
}

function relatedAttachments(
  item: RelatedScopeItem,
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
  item: RelatedScopeItem,
  search: AtlasAuthorizedSearch,
): RelatedDocumentProjectRef[] {
  const out: RelatedDocumentProjectRef[] = [];
  const seen = new Set<string>();
  for (const project of search.projects?.items || []) {
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
  item: RelatedScopeItem,
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
  for (const row of search.meetings.items) {
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
    consider(row);
  }
  for (const hit of search.hits) {
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
    if (hit.kind !== 'meeting') continue;
    consider(hit);
  }
  return takeBound(out);
}

function relatedCapital(
  item: RelatedScopeItem,
  search: AtlasAuthorizedSearch,
): RelatedDocumentCapitalRef[] {
  const out: RelatedDocumentCapitalRef[] = [];
  const seen = new Set<string>();
  for (const row of search.capitalSubmissions?.items || []) {
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
  const researchRelationship = relatedResearchForScopeItem(item, search);
  return {
    ...item,
    ...(relatedEmail.length ? { relatedEmail } : {}),
    ...(relatedProject.length ? { relatedProject } : {}),
    ...(relatedContract.length ? { relatedContract } : {}),
    ...(capitalRelationship.length ? { capitalRelationship } : {}),
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
    ...(relatedAttachmentsList.length ? { relatedAttachments: relatedAttachmentsList } : {}),
    ...(researchRelationship.length ? { researchRelationship } : {}),
  };
}

export function attachRelatedContextToDocuments(
  principal: AtlasPrincipal,
  items: DocumentOperatingRecord[],
  search: AtlasAuthorizedSearch,
): DocumentOperatingRecord[] {
  return items.map((item) => attachRelatedContextToDocument(principal, item, search));
}

function relatedDocumentClassification(
  row: {
    classification?: RelatedMeetingDocumentRef['classification'];
    provenance?: RelatedMeetingDocumentRef['classification'];
  },
): RelatedMeetingDocumentRef['classification'] {
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

/**
 * Inverse of relatedMeetings: entitled same-scope documents already on
 * authorizedSearch.documents.items or hits kind=document.
 * Isolation: sameRelatedScope. SAS / anonymous webUrl dropped.
 */
function relatedDocumentsForMeeting(
  item: RelatedScopeItem,
  search: AtlasAuthorizedSearch,
): RelatedMeetingDocumentRef[] {
  const out: RelatedMeetingDocumentRef[] = [];
  const seen = new Set<string>([item.id]);
  const consider = (row: {
    id: string;
    title: string;
    clientCode?: string;
    classification?: RelatedMeetingDocumentRef['classification'];
    provenance?: RelatedMeetingDocumentRef['classification'];
    source?: string;
    webUrl?: string;
  }) => {
    if (seen.has(row.id)) return;
    if (!sameRelatedScope(item.clientCode, row.clientCode)) return;
    seen.add(row.id);
    const webUrl = authoritativeSourceUrl(row.webUrl);
    out.push({
      id: row.id,
      title: row.title,
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      classification: relatedDocumentClassification(row),
      source: row.source || 'HVCG_Communications/file-index',
      ...(webUrl ? { webUrl } : {}),
    });
  };
  for (const doc of search.documents?.items || []) {
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
    consider(doc);
  }
  for (const hit of search.hits || []) {
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
    if (hit.kind !== 'document') continue;
    consider(hit);
  }
  return takeBound(out);
}

/**
 * Inverse of researchIntelligence.relatedMeetings: entitled same-scope
 * research already on authorizedSearch.researchIntelligence.items
 * (hits already composed into that payload — no new research query).
 * Shared by meetings, onboarding, client support, capital,
 * documents, projects, and threads. Isolation: sameRelatedScope +
 * entitledClientCodes + mayReceiveRelatedContext. Fail-closed:
 * missing / non-canonical ClientCode on the scoped item omits
 * researchRelationship (never guess). Unscoped lender catalog
 * titles never attach to a scoped item. Unscoped never receives
 * scoped research. Client A never receives Client B.
 */
function relatedResearchForScopeItem(
  item: RelatedScopeItem,
  search: AtlasAuthorizedSearch,
): RelatedMeetingResearchRef[] {
  if (!canonicalClientCode(item.clientCode)) return [];
  const out: RelatedMeetingResearchRef[] = [];
  const seen = new Set<string>([item.id]);
  for (const row of search.researchIntelligence.items) {
    if (row.id === item.id) continue;
    if (!canonicalClientCode(row.clientCode)) continue;
    if (!sameRelatedScope(item.clientCode, row.clientCode)) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push({
      id: row.id,
      title: row.title,
      ...(row.clientCode ? { clientCode: row.clientCode } : {}),
      source: row.source,
      ...(row.retrievalDate ? { retrievalDate: row.retrievalDate } : {}),
      confidence: row.confidence,
      classification: row.classification,
      superseded: row.superseded,
      invented: false,
      lenderCriteriaInvented: false,
      financingStatus: RESEARCH_INTELLIGENCE_FINANCING_STATUS,
      fit: RESEARCH_INTELLIGENCE_FIT,
      policyClass: RESEARCH_INTELLIGENCE_POLICY_CLASS,
    });
    if (out.length >= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE) break;
  }
  return out;
}

/**
 * Attach already-authorized same-scope document / email / project /
 * attachment / capital / research refs onto an entitled meeting. Unscoped
 * never receives scoped relations. Client A never receives Client B.
 * No downloadUrl. No transcript text. binariesInAtlas stays false.
 */
export function attachRelatedContextToMeeting(
  principal: AtlasPrincipal,
  item: MeetingOperatingRecord,
  search: AtlasAuthorizedSearch,
): MeetingOperatingRecord {
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedDocuments = relatedDocumentsForMeeting(item, search);
  const relatedEmail = relatedEmails(item, search);
  const relatedProject = relatedProjects(item, search);
  const capitalRelationship = relatedCapital(item, search);
  const relatedAttachmentsList = relatedAttachments(item, search);
  const researchRelationship = relatedResearchForScopeItem(item, search);
  return {
    ...item,
    ...(relatedDocuments.length ? { relatedDocuments } : {}),
    ...(relatedEmail.length ? { relatedEmail } : {}),
    ...(relatedProject.length ? { relatedProject } : {}),
    ...(relatedAttachmentsList.length ? { relatedAttachments: relatedAttachmentsList } : {}),
    ...(capitalRelationship.length ? { capitalRelationship } : {}),
    ...(researchRelationship.length ? { researchRelationship } : {}),
  };
}

export function attachRelatedContextToMeetings(
  principal: AtlasPrincipal,
  payload: MeetingOperatingPayload,
  search: AtlasAuthorizedSearch,
): MeetingOperatingPayload {
  if (!payload.items.length) return payload;
  return {
    ...payload,
    items: payload.items.map((item) => attachRelatedContextToMeeting(principal, item, search)),
  };
}

/**
 * Inverse of meeting relatedProject + document.relatedProject +
 * researchIntelligence.relatedMeetings: entitled same-scope meetings
 * already on authorizedSearch.meetings.items or hits kind=meeting,
 * entitled same-scope documents already on authorizedSearch.documents.items
 * or hits kind=document (reuses relatedDocumentsForMeeting /
 * RelatedMeetingDocumentRef — no new document query), and entitled
 * same-scope research already on authorizedSearch.researchIntelligence.items
 * (no new research query).
 * Isolation: sameRelatedScope + entitledClientCodes +
 * mayReceiveRelatedContext. Fail-closed when ClientCode is missing /
 * non-canonical — omit researchRelationship / relatedDocuments rather
 * than guess. Unscoped never receives scoped relations. Unscoped lender
 * catalog titles never attach to a scoped project. Client A never
 * receives Client B. SAS / anonymous webUrl dropped. No downloadUrl.
 * No transcript text. Classification / invented / hubMiRow stay as
 * composed on the source project row.
 */
export function attachRelatedContextToProject(
  principal: AtlasPrincipal,
  item: ProjectOperatingRecord,
  search: AtlasAuthorizedSearch,
): ProjectOperatingRecord {
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  const researchRelationship = relatedResearchForScopeItem(item, search);
  const relatedDocuments = canonicalClientCode(item.clientCode)
    ? relatedDocumentsForMeeting(item, search)
    : [];
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
    ...(researchRelationship.length ? { researchRelationship } : {}),
    ...(relatedDocuments.length ? { relatedDocuments } : {}),
  };
}

export function attachRelatedContextToProjects(
  principal: AtlasPrincipal,
  payload: AtlasAuthorizedSearch['projects'],
  search: AtlasAuthorizedSearch,
): AtlasAuthorizedSearch['projects'] {
  if (!payload.items.length) return payload;
  return {
    ...payload,
    items: payload.items.map((item) => attachRelatedContextToProject(principal, item, search)),
  };
}

/**
 * Inverse of meeting relatedEmail + document.relatedEmail +
 * researchIntelligence.relatedMeetings: entitled same-scope meetings
 * already on authorizedSearch.meetings.items or hits kind=meeting,
 * entitled same-scope documents already on authorizedSearch.documents.items
 * or hits kind=document (reuses relatedDocumentsForMeeting /
 * RelatedMeetingDocumentRef — no new document query), entitled
 * same-scope research already on authorizedSearch.researchIntelligence.items
 * (no new research query), and entitled same-scope already-indexed
 * outlook-mail-attachment metadata already on
 * authorizedSearch.documents.items / hits kind=document (reuses
 * relatedAttachments / RelatedDocumentAttachmentRef — no new Graph /
 * search / attachment query, no contentBytes). Copied onto
 * suggestedDraft.suggestedAttachments only — not a second
 * relatedAttachments inverse on the thread record. Entitled
 * same-scope project operating records already on
 * authorizedSearch.projects.items (reuses relatedProjects /
 * RelatedDocumentProjectRef — no new project query) are copied onto
 * suggestedDraft.suggestedProjects only — not a relatedProjects
 * inverse on the thread record. Existing project-ref fields stay as
 * composed; no invented milestone rows. historicalHvs / hubMiRow
 * copy from the entitled project record only — never invent
 * hubMiRow=true. suggestedDraft.routing copies the already-entitled
 * canonical ClientCode plus the first entitled suggestedProjects
 * id/title — never invent a client, project, mailbox, or TargetAmount.
 * Isolation: sameRelatedScope + entitledClientCodes +
 * mayReceiveRelatedContext. Fail-closed when ClientCode is missing /
 * non-canonical — omit researchRelationship / relatedDocuments /
 * suggestedDraft.suggestedAttachments /
 * suggestedDraft.suggestedProjects / suggestedDraft.routing rather
 * than guess. Unscoped never receives scoped relations. Unscoped
 * lender catalog titles never attach to a scoped thread. Client A
 * never receives Client B. SAS / anonymous webUrl dropped. No
 * downloadUrl. No contentBytes. binariesInAtlas stays false. No
 * transcript text. No preview body / send on the document refs.
 * Never invent attachment / project names, ids, counts, ClientCodes,
 * Hub-MI, financing, or TargetAmount. DRAFT_ONLY / autoRespond=false /
 * send=false / indexedPreviewOnly stay as composed on the thread
 * payload. Routing a draft is NOT send and NOT AUTO_RESPOND.
 */
export function attachRelatedContextToMailThread(
  principal: AtlasPrincipal,
  item: MailThreadOperatingRecord,
  search: AtlasAuthorizedSearch,
): MailThreadOperatingRecord {
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  const researchRelationship = relatedResearchForScopeItem(item, search);
  const relatedDocuments = canonicalClientCode(item.clientCode)
    ? relatedDocumentsForMeeting(item, search)
    : [];
  const suggestedAttachments = canonicalClientCode(item.clientCode)
    ? relatedAttachments(item, search)
    : [];
  const suggestedProjects = canonicalClientCode(item.clientCode)
    ? relatedProjects(item, search)
    : [];
  const routing = draftRouting(item, suggestedProjects);
  const suggestedDraftExtras = {
    ...(suggestedAttachments.length ? { suggestedAttachments } : {}),
    ...(suggestedProjects.length ? { suggestedProjects } : {}),
    ...(routing ? { routing } : {}),
  };
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
    ...(researchRelationship.length ? { researchRelationship } : {}),
    ...(relatedDocuments.length ? { relatedDocuments } : {}),
    ...(Object.keys(suggestedDraftExtras).length
      ? {
          suggestedDraft: {
            ...item.suggestedDraft,
            ...suggestedDraftExtras,
          },
        }
      : {}),
  };
}

function askAtlasClassification(
  value: string | undefined,
): AskAtlasClassification | undefined {
  if (value === 'CONFIRMED' || value === 'LIKELY' || value === 'PROPOSED') return value;
  return undefined;
}

/**
 * Entitled canonical ClientCode plus the first already-copied
 * suggestedProjects id/title. Fail-closed: missing / non-canonical
 * ClientCode omits routing rather than guess. Project fields copy
 * from already-entitled same-scope suggestedProjects only.
 */
function draftRouting(
  item: MailThreadOperatingRecord,
  suggestedProjects: RelatedDocumentProjectRef[],
): MailThreadSuggestedDraftRouting | undefined {
  const clientCode = canonicalClientCode(item.clientCode);
  if (!clientCode) return undefined;
  const first = suggestedProjects[0];
  const classification =
    askAtlasClassification(item.classification) ||
    askAtlasClassification(first?.classification) ||
    'PROPOSED';
  return {
    clientCode,
    ...(first?.id ? { projectId: first.id } : {}),
    ...(first?.title ? { projectTitle: first.title } : {}),
    classification,
    invented: false,
  };
}

export function attachRelatedContextToMailThreads(
  principal: AtlasPrincipal,
  payload: MailThreadOperatingPayload,
  search: AtlasAuthorizedSearch,
): MailThreadOperatingPayload {
  if (!payload.items.length) return payload;
  return {
    ...payload,
    items: payload.items.map((item) => attachRelatedContextToMailThread(principal, item, search)),
  };
}

/**
 * Inverse of meeting capitalRelationship + document.capitalRelationship +
 * researchIntelligence.relatedMeetings: entitled same-scope meetings
 * already on authorizedSearch.meetings.items or hits kind=meeting,
 * entitled same-scope documents already on authorizedSearch.documents.items
 * or hits kind=document (reuses relatedDocumentsForMeeting /
 * RelatedMeetingDocumentRef — no new document query), and entitled
 * same-scope research already on authorizedSearch.researchIntelligence.items
 * (no new research query).
 * Isolation: sameRelatedScope + entitledClientCodes +
 * mayReceiveRelatedContext. Fail-closed when ClientCode is missing /
 * non-canonical — omit researchRelationship / relatedDocuments rather
 * than guess. Unscoped never receives scoped relations. Unscoped lender
 * catalog titles never attach scoped documents. Client A never receives
 * Client B. SAS / anonymous webUrl dropped. No downloadUrl. No
 * transcript text. PREPARE_ONLY / send=false / externalSubmit=false /
 * ownerGated=true / financingStatus UNKNOWN / HONEST_EMPTY stay as
 * composed. TargetAmount is never invented. No invented lender
 * criteria, fit, or financing status.
 */
export function attachRelatedContextToCapitalSubmission(
  principal: AtlasPrincipal,
  item: CapitalSubmissionPrepareRecord,
  search: AtlasAuthorizedSearch,
): CapitalSubmissionPrepareRecord {
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  const researchRelationship = relatedResearchForScopeItem(item, search);
  const relatedDocuments = canonicalClientCode(item.clientCode)
    ? relatedDocumentsForMeeting(item, search)
    : [];
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
    ...(researchRelationship.length ? { researchRelationship } : {}),
    ...(relatedDocuments.length ? { relatedDocuments } : {}),
  };
}

export function attachRelatedContextToCapitalSubmissions(
  principal: AtlasPrincipal,
  payload: CapitalSubmissionPreparePayload,
  search: AtlasAuthorizedSearch,
): CapitalSubmissionPreparePayload {
  if (!payload.items.length) return payload;
  return {
    ...payload,
    items: payload.items.map((item) => attachRelatedContextToCapitalSubmission(principal, item, search)),
  };
}

/**
 * Inverse of meeting support evidence + researchIntelligence.relatedMeetings
 * + the same same-scope document inverse already live on meetings /
 * research-intel / projects / threads / capital / onboarding + the same
 * same-scope project inverse already live on research-intel / documents /
 * onboarding (document.relatedProject) + the same same-scope thread inverse
 * already live on research-intel / onboarding (document.relatedEmail):
 * entitled same-scope meetings already on authorizedSearch.meetings.items
 * or hits kind=meeting, entitled same-scope documents already on
 * authorizedSearch.documents.items or hits kind=document (reuses
 * relatedDocumentsForMeeting / RelatedMeetingDocumentRef — no new
 * document query), entitled same-scope projects already on
 * authorizedSearch.projects.items (reuses relatedProjects /
 * RelatedDocumentProjectRef — no new project query), entitled
 * same-scope threads already on authorizedSearch.threads.items
 * (reuses relatedEmails / RelatedDocumentEmailRef — no new query),
 * entitled same-scope capital-prepare rows already on
 * authorizedSearch.capitalSubmissions.items (reuses relatedCapital /
 * RelatedDocumentCapitalRef — no new query), entitled same-scope
 * already-indexed outlook-mail-attachment metadata already on
 * authorizedSearch.documents.items / hits kind=document (reuses
 * relatedAttachments / RelatedDocumentAttachmentRef — no new
 * Graph / search / attachment query, no contentBytes), and entitled
 * same-scope research already on authorizedSearch.researchIntelligence.items
 * (no new research query).
 * Isolation: sameRelatedScope + entitledClientCodes +
 * mayReceiveRelatedContext. Fail-closed when ClientCode is missing /
 * non-canonical — omit relatedMeetings / researchRelationship /
 * relatedDocuments / relatedProjects / relatedThreads / relatedCapital
 * / relatedAttachments rather than guess. Unscoped never receives
 * scoped relations. Unscoped lender catalog titles never attach
 * scoped documents, projects, threads, capital, or attachments.
 * Client A never receives Client B. SAS / anonymous webUrl dropped.
 * No downloadUrl. No contentBytes. binariesInAtlas stays false.
 * No transcript text. No preview body / suggestedDraft / send on
 * the thread refs. No TargetAmount. No invented lender criteria,
 * fit, or financing status. No invented attachment names / ids.
 * No Hub-MI invention. hubMiRow is copied as composed on the
 * source project (never invented). OWNER_ESCALATE / execute=false /
 * send=false / autoRespond=false / draftOnly=true / hubMi=false stay
 * as composed. DRAFT_ONLY / send=false / autoRespond=false /
 * indexedPreviewOnly stay as composed on the source thread payload.
 * PREPARE_ONLY / send=false / externalSubmit=false / ownerGated=true /
 * financingStatus UNKNOWN / HONEST_EMPTY stay as composed on the
 * source capital payload. There is no document.clientSupportRelationship
 * field.
 */
export function attachRelatedContextToClientSupportRecord(
  principal: AtlasPrincipal,
  item: ClientSupportAgentRecord,
  search: AtlasAuthorizedSearch,
): ClientSupportAgentRecord {
  if (!canonicalClientCode(item.clientCode)) return item;
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  const researchRelationship = relatedResearchForScopeItem(item, search);
  const relatedDocuments = relatedDocumentsForMeeting(item, search);
  const relatedProjectsList = relatedProjects(item, search);
  const relatedThreads = relatedEmails(item, search);
  const relatedCapitalList = relatedCapital(item, search);
  const relatedAttachmentsList = relatedAttachments(item, search);
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
    ...(researchRelationship.length ? { researchRelationship } : {}),
    ...(relatedDocuments.length ? { relatedDocuments } : {}),
    ...(relatedProjectsList.length ? { relatedProjects: relatedProjectsList } : {}),
    ...(relatedThreads.length ? { relatedThreads } : {}),
    ...(relatedCapitalList.length ? { relatedCapital: relatedCapitalList } : {}),
    ...(relatedAttachmentsList.length ? { relatedAttachments: relatedAttachmentsList } : {}),
  };
}

export function attachRelatedContextToClientSupport(
  principal: AtlasPrincipal,
  payload: ClientSupportAgentPayload,
  search: AtlasAuthorizedSearch,
): ClientSupportAgentPayload {
  if (!payload.items.length) return payload;
  return {
    ...payload,
    items: payload.items.map((item) => attachRelatedContextToClientSupportRecord(principal, item, search)),
  };
}

/**
 * Inverse of meeting onboarding evidence + researchIntelligence.relatedMeetings
 * + the same same-scope document inverse already live on meetings /
 * research-intel / projects / threads / capital + the same same-scope
 * project inverse already live on research-intel / documents
 * (document.relatedProject) + the same same-scope thread inverse
 * already live on research-intel (document.relatedEmail): entitled
 * same-scope meetings already on authorizedSearch.meetings.items or
 * hits kind=meeting, entitled same-scope documents already on
 * authorizedSearch.documents.items or hits kind=document (reuses
 * relatedDocumentsForMeeting / RelatedMeetingDocumentRef — no new
 * document query), entitled same-scope projects already on
 * authorizedSearch.projects.items (reuses relatedProjects /
 * RelatedDocumentProjectRef — no new project query), entitled
 * same-scope threads already on authorizedSearch.threads.items
 * (reuses relatedEmails / RelatedDocumentEmailRef — no new query),
 * entitled same-scope capital-prepare rows already on
 * authorizedSearch.capitalSubmissions.items (reuses relatedCapital /
 * RelatedDocumentCapitalRef — no new query), entitled same-scope
 * already-indexed outlook-mail-attachment metadata already on
 * authorizedSearch.documents.items / hits kind=document (reuses
 * relatedAttachments / RelatedDocumentAttachmentRef — no new
 * Graph / search / attachment query, no contentBytes), and entitled
 * same-scope research already on authorizedSearch.researchIntelligence.items
 * (no new research query).
 * Isolation: sameRelatedScope + entitledClientCodes +
 * mayReceiveRelatedContext. Fail-closed when ClientCode is missing /
 * non-canonical — omit relatedMeetings / researchRelationship /
 * relatedDocuments / relatedProjects / relatedThreads / relatedCapital
 * / relatedAttachments rather than guess. Unscoped never receives
 * scoped relations. Unscoped lender catalog titles never attach
 * scoped documents, projects, threads, capital, or attachments.
 * Client A never receives Client B. SAS / anonymous webUrl dropped.
 * No downloadUrl. No contentBytes. binariesInAtlas stays false.
 * No transcript text. No preview body / suggestedDraft / send on
 * the thread refs. No TargetAmount. No invented lender criteria,
 * fit, or financing status. No invented attachment names / ids.
 * No Hub-MI invention. hubMiRow is copied as composed on the
 * source project (never invented). OWNER_ESCALATE / execute=false /
 * activate=false / send=false / liveGtmOutbound=false /
 * ownerGated=true / hubMi=false stay as composed. DRAFT_ONLY /
 * send=false / autoRespond=false / indexedPreviewOnly stay as
 * composed on the source thread payload. PREPARE_ONLY / send=false /
 * externalSubmit=false / ownerGated=true / financingStatus UNKNOWN /
 * HONEST_EMPTY stay as composed on the source capital payload. There
 * is no document.onboardingRelationship field.
 */
export function attachRelatedContextToOnboardingRecord(
  principal: AtlasPrincipal,
  item: OnboardingAgentRecord,
  search: AtlasAuthorizedSearch,
): OnboardingAgentRecord {
  if (!canonicalClientCode(item.clientCode)) return item;
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  const researchRelationship = relatedResearchForScopeItem(item, search);
  const relatedDocuments = relatedDocumentsForMeeting(item, search);
  const relatedProjectsList = relatedProjects(item, search);
  const relatedThreads = relatedEmails(item, search);
  const relatedCapitalList = relatedCapital(item, search);
  const relatedAttachmentsList = relatedAttachments(item, search);
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
    ...(researchRelationship.length ? { researchRelationship } : {}),
    ...(relatedDocuments.length ? { relatedDocuments } : {}),
    ...(relatedProjectsList.length ? { relatedProjects: relatedProjectsList } : {}),
    ...(relatedThreads.length ? { relatedThreads } : {}),
    ...(relatedCapitalList.length ? { relatedCapital: relatedCapitalList } : {}),
    ...(relatedAttachmentsList.length ? { relatedAttachments: relatedAttachmentsList } : {}),
  };
}

export function attachRelatedContextToOnboarding(
  principal: AtlasPrincipal,
  payload: OnboardingAgentPayload,
  search: AtlasAuthorizedSearch,
): OnboardingAgentPayload {
  if (!payload.items.length) return payload;
  return {
    ...payload,
    items: payload.items.map((item) => attachRelatedContextToOnboardingRecord(principal, item, search)),
  };
}

/**
 * Inverse of meeting research evidence + document.researchRelationship +
 * project.researchRelationship: entitled same-scope meetings already on
 * authorizedSearch.meetings.items or hits kind=meeting, entitled
 * same-scope documents already on authorizedSearch.documents.items or
 * hits kind=document (reuses relatedDocumentsForMeeting /
 * RelatedMeetingDocumentRef — no new query), and entitled same-scope
 * projects already on authorizedSearch.projects.items (reuses
 * relatedProjects / RelatedDocumentProjectRef — no new query), and
 * entitled same-scope threads already on authorizedSearch.threads.items
 * (reuses relatedEmails / RelatedDocumentEmailRef — no new query), and
 * entitled same-scope capital-prepare rows already on
 * authorizedSearch.capitalSubmissions.items (reuses relatedCapital /
 * RelatedDocumentCapitalRef — no new query).
 * Isolation: sameRelatedScope + entitledClientCodes. Fail-closed when
 * ClientCode is missing / non-canonical — omit relatedMeetings /
 * relatedDocuments / relatedProjects / relatedThreads / relatedCapital
 * rather than guess. Unscoped never receives scoped relations.
 * Unscoped lender catalog rows never receive scoped documents,
 * projects, threads, or capital. Client A never receives Client B.
 * SAS / anonymous webUrl dropped. No downloadUrl. No transcript text.
 * No preview body / suggestedDraft / send on thread refs. No
 * TargetAmount / invented lender criteria / fit / financing status on
 * capital refs. SOURCE_BACKED_ONLY / outboundRefresh=false /
 * financingStatus UNKNOWN / fit NOT_EVALUATED /
 * lenderCriteriaInvented=false stay as composed. Project
 * classification stays CONFIRMED / LIKELY / PROPOSED /
 * STALE_OR_UNCERTAIN / COMPLETE. hubMiRow stays as composed on the
 * source project (never invented). DRAFT_ONLY / send=false /
 * autoRespond=false / indexedPreviewOnly stay as composed on the
 * source thread payload. PREPARE_ONLY / send=false /
 * externalSubmit=false / ownerGated=true / financingStatus UNKNOWN /
 * HONEST_EMPTY stay as composed on the source capital payload.
 * Preview stays off this slice (refs only). No new Graph calendar /
 * document / project / communications / capital query.
 */
export function attachRelatedContextToResearchIntelligenceRecord(
  principal: AtlasPrincipal,
  item: ResearchIntelligenceRecord,
  search: AtlasAuthorizedSearch,
): ResearchIntelligenceRecord {
  if (!canonicalClientCode(item.clientCode)) return item;
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  const relatedDocuments = relatedDocumentsForMeeting(item, search);
  const relatedProjectsList = relatedProjects(item, search);
  const relatedThreads = relatedEmails(item, search);
  const relatedCapitalList = relatedCapital(item, search);
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
    ...(relatedDocuments.length ? { relatedDocuments } : {}),
    ...(relatedProjectsList.length ? { relatedProjects: relatedProjectsList } : {}),
    ...(relatedThreads.length ? { relatedThreads } : {}),
    ...(relatedCapitalList.length ? { relatedCapital: relatedCapitalList } : {}),
  };
}

export function attachRelatedContextToResearchIntelligence(
  principal: AtlasPrincipal,
  payload: ResearchIntelligencePayload,
  search: AtlasAuthorizedSearch,
): ResearchIntelligencePayload {
  if (!payload.items.length) return payload;
  return {
    ...payload,
    items: payload.items.map((item) =>
      attachRelatedContextToResearchIntelligenceRecord(principal, item, search),
    ),
  };
}
