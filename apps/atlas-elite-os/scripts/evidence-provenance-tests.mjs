/**
 * Gate 7B-1R — origin vs live-status, and no silent KPI substitution.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  classifyAdapterSource,
  classifyExecutiveEvidence,
  executiveLabelForKind,
  parseSourceKind,
  sourceKindFromAdapter,
} from '../src/data/evidenceProvenance.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

assert.equal(parseSourceKind('Repository-derived'), 'Repository-derived');
assert.equal(parseSourceKind('Development sample'), 'Development sample');
assert.equal(parseSourceKind('Unavailable'), 'Unavailable');
assert.equal(parseSourceKind('Live'), 'Live');
assert.equal(parseSourceKind('Verified'), 'Unavailable');
assert.equal(parseSourceKind('Dataverse'), 'Unavailable');
assert.equal(parseSourceKind(undefined), 'Unavailable');

assert.equal(executiveLabelForKind('Repository-derived'), 'Repository-derived');
assert.notEqual(executiveLabelForKind('Repository-derived'), 'Not live');
assert.equal(executiveLabelForKind('Development sample'), 'Sample data');
assert.equal(executiveLabelForKind('Unavailable'), 'Unavailable');
assert.equal(executiveLabelForKind('Live'), 'Live');

const repo = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: true,
  origin: 'repository',
});
assert.equal(repo.origin, 'repository');
assert.equal(repo.status, 'Not live');
assert.notEqual(repo.origin, 'dataverse');

const sample = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: true,
  origin: 'development-sample',
});
assert.equal(sample.origin, 'development-sample');
assert.equal(sample.status, 'Sample data');
assert.notEqual(sample.status, 'Live');

const unauth = classifyExecutiveEvidence({
  authenticated: false,
  loadFailed: false,
  hasPayload: false,
  origin: 'hub-snapshot',
});
assert.equal(unauth.status, 'Unavailable');
assert.equal(unauth.origin, 'unknown');

const hubSnapshot = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: true,
  provenLive: false,
  origin: 'hub-snapshot',
});
assert.equal(hubSnapshot.origin, 'hub-snapshot');
assert.equal(hubSnapshot.status, 'Not live');
assert.notEqual(hubSnapshot.origin, 'repository');
assert.notEqual(hubSnapshot.status, 'Live');

const proven = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: true,
  provenLive: true,
  origin: 'hub-snapshot',
});
assert.equal(proven.status, 'Live');
assert.equal(proven.origin, 'hub-snapshot');

const provenIgnoredWhenEmpty = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: false,
  provenLive: true,
  origin: 'dataverse',
});
assert.equal(provenIgnoredWhenEmpty.status, 'Unavailable');

const dv = classifyAdapterSource('Dataverse', false);
assert.equal(dv.origin, 'dataverse');
assert.equal(dv.status, 'Not live');
assert.notEqual(dv.origin, 'repository');
assert.notEqual(sourceKindFromAdapter('Dataverse'), 'Repository-derived');
assert.notEqual(sourceKindFromAdapter('Live'), 'Live');
assert.notEqual(sourceKindFromAdapter('Live'), 'Repository-derived');

const adapterLiveUnproven = classifyAdapterSource('Live', false);
assert.equal(adapterLiveUnproven.status, 'Not live');
assert.notEqual(adapterLiveUnproven.status, 'Live');

const adapterLiveProven = classifyAdapterSource('Live', true);
assert.equal(adapterLiveProven.status, 'Live');

assert.equal(classifyAdapterSource('Repository-derived').origin, 'repository');
assert.equal(classifyAdapterSource('Development sample').status, 'Sample data');
assert.equal(classifyAdapterSource('Unavailable').status, 'Unavailable');
assert.equal(classifyAdapterSource('Verified').status, 'Unavailable');
assert.equal(classifyAdapterSource(undefined).status, 'Unavailable');

const unknownOrigin = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: true,
});
assert.equal(unknownOrigin.origin, 'unknown');
assert.equal(unknownOrigin.status, 'Not live');
assert.notEqual(unknownOrigin.origin, 'repository');

const mapper = readFileSync(join(root, 'src/data/executiveHomeFromAdapter.ts'), 'utf8');
assert.match(mapper, /if \(!kpis\.length\) return \[\]/);
assert.match(mapper, /if \(!rows\.length\) return \[\]/);
assert.match(mapper, /classifyAdapterSource\(k\.source, false\)/);
assert.match(mapper, /origin: classified\.origin/);
assert.doesNotMatch(mapper, /pendingHomeMetrics/);
assert.doesNotMatch(mapper, /pendingExecutiveKpis/);
assert.doesNotMatch(mapper, /sourceKindFromAdapter/);

const home = readFileSync(join(root, 'src/data/loadExecutiveHome.ts'), 'utf8');
assert.match(home, /metricsFromDataverseKpis/);
assert.doesNotMatch(home, /metrics\.length \? metrics : pending\.metrics/);
assert.doesNotMatch(home, /approvalRows\.length \? approvalRows : pending\.approvals/);
assert.doesNotMatch(home, /allowSampleFallback/);
assert.doesNotMatch(home, /pendingHomeMetrics/);
assert.doesNotMatch(home, /sourceKindFromAdapter\('Dataverse'\)/);
assert.match(home, /metrics: \[\]/);
assert.match(home, /approvals: \[\]/);
assert.match(home, /Dataverse request failed/);
assert.match(home, /Sign-in required — executive KPIs are unavailable/);

const defaults = readFileSync(join(root, 'src/data/executiveHomeDefaults.ts'), 'utf8');
assert.match(defaults, /metrics: \[\] as HomeMetric\[\]/);
assert.match(defaults, /not used as an operational Dataverse fallback/);
assert.match(defaults, /export const pendingHomeMetrics/);

const provenance = readFileSync(join(root, 'src/data/evidenceProvenance.ts'), 'utf8');
assert.doesNotMatch(provenance, /if \(kind === 'Dataverse'\) \{\s*return 'Repository-derived'/);
assert.match(provenance, /'dataverse'/);
assert.match(provenance, /'hub-snapshot'/);

const cc = readFileSync(join(root, 'src/pages/CommandCenterPage.tsx'), 'utf8');
assert.match(cc, /fetchCommandCenter/);
assert.match(cc, /CapitalAttentionStrip/);
assert.match(cc, /opportunity=/);
assert.doesNotMatch(cc, /origin:\s*'hub-snapshot'/);
assert.doesNotMatch(cc, /briefBuilder/);
assert.doesNotMatch(cc, /commandCenterData/);
assert.doesNotMatch(cc, /prioritize/);

const dash = readFileSync(join(root, 'src/pages/ExecutiveDashboard.tsx'), 'utf8');
assert.match(dash, /DeferredBoundaryPage/);
assert.match(dash, /Command Center/);
assert.doesNotMatch(dash, /m\.source === 'Live' \? 'Live' : 'Pending'/);
assert.doesNotMatch(dash, /briefBuilder/);
assert.doesNotMatch(dash, /prioritize/);

console.log('PASS evidence provenance semantics tests');
