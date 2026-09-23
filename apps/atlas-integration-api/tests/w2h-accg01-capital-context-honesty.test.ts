/**
 * W2H ACCG01 capital-context honesty.
 * Current capital context is entitled capital opportunities already on the composition.
 * Recovered HVS filenames and keyword matches on HVCG_Projects titles are not that set.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';
import { composeClientTruth } from '../src/pm/commercialContext/clientTruth.ts';
import type { OperatorCommercialContext } from '../src/pm/commercialContext/types.ts';
import {
  answerClientOperatingBrief,
  currentWorkspaceUnavailableAnswer,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import type { OperatorOperatingPicture } from '../src/pm/operatorDesk/types.ts';

const RECOVERED = 'ACCG ROS / warehouse / Richmond / buildout packet';
const KEYWORD_PROJECT = 'ACCG warehouse funding LOC receivable buildout lender';
const KEPT_PROJECT = 'ACCG Inc. Operating Engagement';
const HISTORICAL_MARKER = 'Historical/STALE_OR_UNCERTAIN';
const FOREIGN_PACKET = 'Prodigy_Live_Oak_Term_Sheet_$5000000.pdf';
const FOREIGN_TITLE = 'Prodigy Live Oak capital packet $5000000';
const DOLLAR_OR_LENDER = /\$|\b\d{4,}\b|targetamount|live oak|lender approval|funding commitment|committed funded|\bfunded\b|\bapproved\b/i;

function activePortion(text: string): string {
  const marker = text.indexOf(HISTORICAL_MARKER);
  return marker === -1 ? text : text.slice(0, marker);
}

function assertAuthority(truth: { capitalSubmit: boolean; canExecute: boolean; globalAutoRespond: boolean }) {
  assert.equal(truth.capitalSubmit, false);
  assert.equal(truth.canExecute, false);
  assert.equal(truth.globalAutoRespond, false);
  assert.equal(GLOBAL_AUTO_RESPOND, false);
}

function assertNoInventedCapitalFacts(text: string) {
  assert.equal(DOLLAR_OR_LENDER.test(text), false);
  assert.equal(/capitalContext=PARTIAL|\/LIKELY/.test(text), false);
}

function salesCommercial(): OperatorCommercialContext {
  return {
    contractVersion: 'atlas-operator-commercial-context.v1',
    entitled: true,
    liveGtmOutbound: false,
    paidAds: false,
    clientCode: 'ACCG01',
    gcc: {
      contractVersion: 'gcc-value-signal.v1',
      honesty: { available: false, recordedOnly: true },
      signals: [],
    },
    copilot: { honesty: { available: false, recordedOnly: true }, assessments: [], preCall: [], sharepoint: [] },
    gtm: { honesty: { available: false, recordedOnly: true }, attributions: [], crmSources: [] },
    opportunities: [
      {
        contractVersion: 'opportunity-commercial-context.v1',
        opportunityId: 'opp-accg-sales',
        clientCode: 'ACCG01',
        title: 'Live Oak warehouse LOC $2,500,000',
        stage: 'Proposal',
        estimatedValue: 2500000,
        currency: 'USD',
        capitalHandoffStatus: 'Ready',
      },
    ],
  };
}

function mixedRecoveredPicture(): OperatorOperatingPicture {
  const emptyQueue = [] as OperatorOperatingPicture['queues']['needsAction'];
  return {
    kind: 'operator_operating_picture_v1',
    invented: false,
    hvsDataAccess: 'AVAILABLE',
    realClientsOperationalized: [],
    syntheticClientsVisible: [],
    honestEmpty: false,
    queues: {
      needsAction: emptyQueue,
      waiting: [],
      overdue: [],
      blocked: [],
      decisionRequired: [],
      atRisk: [],
      ready: [],
      outcomes: [],
    },
    syntheticQueues: {
      needsAction: [],
      waiting: [],
      overdue: [],
      blocked: [],
      decisionRequired: [],
      atRisk: [],
      ready: [],
      outcomes: [],
    },
    missingData: [],
    recoveryLedger: [],
    hvsRecoveredClients: [],
    hvsRecoveredDocuments: [],
    hvsRecoveredProjects: [
      {
        client: 'ACCG Inc',
        clientCode: 'ACCG01',
        title: RECOVERED,
        provenance: 'LIKELY',
        operationalized: false,
        evidence: 'CONFIRMED filename only',
        nextAction: 'Review recovered filename. Do not invent completion.',
      },
      {
        client: 'Prodigy Games',
        clientCode: 'PDG01',
        title: FOREIGN_TITLE,
        provenance: 'LIKELY',
        operationalized: false,
        evidence: 'foreign',
        nextAction: 'Do not leak.',
      },
    ],
    hvsRecoveredClientRecords: [],
    hvsRecoveredCapitalPackets: [
      {
        client: 'ACCG Inc',
        clientCode: 'ACCG01',
        name: 'ACCG_recovered_capital_filename.pdf',
        provenance: 'CONFIRMED',
        queue: 'Needs Action',
        amountsExtracted: false,
        nextAction: 'Review recovered capital-packet filename only.',
      },
      {
        client: 'Prodigy Games',
        clientCode: 'PDG01',
        name: FOREIGN_PACKET,
        provenance: 'CONFIRMED',
        queue: 'Needs Action',
        amountsExtracted: false,
        nextAction: 'Do not leak.',
      },
    ],
    recoveredClientsKnowledgeOperationalized: [],
    hvsActionableClientKnowledge: [],
  };
}

describe('W2H ACCG01 capital-context honesty', () => {
  it('recovered warehouse/buildout filenames do not set capitalContext PARTIAL or LIKELY', () => {
    const workspace = {
      clientCode: 'ACCG01',
      displayName: 'ACCG Inc.',
      engagementType: 'capital advisory',
      projects: [{ id: '100', name: KEPT_PROJECT, status: 'active' }],
    };
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.capitalContext.completeness, 'MISSING');
    assert.equal(truth.capitalContext.classification, 'MISSING');
    assert.equal(truth.answers.capital.classification, 'MISSING');
    assert.match(truth.capitalContext.summary, /capitalContext=MISSING/);
    assert.match(truth.capitalContext.summary, new RegExp(HISTORICAL_MARKER));
    assert.match(truth.capitalContext.summary, /not active capital/);
    assert.match(truth.capitalContext.summary, /ACCG ROS \/ warehouse \/ Richmond \/ buildout packet/);
    assert.equal(activePortion(truth.capitalContext.summary).includes(RECOVERED), false);
    assert.equal(/PARTIAL|LIKELY/.test(activePortion(truth.capitalContext.summary)), false);
    assertNoInventedCapitalFacts(truth.capitalContext.summary);
    assertNoInventedCapitalFacts(truth.answers.capital.text);
    assertAuthority(truth);
    assert.equal(truth.projects.classification, 'CONFIRMED');
    assert.match(truth.answers.workingOn.text, /ACCG Inc\. Operating Engagement/);

    const answer = answerClientOperatingBrief('What is the capital context for ACCG?', {
      entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
      workspace,
    });
    assert.match(answer, /capitalContext=MISSING\/MISSING/);
    assert.match(answer, /not active capital/);
    assert.match(answer, new RegExp(HISTORICAL_MARKER));
    assert.equal(activePortion(answer).includes(RECOVERED), false);
    assertNoInventedCapitalFacts(answer);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.equal(/PDG01|HFD01|Prodigy|Hart Family|Live Oak/.test(answer), false);
  });

  it('keyword matches on HVCG_Projects titles are not active capital and stay on the projects domain', () => {
    const workspace = {
      clientCode: 'ACCG01',
      displayName: 'ACCG Inc.',
      projects: [
        { id: '100', name: KEPT_PROJECT, status: 'active', projectType: 'capital_advisory' },
        { id: '200', name: KEYWORD_PROJECT, status: 'active', nextAction: 'Funding lender follow-up' },
      ],
    };
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace, commercial: salesCommercial() });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.capitalContext.completeness, 'MISSING');
    assert.equal(truth.capitalContext.classification, 'MISSING');
    assert.equal(truth.answers.capital.text.includes(KEYWORD_PROJECT), false);
    assert.equal(/Live Oak|2,500,000|2500000|Ready/.test(truth.answers.capital.text), false);
    assert.equal(truth.projects.classification, 'CONFIRMED');
    assert.match(truth.answers.workingOn.text, /ACCG Inc\. Operating Engagement/);
    assert.match(truth.answers.workingOn.text, new RegExp(KEYWORD_PROJECT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assertAuthority(truth);

    const capital = answerClientOperatingBrief('What capital work is active for ACCG?', {
      entitledCodes: ['ACCG01'],
      workspace,
      commercial: salesCommercial(),
    });
    assert.match(capital, /capitalContext=MISSING\/MISSING/);
    assert.equal(capital.includes(KEYWORD_PROJECT), false);
    assert.equal(/Live Oak|2,500,000|2500000|\bReady\b/.test(capital), false);
    assertNoInventedCapitalFacts(capital);
    assert.match(capital, /capitalSubmit=false/);
    assert.match(capital, /canExecute=false/);

    const projects = answerClientOperatingBrief('What projects are active for ACCG?', {
      entitledCodes: ['ACCG01'],
      workspace,
    });
    assert.match(projects, /ACCG Inc\. Operating Engagement/);
    assert.match(projects, /REAL_CURRENT_OPERATING/);
    assert.match(projects, /projects=PARTIAL/);
    assert.match(projects, /capitalSubmit=false/);
    assert.match(projects, /canExecute=false/);
  });

  it('an empty entitled capital set is MISSING, including when recovered history is blocked', () => {
    const blocked = mixedRecoveredPicture();
    blocked.hvsDataAccess = 'BLOCKED';
    const truth = composeClientTruth({
      clientCode: 'ACCG01',
      workspace: { clientCode: 'ACCG01', projects: [] },
      picture: blocked,
    });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.capitalContext.completeness, 'MISSING');
    assert.equal(truth.capitalContext.classification, 'MISSING');
    assert.match(truth.capitalContext.summary, /capitalContext=MISSING/);
    assert.equal(truth.capitalContext.summary.includes(HISTORICAL_MARKER), false);
    assert.equal(truth.capitalContext.summary.includes(RECOVERED), false);
    assert.equal(truth.capitalContext.summary.includes(FOREIGN_PACKET), false);
    assert.equal(truth.projects.completeness, 'MISSING');
    assertNoInventedCapitalFacts(truth.capitalContext.summary);
    assertAuthority(truth);

    const bare = composeClientTruth({ clientCode: 'ACCG01' });
    assert.equal('failClosed' in bare, false);
    if ('failClosed' in bare) return;
    assert.equal(bare.capitalContext.completeness, 'MISSING');
    assert.equal(bare.capitalContext.classification, 'MISSING');
    assert.equal(bare.capitalContext.summary.includes(RECOVERED), false);
    assertAuthority(bare);
  });

  it('does not leak another client recovered capital filename into ACCG01', () => {
    const workspace = { clientCode: 'ACCG01', displayName: 'ACCG Inc.', projects: [] };
    const picture = mixedRecoveredPicture();
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace, picture });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.capitalContext.completeness, 'MISSING');
    assert.match(truth.capitalContext.summary, /ACCG_recovered_capital_filename\.pdf/);
    assert.match(truth.capitalContext.summary, new RegExp(HISTORICAL_MARKER));
    assert.equal(activePortion(truth.capitalContext.summary).includes('ACCG_recovered_capital_filename.pdf'), false);
    const blob = JSON.stringify(truth.capitalContext) + truth.answers.capital.text;
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('Prodigy'), false);
    assert.equal(blob.includes('Live Oak'), false);
    assert.equal(blob.includes('5000000'), false);
    assert.equal(blob.includes('$'), false);
    assertAuthority(truth);

    const answer = answerClientOperatingBrief('What is the capital context for ACCG?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace,
      picture,
    });
    assert.match(answer, /capitalContext=MISSING\/MISSING/);
    assert.equal(/PDG01|Prodigy|Live Oak|5000000|\$/.test(answer), false);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
  });

  it('fail-closes an unknown ClientCode and leaves authority flags false', () => {
    const unknown = composeClientTruth({ clientCode: 'not-a-code' });
    assert.equal('failClosed' in unknown && unknown.failClosed, true);
    if ('failClosed' in unknown) assert.equal(unknown.reason, 'unknown_client_code');
    const wildcard = composeClientTruth({ clientCode: '*' });
    assert.equal('failClosed' in wildcard && wildcard.failClosed, true);

    const mismatched = answerClientOperatingBrief('What is the capital context for ACCG?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace: {
        clientCode: 'PDG01',
        projects: [{ id: 'p-pdg', name: 'Prodigy secret capital $5000000' }],
      },
    });
    assert.match(mismatched, /does not match|Fail closed|will not fall back/i);
    assert.equal(/5000000|secret capital|Prodigy/.test(mismatched), false);

    const unavailable = currentWorkspaceUnavailableAnswer('ACCG01');
    assert.equal(unavailable.includes(RECOVERED), false);
    assert.equal(/capitalContext=PARTIAL/.test(unavailable), false);
    assert.match(unavailable, /will not substitute recovered or portfolio data/i);
    assert.match(unavailable, /capitalSubmit=false/);
    assert.match(unavailable, /canExecute=false/);
    assert.match(unavailable, /GLOBAL_AUTO_RESPOND=false/);
    assert.equal(GLOBAL_AUTO_RESPOND, false);
  });
});
