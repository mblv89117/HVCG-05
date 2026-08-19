import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:4174'
const outputDir = path.resolve(process.cwd(), '../../PROJECT_ATLAS/QA/ExecutiveIntelligenceSprint1')
const screenshotsDir = path.join(outputDir, 'screenshots')
const routes = [
  ['/', 'overview'],
  ['/intelligence', 'intelligence-daily'],
  ['/intelligence/weekly', 'intelligence-weekly'],
  ['/intelligence/decisions', 'intelligence-decisions'],
  ['/intelligence/exceptions', 'intelligence-exceptions'],
  ['/intelligence/meetings', 'intelligence-meetings'],
  ['/intelligence/ccb', 'intelligence-ccb'],
  ['/revenue', 'revenue'],
  ['/clients', 'clients'],
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

  await desktop.goto(`${baseUrl}/intelligence`, { waitUntil: 'networkidle' })
  const generated = await desktop.getByTestId('brief-generated-at').textContent()
  const sectionCount = await desktop.locator('[data-testid^="brief-section-"]').count()
  record('Dashboard QA', 'Daily brief 10 sections + timestamp', sectionCount === 10 && Boolean(generated), `sections=${sectionCount}; ${generated}`)
  await desktop.screenshot({ path: path.join(screenshotsDir, '01-hvcg-daily-brief.png'), fullPage: true })

  await desktop.getByRole('button', { name: 'Accept' }).first().click()
  const history = await desktop.getByTestId('review-history').textContent()
  record('Decision workflow QA', 'Accept insight preserves history', history?.includes('Accepted') === true, history?.slice(0, 120))

  await desktop.goto(`${baseUrl}/intelligence/ccb`, { waitUntil: 'networkidle' })
  const ccbBody = await desktop.locator('main').innerText()
  const noInvented = /no invented financial findings/i.test(ccbBody)
  const pending = /awaiting verified source|pending verification|Do not invent financial findings/i.test(ccbBody)
  record('Client briefing QA', 'CCB verified-only briefing', noInvented && pending, `noInvented=${noInvented}; pending=${pending}`)
  await desktop.screenshot({ path: path.join(screenshotsDir, '02-ccb-meeting-brief.png'), fullPage: true })

  await desktop.goto(`${baseUrl}/intelligence/exceptions`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '03-exception-board.png'), fullPage: true })
  record('Exception QA', 'Exception board visible', (await desktop.locator('.exception-column').count()) >= 6, 'exception columns rendered')

  await desktop.goto(`${baseUrl}/intelligence/weekly`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '04-weekly-brief.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await mobile.goto(`${baseUrl}/intelligence`, { waitUntil: 'networkidle' })
  const mobileNavVisible = await mobile.locator('.mobile-nav').isVisible()
  const horizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  record('Responsive QA', '390×844 intelligence', mobileNavVisible && !horizontalOverflow, `mobile nav=${mobileNavVisible}; overflow=${horizontalOverflow}`)
  await mobile.screenshot({ path: path.join(screenshotsDir, '05-intelligence-mobile.png'), fullPage: true })

  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  const intelNav = await desktop.getByTestId('nav-intelligence').count()
  record('Permission QA', 'Assistant blocked from intelligence', intelNav === 0, `intelligence nav count=${intelNav}`)

  await desktop.goto(`${baseUrl}/intelligence`, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  await desktop.waitForURL(`${baseUrl}/`)
  record('Permission QA', 'Protected intelligence route', desktop.url() === `${baseUrl}/`, `redirected to ${desktop.url()}`)

  await desktop.getByLabel('Dashboard role').selectOption('Owner')
  const started = Date.now()
  await desktop.goto(`${baseUrl}/intelligence`, { waitUntil: 'networkidle' })
  record('Performance QA', 'Intelligence load duration', Date.now() - started < 3000, `${Date.now() - started} ms`)
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}

const passed = checks.filter((item) => item.pass).length
const results = {
  generatedAt: new Date().toISOString(),
  branch: 'cursor/executive-intelligence-sprint1',
  dataMode: 'atlas-verified + labeled mock + CCB verified-only',
  summary: { passed, failed: checks.length - passed, total: checks.length },
  checks,
  screenshots: [
    'screenshots/01-hvcg-daily-brief.png',
    'screenshots/02-ccb-meeting-brief.png',
    'screenshots/03-exception-board.png',
    'screenshots/04-weekly-brief.png',
    'screenshots/05-intelligence-mobile.png',
  ],
}

await writeFile(path.join(outputDir, 'qa-results.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results.summary, null, 2))
if (results.summary.failed > 0) process.exit(1)
