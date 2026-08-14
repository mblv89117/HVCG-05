/**
 * SharePoint Graph PM repository — MVP lists only.
 * Authorization is applied by callers after classify; collection methods
 * query only entitled ClientCodes (plus internal for staff).
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import type { UserBasicLookup } from '../../entitlements/userLookup.ts';
import { ownerEmailFromProfile } from '../../entitlements/userLookup.ts';
import type { MilestoneRecord, ProjectHealth, ProjectRecord, ProjectStatus, TaskPriority, TaskRecord, TaskStatus } from '../types.ts';
import {
  canAccessClassification,
  classifyProjectFields,
  entitledClientCodes,
  isInternalStaff,
  type ProjectClassification,
} from './authz.ts';
import { PmHttpError, pmInfrastructureError, pmNotImplemented } from './errors.ts';
import type { GraphListItem, PmGraphTransport } from './graph.ts';
import { isSharePointItemId, normalizeEmail } from './ids.ts';
import {
  healthFromSharePoint,
  healthToSharePoint,
  milestoneStatusFromSharePoint,
  milestoneStatusToSharePoint,
  priorityFromSharePoint,
  priorityToSharePoint,
  projectStatusFromSharePoint,
  projectStatusToSharePoint,
  taskStatusFromSharePoint,
  taskStatusToSharePoint,
  type MilestoneHubStatus,
} from './mapping.ts';
import { fieldsEq, itemMatchesFieldsFilter } from './odata.ts';
import type { SharePointPmSettings } from './settings.ts';

export const DEFERRED_COLLECTIONS = [
  'risks',
  'decisions',
  'commitments',
  'deliverables',
  'waiting',
  'notes',
  'documents',
  'activity',
] as const;

export type SharePointProject = ProjectRecord & {
  etag: string;
  clientCode?: string;
  isInternalProject: boolean;
  classification: ProjectClassification;
};

export type SharePointTask = TaskRecord & {
  etag: string;
  clientCode?: string;
};

export type SharePointMilestone = MilestoneRecord & { etag: string; clientCode?: string };

function asString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

function asBool(v: unknown): boolean {
  return v === true || v === 1 || v === '1' || v === 'true';
}

function lookupId(fields: Record<string, unknown>, graphName: string): string | undefined {
  const v = fields[`${graphName}LookupId`] ?? fields[graphName];
  const s = asString(v);
  return s && isSharePointItemId(s) ? s : s && /^\d+$/.test(s) ? s : undefined;
}

function isoDate(v: unknown): string | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export class SharePointPmService {
  constructor(
    private readonly settings: SharePointPmSettings,
    private readonly graph: PmGraphTransport,
    private readonly lookupUser: UserBasicLookup,
  ) {}

  private async listAll(listId: string, filter?: string): Promise<GraphListItem[]> {
    const items: GraphListItem[] = [];
    let nextLink: string | undefined;
    do {
      const page = await this.graph.listItems(listId, { nextLink, top: 100 });
      items.push(...page.items);
      nextLink = page.nextLink;
    } while (nextLink);
    return filter ? items.filter((item) => itemMatchesFieldsFilter(item, filter)) : items;
  }

  private classifyItem(fields: Record<string, unknown>): ProjectClassification {
    return classifyProjectFields({
      clientCode: asString(fields.ClientCode),
      isInternal: asBool(fields.IsInternalProject),
    });
  }

  private mapProject(item: GraphListItem): SharePointProject | null {
    const title = asString(item.fields.Title);
    const status = projectStatusFromSharePoint(asString(item.fields.ProjectStatus));
    const health = healthFromSharePoint(asString(item.fields.ProjectHealth));
    const priority = priorityFromSharePoint(asString(item.fields.Priority));
    if (!item.id || !title || !status || !health || !priority) return null;
    const classification = this.classifyItem(item.fields);
    const clientCode = classification.kind === 'client' ? classification.clientCode : undefined;
    const ownerEmail = asString(item.fields.ProjectOwnerEmail) || '';
    const created = isoDate(item.fields.Created) || new Date(0).toISOString();
    const updated = isoDate(item.fields.Modified) || created;
    const record: SharePointProject = {
      id: item.id,
      name: title,
      clientId: clientCode,
      clientName: asString(item.fields.AtlasClientRef),
      clientCode,
      isInternalProject: classification.kind === 'internal',
      classification,
      businessEntity: 'HVCG',
      projectType: classification.kind === 'internal' ? 'internal_operations' : 'client_engagement',
      description: asString(item.fields.Objectives),
      objective: asString(item.fields.Objectives),
      ownerId: ownerEmail,
      ownerName: ownerEmail,
      teamMemberIds: [],
      startDate: isoDate(item.fields.StartDate),
      targetCompletionDate: isoDate(item.fields.TargetEndDate),
      status,
      priority,
      health,
      progressPercent: Number(item.fields.PercentComplete) || 0,
      nextAction: asString(item.fields.NextAction),
      sourceLinks: [],
      tags: [],
      createdAt: created,
      updatedAt: updated,
      lastActivityAt: updated,
      etag: item.etag,
    };
    return record;
  }

  private mapTask(item: GraphListItem): SharePointTask | null {
    const title = asString(item.fields.Title);
    const status = taskStatusFromSharePoint(asString(item.fields.TaskStatus));
    const priority = priorityFromSharePoint(asString(item.fields.Priority));
    const projectId = lookupId(item.fields, 'ProjectId');
    if (!item.id || !title || !status || !priority || !projectId) return null;
    const ownerEmail = asString(item.fields.OwnerEmail);
    const created = isoDate(item.fields.Created) || new Date(0).toISOString();
    const updated = isoDate(item.fields.Modified) || created;
    return {
      id: item.id,
      title,
      description: asString(item.fields.Description),
      projectId,
      clientId: asString(item.fields.ClientCode),
      clientCode: asString(item.fields.ClientCode),
      clientName: asString(item.fields.AtlasClientRef),
      assigneeKind: ownerEmail ? 'person' : 'unassigned',
      assigneeId: ownerEmail,
      assigneeName: ownerEmail,
      creatorId: 'sharepoint',
      creatorName: 'sharepoint',
      source: 'sharepoint',
      sourceLinks: [],
      status,
      priority,
      startDate: isoDate(item.fields.StartDate),
      dueDate: isoDate(item.fields.DueDate),
      estimatedMinutes:
        typeof item.fields.EstimatedHours === 'number'
          ? Math.round(item.fields.EstimatedHours * 60)
          : undefined,
      dependencyTaskIds: [],
      blocker: asString(item.fields.Blockers),
      requiresApproval: false,
      checklist: [],
      nextAction: asString(item.fields.Notes),
      completionEvidence: asString(item.fields.CompletionEvidence),
      confidence: 1,
      autoGenerated: false,
      createdAt: created,
      updatedAt: updated,
      completedAt: isoDate(item.fields.CompletedDate),
      activity: [],
      etag: item.etag,
    };
  }

  private mapMilestone(item: GraphListItem): SharePointMilestone | null {
    const title = asString(item.fields.Title);
    const status = milestoneStatusFromSharePoint(asString(item.fields.Status));
    const projectId = lookupId(item.fields, 'ProjectId');
    if (!item.id || !title || !status || !projectId) return null;
    return {
      id: item.id,
      projectId,
      title,
      dueDate: isoDate(item.fields.DueDate),
      status,
      order: Number(item.fields.id) || 0,
      etag: item.etag,
      clientCode: asString(item.fields.ClientCode),
    };
  }

  async resolveClientByCode(clientCode: string): Promise<{ itemId: string; title: string }> {
    if (!isCanonicalClientCode(clientCode) || clientCode === '*') {
      throw new PmHttpError(400, 'invalid_client_code', 'ClientCode is not canonical.');
    }
    const items = await this.listAll(this.settings.clientsListId, fieldsEq('ClientCode', clientCode));
    const matches = items.filter((i) => asString(i.fields.ClientCode) === clientCode);
    if (matches.length === 0) {
      throw new PmHttpError(400, 'unknown_client_code', 'ClientCode was not found.');
    }
    if (matches.length > 1) {
      throw new PmHttpError(
        409,
        'PM_CLIENTCODE_AMBIGUOUS',
        'ClientCode resolved to more than one SharePoint client record.',
      );
    }
    const item = matches[0];
    return { itemId: item.id, title: asString(item.fields.Title) || clientCode };
  }

  async getProjectRaw(id: string): Promise<SharePointProject | null> {
    if (!isSharePointItemId(id)) return null;
    const item = await this.graph.getItem(this.settings.projectsListId, id);
    if (!item) return null;
    return this.mapProject(item);
  }

  async authorizeProject(
    principal: AtlasPrincipal,
    id: string,
  ): Promise<SharePointProject | 'not_found'> {
    try {
      const project = await this.getProjectRaw(id);
      if (!project) return 'not_found';
      if (!canAccessClassification(principal, project.classification)) return 'not_found';
      return project;
    } catch (err) {
      if (err instanceof PmHttpError && err.status === 404) return 'not_found';
      throw err;
    }
  }

  async listAuthorizedProjects(principal: AtlasPrincipal): Promise<SharePointProject[]> {
    const codes = new Set(entitledClientCodes(principal));
    const seen = new Set<string>();
    const out: SharePointProject[] = [];
    const items = await this.listAll(this.settings.projectsListId);
    for (const item of items) {
      const project = this.mapProject(item);
      if (!project || seen.has(project.id)) continue;
      if (project.classification.kind === 'client') {
        if (!codes.has(project.classification.clientCode)) continue;
        if (!canAccessClassification(principal, project.classification)) continue;
      } else if (project.classification.kind === 'internal') {
        if (!isInternalStaff(principal)) continue;
      } else {
        continue;
      }
      seen.add(project.id);
      out.push(project);
    }
    return out;
  }

  private async ownerEmailForPrincipal(principal: AtlasPrincipal): Promise<string> {
    const result = await this.lookupUser(principal.userId);
    if (!result.ok) {
      if (result.reason === 'empty') {
        throw pmInfrastructureError('PM_IDENTITY_UNMAPPED', 'Directory profile has no mail or userPrincipalName.');
      }
      throw pmInfrastructureError('PM_DIRECTORY_UNAVAILABLE', 'Directory lookup for My Work / owner mapping failed.');
    }
    const email = ownerEmailFromProfile(result.profile);
    if (!email) {
      throw pmInfrastructureError('PM_IDENTITY_UNMAPPED', 'Directory profile has no mail or userPrincipalName.');
    }
    return email;
  }

  async createProject(
    principal: AtlasPrincipal,
    body: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<SharePointProject> {
    const name = asString(body.name);
    if (!name) throw new PmHttpError(400, 'invalid_input', 'Project name is required.');
    const isInternal = body.IsInternalProject === true || body.isInternalProject === true;
    const rawCode = asString(body.ClientCode) || asString(body.clientCode);
    if (rawCode && (asString(body.clientId) || asString(body.clientName)) && !isCanonicalClientCode(rawCode)) {
      throw new PmHttpError(400, 'invalid_client_code', 'ClientCode is not canonical.');
    }
    if (asString(body.clientId) && !rawCode && !isInternal) {
      const maybeUuid = asString(body.clientId) || '';
      if (!isCanonicalClientCode(maybeUuid)) {
        throw new PmHttpError(400, 'invalid_client_code', 'Client 360 identifiers are not ClientCodes.');
      }
    }
    if (isInternal) {
      if (rawCode) {
        throw new PmHttpError(400, 'invalid_input', 'Internal projects must not include ClientCode.');
      }
      if (!isInternalStaff(principal)) {
        throw new PmHttpError(403, 'forbidden', 'Internal project create requires HVCG staff role.');
      }
    } else {
      if (!rawCode || !isCanonicalClientCode(rawCode) || rawCode === '*') {
        throw new PmHttpError(400, 'invalid_client_code', 'Canonical ClientCode is required for client projects.');
      }
      if (!principal.allowedClientIds.includes(rawCode)) {
        throw new PmHttpError(403, 'forbidden', 'Access denied: client not in principal scope');
      }
    }

    if (idempotencyKey) {
      const existing = await this.findByIdempotency(this.settings.projectsListId, idempotencyKey);
      if (existing) {
        const mapped = this.mapProject(existing);
        if (mapped && canAccessClassification(principal, mapped.classification)) return mapped;
        throw new PmHttpError(409, 'PM_IDEMPOTENCY_CONFLICT', 'Idempotency key already used.');
      }
    }

    const ownerEmail = await this.ownerEmailForPrincipal(principal);
    const fields: Record<string, unknown> = {
      Title: name,
      ProjectStatus: projectStatusToSharePoint((body.status as ProjectStatus) || 'active'),
      ProjectHealth: healthToSharePoint((body.health as ProjectHealth) || 'healthy'),
      Priority: priorityToSharePoint((body.priority as TaskPriority) || 'normal'),
      ProjectOwnerEmail: ownerEmail,
      Objectives: asString(body.objective) || asString(body.description) || '',
      NextAction: asString(body.nextAction) || '',
      IsInternalProject: isInternal,
    };
    if (asString(body.targetCompletionDate)) {
      fields.TargetEndDate = asString(body.targetCompletionDate);
    }
    if (idempotencyKey) fields.HVCG_IdempotencyKey = idempotencyKey;

    if (isInternal) {
      fields.ClientCode = '';
    } else {
      const client = await this.resolveClientByCode(rawCode!);
      fields.ClientCode = rawCode;
      fields.AtlasClientRefLookupId = Number(client.itemId);
    }

    const created = await this.graph.createItem(this.settings.projectsListId, fields);
    const mapped = this.mapProject(created);
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Created project could not be mapped.');
    return mapped;
  }

  async patchProject(
    principal: AtlasPrincipal,
    id: string,
    body: Record<string, unknown>,
    etag: string | undefined,
  ): Promise<SharePointProject> {
    const existing = await this.authorizeProject(principal, id);
    if (existing === 'not_found') throw new PmHttpError(404, 'not_found', 'not_found');
    if (!etag) throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');

    for (const locked of ['ClientCode', 'clientCode', 'clientId', 'AtlasClientRef', 'IsInternalProject', 'isInternalProject']) {
      if (locked in body) {
        throw new PmHttpError(400, 'immutable_field', 'Client/internal classification cannot be changed via PATCH.');
      }
    }

    const fields: Record<string, unknown> = {};
    if ('name' in body) {
      const name = asString(body.name);
      if (!name) throw new PmHttpError(400, 'invalid_input', 'Project name is required.');
      fields.Title = name;
    }
    if ('status' in body) fields.ProjectStatus = projectStatusToSharePoint(body.status as ProjectStatus);
    if ('health' in body) fields.ProjectHealth = healthToSharePoint(body.health as ProjectHealth);
    if ('priority' in body) fields.Priority = priorityToSharePoint(body.priority as TaskPriority);
    if ('objective' in body) fields.Objectives = asString(body.objective) || '';
    if ('description' in body && !('objective' in body)) fields.Objectives = asString(body.description) || '';
    if ('nextAction' in body) fields.NextAction = asString(body.nextAction) || '';
    if ('targetCompletionDate' in body) fields.TargetEndDate = asString(body.targetCompletionDate) || null;
    if (Object.keys(fields).length === 0) return existing;

    const patched = await this.graph.patchItemFields(this.settings.projectsListId, id, fields, etag);
    const mapped = this.mapProject(patched);
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Patched project could not be mapped.');
    if (!canAccessClassification(principal, mapped.classification)) {
      throw new PmHttpError(404, 'not_found', 'not_found');
    }
    return mapped;
  }

  archiveProject(): never {
    throw pmNotImplemented(
      'SharePoint HVCG_Projects has no Archived status or archive field. Archive is not implemented.',
    );
  }

  private async findByIdempotency(listId: string, key: string): Promise<GraphListItem | null> {
    const items = await this.listAll(listId, fieldsEq('HVCG_IdempotencyKey', key));
    if (items.length > 1) {
      throw new PmHttpError(409, 'PM_IDEMPOTENCY_CONFLICT', 'Idempotency key already used.');
    }
    return items[0] || null;
  }

  async listAuthorizedTasks(
    principal: AtlasPrincipal,
    projectId?: string,
  ): Promise<SharePointTask[]> {
    if (projectId) {
      const project = await this.authorizeProject(principal, projectId);
      if (project === 'not_found') return [];
      const items = await this.listAll(this.settings.tasksListId, `fields/ProjectIdLookupId eq ${Number(projectId)}`);
      return this.filterTasksForProject(items, project);
    }
    const projects = await this.listAuthorizedProjects(principal);
    const items = await this.listAll(this.settings.tasksListId);
    const out: SharePointTask[] = [];
    for (const project of projects) {
      out.push(...this.filterTasksForProject(items, project));
    }
    return out;
  }

  private filterTasksForProject(items: GraphListItem[], project: SharePointProject): SharePointTask[] {
    const out: SharePointTask[] = [];
    for (const item of items) {
      const task = this.mapTask(item);
      if (!task || task.projectId !== project.id) continue;
      const taskCode = (task.clientCode || '').trim();
      const projectCode = (project.clientCode || '').trim();
      if (project.classification.kind === 'client') {
        if (taskCode && taskCode !== projectCode) {
          throw new PmHttpError(
            409,
            'PM_DATA_INTEGRITY',
            'Task ClientCode conflicts with parent project ClientCode.',
          );
        }
      }
      out.push(task);
    }
    return out;
  }

  async authorizeTask(principal: AtlasPrincipal, id: string): Promise<SharePointTask | 'not_found'> {
    if (!isSharePointItemId(id)) return 'not_found';
    const item = await this.graph.getItem(this.settings.tasksListId, id);
    if (!item) return 'not_found';
    const task = this.mapTask(item);
    if (!task?.projectId) return 'not_found';
    const project = await this.authorizeProject(principal, task.projectId);
    if (project === 'not_found') return 'not_found';
    const taskCode = (task.clientCode || '').trim();
    const projectCode = (project.clientCode || '').trim();
    if (project.classification.kind === 'client' && taskCode && taskCode !== projectCode) {
      throw new PmHttpError(409, 'PM_DATA_INTEGRITY', 'Task ClientCode conflicts with parent project ClientCode.');
    }
    return task;
  }

  async createTask(
    principal: AtlasPrincipal,
    body: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<SharePointTask> {
    const title = asString(body.title);
    const projectId = asString(body.projectId);
    if (!title) throw new PmHttpError(400, 'invalid_input', 'Task title is required.');
    if (!projectId || !isSharePointItemId(projectId)) {
      throw new PmHttpError(400, 'project_required', 'Tasks require a SharePoint project id.');
    }
    const project = await this.authorizeProject(principal, projectId);
    if (project === 'not_found') throw new PmHttpError(404, 'not_found', 'not_found');
    if (project.classification.kind === 'invalid') {
      throw new PmHttpError(409, 'PM_DATA_INTEGRITY', 'Parent project classification cannot be proven.');
    }

    if (idempotencyKey) {
      const existing = await this.findByIdempotency(this.settings.tasksListId, idempotencyKey);
      if (existing) {
        const mapped = this.mapTask(existing);
        if (mapped) {
          const parent = await this.authorizeProject(principal, mapped.projectId || '');
          if (parent !== 'not_found') return mapped;
        }
        throw new PmHttpError(409, 'PM_IDEMPOTENCY_CONFLICT', 'Idempotency key already used.');
      }
    }

    const ownerEmail = await this.ownerEmailForPrincipal(principal);
    const fields: Record<string, unknown> = {
      Title: title,
      Description: asString(body.description) || '',
      ProjectIdLookupId: Number(projectId),
      TaskStatus: taskStatusToSharePoint((body.status as TaskStatus) || 'ready'),
      Priority: priorityToSharePoint((body.priority as TaskPriority) || 'normal'),
      OwnerEmail: ownerEmail,
      DueDate: asString(body.dueDate) || null,
    };
    if (project.classification.kind === 'client') {
      fields.ClientCode = project.classification.clientCode;
      const client = await this.resolveClientByCode(project.classification.clientCode);
      fields.AtlasClientRefLookupId = Number(client.itemId);
    } else {
      fields.ClientCode = '';
    }
    if (idempotencyKey) fields.HVCG_IdempotencyKey = idempotencyKey;

    const created = await this.graph.createItem(this.settings.tasksListId, fields);
    const mapped = this.mapTask(created);
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Created task could not be mapped.');
    return mapped;
  }

  async patchTask(
    principal: AtlasPrincipal,
    id: string,
    body: Record<string, unknown>,
    etag: string | undefined,
  ): Promise<SharePointTask> {
    const existing = await this.authorizeTask(principal, id);
    if (existing === 'not_found') throw new PmHttpError(404, 'not_found', 'not_found');
    if (!etag) throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');
    if ('projectId' in body || 'ProjectId' in body || 'ClientCode' in body || 'clientCode' in body || 'clientId' in body) {
      throw new PmHttpError(400, 'immutable_field', 'ProjectId and ClientCode cannot be changed via PATCH.');
    }
    const fields: Record<string, unknown> = {};
    if ('title' in body) {
      const title = asString(body.title);
      if (!title) throw new PmHttpError(400, 'invalid_input', 'Task title is required.');
      fields.Title = title;
    }
    if ('description' in body) fields.Description = asString(body.description) || '';
    if ('status' in body) fields.TaskStatus = taskStatusToSharePoint(body.status as TaskStatus);
    if ('priority' in body) fields.Priority = priorityToSharePoint(body.priority as TaskPriority);
    if ('dueDate' in body) fields.DueDate = asString(body.dueDate) || null;
    if ('blocker' in body) fields.Blockers = asString(body.blocker) || '';
    if ('nextAction' in body) fields.Notes = asString(body.nextAction) || '';
    if (Object.keys(fields).length === 0) return existing;
    const patched = await this.graph.patchItemFields(this.settings.tasksListId, id, fields, etag);
    const mapped = this.mapTask(patched);
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Patched task could not be mapped.');
    return mapped;
  }

  async listAuthorizedMilestones(principal: AtlasPrincipal, projectId: string): Promise<SharePointMilestone[]> {
    const project = await this.authorizeProject(principal, projectId);
    if (project === 'not_found') return [];
    const items = await this.listAll(
      this.settings.milestonesListId,
      `fields/ProjectIdLookupId eq ${Number(projectId)}`,
    );
    return items
      .map((i) => this.mapMilestone(i))
      .filter((m): m is SharePointMilestone => Boolean(m && m.projectId === projectId));
  }

  async createMilestone(principal: AtlasPrincipal, body: Record<string, unknown>): Promise<SharePointMilestone> {
    const title = asString(body.title);
    const projectId = asString(body.projectId);
    if (!title) throw new PmHttpError(400, 'invalid_input', 'Milestone title is required.');
    if (!projectId || !isSharePointItemId(projectId)) {
      throw new PmHttpError(400, 'project_required', 'Milestones require a SharePoint project id.');
    }
    const project = await this.authorizeProject(principal, projectId);
    if (project === 'not_found') throw new PmHttpError(404, 'not_found', 'not_found');
    const fields: Record<string, unknown> = {
      Title: title,
      ProjectIdLookupId: Number(projectId),
      Status: milestoneStatusToSharePoint((body.status as MilestoneHubStatus) || 'pending'),
      DueDate: asString(body.dueDate) || null,
    };
    if (project.classification.kind === 'client') fields.ClientCode = project.classification.clientCode;
    else fields.ClientCode = '';
    const created = await this.graph.createItem(this.settings.milestonesListId, fields);
    const mapped = this.mapMilestone(created);
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Created milestone could not be mapped.');
    return mapped;
  }

  async myWorkTasks(principal: AtlasPrincipal): Promise<SharePointTask[]> {
    const email = await this.ownerEmailForPrincipal(principal);
    const items = await this.listAll(this.settings.tasksListId, fieldsEq('OwnerEmail', email));
    const out: SharePointTask[] = [];
    for (const item of items) {
      const task = this.mapTask(item);
      if (!task?.projectId) continue;
      const owner = normalizeEmail(asString(item.fields.OwnerEmail));
      if (owner !== email) continue;
      const project = await this.authorizeProject(principal, task.projectId);
      if (project === 'not_found') continue;
      const taskCode = (task.clientCode || '').trim();
      const projectCode = (project.clientCode || '').trim();
      if (project.classification.kind === 'client' && taskCode && taskCode !== projectCode) continue;
      out.push(task);
    }
    return out;
  }
}
