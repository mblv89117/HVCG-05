/**
 * Phase 4B-2 live Ollama document-enrichment benchmark (synthetic only).
 * Local-only. Does not commit model weights. Not part of default CI.
 *
 * Run: npx tsx apps/atlas-integration-api/scripts/phase4b2-live-benchmark.ts
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';
import { createFixture } from '../src/local-ai/documentFixtures.ts';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  PHASE4A_AUTHORIZED_FAST_MODEL,
} from '@hvcg/atlas-integration-core';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const evidenceDir = join(root, 'deployment/reports/local-ai-phase4b2');
mkdirSync(evidenceDir, { recursive: true });

const FAST = PHASE4A_AUTHORIZED_FAST_MODEL; // qwen2.5:7b-instruct
const DEEP = 'glm-4.7-flash:q4_K_M';

const client = new OllamaClient({
  baseUrl: 'http://127.0.0.1:11434',
  model: DEEP,
  timeoutMs: 600_000,
  maxRetries: 1,
  allowNonLoopback: false,
  formatJson: true,
});

const dataDir = mkdtempSync(join(tmpdir(), 'p4b2-bench-'));
const staging = join(dataDir, 'staging');

const service = new LocalAiService({
  repo: new LocalAiRepository(join(dataDir, 'repo')),
  flags: { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS, LocalAIEnabled: true },
  ollamaClient: client,
  ollamaConfig: client.getConfig(),
  defaultExecutorMode: 'ollama',
  documentStagingRoot: staging,
  secretsFileEnv: {
    OLLAMA_FAST_MODEL: FAST,
    OLLAMA_DEEP_MODEL: DEEP,
    OLLAMA_FALLBACK_MODEL: DEEP,
    LOCAL_AI_MALWARE_SCAN_SYNTHETIC_OVERRIDE: 'false',
  },
});

await service.refreshOllamaDiscovery(false);
const health = await client.health();
const models = await client.listModels();

type CaseRow = Record<string, unknown>;
const evidence: Record<string, unknown> = {
  startedAt: new Date().toISOString(),
  health,
  models: models.map((m) => m.name),
  fastModel: FAST,
  deepModel: DEEP,
  flags: service.getFlags(),
  cases: [] as CaseRow[],
};

async function runDocCase(opts: {
  name: string;
  fixture: Parameters<typeof createFixture>[0];
  forceOcr?: boolean;
  expectDeep?: boolean;
}) {
  const fx = createFixture(opts.fixture);
  const tMalware0 = Date.now();
  const staged = await service.stageDocument({
    originalFilename: fx.filename,
    contentBase64: fx.bytes.toString('base64'),
    declaredMime: fx.mime,
  });
  const malwareMs = Date.now() - tMalware0;

  if (staged.status === 'MalwareBlocked') {
    (evidence.cases as CaseRow[]).push({
      name: opts.name,
      ok: false,
      error: 'malware_blocked',
      malwareMs,
      malwareStatus: staged.malwareScanStatus,
    });
    return;
  }

  const tExtract0 = Date.now();
  const extracted = await service.processStagedDocument({
    stagedFileId: staged.stagedFileId,
    clientLabel: 'Benchmark Synthetic Client',
    forceOcr: opts.forceOcr,
  });
  const extractMs = Date.now() - tExtract0;
  const ocrMs = extracted.extraction?.ocr?.durationMs ?? null;
  const tRedact0 = Date.now();
  // redaction already done in process; measure approve+enrich as model path
  const redactMs = Date.now() - tRedact0;

  const tEnrich0 = Date.now();
  const enriched = await service.decideStagedDocument(
    staged.stagedFileId,
    'Approve Redacted Content',
  );
  const enrichMs = Date.now() - tEnrich0;
  const totalMs = malwareMs + extractMs + enrichMs;

  const jobId = enriched.linkedAiJobId;
  const job = jobId ? (await service /* access via repo indirectly */ as never) : null;
  void job;
  const pack = enriched.reviewPackage;
  const enrichment = pack?.enrichment as Record<string, unknown> | null;
  const routing = pack?.modelRouting as {
    actualModel?: string;
    usedFallback?: boolean;
    fallbackReason?: string | null;
    requestedProfile?: string;
  } | null;

  const schemaOk = Boolean(enrichment);
  const modelOk = pack?.enrichmentStatus === 'complete' && !(pack?.risks || []).some((r: string) =>
    String(r).includes('model error'),
  );
  const row: CaseRow = {
    name: opts.name,
    fixture: opts.fixture,
    ok: schemaOk && enriched.status === 'ReadyForReview',
    modelOk,
    malwareMs,
    malwareStatus: staged.malwareScanStatus,
    extractMs,
    ocrMs,
    redactMs,
    enrichMs,
    totalMs,
    schemaValid: schemaOk,
    confidence: enrichment?.confidence ?? pack?.classification?.confidence ?? null,
    requestedProfile: routing?.requestedProfile ?? null,
    actualModel: routing?.actualModel ?? null,
    usedFallback: routing?.usedFallback ?? false,
    fallbackReason: routing?.fallbackReason ?? null,
    documentType: pack?.classification?.proposedType ?? null,
    estimatedMannyReviewMinutes: pack?.estimatedMannyReviewMinutes ?? null,
    estimatedMannyTimeSavedMinutes: pack?.estimatedMannyTimeSavedMinutes ?? null,
    outputChars: enrichment ? JSON.stringify(enrichment).length : 0,
    noFileMovement: pack?.noFileMovement === true,
    noRecordWrites: pack?.noRecordWrites === true,
    draftOnly: pack?.draftOnly === true,
    risks: pack?.risks ?? [],
  };
  (evidence.cases as CaseRow[]).push(row);
  console.log(
    JSON.stringify({
      name: row.name,
      ok: row.ok,
      totalMs: row.totalMs,
      enrichMs: row.enrichMs,
      model: row.actualModel,
      type: row.documentType,
    }),
  );
}

console.log('Phase 4B-2 live document benchmark starting…', { FAST, DEEP, health });

// Fast path cases
await runDocCase({ name: 'fast_invoice_classify', fixture: 'pdf_text' });
await runDocCase({ name: 'fast_invoice_fields_summary', fixture: 'csv_formula' });
await runDocCase({ name: 'fast_missing_signature', fixture: 'missing_signature' });
await runDocCase({ name: 'fast_deadline_doc', fixture: 'txt' });
await runDocCase({ name: 'fast_docx_routine', fixture: 'docx_missing_signature' });

// Deep path cases
await runDocCase({ name: 'deep_agreement', fixture: 'agreement_deep' });
await runDocCase({ name: 'deep_financing', fixture: 'financing_deep' });
await runDocCase({ name: 'deep_docx_agreement', fixture: 'docx_agreement' });

// Version compare (deterministic, no ollama required for compare itself)
{
  const a = createFixture('txt');
  const b = createFixture('prior_version');
  const sa = await service.stageDocument({
    originalFilename: a.filename,
    contentBase64: a.bytes.toString('base64'),
    declaredMime: a.mime,
  });
  const sb = await service.stageDocument({
    originalFilename: b.filename,
    contentBase64: b.bytes.toString('base64'),
    declaredMime: b.mime,
  });
  await service.processStagedDocument({ stagedFileId: sa.stagedFileId, clientLabel: 'Bench' });
  await service.processStagedDocument({ stagedFileId: sb.stagedFileId, clientLabel: 'Bench' });
  const t0 = Date.now();
  const cmp = service.compareStagedDocumentVersions(sa.stagedFileId, sb.stagedFileId);
  (evidence.cases as CaseRow[]).push({
    name: 'version_compare',
    ok: cmp.draftOnly && cmp.filesDeleted === false,
    totalMs: Date.now() - t0,
    sameFamily: cmp.likelySameDocumentFamily,
    amountsChanged: cmp.amountsChanged.length,
  });
}

const cases = evidence.cases as CaseRow[];
const enrichCases = cases.filter((c) => typeof c.enrichMs === 'number');
const schemaRate =
  enrichCases.length === 0
    ? 0
    : enrichCases.filter((c) => c.schemaValid).length / enrichCases.length;
const fastCases = enrichCases.filter(
  (c) => String(c.requestedProfile || '').includes('Fast') || String(c.name).startsWith('fast_'),
);
const deepCases = enrichCases.filter(
  (c) => String(c.requestedProfile || '').includes('Deep') || String(c.name).startsWith('deep_'),
);

evidence.finishedAt = new Date().toISOString();
evidence.summary = {
  schemaValidationRate: schemaRate,
  fastCount: fastCases.length,
  deepCount: deepCases.length,
  fastAvgTotalMs:
    fastCases.reduce((s, c) => s + Number(c.totalMs || 0), 0) / Math.max(1, fastCases.length),
  deepAvgTotalMs:
    deepCases.reduce((s, c) => s + Number(c.totalMs || 0), 0) / Math.max(1, deepCases.length),
  fastAvgEnrichMs:
    fastCases.reduce((s, c) => s + Number(c.enrichMs || 0), 0) / Math.max(1, fastCases.length),
  deepAvgEnrichMs:
    deepCases.reduce((s, c) => s + Number(c.enrichMs || 0), 0) / Math.max(1, deepCases.length),
  fallbackCount: enrichCases.filter((c) => c.usedFallback).length,
  allNoWrites: enrichCases.every((c) => c.noRecordWrites !== false),
  flags: service.getFlags(),
};

const outPath = join(evidenceDir, 'live-benchmark.json');
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log('Wrote', outPath);
console.log(JSON.stringify(evidence.summary, null, 2));

rmSync(dataDir, { recursive: true, force: true });
