/**
 * SharePoint Graph PM repository — MVP lists only.
 * Authorization is applied by callers after classify; collection methods
 * query only entitled ClientCodes (plus internal for staff).
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import type { UserBasicLookup } from '../../entitlements/userLookup.ts';
import { ownerEmailFromProfile } from '../../entitlements/userLookup.ts';
import { assertMannyOnly, isMannyPrincipal } from './manny.ts';
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
  activationIdempotencyKey,
  classifyClientActivation,
  emptyProvisioning,
  parseActivationNotes,
  writeActivationNotes,
  type ClientActivationAction,
  type ClientActivationRecord,
  type ClientActivationStatus,
} from './clientActivation.ts';
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
import {
  CONVERTIBLE_LEAD_STATUSES,
  clientFromLeadIdempotencyKey,
  companyTitleFromOpportunityTitle,
  normalizeCompanyTitle,
  opportunityHref,
  opportunityIdempotencyKey,
  opportunityTypeFromServiceInterest,
  proposeClientCode,
} from './leadConversion.ts';
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
  etag?: string;
  activationStatus?: ClientActivationStatus;
  activation?: ClientActivationRecord;
};

const LEAD_STATUSES = new Set(['New', 'Contacted', 'Qualified', 'Disqualified', 'Converted']);
const LEAD_PATCHABLE_STATUSES = new Set(['New', 'Contacted', 'Qualified', 'Disqualified']);
const LEAD_FOLLOW_STATUSES = new Set(['New', 'Contacted', 'Qualified']);

export type SharePointLead = {
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
  convertedOpportunityId?: string;
  referralPartnerId?: string;
  isReferral?: boolean;
  lastModified?: string;
  created?: string;
};

export type SharePointOpportunity = {
  id: string;
  etag: string;
  title: string;
  stage: string;
  clientCode?: string;
  clientId?: string;
  clientStage?: string;
  leadId?: string;
  ownerEmail?: string;
  opportunityType?: string;
  winLossStatus?: string;
  proposalAmount?: number;
  expectedCloseDate?: string;
  nextAction?: string;
  nextActionDate?: string;
  requiresExecutiveAttention?: boolean;
  lostReason?: string;
  wonDate?: string;
  lostDate?: string;
  capitalHandoffStatus?: string;
  lastModified?: string;
  notes?: string;
  idempotencyKey?: string;
  attention: OpportunityAttention;
};

export type SharePointContact = {
  id: string;
  title: string;
  email?: string;
  phone?: string;
  clientCode?: string;
  clientId?: string;
};

export type LeadConversionResult = {
  lead: SharePointLead;
  company: {
    id: string;
    itemId: string;
    clientCode: string;
    displayName: string;
    clientStage?: string;
    reused: boolean;
    entitlementProvisioned: false;
  };
  contact: { id: string; title: string; email?: string; reused: boolean };
  opportunity: SharePointOpportunity;
  href: string;
  replay: boolean;
  previousLeadStatus: string;
  created: { company: boolean; contact: boolean; opportunity: boolean };
  entitlementProvisioned: false;
};

export const OPPORTUNITY_STAGES = ['Discovery', 'Assessment', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const;
export const OPPORTUNITY_WIN_LOSS_STATUSES = ['Open', 'Won', 'Lost', 'Abandoned'] as const;
export const OPPORTUNITY_LOST_REASONS = ['Price', 'Timing', 'Competitor', 'Fit', 'Capacity', 'Other'] as const;

export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number];
export type OpportunityWinLossStatus = (typeof OPPORTUNITY_WIN_LOSS_STATUSES)[number];
export type OpportunityAttention = {
  state:
    | 'OPEN'
    | 'NEEDS_ACTION'
    | 'OVERDUE'
    | 'NO_NEXT_ACTION'
    | 'NEEDS_MANNY'
    | 'WON'
    | 'LOST'
    | 'ACTIVATION_REQUIRED';
  label: string;
  severity: 'neutral' | 'info' | 'warning' | 'danger' | 'success';
  reason: string;
};

const OPPORTUNITY_STAGE_SET = new Set<string>(OPPORTUNITY_STAGES);
const OPPORTUNITY_WIN_LOSS_SET = new Set<string>(OPPORTUNITY_WIN_LOSS_STATUSES);
const OPPORTUNITY_LOST_REASON_SET = new Set<string>(OPPORTUNITY_LOST_REASONS);

function isOpportunityStage(value: string | undefined): value is OpportunityStage {
  return Boolean(value && OPPORTUNITY_STAGE_SET.has(value));
}

function isOpportunityWinLossStatus(value: string | undefined): value is OpportunityWinLossStatus {
  return Boolean(value && OPPORTUNITY_WIN_LOSS_SET.has(value));
}

function nullDateOrIso(v: unknown): string | null {
  if (v === null || v === '') return null;
  const s = asString(v);
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new PmHttpError(400, 'invalid_input', 'Date fields must be valid ISO dates.');
  }
  return d.toISOString();
}

export function classifyOpportunityAttention(
  opportunity: Pick<
    SharePointOpportunity,
    'stage' | 'winLossStatus' | 'nextAction' | 'nextActionDate' | 'requiresExecutiveAttention' | 'clientStage'
  >,
  today = new Date().toISOString().slice(0, 10),
): OpportunityAttention {
  const status = opportunity.winLossStatus || (opportunity.stage === 'Won' || opportunity.stage === 'Lost' ? opportunity.stage : 'Open');
  if (status === 'Won' || opportunity.stage === 'Won') {
    if (opportunity.clientStage && opportunity.clientStage !== 'Active Client') {
      return {
        state: 'ACTIVATION_REQUIRED',
        label: 'Activation Required',
        severity: 'warning',
        reason: 'Closed won. Client activation is required before Active Client access.',
      };
    }
    return {
      state: 'WON',
      label: 'Won',
      severity: 'success',
      reason: 'Closed won. Client activation remains a separate approved workflow.',
    };
  }
  if (status === 'Lost' || status === 'Abandoned' || opportunity.stage === 'Lost') {
    return { state: 'LOST', label: status === 'Abandoned' ? 'Abandoned' : 'Lost', severity: 'neutral', reason: 'Closed out of active pipeline.' };
  }
  if (opportunity.requiresExecutiveAttention) {
    return { state: 'NEEDS_MANNY', label: 'Needs Manny', severity: 'warning', reason: 'Executive attention flag is set.' };
  }
  const due = (opportunity.nextActionDate || '').slice(0, 10);
  if (due && due < today) return { state: 'OVERDUE', label: 'Overdue', severity: 'danger', reason: `Next action was due ${due}.` };
  if (!opportunity.nextAction && !due) {
    return { state: 'NO_NEXT_ACTION', label: 'No Next Action', severity: 'warning', reason: 'Open opportunity has no next action or due date.' };
  }
  if (due && due <= today) return { state: 'NEEDS_ACTION', label: 'Needs Action', severity: 'warning', reason: `Next action due ${due}.` };
  return { state: 'OPEN', label: 'Open', severity: 'info', reason: 'Open pipeline work with a future or recorded next step.' };
}

function nextActionFromNotes(notes?: string): string | undefined {
  if (!notes) return undefined;
  try {
    const parsed = JSON.parse(notes) as { nextAction?: unknown };
    if (parsed && typeof parsed === 'object' && typeof parsed.nextAction === 'string') {
      const next = parsed.nextAction.trim();
      return next ? next.slice(0, 255) : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function leadNeedsFollowUp(lead: SharePointLead, today = new Date().toISOString().slice(0, 10)): boolean {
  if (!LEAD_FOLLOW_STATUSES.has(lead.status)) return false;
  const due = (lead.nextFollowUpDate || '').slice(0, 10);
  if (!due) return true;
  return due <= today;
}

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
    const activation = parseActivationNotes(asString(item.fields.InternalNotes));
    const clientStage = asString(item.fields.ClientStage);
    return {
      id: clientCode,
      clientCode,
      displayName: asString(item.fields.Title) || clientCode,
      itemId: item.id,
      source: 'sharepoint',
      industry: asString(item.fields.Industry),
      clientStage,
      engagementType: asString(item.fields.EngagementTypePrimary),
      overallHealth: asString(item.fields.OverallHealth),
      dba: asString(item.fields.DBA),
      website: this.urlField(item.fields.Website),
      sourceOrg: asString(item.fields.SourceOrg),
      lastMeaningfulContact: isoDate(item.fields.LastMeaningfulContact),
      sharePointLibraryUrl: this.urlField(item.fields.SharePointLibraryUrl),
      etag: item.etag,
      activation,
      activationStatus: classifyClientActivation({
        clientStage,
        record: activation,
      }),
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

  async listWorkspaceCollectionsForSearch(
    principal: AtlasPrincipal,
    clientCodes: string[],
  ): Promise<
    Map<
      string,
      Awaited<ReturnType<SharePointPmService['listWorkspaceCollections']>>
    >
  > {
    const entitled = new Set(
      clientCodes.filter((code) => isCanonicalClientCode(code) && principal.allowedClientIds.includes(code)),
    );
    const load = async (listId: string | undefined, listName: string) => {
      if (!listId) return { listName, items: [] as GraphListItem[], queried: false as const };
      return { listName, items: await this.listAll(listId), queried: true as const };
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
    const out = new Map<string, Awaited<ReturnType<SharePointPmService['listWorkspaceCollections']>>>();
    for (const code of entitled) {
      const pack = (row: { items: GraphListItem[]; queried: boolean; listName: string }): WorkspaceCollectionResult => {
        if (!row.queried) return this.ungranted(row.listName);
        return { status: 'COMPLETE', queried: true, items: this.mapWorkspaceItems(row.items, code) };
      };
      const decisionItems = [...pack(decisions).items, ...pack(risks).items];
      const decisionsRisks: WorkspaceCollectionResult =
        decisions.queried || risks.queried
          ? { status: 'COMPLETE', queried: true, items: decisionItems }
          : this.ungranted('HVCG_Decisions / HVCG_Risks');
      out.set(code, {
        communications: pack(communications),
        meetings: pack(meetings),
        engagements: pack(engagements),
        deliverables: pack(deliverables),
        decisionsRisks,
        contacts: pack(contacts),
      });
    }
    return out;
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
    const requestedStage = asString(body.clientStage) || asString(body.ClientStage);
    if (requestedStage === 'Active Client' && !asString(body.provenanceSource)) {
      throw new PmHttpError(
        400,
        'activation_required',
        'Active Client requires the governed activation workflow unless importing a verified historical client with provenanceSource.',
      );
    }
    if (requestedStage) fields.ClientStage = requestedStage;
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
    if ('clientStage' in body || 'ClientStage' in body) {
      throw new PmHttpError(
        400,
        'immutable_field',
        'ClientStage changes require the governed client activation workflow.',
      );
    }
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
    const rows = await this.listOpportunityRecords();
    return rows.map((o) => ({
      id: o.id,
      title: o.title,
      clientCode: o.clientCode,
      notes: o.notes,
    }));
  }

  async listOpportunityRecords(): Promise<SharePointOpportunity[]> {
    if (!this.settings.opportunitiesListId) return [];
    const items = await this.listAll(this.settings.opportunitiesListId);
    const clients = await this.clientIndex();
    return items
      .map((item) => this.mapOpportunity(item, clients))
      .filter((row): row is SharePointOpportunity => Boolean(row));
  }

  private async clientIndex(): Promise<Map<string, SharePointClient>> {
    const items = await this.listAll(this.settings.clientsListId);
    const byId = new Map<string, SharePointClient>();
    for (const item of items) {
      const mapped = this.mapClient(item);
      if (!mapped) continue;
      byId.set(mapped.itemId, mapped);
      byId.set(mapped.clientCode, mapped);
      const titleKey = `title:${normalizeCompanyTitle(mapped.displayName)}`;
      const existingTitle = byId.get(titleKey);
      if (existingTitle && existingTitle.clientCode !== mapped.clientCode) {
        byId.delete(titleKey);
      } else if (!existingTitle) {
        byId.set(titleKey, mapped);
      }
    }
    return byId;
  }

  private mapOpportunity(
    item: GraphListItem,
    clients: Map<string, SharePointClient>,
  ): SharePointOpportunity | null {
    const title = asString(item.fields.Title);
    if (!item.id || !title) return null;
    const clientId = lookupId(item.fields, 'ClientId');
    const fromField = asString(item.fields.ClientCode);
    const linked =
      (clientId && clients.get(clientId)) ||
      (fromField && clients.get(fromField)) ||
      clients.get(`title:${normalizeCompanyTitle(companyTitleFromOpportunityTitle(title))}`) ||
      undefined;
    const clientCode =
      (fromField && isCanonicalClientCode(fromField) && fromField !== '*' ? fromField : undefined) ||
      linked?.clientCode;
    const amount = item.fields.ProposalAmount;
    const opportunity: Omit<SharePointOpportunity, 'attention'> = {
      id: item.id,
      etag: item.etag,
      title,
      stage: asString(item.fields.Stage) || 'Discovery',
      clientCode,
      clientId: clientId || linked?.itemId,
      clientStage: linked?.clientStage,
      leadId: lookupId(item.fields, 'LeadId'),
      ownerEmail: asString(item.fields.OwnerEmail) || asString(item.fields.SalesOwnerEmail),
      opportunityType: asString(item.fields.OpportunityType),
      winLossStatus: asString(item.fields.WinLossStatus),
      proposalAmount: typeof amount === 'number' && Number.isFinite(amount) ? amount : undefined,
      expectedCloseDate: isoDate(item.fields.ExpectedCloseDate),
      nextAction: asString(item.fields.NextActionNotes),
      nextActionDate: isoDate(item.fields.NextActionDate),
      requiresExecutiveAttention: asBool(item.fields.RequiresExecutiveAttention),
      lostReason: asString(item.fields.LostReason),
      wonDate: isoDate(item.fields.WonDate),
      lostDate: isoDate(item.fields.LostDate),
      capitalHandoffStatus: asString(item.fields.CapitalHandoffStatus),
      lastModified: isoDate(item.fields.Modified),
      notes: asString(item.fields.Notes) || asString(item.fields.Summary),
      idempotencyKey: asString(item.fields.HVCG_IdempotencyKey),
    };
    return { ...opportunity, attention: classifyOpportunityAttention(opportunity) };
  }

  private canSeeOpportunity(principal: AtlasPrincipal, opportunity: SharePointOpportunity): boolean {
    if (isInternalStaff(principal)) return true;
    const code = (opportunity.clientCode || '').trim();
    if (!code || !isCanonicalClientCode(code) || code === '*') return false;
    return entitledClientCodes(principal).includes(code);
  }

  async authorizeOpportunity(
    principal: AtlasPrincipal,
    id: string,
  ): Promise<SharePointOpportunity | 'not_found'> {
    if (!this.settings.opportunitiesListId || !isSharePointItemId(id)) return 'not_found';
    const item = await this.graph.getItem(this.settings.opportunitiesListId, id);
    if (!item) return 'not_found';
    const mapped = this.mapOpportunity(item, await this.clientIndex());
    if (!mapped || !this.canSeeOpportunity(principal, mapped)) return 'not_found';
    return mapped;
  }

  async patchOpportunity(
    principal: AtlasPrincipal,
    id: string,
    body: Record<string, unknown>,
    etag: string | undefined,
  ): Promise<SharePointOpportunity> {
    const existing = await this.authorizeOpportunity(principal, id);
    if (existing === 'not_found') throw new PmHttpError(404, 'not_found', 'not_found');
    if (!isInternalStaff(principal)) {
      throw new PmHttpError(403, 'forbidden', 'Opportunity updates are restricted to HVCG internal staff.');
    }
    if (!etag) throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');
    if (!this.settings.opportunitiesListId) {
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'HVCG_Opportunities is not configured.');
    }
    const immutable = [
      'clientCode',
      'ClientCode',
      'clientId',
      'ClientId',
      'leadId',
      'LeadId',
      'convertedClientId',
      'ConvertedClientId',
      'ClientStage',
      'clientStage',
      'HVCG_IdempotencyKey',
      'idempotencyKey',
      'CapitalOpportunityId',
      'capitalOpportunityId',
      'CapitalHandoffStatus',
      'capitalHandoffStatus',
    ];
    if (immutable.some((field) => field in body)) {
      throw new PmHttpError(
        400,
        'immutable_field',
        'Opportunity linkage, activation, capital handoff, and idempotency fields cannot be changed via PATCH.',
      );
    }

    const fields: Record<string, unknown> = {};
    const requestedStage = asString(body.stage) || asString(body.Stage);
    const requestedStatus = asString(body.winLossStatus) || asString(body.WinLossStatus);
    if (requestedStage) {
      if (!isOpportunityStage(requestedStage)) {
        throw new PmHttpError(400, 'invalid_input', 'Stage must be Discovery, Assessment, Proposal, Negotiation, Won, or Lost.');
      }
      fields.Stage = requestedStage;
      if (requestedStage === 'Won') {
        fields.WinLossStatus = 'Won';
        fields.WonDate = existing.wonDate || new Date().toISOString();
      }
      if (requestedStage === 'Lost') {
        fields.WinLossStatus = 'Lost';
        fields.LostDate = existing.lostDate || new Date().toISOString();
      }
    }
    if (requestedStatus) {
      if (!isOpportunityWinLossStatus(requestedStatus)) {
        throw new PmHttpError(400, 'invalid_input', 'WinLossStatus must be Open, Won, Lost, or Abandoned.');
      }
      fields.WinLossStatus = requestedStatus;
      if (requestedStatus === 'Won') {
        fields.Stage = 'Won';
        fields.WonDate = existing.wonDate || new Date().toISOString();
      }
      if (requestedStatus === 'Lost' || requestedStatus === 'Abandoned') {
        fields.Stage = 'Lost';
        fields.LostDate = existing.lostDate || new Date().toISOString();
      }
    }
    const lostReason = asString(body.lostReason) || asString(body.LostReason);
    if (lostReason) {
      if (!OPPORTUNITY_LOST_REASON_SET.has(lostReason)) {
        throw new PmHttpError(400, 'invalid_input', 'LostReason must be Price, Timing, Competitor, Fit, Capacity, or Other.');
      }
      fields.LostReason = lostReason;
    }
    if ('ownerEmail' in body || 'OwnerEmail' in body || 'salesOwnerEmail' in body || 'SalesOwnerEmail' in body) {
      const ownerEmail =
        asString(body.ownerEmail) ||
        asString(body.OwnerEmail) ||
        asString(body.salesOwnerEmail) ||
        asString(body.SalesOwnerEmail) ||
        '';
      fields.OwnerEmail = ownerEmail;
      fields.SalesOwnerEmail = ownerEmail;
    }
    if ('nextAction' in body || 'nextActionNotes' in body || 'NextActionNotes' in body) {
      fields.NextActionNotes =
        (asString(body.nextAction) || asString(body.nextActionNotes) || asString(body.NextActionNotes) || '').slice(0, 2000);
    }
    if ('nextActionDate' in body || 'NextActionDate' in body) {
      fields.NextActionDate = nullDateOrIso(body.nextActionDate ?? body.NextActionDate);
    }
    if ('expectedCloseDate' in body || 'ExpectedCloseDate' in body) {
      fields.ExpectedCloseDate = nullDateOrIso(body.expectedCloseDate ?? body.ExpectedCloseDate);
    }
    if ('requiresExecutiveAttention' in body || 'RequiresExecutiveAttention' in body) {
      fields.RequiresExecutiveAttention = body.requiresExecutiveAttention === true || body.RequiresExecutiveAttention === true;
    }
    if ('notes' in body || 'Notes' in body) {
      fields.Notes = (asString(body.notes) || asString(body.Notes) || '').slice(0, 2000);
    }
    if (Object.keys(fields).length === 0) return existing;
    const patched = await this.graph.patchItemFields(this.settings.opportunitiesListId, id, fields, etag);
    const mapped = this.mapOpportunity(patched, await this.clientIndex());
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Patched opportunity could not be mapped.');
    return mapped;
  }

  private mapLead(item: GraphListItem): SharePointLead | null {
    const title = asString(item.fields.Title);
    if (!item.id || !title) return null;
    const status = asString(item.fields.LeadStatus) || 'New';
    if (!LEAD_STATUSES.has(status)) return null;
    const notes = asString(item.fields.Notes);
    const convertedClientId = lookupId(item.fields, 'ConvertedClientId');
    const clientCode = asString(item.fields.ClientCode);
    const canonical = clientCode && isCanonicalClientCode(clientCode) ? clientCode : undefined;
    const score = item.fields.LeadScore;
    const estimated = item.fields.EstimatedValue;
    const pipeline = item.fields.PipelineValue;
    return {
      id: item.id,
      etag: item.etag,
      title,
      contactName: asString(item.fields.ContactName),
      email: asString(item.fields.Email),
      phone: asString(item.fields.Phone),
      source: asString(item.fields.Source),
      leadSourceDetail: asString(item.fields.LeadSourceDetail),
      status,
      serviceInterest: asString(item.fields.ServiceInterest),
      ownerEmail: asString(item.fields.OwnerEmail),
      notes,
      nextAction: nextActionFromNotes(notes),
      nextFollowUpDate: isoDate(item.fields.NextFollowUpDate),
      discoveryCallDate: isoDate(item.fields.DiscoveryCallDate),
      leadScore: typeof score === 'number' && Number.isFinite(score) ? score : undefined,
      estimatedValue: typeof estimated === 'number' && Number.isFinite(estimated) ? estimated : undefined,
      pipelineValue: typeof pipeline === 'number' && Number.isFinite(pipeline) ? pipeline : undefined,
      clientCode: canonical,
      convertedClientId,
      convertedOpportunityId: lookupId(item.fields, 'ConvertedOpportunityId'),
      referralPartnerId: lookupId(item.fields, 'ReferralPartnerId'),
      isReferral: asBool(item.fields.IsReferral),
      lastModified: isoDate(item.fields.Modified),
      created: isoDate(item.fields.Created),
    };
  }

  private canSeeLead(principal: AtlasPrincipal, lead: SharePointLead): boolean {
    const code = (lead.clientCode || '').trim();
    if (!code) return isInternalStaff(principal);
    if (!isCanonicalClientCode(code) || code === '*') return false;
    return entitledClientCodes(principal).includes(code);
  }

  async listLeads(): Promise<
    Array<{
      id: string;
      title: string;
      clientCode?: string;
      notes?: string;
      email?: string;
      company?: string;
      status?: string;
    }>
  > {
    const rows = await this.listLeadRecords();
    return rows.map((lead) => ({
      id: lead.id,
      title: lead.title,
      clientCode: lead.clientCode,
      notes: lead.notes,
      email: lead.email,
      company: lead.title,
      status: lead.status,
    }));
  }

  async listLeadRecords(): Promise<SharePointLead[]> {
    if (!this.settings.leadsListId) return [];
    const items = await this.listAll(this.settings.leadsListId);
    return items.map((item) => this.mapLead(item)).filter((row): row is SharePointLead => Boolean(row));
  }

  async listAuthorizedLeads(principal: AtlasPrincipal): Promise<SharePointLead[]> {
    const rows = await this.listLeadRecords();
    return rows.filter((lead) => this.canSeeLead(principal, lead));
  }

  async listAuthorizedOpportunities(principal: AtlasPrincipal): Promise<SharePointOpportunity[]> {
    const rows = await this.listOpportunityRecords();
    return rows.filter((opportunity) => this.canSeeOpportunity(principal, opportunity));
  }

  async authorizeLead(principal: AtlasPrincipal, id: string): Promise<SharePointLead | 'not_found'> {
    if (!this.settings.leadsListId || !isSharePointItemId(id)) return 'not_found';
    const item = await this.graph.getItem(this.settings.leadsListId, id);
    const lead = item ? this.mapLead(item) : null;
    if (!lead || !this.canSeeLead(principal, lead)) return 'not_found';
    return lead;
  }

  async patchLead(
    principal: AtlasPrincipal,
    id: string,
    body: Record<string, unknown>,
    etag: string | undefined,
  ): Promise<SharePointLead> {
    const existing = await this.authorizeLead(principal, id);
    if (existing === 'not_found') throw new PmHttpError(404, 'not_found', 'not_found');
    if (!isInternalStaff(principal)) {
      throw new PmHttpError(403, 'forbidden', 'Lead updates are restricted to HVCG internal staff.');
    }
    if (!etag) throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');
    if (
      'clientCode' in body ||
      'ClientCode' in body ||
      'convertedClientId' in body ||
      'ConvertedClientId' in body ||
      'HVCG_IdempotencyKey' in body ||
      'idempotencyKey' in body
    ) {
      throw new PmHttpError(400, 'immutable_field', 'Client conversion and idempotency keys cannot be changed via PATCH.');
    }
    if (!this.settings.leadsListId) {
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'HVCG_Leads is not configured.');
    }
    const fields: Record<string, unknown> = {};
    if ('status' in body || 'leadStatus' in body) {
      const status = asString(body.status) || asString(body.leadStatus);
      if (!status || !LEAD_PATCHABLE_STATUSES.has(status)) {
        throw new PmHttpError(
          400,
          'invalid_input',
          'LeadStatus must be New, Contacted, Qualified, or Disqualified. Conversion is a separate workflow.',
        );
      }
      fields.LeadStatus = status;
    }
    if ('ownerEmail' in body) fields.OwnerEmail = asString(body.ownerEmail) || '';
    if ('nextFollowUpDate' in body) fields.NextFollowUpDate = asString(body.nextFollowUpDate) || null;
    if ('discoveryCallDate' in body) fields.DiscoveryCallDate = asString(body.discoveryCallDate) || null;
    if ('notes' in body) fields.Notes = asString(body.notes) || '';
    if (Object.keys(fields).length === 0) return existing;
    const patched = await this.graph.patchItemFields(this.settings.leadsListId, id, fields, etag);
    const mapped = this.mapLead(patched);
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Patched lead could not be mapped.');
    return mapped;
  }

  async convertLead(
    principal: AtlasPrincipal,
    id: string,
    etag: string | undefined,
  ): Promise<LeadConversionResult> {
    const existing = await this.authorizeLead(principal, id);
    if (existing === 'not_found') throw new PmHttpError(404, 'not_found', 'not_found');
    if (!isInternalStaff(principal)) {
      throw new PmHttpError(403, 'forbidden', 'Lead conversion is restricted to HVCG internal staff.');
    }
    if (existing.status === 'Disqualified') {
      throw new PmHttpError(400, 'conversion_not_allowed', 'Disqualified leads cannot be converted.');
    }
    if (existing.status !== 'Converted' && !CONVERTIBLE_LEAD_STATUSES.has(existing.status)) {
      throw new PmHttpError(400, 'conversion_not_allowed', 'LeadStatus cannot be converted.');
    }
    if (!this.settings.leadsListId) {
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'HVCG_Leads is not configured.');
    }
    if (!this.settings.opportunitiesListId) {
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'HVCG_Opportunities is not configured.');
    }
    if (!this.settings.contactsListId) {
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'HVCG_Contacts is not configured.');
    }
    const previousLeadStatus = existing.status;
    const replay = existing.status === 'Converted';
    if (!replay && !etag) {
      throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');
    }

    const company = await this.ensureCompanyFromLead(existing);
    const contact = await this.ensureContactFromLead(existing, company.client);
    const opportunity = await this.ensureOpportunityFromLead(existing, company.client);

    let lead = existing;
    const needsLeadWrite =
      lead.status !== 'Converted' ||
      lead.convertedClientId !== company.client.itemId ||
      lead.convertedOpportunityId !== opportunity.record.id;
    if (needsLeadWrite) {
      const match = etag || lead.etag;
      if (!match) {
        throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');
      }
      const fields: Record<string, unknown> = {
        LeadStatus: 'Converted',
        ConvertedClientIdLookupId: Number(company.client.itemId),
        ConvertedOpportunityIdLookupId: Number(opportunity.record.id),
      };
      const patched = await this.graph.patchItemFields(this.settings.leadsListId, id, fields, match);
      const mapped = this.mapLead(patched);
      if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Converted lead could not be mapped.');
      lead = mapped;
    }

    return {
      lead,
      company: {
        id: company.client.clientCode,
        itemId: company.client.itemId,
        clientCode: company.client.clientCode,
        displayName: company.client.displayName,
        clientStage: company.client.clientStage,
        reused: company.reused,
        entitlementProvisioned: false,
      },
      contact: {
        id: contact.record.id,
        title: contact.record.title,
        email: contact.record.email,
        reused: contact.reused,
      },
      opportunity: opportunity.record,
      href: opportunityHref(opportunity.record.id),
      replay: replay && company.reused && contact.reused && opportunity.reused,
      previousLeadStatus,
      created: {
        company: !company.reused,
        contact: !contact.reused,
        opportunity: !opportunity.reused,
      },
      entitlementProvisioned: false,
    };
  }

  private async ensureCompanyFromLead(
    lead: SharePointLead,
  ): Promise<{ client: SharePointClient; reused: boolean }> {
    const clients = await this.listAll(this.settings.clientsListId);
    const mapped = clients
      .map((item) => this.mapClient(item))
      .filter((row): row is SharePointClient => Boolean(row));
    const byItem = new Map(mapped.map((c) => [c.itemId, c]));
    const byCode = new Map(mapped.map((c) => [c.clientCode, c]));

    if (lead.convertedClientId && byItem.has(lead.convertedClientId)) {
      return { client: byItem.get(lead.convertedClientId)!, reused: true };
    }
    if (lead.clientCode && byCode.has(lead.clientCode)) {
      return { client: byCode.get(lead.clientCode)!, reused: true };
    }

    const wanted = normalizeCompanyTitle(lead.title);
    const titleMatch = mapped.find((c) => normalizeCompanyTitle(c.displayName) === wanted);
    if (titleMatch) {
      return { client: titleMatch, reused: true };
    }

    const prior = await this.findByIdempotency(
      this.settings.clientsListId,
      clientFromLeadIdempotencyKey(lead.id),
    );
    if (prior) {
      const existing = this.mapClient(prior);
      if (existing) return { client: existing, reused: true };
    }

    const clientCode = proposeClientCode(lead.title, mapped.map((c) => c.clientCode));
    const fields: Record<string, unknown> = {
      Title: lead.title.slice(0, 255),
      ClientCode: clientCode,
      ClientStage: 'Prospect',
      IsActive: true,
      HVCG_IdempotencyKey: clientFromLeadIdempotencyKey(lead.id),
    };
    if (lead.serviceInterest) fields.EngagementTypePrimary = lead.serviceInterest;
    if (lead.source) fields.ReferralSource = lead.source.slice(0, 255);
    if (lead.ownerEmail) fields.RelationshipOwnerEmail = lead.ownerEmail;
    const created = await this.graph.createItem(this.settings.clientsListId, fields);
    const client = this.mapClient(created);
    if (!client) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Created client could not be mapped.');
    return { client, reused: false };
  }

  private async ensureContactFromLead(
    lead: SharePointLead,
    client: SharePointClient,
  ): Promise<{ record: SharePointContact; reused: boolean }> {
    const listId = this.settings.contactsListId;
    if (!listId) {
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'HVCG_Contacts is not configured.');
    }
    const items = await this.listAll(listId);
    const email = (lead.email || '').toLowerCase();
    const match = items.find((item) => {
      const itemClientId = lookupId(item.fields, 'ClientId');
      const itemCode = asString(item.fields.ClientCode);
      const sameCompany = itemClientId === client.itemId || itemCode === client.clientCode;
      if (!sameCompany) return false;
      if (email) return asString(item.fields.Email)?.toLowerCase() === email;
      const name = asString(item.fields.Title);
      return Boolean(lead.contactName && name && name.toLowerCase() === lead.contactName.toLowerCase());
    });
    if (match) {
      return {
        record: {
          id: match.id,
          title: asString(match.fields.Title) || lead.contactName || lead.title,
          email: asString(match.fields.Email),
          phone: asString(match.fields.Phone),
          clientCode: client.clientCode,
          clientId: client.itemId,
        },
        reused: true,
      };
    }
    const title = (lead.contactName || lead.email || lead.title).slice(0, 255);
    const fields: Record<string, unknown> = {
      Title: title,
      ClientIdLookupId: Number(client.itemId),
      ClientCode: client.clientCode,
      IsPrimary: true,
      IsActive: true,
    };
    if (lead.email) fields.Email = lead.email;
    if (lead.phone) fields.Phone = lead.phone;
    const created = await this.graph.createItem(listId, fields);
    return {
      record: {
        id: created.id,
        title,
        email: lead.email,
        phone: lead.phone,
        clientCode: client.clientCode,
        clientId: client.itemId,
      },
      reused: false,
    };
  }

  private async ensureOpportunityFromLead(
    lead: SharePointLead,
    client: SharePointClient,
  ): Promise<{ record: SharePointOpportunity; reused: boolean }> {
    const listId = this.settings.opportunitiesListId;
    if (!listId) {
      throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'HVCG_Opportunities is not configured.');
    }
    const clients = await this.clientIndex();
    if (lead.convertedOpportunityId) {
      const item = await this.graph.getItem(listId, lead.convertedOpportunityId);
      const mapped = item ? this.mapOpportunity(item, clients) : null;
      if (mapped) return { record: mapped, reused: true };
    }
    const key = opportunityIdempotencyKey(lead.id);
    const prior = await this.findByIdempotency(listId, key);
    if (prior) {
      const mapped = this.mapOpportunity(prior, clients);
      if (mapped) return { record: mapped, reused: true };
    }
    const fields: Record<string, unknown> = {
      Title: `${lead.title} — Discovery`.slice(0, 255),
      Stage: 'Discovery',
      WinLossStatus: 'Open',
      LeadIdLookupId: Number(lead.id),
      ClientIdLookupId: Number(client.itemId),
      HVCG_IdempotencyKey: key,
      CopilotSummary: `Converted from lead ${lead.title}`.slice(0, 2000),
    };
    const opportunityType = opportunityTypeFromServiceInterest(lead.serviceInterest);
    if (opportunityType) fields.OpportunityType = opportunityType;
    if (lead.ownerEmail) {
      fields.OwnerEmail = lead.ownerEmail;
      fields.SalesOwnerEmail = lead.ownerEmail;
    }
    if (lead.estimatedValue != null) fields.ProposalAmount = lead.estimatedValue;
    if (lead.serviceInterest) fields.ServicePackage = lead.serviceInterest;
    if (lead.source) fields.Notes = `Source=${lead.source}${lead.leadSourceDetail ? `; Detail=${lead.leadSourceDetail}` : ''}`;
    if (lead.referralPartnerId) fields.ReferralPartnerIdLookupId = Number(lead.referralPartnerId);
    const created = await this.graph.createItem(listId, fields);
    const mapped = this.mapOpportunity(created, await this.clientIndex());
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Created opportunity could not be mapped.');
    return { record: mapped, reused: false };
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

  async listActivationQueue(principal: AtlasPrincipal): Promise<
    Array<{
      clientCode: string;
      clientStage?: string;
      opportunityId: string;
      opportunityTitle: string;
      status: ClientActivationStatus;
      href: string;
    }>
  > {
    if (!isInternalStaff(principal)) {
      throw new PmHttpError(403, 'forbidden', 'Client activation queue is restricted to HVCG internal staff.');
    }
    const opportunities = await this.listAuthorizedOpportunities(principal);
    const out: Array<{
      clientCode: string;
      clientStage?: string;
      opportunityId: string;
      opportunityTitle: string;
      status: ClientActivationStatus;
      href: string;
    }> = [];
    const seen = new Set<string>();
    for (const opportunity of opportunities) {
      if (opportunity.winLossStatus !== 'Won' && opportunity.stage !== 'Won') continue;
      const code = opportunity.clientCode;
      if (!code || !isCanonicalClientCode(code)) continue;
      const key = `${code}|${opportunity.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const status = classifyClientActivation({
        clientStage: opportunity.clientStage,
        winLossStatus: opportunity.winLossStatus,
        opportunityStage: opportunity.stage,
      });
      if (status === 'active' || status === 'verified') continue;
      out.push({
        clientCode: code,
        clientStage: opportunity.clientStage,
        opportunityId: opportunity.id,
        opportunityTitle: opportunity.title,
        status,
        href: `/clients/${encodeURIComponent(code)}/activation`,
      });
    }
    return out;
  }

  private async authorizeClientForActivation(
    principal: AtlasPrincipal,
    clientCode: string,
  ): Promise<SharePointClient | 'not_found'> {
    const entitled = await this.authorizeClient(principal, clientCode);
    if (entitled !== 'not_found') return entitled;
    if (!isMannyPrincipal(principal) || !isCanonicalClientCode(clientCode) || clientCode === '*') {
      return 'not_found';
    }
    const items = await this.listAll(this.settings.clientsListId, fieldsEq('ClientCode', clientCode));
    const matches = items
      .map((item) => this.mapClient(item))
      .filter((row): row is SharePointClient => Boolean(row && row.clientCode === clientCode));
    return matches[0] || 'not_found';
  }

  async getClientActivation(
    principal: AtlasPrincipal,
    clientCode: string,
    opportunityId?: string,
  ): Promise<{
    client: SharePointClient;
    opportunity?: SharePointOpportunity;
    activation?: ClientActivationRecord;
    status: ClientActivationStatus;
    entitlementProvisioned: false;
  }> {
    const client = await this.authorizeClientForActivation(principal, clientCode);
    if (client === 'not_found') throw new PmHttpError(404, 'not_found', 'not_found');
    if (!isInternalStaff(principal)) {
      throw new PmHttpError(403, 'forbidden', 'Client activation is restricted to HVCG internal staff.');
    }
    const opportunities = await this.listAuthorizedOpportunities(principal);
    const opportunity = opportunities.find((row) => {
      if (row.clientCode !== client.clientCode) return false;
      if (opportunityId) return row.id === opportunityId;
      return row.winLossStatus === 'Won' || row.stage === 'Won';
    });
    const activation = client.activation;
    const status = classifyClientActivation({
      clientStage: client.clientStage,
      winLossStatus: opportunity?.winLossStatus,
      opportunityStage: opportunity?.stage,
      record: activation,
    });
    return {
      client,
      opportunity,
      activation,
      status,
      entitlementProvisioned: false,
    };
  }

  async applyClientActivation(
    principal: AtlasPrincipal,
    clientCode: string,
    body: Record<string, unknown>,
    etag: string | undefined,
  ): Promise<{
    client: SharePointClient;
    opportunity: SharePointOpportunity;
    activation: ClientActivationRecord;
    created: boolean;
    entitlementProvisioned: false;
    replay: boolean;
  }> {
    const action = (asString(body.action) || '') as ClientActivationAction;
    if (!['request', 'review', 'authorize', 'verify'].includes(action)) {
      throw new PmHttpError(400, 'invalid_input', 'action must be request, review, authorize, or verify.');
    }
    if (!isInternalStaff(principal)) {
      throw new PmHttpError(403, 'forbidden', 'Client activation is restricted to HVCG internal staff.');
    }
    if (action === 'authorize') {
      assertMannyOnly(principal, 'Client activation authorize');
    }
    if (!etag) throw new PmHttpError(400, 'PM_ETAG_REQUIRED', 'If-Match is required for SharePoint PM updates.');
    const opportunityId = asString(body.opportunityId);
    if (!opportunityId || !isSharePointItemId(opportunityId)) {
      throw new PmHttpError(400, 'invalid_input', 'opportunityId is required.');
    }
    const current = await this.getClientActivation(principal, clientCode, opportunityId);
    const opportunity = current.opportunity;
    if (!opportunity || opportunity.id !== opportunityId) {
      throw new PmHttpError(404, 'not_found', 'Won opportunity was not found for this client.');
    }
    if (opportunity.winLossStatus !== 'Won' && opportunity.stage !== 'Won') {
      throw new PmHttpError(400, 'activation_not_eligible', 'Client activation requires a Won opportunity.');
    }
    const now = new Date().toISOString();
    const actor = principal.userId;
    const key = activationIdempotencyKey(clientCode, opportunityId);
    let record = current.activation;
    const replayActive =
      current.client.clientStage === 'Active Client' &&
      (action === 'authorize' || action === 'verify') &&
      record?.opportunityId === opportunityId;
    if (replayActive && record) {
      if (action === 'verify' && record.status !== 'verified') {
        record = {
          ...record,
          ...emptyProvisioning(),
          status: 'verified',
          verifiedAt: now,
          verifiedBy: actor,
        };
      } else {
        return {
          client: current.client,
          opportunity,
          activation: record,
          created: false,
          entitlementProvisioned: false,
          replay: true,
        };
      }
    }

    if (action === 'request') {
      if (current.client.clientStage === 'Active Client') {
        throw new PmHttpError(400, 'already_active', 'Client is already Active Client.');
      }
      record = {
        version: 1,
        clientCode,
        opportunityId,
        status: 'activation_required',
        idempotencyKey: key,
        requestedAt: record?.requestedAt || now,
        requestedBy: record?.requestedBy || actor,
        notes: asString(body.notes) || record?.notes,
        ...emptyProvisioning(),
        workspaceProvisioning: 'not_started',
      };
    } else if (action === 'review') {
      if (!record || (record.status !== 'activation_required' && record.status !== 'review')) {
        throw new PmHttpError(400, 'activation_not_ready', 'Activation review requires a prior request.');
      }
      record = {
        ...record,
        ...emptyProvisioning(),
        status: 'review',
        reviewedAt: now,
        reviewedBy: actor,
        notes: asString(body.notes) || record.notes,
      };
    } else if (action === 'authorize') {
      if (current.client.clientStage !== 'Active Client' && record && record.status !== 'review' && record.status !== 'activation_required') {
        throw new PmHttpError(400, 'activation_not_ready', 'Authorization requires an activation request or completed review.');
      }
      if (!record) {
        record = {
          version: 1,
          clientCode,
          opportunityId,
          status: 'activation_required',
          idempotencyKey: key,
          requestedAt: now,
          requestedBy: actor,
          ...emptyProvisioning(),
        };
      }
      record = {
        ...record,
        ...emptyProvisioning(),
        status: 'authorized',
        authorizedAt: now,
        authorizedBy: actor,
        notes: asString(body.notes) || record.notes,
        workspaceProvisioning: 'staged',
      };
    } else {
      if (current.client.clientStage !== 'Active Client') {
        throw new PmHttpError(400, 'activation_not_ready', 'Verification requires an authorized Active Client.');
      }
      record = {
        ...(record || {
          version: 1 as const,
          clientCode,
          opportunityId,
          idempotencyKey: key,
          ...emptyProvisioning(),
        }),
        ...emptyProvisioning(),
        status: 'verified',
        verifiedAt: now,
        verifiedBy: actor,
        notes: asString(body.notes) || record?.notes,
        workspaceProvisioning: 'staged',
      };
    }

    const item = await this.graph.getItem(this.settings.clientsListId, current.client.itemId);
    if (!item) throw new PmHttpError(404, 'not_found', 'not_found');
    const fields: Record<string, unknown> = {
      InternalNotes: writeActivationNotes(asString(item.fields.InternalNotes), record),
    };
    if (action === 'authorize') {
      fields.ClientStage = 'Active Client';
      fields.IsActive = true;
    }
    const patched = await this.graph.patchItemFields(this.settings.clientsListId, current.client.itemId, fields, etag);
    const mapped = this.mapClient(patched);
    if (!mapped) throw pmInfrastructureError('PM_BACKEND_UNAVAILABLE', 'Activated client could not be mapped.');
    return {
      client: mapped,
      opportunity,
      activation: record,
      created: action === 'authorize' && current.client.clientStage !== 'Active Client',
      entitlementProvisioned: false,
      replay: false,
    };
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
