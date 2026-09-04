import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ClientIdentityRegistry,
  DEFAULT_IDENTITY_SEED,
  isCanonicalClientCode,
} from '../src/index.ts';

describe('ClientIdentityRegistry', () => {
  const registry = new ClientIdentityRegistry(DEFAULT_IDENTITY_SEED);

  it('validates canonical ClientCode shape', () => {
    assert.equal(isCanonicalClientCode('HFD01'), true);
    assert.equal(isCanonicalClientCode('hfd01'), false);
    assert.equal(isCanonicalClientCode('*'), false);
  });

  it('fail-closes unknown ClientCode', () => {
    const r = registry.dualResolve({ clientCode: 'ZZZZ99' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, 'UNKNOWN_CLIENT_CODE');
  });

  it('fail-closes malformed ClientCode', () => {
    const r = registry.dualResolve({ clientCode: 'bad' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, 'MALFORMED_CLIENT_CODE');
  });

  it('dual-resolves GCC fixture local id', () => {
    const r = registry.dualResolve({ system: 'gcc', localId: 'org-syn01' });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.result.clientCode, 'SYN01');
      assert.equal(r.result.mapping.gccOrganizationId, 'org-syn01');
    }
  });

  it('dual-resolves 360 slug for Hart', () => {
    const r = registry.dualResolve({
      system: 'growth_360',
      localId: 'slug:hart-family-dental',
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.result.clientCode, 'HFD01');
  });

  it('rejects cross-tenant injection', () => {
    const r = registry.dualResolve({
      clientCode: 'HFD01',
      system: 'gcc',
      localId: 'org-syn01',
    });
    assert.equal(r.ok, false);
  });

  it('resolves trusted Client360 UUID only when mapped', () => {
    const hit = registry.resolveFromLocal(
      'client360',
      'cccccccc-cccc-cccc-cccc-cccccccc0003',
    );
    assert.equal(hit.ok, true);
    if (hit.ok) assert.equal(hit.result.clientCode, 'T360A');
    const miss = registry.resolveFromLocal(
      'client360',
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001',
    );
    assert.equal(miss.ok, false);
  });

  it('lists production codes', () => {
    const codes = registry.list().map((m) => m.clientCode);
    for (const c of ['ACCG01', 'HFD01', 'KAVA01', 'PDG01', 'CPL01', 'CCB01', 'LIEN01']) {
      assert.ok(codes.includes(c), c);
    }
  });
});
