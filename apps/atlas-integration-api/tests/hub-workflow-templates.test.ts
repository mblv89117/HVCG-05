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
  evaluateDeployAncestry,
  normalizeSha,
  HISTORICAL_FLOOR_SHA,
  BLOCKED_STALE_DEPLOY_SHAS,
} from '../src/deploy/deployLineageGuard.ts';
import {
  buildTemplateCatalog,
  buildTemplateDetail,
  instantiateWorkflowFromTemplate,
} from '../src/pm/operatorDesk/workflowTemplateService.ts';
import {
  mapsToConversationalTemplateUse,
  mapsToTemplateDiscoveryIntent,
  listActiveWorkflowTemplates,
} from '../src/pm/operatorDesk/workflowTemplates.ts';
import { listWorkflowCenter } from '../src/pm/operatorDesk/workflows.ts';

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
  const dir = mkdtempSync(join(tmpdir(), 'atlas-workflow-templates-'));
  const prev = { DATA: process.env.INTEGRATION_DATA_DIR, PM: process.env.INTEGRATION_PM_BACKEND };
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
      const err = new Error('Invalid token') as Error & { status: number; code: string };
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
    if (prev.DATA === undefined) delete process.env.INTEGRATION_DATA_DIR;
    else process.env.INTEGRATION_DATA_DIR = prev.DATA;
  }
}

describe('workflow templates', () => {
  it('lists nine active first-class templates', () => {
    const catalog = buildTemplateCatalog();
    assert.equal(catalog.templates.length, 9);
    assert.ok(catalog.templates.some((t) => t.templateId === 'client_onboarding'));
    assert.ok(catalog.templates.some((t) => t.templateId === 'marketing_review'));
  });

  it('returns owner-readable template detail', () => {
    const detail = buildTemplateDetail('capital_submission_preparation');
    assert.ok(detail);
    assert.ok(detail!.ownerReadableSummary.purpose.includes('Capital'));
    assert.ok(detail!.approvalRequirements.includes('external_lender_submit'));
  });

  it('instantiates Hart marketing template with owner-gated spend', async () => {
    await withHub(async () => ['HFD01'], async ({ cfg }) => {
      const principal = staffPrincipal('manny', ['HFD01']);
      const result = await instantiateWorkflowFromTemplate({
        principal,
        dataDir: cfg.dataDir,
        templateId: 'marketing_review',
        inputs: { clientCode: 'HFD01' },
      });
      assert.ok(result.ok);
      if (!result.ok) return;
      assert.equal(result.payload.record.sourceTemplateId, 'marketing_review');
      assert.equal(result.payload.record.scope.clientCode, 'HFD01');
      assert.ok(result.payload.record.approvalRequirements.includes('material_budget_change'));
      assert.ok(result.payload.preview.includes('Google Ads'));
    });
  });

  it('GET template catalog via API', async () => {
    await withHub(async () => ['HFD01'], async ({ base, auth }) => {
      const res = await fetch(`${base}/operator/workflow-templates.json`, { headers: auth });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { workflowTemplates: { templates: unknown[] } };
      assert.equal(body.workflowTemplates.templates.length, 9);
    });
  });

  it('POST instantiate template creates workflow visible in center', async () => {
    await withHub(async () => ['HFD01'], async ({ base, cfg, auth }) => {
      const res = await fetch(`${base}/operator/workflow-templates.json`, {
        method: 'POST',
        headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({
          templateId: 'client_follow_up',
          inputs: { clientCode: 'HFD01', followUpDays: 5 },
        }),
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as { workflowDraft: { record: { workflowId: string } } };
      const center = listWorkflowCenter({
        cfg,
        principal: staffPrincipal('manny', ['HFD01']),
        dataDir: cfg.dataDir,
      });
      assert.ok(center.workflows.some((w) => w.workflowId === body.workflowDraft.record.workflowId));
    });
  });

  it('blocks template instantiation for non-entitled client', async () => {
    await withHub(async () => ['HFD01'], async ({ cfg }) => {
      const result = await instantiateWorkflowFromTemplate({
        principal: staffPrincipal('manny', ['HFD01']),
        dataDir: cfg.dataDir,
        templateId: 'marketing_review',
        inputs: { clientCode: 'PDG01' },
      });
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.error, 'client_not_entitled');
    });
  });

  it('maps template discovery and conversational template intents', () => {
    assert.equal(mapsToTemplateDiscoveryIntent('Do we have a workflow template for onboarding?'), true);
    assert.equal(mapsToConversationalTemplateUse('Use the Client Onboarding template for ACCG'), true);
  });

  it('deployment lineage guard blocks stale overwrite', () => {
    const live = normalizeSha(HISTORICAL_FLOOR_SHA);
    const stale = normalizeSha(BLOCKED_STALE_DEPLOY_SHAS[0]);
    assert.ok(live && stale);
    const block = evaluateDeployAncestry({
      candidateSha: stale!,
      liveSha: live!,
      candidateIncludesCanonicalAncestry: false,
      candidateIncludesLiveAncestry: false,
      liveIncludesCanonicalAncestry: true,
    });
    assert.equal(block.ok, false);
    const ok = evaluateDeployAncestry({
      candidateSha: live!,
      liveSha: live!,
      candidateIncludesCanonicalAncestry: true,
      candidateIncludesLiveAncestry: true,
      liveIncludesCanonicalAncestry: true,
    });
    assert.equal(ok.ok, true);
  });
});
