/**
 * Phase 6B-QA — gate logic, restore pilot, inbox readiness filtering.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HVCG_PILOT_WEBSITE_ID } from '@hvcg/atlas-integration-core';
import { WebsiteStudioService } from '../src/website-studio/service.ts';
import {
  computeGateFromResult,
  HVCG_QA_FIXTURE,
  ownerPackageForPass,
} from '../src/website-studio/qaGate.ts';

describe('website-studio QA gate', () => {
  it('computeGateFromResult blocks HIGH defects', () => {
    const base = {
      schemaVersion: 1 as const,
      runId: 'r1',
      runType: 'RELEASE GATE' as const,
      testedCommit: 'abc',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 1,
      changeRequestId: HVCG_QA_FIXTURE.changeRequestId,
      websiteId: HVCG_QA_FIXTURE.websiteId,
      checks: [{ id: 'x', name: 'x', status: 'PASS' as const }],
      defects: [
        {
          id: 'DEF-1',
          title: 'same before/after',
          severity: 'CRITICAL' as const,
          ownerWorkflowStep: 'Before/After',
          expected: 'differ',
          actual: 'same',
          affectedComponent: 'ChangeReview',
          suggestedFix: 'remount iframes',
          retestRequired: true,
        },
      ],
      buttonInventory: {
        total: 0,
        functional: 0,
        disabledWithExplanation: 0,
        comingLater: 0,
        failures: [],
      },
      beforeAfter: {
        baselineCommit: HVCG_QA_FIXTURE.baselineCommit,
        pilotCommit: HVCG_QA_FIXTURE.pilotCommit,
        beforeH1: HVCG_QA_FIXTURE.beforeH1,
        afterH1: HVCG_QA_FIXTURE.afterH1,
        visualDifferenceVerified: false,
      },
      aiAdvisor: { mode: 'deterministic' as const, threeOptionsOk: true, failures: [] },
      approval: {
        confirmationOk: true,
        persistenceOk: true,
        invalidationOk: true,
        productionUnchanged: true,
      },
      safety: {
        localAiWritesEnabled: false,
        localAiExternalMessagesEnabled: false,
        evaIntakeEnabled: false,
        clientEmailsEnabled: false,
        productionChanged: false,
        unexpectedExternalHosts: [],
      },
      performance: {
        ownerFlowMs: 1,
        previewStartupMs: 1,
        aiOperationMs: 1,
        pageLoadMs: 1,
        retries: 0,
        retestCount: 0,
      },
      evidenceDir: '/tmp',
      screenshots: [],
      traces: [],
      summary: {},
    };
    const failed = computeGateFromResult(base);
    assert.equal(failed.gate, 'FAILED QA');
    const passed = computeGateFromResult({ ...base, defects: [] });
    assert.equal(passed.gate, 'READY FOR MANNY');
    assert.equal(passed.verdict, 'WEBSITE STUDIO QA GATE — READY FOR MANNY');
  });

  it('restorePilotForOwnerReview clears approval and gates inbox until READY FOR MANNY', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-qa-'));
    const dbPath = join(dir, 'ws.sqlite');
    const service = new WebsiteStudioService({
      repoRoot: dir,
      env: { WEBSITE_STUDIO_DB: dbPath },
      dbPath,
    });
    const boot = service.bootstrapPhase6bPilot({});
    const id = boot.changeRequest.changeRequestId;
    const cr = service.getChangeRequest(id);
    cr.status = 'Rejected';
    cr.savedForLater = true;
    cr.ownerApproval = {
      approvedBy: 'Manny',
      approvedAt: new Date().toISOString(),
      exactApprovedContent: HVCG_QA_FIXTURE.afterH1,
      contentFingerprint: 'x',
      websiteId: HVCG_PILOT_WEBSITE_ID,
      pageId: cr.pageId,
      section: 'Hero',
      blockLabel: 'Main Headline',
      baselineCommit: null,
      pilotCommit: null,
      previewCommit: null,
      previewReviewed: true,
      deviceReviews: {},
      qaState: null,
      auditCorrelationId: cr.auditCorrelationId,
      productionImpact: 'NONE YET',
      published: false,
      invalidated: true,
    };
    cr.ownerQaGate = 'NOT TESTED';
    service.store.upsertChangeRequest(cr);

    const restored = service.restorePilotForOwnerReview(id);
    assert.equal(restored.ownerStatus, 'Waiting for Your Review');
    assert.equal(restored.savedForLater, false);
    assert.equal(restored.ownerApproval, null);

    let inbox = service.ownerInbox(HVCG_PILOT_WEBSITE_ID);
    assert.equal(inbox.needsReview.some((c) => c.changeRequestId === id), false);
    assert.ok(inbox.notReadyForReview.some((c) => c.changeRequestId === id));

    service.beginQaRun({ websiteId: HVCG_PILOT_WEBSITE_ID, changeRequestId: id });
    const sealed = service.recordQaResult({
      schemaVersion: 1,
      runId: 'run-test',
      runType: 'RELEASE GATE',
      gate: 'TESTING',
      verdict: 'WEBSITE STUDIO QA GATE — FAILED',
      testedCommit: 'deadbeef',
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 10,
      changeRequestId: id,
      websiteId: HVCG_PILOT_WEBSITE_ID,
      checks: [{ id: 'browser', name: 'Browser', status: 'PASS' }],
      defects: [],
      buttonInventory: {
        total: 1,
        functional: 1,
        disabledWithExplanation: 0,
        comingLater: 0,
        failures: [],
      },
      beforeAfter: {
        baselineCommit: HVCG_QA_FIXTURE.baselineCommit,
        pilotCommit: HVCG_QA_FIXTURE.pilotCommit,
        beforeH1: HVCG_QA_FIXTURE.beforeH1,
        afterH1: HVCG_QA_FIXTURE.afterH1,
        visualDifferenceVerified: true,
      },
      aiAdvisor: { mode: 'deterministic', threeOptionsOk: true, failures: [] },
      approval: {
        confirmationOk: true,
        persistenceOk: true,
        invalidationOk: true,
        productionUnchanged: true,
      },
      safety: {
        localAiWritesEnabled: false,
        localAiExternalMessagesEnabled: false,
        evaIntakeEnabled: false,
        clientEmailsEnabled: false,
        productionChanged: false,
        unexpectedExternalHosts: [],
      },
      performance: {
        ownerFlowMs: 1,
        previewStartupMs: 1,
        aiOperationMs: 1,
        pageLoadMs: 1,
        retries: 0,
        retestCount: 0,
      },
      evidenceDir: dir,
      screenshots: [],
      traces: [],
      ownerPackage: ownerPackageForPass({ changeRequestId: id }),
      summary: { Build: 'PASS' },
    });
    assert.equal(sealed.gate, 'READY FOR MANNY');
    inbox = service.ownerInbox(HVCG_PILOT_WEBSITE_ID);
    assert.ok(inbox.needsReview.some((c) => c.changeRequestId === id));
    assert.equal(inbox.readiness.badge, 'READY FOR MANNY');

    service.store.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
