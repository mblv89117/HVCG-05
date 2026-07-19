import { microsoftConfig } from '../microsoft/config';
import * as dataverse from '../microsoft/adapters/dataverse';
import { executiveHomeData } from './executiveHome';
import type { ApprovalRow, HomeMetric } from './executiveHome';
import type { DataSourceKind } from '../microsoft/types';

export interface ExecutiveHomeModel {
  metrics: HomeMetric[];
  approvals: ApprovalRow[];
  activity: typeof executiveHomeData.activity;
  deadlines: typeof executiveHomeData.deadlines;
  pinnedClients: typeof executiveHomeData.pinnedClients;
  aiRecommendations: string[];
  connection: {
    mode: 'dataverse' | 'sample-fallback';
    detail: string;
    error?: string;
  };
}

function mapTrend(raw?: string): 'up' | 'down' | 'flat' {
  const t = (raw || '').toLowerCase();
  if (t.includes('up') || t.includes('↑')) return 'up';
  if (t.includes('down') || t.includes('↓')) return 'down';
  return 'flat';
}

function toSource(kind: DataSourceKind): HomeMetric['source'] {
  if (kind === 'Dataverse' || kind === 'Live') return 'Repository-derived';
  if (kind === 'Unavailable') return 'Unavailable';
  if (kind === 'Development sample') return 'Development sample';
  return 'Repository-derived';
}

export async function loadExecutiveHome(signedIn: boolean): Promise<ExecutiveHomeModel> {
  const sample: ExecutiveHomeModel = {
    ...executiveHomeData,
    connection: {
      mode: 'sample-fallback',
      detail: microsoftConfig.allowSampleFallback
        ? 'Using labeled Development sample fallback (Microsoft data unavailable or not signed in).'
        : 'Sample fallback disabled.',
    },
  };

  if (!signedIn) {
    return sample;
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
      value: k.value,
      unit: k.unit,
      trend: mapTrend(k.trend),
      trendLabel: k.period || k.trend || 'Dataverse',
      source: toSource(k.source),
      spark: [3, 4, 5, 5, 6, 7, 8],
    }));

    const approvalRows: ApprovalRow[] = approvals.data.map((a) => ({
      id: a.id,
      title: a.title,
      risk: a.risk,
      track: a.track,
      decision: a.decision,
      source: toSource(a.source),
    }));

    const topBrief = brief.data[0];
    const aiRecommendations = [
      topBrief?.needsDecision || 'Review pending approvals in Dataverse.',
      topBrief?.topActions || 'Continue Track 10 Microsoft hosting gates.',
      'Model-driven admin app remains available for data management.',
    ];

    return {
      metrics: metrics.length ? metrics : sample.metrics,
      approvals: approvalRows.length ? approvalRows : sample.approvals,
      activity: sample.activity,
      deadlines: sample.deadlines,
      pinnedClients: sample.pinnedClients,
      aiRecommendations,
      connection: {
        mode: 'dataverse',
        detail: approvals.detail || `Connected to ${microsoftConfig.dataverseUrl}`,
      },
    };
  } catch (e) {
    if (!microsoftConfig.allowSampleFallback) throw e;
    return {
      ...sample,
      connection: {
        mode: 'sample-fallback',
        detail: 'Dataverse call failed — showing labeled sample fallback.',
        error: e instanceof Error ? e.message : String(e),
      },
    };
  }
}
