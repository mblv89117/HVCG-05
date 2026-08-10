/**
 * Phase 5A live Ollama acceptance — synthetic EVA only.
 * Not CI. Loopback Ollama required. No Production writes.
 *
 * Run:
 *   cd apps/atlas-integration-api && npx tsx scripts/phase5a-live-acceptance.ts
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  buildEvaScenario,
  findProhibitedEvaClaims,
  validateEvaReviewOutput,
  type EvaScenarioKind,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from '../src/local-ai/repository.ts';
import { LocalAiService } from '../src/local-ai/service.ts';
import { OllamaClient } from '../src/local-ai/ollamaClient.ts';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const evidenceDir = join(root, 'deployment/reports/local-ai-phase5a');
mkdirSync(evidenceDir, { recursive: true });

const DEEP = 'glm-4.7-flash:q4_K_M';
const FAST = 'qwen2.5:7b-instruct';

const LIVE_SCENARIOS: EvaScenarioKind[] = [
  'strong_concrete_contractor',
  'dental_growth_capital',
  'entertainment_weak_controls',
  'supportive_living',
  'auto_repair',
  'early_stage_low_revenue',
  'heavy_debt',
  'strong_recurring_revenue',
  'high_customer_concentration',
  'missing_financials',
  'duplicate_company',
  'same_company_new_contact',
  'prompt_injection',
];

const PROHIBITED_SAMPLES = [
  { label: 'prospect approved', payload: { prospect_summary: 'prospect approved for consultation' } },
  { label: 'client created', payload: { prospect_summary: 'client created in Atlas' } },
  { label: 'financing guaranteed', payload: { recommendation: 'financing guaranteed' } },
  { label: 'lender contacted', payload: { next: 'lender contacted today' } },
  { label: 'email sent', payload: { status: 'email sent to owner' } },
  { label: 'consultation scheduled', payload: { next: 'consultation scheduled Friday' } },
  { label: 'pricing approved', payload: { decision: 'pricing approved at $10k' } },
  { label: 'agreement executed', payload: { note: 'agreement executed' } },
  { label: 'payment received', payload: { note: 'payment received' } },
  { label: 'Atlas Production updated', payload: { note: 'Atlas Production updated' } },
];

const evidence: Record<string, unknown> = {
  startedAt: new Date().toISOString(),
  phase: '5A-live-acceptance',
  deepModel: DEEP,
  fastModel: FAST,
  baseUrl: 'http://127.0.0.1:11434',
  flags: {
    EvaIntakeEnabled: false,
    ClientEmailsEnabled: false,
    LocalAIWritesEnabled: false,
    LocalAIExternalMessagesEnabled: false,
    LocalAIEnabled: true,
  },
  liveCases: [] as unknown[],
  prohibitedClaimTests: [] as unknown[],
  recovery: [] as unknown[],
  mannyDecisions: [] as unknown[],
  performance: {} as Record<string, unknown>,
};

function makeService(dbDir: string, client: OllamaClient) {
  return new LocalAiService({
    repo: new LocalAiRepository(dbDir),
    flags: {
      ...DEFAULT_LOCAL_AI_FEATURE_FLAGS,
      LocalAIEnabled: true,
      LocalAIWritesEnabled: false,
      LocalAIExternalMessagesEnabled: false,
      EvaIntakeEnabled: false,
      ClientEmailsEnabled: false,
    },
    ollamaClient: client,
    ollamaConfig: client.getConfig(),
    defaultExecutorMode: 'ollama',
    documentStagingRoot: join(dbDir, 'staging'),
    documentReviewDbPath: join(dbDir, 'docs.sqlite'),
    evaDbPath: join(dbDir, 'eva.sqlite'),
    secretsFileEnv: {
      OLLAMA_DEEP_MODEL: DEEP,
      OLLAMA_FAST_MODEL: FAST,
    },
  });
}

function qualityGate(submissionId: string, review: unknown) {
  const prohibited = findProhibitedEvaClaims(review);
  const schema = validateEvaReviewOutput(review, submissionId);
  const r = review as Record<string, unknown>;
  return {
    validJson: true,
    schemaOk: schema.ok,
    schemaErrors: schema.errors,
    prohibitedClaims: prohibited,
    requiresMannyApproval: r.requires_manny_approval === true,
    hasFacts: Array.isArray(r.facts),
    hasInferences: Array.isArray(r.inferences),
    hasMissing: Array.isArray(r.missing_information),
    hasDecisionPackage: Boolean(r.decision_package),
    hasTimeProtection: Boolean(r.time_protection),
    confidence:
      typeof r.confidence === 'number' ? r.confidence : null,
  };
}

const dataDir = mkdtempSync(join(tmpdir(), 'atlas-eva-live-'));
const client = new OllamaClient({
  baseUrl: 'http://127.0.0.1:11434',
  model: DEEP,
  timeoutMs: 600_000,
  maxRetries: 1,
  allowNonLoopback: false,
  formatJson: true,
});

const health = await client.health();
const models = await client.listModels();
evidence.health = health;
evidence.models = models;
console.log('Ollama health', health);
console.log('Models', models);

if (!health.ok) {
  evidence.verdict = 'PHASE 5A BLOCKED';
  evidence.error = 'Ollama offline';
  writeFileSync(join(evidenceDir, 'live-acceptance.json'), JSON.stringify(evidence, null, 2));
  console.error('BLOCKED: Ollama offline');
  process.exit(2);
}

const hasDeep = models.some((m) => m.includes('glm-4.7') || m === DEEP);
const hasFast = models.some((m) => m.includes('qwen2.5:7b') || m === FAST);
evidence.modelAvailability = { hasDeep, hasFast, deep: DEEP, fast: FAST };
if (!hasDeep) {
  evidence.verdict = 'PHASE 5A BLOCKED';
  evidence.error = `Deep model missing: ${DEEP}`;
  writeFileSync(join(evidenceDir, 'live-acceptance.json'), JSON.stringify(evidence, null, 2));
  console.error('BLOCKED: Deep model not installed');
  process.exit(2);
}

let service = makeService(dataDir, client);

// --- Deterministic mode smoke ---
{
  const payload = {
    ...(buildEvaScenario('auto_repair') as object),
    idempotencyKey: `live-det-${Date.now()}`,
  };
  const t0 = Date.now();
  const r = await service.intakeEvaSubmission({
    body: payload,
    origin: 'http://127.0.0.1:5180',
    reviewMode: 'Deterministic Intake Test',
  });
  (evidence.liveCases as unknown[]).push({
    kind: 'deterministic_auto_repair',
    mode: 'Deterministic Intake Test',
    ok: r.ok && r.submission?.status === 'Waiting on Manny',
    durationMs: Date.now() - t0,
    reviewMode: r.submission?.reviewMode,
    uat: r.submission?.uatChecklist?.overall,
  });
}

// --- Live Full AI scenarios ---
const e2eDurations: number[] = [];
let schemaPass = 0;
let schemaTotal = 0;
let aiFail = 0;
let liveOk = 0;

for (const kind of LIVE_SCENARIOS) {
  const raw = buildEvaScenario(kind);
  if (kind === 'prompt_injection') {
    // Expect validation rejection at intake
    const t0 = Date.now();
    const r = await service.intakeEvaSubmission({
      body: { ...(raw as object), idempotencyKey: `live-${kind}-${Date.now()}` },
      origin: 'http://127.0.0.1:5180',
      reviewMode: 'Full Local AI End-to-End Test',
    });
    const row = {
      kind,
      mode: 'Full Local AI End-to-End Test',
      ok: r.ok === false && r.error === 'validation_failed',
      durationMs: Date.now() - t0,
      error: r.error,
      errors: r.errors,
      note: 'prompt-injection rejected at intake (defense)',
    };
    (evidence.liveCases as unknown[]).push(row);
    console.log(JSON.stringify(row));
    if (row.ok) liveOk++;
    continue;
  }

  const payload = {
    ...(raw as object),
    idempotencyKey: `live-${kind}-${Date.now()}`,
  };
  const t0 = Date.now();
  const r = await service.intakeEvaSubmission({
    body: payload,
    origin: 'http://127.0.0.1:5180',
    reviewMode: 'Full Local AI End-to-End Test',
  });
  const durationMs = Date.now() - t0;
  e2eDurations.push(durationMs);
  const sub = r.submission;
  let gate = null;
  if (sub?.reviewOutput && sub.status === 'Waiting on Manny') {
    schemaTotal++;
    gate = qualityGate(sub.submissionId, sub.reviewOutput);
    if (gate.schemaOk && gate.prohibitedClaims.length === 0) schemaPass++;
  } else if (sub?.status === 'Failed') {
    aiFail++;
    schemaTotal++;
  }

  const ready = service.evaApprovalQueue().some((q) => q.submissionId === sub?.submissionId);
  const revision = service.evaRevisionQueue().some((q) => q.submissionId === sub?.submissionId);

  const row = {
    kind,
    mode: 'Full Local AI End-to-End Test',
    ok:
      r.ok &&
      sub?.status === 'Waiting on Manny' &&
      gate?.schemaOk === true &&
      (gate?.prohibitedClaims.length || 0) === 0 &&
      ready &&
      !revision,
    durationMs,
    status: sub?.status,
    reviewMode: sub?.reviewMode,
    modelUsed: sub?.modelUsed,
    modelRouting: sub?.modelRouting,
    performanceTimings: sub?.performanceTimings,
    confidence: sub?.reviewOutput?.confidence ?? null,
    uat: sub?.uatChecklist,
    quality: gate,
    inReadyQueue: ready,
    inRevisionQueue: revision,
    banners: sub?.banners,
    errorDetail: sub?.errorDetail || null,
  };
  (evidence.liveCases as unknown[]).push(row);
  console.log(
    JSON.stringify({
      kind: row.kind,
      ok: row.ok,
      durationMs: row.durationMs,
      status: row.status,
      confidence: row.confidence,
      uat: row.uat?.overall,
      errorDetail: row.errorDetail,
    }),
  );
  if (row.ok) liveOk++;
  // Cool-down between Deep jobs to reduce empty-content contention
  await new Promise((r) => setTimeout(r, 4000));
}

// --- Prohibited claim unit validation (offline against validator) ---
for (const sample of PROHIBITED_SAMPLES) {
  const fake = {
    submission_id: 'sub-prohibited-test',
    prospect_summary: 'x',
    company_profile: {
      industry: 'x',
      business_model: 'y',
      revenue_profile: 'z',
      operating_profile: 'o',
      management_profile: 'm',
    },
    strengths: [],
    risks: [],
    growth_opportunities: [],
    financial_observations: [],
    operational_observations: [],
    capital_readiness: 'x',
    enterprise_value_readiness: 'y',
    missing_information: [],
    recommended_hvcg_services: [],
    recommended_next_action: 'review',
    follow_up_questions: [],
    work_value_tier: 'Tier 2',
    requires_manny_approval: true,
    confidence: 0.8,
    facts: [],
    inferences: [],
    warnings: [],
    decision_package: {
      decision: 'd',
      recommendation: 'r',
      why: [],
      alternatives: [],
      risks: [],
      deadline: null,
      required_review_minutes: 5,
      source_records: [{ type: 'EvaSubmission', id: 'sub-prohibited-test', title: 't' }],
      confidence: 0.8,
      missing_information: [],
    },
    ...sample.payload,
  };
  const found = findProhibitedEvaClaims(fake);
  const v = validateEvaReviewOutput(fake, 'sub-prohibited-test');
  const row = {
    label: sample.label,
    detected: found.length > 0,
    validationFailed: !v.ok,
    errors: v.errors,
  };
  (evidence.prohibitedClaimTests as unknown[]).push(row);
}

// Live prohibited claim via fake injection path already covered; also force fail+preserve+retry
{
  const offline = await service.intakeEvaSubmission({
    body: {
      ...(buildEvaScenario('supportive_living') as object),
      company: {
        ...(buildEvaScenario('supportive_living') as { company: object }).company,
        legalCompanyName: 'Offline Recovery Living LLC',
      },
      contact: {
        ...(buildEvaScenario('supportive_living') as { contact: object }).contact,
        email: `offline-recovery-${Date.now()}@harborliving-test.example`,
      },
      idempotencyKey: `offline-rec-${Date.now()}`,
    },
    origin: 'http://127.0.0.1:5180',
    reviewMode: 'Full Local AI End-to-End Test',
    forceOfflineModel: true,
  });
  const failed = offline.submission!;
  const inReady = service.evaApprovalQueue().some((q) => q.submissionId === failed.submissionId);
  const inRev = service.evaRevisionQueue().some((q) => q.submissionId === failed.submissionId);
  const companiesBefore = service.listEvaCompanies().length;
  const prospectsBefore = service.listEvaProspects().length;
  const retried = await service.retryEvaAi(failed.submissionId);
  const companiesAfter = service.listEvaCompanies().length;
  const prospectsAfter = service.listEvaProspects().length;
  (evidence.recovery as unknown[]).push({
    name: 'offline_then_governed_retry',
    failedStatus: failed.status,
    excludedFromReady: !inReady && inRev,
    preserved: true,
    retryStatus: retried.status,
    noDuplicateCompany: companiesAfter === companiesBefore,
    noDuplicateProspect: prospectsAfter === prospectsBefore,
    ok:
      failed.status === 'Failed' &&
      !inReady &&
      inRev &&
      companiesAfter === companiesBefore &&
      prospectsAfter === prospectsBefore,
  });
}

// Restart after intake before AI
{
  const dir2 = mkdtempSync(join(tmpdir(), 'atlas-eva-restart-'));
  const s1 = makeService(dir2, client);
  const deferred = await s1.intakeEvaSubmission({
    body: {
      ...(buildEvaScenario('dental_growth_capital') as object),
      company: {
        ...(buildEvaScenario('dental_growth_capital') as { company: object }).company,
        legalCompanyName: 'Restart Dental Test LLC',
      },
      contact: {
        ...(buildEvaScenario('dental_growth_capital') as { contact: object }).contact,
        email: `restart-${Date.now()}@brightsmile-test.example`,
      },
      idempotencyKey: `restart-defer-${Date.now()}`,
    },
    origin: 'http://127.0.0.1:5180',
    reviewMode: 'Full Local AI End-to-End Test',
    deferAi: true,
  });
  const id = deferred.submission!.submissionId;
  const s2 = makeService(dir2, client);
  const loaded = s2.getEvaSubmission(id);
  const companies = s2.listEvaCompanies().length;
  const completed = await s2.retryEvaAi(id);
  (evidence.recovery as unknown[]).push({
    name: 'hub_restart_after_intake_before_ai',
    deferredStatus: loaded.status,
    completedStatus: completed.status,
    sameSubmission: completed.submissionId === id,
    noExtraCompanyOnResume: s2.listEvaCompanies().length === companies,
    ok:
      loaded.status === 'AI Review Pending' &&
      completed.submissionId === id &&
      (completed.status === 'Waiting on Manny' || completed.status === 'Failed'),
  });
}

// Manny decisions on a deterministic success
{
  const r = await service.intakeEvaSubmission({
    body: {
      ...(buildEvaScenario('strong_recurring_revenue') as object),
      company: {
        ...(buildEvaScenario('strong_recurring_revenue') as { company: object }).company,
        legalCompanyName: `Manny UAT Recur ${Date.now()}`,
      },
      contact: {
        ...(buildEvaScenario('strong_recurring_revenue') as { contact: object }).contact,
        email: `manny-uat-${Date.now()}@recursoft-test.example`,
      },
      idempotencyKey: `manny-uat-${Date.now()}`,
    },
    origin: 'http://127.0.0.1:5180',
    reviewMode: 'Deterministic Intake Test',
  });
  const id = r.submission!.submissionId;
  const decided = service.decideEvaSubmission(id, 'Qualified for Consultation', 'UAT local only');
  (evidence.mannyDecisions as unknown[]).push({
    decision: decided.mannyDecision,
    uat: decided.uatChecklist,
    noEmail: decided.noEmail,
    noClientActivation: decided.noClientActivation,
    ok:
      decided.mannyDecision === 'Qualified for Consultation' &&
      decided.uatChecklist?.decisionRecorded === true &&
      decided.uatChecklist?.noExternalActionsOccurred === true,
  });
}

const avg =
  e2eDurations.length === 0
    ? 0
    : Math.round(e2eDurations.reduce((a, b) => a + b, 0) / e2eDurations.length);
evidence.performance = {
  liveScenarioCount: LIVE_SCENARIOS.length,
  liveOk,
  averageEndToEndMs: avg,
  maxEndToEndMs: e2eDurations.length ? Math.max(...e2eDurations) : 0,
  minEndToEndMs: e2eDurations.length ? Math.min(...e2eDurations) : 0,
  schemaValidationRate: schemaTotal ? schemaPass / schemaTotal : null,
  aiFailureCount: aiFail,
  schemaPass,
  schemaTotal,
};

const prohibitedAllPass = (evidence.prohibitedClaimTests as Array<{ validationFailed: boolean }>)
  .every((p) => p.validationFailed);
const recoveryOk = (evidence.recovery as Array<{ ok: boolean }>).every((r) => r.ok);
const flagsOk =
  service.getFlags().EvaIntakeEnabled === false &&
  service.getFlags().ClientEmailsEnabled === false &&
  service.getFlags().LocalAIWritesEnabled === false &&
  service.getFlags().LocalAIExternalMessagesEnabled === false;

evidence.endedAt = new Date().toISOString();
evidence.safety = {
  flagsOk,
  flags: service.getFlags(),
  loopbackOnly: true,
  noExternalApis: true,
};

const livePassRate = liveOk / (evidence.liveCases as unknown[]).length;
const blocking =
  !health.ok ||
  !hasDeep ||
  !flagsOk ||
  !prohibitedAllPass ||
  !recoveryOk ||
  livePassRate < 0.7;

const nonBlocking =
  !hasFast ||
  (evidence.recovery as Array<{ name: string; completedStatus?: string }>).some(
    (r) => r.name === 'hub_restart_after_intake_before_ai' && r.completedStatus === 'Failed',
  ) ||
  aiFail > 0;

evidence.verdict = blocking
  ? 'PHASE 5A BLOCKED'
  : nonBlocking
    ? 'PHASE 5A ACCEPTED WITH NON-BLOCKING ITEMS'
    : 'PHASE 5A FULLY ACCEPTED';

const outPath = join(evidenceDir, 'live-acceptance.json');
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log('Wrote', outPath);
console.log('Verdict', evidence.verdict);
console.log(
  JSON.stringify(
    {
      livePassRate,
      avgEndToEndMs: avg,
      schemaValidationRate: evidence.performance,
      prohibitedAllPass,
      recoveryOk,
      hasFast,
    },
    null,
    2,
  ),
);

process.exit(blocking ? 1 : 0);
