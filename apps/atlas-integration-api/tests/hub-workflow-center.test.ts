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
import { appendAskAtlasActivity } from '../src/pm/operatorDesk/activityLedger.ts';
import {
  ASK_ATLAS_RUNTIME_AGENT,
  type AgentActivityLedgerEntry,
} from '../src/pm/operatorDesk/types.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import {
  answerWorkflowQuestion,
  listWorkflowCenter,
  mapsToWorkflowQuestion,
} from '../src/pm/operatorDesk/workflows.ts';

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
  fn: (ctx: { base: string; dir: string; cfg: AppConfig }) => Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-workflow-center-'));
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
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  try {
    await fn({ base, dir, cfg });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k as keyof typeof prev];
      else process.env[k as keyof typeof prev] = v;
    }
  }
}

describe('hub workflow center', () => {
  it('lists workflows for entitled staff without inventing Hart rows for foreign clients', async () => {
    await withHub(async () => ['PDG01'], async ({ base, cfg }) => {
      const staff = staffPrincipal('staff-pdg', ['PDG01']);
      const center = listWorkflowCenter({ cfg, principal: staff, dataDir: cfg.dataDir });
      assert.ok(center.workflows.length > 0);
      assert.equal(center.workflows.some((w) => w.workflowId === 'hart.google_ads.sync'), false);
      assert.equal(center.policy.materialBudgetChange, 'OWNER_GATED');
    });
  });

  it('shows Hart workflows for HFD01 entitled principal', async () => {
    await withHub(async () => ['HFD01'], async ({ cfg }) => {
      const manny = staffPrincipal('manny', ['HFD01']);
      const center = listWorkflowCenter({ cfg, principal: manny, dataDir: cfg.dataDir });
      const hart = center.workflows.find((w) => w.workflowId === 'hart.google_ads.sync');
      assert.ok(hart);
      assert.equal(hart.clientCode, 'HFD01');
      assert.ok(hart.description.includes('Google Ads'));
    });
  });

  it('GET /operator/workflows.json requires auth', async () => {
    await withHub(async () => ['HFD01'], async ({ base }) => {
      const unsigned = await fetch(`${base}/operator/workflows.json`);
      assert.equal(unsigned.status, 401);
    });
  });

  it('POST pause/resume records overlay control without bypassing policy', async () => {
    await withHub(async () => ['HFD01'], async ({ base, cfg }) => {
      const token = 'valid-member';
      const auth = { Authorization: `Bearer ${token}` };
      const pause = await fetch(`${base}/operator/workflows.json`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ workflowId: 'hart.google_ads.sync', action: 'pause' }),
      });
      assert.equal(pause.status, 200);
      const body = (await pause.json()) as { workflowCenter: { workflow: { status: string } } };
      assert.equal(body.workflowCenter.workflow.status, 'PAUSED');

      const resume = await fetch(`${base}/operator/workflows.json`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ workflowId: 'hart.google_ads.sync', action: 'resume' }),
      });
      assert.equal(resume.status, 200);
    });
  });

  it('maps workflow questions for Ask Atlas runtime', async () => {
    await withHub(async () => ['HFD01'], async ({ cfg }) => {
      assert.equal(mapsToWorkflowQuestion('What workflows need my attention?'), true);
      assert.equal(mapsToWorkflowQuestion('Why did the Hart Google Ads sync run?'), true);
      const center = listWorkflowCenter({
        cfg,
        principal: staffPrincipal('manny', ['HFD01']),
        dataDir: cfg.dataDir,
      });
      const answer = answerWorkflowQuestion('What failed today?', center);
      assert.ok(answer.includes('No failed') || answer.includes('failed'));
    });
  });

  it('reflects ledger activity into Hart workflow state', async () => {
    await withHub(async () => ['HFD01'], async ({ cfg }) => {
      const principal = staffPrincipal('manny', ['HFD01']);
      const hartEntry: AgentActivityLedgerEntry = {
        agent: ASK_ATLAS_RUNTIME_AGENT,
        missionKey: 'HART-GOOGLE-ADS-PRODUCTION-SYNC-001',
        trigger: 'signed_operator_question',
        timestamp: '2026-08-25T12:05:00.000Z',
        tools: ['google_ads_sync'],
        classification: 'CONFIRMED',
        confidence: 'CONFIRMED',
        result: 'answered',
        readWriteStatus: 'READ_AUTO',
        policyDecision: 'answered',
        writerUserId: principal.userId,
        affected: [{ clientCode: 'HFD01', classification: 'CONFIRMED' }],
      };
      const overlayDir = process.env.INTEGRATION_AGENT_ACTIVITY_DIR!;
      const { readAgentActivityOverlay, writeAgentActivityOverlay } = await import(
        '../src/pm/operatorDesk/activityLedger.ts'
      );
      const overlay = readAgentActivityOverlay(overlayDir);
      overlay.entries.push(hartEntry);
      writeAgentActivityOverlay(overlayDir, overlay);

      const center = listWorkflowCenter({ cfg, principal, dataDir: cfg.dataDir });
      const hart = center.workflows.find((w) => w.workflowId === 'hart.google_ads.sync');
      assert.ok(hart);
      assert.equal(hart?.lastRunAt, '2026-08-25T12:05:00.000Z');
      assert.equal(hart?.status, 'COMPLETE');
    });
  });
});
