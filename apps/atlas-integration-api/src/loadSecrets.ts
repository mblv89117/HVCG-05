/**
 * Load gitignored secrets into process.env before config reads.
 * Preferred path: <repo>/.secrets/integration.env
 * Never logs secret values.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function moduleDir(): string {
  try {
    const url = import.meta.url;
    if (typeof url === 'string' && url.startsWith('file:')) return dirname(fileURLToPath(url));
  } catch {
    /* bundled CJS has no import.meta.url */
  }
  return process.cwd();
}

const CANDIDATES = [
  // repo root .secrets (preferred)
  join(moduleDir(), '..', '..', '..', '.secrets', 'integration.env'),
  // app-local override
  join(moduleDir(), '..', '.secrets', 'integration.env'),
  join(moduleDir(), '..', '.env'),
];

export function loadSecretsFile(): { loadedFrom: string | null; keysLoaded: number } {
  for (const candidate of CANDIDATES) {
    const path = resolve(candidate);
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, 'utf8');
    let keysLoaded = 0;
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!key) continue;
      // Do not override explicitly exported shell env
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value;
        keysLoaded++;
      }
    }
    return { loadedFrom: path, keysLoaded };
  }
  return { loadedFrom: null, keysLoaded: 0 };
}
