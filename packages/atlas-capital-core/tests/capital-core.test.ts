import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_DISCLAIMER,
  assertTransition,
  canTransition,
  classifyDocumentName,
  classifyLenderMessage,
  commandKpis,
  compareOffers,
  completenessPercent,
  consolidateMissingRequest,
  createFeeRecord,
  detectDuplicate,
  draftStrategy,
  evaHandoffAllowed,
  feeRequiresLegalReview,
  generateChecklist,
  InvalidStageTransitionError,
  LEGAL_COMPLIANCE_REVIEW_REQUIRED,
  matchLenders,
  markOutdated,
  overrideChecklistItem,
  prepareApplication,
  requiredOpenItems,
  reviewDocument,
  toQueueItem,
  verifiedValue,
  hasSourceRef,
  type CapitalDocument,
  type CapitalOpportunity,
  type LenderOrganization,
  type LenderProduct,
  type TermSheetOffer,
} from '../src/index.ts';

function opp(over: Partial<CapitalOpportunity> = {}): CapitalOpportunity {
  const now = '2026-08-01T00:00:00.000Z';
  return {
    id: 'cap-syn-001',
    title: 'SYNTHETIC Co working capital',
    clientId: 'client-syn-001',
    clientCode: 'SYN01',
    transactionType: 'working_capital_loc',
    need: { requestedAmount: 500_000, purpose: 'working capital', useOfFunds: 'payroll and inventory' },
    business: {
      industry: 'manufacturing',
      annualRevenue: verifiedValue(4_200_000, 'synthetic-fixture', now, 'qa'),
    },
    capitalProfile: {},
    transaction: { workingCapitalComponent: true },
    stage: 'NeedIdentified',
    stageEnteredAt: now,
    ownerEmail: 'manny@example.com',
    submissionReadiness: false,
    closingReadiness: false,
    lastMeaningfulActivityAt: now,
    clientApproval: 'NOT_REQUIRED',
    mannyStrategyApproval: 'NOT_REQUIRED',
    mannyShortlistApproval: 'NOT_REQUIRED',
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

describe('capital stages', () => {
  it('allows NeedIdentified → InitialQualification', () => {
    assert.equal(canTransition('NeedIdentified', 'InitialQualification'), true);
    assertTransition('NeedIdentified', 'InitialQualification');
  });

  it('rejects skipping to Funded', () => {
    assert.equal(canTransition('NeedIdentified', 'Funded'), false);
    assert.throws(() => assertTransition('NeedIdentified', 'Funded'), InvalidStageTransitionError);
  });

  it('requires Manny gates rather than skipping them', () => {
    assert.equal(canTransition('StrategyDrafted', 'LenderVendorResearch'), false);
    assert.equal(canTransition('StrategyDrafted', 'AwaitingMannyStrategyApproval'), true);
    assert.equal(canTransition('LenderVendorResearch', 'ReadyForSubmission'), false);
    assert.equal(canTransition('AwaitingMannyShortlistApproval', 'ReadyForSubmission'), true);
  });
});

describe('checklist engine', () => {
  it('varies required items by transaction type', () => {
    const wc = generateChecklist({ transactionType: 'working_capital_loc' });
    const sba = generateChecklist({ transactionType: 'sba', personalGuaranteeExpected: true });
    const eq = generateChecklist({ transactionType: 'equipment' });
    assert.ok(wc.some((i) => i.itemKey === 'ar-aging'));
    assert.ok(!wc.some((i) => i.itemKey === 'sba-1919'));
    assert.ok(sba.some((i) => i.itemKey === 'sba-1919'));
    assert.ok(eq.some((i) => i.itemKey === 'eq-invoice'));
    assert.ok(!eq.some((i) => i.itemKey === 'ar-aging'));
  });

  it('applies conditional personal financial statement', () => {
    const withPg = generateChecklist({ transactionType: 'conventional_bank_loan', personalGuaranteeExpected: true });
    const without = generateChecklist({ transactionType: 'conventional_bank_loan', personalGuaranteeExpected: false });
    assert.ok(withPg.some((i) => i.itemKey === 'pfs' || i.itemKey === 'sba-413'));
    assert.ok(!without.some((i) => i.itemKey === 'pfs'));
  });

  it('marks outdated accepted documents and consolidates missing requests', () => {
    const items = generateChecklist({ transactionType: 'sba' });
    items[0].status = 'ACCEPTED';
    items[0].expiration = '2020-01-01';
    const aged = markOutdated(items, new Date('2026-08-01'));
    assert.equal(aged[0].status, 'OUTDATED');
    const missing = consolidateMissingRequest(aged, 'SYN01');
    assert.ok(missing);
    assert.ok(missing.body.includes('one package'));
    assert.ok(requiredOpenItems(aged).length > 0);
    assert.ok(completenessPercent(aged) < 100);
  });

  it('requires an audit reason for human override', () => {
    const [item] = generateChecklist({ transactionType: 'sba' });
    assert.throws(() => overrideChecklistItem(item, { status: 'NOT_APPLICABLE', overrideReason: '  ', overrideBy: 'qa' }));
    const overridden = overrideChecklistItem(item, {
      status: 'NOT_APPLICABLE',
      overrideReason: 'Not applicable to this structure',
      overrideBy: 'qa@example.com',
    });
    assert.equal(overridden.status, 'NOT_APPLICABLE');
    assert.equal(overridden.overrideBy, 'qa@example.com');
  });
});

describe('lender matching', () => {
  const lender: LenderOrganization = { id: 'ln-1', name: 'SYNTHETIC Bank' };
  const current: LenderProduct = {
    id: 'pr-1',
    lenderId: 'ln-1',
    productName: 'WC LOC',
    minAmount: 100_000,
    maxAmount: 1_000_000,
    minRevenue: 2_000_000,
    freshness: 'CURRENT',
    lastVerifiedAt: '2026-06-01T00:00:00.000Z',
    source: 'lender-sheet-synthetic',
    verifiedBy: 'qa',
    confidence: 0.8,
    acquisitionAppetite: false,
  };

  it('scores BEST_FIT only with current complete criteria', () => {
    const [m] = matchLenders(opp(), [lender], [current], new Date('2026-07-01'));
    assert.equal(m.band, 'BEST_FIT');
    assert.ok(m.reasons.length > 0);
  });

  it('never ranks BEST_FIT on stale criteria', () => {
    const stale = { ...current, lastVerifiedAt: '2024-01-01T00:00:00.000Z', freshness: 'CURRENT' as const };
    const [m] = matchLenders(opp(), [lender], [stale], new Date('2026-08-01'));
    assert.equal(m.stale, true);
    assert.notEqual(m.band, 'BEST_FIT');
    assert.equal(m.band, 'UNKNOWN');
  });

  it('marks INELIGIBLE when amount exceeds max', () => {
    const [m] = matchLenders(opp({ need: { requestedAmount: 5_000_000, purpose: 'wc' } }), [lender], [current]);
    assert.equal(m.band, 'INELIGIBLE');
  });

  it('returns UNKNOWN when criteria source is missing', () => {
    const bare: LenderProduct = {
      id: 'pr-2',
      lenderId: 'ln-1',
      productName: 'Unknown product',
      freshness: 'UNKNOWN',
      confidence: null,
    };
    const [m] = matchLenders(opp(), [lender], [bare]);
    assert.equal(m.band, 'UNKNOWN');
    assert.ok(m.missingCriteria.length > 0);
  });
});

describe('AI governance', () => {
  it('does not promote extracted facts to VERIFIED', () => {
    const doc: CapitalDocument = {
      id: 'doc-1',
      capitalOpportunityId: 'cap-syn-001',
      clientCode: 'SYN01',
      documentType: 'pnl',
      fileName: 'P&L YTD.pdf',
      contentType: 'application/pdf',
      sizeBytes: 12,
      version: 1,
      source: 'client-upload',
      associatedAt: '2026-08-01T00:00:00.000Z',
      associatedBy: 'qa',
      originalPreserved: true,
    };
    const review = reviewDocument({
      document: doc,
      extractedFacts: [
        {
          field: 'revenue',
          value: 4_200_000,
          verification: 'VERIFIED',
          confidence: 0.9,
          sourceRef: { sourceSystem: 'ai', capturedAt: '2026-08-01T00:00:00.000Z' },
        },
      ],
    });
    assert.equal(review.extractedFacts[0].verification, 'UNVERIFIED');
    assert.ok(review.disclaimer.includes('unverified'));
    assert.ok(AI_DISCLAIMER.length > 10);
    assert.equal(classifyDocumentName('Bank Statement June.pdf').documentType, 'bank_statement');
  });

  it('drops extracted facts with missing SourceRefs and never promotes them', () => {
    const doc: CapitalDocument = {
      id: 'doc-nosrc',
      capitalOpportunityId: 'cap-syn-001',
      clientCode: 'SYN01',
      documentType: 'pnl',
      fileName: 'P&L YTD.pdf',
      contentType: 'application/pdf',
      sizeBytes: 12,
      version: 1,
      source: 'client-upload',
      associatedAt: '2026-08-01T00:00:00.000Z',
      associatedBy: 'qa',
      originalPreserved: true,
    };
    const review = reviewDocument({
      document: doc,
      extractedFacts: [
        {
          field: 'revenue',
          value: 99_000_000,
          verification: 'VERIFIED',
          confidence: 0.99,
          sourceRef: { sourceSystem: '', capturedAt: '' },
        },
      ],
    });
    assert.equal(review.extractedFacts.length, 0);
    assert.ok(review.conflicts.some((c) => /sourceRef required/i.test(c)));
    assert.equal(hasSourceRef({ sourceSystem: '', capturedAt: '' }), false);
  });

  it('does not treat hallucinated UNVERIFIED revenue as current financials', () => {
    const lender: LenderOrganization = { id: 'ln-1', name: 'SYNTHETIC Bank' };
    const current: LenderProduct = {
      id: 'pr-1',
      lenderId: 'ln-1',
      productName: 'WC LOC',
      minAmount: 100_000,
      maxAmount: 1_000_000,
      minRevenue: 2_000_000,
      freshness: 'CURRENT',
      lastVerifiedAt: '2026-06-01T00:00:00.000Z',
      source: 'lender-sheet-synthetic',
      verifiedBy: 'qa',
      confidence: 0.8,
    };
    const hallucinated = opp({
      business: {
        industry: 'manufacturing',
        annualRevenue: { value: 50_000_000, verification: 'UNVERIFIED', confidence: 0.9 },
      },
    });
    const [m] = matchLenders(hallucinated, [lender], [current], new Date('2026-07-01'));
    assert.notEqual(m.band, 'BEST_FIT');
    assert.ok(m.missingCriteria.some((c) => /revenue/i.test(c)));
  });

  it('does not invent lender min/max when criteria are blank', () => {
    const lender: LenderOrganization = { id: 'ln-1', name: 'SYNTHETIC Bank' };
    const invented: LenderProduct = {
      id: 'pr-blank',
      lenderId: 'ln-1',
      productName: 'Blank product',
      freshness: 'UNKNOWN',
      confidence: null,
    };
    const [m] = matchLenders(opp(), [lender], [invented]);
    assert.equal(m.band, 'UNKNOWN');
    assert.equal(invented.minAmount, undefined);
    assert.equal(invented.maxAmount, undefined);
    assert.ok(!m.reasons.some((r) => /meets stated minimum \(100/.test(r)));
  });

  it('detects duplicate hashes', () => {
    const a: CapitalDocument = {
      id: 'doc-a',
      capitalOpportunityId: 'cap-syn-001',
      clientCode: 'SYN01',
      documentType: 'other',
      fileName: 'a.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1,
      sha256: 'abc',
      version: 1,
      source: 'client-upload',
      associatedAt: '2026-08-01T00:00:00.000Z',
      associatedBy: 'qa',
      originalPreserved: true,
    };
    assert.equal(detectDuplicate([a], { sha256: 'abc', fileName: 'b.pdf' }), 'doc-a');
  });
});

describe('strategy, application, fees, handoff', () => {
  it('keeps strategy pending until Manny approval', () => {
    const strategy = draftStrategy({
      opportunity: opp(),
      matches: [],
      underwriting: {
        id: 'uw',
        capitalOpportunityId: 'cap-syn-001',
        sections: { Revenue: 'MISSING' },
        missingInformation: ['YTD P&L'],
        expectedQuestions: [],
        potentialStructures: [],
        recommendedNextSteps: [],
        usedUnverifiedFacts: false,
        createdAt: '2026-08-01T00:00:00.000Z',
        createdBy: 'qa',
        disclaimer: 'x',
      },
    });
    assert.equal(strategy.mannyApproval, 'PENDING');
    assert.ok(strategy.disclaimer.toLowerCase().includes('does not guarantee'));
  });

  it('application prep never fills unknown revenue', () => {
    const pkg = prepareApplication({
      opportunity: opp({ business: { annualRevenue: { value: null, verification: 'MISSING', confidence: null } } }),
      lenderId: 'ln-1',
      fieldMap: {},
      documents: [],
    });
    assert.equal(pkg.status, 'BLOCKED_MISSING_FIELDS');
    assert.ok(pkg.missingFields.some((f) => f.field === 'annualRevenue' && f.requiredFrom === 'CLIENT_INPUT_REQUIRED'));
    assert.equal(pkg.populatedFields.annualRevenue, undefined);
  });

  it('flags regulated / tail fees for legal review', () => {
    assert.equal(feeRequiresLegalReview('debt success fee'), true);
    const rec = createFeeRecord({ clientCode: 'SYN01', feeType: 'equity-related success fee' });
    assert.equal(rec.legalComplianceReviewRequired, true);
    assert.ok(rec.notes?.includes(LEGAL_COMPLIANCE_REVIEW_REQUIRED));
  });

  it('routes EVA under $2M away from Manny capacity', () => {
    assert.equal(evaHandoffAllowed(500_000).route, 'nurture_360');
    assert.equal(evaHandoffAllowed(2_000_000).route, 'atlas_hvcg');
    assert.equal(evaHandoffAllowed(null).route, 'nurture_360');
  });
});

describe('command center and communications', () => {
  it('classifies RFI and extracts bullets + due date', () => {
    const c = classifyLenderMessage('Please provide additional information by 2026-09-01:\n- AR aging\n- Updated P&L');
    assert.equal(c.classification, 'REQUEST_FOR_INFORMATION');
    assert.deepEqual(c.requestedItems, ['AR aging', 'Updated P&L']);
    assert.equal(c.dueDate, '2026-09-01');
  });

  it('does not hide offer comparison assumptions', () => {
    const offers: TermSheetOffer[] = [
      {
        id: 'o1',
        capitalOpportunityId: 'cap-syn-001',
        lenderId: 'ln-1',
        lenderName: 'A',
        interestRate: 9,
        assumptions: ['30-day close'],
        createdAt: '2026-08-01T00:00:00.000Z',
      },
      {
        id: 'o2',
        capitalOpportunityId: 'cap-syn-001',
        lenderId: 'ln-2',
        lenderName: 'B',
        interestRate: 11,
        assumptions: [],
        createdAt: '2026-08-01T00:00:00.000Z',
      },
    ];
    const cmp = compareOffers(offers);
    assert.ok(cmp.notes.some((n) => n.includes('no assumptions')));
    assert.ok(cmp.disclaimer.toLowerCase().includes('does not guarantee'));
  });

  it('builds KPIs and aging queues', () => {
    const o = opp({ stage: 'AwaitingMannyStrategyApproval', nextAction: 'Approve strategy' });
    const items = generateChecklist({ transactionType: o.transactionType });
    const q = toQueueItem(o, items);
    assert.equal(q.queue, 'AWAITING_MANNY');
    const kpis = commandKpis([o], new Map([[o.id, items]]), [], []);
    assert.equal(kpis.mannyApprovalsRequired, 1);
    assert.ok(kpis.documentsBlocked > 0);
  });
});
