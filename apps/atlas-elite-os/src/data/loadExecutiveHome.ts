import { microsoftConfig } from '../microsoft/config';
import * as dataverse from '../microsoft/adapters/dataverse';
import { executiveHomeData, type ApprovalRow, type HomeMetric } from './executiveHome';
import { approvalsFromDataverse, metricsFromDataverseKpis } from './executiveHomeFromAdapter';

export { approvalsFromDataverse, metricsFromDataverseKpis } from './executiveHomeFromAdapter';

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
  growthOperatingSummary: typeof executiveHomeData.growthOperatingSummary;
  aiBrief: typeof executiveHomeData.aiBrief;
  aiRecommendations: string[];
  connection: {
    mode: 'dataverse' | 'unavailable';
    detail: string;
    error?: string;
    lastRefresh: string;
    reportingPeriod: string;
    verificationStatus: string;
    dataSource: string;
  };
}

function nowIso() {
  return new Date().toISOString();
}

const UNAVAILABLE_BRIEF: ExecutiveHomeModel['aiBrief'] = {
  generated: false,
  timestampLabel: 'Unavailable',
  whatChanged: 'No verified executive brief is available.',
  attention: 'Connect an approved live source before treating this surface as operational.',
  recommendations: [],
  risks: [],
  opportunities: [],
  decisionsAwaiting: [],
};

function unavailableHome(error?: unknown, signedIn = false): ExecutiveHomeModel {
  return {
    ...executiveHomeData,
    metrics: [],
    approvals: [],
    aiBrief: UNAVAILABLE_BRIEF,
    aiRecommendations: [],
    connection: {
      mode: 'unavailable',
      detail: error
        ? 'Dataverse request failed — KPI values are unavailable'
        : signedIn
          ? 'No usable Dataverse KPI rows'
          : 'Sign-in required — executive KPIs are unavailable',
      error: error instanceof Error ? error.message : error ? String(error) : undefined,
      lastRefresh: nowIso(),
      reportingPeriod: 'Unavailable',
      verificationStatus: 'Unavailable',
      dataSource: 'None',
    },
  };
}

export async function loadExecutiveHome(signedIn: boolean): Promise<ExecutiveHomeModel> {
  if (!signedIn) {
    return unavailableHome(undefined, false);
  }

  try {
    const [approvals, kpis, brief] = await Promise.all([
      dataverse.listApprovals(),
      dataverse.listRevenueKpis(),
      dataverse.listBriefs(),
    ]);

    const metrics = metricsFromDataverseKpis(kpis.data);
    const approvalRows = approvalsFromDataverse(approvals.data);
    const topBrief = brief.data[0];
    const aiBrief = topBrief
      ? {
          generated: true,
          timestampLabel: `Dataverse brief · ${topBrief.title || 'Untitled'} · ${nowIso()}`,
          whatChanged: topBrief.whatChanged || UNAVAILABLE_BRIEF.whatChanged,
          attention: topBrief.needsDecision || UNAVAILABLE_BRIEF.attention,
          recommendations: topBrief.topActions
            ? topBrief.topActions
                .split(/[;\n]/)
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 5)
            : [],
          risks: [] as string[],
          opportunities: [] as string[],
          decisionsAwaiting: topBrief.needsDecision ? [topBrief.needsDecision] : [],
        }
      : UNAVAILABLE_BRIEF;

    return {
      ...executiveHomeData,
      metrics,
      approvals: approvalRows,
      aiBrief,
      aiRecommendations: aiBrief.recommendations,
      connection: {
        mode: 'dataverse',
        detail: approvals.detail || `Connected to ${microsoftConfig.dataverseUrl}`,
        lastRefresh: nowIso(),
        reportingPeriod: kpis.data[0]?.period || 'Unavailable',
        verificationStatus: metrics.some((m) => m.status === 'Live')
          ? 'Live where proven'
          : metrics.length
            ? 'Not live — Dataverse adapter'
            : 'Unavailable — no KPI rows',
        dataSource: microsoftConfig.dataverseUrl,
      },
    };
  } catch (e) {
    return unavailableHome(e, true);
  }
}
