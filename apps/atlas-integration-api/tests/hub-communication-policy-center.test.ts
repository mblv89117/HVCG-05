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
  answerCommunicationPolicy,
  listCommunicationPolicies,
  mapsToCommunicationPolicyIntent,
  recordCommunicationPolicy,
  validateCommunicationPolicyWrite,
} from '../src/pm/operatorDesk/communicationPolicyCenter.ts';
import { isOperatorCommunicationPoliciesPath } from '../src/pm/operatorDesk/types.ts';
import { COMMUNICATIONS_AUTO_RESPOND, COMMUNICATIONS_POLICY_CLASS } from '../src/pm/operatorDesk/types.ts';

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
  const dir = mkdtempSync(join(tmpdir(), 'atlas-comms-policy-'));
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

describe('communication policy center', () => {
  it('recognizes communication-policies path', () => {
    assert.equal(isOperatorCommunicationPoliciesPath('/operator/communication-policies.json'), true);
    assert.equal(isOperatorCommunicationPoliciesPath('/operator/approvals.json'), false);
  });

  it('keeps global AUTO_RESPOND disabled', () => {
    assert.equal(COMMUNICATIONS_AUTO_RESPOND, false);
    assert.equal(COMMUNICATIONS_POLICY_CLASS, 'DRAFT_ONLY');
  });

  it('org default is DRAFT_ONLY and rejects global AUTO_RESPOND', () => {
    const orgDraft = validateCommunicationPolicyWrite(
      { scopeKind: 'org', mode: 'DRAFT_ONLY' },
      ['ACCG01'],
    );
    assert.equal(orgDraft.ok, true);
    if (orgDraft.ok) assert.equal(orgDraft.mode, 'DRAFT_ONLY');

    const globalAuto = validateCommunicationPolicyWrite(
      { scopeKind: 'org', mode: 'AUTO_RESPOND' },
      ['ACCG01'],
    );
    assert.equal(globalAuto.ok, false);
    if (!globalAuto.ok) assert.equal(globalAuto.error, 'auto_respond_not_org_default');

    const orgRequire = validateCommunicationPolicyWrite(
      { scopeKind: 'org', mode: 'REQUIRE_APPROVAL' },
      ['ACCG01'],
    );
    assert.equal(orgRequire.ok, false);
    if (!orgRequire.ok) assert.equal(orgRequire.error, 'org_default_must_be_draft_only');
  });

  it('records entitled-scope AUTO_RESPOND and rejects unknown ClientCode', () => {
    const entitled = validateCommunicationPolicyWrite(
      { scopeKind: 'client', clientCode: 'ACCG01', mode: 'AUTO_RESPOND' },
      ['ACCG01'],
    );
    assert.equal(entitled.ok, true);
    if (entitled.ok) {
      assert.equal(entitled.mode, 'AUTO_RESPOND');
      assert.equal(entitled.clientCode, 'ACCG01');
    }

    const unknown = validateCommunicationPolicyWrite(
      { scopeKind: 'client', clientCode: 'SYN01', mode: 'AUTO_RESPOND' },
      ['SYN01', 'ACCG01'],
    );
    assert.equal(unknown.ok, false);
    if (!unknown.ok) assert.equal(unknown.error, 'unknown_client_code');

    const sixth = validateCommunicationPolicyWrite(
      { scopeKind: 'client', clientCode: 'FOO01', mode: 'DRAFT_ONLY' },
      ['FOO01'],
    );
    assert.equal(sixth.ok, false);
    if (!sixth.ok) assert.equal(sixth.error, 'unknown_client_code');
  });

  it('maps Ask Atlas communication-policy questions and stays honest-empty', () => {
    assert.equal(mapsToCommunicationPolicyIntent('what is the communication policy for ACCG?'), true);
    assert.equal(mapsToCommunicationPolicyIntent('Summarize SYN01'), false);
    const principal = staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['ACCG01']);
    const dir = mkdtempSync(join(tmpdir(), 'atlas-comms-ask-'));
    try {
      const model = listCommunicationPolicies({ principal, dataDir: dir });
      const empty = answerCommunicationPolicy(
        'what is the communication policy for ACCG?',
        model,
        ['ACCG01'],
      );
      assert.equal(empty.honestEmpty, true);
      assert.match(empty.text, /No recorded communication policy for ACCG01/);
      assert.doesNotMatch(empty.text, /sent mail|auto-send complete/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('GET /operator/communication-policies.json is fail-closed unsigned', async () => {
    await withHub(async () => ['ACCG01'], async ({ base, auth }) => {
      const unsigned = await fetch(`${base}/operator/communication-policies.json`);
      assert.equal(unsigned.status, 401);
      const unsignedBody = (await unsigned.json()) as { error: string; communicationPolicies?: unknown };
      assert.equal(unsignedBody.error, 'unauthorized');
      assert.equal(unsignedBody.communicationPolicies, undefined);

      const signed = await fetch(`${base}/operator/communication-policies.json`, { headers: auth });
      assert.equal(signed.status, 200);
      const body = (await signed.json()) as {
        communicationPolicies: {
          orgDefault: { mode: string };
          globalAutoRespond: boolean;
          items: Array<{ scopeKind: string; mode: string }>;
        };
      };
      assert.equal(body.communicationPolicies.orgDefault.mode, 'DRAFT_ONLY');
      assert.equal(body.communicationPolicies.globalAutoRespond, false);
      assert.ok(body.communicationPolicies.items.some((row) => row.scopeKind === 'org' && row.mode === 'DRAFT_ONLY'));
    });
  });

  it('POST rejects global AUTO_RESPOND and unknown ClientCode; records entitled AUTO_RESPOND', async () => {
    await withHub(async () => ['ACCG01'], async ({ base, dir, auth }) => {
      const globalAuto = await fetch(`${base}/operator/communication-policies.json`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeKind: 'org', mode: 'AUTO_RESPOND' }),
      });
      assert.equal(globalAuto.status, 400);
      const globalBody = (await globalAuto.json()) as { code: string };
      assert.equal(globalBody.code, 'auto_respond_not_org_default');

      const unknown = await fetch(`${base}/operator/communication-policies.json`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeKind: 'client', clientCode: 'SYN01', mode: 'AUTO_RESPOND' }),
      });
      assert.equal(unknown.status, 400);
      const unknownBody = (await unknown.json()) as { code: string };
      assert.equal(unknownBody.code, 'unknown_client_code');

      const entitled = await fetch(`${base}/operator/communication-policies.json`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ scopeKind: 'client', clientCode: 'ACCG01', mode: 'AUTO_RESPOND' }),
      });
      assert.equal(entitled.status, 200);
      const entitledBody = (await entitled.json()) as {
        recorded: { mode: string; clientCode: string; autoSend: boolean };
        communicationPolicies: { globalAutoRespond: boolean };
      };
      assert.equal(entitledBody.recorded.mode, 'AUTO_RESPOND');
      assert.equal(entitledBody.recorded.clientCode, 'ACCG01');
      assert.equal(entitledBody.recorded.autoSend, false);
      assert.equal(entitledBody.communicationPolicies.globalAutoRespond, false);

      const principal = staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['ACCG01']);
      const listed = listCommunicationPolicies({ principal, dataDir: dir });
      assert.ok(listed.items.some((row) => row.clientCode === 'ACCG01' && row.mode === 'AUTO_RESPOND'));
      const answer = answerCommunicationPolicy('what is the communication policy for ACCG?', listed, ['ACCG01']);
      assert.equal(answer.honestEmpty, false);
      assert.match(answer.text, /ACCG01: AUTO_RESPOND/);
      assert.match(answer.text, /does not auto-send mail/);
    });
  });

  it('recordCommunicationPolicy refuses a sixth client even when entitled locally', () => {
    const principal = staffPrincipal('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', ['FOO01', 'ACCG01']);
    const dir = mkdtempSync(join(tmpdir(), 'atlas-comms-sixth-'));
    try {
      const result = recordCommunicationPolicy({
        principal,
        dataDir: dir,
        input: { scopeKind: 'client', clientCode: 'FOO01', mode: 'DRAFT_ONLY' },
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error, 'unknown_client_code');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
