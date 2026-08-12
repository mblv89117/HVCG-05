import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { isLoopbackUrl, loadLocalAiFeatureFlags } from '@hvcg/atlas-integration-core';
import { loadConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { handleRequest } from '../src/http/router.ts';
import { createLocalAiAdapter, type LocalAiAdapter } from '../src/local-ai/adapter.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';
import { IntegrationRepository } from '../src/store/repository.ts';

process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
process.env.INTEGRATION_HOST = '127.0.0.1';
process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH = 'true';
process.env.INTEGRATION_REQUIRE_AUTH = 'false';

const VALID_OUTPUT = {
  job_id: 'job-1',
  operation: 'summarize_text',
  executive_summary: 'Summary of synthetic notes.',
  facts: ['Fact A'],
  inferences: ['Inference A'],
  missing_information: [],
  risks: ['None identified'],
  recommended_next_action: 'Review internally',
  recommended_owner: 'Manny',
  work_value_tier: 'Tier 3 — Administrative Delegate',
  requires_manny_approval: true,
  decision_package: {
    decision: 'Hold',
    recommendation: 'Review',
    why: ['Incomplete context'],
    alternatives: ['Wait'],
    risks: ['None'],
    deadline: null,
    required_review_minutes: 5,
    source_records: [{ type: 'Note', id: 'n1', title: 'note' }],
    confidence: 0.8,
    missing_information: [],
  },
  confidence: 0.8,
  warnings: [],
};

function offEnv(): Record<string, string | undefined> {
  return {
    LOCAL_AI_ENABLED: undefined,
    LOCAL_AI_KILL_SWITCH: undefined,
    LOCAL_AI_WRITES_ENABLED: undefined,
    LOCAL_AI_EXTERNAL_MESSAGES_ENABLED: undefined,
    EVA_INTAKE_ENABLED: undefined,
    CLIENT_EMAILS_ENABLED: undefined,
    OLLAMA_BASE_URL: undefined,
    OLLAMA_MODEL: undefined,
    OLLAMA_ALLOW_NON_LOOPBACK: undefined,
    LOCAL_AI_SECRETS_FILE: '/tmp/atlas-local-ai-missing.env',
  };
}

describe('local-ai optional adapter — OFF mode', () => {
  it('defaults disabled and does not require Ollama or .data', () => {
    const adapter = createLocalAiAdapter({ env: offEnv(), secretsFileEnv: {} });
    const snap = adapter.snapshot();
    assert.equal(snap.enabled, false);
    assert.equal(snap.available, false);
    assert.equal(snap.availability, 'disabled');
    assert.equal(snap.probed, false);
  });

  it('complete fails soft when disabled and does not invent a response', async () => {
    const adapter = createLocalAiAdapter({ env: offEnv(), secretsFileEnv: {} });
    const result = await adapter.complete({
      operation: 'summarize_text',
      sourceContent: 'hello',
    });
    assert.equal(result.status, 503);
    assert.equal(result.body.error, 'local_ai_disabled');
    assert.equal('output' in result.body, false);
  });

  it('rejects non-loopback provider URLs without crashing', () => {
    const adapter = createLocalAiAdapter({
      env: {
        ...offEnv(),
        LOCAL_AI_ENABLED: 'true',
        OLLAMA_BASE_URL: 'http://example.com:11434',
      },
      secretsFileEnv: {},
    });
    const snap = adapter.snapshot();
    assert.equal(snap.enabled, true);
    assert.equal(snap.availability, 'misconfigured');
    assert.equal(snap.available, false);
  });
});

describe('local-ai loopback URL policy', () => {
  it('accepts loopback and rejects remote/file URLs', () => {
    assert.equal(isLoopbackUrl('http://127.0.0.1:11434'), true);
    assert.equal(isLoopbackUrl('http://localhost:11434'), true);
    assert.equal(isLoopbackUrl('http://example.com:11434'), false);
    assert.equal(isLoopbackUrl('file:///etc/passwd'), false);
  });
});

describe('local-ai mocked ON mode', () => {
  it('returns validated output from a mocked provider', async () => {
    const fake = {
      health: async () => ({ ok: true, version: '0.0-test' }),
      chat: async () => ({ rawContent: JSON.stringify(VALID_OUTPUT), model: 'mock-model' }),
    } as unknown as OllamaClient;
    const adapter = createLocalAiAdapter({
      env: { ...offEnv(), LOCAL_AI_ENABLED: 'true', OLLAMA_MODEL: 'mock-model' },
      secretsFileEnv: {},
      ollamaClient: fake,
    });
    const health = await adapter.health();
    assert.equal(health.availability, 'ready');
    const result = await adapter.complete({
      operation: 'summarize_text',
      sourceContent: 'TEST — DO NOT CONTACT synthetic note',
      jobId: 'job-1',
    });
    assert.equal(result.status, 200);
    assert.equal((result.body.output as { job_id: string }).job_id, 'job-1');
  });

  it('reports unavailable when the mocked provider is offline', async () => {
    const fake = {
      health: async () => ({ ok: false, error: 'ECONNREFUSED' }),
      chat: async () => {
        throw Object.assign(new Error('Ollama connection refused / offline'), {
          status: 503,
          code: 'ollama_offline',
        });
      },
    } as unknown as OllamaClient;
    const adapter = createLocalAiAdapter({
      env: { ...offEnv(), LOCAL_AI_ENABLED: 'true', OLLAMA_MODEL: 'mock-model' },
      secretsFileEnv: {},
      ollamaClient: fake,
    });
    const health = await adapter.health();
    assert.equal(health.availability, 'unavailable');
    const result = await adapter.complete({
      operation: 'summarize_text',
      sourceContent: 'note',
    });
    assert.equal(result.status, 503);
    assert.equal(result.body.error, 'ollama_offline');
  });
});

async function withTestHub(localAi: LocalAiAdapter, fn: (base: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-local-ai-hub-'));
  const prevPort = process.env.INTEGRATION_API_PORT;
  process.env.INTEGRATION_API_PORT = '0';
  const cfg = loadConfig();
  const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
  const app = buildRegistry(cfg, repo);
  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm: null, localAi }, req, res).catch((err) => {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: String(err) }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
    rmSync(dir, { recursive: true, force: true });
    if (prevPort === undefined) delete process.env.INTEGRATION_API_PORT;
    else process.env.INTEGRATION_API_PORT = prevPort;
  }
}

describe('local-ai Hub routes — OFF mode', () => {
  it('Hub /health stays ok and does not probe Ollama', async () => {
    const adapter = createLocalAiAdapter({ env: offEnv(), secretsFileEnv: {} });
    await withTestHub(adapter, async (base) => {
      const started = Date.now();
      const res = await fetch(`${base}/health`);
      const elapsed = Date.now() - started;
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        ok: boolean;
        localAi: { enabled: boolean; available: boolean; availability: string };
      };
      assert.equal(body.ok, true);
      assert.equal(body.localAi.enabled, false);
      assert.equal(body.localAi.available, false);
      assert.equal(body.localAi.availability, 'disabled');
      assert.ok(elapsed < 2000, `health took ${elapsed}ms — must not wait on Ollama`);
    });
  });

  it('GET /api/local-ai/health reports disabled without crashing', async () => {
    const adapter = createLocalAiAdapter({ env: offEnv(), secretsFileEnv: {} });
    await withTestHub(adapter, async (base) => {
      const res = await fetch(`${base}/api/local-ai/health`);
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        ok: boolean;
        localAi: { availability: string; enabled: boolean };
      };
      assert.equal(body.ok, true);
      assert.equal(body.localAi.enabled, false);
      assert.equal(body.localAi.availability, 'disabled');
    });
  });

  it('POST /api/local-ai/complete returns 503 when disabled', async () => {
    const adapter = createLocalAiAdapter({ env: offEnv(), secretsFileEnv: {} });
    await withTestHub(adapter, async (base) => {
      const res = await fetch(`${base}/api/local-ai/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operation: 'summarize_text', sourceContent: 'x' }),
      });
      assert.equal(res.status, 503);
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, 'local_ai_disabled');
    });
  });
});

describe('feature flag defaults', () => {
  it('loadLocalAiFeatureFlags stays off when env is empty', () => {
    const flags = loadLocalAiFeatureFlags({});
    assert.equal(flags.LocalAIEnabled, false);
    assert.equal(flags.LocalAIWritesEnabled, false);
  });
});
