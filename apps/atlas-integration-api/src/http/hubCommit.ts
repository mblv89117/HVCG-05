import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HUB_COMMIT_PATH = '/ATLAS_HUB_COMMIT.txt';
export const HUB_BUILD_PATH = '/hub-build.json';

const SHA_RE = /^[0-9a-f]{7,40}$/i;

export function normalizeHubCommit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const sha = raw.trim().split(/\s+/)[0] || '';
  if (!SHA_RE.test(sha)) return null;
  return sha.toLowerCase();
}

function nearbyMarkerFiles(cwd: string): string[] {
  const names = ['ATLAS_HUB_COMMIT.txt', 'hub-build.json'];
  const dirs = [cwd];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    dirs.push(here, join(here, '..'), join(here, '..', '..'));
  } catch {
    // import.meta.url unavailable
  }
  return dirs.flatMap((dir) => names.map((name) => join(dir, name)));
}

function shaFromFile(path: string): string | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    if (path.endsWith('.json')) {
      const parsed = JSON.parse(raw) as { gitSha?: unknown };
      return normalizeHubCommit(typeof parsed.gitSha === 'string' ? parsed.gitSha : null);
    }
    return normalizeHubCommit(raw);
  } catch {
    return null;
  }
}

export function resolveHubCommit(cwd = process.cwd()): string | null {
  const fromEnv = normalizeHubCommit(process.env.ATLAS_HUB_COMMIT || process.env.HUB_GIT_SHA || '');
  if (fromEnv) return fromEnv;
  for (const path of nearbyMarkerFiles(cwd)) {
    const sha = shaFromFile(path);
    if (sha) return sha;
  }
  return null;
}

export type HubBuildMarker = {
  gitSha: string;
  branch?: string;
  builtAt?: string;
  source: 'file' | 'runtime';
};

export function resolveHubBuild(cwd = process.cwd()): HubBuildMarker | null {
  const files = nearbyMarkerFiles(cwd).filter((path) => path.endsWith('hub-build.json'));
  for (const path of files) {
    if (!existsSync(path)) continue;
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as {
        gitSha?: unknown;
        branch?: unknown;
        builtAt?: unknown;
      };
      const gitSha = normalizeHubCommit(typeof parsed.gitSha === 'string' ? parsed.gitSha : null);
      if (!gitSha) continue;
      return {
        gitSha,
        branch: typeof parsed.branch === 'string' ? parsed.branch : undefined,
        builtAt: typeof parsed.builtAt === 'string' ? parsed.builtAt : undefined,
        source: 'file',
      };
    } catch {
      continue;
    }
  }
  const commit = resolveHubCommit(cwd);
  if (!commit) return null;
  return { gitSha: commit, source: 'runtime' };
}
