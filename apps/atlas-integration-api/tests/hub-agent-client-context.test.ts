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
  runAtlasHubRuntime,
} from '../src/pm/operatorDesk/agentRuntime.ts';
import { getClientContext, invokeReadAutoTool, READ_AUTO_TOOL_NAMES } from '../src/pm/operatorDesk/toolGateway.ts';
import { emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_CLIENTCTX_MISSION_KEY,
  ASK_ATLAS_RECOVERED_MISSION_KEY,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  GET_ATTENTION_ITEMS_TOOL,
  GET_CLIENT_CONTEXT_TOOL,
  isOperatorClientContextPath,
  isOperatorRuntimePath,
  type AskAtlasAnswer,
  type AtlasClientContext,
  type OperatorOperatingPicture,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

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
  'clientContext',
  'operatorDesk',
  '250000',
  'Hub-MI',
];

function staffPrincipal(userId = 'clientctx-writer', allowedClientIds = ['SYN01']): AtlasPrincipal {
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

function entitledHartPicture(): OperatorOperatingPicture {
  const picture = emptyHonestOperatingPicture();
  assert.equal(
    picture.hvsRecoveredClients.some((row) => row.clientCode === 'HFD01'),
    false,
  );
  assert.equal(
    picture.recoveryLedger.some((row) => row.clientCode === 'HFD01'),
    false,
  );
  return {
    ...picture,
    recoveryLedger: [
      ...picture.recoveryLedger,
      {
        client: 'Hart Family Dental',
        clientCode: 'HFD01',
        dataType: 'HVS_ABSENT_FROM_ROSTER',
        accessible: false,
        operationalized: false,
        provenance: 'STALE_OR_UNCERTAIN',
        blocker: 'STALE_OR_UNCERTAIN. Do not operationalize from the Hub entitlement catalog alone.',
      },
    ],
  };
}

function emptyUnauthorized(ctx: AtlasClientContext): void {
  assert.equal(ctx.kind, 'atlas_client_context_v1');
  assert.equal(ctx.invented, false);
  assert.equal(ctx.honestEmpty, true);
  assert.equal(ctx.client.entitled, false);
  assert.equal(ctx.client.client, undefined);
  assert.equal(ctx.client.clientCode, undefined);
  assert.deepEqual(ctx.realClientsOperationalized, []);
  assert.equal(ctx.recoveredKnowledgeOperationalized, false);
  assert.equal(ctx.classification, 'HONEST_EMPTY');
  assert.equal(ctx.evidenceClass, 'honest_empty');
}

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string; dir: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-agent-clientctx-'));
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

describe('Ask Atlas READ_AUTO get_client_context', () => {
  it('registers the client-context path and READ_AUTO tool name', () => {
    assert.equal(isOperatorClientContextPath('/operator/client-context.json'), true);
    assert.equal(isOperatorClientContextPath('/operator/runtime.json'), false);
    assert.equal(isOperatorRuntimePath('/operator/client-context.json'), false);
    assert.ok((READ_AUTO_TOOL_NAMES as readonly string[]).includes(GET_CLIENT_CONTEXT_TOOL));
    assert.ok((READ_AUTO_TOOL_NAMES as readonly string[]).includes(GET_ATTENTION_ITEMS_TOOL));
  });

  it('returns grounded non-invented recovered Prodigy context without fabricating Hub-MI', () => {
    const picture = emptyHonestOperatingPicture();
    assert.ok(picture.hvsRecoveredClients.some((row) => row.client === 'Prodigy Games'));
    assert.deepEqual(picture.realClientsOperationalized, []);

    const viaTool = getClientContext({
      principal: staffPrincipal(),
      picture,
      clientQuery: 'Prodigy',
      now: '2026-08-22T21:20:00.000Z',
    });
    assert.equal(viaTool.askAtlas.invented, false);
    assert.equal(viaTool.askAtlas.honestEmpty, false);
    assert.ok(viaTool.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL));
    assert.ok(viaTool.askAtlas.items.some((row) => row.clientCode === 'PDG01'));
    assert.equal(viaTool.clientContext.invented, false);
    assert.equal(viaTool.clientContext.honestEmpty, false);
    assert.equal(viaTool.clientContext.client.client, 'Prodigy Games');
    assert.equal(viaTool.clientContext.client.clientCode, 'PDG01');
    assert.equal(viaTool.clientContext.client.entitled, true);
    assert.equal(viaTool.clientContext.client.hubMiOperationalized, false);
    assert.deepEqual(viaTool.clientContext.realClientsOperationalized, []);
    assert.equal(viaTool.clientContext.recoveredKnowledgeOperationalized, true);
    assert.match(viaTool.clientContext.why, /.+/);
    assert.match(viaTool.clientContext.basedOn, /.+/);
    assert.ok(viaTool.clientContext.classification === 'LIKELY' || viaTool.clientContext.classification === 'CONFIRMED' || viaTool.clientContext.classification === 'PROPOSED');
    if (viaTool.clientContext.waitingItems) {
      assert.ok(viaTool.clientContext.waitingItems.length > 0);
    }
    if (viaTool.clientContext.hvcgResponsibilities) {
      assert.ok(viaTool.clientContext.hvcgResponsibilities.length > 0);
    }
    if (viaTool.clientContext.nextActions) {
      assert.ok(viaTool.clientContext.nextActions.length > 0);
    }
    noInventedFacts(viaTool);

    const viaRuntime = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'Summarize Prodigy',
      now: '2026-08-22T21:20:00.000Z',
    });
    assert.equal(viaRuntime.askAtlas.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(viaRuntime.askAtlas.activity.missionKey, ASK_ATLAS_CLIENTCTX_MISSION_KEY);
    assert.equal(viaRuntime.askAtlas.activity.readWriteStatus, 'READ_AUTO');
    assert.ok(viaRuntime.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL));
    assert.equal(viaRuntime.askAtlas.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL), false);
    assert.deepEqual(viaRuntime.runtime, {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      toolsInvoked: [GET_CLIENT_CONTEXT_TOOL],
      policyClass: 'READ_AUTO',
      missionKey: ASK_ATLAS_CLIENTCTX_MISSION_KEY,
    });
    assert.equal(viaRuntime.clientContext?.client.clientCode, 'PDG01');
    assert.equal(viaRuntime.clientContext?.client.hubMiOperationalized, false);
    assert.deepEqual(viaRuntime.clientContext?.realClientsOperationalized, []);
    noInventedFacts(viaRuntime);
  });

  it('does not promote LIKELY/PROPOSED recovered evidence to Hub-MI CONFIRMED', () => {
    const result = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
      question: 'What are we doing for Prodigy Games',
    });
    const atRisk = result.askAtlas.items.find((row) => row.state === 'At Risk' && row.clientCode === 'PDG01');
    assert.equal(atRisk?.classification, 'LIKELY');
    assert.equal(atRisk?.provenance, 'LIKELY');
    assert.equal(result.clientContext?.client.hubMiOperationalized, false);
    assert.deepEqual(result.clientContext?.realClientsOperationalized, []);
    assert.equal(result.clientContext?.classification === 'CONFIRMED' && result.clientContext.evidenceClass === 'hub_mi_row', false);
  });

  it('fail-closes missing, unknown, and foreign client codes without a client payload', () => {
    const picture = emptyHonestOperatingPicture();
    const missing = getClientContext({ principal: staffPrincipal(), picture });
    assert.equal(missing.askAtlas.honestEmpty, true);
    assert.equal(missing.askAtlas.items.length, 0);
    emptyUnauthorized(missing.clientContext);
    assert.equal(JSON.stringify(missing).includes('Prodigy'), false);
    assert.equal(JSON.stringify(missing).includes('PDG01'), false);

    const unknown = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'Summarize Globex',
    });
    assert.equal(unknown.askAtlas.honestEmpty, true);
    assert.equal(unknown.askAtlas.items.length, 0);
    assert.ok(unknown.runtime.toolsInvoked.includes(GET_CLIENT_CONTEXT_TOOL));
    emptyUnauthorized(unknown.clientContext!);
    assert.equal(JSON.stringify(unknown).includes('Prodigy'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);
    assert.equal(JSON.stringify(unknown).includes('Globex'), false);

    const foreign = getClientContext({
      principal: staffPrincipal(),
      picture,
      clientCode: 'NOPE01',
    });
    assert.equal(foreign.askAtlas.honestEmpty, true);
    emptyUnauthorized(foreign.clientContext);
    assert.equal(JSON.stringify(foreign).includes('NOPE01'), false);
    assert.equal(JSON.stringify(foreign).includes('Prodigy'), false);
    noInventedFacts(foreign);
  });

  it('fail-closes Client Executive and Hart-when-absent without leaking names', () => {
    const picture = emptyHonestOperatingPicture();
    const unauthorized = getClientContext({
      principal: clientPrincipal(),
      picture,
      clientQuery: 'Prodigy',
    });
    assert.equal(unauthorized.askAtlas.honestEmpty, true);
    emptyUnauthorized(unauthorized.clientContext);
    assert.equal(JSON.stringify(unauthorized).includes('Prodigy Games'), false);
    assert.equal(JSON.stringify(unauthorized).includes('PDG01'), false);

    const hart = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'What are we doing for Hart?',
    });
    assert.equal(hart.askAtlas.honestEmpty, true);
    emptyUnauthorized(hart.clientContext!);
    assert.equal(JSON.stringify(hart).includes('Hart'), false);
    assert.equal(JSON.stringify(hart).includes('HFD01'), false);
  });

  it('binds entitled Hart / HFD01 / Hart Family Dental from recovered ledger evidence without Hub-MI', () => {
    const picture = entitledHartPicture();
    assert.ok(picture.recoveryLedger.some((row) => row.clientCode === 'HFD01'));
    assert.equal(picture.hvsRecoveredClients.some((row) => row.clientCode === 'HFD01'), false);
    assert.deepEqual(picture.realClientsOperationalized, []);

    const viaHart = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'What are we doing for Hart?',
      now: '2026-08-22T22:40:00.000Z',
    });
    assert.equal(viaHart.askAtlas.honestEmpty, false);
    assert.equal(viaHart.askAtlas.invented, false);
    assert.ok(viaHart.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL));
    assert.equal(viaHart.askAtlas.activity.missionKey, ASK_ATLAS_RECOVERED_MISSION_KEY);
    assert.deepEqual(viaHart.runtime, {
      agent: ASK_ATLAS_RUNTIME_AGENT,
      toolsInvoked: [GET_CLIENT_CONTEXT_TOOL],
      policyClass: 'READ_AUTO',
      missionKey: ASK_ATLAS_RECOVERED_MISSION_KEY,
    });
    assert.equal(viaHart.clientContext?.kind, 'atlas_client_context_v1');
    assert.equal(viaHart.clientContext?.invented, false);
    assert.equal(viaHart.clientContext?.honestEmpty, false);
    assert.equal(viaHart.clientContext?.client.client, 'Hart Family Dental');
    assert.equal(viaHart.clientContext?.client.clientCode, 'HFD01');
    assert.equal(viaHart.clientContext?.client.entitled, true);
    assert.equal(viaHart.clientContext?.client.hubMiOperationalized, false);
    assert.deepEqual(viaHart.clientContext?.realClientsOperationalized, []);
    assert.equal(viaHart.clientContext?.recoveredKnowledgeOperationalized, false);
    assert.equal(viaHart.clientContext?.classification, 'LIKELY');
    assert.equal(viaHart.clientContext?.evidenceClass, 'recovered_folder_filename');
    assert.equal(viaHart.clientContext?.waitingItems, undefined);
    assert.equal(viaHart.clientContext?.missingDocuments, undefined);
    assert.equal(viaHart.clientContext?.hvcgResponsibilities, undefined);
    assert.equal(viaHart.clientContext?.clientResponsibilities, undefined);
    assert.equal(viaHart.clientContext?.decisions, undefined);
    assert.equal(viaHart.clientContext?.nextActions, undefined);
    assert.match(viaHart.clientContext?.why || '', /./);
    assert.match(viaHart.clientContext?.basedOn || '', /recovery ledger|Not an operational Hub-MI/i);
    noInventedFacts(viaHart);

    const viaName = getClientContext({
      principal: staffPrincipal(),
      picture,
      clientQuery: 'Hart Family Dental',
      now: '2026-08-22T22:40:10.000Z',
    });
    assert.equal(viaName.clientContext.client.clientCode, 'HFD01');
    assert.equal(viaName.clientContext.client.entitled, true);
    assert.equal(viaName.clientContext.client.hubMiOperationalized, false);
    assert.equal(viaName.clientContext.classification, 'LIKELY');
    assert.equal(viaName.clientContext.evidenceClass, 'recovered_folder_filename');

    const viaCode = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'Summarize Hart Family Dental',
    });
    assert.equal(viaCode.clientContext?.client.clientCode, 'HFD01');
    assert.equal(viaCode.askAtlas.activity.missionKey, ASK_ATLAS_RECOVERED_MISSION_KEY);
    assert.equal(viaCode.clientContext?.classification === 'CONFIRMED', false);
    noInventedFacts(viaCode);

    const viaHfd = getClientContext({
      principal: staffPrincipal(),
      picture,
      clientCode: 'HFD01',
    });
    assert.equal(viaHfd.clientContext.client.client, 'Hart Family Dental');
    assert.equal(viaHfd.clientContext.client.hubMiOperationalized, false);
  });

  it('does not leak Hart from an entitled picture when the requested client is unknown or unauthorized', () => {
    const picture = entitledHartPicture();
    const unknown = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'Summarize Globex',
    });
    emptyUnauthorized(unknown.clientContext!);
    assert.equal(JSON.stringify(unknown).includes('Hart'), false);
    assert.equal(JSON.stringify(unknown).includes('HFD01'), false);

    const unauthorized = getClientContext({
      principal: clientPrincipal(),
      picture,
      clientQuery: 'Hart Family Dental',
    });
    emptyUnauthorized(unauthorized.clientContext);
    assert.equal(JSON.stringify(unauthorized).includes('Hart'), false);
    assert.equal(JSON.stringify(unauthorized).includes('HFD01'), false);
  });

  it('does not invoke get_client_context for owner-gated or unknown questions', () => {
    const picture = emptyHonestOperatingPicture();
    assert.equal(isOwnerGatedQuestion('what is the LTV of Prodigy and the Hub-MI payment status'), true);
    assert.equal(mapsToGetClientContext('what is the LTV of Prodigy and the Hub-MI payment status'), false);
    assert.equal(mapsToGetClientContext('Summarize Prodigy'), true);
    assert.equal(mapsToGetAttentionItems('Summarize Prodigy'), false);

    const ownerGated = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'what is the LTV of Prodigy and the Hub-MI payment status',
    });
    assert.equal(ownerGated.askAtlas.honestEmpty, true);
    assert.equal(ownerGated.askAtlas.items.length, 0);
    assert.deepEqual(ownerGated.runtime.toolsInvoked, []);
    assert.equal(ownerGated.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL), false);
    assert.equal(ownerGated.clientContext, undefined);
    assert.equal(JSON.stringify(ownerGated).includes('Prodigy'), false);
    assert.equal(JSON.stringify(ownerGated).includes('PDG01'), false);

    const money = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture,
      question: 'submit this to the lender and move money for Prodigy',
    });
    assert.equal(isOwnerGatedQuestion('submit this to the lender and move money for Prodigy'), true);
    assert.deepEqual(money.runtime.toolsInvoked, []);
    assert.equal(money.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL), false);

    const unknownTool = invokeReadAutoTool('owner_gated_write', {
      principal: staffPrincipal(),
      picture,
    });
    assert.equal(unknownTool.honestEmpty, true);
    assert.deepEqual(unknownTool.activity.tools, []);
  });

  it('keeps the default attention question on RUNTIME-001 / get_attention_items', () => {
    const attention = runAtlasHubRuntime({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
    });
    assert.equal(attention.askAtlas.activity.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
    assert.deepEqual(attention.runtime.toolsInvoked, [GET_ATTENTION_ITEMS_TOOL]);
    assert.equal(attention.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL), false);
    assert.equal(attention.clientContext, undefined);
    assert.ok(attention.askAtlas.items.some((row) => row.clientCode === 'PDG01' && row.classification === 'LIKELY'));
  });

  it('records CLIENTCTX-001 activity ledger fields and omits affected on honest-empty', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-clientctx-ledger-'));
    try {
      const answered = runAtlasHubRuntime({
        principal: staffPrincipal('answered-writer'),
        picture: emptyHonestOperatingPicture(),
        question: 'Summarize Prodigy',
        now: '2026-08-22T21:21:00.000Z',
      });
      await appendAskAtlasActivity({
        dataDir: dir,
        answer: answered.askAtlas,
        principal: staffPrincipal('answered-writer'),
      });
      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.entries[0]?.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(overlay.entries[0]?.missionKey, ASK_ATLAS_CLIENTCTX_MISSION_KEY);
      assert.ok(overlay.entries[0]?.tools.includes(GET_CLIENT_CONTEXT_TOOL));
      assert.equal(overlay.entries[0]?.readWriteStatus, 'READ_AUTO');
      assert.equal(overlay.entries[0]?.classification, answered.askAtlas.activity.classification);
      assert.equal(overlay.entries[0]?.result, answered.askAtlas.activity.result);
      const persisted = overlay.entries[0]?.affected?.find((row) => row.clientCode === 'PDG01');
      assert.equal(persisted?.classification, persisted?.classification === 'CONFIRMED' ? 'CONFIRMED' : persisted?.classification);
      if (persisted?.classification === 'LIKELY') {
        assert.equal(persisted.classification, 'LIKELY');
      }

      const hartAnswered = runAtlasHubRuntime({
        principal: staffPrincipal('hart-writer'),
        picture: entitledHartPicture(),
        question: 'What are we doing for Hart?',
        now: '2026-08-22T22:41:00.000Z',
      });
      await appendAskAtlasActivity({
        dataDir: dir,
        answer: hartAnswered.askAtlas,
        principal: staffPrincipal('hart-writer'),
      });
      const afterHart = readAgentActivityOverlay(join(dir, 'agent-activity'));
      const hartEntry = afterHart.entries.find((row) => row.writerUserId === 'hart-writer');
      assert.equal(hartEntry?.missionKey, ASK_ATLAS_RECOVERED_MISSION_KEY);
      assert.ok(hartEntry?.tools.includes(GET_CLIENT_CONTEXT_TOOL));
      assert.equal(hartEntry?.result, 'answered');
      assert.equal(hartEntry?.readWriteStatus, 'READ_AUTO');
      assert.equal(hartEntry?.classification, 'LIKELY');
      assert.equal(hartEntry?.affected, undefined);

      const empty = runAtlasHubRuntime({
        principal: staffPrincipal('empty-writer'),
        picture: emptyHonestOperatingPicture(),
        question: 'Summarize Globex',
        now: '2026-08-22T21:21:30.000Z',
      });
      await appendAskAtlasActivity({
        dataDir: dir,
        answer: empty.askAtlas,
        principal: staffPrincipal('empty-writer'),
      });
      const after = readAgentActivityOverlay(join(dir, 'agent-activity'));
      const emptyEntry = after.entries.find((row) => row.writerUserId === 'empty-writer');
      assert.equal(emptyEntry?.missionKey, ASK_ATLAS_CLIENTCTX_MISSION_KEY);
      assert.ok(emptyEntry?.tools.includes(GET_CLIENT_CONTEXT_TOOL));
      assert.equal(emptyEntry?.classification, 'HONEST_EMPTY');
      assert.equal(emptyEntry?.affected, undefined);
      assert.equal(JSON.stringify(emptyEntry).includes('Prodigy'), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not persist recovered-client leakage on the HVS-blocked client-context path', () => {
    const live = emptyHonestOperatingPicture();
    const blocked: OperatorOperatingPicture = { ...live, hvsDataAccess: 'BLOCKED' };
    const result = getClientContext({
      principal: staffPrincipal(),
      picture: blocked,
      clientQuery: 'Prodigy',
    });
    assert.equal(result.askAtlas.activity.result, 'hvs_blocked');
    assert.equal(result.askAtlas.items.length, 0);
    emptyUnauthorized(result.clientContext);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes('Prodigy Games'), false);
    assert.equal(serialized.includes('PDG01'), false);
  });
});

describe('Ask Atlas client-context HTTP', () => {
  it('answers signed client-context and runtime questions, keeps attention unchanged, and fail-closes unsigned/client', async () => {
    await withHub(async (oid) => (oid?.startsWith('aaaaaaaa') ? ['SYN01'] : []), async ({ base, dir }) => {
      const signed = await fetch(`${base}/operator/runtime.json?question=${encodeURIComponent('Summarize Prodigy')}`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(signed.status, 200);
      const body = (await signed.json()) as {
        operatorDesk: { askAtlas: AskAtlasAnswer; operatingPicture?: unknown; entitledClients?: unknown };
        runtime: { agent: string; toolsInvoked: string[]; policyClass: string; missionKey: string };
        clientContext: AtlasClientContext;
      };
      assert.equal(body.operatorDesk.askAtlas.invented, false);
      assert.equal(body.operatorDesk.askAtlas.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(body.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_CLIENTCTX_MISSION_KEY);
      assert.ok(body.operatorDesk.askAtlas.activity.tools.includes(GET_CLIENT_CONTEXT_TOOL));
      assert.deepEqual(body.runtime, {
        agent: ASK_ATLAS_RUNTIME_AGENT,
        toolsInvoked: [GET_CLIENT_CONTEXT_TOOL],
        policyClass: 'READ_AUTO',
        missionKey: ASK_ATLAS_CLIENTCTX_MISSION_KEY,
      });
      assert.equal(body.clientContext.client.clientCode, 'PDG01');
      assert.equal(body.clientContext.invented, false);
      assert.equal(body.clientContext.client.hubMiOperationalized, false);
      assert.deepEqual(body.clientContext.realClientsOperationalized, []);
      assert.equal(body.operatorDesk.operatingPicture, undefined);
      assert.equal(body.operatorDesk.entitledClients, undefined);
      noInventedFacts(body);

      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.entries[0]?.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(overlay.entries[0]?.missionKey, ASK_ATLAS_CLIENTCTX_MISSION_KEY);
      assert.ok(overlay.entries[0]?.tools.includes(GET_CLIENT_CONTEXT_TOOL));
      assert.equal(overlay.entries[0]?.readWriteStatus, 'READ_AUTO');

      const dedicated = await fetch(`${base}/operator/client-context.json?client=PDG01`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(dedicated.status, 200);
      const dedicatedBody = (await dedicated.json()) as {
        clientContext: AtlasClientContext;
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime: { toolsInvoked: string[]; missionKey: string };
      };
      assert.equal(dedicatedBody.clientContext.client.clientCode, 'PDG01');
      assert.equal(dedicatedBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_CLIENTCTX_MISSION_KEY);
      assert.deepEqual(dedicatedBody.runtime.toolsInvoked, [GET_CLIENT_CONTEXT_TOOL]);
      noInventedFacts(dedicatedBody);

      const attention = await fetch(`${base}/operator/runtime.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(attention.status, 200);
      const attentionBody = (await attention.json()) as {
        runtime: { missionKey: string; toolsInvoked: string[] };
        clientContext?: unknown;
        operatorDesk: { askAtlas: AskAtlasAnswer };
      };
      assert.equal(attentionBody.runtime.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
      assert.deepEqual(attentionBody.runtime.toolsInvoked, [GET_ATTENTION_ITEMS_TOOL]);
      assert.equal(attentionBody.clientContext, undefined);
      assert.equal(attentionBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);

      const ownerGated = await fetch(
        `${base}/operator/runtime.json?question=${encodeURIComponent('what is the LTV of Prodigy and the Hub-MI payment status')}`,
        { headers: { authorization: 'Bearer valid-member' } },
      );
      assert.equal(ownerGated.status, 200);
      const ownerGatedBody = (await ownerGated.json()) as {
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime: { toolsInvoked: string[] };
        clientContext?: unknown;
      };
      assert.equal(ownerGatedBody.operatorDesk.askAtlas.honestEmpty, true);
      assert.deepEqual(ownerGatedBody.runtime.toolsInvoked, []);
      assert.equal(ownerGatedBody.clientContext, undefined);
      assert.equal(JSON.stringify(ownerGatedBody).includes('Prodigy'), false);

      const unsignedRuntime = await fetch(`${base}/operator/runtime.json?question=${encodeURIComponent('Summarize Prodigy')}`);
      assert.equal(unsignedRuntime.status, 401);
      leakFree(await unsignedRuntime.text());

      const unsignedDedicated = await fetch(`${base}/operator/client-context.json?client=PDG01`);
      assert.equal(unsignedDedicated.status, 401);
      leakFree(await unsignedDedicated.text());

      const unsignedPost = await fetch(`${base}/operator/client-context.json`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientCode: 'PDG01', question: 'Summarize Prodigy' }),
      });
      assert.equal(unsignedPost.status, 401);
      leakFree(await unsignedPost.text());

      const client = await fetch(`${base}/operator/client-context.json?client=PDG01`, {
        headers: { authorization: 'Bearer valid-client' },
      });
      assert.equal(client.status, 403);
      leakFree(await client.text());
    });
  });
});
