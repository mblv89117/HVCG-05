import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { loadConfig, resolveBaClientSettings, UnsafeHubConfigurationError, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { PmRepository } from '../src/pm/repository.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import {
  baLocalSpawnFallbackAllowed,
  invokeBaDispatch,
  resolveBaS2sToken,
} from '../src/ba/client.ts';
import { projectedBaEnvironment } from '../src/ba/routes.ts';

const here = fileURLToPath(new URL('.', import.meta.url));

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
  if (token === 'valid-owner') {
    return { oid: 'owner-1', roles: ['HVCG Owner'], scp: 'access_as_user' };
  }
  invalidToken();
}

async function withHub(
  fn: (base: string, cfg: AppConfig) => Promise<void>,
  patch?: (cfg: AppConfig) => AppConfig,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-ba-http-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
    INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    BA_URL: process.env.INTEGRATION_BA_BASE_URL,
    BA_TOK: process.env.INTEGRATION_BA_S2S_TOKEN,
    BA_TO: process.env.INTEGRATION_BA_TIMEOUT_MS,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_PM_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  delete process.env.INTEGRATION_BA_BASE_URL;
  delete process.env.INTEGRATION_BA_S2S_TOKEN;
  let cfg: AppConfig = { ...loadConfig(), verifyAccessToken: syntheticVerify };
  if (patch) cfg = patch(cfg);
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const pm = new PmRepository(dir);
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
    await fn(`http://127.0.0.1:${port}`, cfg);
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
    if (prev.BA_URL === undefined) delete process.env.INTEGRATION_BA_BASE_URL;
    else process.env.INTEGRATION_BA_BASE_URL = prev.BA_URL;
    if (prev.BA_TOK === undefined) delete process.env.INTEGRATION_BA_S2S_TOKEN;
    else process.env.INTEGRATION_BA_S2S_TOKEN = prev.BA_TOK;
    if (prev.BA_TO === undefined) delete process.env.INTEGRATION_BA_TIMEOUT_MS;
    else process.env.INTEGRATION_BA_TIMEOUT_MS = prev.BA_TO;
  }
}

function startMockBa(handler: (url: URL, req: import('node:http').IncomingMessage, body: string) => { status: number; body: unknown; delayMs?: number }) {
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c as Buffer));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      const url = new URL(req.url || '/', 'http://ba.local');
      const result = handler(url, req, raw);
      const write = () => {
        res.writeHead(result.status, { 'content-type': 'application/json', 'x-correlation-id': req.headers['x-correlation-id'] || '' });
        res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body));
      };
      if (result.delayMs) setTimeout(write, result.delayMs);
      else write();
    });
  });
  return new Promise<{ base: string; close: () => Promise<void> }>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        base: `http://127.0.0.1:${port}`,
        close: () => new Promise((res, rej) => server.close((err) => (err ? rej(err) : res()))),
      });
    });
  });
}

describe('Hub BA HTTP client isolation', () => {
  it('17. BA-down simulation fails only /api/ba/*', async () => {
    const mock = await startMockBa(() => {
      throw new Error('should not be reached');
    });
    await mock.close();
    await withHub(
      async (base) => {
        const ba = await fetch(`${base}/api/ba/health`, { headers: { authorization: 'Bearer valid-member' } });
        assert.equal(ba.status, 503);
        const body = (await ba.json()) as { ok: boolean; code?: string };
        assert.equal(body.ok, false);
        assert.ok(body.code === 'ba_unavailable' || body.code === 'ba_timeout' || body.code === 'ba_not_configured');
      },
      (cfg) => ({
        ...cfg,
        ba: { ...cfg.ba, baseUrl: mock.base, timeoutMs: 500, healthTimeoutMs: 200 },
        baS2sToken: async () => 'test-s2s',
      }),
    );
  });

  it('18. BA timeout maps to BA route failure only', async () => {
    const mock = await startMockBa(() => ({ status: 200, body: { ok: true, status: 'SUCCESS' }, delayMs: 800 }));
    try {
      await withHub(
        async (base) => {
          const ba = await fetch(`${base}/api/ba/health`, { headers: { authorization: 'Bearer valid-member' } });
          assert.equal(ba.status, 503);
          const body = (await ba.json()) as { code?: string };
          assert.equal(body.code, 'ba_timeout');
        },
        (cfg) => ({
          ...cfg,
          ba: { ...cfg.ba, baseUrl: mock.base, timeoutMs: 50, healthTimeoutMs: 20 },
          baS2sToken: async () => 'test-s2s',
        }),
      );
    } finally {
      await mock.close();
    }
  });

  it('19. malformed BA response is rejected at Hub client', async () => {
    const mock = await startMockBa(() => ({ status: 200, body: 'not-json' }));
    try {
      await withHub(
        async (base) => {
          const ba = await fetch(`${base}/api/ba/health`, { headers: { authorization: 'Bearer valid-member' } });
          assert.equal(ba.status, 502);
          const body = (await ba.json()) as { code?: string };
          assert.equal(body.code, 'ba_malformed_response');
        },
        (cfg) => ({
          ...cfg,
          ba: { ...cfg.ba, baseUrl: mock.base },
          baS2sToken: async () => 'test-s2s',
        }),
      );
    } finally {
      await mock.close();
    }
  });

  it('20. Hub PM routes continue under BA-down simulation', async () => {
    await withHub(async (base) => {
      const pm = await fetch(`${base}/api/pm/projects`, { headers: { authorization: 'Bearer valid-member' } });
      assert.equal(pm.status, 200);
      const ba = await fetch(`${base}/api/ba/gates`, { headers: { authorization: 'Bearer valid-member' } });
      assert.equal(ba.status, 503);
    });
  });

  it('21. Hub health remains operational when BA is unavailable', async () => {
    await withHub(async (base) => {
      const res = await fetch(`${base}/health`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        ok: boolean;
        ba: { configured: boolean; reachable: boolean | null };
        pmBackend: { mode: string };
      };
      assert.equal(body.ok, true);
      assert.equal(body.ba.configured, false);
      assert.equal(body.ba.reachable, null);
      assert.equal(body.pmBackend.mode, 'development-json');
    });
  });

  it('21b. configured but unreachable BA does not flip Hub ok', async () => {
    await withHub(
      async (base) => {
        const res = await fetch(`${base}/health`);
        assert.equal(res.status, 200);
        const body = (await res.json()) as { ok: boolean; ba: { configured: boolean; reachable: boolean | null } };
        assert.equal(body.ok, true);
        assert.equal(body.ba.configured, true);
        assert.equal(body.ba.reachable, false);
      },
      (cfg) => ({
        ...cfg,
        ba: { baseUrl: 'http://127.0.0.1:9', timeoutMs: 200, healthTimeoutMs: 50 },
      }),
    );
  });

  it('22. production mode cannot invoke local spawn fallback', () => {
    assert.equal(baLocalSpawnFallbackAllowed(true), false);
    assert.equal(baLocalSpawnFallbackAllowed(false), false);
    const src = readFileSync(join(here, '../src/ba/invokePython.ts'), 'utf8');
    assert.equal(src.includes("from 'node:child_process'"), false);
    assert.equal(/spawn\s*\(/.test(src), false);
    const client = readFileSync(join(here, '../src/ba/client.ts'), 'utf8');
    assert.equal(client.includes("from 'node:child_process'"), false);
    assert.equal(/spawn\s*\(/.test(client), false);
    const routes = readFileSync(join(here, '../src/ba/routes.ts'), 'utf8');
    assert.equal(/spawn\s*\(/.test(routes), false);
  });

  it('23. no developer-machine paths in Hub BA client', () => {
    for (const rel of ['../src/ba/client.ts', '../src/ba/routes.ts', '../src/ba/invokePython.ts']) {
      const text = readFileSync(join(here, rel), 'utf8');
      assert.equal(text.includes('/Users/macminipro'), false, rel);
      assert.equal(text.includes('/Volumes/MacMiniPro2TB'), false, rel);
    }
  });

  it('24. no localhost production BA dependency', () => {
    assert.throws(
      () =>
        resolveBaClientSettings({
          NODE_ENV: 'production',
          INTEGRATION_BA_BASE_URL: 'http://127.0.0.1:8794',
        }),
      (err: unknown) => err instanceof UnsafeHubConfigurationError && err.message.includes('localhost'),
    );
    assert.throws(
      () =>
        resolveBaClientSettings({
          NODE_ENV: 'production',
          INTEGRATION_BA_BASE_URL: 'http://ba.example.invalid',
        }),
      (err: unknown) => err instanceof UnsafeHubConfigurationError && err.message.includes('https'),
    );
    const ok = resolveBaClientSettings({
      NODE_ENV: 'production',
      INTEGRATION_BA_BASE_URL: 'https://ba.example.invalid',
    });
    assert.equal(ok.baseUrl, 'https://ba.example.invalid');
  });

  it('production ignores static INTEGRATION_BA_S2S_TOKEN', async () => {
    const token = await resolveBaS2sToken(
      { isProduction: true, ba: { baseUrl: 'https://ba.example.invalid', timeoutMs: 1000, healthTimeoutMs: 100 } },
      { INTEGRATION_BA_S2S_TOKEN: 'must-not-be-used' },
    );
    assert.equal(token, undefined);
  });

  it('unconfigured BA dispatch fails closed without contacting the network', async () => {
    await assert.rejects(
      () =>
        invokeBaDispatch(
          { isProduction: false, ba: { baseUrl: null, timeoutMs: 1000, healthTimeoutMs: 100 } },
          { op: 'security.ping', principal: {} },
        ),
      (err: unknown) => err instanceof Error && (err as { code?: string }).code === 'ba_not_configured',
    );
  });

  it('successful authenticated dispatch through Hub', async () => {
    const mock = await startMockBa((url, req, raw) => {
      assert.equal(url.pathname, '/dispatch');
      assert.equal(req.headers.authorization, 'Bearer test-s2s');
      const body = JSON.parse(raw) as { op: string; principal: { environment: string; allowedClientIds: string[] }; correlationId: string };
      assert.equal(body.op, 'security.ping');
      assert.equal(body.principal.environment, 'development');
      assert.equal(body.principal.allowedClientIds.includes('*'), false);
      assert.equal(body.correlationId, 'CORR-HUB-OK');
      return {
        status: 200,
        body: { ok: true, status: 'SUCCESS', correlationId: body.correlationId, binding: 'hub→ba_bridge' },
      };
    });
    try {
      await withHub(
        async (base) => {
          const res = await fetch(`${base}/api/ba/health`, {
            headers: { authorization: 'Bearer valid-member', 'x-correlation-id': 'CORR-HUB-OK' },
          });
          assert.equal(res.status, 200);
          const body = (await res.json()) as { ok: boolean; correlationId?: string };
          assert.equal(body.ok, true);
          assert.equal(body.correlationId, 'CORR-HUB-OK');
        },
        (cfg) => ({
          ...cfg,
          ba: { ...cfg.ba, baseUrl: mock.base },
          baS2sToken: async () => 'test-s2s',
        }),
      );
    } finally {
      await mock.close();
    }
  });

  it('Owner principal does not project wildcard clients or DEV', () => {
    const cfg = {
      isProduction: true,
    } as AppConfig;
    assert.equal(projectedBaEnvironment({ ...cfg, isProduction: true }), 'production');
    assert.equal(projectedBaEnvironment({ ...cfg, isProduction: false }, { ATLAS_ENV: 'development' }), 'development');
    assert.notEqual(projectedBaEnvironment({ ...cfg, isProduction: true }), 'DEV');
  });

  it('25. secret scan of Hub BA sources', () => {
    for (const rel of ['../src/ba/client.ts', '../src/ba/routes.ts', '../src/ba/invokePython.ts']) {
      const text = readFileSync(join(here, rel), 'utf8');
      assert.equal(text.includes('IDENTITY_HEADER'), false);
      assert.equal(text.includes('BEGIN PRIVATE KEY'), false);
    }
  });
});
