#!/usr/bin/env node
/**
 * Hub typecheck gate for Atlas CI.
 *
 * Runs `npm run typecheck -w @hvcg/atlas-integration-api` and classifies
 * every tsc error. Known historical debt is printed and does not fail the
 * job. Any other type error fails the job. This is not continue-on-error:
 * new errors still exit 1.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const KNOWN_DEBT = [
  {
    id: 'HUB-TS2367-pm-http-361',
    classification: 'HISTORICAL_DEBT',
    match: (line) =>
      /pm\/http\.ts\(361\b/.test(line) && /\berror TS2367\b/.test(line),
    note: 'Known Hub typecheck debt at apps/atlas-integration-api/src/pm/http.ts:361 (TS2367). Visible in logs; not a pass-through for new errors.',
  },
];

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
  const known = KNOWN_DEBT.find((entry) => entry.match(line));
  if (known) historical.push({ line, ...known });
  else novel.push(line);
}

console.log('--- hub typecheck classification ---');
if (historical.length) {
  for (const item of historical) {
    console.log(`${item.classification} ${item.id}: ${item.line}`);
    console.log(`  ${item.note}`);
  }
} else {
  console.log(
    'HISTORICAL_DEBT HUB-TS2367-pm-http-361: not present on this SHA (cleared or moved)',
  );
}

if (novel.length) {
  console.log('NEW_TYPE_ERRORS:');
  for (const line of novel) console.log(`  ${line}`);
  process.exit(1);
}

console.log('NEW_TYPE_ERRORS: none');

if (result.status && result.status !== 0 && errorLines.length === 0) {
  console.error('tsc failed without parseable TS errors; failing closed.');
  process.exit(result.status);
}

process.exit(0);
