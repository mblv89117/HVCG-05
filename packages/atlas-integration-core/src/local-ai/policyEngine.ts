/**
 * Deterministic time-protection / routing policy engine.
 * No LLM — rule-based only for Phase 1.
 */

import type { ConfigurableOwner } from './ownership.ts';
import {
  AUTOMATION_OWNER,
  DEFAULT_OWNER,
  LOCAL_AI_OWNER,
  MANNY_OWNER,
} from './ownership.ts';
import { requiresMannyApproval } from './approvalGates.ts';
import type { RecommendedDisposition, RiskLevel, WorkValueTier } from './workValue.ts';
import { recommendedOwnerForTier } from './workValue.ts';

export const TIME_PROTECTION_POLICY_VERSION = '1.0.0-phase1';

export interface TimeProtectionInput {
  title: string;
  description?: string;
  requestedOperation?: string;
  generatesRevenue?: boolean;
  protectsClient?: boolean;
  reducesRisk?: boolean;
  buildsHvcg?: boolean;
  isDuplicate?: boolean;
  isNecessary?: boolean;
  canBatch?: boolean;
  canAutomate?: boolean;
  canAiComplete?: boolean;
  canAiPrepareDecisionPackage?: boolean;
  riskLevel?: RiskLevel;
  estimatedMannyMinutes?: number;
}

export interface TimeProtectionResult {
  recommendedOwner: ConfigurableOwner;
  recommendedTier: WorkValueTier;
  recommendedDisposition: RecommendedDisposition;
  escalationRequired: boolean;
  reason: string;
  confidence: number;
  policyVersion: typeof TIME_PROTECTION_POLICY_VERSION;
  evaluation: {
    canAutomationComplete: boolean;
    canLocalAiComplete: boolean;
    canAiPrepareDecisionPackage: boolean;
    isDuplicated: boolean;
    isNecessary: boolean;
    canBatch: boolean;
    strategicValue: boolean;
  };
  estimatedMannyTimeSavedMinutes: number;
}

function strategic(input: TimeProtectionInput): boolean {
  return Boolean(
    input.generatesRevenue ||
      input.protectsClient ||
      input.reducesRisk ||
      input.buildsHvcg,
  );
}

export function evaluateTimeProtection(input: TimeProtectionInput): TimeProtectionResult {
  const op = input.requestedOperation || '';
  const gated = op ? requiresMannyApproval(op) : false;
  const isDuplicate = Boolean(input.isDuplicate);
  const isNecessary = input.isNecessary !== false;
  const canAutomate = Boolean(input.canAutomate);
  const canAiComplete = Boolean(input.canAiComplete);
  const canAiPrepare = input.canAiPrepareDecisionPackage !== false;
  const canBatch = Boolean(input.canBatch);
  const hasStrategic = strategic(input);
  const risk = input.riskLevel || 'Medium';
  const mannyMinutes = input.estimatedMannyMinutes ?? 30;

  const evaluation = {
    canAutomationComplete: canAutomate && !gated,
    canLocalAiComplete: canAiComplete && !gated,
    canAiPrepareDecisionPackage: canAiPrepare,
    isDuplicated: isDuplicate,
    isNecessary,
    canBatch,
    strategicValue: hasStrategic,
  };

  // 5. Unnecessary → Eliminate
  if (!isNecessary) {
    return {
      recommendedOwner: DEFAULT_OWNER,
      recommendedTier: 'Tier 5 — Eliminate',
      recommendedDisposition: 'Eliminate',
      escalationRequired: false,
      reason: 'Work item marked unnecessary — recommend eliminate.',
      confidence: 0.95,
      policyVersion: TIME_PROTECTION_POLICY_VERSION,
      evaluation,
      estimatedMannyTimeSavedMinutes: mannyMinutes,
    };
  }

  // 4. Duplicate → Hold / eliminate duplicate routing to Manny
  if (isDuplicate) {
    return {
      recommendedOwner: DEFAULT_OWNER,
      recommendedTier: 'Tier 5 — Eliminate',
      recommendedDisposition: 'Eliminate',
      escalationRequired: false,
      reason: 'Duplicate work detected — do not route to Manny.',
      confidence: 0.92,
      policyVersion: TIME_PROTECTION_POLICY_VERSION,
      evaluation,
      estimatedMannyTimeSavedMinutes: mannyMinutes,
    };
  }

  // Gated strategic decisions → Manny with AI decision package
  if (gated || (risk === 'Critical' && hasStrategic)) {
    return {
      recommendedOwner: MANNY_OWNER,
      recommendedTier: 'Tier 1 — Manny Only',
      recommendedDisposition: canAiPrepare ? 'AI Draft Decision Package' : 'Escalate to Manny',
      escalationRequired: true,
      reason: gated
        ? `Operation "${op}" requires Manny approval — AI may prepare a decision package only.`
        : 'Critical strategic risk requires Manny judgment.',
      confidence: 0.9,
      policyVersion: TIME_PROTECTION_POLICY_VERSION,
      evaluation,
      estimatedMannyTimeSavedMinutes: canAiPrepare ? Math.max(5, mannyMinutes - 15) : 0,
    };
  }

  // 1. Automation
  if (canAutomate) {
    return {
      recommendedOwner: AUTOMATION_OWNER,
      recommendedTier: 'Tier 4 — Automate',
      recommendedDisposition: 'Automate',
      escalationRequired: false,
      reason: 'Deterministic automation can complete this work.',
      confidence: 0.88,
      policyVersion: TIME_PROTECTION_POLICY_VERSION,
      evaluation,
      estimatedMannyTimeSavedMinutes: mannyMinutes,
    };
  }

  // 6. Batch
  if (canBatch && !hasStrategic) {
    return {
      recommendedOwner: LOCAL_AI_OWNER,
      recommendedTier: 'Tier 3 — Administrative Delegate',
      recommendedDisposition: 'Batch',
      escalationRequired: false,
      reason: 'Low strategic value — batch with similar administrative work.',
      confidence: 0.8,
      policyVersion: TIME_PROTECTION_POLICY_VERSION,
      evaluation,
      estimatedMannyTimeSavedMinutes: mannyMinutes,
    };
  }

  // 2 / 3. Local AI complete or prepare package
  if (canAiComplete) {
    return {
      recommendedOwner: LOCAL_AI_OWNER,
      recommendedTier: 'Tier 3 — Administrative Delegate',
      recommendedDisposition: 'Assign Local AI Operations Agent',
      escalationRequired: false,
      reason: 'Local AI Operations Agent can complete within draft/governance boundary.',
      confidence: 0.85,
      policyVersion: TIME_PROTECTION_POLICY_VERSION,
      evaluation,
      estimatedMannyTimeSavedMinutes: mannyMinutes,
    };
  }

  if (canAiPrepare) {
    return {
      recommendedOwner: LOCAL_AI_OWNER,
      recommendedTier: 'Tier 2 — Advanced Delegate',
      recommendedDisposition: 'AI Draft Decision Package',
      escalationRequired: hasStrategic,
      reason: 'AI prepares decision package; Manny remains decision-maker if escalation required.',
      confidence: 0.82,
      policyVersion: TIME_PROTECTION_POLICY_VERSION,
      evaluation,
      estimatedMannyTimeSavedMinutes: Math.max(10, mannyMinutes - 10),
    };
  }

  // Improper default: Unassigned, not Manny, unless strategic
  if (hasStrategic) {
    return {
      recommendedOwner: MANNY_OWNER,
      recommendedTier: 'Tier 1 — Manny Only',
      recommendedDisposition: 'Escalate to Manny',
      escalationRequired: true,
      reason: 'Strategic value present and no safer routing path — escalate to Manny.',
      confidence: 0.7,
      policyVersion: TIME_PROTECTION_POLICY_VERSION,
      evaluation,
      estimatedMannyTimeSavedMinutes: 0,
    };
  }

  return {
    recommendedOwner: DEFAULT_OWNER,
    recommendedTier: 'Unclassified',
    recommendedDisposition: 'Hold',
    escalationRequired: false,
    reason: 'Insufficient signals — hold in Unassigned Operations; do not auto-route to Manny.',
    confidence: 0.6,
    policyVersion: TIME_PROTECTION_POLICY_VERSION,
    evaluation,
    estimatedMannyTimeSavedMinutes: 0,
  };
}

export function applyTierOwner(tier: WorkValueTier): ConfigurableOwner {
  return recommendedOwnerForTier(tier);
}
