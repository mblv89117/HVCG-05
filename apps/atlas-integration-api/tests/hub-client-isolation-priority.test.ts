import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getIdentityRegistry, resetIdentityRegistry } from '../src/identity/registry.ts';

const PRIORITY = ['ACCG01', 'CCB01', 'CPL01', 'HFD01', 'KAVA01', 'LIEN01', 'PDG01'] as const;

describe('Wave 10 priority ClientCode isolation fabric', () => {
  it('every priority ClientCode is registered and distinct', () => {
    resetIdentityRegistry();
    const reg = getIdentityRegistry();
    const codes = new Set(reg.list().map((m) => m.clientCode));
    for (const code of PRIORITY) {
      assert.ok(codes.has(code), `missing ${code}`);
      assert.ok(reg.getByClientCode(code), `unmapped ${code}`);
    }
  });

  it('cross-client dual-resolve is rejected', () => {
    resetIdentityRegistry();
    const reg = getIdentityRegistry();
    const r = reg.dualResolve({
      clientCode: 'HFD01',
      system: 'gcc',
      localId: 'org-syn01',
    });
    assert.equal(r.ok, false);
  });

  it('unknown ClientCode never default-routes', () => {
    resetIdentityRegistry();
    const r = getIdentityRegistry().dualResolve({ clientCode: 'FAKE01' });
    assert.equal(r.ok, false);
  });
});
