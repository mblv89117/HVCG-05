import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { can } from './rbac.ts';

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(root, 'rbac.ts'), 'utf8');

describe('Elite rbac source contract', () => {
  it('never defaults to Owner and denies Unauthenticated/Unresolved', () => {
    assert.match(src, /Never default to Owner/);
    assert.match(src, /return 'Unresolved'/);
    assert.match(src, /if \(!input\.signedIn\) return 'Unauthenticated'/);
    assert.match(src, /if \(role === 'Unauthenticated' \|\| role === 'Unresolved'\) return false/);
    assert.doesNotMatch(src, /return 'HVCG Owner'/);
  });

  it('production/staging cannot use role sim or silent Owner', () => {
    assert.match(src, /environment !== 'production' && input\.environment !== 'staging'/);
    assert.match(src, /VITE_ALLOW_ROLE_SIM === 'true' && nonProd/);
  });

  it('Client Executive and Read-Only Advisor cannot viewFinance or viewAdmin', () => {
    const exec = src.slice(src.indexOf("'Client Executive':"), src.indexOf("'Client Team Member':"));
    const advisor = src.slice(src.indexOf("'Read-Only Advisor':"), src.indexOf('Administrator:'));
    assert.match(exec, /viewFinance: false/);
    assert.match(exec, /viewAdmin: false/);
    assert.match(advisor, /viewFinance: false/);
    assert.match(advisor, /mutateApprovals: false/);
    assert.equal(can('Client Executive', 'viewFinance'), false);
    assert.equal(can('Read-Only Advisor', 'viewFinance'), false);
    assert.equal(can('Client Executive', 'viewAdmin'), false);
  });

  it('/capital?opportunity= still requires viewFinance (FinanceRoute)', () => {
    const app = readFileSync(join(root, '../App.tsx'), 'utf8');
    const capitalRoute = app.slice(app.indexOf('path="capital"'), app.indexOf('path="procurement"'));
    assert.match(capitalRoute, /FinanceRoute/);
    assert.match(app, /capability="viewFinance"/);
  });
});
