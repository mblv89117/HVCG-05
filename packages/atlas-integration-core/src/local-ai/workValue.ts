/**
 * Work-value classification for Atlas work items.
 */

import type { ConfigurableOwner } from './ownership.ts';
import { MANNY_OWNER, LOCAL_AI_OWNER, AUTOMATION_OWNER, DEFAULT_OWNER } from './ownership.ts';

export const WORK_VALUE_TIERS = [
  'Tier 1 — Manny Only',
  'Tier 2 — Advanced Delegate',
  'Tier 3 — Administrative Delegate',
  'Tier 4 — Automate',
  'Tier 5 — Eliminate',
  'Unclassified',
] as const;

export type WorkValueTier = (typeof WORK_VALUE_TIERS)[number];

export const RISK_LEVELS = ['Critical', 'High', 'Medium', 'Low', 'None'] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RECOMMENDED_DISPOSITIONS = [
  'Escalate to Manny',
  'AI Draft Decision Package',
  'Assign Local AI Operations Agent',
  'Assign Future Human Operator',
  'Automate',
  'Eliminate',
  'Batch',
  'Hold',
] as const;
export type RecommendedDisposition = (typeof RECOMMENDED_DISPOSITIONS)[number];

export interface WorkValueClassification {
  workValueTier: WorkValueTier;
  requiresMannyJudgment: boolean;
  requiresMannyApproval: boolean;
  aiEligible: boolean;
  automationEligible: boolean;
  futureHumanRole: string;
  estimatedTimeRequiredMinutes: number | null;
  estimatedBusinessValue: string;
  revenueImpact: string;
  clientImpact: string;
  riskLevel: RiskLevel;
  recommendedOwner: ConfigurableOwner;
  recommendedDisposition: RecommendedDisposition;
  reasonForEscalation: string;
  duplicateWorkDetected: boolean;
  repeatedProcessDetected: boolean;
  automationCandidate: boolean;
  estimatedMannyTimeSavedMinutes: number | null;
  actualMannyTimeUsedMinutes: number | null;
}

export function defaultWorkValueClassification(
  overrides?: Partial<WorkValueClassification>,
): WorkValueClassification {
  return {
    workValueTier: 'Unclassified',
    requiresMannyJudgment: false,
    requiresMannyApproval: false,
    aiEligible: false,
    automationEligible: false,
    futureHumanRole: 'Future Human Operator',
    estimatedTimeRequiredMinutes: null,
    estimatedBusinessValue: '',
    revenueImpact: '',
    clientImpact: '',
    riskLevel: 'Medium',
    recommendedOwner: DEFAULT_OWNER,
    recommendedDisposition: 'Hold',
    reasonForEscalation: '',
    duplicateWorkDetected: false,
    repeatedProcessDetected: false,
    automationCandidate: false,
    estimatedMannyTimeSavedMinutes: null,
    actualMannyTimeUsedMinutes: null,
    ...overrides,
  };
}

export function tierHourlyBand(tier: WorkValueTier): string {
  switch (tier) {
    case 'Tier 1 — Manny Only':
      return '$500+ per hour';
    case 'Tier 2 — Advanced Delegate':
      return '$100–$250 per hour';
    case 'Tier 3 — Administrative Delegate':
      return '$20–$50 per hour';
    case 'Tier 4 — Automate':
      return 'Automate';
    case 'Tier 5 — Eliminate':
      return 'Eliminate';
    default:
      return 'Unclassified';
  }
}

export function recommendedOwnerForTier(tier: WorkValueTier): ConfigurableOwner {
  switch (tier) {
    case 'Tier 1 — Manny Only':
      return MANNY_OWNER;
    case 'Tier 2 — Advanced Delegate':
    case 'Tier 3 — Administrative Delegate':
      return LOCAL_AI_OWNER;
    case 'Tier 4 — Automate':
      return AUTOMATION_OWNER;
    case 'Tier 5 — Eliminate':
      return DEFAULT_OWNER;
    default:
      return DEFAULT_OWNER;
  }
}
