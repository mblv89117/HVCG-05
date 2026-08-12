import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCanonicalClientCode,
  parseClientCodeFromGroupDisplayName,
  clientGroupDisplayName,
} from '../src/entitlements/clientCode.ts';
import {
  ClientEntitlementResolver,
  sanitizeResolvedCodes,
  isEntraOid,
} from '../src/entitlements/resolver.ts';
import { parseApprovedClientGroups, resolveClientEntitlement } from '../src/config.ts';
import { createServer } from 'node:http';
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
import { isHubAdministrator, requirePrincipal } from '../src/middleware/auth.ts';

const GROUP_ACCG = '11111111-1111-1111-1111-111111111111';
const GROUP_LIEN = '22222222-2222-2222-2222-222222222222';
const GROUP_JUNK = '33333333-3333-3333-3333-333333333333';
const USER_OID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('canonical ClientCode validation', () => {
  it('accepts live-shaped codes and rejects aliases/UUIDs/wildcard', () => {
    assert.equal(isCanonicalClientCode('ACCG01'), true);
    assert.equal(isCanonicalClientCode('LIEN01'), true);
    assert.equal(isCanonicalClientCode('PDG01'), true);
    assert.equal(isCanonicalClientCode('client-a'), false);
    assert.equal(isCanonicalClientCode('acccg01'), false);
    assert.equal(isCanonicalClientCode('ACCG-01'), false);
    assert.equal(isCanonicalClientCode('*'), false);
    assert.equal(isCanonicalClientCode(''), false);
    assert.equal(isCanonicalClientCode(USER_OID), false);
  });

  it('parses only exact HVCG-Client-{ClientCode} names', () => {
    assert.equal(parseClientCodeFromGroupDisplayName('HVCG-Client-ACCG01'), 'ACCG01');
    assert.equal(parseClientCodeFromGroupDisplayName('HVCG-Client-acccg01'), null);
    assert.equal(parseClientCodeFromGroupDisplayName('HVCG-Client-ACCG-01'), null);
    assert.equal(parseClientCodeFromGroupDisplayName('HVCG-Role-Owner'), null);
    assert.equal(clientGroupDisplayName('ACCG01'), 'HVCG-Client-ACCG01');
    assert.equal(clientGroupDisplayName('bad'), null);
  });
});

describe('approved group map parsing', () => {
  it('keeps valid pairs and drops malformed/wildcard/unknown codes', () => {
    const map = parseApprovedClientGroups(
      `${GROUP_ACCG}:ACCG01,not-a-guid:LIEN01,${GROUP_LIEN}:lien01,${GROUP_JUNK}:*,${GROUP_LIEN}:LIEN01`,
    );
    assert.equal(map.get(GROUP_ACCG), 'ACCG01');
    assert.equal(map.get(GROUP_LIEN), 'LIEN01');
    assert.equal(map.has(GROUP_JUNK), false);
  });
});

describe('ClientEntitlementResolver', () => {
  const approved = new Map([
    [GROUP_ACCG, 'ACCG01'],
    [GROUP_LIEN, 'LIEN01'],
    [GROUP_JUNK, 'not-a-code'],
  ]);

  it('missing oid fails closed', async () => {
    const r = new ClientEntitlementResolver(approved, async () => [GROUP_ACCG], 120_000, 8);
    assert.deepEqual(await r.resolveAllowedClientIds(undefined), []);
    assert.deepEqual(await r.resolveAllowedClientIds('not-an-oid'), []);
    assert.equal(isEntraOid(USER_OID), true);
  });

  it('no membership → empty scope', async () => {
    const r = new ClientEntitlementResolver(approved, async () => [], 0, 8);
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), []);
  });

  it('one approved client group → exactly one ClientCode', async () => {
    const r = new ClientEntitlementResolver(approved, async () => [GROUP_ACCG], 0, 8);
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), ['ACCG01']);
  });

  it('multiple approved groups → exact list only', async () => {
    const r = new ClientEntitlementResolver(approved, async () => [GROUP_LIEN, GROUP_ACCG], 0, 8);
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), ['ACCG01', 'LIEN01']);
  });

  it('unrelated Entra groups and malformed codes are ignored', async () => {
    const r = new ClientEntitlementResolver(
      approved,
      async () => [GROUP_JUNK, '44444444-4444-4444-4444-444444444444'],
      0,
      8,
    );
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), []);
  });

  it('Graph failure and timeout fail closed', async () => {
    const fail = new ClientEntitlementResolver(approved, async () => 'failed', 120_000, 8);
    assert.deepEqual(await fail.resolveAllowedClientIds(USER_OID), []);
    const boom = new ClientEntitlementResolver(
      approved,
      async () => {
        throw new Error('timeout');
      },
      120_000,
      8,
    );
    assert.deepEqual(await boom.resolveAllowedClientIds(USER_OID), []);
  });

  it('never returns wildcard', () => {
    assert.deepEqual(sanitizeResolvedCodes(['ACCG01', '*', 'client-a', 1]), ['ACCG01']);
  });

  it('cache hit returns previously resolved exact scope', async () => {
    let calls = 0;
    const r = new ClientEntitlementResolver(
      approved,
      async () => {
        calls += 1;
        return [GROUP_ACCG];
      },
      60_000,
      8,
      () => 1_000,
    );
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), ['ACCG01']);
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), ['ACCG01']);
    assert.equal(calls, 1);
  });

  it('expired cache requires fresh resolution', async () => {
    let now = 1_000;
    let calls = 0;
    const r = new ClientEntitlementResolver(
      approved,
      async () => {
        calls += 1;
        return calls === 1 ? [GROUP_ACCG] : [GROUP_LIEN];
      },
      50,
      8,
      () => now,
    );
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), ['ACCG01']);
    now = 1_100;
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), ['LIEN01']);
    assert.equal(calls, 2);
  });

  it('failed refresh does not keep stale authorization', async () => {
    let now = 1_000;
    let fail = false;
    const r = new ClientEntitlementResolver(
      approved,
      async () => {
        if (fail) return 'failed';
        return [GROUP_ACCG];
      },
      50,
      8,
      () => now,
    );
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), ['ACCG01']);
    fail = true;
    now = 1_100;
    assert.deepEqual(await r.resolveAllowedClientIds(USER_OID), []);
  });
});

describe('Hub principal client scope from resolver', () => {
  async function syntheticVerify(token: string): Promise<Record<string, unknown>> {
    if (token === 'admin') return { oid: USER_OID, roles: ['Administrator'], scp: 'access_as_user' };
    if (token === 'owner') return { oid: USER_OID, roles: ['HVCG Owner'], scp: 'access_as_user' };
    if (token === 'member') return { oid: USER_OID, roles: ['HVCG Team Member'], scp: 'access_as_user' };
    if (token === 'sub-only') return { sub: 'subject-1', roles: ['HVCG Team Member'], scp: 'access_as_user' };
    throw Object.assign(new Error('invalid'), { status: 401, code: 'invalid_token' });
  }

  it('Administrator and HVCG Owner do not gain wildcard client scope', async () => {
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.INTEGRATION_HOST = '127.0.0.1';
    process.env.NODE_ENV = 'development';
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    for (const token of ['admin', 'owner']) {
      const cfg: AppConfig = {
        ...loadConfig(),
        verifyAccessToken: syntheticVerify,
        resolveAllowedClientIds: async () => ['ACCG01'],
      };
      const { requirePrincipal: reqP } = await import('../src/middleware/auth.ts');
      const principal = await reqP(
        { method: 'GET', url: '/', headers: { authorization: `Bearer ${token}` }, async *[Symbol.asyncIterator]() {} } as never,
        cfg,
      );
      assert.equal(principal.allowedClientIds.includes('*'), false);
      assert.deepEqual(principal.allowedClientIds, ['ACCG01']);
      if (token === 'admin') assert.equal(isHubAdministrator(principal), true);
      else assert.equal(isHubAdministrator(principal), false);
    }
  });

  it('missing oid fails closed for client entitlement', async () => {
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    const cfg: AppConfig = {
      ...loadConfig(),
      verifyAccessToken: syntheticVerify,
      resolveAllowedClientIds: async (oid) => (oid ? ['ACCG01'] : []),
    };
    const principal = await requirePrincipal(
      { method: 'GET', url: '/', headers: { authorization: 'Bearer sub-only' }, async *[Symbol.asyncIterator]() {} } as never,
      cfg,
    );
    assert.equal(principal.userId, 'subject-1');
    assert.deepEqual(principal.allowedClientIds, []);
  });
});

describe('Client 360 identifiers are not ClientCodes', () => {
  it('random UUID client-360 path stays unscoped rather than matching Entra groups', async () => {
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
    process.env.INTEGRATION_HOST = '127.0.0.1';
    process.env.NODE_ENV = 'development';
    process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
    process.env.INTEGRATION_PM_BACKEND = 'unavailable';
    delete process.env.INTEGRATION_REQUIRE_AUTH;
    delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
    const dir = mkdtempSync(join(tmpdir(), 'atlas-c360-scope-'));
    const cfg: AppConfig = {
      ...loadConfig(),
      verifyAccessToken: async () => ({ oid: USER_OID, roles: ['HVCG Team Member'], scp: 'access_as_user' }),
      resolveAllowedClientIds: async () => ['ACCG01'],
    };
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const pm = new PmRepository(dir);
    const app = buildRegistry(cfg, repo);
    const localAi = createLocalAiAdapter({ env: { LOCAL_AI_ENABLED: undefined }, secretsFileEnv: {} });
    const server = createServer((req, res) => {
      handleRequest({ cfg, repo, app, pm, localAi }, req, res).catch((err) => {
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: String(err) }));
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    try {
      const uuid = 'f761725e-5130-4a8c-b7a6-9047c05873db';
      const res = await fetch(`http://127.0.0.1:${port}/api/client360/${uuid}`, {
        headers: { authorization: 'Bearer t' },
      });
      assert.notEqual(res.status, 401);
      const body = (await res.json()) as { error?: string };
      assert.equal(res.status === 404 || body.error === 'not_found' || res.status === 200, true);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('entitlement config defaults', () => {
  it('is enabled by default with 120s cache and empty approved groups', () => {
    const e = resolveClientEntitlement({});
    assert.equal(e.enabled, true);
    assert.equal(e.cacheTtlMs, 120_000);
    assert.equal(e.approvedGroups.size, 0);
    assert.equal(e.groupPrefix, 'HVCG-Client-');
  });
});
