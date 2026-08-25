/**
 * ATLAS-RESEARCH-INTELLIGENCE-HONESTY-001
 * Hub-only Ask Atlas honesty for research intelligence / sourced lenders.
 * Already-known entitled researchIntelligence rows and catalog titles only.
 * No sixth client. No invented criteria, amounts, or approval. No lender submit.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SOURCED_LENDERS } from '@hvcg/atlas-capital-core';
import { ENTITLED_CANONICAL_CLIENT_CODES } from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import { sourcedLenderTitleRecords } from '../src/pm/operatorDesk/researchIntelligence.ts';
import {
  COMMUNICATIONS_AUTO_RESPOND,
  RESEARCH_INTELLIGENCE_FINANCING_STATUS,
  RESEARCH_INTELLIGENCE_FIT,
  RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH,
  type ResearchIntelligenceRecord,
} from '../src/pm/operatorDesk/types.ts';
import {
  RESEARCH_INTELLIGENCE_HONESTY_KIND,
  RESEARCH_INTELLIGENCE_HONESTY_MISSION_KEY,
  answerResearchIntelligenceHonesty,
  composeResearchIntelligenceHonesty,
  mapsToResearchIntelligenceHonestyIntent,
} from '../src/pm/operatorDesk/researchIntelligenceHonesty.ts';

function knownRow(over: Partial<ResearchIntelligenceRecord> & Pick<ResearchIntelligenceRecord, 'id' | 'title'>): ResearchIntelligenceRecord {
  return {
    subjectKind: 'client',
    source: 'HVCG_Clients',
    retrievalDate: '2026-08-25T12:00:00.000Z',
    confidence: 'CONFIRMED',
    superseded: false,
    classification: 'CONFIRMED',
    invented: false,
    lenderCriteriaInvented: false,
    financingStatus: 'UNKNOWN',
    fit: 'NOT_EVALUATED',
    evidence: 'Copied entitled HVCG_Clients title. Lender criteria and financing status were not invented.',
    ...over,
  };
}

describe('research intelligence honesty', () => {
  it('keeps the entitled roster and communication fail-closed constants', () => {
    assert.deepEqual([...ENTITLED_CANONICAL_CLIENT_CODES], ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01']);
    assert.equal(COMMUNICATIONS_AUTO_RESPOND, false);
    assert.equal(RESEARCH_INTELLIGENCE_HONESTY_MISSION_KEY, 'ATLAS-RESEARCH-INTELLIGENCE-HONESTY-001');
    assert.equal(RESEARCH_INTELLIGENCE_OUTBOUND_REFRESH, false);
    assert.equal(RESEARCH_INTELLIGENCE_FINANCING_STATUS, 'UNKNOWN');
    assert.equal(RESEARCH_INTELLIGENCE_FIT, 'NOT_EVALUATED');
  });

  it('maps research intelligence / what do we know from research / sourced lenders', () => {
    assert.equal(mapsToResearchIntelligenceHonestyIntent('research intelligence'), true);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('What do we know from research?'), true);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('sourced lenders?'), true);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('What sourced lenders do we have?'), true);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('historical reconstruction'), false);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('Are documents realtime?'), false);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('Start onboarding ACCG'), false);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('Search ACCG mailbox'), false);
    assert.equal(mapsToResearchIntelligenceHonestyIntent('Submit to Live Oak'), false);
  });

  it('answers sourced lenders from catalog titles and never invents criteria or approval', () => {
    const catalog = sourcedLenderTitleRecords();
    assert.equal(catalog.length, SOURCED_LENDERS.length);
    assert.ok(catalog.some((row) => row.title === 'Live Oak Bank'));
    const pack = composeResearchIntelligenceHonesty({
      question: 'sourced lenders?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
    });
    assert.equal(pack.kind, RESEARCH_INTELLIGENCE_HONESTY_KIND);
    assert.equal(pack.send, false);
    assert.equal(pack.outbound, false);
    assert.equal(pack.liveGtmOutbound, false);
    assert.equal(pack.capitalSubmit, false);
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.invented, false);
    assert.equal(pack.lenderCriteriaInvented, false);
    assert.equal(pack.approval, false);
    assert.equal(pack.financingStatus, 'UNKNOWN');
    assert.equal(pack.fit, 'NOT_EVALUATED');
    assert.equal(pack.sourcedLenders.length, SOURCED_LENDERS.length);
    assert.equal(pack.sourcedLenders.every((row) => row.lenderCriteriaInvented === false), true);
    assert.equal(pack.sourcedLenders.every((row) => !row.clientCode), true);
    const serialized = JSON.stringify(pack);
    assert.equal(/\bltv\s*[:=]?\s*\d/i.test(serialized), false);
    assert.equal(/\bdscr\s*[:=]?\s*\d/i.test(serialized), false);
    assert.equal(/best[_ ]?fit/i.test(serialized), false);
    assert.equal(/\$[\d,]|8,400,000|AUTO_RESPOND|submitted|CPL01/.test(serialized), false);
    const answer = answerResearchIntelligenceHonesty('sourced lenders?', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
    });
    assert.match(answer, /Research intelligence for Hub/);
    assert.match(answer, /research_intelligence_honesty_v1/);
    assert.match(answer, /Live Oak Bank/);
    assert.match(answer, /did not invent clients, amounts, lender criteria, or approval/);
    assert.equal(/\$|8,400,000|AUTO_RESPOND|submitted|CPL01/.test(answer), false);
  });

  it('answers LIEN01 from already-known entitled researchIntelligence rows only', () => {
    const pack = composeResearchIntelligenceHonesty({
      question: 'What do we know from research for LIEN01?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      researchIntelligence: [
        knownRow({ id: 'client:lien', title: 'LIEN01 · already-known entitled row', clientCode: 'LIEN01' }),
        knownRow({
          id: 'client:accg-leak',
          title: 'ACCG01 must not leak',
          clientCode: 'ACCG01',
          evidence: 'Copied entitled HVCG_Clients title for ACCG01.',
        }),
        knownRow({
          id: 'lender:invent',
          title: 'Invented Lender LTV 80',
          subjectKind: 'lender',
          source: 'HVCG_Lenders',
          clientCode: 'LIEN01',
        }),
      ],
    });
    assert.equal(pack.clientCode, 'LIEN01');
    assert.equal(pack.relatedResearch.length, 1);
    assert.equal(pack.relatedResearch[0]?.title, 'LIEN01 · already-known entitled row');
    assert.equal(pack.relatedResearch.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(pack.sourcedLenders.some((row) => row.title === 'Live Oak Bank'), false);
    assert.equal(JSON.stringify(pack).includes('ACCG01'), false);
    assert.equal(JSON.stringify(pack).includes('LTV 80'), false);
    const sourced = composeResearchIntelligenceHonesty({
      question: 'sourced lenders for LIEN01?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      researchIntelligence: [
        knownRow({ id: 'client:lien', title: 'LIEN01 · already-known entitled row', clientCode: 'LIEN01' }),
      ],
    });
    assert.match(sourced.items.join(' '), /not assigned to LIEN01/);
    assert.equal(sourced.sourcedLenders.some((row) => row.title === 'Live Oak Bank'), false);
    const answer = answerResearchIntelligenceHonesty('What do we know from research for LIEN01?', {
      entitledCodes: ['LIEN01'],
      researchIntelligence: [
        knownRow({ id: 'client:lien', title: 'LIEN01 · already-known entitled row', clientCode: 'LIEN01' }),
      ],
    });
    assert.match(answer, /Research intelligence for LIEN01/);
    assert.match(answer, /already-known entitled row/);
    assert.equal(/Live Oak Bank|ACCG01|CPL01|\$/.test(answer), false);
  });

  it('never invents a sixth client or ClientCodes for uncoded research folders', () => {
    const pack = composeResearchIntelligenceHonesty({
      question: 'research intelligence',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      researchIntelligence: [
        knownRow({ id: 'client:cpl', title: "That's Kava", clientCode: 'CPL01' }),
        knownRow({ id: 'client:uncoded', title: 'Frocovery', clientCode: undefined }),
      ],
    });
    assert.equal(pack.relatedResearch.some((row) => row.clientCode === 'CPL01'), false);
    assert.equal(pack.relatedResearch.some((row) => row.title === "That's Kava" || row.title === 'Frocovery'), false);
    const invented = composeResearchIntelligenceHonesty({
      question: 'what do we know from research for CPL01?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
    });
    assert.equal(invented.clientCode, undefined);
    assert.equal(invented.relatedResearch.some((row) => row.clientCode === 'CPL01'), false);
    const answer = answerResearchIntelligenceHonesty('what do we know from research for CPL01?', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
    });
    assert.equal(/ClientCode: CPL01/.test(answer), false);
    assert.match(answer, /did not invent clients/);
    assert.match(answer, /sixth client/);
  });

  it('does not guess an ambiguous entitled ClientCode', () => {
    const pack = composeResearchIntelligenceHonesty({
      question: 'research intelligence for ACCG01 and LIEN01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
    });
    assert.equal(pack.status, 'NOT_READY');
    assert.equal(pack.ready, false);
    assert.equal(pack.clientCode, undefined);
    assert.match(pack.nextOwnerAction, /does not invent or guess/i);
  });
});
