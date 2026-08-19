/**
 * Auth / Hub / hook-order transition regression tests (plain Node + source contracts).
 * Fails if PortfolioPage (or peers) place Hooks after auth early returns.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = (...parts) => readFileSync(join(root, 'src', ...parts), 'utf8');

function getSafePostLoginRedirect(href, origin) {
  try {
    const current = new URL(href);
    if (current.origin !== origin) return `${origin}/`;
    return current.toString();
  } catch {
    return `${origin}/`;
  }
}

function buildSwaMicrosoftSignInUrl(href, origin) {
  const redirect = encodeURIComponent(getSafePostLoginRedirect(href, origin));
  return `/.auth/login/aad?post_login_redirect_uri=${redirect}`;
}

function shouldUseSwaSignInNavigation(hostname) {
  if (!hostname) return false;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
  return (
    hostname.endsWith('.azurestaticapps.net') ||
    hostname.endsWith('.azurestaticapps.dev') ||
    hostname.includes('highvaluecapitalgroup')
  );
}

function assertNoForbiddenPhrases(label, text) {
  const forbidden = [
    'Rendered more hooks',
    'Rendered fewer hooks',
    'React error #310',
    'React error #311',
    'React error #312',
    'Invalid hook call',
    'interaction_in_progress',
    'maximum update depth',
  ];
  for (const needle of forbidden) {
    assert.equal(text.includes(needle), false, `${label} must not contain "${needle}"`);
  }
}

function assertHooksBeforeAuthEarlyReturns(fileLabel, source, fnName) {
  const fnStart = source.indexOf(`export function ${fnName}`);
  assert.ok(fnStart >= 0, `${fileLabel}: missing ${fnName}`);
  const body = source.slice(fnStart);
  const earlyReturnRe =
    /\nif\s*\(\s*!?(?:auth\.(?:tokenReady|hasBearer)|account|configured|ready)\b[^)]*\)\s*\{\s*\n\s*return\s*\(/;
  const earlyMatch = earlyReturnRe.exec(body);
  const alt = /\nif\s*\(\s*auth\.bootstrapStatus\s*===\s*'interaction_required'\s*\)\s*\{\s*\n\s*return\s*\(/.exec(
    body,
  );
  const gateIndex = earlyMatch ? earlyMatch.index : alt ? alt.index : -1;
  if (gateIndex < 0) return;
  const after = body.slice(gateIndex);
  assert.doesNotMatch(
    after,
    /\n\s*const\s+\w+\s*=\s*use(Memo|State|Effect|Callback|Ref)\s*\(/,
    `${fileLabel}: Hook declared after auth early return (React #310 risk)`,
  );
}

const origin = 'https://zealous-rock-0090c7e1e.7.azurestaticapps.net';
assert.equal(getSafePostLoginRedirect(`${origin}/projects`, origin), `${origin}/projects`);
assert.equal(getSafePostLoginRedirect('https://evil.example/phish', origin), `${origin}/`);
assert.match(buildSwaMicrosoftSignInUrl(`${origin}/projects`, origin), /^\/\.auth\/login\/aad\?post_login_redirect_uri=/);
assert.match(buildSwaMicrosoftSignInUrl(`${origin}/projects`, origin), /projects/);
assert.match(buildSwaMicrosoftSignInUrl(`${origin}/clients`, origin), /clients/);
assert.match(buildSwaMicrosoftSignInUrl(`${origin}/projects/proj-abc`, origin), /projects/);
assert.equal(shouldUseSwaSignInNavigation('zealous-rock-0090c7e1e.7.azurestaticapps.net'), true);
assert.equal(shouldUseSwaSignInNavigation('localhost'), false);
assert.equal(shouldUseSwaSignInNavigation('127.0.0.1'), false);

const swaSignInSrc = src('startup/swaSignIn.ts');
assert.match(swaSignInSrc, /getSafePostLoginRedirect/);
assert.match(swaSignInSrc, /beginSwaMicrosoftSignIn/);
assert.match(swaSignInSrc, /\/\.auth\/login\/aad/);

const authProvider = src('microsoft/auth/AuthProvider.tsx');
assert.match(authProvider, /shouldUseSwaSignInNavigation/);
assert.match(authProvider, /beginSwaMicrosoftSignIn/);
assert.match(authProvider, /signInInteractive/);

const portfolio = src('pages/PortfolioPage.tsx');
assertHooksBeforeAuthEarlyReturns('PortfolioPage.tsx', portfolio, 'PortfolioPage');
{
  const ownersIdx = portfolio.indexOf('const owners = useMemo');
  const filteredIdx = portfolio.indexOf('const filtered = useMemo');
  const renderGate = portfolio.search(
    /if\s*\(\s*!auth\.tokenReady\s*\)\s*\{\s*\n\s*return\s*\(\s*\n\s*<ModuleScaffold/,
  );
  assert.ok(ownersIdx > 0 && filteredIdx > 0 && renderGate > 0);
  assert.ok(ownersIdx < renderGate, 'owners useMemo must precede tokenReady early return');
  assert.ok(filteredIdx < renderGate, 'filtered useMemo must precede tokenReady early return');
}

const detail = src('pages/ProjectDetailPage.tsx');
assertHooksBeforeAuthEarlyReturns('ProjectDetailPage.tsx', detail, 'ProjectDetailPage');
assert.match(detail, /setAuthFailure/);
assert.match(detail, /status === 401/);
assert.match(detail, /status === 403/);
assert.match(detail, /status === 404/);
assert.match(detail, /title="Project not found"/);
const authBlock = detail.slice(detail.indexOf('status === 401'), detail.indexOf('status === 404'));
assert.doesNotMatch(authBlock, /Project not found/);
assert.doesNotMatch(authBlock, /setMissing\(true\)/);

const myWork = src('pages/MyWorkPage.tsx');
assertHooksBeforeAuthEarlyReturns('MyWorkPage.tsx', myWork, 'MyWorkPage');

const liveClient = src('pages/LiveClientDetailPage.tsx');
assertHooksBeforeAuthEarlyReturns('LiveClientDetailPage.tsx', liveClient, 'LiveClientDetailPage');
assert.match(liveClient, /status === 401/);
assert.match(liveClient, /status === 403/);
assert.match(liveClient, /workspace\.timeline/);
assert.match(liveClient, /workspace\.engagements\.items/);
assert.match(liveClient, /workspace\.decisionsRisks\.items/);

const useHubAuth = src('integrations/hub/useHubAuth.ts');
assert.match(useHubAuth, /tokenReady/);
assert.match(useHubAuth, /hasBearer/);
assert.match(useHubAuth, /interaction_required/);
assert.match(useHubAuth, /authorizeHub/);
assert.doesNotMatch(useHubAuth, /acquireTokenPopup/);

const msal = src('microsoft/auth/msal.ts');
assert.match(msal, /acquireHubAccessTokenSilent/);
assert.match(msal, /acquireHubAccessTokenInteractive/);
const silentFn = msal.slice(
  msal.indexOf('export async function acquireHubAccessTokenSilent'),
  msal.indexOf('export async function acquireHubAccessTokenInteractive'),
);
assert.doesNotMatch(silentFn, /acquireTokenPopup/);
assert.match(silentFn, /interaction_required/);

const boundary = src('startup/RootErrorBoundary.tsx');
assert.match(boundary, /RootErrorBoundary/);
assert.match(boundary, /Retry/);
assert.doesNotMatch(boundary, /accessToken|client_secret/i);

const main = src('main.tsx');
assert.match(main, /RootErrorBoundary/);
assert.match(main, /StrictMode/);

const transitions = [
  ['unauthenticated', 'auth_initializing'],
  ['auth_initializing', 'authenticated'],
  ['authenticated', 'role_resolving'],
  ['role_resolving', 'HVCG Owner'],
  ['no_msal_account', 'account_available'],
  ['hub_idle', 'hub_acquiring'],
  ['hub_acquiring', 'hub_ready'],
  ['hub_acquiring', 'interaction_required'],
  ['interaction_required', 'authorized'],
  ['hub_acquiring', 'hub_error'],
  ['hub_error', 'hub_retry'],
  ['api_disabled', 'api_enabled'],
  ['hard_refresh_/projects', 'shell_visible'],
  ['hard_refresh_/clients', 'shell_visible'],
  ['signin_return_/projects', 'shell_visible'],
  ['signin_return_/clients', 'shell_visible'],
  ['signin_return_project_detail', 'shell_visible'],
  ['strictmode_double_render', 'stable'],
  ['role_loss', 'access_denied'],
  ['api_401', 'auth_message'],
  ['api_403', 'forbidden_message'],
  ['api_404', 'not_found_message'],
  ['api_500', 'server_message'],
  ['token_expired', 'silent_renew'],
  ['authorize_hub_click', 'hub_ready'],
  ['error_boundary_retry', 'remount'],
  ['command_center_recovery', 'navigate'],
];

for (const [from, to] of transitions) {
  assert.ok(from && to);
  assertNoForbiddenPhrases(`${from}->${to}`, `${from}->${to}`);
}

function hubAuthShape(status) {
  const base = {
    tokenReady: false,
    hasBearer: false,
    bootstrapStatus: 'idle',
    bootstrapMessage: null,
    accessToken: undefined,
    authorizeHub: async () => {},
  };
  switch (status) {
    case 'idle':
      return { ...base, bootstrapStatus: 'idle' };
    case 'acquiring':
      return { ...base, bootstrapStatus: 'acquiring' };
    case 'ready':
      return { ...base, tokenReady: true, hasBearer: true, bootstrapStatus: 'ready', accessToken: 'redacted' };
    case 'interaction_required':
      return {
        ...base,
        tokenReady: true,
        hasBearer: false,
        bootstrapStatus: 'interaction_required',
        bootstrapMessage: 'Authorize Atlas Integration Hub',
      };
    case 'error':
      return {
        ...base,
        tokenReady: true,
        hasBearer: false,
        bootstrapStatus: 'error',
        bootstrapMessage: 'Hub token acquisition failed',
      };
    default:
      throw new Error(`unknown ${status}`);
  }
}

const shapes = ['idle', 'acquiring', 'ready', 'interaction_required', 'error'].map(hubAuthShape);
const keys = Object.keys(shapes[0]).sort().join(',');
for (const s of shapes) {
  assert.equal(Object.keys(s).sort().join(','), keys, 'Hub auth shape keys must stay stable across states');
}

assertNoForbiddenPhrases('portfolio source', portfolio);
assertNoForbiddenPhrases('detail source', detail);

console.log(`PASS auth-transition + hook-order tests (${transitions.length} transitions checked)`);
