import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFIGURABLE_OWNERS,
  DEFAULT_LOCAL_AI_FEATURE_FLAGS,
  MANNY_APPROVAL_REQUIRED_ACTIONS,
  SYNTHETIC_AI_OUTPUT_BANNER,
  SYNTHETIC_RECORD_BANNER,
  TIME_PROTECTION_POLICY_VERSION,
  assertSafetyFlagsOff,
  blockExternalCommunication,
  containsForbiddenPersonName,
  createDecisionPackage,
  evaluateAiActionAttempt,
  evaluateTimeProtection,
  loadLocalAiFeatureFlags,
  requiresMannyApproval,
  validateDecisionPackage,
} from '../src/local-ai/index.ts';

describe('local-ai feature flags', () => {
  it('defaults all flags to false', () => {
    const flags = loadLocalAiFeatureFlags({});
    assert.deepEqual(flags, DEFAULT_LOCAL_AI_FEATURE_FLAGS);
    assert.equal(flags.LocalAIEnabled, false);
    assert.equal(flags.LocalAIWritesEnabled, false);
    assert.equal(flags.LocalAIExternalMessagesEnabled, false);
    assert.equal(flags.EvaIntakeEnabled, false);
    assert.equal(flags.ClientEmailsEnabled, false);
  });

  it('kill switch forces LocalAIEnabled false', () => {
    const flags = loadLocalAiFeatureFlags({
      LOCAL_AI_ENABLED: 'true',
      LOCAL_AI_KILL_SWITCH: 'true',
    });
    assert.equal(flags.LocalAIEnabled, false);
  });

  it('Phase 1 safety asserts Eva and client emails off', () => {
    const ok = assertSafetyFlagsOff(DEFAULT_LOCAL_AI_FEATURE_FLAGS);
    assert.equal(ok.ok, true);
    const bad = assertSafetyFlagsOff({
      ...DEFAULT_LOCAL_AI_FEATURE_FLAGS,
      EvaIntakeEnabled: true,
    });
    assert.equal(bad.ok, false);
  });
});

describe('ownership neutrality', () => {
  it('includes required configurable owners', () => {
    for (const o of [
      'Manny',
      'Local AI Operations Agent',
      'Unassigned Operations',
      'Future Human Operator',
      'Automation',
    ]) {
      assert.ok((CONFIGURABLE_OWNERS as readonly string[]).includes(o));
    }
  });

  it('rejects forbidden former team member names', () => {
    assert.equal(containsForbiddenPersonName('Assign to Stephen'), true);
    assert.equal(containsForbiddenPersonName('john owns this'), true);
    assert.equal(containsForbiddenPersonName('Mason review'), true);
    assert.equal(containsForbiddenPersonName('Manny approval required'), false);
    assert.equal(containsForbiddenPersonName('Future Human Operator'), false);
  });
});

describe('approval gates', () => {
  it('requires Manny for gated actions', () => {
    for (const action of MANNY_APPROVAL_REQUIRED_ACTIONS) {
      assert.equal(requiresMannyApproval(action), true);
      const gate = evaluateAiActionAttempt(action);
      assert.equal(gate.allowed, false);
      assert.equal(gate.requiresMannyApproval, true);
    }
  });

  it('blocks external communication under Phase 1 flags', () => {
    const gate = blockExternalCommunication(DEFAULT_LOCAL_AI_FEATURE_FLAGS);
    assert.equal(gate.allowed, false);
    assert.equal(gate.code, 'external_communication_blocked');
  });
});

describe('decision package schema', () => {
  it('validates synthetic packages', () => {
    const pkg = createDecisionPackage({
      decision: 'TEST',
      recommendation: 'Rec',
      why: 'Why',
      alternatives: ['A'],
      risks: ['R'],
      deadline: null,
      requiredReviewTimeMinutes: 5,
      sourceRecords: [{ type: 'Task', id: 't1', title: 'x' }],
      confidence: 0.9,
      missingInformation: [],
    });
    assert.equal(pkg.banner, SYNTHETIC_AI_OUTPUT_BANNER);
    const v = validateDecisionPackage(pkg);
    assert.equal(v.ok, true);
  });

  it('rejects malformed packages', () => {
    const v = validateDecisionPackage({ decision: 'x', banner: 'wrong' });
    assert.equal(v.ok, false);
  });
});

describe('time protection policy', () => {
  it('eliminates duplicates without routing to Manny', () => {
    const r = evaluateTimeProtection({
      title: `${SYNTHETIC_RECORD_BANNER} dup`,
      isDuplicate: true,
      isNecessary: true,
    });
    assert.equal(r.recommendedTier, 'Tier 5 — Eliminate');
    assert.equal(r.escalationRequired, false);
    assert.equal(r.policyVersion, TIME_PROTECTION_POLICY_VERSION);
  });

  it('escalates gated pricing to Manny with decision package path', () => {
    const r = evaluateTimeProtection({
      title: 'Pricing review',
      requestedOperation: 'Pricing',
      generatesRevenue: true,
      canAiPrepareDecisionPackage: true,
    });
    assert.equal(r.recommendedOwner, 'Manny');
    assert.equal(r.recommendedTier, 'Tier 1 — Manny Only');
    assert.equal(r.escalationRequired, true);
  });

  it('routes automation-eligible work to Automation', () => {
    const r = evaluateTimeProtection({
      title: 'Status sync',
      canAutomate: true,
      isNecessary: true,
    });
    assert.equal(r.recommendedOwner, 'Automation');
    assert.equal(r.recommendedTier, 'Tier 4 — Automate');
  });
});
