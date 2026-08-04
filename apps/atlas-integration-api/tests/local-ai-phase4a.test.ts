/**
 * Phase 4A — Fast model routing, quality fallback, safety.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  PHASE4A_AUTHORIZED_FAST_MODEL,
  buildModelRoutingConfig,
  isDeepOnlyOperation,
  resolveModelForOperation,
  resolveQualityFallbackToDeep,
  sanitizeModelProfileOverride,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';
import { SYNTHETIC_FIXTURES } from '../src/local-ai/syntheticFixtures.ts';

function validOutput(jobId: string, operation: string, confidence = 0.82) {
  return {
    job_id: jobId,
    operation,
    executive_summary: 'TEST — SYNTHETIC AI OUTPUT — DO NOT SEND: phase4a',
    facts: ['Fact'],
    inferences: ['Inference'],
    missing_information: ['Docs'],
    risks: ['Risk'],
    recommended_next_action: 'Review',
    recommended_owner: 'Manny',
    work_value_tier: 'Tier 3 — Administrative Delegate',
    requires_manny_approval: true,
    decision_package: {
      decision: 'd',
      recommendation: 'r',
      why: ['w'],
      alternatives: ['a'],
      risks: ['r'],
      deadline: null,
      required_review_minutes: 5,
      source_records: [],
      confidence,
      missing_information: ['Docs'],
    },
    confidence,
    warnings: [],
  };
}

class FakeOllamaClient {
  constructor(
    private behavior: 'success' | 'malformed' | 'success_after_fail' = 'success',
    private calls: string[] = [],
  ) {}
  getCalls() {
    return this.calls;
  }
  getConfig() {
    return {
      baseUrl: 'http://127.0.0.1:11434',
      model: 'fake-deep',
      timeoutMs: 1000,
      maxRetries: 1,
      allowNonLoopback: false,
      formatJson: true,
    };
  }
  withModel(model: string) {
    const next = new FakeOllamaClient(this.behavior, this.calls);
    (next as unknown as { _model: string })._model = model;
    return next;
  }
  async health() {
    return { ok: true, version: 'fake' };
  }
  async listModels() {
    return [PHASE4A_AUTHORIZED_FAST_MODEL, 'fake-deep', 'glm-4.7-flash:q4_K_M'];
  }
  async chat(opts: { user: string; model?: string }) {
    const model = opts.model || 'fake-deep';
    this.calls.push(model);
    const jobId = /job_id:\s*(\S+)/.exec(opts.user)?.[1] || 'unknown';
    const operation = /operation:\s*(\S+)/.exec(opts.user)?.[1] || 'summarize_text';
    if (this.behavior === 'malformed') {
      return { rawContent: 'not-json', model };
    }
    if (this.behavior === 'success_after_fail') {
      if (model.includes('qwen') || model.includes('fast')) {
        return { rawContent: '{bad', model };
      }
      return { rawContent: JSON.stringify(validOutput(jobId, operation)), model };
    }
    return { rawContent: JSON.stringify(validOutput(jobId, operation)), model };
  }
}

function tempService(
  fake: FakeOllamaClient,
  secrets: Record<string, string> = {
    OLLAMA_FAST_MODEL: PHASE4A_AUTHORIZED_FAST_MODEL,
    OLLAMA_DEEP_MODEL: 'glm-4.7-flash:q4_K_M',
    OLLAMA_FALLBACK_MODEL: 'glm-4.7-flash:q4_K_M',
  },
) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-local-ai-p4a-'));
  const service = new LocalAiService({
    repo: new LocalAiRepository(dir),
    flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
    ollamaClient: fake as unknown as OllamaClient,
    ollamaConfig: {
      baseUrl: 'http://127.0.0.1:11434',
      model: 'glm-4.7-flash:q4_K_M',
      timeoutMs: 1000,
      maxRetries: 1,
      allowNonLoopback: false,
      formatJson: true,
    },
    defaultExecutorMode: 'ollama',
    secretsFileEnv: secrets,
  });
  // Seed discovery so installed models include fast+deep
  (service as unknown as { lastDiscovery: unknown }).lastDiscovery = {
    healthy: true,
    models: [
      { name: PHASE4A_AUTHORIZED_FAST_MODEL },
      { name: 'glm-4.7-flash:q4_K_M' },
    ],
    selectedModel: 'glm-4.7-flash:q4_K_M',
  };
  return { dir, service, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe('phase4a model routing policy', () => {
  it('routes routine ops to Fast and deep-only ops to Deep', () => {
    const routing = buildModelRoutingConfig({
      deepModel: 'glm-4.7-flash:q4_K_M',
      fastModel: PHASE4A_AUTHORIZED_FAST_MODEL,
      fallbackModel: 'glm-4.7-flash:q4_K_M',
      installedModels: [PHASE4A_AUTHORIZED_FAST_MODEL, 'glm-4.7-flash:q4_K_M'],
    });
    assert.equal(routing.fasterModelAvailable, true);
    const fast = resolveModelForOperation('summarize_text', routing, {
      installedModels: [PHASE4A_AUTHORIZED_FAST_MODEL, 'glm-4.7-flash:q4_K_M'],
    });
    assert.equal(fast.actualModel, PHASE4A_AUTHORIZED_FAST_MODEL);
    assert.equal(fast.usedFallback, false);
    assert.equal(isDeepOnlyOperation('prepare_decision_package'), true);
    const deep = resolveModelForOperation('prepare_decision_package', routing, {
      overrideProfile: 'Fast Operations Model',
      installedModels: [PHASE4A_AUTHORIZED_FAST_MODEL, 'glm-4.7-flash:q4_K_M'],
    });
    assert.equal(deep.actualProfile, 'Deep Analysis Model');
    assert.equal(sanitizeModelProfileOverride('evil-model'), null);
  });

  it('resolves quality fallback to Deep after Fast schema failure', () => {
    const routing = buildModelRoutingConfig({
      deepModel: 'glm-4.7-flash:q4_K_M',
      fastModel: PHASE4A_AUTHORIZED_FAST_MODEL,
      fallbackModel: 'glm-4.7-flash:q4_K_M',
      installedModels: [PHASE4A_AUTHORIZED_FAST_MODEL, 'glm-4.7-flash:q4_K_M'],
    });
    const prior = resolveModelForOperation('classify_work_value', routing, {
      installedModels: [PHASE4A_AUTHORIZED_FAST_MODEL, 'glm-4.7-flash:q4_K_M'],
    });
    const fb = resolveQualityFallbackToDeep(prior, routing, [
      PHASE4A_AUTHORIZED_FAST_MODEL,
      'glm-4.7-flash:q4_K_M',
    ]);
    assert.ok(fb);
    assert.equal(fb!.fallbackReason, 'fast_model_schema_validation_failed');
    assert.equal(fb!.actualModel, 'glm-4.7-flash:q4_K_M');
  });
});

describe('phase4a executor routing', () => {
  it('uses Fast model for routine summary', async () => {
    const fake = new FakeOllamaClient('success');
    const { service, cleanup } = tempService(fake);
    const { job } = service.createJob({
      sourceRecordType: 'Synthetic',
      sourceRecordId: 'f1',
      requestedOperation: 'summarize_text',
      idempotencyKey: 'p4a-sum',
      executorMode: 'ollama',
      sourceContent: SYNTHETIC_FIXTURES.dental_practice_prospect.content,
    });
    const processed = await service.processJob(job.aiJobId, { force: true });
    assert.equal(processed.validationStatus, 'Passed');
    assert.equal(processed.modelRouting?.actualModel, PHASE4A_AUTHORIZED_FAST_MODEL);
    assert.equal(processed.wroteAuthoritativeBusinessRecord, false);
    assert.ok(fake.getCalls().includes(PHASE4A_AUTHORIZED_FAST_MODEL));
    cleanup();
  });

  it('keeps Deep-only routing for decision packages', async () => {
    const fake = new FakeOllamaClient('success');
    const { service, cleanup } = tempService(fake);
    const { job } = service.createJob({
      sourceRecordType: 'Synthetic',
      sourceRecordId: 'd1',
      requestedOperation: 'prepare_decision_package',
      idempotencyKey: 'p4a-deep',
      executorMode: 'ollama',
      sourceContent: SYNTHETIC_FIXTURES.concrete_contractor.content,
    });
    const processed = await service.processJob(job.aiJobId, { force: true });
    assert.equal(processed.modelRouting?.actualProfile, 'Deep Analysis Model');
    assert.equal(processed.modelRouting?.actualModel, 'glm-4.7-flash:q4_K_M');
    cleanup();
  });

  it('falls back Fast→Deep on malformed Fast output and records reason', async () => {
    const fake = new FakeOllamaClient('success_after_fail');
    const { service, cleanup } = tempService(fake);
    const { job } = service.createJob({
      sourceRecordType: 'Synthetic',
      sourceRecordId: 'fb1',
      requestedOperation: 'classify_work_value',
      idempotencyKey: 'p4a-fb',
      executorMode: 'ollama',
      sourceContent: SYNTHETIC_FIXTURES.task_value.content,
    });
    const processed = await service.processJob(job.aiJobId, { force: true });
    assert.equal(processed.validationStatus, 'Passed');
    assert.equal(processed.modelRouting?.usedFallback, true);
    assert.equal(processed.modelRouting?.fallbackReason, 'fast_model_schema_validation_failed');
    assert.equal(processed.modelRouting?.actualModel, 'glm-4.7-flash:q4_K_M');
    assert.ok(fake.getCalls().some((c) => c.includes('qwen')));
    assert.ok(fake.getCalls().includes('glm-4.7-flash:q4_K_M'));
    cleanup();
  });

  it('keeps safety flags false and blocks writes/external/eva', async () => {
    const { service, cleanup } = tempService(new FakeOllamaClient('success'));
    const flags = service.getFlags();
    assert.equal(flags.LocalAIWritesEnabled, false);
    assert.equal(flags.LocalAIExternalMessagesEnabled, false);
    assert.equal(flags.EvaIntakeEnabled, false);
    assert.equal(flags.ClientEmailsEnabled, false);
    const { job } = service.createJob({
      sourceRecordType: 'Synthetic',
      sourceRecordId: 'safe',
      requestedOperation: 'summarize_meeting_notes',
      idempotencyKey: 'p4a-safe',
      executorMode: 'ollama',
      sourceContent: SYNTHETIC_FIXTURES.post_meeting.content,
    });
    assert.equal(service.attemptExternalCommunication(job.aiJobId).allowed, false);
    assert.equal(service.attemptProhibitedAction(job.aiJobId, 'ClientActivation').allowed, false);
    const dash = service.performanceDashboard();
    assert.ok('fastModelAverageLatencyMs' in dash);
    assert.ok(Array.isArray(dash.operationsThatShouldRemainDeepOnly));
    cleanup();
  });
});
