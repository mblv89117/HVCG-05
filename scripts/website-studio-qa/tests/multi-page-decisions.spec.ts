/**
 * Phase 6B-QA hardening — multi-page identity + decision-action post-conditions.
 * Uses synthetic CRs for Reject/Cancel destructive paths. Never mutates live pilot for reject.
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

const PAGE_SMOKE = [
  { option: /About Us/i, routeHint: 'about', content: /Regular people|About/i },
  { option: /^Funding$/i, routeHint: 'funding', content: /Funding|capital/i },
  { option: /^FAQ$/i, routeHint: 'faq', content: /FAQ|question/i },
  { option: /^Contact$/i, routeHint: 'contact', content: /Contact|reach/i },
  { option: /Book a Strategy Call|Book Appointment/i, routeHint: 'book', content: /Book|strategy|appointment/i },
  { option: /Accessibility/i, routeHint: 'accessibility', content: /Accessibility|accessible/i },
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
  if (/access-denied/i.test(page.url())) {
    const cont = page.getByRole('button', { name: /Continue as Local Owner \(Dev\)/i });
    if (await cont.isVisible().catch(() => false)) await cont.click();
    await page.goto('/website-studio');
  }
  await expect(
    page.getByText(/Website Studio|Website Home|High Value Capital Group/i).first(),
  ).toBeVisible({ timeout: 30_000 });
}

async function openPages(page: Page) {
  await page.goto('/website-studio?view=pages');
  await page.waitForTimeout(600);
  if (!(await page.getByPlaceholder(/Search pages/i).isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /^Pages$/i }).click({ timeout: 15_000 });
    await page.waitForTimeout(800);
  }
  await expect(page.getByPlaceholder(/Search pages/i)).toBeVisible({ timeout: 20_000 });
}

async function shot(page: Page, name: string) {
  mkdirSync(EVIDENCE, { recursive: true });
  await page.screenshot({ path: join(EVIDENCE, `${name}.png`), fullPage: true });
}

test.describe.configure({ mode: 'serial' });

test('multi-page editor identity + randomized smoke', async ({ page }) => {
  test.setTimeout(240_000);
  const results: Array<{ page: string; pass: boolean; detail: string }> = [];
  await ensureDevOwner(page);
  await openPages(page);
  await shot(page, 'mp-01-pages');

  // Open Home editor
  await page.getByPlaceholder(/Search pages/i).fill('Home');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Edit$/i }).first().click();
  await page.waitForTimeout(2000);
  const pageSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Home' }) }).first();
  await expect(pageSelect).toBeVisible({ timeout: 15_000 });
  const homeSrc = await page.locator('iframe[title="Website preview"]').getAttribute('src');
  expect(homeSrc || '').toMatch(/127\.0\.0\.1:8765\/?$/);
  await expect(page.getByText(/Page:\s*Home/i).first()).toBeVisible();
  results.push({ page: 'Home', pass: true, detail: String(homeSrc) });
  await shot(page, 'mp-02-home-editor');

  for (const p of PAGE_SMOKE) {
    const options = await pageSelect.locator('option').allTextContents();
    const match = options.find((o) => p.option.test(o.trim()));
    if (!match) {
      throw new Error(`Missing page option for ${p.routeHint}: ${options.slice(0, 12).join(', ')}`);
    }
    await pageSelect.selectOption({ label: match.trim() });
    await page.waitForTimeout(2200);
    await expect(page.getByText(new RegExp(`Page:\\s*${match.trim()}`, 'i')).first()).toBeVisible({
      timeout: 10_000,
    });
    const src = (await page.locator('iframe[title="Website preview"]').getAttribute('src')) || '';
    const selected = await pageSelect.inputValue();
    const selectedLabel = await pageSelect.locator(`option[value="${selected}"]`).innerText();
    const pageOk =
      p.option.test(selectedLabel.trim()) && src.toLowerCase().includes(p.routeHint);
    // Advisor may still be refreshing; only fail if Top Recommendation clearly says homepage.
    const body = await page.locator('body').innerText();
    const topChunk = body.match(/Top Recommendation[\s\S]{0,220}/i)?.[0] || '';
    const noHomepageAdvisorOnOtherPage = !/outcome-driven homepage headline/i.test(topChunk);
    const pass = pageOk && noHomepageAdvisorOnOtherPage;
    results.push({
      page: p.routeHint,
      pass,
      detail: `src=${src}; option=${selectedLabel.trim()}; top=${topChunk.slice(0, 80)}`,
    });
    if (!pass) {
      await shot(page, `mp-FAIL-${p.routeHint}`);
      throw new Error(
        `Page identity failed for ${p.routeHint}: src=${src} selected=${selectedLabel} top=${topChunk}`,
      );
    }
    const frame = page.frameLocator('iframe[title="Website preview"]').first();
    await expect(frame.locator('body')).toContainText(p.content, { timeout: 15_000 });
    await shot(page, `mp-03-${p.routeHint}`);
  }

  const pages = (await hub('/api/website-studio/websites/ws_hvcg_real/pages')).pages as Array<{
    pageId: string;
    route: string;
  }>;
  const extras = pages.filter(
    (x) =>
      x.route !== '/' &&
      !PAGE_SMOKE.some((s) => x.route.includes(s.routeHint)) &&
      !x.route.includes('assessments'),
  );
  const pick = extras[Math.floor(Math.random() * Math.max(1, extras.length))];
  if (pick) {
    const preview = await hub(
      `/api/website-studio/websites/ws_hvcg_real/preview-page?pageId=${encodeURIComponent(pick.pageId)}`,
    );
    expect(String(preview.url)).toMatch(/127\.0\.0\.1:8765/);
    expect(String(preview.route)).toBe(pick.route);
    if (pick.route !== '/') expect(String(preview.url)).not.toMatch(/8765\/?$/);
    results.push({ page: `random:${pick.route}`, pass: true, detail: String(preview.url) });
  }

  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(join(EVIDENCE, 'multi-page-results.json'), JSON.stringify({ results }, null, 2));
});

test('decision actions post-conditions on synthetic CR (not pilot)', async ({ page }) => {
  test.setTimeout(180_000);
  const pages = (await hub('/api/website-studio/websites/ws_hvcg_real/pages')).pages as Array<{
    pageId: string;
    route: string;
  }>;
  const about = pages.find((p) => p.route === '/about')!;
  const funding = pages.find((p) => p.route === '/funding')!;

  await hub('/api/website-studio/qa/restore-pilot', {
    method: 'POST',
    body: JSON.stringify({ changeRequestId: PILOT }),
  });

  const created = await hub('/api/website-studio/natural-language', {
    method: 'POST',
    body: JSON.stringify({
      text: 'QA synthetic: clarify About Us hero for capital advisory owners',
      websiteId: 'ws_hvcg_real',
      pageId: about.pageId,
    }),
  });
  const syntheticId = String(created.changeRequest.changeRequestId);
  expect(syntheticId).not.toBe(PILOT);

  const saved = await hub(`/api/website-studio/change-requests/${syntheticId}/save-for-later`, {
    method: 'POST',
    body: '{}',
  });
  expect(String(saved.changeRequest.ownerStatus)).toBe('Saved for Later');

  await hub(`/api/website-studio/change-requests/${syntheticId}/owner-edit`, {
    method: 'POST',
    body: JSON.stringify({ proposedContent: 'About Us — capital clarity (QA edit)' }),
  });

  const rejectCreated = await hub('/api/website-studio/natural-language', {
    method: 'POST',
    body: JSON.stringify({
      text: 'QA synthetic reject target: Funding page CTA clarity',
      websiteId: 'ws_hvcg_real',
      pageId: funding.pageId,
    }),
  });
  const rejectId = String(rejectCreated.changeRequest.changeRequestId);
  expect(rejectId).not.toBe(PILOT);

  await ensureDevOwner(page);
  await page.goto(`/website-studio?view=review&cr=${rejectId}&mode=compare`);
  await page.waitForTimeout(1500);
  const rejectBtn = page.getByRole('button', { name: /^Reject$/i });
  if (await rejectBtn.isVisible().catch(() => false)) {
    await rejectBtn.click();
    await expect(page.getByRole('heading', { name: /Reject this website change/i })).toBeVisible({
      timeout: 10_000,
    });
    await shot(page, 'dec-01-reject-dialog');
    await page.getByRole('button', { name: /Yes, Reject Change/i }).click();
    await expect(page.getByText(/CHANGE REJECTED/i).first()).toBeVisible({ timeout: 15_000 });
    await shot(page, 'dec-02-change-rejected');
  } else {
    await hub(`/api/website-studio/change-requests/${rejectId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision: 'reject', notes: 'qa synthetic reject' }),
    });
  }

  const rejected = await hub(`/api/website-studio/change-requests/${rejectId}`);
  expect(String(rejected.changeRequest.status)).toBe('Rejected');
  expect(String(rejected.changeRequest.ownerStatus)).toBe('Rejected');
  expect(
    Boolean(rejected.changeRequest.proposedContent || rejected.changeRequest.reason),
  ).toBeTruthy();

  // Force refresh so History picks up enriched Rejected CR from list endpoint
  await page.goto('/website-studio?view=history');
  await page.waitForTimeout(800);
  const refresh = page.getByRole('button', { name: /^Refresh$/i });
  if (await refresh.isVisible().catch(() => false)) {
    await refresh.click();
    await page.waitForTimeout(1200);
  }
  if (!(await page.getByText(/Rejected/i).first().isVisible().catch(() => false))) {
    await page.getByRole('button', { name: /^History$/i }).click();
    await page.waitForTimeout(1000);
  }
  await expect(page.getByText(/Rejected/i).first()).toBeVisible({ timeout: 20_000 });
  await shot(page, 'dec-03-history-rejected');

  const cancelCreated = await hub('/api/website-studio/natural-language', {
    method: 'POST',
    body: JSON.stringify({
      text: 'QA synthetic cancel target',
      websiteId: 'ws_hvcg_real',
      pageId: about.pageId,
    }),
  });
  const cancelId = String(cancelCreated.changeRequest.changeRequestId);
  const cancelled = await hub(`/api/website-studio/change-requests/${cancelId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision: 'cancel', notes: 'qa cancel' }),
  });
  expect(String(cancelled.changeRequest.status)).toBe('Cancelled');

  const afterPilot = await hub(`/api/website-studio/change-requests/${PILOT}`);
  expect(String(afterPilot.changeRequest.changeRequestId)).toBe(PILOT);
  expect(String(afterPilot.changeRequest.status)).not.toBe('Rejected');

  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(
    join(EVIDENCE, 'decision-actions-results.json'),
    JSON.stringify(
      {
        syntheticRejectId: rejectId,
        syntheticSaveId: syntheticId,
        syntheticCancelId: cancelId,
        pilotStatus: afterPilot.changeRequest.status,
        pilotOwnerStatus: afterPilot.changeRequest.ownerStatus,
      },
      null,
      2,
    ),
  );
});

test('baseline and draft preview routing for page paths', async () => {
  const pages = (await hub('/api/website-studio/websites/ws_hvcg_real/pages')).pages as Array<{
    pageId: string;
    route: string;
  }>;
  const about = pages.find((p) => p.route === '/about')!;
  const draft = await hub(
    `/api/website-studio/websites/ws_hvcg_real/preview-page?pageId=${about.pageId}`,
  );
  expect(String(draft.url)).toBe('http://127.0.0.1:8765/about.html');
  expect(String(draft.route)).toBe('/about');

  const home = pages.find((p) => p.route === '/')!;
  const homePreview = await hub(
    `/api/website-studio/websites/ws_hvcg_real/preview-page?pageId=${home.pageId}`,
  );
  expect(String(homePreview.url)).toMatch(/http:\/\/127\.0\.0\.1:8765\/?$/);
});
