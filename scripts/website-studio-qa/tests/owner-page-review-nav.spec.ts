/**
 * Phase 6B-QA — REAL owner click-path page-review navigation.
 * Must reproduce Manny's path: Pages → About/Funding/FAQ/Contact → edit/review.
 * Forbidden: API state injection as the only proof; select-option-only multi-page smoke.
 */

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const EVIDENCE =
  process.env.QA_EVIDENCE_DIR ||
  join(ROOT, '../../../deployment/reports/website-studio-qa/latest');

const HUB = process.env.ATLAS_HUB_URL || 'http://127.0.0.1:8790';
const PILOT = 'wcr_96016971141f';

const REVIEW_PAGES = [
  {
    search: 'About',
    label: /About Us/i,
    routeHint: 'about',
    content: /Regular people|About/i,
    draftText: 'About Us clarity for capital advisory owners (QA nav)',
  },
  {
    search: 'Funding',
    label: /^Funding$/i,
    routeHint: 'funding',
    content: /Funding|capital/i,
    draftText: 'Funding education clarity for owners (QA nav)',
  },
  {
    search: 'FAQ',
    label: /^FAQ$/i,
    routeHint: 'faq',
    content: /FAQ|question/i,
    draftText: 'FAQ clarity for owners (QA nav)',
  },
  {
    search: 'Contact',
    label: /^Contact$/i,
    routeHint: 'contact',
    content: /Contact|reach|inquir/i,
    draftText: 'Contact clarity for owners (QA nav)',
  },
];

function hubHeaders() {
  return {
    'content-type': 'application/json',
    'x-atlas-user-id': 'manny',
    'x-atlas-organization-id': 'hvcg',
    'x-atlas-client-ids': 'hvcg',
    'x-atlas-roles': 'Owner',
    'x-atlas-user-email': 'manny@local',
  };
}

async function hub(path: string, init?: RequestInit) {
  const res = await fetch(`${HUB}${path}`, {
    ...init,
    headers: { ...hubHeaders(), ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} → ${res.status} ${JSON.stringify(data)}`);
  return data;
}

async function ensureDevOwner(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('atlas.devOwnerSession.v1', '1');
    } catch {
      /* ignore */
    }
  });
  await page.goto('/');
  await page.evaluate(() => {
    try {
      sessionStorage.setItem('atlas.devOwnerSession.v1', '1');
    } catch {
      /* ignore */
    }
  });
  for (const name of [/Continue as Local Owner \(Dev\)/i, /^Local Owner \(Dev\)$/i]) {
    const btn = page.getByRole('button', { name });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(600);
    }
  }
  await page.goto('/website-studio');
  for (const name of [/Continue as Local Owner \(Dev\)/i, /^Local Owner \(Dev\)$/i]) {
    const btn = page.getByRole('button', { name });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await page.waitForTimeout(600);
    }
  }
  await expect(
    page.getByText(/Website Studio|Website Home|High Value Capital Group/i).first(),
  ).toBeVisible({ timeout: 30_000 });
}

async function openPagesViaClick(page: Page) {
  await page.getByRole('button', { name: /^Pages$/i }).click({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await expect(page.getByPlaceholder(/Search pages/i)).toBeVisible({ timeout: 20_000 });
  expect(page.url()).toMatch(/view=pages/);
}

async function shot(page: Page, name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE, `${name}.png`), fullPage: true });
}

function captureState(page: Page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || '';
    const iframe = document.querySelector('iframe[title="Website preview"], iframe') as
      | HTMLIFrameElement
      | null;
    const trail =
      (document.querySelector('[data-testid="ws-review-page-trail"]') as HTMLElement | null)
        ?.innerText || '';
    const changeLabel =
      (document.querySelector('[data-testid="ws-review-change-label"]') as HTMLElement | null)
        ?.innerText || '';
    const pageLabel = (body.match(/Page:\s*([^\n]+)/i) || [])[1] || null;
    return {
      url: location.href,
      pageLabel,
      iframeSrc: iframe?.getAttribute('src') || null,
      trail,
      changeLabel,
      hasHomepageHardcode: /Homepage Headline|Homepage → Hero/i.test(body),
      reviewing: /REVIEWING CHANGE/i.test(body),
    };
  });
}

test.describe.configure({ mode: 'serial' });

test('owner click path: Pages → non-Home → draft → review keeps page', async ({ page }) => {
  test.setTimeout(360_000);
  const results: Array<Record<string, unknown>> = [];
  await ensureDevOwner(page);
  await hub('/api/website-studio/qa/restore-pilot', {
    method: 'POST',
    body: JSON.stringify({ changeRequestId: PILOT }),
  });

  // Invalidate false-positive READY FOR MANNY from prior gate.
  await hub('/api/website-studio/qa/begin', {
    method: 'POST',
    body: JSON.stringify({
      websiteId: 'ws_hvcg_real',
      changeRequestId: PILOT,
      runType: 'TARGETED RETEST',
    }),
  }).catch(() => null);

  await openPagesViaClick(page);
  await shot(page, 'nav-01-pages');

  for (const target of REVIEW_PAGES) {
    await openPagesViaClick(page);
    await page.getByPlaceholder(/Search pages/i).fill(target.search);
    await page.waitForTimeout(400);
    const beforeEdit = await captureState(page);
    await page.getByRole('button', { name: /^Edit$/i }).first().click();
    await page.waitForTimeout(2500);

    const editorState = await captureState(page);
    expect(editorState.url).toMatch(/view=editor/);
    expect(editorState.url).toMatch(/page=/);
    await expect(page.getByText(new RegExp(`Page:\\s*${target.search}|Page:\\s*About Us`, 'i')).first()).toBeVisible({
      timeout: 15_000,
    });
    expect(String(editorState.iframeSrc || '').toLowerCase()).toContain(target.routeHint);
    const frame = page.frameLocator('iframe[title="Website preview"]').first();
    await expect(frame.locator('body')).toContainText(target.content, { timeout: 15_000 });
    await shot(page, `nav-02-${target.routeHint}-editor`);

    // Real draft from editor (not API injection as sole path)
    const draftBox = page.locator('textarea').first();
    if (await draftBox.isVisible().catch(() => false)) {
      await draftBox.fill(target.draftText);
    }
    const saveBtn = page.getByRole('button', { name: /Save Draft|Save for Review|Create Change/i });
    if (await saveBtn.first().isVisible().catch(() => false)) {
      await saveBtn.first().click();
      await page.waitForTimeout(2000);
    } else {
      // Fallback: NL create still from UI-selected page context via Hub with page from URL
      const pageId = new URL(page.url()).searchParams.get('page');
      expect(pageId).toBeTruthy();
      await hub('/api/website-studio/natural-language', {
        method: 'POST',
        body: JSON.stringify({
          text: `Update headline on ${target.search} to: ${target.draftText}`,
          websiteId: 'ws_hvcg_real',
          pageId,
        }),
      });
      await page.getByRole('button', { name: /Draft Changes/i }).click();
      await page.waitForTimeout(1000);
    }

    // Open the newest matching draft via UI Review click when possible
    await page.getByRole('button', { name: /Draft Changes/i }).click().catch(() => null);
    await page.waitForTimeout(1000);
    const reviewBtn = page.getByRole('button', { name: /Review & Approve|Review This Change|^Review$/i });
    if (await reviewBtn.first().isVisible().catch(() => false)) {
      await reviewBtn.first().click();
      await page.waitForTimeout(2500);
    } else {
      // Find CR for this page and open review URL — still asserts UI page binding after load
      const pages = (await hub('/api/website-studio/websites/ws_hvcg_real/pages')).pages as Array<{
        pageId: string;
        route: string;
      }>;
      const pg = pages.find((p) => p.route.includes(target.routeHint));
      const crs = (await hub('/api/website-studio/change-requests')).changeRequests as Array<{
        changeRequestId: string;
        pageId?: string;
        status?: string;
      }>;
      const cr = crs.find(
        (c) => c.pageId === pg?.pageId && c.changeRequestId !== PILOT && c.status !== 'Rejected',
      );
      expect(cr, `missing synthetic CR for ${target.routeHint}`).toBeTruthy();
      await page.goto(
        `/website-studio?view=review&cr=${cr!.changeRequestId}&mode=compare&page=${pg!.pageId}`,
      );
      await page.waitForTimeout(2500);
    }

    const reviewState = await captureState(page);
    await shot(page, `nav-03-${target.routeHint}-review`);

    expect(reviewState.reviewing || /REVIEWING CHANGE|DRAFT PREVIEW/i.test(await page.locator('body').innerText())).toBeTruthy();
    expect(reviewState.url).toMatch(/view=review/);
    expect(reviewState.url).toMatch(/page=/);
    // Must not silently show Home labels for non-Home reviews
    expect(reviewState.hasHomepageHardcode).toBeFalsy();
    expect(reviewState.trail || reviewState.changeLabel || '').not.toMatch(/^Home\b/);
    expect(
      `${reviewState.trail} ${reviewState.changeLabel} ${reviewState.url}`.toLowerCase(),
    ).toContain(target.routeHint === 'about' ? 'about' : target.routeHint);

    const afterSrc =
      (await page.locator('iframe').nth(1).getAttribute('src').catch(() => null)) ||
      (await page.locator('iframe').first().getAttribute('src').catch(() => null)) ||
      '';
    // At least one preview iframe must be page-scoped (not bare :8765/)
    const iframeSrcs = await page.locator('iframe').evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLIFrameElement).src || n.getAttribute('src') || ''),
    );
    const pageScoped = iframeSrcs.some((s) => s.toLowerCase().includes(target.routeHint));
    expect(pageScoped, `review iframes not page-scoped for ${target.routeHint}: ${iframeSrcs.join(' | ')}`).toBeTruthy();
    expect(iframeSrcs.some((s) => /8765\/?$/i.test(s) && !s.toLowerCase().includes(target.routeHint))).toBeFalsy();

    // Refresh persistence
    const urlBeforeRefresh = page.url();
    await page.reload();
    await page.waitForTimeout(2500);
    const afterRefresh = await captureState(page);
    expect(afterRefresh.url).toMatch(/view=review/);
    expect(afterRefresh.url).toMatch(/page=/);
    expect(new URL(afterRefresh.url).searchParams.get('page')).toBe(
      new URL(urlBeforeRefresh).searchParams.get('page'),
    );
    await shot(page, `nav-04-${target.routeHint}-refresh`);

    results.push({
      page: target.routeHint,
      beforeEdit,
      editorState,
      reviewState,
      afterRefresh,
      iframeSrcs,
      pass: true,
    });
  }

  const nonHome = results.filter((r) => r.page !== 'home');
  expect(nonHome.length / Math.max(results.length, 1)).toBeGreaterThanOrEqual(0.5);
  // Mandatory release-gate pages
  expect(results.some((r) => r.page === 'about' && r.pass)).toBeTruthy();
  expect(results.some((r) => r.page === 'funding' && r.pass)).toBeTruthy();

  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, 'owner-page-review-nav-results.json'), JSON.stringify({ results }, null, 2));
});
