/**
 * Entitled knowledge operating picture. Hub SharePoint MI only.
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
  projectOperatingStates,
  taskOperatingStates,
  type KnowledgeProvenance,
  type OperatingState,
  type RecoveryLedgerRow,
} from './knowledgeClassification.ts';
import { buildKnowledgeLedger, type KnowledgeLedgerItem } from './knowledgeLedger.ts';
import type { SharePointClient, SharePointPmService, SharePointProject, SharePointTask } from './repository.ts';
import { listEntitledAttention, type ClientAttentionItem } from './attention.ts';

export type KnowledgeOperatingItem = {
  id: string;
  clientCode: string;
  title: string;
  queue: OperatingState;
  kind: 'task' | 'project' | 'document_request' | 'knowledge_item';
  provenance: KnowledgeProvenance;
  source: string;
  webUrl?: string;
  dueDate?: string;
  invented: false;
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
  hvsDataAccess: 'AVAILABLE' | 'PARTIAL' | 'BLOCKED';
  documents: Awaited<ReturnType<typeof buildKnowledgeLedger>>;
  classifiedClients: ReturnType<typeof classifyHubClientRow>[];
  queues: Record<OperatingState, KnowledgeOperatingItem[]>;
  syntheticAttention: ClientAttentionItem[];
  recoveryLedger: RecoveryLedgerRow[];
  honestEmpty: boolean;
};

function item(
  partial: Omit<KnowledgeOperatingItem, 'invented'>,
): KnowledgeOperatingItem {
  return { ...partial, invented: false };
}

function queuesFromEntitledWork(input: {
  clients: SharePointClient[];
  projects: SharePointProject[];
  tasks: SharePointTask[];
  documentRequests: DocumentRequestRecord[];
  ledgerItems: KnowledgeLedgerItem[];
  today: string;
}): Record<OperatingState, KnowledgeOperatingItem[]> {
  const queues = emptyOperatingQueues() as Record<OperatingState, KnowledgeOperatingItem[]>;
  const customerCodes = new Set(
    input.clients.filter((c) => !isSyntheticQaClient(c.clientCode)).map((c) => c.clientCode),
  );

  for (const project of input.projects) {
    const code = project.clientCode || project.clientId || '';
    if (!customerCodes.has(code)) continue;
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
    if (!customerCodes.has(code)) continue;
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

  for (const req of input.documentRequests) {
    if (!customerCodes.has(req.clientCode)) continue;
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
    if (!customerCodes.has(row.clientCode)) continue;
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

  for (const boundary of ENTITY_BOUNDARIES) {
    if (!boundary.clientCode || visible.has(boundary.clientCode)) continue;
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
      provenance: 'LIKELY',
    });
  }

  rows.push({
    source: 'graph_sites_search',
    client: 'High Value Solutions historical libraries',
    clientCode: '',
    dataType: 'HVS_HISTORICAL',
    discovered: true,
    accessible: false,
    indexed: false,
    classified: true,
    operationalized: false,
    validated: false,
    exceptions: 'Cursor automation SP Graph sites search returns 401 generalException/spException',
    blocker: 'HVS_DATA_ACCESS=BLOCKED for this principal; Hub MI entitled HVCG lists do not imply HVS',
    provenance: 'CONFIRMED',
  });

  return rows;
}

export async function buildKnowledgeOperatingPicture(
  service: SharePointPmService,
  principal: AtlasPrincipal,
  opts?: { dataDir?: string; today?: string; hvsDataAccess?: 'AVAILABLE' | 'PARTIAL' | 'BLOCKED' },
): Promise<KnowledgeOperatingPicture> {
  const clients = await service.listAuthorizedClients(principal);
  const projects = await service.listAuthorizedProjects(principal);
  const tasks = await service.listAuthorizedTasks(principal);
  const ledger = await buildKnowledgeLedger(service, principal);
  const documentRequests = clients.flatMap((client) =>
    opts?.dataDir ? listDocumentRequests(opts.dataDir, client.clientCode) : [],
  );
  const classifiedClients = clients.map((client) => classifyHubClientRow(client));
  const queues = queuesFromEntitledWork({
    clients,
    projects,
    tasks,
    documentRequests,
    ledgerItems: ledger.items,
    today: opts?.today || new Date().toISOString(),
  });
  const syntheticAttention = opts?.dataDir
    ? listEntitledAttention(
        opts.dataDir,
        clients.map((c) => c.clientCode).filter((code) => isSyntheticQaClient(code)),
      )
    : [];
  const realClientsOperationalized = [
    ...new Set(Object.values(queues).flat().map((row) => row.clientCode)),
  ].sort();
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
    hvsDataAccess: opts?.hvsDataAccess || 'BLOCKED',
    documents: ledger,
    classifiedClients,
    queues,
    syntheticAttention,
    recoveryLedger,
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
