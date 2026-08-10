import { defineConfig } from '@playwright/test';

const elite = process.env.ATLAS_ELITE_URL || 'http://127.0.0.1:5180';

export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'artifacts/playwright-report.json' }]],
  use: {
    baseURL: elite,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 960 },
  },
  outputDir: 'artifacts/test-results',
});
