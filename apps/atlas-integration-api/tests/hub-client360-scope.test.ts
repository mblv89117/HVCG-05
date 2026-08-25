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
import { PmRepository } from '../src/pm/repository.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import type { Client360Candidate } from '../src/store/types.ts';
import {
  CLIENT360_UNMAPPED_CODE,
  resolveClient360ClientCode,
  trustedClientCodeOrNull,
} from '../src/client360/access.ts';

const CLIENT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001';
const CLIENT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002';
const SECRET_A = 'SecretClientAlpha';
const SECRET_B = 'SecretClientBravo';

function emptyAssociations(): Client360Candidate['associations'] {
  return {
    emails: [],
    conversations: [],
    attachments: [],
    documents: [],
    meetings: [],
    notes: [],
    projects: [],
    invoices: [],
    proposals: [],
    fundingRequests: [],
    agreements: [],
    deliverables: [],
  };
}

function seedCandidate(id: string, displayName: string): Client360Candidate {
  return {
    id,
    displayName,
    lifecycle: 'active',
    matchKeys: [`email:${id}@example.test`],
    emails: [`${id}@example.test`],
    domains: ['example.test'],
    phones: [],
    contacts: [],
    sourceRefs: [],
    associations: emptyAssociations(),
    timeline: [],
    completenessScore: 40,
    missingInformation: [],
    recommendedNextActions: [],
    confidence: 'high',
    duplicateCandidateIds: [],
    connectionIds: [],
    businessEntities: ['HVCG'],
    updatedAt: new Date().toISOString(),
  };
}

async function syntheticVerify(token: string): Promise<Record<string, unknown>> {
  if (token === 'valid-member') {
    return { oid: '11111111-1111-1111-1111-111111111001', roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  if (token === 'valid-admin') {
    return { oid: '11111111-1111-1111-1111-111111111002', roles: ['Administrator'], scp: 'access_as_user' };
  }
  if (token === 'valid-owner') {
    return { oid: '11111111-1111-1111-1111-111111111003', roles: ['HVCG Owner'], scp: 'access_as_user' };
  }
  const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
  err.status = 401;
  err.code = 'invalid_token';
  throw err;
}

function assertUnmapped(status: number, body: Record<string, unknown>, raw: string) {
  assert.equal(status, 403);
  assert.equal(body.error, 'forbidden');
  assert.equal(body.code, CLIENT360_UNMAPPED_CODE);
  assert.equal(body.client, undefined);
  assert.equal(body.candidates, undefined);
  assert.equal(body.dashboard, undefined);
  assert.equal(body.documents, undefined);
  assert.equal(raw.includes(SECRET_A), false);
  assert.equal(raw.includes(SECRET_B), false);
}

async function withHub(
  fn: (base: string) => Promise<void>,
  opts?: { resolveAllowedClientIds?: AppConfig['resolveAllowedClientIds'] },
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-c360-idor-'));
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
  process.env.INTEGRATION_PM_BACKEND = 'unavailable';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: syntheticVerify,
    resolveAllowedClientIds: opts?.resolveAllowedClientIds,
  };
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  repo.saveClient360([seedCandidate(CLIENT_A, SECRET_A), seedCandidate(CLIENT_B, SECRET_B)]);
  const pm = new PmRepository(dir);
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

describe('Client 360 mapping contract', () => {
  it('does not map a Client 360 UUID to a ClientCode', () => {
    assert.equal(resolveClient360ClientCode(CLIENT_A), null);
    assert.equal(resolveClient360ClientCode('ACCG01'), null);
  });

  it('missing or malformed ClientCode values fail closed', () => {
    assert.equal(trustedClientCodeOrNull(undefined), null);
    assert.equal(trustedClientCodeOrNull(''), null);
    assert.equal(trustedClientCodeOrNull('*'), null);
    assert.equal(trustedClientCodeOrNull('client-a'), null);
    assert.equal(trustedClientCodeOrNull(CLIENT_A), null);
    assert.equal(trustedClientCodeOrNull('ACCG01'), 'ACCG01');
  });
});

describe('Client 360 authentication', () => {
  it('no bearer → 401', async () => {
    await withHub(async (base) => {
      const res = await fetch(`${base}/api/client360/${CLIENT_A}`);
      assert.equal(res.status, 401);
    });
  });

  it('invalid bearer → 401', async () => {
    await withHub(async (base) => {
      const res = await fetch(`${base}/api/client360/${CLIENT_A}`, {
        headers: { authorization: 'Bearer nope' },
      });
      assert.equal(res.status, 401);
    });
  });
});

describe('Client 360 fail-closed without trusted mapping', () => {
  it('entitled user cannot access Client A or Client B by UUID', async () => {
    await withHub(
      async (base) => {
        for (const id of [CLIENT_A, CLIENT_B]) {
          const res = await fetch(`${base}/api/client360/${id}`, {
            headers: { authorization: 'Bearer valid-member' },
          });
          const raw = await res.text();
          assertUnmapped(res.status, JSON.parse(raw) as Record<string, unknown>, raw);
        }
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });

  it('empty membership cannot access Client A', async () => {
    await withHub(
      async (base) => {
        const res = await fetch(`${base}/api/client360/${CLIENT_A}`, {
          headers: { authorization: 'Bearer valid-member' },
        });
        const raw = await res.text();
        assertUnmapped(res.status, JSON.parse(raw) as Record<string, unknown>, raw);
      },
      { resolveAllowedClientIds: async () => [] },
    );
  });

  it('Administrator without Client A entitlement does not gain access', async () => {
    await withHub(
      async (base) => {
        const res = await fetch(`${base}/api/client360/${CLIENT_A}`, {
          headers: { authorization: 'Bearer valid-admin' },
        });
        const raw = await res.text();
        assertUnmapped(res.status, JSON.parse(raw) as Record<string, unknown>, raw);
      },
      { resolveAllowedClientIds: async () => [] },
    );
  });

  it('HVCG Owner without Client A entitlement does not gain access', async () => {
    await withHub(
      async (base) => {
        const res = await fetch(`${base}/api/client360/${CLIENT_A}`, {
          headers: { authorization: 'Bearer valid-owner' },
        });
        const raw = await res.text();
        assertUnmapped(res.status, JSON.parse(raw) as Record<string, unknown>, raw);
      },
      { resolveAllowedClientIds: async () => [] },
    );
  });

  it('unknown UUID is denied the same way as a known UUID', async () => {
    await withHub(
      async (base) => {
        const res = await fetch(`${base}/api/client360/ffffffff-ffff-ffff-ffff-ffffffffffff`, {
          headers: { authorization: 'Bearer valid-member' },
        });
        const raw = await res.text();
        assertUnmapped(res.status, JSON.parse(raw) as Record<string, unknown>, raw);
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });
});

describe('Client 360 spoofing cannot create a mapping', () => {
  it('x-atlas-client-ids: * does not broaden', async () => {
    await withHub(
      async (base) => {
        const res = await fetch(`${base}/api/client360/${CLIENT_A}`, {
          headers: {
            authorization: 'Bearer valid-member',
            'x-atlas-client-ids': '*',
          },
        });
        const raw = await res.text();
        assertUnmapped(res.status, JSON.parse(raw) as Record<string, unknown>, raw);
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });

  it('request body ClientCode does not override the server mapping', async () => {
    await withHub(
      async (base) => {
        const res = await fetch(`${base}/api/client360/${CLIENT_A}`, {
          method: 'POST',
          headers: {
            authorization: 'Bearer valid-member',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ clientCode: 'ACCG01', clientId: 'ACCG01' }),
        });
        const raw = await res.text();
        assertUnmapped(res.status, JSON.parse(raw) as Record<string, unknown>, raw);
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });

  it('query-string ClientCode does not override the server mapping', async () => {
    await withHub(
      async (base) => {
        const res = await fetch(`${base}/api/client360/${CLIENT_A}?clientCode=ACCG01&clientId=ACCG01`, {
          headers: { authorization: 'Bearer valid-member' },
        });
        const raw = await res.text();
        assertUnmapped(res.status, JSON.parse(raw) as Record<string, unknown>, raw);
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });
});

describe('Client 360 IDOR', () => {
  it('changing UUID from A to B does not expose B', async () => {
    await withHub(
      async (base) => {
        const a = await fetch(`${base}/api/client360/${CLIENT_A}`, {
          headers: { authorization: 'Bearer valid-member' },
        });
        const rawA = await a.text();
        assertUnmapped(a.status, JSON.parse(rawA) as Record<string, unknown>, rawA);
        const b = await fetch(`${base}/api/client360/${CLIENT_B}/documents`, {
          headers: { authorization: 'Bearer valid-member' },
        });
        const rawB = await b.text();
        assertUnmapped(b.status, JSON.parse(rawB) as Record<string, unknown>, rawB);
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });
});

describe('Client 360 collection and mutation routes', () => {
  it('list, dashboard, migration, ingest, and rebuild stay unavailable', async () => {
    await withHub(
      async (base) => {
        const paths: Array<{ path: string; method: string }> = [
          { path: '/api/client360', method: 'GET' },
          { path: '/api/client360/executive-dashboard', method: 'GET' },
          { path: '/api/client360/migration/summary', method: 'GET' },
          { path: '/api/client360/ingest-microsoft', method: 'POST' },
          { path: '/api/client360/rebuild', method: 'POST' },
        ];
        for (const p of paths) {
          const res = await fetch(`${base}${p.path}`, {
            method: p.method,
            headers: {
              authorization: 'Bearer valid-member',
              'content-type': 'application/json',
            },
            body: p.method === 'POST' ? '{}' : undefined,
          });
          const raw = await res.text();
          assertUnmapped(res.status, JSON.parse(raw) as Record<string, unknown>, raw);
        }
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });

  it('inventory does not dump Client 360 candidates', async () => {
    await withHub(
      async (base) => {
        const res = await fetch(`${base}/api/inventory`, {
          headers: { authorization: 'Bearer valid-member' },
        });
        assert.equal(res.status, 200);
        const raw = await res.text();
        const body = JSON.parse(raw) as { client360?: unknown };
        assert.equal(body.client360, undefined);
        assert.equal(raw.includes(SECRET_A), false);
        assert.equal(raw.includes(SECRET_B), false);
      },
      { resolveAllowedClientIds: async () => ['ACCG01'] },
    );
  });
});
