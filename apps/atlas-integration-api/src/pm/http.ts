import type { IncomingMessage, ServerResponse } from 'node:http';
import { audit } from '../audit/auditLog.ts';
import type { AppConfig } from '../config.ts';
import { headersFromIncoming, parsePrincipal, type AtlasPrincipal } from '../middleware/auth.ts';
import type { IntegrationRepository } from '../store/repository.ts';
import { bootstrapKnownProjects, extractWorkFromSources } from './bootstrap.ts';
import { populateRealWorkFromMicrosoft } from './populateReal.ts';
import {
  buildClientWorkspace,
  buildCommandCenter,
  buildMyWork,
  buildPortfolio,
  buildWeeklyCeoReview,
} from './commandCenter.ts';
import { quickCapture } from './quickCapture.ts';
import type { PmRepository } from './repository.ts';
import type { ProjectRecord, TaskRecord } from './types.ts';

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

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function requirePrincipal(req: IncomingMessage, cfg: AppConfig): AtlasPrincipal {
  if (!cfg.requireAuth) {
    return {
      userId: 'dev-user',
      organizationId: 'org-hvcg',
      allowedClientIds: ['*'],
      roles: ['Admin'],
    };
  }
  const p = parsePrincipal(headersFromIncoming(req.headers));
  if (!p) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }
  return p;
}

/**
 * Returns true if the request was handled as a /api/pm/* route.
 */
export async function handlePmRoutes(opts: {
  cfg: AppConfig;
  repo: IntegrationRepository;
  pm: PmRepository;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
}): Promise<boolean> {
  const { cfg, repo, pm, req, res, method, path, origin } = opts;
  if (!path.startsWith('/api/pm')) return false;

  // GET routes
  if (method === 'GET') {
    requirePrincipal(req, cfg);

    if (path === '/api/pm/command-center') {
      send(res, 200, { commandCenter: buildCommandCenter(pm, repo) }, origin);
      return true;
    }
    if (path === '/api/pm/my-work') {
      const url = new URL(req.url || '', 'http://local');
      const ownerId = url.searchParams.get('ownerId') || 'person-manny';
      send(res, 200, { myWork: buildMyWork(pm, ownerId) }, origin);
      return true;
    }
    if (path === '/api/pm/portfolio') {
      send(res, 200, { portfolio: buildPortfolio(pm) }, origin);
      return true;
    }
    if (path === '/api/pm/projects') {
      send(res, 200, { projects: pm.listProjects() }, origin);
      return true;
    }
    const projectMatch = path.match(/^\/api\/pm\/projects\/([^/]+)$/);
    if (projectMatch) {
      const project = pm.getProject(projectMatch[1]);
      if (!project) {
        send(res, 404, { error: 'not_found' }, origin);
        return true;
      }
      send(
        res,
        200,
        {
          project,
          tasks: pm.listTasks({ projectId: project.id }),
          milestones: pm.listMilestones(project.id),
          risks: pm.listRisksIssues().filter((r) => r.projectId === project.id),
          decisions: pm.listDecisions().filter((d) => d.projectId === project.id),
          commitments: pm.listCommitments().filter((c) => c.projectId === project.id),
          deliverables: pm.listDeliverables(project.id),
          waiting: pm.listWaiting().filter((w) => w.projectId === project.id),
        },
        origin,
      );
      return true;
    }
    if (path === '/api/pm/tasks') {
      const url = new URL(req.url || '', 'http://local');
      send(
        res,
        200,
        {
          tasks: pm.listTasks({
            assigneeId: url.searchParams.get('assigneeId') || undefined,
            projectId: url.searchParams.get('projectId') || undefined,
            clientId: url.searchParams.get('clientId') || undefined,
            openOnly: url.searchParams.get('openOnly') === '1',
          }),
        },
        origin,
      );
      return true;
    }
    if (path === '/api/pm/inbox') {
      send(res, 200, { inbox: pm.listInbox('pending') }, origin);
      return true;
    }
    if (path === '/api/pm/team') {
      send(res, 200, { team: pm.listTeam(), agents: pm.listAgents() }, origin);
      return true;
    }
    if (path === '/api/pm/templates') {
      send(res, 200, { templates: pm.listTemplates() }, origin);
      return true;
    }
    if (path === '/api/pm/weekly-review') {
      send(res, 200, { review: buildWeeklyCeoReview(pm, repo) }, origin);
      return true;
    }
    if (path === '/api/pm/commitments') {
      send(res, 200, { commitments: pm.listCommitments() }, origin);
      return true;
    }
    if (path === '/api/pm/waiting') {
      send(res, 200, { waiting: pm.listWaiting() }, origin);
      return true;
    }
    if (path === '/api/pm/decisions') {
      send(res, 200, { decisions: pm.listDecisions() }, origin);
      return true;
    }
    if (path === '/api/pm/risks') {
      send(res, 200, { risks: pm.listRisksIssues() }, origin);
      return true;
    }
    const clientWs = path.match(/^\/api\/pm\/clients\/([^/]+)\/workspace$/);
    if (clientWs) {
      send(res, 200, { workspace: buildClientWorkspace(pm, repo, clientWs[1]) }, origin);
      return true;
    }
    send(res, 404, { error: 'pm_route_not_found' }, origin);
    return true;
  }

  if (method !== 'POST' && method !== 'PATCH') {
    send(res, 405, { error: 'method_not_allowed' }, origin);
    return true;
  }

  const principal = requirePrincipal(req, cfg);
  const body = await readJson(req);

  if (path === '/api/pm/bootstrap') {
    const clients = repo.listClient360().map((c) => ({
      id: c.id,
      displayName: c.displayName,
      domains: c.domains || [],
      completenessScore: c.completenessScore,
    }));
    const result = bootstrapKnownProjects(pm, clients);
    audit({
      repo,
      actorUserId: principal.userId,
      action: 'pm_bootstrap',
      outcome: 'success',
      detail: JSON.stringify(result),
    });
    send(res, 200, { ok: true, ...result }, origin);
    return true;
  }

  if (path === '/api/pm/extract') {
    const result = extractWorkFromSources(pm, repo);
    audit({
      repo,
      actorUserId: principal.userId,
      action: 'pm_extract',
      outcome: 'success',
      detail: JSON.stringify(result),
    });
    send(res, 200, { ok: true, ...result, commandCenter: buildCommandCenter(pm, repo) }, origin);
    return true;
  }

  if (path === '/api/pm/initialize' || path === '/api/pm/populate') {
    const result = populateRealWorkFromMicrosoft(pm, repo);
    audit({
      repo,
      actorUserId: principal.userId,
      action: path === '/api/pm/populate' ? 'pm_populate' : 'pm_initialize',
      outcome: 'success',
      detail: `clients=${result.realClientsSelected} projects=${result.projectsTotal} tasks=${result.tasksOpen}`,
    });
    send(
      res,
      200,
      {
        ok: true,
        populate: result,
        bootstrap: result.bootstrap,
        extract: result.extraction,
        commandCenter: buildCommandCenter(pm, repo),
        myWork: buildMyWork(pm),
      },
      origin,
    );
    return true;
  }

  if (path === '/api/pm/quick-capture') {
    const text = String(body.text || body.input || '').trim();
    const result = quickCapture(pm, text, principal.userId);
    audit({
      repo,
      actorUserId: principal.userId,
      action: 'pm_quick_capture',
      outcome: 'success',
      detail: result.message,
    });
    send(res, 200, result, origin);
    return true;
  }

  if (path === '/api/pm/tasks' && method === 'POST') {
    const now = new Date().toISOString();
    const task: TaskRecord = {
      id: crypto.randomUUID(),
      title: String(body.title || 'Untitled task'),
      description: body.description ? String(body.description) : undefined,
      projectId: body.projectId ? String(body.projectId) : undefined,
      clientId: body.clientId ? String(body.clientId) : undefined,
      clientName: body.clientName ? String(body.clientName) : undefined,
      assigneeKind: (body.assigneeKind as TaskRecord['assigneeKind']) || 'person',
      assigneeId: String(body.assigneeId || 'person-manny'),
      assigneeName: String(body.assigneeName || 'Manny Barela'),
      creatorId: principal.userId,
      creatorName: principal.userId,
      source: 'manual',
      sourceLinks: [],
      status: (body.status as TaskRecord['status']) || 'inbox',
      priority: (body.priority as TaskRecord['priority']) || 'normal',
      dueDate: body.dueDate ? String(body.dueDate) : undefined,
      dependencyTaskIds: [],
      requiresApproval: Boolean(body.requiresApproval),
      checklist: [],
      confidence: 1,
      autoGenerated: false,
      createdAt: now,
      updatedAt: now,
      activity: [],
    };
    pm.upsertTask(task);
    send(res, 200, { task }, origin);
    return true;
  }

  const taskPatch = path.match(/^\/api\/pm\/tasks\/([^/]+)$/);
  if (taskPatch && method === 'PATCH') {
    const existing = pm.getTask(taskPatch[1]);
    if (!existing) {
      send(res, 404, { error: 'not_found' }, origin);
      return true;
    }
    const updated: TaskRecord = {
      ...existing,
      ...('title' in body ? { title: String(body.title) } : {}),
      ...('status' in body ? { status: body.status as TaskRecord['status'] } : {}),
      ...('priority' in body ? { priority: body.priority as TaskRecord['priority'] } : {}),
      ...('dueDate' in body ? { dueDate: body.dueDate ? String(body.dueDate) : undefined } : {}),
      ...('assigneeId' in body ? { assigneeId: String(body.assigneeId) } : {}),
      ...('assigneeName' in body ? { assigneeName: String(body.assigneeName) } : {}),
      ...('nextAction' in body ? { nextAction: String(body.nextAction) } : {}),
      ...('blocker' in body ? { blocker: String(body.blocker) } : {}),
      updatedAt: new Date().toISOString(),
      completedAt:
        body.status === 'completed' ? new Date().toISOString() : existing.completedAt,
    };
    if (body.status === 'completed') {
      // Auto-advance project health lightly
      if (updated.projectId) {
        const proj = pm.getProject(updated.projectId);
        if (proj) {
          const open = pm.listTasks({ projectId: proj.id, openOnly: true }).length;
          const total = pm.listTasks({ projectId: proj.id }).length || 1;
          const done = total - open;
          pm.upsertProject({
            ...proj,
            progressPercent: Math.min(100, Math.round((done / total) * 100)),
            lastActivityAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            health: open === 0 ? 'healthy' : proj.health,
          });
        }
      }
    }
    pm.upsertTask(updated);
    send(res, 200, { task: updated }, origin);
    return true;
  }

  if (path === '/api/pm/projects' && method === 'POST') {
    const now = new Date().toISOString();
    const project: ProjectRecord = {
      id: crypto.randomUUID(),
      name: String(body.name || 'New project'),
      clientId: body.clientId ? String(body.clientId) : undefined,
      clientName: body.clientName ? String(body.clientName) : undefined,
      businessEntity: String(body.businessEntity || 'HVCG'),
      projectType: (body.projectType as ProjectRecord['projectType']) || 'client_engagement',
      description: body.description ? String(body.description) : undefined,
      objective: body.objective ? String(body.objective) : undefined,
      ownerId: String(body.ownerId || 'person-manny'),
      ownerName: String(body.ownerName || 'Manny Barela'),
      teamMemberIds: Array.isArray(body.teamMemberIds)
        ? (body.teamMemberIds as string[])
        : ['person-manny'],
      status: 'active',
      priority: (body.priority as ProjectRecord['priority']) || 'normal',
      health: 'healthy',
      progressPercent: 0,
      nextAction: body.nextAction ? String(body.nextAction) : 'Define first milestone',
      sourceLinks: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };
    pm.upsertProject(project);
    send(res, 200, { project }, origin);
    return true;
  }

  const inboxProcess = path.match(/^\/api\/pm\/inbox\/([^/]+)\/(accept|dismiss)$/);
  if (inboxProcess && method === 'POST') {
    const item = pm.listInbox().find((i) => i.id === inboxProcess[1]);
    if (!item) {
      send(res, 404, { error: 'not_found' }, origin);
      return true;
    }
    if (inboxProcess[2] === 'dismiss') {
      pm.upsertInbox({ ...item, status: 'dismissed', processedAt: new Date().toISOString() });
      send(res, 200, { ok: true }, origin);
      return true;
    }
    // accept → create task
    const now = new Date().toISOString();
    const task: TaskRecord = {
      id: crypto.randomUUID(),
      title: item.title,
      description: item.summary,
      projectId: item.projectId,
      clientId: item.clientId,
      clientName: item.clientName,
      assigneeKind: 'person',
      assigneeId: 'person-manny',
      assigneeName: 'Manny Barela',
      creatorId: principal.userId,
      creatorName: principal.userId,
      source: 'universal_inbox',
      sourceLinks: item.sourceLinks,
      status: 'ready',
      priority: 'high',
      dependencyTaskIds: [],
      requiresApproval: false,
      checklist: [],
      confidence: item.confidence,
      autoGenerated: true,
      createdAt: now,
      updatedAt: now,
      activity: [],
    };
    pm.upsertTask(task);
    pm.upsertInbox({
      ...item,
      status: 'processed',
      processedAt: now,
      createdTaskId: task.id,
    });
    send(res, 200, { task, inbox: item }, origin);
    return true;
  }

  send(res, 404, { error: 'pm_route_not_found' }, origin);
  return true;
}
