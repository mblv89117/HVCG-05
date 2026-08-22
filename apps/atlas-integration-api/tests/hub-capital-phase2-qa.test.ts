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
import { CapitalStore } from '../src/capital/store.ts';

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
    return { oid: 'user-owner', preferred_username: 'manny@example.com', roles: ['HVCG Owner'], scp: 'access_as_user' };
  }
  if (token === 'valid-admin') {
    return { oid: 'user-admin', preferred_username: 'admin@example.com', roles: ['Administrator'], scp: 'access_as_user' };
  }
  if (token === 'valid-other') {
    return { oid: 'user-other', preferred_username: 'other@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  if (token === 'valid-empty') {
    return { oid: 'user-empty', preferred_username: 'empty@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  if (token === 'valid-star') {
    return { oid: 'user-star', preferred_username: 'star@example.com', roles: ['HVCG Owner'], scp: 'access_as_user' };
  }
  invalidToken();
}

async function resolveAllowedClientIds(oid: string | undefined): Promise<string[]> {
  if (oid === 'user-1' || oid === 'user-owner') return ['SYN01'];
  if (oid === 'user-other') return ['ACCG01'];
  if (oid === 'user-star') return ['*'];
  return [];
}

function headers(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

async function withCapitalHub(fn: (ctx: { base: string; dataDir: string }) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-capital-hub-qa-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    REQUIRE: process.env.INTEGRATION_REQUIRE_AUTH,
    INSECURE: process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    DATA: process.env.INTEGRATION_DATA_DIR,
    CAPITAL: process.env.INTEGRATION_CAPITAL_BACKEND,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_CAPITAL_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: syntheticVerify,
    resolveAllowedClientIds,
  };
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const pm = createAuthorizedPmRepository(cfg);
  const app = buildRegistry(cfg, repo);
  const capital = new CapitalStore(dir, { seedSyntheticLenders: true });
  const localAi = createLocalAiAdapter({
    env: { LOCAL_AI_ENABLED: undefined },
    secretsFileEnv: {},
  });
  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm, localAi, capital }, req, res).catch((err) => {
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
    if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
    else process.env.INTEGRATION_DATA_DIR = prev.DATA;
    if (prev.CAPITAL === undefined) delete process.env.INTEGRATION_CAPITAL_BACKEND;
    else process.env.INTEGRATION_CAPITAL_BACKEND = prev.CAPITAL;
  }
}

const SYN_OPP = {
  title: 'SYNTHETIC Capital Co working capital',
  clientCode: 'SYN01',
  clientId: 'SYN01',
  transactionType: 'working_capital_loc',
  need: { requestedAmount: 500_000, purpose: 'working capital', useOfFunds: 'payroll and inventory' },
  business: {
    industry: 'manufacturing',
    annualRevenue: { value: 4_200_000, verification: 'VERIFIED', confidence: 1, sourceRef: { sourceSystem: 'synthetic-fixture', capturedAt: '2026-08-01T00:00:00.000Z' } },
  },
  transaction: { workingCapitalComponent: true },
  idempotencyKey: 'qa-phase2-syn-001',
};

async function createSynOpportunity(
  base: string,
  token: string,
  idempotencyKey: string,
): Promise<{ id: string; clientCode: string }> {
  const created = await fetch(`${base}/api/capital/opportunities`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ ...SYN_OPP, idempotencyKey }),
  });
  assert.equal(created.status, 200);
  const body = (await created.json()) as { opportunity: { id: string; clientCode: string } };
  return body.opportunity;
}

describe('Hub capital phase 2 QA — isolation and idempotency', () => {
  it('returns 401 for unauthenticated and invalid-token capital requests', async () => {
    await withCapitalHub(async ({ base }) => {
      const missing = await fetch(`${base}/api/capital/opportunities`);
      assert.equal(missing.status, 401);
      const missingBody = (await missing.json()) as { error: string; stack?: string };
      assert.equal(missingBody.error, 'unauthorized');
      assert.equal(missingBody.stack, undefined);

      const bad = await fetch(`${base}/api/capital/opportunities`, { headers: headers('not-a-token') });
      assert.equal(bad.status, 401);
      const badBody = (await bad.json()) as { error: string };
      assert.equal(badBody.error, 'unauthorized');
    });
  });

  it('returns 403 when the principal is entitled to a different client', async () => {
    await withCapitalHub(async ({ base }) => {
      const opportunity = await createSynOpportunity(base, 'valid-member', 'qa-phase2-wrong-client');

      const otherCreate = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-other'),
        body: JSON.stringify({ ...SYN_OPP, idempotencyKey: 'qa-phase2-other-create' }),
      });
      assert.equal(otherCreate.status, 403);
      const otherCreateBody = (await otherCreate.json()) as { error: string; code?: string };
      assert.equal(otherCreateBody.error, 'forbidden');
      assert.equal(otherCreateBody.code, 'forbidden');

      const otherList = await fetch(`${base}/api/capital/opportunities`, { headers: headers('valid-other') });
      assert.equal(otherList.status, 200);
      const otherListBody = (await otherList.json()) as { opportunities: Array<{ id: string }> };
      assert.equal(otherListBody.opportunities.length, 0);

      const otherGet = await fetch(`${base}/api/capital/opportunities/${opportunity.id}`, {
        headers: headers('valid-other'),
      });
      assert.equal(otherGet.status, 404);
    });
  });

  it('rejects wildcard ClientCode with 422 unprocessable', async () => {
    await withCapitalHub(async ({ base }) => {
      const starScope = await fetch(`${base}/api/capital/opportunities`, { headers: headers('valid-star') });
      assert.equal(starScope.status, 403);

      const wildcard = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          ...SYN_OPP,
          clientCode: '*',
          clientId: '*',
          idempotencyKey: 'qa-phase2-wildcard',
        }),
      });
      assert.equal(wildcard.status, 422);
      const body = (await wildcard.json()) as { error: string; code?: string; message?: string };
      assert.equal(body.error, 'unprocessable');
      assert.equal(body.code, 'unprocessable');
      assert.match(String(body.message || ''), /ClientCode/i);
    });
  });

  it('treats duplicate document sha256 as idempotent', async () => {
    await withCapitalHub(async ({ base }) => {
      const opportunity = await createSynOpportunity(base, 'valid-member', 'qa-phase2-dup-sha');
      const payload = {
        fileName: 'SYNTHETIC Capital Co P&L YTD.pdf',
        contentType: 'application/pdf',
        sizeBytes: 12,
        sha256: 'qa-phase2-sha-abc',
      };

      const first = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/documents`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify(payload),
      });
      assert.equal(first.status, 200);
      const firstBody = (await first.json()) as { document: { id: string }; duplicate?: boolean; duplicateOf?: string };
      assert.equal(firstBody.duplicate, false);
      assert.equal(firstBody.duplicateOf, undefined);

      const dup = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/documents`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ ...payload, fileName: 'copy.pdf' }),
      });
      assert.equal(dup.status, 200);
      const dupBody = (await dup.json()) as { document: { id: string }; duplicate?: boolean; duplicateOf?: string };
      assert.equal(dupBody.duplicate, true);
      assert.equal(dupBody.duplicateOf, firstBody.document.id);
      assert.equal(dupBody.document.id, firstBody.document.id);
    });
  });

  it('blocks document-intelligence send / sendToClient / externalSend with 422', async () => {
    await withCapitalHub(async ({ base }) => {
      const opportunity = await createSynOpportunity(base, 'valid-member', 'qa-phase2-docint-send');

      for (const flag of ['send', 'sendToClient', 'externalSend'] as const) {
        const blocked = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/document-intelligence`, {
          method: 'POST',
          headers: headers('valid-member'),
          body: JSON.stringify({ [flag]: true }),
        });
        assert.equal(blocked.status, 422, `${flag} must be blocked`);
        const body = (await blocked.json()) as { error: string; code?: string };
        assert.equal(body.error, 'unprocessable');
        assert.equal(body.code, 'unprocessable');
      }
    });
  });

  it('returns 400 for malformed JSON without leaking a stack', async () => {
    await withCapitalHub(async ({ base }) => {
      const res = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: '{"title":',
      });
      assert.equal(res.status, 400);
      const body = (await res.json()) as { error: string; code?: string; stack?: string };
      assert.equal(body.error, 'malformed_json');
      assert.equal(body.code, 'malformed_json');
      assert.equal(body.stack, undefined);
      assert.doesNotMatch(JSON.stringify(body), /at /);
    });
  });

  it('returns 403 when a non-owner posts a strategy decision', async () => {
    await withCapitalHub(async ({ base }) => {
      const opportunity = await createSynOpportunity(base, 'valid-member', 'qa-phase2-strategy');

      const member = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/strategy/decision`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({ decision: 'APPROVED' }),
      });
      assert.equal(member.status, 403);
      const memberBody = (await member.json()) as { error: string; code?: string };
      assert.equal(memberBody.error, 'forbidden');
      assert.equal(memberBody.code, 'forbidden');

      const admin = await fetch(`${base}/api/capital/opportunities/${opportunity.id}/strategy/decision`, {
        method: 'POST',
        headers: headers('valid-admin'),
        body: JSON.stringify({ decision: 'APPROVED' }),
      });
      assert.equal(admin.status, 403);
    });
  });
});
