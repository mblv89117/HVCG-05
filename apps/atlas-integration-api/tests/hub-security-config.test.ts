import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  UnsafeHubConfigurationError,
  isLoopbackBindHost,
  resolveHubRuntimeSecurity,
} from '../src/config.ts';

describe('Hub bind host classification', () => {
  it('treats 127.0.0.1, ::1, and localhost as loopback', () => {
    assert.equal(isLoopbackBindHost('127.0.0.1'), true);
    assert.equal(isLoopbackBindHost('::1'), true);
    assert.equal(isLoopbackBindHost('[::1]'), true);
    assert.equal(isLoopbackBindHost('localhost'), true);
    assert.equal(isLoopbackBindHost('0.0.0.0'), false);
    assert.equal(isLoopbackBindHost('10.0.0.8'), false);
  });
});

describe('Hub runtime security configuration', () => {
  it('A. development default requires auth and loopback bind', () => {
    const s = resolveHubRuntimeSecurity({ NODE_ENV: 'development' });
    assert.equal(s.host, '127.0.0.1');
    assert.equal(s.requireAuth, true);
    assert.equal(s.insecureDevAuth, false);
  });

  it('B. production default requires auth', () => {
    const s = resolveHubRuntimeSecurity({ NODE_ENV: 'production', INTEGRATION_HOST: '0.0.0.0' });
    assert.equal(s.requireAuth, true);
    assert.equal(s.insecureDevAuth, false);
    assert.equal(s.host, '0.0.0.0');
  });

  it('C. production INTEGRATION_REQUIRE_AUTH=false fails startup', () => {
    assert.throws(
      () =>
        resolveHubRuntimeSecurity({
          NODE_ENV: 'production',
          INTEGRATION_REQUIRE_AUTH: 'false',
        }),
      (err: unknown) =>
        err instanceof UnsafeHubConfigurationError &&
        err.message.includes('INTEGRATION_REQUIRE_AUTH=false') &&
        err.message.includes('NODE_ENV=production'),
    );
  });

  it('D. auth disable without explicit insecure-dev opt-in is rejected', () => {
    assert.throws(
      () =>
        resolveHubRuntimeSecurity({
          NODE_ENV: 'development',
          INTEGRATION_REQUIRE_AUTH: 'false',
        }),
      (err: unknown) =>
        err instanceof UnsafeHubConfigurationError &&
        err.message.includes('INTEGRATION_ALLOW_INSECURE_DEV_AUTH=true'),
    );
  });

  it('E. explicit insecure dev + loopback is permitted', () => {
    const s = resolveHubRuntimeSecurity({
      NODE_ENV: 'development',
      INTEGRATION_ALLOW_INSECURE_DEV_AUTH: 'true',
      INTEGRATION_REQUIRE_AUTH: 'false',
      INTEGRATION_HOST: '127.0.0.1',
    });
    assert.equal(s.requireAuth, false);
    assert.equal(s.insecureDevAuth, true);
    assert.equal(s.host, '127.0.0.1');
  });

  it('F. explicit insecure dev + 0.0.0.0 is rejected', () => {
    assert.throws(
      () =>
        resolveHubRuntimeSecurity({
          NODE_ENV: 'development',
          INTEGRATION_ALLOW_INSECURE_DEV_AUTH: 'true',
          INTEGRATION_HOST: '0.0.0.0',
        }),
      (err: unknown) =>
        err instanceof UnsafeHubConfigurationError && err.message.includes('loopback'),
    );
  });

  it('G. any auth-off + non-loopback is rejected', () => {
    assert.throws(
      () =>
        resolveHubRuntimeSecurity({
          NODE_ENV: 'test',
          INTEGRATION_ALLOW_INSECURE_DEV_AUTH: 'true',
          INTEGRATION_REQUIRE_AUTH: 'false',
          INTEGRATION_HOST: '0.0.0.0',
        }),
      UnsafeHubConfigurationError,
    );
  });

  it('H. auth-on + explicit 0.0.0.0 is allowed', () => {
    const s = resolveHubRuntimeSecurity({
      NODE_ENV: 'development',
      INTEGRATION_HOST: '0.0.0.0',
    });
    assert.equal(s.requireAuth, true);
    assert.equal(s.insecureDevAuth, false);
    assert.equal(s.host, '0.0.0.0');
  });

  it('production cannot enable insecure-dev opt-in', () => {
    assert.throws(
      () =>
        resolveHubRuntimeSecurity({
          NODE_ENV: 'production',
          INTEGRATION_ALLOW_INSECURE_DEV_AUTH: 'true',
        }),
      (err: unknown) =>
        err instanceof UnsafeHubConfigurationError &&
        err.message.includes('INTEGRATION_ALLOW_INSECURE_DEV_AUTH'),
    );
  });
});
