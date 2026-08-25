import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CapitalAccessError,
  accessFailureKind,
  isAuthorizationFailure,
  operatorFacingMessage,
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

  it('treats unauthorized/forbidden/HTTP 401 wording as auth failures even without status', () => {
    for (const msg of ['Unauthorized', 'Forbidden', 'HTTP 401', 'HTTP 403', 'Access denied: client not in principal scope']) {
      const err = new Error(msg);
      assert.equal(isAuthorizationFailure(err), true, msg);
      assert.equal(shouldUseSyntheticFallback(err, 'read-collection', true), false, msg);
    }
  });

  it('does not treat a network-wrapped 401 as an outage fallback', () => {
    const masked = new Error('Failed to fetch: 401 Unauthorized');
    assert.equal(isAuthorizationFailure(masked), true);
    assert.equal(shouldUseSyntheticFallback(masked, 'read-collection', true), false);
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

  it('defaults the sample-fallback flag to off', () => {
    const unreachable = new Error('Failed to fetch');
    assert.equal(shouldUseSyntheticFallback(unreachable, 'read-collection'), false);
    assert.equal(shouldUseSyntheticFallback(httpErr(404), 'read-collection'), false);
    assert.equal(shouldUseSyntheticFallback(httpErr(501), 'read-collection'), false);
  });

  it('allows labeled collection fallback only for undeployed/outage statuses when the flag is on', () => {
    assert.equal(shouldUseSyntheticFallback(httpErr(404), 'read-collection', true), true);
    assert.equal(shouldUseSyntheticFallback(httpErr(501), 'read-collection', true), true);
    assert.equal(shouldUseSyntheticFallback(httpErr(404), 'read-item', true), false);
    assert.equal(shouldUseSyntheticFallback(httpErr(500), 'read-collection', true), false);
    assert.equal(shouldUseSyntheticFallback(httpErr(422), 'read-collection', true), false);
  });

  it('never surfaces stack traces in operator-facing copy', () => {
    const stacked = new Error('boom');
    stacked.stack = 'Error: boom\n    at secret.ts:12:1\n    at node:internal';
    const msg = operatorFacingMessage(stacked, 'Capital data was not loaded.');
    assert.equal(msg.includes('secret.ts'), false);
    assert.equal(msg.includes('at '), false);
    assert.equal(accessFailureKind(httpErr(403)), 'forbidden');
    assert.equal(accessFailureKind(httpErr(401)), 'unauthorized');
    assert.equal(accessFailureKind(new Error('Failed to fetch')), null);
    assert.match(operatorFacingMessage(httpErr(403), 'x'), /Synthetic demonstration data is not shown/);
  });
});
