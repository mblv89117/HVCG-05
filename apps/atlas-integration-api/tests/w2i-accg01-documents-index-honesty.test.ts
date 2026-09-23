/**
 * W2I ACCG01 documents-index honesty.
 * Current document index is entitled HVCG_Communications/file-index rows for that ClientCode.
 * An empty index is documents=MISSING. Recovered HVS filenames are not that index.
 * A SharePoint library URL pointer is not a complete file inventory.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';
import { composeClientTruth } from '../src/pm/commercialContext/clientTruth.ts';
import { buildLiveClientPilotBrief } from '../src/pm/commercialContext/liveClientPilot.ts';
import { buildOperatorCommercialContext } from '../src/pm/commercialContext/build.ts';
import { emptyOverlay } from '../src/pm/commercialContext/store.ts';
import {
  answerClientOperatingBrief,
  documentIndexUnavailableAnswer,
  WORKSPACE_TRUTH_SOURCE_UNAVAILABLE,
} from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';
import type { OperatorOperatingPicture } from '../src/pm/operatorDesk/types.ts';

const INTAKE = '01_Intake Docs';
const ARCHIVE = '08_Archive';
const SCOPE = 'ACCG INC SCOPE OF WORK.xlsx';
const KEPT_FILE = 'ACCG operating memo.pdf';
const FOREIGN_FILE = 'Prodigy private index.pdf';
const FOREIGN_RECOVERED = 'Prodigy_secret_recovered_index.pdf';
const HISTORICAL_MARKER = 'Historical/STALE_OR_UNCERTAIN';
const LIBRARY_TITLE = 'Client SharePoint library';
const LIKELY_MISSING_INVENTORY = /No inventoried files under|\(LIKELY\)|\(PROPOSED\)/;

function activePortion(text: string): string {
  const marker = text.indexOf(HISTORICAL_MARKER);
  return marker === -1 ? text : text.slice(0, marker);
}

/**
 * Drop the single historical STALE sentence. Filenames may contain periods
 * (`.xlsx`), so the sentence ends at `.` followed by whitespace or end of text.
 */
function withoutHistoricalSentence(text: string): string {
  const start = text.indexOf(HISTORICAL_MARKER);
  if (start === -1) return text;
  let end = text.length;
  for (let i = start; i < text.length; i++) {
    if (text[i] !== '.') continue;
    const next = text[i + 1];
    if (next === undefined || /\s/.test(next)) {
      end = i + 1;
      break;
    }
  }
  return `${text.slice(0, start)} ${text.slice(end)}`;
}

/** Full answer: recovered names only inside the historical STALE sentence, never as LIKELY missing inventory. */
function assertNoCurrentRecoveredInventory(answer: string, names: readonly string[]) {
  assert.equal(LIKELY_MISSING_INVENTORY.test(answer), false);
  assert.equal(/Missing:\s/i.test(answer), false);
  const outside = withoutHistoricalSentence(answer);
  for (const name of names) {
    assert.equal(outside.includes(name), false, `recovered name outside STALE clause: ${name}`);
  }
}

function assertAuthority(truth: { capitalSubmit: boolean; canExecute: boolean; globalAutoRespond: boolean }) {
  assert.equal(truth.capitalSubmit, false);
  assert.equal(truth.canExecute, false);
  assert.equal(truth.globalAutoRespond, false);
  assert.equal(GLOBAL_AUTO_RESPOND, false);
}

function emptyWorkspace(documents?: {
  queried: boolean;
  items: Array<{ id: string; title: string; source?: string; kind?: string; clientCode?: string }>;
  reason?: string;
}) {
  return {
    clientCode: 'ACCG01',
    displayName: 'ACCG Inc.',
    projects: [] as Array<{ id: string; name: string; status?: string }>,
    documents: documents ?? { queried: true, items: [] },
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
    hvsRecoveredDocuments: [
      {
        client: 'ACCG Inc',
        clientCode: 'ACCG01',
        name: SCOPE,
        kind: 'file',
        documentClass: 'agreement',
        provenance: 'CONFIRMED',
        amountsExtracted: false,
      },
      {
        client: 'ACCG Inc',
        clientCode: 'ACCG01',
        name: INTAKE,
        kind: 'folder',
        documentClass: 'structured_folder',
        provenance: 'CONFIRMED',
        amountsExtracted: false,
      },
      {
        client: 'Prodigy Games',
        clientCode: 'PDG01',
        name: FOREIGN_RECOVERED,
        kind: 'file',
        documentClass: 'unclassified',
        provenance: 'CONFIRMED',
        amountsExtracted: false,
      },
    ],
    hvsRecoveredProjects: [],
    hvsRecoveredClientRecords: [],
    hvsRecoveredCapitalPackets: [],
    recoveredClientsKnowledgeOperationalized: [],
    hvsActionableClientKnowledge: [],
  };
}

describe('W2I ACCG01 documents-index honesty', () => {
  it('empty entitled file-index is documents=MISSING and does not treat recovered filenames as current', () => {
    const workspace = emptyWorkspace();
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.documents.completeness, 'MISSING');
    assert.equal(truth.documents.classification, 'MISSING');
    assert.equal(truth.answers.documentsExist.classification, 'MISSING');
    assert.match(truth.documents.summary, /documents=MISSING/);
    assert.equal(/indexed from recovered HVS inventory/i.test(truth.documents.summary), false);
    assert.equal(activePortion(truth.documents.summary).includes(INTAKE), false);
    assert.equal(activePortion(truth.documents.summary).includes(ARCHIVE), false);
    assert.equal(activePortion(truth.documents.summary).includes(SCOPE), false);
    assert.equal(activePortion(truth.answers.documentsExist.text).includes(INTAKE), false);
    assert.match(truth.documents.summary, new RegExp(HISTORICAL_MARKER));
    assert.match(truth.documents.summary, /not the current document index/);
    assert.match(truth.documents.summary, /01_Intake Docs/);
    assert.equal(truth.documents.provenance.some((row) => row.source === 'HVCG_Communications/file-index'), true);
    assert.equal(
      truth.documents.provenance.some((row) => row.detail.startsWith('STALE_OR_UNCERTAIN:')),
      true,
    );
    assert.equal(truth.answers.documentsMissing.classification, 'MISSING');
    assert.equal(LIKELY_MISSING_INVENTORY.test(truth.answers.documentsMissing.text), false);
    assert.equal(truth.answers.documentsMissing.text.includes(INTAKE), false);
    assert.equal(truth.answers.documentsMissing.text.includes(ARCHIVE), false);
    assert.equal(truth.answers.documentsMissing.text.includes(SCOPE), false);
    assert.equal(truth.invented, false);
    assertAuthority(truth);

    const answer = answerClientOperatingBrief('What documents exist for ACCG01?', {
      entitledCodes: ['ACCG01', 'PDG01', 'HFD01'],
      workspace,
    });
    assert.match(answer, /documents=MISSING\/MISSING/);
    assert.match(answer, /not the current document index/);
    assertNoCurrentRecoveredInventory(answer, [INTAKE, ARCHIVE, SCOPE, '02_Financial Docs', '99_Internal']);
    assert.match(answer, new RegExp(HISTORICAL_MARKER));
    assert.match(answer, /01_Intake Docs/);
    assert.equal(answer.includes(ARCHIVE), false);
    assert.equal(answer.includes(SCOPE), false);
    assert.equal(/indexed from recovered HVS inventory/i.test(answer), false);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
    assert.equal(/PDG01|HFD01|Prodigy|Hart Family/.test(answer), false);

    const commercial = buildOperatorCommercialContext({
      principal: {
        userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        organizationId: 'org-hvcg',
        allowedClientIds: ['ACCG01'],
        roles: ['HVCG Team Member'],
      },
      overlay: emptyOverlay(),
      clientCode: 'ACCG01',
    });
    const brief = buildLiveClientPilotBrief(commercial, { workspace });
    const happening = brief.whatIsHappening.join(' ');
    assert.equal(happening.includes(INTAKE), false);
    assert.equal(happening.includes(ARCHIVE), false);
    assert.equal(happening.includes(SCOPE), false);
    assert.equal(/indexed from recovered HVS inventory/i.test(happening), false);
    assert.equal(/documents=INDEXED|documents=CONFIRMED/.test(happening), false);
  });

  it('a SharePoint library URL pointer is not a complete file inventory', () => {
    const workspace = emptyWorkspace({
      queried: true,
      items: [
        {
          id: 'library-ACCG01',
          title: LIBRARY_TITLE,
          source: 'HVCG_Clients.SharePointLibraryUrl',
          kind: 'library',
        },
      ],
      reason: 'library pointer only',
    });
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.documents.completeness, 'MISSING');
    assert.equal(truth.documents.classification, 'MISSING');
    assert.match(truth.documents.summary, /documents=MISSING/);
    assert.match(truth.documents.summary, /not a complete file inventory/);
    assert.equal(activePortion(truth.documents.summary).includes(LIBRARY_TITLE), false);
    assert.equal(/1 entitled/.test(activePortion(truth.documents.summary)), false);
    assert.equal(truth.documents.summary.includes('https://'), false);
    assertAuthority(truth);
  });

  it('real file-index rows contribute count and titles only and refuse a foreign ClientCode', () => {
    const workspace = emptyWorkspace({
      queried: true,
      items: [
        {
          id: 'library-ACCG01',
          title: LIBRARY_TITLE,
          source: 'HVCG_Clients.SharePointLibraryUrl',
          kind: 'library',
        },
        {
          id: 'file-1',
          title: KEPT_FILE,
          source: 'HVCG_Communications/file-index',
          clientCode: 'ACCG01',
        },
        {
          id: 'file-foreign',
          title: FOREIGN_FILE,
          source: 'HVCG_Communications/file-index',
          clientCode: 'PDG01',
        },
        {
          id: 'file-blank',
          title: '   ',
          source: 'HVCG_Communications/file-index',
        },
      ],
    });
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.documents.completeness, 'INDEXED');
    assert.equal(truth.documents.classification, 'CONFIRMED');
    assert.match(truth.documents.summary, /1 entitled HVCG_Communications\/file-index row\(s\)/);
    assert.match(truth.documents.summary, /ACCG operating memo\.pdf/);
    assert.equal(truth.documents.summary.includes(FOREIGN_FILE), false);
    assert.equal(truth.documents.summary.includes(LIBRARY_TITLE), false);
    assert.equal(truth.documents.summary.includes(INTAKE), false);
    assert.equal(truth.documents.summary.includes(SCOPE), false);
    assert.equal(truth.documents.summary.includes(HISTORICAL_MARKER), false);
    assert.equal(JSON.stringify(truth.documents).includes('PDG01'), false);
    assert.equal(JSON.stringify(truth.documents).includes('Prodigy'), false);
    assertAuthority(truth);

    assert.equal(truth.answers.documentsMissing.classification, 'MISSING');
    assert.equal(truth.answers.documentsMissing.text.includes(INTAKE), false);
    assert.equal(LIKELY_MISSING_INVENTORY.test(truth.answers.documentsMissing.text), false);

    const answer = answerClientOperatingBrief('What documents exist for ACCG?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace,
    });
    assert.match(answer, /documents=INDEXED\/CONFIRMED/);
    assert.match(answer, /ACCG operating memo\.pdf/);
    assertNoCurrentRecoveredInventory(answer, [INTAKE, ARCHIVE, SCOPE, FOREIGN_FILE, LIBRARY_TITLE]);
    assert.equal(answer.includes(FOREIGN_FILE), false);
    assert.equal(/PDG01|Prodigy/.test(answer), false);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);

    const commercial = buildOperatorCommercialContext({
      principal: {
        userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        organizationId: 'org-hvcg',
        allowedClientIds: ['ACCG01'],
        roles: ['HVCG Team Member'],
      },
      overlay: emptyOverlay(),
      clientCode: 'ACCG01',
    });
    const happening = buildLiveClientPilotBrief(commercial, { workspace }).whatIsHappening.join(' ');
    assert.match(happening, /ACCG operating memo\.pdf/);
    assert.equal(happening.includes(FOREIGN_FILE), false);
    assert.equal(happening.includes(INTAKE), false);
    assert.equal(happening.includes(SCOPE), false);
  });

  it('does not leak another client recovered filename into ACCG01', () => {
    const workspace = emptyWorkspace();
    const picture = mixedRecoveredPicture();
    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace, picture });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.documents.completeness, 'MISSING');
    assert.equal(truth.documents.classification, 'MISSING');
    assert.match(truth.documents.summary, new RegExp(HISTORICAL_MARKER));
    assert.match(truth.documents.summary, /ACCG INC SCOPE OF WORK\.xlsx/);
    assert.equal(activePortion(truth.documents.summary).includes(SCOPE), false);
    const blob = JSON.stringify(truth.documents) + truth.answers.documentsExist.text;
    assert.equal(blob.includes(FOREIGN_RECOVERED), false);
    assert.equal(blob.includes('PDG01'), false);
    assert.equal(blob.includes('Prodigy'), false);
    assertAuthority(truth);

    assert.equal(truth.answers.documentsMissing.classification, 'MISSING');
    assert.equal(truth.answers.documentsMissing.text.includes(SCOPE), false);
    assert.equal(truth.answers.documentsMissing.text.includes(INTAKE), false);
    assert.equal(LIKELY_MISSING_INVENTORY.test(truth.answers.documentsMissing.text), false);

    const answer = answerClientOperatingBrief('What documents exist for ACCG01?', {
      entitledCodes: ['ACCG01', 'PDG01'],
      workspace,
      picture,
    });
    assert.match(answer, /documents=MISSING\/MISSING/);
    assertNoCurrentRecoveredInventory(answer, [SCOPE, INTAKE, FOREIGN_RECOVERED, ARCHIVE]);
    assert.match(answer, /ACCG INC SCOPE OF WORK\.xlsx/);
    assert.equal(answer.includes(FOREIGN_RECOVERED), false);
    assert.equal(/PDG01|Prodigy/.test(answer), false);
    assert.match(answer, /capitalSubmit=false/);
    assert.match(answer, /canExecute=false/);
    assert.match(answer, /GLOBAL_AUTO_RESPOND=false/);
  });

  it('keeps workspace-unavailable document copy unchanged and fail-closes an unknown ClientCode', () => {
    const unavailable = documentIndexUnavailableAnswer('ACCG01');
    assert.equal(
      unavailable,
      [
        'Atlas cannot read the current ACCG01 document index (HVCG_Communications/file-index).',
        `Document availability is ${WORKSPACE_TRUTH_SOURCE_UNAVAILABLE}.`,
        'Atlas will not invent files, filenames, or a closing checklist.',
        'documents=SOURCE_UNAVAILABLE.',
        'GLOBAL_AUTO_RESPOND=false; capitalSubmit=false; canExecute=false.',
      ].join(' '),
    );
    assert.equal(unavailable.includes(INTAKE), false);
    assert.equal(unavailable.includes(SCOPE), false);
    assert.equal(GLOBAL_AUTO_RESPOND, false);

    const unknown = composeClientTruth({ clientCode: 'not-a-code' });
    assert.equal('failClosed' in unknown && unknown.failClosed, true);
    if ('failClosed' in unknown) assert.equal(unknown.reason, 'unknown_client_code');
    const wildcard = composeClientTruth({ clientCode: '*' });
    assert.equal('failClosed' in wildcard && wildcard.failClosed, true);
  });
});
