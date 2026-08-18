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
