/**
 * Manny approval gates — enforced in data/API layers, not UI-only.
 */

export const MANNY_APPROVAL_REQUIRED_ACTIONS = [
  'ProspectToClientConversion',
  'ClientAcceptanceOrRejection',
  'Pricing',
  'ScopeInterpretation',
  'ContractChanges',
  'FinancingRecommendations',
  'CapitalStrategy',
  'LenderOrInvestorCommunications',
  'StrategicClientRecommendations',
  'ExternalCommunications',
  'ClientActivation',
  'ClientOffboarding',
  'ProductionDeployment',
  'SecurityOrPermissionsChanges',
  'DestructiveActions',
] as const;

export type MannyApprovalRequiredAction = (typeof MANNY_APPROVAL_REQUIRED_ACTIONS)[number];

export const PROHIBITED_AI_AUTONOMOUS_ACTIONS = [
  ...MANNY_APPROVAL_REQUIRED_ACTIONS,
  'SendExternalEmail',
  'SendTeamsClientMessage',
  'EnableEvaIntake',
  'EnableClientEmails',
  'MutateAuthoritativeBusinessRecord',
  'AccessProductionCredentials',
  'DirectSharePointWrite',
  'DirectDataverseWrite',
  'DirectOutlookSend',
  'DirectOneDriveMutate',
  'DirectBankingAccess',
  'DirectAccountingAccess',
] as const;

export type ProhibitedAiAutonomousAction = (typeof PROHIBITED_AI_AUTONOMOUS_ACTIONS)[number];

export function requiresMannyApproval(action: string): boolean {
  return (MANNY_APPROVAL_REQUIRED_ACTIONS as readonly string[]).includes(action);
}

export function isProhibitedAutonomousAction(action: string): boolean {
  return (PROHIBITED_AI_AUTONOMOUS_ACTIONS as readonly string[]).includes(action);
}

export interface ApprovalGateResult {
  allowed: boolean;
  requiresMannyApproval: boolean;
  code: string;
  message: string;
}

/**
 * AI may prepare drafts/recommendations only. Completing gated decisions is blocked.
 */
export function evaluateAiActionAttempt(
  action: string,
  opts?: { mannyApproved?: boolean; writesEnabled?: boolean },
): ApprovalGateResult {
  if (isProhibitedAutonomousAction(action) || requiresMannyApproval(action)) {
    if (opts?.mannyApproved === true && opts?.writesEnabled === true) {
      return {
        allowed: true,
        requiresMannyApproval: true,
        code: 'manny_approved_write',
        message: 'Manny approved and writes enabled — downstream writer may proceed separately.',
      };
    }
    return {
      allowed: false,
      requiresMannyApproval: true,
      code: 'manny_approval_required',
      message: `Action "${action}" requires Manny approval. Local AI Operations Agent may prepare drafts only.`,
    };
  }
  return {
    allowed: true,
    requiresMannyApproval: false,
    code: 'allowed',
    message: 'Action permitted within AI draft boundary.',
  };
}

export function blockExternalCommunication(flags: {
  LocalAIExternalMessagesEnabled: boolean;
  ClientEmailsEnabled: boolean;
  EvaIntakeEnabled: boolean;
}): ApprovalGateResult {
  if (flags.LocalAIExternalMessagesEnabled || flags.ClientEmailsEnabled) {
    return {
      allowed: false,
      requiresMannyApproval: true,
      code: 'external_communication_blocked',
      message: 'External communications are blocked while safety flags are Off or Phase 1 policy applies.',
    };
  }
  if (flags.EvaIntakeEnabled) {
    return {
      allowed: false,
      requiresMannyApproval: true,
      code: 'eva_intake_blocked',
      message: 'EVA intake must remain disabled in Phase 1.',
    };
  }
  return {
    allowed: false,
    requiresMannyApproval: true,
    code: 'external_communication_blocked',
    message: 'External communications are blocked by Phase 1 policy.',
  };
}
