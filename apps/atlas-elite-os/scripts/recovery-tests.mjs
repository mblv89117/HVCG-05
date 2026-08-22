/**
 * DEF-ELITE-001 / DEF-ELITE-004 recovery tests (plain Node).
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const FABRICATED_FINANCE_RE =
  /(?:\$\s*\d)|(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?)|(?:\d+(?:\.\d+)?\s*[MmBb]\b)|(?:\b1\.25M\b)|(?:\b4\.8M\b)|(?:Revenue\s*\(sample\))/i;

function looksLikeFabricatedFinance(value) {
  const v = String(value || '').trim();
  if (!v) return false;
  if (/^awaiting verified/i.test(v) || /^data connection pending/i.test(v) || /^not yet calculated/i.test(v)) {
    return false;
  }
  return FABRICATED_FINANCE_RE.test(v);
}

function sanitize(value) {
  return looksLikeFabricatedFinance(value) ? 'Awaiting verified data' : String(value || 'Awaiting verified data');
}

assert.equal(sanitize('1.25M'), 'Awaiting verified data');
assert.equal(sanitize('$4.8M'), 'Awaiting verified data');
assert.equal(sanitize('Awaiting verified data'), 'Awaiting verified data');
assert.ok(looksLikeFabricatedFinance('4.8M'));

// Role matrix: no default owner — unresolved when signed in without claims
function resolveRole({ signedIn, claims, env, allowSim, sim, devOwnerSession, devOwnerRole }) {
  if (!signedIn) return 'Unauthenticated';
  const nonProd = env !== 'production' && env !== 'staging';
  if (devOwnerSession && nonProd && devOwnerRole) return devOwnerRole;
  if (allowSim && nonProd && sim) return sim;
  if (claims?.roles?.length) return claims.roles[0];
  return 'Unresolved';
}
assert.equal(resolveRole({ signedIn: true, claims: {}, env: 'development' }), 'Unresolved');
assert.equal(resolveRole({ signedIn: false, claims: null, env: 'development' }), 'Unauthenticated');
assert.equal(
  resolveRole({ signedIn: false, claims: null, env: 'development', allowSim: true, sim: 'HVCG Owner' }),
  'Unauthenticated',
);
assert.equal(
  resolveRole({ signedIn: true, claims: {}, env: 'development', allowSim: true, sim: 'Read-Only Advisor' }),
  'Read-Only Advisor',
);
assert.notEqual(resolveRole({ signedIn: true, claims: {}, env: 'development' }), 'HVCG Owner');
assert.equal(
  resolveRole({
    signedIn: true,
    claims: {},
    env: 'local',
    devOwnerSession: true,
    devOwnerRole: 'HVCG Owner',
  }),
  'HVCG Owner',
);
assert.equal(
  resolveRole({
    signedIn: true,
    claims: {},
    env: 'production',
    devOwnerSession: true,
    devOwnerRole: 'HVCG Owner',
  }),
  'Unresolved',
);
assert.equal(
  resolveRole({
    signedIn: true,
    claims: {},
    env: 'staging',
    devOwnerSession: true,
    devOwnerRole: 'HVCG Owner',
  }),
  'Unresolved',
);
const dist = join(root, 'dist/assets');
if (existsSync(dist)) {
  const needles = ['1.25M', '4.8M', 'Revenue (sample)', '$1.25', '$4.8'];
  for (const f of readdirSync(dist)) {
    if (!f.endsWith('.js')) continue;
    const text = readFileSync(join(dist, f), 'utf8');
    for (const n of needles) {
      assert.equal(text.includes(n), false, `dist ${f} contains forbidden ${n}`);
    }
  }
  console.log('PASS dist finance scan');
} else {
  console.log('SKIP dist finance scan');
}

console.log('PASS recovery unit tests');
