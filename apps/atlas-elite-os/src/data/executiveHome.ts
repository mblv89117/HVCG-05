export type SourceKind = 'Repository-derived' | 'Development sample' | 'Unavailable' | 'Live';

export interface HomeMetric {
  id: string;
  label: string;
  value: string;
  unit?: string;
  trend: 'up' | 'down' | 'flat';
  trendLabel: string;
  source: SourceKind;
  spark: number[];
}

export interface ApprovalRow {
  id: string;
  title: string;
  risk: string;
  track: string;
  decision: string;
  source: SourceKind;
}

export interface ActivityItem {
  id: string;
  title: string;
  when: string;
  source: SourceKind;
}

export interface DeadlineItem {
  id: string;
  title: string;
  due: string;
  severity: 'High' | 'Medium' | 'Low';
}

export interface PinnedClient {
  id: string;
  name: string;
  status: string;
}

export const executiveHomeData = {
  metrics: [
    {
      id: 'revenue',
      label: 'Revenue (sample)',
      value: '1.25M',
      unit: 'USD',
      trend: 'up',
      trendLabel: '+6% QoQ',
      source: 'Development sample',
      spark: [3, 4, 4, 5, 6, 7, 8],
    },
    {
      id: 'pipeline',
      label: 'Funding pipeline',
      value: '4.8M',
      unit: 'USD',
      trend: 'up',
      trendLabel: '3 active requests',
      source: 'Development sample',
      spark: [2, 3, 5, 4, 6, 7, 9],
    },
    {
      id: 'ev',
      label: 'Enterprise value index',
      value: '72',
      unit: '/100',
      trend: 'flat',
      trendLabel: 'Owner readiness steady',
      source: 'Unavailable',
      spark: [6, 6, 7, 7, 7, 7, 7],
    },
    {
      id: 'projects',
      label: 'Active projects',
      value: '8',
      trend: 'up',
      trendLabel: '2 ready for QA',
      source: 'Repository-derived',
      spark: [4, 5, 5, 6, 7, 7, 8],
    },
    {
      id: 'tasks',
      label: 'Critical tasks',
      value: '5',
      trend: 'down',
      trendLabel: '2 cleared today',
      source: 'Development sample',
      spark: [8, 7, 7, 6, 6, 5, 5],
    },
    {
      id: 'meetings',
      label: 'Meetings today',
      value: '3',
      trend: 'flat',
      trendLabel: 'Next in 45m',
      source: 'Development sample',
      spark: [1, 2, 2, 3, 3, 3, 3],
    },
    {
      id: 'approvals',
      label: 'Approvals waiting',
      value: '4',
      trend: 'up',
      trendLabel: 'Owner action needed',
      source: 'Repository-derived',
      spark: [1, 2, 2, 3, 3, 4, 4],
    },
    {
      id: 'messages',
      label: 'Unread messages',
      value: '0',
      trend: 'flat',
      trendLabel: 'Live mail not connected',
      source: 'Unavailable',
      spark: [0, 0, 0, 0, 0, 0, 0],
    },
  ] as HomeMetric[],
  approvals: [
    {
      id: 'a1',
      title: 'Approve Atlas Command Center UAT sign-off',
      risk: 'Low',
      track: 'Track 7',
      decision: 'Pending',
      source: 'Repository-derived',
    },
    {
      id: 'a2',
      title: 'Approve website go-live',
      risk: 'Medium',
      track: 'Track 2',
      decision: 'Pending',
      source: 'Development sample',
    },
    {
      id: 'a3',
      title: 'Approve Revenue Sprint 4 commit + push',
      risk: 'Low',
      track: 'Track 4',
      decision: 'Pending',
      source: 'Repository-derived',
    },
  ] as ApprovalRow[],
  activity: [
    {
      id: 'act1',
      title: 'Atlas Design System package scaffolded',
      when: 'Just now',
      source: 'Repository-derived',
    },
    {
      id: 'act2',
      title: 'Command Center Dev app published',
      when: 'Earlier today',
      source: 'Repository-derived',
    },
    {
      id: 'act3',
      title: 'EOS Sprint 2 preserved — no merge',
      when: 'This week',
      source: 'Repository-derived',
    },
  ] as ActivityItem[],
  deadlines: [
    { id: 'd1', title: 'Owner UAT — Elite UI Design System', due: 'Today', severity: 'High' },
    { id: 'd2', title: 'Website go-live decision', due: 'This week', severity: 'Medium' },
    { id: 'd3', title: 'Revenue commit gate', due: 'Pending QA', severity: 'Low' },
  ] as DeadlineItem[],
  pinnedClients: [
    { id: 'c1', name: 'Sample Client — Apex Holdings', status: 'Active' },
    { id: 'c2', name: 'Sample Client — Northstar Ops', status: 'Diligence' },
    { id: 'c3', name: 'Sample Client — Cascade Equity', status: 'Nurture' },
  ] as PinnedClient[],
  aiRecommendations: [
    'Review 4 pending approvals before midday.',
    'Funding pipeline sample shows 3 requests nearing close dates.',
    'Document Center module is gated until after Design System UAT.',
  ],
};
