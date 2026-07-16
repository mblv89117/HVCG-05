import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:4175'
const outputDir = path.resolve(process.cwd(), '../../PROJECT_ATLAS/QA/FinanceOperationsSprint1')
const screenshotsDir = path.join(outputDir, 'screenshots')
const docsShotDir = path.resolve(process.cwd(), '../../docs/finance-sprint1/screenshots')
const routes = [
  ['/', 'overview'],
  ['/revenue', 'revenue'],
  ['/ar', 'ar'],
  ['/retainers', 'retainers'],
  ['/pricing', 'pricing'],
  ['/cash', 'cash'],
  ['/kpis', 'kpis'],
]

await mkdir(screenshotsDir, { recursive: true })
await mkdir(docsShotDir, { recursive: true })

const server = spawn('npm', ['run', 'preview'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // still starting
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Preview did not start.\n${serverLog}`)
}

const checks = []
const record = (suite, name, pass, evidence) => checks.push({ suite, name, pass, evidence })
let browser

try {
  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

  for (const [route, name] of routes) {
    const response = await desktop.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    const heading = await desktop.locator('main h1').first().textContent()
    record('Navigation QA', `${name} route`, response?.ok() === true && Boolean(heading), `${route} → ${heading}`)
  }

  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '01-overview-desktop.png'), fullPage: true })
  await desktop.screenshot({ path: path.join(docsShotDir, '01-overview-desktop.png'), fullPage: true })

  await desktop.goto(`${baseUrl}/revenue`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '02-revenue-desktop.png'), fullPage: true })
  await desktop.screenshot({ path: path.join(docsShotDir, '02-revenue-desktop.png'), fullPage: true })

  await desktop.goto(`${baseUrl}/ar`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '03-ar-desktop.png'), fullPage: true })
  await desktop.screenshot({ path: path.join(docsShotDir, '03-ar-desktop.png'), fullPage: true })

  await desktop.goto(`${baseUrl}/pricing`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '04-pricing-desktop.png'), fullPage: true })
  await desktop.screenshot({ path: path.join(docsShotDir, '04-pricing-desktop.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(`${baseUrl}/cash`, { waitUntil: 'networkidle' })
  const mobileNavVisible = await mobile.locator('.mobile-nav').isVisible()
  const horizontalOverflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  record(
    'Responsive QA',
    '390×844 cash dashboard',
    mobileNavVisible && !horizontalOverflow,
    `mobile nav=${mobileNavVisible}; overflow=${horizontalOverflow}`,
  )
  await mobile.screenshot({ path: path.join(screenshotsDir, '05-cash-mobile.png'), fullPage: true })
  await mobile.screenshot({ path: path.join(docsShotDir, '05-cash-mobile.png'), fullPage: true })

  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  const arVisible = (await desktop.getByTestId('nav-ar').count()) > 0
  const cashVisible = (await desktop.getByTestId('nav-cash').count()) > 0
  const retainersVisible = (await desktop.getByTestId('nav-retainers').count()) > 0
  record(
    'Permission QA',
    'Assistant layout',
    !arVisible && !cashVisible && retainersVisible,
    `ar=${arVisible}; cash=${cashVisible}; retainers=${retainersVisible}`,
  )

  await desktop.goto(`${baseUrl}/ar`, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  await desktop.waitForURL(`${baseUrl}/`)
  record('Permission QA', 'Protected AR route', desktop.url() === `${baseUrl}/`, `redirected to ${desktop.url()}`)

  await desktop.getByLabel('Dashboard role').selectOption('Owner')
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  const metricCount = await desktop.locator('[data-testid="revenue-card"]').count()
  record('Financial QA', 'Overview KPI density', metricCount >= 8, `${metricCount} revenue cards`)
  const mockBanner = await desktop.getByText(/mock demo data only/i).count()
  record('Financial QA', 'Mock-only banner present', mockBanner > 0, `matches=${mockBanner}`)

  const result = {
    generatedAt: new Date().toISOString(),
    branch: 'cursor/finance-operations-sprint1',
    dataMode: 'mock-only',
    summary: {
      passed: checks.filter((c) => c.pass).length,
      failed: checks.filter((c) => !c.pass).length,
      total: checks.length,
    },
    checks,
    screenshots: [
      'screenshots/01-overview-desktop.png',
      'screenshots/02-revenue-desktop.png',
      'screenshots/03-ar-desktop.png',
      'screenshots/04-pricing-desktop.png',
      'screenshots/05-cash-mobile.png',
    ],
  }

  await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(result, null, 2))
  const md = [
    '# Finance Operations Sprint 1 — QA Results',
    '',
    `Generated: ${result.generatedAt}`,
    `Branch: \`${result.branch}\``,
    `Data mode: **${result.dataMode}**`,
    '',
    `## Summary: ${result.summary.passed}/${result.summary.total} passed`,
    '',
    '| Suite | Check | Result | Evidence |',
    '|-------|-------|--------|----------|',
    ...checks.map(
      (c) => `| ${c.suite} | ${c.name} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.evidence.replace(/\|/g, '/')} |`,
    ),
    '',
    '## Screenshots',
    '',
    ...result.screenshots.map((s) => `- \`${s}\``),
    '',
  ].join('\n')
  await writeFile(path.join(outputDir, 'QA_RESULTS.md'), md)
  await writeFile(path.resolve(process.cwd(), '../../docs/finance-sprint1/QA_RESULTS.md'), md)

  if (result.summary.failed > 0) {
    console.error(JSON.stringify(result, null, 2))
    process.exitCode = 1
  } else {
    console.log(`QA PASS ${result.summary.passed}/${result.summary.total}`)
  }
} finally {
  if (browser) await browser.close()
  server.kill('SIGTERM')
}
