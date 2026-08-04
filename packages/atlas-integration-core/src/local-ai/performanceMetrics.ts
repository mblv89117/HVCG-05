/**
 * Performance / latency metrics for Local AI Operations (Phase 3/4A).
 */

import type { AiJobRecord } from './aiJob.ts';
import type { AiAuditEvent } from './aiJob.ts';
import { DEEP_ONLY_OPERATIONS } from './modelRouting.ts';

export const ROUTINE_DURATION_FLAG_MS = 30_000;
export const DEEP_DURATION_FLAG_MS = 180_000;

export interface PerformanceDashboard {
  generatedAt: string;
  jobCount: number;
  averageDurationMsByOperation: Record<string, number>;
  averageDurationMsByModel: Record<string, number>;
  fastModelAverageLatencyMs: number | null;
  deepModelAverageLatencyMs: number | null;
  validationRateByModel: Record<string, { passed: number; failed: number; rate: number }>;
  failureRate: number;
  validationFailureRate: number;
  averageRedactionReviewMs: number | null;
  averageMannyReviewMs: number | null;
  estimatedMannyTimeSavedMinutes: number;
  averageQueueWaitMs: number | null;
  fallbackUsageCount: number;
  fallbackRate: number;
  retryRate: number;
  cancelledJobs: number;
  timeoutCount: number;
  confidenceByOperation: Record<string, number>;
  modelSelectionReasons: Record<string, number>;
  slowestRoutineOperations: Array<{ operation: string; averageMs: number }>;
  operationsThatShouldRemainDeepOnly: string[];
  flags: string[];
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function rate(num: number, den: number): number {
  if (!den) return 0;
  return num / den;
}

export function buildPerformanceDashboard(
  jobs: AiJobRecord[],
  audit: AiAuditEvent[],
  opts?: { fastModelName?: string | null; deepModelName?: string | null },
): PerformanceDashboard {
  const byOp: Record<string, number[]> = {};
  const byModel: Record<string, number[]> = {};
  const confByOp: Record<string, number[]> = {};
  const validationByModel: Record<string, { passed: number; failed: number }> = {};
  const selectionReasons: Record<string, number> = {};
  let fallbackUsageCount = 0;
  let cancelledJobs = 0;
  let timeoutCount = 0;
  let failures = 0;
  let validationFailures = 0;
  let estimatedSaved = 0;
  let retryJobs = 0;
  const flags: string[] = [];
  const fastName = opts?.fastModelName || '';
  const deepName = opts?.deepModelName || '';
  const fastDurations: number[] = [];
  const deepDurations: number[] = [];

  for (const j of jobs) {
    if (j.processingStatus === 'Cancelled') cancelledJobs += 1;
    if (j.errorType === 'timeout' || j.errorDetail?.includes('timed out')) timeoutCount += 1;
    if (
      j.processingStatus === 'Processing Failed' ||
      j.processingStatus === 'Validation Failed'
    ) {
      failures += 1;
    }
    if (j.validationStatus === 'Failed') validationFailures += 1;
    if (j.retryCount > 0) retryJobs += 1;
    if (j.modelRouting?.usedFallback) fallbackUsageCount += 1;
    const reason = j.modelRouting?.fallbackReason || (j.modelRouting ? 'direct' : 'unknown');
    selectionReasons[reason] = (selectionReasons[reason] || 0) + 1;
    if (j.timeProtection?.estimatedMannyTimeSavedMinutes) {
      estimatedSaved += j.timeProtection.estimatedMannyTimeSavedMinutes;
    }
    const model = j.modelRouting?.actualModel || j.ollamaMetrics?.model || 'unknown';
    const vb = validationByModel[model] || { passed: 0, failed: 0 };
    if (j.validationStatus === 'Passed') vb.passed += 1;
    if (j.validationStatus === 'Failed') vb.failed += 1;
    validationByModel[model] = vb;

    if (typeof j.confidence === 'number') {
      (confByOp[j.requestedOperation] ||= []).push(j.confidence);
    }

    if (typeof j.processingDurationMs === 'number') {
      (byOp[j.requestedOperation] ||= []).push(j.processingDurationMs);
      (byModel[model] ||= []).push(j.processingDurationMs);
      if (fastName && model === fastName) fastDurations.push(j.processingDurationMs);
      if (deepName && model === deepName) deepDurations.push(j.processingDurationMs);
      const isDeep =
        j.modelRouting?.requestedProfile === 'Deep Analysis Model' ||
        j.modelRouting?.actualProfile === 'Deep Analysis Model' ||
        (DEEP_ONLY_OPERATIONS as readonly string[]).includes(j.requestedOperation);
      if (!isDeep && j.processingDurationMs > ROUTINE_DURATION_FLAG_MS) {
        flags.push(`routine_over_30s:${j.aiJobId}`);
      }
      if (isDeep && j.processingDurationMs > DEEP_DURATION_FLAG_MS) {
        flags.push(`deep_over_180s:${j.aiJobId}`);
      }
    }
    if (j.retryCount >= 2) flags.push(`repeated_retries:${j.aiJobId}`);
  }

  const schemaFailByModel: Record<string, number> = {};
  for (const j of jobs) {
    if (j.validationStatus === 'Failed') {
      const m = j.modelRouting?.actualModel || 'unknown';
      schemaFailByModel[m] = (schemaFailByModel[m] || 0) + 1;
    }
  }
  for (const [m, c] of Object.entries(schemaFailByModel)) {
    if (c >= 2) flags.push(`frequent_schema_failures:${m}`);
  }

  const redactionReviewMs: number[] = [];
  const mannyReviewMs: number[] = [];
  const queueWaitMs: number[] = [];

  const byJob = new Map<string, AiAuditEvent[]>();
  for (const e of audit) {
    const list = byJob.get(e.aiJobId) || [];
    list.push(e);
    byJob.set(e.aiJobId, list);
  }
  for (const [, events] of byJob) {
    const sorted = [...events].sort((a, b) => a.at.localeCompare(b.at));
    const created = sorted.find(
      (e) => e.action === 'job_created' || e.action === 'content_pack_created',
    );
    const queued = sorted.find((e) => e.action === 'job_queued');
    const started = sorted.find(
      (e) => e.action === 'ollama_executor_started' || e.action === 'mock_worker_started',
    );
    const redactionApproved = sorted.find((e) => e.action === 'redaction_approved');
    const mannyDecided = sorted.find((e) => e.action.startsWith('manny_'));
    if (created && redactionApproved) {
      redactionReviewMs.push(
        new Date(redactionApproved.at).getTime() - new Date(created.at).getTime(),
      );
    }
    if (queued && started) {
      queueWaitMs.push(new Date(started.at).getTime() - new Date(queued.at).getTime());
    }
    const waiting = sorted.find((e) => e.nextStatus === 'Waiting on Manny');
    if (waiting && mannyDecided) {
      mannyReviewMs.push(
        new Date(mannyDecided.at).getTime() - new Date(waiting.at).getTime(),
      );
    }
  }

  const averageDurationMsByOperation: Record<string, number> = {};
  for (const [k, vals] of Object.entries(byOp)) {
    averageDurationMsByOperation[k] = avg(vals) ?? 0;
  }
  const averageDurationMsByModel: Record<string, number> = {};
  for (const [k, vals] of Object.entries(byModel)) {
    averageDurationMsByModel[k] = avg(vals) ?? 0;
  }
  const confidenceByOperation: Record<string, number> = {};
  for (const [k, vals] of Object.entries(confByOp)) {
    confidenceByOperation[k] = avg(vals) ?? 0;
  }
  const validationRateByModel: PerformanceDashboard['validationRateByModel'] = {};
  for (const [m, v] of Object.entries(validationByModel)) {
    const total = v.passed + v.failed;
    validationRateByModel[m] = {
      ...v,
      rate: rate(v.passed, total),
    };
  }

  const slowestRoutineOperations = Object.entries(averageDurationMsByOperation)
    .filter(([op]) => !(DEEP_ONLY_OPERATIONS as readonly string[]).includes(op))
    .map(([operation, averageMs]) => ({ operation, averageMs }))
    .sort((a, b) => b.averageMs - a.averageMs)
    .slice(0, 8);

  return {
    generatedAt: new Date().toISOString(),
    jobCount: jobs.length,
    averageDurationMsByOperation,
    averageDurationMsByModel,
    fastModelAverageLatencyMs: avg(fastDurations),
    deepModelAverageLatencyMs: avg(deepDurations),
    validationRateByModel,
    failureRate: rate(failures, jobs.length),
    validationFailureRate: rate(validationFailures, jobs.length),
    averageRedactionReviewMs: avg(redactionReviewMs),
    averageMannyReviewMs: avg(mannyReviewMs),
    estimatedMannyTimeSavedMinutes: estimatedSaved,
    averageQueueWaitMs: avg(queueWaitMs),
    fallbackUsageCount,
    fallbackRate: rate(fallbackUsageCount, jobs.length),
    retryRate: rate(retryJobs, jobs.length),
    cancelledJobs,
    timeoutCount,
    confidenceByOperation,
    modelSelectionReasons: selectionReasons,
    slowestRoutineOperations,
    operationsThatShouldRemainDeepOnly: [...DEEP_ONLY_OPERATIONS],
    flags: [...new Set(flags)].slice(0, 50),
  };
}
