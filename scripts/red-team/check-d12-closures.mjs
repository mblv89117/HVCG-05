#!/usr/bin/env node
/**
 * Red-team static probes for findings closed on product tips (Directive 12).
 * Does not mutate product repos — read-only checkout paths via argv.
 *
 * Usage:
 *   node scripts/red-team/check-d12-closures.mjs \
 *     --gcc /path/to/gcc@41a59b8 \
 *     --copilot /path/to/copilot@19a200e
 *
 * Exit 0 = all expected remediations present
 * Exit 2 = one or more still open
 */
import fs from 'node:fs';
import path from 'node:path';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const gccRoot = arg('--gcc');
const copilotRoot = arg('--copilot');
const results = [];

function check(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, status: ok ? 'FIXED_PATTERN_PRESENT' : 'OPEN_OR_MISSING', detail }));
}

if (gccRoot) {
  const tenant = fs.readFileSync(path.join(gccRoot, 'src/app/api/tenant/route.ts'), 'utf8');
  check(
    'GCC-RT-20260820-05',
    /requireApiAccess\(\)/.test(tenant) &&
      /selectOrganizationId/.test(tenant) &&
      !/requireApiAccess\(requested \? \{ organizationId: requested \}/.test(tenant),
    'tenant route session-authoritative',
  );
  check(
    'GCC-RT-20260820-06',
    /requirePermission\(access,\s*"financials:read"\)/.test(tenant),
    'tenant requires financials:read',
  );
  const handoff = fs.readFileSync(
    path.join(gccRoot, 'src/app/api/handoff/atlas-activation/route.ts'),
    'utf8',
  );
  check(
    'GCC-RT-20260820-07',
    /verifyAtlasHandoffAttestation/.test(handoff) && /handoff_attestation_required/.test(handoff),
    'HMAC attestation gate present',
  );
}

if (copilotRoot) {
  const store = fs.readFileSync(path.join(copilotRoot, 'src/lib/store/index.ts'), 'utf8');
  const start = fs.readFileSync(path.join(copilotRoot, 'src/app/api/auth/start/route.ts'), 'utf8');
  check(
    'COPILOT-RT-20260820-02',
    /WORKSPACES_DIR/.test(store) &&
      /GLOBAL_STORE_WRITE_FORBIDDEN/.test(store) &&
      /newWorkspaceId\(\)/.test(start) &&
      /writeStore\(store,\s*workspaceId\)/.test(start),
    'per-session workspace store',
  );
}

const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ summary: { checked: results.length, failed: failed.length } }, null, 2));
process.exit(failed.length ? 2 : 0);
