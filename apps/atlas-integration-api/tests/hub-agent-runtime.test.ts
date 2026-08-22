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
import { runAtlasHubRuntime } from '../src/pm/operatorDesk/agentRuntime.ts';
import { getAttentionItems, invokeReadAutoTool } from '../src/pm/operatorDesk/toolGateway.ts';
import { buildOperatorDeskModel, emptyHonestDesk, emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_MISSION_KEY,
  ASK_ATLAS_OPERATOR_AGENT,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  GET_ATTENTION_ITEMS_TOOL,
  isOperatorRuntimePath,
  type AskAtlasAnswer,
  type OperatorOperatingPicture,
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
  '250000',
  'Hub-MI',
];

function staffPrincipal(userId = 'runtime-writer'): AtlasPrincipal {
  return {
    userId,
    organizationId: 'org-hvcg',
    allowedClientIds: ['SYN01'],
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

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string; dir: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-agent-runtime-'));
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

describe('Ask Atlas READ_AUTO runtime', () => {
  it('routes /operator/runtime.json as an operator desk JSON path', () => {
    assert.equal(isOperatorRuntimePath('/operator/runtime.json'), true);
    assert.equal(isOperatorRuntimePath('/operator.json'), false);
    assert.equal(isOperatorRuntimePath('/operator/activity.json'), false);
  });

  it('answers the attention question via get_attention_items without inventing amounts/LTV/Hub-MI', () => {
    const picture = emptyHonestOperatingPicture();
    const viaTool = getAttentionItems({ principal: staffPrincipal(), picture });
    const viaRuntime = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: ASK_ATLAS_QUESTION,
      now: '2026-08-22T19:30:00.000Z',
    });

    assert.equal(viaTool.kind, 'ask_atlas_attention_v1');
    assert.equal(viaTool.question, ASK_ATLAS_QUESTION);
    assert.equal(viaTool.invented, false);
    assert.equal(viaTool.honestEmpty, false);
    assert.ok(viaTool.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL));
    assert.ok(viaTool.activity.tools.includes('operator_operating_picture'));
    assert.equal(viaTool.activity.agent, ASK_ATLAS_OPERATOR_AGENT);

    const answer = viaRuntime.askAtlas;
    assert.equal(answer.kind, 'ask_atlas_attention_v1');
    assert.equal(answer.question, ASK_ATLAS_QUESTION);
    assert.equal(answer.invented, false);
    assert.deepEqual(answer.ranking, [...ASK_ATLAS_RANKING]);
    assert.equal(answer.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(answer.activity.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
    assert.equal(answer.activity.trigger, 'signed_operator_question');
    assert.equal(answer.activity.readWriteStatus, 'READ_AUTO');
    assert.ok(answer.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL));
    assert.deepEqual(viaRuntime.runtime, {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      toolsInvoked: [GET_ATTENTION_ITEMS_TOOL],
      policyClass: 'READ_AUTO',
      missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
    });
    assert.ok(
      answer.items.some(
        (row) =>
          row.state === 'At Risk' &&
          row.client === 'Prodigy Games' &&
          row.clientCode === 'PDG01' &&
          row.classification === 'LIKELY',
      ),
    );
    assert.equal(
      answer.items.some(
        (row) => row.state === 'At Risk' && (row.client === 'Colorado Beef' || row.clientCode === 'CCB01'),
      ),
      false,
    );
    noInventedFacts(viaRuntime);
  });

  it('maps the obvious attention alias and fail-closes unknown questions', () => {
    const picture = emptyHonestOperatingPicture();
    const alias = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'what needs my attention',
    });
    assert.equal(alias.askAtlas.honestEmpty, false);
    assert.deepEqual(alias.runtime.toolsInvoked, [GET_ATTENTION_ITEMS_TOOL]);
    assert.ok(alias.askAtlas.items.length > 0);

    const unknown = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'what is the LTV of Prodigy and the Hub-MI payment status',
      now: '2026-08-22T19:31:00.000Z',
    });
    assert.equal(unknown.askAtlas.honestEmpty, true);
    assert.equal(unknown.askAtlas.invented, false);
    assert.equal(unknown.askAtlas.items.length, 0);
    assert.equal(unknown.askAtlas.activity.result, 'honest_empty');
    assert.deepEqual(unknown.runtime.toolsInvoked, []);
    assert.equal(JSON.stringify(unknown).includes('Prodigy'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);
    noInventedFacts(unknown);

    const unknownTool = invokeReadAutoTool('owner_gated_write', {
      principal: staffPrincipal(),
      picture,
    });
    assert.equal(unknownTool.honestEmpty, true);
    assert.equal(unknownTool.items.length, 0);
    assert.deepEqual(unknownTool.activity.tools, []);
  });

  it('does not persist recovered-client leakage on the HVS-blocked runtime path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-runtime-hvs-blocked-'));
    try {
      const live = emptyHonestOperatingPicture();
      assert.ok(live.hvsRecoveredClients.some((row) => row.client === 'Prodigy Games'));
      const blocked: OperatorOperatingPicture = {
        ...live,
        hvsDataAccess: 'BLOCKED',
      };
      const result = runAtlasHubRuntime({
        principal: staffPrincipal('blocked-runtime'),
        picture: blocked,
        now: '2026-08-22T19:32:00.000Z',
      });
      assert.equal(result.askAtlas.activity.result, 'hvs_blocked');
      assert.equal(result.askAtlas.activity.classification, 'HONEST_EMPTY');
      assert.equal(result.askAtlas.items.length, 0);
      assert.equal(result.askAtlas.honestEmpty, true);
      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes('Prodigy Games'), false);
      assert.equal(serialized.includes('Colorado Beef'), false);
      assert.equal(serialized.includes('PDG01'), false);
      assert.equal(serialized.includes('CCB01'), false);

      await appendAskAtlasActivity({
        dataDir: dir,
        answer: result.askAtlas,
        principal: staffPrincipal('blocked-runtime'),
      });
      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.schemaVersion, 1);
      assert.equal(overlay.entries.length, 1);
      const entryText = JSON.stringify(overlay.entries[0]);
      assert.equal(entryText.includes('Prodigy Games'), false);
      assert.equal(entryText.includes('Colorado Beef'), false);
      assert.equal(entryText.includes('PDG01'), false);
      assert.equal(entryText.includes('CCB01'), false);
      assert.equal(overlay.entries[0]?.affected, undefined);
      assert.equal(overlay.entries[0]?.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(overlay.entries[0]?.classification, 'HONEST_EMPTY');
      assert.ok(overlay.entries[0]?.tools.includes(GET_ATTENTION_ITEMS_TOOL));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never silently promotes LIKELY to CONFIRMED on the runtime path', async () => {
    const model = buildOperatorDeskModel({
      hubSha: '0eff2a4',
      entitledClients: ['SYN01'],
      commandCenter: {},
      commercialContext: emptyHonestDesk(1),
    });
    assert.equal(model.askAtlas.activity.agent, ASK_ATLAS_OPERATOR_AGENT);
    assert.equal(model.askAtlas.activity.missionKey, ASK_ATLAS_MISSION_KEY);

    const result = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture: model.operatingPicture,
    });
    const atRisk = result.askAtlas.items.find((row) => row.state === 'At Risk' && row.clientCode === 'PDG01');
    assert.equal(atRisk?.classification, 'LIKELY');
    assert.equal(atRisk?.provenance, 'LIKELY');
    assert.equal(result.askAtlas.activity.classification, 'LIKELY');
    assert.equal(result.askAtlas.activity.classification === 'CONFIRMED', false);

    const dir = mkdtempSync(join(tmpdir(), 'atlas-runtime-class-'));
    try {
      await appendAskAtlasActivity({
        dataDir: dir,
        answer: result.askAtlas,
        principal: staffPrincipal(),
      });
      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.entries[0]?.classification, 'LIKELY');
      assert.equal(overlay.entries[0]?.confidence, 'LIKELY');
      const persisted = overlay.entries[0]?.affected?.find((row) => row.clientCode === 'PDG01');
      assert.equal(persisted?.classification, 'LIKELY');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('fail-closes unauthorized gateway callers without recovered-client names', () => {
    const result = getAttentionItems({
      principal: clientPrincipal(),
      picture: emptyHonestOperatingPicture(),
    });
    assert.equal(result.honestEmpty, true);
    assert.equal(result.items.length, 0);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes('Prodigy Games'), false);
    assert.equal(serialized.includes('PDG01'), false);
  });
});

describe('Ask Atlas runtime HTTP', () => {
  it('answers signed runtime.json, keeps operator.json unchanged, and fail-closes unsigned/client', async () => {
    await withHub(async (oid) => (oid?.startsWith('aaaaaaaa') ? ['SYN01'] : []), async ({ base, dir }) => {
      const signed = await fetch(`${base}/operator/runtime.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(signed.status, 200);
      const body = (await signed.json()) as {
        operatorDesk: { askAtlas: AskAtlasAnswer; operatingPicture?: unknown; entitledClients?: unknown };
        runtime: {
          agent: string;
          toolsInvoked: string[];
          policyClass: string;
          missionKey: string;
        };
        askAtlas?: unknown;
      };
      assert.equal(body.operatorDesk.askAtlas.kind, 'ask_atlas_attention_v1');
      assert.equal(body.operatorDesk.askAtlas.question, ASK_ATLAS_QUESTION);
      assert.equal(body.operatorDesk.askAtlas.invented, false);
      assert.equal(body.operatorDesk.askAtlas.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(body.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
      assert.ok(body.operatorDesk.askAtlas.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL));
      assert.deepEqual(body.runtime, {
        agent: ASK_ATLAS_RUNTIME_AGENT,
        toolsInvoked: [GET_ATTENTION_ITEMS_TOOL],
        policyClass: 'READ_AUTO',
        missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
      });
      assert.equal(body.operatorDesk.operatingPicture, undefined);
      assert.equal(body.operatorDesk.entitledClients, undefined);
      assert.ok(
        body.operatorDesk.askAtlas.items.some(
          (row) =>
            row.state === 'At Risk' &&
            row.client === 'Prodigy Games' &&
            row.clientCode === 'PDG01' &&
            row.classification === 'LIKELY',
        ),
      );
      noInventedFacts(body);

      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.schemaVersion, 1);
      assert.equal(overlay.entries.length, 1);
      assert.equal(overlay.entries[0]?.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.ok(overlay.entries[0]?.tools.includes(GET_ATTENTION_ITEMS_TOOL));
      assert.equal(overlay.entries[0]?.classification, 'LIKELY');
      assert.equal(overlay.entries[0]?.confidence, 'LIKELY');

      const desk = await fetch(`${base}/operator.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(desk.status, 200);
      const deskBody = (await desk.json()) as {
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime?: unknown;
      };
      assert.equal(deskBody.operatorDesk.askAtlas.activity.agent, ASK_ATLAS_OPERATOR_AGENT);
      assert.equal(deskBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_MISSION_KEY);
      assert.equal(deskBody.operatorDesk.askAtlas.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL), false);
      assert.equal(deskBody.runtime, undefined);

      const unsigned = await fetch(`${base}/operator/runtime.json`);
      assert.equal(unsigned.status, 401);
      const unsignedText = await unsigned.text();
      leakFree(unsignedText);
      const unsignedBody = JSON.parse(unsignedText) as {
        error: string;
        askAtlas?: unknown;
        agentActivity?: unknown;
        runtime?: unknown;
        operatorDesk?: unknown;
      };
      assert.equal(unsignedBody.error, 'unauthorized');
      assert.equal(unsignedBody.askAtlas, undefined);
      assert.equal(unsignedBody.agentActivity, undefined);
      assert.equal(unsignedBody.runtime, undefined);
      assert.equal(unsignedBody.operatorDesk, undefined);

      const client = await fetch(`${base}/operator/runtime.json`, {
        headers: { authorization: 'Bearer valid-client' },
      });
      assert.equal(client.status, 403);
      const clientText = await client.text();
      leakFree(clientText);
      const clientBody = JSON.parse(clientText) as {
        error: string;
        askAtlas?: unknown;
        runtime?: unknown;
        operatorDesk?: unknown;
      };
      assert.equal(clientBody.error, 'forbidden');
      assert.equal(clientBody.askAtlas, undefined);
      assert.equal(clientBody.runtime, undefined);
      assert.equal(clientBody.operatorDesk, undefined);

      const unknown = await fetch(
        `${base}/operator/runtime.json?question=${encodeURIComponent('invent an LTV and Hub-MI row')}`,
        { headers: { authorization: 'Bearer valid-member' } },
      );
      assert.equal(unknown.status, 200);
      const unknownBody = (await unknown.json()) as {
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime: { toolsInvoked: string[] };
      };
      assert.equal(unknownBody.operatorDesk.askAtlas.honestEmpty, true);
      assert.equal(unknownBody.operatorDesk.askAtlas.items.length, 0);
      assert.deepEqual(unknownBody.runtime.toolsInvoked, []);
      noInventedFacts(unknownBody);
    });
  });
});
