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
  MANNY_TERMINAL_DRAFT_DECISIONS,
  SYNTHETIC_AI_OUTPUT_BANNER,
  SYNTHETIC_RECORD_BANNER,
  TIME_PROTECTION_POLICY_VERSION,
  assertAllowedLocalAiOperation,
  assertConfigurableOwner,
  assertSafetyFlagsOff,
  blockExternalCommunication,
  buildPerformanceDashboard,
  containsForbiddenPersonName,
  evaluateAiActionAttempt,
  evaluateTimeProtection,
  isLocalAiRuntimeAllowed,
  isPhase3AllowedOperation,
  loadLocalAiFeatureFlags,
  normalizeAssignee,
  redactText,
  requiresMannyApproval,
  resolveQualityFallbackToDeep,
  isDeepDocumentType,
  type AiJobRecord,
  type ContentPackRecord,
  type CreateAiJobRequest,
  type CreateContentPackRequest,
  type CreateOperationsQueueItemRequest,
  type LocalAiFeatureFlags,
  type MannyDecision,
  type MockScenario,
  type ModelProfile,
  type ModelRoutingConfig,
  type OllamaExecutorConfig,
  type OperationsQueueItem,
  type RedactionDecision,
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
import {
  applyRedactionDecision,
  assertContentPackReadyForModel,
  createContentPackRecord,
  enrichJobOutputForPhase3,
  loadModelRoutingFromEnv,
  resolveJobModel,
} from './phase3Workflow.ts';
import { DocumentReviewService } from './documentReviewService.ts';
import { resolveClamscanPath } from './malwareScanner.ts';
import type { DocumentReviewDecision } from '@hvcg/atlas-integration-core';

export interface LocalAiServiceDeps {
  repo: LocalAiRepository;
  flags?: LocalAiFeatureFlags;
  /** Test hook: force kill switch */
  killSwitch?: boolean;
  ollamaConfig?: OllamaExecutorConfig;
  ollamaClient?: OllamaClient;
  defaultExecutorMode?: 'mock' | 'ollama';
  /** Test hook: override secrets file env (model profiles). */
  secretsFileEnv?: Record<string, string>;
  /** Test hook: override document staging root (Phase 4B-1). */
  documentStagingRoot?: string;
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
  private modelRouting: ModelRoutingConfig;
  private secretsFileEnv: Record<string, string>;
  private documentReview: DocumentReviewService;

  constructor(deps: LocalAiServiceDeps) {
    this.repo = deps.repo;
    this.flags = deps.flags ?? loadLocalAiFeatureFlags();
    this.killSwitch = Boolean(deps.killSwitch);
    this.secretsFileEnv =
      deps.secretsFileEnv ?? loadLocalAiSecretsFile([findRepoRootFromApi(), process.cwd()]);
    this.ollamaConfig = deps.ollamaConfig ?? resolveOllamaConfig(process.env, this.secretsFileEnv);
    this.ollamaClient = deps.ollamaClient ?? new OllamaClient(this.ollamaConfig);
    const envMode = (
      process.env.LOCAL_AI_EXECUTOR ||
      this.secretsFileEnv.LOCAL_AI_EXECUTOR ||
      'mock'
    ).toLowerCase();
    this.defaultExecutorMode =
      deps.defaultExecutorMode || (envMode === 'ollama' ? 'ollama' : 'mock');
    this.modelRouting = loadModelRoutingFromEnv(
      this.ollamaConfig.model,
      process.env,
      this.secretsFileEnv,
      [],
    );
    this.documentReview = new DocumentReviewService(
      deps.documentStagingRoot || findRepoRootFromApi() || process.cwd(),
      {
        ...process.env,
        ...this.secretsFileEnv,
        ...(deps.documentStagingRoot
          ? { LOCAL_AI_DOCUMENT_STAGING_DIR: deps.documentStagingRoot }
          : {}),
        // Synthetic override only when ClamAV is unavailable (local TEST fixtures)
        LOCAL_AI_MALWARE_SCAN_SYNTHETIC_OVERRIDE:
          this.secretsFileEnv.LOCAL_AI_MALWARE_SCAN_SYNTHETIC_OVERRIDE ||
          process.env.LOCAL_AI_MALWARE_SCAN_SYNTHETIC_OVERRIDE ||
          (resolveClamscanPath({
            ...process.env,
            ...this.secretsFileEnv,
          })
            ? 'false'
            : 'true'),
      },
    );
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
        modelRouting: this.getModelRouting(),
      },
      phase: 'phase4b1-document-intake-ocr',
      syntheticBanner: SYNTHETIC_AI_OUTPUT_BANNER,
      documentStaging: this.documentReview.staging.getConfig(),
    };
  }

  getModelRouting(): ModelRoutingConfig & {
    installedModels: string[];
    fasterModelAvailable: boolean;
    ownerActionRequired: string | null;
  } {
    const installed = (this.lastDiscovery?.models || []).map((m) => m.name);
    const routing = loadModelRoutingFromEnv(
      this.ollamaConfig.model || this.lastDiscovery?.selectedModel || '',
      process.env,
      this.secretsFileEnv,
      installed,
    );
    this.modelRouting = routing;
    return {
      ...routing,
      installedModels: installed,
      fasterModelAvailable: routing.fasterModelAvailable,
      ownerActionRequired: routing.fasterModelAvailable
        ? null
        : `No distinct Fast Operations model installed. Recommended (do not auto-pull): ${routing.recommendedFasterModels.join(', ')}. Authorize and install one, then set OLLAMA_FAST_MODEL.`,
    };
  }

  async refreshOllamaDiscovery(writeLocalFiles = false) {
    const snap = await discoverOllama(this.ollamaConfig);
    if (!this.ollamaConfig.model && snap.selectedModel) {
      this.ollamaConfig = { ...this.ollamaConfig, model: snap.selectedModel };
      this.ollamaClient = this.ollamaClient.withModel(snap.selectedModel);
    }
    this.lastDiscovery = snap;
    this.modelRouting = loadModelRoutingFromEnv(
      this.ollamaConfig.model || snap.selectedModel || '',
      process.env,
      this.secretsFileEnv,
      snap.models.map((m) => m.name),
    );
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
      (isPhase3AllowedOperation(req.requestedOperation) ? this.defaultExecutorMode : 'mock');

    if (resolvedMode === 'ollama') {
      assertAllowedLocalAiOperation(req.requestedOperation);
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
      modelRouting: null,
      timeProtection: null,
      contentPackId: req.contentPackId || null,
      phase: req.phase || (req.contentPackId ? 'phase3' : resolvedMode === 'ollama' ? 'phase2' : 'phase1'),
      documentReviewPack: null,
      meetingDraft: null,
      clientOperationsPack: null,
      redactionApprovedForModel: req.requireRedactionApproval
        ? false
        : Boolean(req.contentPackId) === false
          ? true
          : false,
    };

    if (req.contentPackId) {
      const pack = this.repo.getContentPack(req.contentPackId);
      if (!pack) {
        throw Object.assign(new Error('Content pack not found'), {
          status: 404,
          code: 'pack_not_found',
        });
      }
      job.redactedSourceContent = pack.redactedContent;
      job.redactionApprovedForModel = pack.redactionDecision === 'Approve Redacted Content';
      job.auditCorrelationId = pack.auditCorrelationId;
      job.injectionWarnings = pack.injectionPreview?.warnings || [];
    }

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

    // Writes must remain false in Phase 3
    if (this.flags.LocalAIWritesEnabled) {
      throw Object.assign(
        new Error('LocalAIWritesEnabled must remain false in Phase 3'),
        { status: 403, code: 'writes_not_allowed' },
      );
    }

    if (job.contentPackId || job.redactionApprovedForModel === false) {
      if (!job.redactionApprovedForModel) {
        throw Object.assign(
          new Error('Explicit redaction approval required before model processing'),
          { status: 409, code: 'redaction_not_approved' },
        );
      }
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

    const installed = (this.lastDiscovery?.models || []).map((m) => m.name);
    const routing = this.getModelRouting();
    const pack = current.contentPackId
      ? this.repo.getContentPack(current.contentPackId)
      : undefined;
    let resolution = resolveJobModel(
      current.requestedOperation,
      routing,
      (pack?.modelProfileOverride as ModelProfile | null) || undefined,
      installed.length ? installed : undefined,
    );
    current.modelRouting = resolution;
    this.repo.upsertJob(current);
    this.repo.appendAudit({
      auditCorrelationId: current.auditCorrelationId,
      aiJobId: current.aiJobId,
      at: nowIso(),
      actor: LOCAL_AI_OWNER,
      action: resolution.usedFallback ? 'model_fallback_used' : 'model_selected',
      detail: `requested=${resolution.requestedProfile}/${resolution.requestedModel || 'none'}; actual=${resolution.actualProfile}/${resolution.actualModel}; reason=${resolution.fallbackReason || 'none'}`,
      previousStatus: 'In Progress',
      nextStatus: 'In Progress',
    });

    let result = await runOllamaExecutor({
      job: current,
      sourceContent: source,
      cfg: { ...this.ollamaConfig, model: resolution.actualModel },
      client: this.ollamaClient.withModel(resolution.actualModel),
      modelOverride: resolution.actualModel,
    });

    // Phase 4A quality gate: Fast schema/malformed failure → recorded Deep retry
    const schemaFail =
      !result.ok &&
      (result.errorType === 'ValidationFailed' || result.errorType === 'MalformedResponse');
    if (schemaFail && !result.cancelled) {
      const quality = resolveQualityFallbackToDeep(
        resolution,
        routing,
        installed.length ? installed : undefined,
      );
      if (quality) {
        this.repo.appendAudit({
          auditCorrelationId: current.auditCorrelationId,
          aiJobId: current.aiJobId,
          at: nowIso(),
          actor: LOCAL_AI_OWNER,
          action: 'fast_model_quality_fallback',
          detail: `Fast model ${resolution.actualModel} failed (${result.errorType}); retrying Deep ${quality.actualModel}; priorDetail=${result.errorDetail}`,
          previousStatus: 'In Progress',
          nextStatus: 'In Progress',
        });
        const priorDuration = result.durationMs;
        resolution = quality;
        current.modelRouting = resolution;
        this.repo.upsertJob(current);
        result = await runOllamaExecutor({
          job: current,
          sourceContent: source,
          cfg: { ...this.ollamaConfig, model: resolution.actualModel },
          client: this.ollamaClient.withModel(resolution.actualModel),
          modelOverride: resolution.actualModel,
        });
        result = { ...result, durationMs: priorDuration + result.durationMs };
      }
    }

    current = this.requireJob(aiJobId);
    current.processingDurationMs = result.durationMs;
    current.modelRouting = resolution;
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
    current.ollamaMetrics = {
      ...result.metrics,
      model: resolution.actualModel,
    };
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

    // Never allow model to strip Manny approval requirements for gated ops
    if (current.requiresMannyApproval && result.outputPayload) {
      const payload = result.outputPayload as { requires_manny_approval?: boolean };
      if (payload.requires_manny_approval === false) {
        payload.requires_manny_approval = true;
        result.requiresMannyApproval = true;
        result.outputPayload = payload;
      }
    }

    current.validationStatus = 'Passed';
    current.outputPayload = result.outputPayload;
    current.outputSummary = result.outputSummary;
    current.decisionPackage = result.decisionPackage;
    current.confidence = result.confidence;
    current.errorType = null;
    current.errorDetail = null;
    current.requiresMannyApproval = result.requiresMannyApproval || current.requiresMannyApproval;
    current.mannyDecision = current.requiresMannyApproval ? 'Pending' : current.mannyDecision;
    current.recommendedNextAction = current.requiresMannyApproval
      ? 'Waiting on Manny approval'
      : 'Review draft';
    current.processingStatus = current.requiresMannyApproval ? 'Waiting on Manny' : 'Draft Ready';
    if ((result.confidence ?? 1) < 0.5) {
      current.processingStatus = 'Waiting on Manny';
      current.requiresMannyApproval = true;
      current.mannyDecision = 'Pending';
      current.recommendedNextAction = 'Low confidence — Manny review required';
    }

    const enriched = enrichJobOutputForPhase3({
      operation: current.requestedOperation,
      originalText: pack?.originalContent || source,
      redactedText: source,
      clientLabel: pack?.clientLabel || current.sourceRecordId,
      projectLabel: pack?.projectLabel,
      sensitivity: pack?.sensitivity || 'Internal',
      injectionWarnings: current.injectionWarnings || [],
      outputPayload: result.outputPayload,
      requiresMannyApproval: current.requiresMannyApproval,
      confidence: current.confidence,
    });
    current.documentReviewPack = enriched.documentReviewPack;
    current.meetingDraft = enriched.meetingDraft;
    current.clientOperationsPack = enriched.clientOperationsPack;
    current.timeProtection = enriched.timeProtection;
    current.phase = current.phase || 'phase4a';

    if (pack) {
      pack.status = 'Completed';
      pack.updatedAt = nowIso();
      this.repo.upsertContentPack(pack);
    }

    this.repo.upsertJob(current);
    this.repo.appendAudit({
      auditCorrelationId: current.auditCorrelationId,
      aiJobId: current.aiJobId,
      at: nowIso(),
      actor: LOCAL_AI_OWNER,
      action: 'ollama_output_validated',
      detail: `${SYNTHETIC_AI_OUTPUT_BANNER}; status=${current.processingStatus}; durationMs=${result.durationMs}; model=${resolution.actualModel}; fallback=${resolution.usedFallback}; reason=${resolution.fallbackReason || 'none'}`,
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
    decision: MannyDecision,
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

    const allowed: MannyDecision[] = [
      'Approved',
      'Rejected',
      'Returned for Revision',
      'Archived',
      'No Action Required',
      'Automation Candidate',
      'Eliminate',
    ];
    if (!allowed.includes(decision)) {
      throw Object.assign(new Error(`Unsupported Manny decision: ${decision}`), {
        status: 400,
        code: 'invalid_decision',
      });
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

    if (decision === 'Returned for Revision') {
      job.processingStatus = 'Returned for Revision';
      job.completedDate = null;
      job.recommendedNextAction = 'Revise draft and re-queue';
    } else if ((MANNY_TERMINAL_DRAFT_DECISIONS as readonly string[]).includes(decision)) {
      if (decision === 'Approved') {
        job.processingStatus = 'Manny Approved';
        job.wroteAuthoritativeBusinessRecord = false;
        if (!this.flags.LocalAIWritesEnabled) {
          this.repo.appendAudit({
            auditCorrelationId: job.auditCorrelationId,
            aiJobId: job.aiJobId,
            at: nowIso(),
            actor: MANNY_OWNER,
            action: 'writes_still_disabled',
            detail:
              'Manny approved draft for later use; LocalAIWritesEnabled=false — no business record mutation; no external action',
          });
        }
        job.processingStatus = 'Completed';
        job.recommendedNextAction =
          'Approved draft accepted for later use — authoritative apply deferred (writes disabled)';
      } else if (decision === 'Rejected') {
        job.processingStatus = 'Manny Rejected';
        job.recommendedNextAction = 'Rejected — no business record changes';
      } else if (decision === 'Archived') {
        job.processingStatus = 'Completed';
        job.recommendedNextAction = 'Archived draft — no action';
      } else if (decision === 'No Action Required') {
        job.processingStatus = 'Completed';
        job.recommendedNextAction = 'No action required';
      } else if (decision === 'Automation Candidate') {
        job.processingStatus = 'Completed';
        job.recommendedNextAction = 'Marked automation candidate — no auto-run';
        if (job.timeProtection) {
          job.timeProtection = {
            ...job.timeProtection,
            classification: 'Automation Candidate',
          };
        }
      } else if (decision === 'Eliminate') {
        job.processingStatus = 'Completed';
        job.recommendedNextAction = 'Marked eliminate — work should not exist';
        if (job.timeProtection) {
          job.timeProtection = {
            ...job.timeProtection,
            classification: 'Eliminate',
            shouldExist: false,
          };
        }
      }
      job.completedDate = nowIso();
      job.wroteAuthoritativeBusinessRecord = false;
    }

    this.repo.upsertJob(job);
    this.repo.appendAudit({
      auditCorrelationId: job.auditCorrelationId,
      aiJobId: job.aiJobId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action: `manny_${decision.toLowerCase().replace(/\s+/g, '_')}`,
      detail: `Manny decision: ${decision} (draft acceptance only — no writes/external actions)`,
      previousStatus: prev,
      nextStatus: job.processingStatus,
    });
    return job;
  }

  createContentPack(req: CreateContentPackRequest): ContentPackRecord {
    scanForbidden(
      req.clientId,
      req.clientLabel,
      req.projectId || undefined,
      req.projectLabel || undefined,
      req.requestedOperation,
      req.originalContent,
      req.notes,
    );
    const pack = createContentPackRecord(req);
    this.repo.upsertContentPack(pack);
    this.repo.appendAudit({
      auditCorrelationId: pack.auditCorrelationId,
      aiJobId: pack.linkedAiJobId || pack.packId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action: 'content_pack_created',
      detail: `Pack ${pack.packId} source=${pack.sourceKind} op=${pack.requestedOperation}; awaiting redaction approval; model not called`,
      nextStatus: undefined,
    });
    return this.sanitizePackForResponse(pack);
  }

  listContentPacks() {
    return this.repo.listContentPacks().map((p) => this.sanitizePackForResponse(p));
  }

  getContentPack(packId: string) {
    const pack = this.repo.getContentPack(packId);
    if (!pack) {
      throw Object.assign(new Error('Content pack not found'), {
        status: 404,
        code: 'pack_not_found',
      });
    }
    return this.sanitizePackForResponse(pack, true);
  }

  decideContentPackRedaction(
    packId: string,
    decision: RedactionDecision,
    opts?: { editedRedactedContent?: string },
  ): ContentPackRecord {
    const pack = this.repo.getContentPack(packId);
    if (!pack) {
      throw Object.assign(new Error('Content pack not found'), {
        status: 404,
        code: 'pack_not_found',
      });
    }
    const next = applyRedactionDecision(pack, decision, opts);
    this.repo.upsertContentPack(next);
    this.repo.appendAudit({
      auditCorrelationId: next.auditCorrelationId,
      aiJobId: next.linkedAiJobId || next.packId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action:
        decision === 'Approve Redacted Content'
          ? 'redaction_approved'
          : decision === 'Cancel Job'
            ? 'content_pack_cancelled'
            : 'redaction_edited',
      detail: `Redaction decision: ${decision}`,
    });
    return this.sanitizePackForResponse(next, true);
  }

  /**
   * After redaction approval: create linked AI job and optionally process.
   */
  async processContentPack(
    packId: string,
    opts?: { force?: boolean; processNow?: boolean },
  ): Promise<{ pack: ContentPackRecord; job: AiJobRecord }> {
    const pack = this.repo.getContentPack(packId);
    if (!pack) {
      throw Object.assign(new Error('Content pack not found'), {
        status: 404,
        code: 'pack_not_found',
      });
    }
    assertContentPackReadyForModel(pack);

    let job: AiJobRecord;
    if (pack.linkedAiJobId) {
      job = this.requireJob(pack.linkedAiJobId);
      job.redactionApprovedForModel = true;
      job.redactedSourceContent = pack.redactedContent;
      this.repo.upsertJob(job);
    } else {
      const created = this.createJob({
        sourceRecordType: 'ContentPack',
        sourceRecordId: pack.packId,
        requestedOperation: pack.requestedOperation,
        requestedBy: MANNY_OWNER,
        idempotencyKey: `pack:${pack.packId}`,
        executorMode: 'ollama',
        sourceContent: pack.redactedContent,
        contentPackId: pack.packId,
        phase: 'phase3',
        requireRedactionApproval: false,
      });
      job = created.job;
      job.redactionApprovedForModel = true;
      job.contentPackId = pack.packId;
      job.auditCorrelationId = pack.auditCorrelationId;
      this.repo.upsertJob(job);
      pack.linkedAiJobId = job.aiJobId;
      pack.status = 'Processing';
      pack.updatedAt = nowIso();
      this.repo.upsertContentPack(pack);
    }

    if (opts?.processNow !== false) {
      job = await this.processJob(job.aiJobId, { force: opts?.force });
    }
    const latest = this.repo.getContentPack(packId)!;
    return { pack: this.sanitizePackForResponse(latest), job };
  }

  performanceDashboard() {
    const routing = this.getModelRouting();
    return buildPerformanceDashboard(this.repo.listJobs(), this.repo.listAudit(), {
      fastModelName: routing.profiles['Fast Operations Model'].modelName || null,
      deepModelName: routing.profiles['Deep Analysis Model'].modelName || null,
    });
  }

  /**
   * Local-only Fast vs Deep side-by-side evaluation (Phase 4A).
   * Does not write authoritative records. Does not send communications.
   */
  async compareModelsSideBySide(opts: {
    operation: string;
    sourceContent: string;
    force?: boolean;
  }): Promise<{
    localOnly: true;
    operation: string;
    fast: Record<string, unknown>;
    deep: Record<string, unknown>;
    differences: Record<string, unknown>;
  }> {
    assertAllowedLocalAiOperation(opts.operation);
    if (this.flags.LocalAIWritesEnabled) {
      throw Object.assign(new Error('Writes must remain disabled'), {
        status: 403,
        code: 'writes_not_allowed',
      });
    }
    const routing = this.getModelRouting();
    const fastName = routing.profiles['Fast Operations Model'].modelName;
    const deepName = routing.profiles['Deep Analysis Model'].modelName;
    if (!fastName || !deepName) {
      throw Object.assign(new Error('Fast and Deep models must both be configured for comparison'), {
        status: 503,
        code: 'models_incomplete',
      });
    }

    const runOne = async (model: string, profile: string) => {
      const { job } = this.createJob({
        sourceRecordType: 'ModelCompare',
        sourceRecordId: `${profile}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        requestedOperation: opts.operation,
        idempotencyKey: `compare:${profile}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        executorMode: 'ollama',
        sourceContent: opts.sourceContent,
        phase: 'phase4a',
      });
      // Force specific model by temporarily setting routing on job and calling executor path
      job.modelRouting = {
        requestedProfile: profile,
        requestedModel: model,
        actualProfile: profile,
        actualModel: model,
        usedFallback: false,
        fallbackReason: null,
      };
      job.redactionApprovedForModel = true;
      this.repo.upsertJob(job);

      const started = Date.now();
      const result = await runOllamaExecutor({
        job,
        sourceContent: job.redactedSourceContent || opts.sourceContent,
        cfg: { ...this.ollamaConfig, model },
        client: this.ollamaClient.withModel(model),
        modelOverride: model,
      });
      const durationMs = Date.now() - started;
      job.processingDurationMs = durationMs;
      job.ollamaMetrics = { ...result.metrics, model };
      job.validationStatus = result.ok ? 'Passed' : 'Failed';
      job.confidence = result.confidence;
      job.outputPayload = result.outputPayload;
      job.outputSummary = result.outputSummary;
      job.processingStatus = result.ok ? 'Draft Ready' : 'Validation Failed';
      job.wroteAuthoritativeBusinessRecord = false;
      job.modelRouting = {
        requestedProfile: profile,
        requestedModel: model,
        actualProfile: profile,
        actualModel: model,
        usedFallback: false,
        fallbackReason: null,
      };
      this.repo.upsertJob(job);
      this.repo.appendAudit({
        auditCorrelationId: job.auditCorrelationId,
        aiJobId: job.aiJobId,
        at: nowIso(),
        actor: MANNY_OWNER,
        action: 'model_compare_run',
        detail: `local-only compare profile=${profile} model=${model} ok=${result.ok} durationMs=${durationMs}`,
      });

      const payload = (result.outputPayload || {}) as Record<string, unknown>;
      return {
        aiJobId: job.aiJobId,
        model,
        profile,
        durationMs,
        schemaValid: result.ok,
        validationErrors: result.validationErrors,
        confidence: result.confidence,
        requiresMannyApproval: result.requiresMannyApproval,
        executiveSummary: payload.executive_summary || result.outputSummary,
        missingInformation: payload.missing_information || [],
        risks: payload.risks || [],
        recommendedNextAction: payload.recommended_next_action || null,
        workValueTier: payload.work_value_tier || null,
        estimatedReviewMinutes:
          (payload.decision_package as { required_review_minutes?: number } | undefined)
            ?.required_review_minutes ?? null,
      };
    };

    const [fast, deep] = await Promise.all([
      runOne(fastName, 'Fast Operations Model'),
      runOne(deepName, 'Deep Analysis Model'),
    ]);

    return {
      localOnly: true,
      operation: opts.operation,
      fast,
      deep,
      differences: {
        durationDeltaMs: (fast.durationMs as number) - (deep.durationMs as number),
        confidenceDelta:
          typeof fast.confidence === 'number' && typeof deep.confidence === 'number'
            ? fast.confidence - deep.confidence
            : null,
        schemaBothValid: Boolean(fast.schemaValid && deep.schemaValid),
        recommendationDiffers:
          String(fast.recommendedNextAction || '') !== String(deep.recommendedNextAction || ''),
        missingInfoDiffers:
          JSON.stringify(fast.missingInformation) !== JSON.stringify(deep.missingInformation),
        riskDiffers: JSON.stringify(fast.risks) !== JSON.stringify(deep.risks),
        note: 'Comparison is for local model-selection decisions only — not public',
      },
    };
  }

  approvalQueue() {
    const jobs = this.repo.listJobs().filter(
      (j) =>
        j.processingStatus === 'Waiting on Manny' || j.processingStatus === 'Draft Ready',
    );
    return {
      generatedAt: nowIso(),
      items: jobs.map((j) => ({
        aiJobId: j.aiJobId,
        operation: j.requestedOperation,
        status: j.processingStatus,
        confidence: j.confidence,
        timeProtection: j.timeProtection,
        modelRouting: j.modelRouting,
        requiresMannyApproval: j.requiresMannyApproval,
        contentPackId: j.contentPackId,
        outputSummary: j.outputSummary,
        allowedDecisions: [
          'Approved',
          'Rejected',
          'Returned for Revision',
          'Archived',
          'No Action Required',
          'Automation Candidate',
          'Eliminate',
        ],
        note: 'Approval accepts draft for later use only — no writes or external actions',
      })),
    };
  }

  /** Never return full original content in list views; detail may include for Manny review. */
  private sanitizePackForResponse(pack: ContentPackRecord, includeOriginal = false): ContentPackRecord {
    if (includeOriginal) return { ...pack };
    return {
      ...pack,
      originalContent: `[local-only ${pack.originalContent.length} chars — open detail for Manny review]`,
    };
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

  // --- Phase 4B-2 document intake / enrichment ---
  listStagedDocuments() {
    return this.documentReview.list();
  }

  getStagedDocument(id: string) {
    return this.documentReview.get(id);
  }

  async stageDocument(input: {
    originalFilename: string;
    contentBase64: string;
    declaredMime?: string;
  }) {
    if (this.flags.LocalAIWritesEnabled) {
      throw Object.assign(new Error('Writes must remain disabled'), {
        status: 403,
        code: 'writes_not_allowed',
      });
    }
    const bytes = Buffer.from(input.contentBase64, 'base64');
    const rec = await this.documentReview.stage({
      originalFilename: input.originalFilename,
      bytes,
      declaredMime: input.declaredMime,
      allowSyntheticMalwareOverride: true,
    });
    this.repo.appendAudit({
      auditCorrelationId: rec.correlationId,
      aiJobId: rec.stagedFileId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action: 'document_staged',
      detail: `Staged ${rec.originalFilename} size=${rec.sizeBytes} malware=${rec.malwareScanStatus}; no file movement`,
    });
    return rec;
  }

  async processStagedDocument(opts: {
    stagedFileId: string;
    clientLabel?: string;
    projectLabel?: string | null;
    forceOcr?: boolean;
  }) {
    const rec = await this.documentReview.process(opts);
    this.repo.appendAudit({
      auditCorrelationId: rec.correlationId,
      aiJobId: rec.stagedFileId,
      at: nowIso(),
      actor: LOCAL_AI_OWNER,
      action: 'document_extracted',
      detail: `status=${rec.status}; type=${rec.reviewPackage?.classification.proposedType}; ocrPages=${rec.extraction?.ocr?.pagesProcessed ?? 0}; awaiting_redaction`,
    });
    return rec;
  }

  cancelStagedDocumentProcess(stagedFileId: string) {
    const r = this.documentReview.cancel(stagedFileId);
    this.repo.appendAudit({
      auditCorrelationId: this.documentReview.get(stagedFileId).correlationId,
      aiJobId: stagedFileId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action: 'document_process_cancel_requested',
      detail: `cancelled=${r.cancelled}`,
    });
    return r;
  }

  async decideStagedDocument(
    stagedFileId: string,
    decision: DocumentReviewDecision,
    corrections?: Record<string, unknown>,
  ) {
    const before = this.documentReview.get(stagedFileId);
    let rec = this.documentReview.decide(stagedFileId, decision, corrections);
    this.repo.appendAudit({
      auditCorrelationId: rec.correlationId,
      aiJobId: stagedFileId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action: `document_decision_${decision.toLowerCase().replace(/\s+/g, '_')}`,
      detail: `Decision=${decision}; fileRenamed=false; fileMoved=false; writes=false; priorStatus=${before.status}`,
    });
    if (decision === 'Approve Redacted Content' && rec.status === 'Enriching') {
      rec = await this.enrichStagedDocument(stagedFileId);
    }
    return rec;
  }

  /**
   * Governed Ollama (or mock) enrichment after redaction approval.
   */
  async enrichStagedDocument(stagedFileId: string) {
    const doc = this.documentReview.get(stagedFileId);
    if (doc.redactionDecision !== 'Approve Redacted Content') {
      throw Object.assign(new Error('Redaction not approved'), {
        status: 403,
        code: 'redaction_not_approved',
      });
    }
    if (this.flags.LocalAIWritesEnabled) {
      throw Object.assign(new Error('Writes must remain disabled'), {
        status: 403,
        code: 'writes_not_allowed',
      });
    }

    const deep = isDeepDocumentType(doc.reviewPackage?.classification.proposedType || 'unknown');
    const operation = deep ? 'review_complex_agreement' : 'classify_document';
    const sourceContent =
      doc.redactedContent ||
      doc.reviewPackage?.redactedContentPreview ||
      'TEST — SYNTHETIC DOCUMENT';

    const { job } = this.createJob({
      sourceRecordType: 'StagedDocument',
      sourceRecordId: stagedFileId,
      requestedOperation: operation,
      requestedBy: MANNY_OWNER,
      idempotencyKey: `doc-enrich:${stagedFileId}:${Date.now()}`,
      executorMode: this.defaultExecutorMode,
      sourceContent,
      phase: 'phase3',
      requireRedactionApproval: false,
    });
    job.redactionApprovedForModel = true;
    job.redactedSourceContent = sourceContent;
    job.auditCorrelationId = doc.correlationId;
    this.repo.upsertJob(job);

    let enrichmentError: string | null = null;
    let modelOutput: import('@hvcg/atlas-integration-core').DocumentEnrichmentOutput | null = null;
    let routingMeta: {
      requestedProfile: string;
      actualModel: string;
      usedFallback: boolean;
      fallbackReason: string | null;
    } = {
      requestedProfile: deep ? 'Deep Analysis Model' : 'Fast Operations Model',
      actualModel: 'mock',
      usedFallback: false,
      fallbackReason: null,
    };

    try {
      if (this.defaultExecutorMode === 'ollama') {
        const processed = await this.processJob(job.aiJobId, { force: true });
        routingMeta = {
          requestedProfile: String(
            (processed.modelRouting as { requestedProfile?: string } | undefined)
              ?.requestedProfile || routingMeta.requestedProfile,
          ),
          actualModel: String(
            (processed.modelRouting as { actualModel?: string } | undefined)?.actualModel ||
              processed.executorModel ||
              'ollama',
          ),
          usedFallback: Boolean(
            (processed.modelRouting as { usedFallback?: boolean } | undefined)?.usedFallback,
          ),
          fallbackReason:
            ((processed.modelRouting as { fallbackReason?: string | null } | undefined)
              ?.fallbackReason as string | null) || null,
        };
        const payload = processed.outputPayload as Record<string, unknown> | null;
        if (payload) {
          const { validateDocumentEnrichmentOutput, mergeDeterministicAndModel } =
            await import('@hvcg/atlas-integration-core');
          // Map Phase2 payload into enrichment shape
          const candidate = {
            review_id: stagedFileId,
            job_id: job.aiJobId,
            document_type:
              doc.reviewPackage?.classification.proposedType ||
              String(payload.operation || 'unknown'),
            document_type_confidence: Number(payload.confidence || 0.5),
            alternative_document_types: [],
            executive_summary: String(payload.executive_summary || ''),
            facts: payload.facts || [],
            inferences: payload.inferences || [],
            parties: [],
            dates: [],
            amounts: [],
            payment_terms: [],
            obligations: [],
            deliverables: [],
            deadlines: [],
            renewal_terms: [],
            termination_terms: [],
            default_terms: [],
            governing_law: null,
            confidentiality_terms: [],
            signatures: { expected: [], present: [], missing: [], uncertain: [] },
            missing_pages: [],
            referenced_exhibits: [],
            missing_exhibits: [],
            risks: payload.risks || [],
            missing_information: payload.missing_information || [],
            proposed_filename: doc.reviewPackage?.naming.proposedFilename || '',
            proposed_folder: doc.reviewPackage?.folder.proposedFolderPath || '',
            duplicate_status: doc.reviewPackage?.duplicate.status || 'unable_to_determine',
            recommended_next_action: String(payload.recommended_next_action || ''),
            recommended_owner: String(payload.recommended_owner || 'Manny'),
            work_value_tier: String(payload.work_value_tier || ''),
            requires_manny_approval: true,
            estimated_manny_review_minutes: 8,
            estimated_manny_time_saved_minutes: 15,
            confidence: Number(payload.confidence || 0.5),
            warnings: payload.warnings || [],
            source_references: [],
          };
          const validated = validateDocumentEnrichmentOutput(candidate, {
            expectedJobId: job.aiJobId,
            expectedReviewId: stagedFileId,
          });
          modelOutput = validated.output || null;
          if (!validated.ok) {
            enrichmentError = validated.errors.join('; ');
          }
          void mergeDeterministicAndModel;
        } else {
          enrichmentError = processed.errorDetail || 'No model payload';
        }
      } else {
        // Mock enrichment — deterministic merge only (schema-valid draft)
        const { mergeDeterministicAndModel } = await import('@hvcg/atlas-integration-core');
        const snap = doc.reviewPackage?.deterministicSnapshot as {
          documentType: string;
          documentTypeConfidence: number;
          alternatives: Array<{ type: string; confidence: number }>;
          proposedFilename: string;
          proposedFolder: string;
          duplicateStatus: string;
          dates: string[];
          amounts: string[];
          obligations: string[];
          deadlines: string[];
          facts: string[];
        };
        modelOutput = mergeDeterministicAndModel({
          reviewId: stagedFileId,
          jobId: job.aiJobId,
          deterministic: snap,
          model: null,
        });
        routingMeta.actualModel = 'mock-deterministic-enrichment';
      }
    } catch (err) {
      enrichmentError = err instanceof Error ? err.message : String(err);
    }

    const updated = this.documentReview.applyEnrichment({
      stagedFileId,
      jobId: job.aiJobId,
      modelRouting: routingMeta,
      modelOutput,
      enrichmentError,
    });
    this.repo.appendAudit({
      auditCorrelationId: updated.correlationId,
      aiJobId: job.aiJobId,
      at: nowIso(),
      actor: LOCAL_AI_OWNER,
      action: 'document_enriched',
      detail: `model=${routingMeta.actualModel}; fallback=${routingMeta.usedFallback}; err=${enrichmentError || 'none'}; draftOnly`,
    });
    return updated;
  }

  compareStagedDocumentVersions(leftId: string, rightId: string) {
    const cmp = this.documentReview.compareVersions(leftId, rightId);
    this.repo.appendAudit({
      auditCorrelationId: randomUUID(),
      aiJobId: leftId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action: 'document_version_compare',
      detail: `left=${leftId}; right=${rightId}; sameFamily=${cmp.likelySameDocumentFamily}; filesDeleted=false`,
    });
    return cmp;
  }

  createMultiDocumentReview(opts: { stagedFileIds: string[]; clientLabel: string }) {
    const pack = this.documentReview.createMultiDocumentPack(opts);
    this.repo.appendAudit({
      auditCorrelationId: pack.packId,
      aiJobId: pack.packId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action: 'multi_document_pack_created',
      detail: `files=${pack.stagedFileIds.length}; aggregateBytes=${pack.aggregateSizeBytes}; draftOnly`,
    });
    return pack;
  }

  purgeStagedDocument(stagedFileId: string) {
    const rec = this.documentReview.purge(stagedFileId);
    this.repo.appendAudit({
      auditCorrelationId: rec.correlationId,
      aiJobId: stagedFileId,
      at: nowIso(),
      actor: MANNY_OWNER,
      action: 'document_purged',
      detail: 'Staged file purged from local staging; no business-record write',
    });
    return rec;
  }

  listDocumentFixtures() {
    return this.documentReview.listFixtures().map((f) => ({
      ...f,
      contentBase64: undefined,
    }));
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
