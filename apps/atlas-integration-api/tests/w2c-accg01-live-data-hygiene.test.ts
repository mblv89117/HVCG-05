/**
 * W2C ACCG01 live data hygiene — evidence-backed operating record classification.
 * Mission: ATLAS-W2C-ACCG01-LIVE-DATA-HYGIENE
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyOperatingRecord,
  filterOwnerFacingProjects,
  filterOwnerFacingTasks,
  isOwnerFacingCurrentOperating,
} from '../src/pm/sharepoint/operatingRecordHygiene.ts';
import {
  applyOperatingHygieneToWorkspaceSnapshot,
  composeClientTruth,
} from '../src/pm/commercialContext/clientTruth.ts';
import { buildLiveClientPilotBrief } from '../src/pm/commercialContext/liveClientPilot.ts';
import { buildOperatorCommercialContext } from '../src/pm/commercialContext/build.ts';
import { emptyOverlay } from '../src/pm/commercialContext/store.ts';
import { answerClientOperatingBrief } from '../src/pm/operatorDesk/askAtlasClientOperatingBrief.ts';

describe('W2C ACCG01 live data hygiene', () => {
  it('classifies known source-identity and structured harden lineage as TEST_HARDENING', () => {
    const knownDecision = classifyOperatingRecord({
      entityType: 'decision',
      sourceList: 'HVCG_Decisions',
      sourceItemId: '6',
      clientCode: 'ACCG01',
      title: 'ATLAS Harden Decision M014703',
      description: 'milestone+doc fix test',
    });
    assert.equal(knownDecision.classification, 'TEST_HARDENING');
    assert.equal(knownDecision.signals.knownSourceIdentity, true);
    assert.equal(knownDecision.safeClientOperatingVisibility, false);

    const structuredProject = classifyOperatingRecord({
      entityType: 'project',
      sourceList: 'HVCG_Projects',
      sourceItemId: '901',
      clientCode: 'ACCG01',
      title: 'ACCG01 - harden-1784680909',
    });
    assert.equal(structuredProject.classification, 'TEST_HARDENING');
    assert.equal(structuredProject.signals.structuredHardenLineage, true);

    const structuredDecision = classifyOperatingRecord({
      entityType: 'decision',
      sourceList: 'HVCG_Decisions',
      sourceItemId: '902',
      clientCode: 'ACCG01',
      title: 'HARDEN Decision 1784680909',
      description: 'Functional test internal only',
    });
    assert.equal(structuredDecision.classification, 'TEST_HARDENING');
    assert.equal(structuredDecision.signals.descriptionTestMarker, true);
  });

  it('keeps REAL_CURRENT_OPERATING and does not title-hide unrelated records', () => {
    const real = classifyOperatingRecord({
      entityType: 'project',
      sourceList: 'HVCG_Projects',
      sourceItemId: '100',
      clientCode: 'ACCG01',
      title: 'ACCG Inc. Capital Facility Review',
      description: 'Owner-facing operating work',
    });
    assert.equal(real.classification, 'REAL_CURRENT_OPERATING');
    assert.equal(isOwnerFacingCurrentOperating(real.classification), true);

    const notFuzzy = classifyOperatingRecord({
      entityType: 'project',
      sourceList: 'HVCG_Projects',
      sourceItemId: '101',
      clientCode: 'ACCG01',
      title: 'Hardened steel supply agreement',
    });
    assert.equal(notFuzzy.classification, 'REAL_CURRENT_OPERATING');
  });

  it('classifies HISTORICAL_RECOVERED, INTERNAL_SYSTEM, and UNKNOWN without promoting to current', () => {
    const historical = classifyOperatingRecord({
      entityType: 'project',
      sourceList: 'hvs-recovered-projects',
      sourceItemId: 'hvs-1',
      clientCode: 'ACCG01',
      title: 'Prior ACCG engagement folder',
      historicalRecovered: true,
      operationalized: false,
    });
    assert.equal(historical.classification, 'HISTORICAL_RECOVERED');
    assert.equal(historical.safeClientOperatingVisibility, false);

    const internal = classifyOperatingRecord({
      entityType: 'project',
      sourceList: 'HVCG_Projects',
      sourceItemId: '50',
      title: 'Atlas Hub Ops',
      isInternalProject: true,
    });
    assert.equal(internal.classification, 'INTERNAL_SYSTEM');

    const unknown = classifyOperatingRecord({
      entityType: 'decision',
      sourceList: 'HVCG_Decisions',
      sourceItemId: '77',
      clientCode: 'ACCG01',
      title: 'Decision about harden process improvement',
      description: 'needs human review',
    });
    assert.equal(unknown.classification, 'UNKNOWN_REQUIRES_REVIEW');
    assert.equal(unknown.safeClientOperatingVisibility, false);
  });

  it('excludes TEST_HARDENING children via parent classification and keeps real tasks', () => {
    const projects = filterOwnerFacingProjects([
      {
        id: '100',
        name: 'ACCG Inc. Operating Engagement',
        clientCode: 'ACCG01',
      },
      {
        id: '901',
        name: 'ACCG01 - hardenR-013942',
        clientCode: 'ACCG01',
      },
      {
        id: '27',
        name: 'ACCG01 - Onboarding',
        clientCode: 'ACCG01',
      },
    ]);
    assert.deepEqual(
      projects.operating.map((p) => p.id),
      ['100'],
    );
    assert.equal(projects.quarantined.length, 2);

    const tasks = filterOwnerFacingTasks(
      [
        { id: 't-real', title: 'Prepare ACCG status note', clientCode: 'ACCG01', projectId: '100' },
        { id: 't-harden', title: 'Schedule and run kickoff call', clientCode: 'ACCG01', projectId: '901' },
        { id: '11', title: 'Schedule and run kickoff call', clientCode: 'ACCG01', projectId: '27' },
      ],
      projects.byId,
    );
    assert.deepEqual(
      tasks.operating.map((t) => t.id),
      ['t-real'],
    );
    assert.equal(tasks.quarantined.length, 2);
  });

  it('keeps Ask Atlas and Live Client consistent: harden projects absent from current brief', () => {
    const workspace = applyOperatingHygieneToWorkspaceSnapshot({
      clientCode: 'ACCG01',
      displayName: 'ACCG Inc.',
      projects: [
        { id: '100', name: 'ACCG Inc. Operating Engagement', status: 'active' },
        { id: '901', name: 'ACCG01 - harden-014529', status: 'active' },
        { id: '902', name: 'ACCG01 - hardenM-014703', status: 'active' },
      ],
      tasks: [
        {
          id: 't1',
          title: 'Confirm ACCG document package',
          status: 'ready',
          dueDate: '2026-09-01',
        },
        {
          id: 't2',
          title: 'Schedule and run kickoff call',
          status: 'ready',
          projectId: '901',
        },
      ],
      decisionsRisks: {
        queried: true,
        items: [
          {
            id: '6',
            title: 'ATLAS Harden Decision M014703',
            summary: 'milestone+doc fix test',
            clientCode: 'ACCG01',
          },
          {
            id: 'd-real',
            title: 'Approve ACCG engagement scope',
            summary: 'Owner decision on engagement',
            clientCode: 'ACCG01',
          },
        ],
      },
      timeline: [
        {
          at: '2026-09-10T12:00:00Z',
          kind: 'project',
          title: 'Project created: ACCG01 - harden-014529',
          source: 'HVCG_Projects',
          id: '901',
        },
        {
          at: '2026-09-11T12:00:00Z',
          kind: 'project',
          title: 'Project created: ACCG Inc. Operating Engagement',
          source: 'HVCG_Projects',
          id: '100',
        },
      ],
    });
    assert.ok(workspace);
    assert.deepEqual(
      (workspace?.projects || []).map((p) => p.name),
      ['ACCG Inc. Operating Engagement'],
    );
    assert.equal((workspace?.decisionsRisks?.items || []).length, 1);
    assert.equal((workspace?.decisionsRisks?.items || [])[0]?.title, 'Approve ACCG engagement scope');

    const truth = composeClientTruth({ clientCode: 'ACCG01', workspace, now: '2026-09-12T00:00:00Z' });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.match(truth.answers.workingOn.text, /ACCG Inc\. Operating Engagement/);
    assert.equal(/harden/i.test(truth.answers.workingOn.text), false);
    assert.equal(truth.financialContext.classification, 'NOT_CERTIFIED');
    assert.equal(truth.growthContext.classification, 'NOT_CERTIFIED');
    assert.equal(truth.contacts.classification, 'MISSING');
    assert.equal(truth.writePolicy, 'read_only');
    assert.equal(truth.globalAutoRespond, false);
    assert.equal(truth.capitalSubmit, false);
    assert.equal(truth.canExecute, false);

    // READY + OVERDUE may coexist (status ready + past due); multi-queue semantics preserved.
    assert.equal(truth.queues.ready.some((q) => q.id === 't1'), true);
    assert.equal(truth.queues.overdue.some((q) => q.id === 't1'), true);
    assert.equal(truth.queues.ready.some((q) => q.id === 't2'), false);

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
    assert.equal(brief.whatIsHappening.some((line) => /harden/i.test(line)), false);
    assert.equal(brief.whatIsHappening.some((line) => /Operating Engagement/i.test(line)), true);

    const ask = answerClientOperatingBrief('Give me the current ACCG operating brief.', {
      entitledCodes: ['ACCG01'],
      explicitClientCode: 'ACCG01',
      workspace,
      commercial,
    });
    assert.equal(/harden/i.test(ask), false);
    assert.match(ask, /Operating Engagement|ACCG/i);
  });

  it('does not silently promote UNKNOWN or HISTORICAL into current work; fail-closed unknown ClientCode', () => {
    const truth = composeClientTruth({
      clientCode: 'ACCG01',
      workspace: {
        clientCode: 'ACCG01',
        projects: [
          {
            id: 'hist-1',
            name: 'Recovered prior folder',
          },
        ],
      },
    });
    // Without historicalRecovered flag on snapshot projects, titles alone do not quarantine.
    // Explicit historical path:
    const hist = classifyOperatingRecord({
      entityType: 'project',
      sourceList: 'hvs-recovered',
      sourceItemId: 'hist-1',
      clientCode: 'ACCG01',
      title: 'Recovered prior folder',
      operationalized: false,
    });
    assert.equal(hist.classification, 'HISTORICAL_RECOVERED');
    assert.equal(isOwnerFacingCurrentOperating(hist.classification), false);

    const closed = composeClientTruth({ clientCode: 'not-a-code' });
    assert.equal('failClosed' in closed && closed.failClosed, true);
    void truth;
  });

  it('preserves cross-client isolation: PDG harden-shaped title does not attach to ACCG', () => {
    const accg = composeClientTruth({
      clientCode: 'ACCG01',
      workspace: {
        clientCode: 'ACCG01',
        projects: [{ id: '1', name: 'ACCG Inc. Operating Engagement' }],
      },
    });
    const pdg = composeClientTruth({
      clientCode: 'PDG01',
      workspace: {
        clientCode: 'PDG01',
        projects: [{ id: '2', name: 'PDG01 - harden-999' }],
      },
    });
    assert.equal('failClosed' in accg, false);
    assert.equal('failClosed' in pdg, false);
    if ('failClosed' in accg || 'failClosed' in pdg) return;
    assert.match(accg.answers.workingOn.text, /ACCG Inc\. Operating Engagement/);
    assert.equal(/harden/i.test(accg.answers.workingOn.text), false);
    assert.equal(/harden/i.test(pdg.answers.workingOn.text), false);
  });
});
