/**
 * REVOS-ELITE-RT-20260820-01 — fail closed unless opportunityId matches a loaded
 * commercial context for that ClientCode. ACME01 prices must not leak onto ACCG ids.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACME_COMMERCIAL_READ_MODEL,
  COMMERCIAL_GATES,
  loadCommercialReadModel,
} from './commercialReadModel.ts';

const ACME_FLOOR = 10000;
const ACME_LIST = 35000;

describe('REVOS-ELITE-RT-20260820-01 fail-closed commercial context', () => {
  it('returns the ACME01 record only for opp-revos-001', () => {
    const result = loadCommercialReadModel('opp-revos-001');
    assert.equal(result.ok, true);
    assert.ok(result.model);
    assert.equal(result.model.clientCode, 'ACME01');
    assert.equal(result.model.opportunityId, 'opp-revos-001');
    assert.equal(result.model.pricing.floorPrice, ACME_FLOOR);
    assert.equal(result.model.pricing.listPrice, ACME_LIST);
    assert.equal(result.model.clientCode, ACME_COMMERCIAL_READ_MODEL.clientCode);
  });

  it('does not return ACME01 floor/list for opp-accg-expansion-001', () => {
    const result = loadCommercialReadModel('opp-accg-expansion-001');
    assert.equal(result.ok, false);
    assert.equal(result.model, null);
    assert.match(result.error, /Fail closed/);
    assert.match(result.error, /opp-accg-expansion-001/);
    assert.doesNotMatch(JSON.stringify(result), /"floorPrice":10000/);
    assert.doesNotMatch(JSON.stringify(result), /"listPrice":35000/);
    assert.equal(result.model, null);
  });

  it('fails closed when opportunityId is missing', () => {
    const result = loadCommercialReadModel(undefined);
    assert.equal(result.ok, false);
    assert.equal(result.model, null);
    assert.match(result.error, /opportunityId is required/);
  });

  it('fails closed when ClientCode does not match the loaded context', () => {
    const result = loadCommercialReadModel('opp-revos-001', 'ACCG01');
    assert.equal(result.ok, false);
    assert.equal(result.model, null);
    assert.match(result.error, /ACCG01/);
    assert.match(result.error, /ACME01/);
    assert.doesNotMatch(JSON.stringify(result), /"floorPrice":10000/);
    assert.doesNotMatch(JSON.stringify(result), /"listPrice":35000/);
  });

  it('accepts an explicit matching ClientCode for the loaded ACME context', () => {
    const result = loadCommercialReadModel('opp-revos-001', 'ACME01');
    assert.equal(result.ok, true);
    assert.equal(result.model?.clientCode, 'ACME01');
    assert.equal(result.model?.pricing.floorPrice, ACME_FLOOR);
  });

  it('preserves closed commercial gates', () => {
    assert.equal(COMMERCIAL_GATES.autoSend, false);
    assert.equal(COMMERCIAL_GATES.liveDispatch, false);
    assert.equal(COMMERCIAL_GATES.autoProvisionAccess, false);
  });
});
