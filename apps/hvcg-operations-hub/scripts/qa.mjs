import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:4176'
const outputDir = path.resolve(process.cwd(), '../../PROJECT_ATLAS/QA/OperationsHubSprint1')
const screenshotsDir = path.join(outputDir, 'screenshots')
const routes = [
  ['/', 'operations'],
  ['/team', 'team'],
  ['/projects', 'projects'],
  ['/sop', 'sop'],
  ['/ai', 'ai'],
  ['/human', 'human'],
  ['/notifications', 'notifications'],
]

await mkdir(screenshotsDir, { recursive: true })
const server = spawn('npm', ['run', 'preview'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', (chunk) => {
  serverLog += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverLog += chunk.toString()
})

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
  await desktop.screenshot({ path: path.join(screenshotsDir, '01-operations-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/team`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '02-team-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/projects`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '03-projects-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/sop`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '04-sop-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/ai`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '05-ai-desktop.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await mobile.goto(`${baseUrl}/human`, { waitUntil: 'networkidle' })
  const mobileNavVisible = await mobile.locator('.mobile-nav').isVisible()
  const horizontalOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  record('Responsive QA', '390×844 human workforce', mobileNavVisible && !horizontalOverflow, `mobile nav=${mobileNavVisible}; horizontal overflow=${horizontalOverflow}`)
  await mobile.screenshot({ path: path.join(screenshotsDir, '06-human-mobile.png'), fullPage: true })

  await mobile.goto(`${baseUrl}/notifications`, { waitUntil: 'networkidle' })
  await mobile.screenshot({ path: path.join(screenshotsDir, '07-notifications-mobile.png'), fullPage: true })

  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  const aiNavVisible = (await desktop.getByTestId('nav-ai').count()) > 0
  const humanNavVisible = (await desktop.getByTestId('nav-human').count()) > 0
  const projectsNavVisible = (await desktop.getByTestId('nav-projects').count()) > 0
  const opsNavVisible = (await desktop.getByTestId('nav-operations').count()) > 0
  record(
    'Permission QA',
    'Assistant layout',
    !aiNavVisible && !humanNavVisible && !projectsNavVisible && opsNavVisible,
    `ai=${aiNavVisible}; human=${humanNavVisible}; projects=${projectsNavVisible}; operations=${opsNavVisible}`,
  )

  await desktop.goto(`${baseUrl}/ai`, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  await desktop.waitForURL(`${baseUrl}/`)
  record('Permission QA', 'Protected AI route', desktop.url() === `${baseUrl}/`, `redirected to ${desktop.url()}`)

  await desktop.getByLabel('Dashboard role').selectOption('Owner')
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  const navTiming = await desktop.evaluate(() => {
    const [entry] = performance.getEntriesByType('navigation')
    return entry ? Math.round(entry.duration) : -1
  })
  const metricCount = await desktop.locator('.metric-card').count()
  record('Dashboard QA', 'Operations feature density', metricCount >= 8, `${metricCount} visible KPI cards`)
  record('Performance QA', 'Local load duration', navTiming >= 0 && navTiming < 2000, `${navTiming} ms`)

  await desktop.goto(`${baseUrl}/sop`, { waitUntil: 'networkidle' })
  await desktop.getByTestId('sop-search').fill('Release Gate')
  const sopCount = await desktop.locator('[data-testid="sop-list"] li').count()
  record('Feature QA', 'SOP search filter', sopCount === 1, `filtered to ${sopCount} SOP(s)`)

  const result = {
    generatedAt: new Date().toISOString(),
    branch: 'cursor/operations-hub-sprint1',
    dataMode: 'mock-only',
    summary: {
      passed: checks.filter((check) => check.pass).length,
      failed: checks.filter((check) => check.pass === false).length,
      total: checks.length,
    },
    checks,
    screenshots: [
      'screenshots/01-operations-desktop.png',
      'screenshots/02-team-desktop.png',
      'screenshots/03-projects-desktop.png',
      'screenshots/04-sop-desktop.png',
      'screenshots/05-ai-desktop.png',
      'screenshots/06-human-mobile.png',
      'screenshots/07-notifications-mobile.png',
    ],
  }
  await writeFile(path.join(outputDir, 'qa-results.json'), `${JSON.stringify(result, null, 2)}\n`)

  const md = [
    '# Operations Hub Sprint 1 — Offline QA',
    '',
    `- Generated: ${result.generatedAt}`,
    `- Branch: \`${result.branch}\``,
    `- Mode: ${result.dataMode}`,
    `- Result: **${result.summary.passed}/${result.summary.total} passed**`,
    '',
    '## Checks',
    '',
    ...checks.map((check) => `- ${check.pass ? 'PASS' : 'FAIL'} — **${check.suite}** / ${check.name}: ${check.evidence}`),
    '',
    '## Screenshots',
    '',
    ...result.screenshots.map((shot) => `- \`${shot}\``),
    '',
  ].join('\n')
  await writeFile(path.join(outputDir, 'QA_RESULTS.md'), md)

  console.log(JSON.stringify(result.summary))
  for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.suite}: ${check.name} — ${check.evidence}`)
  if (result.summary.failed > 0) process.exitCode = 1
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
