import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canAccessClient, entitledClientCodes, isCanonicalClientCode } from './clientCode.ts';

describe('Elite client isolation', () => {
  it('accepts canonical ClientCodes and rejects wildcard, UUID, and aliases', () => {
    assert.equal(isCanonicalClientCode('SYN01'), true);
    assert.equal(isCanonicalClientCode('LIEN01'), true);
    assert.equal(isCanonicalClientCode('PDG01'), true);
    assert.equal(isCanonicalClientCode('*'), false);
    assert.equal(isCanonicalClientCode(''), false);
    assert.equal(isCanonicalClientCode('syn01'), false);
    assert.equal(isCanonicalClientCode('client-a'), false);
    assert.equal(isCanonicalClientCode('11111111-1111-1111-1111-111111111111'), false);
    assert.equal(isCanonicalClientCode(null), false);
  });

  it('does not treat wildcard principal scope as every-client access', () => {
    assert.deepEqual(entitledClientCodes(['*']), []);
    assert.deepEqual(entitledClientCodes(['*', 'SYN01', 'bad', 'lien01']), ['SYN01']);
    assert.equal(canAccessClient(['*'], 'SYN01'), false);
    assert.equal(canAccessClient(['*'], '*'), false);
    assert.equal(canAccessClient([], 'SYN01'), false);
  });

  it('isolates clients: entitled code only, never a sibling client', () => {
    assert.equal(canAccessClient(['SYN01'], 'SYN01'), true);
    assert.equal(canAccessClient(['SYN01'], 'OTH01'), false);
    assert.equal(canAccessClient(['SYN01', 'LIEN01'], 'LIEN01'), true);
    assert.equal(canAccessClient(['SYN01'], '*'), false);
  });
});
