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
  if (token === 'valid-other') {
    return { oid: 'user-other', preferred_username: 'other@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' };
  }
  invalidToken();
}

async function resolveAllowedClientIds(oid: string | undefined): Promise<string[]> {
  if (oid === 'user-1') return ['SYN01'];
  if (oid === 'user-other') return ['ACCG01'];
  return [];
}

function headers(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
}

async function withCapitalHub(fn: (ctx: { base: string; dataDir: string }) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-capital-outreach-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
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

describe('Hub outreach history', () => {
  it('returns lender-level counts without other-client identifiers, amounts, or notes', async () => {
    await withCapitalHub(async ({ base, dataDir }) => {
      const syn = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-member'),
        body: JSON.stringify({
          title: 'SYNTHETIC Co WC',
          clientCode: 'SYN01',
          clientId: 'SYN01',
          transactionType: 'working_capital_loc',
          need: { requestedAmount: 250_000, purpose: 'wc' },
          idempotencyKey: 'syn-outreach-hist',
        }),
      });
      assert.equal(syn.status, 200);
      const synBody = (await syn.json()) as { opportunity: { id: string } };

      const accg = await fetch(`${base}/api/capital/opportunities`, {
        method: 'POST',
        headers: headers('valid-other'),
        body: JSON.stringify({
          title: 'SECRET_CLIENT Acquisition',
          clientCode: 'ACCG01',
          transactionType: 'acquisition',
          need: { requestedAmount: 8_400_000, purpose: 'acquisition' },
          idempotencyKey: 'accg-outreach-hist',
        }),
      });
      assert.equal(accg.status, 200);
      const accgBody = (await accg.json()) as { opportunity: { id: string } };

      const store = new CapitalStore(dataDir, { seedSyntheticLenders: true });
      const state = store.load();
      state.submissions.push({
        id: 'sub-accg-hist',
        capitalOpportunityId: accgBody.opportunity.id,
        lenderId: 'ln-catalog-celtic',
        method: 'package',
        status: 'declined',
        response: 'Declined',
        notes: 'SECRET_CLIENT declined $8,400,000 extra docs',
        submittedAt: '2026-06-01T00:00:00.000Z',
        documentIds: [],
      });
      store.save(state);

      const hist = await fetch(`${base}/api/capital/outreach/history`, { headers: headers('valid-member') });
      assert.equal(hist.status, 200);
      const histBody = (await hist.json()) as {
        sourceSystem: string;
        rowCount: number;
        isolation: { notesOmitted: boolean; amountsOmitted: boolean; clientIdentifiersOmitted: boolean };
        notAFit: boolean;
        notAStatisticalClaim: boolean;
        lenders: Array<{ lenderId: string; signals: { declinedCount: number; requestSizeKnown: boolean } }>;
      };
      assert.equal(histBody.sourceSystem, 'HVCG_LenderOutreach');
      assert.equal(histBody.rowCount, 1);
      assert.equal(histBody.isolation.notesOmitted, true);
      assert.equal(histBody.isolation.amountsOmitted, true);
      assert.equal(histBody.notAFit, true);
      assert.equal(histBody.notAStatisticalClaim, true);
      const celtic = histBody.lenders.find((l) => l.lenderId === 'ln-catalog-celtic');
      assert.ok(celtic);
      assert.equal(celtic.signals.declinedCount, 1);
      assert.equal(celtic.signals.requestSizeKnown, false);
      const histBlob = JSON.stringify(histBody);
      assert.equal(/SECRET_CLIENT|8,400,000|ACCG01/i.test(histBlob), false);

      const match = await fetch(`${base}/api/capital/opportunities/${synBody.opportunity.id}/match`, {
        method: 'GET',
        headers: headers('valid-member'),
      });
      assert.equal(match.status, 200);
      const matchBody = (await match.json()) as {
        matches: Array<{
          lenderId: string;
          historicalIntelligence?: {
            sameClient: { outreachCount: number };
            lenderAggregate: { outreachCount: number };
            explanation: string;
          };
        }>;
      };
      const celticMatch = matchBody.matches.find((m) => m.lenderId === 'ln-catalog-celtic');
      assert.equal(celticMatch?.historicalIntelligence?.sameClient.outreachCount, 0);
      assert.equal(celticMatch?.historicalIntelligence?.lenderAggregate.outreachCount, 1);
      assert.equal(/SECRET_CLIENT|8,400,000|ACCG01/i.test(celticMatch?.historicalIntelligence?.explanation || ''), false);

      const unauth = await fetch(`${base}/api/capital/outreach/history`);
      assert.equal(unauth.status, 401);
    });
  });
});
