#!/usr/bin/env node
/**
 * Live recert: reused Lead company promotes to Prospect; SYN01 stays Active Client.
 * Does not activate the new fixture. Does not mutate ACCG01. Does not print secrets.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const base = (process.env.HUB_BASE || 'https://app-atlas-integration-hub.azurewebsites.net').replace(/\/$/, '');
const token = (process.env.HUB_TOKEN || '').trim();
const intakeKey = (process.env.WEBSITE_INTAKE_KEY || '').trim();
if (!token || !intakeKey) {
  console.error('HUB_TOKEN and WEBSITE_INTAKE_KEY required');
  process.exit(2);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const clientCode = `SYNT${stamp.replace(/\D/g, '').slice(-2)}`.slice(0, 6);
const displayName = `SYNTHETIC QA — Convert Stage ${stamp}`;
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

const health = await hub('/health', { headers: { authorization: '' } });
record('hub_health', health.status === 200 && health.json.ok === true && health.json.authRequired === true, {
  status: health.status,
  insecureDevAuth: health.json.insecureDevAuth,
});

const syn01 = await hub('/api/pm/clients/SYN01');
record(
  'syn01_still_active_client',
  syn01.status === 200 && syn01.json.client?.clientStage === 'Active Client',
  { status: syn01.status, clientStage: syn01.json.client?.clientStage },
);

const accg = await hub('/api/pm/clients/ACCG01');
record('accg01_get_only', accg.status === 200 || accg.status === 403 || accg.status === 404, {
  status: accg.status,
});

const created = await hub('/api/pm/clients', {
  method: 'POST',
  json: {
    ClientCode: clientCode,
    displayName,
    clientStage: 'Lead',
    provenanceSource: 'synthetic-qa-convert-stage',
    idempotencyKey: `client-cert|${clientCode}|convert-stage`,
  },
});
record(
  'fixture_created_as_lead',
  created.status === 200 && created.json.client?.clientCode === clientCode && created.json.client?.clientStage === 'Lead',
  {
    status: created.status,
    clientCode: created.json.client?.clientCode,
    clientStage: created.json.client?.clientStage,
    message: created.json.message || created.json.error,
  },
);

const intakeBody = {
  type: 'hvcg_website_lead',
  leadId: `convert-stage-${stamp}`,
  correlationId: `convert-stage-${stamp}`,
  submissionType: 'Website-EVA',
  source: 'Website-EVA',
  testLabel: 'SYNTHETIC QA convert-stage — not a live client',
  contact: {
    name: 'SYNTHETIC QA Convert Operator',
    email: `convert.stage.${stamp.replace(/[^0-9A-Za-z]/g, '').slice(0, 18)}@synthetic.invalid`,
    company: displayName,
    phone: '0000000000',
  },
  fullPayload: {
    idempotencyKey: `website|convert-stage|${stamp}`,
    company: { legalName: displayName },
    eva: { band: 'C', composite_score_proxy: 40, recommended_sku: 'SKU-ASSESS' },
  },
};
const intake = await hub('/api/website/leads', {
  method: 'POST',
  headers: { authorization: '', 'content-type': 'application/json', 'x-website-intake-key': intakeKey },
  json: intakeBody,
});
record('website_intake', intake.status === 201 || intake.status === 200, {
  status: intake.status,
  itemId: intake.json.itemId,
});
const leadId = intake.json.itemId;

const got = await hub(`/api/pm/leads/${encodeURIComponent(leadId)}`);
const converted = await hub(`/api/pm/leads/${encodeURIComponent(leadId)}/convert`, {
  method: 'POST',
  headers: { 'if-match': got.json.lead?.etag, 'content-type': 'application/json' },
  json: {},
});
record(
  'convert_reused_lead_to_prospect',
  converted.status === 200 &&
    converted.json.company?.reused === true &&
    converted.json.company?.clientCode === clientCode &&
    converted.json.company?.clientStage === 'Prospect',
  {
    status: converted.status,
    reused: converted.json.company?.reused,
    clientCode: converted.json.company?.clientCode,
    clientStage: converted.json.company?.clientStage,
    opportunityId: converted.json.opportunity?.id,
    message: converted.json.message || converted.json.error,
  },
);

const replay = await hub(`/api/pm/leads/${encodeURIComponent(leadId)}/convert`, {
  method: 'POST',
  json: {},
});
record(
  'convert_replay_stays_prospect',
  replay.status === 200 && replay.json.replay === true && replay.json.company?.clientStage === 'Prospect',
  { status: replay.status, replay: replay.json.replay, clientStage: replay.json.company?.clientStage },
);

const after = await hub(`/api/pm/clients/${encodeURIComponent(clientCode)}`);
record(
  'fixture_not_entitled_get_is_404',
  after.status === 404,
  {
    status: after.status,
    note: 'SYNT* is not in INTEGRATION_CLIENT_ENTITLEMENT_GROUPS. Convert response is the stage proof; GET 404 is correct isolation.',
  },
);
record(
  'fixture_now_prospect_not_activated',
  converted.json.company?.clientStage === 'Prospect' && converted.json.company?.clientCode === clientCode,
  { clientStage: converted.json.company?.clientStage, getStatus: after.status },
);

const syn01After = await hub('/api/pm/clients/SYN01');
record(
  'syn01_unchanged_active',
  syn01After.status === 200 && syn01After.json.client?.clientStage === 'Active Client',
  { clientStage: syn01After.json.client?.clientStage },
);

const oppId = converted.json.opportunity?.id;
if (oppId) {
  const opp = await hub(`/api/pm/opportunities/${encodeURIComponent(oppId)}`);
  const flagged = await hub(`/api/pm/opportunities/${encodeURIComponent(oppId)}`, {
    method: 'PATCH',
    headers: { 'if-match': opp.json.opportunity?.etag, 'content-type': 'application/json' },
    json: { requiresExecutiveAttention: true, nextAction: 'SYNTHETIC QA Home exception cert' },
  });
  record(
    'home_exception_needs_manny',
    flagged.status === 200 && flagged.json.opportunity?.attention?.state === 'NEEDS_MANNY',
    { status: flagged.status, attention: flagged.json.opportunity?.attention },
  );
  const home = await hub('/api/pm/command-center');
  const text = JSON.stringify(home.json);
  record(
    'home_lists_exception',
    home.status === 200 && (text.includes('NEEDS_MANNY') || text.includes(clientCode) || text.includes(String(oppId))),
    { status: home.status, mentionsClient: text.includes(clientCode) },
  );
  const cleared = await hub(`/api/pm/opportunities/${encodeURIComponent(oppId)}`, {
    method: 'PATCH',
    headers: { 'if-match': flagged.json.opportunity?.etag || opp.json.opportunity?.etag, 'content-type': 'application/json' },
    json: { requiresExecutiveAttention: false, nextAction: 'SYNTHETIC QA follow-up after Home cert' },
  });
  record(
    'home_exception_cleared',
    cleared.status === 200 && cleared.json.opportunity?.attention?.state !== 'NEEDS_MANNY',
    { status: cleared.status, attention: cleared.json.opportunity?.attention },
  );
}

const forgedOpp = await hub('/api/pm/opportunities/99999999');
record('forged_opportunity_404', forgedOpp.status === 404, { status: forgedOpp.status });
const forgedActivate = await hub(`/api/pm/clients/${encodeURIComponent(clientCode)}/activation`, {
  method: 'POST',
  json: { action: 'authorize', opportunityId: '99999999' },
});
record(
  'forged_activation_blocked',
  forgedActivate.status === 400 || forgedActivate.status === 404 || forgedActivate.status === 403,
  { status: forgedActivate.status, code: forgedActivate.json.code || forgedActivate.json.error },
);
const capitalWildcard = await hub('/api/capital/opportunities', {
  method: 'POST',
  json: { title: 'x', clientCode: '*', transactionType: 'working_capital_loc', need: { requestedAmount: 1 } },
});
record('capital_wildcard_rejected', capitalWildcard.status === 422 || capitalWildcard.status === 403, {
  status: capitalWildcard.status,
});

const report = {
  ok: failures.length === 0,
  clientCode,
  leadId,
  opportunityId: oppId,
  failures,
  results,
  at: new Date().toISOString(),
};
mkdirSync('/opt/cursor/artifacts', { recursive: true });
writeFileSync('/opt/cursor/artifacts/convert_stage_live_cert.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length === 0 ? 0 : 1);
