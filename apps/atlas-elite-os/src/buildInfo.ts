/**
 * Build / deployment identity for QA SHA verification (DEF-ELITE-003).
 */
export const ATLAS_BUILD = {
  sha: (import.meta.env.VITE_ATLAS_BUILD_SHA as string | undefined) || 'local-dev',
  shortSha: ((import.meta.env.VITE_ATLAS_BUILD_SHA as string | undefined) || 'local-dev').slice(0, 7),
  builtAt: (import.meta.env.VITE_ATLAS_BUILT_AT as string | undefined) || new Date().toISOString(),
  environment: (import.meta.env.VITE_ATLAS_ENV as string | undefined) || 'local',
};
