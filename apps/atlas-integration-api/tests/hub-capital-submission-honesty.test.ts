/**
 * ATLAS-CAPITAL-SUBMISSION-HONESTY-001
 * Hub-only Ask Atlas honesty for capital submission / prepare package /
 * lender submit readiness. Already-entitled prepare records and catalog
 * titles only. No sixth client. No invented criteria, amounts, or approval.
 * No lender submit. PREPARE_ONLY. Client A never receives Client B.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITLED_CANONICAL_CLIENT_CODES } from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import {
  COMMUNICATIONS_AUTO_RESPOND,
  CAPITAL_SUBMISSION_EXTERNAL_SUBMIT,
  CAPITAL_SUBMISSION_FINANCING_STATUS,
  CAPITAL_SUBMISSION_FIT,
  CAPITAL_SUBMISSION_OWNER_GATED,
  CAPITAL_SUBMISSION_POLICY_CLASS,
  CAPITAL_SUBMISSION_SEND,
  type AtlasAuthorizedSearchHit,
} from '../src/pm/operatorDesk/types.ts';
import {
  CAPITAL_SUBMISSION_HONESTY_KIND,
  CAPITAL_SUBMISSION_HONESTY_MISSION_KEY,
  answerCapitalSubmissionHonesty,
  composeCapitalSubmissionHonesty,
  mapsToCapitalSubmissionHonestyIntent,
} from '../src/pm/operatorDesk/capitalSubmissionHonesty.ts';
import { mapsToResearchIntelligenceHonestyIntent } from '../src/pm/operatorDesk/researchIntelligenceHonesty.ts';

function entitledHit(
  over: Partial<AtlasAuthorizedSearchHit> & Pick<AtlasAuthorizedSearchHit, 'id' | 'title' | 'kind'>,
): AtlasAuthorizedSearchHit {
  return {
    why: 'Entitled test fixture',
    basedOn: 'Already-entitled index row. Lender criteria were not invented.',
    provenance: 'CONFIRMED',
    classification: 'CONFIRMED',
    ...over,
  };
}

describe('capital submission honesty', () => {
  it('keeps the entitled roster and PREPARE_ONLY fail-closed constants', () => {
    assert.deepEqual([...ENTITLED_CANONICAL_CLIENT_CODES], ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'KAVA01', 'CPL01', 'LIEN01']);
    assert.equal(COMMUNICATIONS_AUTO_RESPOND, false);
    assert.equal(CAPITAL_SUBMISSION_HONESTY_MISSION_KEY, 'ATLAS-CAPITAL-SUBMISSION-HONESTY-001');
    assert.equal(CAPITAL_SUBMISSION_POLICY_CLASS, 'PREPARE_ONLY');
    assert.equal(CAPITAL_SUBMISSION_SEND, false);
    assert.equal(CAPITAL_SUBMISSION_EXTERNAL_SUBMIT, false);
    assert.equal(CAPITAL_SUBMISSION_OWNER_GATED, true);
    assert.equal(CAPITAL_SUBMISSION_FINANCING_STATUS, 'UNKNOWN');
    assert.equal(CAPITAL_SUBMISSION_FIT, 'NOT_EVALUATED');
  });

  it('maps capital submission / submission package / prepare capital / submit to lender / lender package', () => {
    assert.equal(mapsToCapitalSubmissionHonestyIntent('capital submission'), true);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('What is the submission package?'), true);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('prepare capital for LIEN01'), true);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('Can we submit to lender?'), true);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('Show the lender package'), true);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('research intelligence'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('What do we know from research?'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('sourced lenders?'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('historical reconstruction'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('Are documents realtime?'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('Start onboarding ACCG'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('Search ACCG mailbox'), false);
    assert.equal(mapsToCapitalSubmissionHonestyIntent('Submit to Live Oak'), false);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('prepare capital for LIEN01'), false);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('capital submission'), false);
  });

  it('answers entitled LIEN01 prepare records and never invents criteria, amounts, or approval', () => {
    const pack = composeCapitalSubmissionHonesty({
      question: 'prepare capital for LIEN01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledHits: [
        entitledHit({
          id: 'cap-lien-1',
          title: 'LIEN01 entitled capital opportunity',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'LIEN01',
        }),
        entitledHit({
          id: 'ln-catalog-1',
          title: 'SYNTHETIC Bank',
          kind: 'lender',
          source: 'HVCG_Lenders',
        }),
      ],
    });
    assert.equal(pack.kind, CAPITAL_SUBMISSION_HONESTY_KIND);
    assert.equal(pack.clientCode, 'LIEN01');
    assert.equal(pack.policyClass, 'PREPARE_ONLY');
    assert.equal(pack.send, false);
    assert.equal(pack.outbound, false);
    assert.equal(pack.liveGtmOutbound, false);
    assert.equal(pack.capitalSubmit, false);
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.invented, false);
    assert.equal(pack.lenderCriteriaInvented, false);
    assert.equal(pack.approval, false);
    assert.equal(pack.externalSubmit, false);
    assert.equal(pack.ownerGated, true);
    assert.equal(pack.financingStatus, 'UNKNOWN');
    assert.equal(pack.fit, 'NOT_EVALUATED');
    assert.equal(pack.communicationPolicy, 'DRAFT_ONLY');
    assert.equal(pack.prepareCount, 1);
    assert.equal(pack.prepare.items[0]?.title, 'LIEN01 entitled capital opportunity');
    assert.equal(pack.prepare.items[0]?.clientCode, 'LIEN01');
    assert.equal(pack.prepare.items[0]?.financingStatus, 'UNKNOWN');
    assert.equal(pack.prepare.items[0]?.lenderCriteriaInvented, false);
    assert.equal(pack.catalogCopies.length, 1);
    assert.equal(pack.catalogCopies[0]?.lenderName, 'SYNTHETIC Bank');
    assert.equal(pack.catalogCopies[0]?.fit, 'NOT_EVALUATED');
    assert.equal(pack.catalogCopies[0]?.criteriaInvented, false);
    const serialized = JSON.stringify(pack);
    assert.equal(/\bltv\s*[:=]?\s*\d/i.test(serialized), false);
    assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(serialized), false);
    assert.equal(/best[_ ]?fit/i.test(serialized), false);
    assert.equal(/\$[\d,]|8,400,000|AUTO_RESPOND|submitted/.test(serialized), false);
    const answer = answerCapitalSubmissionHonesty('prepare capital for LIEN01', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledHits: [
        entitledHit({
          id: 'cap-lien-1',
          title: 'LIEN01 entitled capital opportunity',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'LIEN01',
        }),
      ],
    });
    assert.match(answer, /Capital submission for LIEN01/);
    assert.match(answer, /capital_submission_honesty_v1/);
    assert.match(answer, /LIEN01 entitled capital opportunity/);
    assert.match(answer, /PREPARE_ONLY/);
    assert.match(answer, /did not invent clients, amounts, lender criteria, or approval/);
    assert.match(answer, /did not send mail, launch GTM, or submit capital/);
    assert.equal(/\$|8,400,000|AUTO_RESPOND|submitted/.test(answer), false);
  });

  it('rejects invented lender criteria and does not submit', () => {
    const pack = composeCapitalSubmissionHonesty({
      question: 'capital submission for LIEN01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledHits: [
        entitledHit({
          id: 'cap-lien-1',
          title: 'LIEN01 entitled capital opportunity',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'LIEN01',
        }),
        entitledHit({
          id: 'cap-invent',
          title: 'Invented Lender LTV 80',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'LIEN01',
        }),
        entitledHit({
          id: 'ln-invent',
          title: 'Credit box lender',
          kind: 'lender',
          source: 'HVCG_Lenders',
          evidence: 'min credit 720 DSCR 1.25',
        }),
        entitledHit({
          id: 'cap-amount',
          title: 'LIEN01 $8,400,000 committed funded',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'LIEN01',
        }),
      ],
    });
    assert.equal(pack.prepare.items.length, 1);
    assert.equal(pack.prepare.items[0]?.title, 'LIEN01 entitled capital opportunity');
    assert.equal(pack.catalogCopies.length, 0);
    assert.equal(JSON.stringify(pack.prepare).includes('LTV 80'), false);
    assert.equal(JSON.stringify(pack.prepare).includes('credit box'), false);
    assert.equal(JSON.stringify(pack.prepare).includes('8,400,000'), false);
    assert.equal(JSON.stringify(pack.prepare).includes('committed funded'), false);
    assert.equal(pack.send, false);
    assert.equal(pack.capitalSubmit, false);
    assert.equal(pack.externalSubmit, false);
    assert.equal(pack.prepare.send, false);
    assert.equal(pack.prepare.externalSubmit, false);
    assert.equal(pack.prepare.ownerGated, true);
  });

  it('never invents a sixth client or ClientCodes for uncoded capital folders', () => {
    const pack = composeCapitalSubmissionHonesty({
      question: 'capital submission',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledHits: [
        entitledHit({
          id: 'cap-uncoded',
          title: 'Frocovery packet',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
        }),
        entitledHit({
          id: 'cap-syn',
          title: 'SYN01 entitled capital opportunity',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'SYN01',
        }),
      ],
    });
    assert.equal(pack.prepare.items.some((row) => row.clientCode === 'SYN01'), false);
    assert.equal(pack.prepare.items.some((row) => row.title === 'Frocovery packet'), false);
    assert.equal(pack.entitledCodes.includes('NORTH01'), false);
    assert.equal(pack.entitledCodes.length, 7);
    const invented = composeCapitalSubmissionHonesty({
      question: 'capital submission for NORTH01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
    });
    assert.equal(invented.clientCode, undefined);
    assert.equal(invented.prepare.items.some((row) => row.clientCode === 'NORTH01'), false);
    const answer = answerCapitalSubmissionHonesty('capital submission for NORTH01', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
    });
    assert.equal(/ClientCode: NORTH01/.test(answer), false);
    assert.match(answer, /did not invent clients/);
    assert.match(answer, /sixth client/);
  });

  it('does not leak ACCG01 capital into a LIEN01 question', () => {
    const pack = composeCapitalSubmissionHonesty({
      question: 'submission package for LIEN01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledHits: [
        entitledHit({
          id: 'cap-lien',
          title: 'LIEN01 entitled capital opportunity',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'LIEN01',
        }),
        entitledHit({
          id: 'cap-accg-leak',
          title: 'ACCG01 must not leak',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'ACCG01',
          evidence: 'Copied entitled HVCG_CapitalOpportunities title for ACCG01.',
        }),
        entitledHit({
          id: 'cap-accg-title',
          title: 'ACCG packet sitting on LIEN row',
          kind: 'recovered_capital_packet',
          clientCode: 'LIEN01',
        }),
      ],
    });
    assert.equal(pack.clientCode, 'LIEN01');
    assert.equal(pack.prepare.items.length, 1);
    assert.equal(pack.prepare.items[0]?.title, 'LIEN01 entitled capital opportunity');
    assert.equal(pack.prepare.items.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(JSON.stringify(pack.prepare).includes('ACCG01'), false);
    assert.equal(JSON.stringify(pack.prepare).includes('ACCG packet'), false);
    const answer = answerCapitalSubmissionHonesty('lender package for LIEN01', {
      entitledCodes: ['LIEN01'],
      entitledHits: [
        entitledHit({
          id: 'cap-lien',
          title: 'LIEN01 entitled capital opportunity',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'LIEN01',
        }),
        entitledHit({
          id: 'cap-accg-leak',
          title: 'ACCG01 must not leak',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'ACCG01',
        }),
      ],
    });
    assert.match(answer, /Capital submission for LIEN01/);
    assert.equal(/ACCG01|\$/.test(answer), false);
  });

  it('does not guess an ambiguous entitled ClientCode and does not submit', () => {
    const pack = composeCapitalSubmissionHonesty({
      question: 'capital submission for ACCG01 and LIEN01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      entitledHits: [
        entitledHit({
          id: 'cap-lien',
          title: 'LIEN01 entitled capital opportunity',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'LIEN01',
        }),
        entitledHit({
          id: 'cap-accg',
          title: 'ACCG01 entitled capital opportunity',
          kind: 'capital_opportunity',
          source: 'HVCG_CapitalOpportunities',
          clientCode: 'ACCG01',
        }),
      ],
    });
    assert.equal(pack.status, 'NOT_READY');
    assert.equal(pack.ready, false);
    assert.equal(pack.clientCode, undefined);
    assert.equal(pack.capitalSubmit, false);
    assert.equal(pack.send, false);
    assert.match(pack.nextOwnerAction, /does not invent or guess/i);
  });
});
