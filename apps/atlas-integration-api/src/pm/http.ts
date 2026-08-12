import type { IncomingMessage, ServerResponse } from 'node:http';
import { audit } from '../audit/auditLog.ts';
import type { AppConfig } from '../config.ts';
import { requirePrincipal } from '../middleware/auth.ts';
import type { IntegrationRepository } from '../store/repository.ts';
import { bootstrapKnownProjects, extractWorkFromSources } from './bootstrap.ts';
import { populateRealWorkFromMicrosoft, previewPopulateFromMicrosoft } from './populateReal.ts';
import {
  buildClientWorkspace,
  buildCommandCenter,
  buildMyWork,
  buildPortfolio,
  buildWeeklyCeoReview,
} from './commandCenter.ts';
import { listOperatingDocuments } from './documents.ts';
import { isValidProjectId } from './projectId.ts';
import { quickCapture } from './quickCapture.ts';
import { pmBackendUnavailableBody } from './backend.ts';
import type { PmRepository } from './repository.ts';
import type {
  DecisionRecord,
  MilestoneRecord,
  NoteRecord,
  OwnerReviewItem,
  ProjectRecord,
  TaskRecord,
} from './types.ts';

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

/**
 * Returns true if the request was handled as a /api/pm/* route.
 */
export async function handlePmRoutes(opts: {
  cfg: AppConfig;
  repo: IntegrationRepository;
  pm: PmRepository | null;
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  path: string;
  origin?: string | null;
}): Promise<boolean> {
  const { cfg, repo, req, res, method, path, origin } = opts;
  if (!path.startsWith('/api/pm')) return false;

  // Authentication is evaluated before PM availability so 401 is never a 503.
  const principal = await requirePrincipal(req, cfg);

  if (cfg.pmBackend.mode !== 'development-json' || !opts.pm) {
    send(res, 503, pmBackendUnavailableBody(), origin);
    return true;
  }

  const pm = opts.pm;

  // GET routes
  if (method === 'GET') {
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
      const rawId = decodeURIComponent(projectMatch[1]);
      if (!isValidProjectId(rawId)) {
        send(
          res,
          404,
          {
            error: 'invalid_project_id',
            message:
              'Project id is missing or invalid. Open Projects from the sidebar to choose a real project.',
          },
          origin,
        );
        return true;
      }
      const project = pm.getProject(rawId);
      if (!project) {
        send(
          res,
          404,
          {
            error: 'not_found',
            message: 'No project exists for this id. It may be archived, never created, or from an obsolete demo catalog.',
          },
          origin,
        );
        return true;
      }
      const tasks = pm.listTasks({ projectId: project.id });
      send(
        res,
        200,
        {
          project,
          tasks,
          board: {
            todo: tasks.filter((t) =>
              ['inbox', 'ready', 'scheduled', 'deferred'].includes(t.status),
            ),
            inProgress: tasks.filter((t) =>
              ['in_progress', 'waiting', 'blocked'].includes(t.status),
            ),
            review: tasks.filter((t) =>
              ['needs_review', 'needs_owner_approval'].includes(t.status),
            ),
            done: tasks.filter((t) => ['completed', 'cancelled'].includes(t.status)),
          },
          milestones: pm.listMilestones(project.id),
          risks: pm.listRisksIssues().filter((r) => r.projectId === project.id),
          decisions: pm.listDecisions().filter((d) => d.projectId === project.id),
          commitments: pm.listCommitments().filter((c) => c.projectId === project.id),
          deliverables: pm.listDeliverables(project.id),
          waiting: pm.listWaiting().filter((w) => w.projectId === project.id),
          notes: pm.listNotes({ projectId: project.id }),
          activity: pm.listActivity(50).filter(
            (a) => a.detail?.includes(project.id) || a.detail?.includes(project.name),
          ),
          documents: listOperatingDocuments(pm, repo, {
            clientId: project.clientId,
            projectId: project.id,
          }).documents.slice(0, 100),
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
      const clientId = decodeURIComponent(clientWs[1]);
      const workspace = buildClientWorkspace(pm, repo, clientId);
      const docs = listOperatingDocuments(pm, repo, { clientId });
      send(
        res,
        200,
        {
          workspace: {
            ...workspace,
            notes: pm.listNotes({ clientId }),
            documents: docs.documents,
            meetings: (workspace.client?.timeline || [])
              .filter((t) => /meeting|calendar|call/i.test(String(t.kind || t.title || '')))
              .slice(0, 40),
          },
        },
        origin,
      );
      return true;
    }
    if (path === '/api/pm/documents') {
      const url = new URL(req.url || '', 'http://local');
      const result = listOperatingDocuments(pm, repo, {
        clientId: url.searchParams.get('clientId') || undefined,
        projectId: url.searchParams.get('projectId') || undefined,
        query: url.searchParams.get('q') || undefined,
        documentType: url.searchParams.get('type') || undefined,
        confidentiality: url.searchParams.get('confidentiality') || undefined,
        includeRestricted: url.searchParams.get('includeRestricted') === '1',
      });
      send(
        res,
        200,
        {
          count: result.documents.length,
          restrictedOmitted: result.restrictedOmitted,
          sharePointSites: {
            commandCenter: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter',
            clients: 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients',
          },
          documents: result.documents,
        },
        origin,
      );
      return true;
    }
    if (path === '/api/pm/notes') {
      const url = new URL(req.url || '', 'http://local');
      send(
        res,
        200,
        {
          notes: pm.listNotes({
            projectId: url.searchParams.get('projectId') || undefined,
            clientId: url.searchParams.get('clientId') || undefined,
          }),
        },
        origin,
      );
      return true;
    }
    if (path === '/api/pm/owner-review') {
      send(res, 200, { items: pm.listOwnerReview('pending') }, origin);
      return true;
    }
    if (
      path === '/api/pm/populate/preview' ||
      path === '/api/pm/sync/preview' ||
      path === '/api/pm/populate' ||
      path === '/api/pm/initialize'
    ) {
      // GET populate/initialize is always dry-run — never mutates.
      const preview = previewPopulateFromMicrosoft(pm, repo);
      send(res, 200, { ok: true, dryRun: true, preview }, origin);
      return true;
    }
    send(res, 404, { error: 'pm_route_not_found' }, origin);
    return true;
  }

  if (method !== 'POST' && method !== 'PATCH') {
    send(res, 405, { error: 'method_not_allowed' }, origin);
    return true;
  }

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
    const dryRun =
      method === 'GET' ||
      body?.dryRun === true ||
      body?.preview === true ||
      new URL(req.url || '', 'http://local').searchParams.get('dryRun') === '1';
    if (dryRun) {
      const preview = previewPopulateFromMicrosoft(pm, repo);
      send(res, 200, { ok: true, dryRun: true, preview }, origin);
      return true;
    }
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

  if (path === '/api/pm/populate/preview' || path === '/api/pm/sync/preview') {
    const preview = previewPopulateFromMicrosoft(pm, repo);
    send(res, 200, { ok: true, dryRun: true, preview }, origin);
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
      health: 'unknown',
      progressPercent: 0,
      nextAction: body.nextAction ? String(body.nextAction) : undefined,
      targetCompletionDate: body.targetCompletionDate
        ? String(body.targetCompletionDate)
        : undefined,
      sourceLinks: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };
    pm.upsertProject(project);
    pm.appendActivity('project_created', principal.userId, `${project.id}:${project.name}`);
    send(res, 200, { project }, origin);
    return true;
  }

  const projectPatch = path.match(/^\/api\/pm\/projects\/([^/]+)$/);
  if (projectPatch && method === 'PATCH') {
    const rawId = decodeURIComponent(projectPatch[1]);
    if (!isValidProjectId(rawId)) {
      send(res, 404, { error: 'invalid_project_id' }, origin);
      return true;
    }
    const existing = pm.getProject(rawId);
    if (!existing) {
      send(res, 404, { error: 'not_found' }, origin);
      return true;
    }
    const updated: ProjectRecord = {
      ...existing,
      ...('name' in body ? { name: String(body.name) } : {}),
      ...('clientId' in body ? { clientId: body.clientId ? String(body.clientId) : undefined } : {}),
      ...('clientName' in body
        ? { clientName: body.clientName ? String(body.clientName) : undefined }
        : {}),
      ...('status' in body ? { status: body.status as ProjectRecord['status'] } : {}),
      ...('priority' in body ? { priority: body.priority as ProjectRecord['priority'] } : {}),
      ...('health' in body ? { health: body.health as ProjectRecord['health'] } : {}),
      ...('objective' in body
        ? { objective: body.objective ? String(body.objective) : undefined }
        : {}),
      ...('nextAction' in body
        ? { nextAction: body.nextAction ? String(body.nextAction) : undefined }
        : {}),
      ...('ownerId' in body ? { ownerId: String(body.ownerId) } : {}),
      ...('ownerName' in body ? { ownerName: String(body.ownerName) } : {}),
      ...('targetCompletionDate' in body
        ? {
            targetCompletionDate: body.targetCompletionDate
              ? String(body.targetCompletionDate)
              : undefined,
          }
        : {}),
      ...('teamMemberIds' in body && Array.isArray(body.teamMemberIds)
        ? { teamMemberIds: body.teamMemberIds as string[] }
        : {}),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };
    pm.upsertProject(updated);
    pm.appendActivity('project_updated', principal.userId, `${updated.id}:${updated.name}`);
    send(res, 200, { project: updated }, origin);
    return true;
  }

  const projectArchive = path.match(/^\/api\/pm\/projects\/([^/]+)\/archive$/);
  if (projectArchive && method === 'POST') {
    const rawId = decodeURIComponent(projectArchive[1]);
    if (!isValidProjectId(rawId)) {
      send(res, 404, { error: 'invalid_project_id' }, origin);
      return true;
    }
    const existing = pm.getProject(rawId);
    if (!existing) {
      send(res, 404, { error: 'not_found' }, origin);
      return true;
    }
    const now = new Date().toISOString();
    const updated: ProjectRecord = {
      ...existing,
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };
    pm.upsertProject(updated);
    pm.appendActivity('project_archived', principal.userId, `${updated.id}:${updated.name}`);
    send(res, 200, { project: updated }, origin);
    return true;
  }

  if (path === '/api/pm/milestones' && method === 'POST') {
    const now = new Date().toISOString();
    const projectId = String(body.projectId || '');
    if (!isValidProjectId(projectId) || !pm.getProject(projectId)) {
      send(res, 400, { error: 'project_required' }, origin);
      return true;
    }
    const milestone: MilestoneRecord = {
      id: crypto.randomUUID(),
      projectId,
      title: String(body.title || 'Milestone'),
      dueDate: body.dueDate ? String(body.dueDate) : undefined,
      status: (body.status as MilestoneRecord['status']) || 'pending',
      order: Number(body.order || pm.listMilestones(projectId).length + 1),
    };
    pm.upsertMilestone(milestone);
    pm.appendActivity('milestone_created', principal.userId, `${projectId}:${milestone.title}`);
    send(res, 200, { milestone }, origin);
    return true;
  }

  if (path === '/api/pm/decisions' && method === 'POST') {
    const now = new Date().toISOString();
    const decision: DecisionRecord = {
      id: crypto.randomUUID(),
      title: String(body.title || 'Decision'),
      decision: String(body.decision || body.title || ''),
      date: String(body.date || now.slice(0, 10)),
      ownerId: String(body.ownerId || 'person-manny'),
      ownerName: String(body.ownerName || 'Manny Barela'),
      context: body.context ? String(body.context) : undefined,
      clientId: body.clientId ? String(body.clientId) : undefined,
      clientName: body.clientName ? String(body.clientName) : undefined,
      projectId: body.projectId ? String(body.projectId) : undefined,
      sourceLinks: [],
      status: (body.status as DecisionRecord['status']) || 'open',
      createdAt: now,
      updatedAt: now,
    };
    pm.upsertDecision(decision);
    send(res, 200, { decision }, origin);
    return true;
  }

  if (path === '/api/pm/notes' && method === 'POST') {
    const now = new Date().toISOString();
    const note: NoteRecord = {
      id: crypto.randomUUID(),
      body: String(body.body || body.text || ''),
      title: body.title ? String(body.title) : undefined,
      ownerId: String(body.ownerId || 'person-manny'),
      ownerName: String(body.ownerName || 'Manny Barela'),
      clientId: body.clientId ? String(body.clientId) : undefined,
      clientName: body.clientName ? String(body.clientName) : undefined,
      projectId: body.projectId ? String(body.projectId) : undefined,
      sourceLinks: [],
      createdAt: now,
      updatedAt: now,
    };
    if (!note.body.trim()) {
      send(res, 400, { error: 'body_required' }, origin);
      return true;
    }
    pm.upsertNote(note);
    send(res, 200, { note }, origin);
    return true;
  }

  if (path === '/api/pm/owner-review' && method === 'POST') {
    const now = new Date().toISOString();
    const item: OwnerReviewItem = {
      id: crypto.randomUUID(),
      kind: (body.kind as OwnerReviewItem['kind']) || 'other',
      title: String(body.title || 'Review item'),
      reason: String(body.reason || 'Ambiguous ownership or client association'),
      suggestedClientId: body.suggestedClientId ? String(body.suggestedClientId) : undefined,
      suggestedClientName: body.suggestedClientName ? String(body.suggestedClientName) : undefined,
      sourceLinks: [],
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    pm.upsertOwnerReview(item);
    send(res, 200, { item }, origin);
    return true;
  }

  const ownerReviewPatch = path.match(/^\/api\/pm\/owner-review\/([^/]+)$/);
  if (ownerReviewPatch && method === 'PATCH') {
    const existing = pm.listOwnerReview('pending').find((i) => i.id === ownerReviewPatch[1])
      || pm.snapshot().ownerReviewQueue.find((i) => i.id === ownerReviewPatch[1]);
    if (!existing) {
      send(res, 404, { error: 'not_found' }, origin);
      return true;
    }
    const now = new Date().toISOString();
    const updated: OwnerReviewItem = {
      ...existing,
      status: (body.status as OwnerReviewItem['status']) || existing.status,
      resolutionNote: body.resolutionNote ? String(body.resolutionNote) : existing.resolutionNote,
      updatedAt: now,
      resolvedAt: body.status && body.status !== 'pending' ? now : existing.resolvedAt,
    };
    pm.upsertOwnerReview(updated);
    send(res, 200, { item: updated }, origin);
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
