import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { encryptSecret, decryptSecret, redact } from '../src/crypto/tokenVault.ts';
import { buildVerifiedCashSnapshot } from '../src/finance/mappings.ts';
import { PlaidRepository } from '../src/store/repository.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertClientAccess, parsePrincipal } from '../src/middleware/auth.ts';
import { APPROVED_PLAID_PRODUCTS } from '../../../packages/atlas-plaid-contracts/src/index.ts';

describe('token vault', () => {
  it('round-trips secrets', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const cipher = encryptSecret('access-sandbox-TESTTOKEN', key);
    assert.notEqual(cipher, 'access-sandbox-TESTTOKEN');
    assert.equal(decryptSecret(cipher, key), 'access-sandbox-TESTTOKEN');
  });

  it('redacts sensitive strings', () => {
    assert.match(redact('supersecretvalue'), /len=/);
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

describe('approved products', () => {
  it('matches Atlas-approved set only', () => {
    assert.deepEqual([...APPROVED_PLAID_PRODUCTS].sort(), [
      'auth',
      'balance',
      'identity',
      'liabilities',
      'statements',
      'transactions',
    ].sort());
  });
});

describe('finance mapping', () => {
  it('labels verified bank cash only when accounts exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plaid-test-'));
    const repo = new PlaidRepository(dir);
    const empty = buildVerifiedCashSnapshot(repo, 'c1', 'CCB');
    assert.equal((empty as { provenance: string }).provenance, 'Unavailable');

    const now = new Date().toISOString();
    repo.upsertItem({
      id: 'conn1',
      organizationId: 'org',
      clientId: 'c1',
      clientCode: 'CCB',
      itemId: 'item1',
      accessTokenCiphertext: 'cipher',
      institutionId: 'ins_1',
      institutionName: 'First Platypus Bank',
      status: 'Connected',
      products: [...APPROVED_PLAID_PRODUCTS],
      consentRecordId: 'consent1',
      lastSyncedAt: now,
      syncCursor: null,
      errorCode: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      dataSource: 'Plaid',
    });
    repo.replaceAccounts('conn1', [
      {
        id: 'a1',
        organizationId: 'org',
        clientId: 'c1',
        connectionId: 'conn1',
        itemId: 'item1',
        accountId: 'acct1',
        name: 'Checking',
        type: 'depository',
        subtype: 'checking',
        mask: '0000',
        currentBalance: 1000,
        availableBalance: 900,
        isoCurrencyCode: 'USD',
        status: 'Connected',
        lastSyncedAt: now,
        provenance: 'VerifiedBank',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ]);
    const snap = buildVerifiedCashSnapshot(repo, 'c1', 'CCB');
    assert.equal((snap as { provenance: string }).provenance, 'VerifiedBank');
    assert.equal((snap as { totalCurrentBalance: number }).totalCurrentBalance, 1000);
  });
});
