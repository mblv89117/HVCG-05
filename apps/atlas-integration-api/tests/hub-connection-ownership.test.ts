import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ConnectionRecord } from '@hvcg/atlas-integration-core';
import { loadConfig, type AppConfig } from '../src/config.ts';
import {
  CONNECTOR_SEARCH_DISABLED_IN_PRODUCTION,
  CONNECTOR_SYNC_DISABLED_IN_PRODUCTION,
  isConnectorSearchDisabled,
  isConnectorSyncDisabled,
} from '../src/connectors/contentPolicy.ts';
import { connectionOwnedByPrincipal, getOwnedConnection } from '../src/connectors/ownership.ts';
import { buildRegistry, type AppRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { PmRepository } from '../src/pm/repository.ts';
import { IntegrationRepository } from '../src/store/repository.ts';

const USER_A = '11111111-1111-1111-1111-1111111110aa';
const USER_B = '11111111-1111-1111-1111-1111111110bb';
const ADMIN = '11111111-1111-1111-1111-1111111110ad';
const OWNER = '11111111-1111-1111-1111-1111111110ow';
const CONN_A = 'conn-owner-a';
const CONN_B = 'conn-owner-b';
const CONN_NONE = 'conn-ownerless';
const UNKNOWN_ID = 'conn-does-not-exist';
const TOKEN_B = 'SECRET_TOKEN_B_DO_NOT_LEAK';

interface CallCounters {
  search: number;
  listResources: number;
  syncNow: number;
  disconnect: number;
  connect: number;
  verify: number;
  getCredentials: number;
}

async function syntheticVerify(token: string): Promise<Record<string, unknown>> {
  if (token === 'valid-member') {
    return { oid: USER_A, roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  if (token === 'valid-member-b') {
    return { oid: USER_B, roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  if (token === 'valid-admin') {
    return { oid: ADMIN, roles: ['Administrator'], scp: 'access_as_user' };
  }
  if (token === 'valid-owner') {
    return { oid: OWNER, roles: ['HVCG Owner'], scp: 'access_as_user' };
  }
  if (token === 'valid-sub-only') {
    return { sub: USER_A, roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
  err.status = 401;
  err.code = 'invalid_token';
  throw err;
}

function fixtureConnection(id: string, ownerUserId: string): ConnectionRecord {
  const now = new Date().toISOString();
  return {
    id,
    providerId: 'microsoft',
    providerName: 'Microsoft 365',
    businessEntity: 'HVCG',
    accountName: `acct-${id}`,
    accountEmail: `${id}@example.test`,
    mailboxType: 'user',
    ownerUserId,
    authType: 'oauth2_delegated',
    permissionMode: 'read_only_discovery',
    scopes: ['Mail.Read'],
    status: 'Connected',
    environment: 'local',
    connectedAt: now,
    requiresReauthorization: false,
    autoSyncEnabled: true,
    recordsDiscovered: 0,
    recordsImported: 0,
    resourceSelections: [],
    encryptedCredentialsRef: id,
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
}

function instrument(app: AppRegistry, repo: IntegrationRepository): CallCounters {
  const calls: CallCounters = {
    search: 0,
    listResources: 0,
    syncNow: 0,
    disconnect: 0,
    connect: 0,
    verify: 0,
    getCredentials: 0,
  };
  const origGet = repo.getCredentials.bind(repo);
  repo.getCredentials = (connectionId: string) => {
    calls.getCredentials += 1;
    return origGet(connectionId);
  };
  for (const adapter of app.adapters.values()) {
    adapter.searchRecords = async () => {
      calls.search += 1;
      return { items: [] };
    };
    adapter.listResources = async () => {
      calls.listResources += 1;
      return { items: [] };
    };
    adapter.syncNow = async (request) => {
      calls.syncNow += 1;
      return {
        records: [],
        job: {
          id: 'job-stub',
          connectionId: request.connectionId,
          providerId: adapter.providerId,
          trigger: 'manual',
          status: 'succeeded',
          startedAt: new Date().toISOString(),
          recordsImported: 0,
          recordsSkipped: 0,
          duplicatesPrevented: 0,
          errorCount: 0,
        },
      };
    };
    adapter.disconnect = async () => {
      calls.disconnect += 1;
    };
    adapter.connect = async () => {
      calls.connect += 1;
      return { authorizationUrl: 'http://127.0.0.1/oauth-stub', state: 'state-stub' };
    };
    adapter.verifyConnection = async () => {
      calls.verify += 1;
      return { ok: true, detail: 'stub' };
    };
  }
  return calls;
}

function seedStore(repo: IntegrationRepository) {
  repo.upsertConnection(fixtureConnection(CONN_A, USER_A));
  repo.upsertConnection(fixtureConnection(CONN_B, USER_B));
  repo.upsertConnection(fixtureConnection(CONN_NONE, ''));
  repo.saveCredentials(CONN_B, {
    accessToken: TOKEN_B,
    refreshToken: 'SECRET_REFRESH_B',
    expiresAt: '2099-01-01T00:00:00.000Z',
  });
  repo.appendAudit({
    id: 'audit-b',
    at: new Date().toISOString(),
    actorUserId: USER_B,
    action: 'connect_started',
    connectionId: CONN_B,
    sourceAccount: 'mailbox-b@example.test',
    outcome: 'success',
    detail: 'b-connect',
    sensitive: false,
  });
  repo.appendAudit({
    id: 'audit-a',
    at: new Date().toISOString(),
    actorUserId: USER_A,
    action: 'connect_started',
    connectionId: CONN_A,
    outcome: 'success',
    detail: 'a-connect',
    sensitive: false,
  });
}

async function withHub(
  fn: (ctx: { base: string; repo: IntegrationRepository; calls: CallCounters; cfg: AppConfig }) => Promise<void>,
  opts?: {
    nodeEnv?: 'development' | 'production';
    resolveAllowedClientIds?: AppConfig['resolveAllowedClientIds'];
  },
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-conn-own-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
    INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    SEARCH: process.env.INTEGRATION_ALLOW_CONNECTOR_SEARCH,
    SYNC: process.env.INTEGRATION_ALLOW_CONNECTOR_SYNC,
  };
  process.env.NODE_ENV = opts?.nodeEnv || 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_PM_BACKEND = 'unavailable';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: syntheticVerify,
    resolveAllowedClientIds: opts?.resolveAllowedClientIds,
  };
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  seedStore(repo);
  const pm = new PmRepository(dir);
  const app = buildRegistry(cfg, repo);
  const calls = instrument(app, repo);
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
    await fn({ base: `http://127.0.0.1:${port}`, repo, calls, cfg });
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
    if (prev.SEARCH === undefined) delete process.env.INTEGRATION_ALLOW_CONNECTOR_SEARCH;
    else process.env.INTEGRATION_ALLOW_CONNECTOR_SEARCH = prev.SEARCH;
    if (prev.SYNC === undefined) delete process.env.INTEGRATION_ALLOW_CONNECTOR_SYNC;
    else process.env.INTEGRATION_ALLOW_CONNECTOR_SYNC = prev.SYNC;
  }
}

function auth(token: string, extra?: Record<string, string>): Record<string, string> {
  return { authorization: `Bearer ${token}`, ...extra };
}

async function json(
  base: string,
  path: string,
  init?: RequestInit,
): Promise<{ status: number; body: Record<string, unknown>; raw: string }> {
  const res = await fetch(`${base}${path}`, init);
  const raw = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    body = { parseError: true };
  }
  return { status: res.status, body, raw };
}

describe('connection ownership helper', () => {
  it('matches only the verified principal userId', () => {
    const owned = fixtureConnection(CONN_A, USER_A);
    assert.equal(connectionOwnedByPrincipal(owned, USER_A), true);
    assert.equal(connectionOwnedByPrincipal(owned, USER_B), false);
    assert.equal(connectionOwnedByPrincipal(owned, ''), false);
    assert.equal(connectionOwnedByPrincipal(owned, undefined), false);
  });

  it('ownerless records fail closed', () => {
    const none = fixtureConnection(CONN_NONE, '');
    assert.equal(connectionOwnedByPrincipal(none, USER_A), false);
    assert.equal(connectionOwnedByPrincipal(none, 'dev-user'), false);
  });

  it('does not treat email as ownership', () => {
    const owned = fixtureConnection(CONN_A, USER_A);
    assert.equal(connectionOwnedByPrincipal(owned, 'conn-owner-a@example.test'), false);
  });
});

describe('production connector content policy', () => {
  it('disables search and sync only in production, with no override flag', () => {
    assert.equal(isConnectorSearchDisabled(false), false);
    assert.equal(isConnectorSyncDisabled(false), false);
    assert.equal(isConnectorSearchDisabled(true), true);
    assert.equal(isConnectorSyncDisabled(true), true);
    assert.equal(CONNECTOR_SEARCH_DISABLED_IN_PRODUCTION, 'CONNECTOR_SEARCH_DISABLED_IN_PRODUCTION');
    assert.equal(CONNECTOR_SYNC_DISABLED_IN_PRODUCTION, 'CONNECTOR_SYNC_DISABLED_IN_PRODUCTION');
  });
});

describe('connection listing', () => {
  it('anonymous listing is 401', async () => {
    await withHub(async ({ base }) => {
      const res = await json(base, '/api/connections');
      assert.equal(res.status, 401);
    });
  });

  it('user A sees only A connections and user B sees only B', async () => {
    await withHub(async ({ base }) => {
      const a = await json(base, '/api/connections', { headers: auth('valid-member') });
      assert.equal(a.status, 200);
      const aConns = a.body.connections as Array<{ id: string; ownerUserId: string }>;
      assert.deepEqual(aConns.map((c) => c.id), [CONN_A]);
      assert.equal(a.raw.includes(CONN_B), false);
      assert.equal(a.raw.includes(TOKEN_B), false);

      const b = await json(base, '/api/connections', { headers: auth('valid-member-b') });
      assert.equal(b.status, 200);
      const bConns = b.body.connections as Array<{ id: string }>;
      assert.deepEqual(bConns.map((c) => c.id), [CONN_B]);
      assert.equal(b.raw.includes(CONN_A), false);
    });
  });

  it('caller-supplied ownerUserId cannot enumerate another user', async () => {
    await withHub(async ({ base }) => {
      const res = await json(base, `/api/connections?ownerUserId=${USER_B}`, {
        headers: auth('valid-member'),
      });
      assert.equal(res.status, 200);
      const conns = res.body.connections as Array<{ id: string }>;
      assert.deepEqual(conns.map((c) => c.id), [CONN_A]);
      assert.equal(res.raw.includes(CONN_B), false);
    });
  });

  it('ownerless connections are not listed', async () => {
    await withHub(async ({ base }) => {
      const a = await json(base, '/api/connections', { headers: auth('valid-member') });
      const admin = await json(base, '/api/connections', { headers: auth('valid-admin') });
      assert.equal(JSON.stringify(a.body).includes(CONN_NONE), false);
      assert.equal(JSON.stringify(admin.body).includes(CONN_NONE), false);
    });
  });
});

describe('by-id connection IDOR', () => {
  it('owner can read own connection and not another', async () => {
    await withHub(async ({ base }) => {
      const own = await json(base, `/api/connections/${CONN_A}`, { headers: auth('valid-member') });
      assert.equal(own.status, 200);
      assert.equal((own.body.connection as { id: string }).id, CONN_A);

      const other = await json(base, `/api/connections/${CONN_B}`, { headers: auth('valid-member') });
      const missing = await json(base, `/api/connections/${UNKNOWN_ID}`, {
        headers: auth('valid-member'),
      });
      assert.equal(other.status, 404);
      assert.equal(missing.status, 404);
      assert.equal(other.body.error, missing.body.error);
      assert.equal(other.body.ownerUserId, undefined);
      assert.equal(other.raw.includes(USER_B), false);
      assert.equal(other.raw.includes(TOKEN_B), false);
    });
  });

  it('Administrator and HVCG Owner cannot operate another user connection', async () => {
    await withHub(async ({ base, calls }) => {
      for (const token of ['valid-admin', 'valid-owner'] as const) {
        const res = await json(base, `/api/connections/${CONN_B}`, { headers: auth(token) });
        assert.equal(res.status, 404, token);
      }
      const search = await json(base, `/api/connections/${CONN_B}/search`, {
        method: 'POST',
        headers: { ...auth('valid-admin'), 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'invoice' }),
      });
      assert.equal(search.status, 404);
      assert.equal(calls.search, 0);
      assert.equal(calls.getCredentials, 0);
    });
  });

  it('ownerless connection is 404 for an ordinary principal', async () => {
    await withHub(async ({ base, repo, calls }) => {
      assert.ok(repo.getConnection(CONN_NONE));
      const res = await json(base, `/api/connections/${CONN_NONE}`, { headers: auth('valid-member') });
      assert.equal(res.status, 404);
      const search = await json(base, `/api/connections/${CONN_NONE}/search`, {
        method: 'POST',
        headers: { ...auth('valid-member'), 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'x' }),
      });
      assert.equal(search.status, 404);
      assert.equal(calls.search, 0);
      assert.equal(calls.getCredentials, 0);
    });
  });
});

describe('provider call ordering', () => {
  const mutating = [
    ['POST', `/api/connections/${CONN_B}/search`, { query: 'secret-query' }],
    ['POST', `/api/connections/${CONN_B}/sync`, {}],
    ['GET', `/api/connections/${CONN_B}/resources`, null],
    ['POST', `/api/connections/${CONN_B}/disconnect`, {}],
    ['POST', `/api/connections/${CONN_B}/reauthorize`, {}],
    ['POST', `/api/connections/${CONN_B}/verify`, {}],
    ['POST', `/api/connections/${CONN_B}/discover`, {}],
    ['GET', `/api/connections/${CONN_B}/health`, null],
  ] as const;

  it('unauthorized by-id actions do not call provider or decrypt tokens', async () => {
    await withHub(async ({ base, calls, repo }) => {
      const before = repo.getConnection(CONN_B);
      assert.ok(before);
      for (const [method, path, body] of mutating) {
        const res = await json(base, path, {
          method,
          headers: {
            ...auth('valid-member'),
            ...(body ? { 'content-type': 'application/json' } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
        assert.equal(res.status, 404, path);
        assert.equal(res.raw.includes(TOKEN_B), false, path);
      }
      assert.equal(calls.search, 0);
      assert.equal(calls.listResources, 0);
      assert.equal(calls.syncNow, 0);
      assert.equal(calls.disconnect, 0);
      assert.equal(calls.connect, 0);
      assert.equal(calls.verify, 0);
      assert.equal(calls.getCredentials, 0);
      assert.equal(repo.getConnection(CONN_B)?.status, before?.status);
    });
  });

  it('owned resources in development may call the adapter after ownership', async () => {
    await withHub(async ({ base, calls }) => {
      const res = await json(base, `/api/connections/${CONN_A}/resources`, {
        headers: auth('valid-member'),
      });
      assert.equal(res.status, 200);
      assert.equal(calls.listResources, 1);
    });
  });
});

describe('spoofing cannot change ownership', () => {
  it('body, query, headers, email, and client group do not grant another connection', async () => {
    await withHub(
      async ({ base, calls, repo }) => {
        const headers = auth('valid-member', {
          'x-atlas-user-id': USER_B,
          'x-atlas-user-email': 'conn-owner-b@example.test',
          'x-atlas-roles': 'Administrator',
          'x-atlas-client-ids': 'ACCG01,LIEN01',
        });
        const byQuery = await json(base, `/api/connections/${CONN_B}?ownerUserId=${USER_B}`, {
          headers,
        });
        assert.equal(byQuery.status, 404);

        const select = await json(base, `/api/connections/${CONN_B}/resources/select`, {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ ownerUserId: USER_B, selections: [] }),
        });
        assert.equal(select.status, 404);
        assert.equal(repo.getConnection(CONN_B)?.ownerUserId, USER_B);

        const search = await json(base, `/api/connections/${CONN_B}/search`, {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ query: 'x', ownerUserId: USER_B }),
        });
        assert.equal(search.status, 404);
        assert.equal(calls.search, 0);
        assert.equal(calls.getCredentials, 0);
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });
});

describe('production search and sync policy', () => {
  it('owned search is denied in production without invoking the provider', async () => {
    process.env.INTEGRATION_ALLOW_CONNECTOR_SEARCH = 'true';
    await withHub(
      async ({ base, calls, cfg }) => {
        assert.equal(cfg.isProduction, true);
        const res = await json(base, `/api/connections/${CONN_A}/search`, {
          method: 'POST',
          headers: { ...auth('valid-member'), 'content-type': 'application/json' },
          body: JSON.stringify({ query: 'invoice' }),
        });
        assert.equal(res.status, 403);
        assert.equal(res.body.code, CONNECTOR_SEARCH_DISABLED_IN_PRODUCTION);
        assert.equal(res.body.error, 'forbidden');
        assert.equal(res.status, 403);
        assert.notEqual(res.status, 200);
        assert.equal(calls.search, 0);
        assert.equal(calls.getCredentials, 0);
      },
      { nodeEnv: 'production' },
    );
  });

  it('owned per-connection sync is denied in production', async () => {
    process.env.INTEGRATION_ALLOW_CONNECTOR_SYNC = 'true';
    await withHub(
      async ({ base, calls }) => {
        const res = await json(base, `/api/connections/${CONN_A}/sync`, {
          method: 'POST',
          headers: { ...auth('valid-member'), 'content-type': 'application/json' },
          body: '{}',
        });
        assert.equal(res.status, 403);
        assert.equal(res.body.code, CONNECTOR_SYNC_DISABLED_IN_PRODUCTION);
        assert.equal(calls.syncNow, 0);
        assert.equal(calls.getCredentials, 0);
      },
      { nodeEnv: 'production' },
    );
  });

  it('sync/all in production does not process any connection', async () => {
    await withHub(
      async ({ base, calls }) => {
        const res = await json(base, '/api/sync/all', {
          method: 'POST',
          headers: { ...auth('valid-member'), 'content-type': 'application/json' },
          body: '{}',
        });
        assert.equal(res.status, 403);
        assert.equal(res.body.code, CONNECTOR_SYNC_DISABLED_IN_PRODUCTION);
        assert.equal(calls.syncNow, 0);
        assert.equal(calls.getCredentials, 0);
      },
      { nodeEnv: 'production' },
    );
  });

  it('development still allows owned search/sync while enforcing ownership', async () => {
    await withHub(async ({ base, calls }) => {
      const search = await json(base, `/api/connections/${CONN_A}/search`, {
        method: 'POST',
        headers: { ...auth('valid-member'), 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'invoice' }),
      });
      assert.equal(search.status, 200);
      assert.equal(calls.search, 1);

      const denied = await json(base, `/api/connections/${CONN_B}/search`, {
        method: 'POST',
        headers: { ...auth('valid-member'), 'content-type': 'application/json' },
        body: JSON.stringify({ query: 'invoice' }),
      });
      assert.equal(denied.status, 404);
      assert.equal(calls.search, 1);

      const sync = await json(base, `/api/connections/${CONN_A}/sync`, {
        method: 'POST',
        headers: { ...auth('valid-member'), 'content-type': 'application/json' },
        body: '{}',
      });
      assert.equal(sync.status, 200);
      assert.equal(calls.syncNow, 1);
      assert.notEqual((sync.body.job as { status?: string } | undefined)?.status, undefined);
    });
  });

  it('development sync/all processes only the caller owned connections', async () => {
    await withHub(async ({ base, calls }) => {
      const res = await json(base, '/api/sync/all', {
        method: 'POST',
        headers: { ...auth('valid-member'), 'content-type': 'application/json' },
        body: '{}',
      });
      assert.equal(res.status, 200);
      assert.equal(calls.syncNow, 1);
      const jobs = res.body.jobs as Array<{ connectionId: string }>;
      assert.deepEqual(jobs.map((j) => j.connectionId), [CONN_A]);
    });
  });
});

describe('inventory and audit scoping', () => {
  it('inventory does not expose another user connection or token', async () => {
    await withHub(async ({ base }) => {
      const res = await json(base, '/api/inventory', { headers: auth('valid-member') });
      assert.equal(res.status, 200);
      const connections = res.body.connections as Array<{ id: string }>;
      assert.deepEqual(connections.map((c) => c.id), [CONN_A]);
      assert.equal(res.body.client360, undefined);
      assert.equal(res.raw.includes(CONN_B), false);
      assert.equal(res.raw.includes(TOKEN_B), false);
      assert.equal(res.body.summary, undefined);
    });
  });

  it('audit returns only the principal actor events', async () => {
    await withHub(async ({ base }) => {
      const res = await json(base, '/api/audit', { headers: auth('valid-member') });
      assert.equal(res.status, 200);
      const events = res.body.events as Array<{ actorUserId: string; connectionId?: string }>;
      assert.ok(events.length >= 1);
      assert.ok(events.every((e) => e.actorUserId === USER_A));
      assert.equal(res.raw.includes(CONN_B), false);
      assert.equal(res.raw.includes('mailbox-b@example.test'), false);
    });
  });
});

describe('getOwnedConnection does not load credentials', () => {
  it('ownership lookup uses connection metadata only', async () => {
    await withHub(async ({ repo, calls }) => {
      calls.getCredentials = 0;
      const owned = getOwnedConnection(repo, CONN_A, USER_A);
      const denied = getOwnedConnection(repo, CONN_B, USER_A);
      const missing = getOwnedConnection(repo, UNKNOWN_ID, USER_A);
      const ownerless = getOwnedConnection(repo, CONN_NONE, USER_A);
      assert.equal(owned?.id, CONN_A);
      assert.equal(denied, undefined);
      assert.equal(missing, undefined);
      assert.equal(ownerless, undefined);
      assert.equal(calls.getCredentials, 0);
    });
  });
});
