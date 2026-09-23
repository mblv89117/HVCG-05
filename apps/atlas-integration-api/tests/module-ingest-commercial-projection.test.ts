import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { projectModuleEnvelopeToOverlay } from '../src/modules/ingest/projectToCommercialOverlay.ts';
import { growth360ApprovalId } from '../src/modules/ingest/campaignApproval.ts';
import { overlayPath, loadOverlay } from '../src/pm/commercialContext/store.ts';
import { buildOperatorCommercialContext } from '../src/pm/commercialContext/build.ts';
import { composeClientTruth } from '../src/pm/commercialContext/clientTruth.ts';
import { buildLiveClientPilotBrief } from '../src/pm/commercialContext/liveClientPilot.ts';
import type { AtlasIntegrationEnvelope } from '@hvcg/atlas-integration-contracts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

function hfdPrincipal(): AtlasPrincipal {
  return {
    userId: 'projection-test',
    organizationId: 'org-hvcg',
    allowedClientIds: ['HFD01'],
    roles: ['HVCG Team Member'],
  };
}

function base(partial: Partial<AtlasIntegrationEnvelope> = {}): AtlasIntegrationEnvelope {
  const now = new Date().toISOString();
  return {
    clientCode: 'HFD01',
    source: 'growth_360',
    sourceRecordId: 'src-1',
    schemaVersion: '360_campaign_approval_v1',
    eventType: '360.campaign_approval.v1',
    timestamp: now,
    provenance: { system: 'growth_360', observedAt: now, confidence: 'VERIFIED' },
    confidence: 'VERIFIED',
    correlationId: 'corr-1',
    idempotencyKey: 'growth360|HFD01|test|1',
    actor: 'unit',
    authorityClass: 'OBSERVE',
    payload: { organizationSlug: 'hart-family-dental', canExecute: false, campaignId: 'c1' },
    ...partial,
  };
}

describe('module ingest commercial projection', () => {
  it('projects 360 OBSERVE into attributions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-overlay-'));
    const result = projectModuleEnvelopeToOverlay(dir, base());
    assert.equal(result.projected, true);
    assert.equal(result.fixtureOnly, false);
    const overlay = JSON.parse(readFileSync(overlayPath(dir), 'utf8'));
    assert.equal(overlay.attributions.length, 1);
    assert.equal(overlay.attributions[0].clientCode, 'HFD01');
    assert.equal(overlay.attributions[0].lineage.source, 'growth_360');
  });

  it('keeps MRI fixture from entitling a production ClientCode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-overlay-'));
    const now = new Date().toISOString();
    const result = projectModuleEnvelopeToOverlay(
      dir,
      base({
        clientCode: 'MRI01',
        source: 'copilot_mri',
        schemaVersion: 'mri_findings_v1',
        eventType: 'mri.findings.v1',
        idempotencyKey: 'mri|MRI01|test|1',
        confidence: 'INFERRED',
        provenance: { system: 'copilot_mri', observedAt: now, confidence: 'INFERRED' },
        payload: { findingsSummary: 'fixture only', requiresHumanReview: true },
      }),
    );
    assert.equal(result.projected, true);
    assert.equal(result.fixtureOnly, true);
    const overlay = JSON.parse(readFileSync(overlayPath(dir), 'utf8'));
    assert.equal(overlay.copilotAssessments.length, 1);
    assert.equal(overlay.copilotAssessments[0].clientCode, undefined);
    assert.match(String(overlay.copilotAssessments[0].summary), /FIXTURE/);
  });

  it('is idempotent on replay', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-overlay-'));
    const env = base();
    assert.equal(projectModuleEnvelopeToOverlay(dir, env).replay, false);
    assert.equal(projectModuleEnvelopeToOverlay(dir, env).replay, true);
    const overlay = JSON.parse(readFileSync(overlayPath(dir), 'utf8'));
    assert.equal(overlay.attributions.length, 1);
  });

  it('does not entitle fixture codes, ACCG01, or canExecute true', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-overlay-'));
    for (const clientCode of ['MRI01', 'SYN01', 'T360A', 'ACCG01']) {
      const result = projectModuleEnvelopeToOverlay(
        dir,
        base({
          clientCode,
          idempotencyKey: `growth360|${clientCode}|no-entitle`,
          payload: { organizationSlug: 'hart-family-dental', canExecute: false, campaignId: 'c1' },
        }),
      );
      assert.equal(result.projected, false);
    }
    const paid = projectModuleEnvelopeToOverlay(
      dir,
      base({
        idempotencyKey: 'growth360|HFD01|paid',
        payload: { organizationSlug: 'hart-family-dental', canExecute: true, campaignId: 'c-paid' },
      }),
    );
    assert.equal(paid.projected, false);
    const overlay = loadOverlay(dir);
    assert.equal(overlay.attributions.length, 0);
    assert.equal(
      overlay.attributions.some((row: { clientCode?: string }) =>
        ['MRI01', 'SYN01', 'T360A', 'ACCG01'].includes(row.clientCode || ''),
      ),
      false,
    );
  });

  it('points ClientTruth and Live Client growth lines at the same approval id', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-overlay-'));
    const env = base();
    assert.equal(projectModuleEnvelopeToOverlay(dir, env).projected, true);
    const overlay = loadOverlay(dir);
    const ctx = buildOperatorCommercialContext({
      principal: hfdPrincipal(),
      overlay,
      clientCode: 'HFD01',
    });
    const approvalId = growth360ApprovalId(env.idempotencyKey);
    const truth = composeClientTruth({ clientCode: 'HFD01', commercial: ctx });
    assert.equal('failClosed' in truth, false);
    if ('failClosed' in truth) return;
    assert.equal(truth.canExecute, false);
    assert.match(truth.growthContext.summary, /canExecute remains false/);
    assert.ok(truth.growthContext.summary.includes(approvalId));
    assert.ok(truth.growthContext.provenance.some((row) => row.detail.includes(`approvalId=${approvalId}`)));
    assert.ok(truth.answers.growthKnown?.text.includes(approvalId));
    const brief = buildLiveClientPilotBrief(ctx);
    assert.ok(
      brief.whatIsHappening.some(
        (line) => line.includes(approvalId) && line.includes('/approvals') && line.includes('/clients/HFD01'),
      ),
    );
    assert.ok(brief.known.some((line) => line.includes(approvalId) && /canExecute remains false/.test(line)));
  });
});
