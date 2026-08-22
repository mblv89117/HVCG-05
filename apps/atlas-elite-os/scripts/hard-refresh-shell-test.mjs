/**
 * Browser-like hard-refresh shell visibility check against a built dist/ or URL.
 * Usage: node scripts/hard-refresh-shell-test.mjs [baseUrl]
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const base = process.argv[2] || '';

function fromDist() {
  const htmlPath = join(root, 'dist/index.html');
  assert.ok(existsSync(htmlPath), 'dist/index.html missing — run production build first');
  const html = readFileSync(htmlPath, 'utf8');
  assert.match(html, /atlas-boot/);
  assert.match(html, /id="root"/);
  assert.ok(existsSync(join(root, 'dist/atlas-boot.js')), 'dist/atlas-boot.js missing');
  const jsMatch = html.match(/src="(\.?\/assets\/index-[^"]+\.js)"/);
  assert.ok(jsMatch);
  const js = readFileSync(join(root, 'dist', jsMatch[1].replace(/^\//, '')), 'utf8');
  assert.match(js, /access_as_user|Authorize Atlas Integration Hub|interaction_required/);
  assert.match(js, /react_render_error|Atlas hit a recoverable error/);
  assert.doesNotMatch(js, /scopes:\["openid","profile","email"\][\s\S]{0,240}return [a-z]\.idToken/);
  console.log('PASS hard-refresh shell dist tests', jsMatch[1]);
}

async function fromUrl(url) {
  const htmlRes = await fetch(url.replace(/\/$/, '') + '/projects');
  assert.equal(htmlRes.status, 200);
  const html = await htmlRes.text();
  assert.match(html, /atlas-boot/);
  assert.match(html, /id="root"/);
  const jsMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  assert.ok(jsMatch, 'main JS asset missing from HTML');
  const jsRes = await fetch(url.replace(/\/$/, '') + jsMatch[1]);
  assert.equal(jsRes.status, 200);
  assert.match(jsRes.headers.get('content-type') || '', /javascript|ecmascript/i);
  const js = await jsRes.text();
  assert.match(js, /Authorize Atlas Integration Hub|interaction_required|access_as_user/);
  assert.doesNotMatch(js, /scopes:\["openid","profile","email"\][\s\S]{0,240}return [a-z]\.idToken/);
  assert.match(js, /Atlas hit a recoverable error|react_render_error/);
  console.log('PASS hard-refresh shell URL tests', url, jsMatch[1]);
}

if (base) {
  await fromUrl(base);
} else {
  fromDist();
}
