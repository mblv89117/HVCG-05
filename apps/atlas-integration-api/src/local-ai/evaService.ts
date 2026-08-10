/**
 * Phase 5A — Local synthetic EVA intake orchestration.
 * EvaIntakeEnabled stays false — sandbox uses LocalAIEnabled only.
 * No email, no Production writes, no client activation.
 */

import { randomUUID } from 'node:crypto';
import {
  EVA_DO_NOT_CONTACT,
  EVA_MANNY_DECISIONS,
  EVA_SOURCE,
  EVA_SYNTHETIC_BANNER,
  MANNY_OWNER,
  buildDeterministicEvaReview,
  buildEvaScenario,
  buildEvaUatChecklist,
  extractDomain,
  hashPayload,
  matchCompanies,
  matchContacts,
  normalizeAddress,
  normalizeEmail,
  normalizePhone,
  validateEvaReviewOutput,
  validateEvaSubmissionPayload,
  type EvaCompanyRecord,
  type EvaContactRecord,
  type EvaMannyDecision,
  type EvaModelRoutingEvidence,
  type EvaPerformanceTimings,
  type EvaProspectRecord,
  type EvaReviewMode,
  type EvaReviewOutput,
  type EvaScenarioKind,
  type EvaSubmissionPayload,
  type EvaSubmissionRecord,
} from '@hvcg/atlas-integration-core';
import type { OllamaClient } from './ollamaClient.ts';
import {
  EvaStore,
  newSubmissionShell,
  resolveEvaDbPath,
} from './evaStore.ts';

const PRODUCTION_ORIGIN_MARKERS = [
  'azurestaticapps.net',
  'highvaluecapitalgroup.com',
  'hvcg.com',
];

const DEEP_MODEL_DEFAULT = 'glm-4.7-flash:q4_K_M';
const FAST_MODEL_DEFAULT = 'qwen2.5:7b-instruct';

export function resolveEvaReviewMode(opts: {
  reviewMode?: string | null;
  skipAi?: boolean;
}): EvaReviewMode {
  if (
    opts.reviewMode === 'Deterministic Intake Test' ||
    opts.reviewMode === 'Full Local AI End-to-End Test'
  ) {
    return opts.reviewMode;
  }
  // Legacy alias only — callers should pass reviewMode explicitly
  if (opts.skipAi === true) return 'Deterministic Intake Test';
  return 'Full Local AI End-to-End Test';
}

export function isApprovedEvaOrigin(origin: string | null | undefined): boolean {
  if (!origin) return true; // same-origin / curl local without Origin header
  const o = origin.toLowerCase();
  if (PRODUCTION_ORIGIN_MARKERS.some((m) => o.includes(m))) return false;
  try {
    const u = new URL(origin);
    const host = u.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local')
    );
  } catch {
    return false;
  }
}

export class EvaService {
  readonly store: EvaStore;
  private ollama: OllamaClient | null;
  private deepModel: string;
  private fastModel: string | null;
  private localAiEnabled: boolean;

  constructor(opts: {
    repoRoot: string;
    env?: Record<string, string | undefined>;
    ollamaClient?: OllamaClient | null;
    deepModel?: string;
    fastModel?: string | null;
    localAiEnabled?: boolean;
    dbPath?: string;
  }) {
    const env = opts.env || process.env;
    const dbPath = opts.dbPath || resolveEvaDbPath(env, opts.repoRoot);
    this.store = new EvaStore(dbPath);
    this.ollama = opts.ollamaClient || null;
    this.deepModel = opts.deepModel || env.OLLAMA_DEEP_MODEL || DEEP_MODEL_DEFAULT;
    this.fastModel = opts.fastModel || env.OLLAMA_FAST_MODEL || FAST_MODEL_DEFAULT;
    this.localAiEnabled = opts.localAiEnabled !== false;
  }

  setOllama(client: OllamaClient | null) {
    this.ollama = client;
  }

  setLocalAiEnabled(v: boolean) {
    this.localAiEnabled = v;
  }

  listScenarios() {
    const kinds: EvaScenarioKind[] = [
      'strong_concrete_contractor',
      'dental_growth_capital',
      'entertainment_weak_controls',
      'supportive_living',
      'auto_repair',
      'early_stage_low_revenue',
      'duplicate_company',
      'duplicate_contact',
      'same_company_new_contact',
      'conflicting_company_match',
      'missing_financials',
      'high_customer_concentration',
      'heavy_debt',
      'strong_recurring_revenue',
      'key_person_dependency',
      'prompt_injection',
      'malformed_input',
    ];
    return kinds.map((k) => ({
      kind: k,
      banners: { syntheticEva: EVA_SYNTHETIC_BANNER, doNotContact: EVA_DO_NOT_CONTACT },
      payload: buildEvaScenario(k),
    }));
  }

  async intake(opts: {
    body: unknown;
    origin?: string | null;
    correlationId?: string;
    clientKey?: string;
    /** @deprecated Prefer reviewMode */
    skipAi?: boolean;
    reviewMode?: EvaReviewMode | string;
    /** Stop after prospect creation — for restart-recovery tests */
    deferAi?: boolean;
    forceOfflineModel?: boolean;
  }): Promise<{
    ok: boolean;
    status: number;
    duplicate?: boolean;
    submission?: EvaSubmissionRecord;
    error?: string;
    errors?: string[];
    correlationId: string;
  }> {
    const correlationId = opts.correlationId || randomUUID();
    const reviewMode = resolveEvaReviewMode({
      reviewMode: opts.reviewMode,
      skipAi: opts.skipAi,
    });
    const timings: EvaPerformanceTimings = {
      intakeValidationMs: null,
      matchingMs: null,
      fastPreliminaryMs: null,
      deepReviewMs: null,
      totalEndToEndMs: null,
      mannyReviewEstimateMinutes: null,
      estimatedTimeSavedMinutes: null,
    };
    const e2eStart = Date.now();

    if (!isApprovedEvaOrigin(opts.origin)) {
      this.store.recordFailure({
        correlationId,
        code: 'production_origin_rejected',
        detail: `Origin rejected during Phase 5A: ${opts.origin}`,
        preserved: false,
      });
      this.store.audit({
        correlationId,
        actor: 'system',
        action: 'eva_intake_rejected_origin',
        detail: String(opts.origin),
      });
      return {
        ok: false,
        status: 403,
        error: 'production_origin_rejected',
        correlationId,
      };
    }

    if (!this.store.checkRateLimit(opts.clientKey || 'local', 30, 60_000)) {
      return {
        ok: false,
        status: 429,
        error: 'rate_limited',
        correlationId,
      };
    }

    let rawSize = 0;
    try {
      rawSize = Buffer.byteLength(JSON.stringify(opts.body || {}), 'utf8');
    } catch {
      return { ok: false, status: 400, error: 'invalid_json', correlationId };
    }
    if (rawSize > 200_000) {
      this.store.recordFailure({
        correlationId,
        code: 'payload_too_large',
        detail: `size=${rawSize}`,
        preserved: false,
      });
      return { ok: false, status: 413, error: 'payload_too_large', correlationId };
    }

    const validationStart = Date.now();
    const validated = validateEvaSubmissionPayload(opts.body);
    timings.intakeValidationMs = Date.now() - validationStart;
    if (!validated.ok || !validated.payload) {
      this.store.recordFailure({
        correlationId,
        code: 'validation_failed',
        detail: validated.errors.join('; '),
        preserved: false,
      });
      this.store.audit({
        correlationId,
        actor: 'system',
        action: 'eva_validation_failed',
        detail: validated.errors.join('; '),
      });
      return {
        ok: false,
        status: 400,
        error: 'validation_failed',
        errors: validated.errors,
        correlationId,
      };
    }

    const payload = validated.payload;
    const payloadHash = hashPayload(payload);
    const idempotencyKey =
      payload.idempotencyKey ||
      `auto:${payloadHash}:${payload.contact.email}:${payload.company.legalCompanyName}`;

    const existing = this.store.getByIdempotencyKey(idempotencyKey);
    if (existing) {
      this.store.audit({
        submissionId: existing.submissionId,
        correlationId,
        actor: 'system',
        action: 'eva_idempotent_replay',
        detail: 'Repeated browser retry / duplicate submission ID',
      });
      return {
        ok: true,
        status: 200,
        duplicate: true,
        submission: existing,
        correlationId: existing.correlationId,
      };
    }

    let submission = newSubmissionShell({
      payload,
      payloadHash,
      idempotencyKey,
      correlationId,
      reviewMode,
    });
    submission.status = 'Validating';
    submission.performanceTimings = { ...timings };
    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId: submission.submissionId,
      correlationId,
      actor: 'sandbox',
      action: 'eva_submission_received',
      detail: `${EVA_SYNTHETIC_BANNER}; ${EVA_DO_NOT_CONTACT}; reviewMode=${reviewMode}`,
      payload: { reviewMode },
    });

    // Duplicate matching
    const matchStart = Date.now();
    submission.status = 'Duplicate Check';
    const companyMatch = matchCompanies(payload, this.store.listCompanies());
    const contactMatch = matchContacts(
      payload,
      this.store.listContacts(),
      companyMatch.companyId,
    );
    timings.matchingMs = Date.now() - matchStart;
    submission.matchClass =
      companyMatch.matchClass === 'conflict requiring Manny'
        ? companyMatch.matchClass
        : contactMatch.matchClass === 'exact match' && companyMatch.matchClass === 'new record'
          ? 'probable match'
          : companyMatch.matchClass;
    submission.matchEvidence = [
      ...companyMatch.evidence.map((e) => `company:${e}`),
      ...contactMatch.evidence.map((e) => `contact:${e}`),
    ];

    const now = new Date().toISOString();
    let companyId = companyMatch.companyId;
    let contactId = contactMatch.contactId;

    if (!companyId || companyMatch.matchClass === 'conflict requiring Manny') {
      const company: EvaCompanyRecord = {
        companyId: randomUUID(),
        legalName: payload.company.legalCompanyName,
        dba: payload.company.dba ?? null,
        websiteDomain: extractDomain(payload.company.website) ?? null,
        emailDomain: extractDomain(payload.contact.email) ?? null,
        phoneNormalized: normalizePhone(payload.contact.phone) ?? null,
        addressNormalized: normalizeAddress(payload.company.address) ?? null,
        industry: payload.company.industry ?? null,
        synthetic: true,
        createdAt: now,
      };
      this.store.insertCompany(company);
      companyId = company.companyId;
      if (companyMatch.matchClass === 'conflict requiring Manny') {
        submission.matchEvidence.push(
          `conflict_kept_separate_from:${companyMatch.companyId}`,
        );
      }
    } else if (
      companyMatch.matchClass === 'new record' ||
      companyMatch.matchClass === 'possible match'
    ) {
      if (!companyId) {
        const company: EvaCompanyRecord = {
          companyId: randomUUID(),
          legalName: payload.company.legalCompanyName,
          dba: payload.company.dba ?? null,
          websiteDomain: extractDomain(payload.company.website) ?? null,
          emailDomain: extractDomain(payload.contact.email) ?? null,
          phoneNormalized: normalizePhone(payload.contact.phone) ?? null,
          addressNormalized: normalizeAddress(payload.company.address) ?? null,
          industry: payload.company.industry ?? null,
          synthetic: true,
          createdAt: now,
        };
        this.store.insertCompany(company);
        companyId = company.companyId;
      }
    }

    if (!contactId) {
      const contact: EvaContactRecord = {
        contactId: randomUUID(),
        companyId: companyId!,
        firstName: payload.contact.firstName,
        lastName: payload.contact.lastName,
        emailNormalized: normalizeEmail(payload.contact.email),
        phoneNormalized: normalizePhone(payload.contact.phone) ?? null,
        title: payload.contact.title ?? null,
        synthetic: true,
        createdAt: now,
      };
      this.store.insertContact(contact);
      contactId = contact.contactId;
    }

    const prospect: EvaProspectRecord = {
      prospectId: randomUUID(),
      companyId: companyId!,
      contactId: contactId!,
      submissionId: submission.submissionId,
      source: EVA_SOURCE,
      status: 'EVA Submitted',
      recommendedOwner: MANNY_OWNER,
      activeClient: false,
      synthetic: true,
      createdAt: now,
      updatedAt: now,
    };
    this.store.upsertProspect(prospect);

    submission.companyId = companyId!;
    submission.contactId = contactId!;
    submission.prospectId = prospect.prospectId;
    submission.status = 'Prospect Created';
    submission.performanceTimings = { ...timings };
    submission.updatedAt = new Date().toISOString();
    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId: submission.submissionId,
      correlationId,
      actor: 'system',
      action: 'eva_prospect_created',
      detail: `match=${submission.matchClass}; activeClient=false; source=${EVA_SOURCE}; reviewMode=${reviewMode}`,
      payload: {
        companyId,
        contactId,
        prospectId: prospect.prospectId,
        matchEvidence: submission.matchEvidence,
        reviewMode,
      },
    });

    if (opts.deferAi) {
      submission.status = 'AI Review Pending';
      submission.performanceTimings = {
        ...timings,
        totalEndToEndMs: Date.now() - e2eStart,
      };
      submission.uatChecklist = buildEvaUatChecklist(submission);
      submission.updatedAt = new Date().toISOString();
      this.store.upsertSubmission(submission);
      this.store.audit({
        submissionId: submission.submissionId,
        correlationId,
        actor: 'system',
        action: 'eva_ai_deferred',
        detail: 'Intake complete; AI deferred for restart-recovery test',
        payload: { reviewMode },
      });
      return { ok: true, status: 201, submission, correlationId };
    }

    if (reviewMode === 'Deterministic Intake Test') {
      submission.status = 'Waiting on Manny';
      submission.reviewOutput = buildDeterministicEvaReview(submission);
      submission.modelUsed = 'deterministic-local';
      submission.modelRouting = [
        {
          requestedProfile: 'Deterministic Local',
          requestedModel: 'deterministic-local',
          actualProfile: 'Deterministic Local',
          actualModel: 'deterministic-local',
          fallbackReason: null,
          queueDurationMs: 0,
          generationDurationMs: 0,
          totalDurationMs: 0,
          schemaResult: 'Passed',
          confidence: submission.reviewOutput.confidence,
          retryCount: 0,
        },
      ];
      timings.totalEndToEndMs = Date.now() - e2eStart;
      timings.mannyReviewEstimateMinutes =
        submission.reviewOutput.time_protection.estimated_manny_review_minutes;
      timings.estimatedTimeSavedMinutes =
        submission.reviewOutput.time_protection.estimated_manny_time_saved_minutes;
      submission.performanceTimings = { ...timings };
      submission.processingDurationMs = timings.totalEndToEndMs;
      submission.uatChecklist = buildEvaUatChecklist(submission);
      submission.updatedAt = new Date().toISOString();
      this.store.upsertSubmission(submission);
      this.store.audit({
        submissionId: submission.submissionId,
        correlationId,
        actor: 'system',
        action: 'eva_deterministic_review_completed',
        detail: `reviewMode=${reviewMode}`,
        payload: { reviewMode, uat: submission.uatChecklist.overall },
      });
      return { ok: true, status: 201, submission, correlationId };
    }

    // Full Local AI End-to-End Test
    submission = await this.runAiReview(submission, {
      forceOffline: opts.forceOfflineModel,
      useFastPreliminary: true,
      priorTimings: timings,
      e2eStart,
    });
    return { ok: true, status: 201, submission, correlationId };
  }

  async runAiReview(
    submission: EvaSubmissionRecord,
    opts?: {
      forceOffline?: boolean;
      useFastPreliminary?: boolean;
      priorTimings?: EvaPerformanceTimings;
      e2eStart?: number;
      /** Explicit governed retry after failure */
      isRetry?: boolean;
    },
  ): Promise<EvaSubmissionRecord> {
    const start = Date.now();
    const e2eStart = opts?.e2eStart ?? start;
    const timings: EvaPerformanceTimings = {
      intakeValidationMs: opts?.priorTimings?.intakeValidationMs ?? null,
      matchingMs: opts?.priorTimings?.matchingMs ?? null,
      fastPreliminaryMs: null,
      deepReviewMs: null,
      totalEndToEndMs: null,
      mannyReviewEstimateMinutes: null,
      estimatedTimeSavedMinutes: null,
    };
    const routing: EvaModelRoutingEvidence[] = [];
    let retryCount = opts?.isRetry
      ? (submission.modelRouting?.reduce((m, r) => Math.max(m, r.retryCount), 0) || 0) + 1
      : 0;

    // Idempotency: never auto-submit a second in-flight model job
    const jobKey = `${submission.submissionId}:ai-review`;
    if (
      submission.status === 'AI Review In Progress' &&
      submission.aiJobIdempotencyKey === jobKey &&
      !opts?.isRetry
    ) {
      this.store.audit({
        submissionId: submission.submissionId,
        correlationId: submission.correlationId,
        actor: 'system',
        action: 'eva_ai_duplicate_job_blocked',
        detail: 'Duplicate AI job request blocked by idempotency key',
      });
      return submission;
    }

    submission.reviewMode = submission.reviewMode || 'Full Local AI End-to-End Test';
    submission.status = 'AI Review Pending';
    submission.aiJobId = submission.aiJobId || randomUUID();
    submission.aiJobIdempotencyKey = jobKey;
    submission.updatedAt = new Date().toISOString();
    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId: submission.submissionId,
      correlationId: submission.correlationId,
      actor: 'system',
      action: 'eva_ai_job_created',
      detail: `aiJobId=${submission.aiJobId}; reviewMode=${submission.reviewMode}; retry=${retryCount}`,
    });

    let review: EvaReviewOutput = buildDeterministicEvaReview(submission);
    let modelUsed = this.deepModel;
    let failed = false;
    let failDetail: string | null = null;
    let schemaResult: 'Passed' | 'Failed' | 'Skipped' = 'Skipped';

    // Fast preliminary — missing info / completeness / basic risk flags only
    if (
      (opts?.useFastPreliminary !== false) &&
      this.fastModel &&
      this.ollama &&
      !opts?.forceOffline &&
      this.localAiEnabled
    ) {
      const fastStart = Date.now();
      const queueStart = Date.now();
      try {
        const fastClient = this.ollama.withModel(this.fastModel);
        const queued = Date.now() - queueStart;
        const result = await fastClient.chat({
          system: [
            'Phase 5A Fast preliminary only. Be brief.',
            'Return JSON only: { missing_information: string[], completeness_score: number, preliminary_risk_flags: string[], work_value_tier: string }.',
            'Never approve/reject, never claim email/client/financing.',
          ].join(' '),
          user: JSON.stringify({
            operation: 'identify_missing_information',
            submission_id: submission.submissionId,
            annualRevenue: submission.payload.financial.annualRevenue,
            ebitdaOrNetIncome: submission.payload.financial.ebitdaOrNetIncome,
            desiredCapital: submission.payload.businessProfile.desiredCapital,
            industry: submission.payload.company.industry,
          }),
          model: this.fastModel,
          timeoutMs: 120_000,
          numPredict: 256,
        });
        const genMs =
          result.totalDurationNs != null
            ? Math.round(result.totalDurationNs / 1e6)
            : Date.now() - fastStart;
        timings.fastPreliminaryMs = Date.now() - fastStart;
        let missing: string[] = [];
        try {
          const parsed = JSON.parse(result.rawContent) as {
            missing_information?: string[];
            preliminary_risk_flags?: string[];
          };
          missing = parsed.missing_information || [];
          if (missing.length) {
            review.missing_information = [
              ...new Set([...review.missing_information, ...missing]),
            ];
          }
          if (parsed.preliminary_risk_flags?.length) {
            review.warnings = [
              ...review.warnings,
              ...parsed.preliminary_risk_flags.map((f) => `fast_preliminary:${f}`),
            ];
          }
        } catch {
          /* keep deterministic missing info */
        }
        routing.push({
          requestedProfile: 'Fast Operations Model',
          requestedModel: this.fastModel,
          actualProfile: 'Fast Operations Model',
          actualModel: result.model || this.fastModel,
          fallbackReason: null,
          queueDurationMs: queued,
          generationDurationMs: genMs,
          totalDurationMs: timings.fastPreliminaryMs,
          schemaResult: 'Passed',
          confidence: null,
          retryCount,
        });
      } catch (err) {
        timings.fastPreliminaryMs = Date.now() - fastStart;
        routing.push({
          requestedProfile: 'Fast Operations Model',
          requestedModel: this.fastModel,
          actualProfile: 'Fast Operations Model',
          actualModel: this.fastModel,
          fallbackReason: err instanceof Error ? err.message : String(err),
          queueDurationMs: null,
          generationDurationMs: null,
          totalDurationMs: timings.fastPreliminaryMs,
          schemaResult: 'Failed',
          confidence: null,
          retryCount,
        });
        // Non-blocking — Deep still runs
      }
    }

    submission.status = 'AI Review In Progress';
    this.store.upsertSubmission(submission);

    if (this.ollama && this.localAiEnabled && !opts?.forceOffline) {
      const deepStart = Date.now();
      const queueStart = Date.now();
      const runDeepOnce = async () => {
        const deep = this.ollama!.withModel(this.deepModel);
        return deep.chat({
          system: [
            'You are Atlas Local AI Phase 5A EVA reviewer.',
            'Operation: review_eva_submission. Output compact JSON only.',
            'Required keys: submission_id, prospect_summary, company_profile, strengths, risks, growth_opportunities, financial_observations, operational_observations, capital_readiness, enterprise_value_readiness, missing_information, recommended_hvcg_services, recommended_next_action, follow_up_questions, work_value_tier, requires_manny_approval=true, confidence, facts, inferences, warnings, decision_package, time_protection.',
            'decision_package must include decision, recommendation, why, alternatives, risks, deadline, required_review_minutes, source_records, confidence, missing_information.',
            'time_protection must include estimated_manny_review_minutes, estimated_manny_time_saved_minutes, high_value_appearance, immediate_manny_attention, collect_more_info_before_manny, batch_recommended, likely_duplicate_or_low_value.',
            'Separate facts from inferences. Do not invent financial numbers.',
            'Never approve/reject, promise financing, claim email/client/meeting/pricing/Production updates.',
            `Banners: ${EVA_SYNTHETIC_BANNER}; ${EVA_DO_NOT_CONTACT}. Synthetic local test only.`,
          ].join(' '),
          user: JSON.stringify({
            operation: 'review_eva_submission',
            submission_id: submission.submissionId,
            company: submission.payload.company,
            contact: {
              firstName: submission.payload.contact.firstName,
              lastName: submission.payload.contact.lastName,
              title: submission.payload.contact.title,
              email: submission.payload.contact.email,
            },
            financial: submission.payload.financial,
            businessProfile: submission.payload.businessProfile,
            assessment: submission.payload.assessment,
            match_class: submission.matchClass,
            preliminary_missing: review.missing_information,
          }),
          model: this.deepModel,
          timeoutMs: Math.max(this.ollama!.getConfig().timeoutMs || 0, 600_000),
          numPredict: 4096,
        });
      };
      try {
        // If Fast timed out, give Ollama a brief cool-down before Deep
        if (
          routing.some(
            (r) =>
              r.requestedProfile === 'Fast Operations Model' &&
              r.schemaResult === 'Failed',
          )
        ) {
          await new Promise((r) => setTimeout(r, 3000));
        }
        const queued = Date.now() - queueStart;
        let result: Awaited<ReturnType<OllamaClient['chat']>>;
        try {
          result = await runDeepOnce();
        } catch (firstErr) {
          const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
          if (/empty content|timeout/i.test(msg)) {
            retryCount += 1;
            await new Promise((r) => setTimeout(r, 3000));
            result = await runDeepOnce();
          } else {
            throw firstErr;
          }
        }
        if (!result.rawContent?.trim()) {
          retryCount += 1;
          await new Promise((r) => setTimeout(r, 3000));
          result = await runDeepOnce();
        }
        const genMs =
          result.totalDurationNs != null
            ? Math.round(result.totalDurationNs / 1e6)
            : Date.now() - deepStart;
        timings.deepReviewMs = Date.now() - deepStart;
        modelUsed = result.model || this.deepModel;

        let parsed: unknown = null;
        try {
          parsed = JSON.parse(result.rawContent);
        } catch {
          failed = true;
          failDetail = 'malformed_model_json';
          schemaResult = 'Failed';
        }
        if (parsed) {
          const asObj = parsed as Record<string, unknown>;
          const modelDp = (asObj.decision_package || {}) as Record<string, unknown>;
          const mergedCandidate = {
            ...review,
            ...asObj,
            submission_id: submission.submissionId,
            requires_manny_approval: true,
            banner: review.banner,
            synthetic_eva_banner: EVA_SYNTHETIC_BANNER,
            do_not_contact: EVA_DO_NOT_CONTACT,
            draft_only: true,
            company_profile: {
              ...review.company_profile,
              ...((asObj.company_profile as object) || {}),
            },
            decision_package: {
              ...review.decision_package,
              ...modelDp,
              source_records:
                Array.isArray(modelDp.source_records) &&
                (modelDp.source_records as unknown[]).length > 0
                  ? modelDp.source_records
                  : review.decision_package.source_records,
            },
            time_protection: {
              ...review.time_protection,
              ...((asObj.time_protection as object) || {}),
            },
            facts: Array.isArray(asObj.facts) ? asObj.facts : review.facts,
            inferences: Array.isArray(asObj.inferences) ? asObj.inferences : review.inferences,
            strengths: Array.isArray(asObj.strengths) ? asObj.strengths : review.strengths,
            risks: Array.isArray(asObj.risks) ? asObj.risks : review.risks,
            growth_opportunities: Array.isArray(asObj.growth_opportunities)
              ? asObj.growth_opportunities
              : review.growth_opportunities,
            financial_observations: Array.isArray(asObj.financial_observations)
              ? asObj.financial_observations
              : review.financial_observations,
            operational_observations: Array.isArray(asObj.operational_observations)
              ? asObj.operational_observations
              : review.operational_observations,
            missing_information: Array.isArray(asObj.missing_information)
              ? asObj.missing_information
              : review.missing_information,
            recommended_hvcg_services: Array.isArray(asObj.recommended_hvcg_services)
              ? asObj.recommended_hvcg_services
              : review.recommended_hvcg_services,
            follow_up_questions: Array.isArray(asObj.follow_up_questions)
              ? asObj.follow_up_questions
              : review.follow_up_questions,
            warnings: [
              ...review.warnings,
              ...(Array.isArray(asObj.warnings) ? (asObj.warnings as string[]) : []),
            ],
          };
          const v = validateEvaReviewOutput(mergedCandidate, submission.submissionId);
          if (!v.ok || !v.output) {
            failed = true;
            failDetail = `model_output_invalid:${v.errors.join(',')}`;
            schemaResult = 'Failed';
          } else {
            schemaResult = 'Passed';
            review = v.output;
            if (review.confidence < 0.5) {
              review.warnings = [
                ...(review.warnings || []),
                'low_confidence_model_output',
              ];
              review.time_protection.immediate_manny_attention = false;
              review.time_protection.batch_recommended = true;
            }
          }
        }
        routing.push({
          requestedProfile: 'Deep Analysis Model',
          requestedModel: this.deepModel,
          actualProfile: 'Deep Analysis Model',
          actualModel: modelUsed,
          fallbackReason: failed ? failDetail : null,
          queueDurationMs: queued,
          generationDurationMs: genMs,
          totalDurationMs: timings.deepReviewMs,
          schemaResult,
          confidence: failed ? null : review.confidence,
          retryCount,
        });
      } catch (err) {
        failed = true;
        failDetail = err instanceof Error ? err.message : String(err);
        if (/timeout/i.test(failDetail)) failDetail = 'model_timeout';
        else if (/ECONNREFUSED|offline|fetch failed|unavailable/i.test(failDetail)) {
          failDetail = 'model_offline';
        }
        timings.deepReviewMs = Date.now() - deepStart;
        schemaResult = 'Failed';
        routing.push({
          requestedProfile: 'Deep Analysis Model',
          requestedModel: this.deepModel,
          actualProfile: 'Deep Analysis Model',
          actualModel: this.deepModel,
          fallbackReason: failDetail,
          queueDurationMs: null,
          generationDurationMs: null,
          totalDurationMs: timings.deepReviewMs,
          schemaResult: 'Failed',
          confidence: null,
          retryCount,
        });
      }
    } else if (opts?.forceOffline) {
      failed = true;
      failDetail = 'model_offline';
      schemaResult = 'Failed';
      routing.push({
        requestedProfile: 'Deep Analysis Model',
        requestedModel: this.deepModel,
        actualProfile: 'Deep Analysis Model',
        actualModel: this.deepModel,
        fallbackReason: 'model_offline',
        queueDurationMs: null,
        generationDurationMs: null,
        totalDurationMs: 0,
        schemaResult: 'Failed',
        confidence: null,
        retryCount,
      });
    } else {
      // No ollama client — fail Full AI mode honestly (do not silent-success)
      failed = true;
      failDetail = 'model_offline';
      schemaResult = 'Failed';
    }

    timings.totalEndToEndMs = Date.now() - e2eStart;
    timings.mannyReviewEstimateMinutes =
      review.time_protection?.estimated_manny_review_minutes ?? null;
    timings.estimatedTimeSavedMinutes =
      review.time_protection?.estimated_manny_time_saved_minutes ?? null;

    submission.processingDurationMs = Date.now() - start;
    submission.modelUsed = modelUsed;
    submission.modelRouting = routing;
    submission.performanceTimings = timings;
    submission.reviewOutput = review;

    if (failed) {
      submission.status = 'Failed';
      submission.errorDetail = failDetail;
      this.store.recordFailure({
        submissionId: submission.submissionId,
        correlationId: submission.correlationId,
        code: failDetail || 'ai_review_failed',
        detail: failDetail || 'ai_review_failed',
        preserved: true,
      });
      this.store.audit({
        submissionId: submission.submissionId,
        correlationId: submission.correlationId,
        actor: 'system',
        action: 'eva_ai_review_failed',
        detail: failDetail || 'ai_review_failed',
        payload: {
          reviewMode: submission.reviewMode,
          routing,
          schemaResult,
        },
      });
      submission.reviewOutput = buildDeterministicEvaReview(submission, {
        confidence: 0.35,
        warnings: [
          `AI review failed: ${failDetail}`,
          'Do not treat as successful AI review',
          'Excluded from Manny ready queue until governed retry/revision',
        ],
      });
      submission.uatChecklist = buildEvaUatChecklist(submission);
      submission.aiJobIdempotencyKey = null; // allow governed retry
      submission.updatedAt = new Date().toISOString();
      this.store.upsertSubmission(submission);
      return submission;
    }

    submission.status = 'Waiting on Manny';
    submission.errorDetail = null;
    submission.uatChecklist = buildEvaUatChecklist(submission);
    submission.updatedAt = new Date().toISOString();
    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId: submission.submissionId,
      correlationId: submission.correlationId,
      actor: 'Local AI Operations Agent',
      action: 'eva_ai_review_completed',
      detail: `model=${modelUsed}; durationMs=${submission.processingDurationMs}; schema=${schemaResult}; reviewMode=${submission.reviewMode}`,
      payload: {
        routing,
        timings,
        uat: submission.uatChecklist.overall,
      },
    });
    return submission;
  }

  decide(
    submissionId: string,
    decision: string,
    notes?: string,
  ): EvaSubmissionRecord {
    if (!(EVA_MANNY_DECISIONS as readonly string[]).includes(decision)) {
      throw Object.assign(new Error(`Invalid Manny decision: ${decision}`), {
        status: 400,
        code: 'invalid_decision',
      });
    }
    const submission = this.store.getSubmission(submissionId);
    if (!submission) {
      throw Object.assign(new Error('EVA submission not found'), {
        status: 404,
        code: 'not_found',
      });
    }
    const d = decision as EvaMannyDecision;
    // Local-only — never email / schedule / propose / Production lead / convert client
    submission.mannyDecision = d;
    submission.mannyDecisionAt = new Date().toISOString();
    submission.mannyNotes = notes || null;
    submission.updatedAt = submission.mannyDecisionAt;

    const prospect = this.store
      .listProspects()
      .find((p) => p.prospectId === submission.prospectId);
    if (prospect) {
      const map: Partial<Record<EvaMannyDecision, EvaProspectRecord['status']>> = {
        'Qualified for Consultation': 'Qualified',
        'Needs More Information': 'Needs More Information',
        'Not a Fit': 'Not a Fit',
        'Hold for Later': 'Hold',
        Duplicate: 'Duplicate',
        'Archive Synthetic Record': 'Archived',
        'Return AI Review for Revision': 'EVA Submitted',
      };
      prospect.status = map[d] || prospect.status;
      prospect.updatedAt = submission.mannyDecisionAt;
      prospect.activeClient = false;
      this.store.upsertProspect(prospect);
    }

    switch (d) {
      case 'Qualified for Consultation':
        submission.status = 'Qualified';
        break;
      case 'Needs More Information':
        submission.status = 'Needs More Information';
        break;
      case 'Not a Fit':
        submission.status = 'Not a Fit';
        break;
      case 'Hold for Later':
        submission.status = 'Hold';
        break;
      case 'Duplicate':
        submission.status = 'Duplicate';
        break;
      case 'Archive Synthetic Record':
        submission.status = 'Archived';
        break;
      case 'Return AI Review for Revision':
        submission.status = 'AI Review Pending';
        break;
      default:
        break;
    }

    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId,
      correlationId: submission.correlationId,
      actor: MANNY_OWNER,
      action: 'eva_manny_decision',
      detail: `${d}; noEmail; noClientActivation; noProductionRecords`,
      payload: { notes: notes || null },
    });
    submission.uatChecklist = buildEvaUatChecklist(submission);
    this.store.upsertSubmission(submission);
    return submission;
  }

  async retryAi(submissionId: string): Promise<EvaSubmissionRecord> {
    const submission = this.store.getSubmission(submissionId);
    if (!submission) {
      throw Object.assign(new Error('EVA submission not found'), {
        status: 404,
        code: 'not_found',
      });
    }
    // Governed retry — clears in-progress lock; does not create new company/contact/prospect
    submission.aiJobIdempotencyKey = null;
    submission.status = 'AI Review Pending';
    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId,
      correlationId: submission.correlationId,
      actor: MANNY_OWNER,
      action: 'eva_ai_governed_retry',
      detail: 'Governed retry after failure/revision; no duplicate prospect creation',
    });
    return this.runAiReview(submission, {
      useFastPreliminary: true,
      isRetry: true,
      priorTimings: submission.performanceTimings || undefined,
    });
  }

  cancel(submissionId: string): EvaSubmissionRecord {
    const submission = this.store.getSubmission(submissionId);
    if (!submission) {
      throw Object.assign(new Error('EVA submission not found'), {
        status: 404,
        code: 'not_found',
      });
    }
    submission.status = 'Cancelled';
    submission.aiJobIdempotencyKey = null;
    submission.updatedAt = new Date().toISOString();
    submission.uatChecklist = buildEvaUatChecklist(submission);
    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId,
      correlationId: submission.correlationId,
      actor: MANNY_OWNER,
      action: 'eva_review_cancelled',
      detail: 'Cancelled; original submission preserved',
    });
    return submission;
  }

  private mapQueueItem(s: EvaSubmissionRecord) {
    return {
      submissionId: s.submissionId,
      company: s.payload.company.legalCompanyName,
      contact: `${s.payload.contact.firstName} ${s.payload.contact.lastName}`,
      email: s.payload.contact.email,
      submissionTime: s.createdAt,
      status: s.status,
      reviewMode: s.reviewMode,
      duplicateStatus: s.matchClass,
      matchEvidence: s.matchEvidence,
      evaSummary: s.reviewOutput?.prospect_summary || null,
      strengths: s.reviewOutput?.strengths || [],
      risks: s.reviewOutput?.risks || [],
      missingInformation: s.reviewOutput?.missing_information || [],
      recommendedServices: s.reviewOutput?.recommended_hvcg_services || [],
      recommendedNextAction: s.reviewOutput?.recommended_next_action || null,
      confidence: s.reviewOutput?.confidence ?? null,
      aiWarnings: s.reviewOutput?.warnings || [],
      estimatedReviewMinutes:
        s.reviewOutput?.time_protection?.estimated_manny_review_minutes ??
        s.reviewOutput?.decision_package?.required_review_minutes ??
        null,
      timeProtection: s.reviewOutput?.time_protection || null,
      decisionPackage: s.reviewOutput?.decision_package || null,
      sourceSubmission: s.submissionId,
      modelUsed: s.modelUsed,
      modelRouting: s.modelRouting,
      performanceTimings: s.performanceTimings,
      uatChecklist: s.uatChecklist,
      processingDurationMs: s.processingDurationMs,
      errorDetail: s.errorDetail,
      banners: s.banners,
      noEmail: true,
      noClientActivation: true,
      noProductionRecords: true,
      allowedDecisions: [...EVA_MANNY_DECISIONS],
    };
  }

  /** Manny ready queue — schema-validated successful reviews only (Failed excluded). */
  approvalQueue() {
    return this.store
      .listSubmissions()
      .filter((s) => s.status === 'Waiting on Manny' || s.status === 'Needs More Information')
      .map((s) => this.mapQueueItem(s));
  }

  /** Failed / pending AI — out of ready queue until governed retry or revision. */
  revisionQueue() {
    return this.store
      .listSubmissions()
      .filter((s) =>
        ['Failed', 'AI Review Pending', 'AI Review In Progress', 'Cancelled'].includes(s.status),
      )
      .map((s) => this.mapQueueItem(s));
  }

  safetyBanner() {
    return {
      title: 'LOCAL EVA SANDBOX',
      lines: [
        'SYNTHETIC TEST DATA ONLY',
        'NO PRODUCTION RECORDS',
        'NO EMAILS',
        'NO CLIENT ACTIVATION',
        EVA_SYNTHETIC_BANNER,
        EVA_DO_NOT_CONTACT,
      ],
      EvaIntakeEnabled: false,
      ClientEmailsEnabled: false,
      LocalAIWritesEnabled: false,
      LocalAIExternalMessagesEnabled: false,
      phase: '5A',
      reviewModes: ['Deterministic Intake Test', 'Full Local AI End-to-End Test'],
      deepModel: DEEP_MODEL_DEFAULT,
      fastModel: FAST_MODEL_DEFAULT,
    };
  }
}

export function createEvaServiceFromEnv(
  repoRoot: string,
  env: Record<string, string | undefined> = process.env,
  ollama?: OllamaClient | null,
): EvaService {
  return new EvaService({
    repoRoot,
    env,
    ollamaClient: ollama || null,
    deepModel: env.OLLAMA_DEEP_MODEL || DEEP_MODEL_DEFAULT,
    fastModel: env.OLLAMA_FAST_MODEL || FAST_MODEL_DEFAULT,
    localAiEnabled: (env.LOCAL_AI_ENABLED || '').toLowerCase() === 'true',
  });
}
