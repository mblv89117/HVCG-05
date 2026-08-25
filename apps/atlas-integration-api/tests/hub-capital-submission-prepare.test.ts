/**
 * ATLAS-CAPITAL-SUBMISSION-PREPARE-001
 * Smallest Hub increment: PREPARE-only capital submission request from
 * already-entitled Atlas/index evidence. External lender/investor submit
 * stays OWNER-GATED. Never invent lender criteria or financing status.
 * Authorization before retrieval. No cross-client leak.
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
import { capitalSubmissionPayloadHasInventedFacts } from '../src/pm/operatorDesk/capitalSubmissionPrepare.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_CAPITAL_SUBMISSION_PREPARE_MISSION_KEY,
  CAPITAL_SUBMISSION_EXTERNAL_SUBMIT,
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_FIT,
  CAPITAL_SUBMISSION_OWNER_GATED,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  CAPITAL_SUBMISSION_SEND,
  type AtlasAuthorizedSearch,
  type AtlasClientContext,
  type OperatorOperatingPicture,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

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

function capitalService(): SearchPmService {
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
      return [];
    },
    async listAuthorizedTasks() {
      return [];
    },
    async listWorkspaceCollections() {
      return emptyCollection;
    },
    async listCapitalOpportunities() {
      return [
        {
          id: 'cap-syn-1',
          title: 'SYN01 entitled capital opportunity',
          clientCode: 'SYN01',
          notes: 'Existing entitled row. Do not invent criteria.',
          projectId: 'proj-syn-1',
        },
        {
          id: 'cap-pdg-leak',
          title: 'PDG01 must not leak',
          clientCode: 'PDG01',
          notes: 'Invented Live Oak credit box',
        },
      ];
    },
    async listLenders() {
      return [{ id: 'ln-leak', title: 'Invented lender', notes: 'LTV 80' }];
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
    hvsRecoveredCapitalPackets: [
      {
        client: 'SYNTHETIC Alpha Co',
        clientCode: 'SYN01',
        name: 'SYN01_capital_packet.pdf',
        provenance: 'CONFIRMED',
        queue: 'Needs Action',
        amountsExtracted: false,
        nextAction: 'Review recovered capital-packet filename. Amounts were not extracted.',
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
  assert.equal(serialized.includes('Hub-MI'), false);
  assert.equal(/FundingStatus["']?\s*:\s*["'](?:Committed|Closed|Funded)/i.test(serialized), false);
}

function assertPrepareOnly(
  payload: AtlasClientContext['capitalSubmissions'] | AtlasAuthorizedSearch['capitalSubmissions'],
): void {
  assert.equal(payload.kind, 'capital_submission_request_v1');
  assert.equal(payload.policyClass, CAPITAL_SUBMISSION_POLICY_CLASS);
  assert.equal(payload.send, CAPITAL_SUBMISSION_SEND);
  assert.equal(payload.externalSubmit, CAPITAL_SUBMISSION_EXTERNAL_SUBMIT);
  assert.equal(payload.ownerGated, CAPITAL_SUBMISSION_OWNER_GATED);
  assert.equal(payload.invented, false);
  assert.equal(CAPITAL_SUBMISSION_SEND, false);
  assert.equal(CAPITAL_SUBMISSION_EXTERNAL_SUBMIT, false);
  assert.equal(CAPITAL_SUBMISSION_OWNER_GATED, true);
  assert.equal(capitalSubmissionPayloadHasInventedFacts(payload), false);
  for (const row of payload.items) {
    assert.equal(row.invented, false);
    assert.equal(row.lenderCriteriaInvented, false);
    assert.equal(row.financingStatus, CAPITAL_SUBMISSION_FINANCING_STATUS);
    assert.equal(row.financingStatusClassification, 'HONEST_EMPTY');
    assert.match(row.nextAction, /owner-gated/i);
    assert.equal(/has been (?:sent|filed|emailed)/i.test(row.nextAction), false);
  }
  for (const copy of payload.catalogCopies) {
    assert.equal(copy.invented, false);
    assert.equal(copy.criteriaInvented, false);
    assert.equal(copy.fit, CAPITAL_SUBMISSION_FIT);
  }
}

describe('ATLAS-CAPITAL-SUBMISSION-PREPARE-001 prepare-only capital request', () => {
  it('keeps capital submission policy PREPARE_ONLY and owner-gated', () => {
    assert.equal(ASK_ATLAS_CAPITAL_SUBMISSION_PREPARE_MISSION_KEY, 'ATLAS-CAPITAL-SUBMISSION-PREPARE-001');
    assert.equal(CAPITAL_SUBMISSION_POLICY_CLASS, 'PREPARE_ONLY');
    assert.equal(CAPITAL_SUBMISSION_SEND, false);
    assert.equal(CAPITAL_SUBMISSION_EXTERNAL_SUBMIT, false);
    assert.equal(CAPITAL_SUBMISSION_OWNER_GATED, true);
    assert.equal(CAPITAL_SUBMISSION_FINANCING_STATUS, 'UNKNOWN');
    assert.equal(CAPITAL_SUBMISSION_FIT, 'NOT_EVALUATED');
  });

  it('attaches the same PREPARE records on search and client-context from entitled evidence', async () => {
    const found = await searchSharePointPm(capitalService(), staff, 'SYN01');
    const capHit = found.results.find((row) => row.id === 'cap-syn-1');
    assert.ok(capHit);
    assert.equal(capHit.kind, 'capital_opportunity');
    assert.equal(capHit.clientCode, 'SYN01');
    assert.equal(found.results.some((row) => row.id === 'cap-pdg-leak'), false);
    assert.equal(found.results.some((row) => row.kind === 'lender'), false);

    const search = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    const viaIndex = getClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      entitledIndexHits: found.results,
    });
    assert.deepEqual(viaIndex.clientContext.capitalSubmissions, search.authorizedSearch.capitalSubmissions);
    assertPrepareOnly(search.authorizedSearch.capitalSubmissions);

    const opportunity = search.authorizedSearch.capitalSubmissions.items.find((row) => row.id === 'cap-syn-1');
    assert.ok(opportunity);
    assert.equal(opportunity.clientCode, 'SYN01');
    assert.equal(opportunity.classification, 'CONFIRMED');
    assert.equal(opportunity.financingStatus, 'UNKNOWN');
    assert.equal(opportunity.evidence[0]?.source, 'HVCG_CapitalOpportunities');

    const packet = search.authorizedSearch.capitalSubmissions.items.find(
      (row) => row.id === 'picture:capital:SYN01:SYN01_capital_packet.pdf',
    );
    assert.ok(packet);
    assert.equal(packet.classification, 'CONFIRMED');
    assert.match(packet.missingRequirements.join(' '), /Filename-only recovered capital packet/);

    noInventedCriteria(search.authorizedSearch.capitalSubmissions);
    assert.equal(search.authorizedSearch.capitalSubmissions.catalogCopies.length, 0);

    const viaLoad = await loadClientContext({
      principal: staff,
      picture: picture(),
      clientCode: 'SYN01',
      entitledSearch: async (query) => ({ query, results: found.results }),
    });
    assert.deepEqual(viaLoad.clientContext.capitalSubmissions, search.authorizedSearch.capitalSubmissions);
  });

  it('copies entitled lender catalog titles without inventing fit or leaking foreign capital', async () => {
    const found = await searchSharePointPm(capitalService(), staff, 'SYN01');
    const unknown = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Globex',
      entitledIndexHits: found.results,
    });
    assert.equal(unknown.clientContext.honestEmpty, true);
    assert.equal(unknown.clientContext.capitalSubmissions.items.length, 0);
    assert.equal(JSON.stringify(unknown).includes('cap-syn-1'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);

    const reserved = getClientContext({
      principal: staff,
      picture: picture(),
      clientQuery: 'Capital',
      entitledIndexHits: found.results,
    });
    assert.equal(reserved.clientContext.capitalSubmissions.items.length, 0);

    const leak = await searchAuthorizedKnowledge({
      principal: staff,
      picture: picture(),
      searchQuery: 'SYN01',
      entitledSearch: async () => ({
        query: 'SYN01',
        results: [
          ...found.results,
          {
            kind: 'capital_opportunity' as const,
            id: 'cap-pdg-leak',
            title: 'PDG01 must not leak',
            href: '/capital?opportunity=cap-pdg-leak',
            source: 'HVCG_CapitalOpportunities',
            clientCode: 'PDG01',
          },
        ],
      }),
    });
    assert.equal(JSON.stringify(leak.authorizedSearch.capitalSubmissions).includes('PDG01'), false);
    assert.equal(leak.authorizedSearch.capitalSubmissions.items.some((row) => row.id === 'cap-pdg-leak'), false);
    assertPrepareOnly(leak.authorizedSearch.capitalSubmissions);

    const catalog = await searchAuthorizedKnowledge({
      principal: staff,
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'lender packet',
      entitledSearch: async () => ({
        query: 'lender packet',
        results: [
          {
            kind: 'lender' as const,
            id: 'ln-catalog-1',
            title: 'SYNTHETIC Bank',
            href: '/capital',
            source: 'HVCG_Lenders',
          },
          {
            kind: 'capital_opportunity' as const,
            id: 'cap-syn-1',
            title: 'SYN01 entitled capital opportunity',
            href: '/capital?opportunity=cap-syn-1',
            source: 'HVCG_CapitalOpportunities',
            clientCode: 'SYN01',
          },
        ],
      }),
    });
    assertPrepareOnly(catalog.authorizedSearch.capitalSubmissions);
    assert.equal(catalog.authorizedSearch.capitalSubmissions.catalogCopies.length, 1);
    assert.equal(catalog.authorizedSearch.capitalSubmissions.catalogCopies[0]?.lenderName, 'SYNTHETIC Bank');
    assert.equal(catalog.authorizedSearch.capitalSubmissions.catalogCopies[0]?.fit, 'NOT_EVALUATED');
    assert.equal(catalog.authorizedSearch.capitalSubmissions.catalogCopies[0]?.criteriaInvented, false);
    noInventedCriteria(catalog.authorizedSearch.capitalSubmissions);
  });

  it('TAP unsigned /operator/search.json, client-context.json, and runtime.json are 401 and leak-free', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-capital-submission-'));
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
      const unsignedSearch = await fetch(`http://127.0.0.1:${port}/operator/search.json?q=SYN01`);
      const searchText = await unsignedSearch.text();
      assert.equal(unsignedSearch.status, 401);
      const searchBody = JSON.parse(searchText) as { error?: string; authorizedSearch?: AtlasAuthorizedSearch };
      assert.equal(searchBody.error, 'unauthorized');
      assert.equal(searchBody.authorizedSearch, undefined);
      assert.equal(/capitalSubmissions|cap-syn-1|PREPARE_ONLY|clientContext|authorizedSearch/i.test(searchText), false);

      const unsignedCtx = await fetch(`http://127.0.0.1:${port}/operator/client-context.json?client=SYN01`);
      const ctxText = await unsignedCtx.text();
      assert.equal(unsignedCtx.status, 401);
      const ctxBody = JSON.parse(ctxText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(ctxBody.error, 'unauthorized');
      assert.equal(ctxBody.clientContext, undefined);
      assert.equal(/capitalSubmissions|cap-syn-1|PREPARE_ONLY|clientContext/i.test(ctxText), false);

      const unsignedRuntime = await fetch(
        `http://127.0.0.1:${port}/operator/runtime.json?question=${encodeURIComponent('Prepare SYN01 capital submission')}`,
      );
      const runtimeText = await unsignedRuntime.text();
      assert.equal(unsignedRuntime.status, 401);
      const runtimeBody = JSON.parse(runtimeText) as { error?: string; clientContext?: AtlasClientContext };
      assert.equal(runtimeBody.error, 'unauthorized');
      assert.equal(runtimeBody.clientContext, undefined);
      assert.equal(/capitalSubmissions|cap-syn-1|PREPARE_ONLY|operatorDesk/i.test(runtimeText), false);
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
