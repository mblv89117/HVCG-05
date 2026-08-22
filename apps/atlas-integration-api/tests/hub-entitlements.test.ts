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
  it('keeps a valid 1:1 map', () => {
    const map = parseApprovedClientGroups(`${GROUP_ACCG}:ACCG01,${GROUP_LIEN}:LIEN01`);
    assert.equal(map.get(GROUP_ACCG), 'ACCG01');
    assert.equal(map.get(GROUP_LIEN), 'LIEN01');
    assert.equal(map.size, 2);
  });

  it('malformed GUID, malformed ClientCode, or wildcard fail the entire map', () => {
    assert.equal(parseApprovedClientGroups(`${GROUP_ACCG}:ACCG01,not-a-guid:LIEN01`).size, 0);
    assert.equal(parseApprovedClientGroups(`${GROUP_ACCG}:ACCG01,${GROUP_LIEN}:lien01`).size, 0);
    assert.equal(parseApprovedClientGroups(`${GROUP_ACCG}:ACCG01,${GROUP_JUNK}:*`).size, 0);
  });

  it('duplicate group IDs or duplicate ClientCodes fail closed', () => {
    assert.equal(
      parseApprovedClientGroups(`${GROUP_ACCG}:ACCG01,${GROUP_ACCG}:LIEN01`).size,
      0,
    );
    assert.equal(
      parseApprovedClientGroups(`${GROUP_ACCG}:ACCG01,${GROUP_LIEN}:ACCG01`).size,
      0,
    );
  });

  it('empty input is a valid empty map', () => {
    assert.equal(parseApprovedClientGroups(undefined).size, 0);
    assert.equal(parseApprovedClientGroups('').size, 0);
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
  it('random UUID client-360 path is forbidden without a trusted mapping', async () => {
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
      const body = (await res.json()) as { error?: string; code?: string; client?: unknown };
      assert.equal(res.status, 403);
      assert.equal(body.error, 'forbidden');
      assert.equal(body.code, 'client_identifier_unmapped');
      assert.equal(body.client, undefined);
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

describe('Graph checkMemberGroups uses directoryObjects (user + SP oid)', () => {
  const USER_OID_GRAPH = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const SP_OID_GRAPH = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const TENANT = '11111111-1111-1111-1111-111111111111';
  const origFetch = globalThis.fetch;

  function graphCfg(overrides?: { tenantId?: string; clientSecret?: string }): AppConfig {
    return {
      microsoft: {
        tenantId: overrides?.tenantId ?? TENANT,
        clientId: '22222222-2222-2222-2222-222222222222',
        clientSecret: overrides?.clientSecret ?? 'test-graph-client-secret',
        redirectUri: 'http://127.0.0.1/cb',
      },
      clientEntitlement: {
        enabled: true,
        groupPrefix: 'HVCG-Client-',
        approvedGroups: new Map(),
        cacheTtlMs: 0,
        cacheMaxEntries: 8,
        graphTimeoutMs: 3_000,
      },
    } as AppConfig;
  }

  function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }

  async function withMockedFetch(
    handler: typeof fetch,
    fn: () => Promise<void>,
  ): Promise<void> {
    const { resetGraphTokenCacheForTests } = await import('../src/entitlements/graphMembership.ts');
    resetGraphTokenCacheForTests();
    globalThis.fetch = handler;
    try {
      await fn();
    } finally {
      globalThis.fetch = origFetch;
      resetGraphTokenCacheForTests();
    }
  }

  it('POSTs /directoryObjects/{userOid}/checkMemberGroups and returns member group ids', async () => {
    const { checkMemberGroups, checkMemberGroupsUrl, GRAPH_CHECK_MEMBER_GROUPS_BASE } =
      await import('../src/entitlements/graphMembership.ts');
    assert.equal(GRAPH_CHECK_MEMBER_GROUPS_BASE, 'https://graph.microsoft.com/v1.0/directoryObjects');
    assert.equal(
      checkMemberGroupsUrl(USER_OID_GRAPH),
      `https://graph.microsoft.com/v1.0/directoryObjects/${USER_OID_GRAPH}/checkMemberGroups`,
    );
    const seen: { url: string; method: string; usersPath: boolean }[] = [];
    await withMockedFetch(async (input, init) => {
      const url = String(input);
      seen.push({
        url,
        method: String(init?.method || 'GET'),
        usersPath: url.includes('/v1.0/users/'),
      });
      if (url.includes('/oauth2/v2.0/token')) {
        return jsonResponse(200, { access_token: 'graph-test-token', expires_in: 3600 });
      }
      if (url === checkMemberGroupsUrl(USER_OID_GRAPH)) {
        return jsonResponse(200, { value: [GROUP_ACCG] });
      }
      return jsonResponse(500, { error: 'unexpected' });
    }, async () => {
      const result = await checkMemberGroups(graphCfg(), USER_OID_GRAPH, [GROUP_ACCG, GROUP_LIEN]);
      assert.deepEqual(result, [GROUP_ACCG]);
    });
    assert.equal(seen.some((s) => s.usersPath), false);
    assert.equal(
      seen.some((s) => s.method === 'POST' && s.url === checkMemberGroupsUrl(USER_OID_GRAPH)),
      true,
    );
  });

  it('POSTs /directoryObjects/{spOid}/checkMemberGroups for an Application SP oid', async () => {
    const { checkMemberGroups, checkMemberGroupsUrl } = await import(
      '../src/entitlements/graphMembership.ts'
    );
    const seen: string[] = [];
    await withMockedFetch(async (input, init) => {
      const url = String(input);
      seen.push(url);
      if (url.includes('/oauth2/v2.0/token')) {
        return jsonResponse(200, { access_token: 'graph-test-token', expires_in: 3600 });
      }
      if (url === checkMemberGroupsUrl(SP_OID_GRAPH) && init?.method === 'POST') {
        return jsonResponse(200, { value: [GROUP_LIEN] });
      }
      return jsonResponse(404, { error: { code: 'Request_ResourceNotFound' } });
    }, async () => {
      const result = await checkMemberGroups(graphCfg(), SP_OID_GRAPH, [GROUP_ACCG, GROUP_LIEN]);
      assert.deepEqual(result, [GROUP_LIEN]);
    });
    assert.equal(seen.some((u) => u.includes('/v1.0/users/')), false);
    assert.equal(seen.includes(checkMemberGroupsUrl(SP_OID_GRAPH)), true);
  });

  it('Graph HTTP error fail-closed returns failed', async () => {
    const { checkMemberGroups, checkMemberGroupsUrl } = await import(
      '../src/entitlements/graphMembership.ts'
    );
    await withMockedFetch(async (input) => {
      const url = String(input);
      if (url.includes('/oauth2/v2.0/token')) {
        return jsonResponse(200, { access_token: 'graph-test-token', expires_in: 3600 });
      }
      if (url === checkMemberGroupsUrl(USER_OID_GRAPH)) {
        return jsonResponse(403, { error: { code: 'Authorization_RequestDenied' } });
      }
      return jsonResponse(500, {});
    }, async () => {
      assert.equal(await checkMemberGroups(graphCfg(), USER_OID_GRAPH, [GROUP_ACCG]), 'failed');
    });
  });

  it('non-array Graph value fail-closed returns failed', async () => {
    const { checkMemberGroups, checkMemberGroupsUrl } = await import(
      '../src/entitlements/graphMembership.ts'
    );
    await withMockedFetch(async (input) => {
      const url = String(input);
      if (url.includes('/oauth2/v2.0/token')) {
        return jsonResponse(200, { access_token: 'graph-test-token', expires_in: 3600 });
      }
      if (url === checkMemberGroupsUrl(SP_OID_GRAPH)) {
        return jsonResponse(200, { value: { not: 'an-array' } });
      }
      return jsonResponse(500, {});
    }, async () => {
      assert.equal(await checkMemberGroups(graphCfg(), SP_OID_GRAPH, [GROUP_ACCG]), 'failed');
    });
  });

  it('missing Graph token fail-closed returns failed without calling users path', async () => {
    const { checkMemberGroups } = await import('../src/entitlements/graphMembership.ts');
    const seen: string[] = [];
    await withMockedFetch(async (input) => {
      seen.push(String(input));
      return jsonResponse(500, {});
    }, async () => {
      assert.equal(
        await checkMemberGroups(graphCfg({ tenantId: 'common' }), USER_OID_GRAPH, [GROUP_ACCG]),
        'failed',
      );
      assert.equal(
        await checkMemberGroups(graphCfg({ clientSecret: '' }), SP_OID_GRAPH, [GROUP_ACCG]),
        'failed',
      );
    });
    assert.equal(seen.length, 0);
  });

  it('Graph fetch throw fail-closed returns failed', async () => {
    const { checkMemberGroups } = await import('../src/entitlements/graphMembership.ts');
    await withMockedFetch(async (input) => {
      const url = String(input);
      if (url.includes('/oauth2/v2.0/token')) {
        return jsonResponse(200, { access_token: 'graph-test-token', expires_in: 3600 });
      }
      throw new Error('network');
    }, async () => {
      assert.equal(await checkMemberGroups(graphCfg(), USER_OID_GRAPH, [GROUP_ACCG]), 'failed');
    });
  });
});
