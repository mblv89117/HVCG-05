import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:4174'
const outputDir = path.resolve(process.cwd(), '../../PROJECT_ATLAS/QA/ExecutiveCommandCenterSprint1')
const screenshotsDir = path.join(outputDir, 'screenshots')
const routes = [
  ['/', 'overview'],
  ['/revenue', 'revenue'],
  ['/clients', 'clients'],
  ['/operations', 'operations'],
  ['/financial', 'financial'],
  ['/ai', 'ai'],
  ['/notifications', 'notifications'],
]

await mkdir(screenshotsDir, { recursive: true })
const server = spawn('npm', ['run', 'preview'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(baseUrl)
      if (response.ok) return
    } catch {
      // Preview is still starting.
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
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })

  for (const [route, name] of routes) {
    const response = await desktop.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    const heading = await desktop.locator('main h1').first().textContent()
    record('Navigation QA', `${name} route`, response?.ok() === true && Boolean(heading), `${route} → ${heading}`)
  }

  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '01-overview-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/revenue`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '02-revenue-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/financial`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '03-financial-desktop.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await mobile.goto(`${baseUrl}/clients`, { waitUntil: 'networkidle' })
  const mobileNavVisible = await mobile.locator('.mobile-nav').isVisible()
  const horizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  record('Responsive QA', '390×844 client dashboard', mobileNavVisible && !horizontalOverflow, `mobile nav=${mobileNavVisible}; horizontal overflow=${horizontalOverflow}`)
  await mobile.screenshot({ path: path.join(screenshotsDir, '04-clients-mobile.png'), fullPage: true })

  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  const financeNavVisible = await desktop.getByTestId('nav-financial').count() > 0
  const revenueNavVisible = await desktop.getByTestId('nav-revenue').count() > 0
  const operationsNavVisible = await desktop.getByTestId('nav-operations').count() > 0
  record('Permission QA', 'Assistant layout', !financeNavVisible && !revenueNavVisible && operationsNavVisible, `finance=${financeNavVisible}; revenue=${revenueNavVisible}; operations=${operationsNavVisible}`)

  await desktop.goto(`${baseUrl}/financial`, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  await desktop.waitForURL(`${baseUrl}/`)
  record('Permission QA', 'Protected financial route', desktop.url() === `${baseUrl}/`, `redirected to ${desktop.url()}`)

  await desktop.getByLabel('Dashboard role').selectOption('Owner')
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  const navTiming = await desktop.evaluate(() => {
    const [entry] = performance.getEntriesByType('navigation')
    return entry ? Math.round(entry.duration) : -1
  })
  const metricCount = await desktop.locator('.metric-card').count()
  record('Dashboard QA', 'Overview feature density', metricCount >= 8, `${metricCount} visible KPI cards`)
  record('Performance QA', 'Local load duration', navTiming >= 0 && navTiming < 2000, `${navTiming} ms`)

  const result = {
    generatedAt: new Date().toISOString(),
    branch: 'cursor/executive-command-center-sprint1',
    dataMode: 'mock-only',
    summary: {
      passed: checks.filter((check) => check.pass).length,
      failed: checks.filter((check) => !check.pass).length,
      total: checks.length,
    },
    checks,
    screenshots: [
      'screenshots/01-overview-desktop.png',
      'screenshots/02-revenue-desktop.png',
      'screenshots/03-financial-desktop.png',
      'screenshots/04-clients-mobile.png',
    ],
  }
  await writeFile(path.join(outputDir, 'qa-results.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result.summary))
  for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.suite}: ${check.name} — ${check.evidence}`)
  if (result.summary.failed > 0) process.exitCode = 1
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
