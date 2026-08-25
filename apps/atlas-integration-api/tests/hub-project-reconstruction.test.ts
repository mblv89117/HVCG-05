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
import { attachRelatedContextToProject } from '../src/pm/operatorDesk/documentRelatedContext.ts';
import { emptyCapitalSubmissionPayload } from '../src/pm/operatorDesk/capitalSubmissionPrepare.ts';
import { emptyMailThreadPayload } from '../src/pm/operatorDesk/mailThreadContext.ts';
import { emptyResearchIntelligencePayload } from '../src/pm/operatorDesk/researchIntelligence.ts';
import { emptyOnboardingPayload } from '../src/pm/operatorDesk/onboardingAgent.ts';
import { emptyClientSupportPayload } from '../src/pm/operatorDesk/clientSupportAgent.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type CapitalSubmissionPrepareRecord,
  type OperatorOperatingPicture,
  type ProjectOperatingRecord,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const SOURCE =
  'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-Clients/HVCG_SYN01/engagement-sow.pdf';

const staff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['SYN01'],
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
        !/PDG01|HFD01|CCB01|authorizedSearch|operatorDesk|relatedCapital/i.test(text);
      assert.equal(unsigned.status, 401, 'not ok 1 - unsigned /operator/search.json 401');
      const body = JSON.parse(text) as { error?: string; authorizedSearch?: AtlasAuthorizedSearch };
      assert.equal(body.error, 'unauthorized');
      assert.equal(body.authorizedSearch, undefined);
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

const otherStaff: AtlasPrincipal = {
  userId: '22222222-2222-4222-8222-bbbbbbbbbb02',
  organizationId: 'org-hvcg',
  allowedClientIds: ['ZZZ99'],
  roles: ['HVCG Team Member'],
};

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

function syn01CapitalRecord(
  overrides: Partial<CapitalSubmissionPrepareRecord> = {},
): CapitalSubmissionPrepareRecord {
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
  capital: CapitalSubmissionPrepareRecord[] = [],
): AtlasAuthorizedSearch {
  return {
    kind: 'atlas_authorized_search_v1',
    invented: false,
    honestEmpty: false,
    query: 'SYN01',
    hitCount: 0,
    hits: [],
    documents: {
      kind: 'document_operating_record_v1',
      policyClass: 'READ_AUTO',
      binariesInAtlas: false,
      items: [],
    },
    projects: {
      kind: 'project_operating_record_v1',
      policyClass: 'READ_AUTO',
      invented: false,
      currentClientsFirst: true,
      items: projects,
    },
    threads: emptyMailThreadPayload(),
    capitalSubmissions: {
      ...emptyCapitalSubmissionPayload(),
      items: capital,
    },
    researchIntelligence: emptyResearchIntelligencePayload('2026-08-25T06:00:00.000Z'),
    onboarding: emptyOnboardingPayload(),
    clientSupport: emptyClientSupportPayload(),
    classification: 'CONFIRMED',
    why: 'test',
    basedOn: 'test',
    entitled: true,
    ran: true,
    pictureComposed: true,
    actionabilityApplied: false,
  };
}

describe('ATLAS-PROJECT-RELATED-CAPITAL-001 entitled same-scope inverse', () => {
  it('attaches same-scope PREPARE_ONLY relatedCapital on entitled project A', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({
        query,
        results: [...found.results, syn01CapitalHit()],
      }),
    });
    const current = result.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    const capital = result.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(current);
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
    assert.equal(result.authorizedSearch.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(result.authorizedSearch.capitalSubmissions.send, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.externalSubmit, false);
    assert.equal(result.authorizedSearch.capitalSubmissions.ownerGated, true);
    assert.equal(JSON.stringify(current.relatedCapital).includes('PDG01'), false);
    assert.equal(/TargetAmount|downloadUrl|Hub-MI|contentBytes|5000000/i.test(JSON.stringify(current.relatedCapital)), false);
  });

  it('never attaches Client B capital to a Client A project', () => {
    const mixed = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch(
        [syn01ProjectRecord()],
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
  });

  it('omits relatedCapital when project ClientCode is missing rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord({ id: 'proj-unscoped', clientCode: undefined, hubMiRow: false, operationalized: false }),
      emptyRelatedSearch([syn01ProjectRecord()], [syn01CapitalRecord()]),
    );
    assert.equal(omitted.relatedCapital, undefined);
    assert.equal('relatedCapital' in omitted, false);
  });

  it('omits relatedCapital when project ClientCode is non-canonical rather than guessing', () => {
    const omitted = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord({ id: 'proj-noncanonical', clientCode: 'syn01', hubMiRow: false, operationalized: false }),
      emptyRelatedSearch([syn01ProjectRecord()], [syn01CapitalRecord()]),
    );
    assert.equal(omitted.relatedCapital, undefined);
    assert.equal('relatedCapital' in omitted, false);
  });

  it('omits relatedCapital for unauthorized principals', () => {
    const denied = attachRelatedContextToProject(
      otherStaff,
      syn01ProjectRecord(),
      emptyRelatedSearch([syn01ProjectRecord()], [syn01CapitalRecord()]),
    );
    assert.equal(denied.relatedCapital, undefined);
    assert.equal('relatedCapital' in denied, false);
  });

  it('honestly omits relatedCapital when no entitled capital exists', () => {
    const alone = attachRelatedContextToProject(
      staff,
      syn01ProjectRecord(),
      emptyRelatedSearch([syn01ProjectRecord()]),
    );
    assert.equal(alone.relatedCapital, undefined);
    assert.equal('relatedCapital' in alone, false);
    assert.equal(alone.hubMiRow, true);
    assert.equal(alone.invented, false);
  });
});
