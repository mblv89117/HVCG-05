/**
 * Hub/Elite deployment lineage guard — prevents stale overwrite of newer production.
 */

/**
 * Floor SHA for Hub production lineage checks.
 * Updated to `production/atlas-core` tip `0e95388d` (Waves 0–10 + HMAC key-id hardening).
 * Prior live Hub `2d61fe65` remains an ancestor — forward deploy only.
 * Do not force Hub/Elite SHA equalization.
 */
export const CANONICAL_PRODUCTION_SHA = '0e95388dc46eb40884f9d0c461678e66c533db4c' as const;

/** Known divergent SHAs that must not overwrite canonical workflow capability. */
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
 */
export function evaluateDeployAncestry(opts: {
  candidateSha: string;
  liveSha: string;
  candidateIncludesCanonicalAncestry: boolean;
  candidateIncludesLiveAncestry: boolean;
  liveIncludesCanonicalAncestry: boolean;
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

  if (isBlockedStaleSha(candidate) && !opts.candidateIncludesCanonicalAncestry) {
    return {
      ok: false,
      liveSha: live,
      candidateSha: candidate,
      reason: 'blocked_stale_sha_without_canonical_capability',
    };
  }

  if (!opts.candidateIncludesCanonicalAncestry) {
    return {
      ok: false,
      liveSha: live,
      candidateSha: candidate,
      reason: 'candidate_omits_canonical_production',
    };
  }

  if (opts.candidateIncludesLiveAncestry) {
    return { ok: true, liveSha: live, candidateSha: candidate, reason: 'candidate_includes_live_ancestry' };
  }

  if (!opts.liveIncludesCanonicalAncestry) {
    return {
      ok: true,
      liveSha: live,
      candidateSha: candidate,
      reason: 'live_stale_restoring_canonical_lineage',
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
