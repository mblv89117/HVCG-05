/**
 * Premium walkthrough evidence for Elite commercial workspace.
 * Dev-only Local Owner chrome — not a production certification session.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '../../docs/revenue-os/premium');
mkdirSync(outDir, { recursive: true });

const BASE = process.env.ELITE_BASE_URL || 'http://127.0.0.1:5180';

async function walk(page, prefix, size) {
  await page.setViewportSize(size);
  await page.goto(`${BASE}/revenue`, { waitUntil: 'networkidle' });
  const localOwner = page.getByRole('button', { name: 'Continue as Local Owner (Dev)' });
  if (await localOwner.isVisible({ timeout: 1500 }).catch(() => false)) {
    await localOwner.click();
    await page.waitForTimeout(400);
  }
  await page.goto(`${BASE}/revenue?opportunity=opp-revos-001`, { waitUntil: 'networkidle' });
  await page.getByText('Commercial workspace').first().waitFor({ timeout: 15000 });
  await page.screenshot({ path: join(outDir, `${prefix}-01-workspace.png`), fullPage: true });

  await page.getByRole('button', { name: 'Operator accept offer' }).click();
  await page.getByRole('button', { name: 'Operator accept pricing' }).click();
  await page.screenshot({ path: join(outDir, `${prefix}-02-accepted-pricing.png`), fullPage: true });

  await page.getByRole('button', { name: 'Send proposal' }).click();
  await page.getByText(/BL-C1: proposal cannot auto-send/i).waitFor();
  await page.screenshot({ path: join(outDir, `${prefix}-03-send-blocked.png`), fullPage: true });

  await page.getByRole('button', { name: 'Record acceptance (no live send)' }).click();
  await page.getByRole('button', { name: 'Open engagement' }).click();
  await page.getByText(/eng-revos-001/i).waitFor();
  await page.screenshot({ path: join(outDir, `${prefix}-04-engagement.png`), fullPage: true });
}

const browser = await chromium.launch({ headless: true });
for (const [prefix, size] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage();
  await walk(page, prefix, size);
  await page.close();
}
await browser.close();
console.log(`premium evidence written to ${outDir}`);
