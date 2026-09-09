import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertModuleIngestBackendSafe,
  resolveModuleIngestBackend,
} from '../src/modules/ingest/backend.ts';

describe('module ingest backend mode', () => {
  it('defaults to development-json outside production', () => {
    assert.equal(
      resolveModuleIngestBackend({ NODE_ENV: 'test' }),
      'development-json',
    );
  });

  it('defaults to azure-table in production', () => {
    assert.equal(
      resolveModuleIngestBackend({ NODE_ENV: 'production' }),
      'azure-table',
    );
  });

  it('fail-closes production + development-json', () => {
    assert.throws(
      () =>
        assertModuleIngestBackendSafe('development-json', {
          NODE_ENV: 'production',
        }),
      /not allowed|Unsafe/i,
    );
  });

  it('allows explicit azure-table in production', () => {
    assert.equal(
      resolveModuleIngestBackend({
        NODE_ENV: 'production',
        INTEGRATION_MODULE_INGEST_BACKEND: 'azure-table',
      }),
      'azure-table',
    );
    assert.doesNotThrow(() =>
      assertModuleIngestBackendSafe('azure-table', { NODE_ENV: 'production' }),
    );
  });
});
