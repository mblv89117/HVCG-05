import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  companyTitleFromOpportunityTitle,
  opportunityIdempotencyKey,
  opportunityTypeFromServiceInterest,
  proposeClientCode,
  shouldPromoteReusedCompanyToProspect,
} from '../src/pm/sharepoint/leadConversion.ts';

describe('Lead conversion helpers', () => {
  it('maps ServiceInterest onto existing OpportunityType choices', () => {
    assert.equal(opportunityTypeFromServiceInterest('Assessment'), 'Assessment');
    assert.equal(opportunityTypeFromServiceInterest('Capital Advisory'), 'Capital Raise');
    assert.equal(opportunityTypeFromServiceInterest('Unknown SKU'), undefined);
    assert.equal(opportunityTypeFromServiceInterest(undefined), undefined);
  });

  it('reuses the Power Automate opportunity idempotency pattern', () => {
    assert.equal(opportunityIdempotencyKey('84'), 'opp-from-lead|84');
  });

  it('proposes a canonical ClientCode without colliding', () => {
    const code = proposeClientCode('Northwind Capital', ['ACCG01', 'PDG01']);
    assert.match(code, /^NORTH\d{2}$/);
    const next = proposeClientCode('Northwind Capital', [code]);
    assert.notEqual(next, code);
  });

  it('strips the converted Discovery suffix from opportunity titles', () => {
    assert.equal(
      companyTitleFromOpportunityTitle('SYNTHETIC QA — Atlas Capital Operations — Discovery'),
      'SYNTHETIC QA — Atlas Capital Operations',
    );
  });

  it('promotes only Lead-stage reused companies and never ACCG01', () => {
    assert.equal(shouldPromoteReusedCompanyToProspect({ clientCode: 'SYN01', clientStage: 'Lead' }), true);
    assert.equal(shouldPromoteReusedCompanyToProspect({ clientCode: 'SYN01', clientStage: 'Prospect' }), false);
    assert.equal(shouldPromoteReusedCompanyToProspect({ clientCode: 'SYN01', clientStage: 'Active Client' }), false);
    assert.equal(shouldPromoteReusedCompanyToProspect({ clientCode: 'SYN01', clientStage: 'Alumni' }), false);
    assert.equal(shouldPromoteReusedCompanyToProspect({ clientCode: 'SYN01', clientStage: 'Do Not Engage' }), false);
    assert.equal(shouldPromoteReusedCompanyToProspect({ clientCode: 'SYN01', clientStage: 'On Hold' }), false);
    assert.equal(shouldPromoteReusedCompanyToProspect({ clientCode: 'ACCG01', clientStage: 'Lead' }), false);
    assert.equal(shouldPromoteReusedCompanyToProspect({ clientCode: '', clientStage: 'Lead' }), false);
    assert.equal(shouldPromoteReusedCompanyToProspect({ clientCode: 'SYN01', clientStage: undefined }), false);
  });
});
