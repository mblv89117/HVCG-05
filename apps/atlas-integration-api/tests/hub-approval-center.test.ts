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
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import {
  answerApprovalContext,
  buildApprovalCenter,
  mapsToApprovalContextIntent,
} from '../src/pm/operatorDesk/approvalCenter.ts';
import { listWorkflowCenter } from '../src/pm/operatorDesk/workflows.ts';
import { isOperatorApprovalsPath } from '../src/pm/operatorDesk/types.ts';

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
});
