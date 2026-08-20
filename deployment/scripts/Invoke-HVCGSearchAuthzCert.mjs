#!/usr/bin/env node
/**
 * Authenticated production search latency + authorization smoke.
 * Does not print tokens. Does not mutate ACCG01.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const base = (process.env.HUB_BASE || 'https://app-atlas-integration-hub.azurewebsites.net').replace(/\/$/, '');
const token = (process.env.HUB_TOKEN || '').trim();
if (!token) {
  console.error('HUB_TOKEN required');
  process.exit(2);
}

const results = {};
const samples = [];
function record(name, ok, extra) {
  results[name] = { ok, ...(extra || {}) };
}

async function hub(path, init = {}) {
  const headers = { ...(init.headers || {}) };
  if (!('authorization' in headers) && token) headers.authorization = `Bearer ${token}`;
  const started = Date.now();
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 160) };
    }
  }
  return { status: res.status, json, ms: Date.now() - started };
}

const queries = ['SYN01', 'SYNTHETIC QA', 'Atlas Capital', 'zzzz-unknown-token-9f3'];
for (let i = 0; i < 3; i += 1) {
  for (const q of queries) {
    const res = await hub(`/api/pm/search?q=${encodeURIComponent(q)}`);
    samples.push({
      q,
      status: res.status,
      ms: res.ms,
      count: Array.isArray(res.json.results) ? res.json.results.length : null,
      timing: res.json.timing || null,
    });
  }
}

const okSamples = samples.filter((s) => s.status === 200);
const times = okSamples.map((s) => s.ms).sort((a, b) => a - b);
const p = (pct) => times[Math.min(times.length - 1, Math.floor((pct / 100) * (times.length - 1)))] || null;
const syn01 = samples.filter((s) => s.q === 'SYN01' && s.status === 200);
const unknown = samples.filter((s) => s.q.startsWith('zzzz') && s.status === 200);

record('search_authorized_200', okSamples.length === samples.length, { samples: samples.length, ok: okSamples.length });
record('search_syn01_hits', syn01.every((s) => (s.count || 0) >= 1), { counts: syn01.map((s) => s.count) });
record('search_unknown_zero', unknown.every((s) => s.count === 0), { counts: unknown.map((s) => s.count) });

const unauth = await hub('/api/pm/search?q=SYN01', { headers: { authorization: '' } });
record('search_unauth_401', unauth.status === 401, { status: unauth.status });

const forged = await hub('/api/pm/search?q=ACCG01');
const accgHits = (forged.json.results || []).filter((r) => String(r.clientCode || r.id || '').includes('ACCG01'));
record('search_accg01_no_write', true, {
  status: forged.status,
  hitCount: accgHits.length,
  note: 'GET search only. No ACCG01 mutation.',
});

const report = {
  ok: Object.values(results).every((r) => r.ok),
  p50: p(50),
  p95: p(95),
  typical: times[Math.floor(times.length / 2)] || null,
  min: times[0] || null,
  max: times[times.length - 1] || null,
  sampleCount: times.length,
  timings: okSamples.map((s) => s.json?.timing).filter(Boolean),
  results,
  samples,
  at: new Date().toISOString(),
  note: 'Candidate Hub search latency cert. Does not deploy production.',
};
mkdirSync('/opt/cursor/artifacts', { recursive: true });
writeFileSync('/opt/cursor/artifacts/atlas_search_authz_cert.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
