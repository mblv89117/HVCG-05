#!/usr/bin/env node
/**
 * Directive 16 probes — GTM tip move (Revenue OS consumer / SYN-GTM path).
 *
 * Usage:
 *   node scripts/red-team/check-d16-gtm.mjs --gtm /path/to/360-gtm-agent-system
 *
 * Exit 0 = GTM-RT-03/04 + consumer gates present
 * Exit 2 = remediation pattern missing
 */
import fs from 'node:fs';
import path from 'node:path';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const gtm = arg('--gtm');
if (!gtm) {
  console.error('usage: --gtm <checkout>');
  process.exit(1);
}

const results = [];
function check(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, status: ok ? 'FIXED' : 'OPEN_OR_FAIL', detail }));
}

const pause = fs.readFileSync(path.join(gtm, 'packages/flags/src/pause.ts'), 'utf8');
check(
  'GTM-RT-20260820-03',
  /evaluateUnifiedEmergencyPause/.test(pause) &&
    /outboundBlocked/.test(pause) &&
    /desync/.test(pause) &&
    /envEmergencyPauseGlobal \|\| dbGlobalPauseActive === true \|\| desync === true/.test(pause),
  'unified pause SoT fail-closed',
);

const form = fs.readFileSync(path.join(gtm, 'apps/web/app/_components/InquiryForm.tsx'), 'utf8');
const recv = fs.readFileSync(path.join(gtm, 'packages/gtm-agent/src/atlas/receive-inquiry.ts'), 'utf8');
check(
  'GTM-RT-20260820-04',
  /observationOnly:\s*true/.test(form) &&
    /liveDispatch:\s*false/.test(form) &&
    /360\|/.test(form) &&
    /liveDispatch_must_remain_false/.test(recv),
  'InquiryForm camelCase governance + receive liveDispatch=false',
);

const rev = fs.readFileSync(path.join(gtm, 'packages/gtm-agent/src/pricing/revenue-os.ts'), 'utf8');
const syn = fs.readFileSync(path.join(gtm, 'packages/gtm-agent/src/journey/synthetic.ts'), 'utf8');
check(
  'GTM-REVOS-CONSUMER',
  /requiresOperatorAccept:\s*z\.literal\(true\)/.test(rev) &&
    /autoSend:\s*z\.literal\(false\)/.test(rev) &&
    /liveDispatch:\s*false/.test(rev) &&
    /9c9c331d707e59c8e020f28bcaf75528bfe42927/.test(rev) &&
    /createRevenueOsCommercialClient/.test(syn) &&
    /revenue_os_operator_required/.test(syn),
  'Revenue OS consumer operator-accept + autoSend=false + tip pin',
);

const fail = results.filter((r) => !r.ok);
console.log(JSON.stringify({ summary: { fail: fail.length } }, null, 2));
process.exit(fail.length ? 2 : 0);
