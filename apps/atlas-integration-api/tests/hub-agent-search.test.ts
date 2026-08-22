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
import {
  appendAskAtlasActivity,
  readAgentActivityOverlay,
} from '../src/pm/operatorDesk/activityLedger.ts';
import {
  isOwnerGatedQuestion,
  mapsToGetAttentionItems,
  mapsToGetClientContext,
  mapsToSearchAuthorizedKnowledge,
  runAtlasHubRuntime,
  runAtlasSearchRuntime,
} from '../src/pm/operatorDesk/agentRuntime.ts';
import {
  invokeReadAutoTool,
  READ_AUTO_TOOL_NAMES,
  searchAuthorizedKnowledge,
} from '../src/pm/operatorDesk/toolGateway.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_CLIENTCTX_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  ASK_ATLAS_SEARCH_002_MISSION_KEY,
  ASK_ATLAS_SEARCH_MISSION_KEY,
  GET_ATTENTION_ITEMS_TOOL,
  GET_CLIENT_CONTEXT_TOOL,
  GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL,
  isOperatorClientContextPath,
  isOperatorRuntimePath,
  isOperatorSearchPath,
  type AskAtlasAnswer,
  type AtlasAuthorizedSearch,
  type AtlasAuthorizedSearchHit,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { PmSearchHit } from '../src/pm/sharepoint/search.ts';

const AMOUNT = /\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/;
const LEAK_MARKERS = [
  'Prodigy Games',
  'Colorado Beef',
  'Hart Family',
  'PDG01',
  'CCB01',
  'HFD01',
  'askAtlas',
  'agentActivity',
  'runtime',
  'authorizedSearch',
  'operatorDesk',
  '250000',
  'Hub-MI',
];

function staffPrincipal(userId = 'search-writer', allowedClientIds = ['SYN01']): AtlasPrincipal {
  return {
    userId,
    organizationId: 'org-hvcg',
    allowedClientIds,
    roles: ['HVCG Team Member'],
  };
}

function clientPrincipal(): AtlasPrincipal {
  return {
    userId: 'client-exec',
    organizationId: 'org-hvcg',
    allowedClientIds: ['SYN01'],
    roles: ['Client Executive'],
  };
}

function leakFree(body: string): void {
  for (const marker of LEAK_MARKERS) {
    assert.equal(body.includes(marker), false, `unsigned/forbidden body leaked ${marker}`);
  }
  assert.equal(body.includes('$'), false);
  assert.equal(AMOUNT.test(body), false);
  assert.equal(/\bltv\s*[:=]\s*\d/i.test(body), false);
}

function noInventedFacts(value: unknown): void {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes('$'), false);
  assert.equal(AMOUNT.test(serialized), false);
  assert.equal(/\bltv\s*[:=]\s*\d/i.test(serialized), false);
  assert.equal(serialized.includes('Hub-MI'), false);
}

function assertGroundedHit(hit: AtlasAuthorizedSearchHit): void {
  assert.ok(hit.why.trim().length > 0, 'hit missing why');
  assert.ok(hit.basedOn.trim().length > 0, 'hit missing basedOn');
  assert.ok(
    hit.classification === 'CONFIRMED' || hit.classification === 'LIKELY' || hit.classification === 'PROPOSED',
    `hit classification ${hit.classification} is not preserved evidence`,
  );
  assert.equal(hit.classification, hit.provenance);
}

function assertOnlyBoundClient(value: unknown, clientCode: string): void {
  const serialized = JSON.stringify(value);
  assert.equal(serialized.includes('CCB01'), false);
  assert.equal(serialized.includes('Colorado Beef'), false);
  assert.equal(serialized.includes('HFD01'), false);
  assert.equal(serialized.includes('Hart Family'), false);
  const hits = (value as { authorizedSearch?: AtlasAuthorizedSearch }).authorizedSearch?.hits || [];
  assert.ok(hits.every((hit) => !hit.clientCode || hit.clientCode === clientCode));
}

function prodigyHit(): PmSearchHit {
  return {
    kind: 'document',
    id: 'doc-pdg-1',
    title: 'Prodigy engagement note',
    href: '/clients/PDG01',
    source: 'HVCG_Communications',
    clientCode: 'PDG01',
  };
}

function foreignHit(): PmSearchHit {
  return {
    kind: 'document',
    id: 'doc-ccb-1',
    title: 'Colorado Beef file',
    href: '/clients/CCB01',
    source: 'HVCG_Communications',
    clientCode: 'CCB01',
  };
}

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string; dir: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-agent-search-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    DATA: process.env.INTEGRATION_DATA_DIR,
    ACTIVITY: process.env.INTEGRATION_AGENT_ACTIVITY_DIR,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_PM_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  delete process.env.INTEGRATION_AGENT_ACTIVITY_DIR;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: async (token: string) => {
      if (token === 'valid-member') {
        return {
          oid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          preferred_username: 'member@example.com',
          roles: ['HVCG Team Member'],
          scp: 'access_as_user',
        };
      }
      if (token === 'valid-client') {
        return {
          oid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          preferred_username: 'client@example.com',
          roles: ['Client Executive'],
          scp: 'access_as_user',
        };
      }
      const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
      err.status = 401;
      err.code = 'invalid_token';
      throw err;
    },
    resolveAllowedClientIds: resolveCodes,
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
    await fn({ base: `http://127.0.0.1:${port}`, dir });
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
    if (prev.ACTIVITY === undefined) delete process.env.INTEGRATION_AGENT_ACTIVITY_DIR;
    else process.env.INTEGRATION_AGENT_ACTIVITY_DIR = prev.ACTIVITY;
  }
}

describe('Ask Atlas READ_AUTO search_authorized_knowledge', () => {
  it('registers the search path and READ_AUTO tool name', () => {
    assert.equal(isOperatorSearchPath('/operator/search.json'), true);
    assert.equal(isOperatorSearchPath('/operator/runtime.json'), false);
    assert.equal(isOperatorRuntimePath('/operator/search.json'), false);
    assert.equal(isOperatorClientContextPath('/operator/search.json'), false);
    assert.ok((READ_AUTO_TOOL_NAMES as readonly string[]).includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL));
    assert.ok((READ_AUTO_TOOL_NAMES as readonly string[]).includes(GET_ATTENTION_ITEMS_TOOL));
    assert.ok((READ_AUTO_TOOL_NAMES as readonly string[]).includes(GET_CLIENT_CONTEXT_TOOL));
  });

  it('maps search questions and does not steal attention, client-context, or owner-gated routes', () => {
    assert.equal(mapsToSearchAuthorizedKnowledge('Search Prodigy'), true);
    assert.equal(mapsToSearchAuthorizedKnowledge('Find documents for Hart'), true);
    assert.equal(mapsToSearchAuthorizedKnowledge('Search authorized knowledge for PDG01'), true);
    assert.equal(mapsToSearchAuthorizedKnowledge('What documents do we have for Prodigy'), true);

    assert.equal(mapsToSearchAuthorizedKnowledge(ASK_ATLAS_QUESTION), false);
    assert.equal(mapsToSearchAuthorizedKnowledge('What needs my attention'), false);
    assert.equal(mapsToGetAttentionItems('What needs my attention'), true);
    assert.equal(mapsToSearchAuthorizedKnowledge('Summarize Prodigy'), false);
    assert.equal(mapsToGetClientContext('Summarize Prodigy'), true);
    assert.equal(mapsToSearchAuthorizedKnowledge('Summarize Capital'), false);
    assert.equal(mapsToGetAttentionItems('Summarize Capital'), true);
    assert.equal(mapsToGetClientContext('Summarize Capital'), false);
    assert.equal(mapsToSearchAuthorizedKnowledge('What are we doing for Hart'), false);
    assert.equal(mapsToGetClientContext('What are we doing for Hart'), true);

    assert.equal(isOwnerGatedQuestion('Submit this to the lender and move money'), true);
    assert.equal(mapsToSearchAuthorizedKnowledge('Submit this to the lender and move money'), false);
    assert.equal(mapsToSearchAuthorizedKnowledge('search Prodigy and move money'), false);
    assert.equal(mapsToSearchAuthorizedKnowledge('search paid ads for Prodigy'), false);
  });

  it('does not invoke search for owner-gated questions', () => {
    const ownerGated = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
      question: 'Submit this to the lender and move money',
    });
    assert.equal(ownerGated.askAtlas.honestEmpty, true);
    assert.deepEqual(ownerGated.runtime.toolsInvoked, []);
    assert.equal(ownerGated.askAtlas.activity.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL), false);
    assert.equal(ownerGated.authorizedSearch, undefined);
    assert.equal(JSON.stringify(ownerGated).includes('Prodigy'), false);

    const unknownTool = invokeReadAutoTool('owner_gated_write', {
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
    });
    assert.equal(unknownTool.honestEmpty, true);
    assert.deepEqual(unknownTool.activity.tools, []);
  });

  it('keeps attention and client-context questions on their existing tools', () => {
    const attention = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
    });
    assert.equal(attention.askAtlas.activity.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
    assert.deepEqual(attention.runtime.toolsInvoked, [GET_ATTENTION_ITEMS_TOOL]);
    assert.equal(attention.askAtlas.activity.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL), false);
    assert.equal(attention.authorizedSearch, undefined);

    const clientCtx = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
      question: 'Summarize Prodigy',
    });
    assert.equal(clientCtx.askAtlas.activity.missionKey, ASK_ATLAS_CLIENTCTX_MISSION_KEY);
    assert.deepEqual(clientCtx.runtime.toolsInvoked, [GET_CLIENT_CONTEXT_TOOL]);
    assert.equal(clientCtx.askAtlas.activity.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL), false);
    assert.equal(clientCtx.clientContext?.client.clientCode, 'PDG01');
  });

  it('returns honest-empty ran=false for empty or short q', async () => {
    const picture = emptyHonestOperatingPicture();
    const empty = await searchAuthorizedKnowledge({
      principal: staffPrincipal(),
      picture,
      searchQuery: '',
    });
    assert.equal(empty.authorizedSearch.invented, false);
    assert.equal(empty.authorizedSearch.honestEmpty, true);
    assert.equal(empty.authorizedSearch.ran, false);
    assert.equal(empty.authorizedSearch.hitCount, 0);
    assert.equal(empty.authorizedSearch.classification, 'HONEST_EMPTY');
    assert.ok(empty.askAtlas.activity.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL));

    const short = await searchAuthorizedKnowledge({
      principal: staffPrincipal(),
      picture,
      searchQuery: 'P',
    });
    assert.equal(short.authorizedSearch.ran, false);
    assert.equal(short.authorizedSearch.honestEmpty, true);
    assert.equal(short.authorizedSearch.invented, false);
    noInventedFacts(short);
  });

  it('fail-closes unknown and foreign clients without searching the tenant', async () => {
    const picture = emptyHonestOperatingPicture();
    let searched = false;
    const entitledSearch = async (query: string) => {
      searched = true;
      return { query, results: [prodigyHit(), foreignHit()] };
    };

    const unknown = await searchAuthorizedKnowledge({
      principal: staffPrincipal(),
      picture,
      searchQuery: 'Globex',
      entitledSearch,
    });
    assert.equal(searched, false);
    assert.equal(unknown.authorizedSearch.entitled, false);
    assert.equal(unknown.authorizedSearch.invented, false);
    assert.equal(unknown.authorizedSearch.honestEmpty, true);
    assert.equal(unknown.authorizedSearch.hitCount, 0);
    assert.equal(unknown.authorizedSearch.pictureComposed, false);
    assert.equal(unknown.authorizedSearch.ran, false);
    assert.equal(JSON.stringify(unknown).includes('Prodigy'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);
    assert.equal(JSON.stringify(unknown).includes('Globex'), false);

    const foreign = await searchAuthorizedKnowledge({
      principal: staffPrincipal(),
      picture,
      searchQuery: 'NOPE01',
      entitledSearch,
    });
    assert.equal(searched, false);
    assert.equal(foreign.authorizedSearch.entitled, false);
    assert.equal(foreign.authorizedSearch.invented, false);
    assert.equal(JSON.stringify(foreign).includes('NOPE01'), false);
    assert.equal(JSON.stringify(foreign).includes('Prodigy'), false);

    const hart = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'Find documents for Hart',
    });
    assert.equal(hart.askAtlas.honestEmpty, true);
    assert.equal(hart.authorizedSearch?.entitled, false);
    assert.equal(hart.authorizedSearch?.invented, false);
    assert.ok(hart.runtime.toolsInvoked.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL));
    assert.equal(JSON.stringify(hart).includes('Hart'), false);
    assert.equal(JSON.stringify(hart).includes('HFD01'), false);

    const unauthorized = await searchAuthorizedKnowledge({
      principal: clientPrincipal(),
      picture,
      searchQuery: 'Prodigy',
      entitledSearch,
    });
    assert.equal(searched, false);
    assert.equal(unauthorized.authorizedSearch.entitled, false);
    assert.equal(JSON.stringify(unauthorized).includes('Prodigy Games'), false);
  });

  it('reuses mocked searchSharePointPm hits without promoting classification or inventing facts', async () => {
    const picture = emptyHonestOperatingPicture();
    let querySeen = '';
    const result = await searchAuthorizedKnowledge({
      principal: staffPrincipal(),
      picture,
      searchQuery: 'Prodigy',
      entitledSearch: async (query) => {
        querySeen = query;
        return { query, results: [prodigyHit(), foreignHit()] };
      },
    });
    assert.equal(querySeen, 'Prodigy');
    assert.equal(result.authorizedSearch.kind, 'atlas_authorized_search_v1');
    assert.equal(result.authorizedSearch.invented, false);
    assert.equal(result.authorizedSearch.honestEmpty, false);
    assert.equal(result.authorizedSearch.entitled, true);
    assert.equal(result.authorizedSearch.ran, true);
    assert.equal(result.authorizedSearch.pictureComposed, true);
    assert.ok(result.authorizedSearch.hitCount >= 2);
    assert.ok(result.authorizedSearch.hits.some((hit) => hit.id === 'doc-pdg-1'));
    const pmHit = result.authorizedSearch.hits.find((hit) => hit.id === 'doc-pdg-1');
    assert.equal(pmHit?.clientCode, 'PDG01');
    assert.equal(pmHit?.classification, 'LIKELY');
    assert.notEqual(pmHit?.classification, 'CONFIRMED');
    assert.ok(
      result.authorizedSearch.hits.some(
        (hit) => hit.clientCode === 'PDG01' && hit.source === 'operator_operating_picture',
      ),
    );
    for (const hit of result.authorizedSearch.hits) assertGroundedHit(hit);
    assertOnlyBoundClient(result, 'PDG01');
    assert.equal(JSON.stringify(result).includes('CCB01'), false);
    assert.equal(JSON.stringify(result).includes('Colorado Beef'), false);
    noInventedFacts(result);

    const viaRuntime = await runAtlasSearchRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'Search Prodigy',
      entitledSearch: async (query) => ({ query, results: [prodigyHit()] }),
    });
    assert.equal(viaRuntime.askAtlas.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(viaRuntime.askAtlas.activity.missionKey, ASK_ATLAS_SEARCH_002_MISSION_KEY);
    assert.equal(viaRuntime.askAtlas.activity.readWriteStatus, 'READ_AUTO');
    assert.ok(viaRuntime.askAtlas.activity.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL));
    assert.deepEqual(viaRuntime.runtime, {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      toolsInvoked: [GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL],
      policyClass: 'READ_AUTO',
      missionKey: ASK_ATLAS_SEARCH_002_MISSION_KEY,
    });
    assert.ok((viaRuntime.authorizedSearch?.hitCount || 0) >= 2);
    assert.equal(viaRuntime.authorizedSearch?.invented, false);
    assert.equal(viaRuntime.authorizedSearch?.pictureComposed, true);
    noInventedFacts(viaRuntime);
  });

  it('composes recovered PDG01 picture hits when entitled PM search is empty', async () => {
    const picture = emptyHonestOperatingPicture();
    assert.ok(picture.hvsRecoveredClients.some((row) => row.clientCode === 'PDG01'));
    assert.deepEqual(picture.realClientsOperationalized, []);

    const result = await searchAuthorizedKnowledge({
      principal: staffPrincipal(),
      picture,
      searchQuery: 'Prodigy',
      entitledSearch: async (query) => ({ query, results: [] }),
    });
    assert.equal(result.authorizedSearch.kind, 'atlas_authorized_search_v1');
    assert.equal(result.authorizedSearch.invented, false);
    assert.equal(result.authorizedSearch.honestEmpty, false);
    assert.equal(result.authorizedSearch.entitled, true);
    assert.equal(result.authorizedSearch.ran, true);
    assert.equal(result.authorizedSearch.pictureComposed, true);
    assert.ok(result.authorizedSearch.hitCount > 0);
    assert.ok(result.authorizedSearch.hits.some((hit) => hit.clientCode === 'PDG01'));
    assert.ok(result.authorizedSearch.hits.some((hit) => /Prodigy/i.test(hit.title)));
    assert.ok(
      result.authorizedSearch.hits.some(
        (hit) =>
          hit.kind === 'recovered_client' ||
          hit.kind === 'recovered_client_record' ||
          hit.kind === 'recovered_document',
      ),
    );
    for (const hit of result.authorizedSearch.hits) {
      assertGroundedHit(hit);
      assert.equal(hit.clientCode, 'PDG01');
    }
    const likelyHits = result.authorizedSearch.hits.filter((hit) => hit.classification === 'LIKELY');
    assert.ok(likelyHits.every((hit) => hit.provenance === 'LIKELY'));
    const proposedHits = result.authorizedSearch.hits.filter((hit) => hit.classification === 'PROPOSED');
    assert.ok(proposedHits.every((hit) => hit.provenance === 'PROPOSED'));
    assert.equal(JSON.stringify(result).includes('realClientsOperationalized'), false);
    assertOnlyBoundClient(result, 'PDG01');
    noInventedFacts(result);

    const viaQ = await runAtlasSearchRuntime({
      principal: staffPrincipal(),
      picture,
      searchQuery: 'Prodigy',
      entitledSearch: async (query) => ({ query, results: [] }),
    });
    assert.equal(viaQ.runtime.missionKey, ASK_ATLAS_SEARCH_002_MISSION_KEY);
    assert.deepEqual(viaQ.runtime.toolsInvoked, [GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL]);
    assert.equal(viaQ.authorizedSearch?.pictureComposed, true);
    assert.ok((viaQ.authorizedSearch?.hitCount || 0) > 0);
    assert.ok(viaQ.authorizedSearch?.hits.some((hit) => hit.clientCode === 'PDG01'));
    noInventedFacts(viaQ);
  });

  it('reuses already-loaded operatorDesk.search hits for the exact q', async () => {
    let searched = false;
    const result = await searchAuthorizedKnowledge({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'Prodigy',
      deskSearch: {
        q: 'Prodigy',
        ran: true,
        hitCount: 1,
        hits: [
          {
            id: 'desk-1',
            title: 'Prodigy desk hit',
            kind: 'document',
            href: '/clients/PDG01',
            source: 'HVCG_Communications',
            clientCode: 'PDG01',
          },
        ],
      },
      entitledSearch: async (query) => {
        searched = true;
        return { query, results: [prodigyHit()] };
      },
    });
    assert.equal(searched, false);
    assert.ok(result.authorizedSearch.hits.some((hit) => hit.id === 'desk-1'));
    assert.equal(result.authorizedSearch.ran, true);
    assert.equal(result.authorizedSearch.invented, false);
    assert.equal(result.authorizedSearch.pictureComposed, true);
    assert.ok(result.authorizedSearch.hits.some((hit) => hit.source === 'operator_operating_picture'));
  });

  it('records SEARCH-002 activity ledger fields for composed runs', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-search-ledger-'));
    try {
      const answered = await runAtlasSearchRuntime({
        principal: staffPrincipal('answered-writer'),
        picture: emptyHonestOperatingPicture(),
        question: 'Search Prodigy',
        now: '2026-08-22T21:50:00.000Z',
        entitledSearch: async (query) => ({ query, results: [prodigyHit()] }),
      });
      await appendAskAtlasActivity({
        dataDir: dir,
        answer: answered.askAtlas,
        principal: staffPrincipal('answered-writer'),
      });
      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.entries[0]?.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(overlay.entries[0]?.missionKey, ASK_ATLAS_SEARCH_002_MISSION_KEY);
      assert.ok(overlay.entries[0]?.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL));
      assert.equal(overlay.entries[0]?.readWriteStatus, 'READ_AUTO');
      assert.equal(overlay.entries[0]?.classification, answered.askAtlas.activity.classification);
      assert.equal(answered.authorizedSearch?.pictureComposed, true);

      const empty = runAtlasHubRuntime({
        principal: staffPrincipal('empty-writer'),
        picture: emptyHonestOperatingPicture(),
        question: 'Search Globex',
        now: '2026-08-22T21:50:30.000Z',
      });
      await appendAskAtlasActivity({
        dataDir: dir,
        answer: empty.askAtlas,
        principal: staffPrincipal('empty-writer'),
      });
      const after = readAgentActivityOverlay(join(dir, 'agent-activity'));
      const emptyEntry = after.entries.find((row) => row.writerUserId === 'empty-writer');
      assert.equal(emptyEntry?.missionKey, ASK_ATLAS_SEARCH_MISSION_KEY);
      assert.ok(emptyEntry?.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL));
      assert.equal(emptyEntry?.classification, 'HONEST_EMPTY');
      assert.equal(emptyEntry?.affected, undefined);
      assert.equal(JSON.stringify(emptyEntry).includes('Prodigy'), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Ask Atlas authorized-search HTTP', () => {
  it('answers signed search questions, keeps other routes, and fail-closes unsigned/client', async () => {
    await withHub(async (oid) => (oid?.startsWith('aaaaaaaa') ? ['SYN01'] : []), async ({ base, dir }) => {
      const signed = await fetch(`${base}/operator/runtime.json?question=${encodeURIComponent('Search Prodigy')}`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(signed.status, 200);
      const body = (await signed.json()) as {
        operatorDesk: { askAtlas: AskAtlasAnswer; operatingPicture?: unknown; entitledClients?: unknown };
        runtime: { agent: string; toolsInvoked: string[]; policyClass: string; missionKey: string };
        authorizedSearch: AtlasAuthorizedSearch;
      };
      assert.equal(body.operatorDesk.askAtlas.invented, false);
      assert.equal(body.operatorDesk.askAtlas.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(body.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_SEARCH_002_MISSION_KEY);
      assert.ok(body.operatorDesk.askAtlas.activity.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL));
      assert.deepEqual(body.runtime, {
        agent: ASK_ATLAS_RUNTIME_AGENT,
        toolsInvoked: [GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL],
        policyClass: 'READ_AUTO',
        missionKey: ASK_ATLAS_SEARCH_002_MISSION_KEY,
      });
      assert.equal(body.authorizedSearch.kind, 'atlas_authorized_search_v1');
      assert.equal(body.authorizedSearch.invented, false);
      assert.equal(body.authorizedSearch.pictureComposed, true);
      assert.equal(body.authorizedSearch.entitled, true);
      assert.ok(body.authorizedSearch.hitCount > 0);
      assert.ok(body.authorizedSearch.hits.some((hit) => hit.clientCode === 'PDG01'));
      for (const hit of body.authorizedSearch.hits) assertGroundedHit(hit);
      assert.equal(body.operatorDesk.operatingPicture, undefined);
      assert.equal(body.operatorDesk.entitledClients, undefined);
      noInventedFacts(body);

      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.entries[0]?.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(overlay.entries[0]?.missionKey, ASK_ATLAS_SEARCH_002_MISSION_KEY);
      assert.ok(overlay.entries[0]?.tools.includes(GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL));
      assert.equal(overlay.entries[0]?.readWriteStatus, 'READ_AUTO');

      const dedicated = await fetch(`${base}/operator/search.json?q=Prodigy`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(dedicated.status, 200);
      const dedicatedBody = (await dedicated.json()) as {
        authorizedSearch: AtlasAuthorizedSearch;
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime: { toolsInvoked: string[]; missionKey: string };
      };
      assert.equal(dedicatedBody.authorizedSearch.invented, false);
      assert.equal(dedicatedBody.authorizedSearch.pictureComposed, true);
      assert.ok(dedicatedBody.authorizedSearch.hits.some((hit) => hit.clientCode === 'PDG01'));
      assert.equal(dedicatedBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_SEARCH_002_MISSION_KEY);
      assert.deepEqual(dedicatedBody.runtime.toolsInvoked, [GET_SEARCH_AUTHORIZED_KNOWLEDGE_TOOL]);
      noInventedFacts(dedicatedBody);

      const attention = await fetch(`${base}/operator/runtime.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(attention.status, 200);
      const attentionBody = (await attention.json()) as {
        runtime: { missionKey: string; toolsInvoked: string[] };
        authorizedSearch?: unknown;
      };
      assert.equal(attentionBody.runtime.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
      assert.deepEqual(attentionBody.runtime.toolsInvoked, [GET_ATTENTION_ITEMS_TOOL]);
      assert.equal(attentionBody.authorizedSearch, undefined);

      const clientCtx = await fetch(
        `${base}/operator/runtime.json?question=${encodeURIComponent('Summarize Prodigy')}`,
        { headers: { authorization: 'Bearer valid-member' } },
      );
      assert.equal(clientCtx.status, 200);
      const clientCtxBody = (await clientCtx.json()) as {
        runtime: { missionKey: string; toolsInvoked: string[] };
      };
      assert.equal(clientCtxBody.runtime.missionKey, ASK_ATLAS_CLIENTCTX_MISSION_KEY);
      assert.deepEqual(clientCtxBody.runtime.toolsInvoked, [GET_CLIENT_CONTEXT_TOOL]);

      const ownerGated = await fetch(
        `${base}/operator/runtime.json?question=${encodeURIComponent('Submit this to the lender and move money')}`,
        { headers: { authorization: 'Bearer valid-member' } },
      );
      assert.equal(ownerGated.status, 200);
      const ownerGatedBody = (await ownerGated.json()) as {
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime: { toolsInvoked: string[] };
        authorizedSearch?: unknown;
      };
      assert.equal(ownerGatedBody.operatorDesk.askAtlas.honestEmpty, true);
      assert.deepEqual(ownerGatedBody.runtime.toolsInvoked, []);
      assert.equal(ownerGatedBody.authorizedSearch, undefined);

      const unsignedRuntime = await fetch(
        `${base}/operator/runtime.json?question=${encodeURIComponent('Search Prodigy')}`,
      );
      assert.equal(unsignedRuntime.status, 401);
      leakFree(await unsignedRuntime.text());

      const unsignedSearch = await fetch(`${base}/operator/search.json?q=Prodigy`);
      assert.equal(unsignedSearch.status, 401);
      leakFree(await unsignedSearch.text());

      const client = await fetch(`${base}/operator/search.json?q=Prodigy`, {
        headers: { authorization: 'Bearer valid-client' },
      });
      assert.equal(client.status, 403);
      leakFree(await client.text());
    });
  });
});
