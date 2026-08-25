import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveBaBusinessDir } from '../src/ba/invokePython.ts';

describe('canonical BA engine resolution', () => {
  it('resolves in-tree config/business without sibling worktrees', () => {
    delete process.env.HVCG_BA_BUSINESS_DIR;
    const dir = resolveBaBusinessDir();
    assert.ok(dir.includes(`${join('config', 'business')}`) || dir.endsWith('config/business'));
    assert.equal(dir.includes('hvcg-business-architecture-v2'), false);
    assert.equal(dir.includes('.worktrees/hvcg-business-architecture-v2'), false);
    assert.ok(existsSync(join(dir, 'ba_bridge.py')));
    assert.ok(existsSync(join(dir, 'free_fit_runtime.py')));
  });

  it('uses HVCG_BA_BUSINESS_DIR only as an explicit override', () => {
    const canonical = resolveBaBusinessDir();
    process.env.HVCG_BA_BUSINESS_DIR = canonical;
    try {
      assert.equal(resolveBaBusinessDir(), canonical);
    } finally {
      delete process.env.HVCG_BA_BUSINESS_DIR;
    }
  });
});
