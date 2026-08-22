import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  activationIdempotencyKey,
  classifyClientActivation,
  clientPortalHrefs,
  governedHubProvisioning,
  needsGovernedHubReplay,
  parseActivationNotes,
  replayGovernedHubProvisioning,
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
          documentRequestPathProvisioned: false,
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
      documentRequestPathProvisioned: false,
      workspaceProvisioning: 'not_started',
    });
    assert.match(notes, /Existing operator note/);
    const parsed = parseActivationNotes(notes);
    assert.equal(parsed?.clientCode, 'SYNTH01');
    assert.equal(parsed?.status, 'activation_required');
    assert.equal(parsed?.entitlementProvisioned, false);
  });

  it('governed Hub provisioning sets portal/workspace/document-request without Entra', () => {
    const provisioned = governedHubProvisioning();
    assert.equal(provisioned.portalAccessProvisioned, true);
    assert.equal(provisioned.documentRequestPathProvisioned, true);
    assert.equal(provisioned.workspaceProvisioning, 'ready');
    assert.equal(provisioned.entitlementProvisioned, false);
    assert.equal(provisioned.entraGroupProvisioned, false);
    assert.equal(provisioned.sharePointLibraryProvisioned, false);
    assert.equal(clientPortalHrefs('SYNTH01').portalHref, '/api/pm/clients/SYNTH01/portal');
    assert.equal(clientPortalHrefs('SYNTH01').clientDeskHref, '/client');
    assert.equal(clientPortalHrefs('SYNTH01').documentRequestHref.includes('operator'), false);
  });

  it('verify-replay persists Hub path flags on already-verified stale records without Entra', () => {
    const stale = {
      version: 1 as const,
      clientCode: 'SYN01',
      opportunityId: '1',
      status: 'verified' as const,
      idempotencyKey: activationIdempotencyKey('SYN01', '1'),
      entitlementProvisioned: false as const,
      entraGroupProvisioned: false as const,
      sharePointLibraryProvisioned: false as const,
      portalAccessProvisioned: false,
      documentRequestPathProvisioned: false,
      workspaceProvisioning: 'staged' as const,
    };
    assert.equal(needsGovernedHubReplay(stale, 'verified'), true);
    assert.equal(needsGovernedHubReplay(undefined, 'verified'), false);
    assert.equal(
      needsGovernedHubReplay({ ...stale, status: 'activation_required', workspaceProvisioning: 'not_started' }, 'activation_required'),
      false,
    );
    const replayed = replayGovernedHubProvisioning(stale);
    assert.equal(replayed.status, 'verified');
    assert.equal(replayed.portalAccessProvisioned, true);
    assert.equal(replayed.documentRequestPathProvisioned, true);
    assert.equal(replayed.workspaceProvisioning, 'ready');
    assert.equal(replayed.entraGroupProvisioned, false);
    assert.equal(replayed.entitlementProvisioned, false);
    assert.equal(replayed.sharePointLibraryProvisioned, false);
    assert.equal(needsGovernedHubReplay(replayed, 'verified'), false);
    const hrefs = clientPortalHrefs('SYN01');
    assert.equal(hrefs.portalHref, '/api/pm/clients/SYN01/portal');
    assert.equal(hrefs.documentRequestHref, '/api/pm/clients/SYN01/document-requests');
    assert.equal(hrefs.clientDeskHref, '/client');
    assert.equal(hrefs.workspaceHref, '/api/pm/clients/SYN01/workspace');
  });
});
