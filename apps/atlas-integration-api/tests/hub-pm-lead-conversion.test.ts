import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  opportunityIdempotencyKey,
  opportunityTypeFromServiceInterest,
  proposeClientCode,
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
});
