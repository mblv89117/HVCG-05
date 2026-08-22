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

export interface AskAtlasActivity {
  agent: 'atlas-hub-operator';
  missionKey: typeof ASK_ATLAS_MISSION_KEY;
  trigger: 'operator_operating_picture';
  timestamp: string;
  tools: string[];
  classification: AskAtlasClassification | 'HONEST_EMPTY';
  result: 'answered' | 'honest_empty' | 'hvs_blocked';
}

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

export function isOperatorDeskPath(path: string): boolean {
  return path === '/operator' || path === '/desk' || path === '/operator.json';
}

export function wantsOperatorJson(path: string, acceptHeader: string | undefined): boolean {
  if (path === '/operator.json') return true;
  const accept = (acceptHeader || '').toLowerCase();
  return accept.includes('application/json') && !accept.includes('text/html');
}
