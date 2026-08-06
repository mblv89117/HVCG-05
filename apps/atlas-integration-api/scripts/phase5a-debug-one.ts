import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DEFAULT_LOCAL_AI_FEATURE_FLAGS, buildEvaScenario } from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';

const dir = mkdtempSync(join(tmpdir(), 'eva-dbg-'));
const client = new OllamaClient({
  baseUrl: 'http://127.0.0.1:11434',
  model: 'glm-4.7-flash:q4_K_M',
  timeoutMs: 600_000,
  maxRetries: 1,
  allowNonLoopback: false,
  formatJson: true,
});
const svc = new LocalAiService({
  repo: new LocalAiRepository(dir),
  flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
  ollamaClient: client,
  ollamaConfig: client.getConfig(),
  defaultExecutorMode: 'ollama',
  documentStagingRoot: join(dir, 'staging'),
  documentReviewDbPath: join(dir, 'docs.sqlite'),
  evaDbPath: join(dir, 'eva.sqlite'),
  secretsFileEnv: {
    OLLAMA_DEEP_MODEL: 'glm-4.7-flash:q4_K_M',
    OLLAMA_FAST_MODEL: 'qwen2.5:7b-instruct',
  },
});

const r = await svc.intakeEvaSubmission({
  body: {
    ...(buildEvaScenario('auto_repair') as object),
    idempotencyKey: `dbg-${Date.now()}`,
  },
  origin: 'http://127.0.0.1:5180',
  reviewMode: 'Full Local AI End-to-End Test',
});

console.log(
  JSON.stringify(
    {
      status: r.submission?.status,
      errorDetail: r.submission?.errorDetail,
      modelUsed: r.submission?.modelUsed,
      routing: r.submission?.modelRouting,
      timings: r.submission?.performanceTimings,
      confidence: r.submission?.reviewOutput?.confidence,
      warnings: r.submission?.reviewOutput?.warnings?.slice(0, 8),
      packageKeys: r.submission?.reviewOutput
        ? Object.keys(r.submission.reviewOutput)
        : [],
    },
    null,
    2,
  ),
);
