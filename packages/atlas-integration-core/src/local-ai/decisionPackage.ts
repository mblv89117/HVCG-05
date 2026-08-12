/**
 * Executive decision package schema — structured AI/mock output for Manny review.
 */

export const SYNTHETIC_AI_OUTPUT_BANNER =
  'TEST — SYNTHETIC AI OUTPUT — DO NOT SEND';

export const SYNTHETIC_RECORD_BANNER = 'TEST — DO NOT CONTACT';

export interface ExecutiveDecisionPackage {
  decision: string;
  recommendation: string;
  why: string;
  alternatives: string[];
  risks: string[];
  deadline: string | null;
  requiredReviewTimeMinutes: number;
  sourceRecords: Array<{
    type: string;
    id: string;
    title: string;
  }>;
  confidence: number;
  missingInformation: string[];
  banner: typeof SYNTHETIC_AI_OUTPUT_BANNER;
  schemaVersion: string;
}

export const DECISION_PACKAGE_SCHEMA_VERSION = '1.0.0-phase1';

export function createDecisionPackage(
  partial: Omit<ExecutiveDecisionPackage, 'banner' | 'schemaVersion'> & {
    banner?: string;
    schemaVersion?: string;
  },
): ExecutiveDecisionPackage {
  return {
    ...partial,
    banner: SYNTHETIC_AI_OUTPUT_BANNER,
    schemaVersion: partial.schemaVersion || DECISION_PACKAGE_SCHEMA_VERSION,
  };
}

export function validateDecisionPackage(value: unknown): {
  ok: boolean;
  errors: string[];
  package?: ExecutiveDecisionPackage;
} {
  const errors: string[] = [];
  if (!value || typeof value !== 'object') {
    return { ok: false, errors: ['Decision package must be an object'] };
  }
  const p = value as Record<string, unknown>;
  for (const key of [
    'decision',
    'recommendation',
    'why',
    'alternatives',
    'risks',
    'requiredReviewTimeMinutes',
    'sourceRecords',
    'confidence',
    'missingInformation',
  ]) {
    if (!(key in p)) errors.push(`Missing field: ${key}`);
  }
  if (typeof p.decision !== 'string' || !p.decision.trim()) errors.push('decision must be non-empty string');
  if (typeof p.recommendation !== 'string') errors.push('recommendation must be string');
  if (typeof p.why !== 'string') errors.push('why must be string');
  if (!Array.isArray(p.alternatives)) errors.push('alternatives must be array');
  if (!Array.isArray(p.risks)) errors.push('risks must be array');
  if (!Array.isArray(p.sourceRecords)) errors.push('sourceRecords must be array');
  if (!Array.isArray(p.missingInformation)) errors.push('missingInformation must be array');
  if (typeof p.confidence !== 'number' || p.confidence < 0 || p.confidence > 1) {
    errors.push('confidence must be number 0..1');
  }
  if (typeof p.requiredReviewTimeMinutes !== 'number') {
    errors.push('requiredReviewTimeMinutes must be number');
  }
  if (p.banner !== SYNTHETIC_AI_OUTPUT_BANNER) {
    errors.push(`banner must be exactly "${SYNTHETIC_AI_OUTPUT_BANNER}"`);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], package: p as unknown as ExecutiveDecisionPackage };
}
