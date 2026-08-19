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

export async function fetchPmClients(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{ clients: PmClient[]; source: string }>(auth, '/api/pm/clients');
}

export async function fetchPmLeads(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{ leads: PmLead[]; source: string; configured?: boolean }>(auth, '/api/pm/leads');
}

export async function fetchPmLead(auth: AtlasHubAuthHeaders, id: string) {
  return hubFetchJson<{ lead: PmLead; source: string }>(auth, `/api/pm/leads/${encodeURIComponent(id)}`);
}

export async function patchPmLead(
  auth: AtlasHubAuthHeaders,
  id: string,
  body: Record<string, unknown>,
) {
  const etag = typeof body.etag === 'string' ? body.etag : undefined;
  const headers: Record<string, string> = {};
  if (etag) headers['If-Match'] = etag;
  return hubFetchJson<{ lead: PmLead }>(auth, `/api/pm/leads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
}

export async function fetchPmClient(auth: AtlasHubAuthHeaders, clientCode: string) {
  return hubFetchJson<{
    client: PmClient;
    projects: PmProject[];
    deferred?: Record<string, string>;
  }>(auth, `/api/pm/clients/${encodeURIComponent(clientCode)}`);
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
    deferred?: Record<string, string>;
  }>(auth, `/api/pm/projects/${encodeURIComponent(id)}`);
}

const DEV_OWNER_IDS = new Set(['person-manny']);
const DEV_OWNER_NAMES = new Set(['Manny Barela']);

/** Server derives owner from verified oid. Strip known development aliases. */
function stripLegacyPmOwnerAliases(body: Record<string, unknown>): Record<string, unknown> {
  const out = { ...body };
  if (typeof out.ownerId === 'string' && DEV_OWNER_IDS.has(out.ownerId)) delete out.ownerId;
  if (typeof out.assigneeId === 'string' && DEV_OWNER_IDS.has(out.assigneeId)) delete out.assigneeId;
  if (typeof out.ownerName === 'string' && DEV_OWNER_NAMES.has(out.ownerName)) delete out.ownerName;
  if (typeof out.assigneeName === 'string' && DEV_OWNER_NAMES.has(out.assigneeName)) delete out.assigneeName;
  return out;
}

export async function createPmProject(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  return hubFetchJson<{ project: PmProject }>(auth, '/api/pm/projects', {
    method: 'POST',
    body: JSON.stringify(stripLegacyPmOwnerAliases(body)),
  });
}

export async function patchPmProject(
  auth: AtlasHubAuthHeaders,
  id: string,
  patch: Record<string, unknown>,
) {
  const etag = typeof patch.etag === 'string' ? patch.etag : undefined;
  const headers: Record<string, string> = {};
  if (etag) headers['If-Match'] = etag;
  return hubFetchJson<{ project: PmProject }>(auth, `/api/pm/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(stripLegacyPmOwnerAliases(patch)),
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
    body: JSON.stringify(stripLegacyPmOwnerAliases(body)),
  });
}

export async function createPmMilestone(
  auth: AtlasHubAuthHeaders,
  body: Record<string, unknown>,
) {
  return hubFetchJson(auth, '/api/pm/milestones', {
    method: 'POST',
    body: JSON.stringify(stripLegacyPmOwnerAliases(body)),
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

/** Dry-run only — never mutates Hub pm-store. */
export async function previewPmSync(auth: AtlasHubAuthHeaders) {
  return hubFetchJson<{
    ok: boolean;
    dryRun: true;
    preview: {
      clientsSelected: number;
      projectsToCreate: Array<{ name: string; clientId?: string; clientName?: string; reason: string }>;
      projectsToUpdate: Array<{ id: string; name: string; reason: string }>;
      projectsUnchanged: number;
      duplicateCandidates: Array<{ name: string; ids: string[] }>;
      ambiguousMappings: Array<{ name: string; issue: string }>;
      documentsLinkable: number;
      wouldArchiveNoise: string[];
      conflicts: string[];
      before: { projects: number; tasks: number };
      after: { projects: number; tasks: number };
    };
  }>(auth, '/api/pm/populate/preview');
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
  const etag = typeof patch.etag === 'string' ? patch.etag : undefined;
  const headers: Record<string, string> = {};
  if (etag) headers['If-Match'] = etag;
  return hubFetchJson<{ task: PmTask }>(auth, `/api/pm/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
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
  return hubFetchJson<{ workspace: ClientPmWorkspace }>(
    auth,
    `/api/pm/clients/${encodeURIComponent(clientId)}/workspace`,
  );
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
  etag?: string;
}

export interface PmClient {
  id: string;
  clientCode: string;
  displayName: string;
  itemId?: string;
  source: string;
  industry?: string;
  clientStage?: string;
  engagementType?: string;
  overallHealth?: string;
  dba?: string;
  website?: string;
  sourceOrg?: string;
  lastMeaningfulContact?: string;
  sharePointLibraryUrl?: string;
}

export interface PmLead {
  id: string;
  etag: string;
  title: string;
  contactName?: string;
  email?: string;
  phone?: string;
  source?: string;
  leadSourceDetail?: string;
  status: string;
  serviceInterest?: string;
  ownerEmail?: string;
  notes?: string;
  nextAction?: string;
  nextFollowUpDate?: string;
  discoveryCallDate?: string;
  leadScore?: number;
  estimatedValue?: number;
  pipelineValue?: number;
  clientCode?: string;
  convertedClientId?: string;
  isReferral?: boolean;
  lastModified?: string;
  created?: string;
}

export type WorkspaceCompletenessStatus =
  | 'COMPLETE'
  | 'PARTIAL_SOURCE_DATA_NOT_FOUND'
  | 'BLOCKED_AMBIGUOUS_IDENTITY';

export interface WorkspaceCompletenessCell {
  status: WorkspaceCompletenessStatus;
  queried: boolean;
  count: number;
  reason?: string;
}

export interface WorkspaceSection<T = Record<string, unknown>> {
  status: WorkspaceCompletenessStatus;
  queried: boolean;
  items: T[];
  reason?: string;
}

export interface ClientPmWorkspace {
  kind: 'client_workspace_v1';
  client: PmClient;
  completeness: Record<string, WorkspaceCompletenessCell>;
  overview: {
    clientCode: string;
    displayName: string;
    industry?: string;
    clientStage?: string;
    engagementType?: string;
    overallHealth?: string;
    dba?: string;
    website?: string;
    sourceOrg?: string;
    lastMeaningfulContact?: string;
    sharePointLibraryUrl?: string;
  };
  projects: PmProject[];
  tasks: PmTask[];
  documents: WorkspaceSection<{
    id: string;
    title: string;
    webUrl?: string;
    kind: string;
    source: string;
  }>;
  communications: WorkspaceSection;
  meetings: WorkspaceSection;
  engagements: WorkspaceSection;
  deliverables: WorkspaceSection;
  decisionsRisks: WorkspaceSection;
  contacts: WorkspaceSection;
  timeline: Array<{ at: string; kind: string; title: string; source: string; id: string }>;
  nextActions: Array<{
    text: string;
    evidence: Array<{ source: string; kind: string; id: string; field?: string }>;
  }>;
  source: string;
}

export interface PmProject {
  id: string;
  name: string;
  clientId?: string;
  clientName?: string;
  clientCode?: string;
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
  etag?: string;
}

export interface PortfolioProject extends PmProject {
  overdueTaskCount: number;
  blockerCount: number;
  openTaskCount: number;
  nextMilestone?: string;
  nextMilestoneDue?: string;
  dataQuality?: {
    healthAssessed?: boolean;
    milestoneEstablished?: boolean;
    nextActionSet?: boolean;
    dueDateSet?: boolean;
    duplicateCandidate?: boolean;
    needsOwnerReview?: boolean;
    missingClientId?: boolean;
  };
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
    waitingFollowUps: Array<{
      id: string;
      whatIsNeeded: string;
      owedByName: string;
      nextFollowUpDate?: string;
      href?: string;
      clientCode?: string;
    }>;
    decisionsNeeded: Array<{ id: string; title: string }>;
  };
  clientAttention: {
    atRisk: Array<{ id: string; name: string; reason: string }>;
    waitingOnUs: Array<{ id: string; whatIsNeeded: string }>;
    waitingOnClient: Array<{ id: string; whatIsNeeded: string }>;
    upcomingDeadlines: PmTask[];
    opportunities: Array<{ id: string; name: string; detail: string; href?: string }>;
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

export interface PmSearchHit {
  kind: string;
  id: string;
  clientCode?: string;
  title: string;
  href: string;
  source: string;
}

export async function searchPm(auth: AtlasHubAuthHeaders, query: string) {
  const q = query.trim().slice(0, 120);
  if (q.length < 2) return { query: q, results: [] as PmSearchHit[], scope: 'entitled' as const };
  return hubFetchJson<{ query: string; results: PmSearchHit[]; scope: 'entitled' | 'manny_tenant' }>(
    auth,
    `/api/pm/search?q=${encodeURIComponent(q)}`,
  );
}
