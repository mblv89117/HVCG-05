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
  filterOwnerFacingWorkspaceItems,
  isOwnerFacingCurrentOperating,
  sourceRecordKey,
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
  it('sourceRecordKey qualifies list-local IDs by canonical source list', () => {
    assert.equal(sourceRecordKey('HVCG_Projects', '11'), 'HVCG_Projects|11');
    assert.equal(sourceRecordKey('HVCG_Tasks', '11'), 'HVCG_Tasks|11');
    assert.notEqual(sourceRecordKey('HVCG_Projects', '11'), sourceRecordKey('HVCG_Tasks', '11'));
    assert.equal(sourceRecordKey('HVCG_Decisions', '6'), 'HVCG_Decisions|6');
    assert.equal(sourceRecordKey('HVCG_Risks', '6'), 'HVCG_Risks|6');
    assert.notEqual(sourceRecordKey('HVCG_Decisions', '6'), sourceRecordKey('HVCG_Risks', '6'));
  });

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
            sourceList: 'HVCG_Decisions',
            entityType: 'decision',
          },
          {
            id: 'd-real',
            title: 'Approve ACCG engagement scope',
            summary: 'Owner decision on engagement',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Decisions',
            entityType: 'decision',
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

  it('does not collide list-local decision ID 6 with risk ID 6', () => {
    const decision = classifyOperatingRecord({
      entityType: 'decision',
      sourceList: 'HVCG_Decisions',
      sourceItemId: '6',
      clientCode: 'ACCG01',
      title: 'ATLAS Harden Decision M014703',
      summary: 'milestone+doc fix test',
    });
    assert.equal(decision.classification, 'TEST_HARDENING');

    const risk = classifyOperatingRecord({
      entityType: 'risk',
      sourceList: 'HVCG_Risks',
      sourceItemId: '6',
      clientCode: 'ACCG01',
      title: 'ACCG receivables concentration risk',
      summary: 'Client operating risk requiring review',
    });
    assert.equal(risk.classification, 'REAL_CURRENT_OPERATING');

    const filtered = filterOwnerFacingWorkspaceItems(
      [
        {
          id: '6',
          title: 'ATLAS Harden Decision M014703',
          summary: 'milestone+doc fix test',
          clientCode: 'ACCG01',
          sourceList: 'HVCG_Decisions',
          entityType: 'decision',
        },
        {
          id: '6',
          title: 'ACCG receivables concentration risk',
          summary: 'Client operating risk requiring review',
          clientCode: 'ACCG01',
          sourceList: 'HVCG_Risks',
          entityType: 'risk',
        },
      ],
      { clientCode: 'ACCG01' },
    );
    assert.equal(filtered.operating.length, 1);
    assert.equal(filtered.operating[0]?.title, 'ACCG receivables concentration risk');
    assert.equal(filtered.operating[0]?.sourceList, 'HVCG_Risks');
    assert.equal(filtered.quarantined.length, 1);
    assert.equal(filtered.quarantined[0]?.sourceRef, 'HVCG_Decisions:6');
    assert.equal(filtered.quarantined[0]?.proposedClassification, 'TEST_HARDENING');
  });

  it('classifies TEST_HARDENING risks under HVCG_Risks without mistaking them for decisions', () => {
    const riskClass = classifyOperatingRecord({
      entityType: 'risk',
      sourceList: 'HVCG_Risks',
      sourceItemId: '88',
      clientCode: 'ACCG01',
      title: 'Some operating risk',
      summary: 'normal risk',
    });
    assert.equal(riskClass.classification, 'REAL_CURRENT_OPERATING');
    assert.notEqual(riskClass.signals.knownSourceIdentity, true);

    // Inverse: a risk that looks like the known decision title must NOT match HVCG_Decisions:6 registry.
    const notDecisionRegistry = classifyOperatingRecord({
      entityType: 'risk',
      sourceList: 'HVCG_Risks',
      sourceItemId: '6',
      clientCode: 'ACCG01',
      title: 'ATLAS Harden Decision M014703',
      summary: 'milestone+doc fix test',
    });
    assert.notEqual(notDecisionRegistry.signals.knownSourceIdentity, true);
    assert.notEqual(notDecisionRegistry.classification, 'REAL_CURRENT_OPERATING');

    const hardenRisk = filterOwnerFacingWorkspaceItems(
      [
        {
          id: '99',
          title: 'Risk about harden process improvement',
          summary: 'functional test internal only',
          clientCode: 'ACCG01',
          sourceList: 'HVCG_Risks',
          entityType: 'risk',
        },
      ],
      { clientCode: 'ACCG01' },
    );
    assert.equal(hardenRisk.quarantined[0]?.sourceList, 'HVCG_Risks');
    assert.equal(hardenRisk.quarantined[0]?.entityType, 'risk');
    assert.equal(hardenRisk.quarantined[0]?.sourceRef, 'HVCG_Risks:99');
    assert.equal(hardenRisk.quarantined[0]?.proposedClassification, 'UNKNOWN_REQUIRES_REVIEW');
    assert.equal(hardenRisk.operating.length, 0);
  });

  it('filters timeline by source|id composite keys (project/task list-local collision)', () => {
    // REAL project 11 vs known TEST_HARDENING task 11 (registry) — flat ID sets would leak the task.
    const keepProject = applyOperatingHygieneToWorkspaceSnapshot({
      clientCode: 'ACCG01',
      projects: [{ id: '11', name: 'ACCG Inc. Operating Engagement' }],
      tasks: [
        {
          id: '11',
          title: 'Schedule and run kickoff call',
          projectId: '27',
        },
      ],
      timeline: [
        {
          at: '2026-09-10T10:00:00Z',
          kind: 'project',
          title: 'Project created: ACCG Inc. Operating Engagement',
          source: 'HVCG_Projects',
          id: '11',
        },
        {
          at: '2026-09-10T11:00:00Z',
          kind: 'task',
          title: 'Task: Schedule and run kickoff call',
          source: 'HVCG_Tasks',
          id: '11',
        },
        {
          at: '2026-09-10T12:00:00Z',
          kind: 'communication',
          title: 'Client email',
          source: 'HVCG_Communications',
          id: '11',
        },
      ],
    });
    assert.ok(keepProject);
    const titlesA = (keepProject?.timeline || []).map((e) => e.title);
    assert.equal(titlesA.some((t) => /Operating Engagement/.test(t)), true);
    assert.equal(titlesA.some((t) => /kickoff call/.test(t)), false);
    assert.equal(titlesA.some((t) => /Client email/.test(t)), true);

    // Reverse collision: TEST project vs REAL task share list-local id "12".
    // Use id 12 for the project (structured harden) and a non-registry task id that collides
    // would be unsafe for ACCG01 because HVCG_Tasks|12 is itself a known TEST_HARDENING row.
    // Pattern under test: same numeric id, different source lists — use id 55 (not in known registry).
    const keepTask = applyOperatingHygieneToWorkspaceSnapshot({
      clientCode: 'ACCG01',
      projects: [{ id: '55', name: 'ACCG01 - harden-014529' }],
      tasks: [{ id: '55', title: 'Confirm ACCG document package' }],
      timeline: [
        {
          at: '2026-09-10T10:00:00Z',
          kind: 'project',
          title: 'Project created: ACCG01 - harden-014529',
          source: 'HVCG_Projects',
          id: '55',
        },
        {
          at: '2026-09-10T11:00:00Z',
          kind: 'task',
          title: 'Task: Confirm ACCG document package',
          source: 'HVCG_Tasks',
          id: '55',
        },
      ],
    });
    assert.ok(keepTask);
    const titlesB = (keepTask?.timeline || []).map((e) => e.title);
    assert.equal(titlesB.some((t) => /harden-014529/.test(t)), false);
    assert.equal(titlesB.some((t) => /document package/.test(t)), true);
  });

  it('filters timeline decision/risk collisions by source-qualified keys', () => {
    const workspace = applyOperatingHygieneToWorkspaceSnapshot({
      clientCode: 'ACCG01',
      projects: [{ id: '100', name: 'ACCG Inc. Operating Engagement' }],
      decisionsRisks: {
        queried: true,
        items: [
          {
            id: '6',
            title: 'ATLAS Harden Decision M014703',
            summary: 'milestone+doc fix test',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Decisions',
            entityType: 'decision',
          },
          {
            id: '6',
            title: 'ACCG receivables concentration risk',
            summary: 'Client operating risk requiring review',
            clientCode: 'ACCG01',
            sourceList: 'HVCG_Risks',
            entityType: 'risk',
          },
        ],
      },
      timeline: [
        {
          at: '2026-09-10T10:00:00Z',
          kind: 'decision',
          title: 'Decision: ATLAS Harden Decision M014703',
          source: 'HVCG_Decisions',
          id: '6',
        },
        {
          at: '2026-09-10T11:00:00Z',
          kind: 'risk',
          title: 'Risk: ACCG receivables concentration risk',
          source: 'HVCG_Risks',
          id: '6',
        },
      ],
    });
    assert.ok(workspace);
    assert.equal((workspace?.decisionsRisks?.items || []).length, 1);
    assert.equal((workspace?.decisionsRisks?.items || [])[0]?.sourceList, 'HVCG_Risks');
    const titles = (workspace?.timeline || []).map((e) => e.title);
    assert.equal(titles.some((t) => /Harden Decision/.test(t)), false);
    assert.equal(titles.some((t) => /receivables concentration/.test(t)), true);
  });
});
