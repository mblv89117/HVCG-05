/**
 * Phase 6B-UX — Expert Website Advisor & preview health (read-only).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HVCG_PILOT_WEBSITE_ID } from '@hvcg/atlas-integration-core';
import { WebsiteStudioService } from '../src/website-studio/service.ts';
import {
  advisorChatReply,
  analyzePage,
  checkPreviewHealth,
} from '../src/website-studio/advisor.ts';

function tempService() {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-ws-6b-ux-'));
  const dbPath = join(dir, 'ws.sqlite');
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

describe('website-studio Phase 6B-UX advisor', () => {
  it('page analysis returns scores and recommendations', () => {
    const { service, cleanup } = tempService();
    const analysis = service.analyzePage('ws_hvcg_demo', 'pg_hvcg_home');
    assert.ok(typeof analysis.overallScore === 'number');
    assert.ok(analysis.overallScore >= 0 && analysis.overallScore <= 100);
    assert.ok(analysis.label.length > 5);
    assert.ok(typeof analysis.health.messaging === 'number');
    assert.ok(typeof analysis.health.conversion === 'number');
    assert.ok(Array.isArray(analysis.opportunities));
    assert.ok(analysis.opportunities.length >= 1 && analysis.opportunities.length <= 8);
    assert.ok(analysis.opportunities.every((r) => r.mannyApprovalRequired === true));
    assert.ok(analysis.quickWins.length >= 1);
    assert.ok(analysis.analyzedAt);
    assert.ok(analysis.pagePurpose.length > 10);
    cleanup();
  });

  it('HVCG context uses advisory language without inventing metrics', () => {
    const { service, cleanup } = tempService();
    const analysis = service.analyzePage('ws_hvcg_demo', 'pg_hvcg_home');
    assert.match(analysis.pagePurpose, /consultation|capital|enterprise value/i);
    const blob = JSON.stringify(analysis);
    assert.doesNotMatch(blob, /\$10\s*million raised/i);
    assert.doesNotMatch(blob, /\d+\+?\s*clients served/i);
    const site = service.analyzeWebsite('ws_hvcg_demo');
    assert.match(site.summary, /HVCG|High Value Capital Group|capital advisory/i);
    assert.match(site.summary, /No Production|no deploy|read-only/i);
    cleanup();
  });

  it('flags verification for $10M raised style advice in chat', () => {
    const { service, cleanup } = tempService();
    const website = service.getWebsite('ws_hvcg_demo');
    const chat = advisorChatReply('Add a stat that we have $10M raised for clients', {
      website,
      page: service.listPages('ws_hvcg_demo')[0],
    });
    assert.match(chat.reply, /VERIFICATION REQUIRED/i);
    assert.doesNotMatch(chat.reply, /we have \$10/i);
    assert.ok(chat.suggestedFollowUps.length >= 2);

    const viaService = service.advisorChat(
      'ws_hvcg_demo',
      'Put $10M raised on the homepage hero',
      'pg_hvcg_home',
    );
    assert.match(viaService.reply, /VERIFICATION REQUIRED/i);
    cleanup();
  });

  it('statistic blocks trigger verification on page analysis', () => {
    const { service, cleanup } = tempService();
    service.store.upsertBlock({
      blockId: 'blk_test_stat',
      websiteId: 'ws_hvcg_demo',
      pageId: 'pg_hvcg_home',
      blockType: 'statistic',
      sourceFile: 'app/page.tsx',
      sourceLocation: 'stats.0',
      currentValue: '$10M+ raised for business owners',
      proposedValue: null,
      characterCount: 32,
      lastModified: null,
      changeRequestId: null,
      aiGenerated: false,
      mannyApproved: false,
      validationStatus: 'Warning',
    });
    const website = service.getWebsite('ws_hvcg_demo');
    const page = service.listPages('ws_hvcg_demo').find((p) => p.pageId === 'pg_hvcg_home')!;
    const blocks = service.listBlocks('ws_hvcg_demo', 'pg_hvcg_home');
    const result = analyzePage({
      website,
      page,
      blocks,
      seo: service.seoForPage('ws_hvcg_demo', 'pg_hvcg_home').seo,
    });
    assert.ok(result.verificationRequiredClaims.length >= 1);
    assert.ok(result.warnings.some((w) => /VERIFICATION REQUIRED/i.test(w)));
    assert.ok(
      result.opportunities.some((r) => /verify|VERIFICATION/i.test(r.reason + r.recommendation)),
    );
    cleanup();
  });

  it('preview health returns expected structure', async () => {
    const unknown = await checkPreviewHealth(null);
    assert.equal(unknown.status, 'unknown');
    assert.equal(unknown.url, null);
    assert.ok(unknown.checkedAt);

    const nonLocal = await checkPreviewHealth('https://example.com');
    assert.equal(nonLocal.status, 'unknown');

    const { service, cleanup } = tempService();
    const health = await service.previewHealth('ws_hvcg_demo');
    assert.ok(['running', 'offline', 'unknown'].includes(health.status));
    assert.ok(health.checkedAt);
    cleanup();
  });

  it('forbidden deploy still blocked', () => {
    const { service, cleanup } = tempService();
    assert.throws(() => service.attemptForbiddenDeploy(), /deploy forbidden/i);
    assert.throws(
      () => service.runAiAssist({ websiteId: 'ws_hvcg_demo', operation: 'deploy' }),
      /Forbidden/,
    );
    cleanup();
  });

  it('health banner mentions 6B-UX lightly', () => {
    const { service, cleanup } = tempService();
    const b = service.banners();
    assert.match(String(b.phase6bUx), /6B-UX|Advisor/i);
    assert.equal(b.phase, '6B-UX');
    assert.equal(b.noDeploy, 'NO PRODUCTION DEPLOY IN PHASE 6A/6B');
    void HVCG_PILOT_WEBSITE_ID;
    cleanup();
  });
});
