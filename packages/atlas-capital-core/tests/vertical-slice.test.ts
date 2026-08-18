import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMannyDecision,
  assertTransition,
  buildUnderwritingSummary,
  draftStrategy,
  generateChecklist,
  matchLenders,
  prepareApplication,
  requiredOpenItems,
  reviewDocument,
  toQueueItem,
  verifiedValue,
  type CapitalDocument,
  type CapitalOpportunity,
  type LenderOrganization,
  type LenderProduct,
} from '../src/index.ts';

function syntheticOpp(): CapitalOpportunity {
  const now = '2026-08-17T00:00:00.000Z';
  return {
    id: 'cap-slice-001',
    title: 'SYNTHETIC Capital Co — $500k WC',
    clientId: 'client-syn-001',
    clientCode: 'SYN01',
    transactionType: 'sba_working_capital',
    need: {
      requestedAmount: 500_000,
      purpose: 'working capital',
      useOfFunds: 'payroll and inventory',
      urgency: 'high',
    },
    business: {
      industry: 'wholesale',
      annualRevenue: verifiedValue(3_500_000, 'synthetic-fixture', now, 'qa'),
      yearsInBusiness: verifiedValue(5, 'synthetic-fixture', now, 'qa'),
    },
    capitalProfile: {},
    transaction: { workingCapitalComponent: true },
    stage: 'NeedIdentified',
    stageEnteredAt: now,
    ownerEmail: 'owner@example.com',
    submissionReadiness: false,
    closingReadiness: false,
    lastMeaningfulActivityAt: now,
    clientApproval: 'NOT_REQUIRED',
    mannyStrategyApproval: 'NOT_REQUIRED',
    mannyShortlistApproval: 'NOT_REQUIRED',
    createdAt: now,
    updatedAt: now,
  };
}

describe('first vertical slice (synthetic)', () => {
  it('walks need → documents → review → underwriting → strategy approval → match → shortlist → application → submission-ready', () => {
    const opportunity = syntheticOpp();
    assertTransition(opportunity.stage, 'InitialQualification');
    opportunity.stage = 'InitialQualification';
    assertTransition(opportunity.stage, 'DocumentsRequested');
    opportunity.stage = 'DocumentsRequested';

    let checklist = generateChecklist({
      transactionType: opportunity.transactionType,
      personalGuaranteeExpected: true,
      sba: true,
    });
    assert.ok(checklist.some((i) => i.itemKey === 'sba-1919'));
    assert.ok(requiredOpenItems(checklist).length > 0);
    assert.equal(toQueueItem(opportunity, checklist).queue, 'AWAITING_CLIENT');

    checklist = checklist.map((i) =>
      i.requiredness === 'OPTIONAL' ? i : { ...i, status: 'ACCEPTED', verification: 'VERIFIED', receivedAt: opportunity.createdAt },
    );
    assert.equal(requiredOpenItems(checklist).length, 0);
    opportunity.stage = 'DocumentsComplete';
    assertTransition('DocumentsComplete', 'FinancialUnderwritingReview');
    opportunity.stage = 'FinancialUnderwritingReview';

    const doc: CapitalDocument = {
      id: 'doc-slice-1',
      capitalOpportunityId: opportunity.id,
      clientCode: opportunity.clientCode,
      documentType: 'pnl',
      fileName: 'SYNTHETIC P&L YTD.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
      sha256: 'aaa',
      version: 1,
      source: 'client-upload',
      associatedAt: opportunity.createdAt,
      associatedBy: 'qa',
      originalPreserved: true,
    };
    const review = reviewDocument({
      document: doc,
      extractedFacts: [
        {
          field: 'revenue',
          value: 3_500_000,
          verification: 'UNVERIFIED',
          confidence: 0.6,
          sourceRef: { sourceSystem: 'ai', sourceRecordId: doc.id, capturedAt: opportunity.createdAt },
        },
      ],
    });
    assert.equal(review.extractedFacts[0].verification, 'UNVERIFIED');

    const uw = buildUnderwritingSummary({
      opportunity,
      checklist,
      reviews: [review],
      createdBy: 'qa',
    });
    assert.ok(uw.disclaimer.toLowerCase().includes('does not guarantee'));

    assertTransition(opportunity.stage, 'StrategyDrafted');
    opportunity.stage = 'StrategyDrafted';
    const lender: LenderOrganization = { id: 'ln-syn', name: 'SYNTHETIC Bank' };
    const product: LenderProduct = {
      id: 'pr-syn',
      lenderId: 'ln-syn',
      productName: 'SBA WC',
      minAmount: 50_000,
      maxAmount: 1_000_000,
      minRevenue: 2_000_000,
      timeInBusinessMonths: 24,
      sbaParticipation: true,
      freshness: 'CURRENT',
      lastVerifiedAt: '2026-07-01T00:00:00.000Z',
      source: 'synthetic-criteria',
      verifiedBy: 'qa',
      confidence: 0.8,
    };
    const matches = matchLenders(opportunity, [lender], [product], new Date('2026-08-01'));
    assert.equal(matches[0].band, 'BEST_FIT');

    const strategy = draftStrategy({ opportunity, matches, underwriting: uw });
    assert.equal(strategy.mannyApproval, 'PENDING');
    assertTransition(opportunity.stage, 'AwaitingMannyStrategyApproval');
    opportunity.stage = 'AwaitingMannyStrategyApproval';
    const approved = applyMannyDecision(strategy, 'APPROVED', 'manny@example.com');
    assert.equal(approved.mannyApproval, 'APPROVED');
    assertTransition(opportunity.stage, 'StrategyApproved');
    opportunity.stage = 'StrategyApproved';
    assertTransition(opportunity.stage, 'LenderVendorResearch');
    opportunity.stage = 'LenderVendorResearch';
    assertTransition(opportunity.stage, 'AwaitingMannyShortlistApproval');
    opportunity.stage = 'AwaitingMannyShortlistApproval';
    assert.equal(toQueueItem(opportunity, checklist).queue, 'AWAITING_MANNY');
    assertTransition(opportunity.stage, 'ReadyForSubmission');
    opportunity.stage = 'ReadyForSubmission';

    const application = prepareApplication({
      opportunity,
      lenderId: lender.id,
      productId: product.id,
      fieldMap: {},
      documents: [doc],
    });
    assert.equal(application.status, 'PREPARED');
    assert.ok(application.attachedDocumentIds.includes(doc.id));
    assertTransition(opportunity.stage, 'Submitted');
  });
});
