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

export interface AlertItem {
  id: string;
  title: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Informational';
  category: string;
}

export interface InitiativeItem {
  id: string;
  name: string;
  status: string;
  owner: string;
  due: string;
  percentComplete: number;
  blocker: string;
  nextAction: string;
}
