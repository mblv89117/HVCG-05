/**
 * Capital Command Center route wiring tests (plain Node).
 * Proves /capital still renders Capital (via CapitalPage) and the primary
 * surface is CapitalCommandCenter — not the development fixture.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
const modules = readFileSync(join(root, 'src/pages/Modules.tsx'), 'utf8');
const command = readFileSync(join(root, 'src/pages/capital/CapitalCommandCenter.tsx'), 'utf8');
const workspace = readFileSync(join(root, 'src/pages/capital/OpportunityWorkspace.tsx'), 'utf8');
const api = readFileSync(join(root, 'src/pages/capital/capitalApi.ts'), 'utf8');
const synthetic = readFileSync(join(root, 'src/pages/capital/syntheticFallback.ts'), 'utf8');
const fixture = readFileSync(join(root, 'src/pages/CapitalReadinessWorkbench.tsx'), 'utf8');

assert.match(app, /path="capital"/);
assert.match(app, /CapitalPage/);
assert.match(app, /FinanceRoute/);
{
  const capitalRoute = app.slice(app.indexOf('path="capital"'), app.indexOf('path="procurement"'));
  assert.match(capitalRoute, /FinanceRoute/);
  assert.match(capitalRoute, /<CapitalPage \/>/);
}

assert.match(modules, /import \{ CapitalCommandCenter \} from '\.\/capital\/CapitalCommandCenter'/);
assert.match(modules, /export function CapitalPage\(\)/);
assert.match(modules, /return <CapitalCommandCenter \/>/);
assert.doesNotMatch(modules, /return <CapitalReadinessWorkbench \/>/);

assert.equal(existsSync(join(root, 'src/pages/CapitalReadinessWorkbench.tsx')), true);
assert.match(fixture, /export function CapitalReadinessWorkbench/);

assert.match(command, /showPendingBanner=\{false\}/);
assert.match(command, /SYNTHETIC_BANNER/);
assert.match(command, /KpiTile/);
assert.match(command, /OpportunityWorkspace/);
assert.match(workspace, /Approve strategy/);
assert.match(workspace, /Approve shortlist/);
assert.match(workspace, /Manny gate/);
assert.match(api, /\/api\/capital\/command-center/);
assert.match(api, /\/api\/capital\/opportunities/);
assert.match(api, /hubFetchJson/);
assert.match(api, /HVCG is not a lender/);
assert.match(api, /isAuthorizationFailure/);
assert.match(api, /Authenticated access required/);
assert.match(api, /Synthetic demonstration data is not shown/);
assert.match(api, /kind === 'mutate' \|\| kind === 'read-item'/);
assert.doesNotMatch(api, /if \(status === 401 \|\| status === 404 \|\| status === 501 \|\| status === 503\) return true/);
assert.match(synthetic, /Synthetic demonstration data — not a live client\. Not production facts\./);
assert.match(synthetic, /not a live client/);
assert.match(command, /Authenticated access required/);
assert.match(command, /Synthetic demonstration data is never used to conceal a 401 or 403/);
assert.doesNotMatch(api, /client_secret|CLIENT_SECRET/);
assert.doesNotMatch(command, /client_secret|CLIENT_SECRET/);

console.log('PASS capital command center route + provenance source tests');
