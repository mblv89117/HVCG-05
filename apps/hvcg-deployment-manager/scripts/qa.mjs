import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:4181'
const outputDir = path.resolve(process.cwd(), '../../PROJECT_ATLAS/QA/DeploymentManagerSprint1')
const screenshotsDir = path.join(outputDir, 'screenshots')
const routes = [
  ['/', 'dashboard'],
  ['/queue', 'queue'],
  ['/promotion', 'promotion'],
  ['/approvals', 'approvals'],
  ['/evidence', 'evidence'],
  ['/rollback', 'rollback'],
  ['/environments', 'environments'],
  ['/calendar', 'calendar'],
  ['/incidents', 'incidents'],
  ['/audit', 'audit'],
  ['/releases/RC-DM-001', 'release-detail'],
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
  await desktop.screenshot({ path: path.join(screenshotsDir, '01-dashboard-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/queue`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '02-queue-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/environments`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '03-environments-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/approvals`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '05-approvals-desktop.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(baseUrl, { waitUntil: 'networkidle' })
  const mobileNavVisible = await mobile.locator('.mobile-nav').isVisible()
  const horizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  record('Responsive QA', '390×844 dashboard', mobileNavVisible && !horizontalOverflow, `mobile nav=${mobileNavVisible}; overflow=${horizontalOverflow}`)
  await mobile.screenshot({ path: path.join(screenshotsDir, '04-dashboard-mobile.png'), fullPage: true })

  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Deployment role').selectOption('Viewer')
  const queueNav = await desktop.getByTestId('nav-queue').count()
  const envNav = await desktop.getByTestId('nav-environments').count()
  record('Permission QA', 'Viewer layout', queueNav === 0 && envNav === 1, `queue=${queueNav}; environments=${envNav}`)

  await desktop.goto(`${baseUrl}/queue`, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Deployment role').selectOption('Viewer')
  await desktop.waitForURL(`${baseUrl}/`)
  record('Permission QA', 'Protected queue route', desktop.url() === `${baseUrl}/`, `redirected to ${desktop.url()}`)

  const bodyText = await desktop.locator('body').innerText()
  record('Protected Path QA', 'No production credentials in UI', !/client.?secret|password\s*=|Bearer\s+[A-Za-z0-9_-]{20,}/i.test(bodyText), 'scanned visible body text')
  record('Protected Path QA', 'Mock-only banner present', /Mock/i.test(bodyText), 'Mock keyword visible')

  const result = {
    generatedAt: new Date().toISOString(),
    branch: 'cursor/deployment-manager-sprint1',
    dataMode: 'mock-only',
    summary: {
      passed: checks.filter((c) => c.pass).length,
      failed: checks.filter((c) => !c.pass).length,
      total: checks.length,
    },
    checks,
    screenshots: [
      'screenshots/01-dashboard-desktop.png',
      'screenshots/02-queue-desktop.png',
      'screenshots/03-environments-desktop.png',
      'screenshots/04-dashboard-mobile.png',
      'screenshots/05-approvals-desktop.png',
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
