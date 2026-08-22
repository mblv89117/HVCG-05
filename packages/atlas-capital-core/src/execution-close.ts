/**
 * Closing checklist, funded evidence, fee/tail compliance.
 * Funded requires authorized confirmation. Fees never self-certify legal permissibility.
 */

import { LEGAL_COMPLIANCE_REVIEW_REQUIRED } from './types.ts';
import type {
  ClientDecisionRecord,
  ClosingCondition,
  FeeComplianceStatus,
  FeeRecord,
  FundingEvent,
  SourceRef,
} from './types.ts';
import { defaultClosingConditions, feeRequiresLegalReview } from './intelligence.ts';

export function seedClosingChecklist(capitalOpportunityId: string, transactionType: string): ClosingCondition[] {
  return defaultClosingConditions(transactionType).map((c) => ({
    ...c,
    capitalOpportunityId,
    notes: `${c.notes || ''} Generic architecture — not legal completeness. Lender/counsel controls actual closing requirements.`.trim(),
  }));
}

export function recordClientDecision(input: {
  capitalOpportunityId: string;
  clientCode: string;
  selectedTermSheetId?: string;
  decision: ClientDecisionRecord['decision'];
  decisionBy: string;
  reason?: string;
  alternativesRejected?: string[];
  conditionsAccepted?: string;
  outstandingQuestions?: string;
}): ClientDecisionRecord {
  return {
    id: `dec-${input.capitalOpportunityId}`,
    capitalOpportunityId: input.capitalOpportunityId,
    clientCode: input.clientCode,
    selectedTermSheetId: input.selectedTermSheetId,
    decision: input.decision,
    decisionDate: new Date().toISOString(),
    decisionBy: input.decisionBy,
    reason: input.reason,
    alternativesRejected: input.alternativesRejected || [],
    conditionsAccepted: input.conditionsAccepted,
    outstandingQuestions: input.outstandingQuestions,
    legallyBinding: false,
  };
}

export function recordFundingEvent(input: {
  capitalOpportunityId: string;
  clientCode: string;
  fundedDate: string;
  grossAmount?: number;
  netProceeds?: number;
  lenderId?: string;
  productId?: string;
  sourceRef?: SourceRef;
  verifiedBy?: string;
  evidenceKind?: FundingEvent['evidenceKind'];
}): FundingEvent {
  if (!input.verifiedBy) {
    throw new Error('Funded requires authorized confirmation (verifiedBy). Expected closing date is not evidence.');
  }
  if (!input.sourceRef?.sourceSystem || !input.sourceRef.capturedAt || input.sourceRef.capturedAt === 'MISSING') {
    throw new Error('Funded requires a SourceRef. Do not mark Funded from an expected closing date.');
  }
  return {
    id: `fund-${input.capitalOpportunityId}`,
    capitalOpportunityId: input.capitalOpportunityId,
    clientCode: input.clientCode,
    fundedDate: input.fundedDate,
    grossAmount: input.grossAmount,
    netProceeds: input.netProceeds,
    lenderId: input.lenderId,
    productId: input.productId,
    sourceRef: input.sourceRef,
    verifiedBy: input.verifiedBy,
    evidenceKind: input.evidenceKind || 'authorized_confirmation',
  };
}

export function feeComplianceFor(feeType: string, explicit?: FeeComplianceStatus): {
  legalComplianceReviewRequired: boolean;
  complianceStatus: FeeComplianceStatus;
  complianceNote?: string;
} {
  const legal = feeRequiresLegalReview(feeType);
  if (explicit) {
    return {
      legalComplianceReviewRequired: legal || explicit === 'REVIEW_REQUIRED',
      complianceStatus: explicit,
      complianceNote: explicit === 'REVIEW_REQUIRED' ? LEGAL_COMPLIANCE_REVIEW_REQUIRED : undefined,
    };
  }
  if (legal) {
    return {
      legalComplianceReviewRequired: true,
      complianceStatus: 'REVIEW_REQUIRED',
      complianceNote: LEGAL_COMPLIANCE_REVIEW_REQUIRED,
    };
  }
  return {
    legalComplianceReviewRequired: false,
    complianceStatus: 'UNKNOWN',
    complianceNote: 'Not certified as legally permissible. UNKNOWN until reviewed.',
  };
}

export function enrichFeeRecord(rec: FeeRecord): FeeRecord {
  const c = feeComplianceFor(rec.feeType, rec.complianceStatus);
  return {
    ...rec,
    legalComplianceReviewRequired: c.legalComplianceReviewRequired,
    complianceStatus: c.complianceStatus,
    complianceNote: rec.complianceNote || c.complianceNote,
  };
}
