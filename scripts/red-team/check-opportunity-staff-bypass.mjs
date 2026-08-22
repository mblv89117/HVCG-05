#!/usr/bin/env node
/**
 * Red-team static check for ATLAS-RT-20260820-01.
 * Exit 2 = staff short-circuit still present (open finding).
 * Exit 0 = short-circuit pattern not found (candidate for closure retest).
 * Exit 1 = usage / IO error.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || process.cwd();
const target = path.join(
  root,
  'apps/atlas-integration-api/src/pm/sharepoint/repository.ts',
);

if (!fs.existsSync(target)) {
  console.error(`missing file: ${target}`);
  process.exit(1);
}

const src = fs.readFileSync(target, 'utf8');
const fnMatch = src.match(
  /private canSeeOpportunity\([\s\S]*?\n  \}/,
);
if (!fnMatch) {
  console.error('could not locate canSeeOpportunity');
  process.exit(1);
}

const body = fnMatch[0];
const staffBypass =
  /if\s*\(\s*isInternalStaff\(\s*principal\s*\)\s*\)\s*return\s+true\s*;/.test(
    body,
  );

console.log(
  JSON.stringify(
    {
      finding: 'ATLAS-RT-20260820-01',
      file: target,
      staffShortCircuitPresent: staffBypass,
      status: staffBypass ? 'OPEN_DEFECT' : 'PATTERN_ABSENT_RETEST_REQUIRED',
    },
    null,
    2,
  ),
);

process.exit(staffBypass ? 2 : 0);
