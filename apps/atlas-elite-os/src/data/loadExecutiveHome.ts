import { microsoftConfig } from '../microsoft/config';
import * as dataverse from '../microsoft/adapters/dataverse';
import { executiveHomeData, pendingHomeMetrics } from './executiveHome';
import type { ApprovalRow, HomeMetric } from './executiveHome';
import type { DataSourceKind } from '../microsoft/types';
import {
  isVerifiedDataSource,
  PENDING_LABELS,
  safeKpiDisplay,
} from './verifiedDisplay';
import { canViewFinance } from '../security/rbac';

export interface ExecutiveHomeModel {
  metrics: HomeMetric[];
  approvals: ApprovalRow[];
  activity: typeof executiveHomeData.activity;
  deadlines: typeof executiveHomeData.deadlines;
  pinnedClients: typeof executiveHomeData.pinnedClients;
  alerts: typeof executiveHomeData.alerts;
  initiatives: typeof executiveHomeData.initiatives;
  capitalReadiness: typeof executiveHomeData.capitalReadiness;
  aiBrief: typeof executiveHomeData.aiBrief;
  aiRecommendations: string[];
  connection: {
    mode: 'dataverse' | 'sample-fallback';
    detail: string;
    error?: string;
    lastRefresh: string;
  };
}

function mapTrend(raw?: string): 'up' | 'down' | 'flat' {
  const t = (raw || '').toLowerCase();
  if (t.includes('up') || t.includes('↑')) return 'up';
  if (t.includes('down') || t.includes('↓')) return 'down';
  return 'flat';
}

function toSource(kind: DataSourceKind, verified: boolean): HomeMetric['source'] {
  if (verified && (kind === 'Dataverse' || kind === 'Live')) return 'Live';
  if (kind === 'Unavailable') return 'Unavailable';
  if (kind === 'Development sample') return 'Development sample';
  return verified ? 'Live' : 'Unavailable';
}

function nowIso() {
  return new Date().toISOString();
}

const ZERO_SPARK = [0, 0, 0, 0, 0, 0, 0];

export async function loadExecutiveHome(signedIn: boolean): Promise<ExecutiveHomeModel> {
  const financeAllowed = canViewFinance();
  const sample: ExecutiveHomeModel = {
    ...executiveHomeData,
    metrics: financeAllowed ? pendingHomeMetrics : pendingHomeMetrics.map((m) => ({
      ...m,
      value: PENDING_LABELS.awaiting,
      trendLabel: 'Role-restricted or pending',
      source: 'Unavailable',
      spark: ZERO_SPARK,
    })),
    aiRecommendations: executiveHomeData.aiBrief.recommendations,
    connection: {
      mode: 'sample-fallback',
      detail: microsoftConfig.allowSampleFallback
        ? 'Pending-safe fallback (no fabricated financial figures). Sign in to load verified Dataverse when available.'
        : 'Sample fallback disabled.',
      lastRefresh: nowIso(),
    },
  };

  if (!signedIn) {
    return sample;
  }

  try {
    const [approvals, kpis, brief] = await Promise.all([
      dataverse.listApprovals(),
      financeAllowed
        ? dataverse.listRevenueKpis()
        : Promise.resolve({ data: [], source: 'Unavailable' as const, detail: 'Finance role required' }),
      dataverse.listBriefs(),
    ]);

    const metrics: HomeMetric[] = (kpis.data.length ? kpis.data : []).slice(0, 8).map((k, i) => {
      const verified = isVerifiedDataSource(k.verificationLabel);
      const value = safeKpiDisplay(k.value, {
        verified,
        emptyLabel: PENDING_LABELS.notCalculated,
      });
      return {
        id: k.id || `kpi-${i}`,
        label: k.name || `KPI ${i + 1}`,
        value,
        unit: verified && value !== PENDING_LABELS.pending && value !== PENDING_LABELS.notCalculated && value !== PENDING_LABELS.awaiting
          ? k.unit
          : undefined,
        trend: verified ? mapTrend(k.trend) : 'flat',
        trendLabel: verified ? k.period || k.trend || 'Verified' : PENDING_LABELS.pending,
        source: toSource(k.source, verified),
        spark: verified ? ZERO_SPARK : ZERO_SPARK,
      };
    });

    const approvalRows: ApprovalRow[] = approvals.data.map((a) => ({
      id: a.id,
      title: a.title,
      risk: a.risk,
      track: a.track,
      decision: a.decision,
      source: toSource(a.source, true),
    }));

    const topBrief = brief.data[0];
    const aiBrief = topBrief
      ? {
          generated: true,
          timestampLabel: `Dataverse brief · ${topBrief.title || 'Untitled'} · ${nowIso()}`,
          whatChanged: topBrief.whatChanged || sample.aiBrief.whatChanged,
          attention: topBrief.needsDecision || sample.aiBrief.attention,
          recommendations: [
            ...(topBrief.topActions
              ? topBrief.topActions.split(/[;\n]/).map((s) => s.trim()).filter(Boolean)
              : []),
            ...sample.aiBrief.recommendations,
          ].slice(0, 5),
          risks: sample.aiBrief.risks,
          opportunities: sample.aiBrief.opportunities,
          decisionsAwaiting: topBrief.needsDecision
            ? [topBrief.needsDecision, ...sample.aiBrief.decisionsAwaiting.slice(0, 2)]
            : sample.aiBrief.decisionsAwaiting,
        }
      : sample.aiBrief;

    const aiRecommendations = [
      ...(topBrief?.needsDecision ? [topBrief.needsDecision] : []),
      ...(topBrief?.topActions ? [topBrief.topActions] : []),
      ...aiBrief.recommendations,
    ].slice(0, 5);

    return {
      metrics: metrics.length ? metrics : pendingHomeMetrics,
      approvals: approvalRows.length ? approvalRows : sample.approvals,
      activity: sample.activity,
      deadlines: sample.deadlines,
      pinnedClients: sample.pinnedClients,
      alerts: sample.alerts,
      initiatives: sample.initiatives,
      capitalReadiness: sample.capitalReadiness,
      aiBrief,
      aiRecommendations,
      connection: {
        mode: 'dataverse',
        detail: approvals.detail || `Connected to ${microsoftConfig.dataverseUrl} · KPI values gated to verified sources only`,
        lastRefresh: nowIso(),
      },
    };
  } catch (e) {
    if (!microsoftConfig.allowSampleFallback) throw e;
    return {
      ...sample,
      connection: {
        mode: 'sample-fallback',
        detail: 'Dataverse call failed — showing pending-safe fallback (no fabricated finance).',
        error: e instanceof Error ? e.message : String(e),
        lastRefresh: nowIso(),
      },
    };
  }
}
