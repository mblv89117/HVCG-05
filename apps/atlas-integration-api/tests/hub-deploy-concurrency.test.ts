import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOCKED_STALE_DEPLOY_SHAS,
  HISTORICAL_FLOOR_SHA,
  evaluateDeployAncestry,
  isBlockedStaleSha,
} from '../src/deploy/deployLineageGuard.ts';
import { leaseRecordExpired, buildLeaseRecord } from '../src/deploy/deployLease.ts';

describe('deploy lineage guard', () => {
  it('blocks stale capital SHA without historical floor ancestry', () => {
    assert.equal(isBlockedStaleSha(BLOCKED_STALE_DEPLOY_SHAS[0]), true);
    const result = evaluateDeployAncestry({
      candidateSha: BLOCKED_STALE_DEPLOY_SHAS[0],
      liveSha: HISTORICAL_FLOOR_SHA,
      candidateIncludesHistoricalFloorAncestry: false,
      candidateIncludesLiveAncestry: false,
      liveIncludesHistoricalFloorAncestry: true,
      candidateIncludesCanonicalAncestry: false,
      liveIncludesCanonicalAncestry: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'blocked_stale_sha_without_historical_floor');
  });

  it('allows candidate that includes historical floor when live is stale', () => {
    const result = evaluateDeployAncestry({
      candidateSha: HISTORICAL_FLOOR_SHA,
      liveSha: BLOCKED_STALE_DEPLOY_SHAS[0],
      candidateIncludesHistoricalFloorAncestry: true,
      candidateIncludesLiveAncestry: false,
      liveIncludesHistoricalFloorAncestry: false,
      candidateIncludesCanonicalAncestry: true,
      liveIncludesCanonicalAncestry: false,
    });
    assert.equal(result.ok, true);
    assert.equal(result.reason, 'live_stale_restoring_lineage');
  });

  it('blocks candidate that omits historical floor', () => {
    const result = evaluateDeployAncestry({
      candidateSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      liveSha: HISTORICAL_FLOOR_SHA,
      candidateIncludesHistoricalFloorAncestry: false,
      candidateIncludesLiveAncestry: false,
      liveIncludesHistoricalFloorAncestry: true,
      candidateIncludesCanonicalAncestry: false,
      liveIncludesCanonicalAncestry: true,
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'candidate_omits_historical_floor');
  });
});

describe('deploy lease metadata', () => {
  it('expires lease records after duration', () => {
    const record = buildLeaseRecord({
      leaseId: 'lease-1',
      holderId: 'agent-a',
      candidateSha: HISTORICAL_FLOOR_SHA,
      branch: 'test',
      durationSec: 1,
    });
    assert.equal(leaseRecordExpired(record, Date.parse(record.acquiredAt) + 2000), true);
  });
});
