import type { AtlasHubAuthHeaders } from './api.ts';

export type { AtlasHubAuthHeaders };

function headers(auth: AtlasHubAuthHeaders): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-atlas-user-id': auth.userId,
    'x-atlas-organization-id': auth.organizationId,
    'x-atlas-client-ids': auth.clientIds.join(','),
    ...(auth.email ? { 'x-atlas-user-email': auth.email } : {}),
    'x-atlas-roles': (auth.roles || ['Staff']).join(','),
  };
}

const base = () =>
  (import.meta as ImportMeta & { env?: { VITE_INTEGRATION_API_BASE?: string } }).env
    ?.VITE_INTEGRATION_API_BASE || 'http://127.0.0.1:8790';

async function parse(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      (data as { message?: string }).message ||
        (data as { error?: string }).error ||
        res.statusText,
    );
    throw err;
  }
  return data;
}

export async function fetchCommandCenter(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/pm/command-center`, { headers: headers(auth) });
  return parse(res) as Promise<{ commandCenter: CommandCenter }>;
}

export async function fetchMyWork(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/pm/my-work`, { headers: headers(auth) });
  return parse(res) as Promise<{ myWork: MyWork }>;
}

export async function fetchPortfolio(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/pm/portfolio`, { headers: headers(auth) });
  return parse(res) as Promise<{ portfolio: PortfolioProject[] }>;
}

export async function fetchPmProjects(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/pm/projects`, { headers: headers(auth) });
  return parse(res) as Promise<{ projects: PmProject[] }>;
}

export async function fetchPmProject(auth: AtlasHubAuthHeaders, id: string) {
  const res = await fetch(`${base()}/api/pm/projects/${encodeURIComponent(id)}`, {
    headers: headers(auth),
  });
  return parse(res) as Promise<{
    project: PmProject;
    tasks: PmTask[];
    milestones: unknown[];
    risks: unknown[];
    decisions: unknown[];
    commitments: unknown[];
    deliverables: unknown[];
    waiting: unknown[];
  }>;
}

export async function fetchPmInbox(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/pm/inbox`, { headers: headers(auth) });
  return parse(res) as Promise<{ inbox: InboxItem[] }>;
}

export async function fetchPmTeam(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/pm/team`, { headers: headers(auth) });
  return parse(res) as Promise<{ team: TeamMember[]; agents: AgentWork[] }>;
}

export async function initializePm(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/pm/populate`, {
    method: 'POST',
    headers: headers(auth),
    body: '{}',
  });
  return parse(res) as Promise<{
    ok: boolean;
    populate: Record<string, unknown>;
    bootstrap: { created: number; updated: number };
    extract: Record<string, number>;
    commandCenter: CommandCenter;
    myWork: MyWork;
  }>;
}

export async function populatePmFromMicrosoft(auth: AtlasHubAuthHeaders) {
  return initializePm(auth);
}

export async function quickCapturePm(auth: AtlasHubAuthHeaders, text: string) {
  const res = await fetch(`${base()}/api/pm/quick-capture`, {
    method: 'POST',
    headers: headers(auth),
    body: JSON.stringify({ text }),
  });
  return parse(res) as Promise<{ kind: string; message: string; created: unknown }>;
}

export async function patchPmTask(
  auth: AtlasHubAuthHeaders,
  id: string,
  patch: Record<string, unknown>,
) {
  const res = await fetch(`${base()}/api/pm/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(auth),
    body: JSON.stringify(patch),
  });
  return parse(res) as Promise<{ task: PmTask }>;
}

export async function acceptInboxItem(auth: AtlasHubAuthHeaders, id: string) {
  const res = await fetch(`${base()}/api/pm/inbox/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
    headers: headers(auth),
    body: '{}',
  });
  return parse(res);
}

export async function dismissInboxItem(auth: AtlasHubAuthHeaders, id: string) {
  const res = await fetch(`${base()}/api/pm/inbox/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST',
    headers: headers(auth),
    body: '{}',
  });
  return parse(res);
}

export async function fetchWeeklyReview(auth: AtlasHubAuthHeaders) {
  const res = await fetch(`${base()}/api/pm/weekly-review`, { headers: headers(auth) });
  return parse(res);
}

export async function fetchClientPmWorkspace(auth: AtlasHubAuthHeaders, clientId: string) {
  const res = await fetch(
    `${base()}/api/pm/clients/${encodeURIComponent(clientId)}/workspace`,
    { headers: headers(auth) },
  );
  return parse(res);
}

export interface PmTask {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  clientName?: string;
  assigneeName?: string;
  status: string;
  priority: string;
  dueDate?: string;
  nextAction?: string;
  blocker?: string;
  source: string;
  autoGenerated?: boolean;
  estimatedMinutes?: number;
  revenueImpact?: string;
  riskImpact?: string;
}

export interface PmProject {
  id: string;
  name: string;
  clientName?: string;
  businessEntity: string;
  projectType: string;
  status: string;
  priority: string;
  health: string;
  progressPercent: number;
  ownerName: string;
  nextAction?: string;
  targetCompletionDate?: string;
  objective?: string;
}

export interface PortfolioProject extends PmProject {
  overdueTaskCount: number;
  blockerCount: number;
  openTaskCount: number;
  nextMilestone?: string;
  nextMilestoneDue?: string;
}

export interface InboxItem {
  id: string;
  title: string;
  summary?: string;
  classification: string;
  confidence: number;
  clientName?: string;
  suggestedAction?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  kind: string;
}

export interface AgentWork {
  id: string;
  agentName: string;
  role: string;
  status: string;
  output?: string;
  approvalNeeded: boolean;
  nextPlannedAction?: string;
}

export interface CommandCenter {
  generatedAt: string;
  date: string;
  businessHealth: {
    activeProjects: number;
    atRiskProjects: number;
    openTasks: number;
    overdueTasks: number;
    waitingItems: number;
    openCommitments: number;
    decisionsNeeded: number;
    clientsNeedingAttention: number;
    avgClientCompleteness?: number;
  };
  criticalAlerts: Array<{ id: string; severity: string; title: string; href?: string }>;
  ownerApprovals: PmTask[];
  topPriorities: PmTask[];
  myDay: {
    meetings: Array<{ id: string; title: string; at?: string }>;
    criticalTasks: PmTask[];
    dueToday: PmTask[];
    overdue: PmTask[];
    waitingFollowUps: Array<{ id: string; whatIsNeeded: string; owedByName: string }>;
    decisionsNeeded: Array<{ id: string; title: string }>;
  };
  clientAttention: {
    atRisk: Array<{ id: string; name: string; reason: string }>;
    waitingOnUs: Array<{ id: string; whatIsNeeded: string }>;
    waitingOnClient: Array<{ id: string; whatIsNeeded: string }>;
    upcomingDeadlines: PmTask[];
    opportunities: Array<{ id: string; name: string; detail: string }>;
  };
  teamAndAgents: {
    teamWorkload: Array<{ id: string; name: string; openTasks: number; overdue: number; blocked: number }>;
    agentActivity: AgentWork[];
    lateTasks: PmTask[];
    approvalRequests: PmTask[];
  };
  projects: {
    atRisk: PmProject[];
    upcomingMilestones: Array<{ id: string; title: string; dueDate?: string }>;
    noRecentActivity: PmProject[];
    lackingNextAction: PmProject[];
  };
}

export interface MyWork {
  today: PmTask[];
  overdue: PmTask[];
  dueThisWeek: PmTask[];
  upcoming: PmTask[];
  waitingOnOthers: PmTask[];
  needsOwnerDecision: PmTask[];
  highValueOpportunities: PmTask[];
  clientEmergencies: PmTask[];
  followUps: Array<{ id: string; whatIsNeeded: string; owedByName: string; nextFollowUpDate?: string }>;
  recentlyCompleted: PmTask[];
  suggestedNextActions: string[];
  autoGenerated: PmTask[];
  delegatedToAgents: PmTask[];
  delegatedToTeam: PmTask[];
  requiringApproval: PmTask[];
}
