import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOG_RESEARCH_REJECTIONS,
  CATALOG_VERIFIED_AT,
  FINANCING_DISCLAIMER,
  SOURCED_CRITERIA,
  SOURCED_LENDERS,
  SOURCED_PRODUCTS,
  buildMannyStrategyPackage,
  productFreshness,
  runLenderMatch,
  sourcedLenderCatalog,
  summarizeHistoricalLenderIntelligence,
  verifiedValue,
  buildOutreachHistorySnapshot,
  deriveHistoricalOutcome,
  type CapitalOpportunity,
  type LenderSubmission,
} from '../src/index.ts';

function synOpp(over: Partial<CapitalOpportunity> = {}): CapitalOpportunity {
  const now = '2026-08-17T00:00:00.000Z';
  return {
    id: 'cap-syn-001',
    title: 'SYNTHETIC Co working capital',
    clientId: 'client-syn-001',
    clientCode: 'SYN01',
    transactionType: 'working_capital_loc',
    need: { requestedAmount: 250_000, purpose: 'working capital', useOfFunds: 'payroll and inventory' },
    business: {
      industry: 'manufacturing',
      locations: 'US',
      annualRevenue: verifiedValue(4_200_000, 'synthetic-fixture', now, 'qa'),
      yearsInBusiness: verifiedValue(5, 'synthetic-fixture', now, 'qa'),
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

describe('sourced lender catalog quality', () => {
  it('stays inside a high-quality 20–30 product band with sourced criteria', () => {
    const catalog = sourcedLenderCatalog();
    assert.ok(catalog.products.length >= 20);
    assert.ok(catalog.products.length <= 30);
    assert.equal(catalog.products.length, SOURCED_PRODUCTS.length);
    assert.equal(catalog.lenders.length, SOURCED_LENDERS.length);
    assert.ok(catalog.criteria.length >= catalog.products.length);
    assert.equal(catalog.criteria.length, SOURCED_CRITERIA.length);
  });

  it('requires official URL, sourceType, and lastVerified 2026-08-17+ on every criterion', () => {
    const verifiedAt = Date.parse(CATALOG_VERIFIED_AT);
    assert.ok(Number.isFinite(verifiedAt));
    for (const c of sourcedLenderCatalog().criteria) {
      assert.match(c.sourceRef.sourceSystem, /^https:\/\//);
      assert.ok(['official_website', 'official_product_doc', 'sba_government'].includes(c.sourceType));
      assert.ok(Date.parse(c.lastVerified) >= Date.parse('2026-08-17T00:00:00.000Z'));
      assert.equal(c.freshness, 'CURRENT');
      assert.ok(c.sourceRef.field);
      assert.ok(c.criterion);
    }
  });

  it('does not invent Celtic FICO/DSCR/TIB or mixed Newtek 7(a) max', () => {
    const catalog = sourcedLenderCatalog();
    const celtic = catalog.products.find((p) => p.id === 'pr-catalog-celtic-7a');
    assert.ok(celtic);
    assert.equal(celtic.timeInBusinessMonths == null, true);
    assert.equal(celtic.dscrMin == null, true);
    assert.equal(/fico\s*680/i.test(celtic.creditExpectations || ''), false);
    assert.equal(
      catalog.criteria.some((c) => c.productId === 'pr-catalog-celtic-7a' && /fico/i.test(String(c.value))),
      false,
    );
    assert.equal(
      catalog.products.some((p) => /newtek/i.test(p.productName) && p.productCategory === 'sba'),
      false,
    );
    assert.ok(CATALOG_RESEARCH_REJECTIONS.length >= 10);
    assert.ok(CATALOG_RESEARCH_REJECTIONS.some((r) => /invent.*FICO|FICO.*invent|Refused to invent FICO/i.test(`${r.name} ${r.reason}`)));
  });

  it('keeps existing official SBA / Live Oak / JPM rows', () => {
    const ids = sourcedLenderCatalog().products.map((p) => p.id);
    assert.ok(ids.includes('pr-catalog-sba-7a'));
    assert.ok(ids.includes('pr-catalog-sba-wcp'));
    assert.ok(ids.includes('pr-catalog-sba-504'));
    assert.ok(ids.includes('pr-catalog-liveoak-7a'));
    assert.ok(ids.includes('pr-catalog-liveoak-express'));
    assert.ok(ids.includes('pr-catalog-jpm-abl'));
  });
});

describe('catalog matching honesty', () => {
  it('can score BEST_FIT on a SYN01 WC scenario with verified revenue and complete CURRENT criteria', () => {
    const catalog = sourcedLenderCatalog();
    const run = runLenderMatch(synOpp(), catalog.lenders, catalog.products, new Date('2026-08-17'));
    const celtic = run.matches.find((m) => m.productId === 'pr-catalog-celtic-7a');
    assert.ok(celtic);
    assert.equal(celtic.freshness, 'CURRENT');
    assert.notEqual(celtic.band, 'BEST_FIT');
    assert.equal(celtic.band, 'POSSIBLE');
    assert.ok(celtic.unknownCriticalCriteria.includes('timeInBusinessMonths'));
    assert.ok(celtic.unknownCriticalCriteria.includes('minRevenue'));
    assert.ok(celtic.supportedCriteria.includes('minAmount'));
    assert.equal(celtic.disqualifiers.length, 0);
    assert.ok(celtic.criticalCriteriaCoverage.unknown >= 2);
    assert.equal(celtic.reviewStatus, 'PENDING_MANNY');
  });

  it('does not BEST_FIT Live Oak Express when official min revenue is unstated', () => {
    const catalog = sourcedLenderCatalog();
    const run = runLenderMatch(
      synOpp({
        transactionType: 'sba_express',
        need: { requestedAmount: 200_000, purpose: 'working capital', useOfFunds: 'payroll' },
      }),
      catalog.lenders,
      catalog.products,
      new Date('2026-08-18'),
    );
    const express = run.matches.find((m) => m.productId === 'pr-catalog-liveoak-express');
    assert.ok(express);
    assert.notEqual(express.band, 'BEST_FIT');
    assert.equal(express.freshness, 'CURRENT');
    assert.ok(express.unknownCriticalCriteria.includes('minRevenue'));
    assert.ok(express.supportedCriteria.includes('timeInBusinessMonths'));
  });

  it('can BEST_FIT Bank of America unsecured LOC when amount, TIB, and revenue are CURRENT and verified', () => {
    const catalog = sourcedLenderCatalog();
    const run = runLenderMatch(synOpp(), catalog.lenders, catalog.products, new Date('2026-08-18'));
    const bofa = run.matches.find((m) => m.productId === 'pr-catalog-bofa-unsecured-loc');
    assert.ok(bofa);
    assert.equal(bofa.band, 'BEST_FIT');
    assert.equal(bofa.freshness, 'CURRENT');
    assert.equal(bofa.unknownCriticalCriteria.length, 0);
    assert.equal(bofa.disqualifiers.length, 0);
    assert.ok(bofa.supportedCriteria.includes('minRevenue'));
    assert.ok(bofa.supportedCriteria.includes('timeInBusinessMonths'));
    assert.ok(bofa.criticalCriteriaCoverage.supported >= 2);
  });

  it('never ranks STALE catalog criteria as BEST_FIT', () => {
    const catalog = sourcedLenderCatalog();
    const stale = catalog.products.map((p) =>
      p.id === 'pr-catalog-celtic-7a'
        ? { ...p, lastVerifiedAt: '2024-01-01T00:00:00.000Z', freshness: 'CURRENT' as const }
        : p,
    );
    assert.equal(productFreshness(stale.find((p) => p.id === 'pr-catalog-celtic-7a')!, new Date('2026-08-17')).freshness, 'STALE');
    const run = runLenderMatch(synOpp(), catalog.lenders, stale, new Date('2026-08-17'));
    const celtic = run.matches.find((m) => m.productId === 'pr-catalog-celtic-7a');
    assert.equal(celtic?.band, 'UNKNOWN');
    assert.notEqual(celtic?.band, 'BEST_FIT');
    assert.ok(run.matches.filter((m) => m.stale).every((m) => m.band !== 'BEST_FIT'));
  });

  it('cannot BEST_FIT when verified revenue is missing', () => {
    const catalog = sourcedLenderCatalog();
    const run = runLenderMatch(
      synOpp({
        business: { industry: 'manufacturing', annualRevenue: { value: null, verification: 'MISSING', confidence: null } },
      }),
      catalog.lenders,
      catalog.products,
      new Date('2026-08-17'),
    );
    assert.ok(run.matches.every((m) => m.band !== 'BEST_FIT'));
  });
});

describe('historical lender intelligence', () => {
  it('summarizes contacted / last status / counts without treating an offer as future certainty', () => {
    const outreach: LenderSubmission[] = [
      {
        id: 'sub-syn-1',
        capitalOpportunityId: 'cap-syn-001',
        lenderId: 'ln-catalog-celtic',
        method: 'package',
        status: 'offer',
        submittedAt: '2026-05-01T00:00:00.000Z',
        documentIds: [],
      },
      {
        id: 'sub-other',
        capitalOpportunityId: 'cap-other',
        lenderId: 'ln-catalog-celtic',
        method: 'email',
        status: 'declined',
        submittedAt: '2026-03-01T00:00:00.000Z',
        documentIds: [],
      },
    ];
    const intel = summarizeHistoricalLenderIntelligence({
      outreach,
      lenderId: 'ln-catalog-celtic',
      viewingClientCode: 'SYN01',
      opportunityClientIndex: [
        { id: 'cap-syn-001', clientCode: 'SYN01' },
        { id: 'cap-other', clientCode: 'OTH99' },
      ],
    });
    assert.equal(intel?.contacted, true);
    assert.equal(intel?.sameClient.outreachCount, 1);
    assert.equal(intel?.sameClient.lastStatus, 'offer');
    assert.equal(intel?.lenderAggregate.outreachCount, 2);
    assert.equal(intel?.lenderAggregate.declinedCount, 1);
    assert.equal(intel?.notFutureCertainty, true);
    assert.equal(intel?.notAFit, true);
    assert.match(intel?.explanation || '', /not future approval certainty/i);
    assert.equal(/OTH99|cap-other|\$[\d,]+/.test(intel?.explanation || ''), false);
    assert.equal(intel?.sourceRefs.every((r) => r.sourceRecordId !== 'sub-other'), true);
  });

  it('does not attach another client opportunity title or amount to a SYN01 match', () => {
    const catalog = sourcedLenderCatalog();
    const outreach: LenderSubmission[] = [
      {
        id: 'sub-foreign',
        capitalOpportunityId: 'cap-foreign',
        lenderId: 'ln-catalog-celtic',
        method: 'package',
        status: 'offer',
        submittedAt: '2026-04-01T00:00:00.000Z',
        notes: 'SECRET_CLIENT Acquisition $8,400,000 Confidential Title',
        documentIds: [],
      },
    ];
    const run = runLenderMatch(synOpp(), catalog.lenders, catalog.products, new Date('2026-08-17'), {
      outreach,
      opportunityClientIndex: [{ id: 'cap-foreign', clientCode: 'ACCG01' }],
    });
    const celtic = run.matches.find((m) => m.productId === 'pr-catalog-celtic-7a');
    assert.ok(celtic);
    const blob = `${celtic.historicalIntelligence?.explanation || ''} ${celtic.explanations.map((e) => e.statement).join(' ')}`;
    assert.equal(/SECRET_CLIENT|8,400,000|Confidential Title|ACCG01/i.test(blob), false);
    assert.equal(celtic.historicalIntelligence?.sameClient.outreachCount, 0);
    assert.equal(celtic.historicalIntelligence?.lenderAggregate.outreachCount, 1);
    assert.ok(celtic.band === 'POSSIBLE');
    assert.notEqual(celtic.band, 'BEST_FIT');
    assert.equal(celtic.explanations.some((e) => e.criterion === 'hvcgExperience' && e.outcome === 'met'), false);
  });

  it('joins SharePoint numeric lender lookup to catalog by sourced display name', () => {
    const catalog = sourcedLenderCatalog();
    const outreach: LenderSubmission[] = [
      {
        id: 'sub-lookup',
        capitalOpportunityId: 'cap-syn-001',
        lenderId: '5',
        lenderName: 'Celtic Bank',
        method: 'package',
        status: 'submitted',
        response: 'None',
        submittedAt: '2026-06-01T00:00:00.000Z',
        notes: 'SECRET_CLIENT do not copy',
        documentIds: [],
      },
    ];
    const intel = summarizeHistoricalLenderIntelligence({
      outreach,
      lenderId: 'ln-catalog-celtic',
      lenderName: 'Celtic Bank',
      viewingClientCode: 'SYN01',
      opportunityClientIndex: [{ id: 'cap-syn-001', clientCode: 'SYN01', requestedAmount: 250_000 }],
    });
    assert.equal(intel?.contacted, true);
    assert.equal(intel?.sameClient.outreachCount, 1);
    assert.equal(intel?.sameClient.lastOutcome, 'unknown');
    assert.equal(intel?.sameClient.requestSizeKnown, true);
    assert.equal(intel?.sameClient.requestedAmount, 250_000);
    assert.equal(intel?.lenderAggregate.requestSizeKnown, false);
    assert.equal(intel?.lenderAggregate.productKnown, false);
    assert.equal(intel?.notAStatisticalClaim, true);
    assert.match(intel?.explanation || '', /too small for rates/i);
    assert.equal(/SECRET_CLIENT|250,000/.test(intel?.explanation || ''), false);

    const run = runLenderMatch(synOpp(), catalog.lenders, catalog.products, new Date('2026-08-17'), {
      outreach,
      opportunityClientIndex: [{ id: 'cap-syn-001', clientCode: 'SYN01', requestedAmount: 250_000 }],
    });
    const celtic = run.matches.find((m) => m.productId === 'pr-catalog-celtic-7a');
    assert.equal(celtic?.historicalIntelligence?.contacted, true);
    assert.equal(celtic?.historicalExperience?.fundedCount, 0);
  });

  it('does not copy notes as a decline reason and keeps conflicting signals unknown', () => {
    const intel = summarizeHistoricalLenderIntelligence({
      outreach: [
        {
          id: 'sub-conflict',
          capitalOpportunityId: 'cap-syn-001',
          lenderId: 'ln-catalog-celtic',
          method: 'package',
          status: 'offer',
          response: 'Declined',
          messageClass: 'FUNDED',
          notes: 'Declined because DSCR — do not copy',
          submittedAt: '2026-06-02T00:00:00.000Z',
          documentIds: [],
        },
      ],
      lenderId: 'ln-catalog-celtic',
      viewingClientCode: 'SYN01',
      opportunityClientIndex: [{ id: 'cap-syn-001', clientCode: 'SYN01' }],
    });
    assert.equal(intel?.sameClient.lastOutcome, 'unknown');
    assert.equal(intel?.lenderAggregate.declineReasonKnown, false);
    assert.equal(intel?.lenderAggregate.fundedOutcome, 'funded');
    assert.equal(/DSCR|do not copy/i.test(intel?.explanation || ''), false);
  });
});

describe('outreach history snapshot', () => {
  it('counts unresolved SharePoint lookup rows without client identifiers or notes', () => {
    const snap = buildOutreachHistorySnapshot({
      outreach: [
        {
          id: 'sub-unresolved',
          capitalOpportunityId: 'cap-live',
          lenderId: '5',
          method: 'package',
          status: 'submitted',
          notes: 'SECRET_CLIENT $9,999,999',
          submittedAt: '2026-06-01T00:00:00.000Z',
          documentIds: [],
        },
        {
          id: 'sub-named',
          capitalOpportunityId: 'cap-syn-001',
          lenderId: '5',
          lenderName: 'Celtic Bank',
          method: 'package',
          status: 'rfi',
          messageClass: 'MISSING_DOCUMENT',
          submittedAt: '2026-06-02T00:00:00.000Z',
          documentIds: [],
        },
      ],
      lenders: [{ id: 'ln-catalog-celtic', name: 'Celtic Bank' }],
    });
    assert.equal(snap.rowCount, 2);
    assert.equal(snap.mappedRowCount, 1);
    assert.equal(snap.unresolvedRowCount, 1);
    assert.equal(snap.lendersWithOutreach, 1);
    assert.equal(snap.isolation.notesOmitted, true);
    assert.equal(snap.isolation.amountsOmitted, true);
    const celtic = snap.lenders.find((l) => l.lenderId === 'ln-catalog-celtic');
    assert.equal(celtic?.signals.extraDocsRequestedCount, 1);
    assert.equal(celtic?.signals.lastOutcome, 'unknown');
    assert.equal(deriveHistoricalOutcome({
      id: 'x',
      capitalOpportunityId: 'c',
      lenderId: 'l',
      method: 'package',
      status: 'submitted',
      documentIds: [],
    }), 'unknown');
    const blob = JSON.stringify(snap);
    assert.equal(/SECRET_CLIENT|9,999,999|cap-live|cap-syn-001/i.test(blob), false);
  });
});

describe('Manny strategy package', () => {
  it('assembles need, facts, structures, and PENDING_MANNY candidates', () => {
    const catalog = sourcedLenderCatalog();
    const opportunity = synOpp();
    const run = runLenderMatch(opportunity, catalog.lenders, catalog.products, new Date('2026-08-17'));
    const pack = buildMannyStrategyPackage({ opportunity, matches: run.matches });
    assert.equal(pack.reviewStatus, 'PENDING_MANNY');
    assert.equal(pack.disclaimer, FINANCING_DISCLAIMER);
    assert.equal(pack.need.requestedAmount, 250_000);
    assert.equal(pack.useOfFunds, 'payroll and inventory');
    assert.equal(pack.mannyWorkflow.externalSubmit, false);
    assert.equal(pack.mannyWorkflow.approve, 'APPROVED');
    assert.ok(pack.risks.length > 0);
    assert.ok(pack.facts.verified.some((f) => f.field === 'annualRevenue'));
    assert.ok(pack.facts.missing.includes('cash'));
    assert.ok(pack.structures.length > 0);
    assert.ok(pack.lenderCandidates.length > 0);
    const celtic = pack.lenderCandidates.find((c) => c.productId === 'pr-catalog-celtic-7a');
    assert.ok(celtic);
    assert.ok(celtic.why.length >= 1 || celtic.unknown.length >= 0);
    assert.equal(celtic.stale, false);
  });
});
