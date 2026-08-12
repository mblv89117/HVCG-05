import type { SourceKind } from './executiveHome';
import { pendingExecutiveKpis } from './workspaces';
import type { HomeMetric } from './executiveHome';

export type { SourceKind, HomeMetric, ApprovalRow, ActivityItem, DeadlineItem, PinnedClient } from './executiveHome';

function pendingToMetric(
  id: string,
  label: string,
  value: string,
  source: SourceKind,
): HomeMetric {
  return {
    id,
    label,
    value,
    trend: 'flat',
    trendLabel: source,
    source,
    origin: source === 'Repository-derived' ? 'repository' : 'unknown',
    status: source === 'Development sample' ? 'Sample data' : 'Unavailable',
    spark: [0, 0, 0, 0, 0, 0, 0],
  };
}

/** Fixture KPI rows for tests — not used as an operational Dataverse fallback. */
export const pendingHomeMetrics: HomeMetric[] = pendingExecutiveKpis.map((k, i) =>
  pendingToMetric(
    `kpi-${i}`,
    k.label,
    k.value,
    k.availability === 'Repository-derived' ? 'Repository-derived' : 'Unavailable',
  ),
);

export const executiveHomeData = {
  metrics: [] as HomeMetric[],
  approvals: [] as Array<{
    id: string;
    title: string;
    risk: string;
    track: string;
    decision: string;
    source: SourceKind;
    origin: 'repository';
    status: 'Not live';
  }>,
  activity: [
    {
      id: 'act1',
      title: 'Executive Dashboard modules replaced placeholders',
      when: 'This session',
      source: 'Repository-derived' as SourceKind,
      origin: 'repository' as const,
      status: 'Not live' as const,
    },
    {
      id: 'act2',
      title: 'Colorado Craft Beef workspace scaffolded (pending finance)',
      when: 'This session',
      source: 'Repository-derived' as SourceKind,
      origin: 'repository' as const,
      status: 'Not live' as const,
    },
  ],
  deadlines: [
    { id: 'd1', title: 'Owner demo — Executive Dashboard', due: 'This week', severity: 'High' as const },
    { id: 'd2', title: 'Import verified CCB financial package', due: 'Before valuation display', severity: 'High' as const },
  ],
  pinnedClients: [
    { id: 'ws-hvcg', name: 'High Value Capital Group', status: 'Internal' },
    { id: 'ws-ccb', name: 'Colorado Craft Beef', status: 'Transitioning' },
  ],
  alerts: [
    {
      id: 'al1',
      title: 'Financial KPI sources not connected',
      severity: 'Critical' as const,
      category: 'cash-flow risk / data gap',
    },
    {
      id: 'al2',
      title: 'CCB lender-document package incomplete (pending intake)',
      severity: 'High' as const,
      category: 'lender-document gaps',
    },
    {
      id: 'al3',
      title: 'Owner UAT for Executive Dashboard outstanding',
      severity: 'High' as const,
      category: 'unresolved owner approvals',
    },
  ],
  initiatives: [
    {
      id: 'i1',
      name: 'Elite OS Executive Dashboard release',
      status: 'In Progress',
      owner: 'Master PM',
      due: 'Sprint 14',
      percentComplete: 55,
      blocker: 'Verified finance feed',
      nextAction: 'Owner UAT on Dev SWA',
    },
    {
      id: 'i2',
      name: 'Colorado Craft Beef workspace readiness',
      status: 'On Track',
      owner: 'Manny Barela',
      due: 'Client meeting',
      percentComplete: 40,
      blocker: 'Awaiting verified financial source',
      nextAction: 'Demo relationship + capital checklist only',
    },
  ],
  capitalReadiness: [
    { label: 'Readiness score', value: 'Not yet calculated' },
    { label: 'Financial-document completion', value: 'Data connection pending' },
    { label: 'Legal-document completion', value: 'Data connection pending' },
    { label: 'Lender-package status', value: 'Awaiting verified data' },
    { label: 'Debt schedule status', value: 'Awaiting verified data' },
    { label: 'Underwriting gaps', value: 'Awaiting verified data' },
    { label: 'Active financing opportunities', value: 'Data connection pending' },
    { label: 'Next financing milestone', value: 'Verify source import for CCB' },
  ],
  /** Sprint 7 — consume canonical CFO outputs when approved; never invent balances. */
  cfoOperatingSummary: [
    { label: 'CFO Engagement', value: 'Awaiting verified binding' },
    { label: 'Latest period', value: 'Awaiting verified source' },
    { label: 'Cash (approved)', value: 'PENDING_LIVE_SOURCE' },
    { label: '13-week forecast', value: 'Not started' },
    { label: 'AR / AP', value: 'Awaiting verified aging' },
    { label: 'Working capital', value: 'INSUFFICIENT_DATA' },
    { label: 'Capital monitor', value: 'Not monitored' },
    { label: 'Advisor review', value: 'None recorded' },
  ],
  /** Sprint 10 — consume approved Growth summaries; never invent KPIs. */
  growthOperatingSummary: [
    { label: 'Growth Engagement', value: 'Awaiting verified binding' },
    { label: '90-Day Plan', value: 'Not started' },
    { label: 'Priority health', value: 'NO_DATA' },
    { label: 'KPI health', value: 'NO_DATA' },
    { label: 'Overdue commitments', value: '—' },
    { label: 'Critical issues', value: '—' },
    { label: 'SOP coverage', value: 'Unknown' },
    { label: 'Next operating review', value: 'Not scheduled' },
  ],
  aiBrief: {
    generated: true,
    timestampLabel: 'Generated at page load — not a verified ledger',
    whatChanged: 'Executive Dashboard modules are live in Elite OS; fabricated KPI dollars removed.',
    attention: 'Connect verified financial sources before client-facing dollar discussions.',
    recommendations: [
      'Open Colorado Craft Beef workspace for relationship + capital checklist demo.',
      'Keep all dollar fields labeled pending until Finance confirms sources.',
      'Complete Owner UAT on Dev SWA link.',
    ],
    risks: ['Presenting sample dollars would mislead clients — blocked by design.'],
    opportunities: ['Generational Group referral (Randy Kamin) for CCB growth capital.'],
    decisionsAwaiting: ['Approve Sprint 14 Executive Dashboard UAT', 'Authorize verified finance connector'],
  },
};
