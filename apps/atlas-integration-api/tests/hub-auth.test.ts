import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { PmRepository } from '../src/pm/repository.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import {
  INSECURE_DEV_PRINCIPAL,
  assertClientAccess,
  clientIdsFromVerifiedPayload,
  isHubAdministrator,
  normalizeHubRole,
  principalFromVerifiedPayload,
  requirePrincipal,
  rolesFromVerifiedPayload,
} from '../src/middleware/auth.ts';
import type { JWTPayload } from 'jose';

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
  if (token === 'valid-admin') {
    return { oid: 'admin-1', roles: ['Administrator'], scp: 'access_as_user' };
  }
  if (token === 'valid-owner') {
    return { oid: 'owner-1', roles: ['HVCG Owner'], scp: 'access_as_user' };
  }
  if (token === 'valid-scoped') {
    return {
      oid: 'scoped-1',
      roles: ['HVCG Team Member'],
      extension_AtlasClientIds: ['client-a'],
      scp: 'access_as_user',
    };
  }
  if (token === 'valid-no-roles') {
    return { oid: 'plain-1', scp: 'access_as_user' };
  }
  if (token === 'valid-unknown-role') {
    return { oid: 'unk-1', roles: ['Superuser', 'not-a-role'], scp: 'access_as_user' };
  }
  if (token === 'valid-wildcard-claim') {
    return { oid: 'wild-1', atlas_client_ids: '*', scp: 'access_as_user' };
  }
  invalidToken();
}

function mockReq(headers: Record<string, string>): IncomingMessage {
  return {
    method: 'GET',
    url: '/',
    headers,
    async *[Symbol.asyncIterator]() {},
  } as unknown as IncomingMessage;
}

describe('Hub role mapping', () => {
  it('maps Admin to Administrator and keeps HVCG Owner distinct', () => {
    assert.equal(normalizeHubRole('Admin'), 'Administrator');
    assert.equal(normalizeHubRole('administrator'), 'Administrator');
    assert.equal(normalizeHubRole('HVCG Owner'), 'HVCG Owner');
    assert.equal(normalizeHubRole('owner'), 'HVCG Owner');
    assert.equal(normalizeHubRole('Superuser'), null);
    assert.equal(normalizeHubRole(''), null);
  });
});

describe('verified JWT principal construction', () => {
  it('uses oid as user id and token roles only', () => {
    const p = principalFromVerifiedPayload({
      oid: 'oid-1',
      preferred_username: 'a@example.com',
      roles: ['HVCG Team Member'],
    } as JWTPayload);
    assert.equal(p.userId, 'oid-1');
    assert.equal(p.email, 'a@example.com');
    assert.deepEqual(p.roles, ['HVCG Team Member']);
    assert.deepEqual(p.allowedClientIds, []);
    assert.equal(isHubAdministrator(p), false);
  });

  it('missing roles do not become Admin or Owner', () => {
    const roles = rolesFromVerifiedPayload({ oid: 'x' } as JWTPayload);
    assert.deepEqual(roles, []);
    const p = principalFromVerifiedPayload({ oid: 'x' } as JWTPayload);
    assert.equal(isHubAdministrator(p), false);
    assert.equal(p.roles.includes('HVCG Owner'), false);
  });

  it('unknown role claims are ignored', () => {
    assert.deepEqual(rolesFromVerifiedPayload({ roles: ['Superuser', 'Administrator'] } as JWTPayload), [
      'Administrator',
    ]);
  });

  it('missing client scope does not become wildcard', () => {
    assert.deepEqual(clientIdsFromVerifiedPayload({ oid: 'x' } as JWTPayload), []);
  });

  it('wildcard client claim is rejected', () => {
    assert.deepEqual(clientIdsFromVerifiedPayload({ atlas_client_ids: '*' } as JWTPayload), []);
  });

  it('JWT client claims do not become allowedClientIds', () => {
    const p = principalFromVerifiedPayload({
      oid: 'oid-1',
      extension_AtlasClientIds: ['ACCG01'],
      atlas_client_ids: '*',
      client_ids: 'LIEN01',
    } as JWTPayload);
    assert.deepEqual(p.allowedClientIds, []);
  });
});

describe('header spoofing cannot elevate a JWT principal', () => {
  it('x-atlas-roles does not grant Administrator', async () => {
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.INTEGRATION_HOST = '127.0.0.1';
    process.env.NODE_ENV = 'development';
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    const cfg: AppConfig = { ...loadConfig(), verifyAccessToken: syntheticVerify };
    assert.equal(cfg.requireAuth, true);
    const principal = await requirePrincipal(
      mockReq({
        authorization: 'Bearer valid-member',
        'x-atlas-roles': 'Administrator',
        'x-atlas-client-ids': '*',
      }),
      cfg,
    );
    assert.deepEqual(principal.roles, ['HVCG Team Member']);
    assert.equal(isHubAdministrator(principal), false);
    assert.equal(principal.allowedClientIds.includes('*'), false);
    assert.deepEqual(principal.allowedClientIds, []);
  });

  it('x-atlas-client-ids cannot broaden server-resolved scope', async () => {
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    const cfg: AppConfig = {
      ...loadConfig(),
      verifyAccessToken: syntheticVerify,
      resolveAllowedClientIds: async (oid) => (oid === 'scoped-1' ? ['ACCG01'] : []),
    };
    const principal = await requirePrincipal(
      mockReq({
        authorization: 'Bearer valid-scoped',
        'x-atlas-client-ids': '*,LIEN01',
      }),
      cfg,
    );
    assert.deepEqual(principal.allowedClientIds, ['ACCG01']);
  });
});

describe('client scope fail-closed', () => {
  it('empty scope denies a canonical client', () => {
    const p = principalFromVerifiedPayload({ oid: 'x' } as JWTPayload);
    assert.throws(() => assertClientAccess(p, 'ACCG01'), (err: unknown) => (err as { status?: number }).status === 403);
  });

  it('server-resolved canonical client id is allowed', async () => {
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.INTEGRATION_HOST = '127.0.0.1';
    process.env.NODE_ENV = 'development';
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    const cfg: AppConfig = {
      ...loadConfig(),
      verifyAccessToken: syntheticVerify,
      resolveAllowedClientIds: async (oid) => (oid === 'scoped-1' ? ['ACCG01'] : []),
    };
    const principal = await requirePrincipal(mockReq({ authorization: 'Bearer valid-scoped' }), cfg);
    assert.deepEqual(principal.allowedClientIds, ['ACCG01']);
    assertClientAccess(principal, 'ACCG01');
  });

  it('JWT client claims cannot satisfy assertClientAccess', () => {
    const p = principalFromVerifiedPayload({
      oid: 'x',
      extension_AtlasClientIds: ['ACCG01'],
    } as JWTPayload);
    assert.throws(() => assertClientAccess(p, 'ACCG01'), (err: unknown) => (err as { status?: number }).status === 403);
  });
});

describe('insecure development principal', () => {
  it('is Administrator with wildcard only as the documented loopback bypass identity', () => {
    assert.equal(INSECURE_DEV_PRINCIPAL.userId, 'dev-user');
    assert.deepEqual(INSECURE_DEV_PRINCIPAL.roles, ['Administrator']);
    assert.deepEqual(INSECURE_DEV_PRINCIPAL.allowedClientIds, ['*']);
  });
});

async function withAuthOnHub(
  fn: (base: string) => Promise<void>,
  opts?: { resolveAllowedClientIds?: AppConfig['resolveAllowedClientIds'] },
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-hub-auth-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
    INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_PM_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: syntheticVerify,
    resolveAllowedClientIds: opts?.resolveAllowedClientIds,
  };
  assert.equal(cfg.requireAuth, true);
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
  }
}

describe('authentication route matrix', () => {
  it('public health remains public and reports authRequired', async () => {
    await withAuthOnHub(async (base) => {
      const res = await fetch(`${base}/health`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as { ok: boolean; authRequired: boolean; insecureDevAuth: boolean };
      assert.equal(body.ok, true);
      assert.equal(body.authRequired, true);
      assert.equal(body.insecureDevAuth, false);
    });
  });

  it('OAuth callback remains reachable without bearer', async () => {
    await withAuthOnHub(async (base) => {
      const res = await fetch(`${base}/api/oauth/microsoft/callback`);
      assert.equal(res.status, 400);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, 'code and state required');
    });
  });

  it('GitHub webhook is not bearer-gated', async () => {
    await withAuthOnHub(async (base) => {
      const res = await fetch(`${base}/api/webhooks/github`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'ping' }),
      });
      assert.notEqual(res.status, 401);
    });
  });

  it('protected routes reject missing bearer with 401', async () => {
    await withAuthOnHub(async (base) => {
      const paths = [
        '/api/pm/projects',
        '/api/ba/health',
        '/api/local-ai/flags',
        '/api/connections',
        '/api/admin/dashboard',
        '/api/integrations/registry',
      ];
      for (const path of paths) {
        const res = await fetch(`${base}${path}`);
        assert.equal(res.status, 401, path);
      }
    });
  });

  it('protected routes reject invalid bearer with 401', async () => {
    await withAuthOnHub(async (base) => {
      const res = await fetch(`${base}/api/pm/projects`, {
        headers: { authorization: 'Bearer not-a-token' },
      });
      assert.equal(res.status, 401);
    });
  });

  it('valid synthetic bearer authenticates PM and Local AI reads', async () => {
    await withAuthOnHub(async (base) => {
      const pm = await fetch(`${base}/api/pm/projects`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(pm.status, 200);
      const flags = await fetch(`${base}/api/local-ai/flags`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(flags.status, 200);
    });
  });
});

describe('admin authorization uses trusted roles', () => {
  it('non-admin token is 403 even with spoofed admin header', async () => {
    await withAuthOnHub(async (base) => {
      const res = await fetch(`${base}/api/admin/dashboard`, {
        headers: {
          authorization: 'Bearer valid-member',
          'x-atlas-roles': 'Administrator',
        },
      });
      assert.equal(res.status, 403);
    });
  });

  it('HVCG Owner is not Administrator', async () => {
    await withAuthOnHub(async (base) => {
      const res = await fetch(`${base}/api/admin/dashboard`, {
        headers: { authorization: 'Bearer valid-owner' },
      });
      assert.equal(res.status, 403);
    });
  });

  it('verified Administrator may access admin dashboard', async () => {
    await withAuthOnHub(async (base) => {
      const res = await fetch(`${base}/api/admin/dashboard`, {
        headers: { authorization: 'Bearer valid-admin' },
      });
      assert.equal(res.status, 200);
    });
  });
});

describe('auth-on BA client scope', () => {
  it('missing trusted client scope does not become wildcard', async () => {
    await withAuthOnHub(async (base) => {
      const res = await fetch(`${base}/api/ba/leads/list`, {
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-member',
          'content-type': 'application/json',
          'x-atlas-client-ids': '*',
        },
        body: JSON.stringify({ clientId: 'ACCG01' }),
      });
      assert.equal(res.status, 403);
    });
  });

  it('non-canonical client alias is denied even when a ClientCode is entitled', async () => {
    await withAuthOnHub(
      async (base) => {
        const res = await fetch(`${base}/api/ba/documents/access`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer valid-scoped',
            'content-type': 'application/json',
            'x-atlas-client-ids': '*',
          },
          body: JSON.stringify({ clientId: 'client-a' }),
        });
        assert.equal(res.status, 403);
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });

  it('unauthorized canonical ClientCode is 403', async () => {
    await withAuthOnHub(
      async (base) => {
        const res = await fetch(`${base}/api/ba/documents/access`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer valid-scoped',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ clientId: 'LIEN01' }),
        });
        assert.equal(res.status, 403);
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });
});
