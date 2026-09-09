#!/usr/bin/env node
/**
 * Hub typecheck gate for Atlas CI.
 *
 * Runs workspace typecheck and classifies every tsc error.
 * Fingerprints listed in scripts/ci/hub-typecheck-known-debt.txt are
 * HISTORICAL_DEBT (visible, non-blocking). Any other error fails the job.
 *
 * Fingerprint format: <path-relative-to-apps/atlas-integration-api>:<TSxxxx>
 * Example: src/pm/http.ts:TS2322
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const debtFile = path.join(root, 'scripts/ci/hub-typecheck-known-debt.txt');

function loadKnownDebt() {
  if (!fs.existsSync(debtFile)) return new Set();
  return new Set(
    fs
      .readFileSync(debtFile, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#')),
  );
}

function fingerprint(line) {
  // Match: path/to/file.ts(12,34): error TS1234:
  const m = line.match(
    /(?:^|\s)(?:.*?\/)?(?:apps\/atlas-integration-api\/)?([^\s:]+\.(?:ts|tsx))\(\d+,\d+\):\s*error\s+(TS\d+):/,
  );
  if (m) return `${m[1]}:${m[2]}`;
  const m2 = line.match(/([^\s:]+\.(?:ts|tsx)).*?\berror\s+(TS\d+)\b/);
  if (m2) return `${m2[1].replace(/^.*apps\/atlas-integration-api\//, '')}:${m2[2]}`;
  return null;
}

const known = loadKnownDebt();

const result = spawnSync(
  'npm',
  ['run', 'typecheck', '-w', '@hvcg/atlas-integration-api'],
  {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
    shell: false,
  },
);

const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(output);

const errorLines = output
  .split(/\r?\n/)
  .map((line) => line.trimEnd())
  .filter((line) => /\berror TS\d+\b/.test(line));

const historical = [];
const novel = [];

for (const line of errorLines) {
  const fp = fingerprint(line);
  if (fp && known.has(fp)) historical.push({ line, fp });
  else novel.push({ line, fp });
}

console.log('--- hub typecheck classification ---');
console.log(`HISTORICAL_DEBT count=${historical.length} (allowlisted fingerprints=${known.size})`);
if (novel.length) {
  console.log('NEW_TYPE_ERRORS:');
  for (const item of novel) console.log(`  [${item.fp ?? 'unparsed'}] ${item.line}`);
  process.exit(1);
}

console.log('NEW_TYPE_ERRORS: none');

if (result.status && result.status !== 0 && errorLines.length === 0) {
  console.error('tsc failed without parseable TS errors; failing closed.');
  process.exit(result.status);
}

process.exit(0);
