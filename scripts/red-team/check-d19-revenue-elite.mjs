#!/usr/bin/env node
/**
 * Directive 19 probes — Revenue Elite tip after REVOS-ELITE-RT-20260820-01 fix.
 *
 * Usage:
 *   node scripts/red-team/check-d19-revenue-elite.mjs --elite /path/to/apps/atlas-elite-os
 *
 * Exit 0 = gates + P1 fail-closed present
 * Exit 2 = missing remediation
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const elite = arg('--elite');
if (!elite) {
  console.error('usage: --elite <apps/atlas-elite-os checkout>');
  process.exit(1);
}

const results = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, status: ok ? 'PASS' : 'FAIL', detail }));
}

const app = fs.readFileSync(path.join(elite, 'src/App.tsx'), 'utf8');
const revenueRoute = app.slice(app.indexOf('path="revenue"'), app.indexOf('path="clients"'));
check('ROUTE_FINANCE', /FinanceRoute/.test(revenueRoute), '/revenue behind FinanceRoute');

const readModel = fs.readFileSync(path.join(elite, 'src/pages/revenue/commercialReadModel.ts'), 'utf8');
check(
  'GATES_CLOSED',
  /liveDispatch:\s*false/.test(readModel) && /autoSend:\s*false/.test(readModel),
  'commercial gates closed',
);

const oldCosmetic =
  /return \{ \.\.\.ACME_COMMERCIAL_READ_MODEL, opportunityId \}/.test(readModel);
check(
  'REVOS-ELITE-RT-20260820-01',
  !oldCosmetic &&
    /LOADED_COMMERCIAL_CONTEXTS/.test(readModel) &&
    /Fail closed/.test(readModel) &&
    /does not match loaded commercial context/.test(readModel),
  'P1 fail-closed opportunity/ClientCode binding',
);

check(
  'NO_ACCG01_LOADED_CONTEXT',
  !/ACCG01['"]:\s*\{/.test(readModel) && /no ACCG01 writes/.test(readModel),
  'ACCG01 not a loaded commercial context',
);

const workspace = fs.readFileSync(path.join(elite, 'src/pages/revenue/commercialWorkspace.ts'), 'utf8');
check(
  'SEND_BLOCK',
  /cannot auto-send/.test(workspace) && /liveDispatch remains false/.test(workspace),
  'BL-C1 send block',
);

// Execute regression unit test if tsx available
const testFile = path.join(elite, 'src/pages/revenue/commercialReadModel.rt-20260820-01.test.ts');
if (fs.existsSync(testFile)) {
  const r = spawnSync('npx', ['tsx', '--test', testFile], { cwd: elite, encoding: 'utf8' });
  check('P1_UNIT_TEST', r.status === 0, `tsx --test rt-20260820-01 exit=${r.status}`);
}

const fail = results.filter((x) => !x.ok);
console.log(JSON.stringify({ summary: { fail: fail.length } }, null, 2));
process.exit(fail.length ? 2 : 0);
