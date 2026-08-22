import type { DeskCommercialContext } from '../commercialContext/types.ts';
import { EMPTY_REASON } from '../commercialContext/types.ts';
import type { KnowledgeOperatingPicture } from '../sharepoint/knowledgeOperating.ts';
import { hvsAccessMissingData, resolveHvsDataAccess } from '../sharepoint/hvsRecoveryInventory.ts';
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
    href: row.clientCode ? `/api/pm/clients/${row.clientCode}/desk` : undefined,
  }));
}

export function emptyHonestOperatingPicture(): OperatorOperatingPicture {
  return {
    kind: 'operator_operating_picture_v1',
    invented: false,
    hvsDataAccess: resolveHvsDataAccess(),
    realClientsOperationalized: [],
    syntheticClientsVisible: [],
    honestEmpty: true,
    queues: {
      needsAction: [],
      waiting: [],
      overdue: [],
      blocked: [],
      decisionRequired: [],
      atRisk: [],
      ready: [],
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
      hvsAccessMissingData(resolveHvsDataAccess()),
      'Hub MI HVCG_Clients remain fail-closed. Atlas does not invent unseen SharePoint rows.',
      'No entitled Hub-visible customer work has been operationalized for this principal.',
    ],
    recoveryLedger: [],
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
