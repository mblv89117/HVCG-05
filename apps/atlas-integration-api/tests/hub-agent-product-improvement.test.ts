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
  writeAgentActivityOverlay,
} from '../src/pm/operatorDesk/activityLedger.ts';
import {
  classifyImprovementPolicy,
  inspectProductImprovements,
} from '../src/pm/operatorDesk/productImprovement.ts';
import { buildOperatorDeskModel, emptyHonestDesk, emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_EVENT_MISSION_KEY,
  ASK_ATLAS_MISSION_KEY,
  ASK_ATLAS_OPERATOR_AGENT,
  ASK_ATLAS_PII_MISSION_KEY,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  CREATE_ENGINEERING_MISSION_TOOL,
  GET_ATTENTION_ITEMS_TOOL,
  isOperatorEventsPath,
  isOperatorImprovementsPath,
  isOperatorRuntimePath,
  type AgentActivityLedgerEntry,
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
  'eventProcessing',
  'productImprovement',
  'operatorDesk',
  '250000',
  'Hub-MI',
];

function staffPrincipal(userId = 'pii-writer'): AtlasPrincipal {
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

function failedLedgerEntry(overrides: Partial<AgentActivityLedgerEntry> = {}): AgentActivityLedgerEntry {
  return {
    agent: ASK_ATLAS_RUNTIME_AGENT,
    missionKey: ASK_ATLAS_RUNTIME_MISSION_KEY,
    trigger: 'signed_operator_question',
    timestamp: '2026-08-22T20:00:00.000Z',
    tools: [GET_ATTENTION_ITEMS_TOOL],
    classification: 'LIKELY',
    confidence: 'LIKELY',
    result: 'fail_closed',
    readWriteStatus: 'READ_AUTO',
    policyDecision: 'fail_closed',
    writerUserId: 'pii-writer',
    ...overrides,
  };
}

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string; dir: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-agent-pii-'));
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

describe('Ask Atlas product improvement intelligence', () => {
  it('routes /operator/improvements.json as a signed operator JSON path', () => {
    assert.equal(isOperatorImprovementsPath('/operator/improvements.json'), true);
    assert.equal(isOperatorImprovementsPath('/operator/events.json'), false);
    assert.equal(isOperatorImprovementsPath('/operator/runtime.json'), false);
    assert.equal(isOperatorImprovementsPath('/operator.json'), false);
    assert.equal(isOperatorEventsPath('/operator/improvements.json'), false);
    assert.equal(isOperatorRuntimePath('/operator/improvements.json'), false);
  });

  it('proposes a non-authoritative engineering mission from evidence-supported failures without inventing issues', () => {
    const picture = emptyHonestOperatingPicture();
    const failed = inspectProductImprovements({
      principal: staffPrincipal(),
      picture,
      ledger: [failedLedgerEntry()],
      inspectClass: 'failed_agent_action',
      now: '2026-08-22T20:32:00.000Z',
    });

    assert.equal(classifyImprovementPolicy('failed_agent_action', staffPrincipal()).allowed, true);
    assert.equal(failed.productImprovement.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(failed.productImprovement.missionKey, ASK_ATLAS_PII_MISSION_KEY);
    assert.equal(failed.productImprovement.invented, false);
    assert.equal(failed.productImprovement.honestEmpty, false);
    assert.equal(failed.productImprovement.outcome, 'proposed_mission');
    assert.equal(failed.productImprovement.policyClass, 'PROPOSE_AUTO');
    assert.equal(failed.askAtlas.invented, false);
    assert.equal(failed.askAtlas.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(failed.askAtlas.activity.missionKey, ASK_ATLAS_PII_MISSION_KEY);
    assert.equal(failed.askAtlas.activity.trigger, 'signed_operator_inspect');
    assert.equal(failed.askAtlas.activity.readWriteStatus, 'SAFE_INTERNAL_WRITE');
    assert.ok(failed.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL));
    assert.deepEqual(failed.runtime.toolsInvoked, [CREATE_ENGINEERING_MISSION_TOOL]);
    assert.equal(failed.runtime.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(failed.runtime.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
    assert.equal(failed.proposedMissions?.length, undefined);
    assert.equal(failed.productImprovement.proposedMissions.length, 1);
    const mission = failed.productImprovement.proposedMissions[0]!;
    assert.equal(mission.kind, 'proposed_engineering_mission_v1');
    assert.equal(mission.authoritative, false);
    assert.equal(mission.invented, false);
    assert.equal(mission.status, 'PROPOSED');
    assert.equal(mission.policyClass, 'PROPOSE_AUTO');
    assert.equal(mission.readWriteStatus, 'SAFE_INTERNAL_WRITE');
    assert.equal(mission.dispatchesV4, false);
    assert.equal(mission.deploys, false);
    assert.equal(mission.merges, false);
    assert.equal(mission.executesCodeChanges, false);
    assert.equal(mission.ownerGated, false);
    assert.equal(mission.evidenceClass, 'failed_agent_action');
    assert.equal(mission.classification, 'LIKELY');
    assert.match(mission.why, /failed closed/i);
    assert.match(mission.basedOn, /Agent Activity Ledger/);
    noInventedFacts(failed);

    const eventFail = inspectProductImprovements({
      principal: staffPrincipal(),
      picture,
      ledger: [
        failedLedgerEntry({
          missionKey: ASK_ATLAS_EVENT_MISSION_KEY,
          trigger: 'authorized_internal_event',
        }),
      ],
      inspectClass: 'event_processing_failure',
    });
    assert.equal(eventFail.productImprovement.proposedMissions[0]?.evidenceClass, 'event_processing_failure');
    assert.equal(eventFail.productImprovement.invented, false);
    noInventedFacts(eventFail);

    const health = inspectProductImprovements({
      principal: staffPrincipal(),
      picture,
      health: { authRequired: false, insecureDevAuth: true },
      inspectClass: 'production_health_degradation',
    });
    assert.equal(health.productImprovement.proposedMissions[0]?.evidenceClass, 'production_health_degradation');
    assert.equal(health.productImprovement.proposedMissions[0]?.classification, 'CONFIRMED');
    assert.match(health.productImprovement.proposedMissions[0]!.basedOn, /authRequired=false/);
    noInventedFacts(health);

    const search = inspectProductImprovements({
      principal: staffPrincipal(),
      picture,
      search: {
        ran: true,
        failed: true,
        failureEvidence: 'Entitled operator search already recorded a failure',
        classification: 'LIKELY',
      },
      inspectClass: 'entitled_search_failure',
    });
    assert.equal(search.productImprovement.proposedMissions[0]?.evidenceClass, 'entitled_search_failure');
    assert.equal(search.productImprovement.proposedMissions[0]?.classification, 'LIKELY');
    noInventedFacts(search);
  });

  it('returns honest-empty when no evidence-supported issue exists', () => {
    const picture = emptyHonestOperatingPicture();
    const empty = inspectProductImprovements({
      principal: staffPrincipal(),
      picture,
      ledger: [],
      health: { authRequired: true, insecureDevAuth: false },
      search: { ran: false, failed: false },
      inspectClass: 'inspect',
      now: '2026-08-22T20:32:10.000Z',
    });
    assert.equal(empty.productImprovement.honestEmpty, true);
    assert.equal(empty.productImprovement.invented, false);
    assert.equal(empty.productImprovement.outcome, 'honest_empty');
    assert.equal(empty.productImprovement.proposedMissions.length, 0);
    assert.equal(empty.askAtlas.honestEmpty, true);
    assert.equal(empty.askAtlas.items.length, 0);
    assert.deepEqual(empty.runtime.toolsInvoked, []);
    assert.equal(empty.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL), false);
    assert.equal(JSON.stringify(empty).includes('invented a product issue'), false);
    noInventedFacts(empty);
  });

  it('keeps unknown and owner-gated inspect classes honest-empty without retrieval', () => {
    const picture = emptyHonestOperatingPicture();
    const unknown = inspectProductImprovements({
      principal: staffPrincipal(),
      picture,
      ledger: [failedLedgerEntry()],
      health: { authRequired: false, insecureDevAuth: true },
      inspectClass: 'invent an LTV and Hub-MI row',
      now: '2026-08-22T20:32:20.000Z',
    });
    assert.equal(unknown.askAtlas.honestEmpty, true);
    assert.equal(unknown.askAtlas.invented, false);
    assert.equal(unknown.productImprovement.honestEmpty, true);
    assert.equal(unknown.productImprovement.proposedMissions.length, 0);
    assert.deepEqual(unknown.runtime.toolsInvoked, []);
    assert.equal(unknown.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL), false);
    assert.equal(JSON.stringify(unknown).includes('Prodigy'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);
    noInventedFacts(unknown);

    const ownerGated = inspectProductImprovements({
      principal: staffPrincipal(),
      picture,
      ledger: [failedLedgerEntry()],
      inspectClass: 'lender_outreach',
    });
    assert.equal(classifyImprovementPolicy('lender_outreach', staffPrincipal()).reason, 'owner_gated');
    assert.equal(ownerGated.askAtlas.honestEmpty, true);
    assert.deepEqual(ownerGated.runtime.toolsInvoked, []);
    assert.equal(ownerGated.productImprovement.proposedMissions.length, 0);
    noInventedFacts(ownerGated);

    const unauthorized = inspectProductImprovements({
      principal: clientPrincipal(),
      picture,
      ledger: [failedLedgerEntry()],
      inspectClass: 'failed_agent_action',
    });
    assert.equal(unauthorized.askAtlas.honestEmpty, true);
    assert.deepEqual(unauthorized.runtime.toolsInvoked, []);
    assert.equal(JSON.stringify(unauthorized).includes('Prodigy Games'), false);
    assert.equal(JSON.stringify(unauthorized).includes('PDG01'), false);
  });

  it('does not persist recovered-client leakage on the HVS-blocked improvement path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pii-hvs-blocked-'));
    try {
      const live = emptyHonestOperatingPicture();
      assert.ok(live.hvsRecoveredClients.some((row) => row.client === 'Prodigy Games'));
      const blocked: OperatorOperatingPicture = {
        ...live,
        hvsDataAccess: 'BLOCKED',
      };
      const result = inspectProductImprovements({
        principal: staffPrincipal('blocked-pii'),
        picture: blocked,
        ledger: [
          failedLedgerEntry({
            writerUserId: 'blocked-pii',
            affected: [{ client: 'Prodigy Games', clientCode: 'PDG01', classification: 'LIKELY' }],
          }),
        ],
        inspectClass: 'failed_agent_action',
        now: '2026-08-22T20:32:30.000Z',
      });
      assert.equal(result.askAtlas.activity.result, 'hvs_blocked');
      assert.equal(result.askAtlas.activity.classification, 'HONEST_EMPTY');
      assert.equal(result.askAtlas.items.length, 0);
      assert.equal(result.askAtlas.honestEmpty, true);
      assert.equal(result.productImprovement.outcome, 'hvs_blocked');
      assert.equal(result.productImprovement.proposedMissions.length, 0);
      assert.deepEqual(result.runtime.toolsInvoked, []);
      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes('Prodigy Games'), false);
      assert.equal(serialized.includes('Colorado Beef'), false);
      assert.equal(serialized.includes('PDG01'), false);
      assert.equal(serialized.includes('CCB01'), false);

      await appendAskAtlasActivity({
        dataDir: dir,
        answer: result.askAtlas,
        principal: staffPrincipal('blocked-pii'),
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
      assert.equal(overlay.entries[0]?.missionKey, ASK_ATLAS_PII_MISSION_KEY);
      assert.equal(overlay.entries[0]?.classification, 'HONEST_EMPTY');
      assert.equal(overlay.entries[0]?.tools.includes(CREATE_ENGINEERING_MISSION_TOOL), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never silently promotes LIKELY to CONFIRMED on the improvement path', async () => {
    const model = buildOperatorDeskModel({
      hubSha: 'd2d92f8',
      entitledClients: ['SYN01'],
      commandCenter: {},
      commercialContext: emptyHonestDesk(1),
    });
    assert.equal(model.askAtlas.activity.agent, ASK_ATLAS_OPERATOR_AGENT);
    assert.equal(model.askAtlas.activity.missionKey, ASK_ATLAS_MISSION_KEY);

    const result = inspectProductImprovements({
      principal: staffPrincipal(),
      picture: model.operatingPicture,
      ledger: [failedLedgerEntry({ classification: 'LIKELY', confidence: 'LIKELY' })],
      inspectClass: 'failed_agent_action',
    });
    const mission = result.productImprovement.proposedMissions[0];
    assert.equal(mission?.classification, 'LIKELY');
    assert.equal(mission?.classification === 'CONFIRMED', false);
    assert.equal(result.askAtlas.activity.classification, 'LIKELY');
    assert.equal(result.askAtlas.activity.classification === 'CONFIRMED', false);

    const dir = mkdtempSync(join(tmpdir(), 'atlas-pii-class-'));
    try {
      await appendAskAtlasActivity({
        dataDir: dir,
        answer: result.askAtlas,
        principal: staffPrincipal(),
      });
      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.schemaVersion, 1);
      assert.equal(overlay.entries[0]?.classification, 'LIKELY');
      assert.equal(overlay.entries[0]?.confidence, 'LIKELY');
      assert.equal(overlay.entries[0]?.missionKey, ASK_ATLAS_PII_MISSION_KEY);
      assert.equal(overlay.entries[0]?.readWriteStatus, 'SAFE_INTERNAL_WRITE');
      assert.ok(overlay.entries[0]?.tools.includes(CREATE_ENGINEERING_MISSION_TOOL));
      assert.equal(overlay.entries[0]?.affected, undefined);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Ask Atlas product improvement HTTP', () => {
  it('answers signed improvements.json, keeps operator.json/runtime.json/events.json unchanged, and fail-closes unsigned/client', async () => {
    await withHub(async (oid) => (oid?.startsWith('aaaaaaaa') ? ['SYN01'] : []), async ({ base, dir }) => {
      writeAgentActivityOverlay(join(dir, 'agent-activity'), {
        schemaVersion: 1,
        entries: [
          failedLedgerEntry({
            writerUserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            missionKey: ASK_ATLAS_EVENT_MISSION_KEY,
            trigger: 'authorized_internal_event',
          }),
        ],
      });

      const signed = await fetch(`${base}/operator/improvements.json?inspect=event_processing_failure`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(signed.status, 200);
      const body = (await signed.json()) as {
        productImprovement: {
          agent: string;
          missionKey: string;
          policyClass: string;
          trigger: string;
          inspectClass: string;
          outcome: string;
          invented: boolean;
          proposedMissions: Array<{
            authoritative: boolean;
            invented: boolean;
            classification: string;
            evidenceClass: string;
            why: string;
            basedOn: string;
          }>;
        };
        operatorDesk: { askAtlas: AskAtlasAnswer; operatingPicture?: unknown; entitledClients?: unknown };
        runtime: { agent: string; toolsInvoked: string[]; policyClass: string; missionKey: string };
      };
      assert.equal(body.productImprovement.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(body.productImprovement.missionKey, ASK_ATLAS_PII_MISSION_KEY);
      assert.equal(body.productImprovement.policyClass, 'PROPOSE_AUTO');
      assert.equal(body.productImprovement.trigger, 'signed_operator_inspect');
      assert.equal(body.productImprovement.inspectClass, 'event_processing_failure');
      assert.equal(body.productImprovement.invented, false);
      assert.equal(body.productImprovement.outcome, 'proposed_mission');
      assert.equal(body.operatorDesk.askAtlas.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(body.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_PII_MISSION_KEY);
      assert.ok(body.operatorDesk.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL));
      assert.deepEqual(body.runtime.toolsInvoked, [CREATE_ENGINEERING_MISSION_TOOL]);
      assert.equal(body.runtime.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
      assert.equal(body.operatorDesk.operatingPicture, undefined);
      assert.equal(body.operatorDesk.entitledClients, undefined);
      assert.equal(body.productImprovement.proposedMissions[0]?.authoritative, false);
      assert.equal(body.productImprovement.proposedMissions[0]?.invented, false);
      assert.equal(body.productImprovement.proposedMissions[0]?.classification, 'LIKELY');
      assert.match(body.productImprovement.proposedMissions[0]!.why, /.+/);
      assert.match(body.productImprovement.proposedMissions[0]!.basedOn, /.+/);
      noInventedFacts(body);

      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.schemaVersion, 1);
      const piiEntry = overlay.entries.find((row) => row.missionKey === ASK_ATLAS_PII_MISSION_KEY);
      assert.equal(piiEntry?.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(piiEntry?.missionKey, ASK_ATLAS_PII_MISSION_KEY);
      assert.ok(piiEntry?.tools.includes(CREATE_ENGINEERING_MISSION_TOOL));
      assert.equal(piiEntry?.classification, 'LIKELY');
      assert.equal(piiEntry?.confidence, 'LIKELY');

      const posted = await fetch(`${base}/operator/improvements.json`, {
        method: 'POST',
        headers: { authorization: 'Bearer valid-member', 'content-type': 'application/json' },
        body: JSON.stringify({
          inspectClass: 'failed_agent_action',
          amount: 250000,
          ltv: 80,
          'Hub-MI': 'ignore',
        }),
      });
      assert.equal(posted.status, 200);
      const postedBody = (await posted.json()) as {
        productImprovement: { inspectClass: string; honestEmpty: boolean; invented: boolean };
        operatorDesk: { askAtlas: AskAtlasAnswer };
      };
      assert.equal(postedBody.productImprovement.inspectClass, 'failed_agent_action');
      assert.equal(postedBody.productImprovement.invented, false);
      assert.equal(postedBody.productImprovement.honestEmpty, true);
      noInventedFacts(postedBody);

      const desk = await fetch(`${base}/operator.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(desk.status, 200);
      const deskBody = (await desk.json()) as {
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime?: unknown;
        eventProcessing?: unknown;
        productImprovement?: unknown;
      };
      assert.equal(deskBody.operatorDesk.askAtlas.activity.agent, ASK_ATLAS_OPERATOR_AGENT);
      assert.equal(deskBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_MISSION_KEY);
      assert.equal(deskBody.operatorDesk.askAtlas.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL), false);
      assert.equal(deskBody.operatorDesk.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL), false);
      assert.equal(deskBody.runtime, undefined);
      assert.equal(deskBody.eventProcessing, undefined);
      assert.equal(deskBody.productImprovement, undefined);

      const runtime = await fetch(`${base}/operator/runtime.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(runtime.status, 200);
      const runtimeBody = (await runtime.json()) as {
        runtime: { agent: string; missionKey: string };
        eventProcessing?: unknown;
        productImprovement?: unknown;
        operatorDesk: { askAtlas: AskAtlasAnswer };
      };
      assert.equal(runtimeBody.runtime.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(runtimeBody.runtime.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
      assert.equal(runtimeBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
      assert.equal(runtimeBody.eventProcessing, undefined);
      assert.equal(runtimeBody.productImprovement, undefined);

      const events = await fetch(`${base}/operator/events.json?event=attention_at_risk`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(events.status, 200);
      const eventsBody = (await events.json()) as {
        eventProcessing: { missionKey: string };
        productImprovement?: unknown;
        operatorDesk: { askAtlas: AskAtlasAnswer };
      };
      assert.equal(eventsBody.eventProcessing.missionKey, ASK_ATLAS_EVENT_MISSION_KEY);
      assert.equal(eventsBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_EVENT_MISSION_KEY);
      assert.equal(eventsBody.productImprovement, undefined);

      const unsigned = await fetch(`${base}/operator/improvements.json`);
      assert.equal(unsigned.status, 401);
      const unsignedText = await unsigned.text();
      leakFree(unsignedText);
      const unsignedBody = JSON.parse(unsignedText) as {
        error: string;
        askAtlas?: unknown;
        agentActivity?: unknown;
        runtime?: unknown;
        operatorDesk?: unknown;
        eventProcessing?: unknown;
        productImprovement?: unknown;
      };
      assert.equal(unsignedBody.error, 'unauthorized');
      assert.equal(unsignedBody.askAtlas, undefined);
      assert.equal(unsignedBody.agentActivity, undefined);
      assert.equal(unsignedBody.runtime, undefined);
      assert.equal(unsignedBody.operatorDesk, undefined);
      assert.equal(unsignedBody.eventProcessing, undefined);
      assert.equal(unsignedBody.productImprovement, undefined);

      const unsignedPost = await fetch(`${base}/operator/improvements.json`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inspectClass: 'failed_agent_action' }),
      });
      assert.equal(unsignedPost.status, 401);
      leakFree(await unsignedPost.text());

      const client = await fetch(`${base}/operator/improvements.json?inspect=failed_agent_action`, {
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
        eventProcessing?: unknown;
        productImprovement?: unknown;
      };
      assert.equal(clientBody.error, 'forbidden');
      assert.equal(clientBody.askAtlas, undefined);
      assert.equal(clientBody.runtime, undefined);
      assert.equal(clientBody.operatorDesk, undefined);
      assert.equal(clientBody.eventProcessing, undefined);
      assert.equal(clientBody.productImprovement, undefined);

      const unknown = await fetch(
        `${base}/operator/improvements.json?inspect=${encodeURIComponent('invent an LTV and Hub-MI row')}`,
        { headers: { authorization: 'Bearer valid-member' } },
      );
      assert.equal(unknown.status, 200);
      const unknownBody = (await unknown.json()) as {
        productImprovement: { outcome: string; honestEmpty: boolean; proposedMissions: unknown[] };
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime: { toolsInvoked: string[] };
      };
      assert.equal(unknownBody.productImprovement.honestEmpty, true);
      assert.equal(unknownBody.productImprovement.proposedMissions.length, 0);
      assert.equal(unknownBody.operatorDesk.askAtlas.items.length, 0);
      assert.deepEqual(unknownBody.runtime.toolsInvoked, []);
      noInventedFacts(unknownBody);
    });
  });
});
