import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getIdentityRegistry,
  resetIdentityRegistry,
  resolveClientCode,
  resolveClient360IdToClientCode,
} from '../src/identity/registry.ts';
import {
  resolveClient360ClientCode,
  assertClient360Mapped,
  Client360UnmappedError,
} from '../src/client360/access.ts';

describe('Hub identity fabric', () => {
  beforeEach(() => {
    resetIdentityRegistry();
  });

  it('fail-closes unknown ClientCode (no default routing)', () => {
    const r = resolveClientCode({ clientCode: 'NOPE01' });
    assert.equal(r.ok, false);
  });

  it('dual-resolves Hart 360 slug to HFD01', () => {
    const r = resolveClientCode({
      system: 'growth_360',
      localId: 'slug:hart-family-dental',
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.result.clientCode, 'HFD01');
  });

  it('Client360 unmapped UUID remains fail-closed (CLIENT_A)', () => {
    assert.equal(resolveClient360ClientCode('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001'), null);
    assert.throws(
      () => assertClient360Mapped('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa0001'),
      Client360UnmappedError,
    );
  });

  it('Client360 mapped fixture dual-resolves', () => {
    assert.equal(
      resolveClient360IdToClientCode('cccccccc-cccc-cccc-cccc-cccccccc0003'),
      'T360A',
    );
    assert.equal(resolveClient360ClientCode('cccccccc-cccc-cccc-cccc-cccccccc0003'), 'T360A');
    assert.equal(assertClient360Mapped('cccccccc-cccc-cccc-cccc-cccccccc0003'), 'T360A');
  });

  it('rejects cross-module injection', () => {
    const r = resolveClientCode({
      clientCode: 'HFD01',
      system: 'copilot_mri',
      localId: 'org-meridian',
    });
    assert.equal(r.ok, false);
  });

  it('lists production ClientCodes from registry', () => {
    const codes = getIdentityRegistry().list().map((m) => m.clientCode);
    for (const c of ['ACCG01', 'HFD01', 'KAVA01', 'PDG01', 'CPL01']) {
      assert.ok(codes.includes(c), c);
    }
  });
});
