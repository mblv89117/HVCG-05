import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { PmRepository } from '../src/pm/repository.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import { createFabricGraphClient, isAllowedFabricGraphPath } from '../src/pm/sharepoint/fabric/graph.ts';
import {
  acceptGraphChangeNotifications,
  clientStateMatches,
  decodeGraphValidationToken,
  GRAPH_NOTIFICATION_PATH,
  graphValidationResponse,
  rememberNotificationIds,
  resolveGraphNotificationClientState,
  resolveGraphNotificationUrl,
} from '../src/pm/sharepoint/fabric/notifications.ts';
import { inspectFabricSyncHealth } from '../src/pm/sharepoint/fabric/status.ts';
import {
  decideFileChangeNotifications,
  ensureFabricChangeSubscriptions,
  MAIL_SUBSCRIPTION_MAX_MINUTES,
  needsRenewal,
  persistChangeNotificationState,
  subscriptionExpiration,
} from '../src/pm/sharepoint/fabric/subscriptions.ts';
import { MANNY_ENTRA_OID } from '../src/pm/sharepoint/manny.ts';
import type { FabricGraphClient } from '../src/pm/sharepoint/fabric/graph.ts';

const CLIENT_STATE = 'atlas-graph-client-state-ok';
const MAIL_SUB_ID = '11111111-1111-4111-8111-111111111111';
const FILE_SUB_ID = '22222222-2222-4222-8222-222222222222';

function graphClient(handlers: {
  post?: (path: string, body: unknown) => Promise<{ status: number; json: Record<string, unknown> }>;
  patch?: (path: string, body: unknown) => Promise<{ status: number; json: Record<string, unknown> }>;
  del?: (path: string) => Promise<{ status: number; json: Record<string, unknown> }>;
}): FabricGraphClient {
  return {
    async getJson() {
      return { status: 404, json: {} };
    },
    async postJson(path, body) {
      return handlers.post ? handlers.post(path, body) : { status: 404, json: {} };
    },
    async patchJson(path, body) {
      return handlers.patch ? handlers.patch(path, body) : { status: 404, json: {} };
    },
    async deleteJson(path) {
      return handlers.del ? handlers.del(path) : { status: 404, json: {} };
    },
  };
}

async function withNotificationHub(
  fn: (base: string, dir: string, syncs: string[]) => Promise<void>,
  opts?: { clientState?: string },
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-graph-notify-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
    INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    STATE: process.env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE,
  };
  const syncs: string[] = [];
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_PM_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  if (opts?.clientState) process.env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE = opts.clientState;
  else delete process.env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE;
  const cfg: AppConfig = {
    ...loadConfig(),
    dataDir: dir,
    verifyAccessToken: async () => {
      const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
      err.status = 401;
      err.code = 'invalid_token';
      throw err;
    },
  };
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const pm = new PmRepository(dir);
  const app = buildRegistry(cfg, repo);
  const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
  const server = createServer((req, res) => {
    handleRequest(
      {
        cfg,
        repo,
        app,
        pm,
        localAi,
        requestFabricSync: async (trigger) => {
          syncs.push(trigger);
          return { accepted: true, queued: false };
        },
      },
      req,
      res,
    ).catch((err) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}`, dir, syncs);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    if (prev.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prev.NODE_ENV;
    if (prev.REQUIRE === undefined) delete process.env.INTEGRATION_REQUIRE_AUTH;
    else process.env.INTEGRATION_REQUIRE_AUTH = prev.REQUIRE;
    if (prev.INSECURE === undefined) delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    else process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH = prev.INSECURE;
    if (prev.HOST === undefined) delete process.env.INTEGRATION_HOST;
    else process.env.INTEGRATION_HOST = prev.HOST;
    if (prev.KEY === undefined) delete process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY;
    else process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
    if (prev.TENANT === undefined) delete process.env.MICROSOFT_TENANT_ID;
    else process.env.MICROSOFT_TENANT_ID = prev.TENANT;
    if (prev.PM === undefined) delete process.env.INTEGRATION_PM_BACKEND;
    else process.env.INTEGRATION_PM_BACKEND = prev.PM;
    if (prev.STATE === undefined) delete process.env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE;
    else process.env.INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE = prev.STATE;
  }
}

describe('Graph change-notification handshake', () => {
  it('returns URL-decoded validation token as text/plain 200', async () => {
    const token = decodeGraphValidationToken('Validation%3Atoken%20ok');
    assert.equal(token, 'Validation:token ok');
    const handshake = graphValidationResponse(token!);
    assert.equal(handshake.status, 200);
    assert.match(handshake.contentType, /text\/plain/);
    assert.equal(handshake.body, 'Validation:token ok');

    await withNotificationHub(async (base) => {
      const res = await fetch(
        `${base}${GRAPH_NOTIFICATION_PATH}?validationToken=${encodeURIComponent('Graph+Handshake/1')}`,
        { method: 'POST' },
      );
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') || '', /text\/plain/);
      assert.equal(await res.text(), 'Graph+Handshake/1');
    });
  });

  it('rejects forged notifications without a matching clientState and does not trigger delta', async () => {
    assert.equal(clientStateMatches(CLIENT_STATE, 'nope'), false);
    assert.equal(clientStateMatches(null, CLIENT_STATE), false);
    await withNotificationHub(async (base, _dir, syncs) => {
      const missing = await fetch(`${base}${GRAPH_NOTIFICATION_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          value: [{ subscriptionId: MAIL_SUB_ID, changeType: 'created', clientState: 'forged' }],
        }),
      });
      assert.equal(missing.status, 401);
      assert.equal(syncs.length, 0);
      const unsigned = await fetch(`${base}${GRAPH_NOTIFICATION_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: [{ changeType: 'created' }] }),
      });
      assert.equal(unsigned.status, 401);
      assert.equal(syncs.length, 0);
    }, { clientState: CLIENT_STATE });
  });

  it('replays the same notification without a second delta trigger', async () => {
    let triggers = 0;
    const body = {
      value: [
        {
          subscriptionId: MAIL_SUB_ID,
          clientState: CLIENT_STATE,
          changeType: 'created',
          resource: `users/${MANNY_ENTRA_OID}/messages/abc`,
          resourceData: { id: 'abc' },
        },
      ],
    };
    const first = await acceptGraphChangeNotifications({
      body,
      expectedClientState: CLIENT_STATE,
      trigger: async () => {
        triggers += 1;
        return { accepted: true, queued: false };
      },
    });
    assert.equal(first.ok, true);
    if (first.ok) {
      assert.equal(first.replay, false);
      assert.equal(first.triggered, true);
      const second = await acceptGraphChangeNotifications({
        body,
        expectedClientState: CLIENT_STATE,
        priorSeenIds: first.seen,
        trigger: async () => {
          triggers += 1;
          return { accepted: true, queued: false };
        },
      });
      assert.equal(second.ok, true);
      if (second.ok) {
        assert.equal(second.replay, true);
        assert.equal(second.triggered, false);
      }
    }
    assert.equal(triggers, 1);
    assert.deepEqual(rememberNotificationIds(['a'], ['a']).novel, []);
  });
});

describe('Graph change-notification subscriptions', () => {
  it('creates a mail subscription and reports ready only after Graph returns an id', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-graph-sub-'));
    try {
      const posts: Array<{ path: string; body: Record<string, unknown> }> = [];
      const state = await ensureFabricChangeSubscriptions({
        fabric: graphClient({
          post: async (path, body) => {
            posts.push({ path, body: body as Record<string, unknown> });
            return {
              status: 201,
              json: {
                id: MAIL_SUB_ID,
                resource: (body as { resource?: string }).resource || '',
                expirationDateTime: '2099-01-01T00:00:00.000Z',
              },
            };
          },
        }),
        dataDir: dir,
        env: {
          INTEGRATION_GRAPH_NOTIFICATION_URL: 'https://app-atlas-integration-hub.azurewebsites.net/api/graph/change-notifications',
          INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE: CLIENT_STATE,
        },
        driveIds: [],
      });
      assert.equal(state.status, 'ready');
      assert.equal(state.mailStatus, 'ready');
      assert.equal(state.filesStatus, 'skipped');
      assert.equal(state.mail?.id, MAIL_SUB_ID);
      assert.equal(posts[0]?.path, '/v1.0/subscriptions');
      assert.equal(posts[0]?.body.resource, `users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages`);
      assert.ok(String(posts[0]?.body.expirationDateTime || ''));
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.changeNotifications.status, 'ready');
      assert.equal(health.changeNotifications.mail, 'ready');
      assert.equal(health.changeNotifications.files, 'skipped');
      assert.match(health.changeNotifications.reason, /Mail subscription|Files:/);
      assert.equal(/clientState|Bearer |deltatoken/i.test(JSON.stringify(health)), false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('renews a stored mail subscription before the 4230-minute cap', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-graph-renew-'));
    try {
      persistChangeNotificationState(dir, {
        status: 'ready',
        reason: 'prior',
        mailStatus: 'ready',
        filesStatus: 'skipped',
        mail: {
          id: MAIL_SUB_ID,
          resource: `users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages`,
          kind: 'mail',
          expirationDateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          notificationUrl: 'https://app-atlas-integration-hub.azurewebsites.net/api/graph/change-notifications',
        },
      });
      const patches: Array<{ path: string; body: Record<string, unknown> }> = [];
      const now = new Date('2026-08-24T11:00:00.000Z');
      assert.equal(needsRenewal(new Date(now.getTime() + 60 * 60 * 1000).toISOString(), now), true);
      assert.equal(MAIL_SUBSCRIPTION_MAX_MINUTES, 4230);
      const exp = subscriptionExpiration(now, 5000);
      assert.ok(Date.parse(exp) - now.getTime() <= 4230 * 60_000);
      const state = await ensureFabricChangeSubscriptions({
        fabric: graphClient({
          patch: async (path, body) => {
            patches.push({ path, body: body as Record<string, unknown> });
            return {
              status: 200,
              json: {
                id: MAIL_SUB_ID,
                resource: `users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages`,
                expirationDateTime: '2099-01-02T00:00:00.000Z',
              },
            };
          },
        }),
        dataDir: dir,
        env: {
          INTEGRATION_GRAPH_NOTIFICATION_URL: 'https://app-atlas-integration-hub.azurewebsites.net/api/graph/change-notifications',
          INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE: CLIENT_STATE,
        },
        now: () => now,
        driveIds: [],
      });
      assert.equal(state.status, 'ready');
      assert.equal(patches[0]?.path, `/v1.0/subscriptions/${MAIL_SUB_ID}`);
      assert.ok(patches[0]?.body.expirationDateTime);
      assert.equal(state.mail?.expirationDateTime, '2099-01-02T00:00:00.000Z');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('honest-skips file notifications when Graph rejects the driveItem resource', async () => {
    assert.equal(decideFileChangeNotifications({ driveIds: [] }).action, 'skip');
    assert.equal(decideFileChangeNotifications({ driveIds: ['b!abc'], graphRejected: true }).action, 'skip');
    const dir = mkdtempSync(join(tmpdir(), 'atlas-graph-files-skip-'));
    try {
      const state = await ensureFabricChangeSubscriptions({
        fabric: graphClient({
          post: async (path, body) => {
            const resource = String((body as { resource?: string }).resource || '');
            if (resource.startsWith('drives/')) {
              return { status: 400, json: { error: { code: 'InvalidRequest', message: 'Resource not supported' } } };
            }
            return {
              status: 201,
              json: {
                id: MAIL_SUB_ID,
                resource,
                expirationDateTime: '2099-01-01T00:00:00.000Z',
              },
            };
          },
        }),
        dataDir: dir,
        env: {
          INTEGRATION_GRAPH_NOTIFICATION_URL: 'https://app-atlas-integration-hub.azurewebsites.net/api/graph/change-notifications',
          INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE: CLIENT_STATE,
        },
        driveIds: ['b!abc'],
      });
      assert.equal(state.mailStatus, 'ready');
      assert.equal(state.filesStatus, 'skipped');
      assert.match(state.reason, /rejected driveItem|scheduled file delta/i);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.changeNotifications.mail, 'ready');
      assert.equal(health.changeNotifications.files, 'skipped');
      assert.equal(health.changeNotifications.status, 'ready');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not claim ready when notification URL or clientState is missing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-graph-skip-cfg-'));
    try {
      const state = await ensureFabricChangeSubscriptions({
        fabric: graphClient({}),
        dataDir: dir,
        env: {},
        driveIds: [],
      });
      assert.equal(state.status, 'skipped');
      assert.match(state.reason, /not proven against Graph|not configured/);
      const health = inspectFabricSyncHealth(dir, { sweepEnabled: true });
      assert.equal(health.changeNotifications.status, 'skipped');
      assert.equal(health.changeNotifications.mail, 'skipped');
      assert.equal(resolveGraphNotificationUrl({ INTEGRATION_GRAPH_NOTIFICATION_URL: 'http://localhost/x' }), null);
      assert.equal(resolveGraphNotificationClientState({ INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE: 'short' }), null);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Graph change-notification HTTP + health honesty', { concurrency: 1 }, () => {
  it('triggers existing delta once for a signed notification and keeps unsigned operator JSON at 401', async () => {
    await withNotificationHub(async (base, dir, syncs) => {
      persistChangeNotificationState(dir, {
        status: 'ready',
        reason: 'Mail subscription created.',
        mailStatus: 'ready',
        filesStatus: 'skipped',
        mail: {
          id: MAIL_SUB_ID,
          resource: `users/${MANNY_ENTRA_OID}/mailFolders/inbox/messages`,
          kind: 'mail',
          expirationDateTime: '2099-01-01T00:00:00.000Z',
          notificationUrl: 'https://app-atlas-integration-hub.azurewebsites.net/api/graph/change-notifications',
        },
      });
      const payload = {
        value: [
          {
            subscriptionId: MAIL_SUB_ID,
            clientState: CLIENT_STATE,
            changeType: 'created',
            resource: `users/${MANNY_ENTRA_OID}/messages/m1`,
            resourceData: { id: 'm1' },
          },
        ],
      };
      const first = await fetch(`${base}${GRAPH_NOTIFICATION_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(first.status, 202);
      const replay = await fetch(`${base}${GRAPH_NOTIFICATION_PATH}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(replay.status, 202);
      const replayBody = (await replay.json()) as { replay?: boolean };
      assert.equal(replayBody.replay, true);
      assert.equal(syncs.length, 1);
      const operator = await fetch(`${base}/api/pm/fabric/sync`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      assert.equal(operator.status, 401);
      const health = await fetch(`${base}/health`);
      const body = (await health.json()) as {
        fabricSync?: { changeNotifications?: { status?: string; mail?: string; files?: string } };
        authRequired?: boolean;
      };
      assert.equal(body.authRequired, true);
      assert.equal(body.fabricSync?.changeNotifications?.status, 'ready');
      assert.equal(body.fabricSync?.changeNotifications?.files, 'skipped');
      const stored = JSON.parse(readFileSync(join(dir, 'fabric-checkpoint.json'), 'utf8')) as {
        changeNotifications?: { seenIds?: string[] };
      };
      assert.ok((stored.changeNotifications?.seenIds || []).length > 0);
    }, { clientState: CLIENT_STATE });
  });

  it('allowlists subscription lifecycle paths and rejects mailbox writes', () => {
    assert.equal(isAllowedFabricGraphPath('/v1.0/subscriptions', 'POST'), true);
    assert.equal(isAllowedFabricGraphPath(`/v1.0/subscriptions/${MAIL_SUB_ID}`, 'PATCH'), true);
    assert.equal(isAllowedFabricGraphPath(`/v1.0/subscriptions/${MAIL_SUB_ID}`, 'DELETE'), true);
    assert.equal(isAllowedFabricGraphPath('/v1.0/users/me/sendMail', 'POST'), false);
    const client = createFabricGraphClient({ getToken: async () => 'token' });
    assert.ok(client.patchJson);
    assert.ok(client.deleteJson);
  });

  it('stores a file subscription id only when Graph create succeeds', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-graph-files-ready-'));
    try {
      writeFileSync(
        join(dir, 'fabric-checkpoint.json'),
        JSON.stringify({ sharePoint: { drives: { 'b!abc': { scannedAt: '2026-08-24T00:00:00.000Z' } } } }),
      );
      const state = await ensureFabricChangeSubscriptions({
        fabric: graphClient({
          post: async (_path, body) => {
            const resource = String((body as { resource?: string }).resource || '');
            const id = resource.startsWith('drives/') ? FILE_SUB_ID : MAIL_SUB_ID;
            return {
              status: 201,
              json: { id, resource, expirationDateTime: '2099-01-01T00:00:00.000Z' },
            };
          },
        }),
        dataDir: dir,
        env: {
          INTEGRATION_GRAPH_NOTIFICATION_URL: 'https://app-atlas-integration-hub.azurewebsites.net/api/graph/change-notifications',
          INTEGRATION_GRAPH_NOTIFICATION_CLIENT_STATE: CLIENT_STATE,
        },
      });
      assert.equal(state.filesStatus, 'ready');
      assert.equal(state.files?.[0]?.id, FILE_SUB_ID);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
