/**
 * Capital Operations pipeline stages.
 * Additive to legacy HVCG_CapitalOpportunities.FundingStatus — do not delete the legacy field.
 */

export const CAPITAL_STAGES = [
  'NeedIdentified',
  'InitialQualification',
  'DocumentsRequested',
  'DocumentsInProgress',
  'DocumentsComplete',
  'FinancialUnderwritingReview',
  'StrategyDrafted',
  'AwaitingMannyStrategyApproval',
  'StrategyApproved',
  'LenderVendorResearch',
  'AwaitingMannyShortlistApproval',
  'ReadyForSubmission',
  'Submitted',
  'AdditionalInformationRequested',
  'Underwriting',
  'TermSheetOfferReceived',
  'OfferComparison',
  'ClientDecision',
  'Closing',
  'Funded',
  'Declined',
  'Withdrawn',
  'ClosedArchived',
] as const;

export type CapitalStage = (typeof CAPITAL_STAGES)[number];

export const TERMINAL_STAGES: readonly CapitalStage[] = [
  'Funded',
  'Declined',
  'Withdrawn',
  'ClosedArchived',
];

export const MANNY_APPROVAL_STAGES: readonly CapitalStage[] = [
  'AwaitingMannyStrategyApproval',
  'AwaitingMannyShortlistApproval',
];

/** Legacy SharePoint FundingStatus → operational stage (lossy, documented). */
export const LEGACY_FUNDING_STATUS_TO_STAGE: Record<string, CapitalStage> = {
  Identified: 'NeedIdentified',
  Packaging: 'DocumentsInProgress',
  Outreach: 'LenderVendorResearch',
  Underwriting: 'Underwriting',
  'Term Sheet': 'TermSheetOfferReceived',
  'Due Diligence': 'Closing',
  Committed: 'Closing',
  Closed: 'Funded',
  Declined: 'Declined',
  'On Hold': 'NeedIdentified',
};

export const STAGE_TO_LEGACY_FUNDING_STATUS: Record<CapitalStage, string> = {
  NeedIdentified: 'Identified',
  InitialQualification: 'Identified',
  DocumentsRequested: 'Packaging',
  DocumentsInProgress: 'Packaging',
  DocumentsComplete: 'Packaging',
  FinancialUnderwritingReview: 'Packaging',
  StrategyDrafted: 'Packaging',
  AwaitingMannyStrategyApproval: 'Packaging',
  StrategyApproved: 'Outreach',
  LenderVendorResearch: 'Outreach',
  AwaitingMannyShortlistApproval: 'Outreach',
  ReadyForSubmission: 'Outreach',
  Submitted: 'Underwriting',
  AdditionalInformationRequested: 'Underwriting',
  Underwriting: 'Underwriting',
  TermSheetOfferReceived: 'Term Sheet',
  OfferComparison: 'Term Sheet',
  ClientDecision: 'Term Sheet',
  Closing: 'Due Diligence',
  Funded: 'Closed',
  Declined: 'Declined',
  Withdrawn: 'On Hold',
  ClosedArchived: 'Closed',
};

const FORWARD: Record<CapitalStage, CapitalStage[]> = {
  NeedIdentified: ['InitialQualification', 'Withdrawn', 'ClosedArchived'],
  InitialQualification: ['DocumentsRequested', 'Withdrawn', 'Declined'],
  DocumentsRequested: ['DocumentsInProgress', 'Withdrawn'],
  DocumentsInProgress: ['DocumentsComplete', 'DocumentsRequested', 'Withdrawn'],
  DocumentsComplete: ['FinancialUnderwritingReview', 'DocumentsInProgress'],
  FinancialUnderwritingReview: ['StrategyDrafted', 'DocumentsInProgress'],
  StrategyDrafted: ['AwaitingMannyStrategyApproval'],
  AwaitingMannyStrategyApproval: ['StrategyApproved', 'StrategyDrafted', 'Withdrawn'],
  StrategyApproved: ['LenderVendorResearch'],
  LenderVendorResearch: ['AwaitingMannyShortlistApproval'],
  AwaitingMannyShortlistApproval: ['ReadyForSubmission', 'LenderVendorResearch', 'Withdrawn'],
  ReadyForSubmission: ['Submitted', 'Withdrawn'],
  Submitted: ['AdditionalInformationRequested', 'Underwriting', 'Declined', 'Withdrawn'],
  AdditionalInformationRequested: ['Underwriting', 'Submitted', 'Declined', 'Withdrawn'],
  Underwriting: ['TermSheetOfferReceived', 'AdditionalInformationRequested', 'Declined', 'Withdrawn'],
  TermSheetOfferReceived: ['OfferComparison', 'Declined', 'Withdrawn'],
  OfferComparison: ['ClientDecision'],
  ClientDecision: ['Closing', 'Declined', 'Withdrawn'],
  Closing: ['Funded', 'Declined', 'Withdrawn'],
  Funded: ['ClosedArchived'],
  Declined: ['ClosedArchived', 'NeedIdentified'],
  Withdrawn: ['ClosedArchived', 'NeedIdentified'],
  ClosedArchived: [],
};

export class InvalidStageTransitionError extends Error {
  readonly from: CapitalStage;
  readonly to: CapitalStage;
  constructor(from: CapitalStage, to: CapitalStage) {
    super(`Invalid capital stage transition: ${from} → ${to}`);
    this.name = 'InvalidStageTransitionError';
    this.from = from;
    this.to = to;
  }
}

export function isCapitalStage(value: unknown): value is CapitalStage {
  return typeof value === 'string' && (CAPITAL_STAGES as readonly string[]).includes(value);
}

export function allowedTransitions(from: CapitalStage): CapitalStage[] {
  return FORWARD[from].slice();
}

export function canTransition(from: CapitalStage, to: CapitalStage): boolean {
  return FORWARD[from].includes(to);
}

export function assertTransition(from: CapitalStage, to: CapitalStage): void {
  if (!canTransition(from, to)) throw new InvalidStageTransitionError(from, to);
}

export function isTerminal(stage: CapitalStage): boolean {
  return (TERMINAL_STAGES as readonly CapitalStage[]).includes(stage);
}

export function requiresMannyApproval(stage: CapitalStage): boolean {
  return (MANNY_APPROVAL_STAGES as readonly CapitalStage[]).includes(stage);
}

export function daysInStage(stageEnteredAt: string, now = new Date()): number {
  const entered = Date.parse(stageEnteredAt);
  if (!Number.isFinite(entered)) return 0;
  return Math.max(0, Math.floor((now.getTime() - entered) / 86_400_000));
}

export type AgingBand = 'fresh' | 'watch' | 'overdue' | 'critical';

export function agingBand(days: number, dueDate?: string | null, now = new Date()): AgingBand {
  if (dueDate) {
    const due = Date.parse(dueDate);
    if (Number.isFinite(due) && now.getTime() > due) {
      const overdueDays = Math.floor((now.getTime() - due) / 86_400_000);
      return overdueDays >= 7 ? 'critical' : 'overdue';
    }
  }
  if (days >= 21) return 'critical';
  if (days >= 14) return 'overdue';
  if (days >= 7) return 'watch';
  return 'fresh';
}

export const STAGE_LABELS: Record<CapitalStage, string> = {
  NeedIdentified: 'Need Identified',
  InitialQualification: 'Initial Qualification',
  DocumentsRequested: 'Documents Requested',
  DocumentsInProgress: 'Documents In Progress',
  DocumentsComplete: 'Documents Complete',
  FinancialUnderwritingReview: 'Financial / Underwriting Review',
  StrategyDrafted: 'Strategy Drafted',
  AwaitingMannyStrategyApproval: 'Awaiting Manny Strategy Approval',
  StrategyApproved: 'Strategy Approved',
  LenderVendorResearch: 'Lender / Vendor Research',
  AwaitingMannyShortlistApproval: 'Awaiting Manny Shortlist Approval',
  ReadyForSubmission: 'Ready for Submission',
  Submitted: 'Submitted',
  AdditionalInformationRequested: 'Additional Information Requested',
  Underwriting: 'Underwriting',
  TermSheetOfferReceived: 'Term Sheet / Offer Received',
  OfferComparison: 'Offer Comparison',
  ClientDecision: 'Client Decision',
  Closing: 'Closing',
  Funded: 'Funded',
  Declined: 'Declined',
  Withdrawn: 'Withdrawn',
  ClosedArchived: 'Closed / Archived',
};
