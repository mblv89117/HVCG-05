import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleModuleEnvelope } from '../src/modules/ingest/handlers.ts';
import { verifyModuleIngestHmac } from '../src/modules/ingest/hmac.ts';
import { upsertIngest } from '../src/modules/ingest/store.ts';
import { prepareLeadClientConversion } from '../src/modules/leads/conversionPrepare.ts';
import { resetIdentityRegistry } from '../src/identity/registry.ts';

const SECRET = 'module-ingest-test-secret-key';

function envelope360(partial: Record<string, unknown> = {}) {
  return {
    clientCode: 'HFD01',
    source: 'growth_360',
    sourceRecordId: 'prop-1',
    schemaVersion: '360_campaign_approval_v1',
    eventType: '360.campaign_approval.v1',
    timestamp: new Date().toISOString(),
    provenance: {
      system: '360',
      observedAt: new Date().toISOString(),
      confidence: 'VERIFIED',
    },
    confidence: 'VERIFIED',
    correlationId: 'corr-1',
    idempotencyKey: '360|prop-1',
    actor: 'owner@test.local',
    authorityClass: 'EXECUTE_WITH_APPROVAL',
    payload: { canExecute: false, organizationSlug: 'hart-family-dental' },
    ...partial,
  };
}

describe('Wave 3 module ingest', () => {
  beforeEach(() => {
    resetIdentityRegistry();
  });

  it('HMAC verifies signed body', () => {
    const rawBody = '{"ok":true}';
    const timestamp = new Date().toISOString();
    const signature = createHmac('sha256', SECRET)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    const auth = verifyModuleIngestHmac({
      keyHeader: SECRET,
      keyIdHeader: 'module',
      timestampHeader: timestamp,
      signatureHeader: signature,
      rawBody,
      expectedKey: SECRET,
      expectedKeyId: 'module',
    });
    assert.equal(auth.ok, true);
  });

  it('fail-closes unknown ClientCode', () => {
    const r = handleModuleEnvelope(envelope360({ clientCode: 'ZZZZ99' }));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.status, 403);
  });

  it('accepts 360 approval for HFD01 with canExecute false', () => {
    const r = handleModuleEnvelope(envelope360());
    assert.equal(r.ok, true);
  });

  it('rejects 360 paid execute', () => {
    const r = handleModuleEnvelope(
      envelope360({
        payload: { canExecute: true, organizationSlug: 'hart-family-dental' },
      }),
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.code, 'PAID_EXECUTE_FORBIDDEN');
  });

  it('accepts GCC observation for SYN01 with mapped org', () => {
    const r = handleModuleEnvelope({
      clientCode: 'SYN01',
      source: 'growth_command_center',
      sourceRecordId: 'sig-1',
      schemaVersion: 'gcc-value-signal.v1',
      eventType: 'gcc.value_signal.v1',
      timestamp: new Date().toISOString(),
      provenance: {
        system: 'gcc',
        observedAt: new Date().toISOString(),
        confidence: 'VERIFIED',
      },
      confidence: 'VERIFIED',
      correlationId: 'c-gcc',
      idempotencyKey: 'gcc|sig-1',
      actor: 'gcc-worker',
      authorityClass: 'OBSERVE',
      payload: { organizationId: 'org-syn01', autoProvision: false, financialImpact: 0 },
    });
    assert.equal(r.ok, true);
  });

  it('idempotent store upsert', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ingest-'));
    try {
      const env = envelope360({ idempotencyKey: 'idem-1' });
      const handled = handleModuleEnvelope(env);
      assert.equal(handled.ok, true);
      if (!handled.ok) return;
      const a = upsertIngest({ dataDir: dir, keyId: 'module', envelope: handled.envelope });
      const b = upsertIngest({ dataDir: dir, keyId: 'module', envelope: handled.envelope });
      assert.equal(a.replay, false);
      assert.equal(b.replay, true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lead conversion prepare fail-closes unknown code', () => {
    const dir = mkdtempSync(join(tmpdir(), 'leadconv-'));
    try {
      const bad = prepareLeadClientConversion({
        dataDir: dir,
        leadId: 'lead-1',
        proposedClientCode: 'NOPE01',
        displayName: 'Nope',
        preparedBy: 'tester',
      });
      assert.equal(bad.ok, false);
      const good = prepareLeadClientConversion({
        dataDir: dir,
        leadId: 'lead-2',
        proposedClientCode: 'HFD01',
        displayName: 'Hart Family Dental',
        preparedBy: 'tester',
      });
      assert.equal(good.ok, true);
      if (good.ok) assert.equal(good.record.status, 'PREPARED_AWAITING_APPROVAL');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
