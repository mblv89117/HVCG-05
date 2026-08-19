/**
 * SharePoint PM HTTP routes. JSON development handlers are not used here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { audit } from '../../audit/auditLog.ts';
import type { AppConfig } from '../../config.ts';
import type { AtlasPrincipal } from '../../middleware/auth.ts';
import type { IntegrationRepository } from '../../store/repository.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { isValidProjectId } from '../projectId.ts';
import { PmHttpError, pmNotImplemented, toErrorBody } from './errors.ts';
import { isSharePointItemId } from './ids.ts';
import {
  DEFERRED_COLLECTIONS,
  leadNeedsFollowUp,
  type SharePointLead,
  type SharePointPmService,
  type SharePointProject,
  type SharePointTask,
} from './repository.ts';
import { searchSharePointPm } from './search.ts';
import { buildSharePointClientWorkspace } from './workspace.ts';
import { createManagedIdentityTokenProvider, GRAPH_TOKEN_RESOURCE } from './token.ts';
import { createFabricGraphClient } from './fabric/graph.ts';
import { runFabricSync } from './fabric/sync.ts';

const DEFERRED_PATHS = [
  '/api/pm/inbox',
  '/api/pm/team',
  '/api/pm/templates',
  '/api/pm/weekly-review',
  '/api/pm/commitments',
  '/api/pm/waiting',
  '/api/pm/decisions',
  '/api/pm/risks',
  '/api/pm/documents',
  '/api/pm/notes',
  '/api/pm/owner-review',
  '/api/pm/populate/preview',
  '/api/pm/sync/preview',
  '/api/pm/populate',
  '/api/pm/initialize',
  '/api/pm/bootstrap',
  '/api/pm/extract',
  '/api/pm/quick-capture',
];

function send(res: ServerResponse, status: number, body: unknown, origin?: string | null) {
  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readEtag(req: IncomingMessage, body: Record<string, unknown>): string | undefined {
  const header = req.headers['if-match'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (typeof fromHeader === 'string' && fromHeader.trim() && fromHeader.trim() !== '*') {
    return fromHeader.trim();
  }
  const fromBody = body.etag ?? body.eTag;
  if (typeof fromBody === 'string' && fromBody.trim() && fromBody.trim() !== '*') return fromBody.trim();
  return undefined;
}

function idempotencyKey(req: IncomingMessage, body: Record<string, unknown>): string | undefined {
  const header = req.headers['idempotency-key'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (typeof fromHeader === 'string' && fromHeader.trim()) return fromHeader.trim().slice(0, 128);
  const fromBody = body.idempotencyKey ?? body.HVCG_IdempotencyKey;
  if (typeof fromBody === 'string' && fromBody.trim()) return fromBody.trim().slice(0, 128);
  return undefined;
}

function isDeferredPath(path: string): boolean {
  if (DEFERRED_PATHS.includes(path)) return true;
  if (path.startsWith('/api/pm/inbox/')) return true;
  if (path.startsWith('/api/pm/owner-review/')) return true;
  if (path.startsWith('/api/pm/notes/')) return true;
  if (path.startsWith('/api/pm/decisions/')) return true;
  if (path.startsWith('/api/pm/clients/')) {
    const rest = decodeURIComponent(path.slice('/api/pm/clients/'.length));
    if (!rest.includes('/') && isCanonicalClientCode(rest)) return false;
    const [code, tail] = rest.split('/');
    if (isCanonicalClientCode(code) && (tail === 'workspace' || tail === 'brief')) return false;
    return true;
  }
  if (path === '/api/pm/search') return false;
  if (path === '/api/pm/fabric/sync') return false;
  if (path.startsWith('/api/pm/agents')) return true;
  return false;
}

function boardFromTasks(tasks: SharePointTask[]) {
  return {
    todo: tasks.filter((t) => ['inbox', 'ready', 'scheduled', 'deferred'].includes(t.status)),
    inProgress: tasks.filter((t) => ['in_progress', 'waiting', 'blocked'].includes(t.status)),
    review: tasks.filter((t) => ['needs_review', 'needs_owner_approval'].includes(t.status)),
    done: tasks.filter((t) => ['completed', 'cancelled'].includes(t.status)),
  };
}

function deferredMeta() {
  const deferred: Record<string, string> = {};
  for (const key of DEFERRED_COLLECTIONS) deferred[key] = 'PM_COLLECTION_NOT_IN_MVP';
  return deferred;
}

function commandCenterPayload(
  projects: SharePointProject[],
  tasks: SharePointTask[],
  milestones: Awaited<ReturnType<SharePointPmService['listAuthorizedMilestones']>>,
  leads: SharePointLead[] = [],
) {
  const today = new Date().toISOString().slice(0, 10);
  const openTasks = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  const overdue = openTasks.filter((t) => t.dueDate && t.dueDate.slice(0, 10) < today);
  const dueToday = openTasks.filter((t) => t.dueDate && t.dueDate.slice(0, 10) === today);
  const atRisk = projects.filter((p) => p.health === 'at_risk' || p.health === 'critical');
  const ownerApprovals = openTasks.filter((t) => t.status === 'needs_owner_approval' || t.requiresApproval);
  const followLeads = leads.filter((lead) => leadNeedsFollowUp(lead, today));
  const qualifiedLeads = leads.filter((lead) => lead.status === 'Qualified');
  const overdueFollowUps = followLeads.filter((lead) => {
    const due = (lead.nextFollowUpDate || '').slice(0, 10);
    return Boolean(due && due < today);
  });
  return {
    generatedAt: new Date().toISOString(),
    date: today,
    businessHealth: {
      activeProjects: projects.filter((p) => p.status === 'active').length,
      atRiskProjects: atRisk.length,
      openTasks: openTasks.length,
      overdueTasks: overdue.length,
      waitingItems: openTasks.filter((t) => t.status === 'waiting').length + followLeads.length,
      openCommitments: 0,
      decisionsNeeded: ownerApprovals.length,
      clientsNeedingAttention: atRisk.length,
    },
    criticalAlerts: [
      ...overdue.slice(0, 5).map((t) => ({
        id: t.id,
        severity: 'critical',
        title: `Overdue: ${t.title}`,
        href: t.projectId ? `/projects/${t.projectId}` : '/my-work',
      })),
      ...overdueFollowUps.slice(0, 5).map((lead) => ({
        id: `lead-${lead.id}`,
        severity: 'high',
        title: `Overdue follow-up: ${lead.title}`,
        href: `/leads/${lead.id}`,
      })),
      ...atRisk.slice(0, 5).map((p) => ({
        id: p.id,
        severity: p.health === 'critical' ? 'critical' : 'high',
        title: `Project ${p.health}: ${p.name}`,
        href: `/projects/${p.id}`,
      })),
    ],
    ownerApprovals,
    topPriorities: openTasks
      .filter((t) => t.priority === 'critical' || t.priority === 'high')
      .slice(0, 10),
    myDay: {
      meetings: [] as Array<{ id: string; title: string; at?: string }>,
      criticalTasks: openTasks.filter((t) => t.priority === 'critical'),
      dueToday,
      overdue,
      waitingFollowUps: followLeads.slice(0, 40).map((lead) => ({
        id: lead.id,
        whatIsNeeded: lead.nextAction || `Follow up · ${lead.status}`,
        owedByName: lead.ownerEmail || lead.contactName || lead.title,
        nextFollowUpDate: lead.nextFollowUpDate,
        href: `/leads/${lead.id}`,
        clientCode: lead.clientCode,
      })),
      decisionsNeeded: ownerApprovals.slice(0, 20).map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.projectId,
      })),
    },
    clientAttention: {
      atRisk: atRisk.map((p) => ({ id: p.id, name: p.name, reason: p.health, clientCode: p.clientCode })),
      waitingOnUs: [] as Array<{ id: string; whatIsNeeded: string }>,
      waitingOnClient: [] as Array<{ id: string; whatIsNeeded: string }>,
      upcomingDeadlines: openTasks
        .filter((t) => t.dueDate && t.dueDate.slice(0, 10) > today)
        .slice(0, 10),
      opportunities: qualifiedLeads.slice(0, 20).map((lead) => ({
        id: lead.id,
        name: lead.title,
        detail: [lead.serviceInterest, lead.source, lead.nextAction].filter(Boolean).join(' · '),
        href: `/leads/${lead.id}`,
      })),
    },
    teamAndAgents: {
      teamWorkload: [] as Array<{ id: string; name: string; openTasks: number; overdue: number; blocked: number }>,
      agentActivity: [] as Array<{ id: string; agentName: string; status: string }>,
      lateTasks: overdue,
      approvalRequests: ownerApprovals,
    },
    projects: {
      atRisk,
      upcomingMilestones: milestones
        .filter((m) => m.status !== 'completed')
        .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
        .slice(0, 10),
      noRecentActivity: [] as SharePointProject[],
      lackingNextAction: projects.filter((p) => !p.nextAction),
    },
    deferred: deferredMeta(),
  };
}

function myWorkPayload(tasks: SharePointTask[]) {
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const open = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
  const overdue = open.filter((t) => t.dueDate && t.dueDate.slice(0, 10) < today);
  const dueToday = open.filter((t) => t.dueDate && t.dueDate.slice(0, 10) === today);
  const dueWeek = open.filter(
    (t) => t.dueDate && t.dueDate.slice(0, 10) > today && t.dueDate.slice(0, 10) <= week,
  );
  const waiting = open.filter((t) => t.status === 'waiting');
  const completed = tasks.filter((t) => t.status === 'completed');
  return {
    today: dueToday,
    overdue,
    dueThisWeek: dueWeek,
    upcoming: open.filter((t) => t.dueDate && t.dueDate.slice(0, 10) > week),
    waitingOnOthers: waiting,
    needsOwnerDecision: open.filter((t) => t.status === 'needs_owner_approval'),
    highValueOpportunities: [],
    clientEmergencies: overdue.filter((t) => t.priority === 'critical' || t.priority === 'high'),
    followUps: [] as Array<{ id: string; whatIsNeeded: string; owedByName: string; nextFollowUpDate?: string }>,
    recentlyCompleted: completed.slice(0, 20),
    suggestedNextActions: open
      .filter((t) => t.nextAction)
      .slice(0, 10)
      .map((t) => t.nextAction as string),
    autoGenerated: [],
    delegatedToAgents: [],
    delegatedToTeam: [],
    requiringApproval: open.filter((t) => t.requiresApproval),
  };
}

export async function handleSharePointPmRoutes(opts: {
  cfg: AppConfig;
  repo: IntegrationRepository;
  service: SharePointPmService;
  principal: AtlasPrincipal;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
  body?: Record<string, unknown>;
}): Promise<boolean> {
  const { repo, service, principal, req, res, method, path, origin } = opts;
  const body = opts.body || {};

  const fail = (err: unknown) => {
    if (err instanceof PmHttpError) {
      send(res, err.status, toErrorBody(err), origin);
      return true;
    }
    send(
      res,
      503,
      {
        error: 'PM_BACKEND_UNAVAILABLE',
        code: 'PM_BACKEND_UNAVAILABLE',
        classification: 'unavailable',
        message: 'SharePoint PM backend is unavailable.',
      },
      origin,
    );
    return true;
  };

  try {
    if (isDeferredPath(path)) {
      throw pmNotImplemented();
    }

    if (method === 'GET' && path === '/api/pm/clients') {
      const clients = await service.listAuthorizedClients(principal);
      send(res, 200, { clients, source: 'sharepoint' }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/pm/clients') {
      const client = await service.createVerifiedHistoricalClient(
        principal,
        body,
        idempotencyKey(req, body),
      );
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'pm_client_create_manny',
        outcome: 'success',
        detail: `list=HVCG_Clients client=${client.clientCode} item=${client.itemId}`,
      });
      send(
        res,
        200,
        {
          client,
          entitlementGroup: {
            displayName: `HVCG-Client-${client.clientCode}`,
            provisioned: false,
            note: 'Manny-only Entra group must be provisioned and added to INTEGRATION_CLIENT_ENTITLEMENT_GROUPS. Owner role is not all-client access.',
          },
        },
        origin,
      );
      return true;
    }

    const clientOne = path.match(/^\/api\/pm\/clients\/([^/]+)$/);
    if (method === 'PATCH' && clientOne) {
      const rawCode = decodeURIComponent(clientOne[1]);
      if (!isCanonicalClientCode(rawCode)) {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      const client = await service.patchVerifiedClient(principal, rawCode, body, readEtag(req, body));
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'pm_client_patch_manny',
        outcome: 'success',
        detail: `list=HVCG_Clients client=${client.clientCode} item=${client.itemId}`,
      });
      send(res, 200, { client }, origin);
      return true;
    }

    if (method === 'GET' && clientOne) {
      const rawCode = decodeURIComponent(clientOne[1]);
      if (!isCanonicalClientCode(rawCode)) {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      const client = await service.authorizeClient(principal, rawCode);
      if (client === 'not_found') {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      const projects = (await service.listAuthorizedProjects(principal)).filter(
        (p) => p.clientCode === rawCode,
      );
      send(res, 200, { client, projects, deferred: deferredMeta() }, origin);
      return true;
    }

    const clientWorkspace = path.match(/^\/api\/pm\/clients\/([^/]+)\/(workspace|brief)$/);
    if ((method === 'GET' || method === 'POST') && clientWorkspace) {
      const rawCode = decodeURIComponent(clientWorkspace[1]);
      const workspace = await buildSharePointClientWorkspace(service, principal, rawCode);
      send(res, 200, { workspace }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/pm/search') {
      const url = new URL(req.url || '', 'http://local');
      const found = await searchSharePointPm(service, principal, url.searchParams.get('q') || '');
      send(res, 200, found, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/pm/leads') {
      const leads = await service.listAuthorizedLeads(principal);
      send(
        res,
        200,
        {
          leads,
          source: 'sharepoint',
          configured: Boolean(opts.cfg.pmBackend.sharepoint?.leadsListId),
        },
        origin,
      );
      return true;
    }

    const leadOne = path.match(/^\/api\/pm\/leads\/([^/]+)$/);
    if (method === 'GET' && leadOne) {
      const lead = await service.authorizeLead(principal, decodeURIComponent(leadOne[1]));
      if (lead === 'not_found') {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      send(res, 200, { lead, source: 'sharepoint' }, origin);
      return true;
    }

    if (method === 'PATCH' && leadOne) {
      const lead = await service.patchLead(
        principal,
        decodeURIComponent(leadOne[1]),
        body,
        readEtag(req, body),
      );
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'pm_lead_patch',
        outcome: 'success',
        detail: `list=HVCG_Leads item=${lead.id} status=${lead.status}`,
      });
      send(res, 200, { lead }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/pm/fabric/sync') {
      const tokenProvider =
        opts.cfg.pmTokenProvider ||
        createManagedIdentityTokenProvider(opts.cfg.pmBackend.sharepoint?.managedIdentityClientId || '', {
          resource: GRAPH_TOKEN_RESOURCE,
        });
      const fabric = createFabricGraphClient(tokenProvider);
      const result = await runFabricSync({
        principal,
        service,
        fabric,
        dataDir: opts.cfg.dataDir,
      });
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'pm_fabric_sync',
        outcome: 'success',
        detail: `mail=${result.indexed.mailThreads} meetings=${result.indexed.meetings} files=${result.indexed.files} skipped=${result.indexed.skipped}`,
      });
      send(res, 200, { fabric: result }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/pm/projects') {
      const projects = await service.listAuthorizedProjects(principal);
      send(res, 200, { projects }, origin);
      return true;
    }

    const projectGet = path.match(/^\/api\/pm\/projects\/([^/]+)$/);
    if (method === 'GET' && projectGet) {
      const rawId = decodeURIComponent(projectGet[1]);
      if (!isValidProjectId(rawId) || !isSharePointItemId(rawId)) {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      const project = await service.authorizeProject(principal, rawId);
      if (project === 'not_found') {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      const tasks = await service.listAuthorizedTasks(principal, project.id);
      const milestones = await service.listAuthorizedMilestones(principal, project.id);
      send(
        res,
        200,
        {
          project,
          tasks,
          board: boardFromTasks(tasks),
          milestones,
          deferred: deferredMeta(),
        },
        origin,
      );
      return true;
    }

    if (method === 'POST' && path === '/api/pm/projects') {
      const project = await service.createProject(principal, body, idempotencyKey(req, body));
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'pm_project_create',
        outcome: 'success',
        detail: `list=HVCG_Projects item=${project.id} client=${project.clientCode || 'internal'}`,
      });
      send(res, 200, { project }, origin);
      return true;
    }

    if (method === 'PATCH' && projectGet) {
      const rawId = decodeURIComponent(projectGet[1]);
      if (!isSharePointItemId(rawId)) {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      const project = await service.patchProject(principal, rawId, body, readEtag(req, body));
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'pm_project_patch',
        outcome: 'success',
        detail: `list=HVCG_Projects item=${project.id} client=${project.clientCode || 'internal'}`,
      });
      send(res, 200, { project }, origin);
      return true;
    }

    const archive = path.match(/^\/api\/pm\/projects\/([^/]+)\/archive$/);
    if (method === 'POST' && archive) {
      const rawId = decodeURIComponent(archive[1]);
      if (!isSharePointItemId(rawId)) {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      const project = await service.authorizeProject(principal, rawId);
      if (project === 'not_found') {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      service.archiveProject();
    }

    if (method === 'GET' && path === '/api/pm/tasks') {
      const url = new URL(req.url || '', 'http://local');
      const projectId = url.searchParams.get('projectId') || undefined;
      const tasks = await service.listAuthorizedTasks(principal, projectId || undefined);
      send(res, 200, { tasks }, origin);
      return true;
    }

    const taskOne = path.match(/^\/api\/pm\/tasks\/([^/]+)$/);
    if (method === 'GET' && taskOne) {
      const task = await service.authorizeTask(principal, decodeURIComponent(taskOne[1]));
      if (task === 'not_found') {
        send(res, 404, { error: 'not_found', code: 'not_found' }, origin);
        return true;
      }
      send(res, 200, { task }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/pm/tasks') {
      const task = await service.createTask(principal, body, idempotencyKey(req, body));
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'pm_task_create',
        outcome: 'success',
        detail: `list=HVCG_Tasks item=${task.id} project=${task.projectId || ''}`,
      });
      send(res, 200, { task }, origin);
      return true;
    }

    if (method === 'PATCH' && taskOne) {
      const task = await service.patchTask(
        principal,
        decodeURIComponent(taskOne[1]),
        body,
        readEtag(req, body),
      );
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'pm_task_patch',
        outcome: 'success',
        detail: `list=HVCG_Tasks item=${task.id}`,
      });
      send(res, 200, { task }, origin);
      return true;
    }

    if (method === 'POST' && path === '/api/pm/milestones') {
      const milestone = await service.createMilestone(principal, body);
      audit({
        repo,
        actorUserId: principal.userId,
        action: 'pm_milestone_create',
        outcome: 'success',
        detail: `list=HVCG_Milestones item=${milestone.id} project=${milestone.projectId}`,
      });
      send(res, 200, { milestone }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/pm/my-work') {
      const tasks = await service.myWorkTasks(principal);
      send(res, 200, { myWork: myWorkPayload(tasks) }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/pm/command-center') {
      const projects = await service.listAuthorizedProjects(principal);
      const tasks = await service.listAuthorizedTasks(principal);
      const leads = await service.listAuthorizedLeads(principal);
      const milestones = [];
      for (const p of projects) {
        milestones.push(...(await service.listAuthorizedMilestones(principal, p.id)));
      }
      send(res, 200, { commandCenter: commandCenterPayload(projects, tasks, milestones, leads) }, origin);
      return true;
    }

    if (method === 'GET' && path === '/api/pm/portfolio') {
      const projects = await service.listAuthorizedProjects(principal);
      const today = new Date().toISOString().slice(0, 10);
      const portfolio = [];
      for (const p of projects) {
        const tasks = await service.listAuthorizedTasks(principal, p.id);
        const open = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
        const milestones = await service.listAuthorizedMilestones(principal, p.id);
        const next = milestones
          .filter((m) => m.status !== 'completed')
          .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))[0];
        const blocked = open.filter((t) => t.status === 'blocked' || Boolean(t.blocker));
        const needsOwner = open.filter(
          (t) => t.status === 'needs_owner_approval' || t.status === 'needs_review' || t.requiresApproval,
        );
        portfolio.push({
          ...p,
          overdueTaskCount: open.filter((t) => t.dueDate && t.dueDate.slice(0, 10) < today).length,
          blockerCount: blocked.length,
          openTaskCount: open.length,
          nextMilestone: next?.title,
          nextMilestoneDue: next?.dueDate,
          dataQuality: {
            nextActionSet: Boolean(p.nextAction),
            needsOwnerReview: needsOwner.length > 0,
            missingClientId: !p.clientCode && !p.isInternalProject,
          },
        });
      }
      send(res, 200, { portfolio }, origin);
      return true;
    }

    send(res, 404, { error: 'pm_route_not_found', code: 'pm_route_not_found' }, origin);
    return true;
  } catch (err) {
    return fail(err);
  }
}
