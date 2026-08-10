/**
 * Live Ollama Phase 2 smoke — summarize + decision package against loopback model.
 * Synthetic fixtures only. Not part of CI.
 */
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';
import { SYNTHETIC_FIXTURES } from '../src/local-ai/syntheticFixtures.ts';
import { DEFAULT_LOCAL_AI_FEATURE_FLAGS } from '@hvcg/atlas-integration-core';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const evidenceDir = join(root, 'deployment/reports/local-ai-phase2');
mkdirSync(evidenceDir, { recursive: true });

const dataDir = mkdtempSync(join(tmpdir(), 'local-ai-smoke-'));
const client = new OllamaClient({
  baseUrl: 'http://127.0.0.1:11434',
  model: 'glm-4.7-flash:q4_K_M',
  timeoutMs: 300_000,
  maxRetries: 1,
  allowNonLoopback: false,
  formatJson: true,
});

const flags = {
  ...DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  LocalAIEnabled: true,
  LocalAIWritesEnabled: false,
  LocalAIExternalMessagesEnabled: false,
  EvaIntakeEnabled: false,
  ClientEmailsEnabled: false,
};

const service = new LocalAiService({
  repo: new LocalAiRepository(dataDir),
  flags,
  ollamaClient: client,
  ollamaConfig: client.getConfig(),
  defaultExecutorMode: 'ollama',
});

const evidence: Record<string, unknown> = {
  startedAt: new Date().toISOString(),
  model: 'glm-4.7-flash:q4_K_M',
  baseUrl: 'http://127.0.0.1:11434',
  cases: [] as unknown[],
};

async function runCase(
  name: string,
  fixtureKey: keyof typeof SYNTHETIC_FIXTURES,
  operation: string,
) {
  const fx = SYNTHETIC_FIXTURES[fixtureKey];
  const { job: created } = service.createJob({
    sourceRecordType: 'SyntheticNote',
    sourceRecordId: fx.id,
    requestedOperation: operation,
    sourceContent: fx.content,
    executorMode: 'ollama',
    idempotencyKey: `smoke-${name}-${Date.now()}`,
  });
  const t0 = Date.now();
  const job = await service.processJob(created.aiJobId, { force: true });
  const durationMs = Date.now() - t0;
  const ok =
    job.processingStatus !== 'Failed' &&
    job.validationStatus === 'Passed' &&
    job.outputPayload != null &&
    job.wroteAuthoritativeBusinessRecord === false;
  const row = {
    name,
    fixture: fixtureKey,
    operation,
    ok,
    durationMs,
    processingStatus: job.processingStatus,
    validationStatus: job.validationStatus,
    confidence: job.confidence,
    requiresMannyApproval: job.requiresMannyApproval,
    wroteAuthoritativeBusinessRecord: job.wroteAuthoritativeBusinessRecord,
    outputSummaryPreview: String(job.outputSummary || '').slice(0, 240),
    errorType: job.errorType || null,
    validationErrors: job.validationErrors || [],
  };
  (evidence.cases as unknown[]).push(row);
  console.log(JSON.stringify(row, null, 2));
  return ok;
}

const health = await client.health();
const models = await client.listModels();
evidence.health = health;
evidence.models = models;
console.log('health', health);
console.log('models', models);

let allOk = true;
allOk = (await runCase('summarize_dental', 'dental_practice_prospect', 'summarize_text')) && allOk;
allOk =
  (await runCase('decision_concrete', 'concrete_contractor', 'prepare_decision_package')) && allOk;

evidence.finishedAt = new Date().toISOString();
evidence.verdict = allOk ? 'PASS' : 'FAIL';
writeFileSync(join(evidenceDir, 'live-ollama-smoke.json'), JSON.stringify(evidence, null, 2));
console.log('VERDICT', evidence.verdict);
process.exit(allOk ? 0 : 1);
