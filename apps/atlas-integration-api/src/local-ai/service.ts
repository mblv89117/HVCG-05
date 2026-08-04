/**
 * Local AI Operations service — governed control plane.
 * Phase 1: mock worker. Phase 2: optional loopback Ollama executor (read-only drafts).
 * Feature flags default Off. No authoritative business writes. No external messages.
 */

import { randomUUID } from 'node:crypto';
import {
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  DEFAULT_MAX_RETRIES,
  LOCAL_AI_OWNER,
  MANNY_OWNER,
  SYNTHETIC_AI_OUTPUT_BANNER,
  SYNTHETIC_RECORD_BANNER,
  TIME_PROTECTION_POLICY_VERSION,
  assertConfigurableOwner,
  assertPhase2AllowedOperation,
  assertSafetyFlagsOff,
  blockExternalCommunication,
  containsForbiddenPersonName,
  evaluateAiActionAttempt,
  evaluateTimeProtection,
  isLocalAiRuntimeAllowed,
  isPhase2AllowedOperation,
  loadLocalAiFeatureFlags,
  normalizeAssignee,
  redactText,
  requiresMannyApproval,
  type AiJobRecord,
  type CreateAiJobRequest,
  type CreateOperationsQueueItemRequest,
  type LocalAiFeatureFlags,
  type MannyDecision,
  type MockScenario,
  type OllamaExecutorConfig,
  type OperationsQueueItem,
  type TimeProtectionInput,
  type TimeProtectionResult,
} from '@hvcg/atlas-integration-core';
import { LocalAiRepository } from './repository.ts';
import { runMockWorker } from './mockWorker.ts';
import { OllamaClient } from './ollamaClient.ts';
import { cancelOllamaJob, runOllamaExecutor } from './ollamaExecutor.ts';
import {
  discoverOllama,
  findRepoRootFromApi,
  loadLocalAiSecretsFile,
  resolveOllamaConfig,
  writeDiscoverySnapshot,
  writeLocalAiEnvExample,
} from './ollamaConfigLoader.ts';

export interface LocalAiServiceDeps {
  repo: LocalAiRepository;
  flags?: LocalAiFeatureFlags;
  /** Test hook: force kill switch */
  killSwitch?: boolean;
  ollamaConfig?: OllamaExecutorConfig;
  ollamaClient?: OllamaClient;
  defaultExecutorMode?: 'mock' | 'ollama';
}

function nowIso() {
  return new Date().toISOString();
}

function scanForbidden(...parts: Array<string | undefined | null>) {
  for (const p of parts) {
    if (p && containsForbiddenPersonName(p)) {
      throw Object.assign(new Error(`Forbidden person name detected in input`), {
        status: 400,
        code: 'forbidden_person_name',
      });
    }
  }
}

export class LocalAiService {
  private repo: LocalAiRepository;
  private flags: LocalAiFeatureFlags;
  private killSwitch: boolean;
  private ollamaConfig: OllamaExecutorConfig;
  private ollamaClient: OllamaClient;
  private defaultExecutorMode: 'mock' | 'ollama';
  private lastDiscovery: Awaited<ReturnType<typeof discoverOllama>> | null = null;

  constructor(deps: LocalAiServiceDeps) {
    this.repo = deps.repo;
    this.flags = deps.flags ?? loadLocalAiFeatureFlags();
    this.killSwitch = Boolean(deps.killSwitch);
    const fileEnv = loadLocalAiSecretsFile([findRepoRootFromApi(), process.cwd()]);
    this.ollamaConfig = deps.ollamaConfig ?? resolveOllamaConfig(process.env, fileEnv);
    this.ollamaClient = deps.ollamaClient ?? new OllamaClient(this.ollamaConfig);
    const envMode = (process.env.LOCAL_AI_EXECUTOR || fileEnv.LOCAL_AI_EXECUTOR || 'mock').toLowerCase();
    this.defaultExecutorMode =
      deps.defaultExecutorMode || (envMode === 'ollama' ? 'ollama' : 'mock');
  }

  getFlags(): LocalAiFeatureFlags {
    return { ...this.flags };
  }

  getOllamaConfig(): OllamaExecutorConfig {
    return { ...this.ollamaConfig };
  }

  /** Safety + executor diagnostics */
  safetyStatus() {
    const safety = assertSafetyFlagsOff(this.flags);
    return {
      featureFlags: this.getFlags(),
      killSwitch: this.killSwitch || !this.flags.LocalAIEnabled,
      safetyFlagsOk: safety.ok,
      safetyViolations: safety.violations,
      ollamaConnected: Boolean(this.lastDiscovery?.healthy),
      ollama: this.lastDiscovery,
      executor: {
        modeDefault: this.defaultExecutorMode,
        baseUrl: this.ollamaConfig.baseUrl,
        model: this.ollamaConfig.model || this.lastDiscovery?.selectedModel || null,
        timeoutMs: this.ollamaConfig.timeoutMs,
        loopbackOnly: !this.ollamaConfig.allowNonLoopback,
        localDevelopmentOnly: true,
        businessRecordWrites: false,
        externalCommunications: false,
      },
      phase: 'phase2-ollama-read-only-drafts',
      syntheticBanner: SYNTHETIC_AI_OUTPUT_BANNER,
    };
  }

  async refreshOllamaDiscovery(writeLocalFiles = false) {
    const snap = await discoverOllama(this.ollamaConfig);
    if (!this.ollamaConfig.model && snap.selectedModel) {
      this.ollamaConfig = { ...this.ollamaConfig, model: snap.selectedModel };
      this.ollamaClient = this.ollamaClient.withModel(snap.selectedModel);
    }
    this.lastDiscovery = snap;
    if (writeLocalFiles) {
      const root = findRepoRootFromApi();
      writeDiscoverySnapshot(root, snap);
      if (snap.selectedModel) writeLocalAiEnvExample(root, snap.selectedModel);
    }
    return snap;
  }

  evaluatePolicy(input: TimeProtectionInput): TimeProtectionResult {
    scanForbidden(input.title, input.description, input.requestedOperation);
    return evaluateTimeProtection(input);
  }

  createJob(req: CreateAiJobRequest): { job: AiJobRecord; duplicate: boolean } {
    scanForbidden(
      req.sourceRecordType,
      req.sourceRecordId,
      req.requestedOperation,
      req.requestedBy,
      req.inputPayloadReference,
      req.idempotencyKey,
      req.sourceContent,
    );

    if (!req.idempotencyKey?.trim()) {
      throw Object.assign(new Error('idempotencyKey is required'), {
        status: 400,
        code: 'idempotency_required',
      });
    }

    const existing = this.repo.findByIdempotencyKey(req.idempotencyKey);
    if (existing) {
      return { job: existing, duplicate: true };
    }

    const resolvedMode: 'mock' | 'ollama' =
      req.executorMode ||
      (isPhase2AllowedOperation(req.requestedOperation) ? this.defaultExecutorMode : 'mock');

    if (resolvedMode === 'ollama') {
      assertPhase2AllowedOperation(req.requestedOperation);
    }

    const gated = requiresMannyApproval(req.requestedOperation);
    const requiresManny = req.requiresMannyApproval ?? (gated || resolvedMode === 'ollama');
    const correlationId = randomUUID();
    const created = nowIso();
    const scenario: MockScenario = req.mockScenario || 'success';

    let redactedSourceContent: string | null = null;
    let redactionSummary: AiJobRecord['redactionSummary'] = null;
    let redactionStatus: AiJobRecord['redactionStatus'] = 'NotRequired';
    let injectionWarnings: string[] = [];

    if (req.sourceContent) {
      const redaction = redactText(req.sourceContent, { maskFinancialValues: true });
      if (redaction.blocked) {
        throw Object.assign(new Error(redaction.blockReason || 'Redaction blocked'), {
          status: 400,
          code: 'redaction_blocked',
        });
      }
      redactedSourceContent = redaction.redactedText;
      redactionSummary = {
        policyVersion: redaction.policyVersion,
        fieldsRedacted: redaction.fieldsRedacted,
        redactionCount: redaction.redactionCount,
        manualReviewRequired: redaction.manualReviewRequired,
        blocked: redaction.blocked,
        blockReason: redaction.blockReason,
      };
      redactionStatus = redaction.redactionCount > 0 ? 'Redacted' : 'NotRequired';
      // Do not retain unredacted sourceContent anywhere
    }

    const job: AiJobRecord = {
      aiJobId: randomUUID(),
      sourceRecordType: req.sourceRecordType,
      sourceRecordId: req.sourceRecordId,
      requestedOperation: req.requestedOperation,
      requestedBy: req.requestedBy || MANNY_OWNER,
      assignedAiRole: req.assignedAiRole || LOCAL_AI_OWNER,
      workValueTier: req.workValueTier || 'Unclassified',
      inputPayloadReference:
        req.inputPayloadReference || `synthetic://${req.sourceRecordType}/${req.sourceRecordId}`,
      redactedSourceContent,
      redactionStatus,
      redactionSummary,
      injectionWarnings,
      processingStatus: 'Pending',
      validationStatus: 'NotStarted',
      confidence: null,
      outputPayload: null,
      outputSummary: null,
      recommendedNextAction: null,
      requiresMannyApproval: requiresManny,
      mannyDecision: requiresManny ? 'Pending' : 'NotRequired',
      mannyDecisionDate: null,
      retryCount: 0,
      maxRetries: DEFAULT_MAX_RETRIES,
      errorType: null,
      errorDetail: null,
      createdDate: created,
      startedDate: null,
      completedDate: null,
      auditCorrelationId: correlationId,
      idempotencyKey: req.idempotencyKey,
      mockScenario: scenario,
      executorMode: resolvedMode,
      decisionPackage: null,
      syntheticBanner: SYNTHETIC_AI_OUTPUT_BANNER,
      wroteAuthoritativeBusinessRecord: false,
      policyVersion: TIME_PROTECTION_POLICY_VERSION,
      killSwitchEngaged: false,
      cancelled: false,
      processingDurationMs: null,
      ollamaMetrics: null,
    };

    this.repo.upsertJob(job);
    this.repo.appendAudit({
      auditCorrelationId: correlationId,
      aiJobId: job.aiJobId,
      at: created,
      actor: String(job.requestedBy),
      action: 'job_created',
      detail: `Created job for ${job.requestedOperation} mode=${resolvedMode} (${SYNTHETIC_RECORD_BANNER})`,
      nextStatus: 'Pending',
    });

    // Auto-queue when LocalAIEnabled; otherwise remain Pending until explicitly queued.
    if (isLocalAiRuntimeAllowed(this.flags) && !this.killSwitch) {
      return { job: this.queueJob(job.aiJobId), duplicate: false };
    }

    this.repo.appendAudit({
      auditCorrelationId: correlationId,
      aiJobId: job.aiJobId,
      at: nowIso(),
      actor: 'Automation',
      action: 'feature_flag_gate',
      detail: 'LocalAIEnabled=false or kill switch — job remains Pending until enabled for processing.',
      previousStatus: 'Pending',
      nextStatus: 'Pending',
    });

    return { job, duplicate: false };
  }

  queueJob(aiJobId: string): AiJobRecord {
    const job = this.requireJob(aiJobId);
    if (job.processingStatus !== 'Pending' && job.processingStatus !== 'Returned for Revision') {
      throw Object.assign(new Error(`Cannot queue job in status ${job.processingStatus}`), {
        status: 409,
        code: 'invalid_status',
      });
    }
    const prev = job.processingStatus;
    job.processingStatus = 'Queued';
    this.repo.upsertJob(job);
    this.repo.appendAudit({
      auditCorrelationId: job.auditCorrelationId,
      aiJobId: job.aiJobId,
      at: nowIso(),
      actor: 'Automation',
      action: 'job_queued',
      detail: 'Job queued for mock worker',
      previousStatus: prev,
      nextStatus: 'Queued',
    });
    return job;
  }

  /**
   * Process a queued job with mock or Ollama executor.
   * force=true bypasses LocalAIEnabled for local tests only.
   */
  async processJob(aiJobId: string, opts?: { force?: boolean }): Promise<AiJobRecord> {
    const job = this.requireJob(aiJobId);

    if (this.killSwitch || (!opts?.force && !isLocalAiRuntimeAllowed(this.flags))) {
      job.killSwitchEngaged = true;
      this.repo.upsertJob(job);
      this.repo.appendAudit({
        auditCorrelationId: job.auditCorrelationId,
        aiJobId: job.aiJobId,
        at: nowIso(),
        actor: 'Automation',
        action: 'kill_switch',
        detail: 'Processing blocked — LocalAIEnabled=false or kill switch engaged',
        previousStatus: job.processingStatus,
        nextStatus: job.processingStatus,
      });
      throw Object.assign(new Error('Local AI processing disabled (feature flag or kill switch)'), {
        status: 403,
        code: 'local_ai_disabled',
      });
    }

    // Writes must remain false in Phase 2
    if (this.flags.LocalAIWritesEnabled) {
      throw Object.assign(
        new Error('LocalAIWritesEnabled must remain false in Phase 2'),
        { status: 403, code: 'writes_not_allowed' },
      );
    }

    if (job.processingStatus === 'Pending') {
      this.queueJob(aiJobId);
    } else if (
      job.processingStatus !== 'Queued' &&
      job.processingStatus !== 'Returned for Revision'
    ) {
      throw Object.assign(new Error(`Cannot process job in status ${job.processingStatus}`), {
        status: 409,
        code: 'invalid_status',
      });
    }

    let current = this.requireJob(aiJobId);
    if (current.processingStatus === 'Returned for Revision') {
      current = this.queueJob(aiJobId);
    }
    if (current.cancelled) {
      throw Object.assign(new Error('Job was cancelled'), { status: 409, code: 'cancelled' });
    }

    const prev = current.processingStatus;
    current.processingStatus = 'In Progress';
    current.startedDate = current.startedDate || nowIso();
    this.repo.upsertJob(current);

    const useOllama = current.executorMode === 'ollama';
    this.repo.appendAudit({
      auditCorrelationId: current.auditCorrelationId,
      aiJobId: current.aiJobId,
      at: nowIso(),
      actor: LOCAL_AI_OWNER,
      action: useOllama ? 'ollama_executor_started' : 'mock_worker_started',
      detail: useOllama
        ? `Ollama model=${this.ollamaConfig.model || 'unset'}; loopback only; prompt content not logged`
        : `Mock scenario=${current.mockScenario}; Ollama not called`,
      previousStatus: prev,
      nextStatus: 'In Progress',
    });

    const gate = evaluateAiActionAttempt(current.requestedOperation, {
      mannyApproved: false,
      writesEnabled: false,
    });
    if (!gate.allowed) {
      this.repo.recordBlockedAuthoritativeWrite({
        aiJobId: current.aiJobId,
        action: current.requestedOperation,
        detail: gate.message,
      });
      this.repo.appendAudit({
        auditCorrelationId: current.auditCorrelationId,
        aiJobId: current.aiJobId,
        at: nowIso(),
        actor: LOCAL_AI_OWNER,
        action: 'prohibited_action_blocked',
        detail: gate.message,
        previousStatus: 'In Progress',
        nextStatus: 'In Progress',
      });
    }

    if (useOllama) {
      return this.processWithOllama(aiJobId);
    }
    return this.processWithMock(aiJobId);
  }

  private async processWithOllama(aiJobId: string): Promise<AiJobRecord> {
    let current = this.requireJob(aiJobId);
    const source =
      current.redactedSourceContent ||
      `${SYNTHETIC_RECORD_BANNER}\nSynthetic placeholder content for ${current.sourceRecordType}/${current.sourceRecordId}`;

    const result = await runOllamaExecutor({
      job: current,
      sourceContent: source,
      cfg: this.ollamaConfig,
      client: this.ollamaClient,
    });

    current = this.requireJob(aiJobId);
    current.processingDurationMs = result.durationMs;
    current.redactionSummary = {
      policyVersion: result.redaction.policyVersion,
      fieldsRedacted: result.redaction.fieldsRedacted,
      redactionCount: result.redaction.redactionCount,
      manualReviewRequired: result.redaction.manualReviewRequired,
      blocked: result.redaction.blocked,
      blockReason: result.redaction.blockReason,
    };
    current.redactionStatus =
      result.redaction.redactionCount > 0 ? 'Redacted' : current.redactionStatus;
    current.injectionWarnings = result.injection.warnings;
    current.ollamaMetrics = result.metrics;
    current.wroteAuthoritativeBusinessRecord = false;

    if (result.cancelled) {
      current.processingStatus = 'Cancelled';
      current.cancelled = true;
      current.errorType = 'Cancelled';
      current.errorDetail = result.errorDetail;
      current.completedDate = nowIso();
      this.repo.upsertJob(current);
      this.repo.appendAudit({
        auditCorrelationId: current.auditCorrelationId,
        aiJobId: current.aiJobId,
        at: nowIso(),
        actor: LOCAL_AI_OWNER,
        action: 'job_cancelled',
        detail: result.errorDetail || 'cancelled',
        previousStatus: 'In Progress',
        nextStatus: 'Cancelled',
      });
      return current;
    }

    if (!result.ok) {
      current.processingStatus =
        result.errorType === 'ValidationFailed' || result.errorType === 'MalformedResponse'
          ? 'Validation Failed'
          : 'Processing Failed';
      current.validationStatus =
        current.processingStatus === 'Validation Failed' ? 'Failed' : 'NotStarted';
      current.errorType = result.errorType;
      current.errorDetail = result.errorDetail;
      current.outputSummary = result.outputSummary;
      current.completedDate = nowIso();
      this.repo.upsertJob(current);
      this.repo.appendAudit({
        auditCorrelationId: current.auditCorrelationId,
        aiJobId: current.aiJobId,
        at: nowIso(),
        actor: LOCAL_AI_OWNER,
        action: 'ollama_executor_failed',
        detail: `${result.errorType}: ${result.errorDetail}`,
        previousStatus: 'In Progress',
        nextStatus: current.processingStatus,
      });
      return current;
    }

    current.validationStatus = 'Passed';
    current.outputPayload = result.outputPayload;
    current.outputSummary = result.outputSummary;
    current.decisionPackage = result.decisionPackage;
    current.confidence = result.confidence;
    current.errorType = null;
    current.errorDetail = null;
    current.requiresMannyApproval = result.requiresMannyApproval;
    current.mannyDecision = result.requiresMannyApproval ? 'Pending' : current.mannyDecision;
    current.recommendedNextAction = result.requiresMannyApproval
      ? 'Waiting on Manny approval'
      : 'Review draft';
    current.processingStatus = result.requiresMannyApproval ? 'Waiting on Manny' : 'Draft Ready';
    if ((result.confidence ?? 1) < 0.5) {
      current.processingStatus = 'Waiting on Manny';
      current.requiresMannyApproval = true;
      current.mannyDecision = 'Pending';
      current.recommendedNextAction = 'Low confidence — Manny review required';
    }

    this.repo.upsertJob(current);
    this.repo.appendAudit({
      auditCorrelationId: current.auditCorrelationId,
      aiJobId: current.aiJobId,
      at: nowIso(),
      actor: LOCAL_AI_OWNER,
      action: 'ollama_output_validated',
      detail: `${SYNTHETIC_AI_OUTPUT_BANNER}; status=${current.processingStatus}; durationMs=${result.durationMs}`,
      previousStatus: 'In Progress',
      nextStatus: current.processingStatus,
    });
    return current;
  }

  private processWithMock(aiJobId: string): AiJobRecord {
    let current = this.requireJob(aiJobId);
    const result = runMockWorker(current);
    current = this.requireJob(aiJobId);

    if (result.timedOut) {
      current.processingStatus = 'Processing Failed';
      current.errorType = result.errorType;
      current.errorDetail = result.errorDetail;
      current.completedDate = nowIso();
      this.repo.upsertJob(current);
      this.repo.appendAudit({
        auditCorrelationId: current.auditCorrelationId,
        aiJobId: current.aiJobId,
        at: nowIso(),
        actor: LOCAL_AI_OWNER,
        action: 'mock_timeout',
        detail: result.errorDetail || 'timeout',
        previousStatus: 'In Progress',
        nextStatus: 'Processing Failed',
      });
      return current;
    }

    if (result.failed) {
      current.processingStatus = 'Processing Failed';
      current.errorType = result.errorType;
      current.errorDetail = result.errorDetail;
      current.completedDate = nowIso();
      this.repo.upsertJob(current);
      this.repo.appendAudit({
        auditCorrelationId: current.auditCorrelationId,
        aiJobId: current.aiJobId,
        at: nowIso(),
        actor: LOCAL_AI_OWNER,
        action: 'mock_failure',
        detail: result.errorDetail || 'failure',
        previousStatus: 'In Progress',
        nextStatus: 'Processing Failed',
      });
      return current;
    }

    if (result.malformed || !result.validationPassed) {
      current.processingStatus = 'Validation Failed';
      current.validationStatus = 'Failed';
      current.outputPayload = result.outputPayload;
      current.outputSummary = result.outputSummary;
      current.confidence = result.confidence;
      current.errorType = result.errorType || 'ValidationFailed';
      current.errorDetail = result.errorDetail || result.validationErrors.join('; ');
      current.completedDate = nowIso();
      this.repo.upsertJob(current);
      this.repo.appendAudit({
        auditCorrelationId: current.auditCorrelationId,
        aiJobId: current.aiJobId,
        at: nowIso(),
        actor: 'Automation',
        action: 'validation_failed',
        detail: current.errorDetail || 'validation failed',
        previousStatus: 'In Progress',
        nextStatus: 'Validation Failed',
      });
      return current;
    }

    current.validationStatus = 'Passed';
    current.outputPayload = result.outputPayload;
    current.outputSummary = result.outputSummary;
    current.decisionPackage = result.decisionPackage;
    current.confidence = result.confidence;
    current.errorType = null;
    current.errorDetail = null;
    current.wroteAuthoritativeBusinessRecord = false;
    current.recommendedNextAction = current.requiresMannyApproval
      ? 'Waiting on Manny approval'
      : 'Review draft';

    if (current.requiresMannyApproval) {
      current.processingStatus = 'Waiting on Manny';
      current.mannyDecision = 'Pending';
    } else {
      current.processingStatus = 'Draft Ready';
    }

    if (result.lowConfidence && !current.requiresMannyApproval) {
      current.processingStatus = 'Waiting on Manny';
      current.requiresMannyApproval = true;
      current.mannyDecision = 'Pending';
      current.recommendedNextAction = 'Low confidence — Manny review required';
    }

    this.repo.upsertJob(current);
    this.repo.appendAudit({
      auditCorrelationId: current.auditCorrelationId,
      aiJobId: current.aiJobId,
      at: nowIso(),
      actor: LOCAL_AI_OWNER,
      action: 'mock_output_validated',
      detail: `${SYNTHETIC_AI_OUTPUT_BANNER}; status=${current.processingStatus}`,
      previousStatus: 'In Progress',
      nextStatus: current.processingStatus,
    });

    return current;
  }

  cancelJob(aiJobId: string): AiJobRecord {
    const job = this.requireJob(aiJobId);
    cancelOllamaJob(aiJobId);
    if (job.processingStatus === 'In Progress' || job.processingStatus === 'Queued') {
      const prev = job.processingStatus;
      job.cancelled = true;
      job.processingStatus = 'Cancelled';
      job.completedDate = nowIso();
      job.errorType = 'Cancelled';
      job.errorDetail = 'Cancelled by operator';
      this.repo.upsertJob(job);
      this.repo.appendAudit({
        auditCorrelationId: job.auditCorrelationId,
        aiJobId: job.aiJobId,
        at: nowIso(),
        actor: MANNY_OWNER,
        action: 'job_cancelled',
        detail: 'Operator cancelled job',
        previousStatus: prev,
        nextStatus: 'Cancelled',
      });
    }
    return this.requireJob(aiJobId);
  }

  async retryJob(aiJobId: string, opts?: { force?: boolean }): Promise<AiJobRecord> {
    const job = this.requireJob(aiJobId);
    if (
      job.processingStatus !== 'Processing Failed' &&
      job.processingStatus !== 'Validation Failed'
    ) {
      throw Object.assign(new Error('Only failed jobs can be retried'), {
        status: 409,
        code: 'invalid_status',
      });
    }
    if (job.retryCount >= job.maxRetries) {
      throw Object.assign(new Error('Retry limit exceeded'), {
        status: 409,
        code: 'retry_limit',
      });
    }
    job.retryCount += 1;
    job.processingStatus = 'Queued';
    job.errorType = null;
    job.errorDetail = null;
    job.validationStatus = 'NotStarted';
    job.completedDate = null;
    job.cancelled = false;
    this.repo.upsertJob(job);
    this.repo.appendAudit({
      auditCorrelationId: job.auditCorrelationId,
      aiJobId: job.aiJobId,
      at: nowIso(),
      actor: 'Automation',
      action: 'job_retry',
      detail: `Retry ${job.retryCount}/${job.maxRetries}`,
      previousStatus: 'Processing Failed',
      nextStatus: 'Queued',
    });
    return this.processJob(aiJobId, opts);
  }

  mannyDecide(
    aiJobId: string,
    decision: Extract<MannyDecision, 'Approved' | 'Rejected' | 'Returned for Revision'>,
    actor: string,
  ): AiJobRecord {
    scanForbidden(actor);
    const authorized =
      actor === MANNY_OWNER || actor === 'HVCG Owner' || actor === 'Administrator';
    if (!authorized) {
      this.repo.appendAudit({
        auditCorrelationId: this.requireJob(aiJobId).auditCorrelationId,
        aiJobId,
        at: nowIso(),
        actor,
        action: 'unauthorized_approval_attempt',
        detail: `Actor "${actor}" is not authorized to record Manny decisions`,
      });
      throw Object.assign(
        new Error('Unauthorized: only Manny may approve or reject gated AI outputs'),
        { status: 403, code: 'unauthorized_approval' },
      );
    }

    const job = this.requireJob(aiJobId);
    if (job.processingStatus !== 'Waiting on Manny' && job.processingStatus !== 'Draft Ready') {
      throw Object.assign(new Error(`Job not awaiting Manny decision (status=${job.processingStatus})`), {
        status: 409,
        code: 'invalid_status',
      });
    }

    const prev = job.processingStatus;
    job.mannyDecision = decision;
    job.mannyDecisionDate = nowIso();

    if (decision === 'Approved') {
      job.processingStatus = 'Manny Approved';
      // Still do NOT write authoritative business records in Phase 1
      job.wroteAuthoritativeBusinessRecord = false;
      if (!this.flags.LocalAIWritesEnabled) {
        this.repo.appendAudit({
          auditCorrelationId: job.auditCorrelationId,
          aiJobId: job.aiJobId,
          at: nowIso(),
          actor: MANNY_OWNER,
          action: 'writes_still_disabled',
          detail: 'Manny approved draft; LocalAIWritesEnabled=false — no business record mutation',
        });
      }
      // Mark completed as governance cycle complete without business write
      job.processingStatus = 'Completed';
      job.completedDate = nowIso();
      job.recommendedNextAction = 'Approved — authoritative apply deferred (writes disabled)';
    } else if (decision === 'Rejected') {
      job.processingStatus = 'Manny Rejected';
      job.completedDate = nowIso();
      job.recommendedNextAction = 'Rejected — no business record changes';
    } else {
      job.processingStatus = 'Returned for Revision';
      job.completedDate = null;
      job.recommendedNextAction = 'Revise mock output and re-queue';
    }

    this.repo.upsertJob(job);
    this.repo.appendAudit({
      auditCorrelationId: job.auditCorrelationId,
      aiJobId: job.aiJobId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action: `manny_${decision.toLowerCase().replace(/\s+/g, '_')}`,
      detail: `Manny decision: ${decision}`,
      previousStatus: prev,
      nextStatus: job.processingStatus,
    });
    return job;
  }

  attemptProhibitedAction(aiJobId: string, action: string) {
    const job = this.requireJob(aiJobId);
    const gate = evaluateAiActionAttempt(action, {
      mannyApproved: job.mannyDecision === 'Approved',
      writesEnabled: this.flags.LocalAIWritesEnabled,
    });
    if (!gate.allowed) {
      this.repo.recordBlockedAuthoritativeWrite({
        aiJobId,
        action,
        detail: gate.message,
      });
      this.repo.appendAudit({
        auditCorrelationId: job.auditCorrelationId,
        aiJobId,
        at: nowIso(),
        actor: LOCAL_AI_OWNER,
        action: 'prohibited_action_blocked',
        detail: gate.message,
      });
    }
    return gate;
  }

  attemptExternalCommunication(aiJobId: string) {
    const job = this.requireJob(aiJobId);
    const gate = blockExternalCommunication(this.flags);
    this.repo.recordBlockedAuthoritativeWrite({
      aiJobId,
      action: 'ExternalCommunications',
      detail: gate.message,
    });
    this.repo.appendAudit({
      auditCorrelationId: job.auditCorrelationId,
      aiJobId,
      at: nowIso(),
      actor: LOCAL_AI_OWNER,
      action: 'external_communication_blocked',
      detail: gate.message,
    });
    return gate;
  }

  createOperationsItem(req: CreateOperationsQueueItemRequest): OperationsQueueItem {
    scanForbidden(req.title, req.description, req.assignee, req.sourceRecordType, req.sourceRecordId);
    const assignee = normalizeAssignee(req.assignee);
    const item: OperationsQueueItem = {
      id: randomUUID(),
      title: req.title.startsWith(SYNTHETIC_RECORD_BANNER)
        ? req.title
        : `${SYNTHETIC_RECORD_BANNER}: ${req.title}`,
      description: req.description || '',
      assignee,
      priority: req.priority || 'Medium',
      deadline: req.deadline ?? null,
      workValueTier: req.workValueTier || 'Unclassified',
      status: assignee === 'Unassigned Operations' ? 'Open' : 'Assigned',
      escalationReason: req.escalationReason || '',
      dependencyIds: req.dependencyIds || [],
      sourceRecordType: req.sourceRecordType,
      sourceRecordId: req.sourceRecordId,
      requiresMannyApproval: Boolean(req.requiresMannyApproval),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      syntheticBanner: SYNTHETIC_RECORD_BANNER,
    };
    this.repo.upsertOperationsItem(item);
    return item;
  }

  reassignOperationsItem(id: string, assignee: string): OperationsQueueItem {
    const item = this.repo.getOperationsItem(id);
    if (!item) {
      throw Object.assign(new Error('Operations item not found'), { status: 404, code: 'not_found' });
    }
    const next = assertConfigurableOwner(assignee);
    item.assignee = next;
    item.status = next === 'Unassigned Operations' ? 'Open' : 'Assigned';
    item.updatedAt = nowIso();
    this.repo.upsertOperationsItem(item);
    return item;
  }

  listJobs(filter?: { status?: string }) {
    let rows = this.repo.listJobs();
    if (filter?.status) rows = rows.filter((j) => j.processingStatus === filter.status);
    return rows;
  }

  getJob(aiJobId: string) {
    return this.requireJob(aiJobId);
  }

  listAudit(aiJobId?: string) {
    return this.repo.listAudit(aiJobId);
  }

  listOperationsQueue() {
    return this.repo.listOperationsQueue();
  }

  commandCenterSnapshot() {
    const jobs = this.repo.listJobs();
    const queue = this.repo.listOperationsQueue();
    const awaitingManny = jobs.filter((j) => j.processingStatus === 'Waiting on Manny');
    const failed = jobs.filter(
      (j) =>
        j.processingStatus === 'Processing Failed' || j.processingStatus === 'Validation Failed',
    );
    const lowConfidence = jobs.filter((j) => j.confidence !== null && j.confidence < 0.5);
    const draftReady = jobs.filter((j) => j.processingStatus === 'Draft Ready');
    const improperlyRouted = queue.filter(
      (i) => i.assignee === MANNY_OWNER && i.workValueTier !== 'Tier 1 — Manny Only',
    );
    const estimatedMannyTimeSaved = jobs.reduce((sum, j) => {
      // heuristic from policy version marker — Phase 1 uses fixed estimate when completed
      if (j.processingStatus === 'Completed' || j.processingStatus === 'Draft Ready') return sum + 15;
      return sum;
    }, 0);

    return {
      generatedAt: nowIso(),
      featureFlags: this.getFlags(),
      revenueOpportunities: queue.filter((i) =>
        /revenue|pricing|proposal|opportunity/i.test(i.title + i.description),
      ),
      evaSubmissionsAwaitingReview: [], // EVA intake disabled — empty by design
      evaIntakeEnabled: this.flags.EvaIntakeEnabled,
      aiDraftsAwaitingApproval: awaitingManny,
      highValueClientDecisions: awaitingManny.filter((j) =>
        requiresMannyApproval(j.requestedOperation),
      ),
      capitalDecisions: jobs.filter((j) =>
        /Capital|Financing|Lender|Investor/i.test(j.requestedOperation),
      ),
      pricingAndScopeApprovals: jobs.filter((j) =>
        /Pricing|Scope|Contract/i.test(j.requestedOperation),
      ),
      externalCommunicationsAwaitingApproval: jobs.filter(
        (j) => j.requestedOperation === 'ExternalCommunications',
      ),
      majorRisksAndBlockers: failed,
      criticalDeadlines: queue.filter((i) => i.priority === 'Critical' && i.deadline),
      failedAiJobs: failed,
      lowConfidenceAiOutputs: lowConfidence,
      workImproperlyRoutedToManny: improperlyRouted,
      estimatedMannyTimeSavedMinutes: estimatedMannyTimeSaved,
      draftReadyCount: draftReady.length,
      operationsOpen: queue.filter((i) => i.status === 'Open' || i.status === 'Assigned').length,
      syntheticNotice: SYNTHETIC_RECORD_BANNER,
    };
  }

  private requireJob(aiJobId: string): AiJobRecord {
    const job = this.repo.getJob(aiJobId);
    if (!job) {
      throw Object.assign(new Error('AI job not found'), { status: 404, code: 'not_found' });
    }
    return { ...job };
  }
}

export function createLocalAiService(dataDir: string, flags?: LocalAiFeatureFlags) {
  return new LocalAiService({
    repo: new LocalAiRepository(dataDir),
    flags: flags ?? { ...DEFAULT_LOCAL_AI_FEATURE_FLAGS },
  });
}
