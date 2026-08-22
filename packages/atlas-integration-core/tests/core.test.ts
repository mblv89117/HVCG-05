import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  encryptSecret,
  decryptSecret,
  contentHash,
  sourceDedupeKey,
  processIndependently,
  computeBackoff,
  PermissionDeniedError,
  UnsupportedOperationError,
  SOURCE_OF_TRUTH_RULES,
  IntegrationRegistry,
  unsupportedOf,
} from '../src/index.ts';
import { BaseIntegrationAdapter } from '../src/adapters/base.ts';
import type { AdapterAction, PermissionMode } from '../src/types/provider.ts';
import type { ConnectRequest, ConnectResult } from '../src/types/adapter.ts';
import type { TokenHealth } from '../src/types/records.ts';

describe('tokenVault', () => {
  it('round-trips secrets', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const enc = encryptSecret('refresh-token-abc', key);
    assert.notEqual(enc, 'refresh-token-abc');
    assert.equal(decryptSecret(enc, key), 'refresh-token-abc');
  });

  it('hashes content stably', () => {
    assert.equal(contentHash('a'), contentHash('a'));
    assert.notEqual(contentHash('a'), contentHash('b'));
  });
});

describe('sync engine', () => {
  it('dedupe keys are stable', () => {
    assert.equal(
      sourceDedupeKey('microsoft', 'user@x', 'msg-1'),
      'microsoft::user@x::msg-1',
    );
  });

  it('processes records independently', async () => {
    const result = await processIndependently([1, 2, 3], async (n) => {
      if (n === 2) throw new Error('boom');
      return n === 1 ? 'imported' : 'duplicate';
    });
    assert.deepEqual(result, { imported: 1, skipped: 0, duplicates: 1, errors: 1 });
  });

  it('backoff grows', () => {
    const a = computeBackoff(1, { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 10_000, jitter: false });
    const b = computeBackoff(3, { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 10_000, jitter: false });
    assert.ok(b > a);
  });
});

describe('source of truth', () => {
  it('documents email ownership as provider', () => {
    const email = SOURCE_OF_TRUTH_RULES.find((r) => r.entityKind === 'Email');
    assert.equal(email?.owner, 'provider');
  });
});

class StubAdapter extends BaseIntegrationAdapter {
  readonly providerId = 'microsoft' as const;
  readonly adapterVersion = '0.0.1';
  protected supportedActions = new Set<AdapterAction>(['connect', 'searchRecords', 'createRecord']);
  mode: PermissionMode = 'read_only_discovery';

  protected getPermissionMode(): PermissionMode {
    return this.mode;
  }

  async connect(_request: ConnectRequest): Promise<ConnectResult> {
    return {};
  }
  async disconnect(): Promise<void> {}
  async verifyConnection() {
    return { ok: true, detail: 'ok' };
  }
  async refreshAuthentication(): Promise<TokenHealth> {
    return { healthy: true, refreshSupported: true, requiresReauthorization: false };
  }
  async getConnectionStatus() {
    return 'Connected' as const;
  }
}

describe('BaseIntegrationAdapter', () => {
  it('rejects unsupported actions', async () => {
    const a = new StubAdapter();
    await assert.rejects(() => a.downloadFile({ connectionId: 'c', resourceId: 'r' }), (err: unknown) => {
      assert.ok(err instanceof UnsupportedOperationError);
      return true;
    });
  });

  it('enforces read-only discovery', async () => {
    const a = new StubAdapter();
    a.mode = 'read_only_discovery';
    await assert.rejects(
      () => a.createRecord({ connectionId: 'c', resourceType: 'task', payload: {} }),
      (err: unknown) => err instanceof PermissionDeniedError,
    );
  });
});

describe('IntegrationRegistry', () => {
  it('registers and lists', () => {
    const reg = new IntegrationRegistry();
    const adapter = new StubAdapter();
    reg.register(
      {
        providerId: 'microsoft',
        providerName: 'Microsoft 365',
        adapterVersion: '0.0.1',
        authenticationType: ['oauth2_delegated'],
        availableActions: ['connect', 'searchRecords'],
        unsupportedActions: unsupportedOf(['connect', 'searchRecords']),
        requiredPermissions: [],
        optionalPermissions: [],
        webhookSupport: true,
        deltaSyncSupport: true,
        rateLimits: {},
        documentationLink: '/docs',
        owner: 'Atlas',
        deploymentStatus: 'development',
        defaultPermissionMode: 'read_only_discovery',
      },
      adapter,
    );
    assert.equal(reg.list().length, 1);
    assert.equal(reg.getAdapter('microsoft')?.providerId, 'microsoft');
  });
});
