/**
 * Premium walkthrough evidence for Elite commercial workspace (directive 7 recert).
 * Dev-only Local Owner chrome — not a production certification of frozen Elite 75d0c59.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '../../docs/revenue-os/premium');
mkdirSync(outDir, { recursive: true });

const BASE = process.env.ELITE_BASE_URL || 'http://127.0.0.1:5180';

async function dismissLocalOwner(page) {
  const localOwner = page.getByRole('button', { name: 'Continue as Local Owner (Dev)' });
  if (await localOwner.isVisible({ timeout: 2500 }).catch(() => false)) {
    await localOwner.click();
    await page.waitForTimeout(400);
  }
}

async function notes(page) {
  const heading = await page.getByRole('heading', { name: /Commercial workspace/i }).first().innerText().catch(() => '');
  const alerts = await page.getByRole('alert').allInnerTexts().catch(() => []);
  const buttons = await page.getByRole('button').allInnerTexts().catch(() => []);
  const body = await page.locator('body').innerText();
  return {
    url: page.url(),
    heading,
    alerts,
    buttons: buttons.map((b) => b.trim()).filter(Boolean).slice(0, 24),
    hasLiveDispatchFalse: /liveDispatch false/i.test(body),
    hasAutoSendFalse: /autoSend false/i.test(body),
    hasAcmeFloor: /\$10,000/.test(body) && /\$35,000/.test(body),
    hasFailClosed: /Commercial context not loaded/i.test(body),
    hasSkipLink: /Skip to main content/i.test(body),
  };
}

async function walk(page, prefix, size, a11y) {
  await page.setViewportSize(size);
  await page.goto(`${BASE}/revenue`, { waitUntil: 'networkidle' });
  await dismissLocalOwner(page);

  // Shell / nav
  await page.goto(`${BASE}/revenue`, { waitUntil: 'networkidle' });
  await page.getByText('Commercial workspace').first().waitFor({ timeout: 15000 });
  await page.screenshot({ path: join(outDir, `${prefix}-shell-nav.png`), fullPage: true });
  a11y[`${prefix}-shell-nav`] = await notes(page);

  // Empty / error — no opportunity id (fail closed)
  await page.screenshot({ path: join(outDir, `${prefix}-empty-error.png`), fullPage: true });
  a11y[`${prefix}-empty-error`] = await notes(page);

  // REVOS-ELITE-RT-20260820-01 unmatched ACCG
  await page.goto(`${BASE}/revenue?opportunity=opp-accg-expansion-001`, { waitUntil: 'networkidle' });
  await page.getByTestId('commercial-fail-closed').waitFor({ timeout: 15000 });
  await page.getByText('Commercial context not loaded').first().waitFor();
  await page.screenshot({ path: join(outDir, `${prefix}-00-fail-closed-accg.png`), fullPage: true });
  a11y[`${prefix}-00-fail-closed`] = await notes(page);

  // Matched ACME — Needs Action (awaiting operator)
  await page.goto(`${BASE}/revenue?opportunity=opp-revos-001`, { waitUntil: 'networkidle' });
  await page.getByText('Commercial workspace').first().waitFor({ timeout: 15000 });
  await page.getByText(/QUALIFIED OPPORTUNITY/i).first().waitFor();
  await page.screenshot({ path: join(outDir, `${prefix}-01-workspace.png`), fullPage: true });
  a11y[`${prefix}-01-needs-action`] = await notes(page);

  await page.getByRole('button', { name: 'Operator accept offer' }).click();
  await page.getByRole('button', { name: 'Operator accept pricing' }).click();
  await page.screenshot({ path: join(outDir, `${prefix}-02-accepted-pricing.png`), fullPage: true });
  a11y[`${prefix}-02-ready`] = await notes(page);

  await page.getByRole('button', { name: 'Send proposal' }).click();
  await page.getByText(/BL-C1: proposal cannot auto-send/i).waitFor();
  await page.screenshot({ path: join(outDir, `${prefix}-03-send-blocked.png`), fullPage: true });
  a11y[`${prefix}-03-blocked`] = await notes(page);

  await page.getByRole('button', { name: 'Record acceptance (no live send)' }).click();
  await page.getByRole('button', { name: 'Open engagement' }).click();
  await page.getByText(/eng-revos-001/i).waitFor();
  await page.screenshot({ path: join(outDir, `${prefix}-04-engagement.png`), fullPage: true });
  a11y[`${prefix}-04-engagement`] = await notes(page);
}

const a11y = {};
const browser = await chromium.launch({ headless: true });
for (const [prefix, size] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage();
  await walk(page, prefix, size, a11y);
  await page.close();
}
await browser.close();
writeFileSync(join(outDir, 'A11Y-NOTES.json'), JSON.stringify(a11y, null, 2) + '\n');
console.log(`premium evidence written to ${outDir}`);
