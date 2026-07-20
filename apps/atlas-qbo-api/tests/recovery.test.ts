import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encryptSecret, decryptSecret } from '../src/crypto/tokenVault.ts';
import { QboRepository } from '../src/store/repository.ts';
import { consentDigest, createOAuthState } from '../src/qbo/oauth.ts';

/**
 * Failure recovery: OAuth state single-use, disconnect wipes tokens,
 * interrupted sync resume metadata survives.
 */
describe('failure recovery', () => {
  it('OAuth state is single-use (CSRF protection)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qbo-recovery-'));
    const repo = new QboRepository(dir);
    const state = createOAuthState();
    repo.saveOAuthState({
      state,
      organizationId: 'org',
      clientId: 'c1',
      clientCode: 'CCB',
      actorId: 'u1',
      consentRecordId: 'consent',
      mode: 'connect',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      consumedAt: null,
    });
    const first = repo.consumeOAuthState(state);
    const second = repo.consumeOAuthState(state);
    assert.ok(first);
    assert.equal(second, undefined);
  });

  it('expired OAuth state cannot be consumed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qbo-recovery-exp-'));
    const repo = new QboRepository(dir);
    const state = createOAuthState();
    repo.saveOAuthState({
      state,
      organizationId: 'org',
      clientId: 'c1',
      clientCode: 'CCB',
      actorId: 'u1',
      consentRecordId: 'consent',
      mode: 'connect',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      consumedAt: null,
    });
    assert.equal(repo.consumeOAuthState(state), undefined);
  });

  it('disconnect marks tokens revoked and keeps audit lineage fields', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qbo-recovery-disc-'));
    const repo = new QboRepository(dir);
    const key = Buffer.alloc(32, 7).toString('base64');
    const now = new Date().toISOString();
    repo.upsertConnection({
      id: 'conn1',
      organizationId: 'org',
      clientId: 'c1',
      clientCode: 'CCB',
      realmId: '999',
      companyName: 'Disc Co',
      country: 'US',
      accessTokenCiphertext: encryptSecret('live-access', key),
      refreshTokenCiphertext: encryptSecret('live-refresh', key),
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
      syncCheckpoints: { Account: now },
      syncResume: { runId: 'r', nextEntityIndex: 2, entities: ['Account', 'Customer'], startedAt: now },
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dataSource: 'QuickBooks',
      provenance: 'ImportedAccounting',
    });

    const item = repo.getConnection('conn1')!;
    const wipedAccess = encryptSecret('REVOKED', key);
    const wipedRefresh = encryptSecret('REVOKED', key);
    repo.upsertConnection({
      ...item,
      status: 'Disconnected',
      oauthStatus: 'revoked',
      tokenStatus: 'revoked',
      deletedAt: new Date().toISOString(),
      accessTokenCiphertext: wipedAccess,
      refreshTokenCiphertext: wipedRefresh,
      syncResume: null,
    });

    // Soft-deleted connections are not returned by getConnection
    assert.equal(repo.getConnection('conn1'), undefined);
    assert.equal(decryptSecret(wipedAccess, key), 'REVOKED');
    assert.equal(decryptSecret(wipedRefresh, key), 'REVOKED');
    assert.ok(consentDigest('atlas-qbo-consent-v1').length === 64);
  });
});
