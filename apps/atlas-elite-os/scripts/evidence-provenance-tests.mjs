/**
 * Gate 7B-1 — executive evidence provenance semantics.
 * Imports the Elite classifier via Node type-stripping (no Hub, no mocks copied).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
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
assert.equal(parseSourceKind('Pending verification'), 'Unavailable');
assert.equal(parseSourceKind('AI interpretation'), 'Unavailable');
assert.equal(parseSourceKind('Dataverse'), 'Unavailable');
assert.equal(parseSourceKind(undefined), 'Unavailable');
assert.equal(parseSourceKind({}), 'Unavailable');
assert.equal(parseSourceKind('live'), 'Unavailable');

assert.equal(executiveLabelForKind('Live'), 'Live');
assert.equal(executiveLabelForKind('Unavailable'), 'Unavailable');
assert.equal(executiveLabelForKind('Development sample'), 'Sample data');
assert.equal(executiveLabelForKind('Repository-derived'), 'Not live');

const unauth = classifyExecutiveEvidence({
  authenticated: false,
  loadFailed: false,
  hasPayload: false,
});
assert.equal(unauth.kind, 'Unavailable');
assert.notEqual(unauth.kind, 'Live');

const failed = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: true,
  hasPayload: false,
});
assert.equal(failed.kind, 'Unavailable');

const empty = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: false,
});
assert.equal(empty.kind, 'Unavailable');

const hubSnapshot = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: true,
  provenLive: false,
});
assert.equal(hubSnapshot.kind, 'Repository-derived');
assert.equal(hubSnapshot.label, 'Not live');
assert.match(hubSnapshot.detail, /not SharePoint/i);
assert.notEqual(hubSnapshot.kind, 'Live');
assert.notEqual(hubSnapshot.kind, 'Development sample');

const proven = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: true,
  provenLive: true,
});
assert.equal(proven.kind, 'Live');

const provenIgnoredWhenEmpty = classifyExecutiveEvidence({
  authenticated: true,
  loadFailed: false,
  hasPayload: false,
  provenLive: true,
});
assert.equal(provenIgnoredWhenEmpty.kind, 'Unavailable');

assert.equal(sourceKindFromAdapter('Dataverse'), 'Repository-derived');
assert.equal(sourceKindFromAdapter('Live'), 'Repository-derived');
assert.equal(sourceKindFromAdapter('Unavailable'), 'Unavailable');
assert.equal(sourceKindFromAdapter('Development sample'), 'Development sample');
assert.equal(sourceKindFromAdapter('Repository-derived'), 'Repository-derived');
assert.equal(sourceKindFromAdapter('Verified'), 'Unavailable');
assert.equal(sourceKindFromAdapter(undefined), 'Unavailable');

const cc = readFileSync(join(root, 'src/pages/CommandCenterPage.tsx'), 'utf8');
assert.match(cc, /classifyExecutiveEvidence/);
assert.match(cc, /provenLive:\s*false/);
assert.match(cc, /SourceBadge/);
assert.doesNotMatch(cc, /briefBuilder/);
assert.doesNotMatch(cc, /commandCenterData/);

const home = readFileSync(join(root, 'src/data/loadExecutiveHome.ts'), 'utf8');
assert.match(home, /sourceKindFromAdapter/);
assert.doesNotMatch(home, /kind === 'Dataverse' \|\| kind === 'Live'\) return 'Live'/);

const dash = readFileSync(join(root, 'src/pages/ExecutiveDashboard.tsx'), 'utf8');
assert.match(dash, /executiveLabelForKind/);
assert.doesNotMatch(dash, /m\.source === 'Live' \? 'Live' : 'Pending'/);

console.log('PASS evidence provenance semantics tests');
