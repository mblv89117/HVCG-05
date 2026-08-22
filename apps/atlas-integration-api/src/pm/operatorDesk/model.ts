import type { DeskCommercialContext } from '../commercialContext/types.ts';
import { EMPTY_REASON } from '../commercialContext/types.ts';
import { OPERATOR_DESK_CONTRACT, type OperatorDeskModel, type OperatorQueueItem } from './types.ts';

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
    search: {
      q: (input.searchQuery || '').trim().slice(0, 120),
      hitCount: input.searchHits?.length ?? 0,
      hits: (input.searchHits || []).slice(0, 25),
      ran: Boolean(input.searchRan),
    },
  };
}
