#!/usr/bin/env node
/**
 * Directive 20 probes — Revenue OS candidate-only Dev SharePoint adapters.
 *
 * Usage:
 *   node scripts/red-team/check-d20-revenue-adapters.mjs --revenue /path/to/hvcg-05@e9b3be8
 *
 * Exit 0 = required fail-closed / fixture patterns present
 * Exit 2 = missing remediation
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const revenue = arg('--revenue');
if (!revenue) {
  console.error('usage: --revenue <hvcg-05 checkout at adapter tip>');
  process.exit(1);
}

const results = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, status: ok ? 'PASS' : 'FAIL', detail }));
}

const adapters = fs.readFileSync(path.join(revenue, 'src/revenue_os/sharepoint_adapters.py'), 'utf8');
const gates = fs.readFileSync(path.join(revenue, 'src/revenue_os/gates.py'), 'utf8');

check(
  'LISTS',
  /LIST_PROPOSALS = "HVCG_Proposals"/.test(adapters) && /LIST_ENGAGEMENTS = "HVCG_Engagements"/.test(adapters),
  'targets frozen HVCG_Proposals / HVCG_Engagements',
);
check(
  'CLIENTCODE_SCOPED',
  /ClientCode-scoped/.test(adapters) && /assert_writable_context/.test(adapters),
  'ClientCode-scoped fail-closed',
);
check(
  'UNMATCHED_OPP',
  /No loaded commercial context for opportunity/.test(adapters) && /opp-accg-expansion-001/.test(
    fs.readFileSync(path.join(revenue, 'tests/revenue_os/test_sharepoint_adapters.py'), 'utf8'),
  ),
  'unmatched opportunity fail-closed covered by tests',
);
check(
  'ACCG01_REFUSE',
  /LOCKED_CLIENT_CODES = frozenset\(\{"ACCG01"\}\)/.test(adapters) && /ACCG01 writes are forbidden/.test(adapters),
  'ACCG01 writes forbidden',
);
check(
  'FIXTURE_ONLY',
  /LIVE_GRAPH_WRITES:\s*Final\[bool\]\s*=\s*False/.test(gates) &&
    /mode": "fixture"/.test(adapters) &&
    /liveGraphWrite": False/.test(adapters),
  'liveGraphWrites=false / fixture-only',
);
check(
  'NO_SCHEMA_THAW_HELPER',
  /schema thaw refused/.test(adapters) && /frozen_column_names/.test(adapters),
  'unknown columns refused against frozen list schema',
);

// Elite P1 still fixed on same tip tree
const eliteRm = path.join(revenue, 'apps/atlas-elite-os/src/pages/revenue/commercialReadModel.ts');
const rm = fs.readFileSync(eliteRm, 'utf8');
const oldCosmetic = /return \{ \.\.\.ACME_COMMERCIAL_READ_MODEL, opportunityId \}/.test(rm);
check(
  'REVOS-ELITE-RT-20260820-01',
  !oldCosmetic && /LOADED_COMMERCIAL_CONTEXTS/.test(rm) && /Fail closed/.test(rm),
  'Elite P1 fail-closed still present',
);

const py = spawnSync(
  'python3',
  ['-m', 'unittest', 'tests.revenue_os.test_sharepoint_adapters', '-v'],
  { cwd: revenue, encoding: 'utf8' },
);
check('ADAPTER_UNIT_TESTS', py.status === 0, `unittest exit=${py.status}`);

const fail = results.filter((r) => !r.ok);
console.log(JSON.stringify({ summary: { fail: fail.length } }, null, 2));
process.exit(fail.length ? 2 : 0);
