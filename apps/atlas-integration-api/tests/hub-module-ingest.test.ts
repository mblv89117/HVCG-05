import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleModuleEnvelope } from '../src/modules/ingest/handlers.ts';
import { buildModuleKeyRing, verifyModuleIngestHmac } from '../src/modules/ingest/hmac.ts';
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

  it('HMAC verifies signed body without transmitting secret', () => {
    const rawBody = '{"ok":true}';
    const timestamp = new Date().toISOString();
    const signature = createHmac('sha256', SECRET)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    const keyRing = buildModuleKeyRing({
      primaryKey: SECRET,
      primaryKeyId: 'module',
      keysJson: JSON.stringify({ gcc: `${SECRET}-gcc` }),
    });
    const auth = verifyModuleIngestHmac({
      keyIdHeader: 'module',
      timestampHeader: timestamp,
      signatureHeader: signature,
      rawBody,
      keyRing,
    });
    assert.equal(auth.ok, true);
  });

  it('HMAC fail-closes unknown key id', () => {
    const rawBody = '{}';
    const timestamp = new Date().toISOString();
    const signature = createHmac('sha256', SECRET)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    const keyRing = buildModuleKeyRing({ primaryKey: SECRET, primaryKeyId: 'module' });
    const auth = verifyModuleIngestHmac({
      keyIdHeader: 'unknown',
      timestampHeader: timestamp,
      signatureHeader: signature,
      rawBody,
      keyRing,
    });
    assert.equal(auth.ok, false);
    if (!auth.ok) assert.equal(auth.status, 401);
  });

  it('HMAC fail-closes skewed timestamp', () => {
    const rawBody = '{}';
    const timestamp = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const signature = createHmac('sha256', SECRET)
      .update(`${timestamp}.${rawBody}`, 'utf8')
      .digest('hex');
    const keyRing = buildModuleKeyRing({ primaryKey: SECRET, primaryKeyId: 'module' });
    const auth = verifyModuleIngestHmac({
      keyIdHeader: 'module',
      timestampHeader: timestamp,
      signatureHeader: signature,
      rawBody,
      keyRing,
    });
    assert.equal(auth.ok, false);
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
    if (!r.ok) {
      assert.equal(r.status, 400);
      assert.equal(r.code, 'PAID_EXECUTE_FORBIDDEN');
    }
  });

  it('fail-closes Hart slug mismatch and unmapped 360 clients', () => {
    const hart = handleModuleEnvelope(
      envelope360({
        clientCode: 'PDG01',
        payload: { canExecute: false, organizationSlug: 'hart-family-dental' },
      }),
    );
    assert.equal(hart.ok, false);
    if (!hart.ok) {
      assert.equal(hart.status, 403);
      assert.equal(hart.code, 'HART_CLIENTCODE_REQUIRED');
    }

    const unknown = handleModuleEnvelope(envelope360({ clientCode: 'ZZZZ99' }));
    assert.equal(unknown.ok, false);
    if (!unknown.ok) assert.equal(unknown.status, 403);

    const accgHart = handleModuleEnvelope(
      envelope360({
        clientCode: 'ACCG01',
        idempotencyKey: '360|accg-hart',
        payload: { canExecute: false, organizationSlug: 'hart-family-dental' },
      }),
    );
    assert.equal(accgHart.ok, false);
    if (!accgHart.ok) assert.equal(accgHart.status, 403);

    const accg = handleModuleEnvelope(
      envelope360({
        clientCode: 'ACCG01',
        idempotencyKey: '360|accg',
        payload: { canExecute: false },
      }),
    );
    assert.equal(accg.ok, false);
    if (!accg.ok) {
      assert.equal(accg.status, 403);
      assert.equal(accg.code, 'GROWTH360_UNMAPPED');
    }

    for (const clientCode of ['MRI01', 'SYN01', 'T360A']) {
      const fixture = handleModuleEnvelope(
        envelope360({
          clientCode,
          idempotencyKey: `360|${clientCode}`,
          payload: { canExecute: false },
        }),
      );
      assert.equal(fixture.ok, false);
      if (!fixture.ok) assert.equal(fixture.status, 403);
    }
  });

  it('allow-lists 360 payload fields and dual-resolves the verified HFD01 org', () => {
    const smuggledCode = handleModuleEnvelope(
      envelope360({
        payload: {
          canExecute: false,
          organizationSlug: 'hart-family-dental',
          clientCode: 'ACCG01',
        },
      }),
    );
    assert.equal(smuggledCode.ok, false);
    if (!smuggledCode.ok) {
      assert.equal(smuggledCode.status, 400);
      assert.equal(smuggledCode.code, 'PAYLOAD_FIELD_NOT_ALLOWED');
    }

    const secondOrg = handleModuleEnvelope(
      envelope360({
        payload: {
          canExecute: false,
          organizationSlug: 'hart-family-dental',
          organizationId: '99cdffba-3cf2-4343-9e4a-3dca42ff4711',
          gccOrganizationId: 'org-prodigy-games-llc',
        },
      }),
    );
    assert.equal(secondOrg.ok, false);
    if (!secondOrg.ok) assert.equal(secondOrg.status, 400);

    const nestedExecute = handleModuleEnvelope(
      envelope360({
        payload: {
          canExecute: false,
          organizationSlug: 'hart-family-dental',
          campaignId: { canExecute: true },
        },
      }),
    );
    assert.equal(nestedExecute.ok, false);
    if (!nestedExecute.ok) assert.equal(nestedExecute.status, 400);

    const stringExecute = handleModuleEnvelope(
      envelope360({
        payload: { canExecute: 'true', organizationSlug: 'hart-family-dental' },
      }),
    );
    assert.equal(stringExecute.ok, false);
    if (!stringExecute.ok) assert.equal(stringExecute.code, 'PAID_EXECUTE_FORBIDDEN');

    const wrongOrg = handleModuleEnvelope(
      envelope360({
        payload: {
          canExecute: false,
          organizationSlug: 'hart-family-dental',
          organizationId: '00000000-0000-0000-0000-000000000000',
        },
      }),
    );
    assert.equal(wrongOrg.ok, false);
    if (!wrongOrg.ok) {
      assert.equal(wrongOrg.status, 403);
      assert.equal(wrongOrg.code, 'GROWTH360_ORG_CLIENTCODE_MISMATCH');
    }

    const both = handleModuleEnvelope(
      envelope360({
        payload: {
          canExecute: false,
          organizationSlug: 'hart-family-dental',
          organizationId: '99cdffba-3cf2-4343-9e4a-3dca42ff4711',
          campaignId: 'camp-1',
          requestedAction: 'Review the spring campaign draft',
        },
      }),
    );
    assert.equal(both.ok, true);
  });

  it('rejects GCC fixture SYN01 even when the fixture org is mapped', () => {
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
      payload: {
        organizationId: 'org-syn01',
        autoProvision: false,
        financialImpact: 0,
        signalType: 'engagement_health',
        summary: 'fixture observation',
      },
    });
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 403);
      assert.equal(r.code, 'GCC_UNMAPPED');
    }
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
