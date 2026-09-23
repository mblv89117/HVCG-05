import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig, type AppConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter } from '../src/local-ai/adapter.ts';
import { createAuthorizedPmRepository } from '../src/pm/backend.ts';
import { IntegrationRepository } from '../src/store/repository.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import {
  answerApprovalContext,
  buildApprovalCenter,
  mapsToApprovalContextIntent,
} from '../src/pm/operatorDesk/approvalCenter.ts';
import { listWorkflowCenter } from '../src/pm/operatorDesk/workflows.ts';
import { isOperatorApprovalsPath } from '../src/pm/operatorDesk/types.ts';
import { upsertIngest } from '../src/modules/ingest/store.ts';
import {
  GROWTH360_OWNER_DECISION_RESULT,
  growth360ApprovalId,
  recordGrowth360ApprovalContinuity,
} from '../src/modules/ingest/campaignApproval.ts';
import { readApprovalOverlay, resolveApprovalStateDir } from '../src/pm/operatorDesk/approvalState.ts';
import type { AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';

const HFD_GROWTH360_ORG = '99cdffba-3cf2-4343-9e4a-3dca42ff4711';

function hfdEnvelope(partial: Partial<AtlasIntegrationEnvelope> = {}): AtlasIntegrationEnvelope {
  const now = '2026-09-22T12:00:00.000Z';
  return {
    clientCode: 'HFD01',
    source: 'growth_360',
    sourceRecordId: 'req-1',
    schemaVersion: '360_campaign_approval_v1',
    eventType: '360.campaign_approval.v1',
    timestamp: now,
    provenance: { system: 'growth_360', observedAt: now, confidence: 'VERIFIED' },
    confidence: 'VERIFIED',
    correlationId: 'corr-360',
    idempotencyKey: 'growth360|HFD01|approval|1',
    actor: '360-observe',
    authorityClass: 'OBSERVE',
    payload: {
      canExecute: false,
      organizationSlug: 'hart-family-dental',
      organizationId: HFD_GROWTH360_ORG,
      campaignId: 'camp-hfd-1',
      requestedAction: 'Review spring campaign draft',
    },
    ...partial,
  };
}

function staffPrincipal(userId: string, clients: string[]): AtlasPrincipal {
  return {
    userId,
    organizationId: 'org-hvcg',
    allowedClientIds: clients,
    roles: ['HVCG Team Member'],
  };
}

async function withHub(
  resolveCodes: (oid: string | undefined) => Promise<string[]>,
  fn: (ctx: { base: string; dir: string; cfg: AppConfig; auth: Record<string, string> }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-approval-center-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    DATA: process.env.INTEGRATION_DATA_DIR,
    ACTIVITY: process.env.INTEGRATION_AGENT_ACTIVITY_DIR,
    WORKFLOW: process.env.INTEGRATION_WORKFLOW_CONTROL_DIR,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_AGENT_ACTIVITY_DIR = join(dir, 'agent-activity');
  process.env.INTEGRATION_WORKFLOW_CONTROL_DIR = join(dir, 'workflow-controls');
  process.env.INTEGRATION_PM_BACKEND = 'development-json';
  delete process.env.INTEGRATION_REQUIRE_AUTH;
  delete process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH;

  const baseCfg = loadConfig();
  const cfg: AppConfig = {
    ...baseCfg,
    verifyAccessToken: async (token: string) => {
      if (token === 'valid-member') {
        return {
          oid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          preferred_username: 'member@example.com',
          roles: ['HVCG Team Member'],
          scp: 'access_as_user',
        };
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
  const base = `http://127.0.0.1:${port}`;
  const auth = { Authorization: 'Bearer valid-member', 'x-atlas-operator-desk': 'v1' };

  try {
    await fn({ base, dir, cfg, auth });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    process.env.NODE_ENV = prev.NODE_ENV;
    process.env.INTEGRATION_HOST = prev.HOST;
    process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = prev.KEY;
    process.env.MICROSOFT_TENANT_ID = prev.TENANT;
    process.env.INTEGRATION_PM_BACKEND = prev.PM;
    process.env.INTEGRATION_DATA_DIR = prev.DATA;
    process.env.INTEGRATION_AGENT_ACTIVITY_DIR = prev.ACTIVITY;
    process.env.INTEGRATION_WORKFLOW_CONTROL_DIR = prev.WORKFLOW;
  }
}

describe('approval center', () => {
  it('recognizes approvals path', () => {
    assert.equal(isOperatorApprovalsPath('/operator/approvals.json'), true);
  });

  it('maps approval Ask Atlas intents', () => {
    assert.equal(mapsToApprovalContextIntent('What needs my approval?'), true);
    assert.equal(mapsToApprovalContextIntent('Any Capital approvals waiting?'), true);
    assert.equal(mapsToApprovalContextIntent('Summarize SYN01'), false);
  });

  it('composes workflow gate approvals without inventing urgency', async () => {
    await withHub(async () => ['ACCG01'], async ({ base, dir, cfg, auth }) => {
      const principal = staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['ACCG01']);
      const center = buildApprovalCenter({
        cfg,
        principal,
        dataDir: dir,
      });
      const wfCenter = listWorkflowCenter({ cfg, principal, dataDir: dir });
      const hart = center.items.find((i) => i.workflowId === 'hart.cmo.cycle');
      if (wfCenter.workflows.some((w) => w.workflowId === 'hart.cmo.cycle' && w.status === 'REQUIRES_APPROVAL')) {
        assert.ok(hart);
        assert.equal(hart?.category, 'MARKETING');
      }
      const answer = answerApprovalContext('What needs my approval?', center);
      assert.ok(typeof answer === 'string');
    });
  });

  it('GET /operator/approvals.json requires auth', async () => {
    await withHub(async () => ['ACCG01'], async ({ base, auth }) => {
      const unsigned = await fetch(`${base}/operator/approvals.json`);
      assert.equal(unsigned.status, 401);
      const signed = await fetch(`${base}/operator/approvals.json`, { headers: auth });
      assert.equal(signed.status, 200);
      const body = (await signed.json()) as { approvalCenter: { items: unknown[] } };
      assert.ok(body.approvalCenter);
      assert.ok(Array.isArray(body.approvalCenter.items));
    });
  });

  it('defer approval updates overlay state', async () => {
    await withHub(async () => ['ACCG01'], async ({ base, dir, cfg, auth }) => {
      const principal = staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['ACCG01']);
      const center = buildApprovalCenter({ cfg, principal, dataDir: dir });
      const pending = center.items.find((i) => i.status === 'PENDING');
      if (!pending) return;
      const defer = await fetch(`${base}/operator/approvals.json`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'defer', approvalId: pending.approvalId }),
      });
      assert.equal(defer.status, 200);
      const body = (await defer.json()) as { approvalCenter: { detail: { status: string } } };
      assert.equal(body.approvalCenter.detail.status, 'DEFERRED');
    });
  });

  it('shows one HFD01 360 approval and does not duplicate a replay', async () => {
    await withHub(async () => ['HFD01'], async ({ dir, cfg }) => {
      const env = hfdEnvelope();
      const first = upsertIngest({ dataDir: dir, keyId: 'growth360', envelope: env });
      const replay = upsertIngest({ dataDir: dir, keyId: 'growth360', envelope: env });
      assert.equal(first.replay, false);
      assert.equal(replay.replay, true);
      recordGrowth360ApprovalContinuity({
        dataDir: dir,
        envelope: env,
        receivedAt: env.timestamp,
      });
      const principal = staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['HFD01']);
      const center = buildApprovalCenter({ cfg, principal, dataDir: dir });
      const growth = center.items.filter((item) => item.source === 'growth_360');
      assert.equal(growth.length, 1);
      const item = growth[0]!;
      assert.equal(item.clientCode, 'HFD01');
      assert.equal(item.category, 'MARKETING');
      assert.equal(item.originatingSystem, 'growth_360');
      assert.equal(item.approvalId, growth360ApprovalId(env.idempotencyKey));
      assert.equal(item.href, '/clients/HFD01');
      assert.match(item.materialSummary || '', /\/approvals/);
      assert.match(item.materialSummary || '', /requestId=req-1/);
      assert.equal(item.requestedAction, 'Review spring campaign draft');
      assert.ok(item.actions.includes('approve'));
      assert.ok(item.actions.includes('reject'));
      assert.ok(item.actions.includes('defer'));
      assert.ok(item.actions.includes('cancel'));
      const hart = center.items.find((row) => row.workflowId === 'hart.cmo.cycle');
      assert.ok(hart);
      assert.equal(hart?.source, 'workflow_gate');
      assert.notEqual(hart?.approvalId, item.approvalId);
      const again = buildApprovalCenter({ cfg, principal, dataDir: dir });
      assert.equal(again.items.filter((row) => row.source === 'growth_360').length, 1);
    });
  });

  it('fail-closes unmapped, fixture, and cross-client 360 rows', async () => {
    await withHub(async () => ['HFD01', 'ACCG01'], async ({ dir, cfg }) => {
      upsertIngest({ dataDir: dir, keyId: 'growth360', envelope: hfdEnvelope() });
      upsertIngest({
        dataDir: dir,
        keyId: 'growth360',
        envelope: hfdEnvelope({
          clientCode: 'ACCG01',
          sourceRecordId: 'accg-req',
          idempotencyKey: 'growth360|ACCG01|approval|1',
          payload: { canExecute: false },
        }),
      });
      upsertIngest({
        dataDir: dir,
        keyId: 'growth360',
        envelope: hfdEnvelope({
          clientCode: 'MRI01',
          sourceRecordId: 'mri-req',
          idempotencyKey: 'growth360|MRI01|approval|1',
          payload: { canExecute: false, organizationSlug: 'hart-family-dental' },
        }),
      });
      upsertIngest({
        dataDir: dir,
        keyId: 'growth360',
        envelope: hfdEnvelope({
          idempotencyKey: 'growth360|HFD01|paid|1',
          sourceRecordId: 'paid-req',
          payload: { canExecute: true, organizationSlug: 'hart-family-dental', organizationId: HFD_GROWTH360_ORG },
        }),
      });
      const hfd = buildApprovalCenter({
        cfg,
        principal: staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['HFD01']),
        dataDir: dir,
      });
      const growth = hfd.items.filter((item) => item.source === 'growth_360');
      assert.equal(growth.length, 1);
      assert.equal(growth[0]?.clientCode, 'HFD01');
      assert.equal(
        hfd.items.some((item) => item.clientCode === 'ACCG01' || item.clientCode === 'MRI01'),
        false,
      );

      const accg = buildApprovalCenter({
        cfg,
        principal: staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['ACCG01']),
        dataDir: dir,
      });
      assert.equal(accg.items.some((item) => item.clientCode === 'HFD01' || item.source === 'growth_360'), false);
    });
  });

  it('records an Atlas-only approve without canExecute or outbound mutation', async () => {
    await withHub(async () => ['HFD01'], async ({ base, dir, auth }) => {
      const env = hfdEnvelope();
      upsertIngest({ dataDir: dir, keyId: 'growth360', envelope: env });
      const approvalId = growth360ApprovalId(env.idempotencyKey);
      const before = readFileSync(join(dir, 'module-ingest', 'events.json'), 'utf8');
      const originalFetch = globalThis.fetch;
      const outbound: string[] = [];
      globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (!/^http:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)) outbound.push(url);
        return originalFetch(input, init);
      }) as typeof fetch;
      try {
        const approved = await fetch(`${base}/operator/approvals.json`, {
          method: 'POST',
          headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve', approvalId }),
        });
        assert.equal(approved.status, 200);
        const body = (await approved.json()) as {
          approvalCenter: {
            detail: {
              status: string;
              executionState: string;
              expectedEffectIfApproved: string;
              confirmationSummary?: string;
              href?: string;
            };
          };
        };
        assert.equal(body.approvalCenter.detail.status, 'APPROVED');
        assert.equal(body.approvalCenter.detail.executionState, 'NOT_STARTED');
        assert.equal(body.approvalCenter.detail.expectedEffectIfApproved, GROWTH360_OWNER_DECISION_RESULT);
        assert.equal(body.approvalCenter.detail.confirmationSummary, GROWTH360_OWNER_DECISION_RESULT);
        assert.equal(body.approvalCenter.detail.href, '/clients/HFD01');
        assert.doesNotMatch(JSON.stringify(body), /Live external mutation remains policy-gated/);
        assert.doesNotMatch(JSON.stringify(body), /Governed action executed or workflow resumed/);
      } finally {
        globalThis.fetch = originalFetch;
      }
      assert.deepEqual(outbound, []);
      const after = readFileSync(join(dir, 'module-ingest', 'events.json'), 'utf8');
      assert.equal(after, before);
      const stored = JSON.parse(after) as {
        byIdempotencyKey: Record<string, { envelope: { payload: { canExecute?: boolean } } }>;
      };
      assert.equal(stored.byIdempotencyKey[env.idempotencyKey]?.envelope.payload.canExecute, false);
      const overlay = readApprovalOverlay(resolveApprovalStateDir(dir));
      const record = overlay.records.find((row) => row.approvalId === approvalId);
      assert.ok(record);
      assert.equal(record?.executionResult, GROWTH360_OWNER_DECISION_RESULT);
      assert.equal(record?.executionState, 'NOT_STARTED');
      assert.equal(record?.status, 'APPROVED');
      assert.equal(JSON.stringify(overlay).includes('"canExecute":true'), false);
    });
  });

  it('records an Atlas-only reject and keeps canExecute false', async () => {
    await withHub(async () => ['HFD01'], async ({ base, dir, auth }) => {
      const env = hfdEnvelope({ idempotencyKey: 'growth360|HFD01|approval|reject', sourceRecordId: 'req-reject' });
      upsertIngest({ dataDir: dir, keyId: 'growth360', envelope: env });
      const approvalId = growth360ApprovalId(env.idempotencyKey);
      const rejected = await fetch(`${base}/operator/approvals.json`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', approvalId, reason: 'Not this cycle' }),
      });
      assert.equal(rejected.status, 200);
      const body = (await rejected.json()) as {
        approvalCenter: { detail: { status: string; expectedEffectIfRejected: string; executionState: string } };
      };
      assert.equal(body.approvalCenter.detail.status, 'REJECTED');
      assert.equal(body.approvalCenter.detail.executionState, 'NOT_STARTED');
      assert.equal(body.approvalCenter.detail.expectedEffectIfRejected, GROWTH360_OWNER_DECISION_RESULT);
      const overlay = readApprovalOverlay(resolveApprovalStateDir(dir));
      const record = overlay.records.find((row) => row.approvalId === approvalId);
      assert.equal(record?.executionResult, GROWTH360_OWNER_DECISION_RESULT);
      assert.notEqual(record?.executionState, 'EXECUTED');
      const stored = JSON.parse(readFileSync(join(dir, 'module-ingest', 'events.json'), 'utf8')) as {
        byIdempotencyKey: Record<string, { envelope: { payload: { canExecute?: boolean } } }>;
      };
      assert.equal(stored.byIdempotencyKey[env.idempotencyKey]?.envelope.payload.canExecute, false);
    });
  });

  it('shows a continuity-index request when the durable json store is empty', async () => {
    await withHub(async () => ['HFD01'], async ({ dir, cfg }) => {
      const env = hfdEnvelope({ idempotencyKey: 'growth360|HFD01|continuity|1', sourceRecordId: 'req-cont' });
      recordGrowth360ApprovalContinuity({ dataDir: dir, envelope: env, receivedAt: env.timestamp });
      const center = buildApprovalCenter({
        cfg,
        principal: staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['HFD01']),
        dataDir: dir,
      });
      const growth = center.items.filter((item) => item.source === 'growth_360');
      assert.equal(growth.length, 1);
      assert.equal(growth[0]?.approvalId, growth360ApprovalId(env.idempotencyKey));
      assert.equal(growth[0]?.clientCode, 'HFD01');
    });
  });
});
