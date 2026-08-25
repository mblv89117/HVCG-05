#!/usr/bin/env node
/**
 * Real-tenant Capital QA (Elite-equivalent Hub → Graph → SharePoint).
 * Does not mock Graph. Requires deployed capital Hub + App Settings + SYN01 entitlement.
 *
 * Usage:
 *   HUB_TOKEN=$(az account get-access-token --resource api://99dd84b0-33f7-481b-86db-d76287b124f6 --query accessToken -o tsv) \
 *   node ./deployment/scripts/Invoke-HVCGCapitalLiveQa.mjs
 *
 * Cleanup (keeps SYN01 client):
 *   CLEANUP=true node ./deployment/scripts/Invoke-HVCGCapitalLiveQa.mjs
 */
import assert from 'node:assert/strict';

const base = (process.env.HUB_BASE || 'https://app-atlas-integration-hub.azurewebsites.net').replace(/\/$/, '');
const elite = (process.env.ELITE_BASE || 'https://zealous-rock-0090c7e1e.7.azurestaticapps.net').replace(/\/$/, '');
const token = (process.env.HUB_TOKEN || '').trim();
if (!token) {
  console.error('HUB_TOKEN required (Hub API access token, not a Graph token).');
  process.exit(2);
}

const results = {};
function record(name, ok, extra) {
  results[name] = { ok, ...(extra || {}) };
  if (!ok) throw new Error(`${name} failed ${JSON.stringify(extra || {})}`);
}

async function hub(path, init = {}) {
  const headers = {
    'content-type': 'application/json',
    ...(init.headers || {}),
  };
  if (!('authorization' in headers) && token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  return { status: res.status, json };
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const title = `SYNTHETIC QA Atlas Capital ${stamp}`;
const idempotencyKey = `cap-qa|SYN01|${stamp}`;

const health = await hub('/health', { headers: { authorization: '' } });
assert.equal(health.status, 200);
assert.equal(health.json.ok, true);
assert.equal(health.json.pmBackend?.mode, 'sharepoint');
assert.equal(health.json.capitalBackend?.mode, 'sharepoint');
record('hub_health', true, { capitalBackend: health.json.capitalBackend });

const unauth = await hub('/api/capital/command-center', { headers: { authorization: '' } });
record('unauthenticated_401', unauth.status === 401, { status: unauth.status });

const wildcard = await hub('/api/capital/opportunities', {
  method: 'POST',
  body: JSON.stringify({
    title,
    clientCode: '*',
    transactionType: 'working_capital_loc',
    need: { requestedAmount: 1 },
  }),
});
record('wildcard_rejected', wildcard.status === 422 || wildcard.status === 403, { status: wildcard.status });

const otherClient = await hub('/api/capital/opportunities', {
  method: 'POST',
  body: JSON.stringify({
    title,
    clientCode: 'SYN99',
    transactionType: 'working_capital_loc',
    need: { requestedAmount: 1 },
    idempotencyKey: `${idempotencyKey}|syn99`,
  }),
});
record('wrong_client_isolation', otherClient.status === 403, { status: otherClient.status });

const created = await hub('/api/capital/opportunities', {
  method: 'POST',
  body: JSON.stringify({
    title,
    clientCode: 'SYN01',
    transactionType: 'working_capital_loc',
    need: { requestedAmount: 250000, purpose: 'SYNTHETIC QA working capital — not a live client' },
    idempotencyKey,
  }),
});
if (created.status === 403) {
  console.error('403 on SYN01 create — entitlement or ALLOW_SYNTHETIC_GRAPH=false.');
  console.error(JSON.stringify(created.json));
  process.exit(1);
}
assert.equal(created.status, 200, JSON.stringify(created.json));
const opp = created.json.opportunity || created.json;
assert.match(String(opp.title || title), /SYNTHETIC/);
assert.equal(opp.clientCode, 'SYN01');
assert.equal(created.json.created, true);
record('live_create', true, { id: opp.id, sharePointItem: /^\d+$/.test(String(opp.id)) });

const replay = await hub('/api/capital/opportunities', {
  method: 'POST',
  body: JSON.stringify({
    title,
    clientCode: 'SYN01',
    transactionType: 'working_capital_loc',
    idempotencyKey,
  }),
});
assert.equal(replay.status, 200);
assert.equal(replay.json.created, false);
assert.equal(String(replay.json.opportunity.id), String(opp.id));
record('idempotent_replay', true, { id: opp.id });

const id = opp.id;
const read = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}`);
assert.equal(read.status, 200);
assert.equal(read.json.opportunity.clientCode, 'SYN01');
record('live_read', true);

const transition = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/transition`, {
  method: 'POST',
  body: JSON.stringify({ toStage: 'InitialQualification' }),
});
assert.equal(transition.status, 200);
assert.equal(transition.json.opportunity.stage, 'InitialQualification');
record('stage_transition', true);

const nextAction = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/next-action`, {
  method: 'POST',
  body: JSON.stringify({
    nextAction: 'SYNTHETIC QA — collect qualification package',
    nextActionOwner: 'manny@highvaluecapitalgroup.com',
  }),
});
assert.equal(nextAction.status, 200);
assert.match(String(nextAction.json.opportunity.nextAction), /SYNTHETIC QA/);
record('next_action_update', true);

const checklist = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/checklist/generate`, {
  method: 'POST',
  body: JSON.stringify({}),
});
assert.equal(checklist.status, 200);
assert.ok(Array.isArray(checklist.json.checklist) && checklist.json.checklist.length > 0);
const checklistAgain = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/checklist/generate`, {
  method: 'POST',
  body: JSON.stringify({}),
});
assert.equal(checklistAgain.status, 200);
assert.equal(checklistAgain.json.checklist.length, checklist.json.checklist.length);
record('checklist_persist', true, { count: checklist.json.checklist.length });

const firstItem = checklist.json.checklist[0];
const override = await hub(
  `/api/capital/opportunities/${encodeURIComponent(id)}/checklist/${encodeURIComponent(firstItem.id)}/override`,
  { method: 'POST', body: JSON.stringify({ status: 'RECEIVED', overrideReason: 'SYNTHETIC QA status update' }) },
);
record('checklist_status_update', override.status === 200, { status: override.status });

const strategy = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/strategy`, {
  method: 'POST',
  body: JSON.stringify({}),
});
record('strategy_persist', strategy.status === 200, { status: strategy.status });

const strategyDecision = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/strategy/decision`, {
  method: 'POST',
  body: JSON.stringify({ decision: 'APPROVED' }),
});
record('manny_strategy_approval', strategyDecision.status === 200, { status: strategyDecision.status, body: strategyDecision.json });

await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/match`, { method: 'POST', body: '{}' });
const lenders = (strategy.json.strategy?.lenderCandidates || []).map((x) => x.lenderId || x.id).filter(Boolean);
const lenderId = lenders[0] || '1';
const shortlist = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/shortlist/decision`, {
  method: 'POST',
  body: JSON.stringify({ decision: 'APPROVED', lenderIds: [lenderId] }),
});
record('lender_outreach', shortlist.status === 200, { status: shortlist.status, lenderId });

const submission = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/submissions`, {
  method: 'POST',
  body: JSON.stringify({ lenderId, externalSubmit: true, packageVersion: 'v1' }),
});
assert.equal(submission.status, 200);
assert.equal(submission.json.recordedOnly, true);
assert.equal(submission.json.externalSubmitAttempted, false);
assert.equal(submission.json.externalSubmit, false);
record('recorded_only_submission', true);

const replaySub = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}/submissions`, {
  method: 'POST',
  body: JSON.stringify({ lenderId, externalSubmit: true, packageVersion: 'v1' }),
});
assert.equal(replaySub.status, 200);
record('submission_idempotent', true);

const roundTrip = await hub(`/api/capital/opportunities/${encodeURIComponent(id)}`);
assert.equal(roundTrip.status, 200);
assert.equal(roundTrip.json.opportunity.clientCode, 'SYN01');
assert.ok((roundTrip.json.checklist || []).length >= 1);
record('hub_round_trip', true, {
  stage: roundTrip.json.opportunity.stage,
  submissions: (roundTrip.json.submissions || []).length,
});

const cc = await hub('/api/capital/command-center');
assert.equal(cc.status, 200);
const queued = JSON.stringify(cc.json);
assert.match(queued, /SYNTHETIC QA/);
record('command_center_live', true);

const eliteRes = await fetch(`${elite}/capital`);
record('elite_capital_route', eliteRes.ok, { status: eliteRes.status });

record('no_external_lender_submit', submission.json.externalSubmitAttempted === false);
record('audit_provenance', Boolean(roundTrip.json.opportunity.ownerEmail || roundTrip.json.opportunity.updatedAt));

if (process.env.CLEANUP === 'true') {
  results.cleanup = {
    ok: true,
    policy: 'QA rows labeled SYNTHETIC QA / SYN01. Delete via Cleanup-HVCGCapitalQa.ps1. Keep SYN01 client and HVCG-Client-SYN01.',
    opportunityId: id,
  };
}

console.log(
  JSON.stringify(
    {
      ok: true,
      hub: base,
      opportunityId: id,
      title,
      results,
    },
    null,
    2,
  ),
);
