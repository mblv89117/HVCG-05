/**
 * Phase 6B-QA — baseline materialize + FULL VISUAL RENDER probes.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  ensureBaselinePreviewServer,
  materializeBaselineStaging,
  probeVisualRender,
  stopBaselinePreviewServer,
} from '../src/website-studio/visualRender.ts';

const BEFORE =
  'Find out what is preventing your business from growing, qualifying for capital, or becoming more valuable.';
const AFTER =
  'Strategic capital advisory to help your business grow, qualify for capital, and build enterprise value.';

function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-visual-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.local'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  mkdirSync(join(dir, 'website', 'staging', 'assets', 'brand'), { recursive: true });
  mkdirSync(join(dir, 'website', 'staging', 'js'), { recursive: true });
  const writeSite = (h1: string) => {
    writeFileSync(
      join(dir, 'website', 'staging', 'index.html'),
      `<!doctype html><html><head><link rel="stylesheet" href="styles.css"/></head>
<body><h1>${h1}</h1><img src="assets/brand/hvcg-logo-nav.png"/><script src="js/site.js"></script></body></html>`,
    );
    writeFileSync(
      join(dir, 'website', 'staging', 'styles.css'),
      ':root { --bg: #050505; } body { background: var(--bg); font-family: Cormorant Garamond, serif; }',
    );
    writeFileSync(join(dir, 'website', 'staging', 'js', 'site.js'), 'window.__x=1');
    writeFileSync(join(dir, 'website', 'staging', 'assets', 'brand', 'hvcg-logo-nav.png'), 'png');
  };
  writeSite(BEFORE);
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'baseline'], { cwd: dir });
  const baseline = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir, encoding: 'utf8' }).trim();
  writeSite(AFTER);
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'pilot'], { cwd: dir });
  return { dir, baseline };
}

describe('website-studio visual render', () => {
  it('materializes baseline staging with CSS assets and serves styled BEFORE preview', async () => {
    const { dir, baseline } = makeRepo();
    const cache = mkdtempSync(join(tmpdir(), 'atlas-ws-base-cache-'));
    try {
      const root = materializeBaselineStaging({
        worktreePath: dir,
        baselineCommit: baseline,
        cacheRoot: cache,
      });
      assert.ok(existsSync(join(root, 'index.html')));
      assert.ok(existsSync(join(root, 'styles.css')));
      assert.ok(existsSync(join(root, 'assets', 'brand', 'hvcg-logo-nav.png')));

      const testPort = 18766;
      const server = await ensureBaselinePreviewServer({
        worktreePath: dir,
        baselineCommit: baseline,
        port: testPort,
      });
      assert.equal(server.port, testPort);
      const probe = await probeVisualRender({
        mode: 'before',
        url: server.url,
        port: server.port,
        commit: baseline,
        expectedH1: BEFORE,
        documentRoot: server.documentRoot,
      });
      assert.equal(probe.ok, true, probe.mismatches.join('; '));
      assert.equal(probe.unstyled, false);
      assert.equal(probe.h1, BEFORE);
      assert.equal(probe.stylesCssLooksLikeCss, true);
      assert.ok(!probe.critical404s.length);
    } finally {
      await stopBaselinePreviewServer(baseline, 18766);
      rmSync(dir, { recursive: true, force: true });
      rmSync(cache, { recursive: true, force: true });
    }
  });

  it('fails closed when CSS is missing (unstyled)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-unstyled-'));
    mkdirSync(join(dir, 'staging'), { recursive: true });
    writeFileSync(
      join(dir, 'staging', 'index.html'),
      '<!doctype html><html><body><h1>Plain</h1></body></html>',
    );
    // Serve via ensure path is heavier — probe a fake offline URL
    const probe = await probeVisualRender({
      mode: 'after',
      url: 'http://127.0.0.1:1/',
      port: 1,
      commit: null,
      expectedH1: 'Plain',
    });
    assert.equal(probe.ok, false);
    assert.equal(probe.unstyled, true);
    rmSync(dir, { recursive: true, force: true });
  });
});
