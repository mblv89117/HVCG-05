import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessCapitalClient,
  entitledCapitalClientCodes,
  isMannyApprover,
  isSyntheticClientCode,
  isSyntheticCapitalRecord,
} from '../src/index.ts';

describe('capital client isolation', () => {
  it('does not grant wildcard access to Owner or Administrator', () => {
    assert.equal(canAccessCapitalClient([], 'SYN01'), false);
    assert.equal(canAccessCapitalClient(['*'], 'SYN01'), false);
    assert.equal(canAccessCapitalClient(['SYN01'], 'SYN01'), true);
    assert.equal(canAccessCapitalClient(['SYN01'], 'OTH01'), false);
    assert.equal(canAccessCapitalClient(['SYN01'], '*'), false);
    assert.deepEqual(entitledCapitalClientCodes(['*', 'SYN01', 'bad']), ['SYN01']);
  });

  it('treats Owner and Administrator as approval roles, not data-scope bypass', () => {
    assert.equal(isMannyApprover(['HVCG Owner']), true);
    assert.equal(isMannyApprover(['Administrator']), false);
    assert.equal(isMannyApprover(['HVCG Team Member']), false);
  });

  it('labels SYN* client codes as synthetic, not live clients', () => {
    assert.equal(isSyntheticClientCode('SYN01'), true);
    assert.equal(isSyntheticClientCode('ACCG01'), false);
    assert.equal(isSyntheticCapitalRecord({ clientCode: 'SYN01', title: 'Working capital' }), true);
    assert.equal(isSyntheticCapitalRecord({ clientCode: 'ACCG01', title: 'SYNTHETIC QA row' }), true);
    assert.equal(isSyntheticCapitalRecord({ clientCode: 'ACCG01', title: 'Working capital' }), false);
  });
});
