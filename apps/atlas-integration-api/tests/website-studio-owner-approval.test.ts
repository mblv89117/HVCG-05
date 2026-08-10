/**
 * Phase 6B-UX — owner approval workflow (persistence, preview identity, invalidation).
 * Approves drafts only — never publishes / merges / deploys.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import type { AddressInfo } from 'node:net';
import {
  HVCG_PILOT_BRANCH,
  HVCG_PILOT_WEBSITE_ID,
  PRODUCTION_DEPLOY_GATE,
} from '@hvcg/atlas-integration-core';
import { WebsiteStudioService } from '../src/website-studio/service.ts';
import { CURRENT_H1 } from '../src/website-studio/phase6b.ts';
import {
  fingerprintContent,
  ownerFriendlyStatus,
  verifyPreviewIdentity,
} from '../src/website-studio/ownerWorkflow.ts';

const AFTER =
  'Strategic capital advisory to help your business grow, qualify for capital, and build enterprise value.';

function makePilotFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-owner-'));
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
</head><body><h1>${CURRENT_H1}</h1></body></html>`;
  writeFileSync(join(dir, 'website', 'staging', 'index.html'), html);
  writeFileSync(join(dir, 'website', 'preview', 'index.html'), html);
  writeFileSync(
    join(dir, 'website', 'scripts', 'generate_pages.py'),
    `# generator\n    <h1>${CURRENT_H1}</h1>\n`,
  );
  writeFileSync(join(dir, 'website', 'staging', 'assets', 'logo.png'), 'x');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'baseline'], { cwd: dir });
  execFileSync('git', ['branch', '-M', 'main'], { cwd: dir });
  execFileSync('git', ['checkout', '-b', HVCG_PILOT_BRANCH], { cwd: dir });
  return dir;
}

function tempService(worktree: string) {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-owner-db-'));
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

async function serveStaging(worktree: string) {
  const root = join(worktree, 'website', 'staging');
  const server = createServer((req, res) => {
    const file = join(root, req.url === '/' || !req.url ? 'index.html' : req.url.replace(/^\//, ''));
    if (!existsSync(file)) {
      res.writeHead(404);
      res.end('missing');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  return {
    port,
    url: `http://127.0.0.1:${port}/`,
    close: () =>
      new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}

describe('website-studio owner approval workflow', () => {
  it('fingerprints and owner statuses are stable', () => {
    assert.equal(fingerprintContent(AFTER), fingerprintContent(`  ${AFTER}  `));
    assert.notEqual(fingerprintContent(AFTER), fingerprintContent(CURRENT_H1));
    const draft = {
      status: 'Waiting on Manny',
      qaStatus: 'WAITING ON MANNY',
      savedForLater: false,
    } as any;
    assert.equal(ownerFriendlyStatus(draft), 'Waiting for Your Review');
    assert.equal(ownerFriendlyStatus({ ...draft, savedForLater: true }), 'Saved for Later');
  });

  it('preview identity fails when preview offline', () => {
    const worktree = makePilotFixture();
    const { service, cleanup } = tempService(worktree);
    const boot = service.bootstrapPhase6bPilot({ worktreePath: worktree });
    const cr = boot.changeRequest;
    cr.mannyFinalWording = AFTER;
    cr.proposedContent = AFTER;
    service.store.upsertChangeRequest(cr);
    const website = service.getWebsite(HVCG_PILOT_WEBSITE_ID);
    const identity = verifyPreviewIdentity({
      cr,
      website,
      previewHealthStatus: 'offline',
      previewUrl: null,
    });
    assert.equal(identity.ok, false);
    assert.ok(identity.mismatches.some((m) => /not running/i.test(m)));
    cleanup();
  });

  it('owner approve persists draft approval without publishing; edit invalidates', async () => {
    const worktree = makePilotFixture();
    const { service, cleanup } = tempService(worktree);
    const boot = service.bootstrapPhase6bPilot({ worktreePath: worktree });
    const id = boot.changeRequest.changeRequestId;

    service.phase6bSetFinalWording(id, { customWording: AFTER });
    service.phase6bApproveFinalWording(id);
    service.phase6bApply(id);
    const committed = service.phase6bCommit(id);
    assert.ok(committed.commit);
    assert.equal(committed.pushed, false);

    const preview = await serveStaging(worktree);
    const website = service.getWebsite(HVCG_PILOT_WEBSITE_ID);
    website.stagingUrl = preview.url;
    service.store.upsertWebsite(website);

    await assert.rejects(
      () =>
        service.approveOwnerChange(id, {
          confirmed: true,
          previewReviewed: false,
        }),
      /preview must be reviewed/i,
    );

    const approved = await service.approveOwnerChange(id, {
      confirmed: true,
      previewReviewed: true,
      deviceReviews: { Desktop: true, Tablet: true, Mobile: true },
    });
    assert.equal(approved.published, false);
    assert.equal(approved.productionUnchanged, true);
    assert.equal(approved.nextStep, 'Ready for Publishing Review');
    assert.equal(approved.changeRequest.ownerStatus, 'Approved — Not Published');
    assert.equal(approved.changeRequest.ownerApproval?.published, false);
    assert.equal(approved.changeRequest.ownerApproval?.exactApprovedContent, AFTER);
    assert.equal(
      approved.changeRequest.ownerApproval?.contentFingerprint,
      fingerprintContent(AFTER),
    );
    assert.equal(approved.changeRequest.deploymentStatus, PRODUCTION_DEPLOY_GATE);

    const inbox = service.ownerInbox(HVCG_PILOT_WEBSITE_ID);
    assert.ok(inbox.approved.some((c) => c.changeRequestId === id));
    assert.equal(inbox.needsReview.some((c) => c.changeRequestId === id), false);

    const htmlAfter = service.getChangePreviewHtml(id, 'after');
    assert.match(htmlAfter, /DRAFT PREVIEW — NOT LIVE/);
    assert.ok(htmlAfter.includes(AFTER));
    const htmlBefore = service.getChangePreviewHtml(id, 'before');
    assert.match(htmlBefore, /BEFORE — Production baseline/);
    assert.ok(htmlBefore.includes(CURRENT_H1));

    const options = service.showMeThreeOptions(id);
    assert.equal(options.options.length, 3);
    assert.ok(options.options.some((o) => o.recommended));

    const edited = service.updateOwnerDraftContent(id, `${AFTER} (revised)`);
    assert.equal(edited.ownerApproval?.invalidated, true);
    assert.equal(edited.ownerStatus, 'Changes Requested');
    assert.equal(edited.visualQaConfirmedByManny, false);

    assert.throws(() => service.attemptForbiddenDeploy(), /deploy/i);
    assert.throws(() => service.phase6bPush(id), /push/i);
    assert.throws(() => service.phase6bRejectMerge(), /merge/i);

    await preview.close();
    cleanup();
  });

  it('save for later and ignore recommendation persist', () => {
    const worktree = makePilotFixture();
    const { service, cleanup } = tempService(worktree);
    const boot = service.bootstrapPhase6bPilot({ worktreePath: worktree });
    const id = boot.changeRequest.changeRequestId;
    const saved = service.saveChangeForLater(id);
    assert.equal(saved.ownerStatus, 'Saved for Later');
    assert.ok(service.ownerInbox(HVCG_PILOT_WEBSITE_ID).saved.some((c) => c.changeRequestId === id));

    const ignored = service.ignoreRecommendation({
      websiteId: HVCG_PILOT_WEBSITE_ID,
      recommendationId: 'rec_headline',
      scope: 'page',
      pageId: 'pg_home',
    });
    assert.equal(ignored.ignored, true);
    const list = service.listIgnoredRecommendations(HVCG_PILOT_WEBSITE_ID) as Array<{
      id: string;
      scope: string;
    }>;
    assert.ok(list.some((x) => x.id === 'rec_headline' && x.scope === 'page'));
    cleanup();
  });

  it('device review and mismatch block approval', async () => {
    const worktree = makePilotFixture();
    const { service, cleanup } = tempService(worktree);
    const boot = service.bootstrapPhase6bPilot({ worktreePath: worktree });
    const id = boot.changeRequest.changeRequestId;
    service.phase6bSetFinalWording(id, { customWording: AFTER });
    service.phase6bApproveFinalWording(id);
    service.phase6bApply(id);
    service.phase6bCommit(id);

    const devices = service.setDeviceReview(id, 'Desktop', true);
    assert.equal(devices.deviceReviews?.Desktop, true);

    // Force preview health offline so identity verification fails.
    const website = service.getWebsite(HVCG_PILOT_WEBSITE_ID);
    website.stagingUrl = 'http://127.0.0.1:59999/';
    service.store.upsertWebsite(website);

    await assert.rejects(
      () =>
        service.approveOwnerChange(id, {
          confirmed: true,
          previewReviewed: true,
        }),
      /PREVIEW VERSION MISMATCH/i,
    );
    cleanup();
  });
});
