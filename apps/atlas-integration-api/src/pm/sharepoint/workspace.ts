/**
 * Client Workspace V1 — SharePoint HVCG_* aggregation.
 * Not Client 360. Authorization is ClientCode entitlement only.
 * Empty HTTP 200 is not treated as complete when the source was not queried.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { isCanonicalClientCode } from '../../entitlements/clientCode.ts';
import { PmHttpError } from './errors.ts';
import { isFileIndexRow } from './fabric/fileIndex.ts';
import type { SharePointClient, SharePointPmService, SharePointProject, SharePointTask } from './repository.ts';

export type CompletenessStatus =
  | 'COMPLETE'
  | 'PARTIAL_SOURCE_DATA_NOT_FOUND'
  | 'BLOCKED_AMBIGUOUS_IDENTITY';

export interface CompletenessCell {
  status: CompletenessStatus;
  queried: boolean;
  count: number;
  reason?: string;
}

export interface EvidenceRef {
  source: string;
  kind: string;
  id: string;
  field?: string;
}

export interface BriefStatement {
  text: string;
  evidence: EvidenceRef[];
}

export interface WorkspaceSection<T> {
  status: CompletenessStatus;
  queried: boolean;
  items: T[];
  reason?: string;
}

export interface ClientWorkspacePayload {
  kind: 'client_workspace_v1';
  client: SharePointClient;
  completeness: Record<string, CompletenessCell>;
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
  projects: SharePointProject[];
  tasks: SharePointTask[];
  documents: WorkspaceSection<{
    id: string;
    title: string;
    webUrl?: string;
    kind: string;
    source: string;
  }>;
  communications: WorkspaceSection<Record<string, unknown>>;
  meetings: WorkspaceSection<Record<string, unknown>>;
  engagements: WorkspaceSection<Record<string, unknown>>;
  deliverables: WorkspaceSection<Record<string, unknown>>;
  decisionsRisks: WorkspaceSection<Record<string, unknown>>;
  contacts: WorkspaceSection<Record<string, unknown>>;
  timeline: Array<{ at: string; kind: string; title: string; source: string; id: string }>;
  brief: {
    generatedAt: string;
    refreshable: true;
    authorizationRecord: false;
    statements: BriefStatement[];
  };
  nextActions: Array<{ text: string; evidence: EvidenceRef[] }>;
  source: 'sharepoint';
}

function cell(
  queried: boolean,
  count: number,
  reason?: string,
  blocked?: boolean,
): CompletenessCell {
  if (blocked) {
    return { status: 'BLOCKED_AMBIGUOUS_IDENTITY', queried, count, reason };
  }
  if (!queried) {
    return { status: 'PARTIAL_SOURCE_DATA_NOT_FOUND', queried: false, count: 0, reason };
  }
  return { status: 'COMPLETE', queried: true, count, reason };
}

function openTask(t: SharePointTask): boolean {
  return t.status !== 'completed' && t.status !== 'cancelled';
}

export function deriveBrief(input: {
  client: SharePointClient;
  projects: SharePointProject[];
  tasks: SharePointTask[];
}): { statements: BriefStatement[]; nextActions: Array<{ text: string; evidence: EvidenceRef[] }> } {
  const statements: BriefStatement[] = [];
  const nextActions: Array<{ text: string; evidence: EvidenceRef[] }> = [];
  const open = input.tasks.filter(openTask);
  statements.push({
    text: `${input.client.displayName} (${input.client.clientCode}) is an entitled HVCG_Clients record.`,
    evidence: [
      {
        source: 'HVCG_Clients',
        kind: 'client',
        id: input.client.itemId,
        field: 'ClientCode',
      },
    ],
  });
  if (input.client.clientStage) {
    statements.push({
      text: `ClientStage is ${input.client.clientStage}.`,
      evidence: [{ source: 'HVCG_Clients', kind: 'client', id: input.client.itemId, field: 'ClientStage' }],
    });
  }
  if (input.client.engagementType) {
    statements.push({
      text: `EngagementTypePrimary is ${input.client.engagementType}.`,
      evidence: [
        { source: 'HVCG_Clients', kind: 'client', id: input.client.itemId, field: 'EngagementTypePrimary' },
      ],
    });
  }
  statements.push({
    text: `${input.projects.length} entitled project(s) in HVCG_Projects.`,
    evidence: input.projects.slice(0, 8).map((p) => ({
      source: 'HVCG_Projects',
      kind: 'project',
      id: p.id,
      field: 'Title',
    })),
  });
  statements.push({
    text: `${open.length} open task(s) in HVCG_Tasks.`,
    evidence: open.slice(0, 8).map((t) => ({
      source: 'HVCG_Tasks',
      kind: 'task',
      id: t.id,
      field: 'Title',
    })),
  });
  for (const p of input.projects) {
    if (p.nextAction) {
      nextActions.push({
        text: p.nextAction,
        evidence: [{ source: 'HVCG_Projects', kind: 'project', id: p.id, field: 'NextAction' }],
      });
    }
  }
  for (const t of open.slice(0, 8)) {
    nextActions.push({
      text: t.nextAction || t.title,
      evidence: [{ source: 'HVCG_Tasks', kind: 'task', id: t.id, field: t.nextAction ? 'Notes' : 'Title' }],
    });
  }
  if (!nextActions.length) {
    nextActions.push({
      text: 'No evidenced next action in entitled HVCG_Projects or open HVCG_Tasks.',
      evidence: [{ source: 'HVCG_Projects', kind: 'query', id: input.client.clientCode, field: 'NextAction' }],
    });
  }
  return { statements, nextActions };
}

export function buildTimeline(
  projects: SharePointProject[],
  tasks: SharePointTask[],
): Array<{ at: string; kind: string; title: string; source: string; id: string }> {
  const rows: Array<{ at: string; kind: string; title: string; source: string; id: string }> = [];
  for (const p of projects) {
    if (p.createdAt) {
      rows.push({ at: p.createdAt, kind: 'project', title: `Project created: ${p.name}`, source: 'HVCG_Projects', id: p.id });
    }
    if (p.updatedAt && p.updatedAt !== p.createdAt) {
      rows.push({ at: p.updatedAt, kind: 'project', title: `Project updated: ${p.name}`, source: 'HVCG_Projects', id: p.id });
    }
  }
  for (const t of tasks) {
    if (t.createdAt) {
      rows.push({ at: t.createdAt, kind: 'task', title: `Task: ${t.title}`, source: 'HVCG_Tasks', id: t.id });
    }
    if (t.completedAt) {
      rows.push({
        at: t.completedAt,
        kind: 'task_completed',
        title: `Completed: ${t.title}`,
        source: 'HVCG_Tasks',
        id: t.id,
      });
    }
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 80);
}

export async function buildSharePointClientWorkspace(
  service: SharePointPmService,
  principal: AtlasPrincipal,
  clientCode: string,
): Promise<ClientWorkspacePayload> {
  if (!isCanonicalClientCode(clientCode) || clientCode === '*') {
    throw new PmHttpError(404, 'not_found', 'not_found');
  }
  const client = await service.authorizeClient(principal, clientCode);
  if (client === 'not_found') {
    throw new PmHttpError(404, 'not_found', 'not_found');
  }
  const projects = (await service.listAuthorizedProjects(principal)).filter((p) => p.clientCode === clientCode);
  const allTasks = await service.listAuthorizedTasks(principal);
  const tasks = allTasks.filter((t) => t.clientCode === clientCode || projects.some((p) => p.id === t.projectId));
  const open = tasks.filter(openTask);
  const extras = await service.listWorkspaceCollections(principal, clientCode);
  const fileIndex = extras.communications.items.filter((i) => isFileIndexRow(i));
  const documents: ClientWorkspacePayload['documents'] = {
    status:
      extras.communications.queried || client.sharePointLibraryUrl
        ? 'COMPLETE'
        : 'PARTIAL_SOURCE_DATA_NOT_FOUND',
    queried: extras.communications.queried || Boolean(client.sharePointLibraryUrl),
    items: [
      ...(client.sharePointLibraryUrl
        ? [
            {
              id: `library-${client.clientCode}`,
              title: 'Client SharePoint library',
              webUrl: client.sharePointLibraryUrl,
              kind: 'library',
              source: 'HVCG_Clients.SharePointLibraryUrl',
            },
          ]
        : []),
      ...fileIndex.map((i) => ({
        id: String(i.id),
        title: String(i.title || i.id),
        webUrl: typeof i.webUrl === 'string' ? i.webUrl : undefined,
        kind: String(i.summary || '').includes('RESTRICTED') ? 'restricted-file' : 'file',
        source: 'HVCG_Communications/file-index',
      })),
    ],
    reason: extras.communications.queried
      ? 'HIGH-confidence file metadata + source link from HVCG/HVS libraries. Binaries stay in M365.'
      : 'No SharePointLibraryUrl on HVCG_Clients and document lists are not granted to Hub.',
  };
  const { statements, nextActions } = deriveBrief({ client, projects, tasks });
  return {
    kind: 'client_workspace_v1',
    client,
    completeness: {
      identity: cell(true, 1),
      contacts: cell(extras.contacts.queried, extras.contacts.items.length, extras.contacts.reason),
      engagements: cell(extras.engagements.queried, extras.engagements.items.length, extras.engagements.reason),
      projects: cell(true, projects.length),
      tasks: cell(true, open.length),
      documents: cell(documents.queried, documents.items.length, documents.reason),
      communications: cell(
        extras.communications.queried,
        extras.communications.items.length,
        extras.communications.reason,
      ),
      meetings: cell(extras.meetings.queried, extras.meetings.items.length, extras.meetings.reason),
      deliverables: cell(extras.deliverables.queried, extras.deliverables.items.length, extras.deliverables.reason),
      timeline: cell(true, projects.length + tasks.length),
      currentBrief: cell(true, statements.length),
      sourceProvenance: cell(true, 1, 'SharePoint HVCG_* via Hub Graph Selected grants'),
    },
    overview: {
      clientCode: client.clientCode,
      displayName: client.displayName,
      industry: client.industry,
      clientStage: client.clientStage,
      engagementType: client.engagementType,
      overallHealth: client.overallHealth,
      dba: client.dba,
      website: client.website,
      sourceOrg: client.sourceOrg,
      lastMeaningfulContact: client.lastMeaningfulContact,
      sharePointLibraryUrl: client.sharePointLibraryUrl,
    },
    projects,
    tasks: open,
    documents,
    communications: extras.communications,
    meetings: extras.meetings,
    engagements: extras.engagements,
    deliverables: extras.deliverables,
    decisionsRisks: extras.decisionsRisks,
    contacts: extras.contacts,
    timeline: [
      ...buildTimeline(projects, tasks),
      ...extras.communications.items
        .filter((i) => typeof i.date === 'string' && i.date)
        .map((i) => ({
          at: String(i.date),
          kind: 'communication',
          title: String(i.title || 'Communication'),
          source: 'HVCG_Communications',
          id: String(i.id),
        })),
      ...extras.meetings.items
        .filter((i) => typeof i.date === 'string' && i.date)
        .map((i) => ({
          at: String(i.date),
          kind: 'meeting',
          title: String(i.title || 'Meeting'),
          source: 'HVCG_Meetings',
          id: String(i.id),
        })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 80),
    brief: {
      generatedAt: new Date().toISOString(),
      refreshable: true,
      authorizationRecord: false,
      statements,
    },
    nextActions,
    source: 'sharepoint',
  };
}
