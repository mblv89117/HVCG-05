#!/usr/bin/env node
/**
 * Directive 15 probes — OD-005 Atlas candidate + XSYS residual checks.
 *
 * Usage:
 *   node scripts/red-team/check-d15-od005.mjs --od005 /path/to/atlas-security-patch-od005
 *
 * Exit 0 = ATLAS-01/02/03 patterns fixed on candidate
 * Exit 2 = expected remediations missing OR XSYS still open (reported; exit 2 only for ATLAS miss)
 * Exit 3 = XSYS still open on candidate (informational fail for XSYS-only)
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
if (!od005) {
  console.error('usage: --od005 <checkout>');
  process.exit(1);
}

const results = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, status: ok ? 'FIXED_ON_CANDIDATE' : 'OPEN', detail }));
}

// ATLAS-01/02 via existing harness
const harness = path.join(__dirname, 'check-opportunity-staff-bypass.mjs');
const r = spawnSync(process.execPath, [harness, od005], { encoding: 'utf8' });
const atlas12ok = r.status === 0;
check('ATLAS-RT-20260820-01', atlas12ok, 'staff short-circuit absent');
check('ATLAS-RT-20260820-02', atlas12ok, 'same canSeeOpportunity path');

const plaidAuth = fs.readFileSync(path.join(od005, 'apps/atlas-plaid-api/src/middleware/auth.ts'), 'utf8');
check(
  'ATLAS-RT-20260820-03',
  /jwtVerify/.test(plaidAuth) && /requireVerifiedPrincipal/.test(plaidAuth) && /missing_bearer/.test(plaidAuth),
  'Plaid Bearer JWT gate',
);

const http = fs.readFileSync(path.join(od005, 'apps/atlas-integration-api/src/website/http.ts'), 'utf8');
const leads = fs.readFileSync(path.join(od005, 'apps/atlas-integration-api/src/website/leads.ts'), 'utf8');
const xsys01open = /Auth is x-website-intake-key only/.test(http) && !/body.?hmac|X-Atlas-Signature|verifyIntakeBody/i.test(http);
const xsys02open = /const fromFull = asString\(full\.idempotencyKey\);\s*\n\s*if \(fromFull\) return clip\(fromFull/.test(leads);
check('XSYS-RT-20260820-01', !xsys01open, xsys01open ? 'intake key only — still open' : 'body authenticity present');
check('XSYS-RT-20260820-02', !xsys02open, xsys02open ? 'unbound fullPayload.idempotencyKey — still open' : 'prefix binding present');

const atlasFail = results.filter((x) => x.id.startsWith('ATLAS') && !x.ok);
const xsysOpen = results.filter((x) => x.id.startsWith('XSYS') && !x.ok);
console.log(JSON.stringify({ summary: { atlasFail: atlasFail.length, xsysStillOpen: xsysOpen.length } }, null, 2));
if (atlasFail.length) process.exit(2);
if (xsysOpen.length) process.exit(3);
process.exit(0);
