/**
 * SharePoint Graph PM repository — MVP lists only.
 * Authorization is applied by callers after classify; collection methods
 * query only entitled ClientCodes (plus internal for staff).
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import type { UserBasicLookup } from '../../entitlements/userLookup.ts';
import { ownerEmailFromProfile } from '../../entitlements/userLookup.ts';
import { assertMannyOnly } from './manny.ts';
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
import { extractSourceUrl, isFileIndexRow } from './fabric/fileIndex.ts';
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

export type SharePointClient = {
  id: string;
  clientCode: string;
  displayName: string;
  itemId: string;
  source: 'sharepoint';
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

export type WorkspaceCollectionResult = {
  status: 'COMPLETE' | 'PARTIAL_SOURCE_DATA_NOT_FOUND';
  queried: boolean;
  items: Array<Record<string, unknown>>;
  reason?: string;
};

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

  private urlField(v: unknown): string | undefined {
    if (typeof v === 'string' && /^https:\/\//i.test(v.trim())) return v.trim();
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const href = asString((v as { Url?: unknown; url?: unknown }).Url ?? (v as { url?: unknown }).url);
      if (href && /^https:\/\//i.test(href)) return href;
    }
    return undefined;
  }

  private mapClient(item: GraphListItem): SharePointClient | null {
    const clientCode = asString(item.fields.ClientCode);
    if (!clientCode || !isCanonicalClientCode(clientCode) || clientCode === '*') return null;
    return {
      id: clientCode,
      clientCode,
      displayName: asString(item.fields.Title) || clientCode,
      itemId: item.id,
      source: 'sharepoint',
      industry: asString(item.fields.Industry),
      clientStage: asString(item.fields.ClientStage),
      engagementType: asString(item.fields.EngagementTypePrimary),
      overallHealth: asString(item.fields.OverallHealth),
      dba: asString(item.fields.DBA),
      website: this.urlField(item.fields.Website),
      sourceOrg: asString(item.fields.SourceOrg),
      lastMeaningfulContact: isoDate(item.fields.LastMeaningfulContact),
      sharePointLibraryUrl: this.urlField(item.fields.SharePointLibraryUrl),
    };
  }

  private ungranted(listName: string): WorkspaceCollectionResult {
    return {
      status: 'PARTIAL_SOURCE_DATA_NOT_FOUND',
      queried: false,
      items: [],
      reason: `${listName} is not in the Hub Graph Selected allowlist. Section is not working until the list is granted and configured.`,
    };
  }

  private mapWorkspaceItems(items: GraphListItem[], clientCode: string): Array<Record<string, unknown>> {
    const out: Array<Record<string, unknown>> = [];
    for (const item of items) {
      const code = asString(item.fields.ClientCode);
      if (code !== clientCode) continue;
      out.push({
        id: item.id,
        title: asString(item.fields.Title) || item.id,
        clientCode: code,
        date:
          isoDate(item.fields.CommunicationDate) ||
          isoDate(item.fields.MeetingDate) ||
          isoDate(item.fields.StartDate) ||
          isoDate(item.fields.DeliveryDate) ||
          isoDate(item.fields.DecisionDate) ||
          isoDate(item.fields.Modified),
        summary: asString(item.fields.Summary) || asString(item.fields.Scope) || asString(item.fields.Background),
        status:
          asString(item.fields.EngagementStatus) ||
          asString(item.fields.DeliverableStatus) ||
          asString(item.fields.DecisionStatus) ||
          asString(item.fields.RiskStatus),
        webUrl:
          this.urlField(item.fields.OutlookWebLink) ||
          this.urlField(item.fields.FileLink) ||
          this.urlField(item.fields.OutlookEventLink) ||
          extractSourceUrl(asString(item.fields.Summary) || ''),
        sourceItemId: asString(item.fields.SourceMessageId) || asString(item.fields.SourceItemId),
        channel: asString(item.fields.Channel),
      });
    }
    return out;
  }

  async listWorkspaceCollections(
    principal: AtlasPrincipal,
    clientCode: string,
  ): Promise<{
    communications: WorkspaceCollectionResult;
    meetings: WorkspaceCollectionResult;
    engagements: WorkspaceCollectionResult;
    deliverables: WorkspaceCollectionResult;
    decisionsRisks: WorkspaceCollectionResult;
    contacts: WorkspaceCollectionResult;
  }> {
    if (!isCanonicalClientCode(clientCode) || !principal.allowedClientIds.includes(clientCode)) {
      const denied = this.ungranted('entitlement');
      return {
        communications: denied,
        meetings: denied,
        engagements: denied,
        deliverables: denied,
        decisionsRisks: denied,
        contacts: denied,
      };
    }
    const load = async (
      listId: string | undefined,
      listName: string,
    ): Promise<WorkspaceCollectionResult> => {
      if (!listId) return this.ungranted(listName);
      const items = this.mapWorkspaceItems(await this.listAll(listId), clientCode);
      return { status: 'COMPLETE', queried: true, items };
    };
    const [communications, meetings, engagements, deliverables, decisions, risks, contacts] = await Promise.all([
      load(this.settings.communicationsListId, 'HVCG_Communications'),
      load(this.settings.meetingsListId, 'HVCG_Meetings'),
      load(this.settings.engagementsListId, 'HVCG_Engagements'),
      load(this.settings.deliverablesListId, 'HVCG_Deliverables'),
      load(this.settings.decisionsListId, 'HVCG_Decisions'),
      load(this.settings.risksListId, 'HVCG_Risks'),
      load(this.settings.contactsListId, 'HVCG_Contacts'),
    ]);
    const decisionItems = [...decisions.items, ...risks.items];
    const decisionsRisks: WorkspaceCollectionResult =
      decisions.queried || risks.queried
        ? {
            status: 'COMPLETE',
            queried: true,
            items: decisionItems,
            reason:
              !decisions.queried || !risks.queried
                ? [!decisions.queried ? decisions.reason : '', !risks.queried ? risks.reason : '']
                    .filter(Boolean)
                    .join(' ')
                : undefined,
          }
        : this.ungranted('HVCG_Decisions / HVCG_Risks');
    return { communications, meetings, engagements, deliverables, decisionsRisks, contacts };
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

  async listClientHints(): Promise<Array<{ clientCode: string; displayName: string; dba?: string }>> {
    const items = await this.listAll(this.settings.clientsListId);
    const out: Array<{ clientCode: string; displayName: string; dba?: string }> = [];
    const seen = new Set<string>();
    for (const item of items) {
      const mapped = this.mapClient(item);
      if (!mapped || seen.has(mapped.clientCode)) continue;
      seen.add(mapped.clientCode);
      out.push({ clientCode: mapped.clientCode, displayName: mapped.displayName, dba: mapped.dba });
    }
    return out;
  }

  async listAuthorizedClients(principal: AtlasPrincipal): Promise<SharePointClient[]> {
    const codes = new Set(entitledClientCodes(principal));
    const items = await this.listAll(this.settings.clientsListId);
    const seen = new Set<string>();
    const out: SharePointClient[] = [];
    for (const item of items) {
      const mapped = this.mapClient(item);
      if (!mapped || !codes.has(mapped.clientCode) || seen.has(mapped.clientCode)) continue;
      seen.add(mapped.clientCode);
      out.push(mapped);
    }
    return out.sort((a, b) => a.clientCode.localeCompare(b.clientCode));
  }

  async authorizeClient(
    principal: AtlasPrincipal,
    clientCode: string,
  ): Promise<SharePointClient | 'not_found'> {
    if (!isCanonicalClientCode(clientCode) || clientCode === '*') return 'not_found';
    if (!principal.allowedClientIds.includes(clientCode)) return 'not_found';
    try {
      const items = await this.listAll(this.settings.clientsListId, fieldsEq('ClientCode', clientCode));
      const matches = items.map((i) => this.mapClient(i)).filter((c): c is SharePointClient => Boolean(c && c.clientCode === clientCode));
      if (matches.length === 0) return 'not_found';
      if (matches.length > 1) {
        throw new PmHttpError(
          409,
          'PM_CLIENTCODE_AMBIGUOUS',
          'ClientCode resolved to more than one SharePoint client record.',
        );
      }
      return matches[0];
    } catch (err) {
      if (err instanceof PmHttpError && (err.status === 400 || err.code === 'unknown_client_code')) {
        return 'not_found';
      }
      throw err;
    }
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
    const items = await this.listAll(listId);
    const matches = items.filter((item) => {
      if (asString(item.fields.HVCG_IdempotencyKey) === key) return true;
      const summary = asString(item.fields.Summary) || '';
      return Boolean(key) && summary.includes(`Key:${key}`);
    });
    if (matches.length > 1) {
      throw new PmHttpError(409, 'PM_IDEMPOTENCY_CONFLICT', 'Idempotency key already used.');
    }
    return matches[0] || null;
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

  async createVerifiedHistoricalClient(
    principal: AtlasPrincipal,
    body: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<SharePointClient> {
    assertMannyOnly(principal, 'HVCG_Clients create');
    if (body.ownerId || body.OwnerEmail || body.RelationshipOwnerEmail || body.allowedClientIds) {
      throw new PmHttpError(400, 'owner_override_forbidden', 'Caller-provided owner override is not allowed.');
    }
    const clientCode = asString(body.ClientCode) || asString(body.clientCode);
    const title = asString(body.Title) || asString(body.displayName);
    if (!clientCode || !isCanonicalClientCode(clientCode) || clientCode === '*') {
      throw new PmHttpError(400, 'invalid_client_code', 'Canonical ClientCode is required.');
    }
    if (!title) throw new PmHttpError(400, 'invalid_input', 'Client display name is required.');
    const existing = await this.listAll(this.settings.clientsListId, fieldsEq('ClientCode', clientCode));
    const matches = existing.filter((i) => asString(i.fields.ClientCode) === clientCode);
    if (matches.length > 0) {
      const mapped = this.mapClient(matches[0]);
      if (mapped) return mapped;
    }
    if (idempotencyKey) {
      const prior = await this.findByIdempotency(this.settings.clientsListId, idempotencyKey);
      if (prior) {
        const mapped = this.mapClient(prior);
        if (mapped) return mapped;
      }
    }
    const fields: Record<string, unknown> = {
      Title: title,
      ClientCode: clientCode,
      IsActive: true,
      InternalNotes: `Verified historical client. Provenance=${asString(body.provenanceSource) || 'manual'}. SourceOrg=${asString(body.sourceOrg) || 'HVCG'}. Created by Manny-only path.`,
    };
    if (asString(body.industry)) fields.Industry = asString(body.industry);
    if (asString(body.dba)) fields.DBA = asString(body.dba);
    if (asString(body.clientStage)) fields.ClientStage = asString(body.clientStage);
    if (idempotencyKey) fields.HVCG_IdempotencyKey = idempotencyKey;
    const created = await this.graph.createItem(this.settings.clientsListId, fields);
    const mapped = this.mapClient(created);
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Created client could not be mapped.');
    return mapped;
  }

  async patchVerifiedClient(
    principal: AtlasPrincipal,
    clientCode: string,
    body: Record<string, unknown>,
    etag: string | undefined,
  ): Promise<SharePointClient> {
    assertMannyOnly(principal, 'HVCG_Clients update');
    if (!etag) throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');
    if (body.ownerId || body.allowedClientIds || body.ClientCode || body.clientCode) {
      throw new PmHttpError(400, 'immutable_field', 'ClientCode and owner override cannot be changed via PATCH.');
    }
    const current = await this.authorizeClient(principal, clientCode);
    if (current === 'not_found') throw new PmHttpError(404, 'not_found', 'not_found');
    const fields: Record<string, unknown> = {};
    if ('displayName' in body || 'Title' in body) {
      const title = asString(body.displayName) || asString(body.Title);
      if (!title) throw new PmHttpError(400, 'invalid_input', 'Client display name is required.');
      fields.Title = title;
    }
    if ('industry' in body) fields.Industry = asString(body.industry) || '';
    if ('dba' in body) fields.DBA = asString(body.dba) || '';
    if ('clientStage' in body) fields.ClientStage = asString(body.clientStage) || '';
    if ('website' in body) fields.Website = asString(body.website) || '';
    if (Object.keys(fields).length === 0) return current;
    const patched = await this.graph.patchItemFields(this.settings.clientsListId, current.itemId, fields, etag);
    const mapped = this.mapClient(patched);
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Patched client could not be mapped.');
    return mapped;
  }

  async upsertVendor(fields: {
    title: string;
    category?: string;
    email?: string;
    notes?: string;
    status?: string;
    idempotencyKey: string;
  }): Promise<{ id: string; title: string } | null> {
    if (!this.settings.vendorsListId) return null;
    const prior = await this.findByIdempotency(this.settings.vendorsListId, fields.idempotencyKey);
    if (prior) return { id: prior.id, title: asString(prior.fields.Title) || fields.title };
    const payload: Record<string, unknown> = {
      Title: fields.title,
      VendorCategory: fields.category || 'Professional Services',
      Email: fields.email || '',
      Status: fields.status || 'Active',
      Notes: fields.notes || '',
      HVCG_IdempotencyKey: fields.idempotencyKey,
    };
    try {
      const created = await this.graph.createItem(this.settings.vendorsListId, payload);
      return { id: created.id, title: asString(created.fields.Title) || fields.title };
    } catch {
      delete payload.HVCG_IdempotencyKey;
      const created = await this.graph.createItem(this.settings.vendorsListId, payload);
      return { id: created.id, title: asString(created.fields.Title) || fields.title };
    }
  }

  async upsertCommunicationIndex(row: {
    title: string;
    summary?: string;
    clientCode?: string;
    date?: string;
    channel?: string;
    direction?: string;
    webUrl?: string;
    sourceMessageId?: string;
    conversationId?: string;
    classification?: string;
    provenanceSource?: string;
    sourceOrg?: string;
    idempotencyKey: string;
  }): Promise<void> {
    if (!this.settings.communicationsListId) return;
    const prior = await this.findByIdempotency(this.settings.communicationsListId, row.idempotencyKey);
    if (prior) return;
    const summary = (row.summary || '').includes(`Key:${row.idempotencyKey}`)
      ? row.summary || ''
      : `${row.summary || ''} Key:${row.idempotencyKey}`.trim();
    const fields: Record<string, unknown> = {
      Title: row.title.slice(0, 255),
      Summary: summary.slice(0, 2000),
      Channel: row.channel || 'Email',
      Direction: row.direction || 'Inbound',
      HVCG_IdempotencyKey: row.idempotencyKey,
    };
    if (row.clientCode && isCanonicalClientCode(row.clientCode)) fields.ClientCode = row.clientCode;
    if (row.date) fields.CommunicationDate = row.date;
    if (row.sourceMessageId) fields.SourceMessageId = row.sourceMessageId;
    if (row.conversationId) fields.ConversationId = row.conversationId;
    if (row.webUrl) fields.OutlookWebLink = row.webUrl;
    if (row.classification) fields.Classification = row.classification;
    if (row.provenanceSource) fields.ProvenanceSource = row.provenanceSource;
    if (row.sourceOrg) fields.SourceOrg = row.sourceOrg;
    try {
      await this.graph.createItem(this.settings.communicationsListId, fields);
    } catch {
      delete fields.SourceMessageId;
      delete fields.ConversationId;
      delete fields.OutlookWebLink;
      delete fields.Classification;
      delete fields.ProvenanceSource;
      delete fields.SourceOrg;
      await this.graph.createItem(this.settings.communicationsListId, fields);
    }
  }

  async upsertMeetingIndex(row: {
    title: string;
    summary?: string;
    clientCode?: string;
    date?: string;
    webUrl?: string;
    sourceEventId?: string;
    classification?: string;
    provenanceSource?: string;
    idempotencyKey: string;
  }): Promise<void> {
    if (!this.settings.meetingsListId) return;
    const prior = await this.findByIdempotency(this.settings.meetingsListId, row.idempotencyKey);
    if (prior) return;
    const fields: Record<string, unknown> = {
      Title: row.title.slice(0, 255),
      Summary: (row.summary || '').slice(0, 2000),
      HVCG_IdempotencyKey: row.idempotencyKey,
    };
    if (row.clientCode && isCanonicalClientCode(row.clientCode)) fields.ClientCode = row.clientCode;
    if (row.date) fields.MeetingDate = row.date;
    if (row.webUrl) fields.OutlookEventLink = row.webUrl;
    try {
      await this.graph.createItem(this.settings.meetingsListId, fields);
    } catch {
      delete fields.HVCG_IdempotencyKey;
      await this.graph.createItem(this.settings.meetingsListId, fields);
    }
  }

  async upsertContactIndex(row: {
    title: string;
    email?: string;
    clientCode: string;
    jobTitle?: string;
    sourceContactId?: string;
    provenanceSource?: string;
    idempotencyKey: string;
  }): Promise<void> {
    if (!this.settings.contactsListId) return;
    if (!isCanonicalClientCode(row.clientCode)) return;
    const prior = await this.findByIdempotency(this.settings.contactsListId, row.idempotencyKey);
    if (prior) return;
    const existing = await this.listAll(this.settings.contactsListId);
    if (
      row.email &&
      existing.some(
        (i) =>
          asString(i.fields.Email)?.toLowerCase() === row.email!.toLowerCase() &&
          asString(i.fields.ClientCode) === row.clientCode,
      )
    ) {
      return;
    }
    await this.graph.createItem(this.settings.contactsListId, {
      Title: row.title.slice(0, 255),
      Email: row.email || '',
      ClientCode: row.clientCode,
      JobTitle: row.jobTitle || '',
      IsActive: true,
      HVCG_IdempotencyKey: row.idempotencyKey,
    });
  }

  async listVendors(): Promise<Array<{ id: string; title: string; category?: string; notes?: string }>> {
    if (!this.settings.vendorsListId) return [];
    const items = await this.listAll(this.settings.vendorsListId);
    return items
      .map((i) => ({
        id: i.id,
        title: asString(i.fields.Title) || i.id,
        category: asString(i.fields.VendorCategory),
        notes: asString(i.fields.Notes),
      }))
      .filter((v) => v.title);
  }

  async listOpportunities(): Promise<
    Array<{ id: string; title: string; clientCode?: string; notes?: string }>
  > {
    if (!this.settings.opportunitiesListId) return [];
    const items = await this.listAll(this.settings.opportunitiesListId);
    return items
      .map((i) => ({
        id: i.id,
        title: asString(i.fields.Title) || i.id,
        clientCode: asString(i.fields.ClientCode) || undefined,
        notes: asString(i.fields.Notes) || asString(i.fields.Summary),
      }))
      .filter((v) => v.title);
  }

  async listIndexedFiles(): Promise<
    Array<{ id: string; title: string; clientCode?: string; webUrl?: string; summary?: string }>
  > {
    if (!this.settings.communicationsListId) return [];
    const items = await this.listAll(this.settings.communicationsListId);
    const out: Array<{
      id: string;
      title: string;
      clientCode?: string;
      webUrl?: string;
      summary?: string;
    }> = [];
    for (const item of items) {
      const mapped = {
        id: item.id,
        title: asString(item.fields.Title) || item.id,
        clientCode: asString(item.fields.ClientCode) || undefined,
        webUrl:
          this.urlField(item.fields.OutlookWebLink) || extractSourceUrl(asString(item.fields.Summary) || ''),
        summary: asString(item.fields.Summary),
        sourceItemId: asString(item.fields.SourceMessageId),
        channel: asString(item.fields.Channel),
      };
      if (!isFileIndexRow(mapped)) continue;
      out.push(mapped);
    }
    return out;
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
