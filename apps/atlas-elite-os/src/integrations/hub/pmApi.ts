import type { AtlasHubAuthHeaders } from './api';
import { hubFetchJson } from './hubFetch';

export type { AtlasHubAuthHeaders };
export { HubHttpError } from './hubFetch';

export async function fetchCommandCenter(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{ commandCenter: CommandCenter }>(auth, '/api/pm/command-center');
}

export async function fetchMyWork(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{ myWork: MyWork }>(auth, '/api/pm/my-work');
}

export async function fetchPortfolio(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{ portfolio: PortfolioProject[] }>(auth, '/api/pm/portfolio');
}

export async function fetchPmProjects(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{ projects: PmProject[] }>(auth, '/api/pm/projects');
}

export async function fetchPmProject(auth: AtlasHubAuthHeaders, id: string) {
  return hubFetchJson<{
    project: PmProject;
    tasks: PmTask[];
    board?: {
      todo: PmTask[];
      inProgress: PmTask[];
      review: PmTask[];
      done: PmTask[];
    };
    milestones: unknown[];
    risks: unknown[];
    decisions: unknown[];
    commitments: unknown[];
    deliverables: unknown[];
    waiting: unknown[];
    notes?: unknown[];
    activity?: unknown[];
    documents?: OperatingDocument[];
  }>(auth, `/api/pm/projects/${encodeURIComponent(id)}`);
}

export async function createPmProject(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  return hubFetchJson<{ project: PmProject }>(auth, '/api/pm/projects', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function patchPmProject(
  auth: AtlasHubAuthHeaders,
  id: string,
  patch: Record<string, unknown>,
) {
  return hubFetchJson<{ project: PmProject }>(auth, `/api/pm/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function archivePmProject(auth: AtlasHubAuthHeaders, id: string) {
  return hubFetchJson<{ project: PmProject }>(
    auth,
    `/api/pm/projects/${encodeURIComponent(id)}/archive`,
    { method: 'POST', body: '{}' },
  );
}

export async function createPmTask(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  return hubFetchJson<{ task: PmTask }>(auth, '/api/pm/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createPmMilestone(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  return hubFetchJson(auth, '/api/pm/milestones', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createPmNote(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  return hubFetchJson(auth, '/api/pm/notes', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createPmDecision(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  return hubFetchJson(auth, '/api/pm/decisions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchPmDocuments(
  auth: AtlasHubAuthHeaders,
  params?: {
    clientId?: string;
    projectId?: string;
    q?: string;
    type?: string;
    confidentiality?: string;
  },
) {
  const q = new URLSearchParams();
  if (params?.clientId) q.set('clientId', params.clientId);
  if (params?.projectId) q.set('projectId', params.projectId);
  if (params?.q) q.set('q', params.q);
  if (params?.type) q.set('type', params.type);
  if (params?.confidentiality) q.set('confidentiality', params.confidentiality);
  const qs = q.toString();
  return hubFetchJson<{
    count: number;
    restrictedOmitted: number;
    sharePointSites: { commandCenter: string; clients: string };
    documents: OperatingDocument[];
  }>(auth, `/api/pm/documents${qs ? `?${qs}` : ''}`);
}

export async function fetchOwnerReview(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{ items: OwnerReviewItem[] }>(auth, '/api/pm/owner-review');
}

export interface OperatingDocument {
  id: string;
  title: string;
  kind: string;
  webUrl?: string;
  path?: string;
  classification?: string;
  confidentiality: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  owner?: string;
  modifiedAt?: string;
  version?: string;
  sourceSystem: string;
  sensitivityRestricted: boolean;
}

export interface OwnerReviewItem {
  id: string;
  kind: string;
  title: string;
  reason: string;
  suggestedClientName?: string;
  status: string;
}

export async function fetchPmInbox(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{ inbox: InboxItem[] }>(auth, '/api/pm/inbox');
}

export async function fetchPmTeam(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{ team: TeamMember[]; agents: AgentWork[] }>(auth, '/api/pm/team');
}

export async function initializePm(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{
    ok: boolean;
    populate: Record<string, unknown>;
    bootstrap: { created: number; updated: number };
    extract: Record<string, number>;
    commandCenter: CommandCenter;
    myWork: MyWork;
  }>(auth, '/api/pm/populate', { method: 'POST', body: '{}' });
}

export async function populatePmFromMicrosoft(auth: AtlasHubAuthHeaders) {
  return initializePm(auth);
}

export async function quickCapturePm(auth: AtlasHubAuthHeaders, text: string) {
  return hubFetchJson<{ kind: string; message: string; created: unknown }>(
    auth,
    '/api/pm/quick-capture',
    { method: 'POST', body: JSON.stringify({ text }) },
  );
}

export async function patchPmTask(
  auth: AtlasHubAuthHeaders,
  id: string,
  patch: Record<string, unknown>,
) {
  return hubFetchJson<{ task: PmTask }>(auth, `/api/pm/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function acceptInboxItem(auth: AtlasHubAuthHeaders, id: string) {
  return hubFetchJson(auth, `/api/pm/inbox/${encodeURIComponent(id)}/accept`, {
    method: 'POST',
    body: '{}',
  });
}

export async function dismissInboxItem(auth: AtlasHubAuthHeaders, id: string) {
  return hubFetchJson(auth, `/api/pm/inbox/${encodeURIComponent(id)}/dismiss`, {
    method: 'POST',
    body: '{}',
  });
}

export async function fetchWeeklyReview(auth: AtlasHubAuthHeaders) {
  return hubFetchJson(auth, '/api/pm/weekly-review');
}

export async function fetchClientPmWorkspace(auth: AtlasHubAuthHeaders, clientId: string) {
  return hubFetchJson(auth, `/api/pm/clients/${encodeURIComponent(clientId)}/workspace`);
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
  clientId?: string;
  clientName?: string;
  businessEntity: string;
  projectType: string;
  status: string;
  priority: string;
  health: string;
  progressPercent: number;
  ownerId?: string;
  ownerName: string;
  nextAction?: string;
  targetCompletionDate?: string;
  objective?: string;
  lastActivityAt?: string;
  teamMemberIds?: string[];
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
