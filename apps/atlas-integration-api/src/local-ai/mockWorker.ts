/**
 * Deterministic mock AI worker — NEVER calls Ollama or external models.
 * Writes only to governed AI job structures.
 */

import {
  createDecisionPackage,
  validateDecisionPackage,
  SYNTHETIC_AI_OUTPUT_BANNER,
  SYNTHETIC_RECORD_BANNER,
  type AiJobRecord,
  type MockScenario,
  type ExecutiveDecisionPackage,
} from '@hvcg/atlas-integration-core';

export interface MockWorkerResult {
  ok: boolean;
  scenario: MockScenario;
  timedOut?: boolean;
  malformed?: boolean;
  lowConfidence?: boolean;
  failed?: boolean;
  confidence: number | null;
  outputPayload: unknown | null;
  outputSummary: string | null;
  decisionPackage: ExecutiveDecisionPackage | null;
  errorType: string | null;
  errorDetail: string | null;
  validationPassed: boolean;
  validationErrors: string[];
}

function buildSuccessPackage(job: AiJobRecord): ExecutiveDecisionPackage {
  return createDecisionPackage({
    decision: `${SYNTHETIC_RECORD_BANNER}: Approve or reject synthetic recommendation for ${job.requestedOperation}`,
    recommendation: `Local AI Operations Agent recommends proceeding with a governed draft for ${job.sourceRecordType}/${job.sourceRecordId}.`,
    why: 'Deterministic Phase 1 mock output for governance testing. No live model was invoked.',
    alternatives: [
      'Defer decision and gather missing information',
      'Assign Future Human Operator for preparation',
      'Reject and return for revision',
    ],
    risks: [
      'Synthetic data only — do not treat as real client advice',
      'External send remains blocked',
    ],
    deadline: null,
    requiredReviewTimeMinutes: 10,
    sourceRecords: [
      {
        type: job.sourceRecordType,
        id: job.sourceRecordId,
        title: `${SYNTHETIC_RECORD_BANNER} ${job.sourceRecordType}`,
      },
    ],
    confidence: 0.86,
    missingInformation: ['Live client confirmation', 'Final pricing inputs'],
  });
}

export function runMockWorker(job: AiJobRecord): MockWorkerResult {
  const scenario = job.mockScenario;

  if (scenario === 'timeout') {
    return {
      ok: false,
      scenario,
      timedOut: true,
      confidence: null,
      outputPayload: null,
      outputSummary: null,
      decisionPackage: null,
      errorType: 'Timeout',
      errorDetail: 'Mock worker simulated timeout before producing output.',
      validationPassed: false,
      validationErrors: ['timeout'],
    };
  }

  if (scenario === 'failure') {
    return {
      ok: false,
      scenario,
      failed: true,
      confidence: null,
      outputPayload: null,
      outputSummary: null,
      decisionPackage: null,
      errorType: 'ProcessingFailure',
      errorDetail: 'Mock worker simulated processing failure.',
      validationPassed: false,
      validationErrors: ['processing_failure'],
    };
  }

  if (scenario === 'malformed') {
    const malformed = {
      decision: 'broken',
      // missing required fields intentionally
      banner: 'WRONG BANNER',
    };
    const validation = validateDecisionPackage(malformed);
    return {
      ok: false,
      scenario,
      malformed: true,
      confidence: null,
      outputPayload: malformed,
      outputSummary: `${SYNTHETIC_AI_OUTPUT_BANNER}: malformed payload`,
      decisionPackage: null,
      errorType: 'MalformedResponse',
      errorDetail: validation.errors.join('; '),
      validationPassed: false,
      validationErrors: validation.errors,
    };
  }

  if (scenario === 'low_confidence') {
    const pkg = createDecisionPackage({
      ...buildSuccessPackage(job),
      confidence: 0.35,
      recommendation: 'Low-confidence synthetic recommendation — requires Manny review.',
      missingInformation: ['Primary source confirmation', 'Risk acceptance'],
    });
    // re-apply banner via createDecisionPackage
    const validation = validateDecisionPackage(pkg);
    return {
      ok: true,
      scenario,
      lowConfidence: true,
      confidence: 0.35,
      outputPayload: pkg,
      outputSummary: `${SYNTHETIC_AI_OUTPUT_BANNER}: low-confidence decision package`,
      decisionPackage: pkg,
      errorType: null,
      errorDetail: null,
      validationPassed: validation.ok,
      validationErrors: validation.errors,
    };
  }

  // success
  const pkg = buildSuccessPackage(job);
  const validation = validateDecisionPackage(pkg);
  return {
    ok: validation.ok,
    scenario: 'success',
    confidence: pkg.confidence,
    outputPayload: pkg,
    outputSummary: `${SYNTHETIC_AI_OUTPUT_BANNER}: decision package ready for validation`,
    decisionPackage: validation.ok ? pkg : null,
    errorType: validation.ok ? null : 'ValidationFailed',
    errorDetail: validation.ok ? null : validation.errors.join('; '),
    validationPassed: validation.ok,
    validationErrors: validation.errors,
  };
}
