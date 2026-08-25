#!/usr/bin/env node
/**
 * Production SharePoint persistence E2E (Graph).
 * Creates/reads/patches/deletes smoke items for core entities.
 * No external emails. Cleans up after itself.
 *
 * Usage: node scripts/prod-persistence-e2e.mjs
 * Requires: az CLI logged in with Graph Sites.ReadWrite.All (or Sites.Manage.All)
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SITE_URL = 'https://highvaluecapitalgroup.sharepoint.com/sites/HVCG-CommandCenter';
const SITE_PATH = '/sites/HVCG-CommandCenter';
const HOST = 'highvaluecapitalgroup.sharepoint.com';
const MARKER = `ATLAS-E2E-${Date.now()}`;

function azToken() {
  return execSync(
    'az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv',
    { encoding: 'utf8' },
  ).trim();
}

async function graph(token, method, path, body) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

function pick(fields, keys) {
  const out = {};
  for (const k of keys) {
    if (fields[k] !== undefined && fields[k] !== null && fields[k] !== '') out[k] = fields[k];
  }
  return out;
}

async function resolveSite(token) {
  const site = await graph(token, 'GET', `/sites/${HOST}:${SITE_PATH}`);
  return site.id;
}

async function listColumns(token, siteId, listName) {
  const data = await graph(
    token,
    'GET',
    `/sites/${siteId}/lists/${encodeURIComponent(listName)}/columns?$top=200`,
  );
  return (data.value || []).map((c) => c.name).filter(Boolean);
}

function buildFields(available, desired) {
  const fields = {};
  for (const [k, v] of Object.entries(desired)) {
    if (available.includes(k)) fields[k] = v;
  }
  if (!fields.Title && available.includes('Title')) fields.Title = desired.Title || MARKER;
  return fields;
}

async function createItem(token, siteId, listName, fields) {
  return graph(token, 'POST', `/sites/${siteId}/lists/${encodeURIComponent(listName)}/items`, {
    fields,
  });
}

async function getItem(token, siteId, listName, id) {
  return graph(
    token,
    'GET',
    `/sites/${siteId}/lists/${encodeURIComponent(listName)}/items/${id}?$expand=fields`,
  );
}

async function patchItem(token, siteId, listName, id, fields) {
  return graph(
    token,
    'PATCH',
    `/sites/${siteId}/lists/${encodeURIComponent(listName)}/items/${id}/fields`,
    fields,
  );
}

async function deleteItem(token, siteId, listName, id) {
  return graph(token, 'DELETE', `/sites/${siteId}/lists/${encodeURIComponent(listName)}/items/${id}`);
}

async function countClients(token, siteId) {
  const data = await graph(
    token,
    'GET',
    `/sites/${siteId}/lists/HVCG_Clients/items?$expand=fields&$top=50`,
  );
  const items = data.value || [];
  return {
    count: items.length,
    titles: items.map((i) => i.fields?.Title || i.fields?.ClientCode || i.id),
  };
}

async function runEntity(token, siteId, name, listName, desired, patch) {
  const result = { entity: name, list: listName, ok: false, steps: [] };
  try {
    const cols = await listColumns(token, siteId, listName);
    const fields = buildFields(cols, desired);
    result.steps.push({ step: 'create_fields', fields: Object.keys(fields) });
    const created = await createItem(token, siteId, listName, fields);
    const id = created.id;
    result.itemId = id;
    result.steps.push({ step: 'create', id });

    const read = await getItem(token, siteId, listName, id);
    const title = read.fields?.Title;
    if (!title || !String(title).includes('ATLAS-E2E')) {
      throw new Error(`Read-back Title mismatch: ${title}`);
    }
    result.steps.push({ step: 'read', title });

    if (patch) {
      const patchFields = buildFields(cols, patch);
      await patchItem(token, siteId, listName, id, patchFields);
      const after = await getItem(token, siteId, listName, id);
      result.steps.push({ step: 'patch', fields: pick(after.fields || {}, Object.keys(patchFields)) });
    }

    await deleteItem(token, siteId, listName, id);
    result.steps.push({ step: 'delete', id });
    result.ok = true;
  } catch (e) {
    result.error = String(e.message || e);
    if (result.itemId) {
      try {
        await deleteItem(token, siteId, listName, result.itemId);
        result.steps.push({ step: 'cleanup_delete', id: result.itemId });
      } catch (cleanupErr) {
        result.cleanupError = String(cleanupErr.message || cleanupErr);
      }
    }
  }
  return result;
}

async function main() {
  const token = azToken();
  const siteId = await resolveSite(token);
  const clients = await countClients(token, siteId);

  const clientProbe = { entity: 'client', list: 'HVCG_Clients', ok: clients.count === 7 };
  clientProbe.detail = { count: clients.count, titles: clients.titles };
  if (clientProbe.ok) {
    // Soft patch Notes/Description on ACCG if column exists — then revert not needed; only read verify.
    clientProbe.steps = [{ step: 'read_count', count: clients.count }];
  } else {
    clientProbe.error = `Expected 7 clients, got ${clients.count}`;
  }

  const entities = [
    await runEntity(
      token,
      siteId,
      'project',
      'HVCG_Projects',
      {
        Title: `${MARKER} Project`,
        ClientCode: 'ACCG01',
        ProjectStatus: 'Active',
        Status: 'Active',
        HVCG_IdempotencyKey: `${MARKER}-project`,
      },
      { Title: `${MARKER} Project PATCHED` },
    ),
    await runEntity(
      token,
      siteId,
      'task',
      'HVCG_Tasks',
      {
        Title: `${MARKER} Task`,
        ClientCode: 'ACCG01',
        TaskStatus: 'Not Started',
        Status: 'Not Started',
        HVCG_IdempotencyKey: `${MARKER}-task`,
      },
      { Title: `${MARKER} Task PATCHED` },
    ),
    await runEntity(
      token,
      siteId,
      'document_request',
      'HVCG_DocumentRequests',
      {
        Title: `${MARKER} DocRequest`,
        ClientCode: 'ACCG01',
        RequestStatus: 'Requested',
        Status: 'Requested',
        HVCG_IdempotencyKey: `${MARKER}-docreq`,
      },
      { Title: `${MARKER} DocRequest PATCHED` },
    ),
    await runEntity(
      token,
      siteId,
      'time_entry',
      'HVCG_TimeEntries',
      {
        Title: `${MARKER} Time`,
        ClientCode: 'ACCG01',
        Hours: 0.25,
        EntryDate: new Date().toISOString().slice(0, 10),
        HVCG_IdempotencyKey: `${MARKER}-time`,
      },
      { Title: `${MARKER} Time PATCHED` },
    ),
    await runEntity(
      token,
      siteId,
      'decision',
      'HVCG_Decisions',
      {
        Title: `${MARKER} Decision`,
        ClientCode: 'ACCG01',
        DecisionStatus: 'Open',
        Status: 'Open',
        HVCG_IdempotencyKey: `${MARKER}-decision`,
      },
      { Title: `${MARKER} Decision PATCHED` },
    ),
    await runEntity(
      token,
      siteId,
      'financial_milestone',
      'HVCG_FinancialMilestones',
      {
        Title: `${MARKER} FinMilestone`,
        ClientCode: 'ACCG01',
        MilestoneStatus: 'Planned',
        Status: 'Planned',
        Amount: 1,
        HVCG_IdempotencyKey: `${MARKER}-fin`,
      },
      { Title: `${MARKER} FinMilestone PATCHED` },
    ),
    await runEntity(
      token,
      siteId,
      'ai_approval',
      'HVCG_AIApprovals',
      {
        Title: `${MARKER} AIApproval`,
        ClientCode: 'ACCG01',
        ApprovalStatus: 'Pending',
        Status: 'Pending',
        HumanApprovalRequired: true,
        HumanApproved: false,
        InputSummary: 'E2E internal only — no external send',
        HVCG_IdempotencyKey: `${MARKER}-ai`,
      },
      { Title: `${MARKER} AIApproval PATCHED`, HumanApproved: true },
    ),
  ];

  const results = [clientProbe, ...entities];
  const failed = results.filter((r) => !r.ok);
  const report = {
    when: new Date().toISOString(),
    siteUrl: SITE_URL,
    marker: MARKER,
    pass: failed.length === 0,
    passed: results.filter((r) => r.ok).map((r) => r.entity),
    failed: failed.map((r) => ({ entity: r.entity, error: r.error })),
    results,
  };

  const outDir = join(ROOT, 'deployment/reports');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const jsonPath = join(outDir, `prod-persistence-e2e-${stamp}.json`);
  const latestPath = join(outDir, 'prod-persistence-e2e-latest.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  writeFileSync(latestPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ pass: report.pass, passed: report.passed, failed: report.failed }, null, 2));
  console.log(`Wrote ${latestPath}`);
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
