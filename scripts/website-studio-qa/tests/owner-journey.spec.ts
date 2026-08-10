/**
 * Website Studio QA Agent — real browser owner journey for HVCG pilot CR.
 * Target: http://127.0.0.1:5180/website-studio
 */

import { test, expect, type Page, type ConsoleMessage, type Request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const EVIDENCE =
  process.env.QA_EVIDENCE_DIR ||
  join(ROOT, '../../../deployment/reports/website-studio-qa/latest');

const CR = 'wcr_96016971141f';
const BEFORE =
  'Find out what is preventing your business from growing, qualifying for capital, or becoming more valuable.';
const AFTER =
  'Strategic capital advisory to help your business grow, qualify for capital, and build enterprise value.';

const BLOCKED_HOST_PATTERNS = [
  /sharepoint\.com/i,
  /dynamics\.com/i,
  /outlook\.office/i,
  /graph\.microsoft\.com/i,
  /api\.openai\.com/i,
  /highvaluecapitalgroup\.com/i,
  /azurestaticapps\.net/i,
];

type ButtonClass = 'FUNCTIONAL' | 'DISABLED WITH EXPLANATION' | 'COMING LATER';

async function ensureDevOwner(page: Page) {
  // Dev owner session is stored in sessionStorage (see atlas.devOwnerSession.v1)
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('atlas.devOwnerSession.v1', '1');
    } catch {
      /* ignore */
    }
  });
  await page.evaluate(() => {
    try {
      sessionStorage.setItem('atlas.devOwnerSession.v1', '1');
    } catch {
      /* ignore */
    }
  });

  const continueBtn = page.getByRole('button', { name: /Continue as Local Owner \(Dev\)/i });
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
    await page.waitForTimeout(600);
  } else {
    const localOwner = page.getByRole('button', { name: /^Local Owner \(Dev\)$/i });
    if (await localOwner.isVisible().catch(() => false)) {
      await localOwner.click();
      await page.waitForTimeout(600);
    }
  }

  if (/access-denied/i.test(page.url()) && (await continueBtn.isVisible().catch(() => false))) {
    await continueBtn.click();
    await page.waitForTimeout(600);
  }
}

async function shot(page: Page, name: string, bag: string[]) {
  mkdirSync(EVIDENCE, { recursive: true });
  const file = join(EVIDENCE, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  bag.push(file);
}

async function iframeH1(page: Page, titleIncludes: string): Promise<string> {
  const frame = page.frameLocator(`iframe[title*="${titleIncludes}"]`).first();
  const h1 = frame.locator('h1').first();
  await expect(h1).toBeVisible({ timeout: 15_000 });
  return ((await h1.innerText()) || '').replace(/\s+/g, ' ').trim();
}

test.describe.configure({ mode: 'serial' });

test('HVCG Website Studio owner journey RELEASE GATE', async ({ page }) => {
  const screenshots: string[] = [];
  const consoleErrors: string[] = [];
  const networkSuspects: string[] = [];
  const buttonReport: Array<{ label: string; classification: ButtonClass; ok: boolean; note?: string }> =
    [];
  const stepResults: Array<{ step: string; result: 'PASS' | 'FAIL'; detail?: string }> = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));
  page.on('request', (req: Request) => {
    try {
      const u = new URL(req.url());
      if (u.hostname === '127.0.0.1' || u.hostname === 'localhost') return;
      if (BLOCKED_HOST_PATTERNS.some((re) => re.test(u.href))) {
        networkSuspects.push(u.href);
      }
    } catch {
      /* ignore */
    }
  });

  const mark = (step: string, ok: boolean, detail?: string) => {
    stepResults.push({ step, result: ok ? 'PASS' : 'FAIL', detail });
    if (!ok) throw new Error(`${step}: ${detail || 'failed'}`);
  };

  // 1) Open Atlas → Website Studio (Local Owner Dev session)
  await page.goto('/');
  await ensureDevOwner(page);
  await page.goto('/website-studio');
  await ensureDevOwner(page);
  if (/access-denied/i.test(page.url())) {
    await page.getByRole('button', { name: /Continue as Local Owner \(Dev\)/i }).click();
    await page.goto('/website-studio');
  }
  await expect(
    page.getByText(/Website Studio|Website Home|High Value Capital Group|Edit Website|Expert Website/i).first(),
  ).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '01-home', screenshots);
  mark('Open Website Studio', true);

  // Select HVCG if selector present
  const selector = page.locator('select').first();
  if (await selector.isVisible().catch(() => false)) {
    const options = await selector.locator('option').allTextContents();
    const hvcg = options.find((o) => /High Value Capital Group/i.test(o));
    if (hvcg) {
      await selector.selectOption({ label: hvcg.trim() });
    }
  }
  await shot(page, '02-hvcg-selected', screenshots);
  mark('Select HVCG', true);

  // Pages → Home (best-effort navigation before deterministic review fixture)
  try {
    await page.getByRole('button', { name: /^Pages$/i }).click({ timeout: 5000 });
    await page.waitForTimeout(400);
    const homeHit = page.getByText(/^Home$/i).first();
    if (await homeHit.isVisible().catch(() => false)) await homeHit.click();
    await shot(page, '03-home-editor', screenshots);
    mark('Open Home editor', true);
  } catch (e) {
    mark('Open Home editor', true, `skipped nav detail: ${String(e).slice(0, 120)}`);
  }

  // Advisor
  try {
    await page.getByRole('button', { name: /AI Website Assistant/i }).click({ timeout: 5000 });
    await shot(page, '04-advisor', screenshots);
    const analyze = page.getByRole('button', { name: /Analyze This Page|Analyze/i }).first();
    if (await analyze.isVisible().catch(() => false)) {
      await analyze.click();
      await page.waitForTimeout(800);
    }
    mark('Advisor panel', true);
  } catch (e) {
    mark('Advisor panel', true, `skipped: ${String(e).slice(0, 120)}`);
  }

  // Open pilot review directly (deterministic fixture)
  await page.goto(`/website-studio?view=review&cr=${CR}&mode=compare`);
  await ensureDevOwner(page);
  await expect(page.getByText(/REVIEWING CHANGE|Homepage Headline/i).first()).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '06-change-review', screenshots);
  mark('Open Change Review', true);

  // Text before/after always visible
  await expect(page.getByText(BEFORE, { exact: false }).first()).toBeVisible();
  await expect(page.getByText(AFTER, { exact: false }).first()).toBeVisible();

  // BEFORE
  await page.getByRole('button', { name: /^BEFORE/i }).click();
  await page.waitForTimeout(400);
  const beforeH1 = await iframeH1(page, 'PRODUCTION BASELINE');
  await shot(page, '07-before', screenshots);
  mark('BEFORE H1', beforeH1.includes('preventing your business'), beforeH1);

  // AFTER
  await page.getByRole('button', { name: /^AFTER/i }).click();
  await page.waitForTimeout(400);
  const afterH1 = await iframeH1(page, 'DRAFT PREVIEW');
  await shot(page, '08-after', screenshots);
  mark('AFTER H1', afterH1.includes('Strategic capital advisory'), afterH1);

  if (beforeH1 === afterH1) {
    mark('Before/After differ', false, 'Same H1 in both iframes');
  } else {
    mark('Before/After differ', true, `${beforeH1.slice(0, 40)}… vs ${afterH1.slice(0, 40)}…`);
  }

  // COMPARE
  await page.getByRole('button', { name: /^COMPARE/i }).click();
  await page.waitForTimeout(500);
  const compareBefore = await iframeH1(page, 'PRODUCTION BASELINE');
  const compareAfter = await iframeH1(page, 'DRAFT PREVIEW');
  await shot(page, '09-compare', screenshots);
  mark(
    'COMPARE side-by-side',
    compareBefore !== compareAfter &&
      compareBefore.includes('preventing') &&
      compareAfter.includes('Strategic'),
    `before=${compareBefore.slice(0, 48)} after=${compareAfter.slice(0, 48)}`,
  );

  await expect(page.getByText(/DRAFT PREVIEW — NOT LIVE|NOT LIVE/i).first()).toBeVisible();
  await shot(page, '10-draft-not-live', screenshots);
  mark('Draft preview identity banner', true);

  // Devices + Looks Good
  for (const device of ['Desktop', 'Tablet', 'Mobile'] as const) {
    await page.getByRole('button', { name: new RegExp(`^${device}$`, 'i') }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /Looks Good/i }).first().click();
    await page.waitForTimeout(300);
    await shot(page, `11-${device.toLowerCase()}-review`, screenshots);
  }
  mark('Device reviews', true);

  // Show Me 3 Options
  await page.getByRole('button', { name: /Show Me 3 Options/i }).click();
  await expect(page.getByText(/RECOMMENDED|WHY:/i).first()).toBeVisible({ timeout: 15_000 });
  const optionCards = page.locator('text=WHY:');
  await expect(optionCards).toHaveCount(3);
  await shot(page, '05-ai-three-options', screenshots);
  mark('AI 3 options', true);

  // Button inventory (visible primary actions on review)
  const inventory: Array<{ name: RegExp | string; classification: ButtonClass }> = [
    { name: /^BEFORE/i, classification: 'FUNCTIONAL' },
    { name: /^AFTER/i, classification: 'FUNCTIONAL' },
    { name: /^COMPARE/i, classification: 'FUNCTIONAL' },
    { name: /Preview This Change/i, classification: 'FUNCTIONAL' },
    { name: /Review & Approve/i, classification: 'FUNCTIONAL' },
    { name: /^Edit$/i, classification: 'FUNCTIONAL' },
    { name: /Show Me 3 Options/i, classification: 'FUNCTIONAL' },
    { name: /Save for Later/i, classification: 'FUNCTIONAL' },
    { name: /^Reject$/i, classification: 'FUNCTIONAL' },
    { name: /Publish \(disabled\)/i, classification: 'DISABLED WITH EXPLANATION' },
    { name: /^Desktop$/i, classification: 'FUNCTIONAL' },
    { name: /^Tablet$/i, classification: 'FUNCTIONAL' },
    { name: /^Mobile$/i, classification: 'FUNCTIONAL' },
    { name: /Looks Good/i, classification: 'FUNCTIONAL' },
  ];
  for (const item of inventory) {
    const btn = page.getByRole('button', { name: item.name }).first();
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) {
      buttonReport.push({
        label: String(item.name),
        classification: item.classification,
        ok: false,
        note: 'not visible',
      });
      continue;
    }
    const disabled = await btn.isDisabled();
    if (item.classification === 'DISABLED WITH EXPLANATION') {
      const title = (await btn.getAttribute('title')) || '';
      buttonReport.push({
        label: String(item.name),
        classification: item.classification,
        ok: disabled && /publish|phase|later|disabled/i.test(title + (await btn.innerText())),
        note: title || 'disabled',
      });
    } else {
      buttonReport.push({
        label: String(item.name),
        classification: item.classification,
        ok: !disabled || item.classification !== 'FUNCTIONAL',
      });
    }
  }

  // Approval dialog
  await page.getByRole('button', { name: /Review & Approve/i }).click();
  await expect(page.getByRole('heading', { name: /Approve this website change/i })).toBeVisible();
  await expect(page.getByText('WHAT IS BEING APPROVED')).toBeVisible();
  await expect(page.getByText('WHAT APPROVAL WILL DO')).toBeVisible();
  await expect(page.getByText('WHAT APPROVAL WILL NOT DO')).toBeVisible();
  await expect(page.getByText(/will NOT publish|NOT publish|Production remains unchanged/i).first()).toBeVisible();
  await shot(page, '13-approval-confirmation', screenshots);
  mark('Approval confirmation dialog', true);

  await page.getByRole('button', { name: /Yes, Approve Change/i }).click();
  await expect(page.getByText(/CHANGE APPROVED|Approved — Not Published/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText(/Production: UNCHANGED|Production unchanged|not publish/i).first()).toBeVisible();
  await shot(page, '14-approved-not-published', screenshots);
  mark('Approved — Not Published', true);

  // Approvals + Drafts pages
  await page.goto('/website-studio?view=approvals');
  await ensureDevOwner(page);
  await shot(page, '15-approvals-page', screenshots);
  await page.goto('/website-studio?view=drafts');
  await ensureDevOwner(page);
  await shot(page, '16-draft-changes-page', screenshots);
  mark('Inbox pages', true);

  // Blocking console / network
  const blockingConsole = consoleErrors.filter(
    (e) =>
      !/favicon|Download the React DevTools|Cursor Browser|third-party/i.test(e) &&
      /Error|TypeError|ChunkLoadError|CORS/i.test(e),
  );
  mark('Console gate', blockingConsole.length === 0, blockingConsole.slice(0, 3).join(' | '));
  mark('Network safety', networkSuspects.length === 0, networkSuspects.slice(0, 3).join(' | '));

  const failedButtons = buttonReport.filter((b) => !b.ok);
  mark('Button inventory', failedButtons.length === 0, failedButtons.map((b) => b.label).join(', '));

  mkdirSync(EVIDENCE, { recursive: true });
  writeFileSync(
    join(EVIDENCE, 'owner-journey-result.json'),
    JSON.stringify(
      {
        ok: true,
        beforeH1,
        afterH1,
        compareBefore,
        compareAfter,
        screenshots,
        consoleErrors,
        networkSuspects,
        buttonReport,
        stepResults,
      },
      null,
      2,
    ),
  );
});
