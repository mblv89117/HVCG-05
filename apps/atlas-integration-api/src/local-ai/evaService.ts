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
  type EvaProspectRecord,
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
    this.deepModel = opts.deepModel || env.OLLAMA_DEEP_MODEL || 'glm-4.7-flash:q4_K_M';
    this.fastModel = opts.fastModel || env.OLLAMA_FAST_MODEL || null;
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
    skipAi?: boolean;
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

    const validated = validateEvaSubmissionPayload(opts.body);
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
    });
    submission.status = 'Validating';
    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId: submission.submissionId,
      correlationId,
      actor: 'sandbox',
      action: 'eva_submission_received',
      detail: `${EVA_SYNTHETIC_BANNER}; ${EVA_DO_NOT_CONTACT}`,
    });

    // Duplicate matching
    submission.status = 'Duplicate Check';
    const companyMatch = matchCompanies(payload, this.store.listCompanies());
    const contactMatch = matchContacts(
      payload,
      this.store.listContacts(),
      companyMatch.companyId,
    );
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

    // Prospect creation — never active client; conflict still creates synthetic linked records
    // but flags conflict for Manny (no auto-merge of conflicting company identity)
    const now = new Date().toISOString();
    let companyId = companyMatch.companyId;
    let contactId = contactMatch.contactId;

    if (!companyId || companyMatch.matchClass === 'conflict requiring Manny') {
      // Conflict: create new synthetic company rather than merging into conflicting match
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
    submission.updatedAt = new Date().toISOString();
    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId: submission.submissionId,
      correlationId,
      actor: 'system',
      action: 'eva_prospect_created',
      detail: `match=${submission.matchClass}; activeClient=false; source=${EVA_SOURCE}`,
      payload: {
        companyId,
        contactId,
        prospectId: prospect.prospectId,
        matchEvidence: submission.matchEvidence,
      },
    });

    if (opts.skipAi) {
      submission.status = 'Waiting on Manny';
      submission.reviewOutput = buildDeterministicEvaReview(submission);
      submission.updatedAt = new Date().toISOString();
      this.store.upsertSubmission(submission);
      return { ok: true, status: 201, submission, correlationId };
    }

    // AI review
    submission = await this.runAiReview(submission, {
      forceOffline: opts.forceOfflineModel,
    });
    return { ok: true, status: 201, submission, correlationId };
  }

  async runAiReview(
    submission: EvaSubmissionRecord,
    opts?: { forceOffline?: boolean; useFastPreliminary?: boolean },
  ): Promise<EvaSubmissionRecord> {
    const start = Date.now();
    submission.status = 'AI Review Pending';
    submission.aiJobId = randomUUID();
    submission.updatedAt = new Date().toISOString();
    this.store.upsertSubmission(submission);

    let review: EvaReviewOutput = buildDeterministicEvaReview(submission);
    let modelUsed = 'deterministic-local';
    let failed = false;
    let failDetail: string | null = null;

    // Optional Fast preliminary missing-info only
    if (opts?.useFastPreliminary && this.fastModel && this.ollama && !opts.forceOffline) {
      try {
        const fastClient = this.ollama.withModel(this.fastModel);
        await fastClient.chat({
          system:
            'Phase 5A Fast preliminary only: list missing_information for synthetic EVA. JSON only. Never approve/reject/email.',
          user: JSON.stringify({
            operation: 'identify_missing_information',
            submission_id: submission.submissionId,
            financial: submission.payload.financial,
          }),
          model: this.fastModel,
        });
      } catch {
        /* non-blocking preliminary */
      }
    }

    submission.status = 'AI Review In Progress';
    this.store.upsertSubmission(submission);

    if (this.ollama && this.localAiEnabled && !opts?.forceOffline) {
      try {
        const deep = this.ollama.withModel(this.deepModel);
        const result = await deep.chat({
          system: [
            'You are Atlas Local AI Phase 5A EVA reviewer.',
            'Operation: review_eva_submission',
            'Output strict JSON matching the EVA review contract.',
            'requires_manny_approval must be true.',
            'Never approve or reject the prospect.',
            'Never promise financing or guaranteed approval.',
            'Never claim a client was created or an email was sent.',
            'Never assign pricing or bind HVCG or make a lender commitment.',
            `Always include banners: ${EVA_SYNTHETIC_BANNER}; ${EVA_DO_NOT_CONTACT}.`,
            'All records are synthetic local test data only.',
          ].join(' '),
          user: JSON.stringify({
            operation: 'review_eva_submission',
            submission_id: submission.submissionId,
            payload: submission.payload,
            match_class: submission.matchClass,
            match_evidence: submission.matchEvidence,
            deterministic_seed: review,
          }),
          model: this.deepModel,
        });
        modelUsed = result.model || this.deepModel;
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(result.rawContent);
        } catch {
          failed = true;
          failDetail = 'malformed_model_json';
        }
        if (parsed) {
          const v = validateEvaReviewOutput(parsed, submission.submissionId);
          if (!v.ok || !v.output) {
            failed = true;
            failDetail = `model_output_invalid:${v.errors.join(',')}`;
          } else {
            // Merge model fields onto deterministic contract shell
            review = {
              ...review,
              ...v.output,
              submission_id: submission.submissionId,
              requires_manny_approval: true,
              banner: review.banner,
              synthetic_eva_banner: EVA_SYNTHETIC_BANNER,
              do_not_contact: EVA_DO_NOT_CONTACT,
              draft_only: true,
              decision_package: {
                ...review.decision_package,
                ...(v.output.decision_package || {}),
              },
              time_protection: {
                ...review.time_protection,
                ...(v.output.time_protection || {}),
              },
            };
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
      } catch (err) {
        failed = true;
        failDetail = err instanceof Error ? err.message : String(err);
        if (/timeout/i.test(failDetail)) failDetail = 'model_timeout';
        else if (/ECONNREFUSED|offline|fetch failed/i.test(failDetail)) {
          failDetail = 'model_offline';
        }
      }
    } else if (opts?.forceOffline) {
      failed = true;
      failDetail = 'model_offline';
    }

    submission.processingDurationMs = Date.now() - start;
    submission.modelUsed = modelUsed;
    submission.reviewOutput = review;

    if (failed) {
      submission.status = 'Failed';
      submission.errorDetail = failDetail;
      // Preserve original submission; do not claim success
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
      });
      // Still attach deterministic draft for Manny visibility without success claim
      submission.reviewOutput = buildDeterministicEvaReview(submission, {
        confidence: 0.35,
        warnings: [`AI review failed: ${failDetail}`, 'Do not treat as successful AI review'],
      });
      submission.updatedAt = new Date().toISOString();
      this.store.upsertSubmission(submission);
      return submission;
    }

    submission.status = 'Waiting on Manny';
    submission.errorDetail = null;
    submission.updatedAt = new Date().toISOString();
    this.store.upsertSubmission(submission);
    this.store.audit({
      submissionId: submission.submissionId,
      correlationId: submission.correlationId,
      actor: 'Local AI Operations Agent',
      action: 'eva_ai_review_completed',
      detail: `model=${modelUsed}; durationMs=${submission.processingDurationMs}`,
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
    return this.runAiReview(submission);
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
    submission.updatedAt = new Date().toISOString();
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

  approvalQueue() {
    return this.store
      .listSubmissions()
      .filter((s) =>
        ['Waiting on Manny', 'Needs More Information', 'Failed', 'AI Review Pending'].includes(
          s.status,
        ),
      )
      .map((s) => ({
        submissionId: s.submissionId,
        company: s.payload.company.legalCompanyName,
        contact: `${s.payload.contact.firstName} ${s.payload.contact.lastName}`,
        email: s.payload.contact.email,
        submissionTime: s.createdAt,
        status: s.status,
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
        processingDurationMs: s.processingDurationMs,
        errorDetail: s.errorDetail,
        banners: s.banners,
        noEmail: true,
        noClientActivation: true,
        noProductionRecords: true,
        allowedDecisions: [...EVA_MANNY_DECISIONS],
      }));
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
    deepModel: env.OLLAMA_DEEP_MODEL || 'glm-4.7-flash:q4_K_M',
    fastModel: env.OLLAMA_FAST_MODEL || null,
    localAiEnabled: (env.LOCAL_AI_ENABLED || '').toLowerCase() === 'true',
  });
}
