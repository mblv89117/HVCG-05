#!/usr/bin/env node
/**
 * Live Capital governed attestation + recorded-only submit.
 * Uses the sequential operator workflow only. Does not print tokens.
 * Does not enable synthetic Graph. Does not send to lenders.
 *
 * Usage:
 *   HUB_TOKEN=... node ./deployment/scripts/Invoke-HVCGCapitalAttestationCert.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const base = (process.env.HUB_BASE || 'https://app-atlas-integration-hub.azurewebsites.net').replace(/\/$/, '');
const token = (process.env.HUB_TOKEN || '').trim();
if (!token) {
  console.error('HUB_TOKEN required (Hub API access token).');
  process.exit(2);
}

const preferredOppId = process.env.CAPITAL_OPP_ID || 'cap-c5e13811-a5e1-4d62-bf6c-0c6b12d51e27';
const preferredLender = process.env.CAPITAL_LENDER_ID || 'ln-catalog-bofa';
const results = {};
const failures = [];

function record(name, ok, extra) {
  results[name] = { ok, ...(extra || {}) };
  if (!ok) failures.push({ name, ...(extra || {}) });
}

async function hub(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (!('authorization' in headers) && token) headers.authorization = `Bearer ${token}`;
  if (init.json && !headers['content-type']) headers['content-type'] = 'application/json';
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const text = await res.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 240) };
    }
  }
  return { status: res.status, json };
}

function applicationsOf(detail) {
  return detail.applications || detail.applicationPackages || [];
}

const health = await hub('/health', { headers: { authorization: '' } });
record(
  'hub_health',
  health.status === 200 && health.json.ok === true && health.json.authRequired === true,
  { status: health.status, authRequired: health.json.authRequired },
);

const unauth = await hub('/api/capital/opportunities', { headers: { authorization: '' } });
record('unauthenticated_401', unauth.status === 401, { status: unauth.status });

let detail = await hub(`/api/capital/opportunities/${encodeURIComponent(preferredOppId)}`);
let oppId = preferredOppId;
if (detail.status !== 200) {
  const created = await hub('/api/capital/opportunities', {
    method: 'POST',
    json: {
      title: `SYNTHETIC QA Atlas Capital attestation ${new Date().toISOString()}`,
      clientCode: 'SYN01',
      transactionType: 'working_capital_loc',
      need: { requestedAmount: 250000, purpose: 'SYNTHETIC QA attestation — not a live client' },
      idempotencyKey: `cap-attest|SYN01|${new Date().toISOString()}`,
    },
  });
  record('live_create_fallback', created.status === 200, { status: created.status });
  oppId = created.json.opportunity?.id || created.json.id;
  detail = await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}`);
} else {
  record('reuse_existing_opportunity', true, { id: oppId });
}

const opp = detail.json.opportunity || {};
record(
  'opportunity_syn01',
  detail.status === 200 && opp.clientCode === 'SYN01',
  { status: detail.status, clientCode: opp.clientCode, stage: opp.stage },
);

let apps = applicationsOf(detail.json);
let pkg = apps.find((a) => a.lenderId === preferredLender) || apps[0];
let lenderId = pkg?.lenderId || preferredLender;

if (!pkg) {
  const prepared = await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}/application`, {
    method: 'POST',
    json: { lenderId: preferredLender },
  });
  record('application_prepare', prepared.status === 200, {
    status: prepared.status,
    attestation: prepared.json.application?.attestation,
  });
  pkg = prepared.json.application;
  lenderId = pkg?.lenderId || preferredLender;
} else {
  record('application_existing', true, { id: pkg.id, attestation: pkg.attestation });
}

if (pkg?.attestation === 'PREPARED') {
  const skip = await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}/application/attest`, {
    method: 'POST',
    json: { applicationId: pkg.id, lenderId, attestation: 'APPROVED_FOR_SUBMISSION' },
  });
  record('skip_to_approved_still_422', skip.status === 422, { status: skip.status });
}

const sequence = ['CLIENT_CONFIRMATION_REQUIRED', 'CLIENT_CONFIRMED', 'APPROVED_FOR_SUBMISSION'];
const startAt = sequence.indexOf(pkg?.attestation) + 1;
for (const attestation of sequence.slice(Math.max(0, startAt))) {
  const attested = await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}/application/attest`, {
    method: 'POST',
    json: { applicationId: pkg.id, lenderId, attestation },
  });
  const sendAttempted = attested.json.sendAttempted;
  record(`attest_${attestation}`, attested.status === 200 && sendAttempted === false, {
    status: attested.status,
    attestation: attested.json.application?.attestation,
    sendAttempted,
    message: attested.json.message || attested.json.error,
  });
  if (attested.status === 200) pkg = attested.json.application;
}

const sendBlocked = await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}/application/attest`, {
  method: 'POST',
  json: { applicationId: pkg.id, lenderId, attestation: 'CLIENT_CONFIRMED', send: true },
});
record('client_send_blocked', sendBlocked.status === 422, { status: sendBlocked.status });

if (opp.stage !== 'ReadyForSubmission' && opp.stage !== 'Submitted') {
  await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}/strategy`, { method: 'POST', json: {} });
  await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}/strategy/decision`, {
    method: 'POST',
    json: { decision: 'APPROVED' },
  });
  await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}/shortlist/decision`, {
    method: 'POST',
    json: { decision: 'APPROVED', lenderIds: [lenderId] },
  });
}

const submit = await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}/submissions`, {
  method: 'POST',
  json: {
    lenderId,
    applicationId: pkg.id,
    packageVersion: 'v1',
    confirmationNumber: 'SYN-ATTEST-20260820',
    externalSubmit: true,
  },
});
record(
  'recorded_only_submission',
  submit.status === 200 &&
    submit.json.recordedOnly === true &&
    submit.json.externalSubmit === false &&
    submit.json.externalSubmitAttempted === false,
  {
    status: submit.status,
    recordedOnly: submit.json.recordedOnly,
    externalSubmit: submit.json.externalSubmit,
    externalSubmitAttempted: submit.json.externalSubmitAttempted,
    created: submit.json.created,
    submissionId: submit.json.submission?.id,
    message: submit.json.message || submit.json.error,
  },
);

const replay = await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}/submissions`, {
  method: 'POST',
  json: { lenderId, applicationId: pkg.id, packageVersion: 'v1', externalSubmit: true },
});
record(
  'submission_idempotent_replay',
  replay.status === 200 && replay.json.created === false && replay.json.recordedOnly === true,
  {
    status: replay.status,
    created: replay.json.created,
    recordedOnly: replay.json.recordedOnly,
    submissionId: replay.json.submission?.id,
  },
);

const roundTrip = await hub(`/api/capital/opportunities/${encodeURIComponent(oppId)}`);
const submitted = (roundTrip.json.submissions || []).find((s) => s.status === 'submitted');
const interaction = (roundTrip.json.interactions || []).find((i) => i.interactionType === 'SUBMISSION_RECORDED');
const submittedPkg = applicationsOf(roundTrip.json).find((a) => a.id === pkg.id);
record(
  'durable_submitted_row',
  Boolean(submitted) &&
    (roundTrip.json.opportunity?.stage === 'Submitted' || opp.stage === 'Submitted'),
  {
    stage: roundTrip.json.opportunity?.stage,
    submissionId: submitted?.id,
    packageStatus: submittedPkg?.packageStatus,
    attestation: submittedPkg?.attestation,
    interaction: Boolean(interaction),
  },
);

const wildcard = await hub('/api/capital/opportunities', {
  method: 'POST',
  json: { title: 'x', clientCode: '*', transactionType: 'working_capital_loc', need: { requestedAmount: 1 } },
});
record('wildcard_rejected', wildcard.status === 422 || wildcard.status === 403, { status: wildcard.status });

const report = {
  ok: failures.length === 0,
  opportunityId: oppId,
  lenderId,
  applicationId: pkg?.id,
  failures,
  results,
  at: new Date().toISOString(),
};
mkdirSync('/opt/cursor/artifacts', { recursive: true });
writeFileSync('/opt/cursor/artifacts/syn01_capital_attestation_cert.json', JSON.stringify(report, null, 2));
writeFileSync(
  new URL('../artifacts/syn01-capital-attestation-cert.json', import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
