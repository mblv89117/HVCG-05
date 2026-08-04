/**
 * Performance / latency metrics for Local AI Operations (Phase 3).
 */

import type { AiJobRecord } from './aiJob.ts';
import type { AiAuditEvent } from './aiJob.ts';

export const ROUTINE_DURATION_FLAG_MS = 30_000;
export const DEEP_DURATION_FLAG_MS = 180_000;

export interface PerformanceDashboard {
  generatedAt: string;
  jobCount: number;
  averageDurationMsByOperation: Record<string, number>;
  averageDurationMsByModel: Record<string, number>;
  failureRate: number;
  validationFailureRate: number;
  averageRedactionReviewMs: number | null;
  averageMannyReviewMs: number | null;
  estimatedMannyTimeSavedMinutes: number;
  averageQueueWaitMs: number | null;
  fallbackUsageCount: number;
  cancelledJobs: number;
  timeoutCount: number;
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
): PerformanceDashboard {
  const withDuration = jobs.filter((j) => typeof j.processingDurationMs === 'number');
  const byOp: Record<string, number[]> = {};
  const byModel: Record<string, number[]> = {};
  let fallbackUsageCount = 0;
  let cancelledJobs = 0;
  let timeoutCount = 0;
  let failures = 0;
  let validationFailures = 0;
  let estimatedSaved = 0;
  const flags: string[] = [];

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
    if (j.modelRouting?.usedFallback) fallbackUsageCount += 1;
    if (j.timeProtection?.estimatedMannyTimeSavedMinutes) {
      estimatedSaved += j.timeProtection.estimatedMannyTimeSavedMinutes;
    }
    if (typeof j.processingDurationMs === 'number') {
      (byOp[j.requestedOperation] ||= []).push(j.processingDurationMs);
      const model = j.modelRouting?.actualModel || j.ollamaMetrics?.model || 'unknown';
      (byModel[model] ||= []).push(j.processingDurationMs);
      const isDeep =
        j.modelRouting?.requestedProfile === 'Deep Analysis Model' ||
        j.requestedOperation.includes('decision') ||
        j.requestedOperation.includes('client') ||
        j.requestedOperation.includes('strategic');
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
    const created = sorted.find((e) => e.action === 'job_created' || e.action === 'content_pack_created');
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

  return {
    generatedAt: new Date().toISOString(),
    jobCount: jobs.length,
    averageDurationMsByOperation,
    averageDurationMsByModel,
    failureRate: rate(failures, jobs.length),
    validationFailureRate: rate(validationFailures, jobs.length),
    averageRedactionReviewMs: avg(redactionReviewMs),
    averageMannyReviewMs: avg(mannyReviewMs),
    estimatedMannyTimeSavedMinutes: estimatedSaved,
    averageQueueWaitMs: avg(queueWaitMs),
    fallbackUsageCount,
    cancelledJobs,
    timeoutCount,
    flags: [...new Set(flags)].slice(0, 50),
  };
}
