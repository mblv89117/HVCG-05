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
import { renderOperatorDeskHtml, renderUnsignedOperatorDesk } from '../src/pm/operatorDesk/html.ts';
import { buildOperatorDeskModel, emptyHonestDesk } from '../src/pm/operatorDesk/model.ts';

const SYN01 = 'SYN01';
const ACME01 = 'ACME01';

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-operator-desk-'));
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
      if (token === 'valid-roleless') {
        return {
          oid: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          preferred_username: 'sp@example.com',
          roles: [],
          scp: 'access_as_user',
        };
      }
      if (token === 'valid-roleless-empty') {
        return {
          oid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          preferred_username: 'empty-sp@example.com',
          roles: [],
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
    await fn({ base: `http://127.0.0.1:${port}` });
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

describe('operator desk copy', () => {
  it('unsigned HTML has no CRM rows and forbids invented commercial facts', () => {
    const html = renderUnsignedOperatorDesk();
    assert.match(html, /Microsoft sign-in required/);
    assert.match(html, /fail-closed/);
    assert.equal(html.includes(SYN01), false);
    assert.equal(html.includes(ACME01), false);
    assert.equal(html.includes('250000'), false);
    assert.match(html, /does not invent LTV/);
  });

  it('entitled HTML renders honest empty commercial lanes from recorded-only context', () => {
    const model = buildOperatorDeskModel({
      hubSha: 'ea31592',
      entitledClients: [SYN01],
      commandCenter: {
        businessHealth: { activeProjects: 1, openTasks: 2, overdueTasks: 0, decisionsNeeded: 1, clientsNeedingAttention: 0, atRiskProjects: 0 },
        ownerApprovals: [{ id: 'task-1', title: 'Approve SYN01 activation' }],
        myDay: { decisionsNeeded: [{ id: 'dec-1', title: 'Decide next SYN01 action' }], overdue: [], waitingFollowUps: [] },
        criticalAlerts: [],
      },
      commercialContext: emptyHonestDesk(1),
    });
    const html = renderOperatorDeskHtml(model);
    assert.match(html, /Approve SYN01 activation/);
    assert.match(html, /does not invent LTV/);
    assert.match(html, /does not invent MRI/);
    assert.match(html, /does not invent campaign history/);
    assert.match(html, /liveGtmOutbound=false/);
    assert.equal(html.includes('250000'), false);
    assert.equal(model.liveGtmOutbound, false);
    assert.equal(model.paidAds, false);
  });
});

describe('operator desk HTTP fail-closed', () => {
  it('unauth HTML/JSON are 401 and entitled desk is Premium-rendered without invented LTV', async () => {
    await withHub(
      async (oid) =>
        oid?.startsWith('aaaaaaaa') || oid?.startsWith('dddddddd') ? [SYN01] : [],
      async ({ base }) => {
      const unauthHtml = await fetch(`${base}/operator`);
      assert.equal(unauthHtml.status, 401);
      assert.match(unauthHtml.headers.get('content-type') || '', /text\/html/);
      const unauthBody = await unauthHtml.text();
      assert.match(unauthBody, /Microsoft sign-in required/);
      assert.equal(unauthBody.includes('250000'), false);

      const unauthJson = await fetch(`${base}/operator.json`);
      assert.equal(unauthJson.status, 401);
      const unauthJsonBody = (await unauthJson.json()) as { error: string };
      assert.equal(unauthJsonBody.error, 'unauthorized');

      const entitled = await fetch(`${base}/operator`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(entitled.status, 200);
      assert.match(entitled.headers.get('content-type') || '', /text\/html/);
      const html = await entitled.text();
      assert.match(html, /Atlas Hub operator desk/);
      assert.match(html, /does not invent LTV/);
      assert.match(html, /liveGtmOutbound=false/);
      assert.equal(html.includes(ACME01), false);
      assert.equal(html.includes('250000'), false);

      const json = await fetch(`${base}/operator.json`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(json.status, 200);
      const body = (await json.json()) as {
        operatorDesk: {
          entitled: boolean;
          liveGtmOutbound: boolean;
          paidAds: boolean;
          entitledClients: string[];
          commercialContext: { gcc: { available: boolean; emptyReason?: string } };
        };
      };
      assert.equal(body.operatorDesk.entitled, true);
      assert.equal(body.operatorDesk.liveGtmOutbound, false);
      assert.equal(body.operatorDesk.paidAds, false);
      assert.deepEqual(body.operatorDesk.entitledClients, [SYN01]);
      assert.equal(body.operatorDesk.commercialContext.gcc.available, false);
      assert.match(body.operatorDesk.commercialContext.gcc.emptyReason || '', /does not invent LTV/);

      const root = await fetch(base);
      assert.equal(root.status, 405);

      const clientDesk = await fetch(`${base}/operator`, {
        headers: { authorization: 'Bearer valid-client' },
      });
      assert.equal(clientDesk.status, 403);
      assert.equal((await clientDesk.text()).includes('Atlas Hub operator desk'), false);

      const roleless = await fetch(`${base}/operator`, {
        headers: { authorization: 'Bearer valid-roleless' },
      });
      assert.equal(roleless.status, 200);
      assert.match(await roleless.text(), /Atlas Hub operator desk/);

      const rolelessEmpty = await fetch(`${base}/operator`, {
        headers: { authorization: 'Bearer valid-roleless-empty' },
      });
      assert.equal(rolelessEmpty.status, 403);
      assert.equal((await rolelessEmpty.text()).includes('Atlas Hub operator desk'), false);
    });
  });
});
