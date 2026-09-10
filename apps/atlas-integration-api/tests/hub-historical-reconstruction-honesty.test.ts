/**
 * ATLAS-HISTORICAL-RECONSTRUCTION-HONESTY-001
 * Hub-only Ask Atlas honesty for historical reconstruction / recovered projects.
 * Already-known entitled rows only. No sixth client. No mailbox leak.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hvsRecoveredDocuments } from '../src/pm/sharepoint/hvsRecoveredDocuments.ts';
import { hvsRecoveredProjects } from '../src/pm/sharepoint/hvsRecoveredProjects.ts';
import { ENTITLED_CANONICAL_CLIENT_CODES } from '../src/pm/operatorDesk/clientOnboardingAutomation.ts';
import { COMMUNICATIONS_AUTO_RESPOND } from '../src/pm/operatorDesk/types.ts';
import {
  HISTORICAL_RECONSTRUCTION_KIND,
  answerHistoricalReconstructionHonesty,
  composeHistoricalReconstructionHonesty,
  mapsToHistoricalReconstructionHonestyIntent,
} from '../src/pm/operatorDesk/historicalReconstructionHonesty.ts';

describe('historical reconstruction honesty', () => {
  it('keeps the entitled roster and communication fail-closed constants', () => {
    assert.deepEqual([...ENTITLED_CANONICAL_CLIENT_CODES], ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'KAVA01', 'CPL01', 'LIEN01']);
    assert.equal(COMMUNICATIONS_AUTO_RESPOND, false);
  });

  it('maps historical reconstruction / recovered projects / what did we reconstruct', () => {
    assert.equal(mapsToHistoricalReconstructionHonestyIntent('historical reconstruction'), true);
    assert.equal(mapsToHistoricalReconstructionHonestyIntent('What recovered projects do we have?'), true);
    assert.equal(mapsToHistoricalReconstructionHonestyIntent('what did we reconstruct?'), true);
    assert.equal(mapsToHistoricalReconstructionHonestyIntent('What was reconstructed for LIEN01?'), true);
    assert.equal(mapsToHistoricalReconstructionHonestyIntent('Are documents realtime?'), false);
    assert.equal(mapsToHistoricalReconstructionHonestyIntent('Start onboarding ACCG'), false);
    assert.equal(mapsToHistoricalReconstructionHonestyIntent('Search ACCG mailbox'), false);
  });

  it('answers LIEN01 from already-known recovered rows and never invents amounts', () => {
    const pack = composeHistoricalReconstructionHonesty({
      question: 'What did we reconstruct for LIEN01?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      recoveredProjects: hvsRecoveredProjects(),
      recoveredDocuments: hvsRecoveredDocuments(),
    });
    assert.equal(pack.kind, HISTORICAL_RECONSTRUCTION_KIND);
    assert.equal(pack.clientCode, 'LIEN01');
    assert.equal(pack.send, false);
    assert.equal(pack.outbound, false);
    assert.equal(pack.liveGtmOutbound, false);
    assert.equal(pack.capitalSubmit, false);
    assert.equal(pack.autoRespond, false);
    assert.equal(pack.mailboxSearchUsed, false);
    assert.equal(pack.invented, false);
    assert.ok(pack.projects.length >= 1);
    assert.equal(pack.projects.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(pack.documents.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(pack.projects.every((row) => row.operationalized === false), true);
    assert.equal(pack.documents.every((row) => row.amountsExtracted === false), true);
    assert.ok(pack.projects.some((row) => /consulting \+ next-steps/i.test(row.title)));
    const answer = answerHistoricalReconstructionHonesty('What did we reconstruct for LIEN01?', {
      entitledCodes: ['LIEN01'],
      recoveredProjects: hvsRecoveredProjects(),
      recoveredDocuments: hvsRecoveredDocuments(),
    });
    assert.match(answer, /Historical reconstruction for LIEN01/);
    assert.match(answer, /historical_reconstruction_v1/);
    assert.match(answer, /CONSULTING AGREEMENT 6.12.25/);
    assert.match(answer, /did not invent ClientCodes/);
    assert.equal(/\$|8,400,000|AUTO_RESPOND|submitted|ACCG01/.test(answer), false);
  });

  it('rejects quoted mailbox search that returned ACCG subjects for LIEN01', () => {
    const pack = composeHistoricalReconstructionHonesty({
      question: 'historical reconstruction for LIEN01',
      entitledCodes: ['LIEN01'],
      recoveredProjects: hvsRecoveredProjects(),
      recoveredDocuments: hvsRecoveredDocuments(),
      mailboxHits: [
        { clientCode: 'LIEN01', subject: 'ACCG ROS / warehouse / Richmond / buildout packet' },
      ],
    });
    assert.equal(pack.mailboxSearchUsed, false);
    assert.equal(pack.mailboxLeakRejected, true);
    assert.equal(pack.projects.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(pack.documents.every((row) => row.clientCode === 'LIEN01'), true);
    assert.equal(pack.honestyNotes.includes('quoted mailbox leak rejected'), true);
    const answer = answerHistoricalReconstructionHonesty('historical reconstruction for LIEN01', {
      entitledCodes: ['LIEN01'],
      recoveredProjects: hvsRecoveredProjects(),
      recoveredDocuments: hvsRecoveredDocuments(),
      mailboxHits: [
        { clientCode: 'LIEN01', subject: 'ACCG ROS / warehouse / Richmond / buildout packet' },
      ],
    });
    assert.match(answer, /Quoted mailbox leak: rejected/);
    assert.equal(/ACCG ROS|ACCG01|warehouse \/ Richmond/.test(answer), false);
  });

  it('never invents a sixth client or ClientCodes for uncoded historical folders', () => {
    const pack = composeHistoricalReconstructionHonesty({
      question: 'recovered projects',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      recoveredProjects: hvsRecoveredProjects(),
      recoveredDocuments: hvsRecoveredDocuments(),
    });
    assert.equal(pack.projects.some((row) => row.clientCode === 'SYN01'), false);
    assert.equal(pack.documents.some((row) => row.clientCode === 'SYN01'), false);
    assert.equal(pack.projects.some((row) => !row.clientCode), false);
    assert.equal(pack.projects.some((row) => row.client === "That's Kava" || row.client === 'Frocovery'), false);
    const invented = composeHistoricalReconstructionHonesty({
      question: 'what did we reconstruct for NORTH01?',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
      recoveredProjects: hvsRecoveredProjects(),
      recoveredDocuments: hvsRecoveredDocuments(),
    });
    assert.equal(invented.clientCode, undefined);
    assert.equal(invented.projects.some((row) => row.clientCode === 'NORTH01'), false);
    const answer = answerHistoricalReconstructionHonesty('what did we reconstruct for NORTH01?', {
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
    });
    assert.equal(/CPL01|Christie's Place|sixth client invented/i.test(answer) && /ClientCode: NORTH01/.test(answer), false);
    assert.match(answer, /did not invent ClientCodes/);
  });

  it('reuses existing overlay keys without inventing project ids or milestones', () => {
    const pack = composeHistoricalReconstructionHonesty({
      question: 'recovered projects for ACCG01',
      entitledCodes: ['ACCG01'],
      recoveredProjects: hvsRecoveredProjects(),
      recoveredDocuments: hvsRecoveredDocuments(),
      overlayKeys: [
        { clientCode: 'ACCG01', projectId: 'proj-accg-existing', projectName: 'Client Onboarding — ACCG' },
        { clientCode: 'LIEN01', projectId: 'proj-lien-leak', projectName: 'Must not leak' },
        { projectName: 'Uncoded invented project' },
      ],
    });
    assert.equal(pack.clientCode, 'ACCG01');
    assert.deepEqual(pack.overlayKeys, [
      { clientCode: 'ACCG01', projectId: 'proj-accg-existing', projectName: 'Client Onboarding — ACCG' },
    ]);
    assert.equal(pack.overlayKeys.some((key) => key.clientCode === 'LIEN01'), false);
    assert.equal(/\bmilestone\b/i.test(JSON.stringify(pack)), false);
  });

  it('does not guess an ambiguous entitled ClientCode', () => {
    const pack = composeHistoricalReconstructionHonesty({
      question: 'historical reconstruction for ACCG01 and LIEN01',
      entitledCodes: ENTITLED_CANONICAL_CLIENT_CODES,
    });
    assert.equal(pack.status, 'NOT_READY');
    assert.equal(pack.ready, false);
    assert.equal(pack.clientCode, undefined);
    assert.match(pack.nextOwnerAction, /does not invent or guess/i);
  });
});
