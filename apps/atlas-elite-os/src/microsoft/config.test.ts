import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ELITE_SPA_CLIENT_ID, resolveEntraClientId } from './config.ts';

describe('resolveEntraClientId', () => {
  it('defaults to the existing public Elite SPA app when VITE_ENTRA_CLIENT_ID is empty', () => {
    assert.equal(resolveEntraClientId(''), ELITE_SPA_CLIENT_ID);
    assert.equal(resolveEntraClientId('   '), ELITE_SPA_CLIENT_ID);
    assert.equal(resolveEntraClientId(undefined), ELITE_SPA_CLIENT_ID);
    assert.equal(resolveEntraClientId(null), ELITE_SPA_CLIENT_ID);
    assert.equal(ELITE_SPA_CLIENT_ID, '49d20328-fe3c-40ec-9d0e-99f57e4646e4');
  });

  it('keeps an explicit existing client id', () => {
    assert.equal(resolveEntraClientId('49d20328-fe3c-40ec-9d0e-99f57e4646e4'), ELITE_SPA_CLIENT_ID);
  });
});
