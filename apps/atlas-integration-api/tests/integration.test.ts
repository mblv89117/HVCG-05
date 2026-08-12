import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  PermissionDeniedError,
  UnsupportedOperationError,
  sourceDedupeKey,
  inferBusinessEntity,
} from '@hvcg/atlas-integration-core';
import { loadConfig } from '../src/config.ts';
import { buildRegistry } from '../src/connectors/registry.ts';
import { createMicrosoftAdapter } from '../src/connectors/microsoft/adapter.ts';
import { IntegrationRepository } from '../src/store/repository.ts';

process.env.INTEGRATION_ALLOW_EPHEMERAL_KEY = '1';
process.env.INTEGRATION_HOST = '127.0.0.1';
process.env.INTEGRATION_ALLOW_INSECURE_DEV_AUTH = 'true';
process.env.INTEGRATION_REQUIRE_AUTH = 'false';

describe('integration-api registry', () => {
  it('lists microsoft, google, and github providers', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-int-reg-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const app = buildRegistry(cfg, repo);
    const providers = app.registry.list().map((p) => p.providerId);
    assert.ok(providers.includes('microsoft'));
    assert.ok(providers.includes('google'));
    assert.ok(providers.includes('github'));
    assert.equal(providers.length, 3);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('source record dedupe', () => {
  it('prevents duplicate import by dedupe key', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-int-dedupe-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const now = new Date().toISOString();
    const base = {
      kind: 'Email' as const,
      title: 'Test',
      fields: {},
      provenance: {
        provider: 'microsoft' as const,
        sourceSystem: 'outlook',
        sourceAccount: 'conn-1',
        sourceRecordId: 'msg-abc',
        importedAt: now,
        lastSynchronizedAt: now,
        atlasRecordId: 'atlas-1',
        confidenceLevel: 1,
        permissionClassification: 'read_only_discovery' as const,
      },
    };
    const first = repo.upsertSourceRecord({ ...base, id: 'rec-1' });
    const second = repo.upsertSourceRecord({ ...base, id: 'rec-2', title: 'Updated' });
    assert.equal(first, 'imported');
    assert.equal(second, 'duplicate');
    assert.equal(
      sourceDedupeKey('microsoft', 'conn-1', 'msg-abc'),
      'microsoft::conn-1::msg-abc',
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('read-only permission mode', () => {
  it('blocks createRecord on github adapter in read_only_discovery', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-int-ro-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const app = buildRegistry(cfg, repo);
    const github = app.adapters.get('github')!;
    const connectionId = crypto.randomUUID();
    repo.upsertConnection({
      id: connectionId,
      providerId: 'github',
      providerName: 'GitHub',
      businessEntity: 'HVCG',
      accountName: 'test',
      mailboxType: 'n/a',
      ownerUserId: 'dev-user',
      authType: 'github_app',
      permissionMode: 'read_only_discovery',
      scopes: [],
      status: 'Connected',
      environment: 'local',
      connectedAt: new Date().toISOString(),
      requiresReauthorization: false,
      autoSyncEnabled: true,
      recordsDiscovered: 0,
      recordsImported: 0,
      resourceSelections: [],
      encryptedCredentialsRef: connectionId,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await assert.rejects(
      () =>
        github.createRecord({
          connectionId,
          resourceType: 'issue',
          payload: { title: 'x', repoFullName: 'org/repo' },
        }),
      (err: unknown) => err instanceof PermissionDeniedError,
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('oauth state roundtrip', () => {
  it('saves and consumes oauth state', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-int-oauth-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const stateId = crypto.randomUUID();
    repo.saveOAuthState({
      id: stateId,
      providerId: 'microsoft',
      ownerUserId: 'dev-user',
      permissionMode: 'read_only_discovery',
      redirectUri: 'http://127.0.0.1:8790/api/oauth/microsoft/callback',
      scopes: ['User.Read'],
      pendingConnectionId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const found = repo.getOAuthState(stateId);
    assert.ok(found);
    assert.equal(found.id, stateId);
    const consumed = repo.consumeOAuthState(stateId);
    assert.ok(consumed);
    assert.equal(repo.getOAuthState(stateId), undefined);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('microsoft adapter unsupported send', () => {
  it('rejects createRecord with UnsupportedOperationError', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-int-ms-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const adapter = createMicrosoftAdapter({ config: cfg, repo });
    const connectionId = crypto.randomUUID();
    repo.upsertConnection({
      id: connectionId,
      providerId: 'microsoft',
      providerName: 'Microsoft 365',
      businessEntity: 'HVCG',
      accountName: 'test',
      mailboxType: 'user',
      ownerUserId: 'dev-user',
      authType: 'oauth2_delegated',
      permissionMode: 'workflow_execution',
      scopes: [],
      status: 'Connected',
      environment: 'local',
      connectedAt: new Date().toISOString(),
      requiresReauthorization: false,
      autoSyncEnabled: true,
      recordsDiscovered: 0,
      recordsImported: 0,
      resourceSelections: [],
      encryptedCredentialsRef: connectionId,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await assert.rejects(
      () =>
        adapter.createRecord({
          connectionId,
          resourceType: 'mail',
          payload: { action: 'send', subject: 'hello' },
        }),
      (err: unknown) => {
        assert.ok(err instanceof UnsupportedOperationError);
        assert.equal(err.action, 'createRecord');
        return true;
      },
    );
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('multi-account microsoft connections', () => {
  it('allows two microsoft connection records with different ids and credential slots', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-int-multi-ms-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const now = new Date().toISOString();
    const idA = crypto.randomUUID();
    const idB = crypto.randomUUID();

    repo.upsertConnection({
      id: idA,
      providerId: 'microsoft',
      providerName: 'Microsoft 365',
      businessEntity: 'HVCG',
      accountName: 'Manuel Barela',
      accountEmail: 'manuel@highvaluecapitalgroup.com',
      tenantOrOrg: 'highvaluecapitalgroup.com',
      mailboxType: 'user',
      ownerUserId: 'dev-user',
      authType: 'oauth2_delegated',
      permissionMode: 'read_only_discovery',
      scopes: ['User.Read', 'Mail.Read'],
      status: 'Connected',
      environment: 'local',
      connectedAt: now,
      requiresReauthorization: false,
      autoSyncEnabled: true,
      recordsDiscovered: 0,
      recordsImported: 0,
      resourceSelections: [],
      encryptedCredentialsRef: idA,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
    repo.upsertConnection({
      id: idB,
      providerId: 'microsoft',
      providerName: 'Microsoft 365',
      businessEntity: 'HVS',
      accountName: 'HVS Primary',
      accountEmail: 'ops@highvaluesolution.example',
      tenantOrOrg: 'highvaluesolution.example',
      mailboxType: 'user',
      ownerUserId: 'dev-user',
      authType: 'oauth2_delegated',
      permissionMode: 'read_only_discovery',
      scopes: ['User.Read', 'Mail.Read'],
      status: 'Connected',
      environment: 'local',
      connectedAt: now,
      requiresReauthorization: false,
      autoSyncEnabled: true,
      recordsDiscovered: 0,
      recordsImported: 0,
      resourceSelections: [],
      encryptedCredentialsRef: idB,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    repo.saveCredentials(idA, {
      accessToken: 'token-a',
      refreshToken: 'refresh-a',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    repo.saveCredentials(idB, {
      accessToken: 'token-b',
      refreshToken: 'refresh-b',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const microsoft = repo.listConnections({ providerId: 'microsoft' });
    assert.equal(microsoft.length, 2);
    assert.notEqual(microsoft[0].id, microsoft[1].id);
    assert.notEqual(
      microsoft[0].encryptedCredentialsRef,
      microsoft[1].encryptedCredentialsRef,
    );
    assert.equal(repo.getCredentials(idA)?.accessToken, 'token-a');
    assert.equal(repo.getCredentials(idB)?.accessToken, 'token-b');
    repo.saveCredentials(idA, {
      accessToken: 'token-a-updated',
      refreshToken: 'refresh-a',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    assert.equal(repo.getCredentials(idB)?.accessToken, 'token-b');

    rmSync(dir, { recursive: true, force: true });
  });

  it('listConnections does not collapse by provider; inferBusinessEntity distinguishes entities', () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-int-multi-list-'));
    const cfg = loadConfig();
    const repo = new IntegrationRepository(dir, cfg.tokenEncryptionKeyB64);
    const now = new Date().toISOString();

    repo.upsertConnection({
      id: crypto.randomUUID(),
      providerId: 'microsoft',
      providerName: 'Microsoft 365',
      businessEntity: 'HVCG',
      accountName: 'HVCG User',
      accountEmail: 'user@highvaluecapitalgroup.com',
      ownerUserId: 'dev-user',
      authType: 'oauth2_delegated',
      permissionMode: 'read_only_discovery',
      scopes: [],
      status: 'Connected',
      environment: 'local',
      connectedAt: now,
      requiresReauthorization: false,
      autoSyncEnabled: true,
      recordsDiscovered: 0,
      recordsImported: 0,
      resourceSelections: [],
      encryptedCredentialsRef: crypto.randomUUID(),
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
    repo.upsertConnection({
      id: crypto.randomUUID(),
      providerId: 'microsoft',
      providerName: 'Microsoft 365',
      businessEntity: 'HVS',
      accountName: 'HVS User',
      accountEmail: 'user@hvsllc.example',
      ownerUserId: 'dev-user',
      authType: 'oauth2_delegated',
      permissionMode: 'read_only_discovery',
      scopes: [],
      status: 'Connected',
      environment: 'local',
      connectedAt: now,
      requiresReauthorization: false,
      autoSyncEnabled: true,
      recordsDiscovered: 0,
      recordsImported: 0,
      resourceSelections: [],
      encryptedCredentialsRef: crypto.randomUUID(),
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });
    repo.upsertConnection({
      id: crypto.randomUUID(),
      providerId: 'google',
      providerName: 'Google Workspace',
      businessEntity: 'HVS',
      accountName: 'Google HVS',
      accountEmail: 'ops@gmail.com',
      ownerUserId: 'dev-user',
      authType: 'oauth2_delegated',
      permissionMode: 'read_only_discovery',
      scopes: [],
      status: 'Connected',
      environment: 'local',
      connectedAt: now,
      requiresReauthorization: false,
      autoSyncEnabled: true,
      recordsDiscovered: 0,
      recordsImported: 0,
      resourceSelections: [],
      encryptedCredentialsRef: crypto.randomUUID(),
      metadata: {},
      createdAt: now,
      updatedAt: now,
    });

    const all = repo.listConnections();
    assert.equal(all.length, 3);
    assert.equal(all.filter((c) => c.providerId === 'microsoft').length, 2);

    const hvcgOnly = repo.listConnections({ businessEntity: 'HVCG' });
    assert.equal(hvcgOnly.length, 1);
    assert.equal(hvcgOnly[0].accountEmail, 'user@highvaluecapitalgroup.com');

    assert.equal(
      inferBusinessEntity({ email: 'user@highvaluecapitalgroup.com' }),
      'HVCG',
    );
    assert.equal(inferBusinessEntity({ email: 'contact@hvsllc.example' }), 'HVS');
    assert.notEqual(
      inferBusinessEntity({ email: 'user@highvaluecapitalgroup.com' }),
      inferBusinessEntity({ email: 'contact@hvsllc.example' }),
    );

    const summary = repo.dashboardSummary();
    assert.equal(summary.byProvider.microsoft, 2);
    assert.equal(summary.byProvider.google, 1);
    assert.equal(summary.byEntity.HVCG, 1);
    assert.equal(summary.byEntity.HVS, 2);

    rmSync(dir, { recursive: true, force: true });
  });
});
