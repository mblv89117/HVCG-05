#!/usr/bin/env node
/**
 * Directive 18 probes — Revenue OS Elite commercial workspace @ tip.
 *
 * Usage:
 *   node scripts/red-team/check-d18-revenue-elite.mjs --elite /path/to/apps/atlas-elite-os
 *
 * Exit 0 = gates/route patterns present (does NOT mean P0/P1=0)
 * Exit 2 = missing required fail-closed patterns
 */
import fs from 'node:fs';
import path from 'node:path';

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
check('ROUTE_FINANCE', /FinanceRoute/.test(revenueRoute) && /RevenuePage/.test(revenueRoute), '/revenue behind FinanceRoute');

const readModel = fs.readFileSync(path.join(elite, 'src/pages/revenue/commercialReadModel.ts'), 'utf8');
check(
  'GATES_CLOSED',
  /liveDispatch:\s*false/.test(readModel) &&
    /autoSend:\s*false/.test(readModel) &&
    /autoProvisionAccess:\s*false/.test(readModel) &&
    /observationOnly:\s*true/.test(readModel),
  'commercial gates closed + observationOnly',
);

const workspace = fs.readFileSync(path.join(elite, 'src/pages/revenue/commercialWorkspace.ts'), 'utf8');
check(
  'OPERATOR_ACCEPT_AND_SEND_BLOCK',
  /Operator identity required/.test(workspace) &&
    /cannot auto-send/.test(workspace) &&
    /liveDispatch remains false/.test(workspace),
  'operator accept + BL-C1 send block',
);

check(
  'NO_ACCG01_REWRITE_SURFACE',
  !/ACCG01/.test(readModel) && !/ACCG01/.test(workspace),
  'ACCG01 absent from commercial read-model/workspace (no rewrite path)',
);

// Known P1 pattern — report, do not fail harness on presence
const deepLinkCosmetic =
  /opportunityId && opportunityId !== ACME_COMMERCIAL_READ_MODEL\.opportunityId/.test(readModel) &&
  /return \{ \.\.\.ACME_COMMERCIAL_READ_MODEL, opportunityId \}/.test(readModel);
console.log(
  JSON.stringify({
    id: 'REVOS-ELITE-RT-20260820-01',
    status: deepLinkCosmetic ? 'OPEN_P1' : 'ABSENT',
    detail: 'opportunityId deep-link cosmetic; clientCode/pricing remain ACME synthetic',
  }),
);

const fail = results.filter((r) => !r.ok);
console.log(JSON.stringify({ summary: { fail: fail.length, p1DeepLink: deepLinkCosmetic } }, null, 2));
process.exit(fail.length ? 2 : 0);
