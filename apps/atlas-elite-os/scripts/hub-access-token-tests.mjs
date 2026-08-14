/**
 * Hub Bearer + blank-page regression source tests (plain Node).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const msal = readFileSync(join(root, 'src/microsoft/auth/msal.ts'), 'utf8');
const hubFetch = readFileSync(join(root, 'src/integrations/hub/hubFetch.ts'), 'utf8');
const useHubAuth = readFileSync(join(root, 'src/integrations/hub/useHubAuth.ts'), 'utf8');
const authProvider = readFileSync(join(root, 'src/microsoft/auth/AuthProvider.tsx'), 'utf8');
const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const bootJs = readFileSync(join(root, 'public/atlas-boot.js'), 'utf8');
const boundary = readFileSync(join(root, 'src/startup/RootErrorBoundary.tsx'), 'utf8');
const portfolio = readFileSync(join(root, 'src/pages/PortfolioPage.tsx'), 'utf8');
const detail = readFileSync(join(root, 'src/pages/ProjectDetailPage.tsx'), 'utf8');
const appShell = readFileSync(join(root, 'src/layout/AppShell.tsx'), 'utf8');
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');

// accessToken only for Hub silent/interactive helpers
assert.match(msal, /acquireHubAccessTokenSilent/);
assert.match(msal, /acquireHubAccessTokenInteractive/);
assert.match(msal, /return \{ status: 'ok', accessToken: silent\.accessToken \}/);
assert.doesNotMatch(msal, /if \(silent\.idToken\) return silent\.idToken/);
assert.match(msal, /Never opens a popup/);

// Hub silent path must NOT auto-call acquireTokenPopup inside acquireHubAccessTokenSilent
const silentFn = msal.slice(
  msal.indexOf('export async function acquireHubAccessTokenSilent'),
  msal.indexOf('export async function acquireHubAccessTokenInteractive'),
);
assert.doesNotMatch(silentFn, /acquireTokenPopup/);
assert.match(silentFn, /InteractionRequiredAuthError/);
assert.match(silentFn, /interaction_required/);

// acquireToken still returns accessToken for Graph/Dataverse
assert.match(msal, /return silent\.accessToken/);

// Race / bootstrap gates
assert.match(useHubAuth, /tokenReady/);
assert.match(useHubAuth, /hasBearer/);
assert.match(useHubAuth, /interaction_required/);
assert.match(useHubAuth, /authorizeHub/);
assert.match(useHubAuth, /ACQUIRE_TIMEOUT_MS/);

// Auth provider awaits MSAL + redirect + optional SSO
assert.match(authProvider, /getMsal/);
assert.match(authProvider, /fetchSwaAuthMe/);
assert.match(authProvider, /trySsoSilent/);
assert.match(authProvider, /initStage/);

// Startup shell + boundary
assert.match(indexHtml, /atlas-boot/);
assert.match(indexHtml, /atlas-boot\.js/);
assert.match(bootJs, /startup_timeout/);
assert.match(main, /RootErrorBoundary/);
assert.match(boundary, /RootErrorBoundary/);
assert.match(appShell, /data-atlas-shell/);

// Projects route uses PortfolioPage; shell before token
assert.match(app, /path="projects"/);
assert.match(app, /PortfolioPage/);
assert.match(portfolio, /Authorize Atlas Integration Hub/);
assert.match(portfolio, /if \(!auth\.tokenReady\)/);
assert.match(portfolio, /bootstrapStatus === 'interaction_required'/);
// React #310 guard: useMemo owners/filtered must precede the render-time tokenReady early return
{
  const ownersIdx = portfolio.indexOf('const owners = useMemo');
  const filteredIdx = portfolio.indexOf('const filtered = useMemo');
  const renderGate = portfolio.search(
    /if\s*\(\s*!auth\.tokenReady\s*\)\s*\{\s*\n\s*return\s*\(\s*\n\s*<ModuleScaffold/,
  );
  assert.ok(ownersIdx > 0 && filteredIdx > 0 && renderGate > 0);
  assert.ok(ownersIdx < renderGate, 'PortfolioPage: owners useMemo after tokenReady gate causes React #310');
  assert.ok(filteredIdx < renderGate, 'PortfolioPage: filtered useMemo after tokenReady gate causes React #310');
}

// 401 vs 404
assert.match(detail, /setAuthFailure/);
assert.match(detail, /status === 404/);
assert.match(detail, /title="Project not found"/);
const authBlock = detail.slice(detail.indexOf('status === 401'), detail.indexOf('status === 404'));
assert.doesNotMatch(authBlock, /Project not found/);
assert.doesNotMatch(authBlock, /setMissing\(true\)/);

// hubFetch attaches Bearer from access token path only
assert.match(hubFetch, /headers\.Authorization = `Bearer \$\{bearer\}`/);
const hubCode = hubFetch.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
assert.equal(/\bidToken\b/.test(hubCode), false);

const connections = readFileSync(join(root, 'src/pages/ConnectionsCenterPage.tsx'), 'utf8');
const baApi = readFileSync(join(root, 'src/integrations/hub/baApi.ts'), 'utf8');
assert.match(baApi, /hubFetchJson\(auth, '\/api\/ba\/health'/);
assert.match(connections, /baHealth\(/);
assert.match(connections, /CORR-G11R-6H-ELITE-HUB-BA-PING/);
assert.match(connections, /CORR-G11R-6H-HUB-BA-PING/);
assert.doesNotMatch(connections, /app-atlas-ba\.azurewebsites\.net/);
assert.doesNotMatch(baApi, /app-atlas-ba\.azurewebsites\.net/);

const liveClients = readFileSync(join(root, 'src/pages/LiveClientsPage.tsx'), 'utf8');
assert.match(liveClients, /fetchPmClients/);
assert.match(liveClients, /HVCG_Clients/);
assert.doesNotMatch(liveClients, /fetchClient360/);
assert.doesNotMatch(liveClients, /ingestMicrosoftClient360/);

const pmApiSrc = readFileSync(join(root, 'src/integrations/hub/pmApi.ts'), 'utf8');
assert.match(pmApiSrc, /\/api\/pm\/clients/);
assert.match(pmApiSrc, /If-Match/);

console.log('PASS hub access-token + blank-page regression source tests');
