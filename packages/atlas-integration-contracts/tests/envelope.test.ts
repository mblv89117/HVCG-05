import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnvelope, hasReached } from '../src/index.ts';

describe('Atlas integration envelope', () => {
  it('fail-closes missing ClientCode', () => {
    const r = validateEnvelope({
      source: 'growth_command_center',
      sourceRecordId: '1',
      schemaVersion: 'v1',
      eventType: 'gcc.value_signal.v1',
      timestamp: new Date().toISOString(),
      provenance: { system: 'gcc', observedAt: new Date().toISOString(), confidence: 'VERIFIED' },
      confidence: 'VERIFIED',
      correlationId: 'c1',
      idempotencyKey: 'k1',
      actor: 'system',
      authorityClass: 'OBSERVE',
      payload: {},
    });
    assert.equal(r.ok, false);
  });

  it('accepts canonical envelope', () => {
    const r = validateEnvelope({
      clientCode: 'HFD01',
      source: 'growth_360',
      sourceRecordId: 'prop-1',
      schemaVersion: '360_campaign_approval_v1',
      eventType: '360.campaign_approval.v1',
      timestamp: new Date().toISOString(),
      provenance: { system: '360', observedAt: new Date().toISOString(), confidence: 'VERIFIED' },
      confidence: 'VERIFIED',
      correlationId: 'c1',
      idempotencyKey: '360|prop-1',
      actor: 'owner@example.com',
      authorityClass: 'EXECUTE_WITH_APPROVAL',
      payload: { canExecute: false },
    });
    assert.equal(r.ok, true);
  });

  it('maturity ladder ordering', () => {
    assert.equal(hasReached('OBSERVATION_LIVE', 'RECEIVE_ONLY'), true);
    assert.equal(hasReached('RECEIVE_ONLY', 'OBSERVATION_LIVE'), false);
  });
});
