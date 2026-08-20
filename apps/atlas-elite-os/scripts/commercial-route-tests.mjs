/**
 * Commercial workspace route wiring — FinanceRoute, no new sales SPA.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
const modules = readFileSync(join(root, 'src/pages/Modules.tsx'), 'utf8');
const page = readFileSync(join(root, 'src/pages/revenue/CommercialWorkspacePage.tsx'), 'utf8');
const workspace = readFileSync(join(root, 'src/pages/revenue/commercialWorkspace.ts'), 'utf8');

assert.match(app, /path="revenue"/);
{
  const revenueRoute = app.slice(app.indexOf('path="revenue"'), app.indexOf('path="clients"'));
  assert.match(revenueRoute, /FinanceRoute/);
  assert.match(revenueRoute, /RevenuePage/);
}
assert.match(modules, /CommercialWorkspacePage/);
assert.match(modules, /return <CommercialWorkspacePage \/>/);
assert.doesNotMatch(modules, /return <RevenueTruthWorkbench \/>/);
assert.equal(existsSync(join(root, 'src/pages/revenue/CommercialWorkspacePage.tsx')), true);
assert.match(page, /Operator accept offer/);
assert.match(page, /autoSend false/);
assert.match(page, /liveDispatch false/);
assert.match(workspace, /proposal cannot auto-send/);
assert.match(workspace, /liveDispatch remains false/);

console.log('commercial-route-tests: ok');
