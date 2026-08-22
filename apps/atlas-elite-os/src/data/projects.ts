/**
 * Project detail layer — extends portfolioProjects without inventing financial amounts.
 */

import { portfolioProjects, type PortfolioProject, workspaceCatalog } from './workspaces';

export interface ProjectSummary {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  status: string;
  health: string;
  sponsor: string;
  projectManager: string;
  phase: string;
  nextMilestone: string;
  due: string;
  percentComplete: number;
  blocker: string;
}

function enrich(p: PortfolioProject): ProjectSummary {
  const client = workspaceCatalog.find((w) => w.id === p.workspaceId);
  const phaseById: Record<string, string> = {
    'prj-exec-dashboard': 'UAT',
    'prj-ccb-capital': 'Discovery',
    'prj-atlas-dataverse': 'Operations',
  };
  const pctById: Record<string, number> = {
    'prj-exec-dashboard': 70,
    'prj-ccb-capital': 35,
    'prj-atlas-dataverse': 60,
  };
  const blockerById: Record<string, string> = {
    'prj-exec-dashboard': 'Verified finance connector',
    'prj-ccb-capital': 'Awaiting verified financial source',
    'prj-atlas-dataverse': 'None',
  };
  return {
    id: p.id,
    name: p.name,
    clientId: p.workspaceId,
    clientName: client?.name || p.workspaceId,
    status: p.health === 'Not Started' ? 'Not Started' : 'In Progress',
    health: p.health,
    sponsor: p.sponsor,
    projectManager: p.pm,
    phase: phaseById[p.id] || 'Active',
    nextMilestone: p.nextMilestone,
    due: 'TBD',
    percentComplete: pctById[p.id] ?? 0,
    blocker: blockerById[p.id] || 'None',
  };
}

export const projectCatalog: ProjectSummary[] = portfolioProjects.map(enrich);

export function getProject(id: string): ProjectSummary | undefined {
  return projectCatalog.find((p) => p.id === id);
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  when: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Informational';
  href?: string;
}

export const notificationCatalog: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Financial KPI sources not connected',
    body: 'Executive Home shows pending labels only until verified ledgers bind.',
    when: 'Today',
    severity: 'Critical',
    href: '/financials',
  },
  {
    id: 'n2',
    title: 'Owner UAT outstanding',
    body: 'Approve Executive Dashboard visual QA when ready.',
    when: 'Today',
    severity: 'High',
    href: '/tasks',
  },
  {
    id: 'n3',
    title: 'CCB document package incomplete',
    body: 'Lender-document checklist awaits verified intake.',
    when: 'This week',
    severity: 'High',
    href: '/clients/ws-ccb',
  },
  {
    id: 'n4',
    title: 'Dark mode available',
    body: 'Toggle theme from the command bar for executive presentation.',
    when: 'Session',
    severity: 'Informational',
  },
];

export const reportingPeriods = [
  { id: 'mtd', label: 'Month to date' },
  { id: 'qtd', label: 'Quarter to date' },
  { id: 'ytd', label: 'Year to date' },
  { id: 'trailing12', label: 'Trailing 12 months' },
] as const;
