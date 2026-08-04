/**
 * Phase 4A live benchmark — Fast vs Deep on synthetic fixtures.
 * Local-only. Does not commit model weights. Not part of default CI.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';
import { SYNTHETIC_FIXTURES } from '../src/local-ai/syntheticFixtures.ts';
import { DEFAULT_LOCAL_AI_FEATURE_FLAGS } from '@hvcg/atlas-integration-core';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const evidenceDir = join(root, 'deployment/reports/local-ai-phase4a');
mkdirSync(evidenceDir, { recursive: true });

const FAST = 'qwen2.5:7b-instruct';
const DEEP = 'glm-4.7-flash:q4_K_M';

const client = new OllamaClient({
  baseUrl: 'http://127.0.0.1:11434',
  model: DEEP,
  timeoutMs: 300_000,
  maxRetries: 1,
  allowNonLoopback: false,
  formatJson: true,
});

const service = new LocalAiService({
  repo: new LocalAiRepository(mkdtempSync(join(tmpdir(), 'p4a-bench-'))),
  flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
  ollamaClient: client,
  ollamaConfig: client.getConfig(),
  defaultExecutorMode: 'ollama',
  secretsFileEnv: {
    OLLAMA_FAST_MODEL: FAST,
    OLLAMA_DEEP_MODEL: DEEP,
    OLLAMA_FALLBACK_MODEL: DEEP,
  },
});

await service.refreshOllamaDiscovery(false);

const health = await client.health();
const models = await client.listModels();
const evidence: Record<string, unknown> = {
  startedAt: new Date().toISOString(),
  health,
  models,
  fastModel: FAST,
  deepModel: DEEP,
  cases: [] as unknown[],
};

async function runCase(
  name: string,
  operation: string,
  content: string,
  forceProfile?: 'Fast Operations Model' | 'Deep Analysis Model',
) {
  const pack = service.createContentPack({
    sourceKind: 'pasted_text',
    sourceConfirmed: true,
    clientId: `bench-${name}`,
    clientLabel: 'Benchmark Synthetic Client',
    sensitivity: 'Internal',
    requestedOperation: operation,
    originalContent: content,
    modelProfileOverride: forceProfile || null,
  });
  service.decideContentPackRedaction(pack.packId, 'Approve Redacted Content');
  const t0 = Date.now();
  const { job } = await service.processContentPack(pack.packId, { force: true });
  const row = {
    name,
    operation,
    forceProfile: forceProfile || 'policy',
    ok: job.validationStatus === 'Passed' && job.processingStatus !== 'Failed',
    durationMs: Date.now() - t0,
    processingDurationMs: job.processingDurationMs,
    model: job.modelRouting?.actualModel,
    profile: job.modelRouting?.actualProfile,
    usedFallback: job.modelRouting?.usedFallback,
    fallbackReason: job.modelRouting?.fallbackReason,
    schemaValid: job.validationStatus === 'Passed',
    confidence: job.confidence,
    inputChars: content.length,
    outputChars: JSON.stringify(job.outputPayload || '').length,
    requiresMannyApproval: job.requiresMannyApproval,
    wroteAuthoritativeBusinessRecord: job.wroteAuthoritativeBusinessRecord,
    estimatedReviewMinutes: job.timeProtection?.estimatedMannyReviewMinutes ?? null,
    estimatedSavedMinutes: job.timeProtection?.estimatedMannyTimeSavedMinutes ?? null,
  };
  (evidence.cases as unknown[]).push(row);
  console.log(JSON.stringify(row));
  return row;
}

const fx = SYNTHETIC_FIXTURES;

// Fast path (policy routing)
await runCase('fast_summarize', 'summarize_text', fx.dental_practice_prospect.content);
await runCase('fast_classify', 'classify_work_value', fx.task_value.content);
await runCase('fast_missing', 'identify_missing_information', fx.concrete_contractor.content);
await runCase('fast_agenda', 'prepare_meeting_agenda', fx.meeting_prep.content);
await runCase('fast_meeting_notes', 'summarize_meeting_notes', fx.post_meeting.content);
await runCase('fast_status', 'draft_internal_status_update', fx.entertainment_venue.content);
await runCase('fast_injection', 'summarize_text', fx.agreement_summary.content);
await runCase('fast_sensitive', 'identify_missing_information', fx.agreement_summary.content);

// Deep-only + one side-by-side deep summarize
await runCase('deep_decision', 'prepare_decision_package', fx.auto_repair.content);
await runCase(
  'deep_summarize_compare',
  'summarize_text',
  fx.dental_practice_prospect.content,
  'Deep Analysis Model',
);

const cases = evidence.cases as Array<{
  ok: boolean;
  schemaValid: boolean;
  durationMs: number;
  model?: string;
  name: string;
}>;
const fastCases = cases.filter((c) => c.model === FAST);
const deepCases = cases.filter((c) => c.model === DEEP);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

evidence.summary = {
  fastAvgMs: avg(fastCases.map((c) => c.durationMs)),
  deepAvgMs: avg(deepCases.map((c) => c.durationMs)),
  fastSchemaRate:
    fastCases.length === 0
      ? null
      : fastCases.filter((c) => c.schemaValid).length / fastCases.length,
  deepSchemaRate:
    deepCases.length === 0
      ? null
      : deepCases.filter((c) => c.schemaValid).length / deepCases.length,
  allOk: cases.every((c) => c.ok),
  under30sFast: fastCases.filter((c) => c.durationMs < 30_000).length,
  under60sFast: fastCases.filter((c) => c.durationMs < 60_000).length,
  fastCount: fastCases.length,
  deepCount: deepCases.length,
  writesBlocked: cases.every((c) => !(c as { wroteAuthoritativeBusinessRecord?: boolean }).wroteAuthoritativeBusinessRecord),
};
evidence.finishedAt = new Date().toISOString();
evidence.verdict =
  (evidence.summary as { allOk: boolean; fastSchemaRate: number | null }).allOk &&
  ((evidence.summary as { fastSchemaRate: number | null }).fastSchemaRate ?? 0) >= 0.95
    ? 'PASS'
    : 'FAIL';

writeFileSync(join(evidenceDir, 'benchmark.json'), JSON.stringify(evidence, null, 2));
console.log('SUMMARY', JSON.stringify(evidence.summary, null, 2));
console.log('VERDICT', evidence.verdict);
process.exit((evidence.summary as { allOk: boolean }).allOk ? 0 : 1);
