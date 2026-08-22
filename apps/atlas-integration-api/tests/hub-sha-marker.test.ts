import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { normalizeHubCommit, resolveHubBuild, resolveHubCommit } from '../src/http/hubCommit.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { PmRepository } from '../src/pm/repository.ts';
import { IntegrationRepository } from '../src/store/repository.ts';

const KNOWN_SHA = '9e5d10a20639bbeb659fbacd6362cd9f13adb08b';

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

async function withMarkerHub(
  fn: (base: string) => Promise<void>,
  opts?: { commitEnv?: string },
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-hub-sha-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
    INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    COMMIT: process.env.ATLAS_HUB_COMMIT,
    GIT: process.env.HUB_GIT_SHA,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_PM_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  if (opts?.commitEnv) process.env.ATLAS_HUB_COMMIT = opts.commitEnv;
  else delete process.env.ATLAS_HUB_COMMIT;
  delete process.env.HUB_GIT_SHA;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: syntheticVerify,
  };
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
    await fn(`http://127.0.0.1:${port}`);
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
    if (prev.COMMIT === undefined) delete process.env.ATLAS_HUB_COMMIT;
    else process.env.ATLAS_HUB_COMMIT = prev.COMMIT;
    if (prev.GIT === undefined) delete process.env.HUB_GIT_SHA;
    else process.env.HUB_GIT_SHA = prev.GIT;
  }
}

describe('hub commit resolver', () => {
  it('accepts only hex SHAs', () => {
    assert.equal(normalizeHubCommit(KNOWN_SHA), KNOWN_SHA);
    assert.equal(normalizeHubCommit('9e5d10a'), '9e5d10a');
    assert.equal(normalizeHubCommit('not-a-sha'), null);
    assert.equal(normalizeHubCommit(''), null);
  });

  it('reads ATLAS_HUB_COMMIT.txt from cwd', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-hub-sha-unit-'));
    writeFileSync(join(dir, 'ATLAS_HUB_COMMIT.txt'), `${KNOWN_SHA}\n`, 'utf8');
    assert.equal(resolveHubCommit(dir), KNOWN_SHA);
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads gitSha from hub-build.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-hub-build-unit-'));
    writeFileSync(
      join(dir, 'hub-build.json'),
      JSON.stringify({ gitSha: KNOWN_SHA, branch: 'cursor/atlas-security-patch-od005' }),
      'utf8',
    );
    assert.equal(resolveHubCommit(dir), KNOWN_SHA);
    const build = resolveHubBuild(dir);
    assert.equal(build?.gitSha, KNOWN_SHA);
    assert.equal(build?.source, 'file');
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('public Hub SHA marker', { concurrency: 1 }, () => {
  it('GET /ATLAS_HUB_COMMIT.txt and /health.commit return the deployed SHA', async () => {
    await withMarkerHub(
      async (base) => {
        const txt = await fetch(`${base}/ATLAS_HUB_COMMIT.txt`);
        assert.equal(txt.status, 200);
        assert.match(txt.headers.get('content-type') || '', /text\/plain/);
        assert.equal((await txt.text()).trim(), KNOWN_SHA);

        const health = await fetch(`${base}/health`);
        assert.equal(health.status, 200);
        const body = (await health.json()) as { ok: boolean; commit: string | null; authRequired: boolean };
        assert.equal(body.ok, true);
        assert.equal(body.commit, KNOWN_SHA);
        assert.equal(body.authRequired, true);

        const build = await fetch(`${base}/hub-build.json`);
        assert.equal(build.status, 200);
        const marker = (await build.json()) as { gitSha: string; source: string };
        assert.equal(marker.gitSha, KNOWN_SHA);
        assert.equal(marker.source, 'runtime');
      },
      { commitEnv: KNOWN_SHA },
    );
  });

  it('env ATLAS_HUB_COMMIT is served when no file is present', async () => {
    await withMarkerHub(
      async (base) => {
        const txt = await fetch(`${base}/ATLAS_HUB_COMMIT.txt`);
        assert.equal(txt.status, 200);
        assert.equal((await txt.text()).trim(), KNOWN_SHA);
      },
      { commitEnv: KNOWN_SHA },
    );
  });

  it('unknown GET still 405; missing marker is 404', async () => {
    await withMarkerHub(async (base) => {
      const missing = await fetch(`${base}/ATLAS_HUB_COMMIT.txt`);
      assert.equal(missing.status, 404);
      const unknown = await fetch(`${base}/not-a-public-marker`);
      assert.equal(unknown.status, 405);
    });
  });

  it('fail-closed PM routes stay 401 after the public marker is added', async () => {
    await withMarkerHub(
      async (base) => {
        for (const path of ['/api/pm/opportunities', '/api/pm/search', '/api/pm/leads', '/api/pm/projects']) {
          const res = await fetch(`${base}${path}`);
          assert.equal(res.status, 401, path);
        }
      },
      { commitEnv: KNOWN_SHA },
    );
  });
});
