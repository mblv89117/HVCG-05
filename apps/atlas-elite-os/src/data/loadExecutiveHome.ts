import { microsoftConfig } from '../microsoft/config';
import * as dataverse from '../microsoft/adapters/dataverse';
import { executiveHomeData, pendingHomeMetrics } from './executiveHome';
import type { ApprovalRow, HomeMetric } from './executiveHome';
import type { DataSourceKind } from '../microsoft/types';
import { sanitizeFinancialDisplay } from './financeGuard';

export interface ExecutiveHomeModel {
  metrics: HomeMetric[];
  approvals: ApprovalRow[];
  activity: typeof executiveHomeData.activity;
  deadlines: typeof executiveHomeData.deadlines;
  pinnedClients: typeof executiveHomeData.pinnedClients;
  alerts: typeof executiveHomeData.alerts;
  initiatives: typeof executiveHomeData.initiatives;
  capitalReadiness: typeof executiveHomeData.capitalReadiness;
  cfoOperatingSummary: typeof executiveHomeData.cfoOperatingSummary;
  aiBrief: typeof executiveHomeData.aiBrief;
  aiRecommendations: string[];
  connection: {
    mode: 'dataverse' | 'pending-fallback';
    detail: string;
    error?: string;
    lastRefresh: string;
    reportingPeriod: string;
    verificationStatus: string;
    dataSource: string;
  };
}

function mapTrend(raw?: string): 'up' | 'down' | 'flat' {
  const t = (raw || '').toLowerCase();
  if (t.includes('up') || t.includes('↑')) return 'up';
  if (t.includes('down') || t.includes('↓')) return 'down';
  return 'flat';
}

function toSource(kind: DataSourceKind): HomeMetric['source'] {
  if (kind === 'Dataverse' || kind === 'Live') return 'Live';
  return 'Unavailable';
}

function nowIso() {
  return new Date().toISOString();
}

export async function loadExecutiveHome(signedIn: boolean): Promise<ExecutiveHomeModel> {
  const pending: ExecutiveHomeModel = {
    ...executiveHomeData,
    metrics: pendingHomeMetrics.map((m) => ({
      ...m,
      value: sanitizeFinancialDisplay(m.value, 'Awaiting verified data'),
      source: 'Unavailable' as const,
    })),
    aiRecommendations: executiveHomeData.aiBrief.recommendations,
    connection: {
      mode: 'pending-fallback',
      detail: 'Pending-safe fallback — no fabricated financial figures.',
      lastRefresh: nowIso(),
      reportingPeriod: 'Current month (pending ledger)',
      verificationStatus: 'Awaiting verified data',
      dataSource: 'None — pending verified Dataverse / ledger connection',
    },
  };

  if (!signedIn) {
    return pending;
  }

  try {
    const [approvals, kpis, brief] = await Promise.all([
      dataverse.listApprovals(),
      dataverse.listRevenueKpis(),
      dataverse.listBriefs(),
    ]);

    const metrics: HomeMetric[] = (kpis.data.length ? kpis.data : []).slice(0, 8).map((k, i) => ({
      id: k.id || `kpi-${i}`,
      label: k.name,
      value: sanitizeFinancialDisplay(k.value, 'Awaiting verified data'),
      unit: k.verificationStatus === 'Verified' ? k.unit : undefined,
      trend: mapTrend(k.trend),
      trendLabel: k.period || k.verificationStatus || 'Awaiting verified data',
      source: toSource(k.source),
      spark: [0, 0, 0, 0, 0, 0, 0],
    }));

    const approvalRows: ApprovalRow[] = approvals.data.map((a) => ({
      id: a.id,
      title: a.title,
      risk: a.risk,
      track: a.track,
      decision: a.decision,
      source: toSource(a.source) === 'Live' ? 'Live' : 'Unavailable',
    }));

    const topBrief = brief.data[0];
    const aiBrief = topBrief
      ? {
          generated: true,
          timestampLabel: `Dataverse brief · ${topBrief.title || 'Untitled'} · ${nowIso()}`,
          whatChanged: topBrief.whatChanged || pending.aiBrief.whatChanged,
          attention: topBrief.needsDecision || pending.aiBrief.attention,
          recommendations: [
            ...(topBrief.topActions
              ? topBrief.topActions
                  .split(/[;\n]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
              : []),
            ...pending.aiBrief.recommendations,
          ].slice(0, 5),
          risks: pending.aiBrief.risks,
          opportunities: pending.aiBrief.opportunities,
          decisionsAwaiting: topBrief.needsDecision
            ? [topBrief.needsDecision, ...pending.aiBrief.decisionsAwaiting.slice(0, 2)]
            : pending.aiBrief.decisionsAwaiting,
        }
      : pending.aiBrief;

    return {
      metrics: metrics.length ? metrics : pending.metrics,
      approvals: approvalRows.length ? approvalRows : pending.approvals,
      activity: pending.activity,
      deadlines: pending.deadlines,
      pinnedClients: pending.pinnedClients,
      alerts: pending.alerts,
      initiatives: pending.initiatives,
      capitalReadiness: pending.capitalReadiness,
      cfoOperatingSummary: pending.cfoOperatingSummary,
      aiBrief,
      aiRecommendations: aiBrief.recommendations,
      connection: {
        mode: 'dataverse',
        detail: approvals.detail || `Connected to ${microsoftConfig.dataverseUrl}`,
        lastRefresh: nowIso(),
        reportingPeriod: kpis.data[0]?.period || 'Current month (pending ledger)',
        verificationStatus: metrics.every((m) => m.source === 'Live')
          ? 'Verified where Live'
          : 'Mixed / awaiting verified financial figures',
        dataSource: microsoftConfig.dataverseUrl,
      },
    };
  } catch (e) {
    if (!microsoftConfig.allowSampleFallback) throw e;
    return {
      ...pending,
      connection: {
        ...pending.connection,
        detail: 'Dataverse call failed — pending-safe fallback (no fabricated finance).',
        error: e instanceof Error ? e.message : String(e),
        lastRefresh: nowIso(),
      },
    };
  }
}
