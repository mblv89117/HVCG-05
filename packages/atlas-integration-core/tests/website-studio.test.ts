/**
 * Phase 6A core schema tests for Website Studio.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WEBSITE_STUDIO_ACCESS,
  WEBSITE_STUDIO_BANNER,
  assertWebsiteAiAllowed,
  buildDefaultQaChecklist,
  classifyWebsiteChange,
  newChangeRequestId,
  syntheticWebsiteFixtures,
  validateSeoFields,
  LOCAL_AI_OWNER,
  type WebsiteChangeRequest,
} from '../src/index.ts';

describe('website-studio core Phase 6A', () => {
  it('exports synthetic multi-website fixtures', () => {
    const sites = syntheticWebsiteFixtures();
    assert.ok(sites.length >= 2);
    assert.ok(sites.every((s) => s.synthetic && s.mannyConfirmedRegistration));
  });

  it('access matrix denies Local AI deploy/merge/publish', () => {
    const ai = WEBSITE_STUDIO_ACCESS[LOCAL_AI_OWNER];
    assert.equal(ai.deploy, false);
    assert.equal(ai.merge, false);
    assert.equal(ai.publish, false);
    assert.equal(ai.draft, true);
  });

  it('builds QA checklist with Manny visual items', () => {
    const cr = {
      changeRequestId: newChangeRequestId(),
      buildRequired: true,
      testsRequired: false,
      seoImpact: 'title',
      formImpact: null,
      reason: 'headline',
      naturalLanguageRequest: null,
    } as WebsiteChangeRequest;
    const qa = buildDefaultQaChecklist(cr);
    assert.ok(qa.some((i) => i.label === 'desktop layout' && i.status === 'Manny Review'));
    assert.ok(qa.some((i) => i.label === 'no secret exposure'));
  });

  it('banner constants present', () => {
    assert.match(WEBSITE_STUDIO_BANNER, /WEBSITE STUDIO/);
    assert.throws(() => assertWebsiteAiAllowed('change_secrets'));
    assert.equal(classifyWebsiteChange({ naturalLanguage: 'FAQ update' }).riskLevel, 'Low');
    assert.ok(validateSeoFields({ pageTitle: 'A'.repeat(45), metaDescription: 'B'.repeat(120), h1: 'H', ogTitle: 'O', ogDescription: 'D' }).length === 0);
  });
});
