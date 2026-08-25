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
  classifyLoopPolicy,
  inspectEngineeringMissions,
  listPersistedEngineeringMissions,
  persistEngineeringMissionRecords,
  readEngineeringMissionOverlay,
  resolveEngineeringMissionOverlayDir,
} from '../src/pm/operatorDesk/engineeringLoop.ts';
import { buildOperatorDeskModel, emptyHonestDesk, emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_EVENT_MISSION_KEY,
  ASK_ATLAS_LOOP_MISSION_KEY,
  ASK_ATLAS_MISSION_KEY,
  ASK_ATLAS_OPERATOR_AGENT,
  ASK_ATLAS_PII_MISSION_KEY,
  ASK_ATLAS_RUNTIME_AGENT,
  ASK_ATLAS_RUNTIME_MISSION_KEY,
  CREATE_ENGINEERING_MISSION_TOOL,
  ENGINEERING_MISSION_DISPATCH_STATUS,
  GET_ATTENTION_ITEMS_TOOL,
  V4_CHAT_INJECT,
  isOperatorEngineeringMissionsPath,
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
  'engineeringMission',
  'operatorDesk',
  '250000',
  'Hub-MI',
];

function staffPrincipal(userId = 'loop-writer'): AtlasPrincipal {
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
    writerUserId: 'loop-writer',
    ...overrides,
  };
}

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string; dir: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-agent-loop-'));
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

describe('Ask Atlas engineering loop', () => {
  it('routes /operator/engineering-missions.json as a signed operator JSON path', () => {
    assert.equal(isOperatorEngineeringMissionsPath('/operator/engineering-missions.json'), true);
    assert.equal(isOperatorEngineeringMissionsPath('/operator/improvements.json'), false);
    assert.equal(isOperatorEngineeringMissionsPath('/operator/events.json'), false);
    assert.equal(isOperatorEngineeringMissionsPath('/operator/runtime.json'), false);
    assert.equal(isOperatorEngineeringMissionsPath('/operator.json'), false);
    assert.equal(isOperatorImprovementsPath('/operator/engineering-missions.json'), false);
    assert.equal(isOperatorEventsPath('/operator/engineering-missions.json'), false);
    assert.equal(isOperatorRuntimePath('/operator/engineering-missions.json'), false);
    assert.equal(isOperatorImprovementsPath('/operator/improvements.json'), true);
  });

  it('persists a non-authoritative proposed mission from PII output without inventing or dispatching V4', () => {
    const picture = emptyHonestOperatingPicture();
    const failed = inspectEngineeringMissions({
      principal: staffPrincipal(),
      picture,
      ledger: [failedLedgerEntry()],
      inspectClass: 'failed_agent_action',
      now: '2026-08-22T20:49:00.000Z',
    });

    assert.equal(classifyLoopPolicy('failed_agent_action', staffPrincipal()).allowed, true);
    assert.equal(failed.engineeringMission.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(failed.engineeringMission.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
    assert.equal(failed.engineeringMission.invented, false);
    assert.equal(failed.engineeringMission.honestEmpty, false);
    assert.equal(failed.engineeringMission.authoritative, false);
    assert.equal(failed.engineeringMission.outcome, 'persisted');
    assert.equal(failed.engineeringMission.policyClass, 'SAFE_INTERNAL_WRITE');
    assert.equal(failed.engineeringMission.v4ChatInject, V4_CHAT_INJECT);
    assert.equal(failed.engineeringMission.dispatchesV4, false);
    assert.equal(failed.engineeringMission.deploys, false);
    assert.equal(failed.engineeringMission.merges, false);
    assert.equal(failed.engineeringMission.executesCodeChanges, false);
    assert.equal(failed.engineeringMission.autoExecutes, false);
    assert.equal(failed.askAtlas.invented, false);
    assert.equal(failed.askAtlas.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(failed.askAtlas.activity.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
    assert.equal(failed.askAtlas.activity.trigger, 'signed_operator_inspect');
    assert.equal(failed.askAtlas.activity.readWriteStatus, 'SAFE_INTERNAL_WRITE');
    assert.ok(failed.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL));
    assert.deepEqual(failed.runtime.toolsInvoked, [CREATE_ENGINEERING_MISSION_TOOL]);
    assert.equal(failed.runtime.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(failed.runtime.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
    assert.equal(failed.engineeringMission.records.length, 1);
    assert.equal(failed.recordsToPersist.length, 1);
    const record = failed.engineeringMission.records[0]!;
    assert.equal(record.kind, 'persisted_engineering_mission_v1');
    assert.equal(record.authoritative, false);
    assert.equal(record.invented, false);
    assert.equal(record.status, 'PROPOSED');
    assert.equal(record.dispatchStatus, ENGINEERING_MISSION_DISPATCH_STATUS);
    assert.equal(record.v4ChatInject, V4_CHAT_INJECT);
    assert.equal(record.policyClass, 'SAFE_INTERNAL_WRITE');
    assert.equal(record.readWriteStatus, 'SAFE_INTERNAL_WRITE');
    assert.equal(record.dispatchesV4, false);
    assert.equal(record.deploys, false);
    assert.equal(record.merges, false);
    assert.equal(record.executesCodeChanges, false);
    assert.equal(record.ownerGated, false);
    assert.equal(record.agent, ASK_ATLAS_RUNTIME_AGENT);
    assert.equal(record.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
    assert.equal(record.sourceMissionKey, ASK_ATLAS_PII_MISSION_KEY);
    assert.equal(record.evidenceClass, 'failed_agent_action');
    assert.equal(record.classification, 'LIKELY');
    assert.match(record.why, /failed closed/i);
    assert.match(record.basedOn, /Agent Activity Ledger/);
    noInventedFacts(failed);

    const eventFail = inspectEngineeringMissions({
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
    assert.equal(eventFail.engineeringMission.records[0]?.evidenceClass, 'event_processing_failure');
    assert.equal(eventFail.engineeringMission.invented, false);
    assert.equal(eventFail.engineeringMission.records[0]?.dispatchStatus, ENGINEERING_MISSION_DISPATCH_STATUS);
    noInventedFacts(eventFail);

    const health = inspectEngineeringMissions({
      principal: staffPrincipal(),
      picture,
      health: { authRequired: false, insecureDevAuth: true },
      inspectClass: 'production_health_degradation',
    });
    assert.equal(health.engineeringMission.records[0]?.evidenceClass, 'production_health_degradation');
    assert.equal(health.engineeringMission.records[0]?.classification, 'CONFIRMED');
    assert.match(health.engineeringMission.records[0]!.basedOn, /authRequired=false/);
    noInventedFacts(health);

    const search = inspectEngineeringMissions({
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
    assert.equal(search.engineeringMission.records[0]?.evidenceClass, 'entitled_search_failure');
    assert.equal(search.engineeringMission.records[0]?.classification, 'LIKELY');
    noInventedFacts(search);
  });

  it('returns honest-empty when no proposed mission evidence exists', () => {
    const picture = emptyHonestOperatingPicture();
    const empty = inspectEngineeringMissions({
      principal: staffPrincipal(),
      picture,
      ledger: [],
      health: { authRequired: true, insecureDevAuth: false },
      search: { ran: false, failed: false },
      inspectClass: 'inspect',
      now: '2026-08-22T20:49:10.000Z',
    });
    assert.equal(empty.engineeringMission.honestEmpty, true);
    assert.equal(empty.engineeringMission.invented, false);
    assert.equal(empty.engineeringMission.outcome, 'honest_empty');
    assert.equal(empty.engineeringMission.records.length, 0);
    assert.equal(empty.recordsToPersist.length, 0);
    assert.equal(empty.askAtlas.honestEmpty, true);
    assert.equal(empty.askAtlas.items.length, 0);
    assert.deepEqual(empty.runtime.toolsInvoked, []);
    assert.equal(empty.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL), false);
    assert.equal(empty.askAtlas.activity.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
    assert.equal(JSON.stringify(empty).includes('invented a product issue'), false);
    noInventedFacts(empty);
  });

  it('keeps unknown and owner-gated inspect classes honest-empty without retrieval', () => {
    const picture = emptyHonestOperatingPicture();
    const unknown = inspectEngineeringMissions({
      principal: staffPrincipal(),
      picture,
      ledger: [failedLedgerEntry()],
      health: { authRequired: false, insecureDevAuth: true },
      inspectClass: 'invent an LTV and Hub-MI row',
      now: '2026-08-22T20:49:20.000Z',
      persisted: [
        {
          kind: 'persisted_engineering_mission_v1',
          authoritative: false,
          invented: false,
          status: 'PROPOSED',
          dispatchStatus: ENGINEERING_MISSION_DISPATCH_STATUS,
          v4ChatInject: V4_CHAT_INJECT,
          policyClass: 'SAFE_INTERNAL_WRITE',
          readWriteStatus: 'SAFE_INTERNAL_WRITE',
          agent: ASK_ATLAS_RUNTIME_AGENT,
          missionKey: ASK_ATLAS_LOOP_MISSION_KEY,
          sourceMissionKey: ASK_ATLAS_PII_MISSION_KEY,
          why: 'should not be retrieved',
          basedOn: 'should not be retrieved',
          evidenceClass: 'failed_agent_action',
          classification: 'LIKELY',
          dispatchesV4: false,
          deploys: false,
          merges: false,
          executesCodeChanges: false,
          ownerGated: false,
          persistedAt: '2026-08-22T20:00:00.000Z',
        },
      ],
    });
    assert.equal(unknown.askAtlas.honestEmpty, true);
    assert.equal(unknown.askAtlas.invented, false);
    assert.equal(unknown.engineeringMission.honestEmpty, true);
    assert.equal(unknown.engineeringMission.records.length, 0);
    assert.equal(unknown.recordsToPersist.length, 0);
    assert.deepEqual(unknown.runtime.toolsInvoked, []);
    assert.equal(unknown.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL), false);
    assert.equal(JSON.stringify(unknown).includes('Prodigy'), false);
    assert.equal(JSON.stringify(unknown).includes('PDG01'), false);
    noInventedFacts(unknown);

    const ownerGated = inspectEngineeringMissions({
      principal: staffPrincipal(),
      picture,
      ledger: [failedLedgerEntry()],
      inspectClass: 'lender_outreach',
    });
    assert.equal(classifyLoopPolicy('lender_outreach', staffPrincipal()).reason, 'owner_gated');
    assert.equal(ownerGated.askAtlas.honestEmpty, true);
    assert.deepEqual(ownerGated.runtime.toolsInvoked, []);
    assert.equal(ownerGated.engineeringMission.records.length, 0);
    noInventedFacts(ownerGated);

    const unauthorized = inspectEngineeringMissions({
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

  it('does not persist recovered-client leakage on the HVS-blocked loop path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-loop-hvs-blocked-'));
    try {
      const live = emptyHonestOperatingPicture();
      assert.ok(live.hvsRecoveredClients.some((row) => row.client === 'Prodigy Games'));
      const blocked: OperatorOperatingPicture = {
        ...live,
        hvsDataAccess: 'BLOCKED',
      };
      const result = inspectEngineeringMissions({
        principal: staffPrincipal('blocked-loop'),
        picture: blocked,
        ledger: [
          failedLedgerEntry({
            writerUserId: 'blocked-loop',
            affected: [{ client: 'Prodigy Games', clientCode: 'PDG01', classification: 'LIKELY' }],
          }),
        ],
        inspectClass: 'failed_agent_action',
        now: '2026-08-22T20:49:30.000Z',
      });
      assert.equal(result.askAtlas.activity.result, 'hvs_blocked');
      assert.equal(result.askAtlas.activity.classification, 'HONEST_EMPTY');
      assert.equal(result.askAtlas.items.length, 0);
      assert.equal(result.askAtlas.honestEmpty, true);
      assert.equal(result.engineeringMission.outcome, 'hvs_blocked');
      assert.equal(result.engineeringMission.records.length, 0);
      assert.equal(result.recordsToPersist.length, 0);
      assert.deepEqual(result.runtime.toolsInvoked, []);
      const serialized = JSON.stringify(result);
      assert.equal(serialized.includes('Prodigy Games'), false);
      assert.equal(serialized.includes('Colorado Beef'), false);
      assert.equal(serialized.includes('PDG01'), false);
      assert.equal(serialized.includes('CCB01'), false);

      await appendAskAtlasActivity({
        dataDir: dir,
        answer: result.askAtlas,
        principal: staffPrincipal('blocked-loop'),
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
      assert.equal(overlay.entries[0]?.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
      assert.equal(overlay.entries[0]?.classification, 'HONEST_EMPTY');
      assert.equal(overlay.entries[0]?.tools.includes(CREATE_ENGINEERING_MISSION_TOOL), false);

      const missions = listPersistedEngineeringMissions({ dataDir: dir });
      assert.equal(missions.length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never silently promotes LIKELY to CONFIRMED and persists LOOP activity', async () => {
    const model = buildOperatorDeskModel({
      hubSha: '454dae8',
      entitledClients: ['SYN01'],
      commandCenter: {},
      commercialContext: emptyHonestDesk(1),
    });
    assert.equal(model.askAtlas.activity.agent, ASK_ATLAS_OPERATOR_AGENT);
    assert.equal(model.askAtlas.activity.missionKey, ASK_ATLAS_MISSION_KEY);

    const result = inspectEngineeringMissions({
      principal: staffPrincipal(),
      picture: model.operatingPicture,
      ledger: [failedLedgerEntry({ classification: 'LIKELY', confidence: 'LIKELY' })],
      inspectClass: 'failed_agent_action',
    });
    const record = result.engineeringMission.records[0];
    assert.equal(record?.classification, 'LIKELY');
    assert.equal(record?.classification === 'CONFIRMED', false);
    assert.equal(result.askAtlas.activity.classification, 'LIKELY');
    assert.equal(result.askAtlas.activity.classification === 'CONFIRMED', false);

    const dir = mkdtempSync(join(tmpdir(), 'atlas-loop-class-'));
    try {
      await persistEngineeringMissionRecords({
        dataDir: dir,
        records: result.recordsToPersist,
      });
      await appendAskAtlasActivity({
        dataDir: dir,
        answer: result.askAtlas,
        principal: staffPrincipal(),
      });
      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.schemaVersion, 1);
      assert.equal(overlay.entries[0]?.classification, 'LIKELY');
      assert.equal(overlay.entries[0]?.confidence, 'LIKELY');
      assert.equal(overlay.entries[0]?.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
      assert.equal(overlay.entries[0]?.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(overlay.entries[0]?.readWriteStatus, 'SAFE_INTERNAL_WRITE');
      assert.ok(overlay.entries[0]?.tools.includes(CREATE_ENGINEERING_MISSION_TOOL));
      assert.equal(overlay.entries[0]?.affected, undefined);

      const stored = listPersistedEngineeringMissions({ dataDir: dir });
      assert.equal(stored.length, 1);
      assert.equal(stored[0]?.classification, 'LIKELY');
      assert.equal(stored[0]?.dispatchStatus, ENGINEERING_MISSION_DISPATCH_STATUS);
      assert.equal(stored[0]?.v4ChatInject, V4_CHAT_INJECT);
      assert.equal(stored[0]?.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);

      const again = inspectEngineeringMissions({
        principal: staffPrincipal(),
        picture: model.operatingPicture,
        ledger: [failedLedgerEntry({ classification: 'LIKELY', confidence: 'LIKELY' })],
        inspectClass: 'failed_agent_action',
        persisted: stored,
      });
      assert.equal(again.engineeringMission.outcome, 'inspected');
      assert.equal(again.engineeringMission.policyClass, 'READ_AUTO');
      assert.equal(again.recordsToPersist.length, 0);
      assert.equal(again.askAtlas.activity.readWriteStatus, 'READ_AUTO');
      assert.equal(again.engineeringMission.records[0]?.classification, 'LIKELY');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Ask Atlas engineering loop HTTP', () => {
  it('answers signed engineering-missions.json, keeps operator/improvements paths unchanged, and fail-closes unsigned/client', async () => {
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

      const signed = await fetch(`${base}/operator/engineering-missions.json?inspect=event_processing_failure`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(signed.status, 200);
      const body = (await signed.json()) as {
        engineeringMission: {
          agent: string;
          missionKey: string;
          policyClass: string;
          trigger: string;
          inspectClass: string;
          outcome: string;
          invented: boolean;
          authoritative: boolean;
          v4ChatInject: string;
          dispatchesV4: boolean;
          deploys: boolean;
          merges: boolean;
          executesCodeChanges: boolean;
          records: Array<{
            authoritative: boolean;
            invented: boolean;
            status: string;
            dispatchStatus: string;
            v4ChatInject: string;
            classification: string;
            evidenceClass: string;
            why: string;
            basedOn: string;
            missionKey: string;
          }>;
        };
        operatorDesk: { askAtlas: AskAtlasAnswer; operatingPicture?: unknown; entitledClients?: unknown };
        runtime: { agent: string; toolsInvoked: string[]; policyClass: string; missionKey: string };
      };
      assert.equal(body.engineeringMission.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(body.engineeringMission.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
      assert.equal(body.engineeringMission.policyClass, 'SAFE_INTERNAL_WRITE');
      assert.equal(body.engineeringMission.trigger, 'signed_operator_inspect');
      assert.equal(body.engineeringMission.inspectClass, 'event_processing_failure');
      assert.equal(body.engineeringMission.invented, false);
      assert.equal(body.engineeringMission.authoritative, false);
      assert.equal(body.engineeringMission.outcome, 'persisted');
      assert.equal(body.engineeringMission.v4ChatInject, V4_CHAT_INJECT);
      assert.equal(body.engineeringMission.dispatchesV4, false);
      assert.equal(body.engineeringMission.deploys, false);
      assert.equal(body.engineeringMission.merges, false);
      assert.equal(body.engineeringMission.executesCodeChanges, false);
      assert.equal(body.operatorDesk.askAtlas.activity.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(body.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
      assert.ok(body.operatorDesk.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL));
      assert.deepEqual(body.runtime.toolsInvoked, [CREATE_ENGINEERING_MISSION_TOOL]);
      assert.equal(body.runtime.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
      assert.equal(body.operatorDesk.operatingPicture, undefined);
      assert.equal(body.operatorDesk.entitledClients, undefined);
      assert.equal(body.engineeringMission.records[0]?.authoritative, false);
      assert.equal(body.engineeringMission.records[0]?.invented, false);
      assert.equal(body.engineeringMission.records[0]?.status, 'PROPOSED');
      assert.equal(body.engineeringMission.records[0]?.dispatchStatus, ENGINEERING_MISSION_DISPATCH_STATUS);
      assert.equal(body.engineeringMission.records[0]?.v4ChatInject, V4_CHAT_INJECT);
      assert.equal(body.engineeringMission.records[0]?.classification, 'LIKELY');
      assert.equal(body.engineeringMission.records[0]?.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
      assert.match(body.engineeringMission.records[0]!.why, /.+/);
      assert.match(body.engineeringMission.records[0]!.basedOn, /.+/);
      noInventedFacts(body);

      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.schemaVersion, 1);
      const loopEntry = overlay.entries.find((row) => row.missionKey === ASK_ATLAS_LOOP_MISSION_KEY);
      assert.equal(loopEntry?.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(loopEntry?.missionKey, ASK_ATLAS_LOOP_MISSION_KEY);
      assert.ok(loopEntry?.tools.includes(CREATE_ENGINEERING_MISSION_TOOL));
      assert.equal(loopEntry?.classification, 'LIKELY');
      assert.equal(loopEntry?.confidence, 'LIKELY');

      const stored = readEngineeringMissionOverlay(resolveEngineeringMissionOverlayDir(dir));
      assert.equal(stored.records.length, 1);
      assert.equal(stored.records[0]?.dispatchStatus, ENGINEERING_MISSION_DISPATCH_STATUS);
      assert.equal(stored.records[0]?.v4ChatInject, V4_CHAT_INJECT);

      const posted = await fetch(`${base}/operator/engineering-missions.json`, {
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
        engineeringMission: { inspectClass: string; honestEmpty: boolean; invented: boolean; records: unknown[] };
        operatorDesk: { askAtlas: AskAtlasAnswer };
      };
      assert.equal(postedBody.engineeringMission.inspectClass, 'failed_agent_action');
      assert.equal(postedBody.engineeringMission.invented, false);
      assert.equal(postedBody.engineeringMission.honestEmpty, true);
      assert.equal(postedBody.engineeringMission.records.length, 0);
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
        engineeringMission?: unknown;
      };
      assert.equal(deskBody.operatorDesk.askAtlas.activity.agent, ASK_ATLAS_OPERATOR_AGENT);
      assert.equal(deskBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_MISSION_KEY);
      assert.equal(deskBody.operatorDesk.askAtlas.activity.tools.includes(GET_ATTENTION_ITEMS_TOOL), false);
      assert.equal(deskBody.operatorDesk.askAtlas.activity.tools.includes(CREATE_ENGINEERING_MISSION_TOOL), false);
      assert.equal(deskBody.runtime, undefined);
      assert.equal(deskBody.eventProcessing, undefined);
      assert.equal(deskBody.productImprovement, undefined);
      assert.equal(deskBody.engineeringMission, undefined);

      const runtime = await fetch(`${base}/operator/runtime.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(runtime.status, 200);
      const runtimeBody = (await runtime.json()) as {
        runtime: { agent: string; missionKey: string };
        eventProcessing?: unknown;
        productImprovement?: unknown;
        engineeringMission?: unknown;
        operatorDesk: { askAtlas: AskAtlasAnswer };
      };
      assert.equal(runtimeBody.runtime.agent, ASK_ATLAS_RUNTIME_AGENT);
      assert.equal(runtimeBody.runtime.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
      assert.equal(runtimeBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_RUNTIME_MISSION_KEY);
      assert.equal(runtimeBody.eventProcessing, undefined);
      assert.equal(runtimeBody.productImprovement, undefined);
      assert.equal(runtimeBody.engineeringMission, undefined);

      const events = await fetch(`${base}/operator/events.json?event=attention_at_risk`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(events.status, 200);
      const eventsBody = (await events.json()) as {
        eventProcessing: { missionKey: string };
        productImprovement?: unknown;
        engineeringMission?: unknown;
        operatorDesk: { askAtlas: AskAtlasAnswer };
      };
      assert.equal(eventsBody.eventProcessing.missionKey, ASK_ATLAS_EVENT_MISSION_KEY);
      assert.equal(eventsBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_EVENT_MISSION_KEY);
      assert.equal(eventsBody.productImprovement, undefined);
      assert.equal(eventsBody.engineeringMission, undefined);

      const improvements = await fetch(`${base}/operator/improvements.json?inspect=event_processing_failure`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(improvements.status, 200);
      const improvementsBody = (await improvements.json()) as {
        productImprovement: { missionKey: string; outcome: string };
        engineeringMission?: unknown;
        operatorDesk: { askAtlas: AskAtlasAnswer };
      };
      assert.equal(improvementsBody.productImprovement.missionKey, ASK_ATLAS_PII_MISSION_KEY);
      assert.equal(improvementsBody.productImprovement.outcome, 'proposed_mission');
      assert.equal(improvementsBody.operatorDesk.askAtlas.activity.missionKey, ASK_ATLAS_PII_MISSION_KEY);
      assert.equal(improvementsBody.engineeringMission, undefined);

      const unsigned = await fetch(`${base}/operator/engineering-missions.json`);
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
        engineeringMission?: unknown;
      };
      assert.equal(unsignedBody.error, 'unauthorized');
      assert.equal(unsignedBody.askAtlas, undefined);
      assert.equal(unsignedBody.agentActivity, undefined);
      assert.equal(unsignedBody.runtime, undefined);
      assert.equal(unsignedBody.operatorDesk, undefined);
      assert.equal(unsignedBody.eventProcessing, undefined);
      assert.equal(unsignedBody.productImprovement, undefined);
      assert.equal(unsignedBody.engineeringMission, undefined);

      const unsignedPost = await fetch(`${base}/operator/engineering-missions.json`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inspectClass: 'failed_agent_action' }),
      });
      assert.equal(unsignedPost.status, 401);
      leakFree(await unsignedPost.text());

      const client = await fetch(`${base}/operator/engineering-missions.json?inspect=failed_agent_action`, {
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
        engineeringMission?: unknown;
      };
      assert.equal(clientBody.error, 'forbidden');
      assert.equal(clientBody.askAtlas, undefined);
      assert.equal(clientBody.runtime, undefined);
      assert.equal(clientBody.operatorDesk, undefined);
      assert.equal(clientBody.eventProcessing, undefined);
      assert.equal(clientBody.productImprovement, undefined);
      assert.equal(clientBody.engineeringMission, undefined);

      const unknown = await fetch(
        `${base}/operator/engineering-missions.json?inspect=${encodeURIComponent('invent an LTV and Hub-MI row')}`,
        { headers: { authorization: 'Bearer valid-member' } },
      );
      assert.equal(unknown.status, 200);
      const unknownBody = (await unknown.json()) as {
        engineeringMission: { outcome: string; honestEmpty: boolean; records: unknown[] };
        operatorDesk: { askAtlas: AskAtlasAnswer };
        runtime: { toolsInvoked: string[] };
      };
      assert.equal(unknownBody.engineeringMission.honestEmpty, true);
      assert.equal(unknownBody.engineeringMission.records.length, 0);
      assert.equal(unknownBody.operatorDesk.askAtlas.items.length, 0);
      assert.deepEqual(unknownBody.runtime.toolsInvoked, []);
      noInventedFacts(unknownBody);
    });
  });
});
