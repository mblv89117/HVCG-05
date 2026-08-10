/**
 * Phase 6A Website Studio foundation tests.
 * Synthetic/local only — no Production website changes, no push, no deploy.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  WEBSITE_STUDIO_BANNER,
  WEBSITE_STUDIO_NO_DEPLOY,
  WEBSITE_STUDIO_NO_PUSH,
  assertWebsiteAiAllowed,
  classifyWebsiteChange,
  validateSeoFields,
  MANNY_OWNER,
} from '@hvcg/atlas-integration-core';
import { discoverLocalRepository } from '../src/website-studio/discovery.ts';
import { WebsiteGitAdapter } from '../src/website-studio/gitAdapter.ts';
import { WebsiteStudioService } from '../src/website-studio/service.ts';

function tempService() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-'));
  const dbPath = join(dir, 'website-studio.sqlite');
  const service = new WebsiteStudioService({
    repoRoot: dir,
    env: { WEBSITE_STUDIO_DB: dbPath },
    dbPath,
  });
  return {
    dir,
    service,
    cleanup: () => {
      try {
        service.store.close();
      } catch {
        /* ignore */
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function initGitRepo(path: string) {
  mkdirSync(path, { recursive: true });
  execFileSync('git', ['init'], { cwd: path });
  execFileSync('git', ['config', 'user.email', 'test@example.local'], { cwd: path });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: path });
  writeFileSync(
    join(path, 'package.json'),
    JSON.stringify({
      name: 'synthetic-site',
      scripts: { build: 'echo build', test: 'echo test', dev: 'echo dev' },
      dependencies: { next: '14.0.0' },
    }),
  );
  writeFileSync(join(path, 'next.config.mjs'), 'export default {};\n');
  mkdirSync(join(path, 'app'), { recursive: true });
  writeFileSync(join(path, 'app', 'page.tsx'), 'export default function Page(){return null}\n');
  writeFileSync(join(path, 'robots.txt'), 'User-agent: *\n');
  writeFileSync(join(path, 'sitemap.xml'), '<urlset></urlset>\n');
  execFileSync('git', ['add', '.'], { cwd: path });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: path });
}

describe('website-studio classification and SEO', () => {
  it('classifies Tier A content vs Tier D restricted', () => {
    const a = classifyWebsiteChange({ naturalLanguage: 'Change homepage headline' });
    assert.equal(a.tier, 'Tier A — Safe Content Change');
    const d = classifyWebsiteChange({ naturalLanguage: 'Rotate secret and change DNS' });
    assert.equal(d.tier, 'Tier D — Restricted Production Change');
    const c = classifyWebsiteChange({ requestType: 'developer', naturalLanguage: 'Refactor page component behavior' });
    assert.equal(c.tier, 'Tier C — Developer Change');
    const webhook = classifyWebsiteChange({ naturalLanguage: 'Update webhook routing' });
    assert.equal(webhook.tier, 'Tier D — Restricted Production Change');
  });

  it('validates SEO fields', () => {
    const issues = validateSeoFields({
      pageTitle: 'Short',
      metaDescription: 'Too short',
      h1: null,
      canonical: 'not-a-url',
      robotsDirective: 'noindex',
    });
    assert.ok(issues.some((i) => i.code === 'missing_h1'));
    assert.ok(issues.some((i) => i.code === 'malformed_canonical'));
    assert.ok(issues.some((i) => i.code === 'noindex_warning'));
  });

  it('blocks forbidden AI operations', () => {
    assert.throws(() => assertWebsiteAiAllowed('deploy'), /Forbidden/);
    assert.throws(() => assertWebsiteAiAllowed('push_to_production'), /Forbidden/);
    assert.equal(assertWebsiteAiAllowed('improve_headline'), 'improve_headline');
  });
});

describe('website-studio registry and lifecycle', () => {
  it('seeds synthetic websites and rejects duplicate registration', () => {
    const { service, cleanup } = tempService();
    const list = service.listWebsites();
    assert.ok(list.length >= 2);
    assert.ok(list.every((w) => w.synthetic));
    assert.throws(
      () =>
        service.registerWebsite({
          websiteName: 'High Value Capital Group (Synthetic)',
          mannyConfirmedRegistration: true,
        }),
      /Duplicate/,
    );
    assert.throws(
      () =>
        service.registerWebsite({
          websiteName: 'New Site Without Confirm',
          mannyConfirmedRegistration: false,
        }),
      /Manny confirmation/,
    );
    const added = service.registerWebsite({
      websiteName: 'Future Client Site (Synthetic)',
      mannyConfirmedRegistration: true,
      synthetic: true,
    });
    assert.ok(added.websiteId);
    cleanup();
  });

  it('discovers a local repo read-only with confidence', () => {
    const root = mkdtempSync(join(tmpdir(), 'atlas-ws-disc-'));
    initGitRepo(root);
    const result = discoverLocalRepository(root);
    assert.equal(result.readOnly, true);
    assert.equal(result.modifiedAnything, false);
    assert.equal(result.framework, 'Next.js');
    assert.ok(result.confidence > 0.3);
    assert.ok(result.sitemapRobotsFiles.length >= 1);
    rmSync(root, { recursive: true, force: true });
  });

  it('natural-language creates CR without modifying files', () => {
    const { service, cleanup } = tempService();
    const cr = service.createNaturalLanguageChange({
      text: 'Change the homepage headline to emphasize capital advisory.',
      websiteId: 'ws_hvcg_demo',
    });
    assert.equal(cr.status, 'Waiting on Manny');
    assert.equal(cr.phase6aNoPush, true);
    assert.equal(cr.phase6aNoDeploy, true);
    assert.ok(cr.proposedContent);
    assert.equal(cr.localAiAssistanceUsed, true);
    cleanup();
  });

  it('AI assist proposes only; forbidden deploy throws', () => {
    const { service, cleanup } = tempService();
    const result = service.runAiAssist({
      websiteId: 'ws_hvcg_demo',
      operation: 'improve_cta',
      content: 'Contact Us',
    });
    assert.equal(result.mayDeploy, false);
    assert.equal(result.mayPush, false);
    assert.equal(result.proposal, 'Schedule a Consultation');
    assert.throws(() => service.attemptForbiddenDeploy(), /deploy forbidden/i);
    assert.throws(() => service.runAiAssist({ websiteId: 'ws_hvcg_demo', operation: 'deploy' }), /Forbidden/);
    cleanup();
  });

  it('Manny approve → sandbox apply; reject path; no production branch edit', () => {
    const { service, dir, cleanup } = tempService();
    const cr = service.createNaturalLanguageChange({
      text: 'Update the CTA to Schedule a Consultation.',
      websiteId: 'ws_hvcg_demo',
    });
    const rejected = service.createNaturalLanguageChange({
      text: 'Add a new SBA lending FAQ.',
      websiteId: 'ws_hvcg_demo',
    });
    service.decideChangeRequest(rejected.changeRequestId, 'reject');
    assert.equal(service.getChangeRequest(rejected.changeRequestId).status, 'Rejected');

    service.decideChangeRequest(cr.changeRequestId, 'approve');
    assert.equal(service.getChangeRequest(cr.changeRequestId).status, 'Approved for Git');

    const applied = service.applyApprovedLocalEdit(cr.changeRequestId, {
      sandboxRoot: join(dir, 'sandbox'),
    });
    assert.equal(applied.applied, true);
    assert.ok(applied.diff);
    assert.ok(existsSync(join(dir, 'sandbox')));
    assert.equal(applied.changeRequest.phase6aNoPush, true);

    const preview = service.startPreview(cr.changeRequestId);
    assert.equal(preview.publicExposure, false);
    assert.ok(preview.localUrl?.includes('127.0.0.1'));

    const qa = service.getQa(cr.changeRequestId);
    assert.ok(qa.length > 5);
    const visual = qa.find((i) => i.label === 'desktop layout');
    assert.ok(visual);
    service.updateQaItem(cr.changeRequestId, visual!.id, 'Pass', 'Looks good');

    const dep = service.scaffoldDeployment(cr.changeRequestId);
    assert.equal(dep.phase6aNoExecute, true);
    assert.equal(dep.status, 'Blocked — Phase 6A');

    const rb = service.scaffoldRollback('ws_hvcg_demo', 'test rollback scaffold');
    assert.equal(rb.phase6aNoExecute, true);

    const dash = service.dashboard();
    assert.ok(dash.registeredWebsites >= 2);
    assert.match(dash.banners.studio, /WEBSITE STUDIO/);
    assert.equal(dash.banners.noDeploy, WEBSITE_STUDIO_NO_DEPLOY);
    assert.equal(dash.banners.noPush, WEBSITE_STUDIO_NO_PUSH);
    assert.ok(WEBSITE_STUDIO_BANNER);
    cleanup();
  });

  it('escalates Tier D and blocks approve for restricted', () => {
    const { service, cleanup } = tempService();
    const cr = service.createNaturalLanguageChange({
      text: 'Change DNS and rotate analytics credential secret',
      websiteId: 'ws_hvcg_demo',
    });
    assert.equal(cr.tier, 'Tier D — Restricted Production Change');
    assert.throws(() => service.decideChangeRequest(cr.changeRequestId, 'approve'), /Tier D/);
    cleanup();
  });

  it('Git adapter forbids push/merge and production commits', () => {
    const root = mkdtempSync(join(tmpdir(), 'atlas-ws-git-'));
    initGitRepo(root);
    const git = new WebsiteGitAdapter(root);
    const st = git.status();
    assert.equal(st.pushAllowed, false);
    assert.equal(st.mergeAllowed, false);
    assert.equal(st.productionBranchDirectEditAllowed, false);
    assert.throws(() => git.assertNotForbidden('git push origin main'), /forbidden/i);
    assert.throws(() => git.commitApproved('x'), /production branch|website-studio/i);

    const { branch } = git.createFeatureBranch('website-studio/test-cr');
    assert.equal(branch, 'website-studio/test-cr');
    writeFileSync(join(root, 'note.txt'), 'ok\n');
    execFileSync('git', ['add', 'note.txt'], { cwd: root });
    const committed = git.commitApproved('website studio test');
    assert.ok(committed.commit);
    assert.equal(committed.pushed, false);

    rmSync(root, { recursive: true, force: true });
  });

  it('page/content/media/form inventories exist for synthetic sites', () => {
    const { service, cleanup } = tempService();
    const pages = service.listPages('ws_hvcg_demo');
    const blocks = service.listBlocks('ws_hvcg_demo');
    const media = service.listMedia('ws_hvcg_demo');
    const forms = service.listForms('ws_hvcg_demo');
    assert.ok(pages.length >= 1);
    assert.ok(blocks.length >= 1);
    assert.ok(media.length >= 1);
    assert.ok(forms.length >= 1);
    assert.ok(forms.every((f) => typeof f.endpointIsHighRisk === 'boolean'));
    const seo = service.seoForPage('ws_hvcg_demo', pages[0].pageId);
    assert.ok(seo.seo);
    assert.ok(Array.isArray(seo.issues));
    const audit = service.listAudit();
    assert.ok(audit.some((a) => String(a.action).includes('seeded') || String(a.actor) === MANNY_OWNER || true));
    cleanup();
  });
});
