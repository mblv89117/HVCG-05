import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CapitalAccessError,
  isAuthorizationFailure,
  shouldUseSyntheticFallback,
  toCapitalAccessError,
} from './capitalAccess.ts';

function httpErr(status: number, message = `HTTP ${status}`): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

describe('Elite capital 401/403 fail closed', () => {
  it('never substitutes sample data on 401 or 403 even when sample fallback is on', () => {
    for (const status of [401, 403]) {
      const err = httpErr(status);
      assert.equal(isAuthorizationFailure(err), true);
      assert.equal(shouldUseSyntheticFallback(err, 'read-collection', true), false);
      assert.equal(shouldUseSyntheticFallback(err, 'read-item', true), false);
      assert.equal(shouldUseSyntheticFallback(err, 'mutate', true), false);
      const access = toCapitalAccessError(err);
      assert.ok(access instanceof CapitalAccessError);
      assert.equal(access.status, status);
      assert.match(access.message, /Synthetic demonstration data is not shown/);
    }
  });

  it('treats missing/expired Microsoft tokens as auth failures', () => {
    assert.equal(isAuthorizationFailure(new Error('Microsoft sign-in required (Bearer token missing)')), true);
    assert.equal(isAuthorizationFailure(new Error('Invalid or expired Microsoft token')), true);
    assert.equal(shouldUseSyntheticFallback(new Error('Bearer token missing'), 'read-collection', true), false);
  });

  it('mutations never fall back; collection fallback is only for outage when explicitly allowed', () => {
    const unreachable = new Error('Failed to fetch');
    assert.equal(shouldUseSyntheticFallback(unreachable, 'mutate', true), false);
    assert.equal(shouldUseSyntheticFallback(unreachable, 'read-item', true), false);
    assert.equal(shouldUseSyntheticFallback(unreachable, 'read-collection', true), true);
    assert.equal(shouldUseSyntheticFallback(unreachable, 'read-collection', false), false);
    assert.equal(shouldUseSyntheticFallback(httpErr(503), 'read-collection', true), true);
    assert.equal(shouldUseSyntheticFallback(httpErr(503), 'read-collection', false), false);
  });
});
