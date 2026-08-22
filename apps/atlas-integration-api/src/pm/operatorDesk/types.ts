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
  | typeof ASK_ATLAS_SEARCH_002_MISSION_KEY;
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
  | 'repeated_failed_workflow';

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
  why: string;
  basedOn: string;
  provenance: AskAtlasClassification | 'HONEST_EMPTY';
  classification: AskAtlasClassification | 'HONEST_EMPTY';
}

export interface AtlasAuthorizedSearch {
  kind: 'atlas_authorized_search_v1';
  invented: false;
  honestEmpty: boolean;
  query: string;
  hitCount: number;
  hits: AtlasAuthorizedSearchHit[];
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  why: string;
  basedOn: string;
  entitled: boolean;
  ran: boolean;
  pictureComposed: boolean;
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
