/**
 * Related operating context on already-authorized DocumentOperatingRecord
 * items, the inverse on MeetingOperatingRecord items, the inverse
 * project → meetings link on ProjectOperatingRecord items, the inverse
 * mail-thread → meetings link on MailThreadOperatingRecord items, the
 * inverse capital-prepare → meetings link on CapitalSubmissionPrepareRecord
 * items, the inverse client-support → meetings link on
 * ClientSupportAgentRecord items, the inverse onboarding → meetings
 * and onboarding → research links on OnboardingAgentRecord items, and
 * the inverse research-intelligence → meetings link on
 * ResearchIntelligenceRecord items.
 * Copies entitled search / project / thread / capital / already-indexed
 * outlook-mail-attachment / HVCG_Meetings / document / research payloads only.
 * OPEN_SOURCE: ADAPT existing authorizedSearch.documents / .projects /
 * .threads / .capitalSubmissions / .meetings / .clientSupport / .onboarding
 * / .researchIntelligence / fabric mail-attachment index rows / entitled
 * search extras.meetings (kind=meeting) / hits kind=document / hits
 * kind=meeting / sameRelatedScope / entitledClientCodes /
 * authoritativeSourceUrl / DOCUMENT_RELATED_CONTEXT_PAGE_SIZE /
 * relatedMeetings() / relatedResearchForScopeItem().
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

/**
 * Inverse of researchIntelligence.relatedMeetings: entitled same-scope
 * research already on authorizedSearch.researchIntelligence.items
 * (hits already composed into that payload — no new research query).
 * Shared by meetings and onboarding. Isolation: sameRelatedScope +
 * entitledClientCodes + mayReceiveRelatedContext.
 * Fail-closed: missing / non-canonical ClientCode on the scoped item
 * omits researchRelationship (never guess). Unscoped lender catalog
 * titles never attach to a scoped item. Unscoped never receives scoped
 * research. Client A never receives Client B.
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
 * Inverse of meeting relatedProject: entitled same-scope meetings already
 * on authorizedSearch.meetings.items or hits kind=meeting.
 * Isolation: sameRelatedScope + entitledClientCodes. Unscoped never
 * receives scoped relations. Client A never receives Client B.
 * SAS / anonymous webUrl dropped. No downloadUrl. No transcript text.
 * historicalHvs / hubMiRow on the project stay as composed.
 */
export function attachRelatedContextToProject(
  principal: AtlasPrincipal,
  item: ProjectOperatingRecord,
  search: AtlasAuthorizedSearch,
): ProjectOperatingRecord {
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
  };
}

export function attachRelatedContextToProjects(
  principal: AtlasPrincipal,
  payload: AtlasAuthorizedSearch['projects'],
  search: AtlasAuthorizedSearch,
): AtlasAuthorizedSearch['projects'] {
  return {
    ...payload,
    items: payload.items.map((item) => attachRelatedContextToProject(principal, item, search)),
  };
}

/**
 * Inverse of meeting relatedEmail: entitled same-scope meetings already
 * on authorizedSearch.meetings.items or hits kind=meeting.
 * Isolation: sameRelatedScope + entitledClientCodes. Unscoped never
 * receives scoped relations. Client A never receives Client B.
 * SAS / anonymous webUrl dropped. No downloadUrl. No transcript text.
 * DRAFT_ONLY / autoRespond=false / send=false / indexedPreviewOnly stay
 * as composed on the thread payload.
 */
export function attachRelatedContextToMailThread(
  principal: AtlasPrincipal,
  item: MailThreadOperatingRecord,
  search: AtlasAuthorizedSearch,
): MailThreadOperatingRecord {
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
  };
}

export function attachRelatedContextToMailThreads(
  principal: AtlasPrincipal,
  payload: MailThreadOperatingPayload,
  search: AtlasAuthorizedSearch,
): MailThreadOperatingPayload {
  return {
    ...payload,
    items: payload.items.map((item) => attachRelatedContextToMailThread(principal, item, search)),
  };
}

/**
 * Inverse of meeting capitalRelationship: entitled same-scope meetings
 * already on authorizedSearch.meetings.items or hits kind=meeting.
 * Isolation: sameRelatedScope + entitledClientCodes. Unscoped never
 * receives scoped relations. Client A never receives Client B.
 * SAS / anonymous webUrl dropped. No downloadUrl. No transcript text.
 * PREPARE_ONLY / send=false / externalSubmit=false / ownerGated=true /
 * financingStatus UNKNOWN / HONEST_EMPTY stay as composed. TargetAmount
 * is never invented.
 */
export function attachRelatedContextToCapitalSubmission(
  principal: AtlasPrincipal,
  item: CapitalSubmissionPrepareRecord,
  search: AtlasAuthorizedSearch,
): CapitalSubmissionPrepareRecord {
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
  };
}

export function attachRelatedContextToCapitalSubmissions(
  principal: AtlasPrincipal,
  payload: CapitalSubmissionPreparePayload,
  search: AtlasAuthorizedSearch,
): CapitalSubmissionPreparePayload {
  return {
    ...payload,
    items: payload.items.map((item) => attachRelatedContextToCapitalSubmission(principal, item, search)),
  };
}

/**
 * Inverse of meeting support evidence: entitled same-scope meetings already
 * on authorizedSearch.meetings.items or hits kind=meeting.
 * Isolation: sameRelatedScope + entitledClientCodes. Fail-closed when
 * ClientCode is missing — omit relatedMeetings rather than guess.
 * Unscoped never receives scoped relations. Client A never receives Client B.
 * SAS / anonymous webUrl dropped. No downloadUrl. No transcript text.
 * OWNER_ESCALATE / execute=false / send=false / autoRespond=false /
 * draftOnly=true / hubMi=false stay as composed.
 */
export function attachRelatedContextToClientSupportRecord(
  principal: AtlasPrincipal,
  item: ClientSupportAgentRecord,
  search: AtlasAuthorizedSearch,
): ClientSupportAgentRecord {
  if (!canonicalClientCode(item.clientCode)) return item;
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
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
 * Inverse of meeting onboarding evidence + researchIntelligence.relatedMeetings:
 * entitled same-scope meetings already on authorizedSearch.meetings.items
 * or hits kind=meeting, and entitled same-scope research already on
 * authorizedSearch.researchIntelligence.items (no new research query).
 * Isolation: sameRelatedScope + entitledClientCodes. Fail-closed when
 * ClientCode is missing — omit relatedMeetings / researchRelationship
 * rather than guess. Unscoped never receives scoped relations. Unscoped
 * lender catalog titles never attach to a scoped onboarding item.
 * Client A never receives Client B. SAS / anonymous webUrl dropped.
 * No downloadUrl. No transcript text. OWNER_ESCALATE / execute=false /
 * activate=false / send=false / liveGtmOutbound=false / ownerGated=true /
 * hubMi=false stay as composed.
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
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
    ...(researchRelationship.length ? { researchRelationship } : {}),
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
 * Inverse of meeting research evidence: entitled same-scope meetings already
 * on authorizedSearch.meetings.items or hits kind=meeting.
 * Isolation: sameRelatedScope + entitledClientCodes. Fail-closed when
 * ClientCode is missing / non-canonical — omit relatedMeetings rather than
 * guess. Unscoped never receives scoped relations. Client A never receives
 * Client B. SAS / anonymous webUrl dropped. No downloadUrl. No transcript
 * text. SOURCE_BACKED_ONLY / outboundRefresh=false / financingStatus
 * UNKNOWN / fit NOT_EVALUATED / lenderCriteriaInvented=false stay as
 * composed. No new Graph calendar query.
 */
export function attachRelatedContextToResearchIntelligenceRecord(
  principal: AtlasPrincipal,
  item: ResearchIntelligenceRecord,
  search: AtlasAuthorizedSearch,
): ResearchIntelligenceRecord {
  if (!canonicalClientCode(item.clientCode)) return item;
  if (!mayReceiveRelatedContext(principal, item.clientCode)) return item;
  const relatedMeetingsList = relatedMeetings(item, search);
  return {
    ...item,
    ...(relatedMeetingsList.length ? { relatedMeetings: relatedMeetingsList } : {}),
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
