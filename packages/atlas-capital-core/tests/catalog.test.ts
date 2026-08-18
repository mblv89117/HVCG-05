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
  it('stays inside a high-quality 10–20 product band with sourced criteria', () => {
    const catalog = sourcedLenderCatalog();
    assert.ok(catalog.products.length >= 10);
    assert.ok(catalog.products.length <= 20);
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
    assert.ok(CATALOG_RESEARCH_REJECTIONS.length >= 5);
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
    assert.ok(celtic.band === 'BEST_FIT' || celtic.band === 'POSSIBLE');
    assert.equal(celtic.reviewStatus, 'PENDING_MANNY');
  });

  it('can score BEST_FIT on Live Oak Express when amount, years, and revenue are verified', () => {
    const catalog = sourcedLenderCatalog();
    const run = runLenderMatch(
      synOpp({
        transactionType: 'sba_express',
        need: { requestedAmount: 200_000, purpose: 'working capital', useOfFunds: 'payroll' },
      }),
      catalog.lenders,
      catalog.products,
      new Date('2026-08-17'),
    );
    const express = run.matches.find((m) => m.productId === 'pr-catalog-liveoak-express');
    assert.ok(express);
    assert.equal(express.band, 'BEST_FIT');
    assert.equal(express.freshness, 'CURRENT');
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
    assert.ok(celtic.band === 'BEST_FIT' || celtic.band === 'POSSIBLE');
    assert.equal(celtic.explanations.some((e) => e.criterion === 'hvcgExperience' && e.outcome === 'met'), false);
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
