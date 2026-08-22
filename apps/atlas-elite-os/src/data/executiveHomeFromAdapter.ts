import type { ApprovalRow, HomeMetric } from './executiveHome';
import type { AtlasRevenueKpi } from '../microsoft/types';
import { sanitizeFinancialDisplay } from './financeGuard';
import { classifyAdapterSource, type EvidenceClassification } from './evidenceProvenance';

function mapTrend(raw?: string): 'up' | 'down' | 'flat' {
  const t = (raw || '').toLowerCase();
  if (t.includes('up') || t.includes('↑')) return 'up';
  if (t.includes('down') || t.includes('↓')) return 'down';
  return 'flat';
}

function applyClassification<
  T extends { source: HomeMetric['source']; origin: HomeMetric['origin']; status: HomeMetric['status'] },
>(row: T, classified: EvidenceClassification): T {
  return {
    ...row,
    origin: classified.origin,
    status: classified.status,
    source:
      classified.origin === 'repository'
        ? 'Repository-derived'
        : classified.origin === 'development-sample'
          ? 'Development sample'
          : classified.status === 'Live'
            ? 'Live'
            : 'Unavailable',
  };
}

/** Empty Dataverse (or any empty adapter list) must not yield substitute KPI rows. */
export function metricsFromDataverseKpis(kpis: AtlasRevenueKpi[]): HomeMetric[] {
  if (!kpis.length) return [];
  return kpis.slice(0, 8).map((k, i) => {
    const classified = classifyAdapterSource(k.source, false);
    return applyClassification(
      {
        id: k.id || `kpi-${i}`,
        label: k.name,
        value: sanitizeFinancialDisplay(k.value, 'Awaiting verified data'),
        unit: k.verificationStatus === 'Verified' ? k.unit : undefined,
        trend: mapTrend(k.trend),
        trendLabel: k.period || k.verificationStatus || 'Awaiting verified data',
        source: 'Unavailable' as const,
        origin: classified.origin,
        status: classified.status,
        spark: [0, 0, 0, 0, 0, 0, 0],
      },
      classified,
    );
  });
}

export function approvalsFromDataverse(
  rows: Array<{ id: string; title: string; risk: string; track: string; decision: string; source: unknown }>,
): ApprovalRow[] {
  if (!rows.length) return [];
  return rows.map((a) => {
    const classified = classifyAdapterSource(a.source, false);
    return applyClassification(
      {
        id: a.id,
        title: a.title,
        risk: a.risk,
        track: a.track,
        decision: a.decision,
        source: 'Unavailable' as const,
        origin: classified.origin,
        status: classified.status,
      },
      classified,
    );
  });
}
