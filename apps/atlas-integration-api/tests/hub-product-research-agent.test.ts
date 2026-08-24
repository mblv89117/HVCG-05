/**
 * ATLAS-PRODUCT-RESEARCH-AGENT-001
 * Smallest Hub increment: evaluate Atlas/GCC/Copilot/360/telemetry/GitHub/
 * open-source from entitled Hub health only, and create a PII/LOOP
 * engineering mission when a recorded product-surface gap already exists.
 * Does not invent metrics. Authorization before retrieval.
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
import {
  classifyImprovementPolicy,
  inspectProductImprovements,
} from '../src/pm/operatorDesk/productImprovement.ts';
import { inspectEngineeringMissions } from '../src/pm/operatorDesk/engineeringLoop.ts';
import {
  composeProductResearch,
  copyEntitledClientHints,
  detectRecordedProductGaps,
  productResearchHasInventedFacts,
} from '../src/pm/operatorDesk/productResearchAgent.ts';
import { inspectFabricSyncHealth } from '../src/pm/sharepoint/fabric/status.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_PII_MISSION_KEY,
  ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY,
  ASK_ATLAS_RUNTIME_AGENT,
  CREATE_ENGINEERING_MISSION_TOOL,
  PRODUCT_RESEARCH_SURFACES,
  type AskAtlasAnswer,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const AMOUNT = /\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/;
const LEAK_MARKERS = [
  'Prodigy Games',
  'Colorado Beef',
  'PDG01',
  'CCB01',
  'askAtlas',
  'agentActivity',
  'runtime',
  'eventProcessing',
  'productImprovement',
  'productResearch',
  'operatorDesk',
  '250000',
  'Hub-MI',
];

function staffPrincipal(): AtlasPrincipal {
  return {
    userId: 'product-research-writer',
    organizationId: 'org-hvcg',
    allowedClientIds: ['SYN01'],
    roles: ['HVCG Team Member'],
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
  assert.equal(/\bnps\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/\bmrr\s*[:=]?\s*\d/i.test(serialized), false);
  assert.equal(/conversion rate/i.test(serialized), false);
}

async function withHub(fn: (ctx: { base: string; dir: string }) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-product-research-'));
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
    resolveAllowedClientIds: async (oid) => (oid?.startsWith('aaaaaaaa') ? ['SYN01'] : []),
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
  }
}

describe('ATLAS-PRODUCT-RESEARCH-AGENT-001 product research agent', () => {
  it('keeps product research policy from inventing metrics or executing', () => {
    assert.equal(ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY, 'ATLAS-PRODUCT-RESEARCH-AGENT-001');
    assert.deepEqual([...PRODUCT_RESEARCH_SURFACES], [
      'atlas',
      'gcc',
      'copilot',
      '360',
      'telemetry',
      'github',
      'open_source',
    ]);
    assert.equal(classifyImprovementPolicy('product_research', staffPrincipal()).allowed, true);
    assert.equal(classifyImprovementPolicy('product_research', staffPrincipal()).inspectClass, 'recorded_product_surface_gap');
  });

  it('creates a PII engineering mission from entitled Hub health gaps and stays honest-empty on other surfaces', () => {
    const picture = emptyHonestOperatingPicture();
    const result = inspectProductImprovements({
      principal: staffPrincipal(),
      picture,
      health: {
        authRequired: true,
        insecureDevAuth: false,
        providers: { microsoft: true, google: false, github: false },
        fabricNotes: [
          'File search skipped: Graph search/query rejected app-only driveItem query (HTTP 400). Not claimed as LIVE files.',
          'Mail delta reached HTTP 200.',
        ],
        fabricHonesty: 'delta',
      },
      inspectClass: 'product_research',
      now: '2026-08-24T10:40:00.000Z',
    });

    assert.equal(result.productImprovement.invented, false);
    assert.equal(result.productImprovement.honestEmpty, false);
    assert.equal(result.productImprovement.outcome, 'proposed_mission');
    assert.equal(result.productImprovement.productResearch.kind, 'product_research_agent_v1');
    assert.equal(result.productImprovement.productResearch.missionKey, ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY);
    assert.equal(result.productImprovement.productResearch.inventMetrics, false);
    assert.equal(result.productImprovement.productResearch.execute, false);
    assert.equal(productResearchHasInventedFacts(result.productImprovement.productResearch), false);
    assert.ok(result.runtime.toolsInvoked.includes(CREATE_ENGINEERING_MISSION_TOOL));

    const surfaces = Object.fromEntries(
      result.productImprovement.productResearch.surfaces.map((row) => [row.surface, row]),
    );
    assert.equal(surfaces.atlas?.status, 'evaluated');
    assert.equal(surfaces.github?.status, 'evaluated');
    assert.equal(surfaces.gcc?.status, 'honest_empty');
    assert.equal(surfaces.copilot?.status, 'honest_empty');
    assert.equal(surfaces['360']?.status, 'honest_empty');
    assert.equal(surfaces.telemetry?.status, 'honest_empty');
    assert.equal(surfaces.open_source?.status, 'honest_empty');
    assert.match(surfaces.gcc!.basedOn, /Metrics were not invented/);

    const classes = result.productImprovement.proposedMissions.map((row) => row.evidenceClass);
    assert.ok(classes.includes('recorded_product_surface_gap'));
    assert.ok(result.productImprovement.proposedMissions.every((row) => row.kind === 'proposed_engineering_mission_v1'));
    assert.ok(result.productImprovement.proposedMissions.every((row) => row.authoritative === false));
    assert.ok(result.productImprovement.proposedMissions.every((row) => row.invented === false));
    assert.ok(result.productImprovement.proposedMissions.every((row) => row.status === 'PROPOSED'));
    assert.ok(result.productImprovement.proposedMissions.every((row) => row.missionKey === ASK_ATLAS_PII_MISSION_KEY));
    assert.ok(result.productImprovement.proposedMissions.some((row) => row.basedOn.includes('providers.github=false')));
    assert.ok(result.productImprovement.proposedMissions.some((row) => /File search skipped/i.test(row.basedOn)));
    assert.equal(result.productImprovement.proposedMissions.some((row) => /Mail delta reached HTTP 200/i.test(row.basedOn)), false);
    noInventedFacts(result);
  });

  it('stays honest-empty when entitled Hub health has no recorded product-surface gap', () => {
    const empty = inspectProductImprovements({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
      health: {
        authRequired: true,
        insecureDevAuth: false,
        providers: { microsoft: true, google: true, github: true },
        fabricNotes: ['Mail delta reached HTTP 200.'],
        fabricHonesty: 'delta',
      },
      inspectClass: 'product_research',
    });
    assert.equal(empty.productImprovement.honestEmpty, true);
    assert.equal(empty.productImprovement.proposedMissions.length, 0);
    assert.equal(empty.productImprovement.productResearch.invented, false);
    assert.ok(empty.productImprovement.productResearch.surfaces.every((row) => row.status === 'honest_empty'));
    assert.deepEqual(empty.runtime.toolsInvoked, []);
    noInventedFacts(empty);
  });

  it('persists the proposed product-research mission through the existing LOOP record path', () => {
    const loop = inspectEngineeringMissions({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
      health: {
        authRequired: true,
        insecureDevAuth: false,
        providers: { microsoft: true, google: false, github: false },
        fabricNotes: ['Planner application APIs are delegated-only per current Microsoft Graph docs — not indexed via app-only.'],
        fabricHonesty: 'delta',
      },
      inspectClass: 'product_research',
      now: '2026-08-24T10:40:10.000Z',
    });
    assert.equal(loop.engineeringMission.invented, false);
    assert.equal(loop.engineeringMission.authoritative, false);
    assert.ok(loop.engineeringMission.records.length > 0);
    assert.ok(loop.engineeringMission.records.every((row) => row.evidenceClass === 'recorded_product_surface_gap'));
    assert.ok(loop.engineeringMission.records.every((row) => row.status === 'PROPOSED'));
    assert.ok(loop.recordsToPersist.length > 0);
    noInventedFacts(loop);
  });

  it('answers signed product-research inspect and fail-closes unsigned/client without leaks', async () => {
    await withHub(async ({ base }) => {
      const signed = await fetch(`${base}/operator/improvements.json?inspect=product_research`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(signed.status, 200);
      const body = (await signed.json()) as {
        productImprovement: {
          invented: boolean;
          productResearch: {
            kind: string;
            missionKey: string;
            inventMetrics: boolean;
            execute: boolean;
            surfaces: Array<{ surface: string; status: string }>;
          };
          proposedMissions: Array<{ evidenceClass: string; invented: boolean }>;
        };
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime: { agent: string; toolsInvoked: string[] };
      };
      assert.equal(body.productImprovement.invented, false);
      assert.equal(body.productImprovement.productResearch.kind, 'product_research_agent_v1');
      assert.equal(body.productImprovement.productResearch.missionKey, ASK_ATLAS_PRODUCT_RESEARCH_AGENT_MISSION_KEY);
      assert.equal(body.productImprovement.productResearch.inventMetrics, false);
      assert.equal(body.productImprovement.productResearch.execute, false);
      assert.equal(body.productImprovement.productResearch.surfaces.length, PRODUCT_RESEARCH_SURFACES.length);
      assert.equal(body.runtime.agent, ASK_ATLAS_RUNTIME_AGENT);
      noInventedFacts(body);

      const unsigned = await fetch(`${base}/operator/improvements.json?inspect=product_research`);
      assert.equal(unsigned.status, 401);
      leakFree(await unsigned.text());

      const client = await fetch(`${base}/operator/improvements.json?inspect=product_research`, {
        headers: { authorization: 'Bearer valid-client' },
      });
      assert.equal(client.status, 403);
      leakFree(await client.text());
    });
  });
});

const HINT_IDS = /PDG01|ACCG01|CCB01|HFD01|LIEN01|Colorado Craft|Precision Dental|displayName|@highvalue|\bDBA\b|ClientCode/i;
const REPAIR_COUNT = /repair count|invented client|backfill \d+/i;

function atlasSurface(result: ReturnType<typeof inspectProductImprovements>) {
  return result.productImprovement.productResearch.surfaces.find((row) => row.surface === 'atlas');
}

describe('ATLAS-PRODUCT-RESEARCH-CLIENT-HINTS-001 count-only fabric hints', () => {
  it('ready + count>0 evaluates atlas from a count-only sentence without identifiers', () => {
    const result = inspectProductImprovements({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
      health: {
        authRequired: true,
        insecureDevAuth: false,
        providers: { microsoft: true, google: true, github: true },
        fabricNotes: ['Mail delta reached HTTP 200.'],
        fabricHonesty: 'delta',
        clientHints: {
          status: 'ready',
          reason: 'Client hints loaded on the last completed sweep.',
          count: 10,
        },
      },
      inspectClass: 'product_research',
    });
    const atlas = atlasSurface(result);
    assert.ok(atlas);
    assert.equal(atlas.status, 'evaluated');
    assert.match(atlas.basedOn, /status=ready count=10/);
    assert.equal(HINT_IDS.test(atlas.basedOn), false);
    assert.equal(HINT_IDS.test(JSON.stringify(result.productImprovement.productResearch)), false);
    assert.equal(result.productImprovement.productResearch.execute, false);
    assert.equal(result.productImprovement.productResearch.inventMetrics, false);
    assert.equal(productResearchHasInventedFacts(result.productImprovement.productResearch), false);
    assert.equal(result.productImprovement.honestEmpty, true);
    assert.equal(result.productImprovement.proposedMissions.length, 0);
    assert.deepEqual(result.runtime.toolsInvoked, []);
    noInventedFacts(result);
  });

  it('empty + count=0 is honest_empty without inventing ClientCodes', () => {
    const result = inspectProductImprovements({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
      health: {
        authRequired: true,
        insecureDevAuth: false,
        providers: { microsoft: true, google: true, github: true },
        fabricNotes: ['Mail delta reached HTTP 200.'],
        fabricHonesty: 'delta',
        clientHints: {
          status: 'empty',
          reason: 'Last completed sweep loaded an empty hint list.',
          count: 0,
        },
      },
      inspectClass: 'product_research',
    });
    const atlas = atlasSurface(result);
    assert.ok(atlas);
    assert.equal(atlas.status, 'honest_empty');
    assert.match(atlas.basedOn, /status=empty count=0/);
    assert.equal(HINT_IDS.test(atlas.basedOn), false);
    assert.equal(HINT_IDS.test(JSON.stringify(result)), false);
    assert.equal(result.productImprovement.honestEmpty, true);
    assert.equal(result.productImprovement.proposedMissions.length, 0);
    assert.equal(result.productImprovement.productResearch.execute, false);
    assert.equal(detectRecordedProductGaps({
      authRequired: true,
      insecureDevAuth: false,
      clientHints: { status: 'empty', reason: 'Last completed sweep loaded an empty hint list.', count: 0 },
    }).length, 0);
    noInventedFacts(result);
  });

  it('error and skipped are recorded atlas gaps without executing or inventing a repair count', () => {
    for (const status of ['error', 'skipped'] as const) {
      const result = inspectProductImprovements({
        principal: staffPrincipal(),
        picture: emptyHonestOperatingPicture(),
        health: {
          authRequired: true,
          insecureDevAuth: false,
          providers: { microsoft: true, google: true, github: true },
          fabricNotes: ['Mail delta reached HTTP 200.'],
          fabricHonesty: 'delta',
          clientHints: {
            status,
            reason: status === 'error'
              ? 'Client hints load failed; fabric continued with an empty resolver.'
              : 'Client hints have not completed; hint population remains unproven.',
            count: 0,
          },
        },
        inspectClass: 'product_research',
      });
      const atlas = atlasSurface(result);
      assert.ok(atlas);
      assert.equal(atlas.status, 'evaluated');
      assert.match(atlas.basedOn, new RegExp(`status=${status} count=0`));
      assert.equal(REPAIR_COUNT.test(atlas.basedOn), false);
      assert.equal(HINT_IDS.test(JSON.stringify(result)), false);
      assert.equal(result.productImprovement.productResearch.execute, false);
      assert.equal(result.productImprovement.honestEmpty, false);
      assert.equal(result.productImprovement.outcome, 'proposed_mission');
      assert.ok(result.productImprovement.proposedMissions.every((row) => row.evidenceClass === 'recorded_product_surface_gap'));
      assert.ok(result.productImprovement.proposedMissions.every((row) => /repair count/i.test(row.basedOn) === false));
      assert.ok(result.productImprovement.proposedMissions.some((row) => row.basedOn.includes(`status=${status}`)));
      noInventedFacts(result);
    }
  });

  it('strips identifiers and extra fields; isolation does not invent ClientCodes from count', () => {
    const copied = copyEntitledClientHints({
      status: 'ready',
      reason: 'loaded PDG01 ACCG01 CCB01 displayName DBA user@highvalue',
      count: 10,
      clientCodes: ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01', 'FAKE99'],
      displayName: 'Colorado Craft Beef',
    } as { status: unknown; reason: unknown; count: unknown });
    assert.ok(copied);
    assert.deepEqual(Object.keys(copied).sort(), ['count', 'reason', 'status']);
    assert.equal(copied.status, 'ready');
    assert.equal(copied.count, 10);
    assert.equal(copied.reason, '');
    assert.equal(HINT_IDS.test(JSON.stringify(copied)), false);

    const composed = composeProductResearch({
      health: {
        authRequired: true,
        insecureDevAuth: false,
        providers: { microsoft: true, google: true, github: true },
        fabricHonesty: 'delta',
        clientHints: copied,
      },
    });
    const atlas = composed.surfaces.find((row) => row.surface === 'atlas');
    assert.equal(atlas?.status, 'evaluated');
    assert.equal(atlas?.basedOn, 'Entitled Hub fabric clientHints status=ready count=10');
    assert.equal(HINT_IDS.test(JSON.stringify(composed)), false);
    assert.equal(composed.execute, false);
    assert.equal(/FAKE99|sixth|backfill/.test(JSON.stringify(composed)), false);
  });

  it('GET /health clientHints shape stays status/reason/count only', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pr-hints-health-'));
    try {
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.deepEqual(Object.keys(health.clientHints).sort(), ['count', 'reason', 'status']);
      assert.equal(typeof health.clientHints.status, 'string');
      assert.equal(typeof health.clientHints.reason, 'string');
      assert.equal(typeof health.clientHints.count, 'number');
      assert.equal(HINT_IDS.test(JSON.stringify(health.clientHints)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
