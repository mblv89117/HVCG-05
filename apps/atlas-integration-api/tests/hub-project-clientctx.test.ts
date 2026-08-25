/**
 * ATLAS-PROJECT-CLIENTCTX-001
 * Attach the same copied project_operating_record_v1 payload to
 * get_client_context for a bound current entitled client, from
 * already-loaded entitled index rows only. No second CRM, no invented
 * ClientCodes, no Hub-MI, no classification promotion, no HVS folder copy.
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
import {
  getClientContext,
  loadClientContext,
  searchAuthorizedKnowledge,
} from '../src/pm/operatorDesk/toolGateway.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import type { AtlasAuthorizedSearch, AtlasClientContext, OperatorOperatingPicture } from '../src/pm/operatorDesk/types.ts';
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

function noInvent(projects: AtlasClientContext['projects']): void {
  const serialized = JSON.stringify(projects);
  assert.equal(serialized.includes('PDG01'), false);
  assert.equal(serialized.includes('HFD01'), false);
  assert.equal(serialized.includes('Invented leak objective'), false);
  assert.equal(serialized.includes('Uncoded historical folder'), false);
  assert.equal(serialized.includes('HVS engagement without a ClientCode'), false);
}

describe('get_client_context project operating records', () => {
  it('attaches the same copied records as authorizedSearch.projects for a bound current entitled client', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const search = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const viaIndex = getClientContext({
      principal: staff,
      picture: reconstructionPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: found.results,
    });
    assert.equal(viaIndex.clientContext.client.clientCode, 'SYN01');
    assert.equal(viaIndex.clientContext.client.entitled, true);
    assert.equal(viaIndex.clientContext.client.hubMiOperationalized, false);
    assert.deepEqual(viaIndex.clientContext.projects, search.authorizedSearch.projects);
    assert.equal(viaIndex.clientContext.projects.kind, 'project_operating_record_v1');
    assert.equal(viaIndex.clientContext.projects.invented, false);
    assert.equal(viaIndex.clientContext.projects.currentClientsFirst, true);
    const current = viaIndex.clientContext.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(current);
    assert.equal(current.clientCode, 'SYN01');
    assert.equal(current.classification, 'CONFIRMED');
    assert.equal(current.hubMiRow, true);
    assert.equal(current.historicalHvs, false);
    assert.equal(current.objective, 'Close entitled capital package already on HVCG_Projects.');
    assert.equal(current.nextAction, 'Review existing NextAction on the entitled project row.');
    const historical = viaIndex.clientContext.projects.items.find(
      (row) => row.title === 'Recovered SYN01 filename packet',
    );
    assert.ok(historical);
    assert.equal(historical.historicalHvs, true);
    assert.equal(historical.hubMiRow, false);
    assert.equal(historical.operationalized, false);
    assert.equal(historical.classification, 'LIKELY');
    noInvent(viaIndex.clientContext.projects);

    const viaLoad = await loadClientContext({
      principal: staff,
      picture: reconstructionPicture(),
      clientCode: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    assert.deepEqual(viaLoad.clientContext.projects, search.authorizedSearch.projects);
  });

  it('copies entitled same-scope relatedCapital onto client-context projects', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const capitalHit = {
      kind: 'capital_opportunity' as const,
      id: 'cap-syn-1',
      title: 'SYN01 entitled capital opportunity',
      href: '/capital?opportunity=cap-syn-1',
      source: 'HVCG_CapitalOpportunities',
      clientCode: 'SYN01',
      provenance: 'CONFIRMED' as const,
    };
    const hits = [...found.results, capitalHit];
    const search = await searchAuthorizedKnowledge({
      principal: staff,
      picture: reconstructionPicture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: hits }),
    });
    const viaIndex = getClientContext({
      principal: staff,
      picture: reconstructionPicture(),
      clientCode: 'SYN01',
      entitledIndexHits: hits,
    });
    const current = viaIndex.clientContext.projects.items.find((row) => row.id === 'proj-syn-1');
    const searchCurrent = search.authorizedSearch.projects.items.find((row) => row.id === 'proj-syn-1');
    assert.ok(current);
    assert.ok(searchCurrent);
    assert.equal(current.relatedCapital?.some((row) => row.id === 'cap-syn-1'), true);
    assert.deepEqual(current.relatedCapital, searchCurrent.relatedCapital);
    assert.deepEqual(viaIndex.clientContext.projects, search.authorizedSearch.projects);
    assert.equal(current.relatedCapital?.every((row) => row.policyClass === 'PREPARE_ONLY'), true);
    assert.equal(viaIndex.clientContext.capitalSubmissions.policyClass, 'PREPARE_ONLY');
    assert.equal(viaIndex.clientContext.capitalSubmissions.send, false);
    assert.equal(viaIndex.clientContext.capitalSubmissions.externalSubmit, false);
    assert.equal(viaIndex.clientContext.capitalSubmissions.ownerGated, true);
    assert.equal(/TargetAmount|downloadUrl|Hub-MI|5000000/i.test(JSON.stringify(current.relatedCapital)), false);
    noInvent(viaIndex.clientContext.projects);
  });

  it('does not invent ClientCodes, leak foreign rows, or promote recovered LIKELY', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const result = getClientContext({
      principal: staff,
      picture: reconstructionPicture(),
      clientQuery: 'SYN01',
      entitledIndexHits: found.results,
    });
    const completed = result.clientContext.projects.items.find((row) => row.id === 'proj-syn-done');
    assert.ok(completed);
    assert.equal(completed.classification, 'COMPLETE');
    const recovered = result.clientContext.projects.items.find(
      (row) => row.title === 'Recovered SYN01 filename packet',
    );
    assert.ok(recovered);
    assert.equal(recovered.classification, 'LIKELY');
    assert.equal(recovered.classification === 'CONFIRMED', false);
    assert.equal(
      result.clientContext.projects.items.some((row) => row.id === 'proj-pdg-leak'),
      false,
    );
    assert.equal(
      result.clientContext.projects.items.some((row) => !row.clientCode && row.title.includes('without a ClientCode')),
      false,
    );
    noInvent(result.clientContext.projects);
  });

  it('does not attach current Hub-MI project rows for recovered-only or unknown clients', async () => {
    const found = await searchSharePointPm(projectService(), staff, 'SYN01');
    const prodigy = getClientContext({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      clientQuery: 'Prodigy',
      entitledIndexHits: found.results,
    });
    assert.equal(prodigy.clientContext.client.clientCode, 'PDG01');
    assert.equal(prodigy.clientContext.client.hubMiOperationalized, false);
    assert.equal(prodigy.clientContext.projects.items.some((row) => row.hubMiRow), false);
    assert.equal(
      prodigy.clientContext.projects.items.some((row) => row.id === 'proj-syn-1'),
      false,
    );

    const unknown = getClientContext({
      principal: staff,
      picture: reconstructionPicture(),
      clientQuery: 'Globex',
      entitledIndexHits: found.results,
    });
    assert.equal(unknown.clientContext.honestEmpty, true);
    assert.equal(unknown.clientContext.projects.items.length, 0);
    assert.equal(JSON.stringify(unknown).includes('SYN01 capital raise'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);

    const capital = getClientContext({
      principal: staff,
      picture: reconstructionPicture(),
      clientQuery: 'Capital',
      entitledIndexHits: found.results,
    });
    assert.equal(capital.clientContext.honestEmpty, true);
    assert.equal(capital.clientContext.projects.items.length, 0);
    assert.equal(JSON.stringify(capital.clientContext).includes('SYN01'), false);
  });

  it('TAP unsigned /operator/client-context.json and /operator/runtime.json are 401 and leak-free', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-project-clientctx-'));
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
      const unsignedCtx = await fetch(`http://127.0.0.1:${port}/operator/client-context.json?client=SYN01`);
      const ctxText = await unsignedCtx.text();
      const ctxTap =
        unsignedCtx.status === 401 &&
        !/PDG01|HFD01|CCB01|clientContext|authorizedSearch|operatorDesk|relatedCapital/i.test(ctxText);
      assert.equal(unsignedCtx.status, 401, 'not ok 1 - unsigned /operator/client-context.json 401');
      const ctxBody = JSON.parse(ctxText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(ctxBody.error, 'unauthorized');
      assert.equal(ctxBody.clientContext, undefined);
      assert.equal(ctxTap, true, 'not ok 2 - unsigned client-context leaks project payload');

      const unsignedRuntime = await fetch(
        `http://127.0.0.1:${port}/operator/runtime.json?question=${encodeURIComponent('Summarize SYN01')}`,
      );
      const runtimeText = await unsignedRuntime.text();
      const runtimeTap =
        unsignedRuntime.status === 401 &&
        !/PDG01|HFD01|CCB01|clientContext|authorizedSearch|operatorDesk/i.test(runtimeText);
      assert.equal(unsignedRuntime.status, 401, 'not ok 3 - unsigned /operator/runtime.json 401');
      const runtimeBody = JSON.parse(runtimeText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(runtimeBody.error, 'unauthorized');
      assert.equal(runtimeBody.clientContext, undefined);
      assert.equal(runtimeTap, true, 'not ok 4 - unsigned runtime leaks project payload');

      const unsignedSearch = await fetch(`http://127.0.0.1:${port}/operator/search.json?q=SYN01`);
      const searchText = await unsignedSearch.text();
      const searchTap =
        unsignedSearch.status === 401 && !/PDG01|HFD01|CCB01|authorizedSearch|operatorDesk/i.test(searchText);
      assert.equal(unsignedSearch.status, 401, 'not ok 5 - unsigned /operator/search.json 401');
      const searchBody = JSON.parse(searchText) as { error?: string; authorizedSearch?: AtlasAuthorizedSearch };
      assert.equal(searchBody.error, 'unauthorized');
      assert.equal(searchBody.authorizedSearch, undefined);
      assert.equal(searchTap, true, 'not ok 6 - unsigned search leaks project payload');
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
