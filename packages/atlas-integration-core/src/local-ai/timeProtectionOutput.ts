/**
 * Phase 3 Manny time-protection classification on every job result.
 */

export const TIME_PROTECTION_RESULT_CLASSES = [
  'Manny Only',
  'AI Completed Draft',
  'AI Can Complete After Approval',
  'Future Human Operator',
  'Automation Candidate',
  'Eliminate',
] as const;

export type TimeProtectionResultClass = (typeof TIME_PROTECTION_RESULT_CLASSES)[number];

export interface MannyTimeProtectionOutput {
  classification: TimeProtectionResultClass;
  estimatedMannyTimeSavedMinutes: number;
  estimatedMannyReviewMinutes: number;
  reasonMannyRequired: string;
  canBatch: boolean;
  isDuplicated: boolean;
  shouldExist: boolean;
  policyVersion: '1.0.0-phase3';
}

export function buildTimeProtectionOutput(input: {
  requiresMannyApproval: boolean;
  confidence: number | null;
  workValueTier?: string;
  recommendedDisposition?: string;
  duplicateDetected?: boolean;
  canBatch?: boolean;
  automationCandidate?: boolean;
  eliminate?: boolean;
  estimatedReviewMinutes?: number;
  estimatedSavedMinutes?: number;
}): MannyTimeProtectionOutput {
  let classification: TimeProtectionResultClass = 'AI Completed Draft';

  if (input.eliminate || input.workValueTier === 'Tier 5 — Eliminate') {
    classification = 'Eliminate';
  } else if (
    input.automationCandidate ||
    input.workValueTier === 'Tier 4 — Automate' ||
    input.recommendedDisposition === 'Automate'
  ) {
    classification = 'Automation Candidate';
  } else if (
    input.workValueTier === 'Tier 2 — Advanced Delegate' ||
    input.workValueTier === 'Tier 3 — Administrative Delegate' ||
    input.recommendedDisposition === 'Assign Future Human Operator'
  ) {
    classification = 'Future Human Operator';
  } else if (input.requiresMannyApproval || input.workValueTier === 'Tier 1 — Manny Only') {
    classification =
      (input.confidence ?? 0) >= 0.7
        ? 'AI Can Complete After Approval'
        : 'Manny Only';
  }

  const review =
    input.estimatedReviewMinutes ??
    (classification === 'Manny Only' ? 15 : classification === 'Eliminate' ? 2 : 8);
  const saved =
    input.estimatedSavedMinutes ??
    (classification === 'Eliminate' ? 30 : classification === 'Automation Candidate' ? 20 : 12);

  return {
    classification,
    estimatedMannyTimeSavedMinutes: saved,
    estimatedMannyReviewMinutes: review,
    reasonMannyRequired: input.requiresMannyApproval
      ? 'Gated judgment, incomplete information, or policy requires Owner review'
      : 'Manny review optional for draft acceptance',
    canBatch: Boolean(input.canBatch),
    isDuplicated: Boolean(input.duplicateDetected),
    shouldExist: !input.eliminate,
    policyVersion: '1.0.0-phase3',
  };
}
