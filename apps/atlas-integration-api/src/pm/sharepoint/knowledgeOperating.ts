/**
 * Entitled knowledge operating picture.
 * Hub SharePoint MI remains fail-closed for HVCG_Clients.
 * HVS-admin-discovered folders/lists are reference-only recovery rows.
 * Does not call Graph sites search. Does not populate Atlas from unseen clients.
 */

import type { AtlasPrincipal } from '../../middleware/auth.ts';
import { listDocumentRequests, type DocumentRequestRecord } from './documentRequests.ts';
import {
  ENTITY_BOUNDARIES,
  classifyHubClientRow,
  emptyOperatingQueues,
  entityBoundaryFor,
  isSyntheticQaClient,
  opportunityOperatingStates,
  projectOperatingStates,
  taskOperatingStates,
  type KnowledgeProvenance,
  type OperatingState,
  type RecoveryLedgerRow,
} from './knowledgeClassification.ts';
import { buildKnowledgeLedger, type KnowledgeLedgerItem } from './knowledgeLedger.ts';
import {
  buildHvsAccessPicture,
  hvsConfirmedClientFolders,
  hvsInventoryCoversBoundary,
  hvsInventoryLedgerRows,
  resolveHvsDataAccess,
  type HvsAccessPicture,
  type HvsAccessStatus,
  type HvsInventoryRow,
} from './hvsRecoveryInventory.ts';
import {
  hvsRecoveredActions,
  hvsRecoveredDocumentSummary,
  hvsRecoveredDocuments,
  isHvsRecoveredKind,
  type HvsDocumentClass,
  type HvsRecoveredAction,
  type HvsRecoveredDocument,
} from './hvsRecoveredDocuments.ts';
import type {
  SharePointClient,
  SharePointOpportunity,
  SharePointPmService,
  SharePointProject,
  SharePointTask,
} from './repository.ts';
import { listEntitledAttention, type ClientAttentionItem } from './attention.ts';

export type KnowledgeOperatingItem = {
  id: string;
  clientCode: string;
  title: string;
  queue: OperatingState;
  kind:
    | 'task'
    | 'project'
    | 'document_request'
    | 'knowledge_item'
    | 'opportunity'
    | 'hvs_recovered_reference'
    | 'hvs_recovered_action'
    | 'hvs_recovered_document';
  provenance: KnowledgeProvenance;
  source: string;
  webUrl?: string;
  dueDate?: string;
  invented: false;
};

export type HvsRecoveredClient = {
  client: string;
  clientCode: string;
  path?: string;
  provenance: 'CONFIRMED';
  operationalized: false;
  hubMiAccessible: false;
  knowledgeIndexed: true;
  documentCount: number;
  documentClasses: HvsDocumentClass[];
  nextAction: string;
};

export type KnowledgeOperatingPicture = {
  kind: 'knowledge_operating_picture_v1';
  source: 'sharepoint_hub_mi';
  graphSitesSearch: false;
  binariesInAtlas: false;
  queried: true;
  entitledClientCodes: string[];
  realClientsOperationalized: string[];
  syntheticClientsVisible: string[];
  hvsDataAccess: HvsAccessStatus;
  hvsAccess: HvsAccessPicture;
  documents: Awaited<ReturnType<typeof buildKnowledgeLedger>>;
  classifiedClients: ReturnType<typeof classifyHubClientRow>[];
  queues: Record<OperatingState, KnowledgeOperatingItem[]>;
  syntheticQueues: Record<OperatingState, KnowledgeOperatingItem[]>;
  syntheticAttention: ClientAttentionItem[];
  recoveryLedger: RecoveryLedgerRow[];
  hvsRecoveredClients: HvsRecoveredClient[];
  hvsRecoveredDocuments: HvsRecoveredDocument[];
  honestEmpty: boolean;
};

function item(
  partial: Omit<KnowledgeOperatingItem, 'invented'>,
): KnowledgeOperatingItem {
  return { ...partial, invented: false };
}

function recoveredClientFromFolder(row: HvsInventoryRow): HvsRecoveredClient {
  const summary = hvsRecoveredDocumentSummary(row.client);
  return {
    client: row.client,
    clientCode: row.clientCode,
    path: row.path,
    provenance: 'CONFIRMED',
    operationalized: false,
    hubMiAccessible: false,
    knowledgeIndexed: true,
    documentCount: summary.documentCount,
    documentClasses: summary.documentClasses,
    nextAction:
      summary.fileCount > 0
        ? 'Review recovered first-level files as reference-only knowledge. Do not invent Hub MI rows or amounts.'
        : row.nextAction,
  };
}

function hvsRecoveredActionItems(status: HvsAccessStatus): KnowledgeOperatingItem[] {
  if (status === 'BLOCKED') return [];
  return hvsRecoveredActions().map((row: HvsRecoveredAction) =>
    item({
      id: row.id,
      clientCode: row.clientCode,
      title: row.title,
      queue: row.queue,
      kind: 'hvs_recovered_action',
      provenance: row.provenance,
      source: row.evidence,
    }),
  );
}

function hvsRecoveredWaitingItems(status: HvsAccessStatus): KnowledgeOperatingItem[] {
  if (status === 'BLOCKED') return [];
  return hvsConfirmedClientFolders().map((row) =>
    item({
      id: `hvs-recovered:${row.client}:${row.clientCode || 'uncoded'}`,
      clientCode: row.clientCode,
      title: `${row.client} — HVS folder recovered (reference-only)`,
      queue: 'Waiting',
      kind: 'hvs_recovered_reference',
      provenance: 'CONFIRMED',
      source: row.source,
    }),
  );
}

function queuesFromEntitledWork(input: {
  clients: SharePointClient[];
  projects: SharePointProject[];
  tasks: SharePointTask[];
  opportunities?: SharePointOpportunity[];
  documentRequests: DocumentRequestRecord[];
  ledgerItems: KnowledgeLedgerItem[];
  today: string;
  includeCode: (clientCode: string) => boolean;
}): Record<OperatingState, KnowledgeOperatingItem[]> {
  const queues = emptyOperatingQueues() as Record<OperatingState, KnowledgeOperatingItem[]>;
  const entitledCodes = new Set(
    input.clients.map((c) => c.clientCode).filter((code) => input.includeCode(code)),
  );

  for (const project of input.projects) {
    const code = project.clientCode || project.clientId || '';
    if (!entitledCodes.has(code)) continue;
    for (const queue of projectOperatingStates({ health: project.health, status: project.status })) {
      queues[queue].push(
        item({
          id: `project:${project.id}:${queue}`,
          clientCode: code,
          title: project.name,
          queue,
          kind: 'project',
          provenance: 'CONFIRMED',
          source: 'HVCG_Projects',
        }),
      );
    }
  }

  for (const task of input.tasks) {
    const code = task.clientCode || task.clientId || '';
    if (!entitledCodes.has(code)) continue;
    for (const queue of taskOperatingStates({
      status: task.status,
      dueDate: task.dueDate,
      today: input.today,
    })) {
      queues[queue].push(
        item({
          id: `task:${task.id}:${queue}`,
          clientCode: code,
          title: task.title,
          queue,
          kind: 'task',
          provenance: 'CONFIRMED',
          source: 'HVCG_Tasks',
          dueDate: task.dueDate,
        }),
      );
    }
  }

  for (const opportunity of input.opportunities || []) {
    const code = opportunity.clientCode || opportunity.clientId || '';
    if (!entitledCodes.has(code)) continue;
    const title = opportunity.nextAction
      ? `${opportunity.title} — ${opportunity.nextAction}`
      : opportunity.title;
    for (const queue of opportunityOperatingStates({ state: opportunity.attention?.state })) {
      queues[queue].push(
        item({
          id: `opportunity:${opportunity.id}:${queue}`,
          clientCode: code,
          title,
          queue,
          kind: 'opportunity',
          provenance: 'CONFIRMED',
          source: 'HVCG_Opportunities',
          dueDate: opportunity.nextActionDate,
        }),
      );
    }
  }

  for (const req of input.documentRequests) {
    if (!entitledCodes.has(req.clientCode)) continue;
    const queue: OperatingState = req.status === 'received' ? 'Outcomes' : 'Needs Action';
    queues[queue].push(
      item({
        id: `docreq:${req.id}:${queue}`,
        clientCode: req.clientCode,
        title: req.title,
        queue,
        kind: 'document_request',
        provenance: 'CONFIRMED',
        source: 'hub_governed_overlay',
      }),
    );
  }

  for (const row of input.ledgerItems) {
    if (!entitledCodes.has(row.clientCode)) continue;
    queues.Ready.push(
      item({
        id: `ledger:${row.id}:Ready`,
        clientCode: row.clientCode,
        title: row.title,
        queue: 'Ready',
        kind: 'knowledge_item',
        provenance: 'CONFIRMED',
        source: row.source,
        webUrl: row.webUrl,
      }),
    );
  }

  return queues;
}

function recoveryFromEntitled(input: {
  clients: SharePointClient[];
  ledger: Awaited<ReturnType<typeof buildKnowledgeLedger>>;
  queues: Record<OperatingState, KnowledgeOperatingItem[]>;
}): RecoveryLedgerRow[] {
  const rows: RecoveryLedgerRow[] = [];
  const visible = new Set(input.clients.map((c) => c.clientCode));
  const operationalized = new Set(
    Object.values(input.queues)
      .flat()
      .map((row) => row.clientCode),
  );

  for (const client of input.clients) {
    const classified = classifyHubClientRow(client);
    const indexed = input.ledger.clientsQueried.includes(client.clientCode);
    const customer = classified.customerRecord;
    rows.push({
      source: 'hub_sharepoint_mi / HVCG_Clients',
      client: client.displayName,
      clientCode: client.clientCode,
      dataType: classified.classification,
      discovered: true,
      accessible: true,
      indexed,
      classified: true,
      operationalized: customer && operationalized.has(client.clientCode),
      validated: true,
      exceptions: customer
        ? client.sharePointLibraryUrl
          ? ''
          : 'No SharePointLibraryUrl on entitled row'
        : 'Synthetic QA — not a customer record',
      blocker: customer ? '' : 'SYN01 is not operationalized as a client',
      provenance: 'CONFIRMED',
    });
  }

  for (const row of hvsInventoryLedgerRows()) {
    if (
      row.clientCode &&
      visible.has(row.clientCode) &&
      (row.dataType === 'HVS_ABSENT_FROM_ROSTER' || row.dataType === 'HVS_MATERIALS_NOT_ON_CLIENT_ROSTER')
    ) {
      continue;
    }
    rows.push(row);
  }
  const coveredCodes = new Set([
    ...visible,
    ...rows.map((row) => row.clientCode).filter(Boolean),
  ]);

  for (const boundary of ENTITY_BOUNDARIES) {
    if (!boundary.clientCode || coveredCodes.has(boundary.clientCode)) continue;
    if (hvsInventoryCoversBoundary(boundary)) continue;
    rows.push({
      source: 'entity_boundary_catalog',
      client: boundary.legalName,
      clientCode: boundary.clientCode,
      dataType: boundary.kind,
      discovered: true,
      accessible: false,
      indexed: false,
      classified: true,
      operationalized: false,
      validated: false,
      exceptions: 'Not in this principal\'s Hub MI entitled HVCG_Clients set (fail-closed 404)',
      blocker: 'Entitled Hub session required; do not invent SharePoint rows',
      provenance: 'STALE_OR_UNCERTAIN',
    });
  }

  for (const boundary of ENTITY_BOUNDARIES.filter((row) => !row.clientCode)) {
    if (hvsInventoryCoversBoundary(boundary)) continue;
    rows.push({
      source: 'entity_boundary_catalog',
      client: boundary.legalName,
      clientCode: '',
      dataType: boundary.kind,
      discovered: true,
      accessible: false,
      indexed: false,
      classified: true,
      operationalized: false,
      validated: false,
      exceptions: boundary.notes,
      blocker: 'Not a Hub client row',
      provenance: boundary.kind === 'vendor_referral' || boundary.kind === 'reference_tenant' ? 'LIKELY' : 'STALE_OR_UNCERTAIN',
    });
  }

  return rows;
}

export async function buildKnowledgeOperatingPicture(
  service: SharePointPmService,
  principal: AtlasPrincipal,
  opts?: { dataDir?: string; today?: string; hvsDataAccess?: HvsAccessStatus },
): Promise<KnowledgeOperatingPicture> {
  const clients = await service.listAuthorizedClients(principal);
  const projects = await service.listAuthorizedProjects(principal);
  const tasks = await service.listAuthorizedTasks(principal);
  const opportunities =
    typeof service.listAuthorizedOpportunities === 'function'
      ? await service.listAuthorizedOpportunities(principal)
      : [];
  const ledger = await buildKnowledgeLedger(service, principal);
  const documentRequests = clients.flatMap((client) =>
    opts?.dataDir ? listDocumentRequests(opts.dataDir, client.clientCode) : [],
  );
  const classifiedClients = clients.map((client) => classifyHubClientRow(client));
  const workInput = {
    clients,
    projects,
    tasks,
    opportunities,
    documentRequests,
    ledgerItems: ledger.items,
    today: opts?.today || new Date().toISOString(),
  };
  const queues = queuesFromEntitledWork({
    ...workInput,
    includeCode: (code) => !isSyntheticQaClient(code),
  });
  const syntheticQueues = queuesFromEntitledWork({
    ...workInput,
    includeCode: (code) => isSyntheticQaClient(code),
  });
  const syntheticAttention = opts?.dataDir
    ? listEntitledAttention(
        opts.dataDir,
        clients.map((c) => c.clientCode).filter((code) => isSyntheticQaClient(code)),
      )
    : [];
  const realClientsOperationalized = [
    ...new Set(
      Object.values(queues)
        .flat()
        .filter((row) => !isHvsRecoveredKind(row.kind))
        .map((row) => row.clientCode)
        .filter(Boolean),
    ),
  ].sort();
  const hvsDataAccess = resolveHvsDataAccess(opts?.hvsDataAccess);
  const hvsRecoveredClients =
    hvsDataAccess === 'BLOCKED' ? [] : hvsConfirmedClientFolders().map(recoveredClientFromFolder);
  queues.Waiting.push(...hvsRecoveredWaitingItems(hvsDataAccess));
  for (const row of hvsRecoveredActionItems(hvsDataAccess)) {
    queues[row.queue].push(row);
  }
  const recoveredDocuments = hvsDataAccess === 'BLOCKED' ? [] : hvsRecoveredDocuments();
  const recoveryLedger = recoveryFromEntitled({ clients, ledger, queues });
  return {
    kind: 'knowledge_operating_picture_v1',
    source: 'sharepoint_hub_mi',
    graphSitesSearch: false,
    binariesInAtlas: false,
    queried: true,
    entitledClientCodes: clients.map((c) => c.clientCode),
    realClientsOperationalized,
    syntheticClientsVisible: classifiedClients
      .filter((c) => c.entityKind === 'synthetic_qa')
      .map((c) => c.clientCode),
    hvsDataAccess,
    hvsAccess: buildHvsAccessPicture(hvsDataAccess),
    documents: ledger,
    classifiedClients,
    queues,
    syntheticQueues,
    syntheticAttention,
    recoveryLedger,
    hvsRecoveredClients,
    hvsRecoveredDocuments: recoveredDocuments,
    honestEmpty: realClientsOperationalized.length === 0,
  };
}

export function classifyLedgerItem(row: KnowledgeLedgerItem): KnowledgeLedgerItem & {
  classification: ReturnType<typeof classifyHubClientRow>['classification'];
  entityKind: ReturnType<typeof classifyHubClientRow>['entityKind'];
  provenanceLabel: KnowledgeProvenance;
} {
  const classified = classifyHubClientRow({
    clientCode: row.clientCode,
    displayName: entityBoundaryFor(row.clientCode)?.legalName,
    sharePointLibraryUrl: row.webUrl,
  });
  return {
    ...row,
    classification: classified.classification,
    entityKind: classified.entityKind,
    provenanceLabel: 'CONFIRMED',
  };
}
