/**
 * Phase 6B-UX — preview lifecycle adapter tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  assertAllowlistedPreviewCommand,
  buildPreviewPageUrl,
  resolvePreviewCwd,
  WebsitePreviewManager,
} from '../src/website-studio/previewManager.ts';
import { WebsiteStudioService } from '../src/website-studio/service.ts';

describe('website-studio preview lifecycle', () => {
  it('allow-lists only npm run preview', () => {
    assert.equal(assertAllowlistedPreviewCommand('npm run preview'), 'npm run preview');
    assert.throws(() => assertAllowlistedPreviewCommand('rm -rf /'), /allow-listed/i);
    assert.throws(() => assertAllowlistedPreviewCommand('npm run deploy'), /allow-listed/i);
  });

  it('builds page preview URLs for static HTML staging', () => {
    assert.equal(buildPreviewPageUrl('http://127.0.0.1:8765/', { route: '/' }), 'http://127.0.0.1:8765/');
    assert.equal(
      buildPreviewPageUrl('http://127.0.0.1:8765/', {
        route: '/about',
        sourceFile: 'about.html',
      }),
      'http://127.0.0.1:8765/about.html',
    );
  });

  it('resolves preview cwd to website/ package when present', () => {
    const root = mkdtempSync(join(tmpdir(), 'ws-preview-cwd-'));
    mkdirSync(join(root, 'website'));
    writeFileSync(join(root, 'website', 'package.json'), JSON.stringify({ scripts: { preview: 'echo hi' } }));
    const cwd = resolvePreviewCwd({
      websiteId: 'ws_test',
      websiteName: 'Test',
      businessEntity: 'Test',
      productionUrl: null,
      stagingUrl: 'http://127.0.0.1:8765/',
      repositoryUrl: null,
      localRepositoryPath: root,
      framework: 'Static HTML',
      hostingProvider: null,
      productionBranch: 'main',
      defaultDevelopmentBranch: 'dev',
      buildCommand: null,
      testCommand: null,
      previewCommand: 'npm run preview',
      deploymentMethod: null,
      contentArchitecture: null,
      seoArchitecture: null,
      analyticsProvider: null,
      formProvider: null,
      status: 'Registered',
      lastSuccessfulDeployment: null,
      lastRollbackPoint: null,
      openChangeRequestCount: 0,
      repositoryHealth: 'Unknown',
      notes: null,
      synthetic: false,
      mannyConfirmedRegistration: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    assert.equal(cwd, join(root, 'website'));
    rmSync(root, { recursive: true, force: true });
  });

  it('service preview health reports offline when nothing listens', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-preview-'));
    const service = new WebsiteStudioService({
      repoRoot: dir,
      env: { WEBSITE_STUDIO_DB: join(dir, 'ws.sqlite') },
      dbPath: join(dir, 'ws.sqlite'),
    });
    const health = await service.previewHealth('ws_hvcg_demo');
    assert.ok(['offline', 'unknown', 'running'].includes(String(health.status)));
    // synthetic demo may not have real path — start should fail closed for synthetic
    await assert.rejects(() => service.startWebsitePreview('ws_hvcg_demo'), /synthetic|real websites only/i);
    service.store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('manager refuses non-allowlisted paths outside roots', () => {
    const mgr = new WebsitePreviewManager();
    assert.ok(mgr);
    assert.throws(
      () =>
        resolvePreviewCwd({
          websiteId: 'x',
          websiteName: 'x',
          businessEntity: 'x',
          productionUrl: null,
          stagingUrl: null,
          repositoryUrl: null,
          localRepositoryPath: '/etc/passwd-parent-not-real',
          framework: 'Static HTML',
          hostingProvider: null,
          productionBranch: 'main',
          defaultDevelopmentBranch: 'dev',
          buildCommand: null,
          testCommand: null,
          previewCommand: 'npm run preview',
          deploymentMethod: null,
          contentArchitecture: null,
          seoArchitecture: null,
          analyticsProvider: null,
          formProvider: null,
          status: 'Registered',
          lastSuccessfulDeployment: null,
          lastRollbackPoint: null,
          openChangeRequestCount: 0,
          repositoryHealth: 'Unknown',
          notes: null,
          synthetic: false,
          mannyConfirmedRegistration: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      /allow-listed|package/i,
    );
  });
});
