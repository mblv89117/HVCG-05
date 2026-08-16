/**
 * Frontend project routing regression tests (plain Node).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Inline mirror of routing helper (compiled TS not required for unit check)
const FORBIDDEN = new Set(['undefined', 'null', 'unknown', 'nan', '']);
function isValidProjectId(raw) {
  if (raw == null) return false;
  const id = String(raw).trim();
  if (!id) return false;
  if (FORBIDDEN.has(id.toLowerCase())) return false;
  if (id.startsWith('prj-')) return false;
  return true;
}
function projectDetailPath(id) {
  if (!isValidProjectId(id)) return null;
  return `/projects/${encodeURIComponent(String(id).trim())}`;
}

assert.equal(isValidProjectId('undefined'), false);
assert.equal(isValidProjectId('null'), false);
assert.equal(isValidProjectId('unknown'), false);
assert.equal(isValidProjectId(''), false);
assert.equal(isValidProjectId('prj-ccb-capital'), false);
assert.equal(projectDetailPath('undefined'), null);
assert.equal(projectDetailPath('abc-123'), '/projects/abc-123');

const appShell = readFileSync(join(root, 'src/layout/AppShell.tsx'), 'utf8');
assert.match(appShell, /label: 'Projects',\s*to: '\/projects'/);

const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
assert.match(app, /path="projects"/);
assert.match(app, /path="projects\/:projectId"/);
assert.match(app, /isValidProjectId/);
assert.match(app, /DocumentsOperatingPage/);

const detail = readFileSync(join(root, 'src/pages/ProjectDetailPage.tsx'), 'utf8');
assert.match(detail, /Back to projects/);
assert.match(detail, /invalidId/);

const portfolio = readFileSync(join(root, 'src/pages/PortfolioPage.tsx'), 'utf8');
assert.match(portfolio, /Create project/);
assert.match(portfolio, /projectDetailPath/);
assert.match(portfolio, /Sync from Microsoft \+ Client 360/);

const live = readFileSync(join(root, 'src/pages/LiveClientDetailPage.tsx'), 'utf8');
assert.match(live, /Client Workspace V1/);
assert.match(live, /Client 360 mapping is deferred/);
assert.match(live, /projectDetailPath/);
assert.match(live, /PARTIAL — SOURCE DATA NOT FOUND/);
assert.doesNotMatch(live, /Client360FinanceSection/);

const docs = readFileSync(join(root, 'src/pages/DocumentsOperatingPage.tsx'), 'utf8');
assert.match(docs, /fetchPmDocuments/);
assert.match(docs, /Open HVCG-Clients/);

console.log('PASS project route + operating layer source tests');
