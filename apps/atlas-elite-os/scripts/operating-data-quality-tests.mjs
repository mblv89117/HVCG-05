/**
 * Operating-data quality + sync preview/idempotency tests (plain Node).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const hubRoot = join(__dirname, '../../atlas-integration-api');

const bootstrap = readFileSync(join(hubRoot, 'src/pm/bootstrap.ts'), 'utf8');
const populate = readFileSync(join(hubRoot, 'src/pm/populateReal.ts'), 'utf8');
const http = readFileSync(join(hubRoot, 'src/pm/http.ts'), 'utf8');
const portfolio = readFileSync(join(root, 'src/pages/PortfolioPage.tsx'), 'utf8');
const display = readFileSync(join(root, 'src/operating/projectDisplay.ts'), 'utf8');
const dataTable = readFileSync(
  join(__dirname, '../../../packages/atlas-design-system/src/components/DataTable.tsx'),
  'utf8',
);

// Bootstrap must not invent healthy / Scope confirmed / +60d due
assert.doesNotMatch(bootstrap, /health:\s*kp\.priority === 'critical' \? 'watch' : 'healthy'/);
assert.match(bootstrap, /health: 'unknown'/);
assert.doesNotMatch(bootstrap, /title: 'Scope confirmed'/);
assert.doesNotMatch(bootstrap, /targetCompletionDate: addDays\(60\)/);
assert.match(bootstrap, /Next action required/);

// Populate matching normalizes Lienpartners ≈ Lien Partners
assert.match(populate, /normalizeClientMatchKey/);
assert.match(populate, /previewPopulateFromMicrosoft/);
assert.match(populate, /onlyBootstrapPlaceholders/);

// Dry-run routes
assert.match(http, /populate\/preview/);
assert.match(http, /previewPopulateFromMicrosoft/);
assert.match(http, /dryRun/);

// Create API must not default to healthy / Define first milestone
assert.match(http, /health: 'unknown'/);
assert.doesNotMatch(http, /nextAction: body\.nextAction \? String\(body\.nextAction\) : 'Define first milestone'/);

// Frontend honesty + sticky actions
assert.match(display, /Not assessed/);
assert.match(display, /No milestone established/);
assert.match(display, /Next action required/);
assert.match(display, /No due date/);
assert.match(portfolio, /previewPmSync/);
assert.match(portfolio, /qualityFilter/);
assert.match(portfolio, /sticky: 'right'/);
assert.match(portfolio, /displayHealth/);
assert.match(dataTable, /stickyRight/);
assert.match(dataTable, /stickyLeft/);

console.log('PASS operating-data quality + sync preview source tests');
