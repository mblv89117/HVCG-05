import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isAuthorizationFailure,
  shouldUseSyntheticFallback,
  toCapitalAccessError,
} from './capitalAccess.ts';
import { readOpportunityQuery } from './capitalDisplay.ts';
import {
  applySyntheticTransition,
  getSyntheticCommandCenter,
  getSyntheticOpportunity,
} from './syntheticFallback.ts';

const root = dirname(fileURLToPath(import.meta.url));

function src(name: string): string {
  return readFileSync(join(root, name), 'utf8');
}

describe('Elite capital UI assumptions', () => {
  it('401/403 never fall back; item reads never substitute synthetic', () => {
    const denied = Object.assign(new Error('HTTP 403'), { status: 403 });
    assert.equal(shouldUseSyntheticFallback(denied, 'read-collection', true), false);
    assert.equal(shouldUseSyntheticFallback(denied, 'read-item', true), false);
    assert.equal(shouldUseSyntheticFallback(Object.assign(new Error('HTTP 404'), { status: 404 }), 'read-item', true), false);
    assert.equal(isAuthorizationFailure(new Error('Bearer token missing')), true);
    assert.match(toCapitalAccessError(denied).message, /not shown/i);
  });

  it('synthetic stage jump is demo-only and must not be reachable after Hub 401', () => {
    const pack = getSyntheticCommandCenter();
    assert.ok(pack.items.length > 0);
    const id = pack.items[0].opportunityId;
    const jumped = applySyntheticTransition(id, 'Funded');
    assert.equal(jumped.opportunity.stage, 'Funded');
    assert.equal(shouldUseSyntheticFallback({ status: 401 }, 'mutate', true), false);
    assert.equal(shouldUseSyntheticFallback({ status: 403 }, 'mutate', true), false);
  });

  it('Approve strategy and shortlist stay behind can(mutateApprovals)', () => {
    const ws = src('OpportunityWorkspace.tsx');
    assert.match(ws, /can\(['"]mutateApprovals['"]\)/);
    assert.match(ws, /Approve strategy/);
    assert.match(ws, /Approve shortlist/);
    assert.match(ws, /decideStrategy/);
    assert.match(ws, /decideShortlist/);
    for (const label of ['Approve strategy', 'Approve shortlist']) {
      const idx = ws.indexOf(label);
      assert.ok(idx > 0, label);
      const before = ws.slice(Math.max(0, idx - 600), idx);
      assert.match(
        before,
        /can\(['"]mutateApprovals['"]\)|canMutateApprovals/,
        `${label} must remain behind can('mutateApprovals')`,
      );
    }
  });

  it('post-shortlist writes reuse Hub routes and keep Manny / no-send gates', () => {
    const api = src('capitalApi.ts');
    assert.match(api, /\/application\/attest/);
    assert.match(api, /\/submissions/);
    assert.match(api, /\/offers\/compare/);
    assert.match(api, /\/closing\/generate/);
    assert.match(api, /\/api\/capital\/fees/);
    assert.match(api, /recordedOnly: true/);
    assert.match(api, /externalSubmit: false/);
    assert.doesNotMatch(api, /externalSubmit:\s*true/);
    assert.match(api, /isSyntheticMutationTarget/);
    assert.match(api, /Synthetic capital mutations are limited to SYN\*/);

    const exec = src('CapitalExecutionSurfaces.tsx');
    assert.match(exec, /Record submission \(no send\)/);
    assert.match(exec, /APPROVED_FOR_SUBMISSION/);
    assert.match(exec, /canMutateApprovals/);
    assert.match(exec, /NOT_BORROWER_REPRESENTATION|Not a borrower representation/);
    const attestBlock = exec.slice(exec.indexOf('nextAttestationOptions'), exec.indexOf('SubmissionExecution'));
    assert.match(attestBlock, /APPROVED_FOR_SUBMISSION/);
    assert.match(attestBlock, /canMutateApprovals/);
    const labels = src('capitalDetail.ts');
    assert.match(labels, /Approve for recorded submission/);
  });

  it('CapitalCommandCenter opens workspace from ?opportunity= without waiting on the queue payload', () => {
    const cc = src('CapitalCommandCenter.tsx');
    assert.match(cc, /readOpportunityQuery/);
    assert.match(cc, /searchParams/);
    assert.match(cc, /OpportunityWorkspace/);
    assert.match(cc, /if \(selectedId\)/);
    assert.doesNotMatch(cc, /if \(selectedId && payload\)/);
    assert.doesNotMatch(cc, /function queueFor/);
    const api = src('capitalApi.ts');
    assert.doesNotMatch(api, /function queueFor/);
    const display = src('capitalDisplay.ts');
    assert.doesNotMatch(display, /function queueFor/);
  });

  it('useHubAuth must not send wildcard clientIds as authorization', () => {
    const hub = readFileSync(join(root, '../../integrations/hub/useHubAuth.ts'), 'utf8');
    const wildcard = /clientIds:\s*\[[\s\n]*['"]\*['"]/.test(hub);
    assert.equal(
      wildcard,
      false,
      'P2: useHubAuth always sends clientIds: ["*"]. Hub must ignore it; Elite still advertises wildcard scope.',
    );
  });

  it('capitalApi source=synthetic skips Hub for mutations', () => {
    const api = src('capitalApi.ts');
    assert.match(api, /opts\?\.source === 'synthetic'/);
    assert.match(api, /applySyntheticStrategyDecision/);
    const create = api.slice(api.indexOf('export async function createOpportunity'), api.indexOf('export async function transitionOpportunity'));
    assert.match(create, /if \(isAuthorizationFailure\(err\)\) throw toCapitalAccessError\(err\)/);
    assert.doesNotMatch(create, /addSyntheticOpportunity\(input\).*catch/);
  });

  it('/capital?opportunity= ignores clientCode/source/queue and does not invent a SYN02 file', () => {
    assert.equal(readOpportunityQuery('?opportunity=cap-syn-attn&clientCode=SYN02&source=synthetic&queue=ALL'), 'cap-syn-attn');
    assert.equal(readOpportunityQuery('?clientCode=SYN02&source=synthetic'), null);
    assert.equal(readOpportunityQuery('?opportunity='), null);
    assert.throws(() => getSyntheticOpportunity('SYN02'), /not found/i);
    assert.throws(() => getSyntheticOpportunity('syn02-foreign-hub-id'), /not found/i);
    assert.equal(shouldUseSyntheticFallback({ status: 404 }, 'read-item', true), false);
    assert.equal(shouldUseSyntheticFallback({ status: 403 }, 'read-item', true), false);
  });

  it('deep-link workspace defaults to Hub source so a foreign id cannot flip Elite into synthetic SYN02', () => {
    const cc = src('CapitalCommandCenter.tsx');
    assert.match(cc, /readOpportunityQuery\(searchParams\)/);
    assert.match(cc, /source=\{payload\?\.source \|\| 'hub'\}/);
    assert.doesNotMatch(cc, /searchParams\.get\(['"]source['"]\)/);
    assert.doesNotMatch(cc, /searchParams\.get\(['"]clientCode['"]\)/);
    const load = src('capitalApi.ts');
    const item = load.slice(load.indexOf('export async function loadOpportunity'), load.indexOf('export async function createOpportunity'));
    assert.match(item, /shouldUseSyntheticFallback\(err, 'read-item'\)/);
    assert.match(item, /isAuthorizationFailure\(err\)\) throw toCapitalAccessError/);
  });

  it('Home capital deep-links come from Hub items only and do not substitute SYN02 demo data', () => {
    const home = readFileSync(join(root, '../CommandCenterPage.tsx'), 'utf8');
    assert.match(home, /payload\.source === 'hub'/);
    assert.match(home, /Home is not substituting demonstration capital data/);
    assert.match(home, /\/capital\?opportunity=\$\{encodeURIComponent\(item\.opportunityId\)\}/);
    assert.doesNotMatch(home, /getSyntheticCommandCenter|cap-syn-client/);
    const hrefGuard = home.slice(home.indexOf('function namedRecordHref'), home.indexOf('function atlasTaskLabel'));
    assert.match(hrefGuard, /!href\.startsWith\('\/'\) \|\| href\.startsWith\('\/\/'\)/);
    assert.match(hrefGuard, /path === '\/capital' && \/\(\?:\\^|&\)opportunity=\//);
    assert.match(hrefGuard, /return null/);
  });
});
