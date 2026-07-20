import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { encryptSecret } from '../src/crypto/tokenVault.ts';

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('no port');
  return `http://127.0.0.1:${addr.port}`;
}

describe('integration: connections + tenant + snapshot', () => {
  let baseUrl = '';
  let server: Server;
  let repo: import('../src/store/repository.ts').QboRepository;
  const key = Buffer.alloc(32, 11).toString('base64');

  before(async () => {
    const dataDir = mkdtempSync(join(tmpdir(), 'qbo-int-'));
    process.env.QBO_API_DISABLE_AUTOSTART = '1';
    process.env.QBO_DATA_DIR = dataDir;
    process.env.QBO_REQUIRE_AUTH = 'true';
    process.env.QBO_CLIENT_ID = 'int-client';
    process.env.QBO_CLIENT_SECRET = 'int-secret';
    process.env.QBO_TOKEN_ENCRYPTION_KEY = key;
    process.env.QBO_ALLOWED_ORIGINS = 'http://127.0.0.1:5180';

    const { createQboServer } = await import('../src/index.ts');
    const started = createQboServer({ enableScheduler: false, listen: false });
    server = started.server;
    repo = started.repo;
    baseUrl = await listen(server);

    const now = new Date().toISOString();
    repo.upsertConnection({
      id: 'conn-a',
      organizationId: 'org-hvcg',
      clientId: 'ws-ccb',
      clientCode: 'CCB',
      realmId: '555',
      companyName: 'CCB Books',
      country: 'US',
      accessTokenCiphertext: encryptSecret('a', key),
      refreshTokenCiphertext: encryptSecret('r', key),
      accessTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
      refreshTokenExpiresAt: null,
      status: 'Connected',
      oauthStatus: 'authorized',
      tokenStatus: 'valid',
      syncStatus: 'succeeded',
      consentRecordId: 'c1',
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
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('lists connections for allowed client without exposing tokens', async () => {
    const res = await fetch(`${baseUrl}/api/qbo/connections?clientId=ws-ccb`, {
      headers: {
        'x-atlas-user-id': 'u1',
        'x-atlas-organization-id': 'org-hvcg',
        'x-atlas-client-ids': 'ws-ccb,ws-hvcg',
        'x-atlas-roles': 'Admin',
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as {
      connections: Array<Record<string, unknown>>;
      qboConfigured: boolean;
    };
    assert.equal(body.qboConfigured, true);
    assert.equal(body.connections.length, 1);
    const raw = JSON.stringify(body);
    assert.doesNotMatch(raw, /accessToken/i);
    assert.doesNotMatch(raw, /refreshToken/i);
    assert.doesNotMatch(raw, /Ciphertext/);
    assert.equal(body.connections[0].source, 'QuickBooks');
    assert.equal(body.connections[0].provenance, 'ImportedAccounting');
  });

  it('denies foreign client', async () => {
    const res = await fetch(`${baseUrl}/api/qbo/connections?clientId=ws-ccb`, {
      headers: {
        'x-atlas-user-id': 'u2',
        'x-atlas-organization-id': 'org-hvcg',
        'x-atlas-client-ids': 'ws-other',
        'x-atlas-roles': 'Staff',
      },
    });
    assert.equal(res.status, 403);
  });

  it('accounting snapshot uses ImportedAccounting lineage', async () => {
    const res = await fetch(`${baseUrl}/api/qbo/accounting-snapshot?clientId=ws-ccb&clientCode=CCB`, {
      headers: {
        'x-atlas-user-id': 'u1',
        'x-atlas-organization-id': 'org-hvcg',
        'x-atlas-client-ids': 'ws-ccb',
      },
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { provenance: string; source: string };
    assert.equal(body.provenance, 'ImportedAccounting');
    assert.equal(body.source, 'QuickBooks');
  });
});
