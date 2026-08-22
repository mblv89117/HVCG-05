import type { DeskCommercialContext } from '../commercialContext/types.ts';
import type { KnowledgeProvenance } from '../sharepoint/knowledgeClassification.ts';

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
