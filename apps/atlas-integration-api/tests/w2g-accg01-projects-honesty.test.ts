/**
 * W2G ACCG01 projects honesty.
 * Current/active projects are hygiene-kept HVCG_Projects only.
 * An empty post-hygiene set is MISSING. Recovered HVS filenames are not that list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';
import { composeClientTruth } from '../src/pm/commercialContext/clientTruth.ts';
import {
  answerClientOperatingBrief,
  currentWorkspaceUnavailableAnswer,
  WORKSPACE_TRUTH_SOURCE_UNAVAILABLE,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';

const RECOVERED = 'ACCG ROS / warehouse / Richmond / buildout packet';
const KEPT = 'ACCG Inc. Operating Engagement';
const ONBOARDING = 'ACCG01 - Onboarding';
const HARDEN = 'ACCG01 - harden-1784680909';
const HISTORICAL_MARKER = 'Historical/STALE_OR_UNCERTAIN';

function activePortion(text: string): string {
  const marker = text.indexOf(HISTORICAL_MARKER);
  return marker === -1 ? text : text.slice(0, marker);
}

describe('W2G ACCG01 projects honesty', () => {
  it('empty hygiene-kept HVCG_Projects is projects=MISSING and does not treat recovered filenames as active', () => {
    const workspace = {
      clientCode: 'ACCG01',
      displayName: 'ACCG Inc.',
      projects: [],
    };
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.projects.completeness, 'MISSING');
    assert.equal(truth.projects.classification, 'MISSING');
    assert.equal(truth.answers.workingOn.classification, 'MISSING');
    assert.match(truth.projects.summary, /projects=MISSING/);
    assert.equal(activePortion(truth.projects.summary).includes(RECOVERED), false);
    assert.equal(truth.answers.workingOn.text.includes(RECOVERED), false);
    assert.match(truth.projects.summary, new RegExp(HISTORICAL_MARKER));
    assert.match(truth.projects.summary, /not current or active projects/);
    assert.match(truth.projects.summary, /ACCG ROS \/ warehouse \/ Richmond \/ buildout packet/);
    assert.equal(truth.invented, false);
    assert.equal(truth.globalAutoRespond, false);
    assert.equal(truth.capitalSubmit, false);
    assert.equal(truth.canExecute, false);
    assert.equal(GLOBAL_AUTO_RESPOND, false);

    const answer = answerClientOperatingBrief('What projects are active for ACCG?', {
      entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
      workspace,
    });
    assert.match(answer, /projects=MISSING/);
    assert.equal(activePortion(answer).includes(RECOVERED), false);
    assert.match(answer, new RegExp(HISTORICAL_MARKER));
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.equal(/ACCG weekly operating file/.test(answer), false);
    assert.equal(/PDG01|HFD01|Prodigy|Hart Family/.test(answer), false);
  });

  it('keeps project 27 and harden-* out of current work and does not backfill recovered names as active', () => {
    const workspace = {
      clientCode: 'ACCG01',
      displayName: 'ACCG Inc.',
      projects: [
        { id: '27', name: ONBOARDING, status: 'active' },
        { id: '901', name: HARDEN, status: 'active' },
        { id: '902', name: 'ACCG01 - hardenM-014703', status: 'active' },
      ],
      tasks: [
        { id: '11', title: 'Schedule and run kickoff call', status: 'ready', projectId: '27' },
      ],
    };
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.projects.completeness, 'MISSING');
    assert.equal(truth.projects.classification, 'MISSING');
    assert.equal(/Onboarding|harden/i.test(truth.answers.workingOn.text), false);
    assert.equal(/Onboarding|harden/i.test(activePortion(truth.projects.summary)), false);
    assert.equal(activePortion(truth.answers.workingOn.text).includes(RECOVERED), false);
    assert.equal(truth.canExecute, false);
    assert.equal(truth.capitalSubmit, false);
    assert.equal(truth.globalAutoRespond, false);

    const answer = answerClientOperatingBrief('What projects are active for ACCG?', {
      entitledCodes: ['ACCG01'],
      workspace,
    });
    assert.match(answer, /projects=MISSING/);
    assert.equal(/Onboarding|harden/i.test(answer), false);
    assert.equal(activePortion(answer).includes(RECOVERED), false);
    assert.match(answer, /REAL_CURRENT_OPERATING/);
    assert.equal(/ACCG weekly operating file/.test(answer), false);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
  });

  it('current/active wording lists only hygiene-kept HVCG_Projects', () => {
    const workspace = {
      clientCode: 'ACCG01',
      projects: [
        { id: '100', name: KEPT, status: 'active' },
        { id: '27', name: ONBOARDING, status: 'active' },
        { id: '901', name: HARDEN, status: 'active' },
      ],
    };
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.projects.classification, 'CONFIRMED');
    assert.equal(truth.projects.completeness, 'PARTIAL');
    assert.match(truth.answers.workingOn.text, /ACCG Inc\. Operating Engagement/);
    assert.equal(/Onboarding|harden/i.test(truth.answers.workingOn.text), false);
    assert.equal(truth.answers.workingOn.text.includes(RECOVERED), false);
    assert.equal(truth.canExecute, false);
    assert.equal(truth.capitalSubmit, false);
    assert.equal(truth.globalAutoRespond, false);

    const answer = answerClientOperatingBrief('What are the active projects for ACCG?', {
      entitledCodes: ['ACCG01'],
      workspace,
    });
    assert.match(activePortion(answer), /ACCG Inc\. Operating Engagement/);
    assert.equal(activePortion(answer).includes(RECOVERED), false);
    assert.match(answer, /Historical\/STALE_OR_UNCERTAIN/);
    assert.equal(/Onboarding|harden/i.test(answer), false);
    assert.equal(/ACCG weekly operating file/.test(answer), false);
    assert.match(answer, /projects=PARTIAL/);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
  });

  it('workspace-unavailable path still refuses a recovered substitute', () => {
    const text = currentWorkspaceUnavailableAnswer('ACCG01');
    assert.match(text, new RegExp(WORKSPACE_TRUTH_SOURCE_UNAVAILABLE));
    assert.match(text, /will not substitute recovered or portfolio data/i);
    assert.equal(text.includes(RECOVERED), false);
    assert.equal(/ACCG weekly operating file|harden-|Onboarding/.test(text), false);
    assert.match(text, /canExecute=false/);
    assert.match(text, /capitalSubmit=false/);
    assert.match(text, /GLOBAL_AUTO_RESPOND=false/);
    assert.equal(GLOBAL_AUTO_RESPOND, false);
  });
});
