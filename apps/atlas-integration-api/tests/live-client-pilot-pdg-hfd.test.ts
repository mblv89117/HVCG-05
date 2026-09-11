import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EVENT_360_CAMPAIGN_APPROVAL,
  EVENT_GCC_VALUE_SIGNAL,
  type AtlasIntegrationEnvelope,
} from '@hvcg/atlas-integration-contracts';
import { upsertIngestJson } from '../src/modules/ingest/store.ts';
import { hydrateCommercialOverlayForClient } from '../src/modules/ingest/hydrateCommercialOverlay.ts';
import { projectModuleEnvelopeToOverlay } from '../src/modules/ingest/projectToCommercialOverlay.ts';
import { emptyOverlay, loadOverlay } from '../src/pm/commercialContext/store.ts';
import { buildLiveClientPilotBrief } from '../src/pm/commercialContext/liveClientPilot.ts';
import { buildOperatorCommercialContext } from '../src/pm/commercialContext/build.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

function principal(codes: string[]): AtlasPrincipal {
  return {
    userId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    email: 'pilot@example.com',
    organizationId: 'org-hvcg',
    allowedClientIds: codes,
    roles: ['HVCG Team Member'],
  };
}

function gccEnvelope(): AtlasIntegrationEnvelope {
  const now = new Date().toISOString();
  return {
    clientCode: 'PDG01',
    source: 'growth_command_center',
    sourceRecordId: 'gcc-1',
    schemaVersion: 'gcc-value-signal.v1',
    eventType: EVENT_GCC_VALUE_SIGNAL,
    timestamp: now,
    provenance: { system: 'gcc', observedAt: now, confidence: 'VERIFIED' },
    confidence: 'VERIFIED',
    correlationId: 'corr-gcc-1',
    idempotencyKey: 'gcc|PDG01|pilot|1',
    actor: 'unit',
    authorityClass: 'OBSERVE',
    payload: {
      signalType: 'engagement_health',
      summary: 'Cash runway watch — observation only',
      financialImpact: 0,
    },
  };
}

function growthEnvelope(): AtlasIntegrationEnvelope {
  const now = new Date().toISOString();
  return {
    clientCode: 'HFD01',
    source: 'growth_360',
    sourceRecordId: 'g360-1',
    schemaVersion: '360_campaign_approval_v1',
    eventType: EVENT_360_CAMPAIGN_APPROVAL,
    timestamp: now,
    provenance: { system: 'growth_360', observedAt: now, confidence: 'VERIFIED' },
    confidence: 'VERIFIED',
    correlationId: 'corr-360-1',
    idempotencyKey: 'growth360|HFD01|pilot|1',
    actor: 'unit',
    authorityClass: 'OBSERVE',
    payload: {
      organizationSlug: 'hart-family-dental',
      campaignId: 'camp-1',
      canExecute: false,
    },
  };
}

describe('LIVE-CLIENT-PILOT PDG01/HFD01', () => {
  it('hydrates PDG01 GCC observation from local durable ingest into commercial overlay', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pilot-pdg-'));
    const env = gccEnvelope();
    upsertIngestJson({ dataDir: dir, keyId: 'gcc', envelope: env });
    const hydrated = await hydrateCommercialOverlayForClient({
      dataDir: dir,
      clientCode: 'PDG01',
      persist: true,
    });
    assert.ok(hydrated.hydratedFrom.includes('local-json'));
    const overlay = loadOverlay(dir);
    assert.equal(overlay.gccSignals.length, 1);
    assert.equal(overlay.gccSignals[0].clientCode, 'PDG01');
    assert.equal(overlay.gccSignals[0].copiesLedger, false);

    const ctx = buildOperatorCommercialContext({
      principal: principal(['PDG01', 'HFD01']),
      overlay,
      clientCode: 'PDG01',
    });
    const brief = buildLiveClientPilotBrief(ctx, { hydratedFrom: hydrated.hydratedFrom });
    assert.equal(brief.clientCode, 'PDG01');
    assert.ok(brief.whatIsHappening.some((l) => /GCC/i.test(l)));
    assert.ok(brief.nextActions.length >= 1);
    assert.ok(brief.approvalRequired.length >= 1);
    assert.ok(brief.provenance.length >= 1);
  });

  it('projects HFD01 Growth360 observation with canExecute false into pilot brief', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-pilot-hfd-'));
    const projected = projectModuleEnvelopeToOverlay(dir, growthEnvelope());
    assert.equal(projected.projected, true);
    const overlay = loadOverlay(dir);
    assert.equal(overlay.attributions.length, 1);
    assert.equal(overlay.attributions[0].lineage.source, 'growth_360');

    const ctx = buildOperatorCommercialContext({
      principal: principal(['PDG01', 'HFD01']),
      overlay,
      clientCode: 'HFD01',
    });
    const brief = buildLiveClientPilotBrief(ctx);
    assert.equal(brief.clientCode, 'HFD01');
    assert.ok(brief.whatIsHappening.some((l) => /Growth360/i.test(l)));
    assert.ok(brief.nextActions.some((a) => a.authorityClass === 'PREPARE' && a.approvalRequired));
    assert.ok(brief.approvalRequired.some((l) => /paid campaign/i.test(l)));
  });

  it('keeps honest empty pilot when no durable observations exist', () => {
    const ctx = buildOperatorCommercialContext({
      principal: principal(['PDG01']),
      overlay: emptyOverlay(),
      clientCode: 'PDG01',
    });
    const brief = buildLiveClientPilotBrief(ctx);
    assert.ok(brief.unknown.length >= 1);
    assert.ok(brief.nextActions.some((a) => a.authorityClass === 'OBSERVE'));
  });
});
