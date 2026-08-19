import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const appShell = readFileSync(join(root, 'AppShell.tsx'), 'utf8');

function slice(src: string, start: string, end: string): string {
  const i = src.indexOf(start);
  const j = src.indexOf(end, i + start.length);
  assert.ok(i >= 0 && j > i, `missing block ${start}`);
  return src.slice(i, j);
}

describe('Elite GlobalSearch vs nav RBAC', () => {
  it('nav sections hide Administration / Capital / Clients by capability', () => {
    const sections = slice(appShell, 'const sections = useMemo', 'const signedIn');
    assert.match(sections, /can\('viewAdmin'\)/);
    assert.match(sections, /can\('viewFinance'\)/);
    assert.match(sections, /can\('viewClients'\)/);
  });

  it('signed-in GlobalSearch must filter Administration like nav', () => {
    const results = slice(appShell, 'const results = useMemo', 'const notificationCount');
    assert.match(results, /can\(['"]viewAdmin['"]\)/, 'P2: signed-in search is not filtered by viewAdmin.');
  });

  it('signed-in GlobalSearch must filter Capital by viewFinance', () => {
    const results = slice(appShell, 'const results = useMemo', 'const notificationCount');
    assert.match(results, /can\(['"]viewFinance['"]\)/, 'P2: GlobalSearch does not filter Capital by viewFinance.');
  });

  it('unsigned GlobalSearch must not include Operations (Administration)', () => {
    const results = slice(appShell, 'const results = useMemo', 'const notificationCount');
    const unsignedKeepsOperations = /signedIn \? catalog :/.test(results) && /category === 'Operations'/.test(results);
    assert.equal(
      unsignedKeepsOperations,
      false,
      'P2: unsigned GlobalSearch still includes Operations (Administration, Connections).',
    );
  });

  it('Elite renders Hub search hits as returned (entitlement is Hub-enforced)', () => {
    assert.match(appShell, /searchPm\(hubAuth/);
    const effect = slice(appShell, 'void searchPm(hubAuth, q)', '.catch((');
    assert.match(effect, /found\.results/);
    assert.doesNotMatch(effect, /viewClients|allowedClientIds|can\(/);
  });

  it('Command-K catalog also filters Clients by viewClients', () => {
    const results = slice(appShell, 'const results = useMemo', 'const notificationCount');
    assert.match(results, /can\(['"]viewClients['"]\)/, 'P2: Command-K catalog does not filter Clients by viewClients.');
  });

  it('Command-K favorites and recents gate Capital by viewFinance', () => {
    const shortcut = slice(appShell, 'function shortcutAllowed', 'export function AppShell');
    assert.match(shortcut, /viewFinance/, 'P2: Command-K shortcuts are not filtered by viewFinance.');
    assert.match(shortcut, /path === '\/capital'/);
    assert.match(shortcut, /to\.startsWith\('\/capital\?'\)/);
    const fav = slice(appShell, 'const visibleFavorites', 'const visibleRecents');
    const recents = slice(appShell, 'const visibleRecents', 'const results = useMemo');
    assert.match(fav, /shortcutAllowed\(f, can\)/);
    assert.match(recents, /shortcutAllowed\(r, can\)/);
  });

  it('Command-K recents persist pathname only so Home /capital?opportunity= cannot stash a foreign id', () => {
    const recentsEffect = slice(appShell, 'const path = location.pathname', '}, [location.pathname]');
    assert.match(recentsEffect, /to: base/);
    assert.doesNotMatch(recentsEffect, /location\.search/);
    assert.doesNotMatch(recentsEffect, /opportunity=/);
  });

  it('unsigned Command-K never mixes Hub hits and Hub search only sends q', () => {
    const results = slice(appShell, 'const results = useMemo', 'const notificationCount');
    assert.match(results, /if \(!signedIn \|\| hubHits\.length === 0\) return nav/);
    assert.match(appShell, /searchPm\(hubAuth, q\)/);
    assert.doesNotMatch(appShell, /searchPm\([^;]*clientCode|searchPm\([^;]*scope=/);
  });

  it('Command-K does not invent a local Clients-array fallback when Hub is empty', () => {
    assert.doesNotMatch(appShell, /clients\.filter|directory\.filter|loadedClients|localIndex/);
    assert.match(appShell, /hubSearchError/);
    assert.match(appShell, /emptyLabel=\{hubSearchError/);
  });

  it('Command-K capital file hits keep the opportunity query route', () => {
    const rewrite = slice(appShell, 'function hubHitTo', 'function isClientShortcut');
    assert.match(rewrite, /capital_opportunity/);
    assert.match(rewrite, /\/capital\?opportunity=/);
  });
});
