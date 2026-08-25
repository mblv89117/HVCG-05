#!/usr/bin/env node
/**
 * CLI ancestry guard for Hub deploy scripts.
 */
import { evaluateDeployAncestry } from '../apps/atlas-integration-api/src/deploy/deployLineageGuard.ts';

const candidateSha = process.argv[2];
const liveSha = process.argv[3];
const candidateIncludesCanonical = process.argv[4] === 'true';
const candidateIncludesLive = process.argv[5] === 'true';
const liveIncludesCanonical = process.argv[6] === 'true';

const result = evaluateDeployAncestry({
  candidateSha,
  liveSha,
  candidateIncludesCanonicalAncestry: candidateIncludesCanonical,
  candidateIncludesLiveAncestry: candidateIncludesLive,
  liveIncludesCanonicalAncestry: liveIncludesCanonical,
});

console.log(JSON.stringify(result));
if (!result.ok) process.exit(1);
