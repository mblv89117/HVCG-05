/**
 * Governed Ollama executor — validation → redaction → prompt → loopback → validate.
 * Never writes authoritative business records. Never sends external messages.
 */

import {
  SYNTHETIC_AI_OUTPUT_BANNER,
  assertPhase2AllowedOperation,
  buildLocalAiPrompt,
  extractJsonObject,
  mapPhase2ToLegacyDecisionPackage,
  redactText,
  scanForInjection,
  validatePhase2OllamaOutput,
  type AiJobRecord,
  type OllamaExecutorConfig,
  type Phase2OllamaOutput,
  type RedactionResult,
  type InjectionScanResult,
} from '@hvcg/atlas-integration-core';
import { OllamaClient } from './ollamaClient.ts';

export interface OllamaExecutorResult {
  ok: boolean;
  timedOut?: boolean;
  cancelled?: boolean;
  offline?: boolean;
  modelMissing?: boolean;
  validationPassed: boolean;
  validationErrors: string[];
  confidence: number | null;
  outputPayload: Phase2OllamaOutput | null;
  outputSummary: string | null;
  decisionPackage: ReturnType<typeof mapPhase2ToLegacyDecisionPackage> | null;
  errorType: string | null;
  errorDetail: string | null;
  redaction: RedactionResult;
  injection: InjectionScanResult;
  durationMs: number;
  metrics: {
    model?: string;
    promptChars?: number;
    responseChars?: number;
    evalCount?: number;
    evalDurationNs?: number;
  };
  requiresMannyApproval: boolean;
}

const activeControllers = new Map<string, AbortController>();

export function cancelOllamaJob(aiJobId: string): boolean {
  const c = activeControllers.get(aiJobId);
  if (!c) return false;
  c.abort('cancelled');
  activeControllers.delete(aiJobId);
  return true;
}

export async function runOllamaExecutor(opts: {
  job: AiJobRecord;
  sourceContent: string;
  cfg: OllamaExecutorConfig;
  client?: OllamaClient;
}): Promise<OllamaExecutorResult> {
  const started = Date.now();
  const job = opts.job;
  assertPhase2AllowedOperation(job.requestedOperation);

  const redaction = redactText(opts.sourceContent, { maskFinancialValues: true });
  if (redaction.blocked) {
    return {
      ok: false,
      validationPassed: false,
      validationErrors: [redaction.blockReason || 'redaction_blocked'],
      confidence: null,
      outputPayload: null,
      outputSummary: null,
      decisionPackage: null,
      errorType: 'RedactionFailure',
      errorDetail: redaction.blockReason || 'redaction blocked',
      redaction,
      injection: scanForInjection(''),
      durationMs: Date.now() - started,
      metrics: {},
      requiresMannyApproval: true,
    };
  }

  const injection = scanForInjection(redaction.redactedText);
  const prompt = buildLocalAiPrompt({
    jobId: job.aiJobId,
    operation: job.requestedOperation,
    redactedSourceContent: redaction.redactedText,
    sourceRecordType: job.sourceRecordType,
    sourceRecordId: job.sourceRecordId,
  });

  const client = opts.client || new OllamaClient(opts.cfg);
  const controller = new AbortController();
  activeControllers.set(job.aiJobId, controller);

  try {
    const chat = await client.chat({
      system: prompt.system,
      user: prompt.user,
      signal: controller.signal,
    });

    let parsed: unknown;
    try {
      parsed = extractJsonObject(chat.rawContent);
    } catch (err) {
      return {
        ok: false,
        validationPassed: false,
        validationErrors: [
          err instanceof Error ? err.message : 'malformed JSON',
          'unexpected prose or partial JSON',
        ],
        confidence: null,
        outputPayload: null,
        outputSummary: `${SYNTHETIC_AI_OUTPUT_BANNER}: malformed response rejected`,
        decisionPackage: null,
        errorType: 'MalformedResponse',
        errorDetail: err instanceof Error ? err.message : String(err),
        redaction,
        injection,
        durationMs: Date.now() - started,
        metrics: {
          model: chat.model,
          promptChars: prompt.meta.systemChars + prompt.meta.userChars,
          responseChars: chat.rawContent.length,
          evalCount: chat.evalCount,
          evalDurationNs: chat.evalDurationNs,
        },
        requiresMannyApproval: true,
      };
    }

    const validated = validatePhase2OllamaOutput(parsed, {
      expectedJobId: job.aiJobId,
      expectedOperation: job.requestedOperation,
    });

    if (!validated.ok || !validated.output) {
      return {
        ok: false,
        validationPassed: false,
        validationErrors: validated.errors,
        confidence: null,
        outputPayload: null,
        outputSummary: `${SYNTHETIC_AI_OUTPUT_BANNER}: schema validation failed`,
        decisionPackage: null,
        errorType: 'ValidationFailed',
        errorDetail: validated.errors.join('; '),
        redaction,
        injection,
        durationMs: Date.now() - started,
        metrics: {
          model: chat.model,
          promptChars: prompt.meta.systemChars + prompt.meta.userChars,
          responseChars: chat.rawContent.length,
          evalCount: chat.evalCount,
          evalDurationNs: chat.evalDurationNs,
        },
        requiresMannyApproval: true,
      };
    }

    let confidence = validated.output.confidence;
    if (injection.suspicious) {
      confidence = Math.max(0, confidence - injection.confidencePenalty);
      validated.output.confidence = confidence;
      validated.output.warnings = [
        ...validated.output.warnings,
        ...injection.warnings,
      ];
      validated.output.requires_manny_approval = true;
    }
    if (redaction.manualReviewRequired) {
      validated.output.requires_manny_approval = true;
      validated.output.warnings.push('Manual review required after redaction');
    }

    const lowConfidence = confidence < 0.5;
    const requiresManny =
      validated.output.requires_manny_approval ||
      injection.escalateToManny ||
      lowConfidence ||
      job.requiresMannyApproval;

    return {
      ok: true,
      validationPassed: true,
      validationErrors: [],
      confidence,
      outputPayload: validated.output,
      outputSummary: `${SYNTHETIC_AI_OUTPUT_BANNER}: ${validated.output.executive_summary}`.slice(
        0,
        500,
      ),
      decisionPackage: mapPhase2ToLegacyDecisionPackage(validated.output),
      errorType: null,
      errorDetail: null,
      redaction,
      injection,
      durationMs: Date.now() - started,
      metrics: {
        model: chat.model,
        promptChars: prompt.meta.systemChars + prompt.meta.userChars,
        responseChars: chat.rawContent.length,
        evalCount: chat.evalCount,
        evalDurationNs: chat.evalDurationNs,
      },
      requiresMannyApproval: requiresManny,
    };
  } catch (err) {
    const code = (err as { code?: string }).code;
    return {
      ok: false,
      timedOut: code === 'timeout',
      cancelled: code === 'cancelled',
      offline: code === 'ollama_offline',
      modelMissing: code === 'model_missing' || code === 'model_unavailable',
      validationPassed: false,
      validationErrors: [code || 'executor_error'],
      confidence: null,
      outputPayload: null,
      outputSummary: null,
      decisionPackage: null,
      errorType: code || 'ProcessingFailure',
      errorDetail: err instanceof Error ? err.message : String(err),
      redaction,
      injection,
      durationMs: Date.now() - started,
      metrics: {
        promptChars: prompt.meta.systemChars + prompt.meta.userChars,
      },
      requiresMannyApproval: true,
    };
  } finally {
    activeControllers.delete(job.aiJobId);
  }
}
