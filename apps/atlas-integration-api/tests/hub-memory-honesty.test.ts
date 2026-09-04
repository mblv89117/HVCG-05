import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { institutionalMemoryHonesty } from '../src/memory/honesty.ts';
import { GLOBAL_AUTO_RESPOND } from '@hvcg/atlas-integration-contracts';

describe('Wave 4–8 memory honesty and autonomy defaults', () => {
  it('never invents history and marks contacts missing by default', () => {
    const h = institutionalMemoryHonesty();
    assert.equal(h.inventHistory, false);
    assert.equal(h.continuousIngest, 'ON');
    const contacts = h.facets.find((f) => f.facet === 'contacts');
    assert.equal(contacts?.status, 'MISSING');
  });

  it('keeps GLOBAL_AUTO_RESPOND false', () => {
    assert.equal(GLOBAL_AUTO_RESPOND, false);
  });
});
