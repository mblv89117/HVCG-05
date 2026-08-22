#!/usr/bin/env node
/**
 * Directive 21 — complete OD-005 candidate revalidation (ATLAS + XSYS).
 *
 * Usage:
 *   node scripts/red-team/check-d21-od005-complete.mjs \
 *     --od005 /path/to/0bbfd87 \
 *     --hub /path/to/940a484
 *
 * Exit 0 = candidate ATLAS+XSYS patterns fixed; hub still shows live defects
 * Exit 2 = candidate missing remediation
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const od005 = arg('--od005');
const hub = arg('--hub');
if (!od005 || !hub) {
  console.error('usage: --od005 <candidate> --hub <940a484>');
  process.exit(1);
}

const rows = [];
function row(findingId, surface, sha, status, detail) {
  const r = { findingId, surface, sha, status, detail };
  rows.push(r);
  console.log(JSON.stringify(r));
}

const candSha = spawnSync('git', ['-C', od005, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const hubSha = spawnSync('git', ['-C', hub, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();

// ATLAS-01/02 via harness
const harness = path.join(__dirname, 'check-opportunity-staff-bypass.mjs');
const candH = spawnSync(process.execPath, [harness, od005], { encoding: 'utf8' });
const hubH = spawnSync(process.execPath, [harness, hub], { encoding: 'utf8' });
row('ATLAS-RT-20260820-01', 'CANDIDATE', candSha, candH.status === 0 ? 'FIXED_REVALIDATED' : 'OPEN', 'staff short-circuit absent');
row('ATLAS-RT-20260820-01', 'LIVE_PRODUCTION', hubSha, hubH.status === 0 ? 'NOT_REPRODUCIBLE' : 'OPEN', 'staff short-circuit present on Hub');
row('ATLAS-RT-20260820-02', 'CANDIDATE', candSha, candH.status === 0 ? 'FIXED_REVALIDATED' : 'OPEN', 'same canSeeOpportunity entitlement path');
row('ATLAS-RT-20260820-02', 'LIVE_PRODUCTION', hubSha, hubH.status === 0 ? 'NOT_REPRODUCIBLE' : 'OPEN', 'staff short-circuit enables foreign patch');

const plaidCand = fs.readFileSync(path.join(od005, 'apps/atlas-plaid-api/src/middleware/auth.ts'), 'utf8');
const plaidHubPath = path.join(hub, 'apps/atlas-plaid-api/src/middleware/auth.ts');
const plaidHub = fs.existsSync(plaidHubPath)
  ? fs.readFileSync(plaidHubPath, 'utf8')
  : fs.readFileSync(path.join(hub, 'apps/atlas-plaid-api/src/index.ts'), 'utf8');
const atlas03Cand =
  /jwtVerify/.test(plaidCand) && /requireVerifiedPrincipal/.test(plaidCand) && /missing_bearer/.test(plaidCand);
const atlas03HubFixed = /jwtVerify/.test(plaidHub) && /requireVerifiedPrincipal/.test(plaidHub);
row('ATLAS-RT-20260820-03', 'CANDIDATE', candSha, atlas03Cand ? 'FIXED_REVALIDATED' : 'OPEN', 'Plaid JWT / requireVerifiedPrincipal');
row(
  'ATLAS-RT-20260820-03',
  'LIVE_PRODUCTION',
  hubSha,
  atlas03HubFixed ? 'FIXED_REVALIDATED' : 'OPEN',
  'header-only principal auth on live Hub',
);

const httpC = fs.readFileSync(path.join(od005, 'apps/atlas-integration-api/src/website/http.ts'), 'utf8');
const authC = fs.readFileSync(path.join(od005, 'apps/atlas-integration-api/src/website/intakeAuth.ts'), 'utf8');
const leadsC = fs.readFileSync(path.join(od005, 'apps/atlas-integration-api/src/website/leads.ts'), 'utf8');
const httpH = fs.readFileSync(path.join(hub, 'apps/atlas-integration-api/src/website/http.ts'), 'utf8');
const leadsH = fs.readFileSync(path.join(hub, 'apps/atlas-integration-api/src/website/leads.ts'), 'utf8');

const xsys01Cand =
  /verifyWebsiteIntakeSignedRequest/.test(httpC) &&
  /HMAC-SHA256/.test(authC) &&
  /x-website-intake-signature/.test(authC) &&
  !/Auth is x-website-intake-key only/.test(httpC);
const xsys01HubOpen = /Auth is x-website-intake-key only/.test(httpH);
row('XSYS-RT-20260820-01', 'CANDIDATE', candSha, xsys01Cand ? 'FIXED_REVALIDATED' : 'OPEN', 'intake HMAC+key-id+timestamp');
row('XSYS-RT-20260820-01', 'LIVE_PRODUCTION', hubSha, xsys01HubOpen ? 'OPEN' : 'FIXED_REVALIDATED', 'key-only intake on Hub');

const xsys02Cand =
  /assertIdempotencyKeyBoundToSource/.test(leadsC) && /IDEMPOTENCY_PREFIX_MISMATCH/.test(leadsC);
const xsys02HubOpen =
  /if \(fromFull\) return clip\(fromFull/.test(leadsH) && !/assertIdempotencyKeyBoundToSource/.test(leadsH);
row('XSYS-RT-20260820-02', 'CANDIDATE', candSha, xsys02Cand ? 'FIXED_REVALIDATED' : 'OPEN', 'idempotency prefix binding');
row('XSYS-RT-20260820-02', 'LIVE_PRODUCTION', hubSha, xsys02HubOpen ? 'OPEN' : 'FIXED_REVALIDATED', 'unbound fullPayload.idempotencyKey');

const candOpen = rows.filter((r) => r.surface === 'CANDIDATE' && r.status === 'OPEN');
const liveOpen = rows.filter((r) => r.surface === 'LIVE_PRODUCTION' && r.status === 'OPEN');
console.log(JSON.stringify({ summary: { candidateOpen: candOpen.length, liveOpen: liveOpen.length } }, null, 2));
process.exit(candOpen.length ? 2 : 0);
