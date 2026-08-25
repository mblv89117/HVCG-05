import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCKED_STALE_DEPLOY_SHAS,
  CANONICAL_PRODUCTION_SHA,
  evaluateDeployAncestry,
  isBlockedStaleSha,
} from '../src/deploy/deployLineageGuard.ts';
import { leaseRecordExpired, buildLeaseRecord } from '../src/deploy/deployLease.ts';

describe('deploy lineage guard', () => {
  it('blocks stale capital SHA without canonical ancestry', () => {
    assert.equal(isBlockedStaleSha(BLOCKED_STALE_DEPLOY_SHAS[0]), true);
    const result = evaluateDeployAncestry({
      candidateSha: BLOCKED_STALE_DEPLOY_SHAS[0],
      liveSha: CANONICAL_PRODUCTION_SHA,
      candidateIncludesCanonicalAncestry: false,
      candidateIncludesLiveAncestry: false,
      liveIncludesCanonicalAncestry: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'blocked_stale_sha_without_canonical_capability');
  });

  it('allows candidate that includes canonical when live is stale', () => {
    const result = evaluateDeployAncestry({
      candidateSha: CANONICAL_PRODUCTION_SHA,
      liveSha: BLOCKED_STALE_DEPLOY_SHAS[0],
      candidateIncludesCanonicalAncestry: true,
      candidateIncludesLiveAncestry: false,
      liveIncludesCanonicalAncestry: false,
    });
    assert.equal(result.ok, true);
    assert.equal(result.reason, 'live_stale_restoring_canonical_lineage');
  });

  it('blocks candidate that omits canonical production', () => {
    const result = evaluateDeployAncestry({
      candidateSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      liveSha: CANONICAL_PRODUCTION_SHA,
      candidateIncludesCanonicalAncestry: false,
      candidateIncludesLiveAncestry: false,
      liveIncludesCanonicalAncestry: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'candidate_omits_canonical_production');
  });
});

describe('deploy lease metadata', () => {
  it('expires lease records after duration', () => {
    const record = buildLeaseRecord({
      leaseId: 'lease-1',
      holderId: 'agent-a',
      candidateSha: CANONICAL_PRODUCTION_SHA,
      branch: 'test',
      durationSec: 1,
    });
    assert.equal(leaseRecordExpired(record, Date.parse(record.acquiredAt) + 2000), true);
  });
});
