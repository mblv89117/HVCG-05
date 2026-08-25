/**
 * Lightweight Hub/Elite deployment lineage guard — prevents stale overwrite of newer production.
 */

export const CANONICAL_PRODUCTION_SHA = '37bf7ba0c7b8cc2bc3a2cbe7ed8d4b7e1f836818' as const;

export type DeployLineageCheckResult =
  | { ok: true; liveSha: string; candidateSha: string }
  | { ok: false; liveSha: string; candidateSha: string; reason: string };

export function normalizeSha(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const sha = raw.trim().toLowerCase();
  if (!/^[0-9a-f]{7,40}$/.test(sha)) return null;
  return sha;
}

/**
 * Candidate must equal live SHA or explicitly include live in ancestry when ancestry is known.
 * When ancestry is unknown, candidate must not be a strict prefix mismatch with a warning list.
 */
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
    return { ok: true, liveSha: live, candidateSha: candidate };
  }
  if (opts.candidateIncludesLiveAncestry) {
    return { ok: true, liveSha: live, candidateSha: candidate };
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
