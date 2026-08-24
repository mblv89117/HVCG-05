import type { DeskCommercialContext } from '../commercialContext/types.ts';
import type { KnowledgeProvenance } from '../sharepoint/knowledgeClassification.ts';
import type {
  ActionableClientKnowledge,
  ActionableDecision,
  ActionableMissingDocument,
  ActionableResponsibility,
  ActionableWaitingItem,
} from '../sharepoint/hvsActionableClientKnowledge.ts';

export const OPERATOR_DESK_CONTRACT = 'atlas-hub-operator-desk.v1' as const;

export interface OperatorQueueItem {
  id: string;
  title: string;
  href?: string;
  kind: string;
}

export interface OperatorOperatingItem {
  id: string;
  clientCode: string;
  title: string;
  queue: string;
  kind: string;
  provenance: KnowledgeProvenance;
  href?: string;
  evidence?: string;
}

export const ASK_ATLAS_QUESTION =
  'WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW, WHY, AND WHAT IS EACH BASED ON?' as const;

export const ASK_ATLAS_MISSION_KEY = 'ATLAS-AGENTIC-OPS-ASK-ATTENTION-001' as const;
export const ASK_ATLAS_RUNTIME_MISSION_KEY = 'ATLAS-AGENTIC-OPS-RUNTIME-001' as const;
export const ASK_ATLAS_EVENT_MISSION_KEY = 'ATLAS-AGENTIC-OPS-EVENT-001' as const;
export const ASK_ATLAS_PII_MISSION_KEY = 'ATLAS-AGENTIC-OPS-PII-001' as const;
export const ASK_ATLAS_LOOP_MISSION_KEY = 'ATLAS-AGENTIC-OPS-LOOP-001' as const;
export const ASK_ATLAS_CLIENTCTX_MISSION_KEY = 'ATLAS-AGENTIC-OPS-CLIENTCTX-001' as const;
export const ASK_ATLAS_RECOVERED_MISSION_KEY = 'ATLAS-AGENTIC-OPS-RECOVERED-001' as const;
export const ASK_ATLAS_SEARCH_MISSION_KEY = 'ATLAS-AGENTIC-OPS-SEARCH-001' as const;
export const ASK_ATLAS_SEARCH_002_MISSION_KEY = 'ATLAS-AGENTIC-OPS-SEARCH-002' as const;
export const ASK_ATLAS_SEARCH_ACTIONABILITY_MISSION_KEY = 'ATLAS-SEARCH-ACTIONABILITY-001' as const;
export const ASK_ATLAS_ATTENTION_NL_MISSION_KEY = 'ATLAS-AGENTIC-OPS-ATTENTION-NL-001' as const;
export const ASK_ATLAS_PROJECT_RECONSTRUCTION_MISSION_KEY = 'ATLAS-PROJECT-RECONSTRUCTION-001' as const;
export const ASK_ATLAS_PROJECT_CLIENTCTX_MISSION_KEY = 'ATLAS-PROJECT-CLIENTCTX-001' as const;
export const ASK_ATLAS_AI_COMMUNICATIONS_MISSION_KEY = 'ATLAS-AI-COMMUNICATIONS-001' as const;
export const ASK_ATLAS_CAPITAL_SUBMISSION_PREPARE_MISSION_KEY =
  'ATLAS-CAPITAL-SUBMISSION-PREPARE-001' as const;
export const ASK_ATLAS_RESEARCH_INTELLIGENCE_MISSION_KEY =
  'ATLAS-RESEARCH-INTELLIGENCE-001' as const;
export const ASK_ATLAS_ONBOARDING_AGENT_MISSION_KEY = 'ATLAS-ONBOARDING-AGENT-001' as const;
export const ASK_ATLAS_CLIENT_SUPPORT_AGENT_MISSION_KEY = 'ATLAS-CLIENT-SUPPORT-AGENT-001' as const;
export const ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY =
  'ATLAS-PRODUCT-RESEARCH-AGENT-001' as const;
/** Product research copies entitled Hub health only. Metrics stay uninvented. */
export const PRODUCT_RESEARCH_AGENT_EXECUTE = false as const;
export const PRODUCT_RESEARCH_INVENT_METRICS = false as const;
export const PRODUCT_RESEARCH_SURFACES = [
  'atlas',
  'gcc',
  'copilot',
  '360',
  'telemetry',
  'github',
  'open_source',
] as const;
export type ProductResearchSurface = (typeof PRODUCT_RESEARCH_SURFACES)[number];
export const ATLAS_CLIENT_HINTS_STATUSES = ['ready', 'empty', 'error', 'skipped'] as const;
export type AtlasClientHintsStatus = (typeof ATLAS_CLIENT_HINTS_STATUSES)[number];
/**
 * Count-only fabric hint honesty. Same shape as /health fabricSync.clientHints.
 * Never includes ClientCode, displayName, DBA, domains, emails, or tokens.
 */
export interface AtlasClientHintsExtra {
  status: AtlasClientHintsStatus;
  reason: string;
  count: number;
}
/** Onboarding agent copies entitled intake evidence only. Owner decisions stay escalated. */
export const ONBOARDING_AGENT_POLICY_CLASS = 'OWNER_ESCALATE' as const;
export const ONBOARDING_AGENT_EXECUTE = false as const;
export const ONBOARDING_AGENT_ACTIVATE = false as const;
export const ONBOARDING_AGENT_SEND = false as const;
export const ONBOARDING_AGENT_LIVE_GTM_OUTBOUND = false as const;
export const ONBOARDING_AGENT_OWNER_GATED = true as const;
export const ONBOARDING_AGENT_HUB_MI = false as const;
/** Client support / routing copies entitled support evidence only. Owner decisions stay escalated. */
export const CLIENT_SUPPORT_AGENT_POLICY_CLASS = 'OWNER_ESCALATE' as const;
export const CLIENT_SUPPORT_AGENT_EXECUTE = false as const;
export const CLIENT_SUPPORT_AGENT_SEND = false as const;
export const CLIENT_SUPPORT_AGENT_AUTO_RESPOND = false as const;
export const CLIENT_SUPPORT_AGENT_OWNER_GATED = true as const;
export const CLIENT_SUPPORT_AGENT_HUB_MI = false as const;
export const CLIENT_SUPPORT_AGENT_DRAFT_ONLY = true as const;
/** Suggested replies stay draft. AUTO_RESPOND is never enabled. */
export const COMMUNICATIONS_POLICY_CLASS = 'DRAFT_ONLY' as const;
export const COMMUNICATIONS_AUTO_RESPOND = false as const;
export const COMMUNICATIONS_SEND = false as const;
/** Capital submission requests stay PREPARE_ONLY. External send stays owner-gated. */
export const CAPITAL_SUBMISSION_POLICY_CLASS = 'PREPARE_ONLY' as const;
export const CAPITAL_SUBMISSION_SEND = false as const;
export const CAPITAL_SUBMISSION_EXTERNAL_SUBMIT = false as const;
export const CAPITAL_SUBMISSION_OWNER_GATED = true as const;
export const CAPITAL_SUBMISSION_FIT = 'NOT_EVALUATED' as const;
export const CAPITAL_SUBMISSION_FINANCING_STATUS = 'UNKNOWN' as const;
/** Research intelligence copies entitled titles only. No live scrape / GTM outbound. */
export const RESEARCH_INTELLIGENCE_POLICY_CLASS = 'SOURCE_BACKED_ONLY' as const;
export const RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH = false as const;
export const RESEARCH_INTELLIGENCE_FINANCING_STATUS = 'UNKNOWN' as const;
export const RESEARCH_INTELLIGENCE_FIT = 'NOT_EVALUATED' as const;
export const RESEARCH_SUBJECT_KINDS = [
  'lender',
  'investor',
  'vendor',
  'client',
  'industry',
] as const;
export type ResearchSubjectKind = (typeof RESEARCH_SUBJECT_KINDS)[number];
export const ASK_ATLAS_OPERATOR_AGENT = 'atlas-hub-operator' as const;
export const ASK_ATLAS_RUNTIME_AGENT = 'atlas-hub-runtime' as const;
export const GET_ATTENTION_ITEMS_TOOL = 'get_attention_items' as const;
export const GET_CLIENT_CONTEXT_TOOL = 'get_client_context' as const;
export const GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL = 'search_authorized_knowledge' as const;
export const CREATE_ENGINEERING_MISSION_TOOL = 'create_engineering_mission' as const;
export const ENGINEERING_MISSION_DISPATCH_STATUS = 'ready_for_bounded_execution' as const;
export const V4_CHAT_INJECT = 'UNSUPPORTED' as const;

export const ASK_ATLAS_RANKING = [
  'At Risk',
  'Overdue',
  'Decision Required',
  'Capital',
  'Waiting',
  'Blocked',
] as const;

export type AskAtlasAttentionState = (typeof ASK_ATLAS_RANKING)[number];
export type AskAtlasClassification = 'CONFIRMED' | 'LIKELY' | 'PROPOSED';

export interface AskAtlasAttentionItem {
  id: string;
  state: AskAtlasAttentionState;
  why: string;
  basedOn: string;
  evidence: string;
  provenance: AskAtlasClassification;
  classification: AskAtlasClassification;
  client?: string;
  clientCode?: string;
  kind: string;
  /** Meeting copies set this false. Never invent a rank, amount, or transcript. */
  invented?: false;
  /** Authoritative Outlook/SharePoint webUrl only. Never SAS or anonymous share. */
  webUrl?: string;
  /** Copied from already-indexed outlook-calendar sourceEventId. */
  sourceEventId?: string;
}

export type AskAtlasPolicyDecision = 'answered' | 'honest_empty' | 'hvs_blocked' | 'fail_closed';
export type AskAtlasReadWriteStatus = 'READ_AUTO' | 'PROPOSE_AUTO' | 'SAFE_INTERNAL_WRITE';

export type AskAtlasAgent = typeof ASK_ATLAS_OPERATOR_AGENT | typeof ASK_ATLAS_RUNTIME_AGENT;
export type AskAtlasMissionKey =
  | typeof ASK_ATLAS_MISSION_KEY
  | typeof ASK_ATLAS_RUNTIME_MISSION_KEY
  | typeof ASK_ATLAS_EVENT_MISSION_KEY
  | typeof ASK_ATLAS_PII_MISSION_KEY
  | typeof ASK_ATLAS_LOOP_MISSION_KEY
  | typeof ASK_ATLAS_CLIENTCTX_MISSION_KEY
  | typeof ASK_ATLAS_RECOVERED_MISSION_KEY
  | typeof ASK_ATLAS_SEARCH_MISSION_KEY
  | typeof ASK_ATLAS_SEARCH_002_MISSION_KEY
  | typeof ASK_ATLAS_SEARCH_ACTIONABILITY_MISSION_KEY
  | typeof ASK_ATLAS_ATTENTION_NL_MISSION_KEY
  | typeof ASK_ATLAS_AI_COMMUNICATIONS_MISSION_KEY;

/**
 * Operating-state words. These are Ask Atlas attention filters, not client
 * names. extractClientContextQuery / resolveAuthorizedClient must not bind
 * them to recovered folders (e.g. SYN01 "Atlas Capital Operations").
 */
export const RESERVED_OPERATING_STATE_TOKENS = [
  'CAPITAL',
  'OVERDUE',
  'WAITING',
  'BLOCKED',
  'AT RISK',
  'DECISION',
  'DECISIONS',
  'ATTENTION',
] as const;

export function isReservedOperatingStateToken(token: string): boolean {
  const normalized = token.trim().replace(/\s+/g, ' ').replace(/[?!.]+$/g, '').toUpperCase();
  return (RESERVED_OPERATING_STATE_TOKENS as readonly string[]).includes(normalized);
}
export type AskAtlasTrigger =
  | 'operator_operating_picture'
  | 'signed_operator_question'
  | 'authorized_internal_event'
  | 'scheduled_sweep'
  | 'signed_operator_inspect';

export type ProductImprovementEvidenceClass =
  | 'failed_agent_action'
  | 'event_processing_failure'
  | 'entitled_search_failure'
  | 'production_health_degradation'
  | 'repeated_failed_workflow'
  | 'recorded_product_surface_gap';

export type ClientContextEvidenceClass =
  | 'recovered_folder_filename'
  | 'recovered_knowledge'
  | 'attention_item'
  | 'hub_mi_row'
  | 'honest_empty';

export interface AtlasClientContextBinding {
  client?: string;
  clientCode?: string;
  entitled: boolean;
  hubMiOperationalized: boolean;
}

export interface AtlasClientContext {
  kind: 'atlas_client_context_v1';
  invented: false;
  honestEmpty: boolean;
  client: AtlasClientContextBinding;
  why: string;
  basedOn: string;
  provenance: AskAtlasClassification | 'HONEST_EMPTY';
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  evidenceClass: ClientContextEvidenceClass;
  realClientsOperationalized: string[];
  recoveredKnowledgeOperationalized: boolean;
  waitingItems?: ActionableWaitingItem[];
  missingDocuments?: ActionableMissingDocument[];
  hvcgResponsibilities?: ActionableResponsibility[];
  clientResponsibilities?: ActionableResponsibility[];
  decisions?: ActionableDecision[];
  nextActions?: string[];
  nextAction?: string;
  /**
   * Same copied project_operating_record_v1 payload as authorizedSearch.projects.
   * Attached only for a bound current entitled client from already-loaded
   * entitled index rows. Historical HVS recovered projects stay read-only.
   * Optional researchRelationship copies already-authorized same-scope
   * researchIntelligence items (same RelatedMeetingResearchRef as meetings /
   * documents / capital). Optional relatedDocuments is the inverse of
   * document.relatedProject (same RelatedMeetingDocumentRef /
   * relatedDocumentsForMeeting path). Missing / non-canonical ClientCode
   * omits researchRelationship / relatedDocuments (fail-closed; never guess).
   */
  projects: {
    kind: 'project_operating_record_v1';
    policyClass: 'READ_AUTO';
    invented: false;
    currentClientsFirst: true;
    items: ProjectOperatingRecord[];
  };
  /**
   * Thread context from already-indexed entitled mail previews only.
   * Suggested reply stays DRAFT_ONLY. Never AUTO_RESPOND / send.
   * Optional relatedMeetings is the inverse of meeting relatedEmail:
   * already-authorized same-scope meetings only. Optional
   * researchRelationship copies already-authorized same-scope
   * researchIntelligence items (same RelatedMeetingResearchRef as
   * meetings / documents / projects / capital). Optional relatedDocuments
   * is the inverse of document.relatedEmail (same RelatedMeetingDocumentRef
   * / relatedDocumentsForMeeting path). Missing / non-canonical ClientCode
   * omits researchRelationship / relatedDocuments (fail-closed; never guess).
   */
  threads: MailThreadOperatingPayload;
  /**
   * PREPARE-only capital submission request from already-entitled Atlas/index
   * evidence. External lender/investor submit stays OWNER-GATED.
   * Optional relatedMeetings is the inverse of meeting capitalRelationship:
   * already-authorized same-scope meetings only. Optional
   * researchRelationship copies already-authorized same-scope
   * researchIntelligence items (same RelatedMeetingResearchRef as
   * meetings / onboarding / client support). Missing / non-canonical
   * ClientCode omits researchRelationship (fail-closed; never guess).
   */
  capitalSubmissions: CapitalSubmissionPreparePayload;
  /**
   * Source-backed research intelligence from already-entitled Atlas/index
   * evidence and the existing sourced lender catalog titles. Stores source,
   * retrieval date, confidence, and superseded state. Lender criteria and
   * financing status are never invented. Optional relatedMeetings is the
   * same entitled same-scope inverse used by documents / projects / threads
   * / capital / onboarding / client support. Optional relatedDocuments is
   * the inverse of document.researchRelationship (same RelatedMeetingDocumentRef
   * / relatedDocumentsForMeeting path). Optional relatedProjects is the
   * inverse of project.researchRelationship (same RelatedDocumentProjectRef
   * / relatedProjects path). Optional relatedThreads is the inverse of
   * thread.researchRelationship (same RelatedDocumentEmailRef /
   * relatedEmails path). Optional relatedCapital is the inverse of
   * capital.researchRelationship (same RelatedDocumentCapitalRef /
   * relatedCapital path). Omitted when ClientCode is missing /
   * non-canonical (fail-closed; never guess). Unscoped lender catalog
   * rows never receive scoped documents, projects, threads, or capital.
   * Preview stays off this slice (refs only). Comms stay DRAFT_ONLY — no
   * preview body, suggestedDraft, or send on the thread refs. Capital
   * stays PREPARE_ONLY — send=false / externalSubmit=false /
   * ownerGated=true / financingStatus UNKNOWN / HONEST_EMPTY. Never
   * invent TargetAmount, lender criteria, fit, or financing status.
   */
  researchIntelligence: ResearchIntelligencePayload;
  /**
   * Native governed onboarding agent from already-entitled Atlas/index
   * intake evidence. Activation, completion, Hub-MI, and GTM stay OWNER-GATED.
   * Optional relatedMeetings is the same entitled same-scope inverse used
   * by documents / projects / threads / capital / client support. Optional
   * researchRelationship copies already-authorized same-scope
   * researchIntelligence items (same RelatedMeetingResearchRef as meetings).
   * Both omitted when ClientCode is missing.
   */
  onboarding: OnboardingAgentPayload;
  /**
   * Native governed client support / routing agent from already-entitled
   * Atlas/index communications, titled support work, and copied queues.
   * Reply / reassign / close stay OWNER-GATED. Send stays draft-only.
   * Optional relatedMeetings is the same entitled same-scope inverse used
   * by documents / projects / threads / capital. Optional
   * researchRelationship copies already-authorized same-scope
   * researchIntelligence items (same RelatedMeetingResearchRef as
   * meetings / onboarding). Both omitted when ClientCode is missing.
   */
  clientSupport: ClientSupportAgentPayload;
  /**
   * Same copied meeting_operating_record_v1 payload as authorizedSearch.meetings.
   * Attached only for a bound current entitled client from already-loaded
   * entitled HVCG_Meetings / extras.meetings / search kind=meeting rows.
   * Never a new Graph calendar or transcript query.
   */
  meetings: MeetingOperatingPayload;
}

export function clientContextMissionKey(
  ctx?: AtlasClientContext,
): typeof ASK_ATLAS_CLIENTCTX_MISSION_KEY | typeof ASK_ATLAS_RECOVERED_MISSION_KEY {
  if (
    ctx &&
    (ctx.evidenceClass === 'recovered_folder_filename' || ctx.evidenceClass === 'recovered_knowledge')
  ) {
    return ASK_ATLAS_RECOVERED_MISSION_KEY;
  }
  return ASK_ATLAS_CLIENTCTX_MISSION_KEY;
}

export interface AtlasAuthorizedSearchHit {
  kind: string;
  id: string;
  title: string;
  href?: string;
  source?: string;
  clientCode?: string;
  /** Authoritative SharePoint/OneDrive webUrl. Never SAS or anonymous share. */
  webUrl?: string;
  modifiedAt?: string;
  why: string;
  basedOn: string;
  provenance: AskAtlasClassification | 'HONEST_EMPTY';
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  /** Existing operator-picture queue membership. Copied, never invented. */
  queue?: string;
  evidence?: string;
  nextAction?: string;
  /** Copied from an existing entitled HVCG_Projects row. Never invented. */
  objective?: string;
  ownerName?: string;
  startDate?: string;
  targetCompletionDate?: string;
  status?: string;
  /** Indexed mail bodyPreview only. Never a live Outlook body fetch. */
  preview?: string;
  conversationId?: string;
  direction?: 'Inbound' | 'Outbound' | 'Internal';
  /** Copied from an existing entitled HVCG_Clients.Industry. Never invented. */
  industry?: string;
  /** Copied from an existing entitled HVCG_Clients.ClientStage. Never invented. */
  clientStage?: string;
  /** Proven Graph drive/item ids from the file index. Never invented. */
  driveId?: string;
  itemId?: string;
  /** Copied from already-indexed outlook-mail-attachment metadata. */
  parentMessageId?: string;
  attachmentId?: string;
  contentType?: string;
  size?: number;
  /** Copied from already-indexed HVCG_Meetings / outlook-calendar rows. */
  sourceEventId?: string;
}

export type DocumentPreviewStatus = 'ready' | 'skipped' | 'error';
export type DocumentVersionStatus = DocumentPreviewStatus;

export interface DocumentOperatingRecord {
  id: string;
  title: string;
  webUrl: string;
  modifiedAt?: string;
  clientCode?: string;
  provenance: AskAtlasClassification;
  source: string;
  /**
   * Short-lived Graph driveItem preview. Never an anonymous permanent link.
   * ready only when Graph returned getUrl/postUrl. skipped/error never claim LIVE.
   */
  previewStatus?: DocumentPreviewStatus;
  previewExpiresAt?: string;
  previewGetUrl?: string;
  previewPostUrl?: string;
  previewSkipReason?: string;
  /** Set when a Graph preview was attempted. Points at Graph preview, not a share link. */
  basedOn?: string;
  /**
   * Optional related operating context copied from already-authorized search
   * hits / composed projects / threads / capital. Never invented. Client
   * isolation is applied before attach.
   */
  relatedEmail?: RelatedDocumentEmailRef[];
  relatedProject?: RelatedDocumentProjectRef[];
  relatedContract?: RelatedDocumentContractRef[];
  capitalRelationship?: RelatedDocumentCapitalRef[];
  /**
   * Already-authorized entitled HVCG_Meetings / search kind=meeting refs.
   * Copied after authorization. Never a new Graph calendar query.
   */
  relatedMeetings?: RelatedDocumentMeetingRef[];
  /**
   * Already-indexed outlook-mail-attachment metadata refs. Copied after
   * authorization. Never binaries, SAS, or anonymous share URLs.
   */
  relatedAttachments?: RelatedDocumentAttachmentRef[];
  /**
   * Inverse of researchIntelligence.relatedMeetings: already-authorized
   * same-scope researchIntelligence items (same RelatedMeetingResearchRef
   * as meetings / onboarding / client support / capital). Omitted when
   * ClientCode is missing / non-canonical (fail-closed; never guess).
   * Unscoped lender catalog titles never attach to a scoped document.
   * No downloadUrl, transcript, attendees, TargetAmount, or invented
   * criteria.
   */
  researchRelationship?: RelatedMeetingResearchRef[];
  /** Parent Outlook message id from the existing attachment index. */
  parentMessageId?: string;
  attachmentId?: string;
  contentType?: string;
  size?: number;
  /**
   * Graph driveItem version metadata. ready only when Graph returned version
   * ids. skipped/error never claim LIVE. Never includes downloadUrl.
   */
  versionStatus?: DocumentVersionStatus;
  versionSkipReason?: string;
  currentVersionId?: string;
  versionCount?: number;
  versions?: Array<{ id: string; lastModifiedDateTime?: string; size?: number }>;
  versionBasedOn?: string;
}

export interface RelatedDocumentEmailRef {
  id: string;
  title: string;
  conversationId?: string;
  /** Parent Outlook message id when this email is the attachment's parent. */
  parentMessageId?: string;
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  /** Authoritative SharePoint/Outlook webUrl only. Never SAS or anonymous share. */
  webUrl?: string;
}

export interface RelatedDocumentAttachmentRef {
  id: string;
  title: string;
  parentMessageId?: string;
  attachmentId?: string;
  contentType?: string;
  size?: number;
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  binariesInAtlas: false;
  /** Authoritative parent-message webUrl only. Never SAS or anonymous share. */
  webUrl?: string;
}

export interface RelatedDocumentProjectRef {
  id: string;
  title: string;
  clientCode?: string;
  classification: ProjectOperatingClassification;
  source: string;
  historicalHvs: boolean;
  hubMiRow: boolean;
  invented: false;
}

export interface RelatedDocumentContractRef {
  id: string;
  title: string;
  source: string;
  /** CONFIRMED only when title/source already names contract / SOW / proposal / capital packet. */
  classification: 'CONFIRMED' | 'LIKELY';
  webUrl?: string;
}

export interface RelatedDocumentCapitalRef {
  id: string;
  title: string;
  clientCode?: string;
  policyClass: typeof CAPITAL_SUBMISSION_POLICY_CLASS;
  financingStatus: typeof CAPITAL_SUBMISSION_FINANCING_STATUS;
  financingStatusClassification: 'HONEST_EMPTY';
  lenderCriteriaInvented: false;
  invented: false;
}

export interface RelatedDocumentMeetingRef {
  id: string;
  title: string;
  clientCode?: string;
  date?: string;
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  /** Authoritative Outlook/SharePoint webUrl only. Never SAS or anonymous share. */
  webUrl?: string;
  /** Copied from already-indexed outlook-calendar sourceEventId. */
  sourceEventId?: string;
}

/**
 * Inverse of document relatedMeetings: an entitled document already on
 * authorizedSearch.documents / hits kind=document. Never binaries, SAS,
 * anonymous share, downloadUrl, or transcript text.
 */
export interface RelatedMeetingDocumentRef {
  id: string;
  title: string;
  clientCode?: string;
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  source: string;
  webUrl?: string;
}

/**
 * Inverse of researchIntelligence.relatedMeetings. Reused on
 * MeetingOperatingRecord, OnboardingAgentRecord,
 * ClientSupportAgentRecord, CapitalSubmissionPrepareRecord,
 * DocumentOperatingRecord, and ProjectOperatingRecord.
 * Honesty mirrors RelatedDocumentCapitalRef: source-backed titles
 * only. Never downloadUrl, transcript, attendees, TargetAmount, or
 * invented lender criteria.
 */
export interface RelatedMeetingResearchRef {
  id: string;
  title: string;
  clientCode?: string;
  source: string;
  retrievalDate?: string;
  confidence: ResearchIntelligenceEvidenceClass;
  classification: ResearchIntelligenceEvidenceClass;
  superseded: boolean;
  invented: false;
  lenderCriteriaInvented: false;
  financingStatus: typeof RESEARCH_INTELLIGENCE_FINANCING_STATUS;
  fit: typeof RESEARCH_INTELLIGENCE_FIT;
  policyClass: typeof RESEARCH_INTELLIGENCE_POLICY_CLASS;
}

/**
 * First-class entitled meeting operating record. Copied from already-authorized
 * extras.meetings / HVCG_Meetings / search hits kind=meeting. Never invents
 * transcript text, binaries, SAS, or anonymous share URLs.
 * Optional related* fields are the inverse of document relatedMeetings:
 * already-authorized same-scope documents / email / projects / attachments /
 * capital / research only.
 */
export interface MeetingOperatingRecord {
  id: string;
  title: string;
  clientCode?: string;
  date?: string;
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  source: string;
  invented: false;
  /** Authoritative Outlook/SharePoint webUrl only. Never SAS or anonymous share. */
  webUrl?: string;
  /** Copied from already-indexed outlook-calendar sourceEventId. */
  sourceEventId?: string;
  relatedDocuments?: RelatedMeetingDocumentRef[];
  relatedEmail?: RelatedDocumentEmailRef[];
  relatedProject?: RelatedDocumentProjectRef[];
  relatedAttachments?: RelatedDocumentAttachmentRef[];
  capitalRelationship?: RelatedDocumentCapitalRef[];
  /**
   * Inverse of researchIntelligence.relatedMeetings: already-authorized
   * same-scope researchIntelligence items. Omitted when ClientCode is
   * missing / non-canonical (fail-closed; never guess). Unscoped lender
   * catalog titles never attach to a scoped meeting. No downloadUrl,
   * transcript, attendees, TargetAmount, or invented criteria.
   */
  researchRelationship?: RelatedMeetingResearchRef[];
}

export interface MeetingOperatingPayload {
  kind: 'meeting_operating_record_v1';
  policyClass: 'READ_AUTO';
  invented: false;
  items: MeetingOperatingRecord[];
}

export type ProjectOperatingClassification =
  | 'CONFIRMED'
  | 'LIKELY'
  | 'PROPOSED'
  | 'STALE_OR_UNCERTAIN'
  | 'COMPLETE';

export interface ProjectOperatingEvidenceRef {
  kind: string;
  id: string;
  title: string;
  source?: string;
  modifiedAt?: string;
  webUrl?: string;
}

export interface ProjectOperatingRecord {
  id: string;
  title: string;
  clientCode?: string;
  classification: ProjectOperatingClassification;
  source: string;
  historicalHvs: boolean;
  hubMiRow: boolean;
  invented: false;
  operationalized: boolean;
  objective?: string;
  scope?: string;
  participants?: string[];
  timeline?: Array<{ at: string; title: string; source: string }>;
  deliverables?: string[];
  nextAction?: string;
  evidence?: string;
  evidenceRefs?: ProjectOperatingEvidenceRef[];
  /**
   * Inverse of meeting relatedProject: already-authorized entitled
   * HVCG_Meetings / extras.meetings / search kind=meeting refs.
   * Reuses RelatedDocumentMeetingRef. Copied after authorization.
   * Never a new Graph calendar query, downloadUrl, or transcript text.
   */
  relatedMeetings?: RelatedDocumentMeetingRef[];
  /**
   * Inverse of researchIntelligence.relatedMeetings: already-authorized
   * same-scope researchIntelligence items (same RelatedMeetingResearchRef
   * as meetings / onboarding / client support / capital / documents).
   * Omitted when ClientCode is missing / non-canonical (fail-closed;
   * never guess). Unscoped lender catalog titles never attach to a
   * scoped project. No downloadUrl, transcript, attendees, TargetAmount,
   * or invented criteria. Classification stays CONFIRMED / LIKELY /
   * PROPOSED / STALE_OR_UNCERTAIN / COMPLETE. hubMiRow stays as composed
   * on the source row (never invented).
   */
  researchRelationship?: RelatedMeetingResearchRef[];
  /**
   * Inverse of document.relatedProject: already-authorized same-scope
   * documents / hits kind=document refs. Reuses RelatedMeetingDocumentRef
   * / relatedDocumentsForMeeting(). Copied after authorization. Omitted
   * when none are entitled or when ClientCode is missing / non-canonical
   * (fail-closed; never guess). Unscoped never receives scoped documents.
   * Client A never receives Client B. Never downloadUrl, transcript,
   * attendees, TargetAmount, invented titles, ClientCodes, or Hub-MI.
   * SAS / anonymous webUrl dropped. No invented facts.
   */
  relatedDocuments?: RelatedMeetingDocumentRef[];
}

export type MailThreadEvidenceClass = AskAtlasClassification | 'HONEST_EMPTY';

export interface MailThreadDetectedItem {
  text: string;
  classification: AskAtlasClassification;
  evidence: string;
}

export interface MailThreadSuggestedDraft {
  policyClass: typeof COMMUNICATIONS_POLICY_CLASS;
  send: typeof COMMUNICATIONS_SEND;
  autoRespond: typeof COMMUNICATIONS_AUTO_RESPOND;
  subject: string;
  body: string;
  status: 'draft';
}

export interface MailThreadOperatingRecord {
  id: string;
  conversationId: string;
  title: string;
  clientCode?: string;
  channel: 'Email';
  direction?: 'Inbound' | 'Outbound' | 'Internal';
  preview: string;
  summary: string;
  summarySource: 'indexed_preview_only';
  invented: false;
  webUrl?: string;
  modifiedAt?: string;
  classification: MailThreadEvidenceClass;
  provenance: MailThreadEvidenceClass;
  commitments: MailThreadDetectedItem[];
  unansweredQuestions: MailThreadDetectedItem[];
  suggestedDraft: MailThreadSuggestedDraft;
  /**
   * Inverse of meeting relatedEmail: already-authorized entitled
   * HVCG_Meetings / extras.meetings / search kind=meeting refs.
   * Reuses RelatedDocumentMeetingRef. Copied after authorization.
   * Never a new Graph calendar query, downloadUrl, or transcript text.
   */
  relatedMeetings?: RelatedDocumentMeetingRef[];
  /**
   * Inverse of researchIntelligence.relatedMeetings: already-authorized
   * same-scope researchIntelligence items (same RelatedMeetingResearchRef
   * as meetings / onboarding / client support / capital / documents /
   * projects). Omitted when ClientCode is missing / non-canonical
   * (fail-closed; never guess). Unscoped lender catalog titles never
   * attach to a scoped thread. No downloadUrl, transcript, attendees,
   * TargetAmount, or invented criteria. DRAFT_ONLY / send=false /
   * autoRespond=false / indexedPreviewOnly stay as composed.
   */
  researchRelationship?: RelatedMeetingResearchRef[];
  /**
   * Inverse of document.relatedEmail: already-authorized same-scope
   * documents / hits kind=document refs. Reuses RelatedMeetingDocumentRef
   * / relatedDocumentsForMeeting(). Copied after authorization. Omitted
   * when none are entitled or when ClientCode is missing / non-canonical
   * (fail-closed; never guess). Unscoped never receives scoped documents.
   * Client A never receives Client B. Never downloadUrl, transcript,
   * attendees, TargetAmount, invented titles, ClientCodes, or Hub-MI.
   * SAS / anonymous webUrl dropped. No preview body / suggestedDraft /
   * send on the refs. Comms stay DRAFT_ONLY. No invented facts.
   */
  relatedDocuments?: RelatedMeetingDocumentRef[];
}

export interface MailThreadOperatingPayload {
  kind: 'mail_thread_operating_record_v1';
  policyClass: typeof COMMUNICATIONS_POLICY_CLASS;
  invented: false;
  autoRespond: typeof COMMUNICATIONS_AUTO_RESPOND;
  send: typeof COMMUNICATIONS_SEND;
  indexedPreviewOnly: true;
  items: MailThreadOperatingRecord[];
}

export type CapitalSubmissionEvidenceClass = AskAtlasClassification | 'HONEST_EMPTY';

export interface CapitalSubmissionEvidenceRef {
  kind: string;
  id: string;
  title: string;
  source?: string;
  classification: AskAtlasClassification;
  webUrl?: string;
}

export interface CapitalSubmissionCatalogCopy {
  lenderId: string;
  lenderName: string;
  classification: AskAtlasClassification;
  fit: typeof CAPITAL_SUBMISSION_FIT;
  criteriaInvented: false;
  invented: false;
  evidence: string;
}

export interface CapitalSubmissionPrepareRecord {
  id: string;
  title: string;
  clientCode?: string;
  classification: CapitalSubmissionEvidenceClass;
  provenance: CapitalSubmissionEvidenceClass;
  invented: false;
  financingStatus: typeof CAPITAL_SUBMISSION_FINANCING_STATUS;
  financingStatusClassification: 'HONEST_EMPTY';
  lenderCriteriaInvented: false;
  evidence: CapitalSubmissionEvidenceRef[];
  missingRequirements: string[];
  nextAction: string;
  /**
   * Inverse of meeting capitalRelationship: already-authorized entitled
   * HVCG_Meetings / extras.meetings / search kind=meeting refs.
   * Reuses RelatedDocumentMeetingRef. Copied after authorization.
   * Never a new Graph calendar query, downloadUrl, or transcript text.
   * PREPARE_ONLY stays as composed. TargetAmount is never invented.
   */
  relatedMeetings?: RelatedDocumentMeetingRef[];
  /**
   * Inverse of researchIntelligence.relatedMeetings: already-authorized
   * same-scope researchIntelligence items (same RelatedMeetingResearchRef
   * as meetings / onboarding / client support). Omitted when ClientCode
   * is missing / non-canonical (fail-closed; never guess). Unscoped
   * lender catalog titles never attach to a scoped capital row. No
   * downloadUrl, transcript, attendees, TargetAmount, or invented
   * criteria. PREPARE_ONLY / send=false / externalSubmit=false /
   * ownerGated=true / financingStatus UNKNOWN stay as composed.
   */
  researchRelationship?: RelatedMeetingResearchRef[];
}

export interface CapitalSubmissionPreparePayload {
  kind: 'capital_submission_request_v1';
  policyClass: typeof CAPITAL_SUBMISSION_POLICY_CLASS;
  invented: false;
  send: typeof CAPITAL_SUBMISSION_SEND;
  externalSubmit: typeof CAPITAL_SUBMISSION_EXTERNAL_SUBMIT;
  ownerGated: typeof CAPITAL_SUBMISSION_OWNER_GATED;
  catalogCopies: CapitalSubmissionCatalogCopy[];
  items: CapitalSubmissionPrepareRecord[];
}

export type ResearchIntelligenceEvidenceClass = AskAtlasClassification | 'HONEST_EMPTY';

export interface ResearchIntelligenceRecord {
  id: string;
  subjectKind: ResearchSubjectKind;
  title: string;
  source: string;
  retrievalDate: string;
  confidence: ResearchIntelligenceEvidenceClass;
  superseded: boolean;
  supersededBy?: string;
  clientCode?: string;
  classification: ResearchIntelligenceEvidenceClass;
  invented: false;
  lenderCriteriaInvented: false;
  financingStatus: typeof RESEARCH_INTELLIGENCE_FINANCING_STATUS;
  fit: typeof RESEARCH_INTELLIGENCE_FIT;
  evidence: string;
  /**
   * Optional inverse of meeting research evidence: already-authorized
   * same-scope HVCG_Meetings / search kind=meeting refs. Copied after
   * authorization. Omitted when none are entitled or when ClientCode is
   * missing / non-canonical (fail-closed; never guess). Never a new Graph
   * calendar query, transcript, attendees, downloadUrl, invented titles,
   * ClientCodes, lender criteria, financing status, or fit.
   */
  relatedMeetings?: RelatedDocumentMeetingRef[];
  /**
   * Inverse of document.researchRelationship: already-authorized
   * same-scope documents / hits kind=document refs. Reuses
   * RelatedMeetingDocumentRef / relatedDocumentsForMeeting(). Copied after
   * authorization. Omitted when none are entitled or when ClientCode is
   * missing / non-canonical (fail-closed; never guess). Unscoped lender
   * catalog rows never receive scoped documents. Unscoped never receives
   * scoped documents. Client A never receives Client B. Never downloadUrl,
   * transcript, attendees, TargetAmount, invented titles, ClientCodes,
   * lender criteria, financing status, fit, or Hub-MI. Preview stays off
   * this slice (refs only). SAS / anonymous webUrl dropped.
   */
  relatedDocuments?: RelatedMeetingDocumentRef[];
  /**
   * Inverse of project.researchRelationship: already-authorized
   * same-scope project operating records. Reuses RelatedDocumentProjectRef
   * / relatedProjects(). Copied after authorization. Omitted when none
   * are entitled or when ClientCode is missing / non-canonical
   * (fail-closed; never guess). Unscoped lender catalog rows never
   * receive scoped projects. Unscoped never receives scoped projects.
   * Client A never receives Client B. Classification stays CONFIRMED /
   * LIKELY / PROPOSED / STALE_OR_UNCERTAIN / COMPLETE. hubMiRow stays
   * as composed on the source project (never invented). Never
   * downloadUrl, transcript, attendees, TargetAmount, invented titles,
   * ClientCodes, lender criteria, financing status, or fit.
   */
  relatedProjects?: RelatedDocumentProjectRef[];
  /**
   * Inverse of thread.researchRelationship: already-authorized
   * same-scope mail-thread operating records. Reuses RelatedDocumentEmailRef
   * / relatedEmails(). Copied after authorization. Omitted when none
   * are entitled or when ClientCode is missing / non-canonical
   * (fail-closed; never guess). Unscoped lender catalog rows never
   * receive scoped threads. Unscoped never receives scoped threads.
   * Client A never receives Client B. Refs only — no preview body,
   * suggestedDraft, or send. DRAFT_ONLY / send=false / autoRespond=false
   * / indexedPreviewOnly stay as composed on the source thread payload.
   * Never downloadUrl, transcript, attendees, TargetAmount, invented
   * titles, ClientCodes, lender criteria, financing status, fit, or
   * Hub-MI. SAS / anonymous webUrl dropped.
   */
  relatedThreads?: RelatedDocumentEmailRef[];
  /**
   * Inverse of capital.researchRelationship: already-authorized
   * same-scope capital-prepare records. Reuses RelatedDocumentCapitalRef
   * / relatedCapital(). Copied after authorization. Omitted when none
   * are entitled or when ClientCode is missing / non-canonical
   * (fail-closed; never guess). Unscoped lender catalog rows never
   * receive scoped capital. Unscoped never receives scoped capital.
   * Client A never receives Client B. PREPARE_ONLY flags stay as
   * composed — send=false / externalSubmit=false / ownerGated=true /
   * financingStatus UNKNOWN / financingStatusClassification
   * HONEST_EMPTY / lenderCriteriaInvented=false / invented=false.
   * Never downloadUrl, transcript, attendees, TargetAmount, invented
   * titles, ClientCodes, lender criteria, fit, financing status, or
   * Hub-MI.
   */
  relatedCapital?: RelatedDocumentCapitalRef[];
}

export interface ResearchIntelligencePayload {
  kind: 'research_intelligence_v1';
  policyClass: typeof RESEARCH_INTELLIGENCE_POLICY_CLASS;
  invented: false;
  outboundRefresh: typeof RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH;
  financingStatus: typeof RESEARCH_INTELLIGENCE_FINANCING_STATUS;
  lenderCriteriaInvented: false;
  retrievedAt: string;
  items: ResearchIntelligenceRecord[];
}

export type OnboardingEvidenceClass = AskAtlasClassification | 'HONEST_EMPTY';
export type OnboardingEvidenceKind =
  | 'client'
  | 'lead'
  | 'project'
  | 'task'
  | 'opportunity'
  | 'recovered_client';

export interface OnboardingEvidenceRef {
  kind: string;
  id: string;
  title: string;
  source?: string;
  classification: AskAtlasClassification;
}

export interface OnboardingOwnerDecision {
  decision: string;
  status: 'escalated';
  execute: false;
}

export interface OnboardingAgentRecord {
  id: string;
  title: string;
  clientCode?: string;
  clientStage?: string;
  evidenceKind: OnboardingEvidenceKind;
  classification: OnboardingEvidenceClass;
  provenance: OnboardingEvidenceClass;
  invented: false;
  hubMiRow: false;
  execute: false;
  activate: false;
  send: false;
  liveGtmOutbound: false;
  evidence: OnboardingEvidenceRef[];
  missingRequirements: string[];
  ownerDecisions: OnboardingOwnerDecision[];
  nextAction: string;
  /**
   * Optional inverse of meeting onboarding evidence: already-authorized
   * same-scope HVCG_Meetings / search kind=meeting refs. Copied after
   * authorization. Omitted when none are entitled or when ClientCode is
   * missing (fail-closed; never guess). Never a new Graph calendar query,
   * transcript, attendees, or invented titles / ClientCodes.
   */
  relatedMeetings?: RelatedDocumentMeetingRef[];
  /**
   * Inverse of researchIntelligence.relatedMeetings: already-authorized
   * same-scope researchIntelligence items (same RelatedMeetingResearchRef
   * as meetings). Omitted when ClientCode is missing / non-canonical
   * (fail-closed; never guess). Unscoped lender catalog titles never
   * attach to a scoped onboarding item. No downloadUrl, transcript,
   * attendees, TargetAmount, or invented criteria.
   */
  researchRelationship?: RelatedMeetingResearchRef[];
}

export interface OnboardingAgentPayload {
  kind: 'onboarding_agent_v1';
  policyClass: typeof ONBOARDING_AGENT_POLICY_CLASS;
  invented: false;
  execute: typeof ONBOARDING_AGENT_EXECUTE;
  activate: typeof ONBOARDING_AGENT_ACTIVATE;
  send: typeof ONBOARDING_AGENT_SEND;
  liveGtmOutbound: typeof ONBOARDING_AGENT_LIVE_GTM_OUTBOUND;
  ownerGated: typeof ONBOARDING_AGENT_OWNER_GATED;
  hubMi: typeof ONBOARDING_AGENT_HUB_MI;
  items: OnboardingAgentRecord[];
}

export type ClientSupportEvidenceClass = AskAtlasClassification | 'HONEST_EMPTY';
export type ClientSupportEvidenceKind =
  | 'communication'
  | 'task'
  | 'meeting'
  | 'decision'
  | 'deliverable'
  | 'queue_item'
  | 'recovered_client';

export interface ClientSupportEvidenceRef {
  kind: string;
  id: string;
  title: string;
  source?: string;
  classification: AskAtlasClassification;
}

export interface ClientSupportOwnerDecision {
  decision: string;
  status: 'escalated';
  execute: false;
}

export interface ClientSupportAgentRecord {
  id: string;
  title: string;
  clientCode?: string;
  evidenceKind: ClientSupportEvidenceKind;
  /** Copied existing operator queue, or Owner review. Never invented. */
  suggestedRoute: string;
  classification: ClientSupportEvidenceClass;
  provenance: ClientSupportEvidenceClass;
  invented: false;
  hubMiRow: false;
  execute: false;
  send: false;
  autoRespond: false;
  draftOnly: true;
  evidence: ClientSupportEvidenceRef[];
  missingRequirements: string[];
  ownerDecisions: ClientSupportOwnerDecision[];
  nextAction: string;
  /**
   * Optional inverse of meeting support evidence: already-authorized
   * same-scope HVCG_Meetings / search kind=meeting refs. Copied after
   * authorization. Omitted when none are entitled or when ClientCode is
   * missing (fail-closed; never guess). Never a new Graph calendar query,
   * transcript, attendees, or invented titles / ClientCodes.
   */
  relatedMeetings?: RelatedDocumentMeetingRef[];
  /**
   * Inverse of researchIntelligence.relatedMeetings: already-authorized
   * same-scope researchIntelligence items (same RelatedMeetingResearchRef
   * as meetings / onboarding). Omitted when ClientCode is missing /
   * non-canonical (fail-closed; never guess). Unscoped lender catalog
   * titles never attach to a scoped support item. No downloadUrl,
   * transcript, attendees, TargetAmount, or invented criteria.
   */
  researchRelationship?: RelatedMeetingResearchRef[];
}

export interface ClientSupportAgentPayload {
  kind: 'client_support_agent_v1';
  policyClass: typeof CLIENT_SUPPORT_AGENT_POLICY_CLASS;
  invented: false;
  execute: typeof CLIENT_SUPPORT_AGENT_EXECUTE;
  send: typeof CLIENT_SUPPORT_AGENT_SEND;
  autoRespond: typeof CLIENT_SUPPORT_AGENT_AUTO_RESPOND;
  draftOnly: typeof CLIENT_SUPPORT_AGENT_DRAFT_ONLY;
  ownerGated: typeof CLIENT_SUPPORT_AGENT_OWNER_GATED;
  hubMi: typeof CLIENT_SUPPORT_AGENT_HUB_MI;
  items: ClientSupportAgentRecord[];
}

export interface ProductResearchSurfaceRecord {
  surface: ProductResearchSurface;
  status: 'evaluated' | 'honest_empty';
  invented: false;
  inventMetrics: false;
  basedOn: string;
}

export interface ProductResearchAgentPayload {
  kind: 'product_research_agent_v1';
  missionKey: typeof ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY;
  invented: false;
  inventMetrics: false;
  execute: typeof PRODUCT_RESEARCH_AGENT_EXECUTE;
  surfaces: ProductResearchSurfaceRecord[];
}

export interface AtlasAuthorizedSearch {
  kind: 'atlas_authorized_search_v1';
  invented: false;
  honestEmpty: boolean;
  query: string;
  hitCount: number;
  hits: AtlasAuthorizedSearchHit[];
  /**
   * First-class entitled document operating records. Optional
   * researchRelationship copies already-authorized same-scope
   * researchIntelligence items (same RelatedMeetingResearchRef as
   * meetings / onboarding / client support / capital). Missing /
   * non-canonical ClientCode omits researchRelationship (fail-closed;
   * never guess). Preview stays time-limited Graph preview only.
   */
  documents: {
    kind: 'document_operating_record_v1';
    policyClass: 'READ_AUTO';
    binariesInAtlas: false;
    items: DocumentOperatingRecord[];
  };
  /**
   * First-class entitled project operating records. Optional
   * researchRelationship copies already-authorized same-scope
   * researchIntelligence items (same RelatedMeetingResearchRef as
   * meetings / onboarding / client support / capital / documents).
   * Optional relatedDocuments is the inverse of document.relatedProject
   * (same RelatedMeetingDocumentRef / relatedDocumentsForMeeting path).
   * Missing / non-canonical ClientCode omits researchRelationship /
   * relatedDocuments (fail-closed; never guess). relatedMeetings stays
   * as composed. No downloadUrl. No invented facts.
   */
  projects: {
    kind: 'project_operating_record_v1';
    policyClass: 'READ_AUTO';
    invented: false;
    currentClientsFirst: true;
    items: ProjectOperatingRecord[];
  };
  /**
   * First-class entitled mail-thread operating records from already-
   * indexed entitled mail previews. Suggested reply stays DRAFT_ONLY.
   * Optional relatedMeetings is the inverse of meeting relatedEmail.
   * Optional researchRelationship copies already-authorized same-scope
   * researchIntelligence items (same RelatedMeetingResearchRef as
   * meetings / onboarding / client support / capital / documents /
   * projects). Optional relatedDocuments is the inverse of
   * document.relatedEmail (same RelatedMeetingDocumentRef /
   * relatedDocumentsForMeeting path). Missing / non-canonical ClientCode
   * omits researchRelationship / relatedDocuments (fail-closed; never
   * guess). send=false / autoRespond=false / indexedPreviewOnly stay
   * as composed. No preview body / suggestedDraft / send on the refs.
   */
  threads: MailThreadOperatingPayload;
  /**
   * First-class entitled HVCG_Meetings / extras.meetings / search kind=meeting
   * operating records. Copied after ClientCode entitlement. Never a new Graph
   * calendar or transcript query.
   */
  meetings: MeetingOperatingPayload;
  /**
   * PREPARE-only capital request. Optional relatedMeetings is the inverse
   * of meeting capitalRelationship: already-authorized same-scope meetings.
   * Optional researchRelationship copies already-authorized same-scope
   * researchIntelligence items (same RelatedMeetingResearchRef as
   * meetings / onboarding / client support). Missing / non-canonical
   * ClientCode omits researchRelationship (fail-closed; never guess).
   */
  capitalSubmissions: CapitalSubmissionPreparePayload;
  /**
   * Source-backed research copies. Optional relatedMeetings on each item
   * is the entitled same-scope HVCG_Meetings inverse. Optional
   * relatedDocuments is the inverse of document.researchRelationship
   * (same RelatedMeetingDocumentRef / relatedDocumentsForMeeting path).
   * Optional relatedProjects is the inverse of project.researchRelationship
   * (same RelatedDocumentProjectRef / relatedProjects path). Optional
   * relatedThreads is the inverse of thread.researchRelationship (same
   * RelatedDocumentEmailRef / relatedEmails path). Optional relatedCapital
   * is the inverse of capital.researchRelationship (same
   * RelatedDocumentCapitalRef / relatedCapital path). Empty payload stays
   * empty. Missing / non-canonical ClientCode omits relatedMeetings /
   * relatedDocuments / relatedProjects / relatedThreads / relatedCapital.
   * Unscoped lender catalog rows never receive scoped documents,
   * projects, threads, or capital. Preview stays off this slice (refs
   * only). Comms stay DRAFT_ONLY — no preview body, suggestedDraft, or
   * send on the thread refs. Capital stays PREPARE_ONLY — send=false /
   * externalSubmit=false / ownerGated=true / financingStatus UNKNOWN /
   * HONEST_EMPTY. Never invent TargetAmount, lender criteria, fit, or
   * financing status.
   */
  researchIntelligence: ResearchIntelligencePayload;
  /**
   * Native governed onboarding agent. Optional relatedMeetings on each item
   * is the entitled same-scope HVCG_Meetings inverse. Empty payload stays
   * empty. Missing ClientCode omits relatedMeetings.
   */
  onboarding: OnboardingAgentPayload;
  /**
   * Native governed client support / routing agent. Optional relatedMeetings
   * on each item is the entitled same-scope HVCG_Meetings inverse. Optional
   * researchRelationship copies already-authorized same-scope
   * researchIntelligence items. Empty payload stays empty. Missing
   * ClientCode omits relatedMeetings / researchRelationship.
   */
  clientSupport: ClientSupportAgentPayload;
  /**
   * Optional count-only fabric.clientHints extras (status/reason/count).
   * Copied from already-loaded entitled fabric status. Omitted when fabric
   * has no completed hint status (skipped / never_run). Isolation unchanged.
   */
  clientHints?: AtlasClientHintsExtra;
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  why: string;
  basedOn: string;
  entitled: boolean;
  ran: boolean;
  pictureComposed: boolean;
  actionabilityApplied: boolean;
}

export interface ProposedEngineeringMission {
  kind: 'proposed_engineering_mission_v1';
  authoritative: false;
  invented: false;
  status: 'PROPOSED';
  policyClass: 'PROPOSE_AUTO';
  readWriteStatus: 'SAFE_INTERNAL_WRITE';
  agent: typeof ASK_ATLAS_RUNTIME_AGENT;
  missionKey: typeof ASK_ATLAS_PII_MISSION_KEY;
  why: string;
  basedOn: string;
  evidenceClass: ProductImprovementEvidenceClass;
  classification: AskAtlasClassification;
  dispatchesV4: false;
  deploys: false;
  merges: false;
  executesCodeChanges: false;
  ownerGated: false;
}

export interface PersistedEngineeringMissionRecord {
  kind: 'persisted_engineering_mission_v1';
  authoritative: false;
  invented: false;
  status: 'PROPOSED';
  dispatchStatus: typeof ENGINEERING_MISSION_DISPATCH_STATUS;
  v4ChatInject: typeof V4_CHAT_INJECT;
  policyClass: 'SAFE_INTERNAL_WRITE';
  readWriteStatus: 'SAFE_INTERNAL_WRITE';
  agent: typeof ASK_ATLAS_RUNTIME_AGENT;
  missionKey: typeof ASK_ATLAS_LOOP_MISSION_KEY;
  sourceMissionKey: typeof ASK_ATLAS_PII_MISSION_KEY;
  why: string;
  basedOn: string;
  evidenceClass: ProductImprovementEvidenceClass;
  classification: AskAtlasClassification;
  dispatchesV4: false;
  deploys: false;
  merges: false;
  executesCodeChanges: false;
  ownerGated: false;
  persistedAt: string;
}

export interface AskAtlasActivity {
  agent: AskAtlasAgent;
  missionKey: AskAtlasMissionKey;
  trigger: AskAtlasTrigger;
  timestamp: string;
  tools: string[];
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  result: 'answered' | 'honest_empty' | 'hvs_blocked';
  readWriteStatus: AskAtlasReadWriteStatus;
  policyDecision: Exclude<AskAtlasPolicyDecision, 'fail_closed'>;
  ran?: boolean;
}

export interface AgentActivityAffectedEntity {
  client?: string;
  clientCode?: string;
  classification?: AskAtlasClassification;
}

export interface AgentActivityLedgerEntry {
  agent: string;
  missionKey: string;
  trigger: string;
  timestamp: string;
  tools: string[];
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  confidence: AskAtlasClassification | 'HONEST_EMPTY';
  result: AskAtlasPolicyDecision;
  readWriteStatus: AskAtlasReadWriteStatus;
  policyDecision: AskAtlasPolicyDecision;
  affected?: AgentActivityAffectedEntity[];
  writerUserId: string;
  ran?: boolean;
}

export const AGENT_ACTIVITY_CONTRACT = 'atlas-hub-agent-activity.v1' as const;

export interface AskAtlasAnswer {
  kind: 'ask_atlas_attention_v1';
  question: typeof ASK_ATLAS_QUESTION;
  invented: false;
  honestEmpty: boolean;
  ranking: AskAtlasAttentionState[];
  items: AskAtlasAttentionItem[];
  activity: AskAtlasActivity;
}

export interface OperatorRecoveryRow {
  client: string;
  clientCode: string;
  dataType: string;
  accessible: boolean;
  operationalized: boolean;
  provenance: KnowledgeProvenance;
  blocker: string;
}

export interface OperatorRecoveredHvsClient {
  client: string;
  clientCode: string;
  provenance: 'CONFIRMED';
  operationalized: false;
  hubMiAccessible: false;
  knowledgeIndexed: true;
  documentCount: number;
  documentClasses: string[];
  nextAction: string;
}

export interface OperatorRecoveredHvsDocument {
  client: string;
  clientCode: string;
  name: string;
  kind: 'file' | 'folder';
  documentClass: string;
  provenance: 'CONFIRMED';
  amountsExtracted: false;
}

export interface OperatorRecoveredHvsProject {
  client: string;
  clientCode: string;
  title: string;
  provenance: KnowledgeProvenance;
  operationalized: false;
  evidence: string;
  nextAction: string;
}

export interface OperatorRecoveredClientRecord {
  client: string;
  clientCode: string;
  provenance: 'CONFIRMED';
  hubMiOperationalized: false;
  knowledgeOperationalized: boolean;
  documentCount: number;
  fileCount: number;
  documentClasses: string[];
  projectTitles: string[];
  capitalPacketNames: string[];
  invoiceFilenames: string[];
  nextActions: string[];
  decisionsRequired: string[];
  waitingItems: ActionableWaitingItem[];
  missingDocuments: ActionableMissingDocument[];
  hvcgResponsibilities: ActionableResponsibility[];
  clientResponsibilities: ActionableResponsibility[];
  decisions: ActionableDecision[];
  nextAction: string;
}

export interface OperatorRecoveredCapitalPacket {
  client: string;
  clientCode: string;
  name: string;
  provenance: 'CONFIRMED';
  queue: 'Needs Action';
  amountsExtracted: false;
  nextAction: string;
}

export interface OperatorOperatingPicture {
  kind: 'operator_operating_picture_v1';
  invented: false;
  hvsDataAccess: 'AVAILABLE' | 'PARTIAL' | 'BLOCKED';
  realClientsOperationalized: string[];
  syntheticClientsVisible: string[];
  honestEmpty: boolean;
  queues: {
    needsAction: OperatorOperatingItem[];
    waiting: OperatorOperatingItem[];
    overdue: OperatorOperatingItem[];
    blocked: OperatorOperatingItem[];
    decisionRequired: OperatorOperatingItem[];
    atRisk: OperatorOperatingItem[];
    ready: OperatorOperatingItem[];
    outcomes: OperatorOperatingItem[];
  };
  syntheticQueues: {
    needsAction: OperatorOperatingItem[];
    waiting: OperatorOperatingItem[];
    overdue: OperatorOperatingItem[];
    blocked: OperatorOperatingItem[];
    decisionRequired: OperatorOperatingItem[];
    atRisk: OperatorOperatingItem[];
    ready: OperatorOperatingItem[];
    outcomes: OperatorOperatingItem[];
  };
  missingData: string[];
  recoveryLedger: OperatorRecoveryRow[];
  hvsRecoveredClients: OperatorRecoveredHvsClient[];
  hvsRecoveredDocuments: OperatorRecoveredHvsDocument[];
  hvsRecoveredProjects: OperatorRecoveredHvsProject[];
  hvsRecoveredClientRecords: OperatorRecoveredClientRecord[];
  hvsRecoveredCapitalPackets: OperatorRecoveredCapitalPacket[];
  recoveredClientsKnowledgeOperationalized: string[];
  hvsActionableClientKnowledge: ActionableClientKnowledge[];
  /**
   * Optional count-only fabric.clientHints extras (status/reason/count).
   * Copied from already-loaded entitled fabric status. Omitted when fabric
   * has no completed hint status (skipped / never_run).
   */
  clientHints?: AtlasClientHintsExtra;
}

export interface OperatorClientJourney {
  clientCode: string;
  classification: 'SYNTHETIC_QA' | 'CLIENT' | 'READ_ONLY_CLIENT';
  workspaceStaged: boolean;
  activationGate: string | null;
  invitationStatus: 'none' | 'staged' | 'redeemed' | 'expired' | 'revoked';
  invitationOutboundSent: false;
  signedClientSession: boolean;
  bindingCount: number;
  openRequestCount: number;
  documentCount: number;
  gccWorkspaceKey: string;
  previewHref: string;
  stageHref: string;
  reissueHref: string;
  redeemHref: '/api/client/invitations/redeem';
  invitationEmail: string | null;
  canStageFromDesk: boolean;
  canReissueInviteFromDesk: boolean;
  nextAction: string;
}

export interface OperatorSearchHit {
  id: string;
  title: string;
  kind?: string;
  href?: string;
  clientCode?: string;
  source?: string;
  webUrl?: string;
  modifiedAt?: string;
  provenance?: AskAtlasClassification;
  preview?: string;
  conversationId?: string;
  direction?: 'Inbound' | 'Outbound' | 'Internal';
  industry?: string;
}

export interface OperatorDeskModel {
  contractVersion: typeof OPERATOR_DESK_CONTRACT;
  entitled: true;
  liveGtmOutbound: false;
  paidAds: false;
  hubSha: string | null;
  entitledClients: string[];
  clientDeskPreviews: Array<{ clientCode: string; href: string }>;
  clientJourneys: OperatorClientJourney[];
  businessHealth: {
    activeProjects: number;
    atRiskProjects: number;
    openTasks: number;
    overdueTasks: number;
    decisionsNeeded: number;
    clientsNeedingAttention: number;
  };
  queues: {
    needsAction: OperatorQueueItem[];
    decisions: OperatorQueueItem[];
    overdue: OperatorQueueItem[];
    followUps: OperatorQueueItem[];
  };
  commercialContext: DeskCommercialContext;
  operatingPicture: OperatorOperatingPicture;
  askAtlas: AskAtlasAnswer;
  search: {
    q: string;
    hitCount: number;
    hits: OperatorSearchHit[];
    ran: boolean;
  };
}

export function isOperatorActivityLedgerPath(path: string): boolean {
  return path === '/operator/activity.json';
}

export function isOperatorRuntimePath(path: string): boolean {
  return path === '/operator/runtime.json';
}

export function isOperatorEventsPath(path: string): boolean {
  return path === '/operator/events.json';
}

export function isOperatorImprovementsPath(path: string): boolean {
  return path === '/operator/improvements.json';
}

export function isOperatorEngineeringMissionsPath(path: string): boolean {
  return path === '/operator/engineering-missions.json';
}

export function isOperatorClientContextPath(path: string): boolean {
  return path === '/operator/client-context.json';
}

export function isOperatorSearchPath(path: string): boolean {
  return path === '/operator/search.json';
}

export function isOperatorDeskPath(path: string): boolean {
  return (
    path === '/operator' ||
    path === '/desk' ||
    path === '/operator.json' ||
    isOperatorActivityLedgerPath(path) ||
    isOperatorRuntimePath(path) ||
    isOperatorEventsPath(path) ||
    isOperatorImprovementsPath(path) ||
    isOperatorEngineeringMissionsPath(path) ||
    isOperatorClientContextPath(path) ||
    isOperatorSearchPath(path)
  );
}

export function wantsOperatorJson(path: string, acceptHeader: string | undefined): boolean {
  if (
    path === '/operator.json' ||
    isOperatorActivityLedgerPath(path) ||
    isOperatorRuntimePath(path) ||
    isOperatorEventsPath(path) ||
    isOperatorImprovementsPath(path) ||
    isOperatorEngineeringMissionsPath(path) ||
    isOperatorClientContextPath(path) ||
    isOperatorSearchPath(path)
  ) {
    return true;
  }
  const accept = (acceptHeader || '').toLowerCase();
  return accept.includes('application/json') && !accept.includes('text/html');
}
