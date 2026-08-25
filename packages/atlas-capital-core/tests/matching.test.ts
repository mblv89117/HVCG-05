import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyClientCapitalProfile,
  CRITERIA_STALE_DAYS,
  FINANCING_DISCLAIMER,
  filterLenderUniverse,
  matchLenders,
  organizationFreshness,
  productFreshness,
  runLenderMatch,
  summarizeHvcgExperience,
  verifiedValue,
  type CapitalOpportunity,
  type CapitalProfile,
  type LenderMatch,
  type LenderOrganization,
  type LenderProduct,
  type LenderSubmission,
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

const lender: LenderOrganization = {
  id: 'ln-1',
  name: 'SYNTHETIC Bank',
  relationshipStatus: 'Active',
  verificationSource: 'lender-call',
};

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

function assertEveryExplanationSourced(matches: ReturnType<typeof matchLenders>): void {
  for (const m of matches) {
    assert.ok(m.sourceRef.sourceSystem, `match ${m.lenderName} missing sourceRef`);
    assert.ok(m.explanations.length > 0);
    for (const e of m.explanations) {
      assert.ok(e.sourceRef.sourceSystem, `explanation ${e.criterion} missing sourceSystem`);
      assert.ok(e.sourceRef.capturedAt, `explanation ${e.criterion} missing capturedAt`);
      assert.ok(e.sourceRef.field, `explanation ${e.criterion} missing field`);
    }
    assert.equal(m.reviewStatus, 'PENDING_MANNY');
    assert.ok(Array.isArray(m.supportedCriteria));
    assert.ok(Array.isArray(m.unknownCriticalCriteria));
    assert.ok(Array.isArray(m.staleCriticalCriteria));
    assert.ok(Array.isArray(m.disqualifiers));
    assert.ok(m.criticalCriteriaCoverage);
    assertNoFakePercentScore(m);
  }
}

function assertNoFakePercentScore(match: LenderMatch): void {
  assert.equal('score' in match, false);
  assert.equal('percent' in match, false);
  assert.equal('fitPercent' in match, false);
  assert.equal('matchPercent' in match, false);
  assert.equal('confidence' in match, false);
  const blob = `${match.band} ${match.reasons.join(' ')} ${match.explanations.map((e) => e.statement).join(' ')}`;
  assert.equal(/\b\d{1,3}\s*%\s*(fit|match|score)\b/i.test(blob), false);
  assert.equal(/\b(fit|match)\s*score\b/i.test(blob), false);
}

describe('lender freshness', () => {
  it('forces CURRENT without LastVerifiedAt to UNKNOWN', () => {
    const p = productFreshness({ ...current, lastVerifiedAt: undefined, freshness: 'CURRENT' });
    assert.equal(p.freshness, 'UNKNOWN');
  });

  it('degrades LastVerifiedAt older than 180 days to STALE', () => {
    const p = productFreshness(
      { ...current, lastVerifiedAt: '2024-01-01T00:00:00.000Z', freshness: 'CURRENT' },
      new Date('2026-08-01'),
    );
    assert.equal(p.freshness, 'STALE');
    assert.ok(CRITERIA_STALE_DAYS === 180);
  });

  it('requires source and verifiedBy for honest CURRENT', () => {
    const missingSource = productFreshness({ ...current, source: undefined }, new Date('2026-07-01'));
    const missingBy = productFreshness({ ...current, verifiedBy: undefined }, new Date('2026-07-01'));
    assert.equal(missingSource.freshness, 'UNKNOWN');
    assert.equal(missingBy.freshness, 'UNKNOWN');
  });

  it('treats labeled CURRENT org without verification source as UNKNOWN', () => {
    assert.equal(
      organizationFreshness({ id: 'ln-x', name: 'X', freshness: 'CURRENT' }, new Date('2026-08-01')),
      'UNKNOWN',
    );
  });
});

describe('matching bands and source refs', () => {
  it('scores BEST_FIT only with current complete criteria and sourced explanations', () => {
    const [m] = matchLenders(opp(), [lender], [current], new Date('2026-07-01'));
    assert.equal(m.band, 'BEST_FIT');
    assert.equal(m.freshness, 'CURRENT');
    assert.equal(m.unknownCriticalCriteria.length, 0);
    assert.equal(m.disqualifiers.length, 0);
    assert.ok(m.supportedCriteria.includes('minAmount'));
    assert.ok(m.criticalCriteriaCoverage.unknown === 0);
    assertEveryExplanationSourced([m]);
    assert.ok(m.explanations.some((e) => e.sourceRef.sourceSystem === 'lender-sheet-synthetic'));
  });

  it('never ranks BEST_FIT on stale criteria', () => {
    const stale = { ...current, lastVerifiedAt: '2024-01-01T00:00:00.000Z', freshness: 'CURRENT' as const };
    const [m] = matchLenders(opp(), [lender], [stale], new Date('2026-08-01'));
    assert.equal(m.stale, true);
    assert.equal(m.freshness, 'STALE');
    assert.equal(m.band, 'UNKNOWN');
    assert.notEqual(m.band, 'BEST_FIT');
    assert.notEqual(m.band, 'POSSIBLE');
    assert.notEqual(m.band, 'LOW_FIT');
    assertEveryExplanationSourced([m]);
  });

  it('marks INELIGIBLE when amount exceeds stated max', () => {
    const [m] = matchLenders(opp({ need: { requestedAmount: 5_000_000, purpose: 'wc' } }), [lender], [current]);
    assert.equal(m.band, 'INELIGIBLE');
    assert.ok(m.explanations.some((e) => e.outcome === 'ineligible' && e.sourceRef.field === 'MaxAmount'));
  });

  it('returns UNKNOWN when product criteria are missing', () => {
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
    assertEveryExplanationSourced([m]);
  });

  it('returns UNKNOWN for a lender with no products instead of inventing criteria', () => {
    const [m] = matchLenders(opp(), [lender], [], new Date('2026-08-01'));
    assert.equal(m.band, 'UNKNOWN');
    assert.ok(m.missingCriteria.includes('product criteria'));
    assert.equal(m.freshness, 'UNKNOWN');
    assertEveryExplanationSourced([m]);
  });

  it('does not treat unverified revenue as a fit or as ineligibility', () => {
    const unverified = opp({
      business: {
        industry: 'manufacturing',
        annualRevenue: { value: 500_000, verification: 'UNVERIFIED', confidence: 0.4 },
      },
    });
    const [m] = matchLenders(unverified, [lender], [current], new Date('2026-07-01'));
    assert.notEqual(m.band, 'BEST_FIT');
    assert.notEqual(m.band, 'INELIGIBLE');
    assert.equal(m.band, 'UNKNOWN');
    assert.ok(m.explanations.some((e) => e.criterion === 'annualRevenue' && e.outcome === 'unknown'));
  });

  it('does not BEST_FIT when stated geography is not supported', () => {
    const geo: LenderProduct = { ...current, geography: 'Texas' };
    const [m] = matchLenders(
      opp({ business: { industry: 'manufacturing', locations: 'California', annualRevenue: verifiedValue(4_200_000, 'synthetic-fixture', '2026-08-01T00:00:00.000Z', 'qa') } }),
      [lender],
      [geo],
      new Date('2026-07-01'),
    );
    assert.notEqual(m.band, 'BEST_FIT');
    assert.ok(m.explanations.some((e) => e.criterion === 'geography' && e.outcome === 'not_met'));
    assertEveryExplanationSourced([m]);
  });

  it('does not parse PreferredProducts notes into numeric criteria', () => {
    const withNote: LenderOrganization = {
      ...lender,
      preferredProductsNote: 'WC 100k-1M; min rev 2M',
    };
    const [m] = matchLenders(opp(), [withNote], [], new Date('2026-08-01'));
    assert.equal(m.band, 'UNKNOWN');
    assert.ok(m.explanations.some((e) => e.criterion === 'preferredProductsNote' && e.outcome === 'context'));
    assert.equal(m.explanations.some((e) => e.statement.includes('100k') && e.outcome === 'met'), false);
  });
});

describe('filter, historical experience, Manny review', () => {
  it('filters Do Not Contact before matching', () => {
    const blocked: LenderOrganization = {
      id: 'ln-dnc',
      name: 'SYNTHETIC DNC',
      relationshipStatus: 'Do Not Contact',
    };
    const run = runLenderMatch(opp(), [lender, blocked], [current], new Date('2026-07-01'));
    assert.equal(run.matches.some((m) => m.lenderId === 'ln-dnc'), false);
    assert.equal(run.filteredOut.length, 1);
    assert.equal(run.filteredOut[0].lenderId, 'ln-dnc');
    assert.equal(run.filteredOut[0].sourceRef.field, 'RelationshipStatus');
    assert.equal(run.review.status, 'PENDING_MANNY');
  });

  it('cites HVCG_LenderOutreach as historical experience without promoting UNKNOWN', () => {
    const outreach: LenderSubmission[] = [
      {
        id: 'sub-1',
        capitalOpportunityId: 'cap-old',
        lenderId: 'ln-1',
        method: 'package',
        status: 'submitted',
        submittedAt: '2026-04-01T00:00:00.000Z',
        submittedBy: 'manny@example.com',
        documentIds: [],
      },
    ];
    const experience = summarizeHvcgExperience(outreach, 'ln-1');
    assert.equal(experience?.outreachCount, 1);
    assert.equal(experience?.sourceRefs[0].sourceSystem, 'HVCG_LenderOutreach');

    const run = runLenderMatch(opp(), [lender], [], new Date('2026-08-01'), { outreach });
    assert.equal(run.matches[0].band, 'UNKNOWN');
    assert.equal(run.matches[0].historicalExperience?.submittedCount, 1);
    assert.ok(run.matches[0].explanations.some((e) => e.criterion === 'hvcgExperience' && e.outcome === 'context'));
    assertEveryExplanationSourced(run.matches);
  });

  it('does not let a warm relationship override stale criteria', () => {
    const warm: LenderOrganization = { ...lender, relationshipStatus: 'Active' };
    const stale = { ...current, lastVerifiedAt: '2024-01-01T00:00:00.000Z', freshness: 'CURRENT' as const };
    const [m] = matchLenders(opp(), [warm], [stale], new Date('2026-08-01'));
    assert.equal(m.band, 'UNKNOWN');
    assert.ok(m.explanations.some((e) => e.criterion === 'relationshipStatus' && e.outcome === 'context'));
  });

  it('uses verified profile revenue when the opportunity revenue is missing', () => {
    const missingRev = opp({
      business: { industry: 'manufacturing', annualRevenue: { value: null, verification: 'MISSING', confidence: null } },
    });
    const profile: CapitalProfile = {
      id: 'prof-1',
      clientId: 'client-syn-001',
      clientCode: 'SYN01',
      legalName: verifiedValue('SYNTHETIC Co', 'synthetic-fixture', '2026-08-01T00:00:00.000Z', 'qa'),
      revenue: verifiedValue(4_200_000, 'synthetic-fixture', '2026-08-01T00:00:00.000Z', 'qa'),
      updatedAt: '2026-08-01T00:00:00.000Z',
    };
    const merged = applyClientCapitalProfile(missingRev, profile);
    assert.equal(merged.business.annualRevenue?.verification, 'VERIFIED');
    const [m] = matchLenders(missingRev, [lender], [current], new Date('2026-07-01'), { profile });
    assert.equal(m.band, 'BEST_FIT');
  });

  it('ranks BEST_FIT ahead of UNKNOWN and does not promote historical experience across bands', () => {
    const stale: LenderProduct = {
      ...current,
      id: 'pr-stale',
      productName: 'Stale WC',
      lastVerifiedAt: '2024-01-01T00:00:00.000Z',
    };
    const other: LenderOrganization = { id: 'ln-2', name: 'SYNTHETIC Other' };
    const outreach: LenderSubmission[] = [
      {
        id: 'sub-stale',
        capitalOpportunityId: 'cap-old',
        lenderId: 'ln-1',
        method: 'package',
        status: 'offer',
        submittedAt: '2026-03-01T00:00:00.000Z',
        documentIds: [],
      },
    ];
    const run = runLenderMatch(
      opp(),
      [lender, other],
      [stale, { ...current, lenderId: 'ln-2', id: 'pr-other' }],
      new Date('2026-07-01'),
      { outreach },
    );
    assert.equal(run.matches[0].band, 'BEST_FIT');
    assert.equal(run.matches[0].lenderId, 'ln-2');
    assert.equal(run.matches.some((m) => m.lenderId === 'ln-1' && m.band === 'UNKNOWN'), true);
  });

  it('filters Do Not Contact via filterLenderUniverse', () => {
    const { eligible, filteredOut } = filterLenderUniverse([
      lender,
      { id: 'ln-dnc', name: 'Nope', relationshipStatus: 'do-not-contact' },
    ]);
    assert.equal(eligible.length, 1);
    assert.equal(filteredOut.length, 1);
  });
});

describe('B1/B5 contract: eligibility, honesty, disclaimer', () => {
  it('exact eligibility: amount on min and max bounds is BEST_FIT when criteria are CURRENT', () => {
    const atMin = matchLenders(
      opp({ need: { requestedAmount: 100_000, purpose: 'working capital' } }),
      [lender],
      [current],
      new Date('2026-07-01'),
    )[0];
    const atMax = matchLenders(
      opp({ need: { requestedAmount: 1_000_000, purpose: 'working capital' } }),
      [lender],
      [current],
      new Date('2026-07-01'),
    )[0];
    assert.equal(atMin.band, 'BEST_FIT');
    assert.equal(atMax.band, 'BEST_FIT');
    assert.equal(atMin.freshness, 'CURRENT');
    assertEveryExplanationSourced([atMin, atMax]);
  });

  it('ineligible: below min, above max, restricted industry, and explicit false appetite', () => {
    const below = matchLenders(
      opp({ need: { requestedAmount: 50_000, purpose: 'wc' } }),
      [lender],
      [current],
      new Date('2026-07-01'),
    )[0];
    assert.equal(below.band, 'INELIGIBLE');
    assert.ok(below.explanations.some((e) => e.outcome === 'ineligible' && e.sourceRef.field === 'MinAmount'));

    const above = matchLenders(
      opp({ need: { requestedAmount: 5_000_000, purpose: 'wc' } }),
      [lender],
      [current],
      new Date('2026-07-01'),
    )[0];
    assert.equal(above.band, 'INELIGIBLE');
    assert.ok(above.explanations.some((e) => e.outcome === 'ineligible' && e.sourceRef.field === 'MaxAmount'));

    const restricted: LenderProduct = {
      ...current,
      industriesRestricted: ['gambling', 'cannabis'],
    };
    const industry = matchLenders(
      opp({
        business: {
          industry: 'cannabis retail',
          annualRevenue: verifiedValue(4_200_000, 'synthetic-fixture', '2026-08-01T00:00:00.000Z', 'qa'),
        },
      }),
      [lender],
      [restricted],
      new Date('2026-07-01'),
    )[0];
    assert.equal(industry.band, 'INELIGIBLE');
    assert.ok(industry.explanations.some((e) => e.criterion === 'industriesRestricted' && e.outcome === 'ineligible'));

    const noSba: LenderProduct = { ...current, sbaParticipation: false };
    const sbaDeal = matchLenders(
      opp({ transactionType: 'sba_working_capital' }),
      [lender],
      [noSba],
      new Date('2026-07-01'),
    )[0];
    assert.equal(sbaDeal.band, 'INELIGIBLE');
    assert.ok(sbaDeal.explanations.some((e) => e.sourceRef.field === 'SBAParticipation' && e.outcome === 'ineligible'));
    assertEveryExplanationSourced([below, above, industry, sbaDeal]);
  });

  it('missing client data cannot produce BEST_FIT', () => {
    const noAmount = matchLenders(
      opp({ need: { requestedAmount: null, purpose: 'working capital' } }),
      [lender],
      [current],
      new Date('2026-07-01'),
    )[0];
    assert.equal(noAmount.band, 'UNKNOWN');
    assert.ok(noAmount.missingCriteria.some((c) => /requested amount/i.test(c)));

    const noRevenue = matchLenders(
      opp({
        business: { industry: 'manufacturing', annualRevenue: { value: null, verification: 'MISSING', confidence: null } },
      }),
      [lender],
      [current],
      new Date('2026-07-01'),
    )[0];
    assert.equal(noRevenue.band, 'UNKNOWN');
    assert.ok(noRevenue.missingCriteria.some((c) => /revenue/i.test(c)));

    const tibProduct: LenderProduct = { ...current, timeInBusinessMonths: 24 };
    const noYears = matchLenders(opp(), [lender], [tibProduct], new Date('2026-07-01'))[0];
    assert.notEqual(noYears.band, 'BEST_FIT');
    assert.equal(noYears.band, 'UNKNOWN');
    assert.ok(noYears.missingCriteria.some((c) => /years in business/i.test(c)));
    assertEveryExplanationSourced([noAmount, noRevenue, noYears]);
  });

  it('STALE criteria cannot be BEST_FIT, POSSIBLE, or LOW_FIT', () => {
    const stale: LenderProduct = {
      ...current,
      lastVerifiedAt: '2024-01-01T00:00:00.000Z',
      freshness: 'CURRENT',
    };
    const [m] = matchLenders(opp(), [lender], [stale], new Date('2026-08-01'));
    assert.equal(m.stale, true);
    assert.equal(m.freshness, 'STALE');
    assert.equal(m.band, 'UNKNOWN');
    assert.notEqual(m.band, 'BEST_FIT');
    assertEveryExplanationSourced([m]);
  });

  it('UNKNOWN criteria stay UNKNOWN even with high product.confidence', () => {
    const unknownProduct: LenderProduct = {
      id: 'pr-unknown',
      lenderId: 'ln-1',
      productName: 'Unverified box',
      freshness: 'UNKNOWN',
      confidence: 0.99,
    };
    const [m] = matchLenders(opp(), [lender], [unknownProduct], new Date('2026-08-01'));
    assert.equal(m.band, 'UNKNOWN');
    assert.equal(m.freshness, 'UNKNOWN');
    assert.notEqual(m.band, 'BEST_FIT');
    assertNoFakePercentScore(m);
    assertEveryExplanationSourced([m]);
  });

  it('historical HVCG experience is context, not an automatic fit', () => {
    const outreach: LenderSubmission[] = [
      {
        id: 'sub-offer',
        capitalOpportunityId: 'cap-old',
        lenderId: 'ln-1',
        method: 'package',
        status: 'offer',
        submittedAt: '2026-05-01T00:00:00.000Z',
        submittedBy: 'manny@example.com',
        documentIds: [],
      },
      {
        id: 'sub-declined',
        capitalOpportunityId: 'cap-older',
        lenderId: 'ln-1',
        method: 'email',
        status: 'declined',
        submittedAt: '2026-01-15T00:00:00.000Z',
        documentIds: [],
      },
    ];
    const run = runLenderMatch(opp(), [lender], [], new Date('2026-08-01'), { outreach });
    const [m] = run.matches;
    assert.equal(m.band, 'UNKNOWN');
    assert.equal(m.historicalExperience?.outreachCount, 2);
    assert.equal(m.historicalExperience?.offerCount, 1);
    assert.equal(m.historicalExperience?.sourceRefs[0].sourceSystem, 'HVCG_LenderOutreach');
    assert.ok(m.explanations.some((e) => e.criterion === 'hvcgExperience' && e.outcome === 'context'));
    assert.equal(m.explanations.some((e) => e.criterion === 'hvcgExperience' && e.outcome === 'met'), false);
    assertEveryExplanationSourced(run.matches);
  });

  it('emits no fake percent scores and attaches SourceRef on every explanation', () => {
    const run = runLenderMatch(opp(), [lender], [current], new Date('2026-07-01'));
    assert.equal(run.matches[0].band, 'BEST_FIT');
    assertEveryExplanationSourced(run.matches);
    for (const m of run.matches) {
      assertNoFakePercentScore(m);
    }
  });

  it('financing disclaimer is present on the match run', () => {
    const run = runLenderMatch(opp(), [lender], [current], new Date('2026-07-01'));
    assert.equal(run.review.status, 'PENDING_MANNY');
    assert.equal(run.review.disclaimer, FINANCING_DISCLAIMER);
    assert.match(run.review.disclaimer, /HVCG is not a lender/i);
    assert.match(run.review.disclaimer, /does not guarantee/i);
  });

  it('does not treat stated DSCR/leverage notes as VERIFIED underwriting policy', () => {
    const withUw: LenderProduct = {
      ...current,
      dscrMin: 1.25,
      leverageMax: 4,
      creditExpectations: 'FICO 680; DSCR 1.25x — do not parse this into a rule',
    };
    const [m] = matchLenders(opp(), [lender], [withUw], new Date('2026-07-01'));
    assert.ok(m.explanations.some((e) => e.criterion === 'dscrMin' && e.outcome === 'context'));
    assert.ok(m.explanations.some((e) => e.criterion === 'leverageMax' && e.outcome === 'context'));
    assert.ok(m.explanations.some((e) => e.criterion === 'creditExpectations' && e.outcome === 'context'));
    assert.equal(m.explanations.some((e) => e.criterion === 'dscrMin' && e.outcome === 'met'), false);
    assert.notEqual(m.band, 'BEST_FIT');
    assert.ok(m.unknownCriticalCriteria.includes('dscrMin'));
    assert.ok(m.unknownCriticalCriteria.includes('leverageMax'));
    assert.equal(m.explanations.some((e) => e.statement.includes('FICO 680') && e.outcome === 'met'), false);
    assertEveryExplanationSourced([m]);
  });
});
