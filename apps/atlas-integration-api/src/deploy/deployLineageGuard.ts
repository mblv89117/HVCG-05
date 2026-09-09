/**
 * Hub/Elite deployment lineage guard — prevents stale overwrite of newer production.
 */

/**
 * Wave 0 historical floor — ancestry evidence only, not the deploy target.
 * Prior live Hub `2d61fe65` shipped from this lineage; forward deploys must include it.
 */
export const HISTORICAL_FLOOR_SHA = '2d61fe65603b88d12d08456967c65dae8e5aec52' as const;

/** @deprecated use HISTORICAL_FLOOR_SHA — kept for existing imports/tests */
export const CANONICAL_PRODUCTION_SHA = HISTORICAL_FLOOR_SHA;

/** Known divergent SHAs that must not overwrite production lineage capability. */
export const BLOCKED_STALE_DEPLOY_SHAS = [
  '0cdd5f462179efc38a9aaa9444749393e5ffdf20',
] as const;

export type DeployLineageCheckResult =
  | { ok: true; liveSha: string; candidateSha: string; reason: string }
  | { ok: false; liveSha: string; candidateSha: string; reason: string };

export function normalizeSha(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const sha = raw.trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(sha)) return null;
  return sha;
}

export function shaPrefix(sha: string): string {
  return sha.slice(0, 7);
}

export function isBlockedStaleSha(candidateSha: string): boolean {
  const normalized = normalizeSha(candidateSha);
  if (!normalized) return false;
  return BLOCKED_STALE_DEPLOY_SHAS.some(
    (blocked) => normalized === blocked || normalized.startsWith(blocked.slice(0, 7)),
  );
}

/**
 * Evaluate whether a deploy candidate may replace live production Hub.
 * Does not perform git operations — caller supplies ancestry booleans from git merge-base.
 *
 * Terminology:
 * - LIVE_PRODUCTION: commit currently serving /health
 * - CURRENT_CANDIDATE: origin/production/atlas-core tip (or explicit checkout) being deployed
 * - HISTORICAL_FLOOR: Wave 0 floor SHA — candidate must include this ancestry
 */
export function evaluateDeployAncestry(opts: {
  candidateSha: string;
  liveSha: string;
  /** @deprecated alias — means candidate includes HISTORICAL_FLOOR ancestry */
  candidateIncludesCanonicalAncestry: boolean;
  candidateIncludesLiveAncestry: boolean;
  /** @deprecated alias — means live includes HISTORICAL_FLOOR ancestry */
  liveIncludesCanonicalAncestry: boolean;
  candidateIncludesHistoricalFloorAncestry?: boolean;
  liveIncludesHistoricalFloorAncestry?: boolean;
}): DeployLineageCheckResult {
  const candidate = normalizeSha(opts.candidateSha);
  const live = normalizeSha(opts.liveSha);
  const candidateIncludesFloor =
    opts.candidateIncludesHistoricalFloorAncestry ?? opts.candidateIncludesCanonicalAncestry;
  const liveIncludesFloor =
    opts.liveIncludesHistoricalFloorAncestry ?? opts.liveIncludesCanonicalAncestry;

  if (!candidate || !live) {
    return {
      ok: false,
      liveSha: live ?? opts.liveSha,
      candidateSha: candidate ?? opts.candidateSha,
      reason: 'invalid_sha',
    };
  }

  if (candidate === live) {
    return { ok: true, liveSha: live, candidateSha: candidate, reason: 'already_live' };
  }

  if (isBlockedStaleSha(candidate) && !candidateIncludesFloor) {
    return {
      ok: false,
      liveSha: live,
      candidateSha: candidate,
      reason: 'blocked_stale_sha_without_historical_floor',
    };
  }

  if (!candidateIncludesFloor) {
    return {
      ok: false,
      liveSha: live,
      candidateSha: candidate,
      reason: 'candidate_omits_historical_floor',
    };
  }

  if (opts.candidateIncludesLiveAncestry) {
    return { ok: true, liveSha: live, candidateSha: candidate, reason: 'candidate_includes_live_ancestry' };
  }

  if (!liveIncludesFloor) {
    return {
      ok: true,
      liveSha: live,
      candidateSha: candidate,
      reason: 'live_stale_restoring_lineage',
    };
  }

  return {
    ok: false,
    liveSha: live,
    candidateSha: candidate,
    reason: 'candidate_does_not_include_live_ancestry',
  };
}

/** @deprecated use evaluateDeployAncestry */
export function assertDeployCandidateIncludesLive(opts: {
  candidateSha: string;
  liveSha: string;
  candidateIncludesLiveAncestry?: boolean;
  knownOverwriteRisk?: boolean;
}): DeployLineageCheckResult {
  const candidate = normalizeSha(opts.candidateSha);
  const live = normalizeSha(opts.liveSha);
  if (!candidate || !live) {
    return {
      ok: false,
      liveSha: live ?? opts.liveSha,
      candidateSha: candidate ?? opts.candidateSha,
      reason: 'invalid_sha',
    };
  }
  if (candidate === live) {
    return { ok: true, liveSha: live, candidateSha: candidate, reason: 'already_live' };
  }
  if (opts.candidateIncludesLiveAncestry) {
    return { ok: true, liveSha: live, candidateSha: candidate, reason: 'includes_live' };
  }
  if (opts.knownOverwriteRisk) {
    return {
      ok: false,
      liveSha: live,
      candidateSha: candidate,
      reason: 'stale_candidate_would_overwrite_live',
    };
  }
  return {
    ok: false,
    liveSha: live,
    candidateSha: candidate,
    reason: 'candidate_does_not_include_live_ancestry',
  };
}

export async function fetchLiveHubSha(hubBase: string): Promise<string | null> {
  try {
    const res = await fetch(`${hubBase.replace(/\/$/, '')}/health`);
    if (!res.ok) return null;
    const body = (await res.json()) as { commit?: string };
    return normalizeSha(body.commit);
  } catch {
    return null;
  }
}
