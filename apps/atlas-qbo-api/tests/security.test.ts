import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encryptSecret, decryptSecret, redact, redactRealmId } from '../src/crypto/tokenVault.ts';
import { assertClientAccess, parsePrincipal } from '../src/middleware/auth.ts';
import { buildImportedAccountingSnapshot } from '../src/finance/mappings.ts';
import { QboRepository } from '../src/store/repository.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  QBO_ACCOUNTING_SCOPE,
  QBO_SYNC_ENTITIES,
} from '../../../packages/atlas-qbo-contracts/src/index.ts';
import { computeTokenStatus, buildAuthorizeUrl, createOAuthState } from '../src/qbo/oauth.ts';
import type { AppConfig } from '../src/config.ts';

describe('token vault', () => {
  it('round-trips access and refresh tokens', () => {
    const key = Buffer.alloc(32, 9).toString('base64');
    const access = encryptSecret('qbo-access-TEST', key);
    const refresh = encryptSecret('qbo-refresh-TEST', key);
    assert.notEqual(access, 'qbo-access-TEST');
    assert.equal(decryptSecret(access, key), 'qbo-access-TEST');
    assert.equal(decryptSecret(refresh, key), 'qbo-refresh-TEST');
  });

  it('redacts secrets and realm ids', () => {
    assert.match(redact('supersecretvalue'), /len=/);
    assert.equal(redactRealmId('1234567890'), '…7890');
  });
});

describe('tenant isolation', () => {
  it('parses principal and denies foreign client', () => {
    const h = new Headers({
      'x-atlas-user-id': 'u1',
      'x-atlas-organization-id': 'org-hvcg',
      'x-atlas-client-ids': 'client-a,client-b',
    });
    const p = parsePrincipal(h);
    assert.ok(p);
    assert.doesNotThrow(() => assertClientAccess(p!, 'client-a'));
    assert.throws(() => assertClientAccess(p!, 'client-z'));
  });
});

describe('contracts', () => {
  it('uses Intuit accounting scope and Phase 1 entity set', () => {
    assert.equal(QBO_ACCOUNTING_SCOPE, 'com.intuit.quickbooks.accounting');
    assert.ok(QBO_SYNC_ENTITIES.includes('Account'));
    assert.ok(QBO_SYNC_ENTITIES.includes('GeneralLedger'));
    assert.ok(QBO_SYNC_ENTITIES.includes('ProfitAndLoss'));
  });
});

describe('finance mapping', () => {
  it('labels imported accounting only — never VerifiedBank', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qbo-test-'));
    const repo = new QboRepository(dir);
    const empty = buildImportedAccountingSnapshot(repo, 'c1', 'CCB');
    assert.equal((empty as { provenance: string }).provenance, 'Unavailable');

    const now = new Date().toISOString();
    const key = Buffer.alloc(32, 1).toString('base64');
    repo.upsertConnection({
      id: 'conn1',
      organizationId: 'org',
      clientId: 'c1',
      clientCode: 'CCB',
      realmId: '9341452710',
      companyName: 'Sandbox Company',
      country: 'US',
      accessTokenCiphertext: encryptSecret('a', key),
      refreshTokenCiphertext: encryptSecret('r', key),
      accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      refreshTokenExpiresAt: null,
      status: 'Connected',
      oauthStatus: 'authorized',
      tokenStatus: 'valid',
      syncStatus: 'succeeded',
      consentRecordId: 'consent1',
      lastSyncedAt: now,
      lastSuccessfulSyncAt: now,
      consecutiveFailures: 0,
      errorCode: null,
      errorMessage: null,
      syncCheckpoints: {},
      syncResume: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dataSource: 'QuickBooks',
      provenance: 'ImportedAccounting',
    });
    repo.upsertEntities([
      {
        id: 'e1',
        organizationId: 'org',
        clientId: 'c1',
        connectionId: 'conn1',
        realmId: '9341452710',
        entityType: 'Account',
        externalId: '1',
        payload: { Id: '1', Name: 'Checking', AccountType: 'Bank' },
        amount: null,
        currency: 'USD',
        txnDate: null,
        displayName: 'Checking',
        provenance: 'ImportedAccounting',
        source: 'QuickBooks',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      {
        id: 'e2',
        organizationId: 'org',
        clientId: 'c1',
        connectionId: 'conn1',
        realmId: '9341452710',
        entityType: 'Invoice',
        externalId: '99',
        payload: { Id: '99', Balance: 250 },
        amount: 250,
        currency: 'USD',
        txnDate: '2026-07-01',
        displayName: '99',
        provenance: 'ImportedAccounting',
        source: 'QuickBooks',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ]);
    const snap = buildImportedAccountingSnapshot(repo, 'c1', 'CCB');
    assert.equal((snap as { provenance: string }).provenance, 'ImportedAccounting');
    assert.equal((snap as { source: string }).source, 'QuickBooks');
    assert.equal((snap as { accountCount: number }).accountCount, 1);
    assert.equal((snap as { invoiceOpenTotal: number }).invoiceOpenTotal, 250);
    assert.notEqual((snap as { provenance: string }).provenance, 'VerifiedBank');
  });
});

describe('oauth helpers', () => {
  it('builds authorize URL without embedding client secret', () => {
    const cfg = {
      clientId: 'cid-test',
      redirectUri: 'http://127.0.0.1:8788/api/qbo/oauth/callback',
      authorizeBaseUrl: 'https://appcenter.intuit.com/connect/oauth2',
    } as AppConfig;
    const state = createOAuthState();
    const url = buildAuthorizeUrl(cfg, state);
    assert.match(url, /client_id=cid-test/);
    assert.match(url, new RegExp(`state=${state}`));
    assert.doesNotMatch(url, /client_secret/i);
  });

  it('computes token status transitions', () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    const past = new Date(Date.now() - 60_000).toISOString();
    const soon = new Date(Date.now() + 60_000).toISOString();
    assert.equal(computeTokenStatus(future, null), 'valid');
    assert.equal(computeTokenStatus(soon, null), 'expiring_soon');
    assert.equal(computeTokenStatus(past, null), 'refresh_required');
    assert.equal(computeTokenStatus(future, past), 'revoked');
  });
});
