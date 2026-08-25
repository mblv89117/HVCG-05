import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
  DEFAULT_AGENT_ACTIVITY_HOME_DIR,
  ledgerEntryFromAskAtlas,
  listVisibleAgentActivity,
  readAgentActivityOverlay,
  resolveAgentActivityOverlayDir,
} from '../src/pm/operatorDesk/activityLedger.ts';
import { buildAskAtlasAnswer } from '../src/pm/operatorDesk/askAtlas.ts';
import { buildOperatorDeskModel, emptyHonestDesk, emptyHonestOperatingPicture } from '../src/pm/operatorDesk/model.ts';
import {
  ASK_ATLAS_MISSION_KEY,
  ASK_ATLAS_QUESTION,
  ASK_ATLAS_RANKING,
  type AgentActivityLedgerEntry,
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
  '250000',
];

function staffPrincipal(userId: string, clients: string[]): AtlasPrincipal {
  return {
    userId,
    organizationId: 'org-hvcg',
    allowedClientIds: clients,
    roles: ['HVCG Team Member'],
  };
}

function leakFree(body: string): void {
  for (const marker of LEAK_MARKERS) {
    assert.equal(body.includes(marker), false, `unsigned body leaked ${marker}`);
  }
  assert.equal(body.includes('$'), false);
  assert.equal(AMOUNT.test(body), false);
  assert.equal(/\bltv\s*[:=]\s*\d/i.test(body), false);
}

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string; dir: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-agent-activity-'));
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
      if (token === 'valid-member-b') {
        return {
          oid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          preferred_username: 'member-b@example.com',
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

describe('Agent Activity Ledger overlay', () => {
  it('resolves sibling of capital-overlay under INTEGRATION_DATA_DIR', () => {
    assert.equal(
      resolveAgentActivityOverlayDir('/tmp/wwwroot', {
        INTEGRATION_AGENT_ACTIVITY_DIR: '/custom/agent-activity',
      } as NodeJS.ProcessEnv),
      '/custom/agent-activity',
    );
    assert.equal(
      resolveAgentActivityOverlayDir('/tmp/wwwroot', {
        INTEGRATION_DATA_DIR: '/home/webapp_data/integrations',
        HOME: '/home',
      } as NodeJS.ProcessEnv),
      join('/home/webapp_data/integrations', 'agent-activity'),
    );
    assert.equal(DEFAULT_AGENT_ACTIVITY_HOME_DIR, '/home/webapp_data/integrations/agent-activity');
  });

  it('does not persist recovered-client leakage on the HVS-blocked path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-hvs-blocked-ledger-'));
    try {
      const live = emptyHonestOperatingPicture();
      assert.ok(live.hvsRecoveredClients.some((row) => row.client === 'Prodigy Games'));
      const blocked: OperatorOperatingPicture = {
        ...live,
        hvsDataAccess: 'BLOCKED',
      };
      const answer = buildAskAtlasAnswer(blocked, { now: '2026-08-22T19:00:00.000Z' });
      assert.equal(answer.activity.result, 'hvs_blocked');
      assert.equal(answer.activity.classification, 'HONEST_EMPTY');
      assert.equal(answer.activity.policyDecision, 'hvs_blocked');
      assert.equal(answer.activity.readWriteStatus, 'READ_AUTO');
      assert.equal(answer.items.length, 0);

      const principal = staffPrincipal('blocked-writer', ['SYN01']);
      await appendAskAtlasActivity({ dataDir: dir, answer, principal });
      const overlay = readAgentActivityOverlay(join(dir, 'agent-activity'));
      assert.equal(overlay.entries.length, 1);
      const serialized = JSON.stringify(overlay.entries[0]);
      assert.equal(serialized.includes('Prodigy Games'), false);
      assert.equal(serialized.includes('Colorado Beef'), false);
      assert.equal(serialized.includes('PDG01'), false);
      assert.equal(serialized.includes('CCB01'), false);
      assert.equal(overlay.entries[0]?.affected, undefined);
      assert.equal(overlay.entries[0]?.classification, 'HONEST_EMPTY');
      assert.equal(overlay.entries[0]?.confidence, 'HONEST_EMPTY');
      assert.equal(overlay.entries[0]?.policyDecision, 'hvs_blocked');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never silently promotes LIKELY to CONFIRMED on persist', () => {
    const model = buildOperatorDeskModel({
      hubSha: 'bf87247',
      entitledClients: ['SYN01'],
      commandCenter: {},
      commercialContext: emptyHonestDesk(1),
    });
    const atRisk = model.askAtlas.items.find((row) => row.state === 'At Risk' && row.clientCode === 'PDG01');
    assert.equal(atRisk?.classification, 'LIKELY');
    const entry = ledgerEntryFromAskAtlas({
      answer: model.askAtlas,
      principal: staffPrincipal('writer-a', ['SYN01']),
    });
    assert.equal(entry.classification, 'LIKELY');
    assert.equal(entry.confidence, 'LIKELY');
    assert.equal(entry.classification === 'CONFIRMED', false);
    const persistedAtRisk = entry.affected?.find(
      (row) => row.clientCode === 'PDG01' && row.classification === atRisk?.classification,
    );
    assert.equal(persistedAtRisk?.classification, 'LIKELY');
    const labeledItems = model.askAtlas.items.filter((item) => item.client || item.clientCode);
    assert.equal(
      labeledItems.every((item) =>
        (entry.affected || []).some(
          (row) =>
            row.clientCode === item.clientCode &&
            row.client === item.client &&
            row.classification === item.classification,
        ),
      ),
      true,
    );
    assert.equal(
      (entry.affected || []).every((row) =>
        labeledItems.some(
          (item) =>
            item.clientCode === row.clientCode &&
            item.client === row.client &&
            item.classification === row.classification,
        ),
      ),
      true,
    );
  });
});

describe('Agent Activity Ledger HTTP', () => {
  it('answers the same attention question, persists overlay, and fail-closes unsigned', async () => {
    await withHub(
      async (oid) => (oid?.startsWith('aaaaaaaa') ? ['SYN01'] : oid?.startsWith('bbbbbbbb') ? ['ACME01'] : []),
      async ({ base, dir }) => {
        const first = await fetch(`${base}/operator.json`, {
          headers: { authorization: 'Bearer valid-member' },
        });
        assert.equal(first.status, 200);
        const firstBody = (await first.json()) as {
          operatorDesk: {
            askAtlas: {
              kind: string;
              question: string;
              invented: boolean;
              honestEmpty: boolean;
              ranking: string[];
              items: Array<{
                state: string;
                client?: string;
                clientCode?: string;
                classification: string;
                why: string;
                basedOn: string;
              }>;
              activity: {
                agent: string;
                missionKey: string;
                result: string;
                classification: string;
                readWriteStatus: string;
                policyDecision: string;
              };
            };
          };
        };
        const answer = firstBody.operatorDesk.askAtlas;
        assert.equal(answer.kind, 'ask_atlas_attention_v1');
        assert.equal(answer.question, ASK_ATLAS_QUESTION);
        assert.equal(answer.invented, false);
        assert.equal(answer.honestEmpty, false);
        assert.deepEqual(answer.ranking, [...ASK_ATLAS_RANKING]);
        assert.equal(answer.activity.agent, 'atlas-hub-operator');
        assert.equal(answer.activity.missionKey, ASK_ATLAS_MISSION_KEY);
        assert.equal(answer.activity.result, 'answered');
        assert.equal(answer.activity.readWriteStatus, 'READ_AUTO');
        assert.equal(answer.activity.policyDecision, 'answered');
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
        assert.ok(answer.items.some((row) => row.state === 'Capital' && row.client === 'Colorado Beef'));
        const serialized = JSON.stringify(answer);
        assert.equal(serialized.includes('$'), false);
        assert.equal(AMOUNT.test(serialized), false);
        assert.equal(/\bltv\s*[:=]\s*\d/i.test(serialized), false);
        assert.equal(serialized.includes('Hub-MI'), false);

        const overlayPath = join(dir, 'agent-activity', 'agent-activity-overlay.json');
        assert.equal(existsSync(overlayPath), true);
        const overlayAfterFirst = readAgentActivityOverlay(join(dir, 'agent-activity'));
        assert.equal(overlayAfterFirst.entries.length, 1);
        assert.equal(overlayAfterFirst.entries[0]?.classification, 'LIKELY');
        assert.equal(overlayAfterFirst.entries[0]?.confidence, 'LIKELY');
        assert.equal(overlayAfterFirst.entries[0]?.readWriteStatus, 'READ_AUTO');
        assert.equal(overlayAfterFirst.entries[0]?.policyDecision, 'answered');

        const second = await fetch(`${base}/operator.json`, {
          headers: { authorization: 'Bearer valid-member' },
        });
        assert.equal(second.status, 200);
        const secondAnswer = ((await second.json()) as typeof firstBody).operatorDesk.askAtlas;
        assert.equal(secondAnswer.question, ASK_ATLAS_QUESTION);
        assert.equal(secondAnswer.invented, false);
        assert.ok(
          secondAnswer.items.some(
            (row) =>
              row.state === 'At Risk' &&
              row.clientCode === 'PDG01' &&
              row.classification === 'LIKELY',
          ),
        );

        const overlayAfterSecond = readAgentActivityOverlay(join(dir, 'agent-activity'));
        assert.equal(overlayAfterSecond.entries.length, 2);
        assert.equal(
          overlayAfterSecond.entries.every((row) => row.classification === 'LIKELY' && row.confidence === 'LIKELY'),
          true,
        );

        const ledger = await fetch(`${base}/operator/activity.json`, {
          headers: { authorization: 'Bearer valid-member' },
        });
        assert.equal(ledger.status, 200);
        const ledgerBody = (await ledger.json()) as {
          agentActivity: { contractVersion: string; entitled: boolean; entries: AgentActivityLedgerEntry[] };
        };
        assert.equal(ledgerBody.agentActivity.contractVersion, 'atlas-hub-agent-activity.v1');
        assert.equal(ledgerBody.agentActivity.entitled, true);
        assert.equal(ledgerBody.agentActivity.entries.length, 2);
        assert.equal(ledgerBody.agentActivity.entries[0]?.result, 'answered');
        assert.equal(ledgerBody.agentActivity.entries[0]?.classification, 'LIKELY');
        assert.equal(ledgerBody.agentActivity.entries[0]?.confidence, 'LIKELY');
        assert.equal(ledgerBody.agentActivity.entries[0]?.readWriteStatus, 'READ_AUTO');
        assert.equal(
          ledgerBody.agentActivity.entries.every((row) => row.classification !== 'CONFIRMED' || row.confidence !== 'LIKELY'),
          true,
        );
        assert.equal(
          ledgerBody.agentActivity.entries.some((row) => row.classification === 'CONFIRMED' && row.confidence === 'LIKELY'),
          false,
        );

        const disk = JSON.parse(readFileSync(overlayPath, 'utf8')) as { entries: AgentActivityLedgerEntry[] };
        assert.equal(disk.entries.length, 2);

        const unsignedJson = await fetch(`${base}/operator.json`);
        assert.equal(unsignedJson.status, 401);
        const unsignedJsonText = await unsignedJson.text();
        leakFree(unsignedJsonText);
        const unsignedJsonBody = JSON.parse(unsignedJsonText) as {
          error: string;
          askAtlas?: unknown;
          operatorDesk?: unknown;
          agentActivity?: unknown;
        };
        assert.equal(unsignedJsonBody.error, 'unauthorized');
        assert.equal(unsignedJsonBody.askAtlas, undefined);
        assert.equal(unsignedJsonBody.operatorDesk, undefined);
        assert.equal(unsignedJsonBody.agentActivity, undefined);

        const unsignedHtml = await fetch(`${base}/operator`);
        assert.equal(unsignedHtml.status, 401);
        leakFree(await unsignedHtml.text());

        const unsignedLedger = await fetch(`${base}/operator/activity.json`);
        assert.equal(unsignedLedger.status, 401);
        const unsignedLedgerText = await unsignedLedger.text();
        leakFree(unsignedLedgerText);
        const unsignedLedgerBody = JSON.parse(unsignedLedgerText) as {
          error: string;
          agentActivity?: unknown;
          entries?: unknown;
        };
        assert.equal(unsignedLedgerBody.error, 'unauthorized');
        assert.equal(unsignedLedgerBody.agentActivity, undefined);
        assert.equal(unsignedLedgerBody.entries, undefined);

        const unsignedRuntime = await fetch(`${base}/operator/runtime.json`);
        assert.equal(unsignedRuntime.status, 401);
        const unsignedRuntimeText = await unsignedRuntime.text();
        leakFree(unsignedRuntimeText);
        const unsignedRuntimeBody = JSON.parse(unsignedRuntimeText) as {
          error: string;
          askAtlas?: unknown;
          runtime?: unknown;
          operatorDesk?: unknown;
        };
        assert.equal(unsignedRuntimeBody.error, 'unauthorized');
        assert.equal(unsignedRuntimeBody.askAtlas, undefined);
        assert.equal(unsignedRuntimeBody.runtime, undefined);
        assert.equal(unsignedRuntimeBody.operatorDesk, undefined);

        const clientLedger = await fetch(`${base}/operator/activity.json`, {
          headers: { authorization: 'Bearer valid-client' },
        });
        assert.equal(clientLedger.status, 403);
        const clientText = await clientLedger.text();
        leakFree(clientText);

        const other = await fetch(`${base}/operator/activity.json`, {
          headers: { authorization: 'Bearer valid-member-b' },
        });
        assert.equal(other.status, 200);
        const otherBody = (await other.json()) as {
          agentActivity: { entries: AgentActivityLedgerEntry[] };
        };
        assert.equal(otherBody.agentActivity.entries.length, 0);

        const visible = listVisibleAgentActivity({
          dataDir: dir,
          principal: staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['SYN01']),
        });
        assert.equal(visible.length, 2);
      },
    );
  });
});
