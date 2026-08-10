/**
 * Phase 6B tests — HVCG pilot workflow (fixture worktree; no Production deploy).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import {
  HVCG_PILOT_BRANCH,
  HVCG_PILOT_WEBSITE_ID,
  PRODUCTION_DEPLOY_GATE,
  buildHeadlinePilotProposals,
} from '@hvcg/atlas-integration-core';
import { WebsiteStudioService } from '../src/website-studio/service.ts';
import { CURRENT_H1 } from '../src/website-studio/phase6b.ts';

const H1 = CURRENT_H1;

function makePilotFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-6b-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.local'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  mkdirSync(join(dir, 'website', 'staging'), { recursive: true });
  mkdirSync(join(dir, 'website', 'preview'), { recursive: true });
  mkdirSync(join(dir, 'website', 'scripts'), { recursive: true });
  mkdirSync(join(dir, 'website', 'staging', 'assets'), { recursive: true });
  writeFileSync(
    join(dir, 'website', 'package.json'),
    JSON.stringify({
      name: 'hvcg-public-website',
      scripts: {
        preview: 'python3 -m http.server 8765 --bind 127.0.0.1 --directory staging',
        smoke: 'echo smoke-ok',
        'validate:eva': 'echo validate-ok',
        generate: 'echo generate-ok',
      },
    }),
  );
  writeFileSync(join(dir, 'website', 'AZURE_SWA_DEPLOYMENT.md'), '# Azure SWA\n');
  const html = `<!doctype html><html><head><title>Home | High Value Capital Group</title>
<meta name="description" content="HVCG helps owners increase enterprise value."/>
<script type="application/ld+json">{"@type":"Organization"}</script>
</head><body><h1>${H1}</h1></body></html>`;
  writeFileSync(join(dir, 'website', 'staging', 'index.html'), html);
  writeFileSync(join(dir, 'website', 'preview', 'index.html'), html);
  writeFileSync(
    join(dir, 'website', 'scripts', 'generate_pages.py'),
    `# generator\n    <h1>${H1}</h1>\n`,
  );
  writeFileSync(join(dir, 'website', 'staging', 'assets', 'logo.png'), 'x');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'baseline'], { cwd: dir });
  execFileSync('git', ['branch', '-M', 'main'], { cwd: dir });
  execFileSync('git', ['checkout', '-b', HVCG_PILOT_BRANCH], { cwd: dir });
  return dir;
}

function tempService(worktree: string) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-6b-db-'));
  const dbPath = join(dir, 'ws.sqlite');
  const service = new WebsiteStudioService({
    repoRoot: dir,
    env: { WEBSITE_STUDIO_DB: dbPath },
    dbPath,
  });
  return {
    service,
    dir,
    cleanup: () => {
      try {
        service.store.close();
      } catch {
        /* ignore */
      }
      rmSync(dir, { recursive: true, force: true });
      rmSync(worktree, { recursive: true, force: true });
    },
  };
}

describe('website-studio Phase 6B HVCG pilot', () => {
  it('builds 3 AI headline variants with one recommendation', () => {
    const { variants, recommendedVariantId } = buildHeadlinePilotProposals(H1);
    assert.equal(variants.length, 3);
    assert.ok(variants.every((v) => v.text.length > 10));
    assert.equal(variants.filter((v) => v.recommended).length, 1);
    assert.equal(recommendedVariantId, 'variant_b');
  });

  it('bootstraps discovery/registry/baseline/pilot CR without modifying files', () => {
    const worktree = makePilotFixture();
    const before = readFileSync(join(worktree, 'website/staging/index.html'), 'utf8');
    const { service, cleanup } = tempService(worktree);
    const boot = service.bootstrapPhase6bPilot({ worktreePath: worktree });
    assert.equal(boot.filesModified, false);
    assert.equal(boot.candidateBRegistered, false);
    assert.equal(boot.registered.website.websiteId, HVCG_PILOT_WEBSITE_ID);
    assert.equal(boot.registered.website.synthetic, false);
    assert.ok(boot.baseline.baselineCommit);
    assert.equal(boot.changeRequest.phase6bPilot, true);
    assert.equal(boot.changeRequest.filesModified, false);
    assert.equal((boot.changeRequest.aiProposals || []).length, 3);
    assert.equal(boot.changeRequest.status, 'Waiting on Manny');
    assert.equal(boot.changeRequest.deploymentStatus, PRODUCTION_DEPLOY_GATE);
    assert.equal(readFileSync(join(worktree, 'website/staging/index.html'), 'utf8'), before);
    cleanup();
  });

  it('allows select/edit/reject without file changes; apply only after exact approval', () => {
    const worktree = makePilotFixture();
    const { service, cleanup } = tempService(worktree);
    const boot = service.bootstrapPhase6bPilot({ worktreePath: worktree });
    const id = boot.changeRequest.changeRequestId;

    const selected = service.phase6bSetFinalWording(id, { selectedVariantId: 'variant_a' });
    assert.equal(selected.filesModified, false);
    assert.ok(selected.mannyFinalWording?.includes('Strategic capital advisory'));

    const custom = service.phase6bSetFinalWording(id, {
      customWording: 'Strategic capital advisory for disciplined business growth.',
    });
    assert.equal(custom.mannyFinalWording, 'Strategic capital advisory for disciplined business growth.');
    assert.equal(custom.finalWordingApproved, false);

    assert.throws(() => service.phase6bApply(id), /final wording/i);

    const approved = service.phase6bApproveFinalWording(id);
    assert.equal(approved.finalWordingApproved, true);
    assert.equal(approved.status, 'Approved for Git');

    const applied = service.phase6bApply(id);
    assert.ok(applied.filesChanged.length >= 1);
    assert.match(applied.diff, /Strategic capital advisory for disciplined business growth/);
    assert.ok(
      readFileSync(join(worktree, 'website/staging/index.html'), 'utf8').includes(
        'Strategic capital advisory for disciplined business growth',
      ),
    );

    // reject path on a fresh CR
    const boot2 = service.phase6b.createPilotHomepagePilot({
      naturalLanguage: 'Update the HVCG homepage headline to emphasize strategic capital advisory and business growth.',
    });
    // restore original files for second CR apply tests not needed — reject only
    const rejected = service.phase6bSetFinalWording(boot2.changeRequestId, { rejectAll: true });
    assert.equal(rejected.status, 'Rejected');

    assert.throws(() => service.phase6bRejectMerge(), /merge forbidden/i);
    assert.throws(() => service.attemptForbiddenDeploy(), /deploy/i);

    // push gate
    assert.throws(() => service.phase6bPush(id), /push/i);
    service.phase6bConfirmVisualQa(id, true);
    const committed = service.phase6bCommit(id);
    assert.ok(committed.commit);
    assert.equal(committed.pushed, false);
    assert.throws(() => service.phase6bPush(id), /push/i);

    const panel = service.getPilotReviewPanel(id);
    assert.equal(panel.deployDisabled, true);
    assert.match(String(panel.productionDeployment), /SEPARATE MANNY AUTHORIZATION/);

    cleanup();
  });

  it('refuses apply on production main checkout path', () => {
    const worktree = makePilotFixture();
    const { service, cleanup } = tempService(worktree);
    const boot = service.bootstrapPhase6bPilot({ worktreePath: worktree });
    const id = boot.changeRequest.changeRequestId;
    service.phase6bSetFinalWording(id, { selectedVariantId: 'variant_b' });
    service.phase6bApproveFinalWording(id);
    const cr = service.getChangeRequest(id);
    cr.worktreePath = '/Volumes/MacMiniPro2TB/Autonomous Marketing';
    service.store.upsertChangeRequest(cr);
    assert.throws(() => service.phase6bApply(id), /Production main checkout/i);
    cleanup();
  });
});
