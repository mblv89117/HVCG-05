import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';
import {
  ENTITY_BOUNDARIES,
  assertWritableClientCode,
  classifyHubClientRow,
  isSyntheticQaClient,
  projectOperatingStates,
  taskOperatingStates,
} from '../src/pm/sharepoint/knowledgeClassification.ts';
import { buildKnowledgeOperatingPicture } from '../src/pm/sharepoint/knowledgeOperating.ts';
import { createDocumentRequest } from '../src/pm/sharepoint/documentRequests.ts';
import { PmHttpError } from '../src/pm/sharepoint/errors.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { SharePointClient, SharePointPmService, SharePointProject, SharePointTask } from '../src/pm/sharepoint/repository.ts';

const staff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-111111111003',
  organizationId: 'org-hvcg',
  allowedClientIds: ['SYN01'],
  roles: ['HVCG Staff'],
};

function client(partial: Partial<SharePointClient> & Pick<SharePointClient, 'clientCode' | 'displayName'>): SharePointClient {
  return {
    id: partial.clientCode,
    itemId: partial.itemId || '8',
    source: 'sharepoint',
    ...partial,
  };
}

function stubService(input: {
  clients?: SharePointClient[];
  projects?: SharePointProject[];
  tasks?: SharePointTask[];
  files?: Array<{ id: string; title: string; clientCode: string; webUrl?: string; summary?: string }>;
}): SharePointPmService {
  return {
    listAuthorizedClients: async () => input.clients || [],
    listAuthorizedProjects: async () => input.projects || [],
    listAuthorizedTasks: async () => input.tasks || [],
    listWorkspaceCollections: async (_principal, clientCode) => ({
      communications: {
        items: (input.files || [])
          .filter((row) => row.clientCode === clientCode)
          .map((row) => ({
            id: row.id,
            title: row.title,
            webUrl: row.webUrl,
            summary: row.summary || 'File metadata index. Binary remains in OneDrive/SharePoint.',
            sourceItemId: `file:${row.id}`,
          })),
      },
    }),
  } as unknown as SharePointPmService;
}

describe('knowledge classification', () => {
  it('labels SYN01 as synthetic QA and never as a customer record', () => {
    const row = classifyHubClientRow({
      clientCode: 'SYN01',
      displayName: 'SYNTHETIC QA — Atlas Capital Operations',
    });
    assert.equal(row.classification, 'SYNTHETIC_QA');
    assert.equal(row.customerRecord, false);
    assert.equal(row.provenance, 'CONFIRMED');
    assert.equal(isSyntheticQaClient('SYN01'), true);
    assert.equal(isSyntheticQaClient('SYNTH01'), true);
    assert.equal(classifyHubClientRow({ clientCode: 'SYNTH01' }).customerRecord, false);
    assert.equal(isSyntheticQaClient('HFD01'), false);
  });

  it('keeps Christie Place distinct from Falk and Loanspark as vendor', () => {
    const cpl = ENTITY_BOUNDARIES.find((row) => row.clientCode === 'CPL01');
    assert.ok(cpl?.keepDistinctFrom?.includes('Christie Falk'));
    const loan = ENTITY_BOUNDARIES.find((row) => row.legalName === 'Loanspark');
    assert.equal(loan?.kind, 'vendor_referral');
    const bestDay = ENTITY_BOUNDARIES.find((row) => row.legalName.startsWith('Best Day'));
    assert.equal(bestDay?.kind, 'reference_tenant');
    assert.equal(bestDay?.clientCode, undefined);
  });

  it('blocks ACCG01 writes without an approved window', () => {
    assert.throws(
      () => assertWritableClientCode('ACCG01', 'document-request create'),
      (err: unknown) =>
        err instanceof PmHttpError && err.status === 403 && err.code === 'ACCG01_WRITE_WINDOW_REQUIRED',
    );
    assertWritableClientCode('HFD01', 'document-request create');
    assert.throws(
      () => createDocumentRequest(mkdtempSync(join(tmpdir(), 'accg-doc-')), {
        clientCode: 'ACCG01',
        title: 'Invented ACCG request',
        createdBy: staff.userId,
      }),
      (err: unknown) => err instanceof PmHttpError && err.code === 'ACCG01_WRITE_WINDOW_REQUIRED',
    );
  });

  it('maps only supplied task/project fields into operating states', () => {
    assert.deepEqual(taskOperatingStates({ status: 'blocked' }).sort(), ['Blocked', 'Tasks']);
    assert.deepEqual(
      taskOperatingStates({ status: 'in_progress', dueDate: '2026-08-01', today: '2026-08-22' }).sort(),
      ['Needs Action', 'Overdue', 'Tasks'],
    );
    assert.deepEqual(projectOperatingStates({ health: 'at_risk', status: 'active' }).sort(), [
      'At Risk',
      'Projects',
    ]);
    assert.ok(!taskOperatingStates({ status: 'ready' }).includes('Overdue'));
  });
});

describe('knowledge operating picture', () => {
  it('does not operationalize SYN01 or invent unseen real-client work', async () => {
    const picture = await buildKnowledgeOperatingPicture(
      stubService({
        clients: [
          client({
            clientCode: 'SYN01',
            displayName: 'SYNTHETIC QA — Atlas Capital Operations',
          }),
        ],
      }),
      staff,
      { hvsDataAccess: 'BLOCKED', today: '2026-08-22' },
    );
    assert.equal(picture.kind, 'knowledge_operating_picture_v1');
    assert.equal(picture.graphSitesSearch, false);
    assert.equal(picture.binariesInAtlas, false);
    assert.deepEqual(picture.entitledClientCodes, ['SYN01']);
    assert.deepEqual(picture.realClientsOperationalized, []);
    assert.deepEqual(picture.syntheticClientsVisible, ['SYN01']);
    assert.equal(picture.hvsDataAccess, 'BLOCKED');
    assert.equal(picture.honestEmpty, true);
    assert.deepEqual(picture.syntheticAttention, []);
    assert.equal(picture.queues['Needs Action'].length, 0);
    assert.equal(picture.queues.Projects.length, 0);
    assert.equal(picture.queues.Tasks.length, 0);
    const syn = picture.recoveryLedger.find((row) => row.clientCode === 'SYN01');
    assert.equal(syn?.provenance, 'CONFIRMED');
    assert.equal(syn?.operationalized, false);
    assert.equal(syn?.accessible, true);
    const hart = picture.recoveryLedger.find((row) => row.clientCode === 'HFD01');
    assert.equal(hart?.provenance, 'STALE_OR_UNCERTAIN');
    assert.equal(hart?.accessible, false);
    assert.equal(hart?.operationalized, false);
    const hvs = picture.recoveryLedger.find((row) => row.dataType === 'HVS_HISTORICAL');
    assert.equal(hvs?.accessible, false);
    assert.equal(hvs?.provenance, 'CONFIRMED');
  });

  it('operationalizes only Hub-visible real-client tasks with CONFIRMED provenance', async () => {
    const entitled: AtlasPrincipal = { ...staff, allowedClientIds: ['HFD01'] };
    const picture = await buildKnowledgeOperatingPicture(
      stubService({
        clients: [client({ clientCode: 'HFD01', displayName: 'Hart Family Dental' })],
        projects: [
          {
            id: '90',
            name: 'Hart engagement',
            clientId: 'HFD01',
            clientCode: 'HFD01',
            businessEntity: 'HVCG',
            projectType: 'client_engagement',
            ownerId: staff.userId,
            ownerName: 'Staff',
            teamMemberIds: [],
            status: 'active',
            priority: 'high',
            health: 'at_risk',
            progressPercent: 0,
            sourceLinks: [],
            tags: [],
            createdAt: '2026-08-22T00:00:00.000Z',
            updatedAt: '2026-08-22T00:00:00.000Z',
            etag: '"1"',
            isInternalProject: false,
            classification: { kind: 'client', clientCode: 'HFD01' },
          } as SharePointProject,
        ],
        tasks: [
          {
            id: '91',
            title: 'Waiting on insurance packet',
            projectId: '90',
            clientId: 'HFD01',
            clientCode: 'HFD01',
            assigneeKind: 'unassigned',
            creatorId: staff.userId,
            creatorName: 'Staff',
            source: 'sharepoint',
            sourceLinks: [],
            status: 'blocked',
            priority: 'high',
            dependencyTaskIds: [],
            requiresApproval: false,
            createdAt: '2026-08-22T00:00:00.000Z',
            updatedAt: '2026-08-22T00:00:00.000Z',
            etag: '"1"',
          } as SharePointTask,
        ],
      }),
      entitled,
      { hvsDataAccess: 'BLOCKED', today: '2026-08-22' },
    );
    assert.deepEqual(picture.realClientsOperationalized, ['HFD01']);
    assert.equal(picture.honestEmpty, false);
    assert.ok(picture.queues.Blocked.some((row) => row.kind === 'task' && row.provenance === 'CONFIRMED'));
    assert.ok(picture.queues['At Risk'].some((row) => row.kind === 'project' && row.clientCode === 'HFD01'));
    assert.equal(picture.queues.Blocked.every((row) => row.invented === false), true);
    assert.equal(
      picture.recoveryLedger.some((row) => row.clientCode === 'PDG01' && row.operationalized === false),
      true,
    );
  });

  it('does not copy binaries and keeps document-request metadata entitled-only', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'know-docs-'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'client-document-requests.json'), '{}\n');
    const entitled: AtlasPrincipal = { ...staff, allowedClientIds: ['PDG01'] };
    createDocumentRequest(dir, {
      clientCode: 'PDG01',
      title: 'Articles of organization',
      createdBy: staff.userId,
    });
    const picture = await buildKnowledgeOperatingPicture(
      stubService({
        clients: [client({ clientCode: 'PDG01', displayName: 'Prodigy Games LLC' })],
      }),
      entitled,
      { dataDir: dir, hvsDataAccess: 'BLOCKED' },
    );
    assert.equal(picture.binariesInAtlas, false);
    assert.ok(picture.queues['Needs Action'].some((row) => row.kind === 'document_request' && row.clientCode === 'PDG01'));
    assert.equal(picture.documents.items.every((row) => row.provenance.binariesInAtlas === false), true);
    assert.equal(picture.syntheticAttention.length, 0);
  });

  it('labels SYN01 document requests as syntheticAttention and never as real work', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'know-syn-attn-'));
    createDocumentRequest(dir, {
      clientCode: 'SYN01',
      title: 'SYNQA W-9 request',
      createdBy: staff.userId,
    });
    const picture = await buildKnowledgeOperatingPicture(
      stubService({
        clients: [
          client({
            clientCode: 'SYN01',
            displayName: 'SYNTHETIC QA — Atlas Capital Operations',
          }),
        ],
      }),
      staff,
      { dataDir: dir, hvsDataAccess: 'BLOCKED' },
    );
    assert.equal(picture.honestEmpty, true);
    assert.deepEqual(picture.realClientsOperationalized, []);
    assert.equal(picture.queues['Needs Action'].length, 0);
    assert.equal(picture.syntheticAttention.length, 1);
    assert.equal(picture.syntheticAttention[0]?.classification, 'SYNTHETIC_QA');
    assert.equal(picture.syntheticAttention[0]?.title, 'SYNQA W-9 request');
    assert.equal(picture.syntheticAttention[0]?.invented, false);
  });
});
