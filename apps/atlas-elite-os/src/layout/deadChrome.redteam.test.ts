/**
 * D12 dead-chrome nav honesty — deferred products stay out of default primary nav.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEAD_CHROME_PATHS,
  PRIMARY_NAV_ALLOWED_PATHS,
  isDeadChromePath,
  isPrimaryNavAllowedPath,
} from './deadChrome.ts';

const root = dirname(fileURLToPath(import.meta.url));
const appShell = readFileSync(join(root, 'AppShell.tsx'), 'utf8');

function slice(src: string, start: string, end: string): string {
  const i = src.indexOf(start);
  const j = src.indexOf(end, i + start.length);
  assert.ok(i >= 0 && j > i, `missing block ${start}`);
  return src.slice(i, j);
}

describe('D12 dead-chrome primary nav', () => {
  it('deadChrome helpers classify deferred paths', () => {
    for (const p of DEAD_CHROME_PATHS) {
      assert.equal(isDeadChromePath(p), true, p);
      assert.equal(isPrimaryNavAllowedPath(p), false, p);
    }
    for (const p of PRIMARY_NAV_ALLOWED_PATHS) {
      assert.equal(isDeadChromePath(p), false, p);
      assert.equal(isPrimaryNavAllowedPath(p), true, p);
    }
    assert.equal(isDeadChromePath('/clients/SYN01'), false);
    assert.equal(isDeadChromePath('/clients/intake'), true);
  });

  it('default allSections only contains daily-desk + gated ops paths', () => {
    const block = slice(appShell, 'const allSections: NavSection[] = [', 'const catalog:');
    for (const p of DEAD_CHROME_PATHS) {
      assert.doesNotMatch(block, new RegExp(`to:\\s*'${p.replace(/\//g, '\\/')}'`));
    }
    for (const keep of [
      "'/'",
      "'/my-work'",
      "'/tasks'",
      "'/projects'",
      "'/leads'",
      "'/opportunities'",
      "'/clients'",
      "'/capital'",
      "'/knowledge'",
      "'/documents/operating'",
      "'/connections'",
      "'/admin'",
    ]) {
      assert.match(block, new RegExp(`to:\\s*${keep}`));
    }
  });

  it('Command-K catalog excludes dead-chrome destinations', () => {
    const block = slice(appShell, 'const catalog: SearchResult[] = [', 'const KIND_LABEL');
    for (const p of DEAD_CHROME_PATHS) {
      assert.doesNotMatch(block, new RegExp(`to:\\s*'${p.replace(/\//g, '\\/')}'`));
    }
  });

  it('runtime filters refuse dead chrome in sections, catalog, and shortcuts', () => {
    assert.match(appShell, /isDeadChromePath/);
    assert.match(appShell, /isPrimaryNavAllowedPath/);
    assert.match(appShell, /if \(isDeadChromePath\(to\)\) return false/);
    assert.match(appShell, /if \(isDeadChromePath\(path\)\) return;/);
  });
});
