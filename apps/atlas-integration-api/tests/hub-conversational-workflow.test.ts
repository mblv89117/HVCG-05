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
import {
  mapsToWorkflowCreationIntent,
  mapsToWorkflowDiscoveryIntent,
  mapsToWorkflowEditIntent,
  parseWorkflowInstruction,
  formatWorkflowPreview,
} from '../src/pm/operatorDesk/workflowParser.ts';
import { listWorkflowCenter } from '../src/pm/operatorDesk/workflows.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

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
  const dir = mkdtempSync(join(tmpdir(), 'atlas-conv-workflow-'));
  const prev = {
    NODE_ENV: process.env.NODE_ENV,
    HOST: process.env.INTEGRATION_HOST,
    KEY: process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY,
    TENANT: process.env.MICROSOFT_TENANT_ID,
    PM: process.env.INTEGRATION_PM_BACKEND,
    DATA: process.env.INTEGRATION_DATA_DIR,
    ACTIVITY: process.env.INTEGRATION_AGENT_ACTIVITY_DIR,
    WORKFLOW: process.env.INTEGRATION_WORKFLOW_CONTROL_DIR,
    DEF: process.env.INTEGRATION_WORKFLOW_DEFINITION_DIR,
  };
  process.env.NODE_ENV = 'development';
  process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
  process.env.INTEGRATION_HOST = '127.0.0.1';
  process.env.MICROSOFT_TENANT_ID = '11111111-1111-1111-1111-111111111111';
  process.env.INTEGRATION_DATA_DIR = dir;
  process.env.INTEGRATION_AGENT_ACTIVITY_DIR = join(dir, 'agent-activity');
  process.env.INTEGRATION_WORKFLOW_CONTROL_DIR = join(dir, 'workflow-controls');
  process.env.INTEGRATION_WORKFLOW_DEFINITION_DIR = join(dir, 'workflow-definitions');
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
  const auth = { Authorization: 'Bearer valid-member' };

  try {
    await fn({ base, dir, cfg, auth });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    rmSync(dir, { recursive: true, force: true });
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k as keyof typeof prev];
      else process.env[k as keyof typeof prev] = v;
    }
  }
}

describe('conversational workflow creation', () => {
  it('recognizes workflow creation intent', () => {
    assert.equal(
      mapsToWorkflowCreationIntent('Create a workflow for Hart that checks Google Ads every morning'),
      true,
    );
    assert.equal(mapsToWorkflowEditIntent('Pause the Hart workflow'), true);
    assert.equal(mapsToWorkflowDiscoveryIntent('What workflows have I created?'), true);
  });

  it('parses Hart marketing workflow with owner-gated budget authority', () => {
    const parsed = parseWorkflowInstruction(
      'Create a workflow for Hart that reviews Google Ads every morning and asks me for approval before increasing the budget',
    );
    assert.equal(parsed.name, 'Hart Daily Google Ads Review');
    assert.equal(parsed.scope.clientCode, 'HFD01');
    assert.equal(parsed.authorityExpansionRequired, true);
    assert.ok(parsed.approvalRequirements.includes('material_budget_change'));
    assert.ok(parsed.actions.some((a) => a.actionType === 'google_ads_metrics_sync'));
    const preview = formatWorkflowPreview(
      {
        workflowDefinitionId: 'test',
        workflowId: 'custom.hart',
        version: 1,
        name: parsed.name,
        description: parsed.description,
        status: 'DRAFT',
        scope: parsed.scope,
        trigger: parsed.trigger,
        conditions: parsed.conditions,
        actions: parsed.actions,
        policyClass: parsed.policyClass,
        approvalRequirements: parsed.approvalRequirements,
        createdBy: 'test',
        createdAt: '2026-08-25T00:00:00.000Z',
        updatedAt: '2026-08-25T00:00:00.000Z',
        sourceConversation: parsed.description,
        provenance: 'template',
        templateKey: 'hart_marketing_review',
        versionHistory: [],
        authorityExpansionRequired: parsed.authorityExpansionRequired,
      },
    );
    assert.ok(preview.includes('Hart Daily Google Ads Review'));
    assert.ok(preview.includes('AUTHORITY') || preview.includes('Approval required'));
  });

  it('create draft via POST and list in workflow center', async () => {
    await withHub(async () => ['HFD01'], async ({ base, cfg, auth }) => {
      const instruction =
        'Create a workflow for Hart that checks Google Ads every morning and asks me before increasing spend';
      const create = await fetch(`${base}/operator/workflows.json`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create_draft', instruction }),
      });
      assert.equal(create.status, 200);
      const body = (await create.json()) as {
        workflowDraft: { record: { workflowId: string; status: string }; preview: string };
      };
      assert.ok(body.workflowDraft.record.workflowId.startsWith('custom.'));
      assert.equal(body.workflowDraft.record.status, 'READY_FOR_APPROVAL');
      assert.ok(body.workflowDraft.preview.includes('Google Ads'));

      const center = listWorkflowCenter({
        cfg,
        principal: staffPrincipal('manny', ['HFD01']),
        dataDir: cfg.dataDir,
      });
      const custom = center.workflows.find((w) => w.workflowId === body.workflowDraft.record.workflowId);
      assert.ok(custom);
      assert.equal(custom?.clientCode, 'HFD01');
    });
  });

  it('blocks activation without authority approval when expansion required', async () => {
    await withHub(async () => ['HFD01'], async ({ base, auth }) => {
      const instruction = 'Create a workflow for Hart that increases ad budget automatically';
      const create = await fetch(`${base}/operator/workflows.json`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create_draft', instruction }),
      });
      const created = (await create.json()) as { workflowDraft: { record: { workflowId: string } } };
      const activate = await fetch(`${base}/operator/workflows.json`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          workflowId: created.workflowDraft.record.workflowId,
        }),
      });
      assert.equal(activate.status, 403);
    });
  });

  it('activates harmless workflow after owner confirmation', async () => {
    await withHub(async () => ['HFD01'], async ({ base, auth }) => {
      const instruction = 'Create a workflow for Hart that syncs Google Ads every morning';
      const create = await fetch(`${base}/operator/workflows.json`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'create_draft', instruction }),
      });
      const created = (await create.json()) as { workflowDraft: { record: { workflowId: string } } };
      const activate = await fetch(`${base}/operator/workflows.json`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          workflowId: created.workflowDraft.record.workflowId,
        }),
      });
      assert.equal(activate.status, 200);
      const activated = (await activate.json()) as {
        workflowCenter: { activated: { status: string } };
      };
      assert.equal(activated.workflowCenter.activated.status, 'ACTIVE');
    });
  });

  it('runtime returns workflow draft for creation question', async () => {
    await withHub(async () => ['HFD01'], async ({ base, auth }) => {
      const res = await fetch(
        `${base}/operator/runtime.json?question=${encodeURIComponent(
          'Create a workflow for Hart that checks Google Ads every morning',
        )}`,
        { headers: auth },
      );
      assert.equal(res.status, 200);
      const body = (await res.json()) as { workflowDraft?: { record: { name: string } } };
      assert.ok(body.workflowDraft);
      assert.equal(body.workflowDraft?.record.name, 'Hart Daily Google Ads Review');
    });
  });

  it('client isolation hides Hart custom workflows from PDG01 principal', async () => {
    await withHub(async () => ['HFD01'], async ({ base, cfg, auth }) => {
      await fetch(`${base}/operator/workflows.json`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'create_draft',
          instruction: 'Create a workflow for Hart that syncs Google Ads every morning',
        }),
      });
      const pdgCenter = listWorkflowCenter({
        cfg,
        principal: staffPrincipal('pdg', ['PDG01']),
        dataDir: cfg.dataDir,
      });
      assert.equal(pdgCenter.workflows.some((w) => w.workflowId.startsWith('custom.')), false);
    });
  });
});
