import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encryptSecret } from '../src/crypto/tokenVault.ts';
import { QboRepository } from '../src/store/repository.ts';
import { toConnectionSummary } from '../src/sync/syncService.ts';
import { withRetry } from '../src/sync/retry.ts';

describe('sync store / checkpoints', () => {
  it('upserts entities without duplicates and retains checkpoints', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qbo-sync-'));
    const repo = new QboRepository(dir);
    const now = new Date().toISOString();
    const key = Buffer.alloc(32, 5).toString('base64');

    repo.upsertConnection({
      id: 'conn1',
      organizationId: 'org',
      clientId: 'c1',
      clientCode: 'CCB',
      realmId: '111',
      companyName: 'Test Co',
      country: 'US',
      accessTokenCiphertext: encryptSecret('a', key),
      refreshTokenCiphertext: encryptSecret('r', key),
      accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      refreshTokenExpiresAt: null,
      status: 'Connected',
      oauthStatus: 'authorized',
      tokenStatus: 'valid',
      syncStatus: 'succeeded',
      consentRecordId: 'c',
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
      consecutiveFailures: 0,
      errorCode: null,
      errorMessage: null,
      syncCheckpoints: { Account: now, Invoice: now },
      syncResume: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dataSource: 'QuickBooks',
      provenance: 'ImportedAccounting',
    });

    const base = {
      organizationId: 'org',
      clientId: 'c1',
      connectionId: 'conn1',
      realmId: '111',
      entityType: 'Account' as const,
      provenance: 'ImportedAccounting' as const,
      source: 'QuickBooks' as const,
      amount: null,
      currency: 'USD',
      txnDate: null,
      displayName: 'Cash',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      payload: { Id: '1', Name: 'Cash' },
    };

    repo.upsertEntities([{ ...base, id: 'e1', externalId: '1' }]);
    repo.upsertEntities([{ ...base, id: 'e2', externalId: '1', payload: { Id: '1', Name: 'Cash Updated' } }]);
    assert.equal(repo.countEntities('conn1', 'Account'), 1);
    const rows = repo.listEntitiesForClient('c1', 'Account');
    assert.equal(rows[0].payload.Name, 'Cash Updated');

    const summary = toConnectionSummary(repo, repo.getConnection('conn1')!);
    assert.equal(summary.provenance, 'ImportedAccounting');
    assert.equal(summary.source, 'QuickBooks');
    assert.equal(summary.company.companyName, 'Test Co');
    assert.ok(summary.entitySummaries.some((e) => e.entity === 'Account' && e.recordCount === 1));
  });

  it('preserves resume pointer for interrupted syncs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qbo-resume-'));
    const repo = new QboRepository(dir);
    const now = new Date().toISOString();
    const key = Buffer.alloc(32, 5).toString('base64');
    repo.upsertConnection({
      id: 'conn2',
      organizationId: 'org',
      clientId: 'c1',
      clientCode: 'CCB',
      realmId: '222',
      companyName: 'Resume Co',
      country: 'US',
      accessTokenCiphertext: encryptSecret('a', key),
      refreshTokenCiphertext: encryptSecret('r', key),
      accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      refreshTokenExpiresAt: null,
      status: 'Error',
      oauthStatus: 'authorized',
      tokenStatus: 'valid',
      syncStatus: 'interrupted',
      consentRecordId: 'c',
      lastSyncedAt: null,
      lastSuccessfulSyncAt: null,
      consecutiveFailures: 1,
      errorCode: 'SYNC_ERROR',
      errorMessage: 'Synchronization failed — may resume from checkpoint',
      syncCheckpoints: { Account: now },
      syncResume: {
        runId: 'run-1',
        nextEntityIndex: 3,
        entities: ['Account', 'Customer', 'Vendor', 'Invoice'],
        startedAt: now,
      },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dataSource: 'QuickBooks',
      provenance: 'ImportedAccounting',
    });
    const conn = repo.getConnection('conn2');
    assert.ok(conn?.syncResume);
    assert.equal(conn!.syncResume!.nextEntityIndex, 3);
    assert.equal(conn!.syncStatus, 'interrupted');
  });
});

describe('retry', () => {
  it('retries transient failures then succeeds', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          const err = new Error('qbo_api_503:unavailable');
          (err as Error & { status: number }).status = 503;
          throw err;
        }
        return 'ok';
      },
      { maxAttempts: 4, baseDelayMs: 1, maxDelayMs: 5 },
    );
    assert.equal(result, 'ok');
    assert.equal(attempts, 3);
  });

  it('does not retry non-retryable errors', async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        withRetry(
          async () => {
            attempts += 1;
            const err = new Error('qbo_api_400:bad');
            (err as Error & { status: number }).status = 400;
            throw err;
          },
          { maxAttempts: 4, baseDelayMs: 1 },
        ),
      /qbo_api_400/,
    );
    assert.equal(attempts, 1);
  });
});
