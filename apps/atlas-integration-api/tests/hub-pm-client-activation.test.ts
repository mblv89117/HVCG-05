import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  activationIdempotencyKey,
  classifyClientActivation,
  parseActivationNotes,
  writeActivationNotes,
} from '../src/pm/sharepoint/clientActivation.ts';
import { companyTitleFromOpportunityTitle } from '../src/pm/sharepoint/leadConversion.ts';

describe('client activation helpers', () => {
  it('strips the converted Discovery suffix from opportunity titles', () => {
    assert.equal(
      companyTitleFromOpportunityTitle('SYNTHETIC QA — Atlas Capital Operations — Discovery'),
      'SYNTHETIC QA — Atlas Capital Operations',
    );
    assert.equal(companyTitleFromOpportunityTitle('Alder & Co. - Discovery'), 'Alder & Co.');
  });

  it('classifies won prospect as activation required and active client as active', () => {
    assert.equal(
      classifyClientActivation({ clientStage: 'Prospect', winLossStatus: 'Won' }),
      'activation_required',
    );
    assert.equal(classifyClientActivation({ clientStage: 'Active Client' }), 'active');
    assert.equal(
      classifyClientActivation({
        clientStage: 'Active Client',
        record: {
          version: 1,
          clientCode: 'SYNTH01',
          opportunityId: '1',
          status: 'verified',
          idempotencyKey: activationIdempotencyKey('SYNTH01', '1'),
          entitlementProvisioned: false,
          entraGroupProvisioned: false,
          sharePointLibraryProvisioned: false,
          portalAccessProvisioned: false,
          workspaceProvisioning: 'staged',
        },
      }),
      'verified',
    );
  });

  it('round-trips activation notes without dropping other operator notes', () => {
    const key = activationIdempotencyKey('SYNTH01', '130');
    const notes = writeActivationNotes('Existing operator note', {
      version: 1,
      clientCode: 'SYNTH01',
      opportunityId: '130',
      status: 'activation_required',
      idempotencyKey: key,
      entitlementProvisioned: false,
      entraGroupProvisioned: false,
      sharePointLibraryProvisioned: false,
      portalAccessProvisioned: false,
      workspaceProvisioning: 'not_started',
    });
    assert.match(notes, /Existing operator note/);
    const parsed = parseActivationNotes(notes);
    assert.equal(parsed?.clientCode, 'SYNTH01');
    assert.equal(parsed?.status, 'activation_required');
    assert.equal(parsed?.entitlementProvisioned, false);
  });
});
