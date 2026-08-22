import type { DeskCommercialContext } from '../commercialContext/types.ts';
import { EMPTY_REASON } from '../commercialContext/types.ts';
import type { KnowledgeOperatingPicture } from '../sharepoint/knowledgeOperating.ts';
import {
  hvsAccessMissingData,
  hvsConfirmedClientFolders,
  resolveHvsDataAccess,
} from '../sharepoint/hvsRecoveryInventory.ts';
import {
  hvsRecoveredActions,
  hvsRecoveredDocumentSummary,
  hvsRecoveredDocuments,
  isHvsRecoveredKind,
} from '../sharepoint/hvsRecoveredDocuments.ts';
import { hvsRecoveredProjects } from '../sharepoint/hvsRecoveredProjects.ts';
import { hvsActionableClientKnowledge, hvsActionableWaitingItems } from '../sharepoint/hvsActionableClientKnowledge.ts';
import {
  hvsRecoveredCapitalPackets,
  hvsRecoveredClientRecords,
  recoveredClientsKnowledgeOperationalized,
} from '../sharepoint/hvsRecoveredClientRecords.ts';
import { OPERATOR_DESK_CONTRACT, type OperatorClientJourney, type OperatorDeskModel, type OperatorOperatingItem, type OperatorOperatingPicture, type OperatorQueueItem } from './types.ts';

function textOf(value: unknown, ...keys: string[]): string {
  if (!value || typeof value !== 'object') return typeof value === 'string' ? value : '';
  const rec = value as Record<string, unknown>;
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function item(
  value: unknown,
  kind: string,
  fallbackHref?: string,
): OperatorQueueItem | null {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const id = textOf(rec, 'id') || textOf(rec, 'opportunityId') || textOf(rec, 'leadId');
  const title =
    textOf(rec, 'title') ||
    textOf(rec, 'whatIsNeeded') ||
    textOf(rec, 'name') ||
    textOf(rec, 'label');
  if (!id && !title) return null;
  const href = textOf(rec, 'href') || fallbackHref;
  return { id: id || title, title: title || id, href: href || undefined, kind };
}

function listItems(raw: unknown, kind: string, limit = 20): OperatorQueueItem[] {
  if (!Array.isArray(raw)) return [];
  const out: OperatorQueueItem[] = [];
  for (const row of raw) {
    const mapped = item(row, kind);
    if (mapped) out.push(mapped);
    if (out.length >= limit) break;
  }
  return out;
}

function num(rec: Record<string, unknown> | undefined, key: string): number {
  const v = rec?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export function emptyHonestDesk(entitledClientCount: number): DeskCommercialContext {
  return {
    contractVersion: 'atlas-operator-commercial-context.v1',
    entitled: true,
    liveGtmOutbound: false,
    paidAds: false,
    entitledClientCount,
    gcc: { available: false, recordedOnly: true, count: 0, emptyReason: EMPTY_REASON.gcc },
    copilot: { available: false, recordedOnly: true, count: 0, emptyReason: EMPTY_REASON.copilot },
    gtm: { available: false, recordedOnly: true, count: 0, emptyReason: EMPTY_REASON.gtm },
    rows: [],
  };
}

function mapQueue(
  rows: KnowledgeOperatingPicture['queues'][keyof KnowledgeOperatingPicture['queues']] | undefined,
): OperatorOperatingItem[] {
  return (rows || []).slice(0, 20).map((row) => ({
    id: row.id,
    clientCode: row.clientCode,
    title: row.title,
    queue: row.queue,
    kind: row.kind,
    provenance: row.provenance,
    href:
      isHvsRecoveredKind(row.kind) || !row.clientCode
        ? undefined
        : `/api/pm/clients/${row.clientCode}/desk`,
  }));
}

export function emptyHonestOperatingPicture(): OperatorOperatingPicture {
  const hvsDataAccess = resolveHvsDataAccess();
  const recovered =
    hvsDataAccess === 'BLOCKED'
      ? []
      : hvsConfirmedClientFolders().map((row) => {
          const summary = hvsRecoveredDocumentSummary(row.client);
          return {
            client: row.client,
            clientCode: row.clientCode,
            provenance: 'CONFIRMED' as const,
            operationalized: false as const,
            hubMiAccessible: false as const,
            knowledgeIndexed: true as const,
            documentCount: summary.documentCount,
            documentClasses: summary.documentClasses,
            nextAction:
              summary.fileCount > 0
                ? 'Review recovered first-level files as reference-only knowledge. Do not invent Hub MI rows or amounts.'
                : row.nextAction,
          };
        });
  const waiting =
    hvsDataAccess === 'BLOCKED'
      ? []
      : hvsActionableWaitingItems().map((row) => ({
          id: row.id,
          clientCode: row.clientCode,
          title: row.title,
          queue: 'Waiting',
          kind: 'hvs_actionable_waiting',
          provenance: row.classification,
        }));
  const actions =
    hvsDataAccess === 'BLOCKED'
      ? []
      : hvsRecoveredActions().map((row) => ({
          id: row.id,
          clientCode: row.clientCode,
          title: row.title,
          queue: row.queue,
          kind: row.kind,
          provenance: row.provenance,
        }));
  const documents =
    hvsDataAccess === 'BLOCKED'
      ? []
      : hvsRecoveredDocuments().map((row) => ({
          client: row.client,
          clientCode: row.clientCode,
          name: row.name,
          kind: row.kind,
          documentClass: row.documentClass,
          provenance: 'CONFIRMED' as const,
          amountsExtracted: false as const,
        }));
  return {
    kind: 'operator_operating_picture_v1',
    invented: false,
    hvsDataAccess,
    realClientsOperationalized: [],
    syntheticClientsVisible: [],
    honestEmpty: true,
    queues: {
      needsAction: actions.filter((row) => row.queue === 'Needs Action'),
      waiting,
      overdue: [],
      blocked: [],
      decisionRequired: actions.filter((row) => row.queue === 'Decision Required'),
      atRisk: [],
      ready: actions.filter((row) => row.queue === 'Ready'),
      outcomes: [],
    },
    syntheticQueues: {
      needsAction: [],
      waiting: [],
      overdue: [],
      blocked: [],
      decisionRequired: [],
      atRisk: [],
      ready: [],
      outcomes: [],
    },
    missingData: [
      hvsAccessMissingData(hvsDataAccess),
      'Hub MI HVCG_Clients remain fail-closed. Atlas does not invent unseen SharePoint rows.',
      'No entitled Hub-visible customer work has been operationalized for this principal.',
    ],
    recoveryLedger: [],
    hvsRecoveredClients: recovered,
    hvsRecoveredDocuments: documents,
    hvsRecoveredProjects:
      hvsDataAccess === 'BLOCKED'
        ? []
        : hvsRecoveredProjects().map((row) => ({
            client: row.client,
            clientCode: row.clientCode,
            title: row.title,
            provenance: row.provenance,
            operationalized: false as const,
            evidence: row.evidence,
            nextAction: row.nextAction,
          })),
    hvsRecoveredClientRecords:
      hvsDataAccess === 'BLOCKED'
        ? []
        : hvsRecoveredClientRecords().map((row) => ({
            client: row.client,
            clientCode: row.clientCode,
            provenance: 'CONFIRMED' as const,
            hubMiOperationalized: false as const,
            knowledgeOperationalized: row.knowledgeOperationalized,
            documentCount: row.documentCount,
            fileCount: row.fileCount,
            documentClasses: row.documentClasses,
            projectTitles: row.projectTitles,
            capitalPacketNames: row.capitalPacketNames,
            invoiceFilenames: row.invoiceFilenames,
            nextActions: row.nextActions,
            decisionsRequired: row.decisionsRequired,
            waitingItems: row.waitingItems,
            missingDocuments: row.missingDocuments,
            hvcgResponsibilities: row.hvcgResponsibilities,
            clientResponsibilities: row.clientResponsibilities,
            decisions: row.decisions,
            nextAction: row.nextAction,
          })),
    hvsRecoveredCapitalPackets:
      hvsDataAccess === 'BLOCKED'
        ? []
        : hvsRecoveredCapitalPackets().map((row) => ({
            client: row.client,
            clientCode: row.clientCode,
            name: row.name,
            provenance: 'CONFIRMED' as const,
            queue: 'Needs Action' as const,
            amountsExtracted: false as const,
            nextAction: row.nextAction,
          })),
    recoveredClientsKnowledgeOperationalized:
      hvsDataAccess === 'BLOCKED' ? [] : recoveredClientsKnowledgeOperationalized(),
    hvsActionableClientKnowledge:
      hvsDataAccess === 'BLOCKED' ? [] : hvsActionableClientKnowledge(),
  };
}

export function operatorOperatingPictureFromKnowledge(
  knowledge?: KnowledgeOperatingPicture | null,
): OperatorOperatingPicture {
  if (!knowledge) return emptyHonestOperatingPicture();
  const missingData: string[] = [];
  missingData.push(hvsAccessMissingData(knowledge.hvsDataAccess));
  if (knowledge.syntheticClientsVisible.length) {
    missingData.push('SYNTHETIC_QA clients are labeled fixtures, not customer operationalizations.');
  }
  if (knowledge.honestEmpty) {
    missingData.push('No entitled Hub-visible customer work has been operationalized for this principal.');
  }
  for (const row of knowledge.recoveryLedger) {
    if (row.accessible === false && row.blocker) missingData.push(`${row.client}: ${row.blocker}`);
  }
  return {
    kind: 'operator_operating_picture_v1',
    invented: false,
    hvsDataAccess: knowledge.hvsDataAccess,
    realClientsOperationalized: knowledge.realClientsOperationalized,
    syntheticClientsVisible: knowledge.syntheticClientsVisible,
    honestEmpty: knowledge.honestEmpty,
    queues: {
      needsAction: mapQueue(knowledge.queues['Needs Action']),
      waiting: mapQueue(knowledge.queues.Waiting),
      overdue: mapQueue(knowledge.queues.Overdue),
      blocked: mapQueue(knowledge.queues.Blocked),
      decisionRequired: mapQueue(knowledge.queues['Decision Required']),
      atRisk: mapQueue(knowledge.queues['At Risk']),
      ready: mapQueue(knowledge.queues.Ready),
      outcomes: mapQueue(knowledge.queues.Outcomes),
    },
    syntheticQueues: {
      needsAction: mapQueue(knowledge.syntheticQueues?.['Needs Action']),
      waiting: mapQueue(knowledge.syntheticQueues?.Waiting),
      overdue: mapQueue(knowledge.syntheticQueues?.Overdue),
      blocked: mapQueue(knowledge.syntheticQueues?.Blocked),
      decisionRequired: mapQueue(knowledge.syntheticQueues?.['Decision Required']),
      atRisk: mapQueue(knowledge.syntheticQueues?.['At Risk']),
      ready: mapQueue(knowledge.syntheticQueues?.Ready),
      outcomes: mapQueue(knowledge.syntheticQueues?.Outcomes),
    },
    missingData: [...new Set(missingData)].slice(0, 12),
    recoveryLedger: knowledge.recoveryLedger.slice(0, 80).map((row) => ({
      client: row.client,
      clientCode: row.clientCode,
      dataType: row.dataType,
      accessible: row.accessible,
      operationalized: row.operationalized,
      provenance: row.provenance,
      blocker: row.blocker,
    })),
    hvsRecoveredClients: (knowledge.hvsRecoveredClients || []).slice(0, 40).map((row) => ({
      client: row.client,
      clientCode: row.clientCode,
      provenance: 'CONFIRMED' as const,
      operationalized: false as const,
      hubMiAccessible: false as const,
      knowledgeIndexed: true as const,
      documentCount: row.documentCount,
      documentClasses: row.documentClasses,
      nextAction: row.nextAction,
    })),
    hvsRecoveredDocuments: (knowledge.hvsRecoveredDocuments || []).slice(0, 80).map((row) => ({
      client: row.client,
      clientCode: row.clientCode,
      name: row.name,
      kind: row.kind,
      documentClass: row.documentClass,
      provenance: 'CONFIRMED' as const,
      amountsExtracted: false as const,
    })),
    hvsRecoveredProjects: (knowledge.hvsRecoveredProjects || []).slice(0, 20).map((row) => ({
      client: row.client,
      clientCode: row.clientCode,
      title: row.title,
      provenance: row.provenance,
      operationalized: false as const,
      evidence: row.evidence,
      nextAction: row.nextAction,
    })),
    hvsRecoveredClientRecords: (knowledge.hvsRecoveredClientRecords || []).slice(0, 20).map((row) => ({
      client: row.client,
      clientCode: row.clientCode,
      provenance: 'CONFIRMED' as const,
      hubMiOperationalized: false as const,
      knowledgeOperationalized: row.knowledgeOperationalized,
      documentCount: row.documentCount,
      fileCount: row.fileCount,
      documentClasses: row.documentClasses,
      projectTitles: row.projectTitles,
      capitalPacketNames: row.capitalPacketNames,
      invoiceFilenames: row.invoiceFilenames,
      nextActions: row.nextActions,
      decisionsRequired: row.decisionsRequired,
      waitingItems: row.waitingItems || [],
      missingDocuments: row.missingDocuments || [],
      hvcgResponsibilities: row.hvcgResponsibilities || [],
      clientResponsibilities: row.clientResponsibilities || [],
      decisions: row.decisions || [],
      nextAction: row.nextAction,
    })),
    hvsRecoveredCapitalPackets: (knowledge.hvsRecoveredCapitalPackets || []).slice(0, 20).map((row) => ({
      client: row.client,
      clientCode: row.clientCode,
      name: row.name,
      provenance: 'CONFIRMED' as const,
      queue: 'Needs Action' as const,
      amountsExtracted: false as const,
      nextAction: row.nextAction,
    })),
    recoveredClientsKnowledgeOperationalized: knowledge.recoveredClientsKnowledgeOperationalized || [],
    hvsActionableClientKnowledge: knowledge.hvsActionableClientKnowledge || [],
  };
}

export function buildOperatorDeskModel(input: {
  hubSha: string | null;
  entitledClients: string[];
  commandCenter: Record<string, unknown> | null | undefined;
  commercialContext: DeskCommercialContext;
  searchQuery?: string;
  searchHits?: Array<{ id: string; title: string; kind?: string; href?: string; clientCode?: string }>;
  searchRan?: boolean;
  attentionItems?: OperatorQueueItem[];
  realClientsNeedingAttention?: number;
  operatingPicture?: OperatorOperatingPicture;
  clientJourneys?: OperatorClientJourney[];
}): OperatorDeskModel {
  const cc = input.commandCenter && typeof input.commandCenter === 'object' ? input.commandCenter : {};
  const health =
    cc.businessHealth && typeof cc.businessHealth === 'object'
      ? (cc.businessHealth as Record<string, unknown>)
      : {};
  const myDay = cc.myDay && typeof cc.myDay === 'object' ? (cc.myDay as Record<string, unknown>) : {};
  const alerts = listItems(cc.criticalAlerts, 'alert', 12);
  const ownerApprovals = listItems(cc.ownerApprovals, 'approval');
  const decisions = listItems(myDay.decisionsNeeded, 'decision');
  const overdue = listItems(myDay.overdue, 'overdue');
  const followUps = listItems(myDay.waitingFollowUps, 'follow_up');
  const attention = (input.attentionItems || []).slice(0, 20);
  const needsAction = [...attention, ...ownerApprovals, ...alerts].slice(0, 20);

  return {
    contractVersion: OPERATOR_DESK_CONTRACT,
    entitled: true,
    liveGtmOutbound: false,
    paidAds: false,
    hubSha: input.hubSha,
    entitledClients: input.entitledClients,
    clientDeskPreviews: input.entitledClients.map((clientCode) => ({
      clientCode,
      href: `/api/pm/clients/${clientCode}/desk`,
    })),
    clientJourneys: (input.clientJourneys || []).filter((row) =>
      input.entitledClients.includes(row.clientCode),
    ),
    businessHealth: {
      activeProjects: num(health, 'activeProjects'),
      atRiskProjects: num(health, 'atRiskProjects'),
      openTasks: num(health, 'openTasks'),
      overdueTasks: num(health, 'overdueTasks'),
      decisionsNeeded: num(health, 'decisionsNeeded') || decisions.length,
      clientsNeedingAttention: Math.max(
        num(health, 'clientsNeedingAttention'),
        input.realClientsNeedingAttention ?? 0,
      ),
    },
    queues: {
      needsAction,
      decisions: decisions.length ? decisions : ownerApprovals,
      overdue,
      followUps,
    },
    commercialContext: input.commercialContext,
    operatingPicture: input.operatingPicture || emptyHonestOperatingPicture(),
    search: {
      q: (input.searchQuery || '').trim().slice(0, 120),
      hitCount: input.searchHits?.length ?? 0,
      hits: (input.searchHits || []).slice(0, 25),
      ran: Boolean(input.searchRan),
    },
  };
}
