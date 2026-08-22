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
import { createAuthorizedPmRepository, PM_BACKEND_UNAVAILABLE } from '../src/pm/backend.ts';
import { IntegrationRepository } from '../src/store/repository.ts';

function invalidToken(): never {
  const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
  err.status = 401;
  err.code = 'invalid_token';
  throw err;
}

async function syntheticVerify(token: string): Promise<Record<string, unknown>> {
  if (token === 'valid-member') {
    return { oid: 'user-1', preferred_username: 'member@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  invalidToken();
}

type HubMode = 'development-json' | 'unavailable';

async function withPmHub(
  opts: { nodeEnv: 'development' | 'production'; pmBackend: HubMode },
  fn: (ctx: { base: string; dataDir: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-pm-backend-hub-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
    INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    DATA: process.env.INTEGRATION_DATA_DIR,
  };
  process.env.NODE_ENV = opts.nodeEnv;
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  if (opts.pmBackend === 'development-json') {
    process.env.INTEGRATION_PM_BACKEND = 'development-json';
  } else {
    delete process.env.INTEGRATION_PM_BACKEND;
  }
  const cfg: AppConfig = { ...loadConfig(), verifyAccessToken: syntheticVerify };
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const pm = createAuthorizedPmRepository(cfg);
  const app = buildRegistry(cfg, repo);
  const localAi = createLocalAiAdapter({
    env: { LOCAL_AI_ENABLED: undefined },
    secretsFileEnv: {},
  });
  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm, localAi }, req, res).catch((err) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn({ base: `http://127.0.0.1:${port}`, dataDir: dir });
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
    if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
    else process.env.INTEGRATION_DATA_DIR = prev.DATA;
  }
}

function authHeaders(): Record<string, string> {
  return { authorization: 'Bearer valid-member', 'content-type': 'application/json' };
}

describe('authenticated PM + explicit local-development JSON', () => {
  it('reads and writes only the configured local path and does not claim SharePoint or Live', async () => {
    await withPmHub({ nodeEnv: 'development', pmBackend: 'development-json' }, async ({ base, dataDir }) => {
      const health = await fetch(`${base}/health`);
      assert.equal(health.status, 200);
      const healthBody = (await health.json()) as {
        ok: boolean;
        pmBackend: { mode: string; classification: string };
      };
      assert.equal(healthBody.ok, true);
      assert.equal(healthBody.pmBackend.mode, 'development-json');
      assert.equal(healthBody.pmBackend.classification, 'development-local');
      assert.notEqual(healthBody.pmBackend.classification, 'Live');
      assert.notEqual(healthBody.pmBackend.mode, 'sharepoint');

      const created = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: 'Gate 8B-2 local project' }),
      });
      assert.equal(created.status, 200);
      const createdBody = (await created.json()) as { project: { id: string; name: string } };
      assert.equal(createdBody.project.name, 'Gate 8B-2 local project');

      const listed = await fetch(`${base}/api/pm/projects`, { headers: authHeaders() });
      assert.equal(listed.status, 200);
      const listedBody = (await listed.json()) as { projects: Array<{ name: string }> };
      assert.equal(listedBody.projects.length, 1);

      const tasks = await fetch(`${base}/api/pm/tasks`, { headers: authHeaders() });
      assert.equal(tasks.status, 200);

      const taskWrite = await fetch(`${base}/api/pm/tasks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title: 'Local JSON task', projectId: createdBody.project.id }),
      });
      assert.equal(taskWrite.status, 200);

      const commandCenter = await fetch(`${base}/api/pm/command-center`, { headers: authHeaders() });
      assert.equal(commandCenter.status, 200);
      const myWork = await fetch(`${base}/api/pm/my-work`, { headers: authHeaders() });
      assert.equal(myWork.status, 200);
      const portfolio = await fetch(`${base}/api/pm/portfolio`, { headers: authHeaders() });
      assert.equal(portfolio.status, 200);

      const storePath = join(dataDir, 'pm-store.json');
      assert.equal(existsSync(storePath), true);
      const raw = readFileSync(storePath, 'utf8');
      assert.ok(raw.includes('Gate 8B-2 local project'));
      assert.ok(raw.includes('Local JSON task'));
      assert.equal(raw.toLowerCase().includes('sharepoint'), false);
    });
  });
});

describe('development without local JSON authorization', () => {
  it('does not silently use JSON and fails closed for PM reads and writes', async () => {
    await withPmHub({ nodeEnv: 'development', pmBackend: 'unavailable' }, async ({ base, dataDir }) => {
      const health = await fetch(`${base}/health`);
      const healthBody = (await health.json()) as {
        ok: boolean;
        pmBackend: { mode: string; classification: string };
      };
      assert.equal(health.status, 200);
      assert.equal(healthBody.ok, true);
      assert.equal(healthBody.pmBackend.mode, 'unavailable');
      assert.equal(healthBody.pmBackend.classification, 'unavailable');

      const flags = await fetch(`${base}/api/local-ai/flags`, { headers: authHeaders() });
      assert.equal(flags.status, 200);

      const read = await fetch(`${base}/api/pm/projects`, { headers: authHeaders() });
      assert.equal(read.status, 503);
      const readBody = (await read.json()) as {
        error: string;
        code: string;
        classification: string;
        projects?: unknown;
      };
      assert.equal(readBody.error, PM_BACKEND_UNAVAILABLE);
      assert.equal(readBody.code, PM_BACKEND_UNAVAILABLE);
      assert.equal(readBody.classification, 'unavailable');
      assert.equal(readBody.projects, undefined);

      const write = await fetch(`${base}/api/pm/projects`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name: 'must-not-persist' }),
      });
      assert.equal(write.status, 503);
      const writeBody = (await write.json()) as { error: string; ok?: boolean };
      assert.equal(writeBody.error, PM_BACKEND_UNAVAILABLE);
      assert.equal(writeBody.ok, undefined);

      assert.equal(existsSync(join(dataDir, 'pm-store.json')), false);
    });
  });
});

describe('production with no approved PM backend', () => {
  it('keeps Hub operational and returns 503 for PM persistence without touching JSON', async () => {
    await withPmHub({ nodeEnv: 'production', pmBackend: 'unavailable' }, async ({ base, dataDir }) => {
      const health = await fetch(`${base}/health`);
      assert.equal(health.status, 200);
      const healthBody = (await health.json()) as {
        ok: boolean;
        pmBackend: { mode: string; classification: string };
      };
      assert.equal(healthBody.ok, true);
      assert.equal(healthBody.pmBackend.mode, 'unavailable');

      const flags = await fetch(`${base}/api/local-ai/flags`, { headers: authHeaders() });
      assert.equal(flags.status, 200);

      const read = await fetch(`${base}/api/pm/projects`, { headers: authHeaders() });
      assert.equal(read.status, 503);
      const readBody = (await read.json()) as { error: string; projects?: unknown };
      assert.equal(readBody.error, PM_BACKEND_UNAVAILABLE);
      assert.equal(readBody.projects, undefined);

      const tasks = await fetch(`${base}/api/pm/tasks`, { headers: authHeaders() });
      assert.equal(tasks.status, 503);

      const commandCenter = await fetch(`${base}/api/pm/command-center`, { headers: authHeaders() });
      assert.equal(commandCenter.status, 503);

      const write = await fetch(`${base}/api/pm/tasks`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title: 'must-not-write' }),
      });
      assert.equal(write.status, 503);
      const writeBody = (await write.json()) as { error: string; task?: unknown };
      assert.equal(writeBody.error, PM_BACKEND_UNAVAILABLE);
      assert.equal(writeBody.task, undefined);

      assert.equal(existsSync(join(dataDir, 'pm-store.json')), false);
    });
  });
});

describe('no silent PM fallback', () => {
  it('unavailable production path does not return development data or claim SharePoint success', async () => {
    await withPmHub({ nodeEnv: 'production', pmBackend: 'unavailable' }, async ({ base, dataDir }) => {
      const res = await fetch(`${base}/api/pm/portfolio`, { headers: authHeaders() });
      assert.equal(res.status, 503);
      const body = (await res.json()) as Record<string, unknown>;
      assert.equal(body.error, PM_BACKEND_UNAVAILABLE);
      assert.equal(body.portfolio, undefined);
      assert.equal(body.ok, undefined);
      const serialized = JSON.stringify(body).toLowerCase();
      assert.equal(serialized.includes('sharepoint'), false);
      assert.equal(serialized.includes('"live"'), false);
      assert.equal(existsSync(join(dataDir, 'pm-store.json')), false);
    });
  });
});

describe('Gate 8B-1 authentication still governs PM routes', () => {
  it('unauthenticated PM request remains 401 and is not a backend-unavailable 503', async () => {
    await withPmHub({ nodeEnv: 'production', pmBackend: 'unavailable' }, async ({ base }) => {
      const res = await fetch(`${base}/api/pm/projects`);
      assert.equal(res.status, 401);
      const body = (await res.json()) as { error: string; code?: string };
      assert.equal(body.error, 'unauthorized');
      assert.notEqual(body.error, PM_BACKEND_UNAVAILABLE);
    });
  });

  it('unauthenticated PM request is 401 even when local JSON is authorized', async () => {
    await withPmHub({ nodeEnv: 'development', pmBackend: 'development-json' }, async ({ base }) => {
      const res = await fetch(`${base}/api/pm/projects`);
      assert.equal(res.status, 401);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, 'unauthorized');
    });
  });

  it('authenticated unavailable PM is 503, not 401', async () => {
    await withPmHub({ nodeEnv: 'production', pmBackend: 'unavailable' }, async ({ base }) => {
      const res = await fetch(`${base}/api/pm/projects`, { headers: authHeaders() });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, PM_BACKEND_UNAVAILABLE);
      assert.notEqual(body.error, 'unauthorized');
    });
  });
});
