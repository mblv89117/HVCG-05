/**
 * ATLAS-RESEARCH-INTELLIGENCE-001
 * Smallest Hub increment: source-backed research intelligence from
 * already-entitled Atlas/index evidence and the existing sourced lender
 * catalog titles. Stores source, retrieval date, confidence, superseded.
 * Never invent lender criteria or financing status. No live scrape / GTM.
 * Authorization before retrieval. No cross-client leak.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CATALOG_VERIFIED_AT } from '@hvcg/atlas-capital-core';
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
import {
  composeResearchIntelligence,
  refreshResearchIntelligence,
  researchIntelligenceHasInventedFacts,
} from '../src/pm/operatorDesk/researchIntelligence.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_RESEARCH_INTELLIGENCE_MISSION_KEY,
  RESEARCH_INTELLIGENCE_FINANCING_STATUS,
  RESEARCH_INTELLIGENCE_FIT,
  RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH,
  RESEARCH_INTELLIGENCE_POLICY_CLASS,
  type AtlasAuthorizedSearch,
  type AtlasAuthorizedSearchHit,
  type AtlasClientContext,
  type OperatorOperatingPicture,
  type ResearchIntelligenceRecord,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';

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

const emptyCollection = {
  communications: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  meetings: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  engagements: { queried: true, status: 'COMPLETE' as const, items: [] },
  deliverables: { queried: true, status: 'COMPLETE' as const, items: [] as Array<Record<string, unknown>> },
  decisionsRisks: { queried: true, status: 'COMPLETE' as const, items: [] },
  contacts: { queried: true, status: 'COMPLETE' as const, items: [] },
};

function researchService(): SearchPmService {
  return {
    async listAuthorizedClients() {
      return [
        {
          id: 'SYN01',
          itemId: '1',
          clientCode: 'SYN01',
          displayName: 'SYNTHETIC Alpha Co',
          source: 'sharepoint',
          industry: 'Food Manufacturing',
        },
      ];
    },
    async listAuthorizedProjects() {
      return [];
    },
    async listAuthorizedTasks() {
      return [];
    },
    async listWorkspaceCollections() {
      return emptyCollection;
    },
    async listOpportunities() {
      return [];
    },
    async listIndexedFiles() {
      return [];
    },
    async listVendors() {
      return [{ id: 'vnd-1', title: 'SYNTHETIC VendorCo', notes: 'tenant vendor', category: 'Ops' }];
    },
    async listLenders() {
      return [
        { id: 'ln-liveoak', title: 'Live Oak Bank', notes: 'Existing entitled catalog title' },
        { id: 'ln-invent', title: 'Invented Lender LTV 80', notes: 'must not leak as criteria' },
      ];
    },
  };
}

function picture(): OperatorOperatingPicture {
  return {
    ...emptyHonestOperatingPicture(),
    hvsRecoveredClients: [
      {
        client: 'SYNTHETIC Alpha Co',
        clientCode: 'SYN01',
        provenance: 'CONFIRMED',
        operationalized: false,
        hubMiAccessible: false,
        knowledgeIndexed: true,
        documentCount: 1,
        documentClasses: ['capital_package'],
        nextAction: 'Review recovered capital-packet filename.',
      },
    ],
  };
}

function noInventedCriteria(value: unknown): void {
  const serialized = JSON.stringify(value);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/best[_ ]?fit/i.test(serialized), false);
  assert.equal(/credit box/i.test(serialized), false);
  assert.equal(/FundingStatus["']?\s*:\s*["'](?:Committed|Closed|Funded)/i.test(serialized), false);
}

function assertSourceBacked(
  payload: AtlasClientContext['researchIntelligence'] | AtlasAuthorizedSearch['researchIntelligence'],
): void {
  assert.equal(payload.kind, 'research_intelligence_v1');
  assert.equal(payload.policyClass, RESEARCH_INTELLIGENCE_POLICY_CLASS);
  assert.equal(payload.outboundRefresh, RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH);
  assert.equal(payload.invented, false);
  assert.equal(payload.lenderCriteriaInvented, false);
  assert.equal(payload.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
  assert.equal(researchIntelligenceHasInventedFacts(payload), false);
  for (const row of payload.items) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, RESEARCH_INTELLIGENCE_FINANCING_STATUS);
    assert.equal(row.fit, RESEARCH_INTELLIGENCE_FIT);
    assert.ok(row.source.trim());
    assert.ok(row.retrievalDate.trim());
    assert.ok(row.confidence);
    assert.equal(typeof row.superseded, 'boolean');
  }
}

describe('ATLAS-RESEARCH-INTELLIGENCE-001 source-backed research records', () => {
  it('keeps research intelligence SOURCE_BACKED_ONLY with no outbound refresh', () => {
    assert.equal(ASK_ATLAS_RESEARCH_INTELLIGENCE_MISSION_KEY, 'ATLAS-RESEARCH-INTELLIGENCE-001');
    assert.equal(RESEARCH_INTELLIGENCE_POLICY_CLASS, 'SOURCE_BACKED_ONLY');
    assert.equal(RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH, false);
    assert.equal(RESEARCH_INTELLIGENCE_FINANCING_STATUS, 'UNKNOWN');
    assert.equal(RESEARCH_INTELLIGENCE_FIT, 'NOT_EVALUATED');
  });

  it('stores source, retrieval date, confidence, and superseded from entitled evidence', async () => {
    const found = await searchSharePointPm(researchService(), staff, 'SYN01');
    const clientHit = found.results.find((row) => row.kind === 'client' && row.clientCode === 'SYN01');
    assert.ok(clientHit);
    assert.equal(clientHit.industry, 'Food Manufacturing');
    assert.equal(found.results.some((row) => row.kind === 'lender'), false);
    assert.equal(found.results.some((row) => row.kind === 'vendor'), false);

    const retrievedAt = '2026-08-24T09:51:00.000Z';
    const search = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      now: retrievedAt,
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const viaIndex = getClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      now: retrievedAt,
      entitledIndexHits: found.results,
    });
    assert.deepEqual(viaIndex.clientContext.researchIntelligence, search.authorizedSearch.researchIntelligence);
    assertSourceBacked(search.authorizedSearch.researchIntelligence);

    const client = search.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'client' && row.clientCode === 'SYN01',
    );
    assert.ok(client);
    assert.equal(client.source, 'HVCG_Clients');
    assert.equal(client.retrievalDate, retrievedAt);
    assert.equal(client.superseded, false);
    assert.equal(client.financingStatus, 'UNKNOWN');

    const industry = search.authorizedSearch.researchIntelligence.items.find(
      (row) => row.subjectKind === 'industry' && row.title === 'Food Manufacturing',
    );
    assert.ok(industry);
    assert.equal(industry.source, 'HVCG_Clients');
    assert.equal(industry.clientCode, 'SYN01');
    assert.equal(industry.lenderCriteriaInvented, false);

    noInventedCriteria(search.authorizedSearch.researchIntelligence);

    const viaLoad = await loadClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      now: retrievedAt,
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    assert.deepEqual(viaLoad.clientContext.researchIntelligence, search.authorizedSearch.researchIntelligence);
  });

  it('copies entitled lender/vendor titles and supersedes older catalog retrievals without inventing fit', async () => {
    const unknown = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Globex',
      entitledIndexHits: [
        {
          kind: 'client',
          id: 'SYN01',
          title: 'SYN01 · SYNTHETIC Alpha Co',
          href: '/clients/SYN01',
          source: 'HVCG_Clients',
          clientCode: 'SYN01',
          industry: 'Food Manufacturing',
        },
      ],
    });
    assert.equal(unknown.clientContext.honestEmpty, true);
    assert.equal(unknown.clientContext.researchIntelligence.items.length, 0);
    assert.equal(JSON.stringify(unknown).includes('Food Manufacturing'), false);

    const leak = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async () => ({
        query: 'SYN01',
        results: [
          {
            kind: 'client' as const,
            id: 'PDG01',
            title: 'PDG01 must not leak',
            href: '/clients/PDG01',
            source: 'HVCG_Clients',
            clientCode: 'PDG01',
            industry: 'Hidden Industry',
          },
        ],
      }),
    });
    assert.equal(JSON.stringify(leak.authorizedSearch.researchIntelligence).includes('PDG01'), false);
    assert.equal(JSON.stringify(leak.authorizedSearch.researchIntelligence).includes('Hidden Industry'), false);
    assertSourceBacked(leak.authorizedSearch.researchIntelligence);

    const catalog = await searchAuthorizedKnowledge({
      principal: manny,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Live Oak',
      now: '2026-08-24T12:00:00.000Z',
      entitledSearch: async () => ({
        query: 'Live Oak',
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-liveoak',
            title: 'Live Oak Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
            modifiedAt: '2026-08-24T12:00:00.000Z',
          },
          {
            kind: 'vendor' as const,
            id: 'vnd-1',
            title: 'SYNTHETIC VendorCo',
            href: '/procurement',
            source: 'HVCG_Vendors',
          },
        ],
      }),
    });
    assertSourceBacked(catalog.authorizedSearch.researchIntelligence);
    const lenders = catalog.authorizedSearch.researchIntelligence.items.filter((row) => row.subjectKind === 'lender');
    assert.ok(lenders.some((row) => row.title === 'Live Oak Bank' && row.source === 'HVCG_Lenders' && row.superseded === false));
    const catalogCopy = lenders.find((row) => row.id === 'lender:ln-catalog-liveoak');
    assert.ok(catalogCopy);
    assert.equal(catalogCopy.retrievalDate, CATALOG_VERIFIED_AT);
    assert.equal(catalogCopy.superseded, true);
    assert.equal(catalogCopy.fit, 'NOT_EVALUATED');
    assert.equal(catalogCopy.lenderCriteriaInvented, false);
    const vendor = catalog.authorizedSearch.researchIntelligence.items.find((row) => row.subjectKind === 'vendor');
    assert.ok(vendor);
    assert.equal(vendor.title, 'SYNTHETIC VendorCo');
    assert.equal(vendor.source, 'HVCG_Vendors');
    noInventedCriteria(catalog.authorizedSearch.researchIntelligence);
  });

  it('marks older same-key research superseded on refresh and never invents investor criteria', () => {
    const first: ResearchIntelligenceRecord = {
      id: 'lender:ln-1',
      subjectKind: 'lender',
      title: 'Live Oak Bank',
      source: 'HVCG_Lenders',
      retrievalDate: '2026-08-18T00:00:00.000Z',
      confidence: 'CONFIRMED',
      superseded: false,
      classification: 'CONFIRMED',
      invented: false,
      lenderCriteriaInvented: false,
      financingStatus: 'UNKNOWN',
      fit: 'NOT_EVALUATED',
      evidence: 'Copied entitled HVCG_Lenders title. Lender criteria and financing status were not invented.',
    };
    const second: ResearchIntelligenceRecord = {
      ...first,
      id: 'lender:ln-1:refresh',
      retrievalDate: '2026-08-24T12:00:00.000Z',
    };
    const refreshed = refreshResearchIntelligence([first], [second]);
    assert.equal(refreshed.filter((row) => !row.superseded).length, 1);
    assert.equal(refreshed.find((row) => !row.superseded)?.retrievalDate, '2026-08-24T12:00:00.000Z');
    assert.equal(refreshed.find((row) => row.superseded)?.supersededBy, 'lender:ln-1:refresh');

    const composed = composeResearchIntelligence(
      [
        {
          kind: 'investor',
          id: 'inv-1',
          title: 'Family office intro',
          source: 'HVCG_CapitalSources',
          why: 'entitled',
          basedOn: 'entitled',
          provenance: 'CONFIRMED',
          classification: 'CONFIRMED',
        } satisfies AtlasAuthorizedSearchHit,
      ],
      '2026-08-24T12:00:00.000Z',
    );
    assertSourceBacked(composed);
    assert.equal(composed.items[0]?.subjectKind, 'investor');
    assert.equal(composed.items[0]?.financingStatus, 'UNKNOWN');
    assert.equal(composed.items[0]?.fit, 'NOT_EVALUATED');
    noInventedCriteria(composed);
  });

  it('TAP unsigned /operator/search.json, client-context.json, and runtime.json are 401 and leak-free', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-research-intel-'));
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
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
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
      const unsignedSearch = await fetch(`http://127.0.0.1:${port}/operator/search.json?q=SYN01`);
      const searchText = await unsignedSearch.text();
      assert.equal(unsignedSearch.status, 401);
      const searchBody = JSON.parse(searchText) as { error?: string; authorizedSearch?: AtlasAuthorizedSearch };
      assert.equal(searchBody.error, 'unauthorized');
      assert.equal(searchBody.authorizedSearch, undefined);
      assert.equal(/researchIntelligence|Food Manufacturing|SOURCE_BACKED_ONLY|clientContext|authorizedSearch/i.test(searchText), false);

      const unsignedCtx = await fetch(`http://127.0.0.1:${port}/operator/client-context.json?client=SYN01`);
      const ctxText = await unsignedCtx.text();
      assert.equal(unsignedCtx.status, 401);
      const ctxBody = JSON.parse(ctxText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(ctxBody.error, 'unauthorized');
      assert.equal(ctxBody.clientContext, undefined);
      assert.equal(/researchIntelligence|Food Manufacturing|SOURCE_BACKED_ONLY|clientContext/i.test(ctxText), false);

      const unsignedRuntime = await fetch(
        `http://127.0.0.1:${port}/operator/runtime.json?question=${encodeURIComponent('Research SYN01 lenders')}`,
      );
      const runtimeText = await unsignedRuntime.text();
      assert.equal(unsignedRuntime.status, 401);
      const runtimeBody = JSON.parse(runtimeText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(runtimeBody.error, 'unauthorized');
      assert.equal(runtimeBody.clientContext, undefined);
      assert.equal(/researchIntelligence|Food Manufacturing|SOURCE_BACKED_ONLY|operatorDesk/i.test(runtimeText), false);
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
