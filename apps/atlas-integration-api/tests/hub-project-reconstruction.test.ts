/**
 * ATLAS-PROJECT-RECONSTRUCTION-001
 * Entitled HVCG_Projects + already-indexed rows become a project operating
 * record on the existing /operator/search.json READ_AUTO path.
 * Historical HVS recovered projects stay read-only. No second project CRM.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { createAuthorizedPmRepository } from '../src/pm/backend.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import { searchSharePointPm, type SearchPmService } from '../src/pm/sharepoint/search.ts';
import { searchAuthorizedKnowledge } from '../src/pm/operatorDesk/toolGateway.ts';
import {
  attachRelatedContextToProject,
  DOCUMENT_RELATED_CONTEXT_PAGE_SIZE,
} from '../src/pm/operatorDesk/documentRelatedContext.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type CapitalSubmissionPrepareRecord,
  type DocumentOperatingRecord,
  type MailThreadOperatingRecord,
  type OperatorOperatingPicture,
  type ProjectOperatingRecord,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';

const SOURCE =
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_SYN01/engagement-sow.pdf';

const staff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['SYN01'],
  roles: ['HVCG Team Member'],
};

const manny: AtlasPrincipal = {
  userId: MANNY_ENTRA_OID,
  organizationId: 'org-hvcg',
  allowedClientIds: ['*'],
  roles: ['HVCG Owner'],
};

const otherStaff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa02',
  organizationId: 'org-hvcg',
  allowedClientIds: ['ACCG01'],
  roles: ['HVCG Team Member'],
};

const emptyCollection = {
  communications: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  meetings: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  engagements: { queried: true, status: 'COMPLETE' as const, items: [] },
  deliverables: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  decisionsRisks: { queried: true, status: 'COMPLETE' as const, items: [] },
  contacts: { queried: true, status: 'COMPLETE' as const, items: [] },
};

function projectService(): SearchPmService {
  return {
    async listAuthorizedClients() {
      return [
        {
          id: 'SYN01',
          itemId: '1',
          clientCode: 'SYN01',
          displayName: 'SYNTHETIC Alpha Co',
          source: 'sharepoint',
        },
      ];
    },
    async listAuthorizedProjects() {
      return [
        {
          id: 'proj-syn-1',
          name: 'SYN01 capital raise',
          clientCode: 'SYN01',
          objective: 'Close entitled capital package already on HVCG_Projects.',
          nextAction: 'Review existing NextAction on the entitled project row.',
          ownerName: 'manny@highvaluecapitalgroup.com',
          startDate: '2026-07-01T00:00:00Z',
          targetCompletionDate: '2026-09-01T00:00:00Z',
          status: 'active',
          updatedAt: '2026-08-20T18:04:00Z',
        },
        {
          id: 'proj-pdg-leak',
          name: 'PDG01 must not leak',
          clientCode: 'PDG01',
          objective: 'Invented leak objective',
          nextAction: 'Do not surface',
          status: 'active',
          updatedAt: '2026-08-20T18:04:00Z',
        },
        {
          id: 'proj-syn-done',
          name: 'SYN01 completed intake',
          clientCode: 'SYN01',
          objective: 'Finish entitled intake already marked completed.',
          status: 'completed',
          updatedAt: '2026-08-10T12:00:00Z',
        },
      ] as never;
    },
    async listAuthorizedTasks() {
      return [];
    },
    async listWorkspaceCollections() {
      return {
        ...emptyCollection,
        communications: {
          queried: true,
          status: 'COMPLETE',
          items: [
            {
              id: 'file-sow',
              title: 'SYN01 Engagement SOW.pdf',
              summary: `File metadata index. Binary remains in OneDrive/SharePoint. Source: ${SOURCE}`,
              webUrl: SOURCE,
              date: '2026-08-18T16:00:00Z',
              sourceItemId: 'file:sow-1',
            },
            {
              id: 'mail-1',
              title: 'SYN01 capital raise thread',
              summary: 'Outlook mail thread',
              date: '2026-08-19T12:00:00Z',
            },
          ],
        },
        meetings: {
          queried: true,
          status: 'COMPLETE',
          items: [
            {
              id: 'meet-1',
              title: 'SYN01 kickoff',
              summary: 'Existing entitled meeting',
              date: '2026-08-15T15:00:00Z',
            },
          ],
        },
        deliverables: {
          queried: true,
          status: 'COMPLETE',
          items: [
            {
              id: 'del-1',
              title: 'SYN01 financial model',
              status: 'in_review',
            },
          ],
        },
      };
    },
    async listVendors() {
      return [];
    },
    async listOpportunities() {
      return [];
    },
    async listIndexedFiles() {
      return [];
    },
  };
}

function reconstructionPicture(): OperatorOperatingPicture {
  const picture = emptyHonestOperatingPicture();
  return {
    ...picture,
    hvsRecoveredProjects: [
      ...picture.hvsRecoveredProjects,
      {
        client: 'SYNTHETIC Alpha Co',
        clientCode: 'SYN01',
        title: 'Recovered SYN01 filename packet',
        provenance: 'LIKELY',
        operationalized: false,
        evidence: 'CONFIRMED-as-filename SYN01_Engagement.pdf. Classification is not promoted.',
        nextAction: 'Review recovered filename. Do not invent completion.',
      },
      {
        client: 'Uncoded historical folder',
        clientCode: '',
        title: 'HVS engagement without a ClientCode',
        provenance: 'CONFIRMED',
        operationalized: false,
        evidence: 'CONFIRMED filename only. Do not invent a ClientCode.',
        nextAction: 'Keep historical. Do not mint a Hub-MI row.',
      },
    ],
  };
}

describe('entitled project operating record', () => {
  it('searchSharePointPm copies existing project fields and never invents ClientCodes', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'capital raise');
    const current = found.results.find((hit) => hit.id === 'proj-syn-1');
    assert.ok(current);
    assert.equal(current.kind, 'project');
    assert.equal(current.clientCode, 'SYN01');
    assert.equal(current.objective, 'Close entitled capital package already on HVCG_Projects.');
    assert.equal(current.nextAction, 'Review existing NextAction on the entitled project row.');
    assert.equal(current.ownerName, 'manny@highvaluecapitalgroup.com');
    assert.equal(current.provenance, 'CONFIRMED');
    assert.equal(current.source, 'HVCG_Projects');
    assert.equal(
      found.results.some((hit) => hit.clientCode === 'PDG01' || hit.clientCode === 'HFD01'),
      false,
    );
    assert.equal(
      found.results.some((hit) => hit.id === 'proj-pdg-leak'),
      false,
    );
  });

  it('search_authorized_knowledge READ_AUTO returns current-first project records after auth', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const projects = result.authorizedSearch.projects;
    assert.equal(projects.kind, 'project_operating_record_v1');
    assert.equal(projects.policyClass, 'READ_AUTO');
    assert.equal(projects.invented, false);
    assert.equal(projects.currentClientsFirst, true);
    assert.ok(projects.items.length >= 2);
    assert.equal(projects.items[0]?.historicalHvs, false);
    const current = projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(current);
    assert.equal(current.clientCode, 'SYN01');
    assert.equal(current.classification, 'CONFIRMED');
    assert.equal(current.hubMiRow, true);
    assert.equal(current.invented, false);
    assert.equal(current.objective, 'Close entitled capital package already on HVCG_Projects.');
    assert.equal(current.nextAction, 'Review existing NextAction on the entitled project row.');
    assert.deepEqual(current.participants, ['manny@highvaluecapitalgroup.com']);
    assert.equal(current.scope, 'SYN01 Engagement SOW.pdf');
    assert.ok(current.deliverables?.includes('SYN01 financial model'));
    assert.ok(current.timeline?.some((row) => row.title === 'Start: SYN01 capital raise'));
    const historical = projects.items.find((row) => row.title === 'Recovered SYN01 filename packet');
    assert.ok(historical);
    assert.equal(historical.historicalHvs, true);
    assert.equal(historical.hubMiRow, false);
    assert.equal(historical.operationalized, false);
    assert.equal(historical.classification, 'LIKELY');
    assert.equal(historical.clientCode, 'SYN01');
    const currentIdx = projects.items.findIndex((row) => row.id === 'proj-syn-1');
    const historicalIdx = projects.items.findIndex((row) => row.title === 'Recovered SYN01 filename packet');
    assert.ok(currentIdx < historicalIdx);
    const serialized = JSON.stringify(result.authorizedSearch);
    assert.equal(serialized.includes('PDG01'), false);
    assert.equal(serialized.includes('HFD01'), false);
    assert.equal(serialized.includes('Invented leak objective'), false);
    assert.equal(serialized.includes('Uncoded historical folder'), false);
    assert.equal(serialized.includes('HVS engagement without a ClientCode'), false);
  });

  it('does not promote recovered LIKELY and copies COMPLETE from existing status only', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const completed = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-done');
    assert.ok(completed);
    assert.equal(completed.classification, 'COMPLETE');
    assert.equal(completed.objective, 'Finish entitled intake already marked completed.');
    const recovered = result.authorizedSearch.projects.items.find(
      (row) => row.title === 'Recovered SYN01 filename packet',
    );
    assert.ok(recovered);
    assert.equal(recovered.classification, 'LIKELY');
    assert.equal(recovered.classification === 'CONFIRMED', false);
  });

  it('TAP unsigned /operator/search.json is 401 and leak-free', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-project-recon-'));
    const prev = {
      NODE_ENV: process.env.NODE_ENV,
      HOST: process.env.INTEGRATION_HOST,
      KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
      TENANT: process.env.MICROSOFT_TENANT_ID,
      PM: process.env.INTEGRATION_PM_BACKEND,
      DATA: process.env.INTEGRATION_DATA_DIR,
    };
    process.env.NODE_ENV = 'development';
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.INTEGRATION_HOST = '127.0.0.1';
    process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
    process.env.INTEGRATION_DATA_DIR = dir;
    process.env.INTEGRATION_PM_BACKEND = 'development-json';
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    const cfg: AppConfig = {
      ...loadConfig(),
      verifyAccessToken: async () => {
        const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
        err.status = 401;
        err.code = 'invalid_token';
        throw err;
      },
    };
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const pm = createAuthorizedPmRepository(cfg);
    const app = buildRegistry(cfg, repo);
    const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
    const server = createServer((req, res) => {
      handleRequest({ cfg, repo, app, pm, localAi }, req, res).catch((err) => {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    try {
      const unsigned = await fetch(`http://127.0.0.1:${port}/operator/search.json?q=capital`);
      const text = await unsigned.text();
      const tap =
        unsigned.status === 401 &&
        !/PDG01|HFD01|CCB01|authorizedSearch|operatorDesk|relatedProjects|relatedThreads|relatedAttachments|relatedCapital|proj-syn|mail-att-syn|cap-syn/i.test(text);
      assert.equal(unsigned.status, 401, 'not ok 1 - unsigned /operator/search.json 401');
      const body = JSON.parse(text) as { error?: string; authorizedSearch?: AtlasAuthorizedSearch };
      assert.equal(body.error, 'unauthorized');
      assert.equal(body.authorizedSearch, undefined);
      assert.equal('relatedProjects' in body, false);
      assert.equal('relatedThreads' in body, false);
      assert.equal('relatedAttachments' in body, false);
      assert.equal('relatedCapital' in body, false);
      assert.equal(tap, true, 'not ok 2 - unsigned search leaks project payload');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      rmSync(dir, { recursive: true, force: true });
      if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prev.NODE_ENV;
      if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
      else process.env.INTEGRATION_HOST = prev.HOST;
      if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
      else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
      if (prev.TENANT === undefined) delete process.env.MICROSOFT_TENANT_ID;
      else process.env.MICROSOFT_TENANT_ID = prev.TENANT;
      if (prev.PM === undefined) delete process.env.INTEGRATION_PM_BACKEND;
      else process.env.INTEGRATION_PM_BACKEND = prev.PM;
      if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
      else process.env.INTEGRATION_DATA_DIR = prev.DATA;
    }
  });
});

function syn01ProjectRecord(overrides: Partial<ProjectOperatingRecord> = {}): ProjectOperatingRecord {
  return {
    id: 'proj-syn-1',
    title: 'SYN01 capital raise',
    clientCode: 'SYN01',
    classification: 'CONFIRMED',
    source: 'HVCG_Projects',
    historicalHvs: false,
    hubMiRow: true,
    invented: false,
    operationalized: true,
    ...overrides,
  };
}

function syn01PeerProjectRecord(overrides: Partial<ProjectOperatingRecord> = {}): ProjectOperatingRecord {
  return syn01ProjectRecord({
    id: 'proj-syn-done',
    title: 'SYN01 completed intake',
    classification: 'COMPLETE',
    ...overrides,
  });
}

const THREAD_SOURCE = 'https://outlook.office.com/mail/deeplink/read/syn01-thread';
const ATT_PARENT_SOURCE = 'https://outlook.office.com/mail/deeplink/read/syn01-att-parent';
const SAS =
  'https://hvfiles.blob.core.windows.net/docs/intake.pdf?sv=2024-11-04&sig=abc&se=2026-08-24T00:00:00Z&sp=r';
const ANON =
  'https://highvaluecapitalgroup.sharepoint.com/:b:/s/HVCG-Clients/abc?guestaccess=1&share=xyz';

function syn01ThreadRecord(overrides: Partial<MailThreadOperatingRecord> = {}): MailThreadOperatingRecord {
  return {
    id: 'mail-syn-1',
    conversationId: 'conv-syn-1',
    title: 'SYN01 intake follow-up',
    clientCode: 'SYN01',
    channel: 'Email',
    preview: 'Can you confirm the next entitled document?',
    summary: 'Indexed preview only. Can you confirm the next entitled document?',
    summarySource: 'indexed_preview_only',
    invented: false,
    webUrl: THREAD_SOURCE,
    classification: 'PROPOSED',
    provenance: 'PROPOSED',
    commitments: [],
    unansweredQuestions: [],
    suggestedDraft: {
      policyClass: 'DRAFT_ONLY',
      send: false,
      autoRespond: false,
      subject: 'Re: SYN01 intake follow-up',
      body: 'This suggested reply is a draft only. It has not been sent.',
      status: 'draft',
    },
    ...overrides,
  };
}

function syn01ThreadHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'communication' as const,
    id: 'mail-syn-1',
    title: 'SYN01 intake follow-up',
    href: '/clients/SYN01',
    source: 'HVCG_Communications',
    clientCode: 'SYN01',
    conversationId: 'conv-syn-1',
    provenance: 'PROPOSED' as const,
    webUrl: THREAD_SOURCE,
    preview: 'Can you confirm the next entitled document?',
    ...overrides,
  };
}

function syn01AttachmentHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'document' as const,
    id: 'mail-att-syn',
    title: 'SYN01 term-sheet.pdf',
    href: '/clients/SYN01',
    source: 'HVCG_Communications/file-index',
    clientCode: 'SYN01',
    webUrl: ATT_PARENT_SOURCE,
    provenance: 'CONFIRMED' as const,
    parentMessageId: 'AAMk-syn-parent',
    attachmentId: 'att-syn-1',
    contentType: 'application/pdf',
    size: 1200,
    ...overrides,
  };
}

function syn01AttachmentRecord(overrides: Partial<DocumentOperatingRecord> = {}): DocumentOperatingRecord {
  return {
    id: 'mail-att-syn',
    title: 'SYN01 term-sheet.pdf',
    webUrl: ATT_PARENT_SOURCE,
    clientCode: 'SYN01',
    provenance: 'CONFIRMED',
    source: 'HVCG_Communications/file-index',
    parentMessageId: 'AAMk-syn-parent',
    attachmentId: 'att-syn-1',
    contentType: 'application/pdf',
    size: 1200,
    ...overrides,
  };
}

function syn01CapitalHit(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'capital_opportunity' as const,
    id: 'cap-syn-1',
    title: 'SYN01 entitled capital opportunity',
    href: '/capital?opportunity=cap-syn-1',
    source: 'HVCG_CapitalOpportunities',
    clientCode: 'SYN01',
    provenance: 'CONFIRMED' as const,
    ...overrides,
  };
}

function syn01CapitalRecord(overrides: Partial<CapitalSubmissionPrepareRecord> = {}): CapitalSubmissionPrepareRecord {
  return {
    id: 'cap-syn-1',
    title: 'SYN01 entitled capital opportunity',
    clientCode: 'SYN01',
    classification: 'CONFIRMED',
    provenance: 'CONFIRMED',
    invented: false,
    financingStatus: CAPITAL_SUBMISSION_FINANCING_STATUS,
    financingStatusClassification: 'HONEST_EMPTY',
    lenderCriteriaInvented: false,
    evidence: [
      {
        kind: 'capital_opportunity',
        id: 'cap-syn-1',
        title: 'SYN01 entitled capital opportunity',
        source: 'HVCG_CapitalOpportunities',
        classification: 'CONFIRMED',
      },
    ],
    missingRequirements: [
      'Owner must review and approve before any external lender/investor submission.',
    ],
    nextAction:
      'Owner review of this PREPARE-only package. External lender/investor submission remains owner-gated.',
    ...overrides,
  };
}

function emptyRelatedSearch(
  projects: ProjectOperatingRecord[],
  threads: MailThreadOperatingRecord[] = [],
  documents: DocumentOperatingRecord[] = [],
  capital: CapitalSubmissionPrepareRecord[] = [],
): AtlasAuthorizedSearch {
  return {
    kind: 'atlas_authorized_search_v1',
    invented: false,
    honestEmpty: false,
    query: 'SYN01',
    hitCount: 0,
    hits: [],
    documents: { kind: 'document_operating_record_v1', policyClass: 'READ_AUTO', binariesInAtlas: false, items: documents },
    projects: {
      kind: 'project_operating_record_v1',
      policyClass: 'READ_AUTO',
      invented: false,
      currentClientsFirst: true,
      items: projects,
    },
    threads: {
      kind: 'mail_thread_operating_record_v1',
      policyClass: 'DRAFT_ONLY',
      invented: false,
      autoRespond: false,
      send: false,
      indexedPreviewOnly: true,
      items: threads,
    },
    meetings: { kind: 'meeting_operating_record_v1', policyClass: 'READ_AUTO', invented: false, items: [] },
    capitalSubmissions: {
      kind: 'capital_submission_request_v1',
      policyClass: 'PREPARE_ONLY',
      invented: false,
      send: false,
      externalSubmit: false,
      ownerGated: true,
      catalogCopies: [],
      items: capital,
    },
    researchIntelligence: {
      kind: 'research_intelligence_v1',
      policyClass: 'SOURCE_BACKED_ONLY',
      invented: false,
      outboundRefresh: false,
      financingStatus: 'UNKNOWN',
      lenderCriteriaInvented: false,
      retrievedAt: '2026-08-24T18:00:00.000Z',
      items: [],
    },
    onboarding: {
      kind: 'onboarding_agent_v1',
      policyClass: 'OWNER_ESCALATE',
      invented: false,
      execute: false,
      activate: false,
      send: false,
      liveGtmOutbound: false,
      ownerGated: true,
      hubMi: false,
      items: [],
    },
    clientSupport: {
      kind: 'client_support_agent_v1',
      policyClass: 'OWNER_ESCALATE',
      invented: false,
      execute: false,
      send: false,
      autoRespond: false,
      draftOnly: true,
      ownerGated: true,
      hubMi: false,
      items: [],
    },
    classification: 'CONFIRMED',
    why: 'test',
    basedOn: 'test',
    entitled: true,
    ran: true,
    pictureComposed: true,
    actionabilityApplied: true,
  };
}

function assertProjectRelatedAttachmentsHonesty(item: ProjectOperatingRecord): void {
  const blob = JSON.stringify(item.relatedAttachments || []);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|contentBytes|transcript|attendee/i.test(blob), false);
  assert.equal(/Hub-MI/i.test(blob), false);
  assert.equal(/previewGetUrl|previewPostUrl/i.test(blob), false);
  assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(blob), false);
  assert.equal(item.invented, false);
  for (const row of item.relatedAttachments || []) {
    assert.equal(row.binariesInAtlas, false);
    assert.equal('downloadUrl' in row, false);
    assert.equal('contentBytes' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('hubMiRow' in row, false);
    assert.ok(Boolean(row.attachmentId || row.parentMessageId));
    assert.ok(
      row.classification === 'CONFIRMED' ||
        row.classification === 'LIKELY' ||
        row.classification === 'PROPOSED' ||
        row.classification === 'HONEST_EMPTY',
    );
  }
}

function assertProjectRelatedCapitalHonesty(item: ProjectOperatingRecord): void {
  const blob = JSON.stringify(item.relatedCapital || []);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|contentBytes|transcript|attendee/i.test(blob), false);
  assert.equal(/Hub-MI/i.test(blob), false);
  assert.equal(/previewGetUrl|previewPostUrl/i.test(blob), false);
  assert.equal(/lenderCriteria|Live Oak|5000000/i.test(blob), false);
  assert.equal(item.invented, false);
  for (const row of item.relatedCapital || []) {
    assert.equal(row.policyClass, CAPITAL_SUBMISSION_POLICY_CLASS);
    assert.equal(row.financingStatus, CAPITAL_SUBMISSION_FINANCING_STATUS);
    assert.equal(row.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.invented, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('downloadUrl' in row, false);
    assert.equal('contentBytes' in row, false);
    assert.equal('hubMiRow' in row, false);
    assert.equal('transcript' in row, false);
    assert.equal('fit' in row, false);
    assert.equal(row.id === item.id, false);
  }
}

function assertProjectRelatedThreadsHonesty(item: ProjectOperatingRecord): void {
  const blob = JSON.stringify(item.relatedThreads || []);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|contentBytes|transcript|attendee/i.test(blob), false);
  assert.equal(/Hub-MI/i.test(blob), false);
  assert.equal(/suggestedDraft|preview|autoRespond/i.test(blob), false);
  assert.equal(blob.includes('Can you confirm the next entitled document?'), false);
  assert.equal(item.invented, false);
  for (const row of item.relatedThreads || []) {
    assert.equal('preview' in row, false);
    assert.equal('suggestedDraft' in row, false);
    assert.equal('send' in row, false);
    assert.equal('autoRespond' in row, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('downloadUrl' in row, false);
    assert.equal('hubMiRow' in row, false);
    assert.ok(
      row.classification === 'CONFIRMED' ||
        row.classification === 'LIKELY' ||
        row.classification === 'PROPOSED' ||
        row.classification === 'HONEST_EMPTY',
    );
  }
}

function assertProjectPeerHonesty(item: ProjectOperatingRecord): void {
  const blob = JSON.stringify(item);
  assert.equal(/TargetAmount/i.test(blob), false);
  assert.equal(/downloadUrl|contentBytes|transcript|attendee/i.test(blob), false);
  assert.equal(/Hub-MI/i.test(blob), false);
  assert.equal(item.invented, false);
  for (const row of item.relatedProjects || []) {
    assert.equal(row.invented, false);
    assert.equal(row.id === item.id, false);
    assert.equal('TargetAmount' in row, false);
    assert.equal('downloadUrl' in row, false);
    assert.equal('timeline' in row, false);
    assert.equal('deliverables' in row, false);
    assert.equal('objective' in row, false);
    assert.equal('scope' in row, false);
    assert.equal('nextAction' in row, false);
    assert.ok(
      row.classification === 'CONFIRMED' ||
        row.classification === 'LIKELY' ||
        row.classification === 'PROPOSED' ||
        row.classification === 'STALE_OR_UNCERTAIN' ||
        row.classification === 'COMPLETE',
    );
  }
}

describe('ATLAS-PROJECT-RELATED-PROJECTS-001 entitled same-scope peer inverse', () => {
  it('attaches same-scope peer relatedProjects on entitled project A and omits self', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const current = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    const peer = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-done');
    const recovered = result.authorizedSearch.projects.items.find(
      (row) => row.title === 'Recovered SYN01 filename packet',
    );
    assert.ok(current);
    assert.ok(peer);
    assert.ok(recovered);
    const related = current.relatedProjects?.find((row) => row.id === 'proj-syn-done');
    assert.ok(related);
    assert.equal(related.title, 'SYN01 completed intake');
    assert.equal(related.clientCode, 'SYN01');
    assert.equal(related.classification, 'COMPLETE');
    assert.equal(related.source, 'HVCG_Projects');
    assert.equal(related.historicalHvs, false);
    assert.equal(related.hubMiRow, true);
    assert.equal(related.invented, false);
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(peer.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(peer.relatedProjects?.some((row) => row.id === 'proj-syn-done'), false);
    const recoveredRef = current.relatedProjects?.find((row) => row.id === recovered.id);
    assert.ok(recoveredRef);
    assert.equal(recoveredRef.historicalHvs, true);
    assert.equal(recoveredRef.hubMiRow, false);
    assert.ok((current.relatedProjects?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(JSON.stringify(current.relatedProjects).includes('PDG01'), false);
    assert.equal(/TargetAmount|downloadUrl|Hub-MI/i.test(JSON.stringify(current.relatedProjects)), false);
    assertProjectPeerHonesty(current);
    assertProjectPeerHonesty(peer);
  });

  it('never attaches Client B project to a Client A project', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const current = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(current);
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(
      (current.relatedProjects || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    const blob = JSON.stringify(result.authorizedSearch.projects);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('proj-pdg-leak'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertProjectPeerHonesty(current);

    const mixed = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch([
        syn01ProjectRecord(),
        syn01PeerProjectRecord(),
        syn01ProjectRecord({
          id: 'proj-pdg-leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
        }),
      ]),
    );
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(
      (mixed.relatedProjects || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedProjects).includes('PDG01'), false);
    assert.equal(mixed.hubMiRow, true);
    assert.equal(mixed.invented, false);
  });

  it('omits relatedProjects when project ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch([
        syn01ProjectRecord({
          id: 'proj-unscoped',
          clientCode: undefined,
          hubMiRow: false,
          operationalized: false,
        }),
        syn01PeerProjectRecord(),
        syn01ProjectRecord({
          id: 'proj-unscoped-peer',
          title: 'Internal unscoped peer',
          clientCode: undefined,
          hubMiRow: false,
          operationalized: false,
        }),
      ]),
    );
    assert.equal(omitted.relatedProjects, undefined);
    assert.equal('relatedProjects' in omitted, false);
    assert.equal(omitted.hubMiRow, false);
    assert.equal(omitted.invented, false);
  });

  it('omits relatedProjects when project ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-noncanonical',
        clientCode: 'syn01',
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch([syn01ProjectRecord(), syn01PeerProjectRecord()]),
    );
    assert.equal(omitted.relatedProjects, undefined);
    assert.equal('relatedProjects' in omitted, false);
    assert.equal(omitted.invented, false);
  });

  it('unscoped never receives scoped relatedProjects', () => {
    const unscoped = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch([syn01ProjectRecord(), syn01PeerProjectRecord()]),
    );
    assert.equal(unscoped.relatedProjects, undefined);
    assert.equal('relatedProjects' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.hubMiRow, false);
    assert.equal(unscoped.invented, false);
  });

  it('omits extras for unauthorized or other-client principals', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    assert.equal(unknown.authorizedSearch.projects.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.projects.items.some((row) => row.relatedProjects),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.projects);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('proj-syn-done'), false);
    assert.equal(unknownBlob.includes('relatedProjects'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToProject(
      otherStaff,
      syn01ProjectRecord(),
      emptyRelatedSearch([syn01ProjectRecord(), syn01PeerProjectRecord()]),
    );
    assert.equal(denied.relatedProjects, undefined);
    assert.equal('relatedProjects' in denied, false);
    assert.equal(denied.hubMiRow, true);
  });

  it('never invents TargetAmount, downloadUrl, Hub-MI, or milestone rows on relatedProjects', () => {
    const attached = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord({
        timeline: [{ at: '2026-07-01T00:00:00Z', title: 'Start: SYN01 capital raise', source: 'HVCG_Projects' }],
        deliverables: ['SYN01 financial model'],
        objective: 'Close entitled capital package already on HVCG_Projects.',
      }),
      emptyRelatedSearch([
        syn01ProjectRecord({
          timeline: [{ at: '2026-07-01T00:00:00Z', title: 'Start: SYN01 capital raise', source: 'HVCG_Projects' }],
          deliverables: ['SYN01 financial model'],
          objective: 'Close entitled capital package already on HVCG_Projects.',
        }),
        syn01PeerProjectRecord({
          historicalHvs: true,
          hubMiRow: false,
          operationalized: false,
          source: 'operator_operating_picture',
          timeline: [{ at: '2026-08-10T12:00:00Z', title: 'Invented milestone', source: 'invented' }],
          deliverables: ['Invented deliverable'],
          objective: 'Invented objective',
        }),
      ]),
    );
    const related = attached.relatedProjects?.find((row) => row.id === 'proj-syn-done');
    assert.ok(related);
    assert.equal(related.historicalHvs, true);
    assert.equal(related.hubMiRow, false);
    assert.equal(related.invented, false);
    assert.equal('timeline' in related, false);
    assert.equal('deliverables' in related, false);
    assert.equal('objective' in related, false);
    assert.equal('TargetAmount' in related, false);
    assert.equal('downloadUrl' in related, false);
    assert.equal(attached.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(/TargetAmount|downloadUrl|Hub-MI|Invented milestone/i.test(JSON.stringify(attached.relatedProjects)), false);
    assertProjectPeerHonesty(attached);
  });

  it('honestly omits relatedProjects when no entitled peer exists', () => {
    const alone = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch([syn01ProjectRecord()]),
    );
    assert.equal(alone.relatedProjects, undefined);
    assert.equal('relatedProjects' in alone, false);
    assert.equal(alone.hubMiRow, true);
    assert.equal(alone.invented, false);
  });
});

describe('ATLAS-PROJECT-RELATED-THREADS-001 entitled same-scope inverse', () => {
  it('attaches same-scope relatedThreads on entitled project A and keeps relatedProjects peers', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [...found.results, syn01ThreadHit()],
      }),
    });
    const current = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    const peer = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-done');
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(current);
    assert.ok(peer);
    assert.ok(thread);
    const related = current.relatedThreads?.find((row) => row.id === 'mail-syn-1');
    assert.ok(related);
    assert.equal(related.title, 'SYN01 intake follow-up');
    assert.equal(related.conversationId, 'conv-syn-1');
    assert.equal(related.webUrl, THREAD_SOURCE);
    assert.equal('preview' in related, false);
    assert.equal('suggestedDraft' in related, false);
    assert.equal('send' in related, false);
    assert.equal('autoRespond' in related, false);
    assert.ok((current.relatedThreads?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(peer.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(peer.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(
      /downloadUrl|contentBytes|transcript|attendee|TargetAmount|suggestedDraft/i.test(
        JSON.stringify(current.relatedThreads),
      ),
      false,
    );
    assert.equal(JSON.stringify(current.relatedThreads).includes('Can you confirm the next entitled document?'), false);
    assert.equal(JSON.stringify(current.relatedThreads).includes('PDG01'), false);
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.send, false);
    assert.equal(result.authorizedSearch.threads.autoRespond, false);
    assert.equal(result.authorizedSearch.threads.indexedPreviewOnly, true);
    assertProjectRelatedThreadsHonesty(current);
    assertProjectPeerHonesty(current);
  });

  it('never attaches Client B thread to a Client A project', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          ...found.results,
          syn01ThreadHit(),
          {
            kind: 'communication' as const,
            id: 'mail-pdg',
            title: 'PDG01 leak thread',
            href: '/clients/PDG01',
            source: 'HVCG_Communications',
            clientCode: 'PDG01',
            conversationId: 'conv-pdg',
            provenance: 'PROPOSED' as const,
            preview: 'PDG01 leak preview body must not copy',
          },
        ],
      }),
    });
    const current = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(current);
    assert.equal(current.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(
      (current.relatedThreads || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)),
      false,
    );
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    const blob = JSON.stringify(result.authorizedSearch.projects);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('mail-pdg'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertProjectRelatedThreadsHonesty(current);

    const mixed = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [
          syn01ThreadRecord(),
          syn01ThreadRecord({
            id: 'mail-pdg',
            conversationId: 'conv-pdg',
            title: 'PDG01 leak thread',
            clientCode: 'PDG01',
          }),
          syn01ThreadRecord({
            id: 'mail-lender-catalog',
            conversationId: 'conv-lender',
            title: 'Live Oak Bank catalog',
            clientCode: undefined,
          }),
        ],
      ),
    );
    assert.equal(mixed.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(
      (mixed.relatedThreads || []).some((row) => /pdg|live oak/i.test(row.id) || /pdg|live oak/i.test(row.title)),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedThreads).includes('PDG01'), false);
    assert.equal(JSON.stringify(mixed.relatedThreads).includes('mail-pdg'), false);
    assert.equal(JSON.stringify(mixed.relatedThreads).includes('mail-lender-catalog'), false);
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(mixed.hubMiRow, true);
    assert.equal(mixed.invented, false);
    assertProjectRelatedThreadsHonesty(mixed);
    assertProjectPeerHonesty(mixed);
  });

  it('omits relatedThreads when project ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch([syn01ProjectRecord(), syn01PeerProjectRecord()], [syn01ThreadRecord()]),
    );
    assert.equal(omitted.relatedThreads, undefined);
    assert.equal('relatedThreads' in omitted, false);
    assert.equal(omitted.relatedProjects, undefined);
    assert.equal(omitted.hubMiRow, false);
    assert.equal(omitted.invented, false);
  });

  it('omits relatedThreads when project ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-noncanonical',
        clientCode: 'syn01',
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch([syn01ProjectRecord(), syn01PeerProjectRecord()], [syn01ThreadRecord()]),
    );
    assert.equal(omitted.relatedThreads, undefined);
    assert.equal('relatedThreads' in omitted, false);
    assert.equal(omitted.relatedProjects, undefined);
    assert.equal(omitted.invented, false);
  });

  it('unscoped never receives scoped relatedThreads', () => {
    const unscoped = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch([syn01ProjectRecord(), syn01PeerProjectRecord()], [syn01ThreadRecord()]),
    );
    assert.equal(unscoped.relatedThreads, undefined);
    assert.equal('relatedThreads' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.hubMiRow, false);
    assert.equal(unscoped.invented, false);
  });

  it('omits relatedThreads for unauthorized or other-client principals', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [...found.results, syn01ThreadHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.projects.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.projects.items.some((row) => row.relatedThreads),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.projects);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('mail-syn-1'), false);
    assert.equal(unknownBlob.includes('relatedThreads'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToProject(
      otherStaff,
      syn01ProjectRecord(),
      emptyRelatedSearch([syn01ProjectRecord(), syn01PeerProjectRecord()], [syn01ThreadRecord()]),
    );
    assert.equal(denied.relatedThreads, undefined);
    assert.equal('relatedThreads' in denied, false);
    assert.equal(denied.relatedProjects, undefined);
    assert.equal(denied.hubMiRow, true);
  });

  it('never invents preview body, suggestedDraft, send, TargetAmount, downloadUrl, or Hub-MI on relatedThreads', () => {
    const attached = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [
          syn01ThreadRecord({
            preview: 'Can you confirm the next entitled document? TargetAmount $2,000,000 Hub-MI downloadUrl',
            suggestedDraft: {
              policyClass: 'DRAFT_ONLY',
              send: false,
              autoRespond: false,
              subject: 'Re: SYN01 intake follow-up',
              body: 'This suggested reply is a draft only. It has not been sent.',
              status: 'draft',
            },
          }),
        ],
      ),
    );
    const related = attached.relatedThreads?.find((row) => row.id === 'mail-syn-1');
    assert.ok(related);
    assert.equal(related.title, 'SYN01 intake follow-up');
    assert.equal(related.conversationId, 'conv-syn-1');
    assert.equal(related.webUrl, THREAD_SOURCE);
    assert.equal('preview' in related, false);
    assert.equal('suggestedDraft' in related, false);
    assert.equal('send' in related, false);
    assert.equal('autoRespond' in related, false);
    assert.equal('TargetAmount' in related, false);
    assert.equal('downloadUrl' in related, false);
    assert.equal('hubMiRow' in related, false);
    assert.equal(attached.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(attached.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(
      /TargetAmount|downloadUrl|Hub-MI|suggestedDraft|preview/i.test(JSON.stringify(attached.relatedThreads)),
      false,
    );
    assert.equal(JSON.stringify(attached.relatedThreads).includes('Can you confirm the next entitled document?'), false);
    assertProjectRelatedThreadsHonesty(attached);
    assertProjectPeerHonesty(attached);
  });

  it('honestly omits relatedThreads when no entitled thread exists and keeps relatedProjects', () => {
    const alone = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch([syn01ProjectRecord(), syn01PeerProjectRecord()]),
    );
    assert.equal(alone.relatedThreads, undefined);
    assert.equal('relatedThreads' in alone, false);
    assert.equal(alone.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(alone.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(alone.hubMiRow, true);
    assert.equal(alone.invented, false);
    assertProjectPeerHonesty(alone);
  });
});

describe('ATLAS-PROJECT-RELATED-ATTACHMENTS-001 entitled same-scope inverse', () => {
  it('attaches same-scope relatedAttachments on entitled project A and keeps relatedProjects / relatedThreads', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [...found.results, syn01ThreadHit(), syn01AttachmentHit()],
      }),
    });
    const current = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    const peer = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-done');
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    assert.ok(current);
    assert.ok(peer);
    assert.ok(thread);
    const related = current.relatedAttachments?.find((row) => row.id === 'mail-att-syn');
    assert.ok(related);
    assert.equal(related.title, 'SYN01 term-sheet.pdf');
    assert.equal(related.parentMessageId, 'AAMk-syn-parent');
    assert.equal(related.attachmentId, 'att-syn-1');
    assert.equal(related.contentType, 'application/pdf');
    assert.equal(related.size, 1200);
    assert.equal(related.binariesInAtlas, false);
    assert.equal(related.webUrl, ATT_PARENT_SOURCE);
    assert.equal('downloadUrl' in related, false);
    assert.equal('contentBytes' in related, false);
    assert.ok((current.relatedAttachments?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal((current.relatedAttachments || []).some((row) => row.id === 'file-sow'), false);
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(peer.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(current.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(peer.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(
      /downloadUrl|contentBytes|transcript|attendee|TargetAmount/i.test(
        JSON.stringify(current.relatedAttachments),
      ),
      false,
    );
    assert.equal(JSON.stringify(current.relatedAttachments).includes('PDG01'), false);
    assert.equal(result.authorizedSearch.documents.binariesInAtlas, false);
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.send, false);
    assertProjectRelatedAttachmentsHonesty(current);
    assertProjectRelatedThreadsHonesty(current);
    assertProjectPeerHonesty(current);
  });

  it('never attaches Client B attachment to a Client A project', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          ...found.results,
          syn01ThreadHit(),
          syn01AttachmentHit(),
          {
            kind: 'document' as const,
            id: 'mail-att-pdg',
            title: 'PDG01 leak attachment.pdf',
            href: '/clients/PDG01',
            source: 'HVCG_Communications/file-index',
            clientCode: 'PDG01',
            webUrl: ATT_PARENT_SOURCE,
            provenance: 'CONFIRMED' as const,
            parentMessageId: 'AAMk-pdg-parent',
            attachmentId: 'att-pdg-1',
            contentType: 'application/pdf',
            size: 800,
          },
        ],
      }),
    });
    const current = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(current);
    assert.equal(current.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(
      (current.relatedAttachments || []).some((row) => /pdg/i.test(row.id) || /pdg/i.test(row.title)),
      false,
    );
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(current.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    const blob = JSON.stringify(result.authorizedSearch.projects);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('mail-att-pdg'), false);
    assert.equal(blob.includes('att-pdg-1'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertProjectRelatedAttachmentsHonesty(current);

    const mixed = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [
          syn01AttachmentRecord(),
          syn01AttachmentRecord({
            id: 'mail-att-pdg',
            title: 'PDG01 leak attachment.pdf',
            clientCode: 'PDG01',
            parentMessageId: 'AAMk-pdg-parent',
            attachmentId: 'att-pdg-1',
          }),
          syn01AttachmentRecord({
            id: 'mail-att-lender',
            title: 'Live Oak Bank catalog.pdf',
            clientCode: undefined,
            parentMessageId: 'AAMk-lender-parent',
            attachmentId: 'att-lender-1',
          }),
        ],
      ),
    );
    assert.equal(mixed.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(
      (mixed.relatedAttachments || []).some(
        (row) => /pdg|live oak/i.test(row.id) || /pdg|live oak/i.test(row.title),
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedAttachments).includes('PDG01'), false);
    assert.equal(JSON.stringify(mixed.relatedAttachments).includes('mail-att-pdg'), false);
    assert.equal(JSON.stringify(mixed.relatedAttachments).includes('att-pdg-1'), false);
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(mixed.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(mixed.hubMiRow, true);
    assert.equal(mixed.invented, false);
    assertProjectRelatedAttachmentsHonesty(mixed);
    assertProjectRelatedThreadsHonesty(mixed);
    assertProjectPeerHonesty(mixed);
  });

  it('omits relatedAttachments when project ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
      ),
    );
    assert.equal(omitted.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in omitted, false);
    assert.equal(omitted.relatedProjects, undefined);
    assert.equal(omitted.relatedThreads, undefined);
    assert.equal(omitted.hubMiRow, false);
    assert.equal(omitted.invented, false);
  });

  it('omits relatedAttachments when project ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-noncanonical',
        clientCode: 'syn01',
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
      ),
    );
    assert.equal(omitted.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in omitted, false);
    assert.equal(omitted.relatedProjects, undefined);
    assert.equal(omitted.relatedThreads, undefined);
    assert.equal(omitted.invented, false);
  });

  it('unscoped never receives scoped relatedAttachments', () => {
    const unscoped = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
      ),
    );
    assert.equal(unscoped.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.hubMiRow, false);
    assert.equal(unscoped.invented, false);
  });

  it('omits relatedAttachments for unauthorized or other-client principals', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [...found.results, syn01ThreadHit(), syn01AttachmentHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.projects.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.projects.items.some((row) => row.relatedAttachments),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.projects);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('mail-att-syn'), false);
    assert.equal(unknownBlob.includes('relatedAttachments'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToProject(
      otherStaff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
      ),
    );
    assert.equal(denied.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in denied, false);
    assert.equal(denied.relatedProjects, undefined);
    assert.equal(denied.relatedThreads, undefined);
    assert.equal(denied.hubMiRow, true);
  });

  it('never invents contentBytes, downloadUrl, TargetAmount, Hub-MI, or filenames on relatedAttachments', () => {
    const attached = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [
          syn01AttachmentRecord({
            title: 'SYN01 term-sheet.pdf',
          }),
        ],
      ),
    );
    const related = attached.relatedAttachments?.find((row) => row.id === 'mail-att-syn');
    assert.ok(related);
    assert.equal(related.title, 'SYN01 term-sheet.pdf');
    assert.equal(related.parentMessageId, 'AAMk-syn-parent');
    assert.equal(related.attachmentId, 'att-syn-1');
    assert.equal(related.contentType, 'application/pdf');
    assert.equal(related.size, 1200);
    assert.equal(related.binariesInAtlas, false);
    assert.equal(related.webUrl, ATT_PARENT_SOURCE);
    assert.equal('downloadUrl' in related, false);
    assert.equal('contentBytes' in related, false);
    assert.equal('TargetAmount' in related, false);
    assert.equal('hubMiRow' in related, false);
    assert.equal(attached.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(attached.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(attached.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(
      /TargetAmount|downloadUrl|Hub-MI|contentBytes|invented/i.test(JSON.stringify(attached.relatedAttachments)),
      false,
    );
    assertProjectRelatedAttachmentsHonesty(attached);
    assertProjectRelatedThreadsHonesty(attached);
    assertProjectPeerHonesty(attached);
  });

  it('drops SAS and anonymous webUrl and never emits downloadUrl or contentBytes', () => {
    const sas = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord({ webUrl: SAS })],
      ),
    );
    const sasAtt = sas.relatedAttachments?.find((row) => row.id === 'mail-att-syn');
    assert.ok(sasAtt);
    assert.equal(sasAtt.webUrl, undefined);
    assert.equal(sasAtt.binariesInAtlas, false);
    assert.equal(sasAtt.attachmentId, 'att-syn-1');
    assert.equal(sasAtt.parentMessageId, 'AAMk-syn-parent');
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(JSON.stringify(sas)), false);
    assert.equal(/downloadUrl|contentBytes|TargetAmount/i.test(JSON.stringify(sas.relatedAttachments)), false);
    assert.equal(sas.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(sas.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);

    const anon = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord({ webUrl: ANON })],
      ),
    );
    const anonAtt = anon.relatedAttachments?.find((row) => row.id === 'mail-att-syn');
    assert.ok(anonAtt);
    assert.equal(anonAtt.webUrl, undefined);
    assert.equal(anonAtt.binariesInAtlas, false);
    assert.equal(/blob\.core\.windows\.net|[?&](?:sv|sig|share|guestaccess)=/i.test(JSON.stringify(anon)), false);
    assert.equal(/downloadUrl|contentBytes|TargetAmount/i.test(JSON.stringify(anon.relatedAttachments)), false);
    assertProjectRelatedAttachmentsHonesty(sas);
    assertProjectRelatedAttachmentsHonesty(anon);
    assertProjectPeerHonesty(sas);
    assertProjectRelatedThreadsHonesty(sas);
  });

  it('honestly omits relatedAttachments when no entitled attachment exists and keeps relatedProjects / relatedThreads', () => {
    const alone = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch([syn01ProjectRecord(), syn01PeerProjectRecord()], [syn01ThreadRecord()]),
    );
    assert.equal(alone.relatedAttachments, undefined);
    assert.equal('relatedAttachments' in alone, false);
    assert.equal(alone.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(alone.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(alone.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(alone.hubMiRow, true);
    assert.equal(alone.invented, false);
    assertProjectRelatedThreadsHonesty(alone);
    assertProjectPeerHonesty(alone);
  });
});

describe('ATLAS-PROJECT-RELATED-CAPITAL-001 entitled same-scope inverse', () => {
  it('attaches same-scope PREPARE_ONLY relatedCapital on entitled project A and keeps relatedProjects / relatedThreads / relatedAttachments', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [...found.results, syn01ThreadHit(), syn01AttachmentHit(), syn01CapitalHit()],
      }),
    });
    const current = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    const peer = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-done');
    const thread = result.authorizedSearch.threads.items.find((row) => row.id === 'mail-syn-1');
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(current);
    assert.ok(peer);
    assert.ok(thread);
    assert.ok(capital);
    const related = current.relatedCapital?.find((row) => row.id === 'cap-syn-1');
    assert.ok(related);
    assert.equal(related.title, 'SYN01 entitled capital opportunity');
    assert.equal(related.clientCode, 'SYN01');
    assert.equal(related.policyClass, CAPITAL_SUBMISSION_POLICY_CLASS);
    assert.equal(related.financingStatus, CAPITAL_SUBMISSION_FINANCING_STATUS);
    assert.equal(related.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(related.lenderCriteriaInvented, false);
    assert.equal(related.invented, false);
    assert.equal('TargetAmount' in related, false);
    assert.equal('downloadUrl' in related, false);
    assert.equal('hubMiRow' in related, false);
    assert.ok((current.relatedCapital?.length || 0) <= DOCUMENT_RELATED_CONTEXT_PAGE_SIZE);
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(peer.relatedProjects?.some((row) => row.id === 'proj-syn-1'), true);
    assert.equal(current.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(current.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(peer.relatedCapital?.some((row) => row.id === 'cap-syn-1'), true);
    assert.equal(
      /downloadUrl|contentBytes|transcript|attendee|TargetAmount|Hub-MI/i.test(
        JSON.stringify(current.relatedCapital),
      ),
      false,
    );
    assert.equal(JSON.stringify(current.relatedCapital).includes('PDG01'), false);
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(result.authorizedSearch.threads.policyClass, 'DRAFT_ONLY');
    assert.equal(result.authorizedSearch.threads.send, false);
    assertProjectRelatedCapitalHonesty(current);
    assertProjectRelatedAttachmentsHonesty(current);
    assertProjectRelatedThreadsHonesty(current);
    assertProjectPeerHonesty(current);
  });

  it('never attaches Client B capital to a Client A project', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [
          ...found.results,
          syn01ThreadHit(),
          syn01AttachmentHit(),
          syn01CapitalHit(),
          {
            kind: 'capital_opportunity' as const,
            id: 'cap-pdg',
            title: 'PDG01 leak capital',
            href: '/capital?opportunity=cap-pdg',
            source: 'HVCG_CapitalOpportunities',
            clientCode: 'PDG01',
            provenance: 'CONFIRMED' as const,
          },
        ],
      }),
    });
    const current = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(current);
    assert.equal(current.relatedCapital?.some((row) => row.id === 'cap-syn-1'), true);
    assert.equal(
      (current.relatedCapital || []).some(
        (row) => /pdg/i.test(row.id) || /pdg/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(current.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(current.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(current.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    const blob = JSON.stringify(result.authorizedSearch.projects);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('cap-pdg'), false);
    assert.equal(blob.includes('ACCG01'), false);
    assert.equal(blob.includes('CCB01'), false);
    assert.equal(blob.includes('HFD01'), false);
    assert.equal(blob.includes('LIEN01'), false);
    assertProjectRelatedCapitalHonesty(current);

    const mixed = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
        [
          syn01CapitalRecord(),
          syn01CapitalRecord({
            id: 'cap-pdg',
            title: 'PDG01 leak capital',
            clientCode: 'PDG01',
          }),
          syn01CapitalRecord({
            id: 'cap-lender-catalog',
            title: 'Live Oak Bank catalog',
            clientCode: undefined,
          }),
        ],
      ),
    );
    assert.equal(mixed.relatedCapital?.some((row) => row.id === 'cap-syn-1'), true);
    assert.equal(
      (mixed.relatedCapital || []).some(
        (row) => /pdg|live oak/i.test(row.id) || /pdg|live oak/i.test(row.title) || row.clientCode === 'PDG01',
      ),
      false,
    );
    assert.equal(JSON.stringify(mixed.relatedCapital).includes('PDG01'), false);
    assert.equal(JSON.stringify(mixed.relatedCapital).includes('cap-pdg'), false);
    assert.equal(JSON.stringify(mixed.relatedCapital).includes('cap-lender-catalog'), false);
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(mixed.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(mixed.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(mixed.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(mixed.hubMiRow, true);
    assert.equal(mixed.invented, false);
    assertProjectRelatedCapitalHonesty(mixed);
    assertProjectRelatedAttachmentsHonesty(mixed);
    assertProjectRelatedThreadsHonesty(mixed);
    assertProjectPeerHonesty(mixed);
  });

  it('omits relatedCapital when project ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
        [syn01CapitalRecord()],
      ),
    );
    assert.equal(omitted.relatedCapital, undefined);
    assert.equal('relatedCapital' in omitted, false);
    assert.equal(omitted.relatedProjects, undefined);
    assert.equal(omitted.relatedThreads, undefined);
    assert.equal(omitted.relatedAttachments, undefined);
    assert.equal(omitted.hubMiRow, false);
    assert.equal(omitted.invented, false);
  });

  it('omits relatedCapital when project ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-noncanonical',
        clientCode: 'syn01',
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
        [syn01CapitalRecord()],
      ),
    );
    assert.equal(omitted.relatedCapital, undefined);
    assert.equal('relatedCapital' in omitted, false);
    assert.equal(omitted.relatedProjects, undefined);
    assert.equal(omitted.relatedThreads, undefined);
    assert.equal(omitted.relatedAttachments, undefined);
    assert.equal(omitted.invented, false);
  });

  it('unscoped never receives scoped relatedCapital', () => {
    const unscoped = attachRelatedContextToProject(
      manny,
      syn01ProjectRecord({
        id: 'proj-unscoped',
        clientCode: undefined,
        hubMiRow: false,
        operationalized: false,
      }),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
        [syn01CapitalRecord()],
      ),
    );
    assert.equal(unscoped.relatedCapital, undefined);
    assert.equal('relatedCapital' in unscoped, false);
    assert.equal(unscoped.clientCode, undefined);
    assert.equal(unscoped.hubMiRow, false);
    assert.equal(unscoped.invented, false);
  });

  it('omits relatedCapital for unauthorized or other-client principals', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const unknown = await searchAuthorizedKnowledge({
      principal: otherStaff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [...found.results, syn01ThreadHit(), syn01AttachmentHit(), syn01CapitalHit()],
      }),
    });
    assert.equal(unknown.authorizedSearch.projects.items.length, 0);
    assert.equal(
      unknown.authorizedSearch.projects.items.some((row) => row.relatedCapital),
      false,
    );
    const unknownBlob = JSON.stringify(unknown.authorizedSearch.projects);
    assert.equal(unknownBlob.includes('proj-syn-1'), false);
    assert.equal(unknownBlob.includes('cap-syn-1'), false);
    assert.equal(unknownBlob.includes('relatedCapital'), false);
    assert.equal(unknownBlob.includes('PDG01'), false);

    const denied = attachRelatedContextToProject(
      otherStaff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
        [syn01CapitalRecord()],
      ),
    );
    assert.equal(denied.relatedCapital, undefined);
    assert.equal('relatedCapital' in denied, false);
    assert.equal(denied.relatedProjects, undefined);
    assert.equal(denied.relatedThreads, undefined);
    assert.equal(denied.relatedAttachments, undefined);
    assert.equal(denied.hubMiRow, true);
  });

  it('never invents TargetAmount, downloadUrl, Hub-MI, lender criteria, or financing status on relatedCapital', () => {
    const attached = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
        [
          syn01CapitalRecord({
            nextAction: 'Owner review. Do not invent TargetAmount 5000000 or Hub-MI.',
          }),
        ],
      ),
    );
    const related = attached.relatedCapital?.find((row) => row.id === 'cap-syn-1');
    assert.ok(related);
    assert.equal(related.title, 'SYN01 entitled capital opportunity');
    assert.equal(related.clientCode, 'SYN01');
    assert.equal(related.policyClass, CAPITAL_SUBMISSION_POLICY_CLASS);
    assert.equal(related.financingStatus, CAPITAL_SUBMISSION_FINANCING_STATUS);
    assert.equal(related.financingStatusClassification, 'HONEST_EMPTY');
    assert.equal(related.lenderCriteriaInvented, false);
    assert.equal(related.invented, false);
    assert.equal('TargetAmount' in related, false);
    assert.equal('downloadUrl' in related, false);
    assert.equal('contentBytes' in related, false);
    assert.equal('hubMiRow' in related, false);
    assert.equal('fit' in related, false);
    assert.equal(attached.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(attached.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(attached.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(attached.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(
      /TargetAmount|downloadUrl|Hub-MI|contentBytes|5000000|Live Oak/i.test(JSON.stringify(attached.relatedCapital)),
      false,
    );
    assertProjectRelatedCapitalHonesty(attached);
    assertProjectRelatedAttachmentsHonesty(attached);
    assertProjectRelatedThreadsHonesty(attached);
    assertProjectPeerHonesty(attached);
  });

  it('honestly omits relatedCapital when no entitled capital exists and keeps relatedProjects / relatedThreads / relatedAttachments', () => {
    const alone = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord(), syn01PeerProjectRecord()],
        [syn01ThreadRecord()],
        [syn01AttachmentRecord()],
      ),
    );
    assert.equal(alone.relatedCapital, undefined);
    assert.equal('relatedCapital' in alone, false);
    assert.equal(alone.relatedProjects?.some((row) => row.id === 'proj-syn-done'), true);
    assert.equal(alone.relatedProjects?.some((row) => row.id === 'proj-syn-1'), false);
    assert.equal(alone.relatedThreads?.some((row) => row.id === 'mail-syn-1'), true);
    assert.equal(alone.relatedAttachments?.some((row) => row.id === 'mail-att-syn'), true);
    assert.equal(alone.hubMiRow, true);
    assert.equal(alone.invented, false);
    assertProjectRelatedAttachmentsHonesty(alone);
    assertProjectRelatedThreadsHonesty(alone);
    assertProjectPeerHonesty(alone);
  });
});
