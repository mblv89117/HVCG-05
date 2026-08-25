import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { commercialContextCopy, commercialContextForbidsLiveActions } from './commercialContextView.ts';
import type { DeskCommercialContext, OperatorCommercialContext } from '../integrations/hub/pmApi';

describe('CommercialContextPanel copy', () => {
  it('renders honest empty lanes and never invents LTV or campaign history', () => {
    const desk: DeskCommercialContext = {
      contractVersion: 'atlas-operator-commercial-context.v1',
      entitled: true,
      liveGtmOutbound: false,
      paidAds: false,
      entitledClientCount: 1,
      gcc: {
        available: false,
        recordedOnly: true,
        count: 0,
        emptyReason: 'No GCC value signal on record. Live GCC dispatch is OFF. Atlas does not invent LTV, renewal, or expansion numbers.',
      },
      copilot: { available: false, recordedOnly: true, count: 0 },
      gtm: { available: false, recordedOnly: true, count: 0 },
      rows: [],
    };
    const copy = commercialContextCopy(desk);
    assert.equal(copy.outboundOff, true);
    assert.equal(copy.paidAdsOff, true);
    assert.equal(commercialContextForbidsLiveActions(copy), true);
    assert.match(copy.lanes[0].emptyReason, /does not invent LTV/);
    assert.match(copy.lanes[1].emptyReason, /does not invent MRI/);
    assert.match(copy.lanes[2].emptyReason, /does not invent campaign history/);
    assert.equal(copy.lanes.every((lane) => lane.available === false), true);
    assert.equal(JSON.stringify(copy).includes('250000'), false);
  });

  it('renders recorded GCC / Copilot / GTM lines from operator context', () => {
    const ctx: OperatorCommercialContext = {
      contractVersion: 'atlas-operator-commercial-context.v1',
      entitled: true,
      liveGtmOutbound: false,
      paidAds: false,
      clientCode: 'SYN01',
      gcc: {
        contractVersion: 'gcc-value-signal.v1',
        honesty: { available: true, recordedOnly: true },
        signals: [
          {
            signalId: 'sig-900',
            clientCode: 'SYN01',
            signalType: 'expansion_opportunity',
            severity: 'medium',
            summary: 'Recorded expansion signal',
            emittedAt: '2026-08-22T00:00:00.000Z',
          },
        ],
      },
      copilot: {
        honesty: { available: true, recordedOnly: true },
        assessments: [{ assessmentId: 'mri-501', clientCode: 'SYN01', summary: 'Observation-only MRI', observationOnly: true }],
        preCall: [],
        sharepoint: [],
      },
      gtm: {
        honesty: { available: true, recordedOnly: true },
        attributions: [{ clientCode: 'SYN01', lineage: { source: '360-growth', campaignId: 'cmp-gtm-001' } }],
        crmSources: [],
      },
      opportunities: [{ opportunityId: '1', clientCode: 'SYN01', title: 'SYN01 opportunity', stage: 'Proposal', capitalHandoffStatus: 'Ready' }],
    };
    const copy = commercialContextCopy(ctx);
    assert.equal(copy.lanes[0].available, true);
    assert.ok(copy.lanes[0].lines.some((line) => line.includes('Recorded expansion signal')));
    assert.ok(copy.lanes[1].lines.some((line) => line.includes('Observation-only MRI')));
    assert.ok(copy.lanes[2].lines.some((line) => line.includes('cmp-gtm-001')));
    assert.equal(copy.rows[0].clientCode, 'SYN01');
    assert.ok(copy.rows[0].href?.includes('/opportunities/1'));
  });
});
