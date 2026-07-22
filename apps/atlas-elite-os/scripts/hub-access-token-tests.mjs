/**
 * Hub Bearer token-type + race-gate source tests (plain Node).
 * Proves the SPA attaches accessToken for the Hub API scope, never idToken.
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
const config = readFileSync(join(root, 'src/microsoft/config.ts'), 'utf8');
const portfolio = readFileSync(join(root, 'src/pages/PortfolioPage.tsx'), 'utf8');
const detail = readFileSync(join(root, 'src/pages/ProjectDetailPage.tsx'), 'utf8');
const hubAuthMw = readFileSync(
  join(root, '../atlas-integration-api/src/middleware/auth.ts'),
  'utf8',
);

// acquireToken always returns accessToken
assert.match(msal, /return silent\.accessToken/);
assert.match(msal, /return interactive\.accessToken/);

// Hub bearer must use accessToken path via acquireToken(getHubApiScopes())
assert.match(msal, /export async function acquireHubBearerToken/);
assert.match(msal, /return acquireToken\(getHubApiScopes\(\)\)/);
assert.match(msal, /getHubApiScopes/);
assert.doesNotMatch(msal, /if \(silent\.idToken\) return silent\.idToken/);
assert.doesNotMatch(msal, /if \(interactive\.idToken\) return interactive\.idToken/);
assert.doesNotMatch(msal, /scopes:\s*\['openid',\s*'profile',\s*'email'\]/);

// Hub API scope must be api://…/access_as_user (not SPA-only openid)
assert.match(config, /integrationHubApiScope/);
assert.match(config, /api:\/\/99dd84b0-33f7-481b-86db-d76287b124f6\/access_as_user/);

// Central client attaches Authorization Bearer after resolveHubBearer
assert.match(hubFetch, /headers\.Authorization = `Bearer \$\{bearer\}`/);
assert.match(hubFetch, /await resolveHubBearer/);
assert.match(hubFetch, /credentials: 'omit'/);
assert.doesNotMatch(hubFetch, /return .*\.idToken|headers\.Authorization = `Bearer \$\{.*idToken/);
assert.doesNotMatch(hubFetch, /\.idToken\b/);
// Comment may mention idToken as forbidden; ensure no property read of idToken
assert.equal(/\bidToken\b/.test(hubFetch.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), false);

// Race gate: pages wait for tokenReady / hasBearer
assert.match(useHubAuth, /tokenReady/);
assert.match(useHubAuth, /hasBearer/);
assert.match(portfolio, /if \(!auth\.tokenReady\) return/);
assert.match(portfolio, /if \(!auth\.hasBearer\)/);
assert.match(detail, /if \(!auth\.tokenReady\) return/);
assert.match(detail, /if \(!auth\.hasBearer\)/);

// 401 must not be labeled Project not found; 404 still is
assert.match(detail, /status === 401/);
assert.match(detail, /status === 404/);
assert.match(detail, /title="Project not found"/);
assert.match(detail, /setAuthFailure/);
const authBlock = detail.slice(detail.indexOf('status === 401'), detail.indexOf('status === 404'));
assert.doesNotMatch(authBlock, /Project not found/);
assert.match(authBlock, /setAuthFailure/);
assert.doesNotMatch(authBlock, /setMissing\(true\)/);

// Hub middleware requires access token audience + scope, rejects Graph nonce
assert.match(hubAuthMw, /missing_scope|assertRequiredScope|requiredScope/);
assert.match(hubAuthMw, /graph_nonce_token/);
assert.match(hubAuthMw, /missing_bearer/);

console.log('PASS hub access-token + race-gate source tests');
