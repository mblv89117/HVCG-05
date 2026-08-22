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
import { createAuthorizedPmRepository } from '../src/pm/backend.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import { buildOperatorCommercialContext, toDeskCommercialContext } from '../src/pm/commercialContext/build.ts';
import { persistObservation } from '../src/pm/commercialContext/observe.ts';
import { emptyOverlay } from '../src/pm/commercialContext/store.ts';
import { EMPTY_REASON } from '../src/pm/commercialContext/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const SYN01 = 'SYN01';
const ACME01 = 'ACME01';

function principal(codes: string[], roles = ['HVCG Team Member']): AtlasPrincipal {
  return {
    userId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    email: 'member@example.com',
    organizationId: 'org-hvcg',
    allowedClientIds: codes,
    roles,
  };
}

describe('commercial context builder', () => {
  it('stays honest and empty when nothing is recorded', () => {
    const ctx = buildOperatorCommercialContext({
      principal: principal([SYN01]),
      overlay: emptyOverlay(),
      opportunities: [],
      leads: [],
    });
    assert.equal(ctx.entitled, true);
    assert.equal(ctx.liveGtmOutbound, false);
    assert.equal(ctx.paidAds, false);
    assert.equal(ctx.gcc.honesty.available, false);
    assert.match(ctx.gcc.honesty.emptyReason || '', /does not invent LTV/);
    assert.equal(ctx.copilot.honesty.available, false);
    assert.equal(ctx.gtm.honesty.available, false);
    assert.equal(ctx.gcc.signals.length, 0);
    const desk = toDeskCommercialContext(ctx, 1);
    assert.equal(desk.gcc.count, 0);
    assert.equal(desk.rows.length, 0);
  });

  it('filters overlay and CRM rows to entitled ClientCodes only', () => {
    const overlay = emptyOverlay();
    overlay.gccSignals.push({
      contractVersion: 'gcc-value-signal.v1',
      signalId: 'sig-syn',
      clientCode: SYN01,
      signalType: 'expansion_opportunity',
      summary: 'Recorded expansion signal',
      emittedAt: '2026-08-22T00:00:00.000Z',
      copiesLedger: false,
      idempotencyKey: 'gcc|sig-syn|SYN01',
    });
    overlay.gccSignals.push({
      contractVersion: 'gcc-value-signal.v1',
      signalId: 'sig-acme',
      clientCode: ACME01,
      signalType: 'ltv_update',
      summary: 'Must not leak',
      emittedAt: '2026-08-22T00:00:00.000Z',
      copiesLedger: false,
      idempotencyKey: 'gcc|sig-acme|ACME01',
    });
    const ctx = buildOperatorCommercialContext({
      principal: principal([SYN01]),
      overlay,
      opportunities: [
        {
          id: '1',
          etag: 'W/"1"',
          title: 'SYN01 opportunity',
          stage: 'Proposal',
          clientCode: SYN01,
          proposalAmount: 25000,
          capitalHandoffStatus: 'Ready',
          copilotSummary: 'Converted from lead SYN01',
          attention: { state: 'OPEN', label: 'Open', severity: 'neutral', reason: 'open' },
        },
        {
          id: '2',
          etag: 'W/"2"',
          title: 'ACME leak',
          stage: 'Discovery',
          clientCode: ACME01,
          attention: { state: 'OPEN', label: 'Open', severity: 'neutral', reason: 'open' },
        },
      ],
      leads: [
        {
          id: 'lead-1',
          etag: 'W/"1"',
          title: 'SYN01 lead',
          status: 'Qualified',
          clientCode: SYN01,
          source: '360-growth',
          leadSourceDetail: 'cmp-gtm-001',
        },
      ],
    });
    assert.equal(ctx.gcc.signals.length, 1);
    assert.equal(ctx.gcc.signals[0].clientCode, SYN01);
    assert.equal(ctx.opportunities.length, 1);
    assert.equal(ctx.opportunities[0].capitalHandoffStatus, 'Ready');
    assert.equal(ctx.copilot.sharepoint.length, 1);
    assert.equal(ctx.gtm.crmSources.length, 1);
    assert.equal(ctx.gtm.crmSources[0].source, '360-growth');
    assert.ok(!JSON.stringify(ctx).includes('Must not leak'));
    assert.ok(!JSON.stringify(ctx).includes('ACME leak'));
  });

  it('rejects live dispatch and ledger copies on observe', () => {
    assert.throws(
      () =>
        persistObservation(principal([SYN01]), emptyOverlay(), {
          kind: 'gcc-value-signal.v1',
          record: { clientCode: SYN01, signalType: 'ltv_update', liveDispatch: true },
        }),
      /liveDispatch/,
    );
    assert.throws(
      () =>
        persistObservation(principal([SYN01]), emptyOverlay(), {
          kind: 'gcc-value-signal.v1',
          record: { clientCode: SYN01, signalType: 'ltv_update', copiesLedger: true },
        }),
      /copiesLedger/,
    );
    assert.throws(
      () =>
        persistObservation(principal([SYN01], ['HVCG Client']), emptyOverlay(), {
          kind: 'gcc-value-signal.v1',
          record: { clientCode: SYN01, signalType: 'ltv_update' },
        }),
      /internal staff/,
    );
  });

  it('persists entitled GCC / Copilot / GTM observations and replays by idempotency', () => {
    let overlay = emptyOverlay();
    const first = persistObservation(principal([SYN01]), overlay, {
      kind: 'gcc-value-signal.v1',
      record: {
        contractVersion: 'gcc-value-signal.v1',
        signalId: 'sig-900',
        clientCode: SYN01,
        signalType: 'capital_need',
        severity: 'high',
        summary: 'Recorded capital-need signal',
        emittedAt: '2026-08-22T05:00:00.000Z',
        copiesLedger: false,
        idempotencyKey: 'gcc|sig-900|SYN01',
      },
    });
    assert.equal(first.replay, false);
    overlay = first.overlay;
    const replay = persistObservation(principal([SYN01]), overlay, {
      kind: 'gcc-value-signal.v1',
      record: {
        signalId: 'sig-900',
        clientCode: SYN01,
        signalType: 'capital_need',
        idempotencyKey: 'gcc|sig-900|SYN01',
      },
    });
    assert.equal(replay.replay, true);
    assert.equal(overlay.gccSignals.length, 1);
  });

  it('does not persist unentitled foreign ClientCodes', () => {
    assert.throws(
      () =>
        persistObservation(principal([SYN01]), emptyOverlay(), {
          kind: 'pre-call-brief.v1',
          record: {
            briefId: 'pcb-1',
            bookingId: 'book-1',
            atlasClientCode: ACME01,
            ownerSystem: 'copilot',
          },
        }),
      /not_found/,
    );
  });
});

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string; dataDir: string }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-commercial-context-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    DATA: process.env.INTEGRATION_DATA_DIR,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_PM_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;
  const cfg: AppConfig = {
    ...loadConfig(),
    verifyAccessToken: async (token: string) => {
      if (token === 'valid-member') {
        return { oid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', preferred_username: 'member@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' };
      }
      if (token === 'valid-foreign') {
        return { oid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', preferred_username: 'other@example.com', roles: ['HVCG Team Member'], scp: 'access_as_user' };
      }
      const err = new Error('Invalid or expired Microsoft token') as Error & { status: number; code: string };
      err.status = 401;
      err.code = 'invalid_token';
      throw err;
    },
    resolveAllowedClientIds: resolveCodes,
  };
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const pm = createAuthorizedPmRepository(cfg);
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
    if (prev.PM === undefined) delete process.env.INTEGRATION_PM_BACKEND;
    else process.env.INTEGRATION_PM_BACKEND = prev.PM;
    if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
    else process.env.INTEGRATION_DATA_DIR = prev.DATA;
  }
}

describe('commercial context HTTP fail-closed', () => {
  it('unauth GET/POST are 401 and persist only entitled observations', async () => {
    await withHub(async (oid) => (oid?.startsWith('aaaaaaaa') ? [SYN01] : [ACME01]), async ({ base, dataDir }) => {
      const unauth = await fetch(`${base}/api/pm/commercial-context`);
      assert.equal(unauth.status, 401);
      const unauthPost = await fetch(`${base}/api/pm/commercial-context/observations`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'gcc-value-signal.v1', record: { clientCode: SYN01, signalType: 'ltv_update' } }),
      });
      assert.equal(unauthPost.status, 401);

      const empty = await fetch(`${base}/api/pm/commercial-context`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(empty.status, 200);
      const emptyBody = (await empty.json()) as { commercialContext: { gcc: { available: boolean; emptyReason?: string }; liveGtmOutbound: boolean } };
      assert.equal(emptyBody.commercialContext.liveGtmOutbound, false);
      assert.equal(emptyBody.commercialContext.gcc.available, false);
      assert.match(emptyBody.commercialContext.gcc.emptyReason || '', /does not invent LTV/);

      const created = await fetch(`${base}/api/pm/commercial-context/observations`, {
        method: 'POST',
        headers: { authorization: 'Bearer valid-member', 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'gcc-value-signal.v1',
          record: {
            signalId: 'sig-live',
            clientCode: SYN01,
            signalType: 'renewal_risk',
            summary: 'Recorded SYN01 renewal risk',
            copiesLedger: false,
            idempotencyKey: 'gcc|sig-live|SYN01',
          },
        }),
      });
      assert.equal(created.status, 201);

      const copilot = await fetch(`${base}/api/pm/commercial-context/observations`, {
        method: 'POST',
        headers: { authorization: 'Bearer valid-member', 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'atlas-lead-handoff.v1',
          record: {
            assessmentId: 'mri-501',
            clientCode: SYN01,
            organizationName: 'SYN01',
            observationOnly: true,
            summary: 'Observation-only MRI',
          },
        }),
      });
      assert.equal(copilot.status, 201);

      const gtm = await fetch(`${base}/api/pm/commercial-context/observations`, {
        method: 'POST',
        headers: { authorization: 'Bearer valid-member', 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'attribution-lineage.v1',
          record: {
            clientCode: SYN01,
            source: '360-growth',
            campaignId: 'cmp-gtm-001',
          },
        }),
      });
      assert.equal(gtm.status, 201);

      const foreign = await fetch(`${base}/api/pm/commercial-context/observations`, {
        method: 'POST',
        headers: { authorization: 'Bearer valid-member', 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'gcc-value-signal.v1',
          record: { clientCode: ACME01, signalType: 'ltv_update', signalId: 'leak' },
        }),
      });
      assert.equal(foreign.status, 404);

      const syn = await fetch(`${base}/api/pm/clients/${SYN01}/commercial-context`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(syn.status, 200);
      const synBody = (await syn.json()) as {
        commercialContext: { gcc: { signals: Array<{ clientCode: string; summary?: string }> }; copilot: { assessments: unknown[] }; gtm: { attributions: unknown[] } };
      };
      assert.equal(synBody.commercialContext.gcc.signals.length, 1);
      assert.equal(synBody.commercialContext.gcc.signals[0].clientCode, SYN01);
      assert.equal(synBody.commercialContext.copilot.assessments.length, 1);
      assert.equal(synBody.commercialContext.gtm.attributions.length, 1);

      const acme = await fetch(`${base}/api/pm/clients/${ACME01}/commercial-context`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(acme.status, 404);

      const other = await fetch(`${base}/api/pm/clients/${SYN01}/commercial-context`, {
        headers: { authorization: 'Bearer valid-foreign' },
      });
      assert.equal(other.status, 404);

      const home = await fetch(`${base}/api/pm/command-center`, {
        headers: { authorization: 'Bearer valid-member' },
      });
      assert.equal(home.status, 200);
      const homeBody = (await home.json()) as { commandCenter: { commercialContext: { gcc: { count: number }; liveGtmOutbound: boolean } } };
      assert.equal(homeBody.commandCenter.commercialContext.liveGtmOutbound, false);
      assert.equal(homeBody.commandCenter.commercialContext.gcc.count, 1);

      assert.equal(existsSync(join(dataDir, 'commercial-context-overlay.json')), true);
      const raw = readFileSync(join(dataDir, 'commercial-context-overlay.json'), 'utf8');
      assert.ok(raw.includes('Recorded SYN01 renewal risk'));
      assert.equal(raw.includes('leak'), false);
      assert.equal(EMPTY_REASON.gcc.includes('invent LTV'), true);
    });
  });
});
