import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:4176'
const outputDir = path.resolve(process.cwd(), '../../PROJECT_ATLAS/QA/OperationsHubProduct')
const screenshotsDir = path.join(outputDir, 'screenshots')
const routes = [
  ['/portfolio', 'portfolio'],
  ['/portfolio/p-1', 'project-detail'],
  ['/executive', 'executive'],
  ['/', 'operations'],
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
      // wait
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

  await desktop.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' })
  const viewCount = await desktop.locator('.view-tabs button').count()
  record('Product QA', 'Portfolio views present', viewCount >= 10, `${viewCount} views`)
  await desktop.getByTestId('create-project').click()
  await desktop.screenshot({ path: path.join(screenshotsDir, '01-portfolio-desktop.png'), fullPage: true })

  await desktop.goto(`${baseUrl}/portfolio/p-2`, { waitUntil: 'networkidle' })
  const detail = await desktop.getByTestId('project-detail').count()
  record('Product QA', 'Project detail workflows', detail === 1, 'detail page rendered')
  await desktop.screenshot({ path: path.join(screenshotsDir, '02-project-detail-desktop.png'), fullPage: true })

  await desktop.goto(`${baseUrl}/executive`, { waitUntil: 'networkidle' })
  const escalations = await desktop.getByTestId('exec-escalations').count()
  record('Integration QA', 'Executive escalations from Ops Hub', escalations === 1, 'executive page linked')
  await desktop.screenshot({ path: path.join(screenshotsDir, '03-executive-integrated.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await mobile.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' })
  const mobileNav = await mobile.locator('.mobile-nav').isVisible()
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  record('Responsive QA', '390×844 portfolio', mobileNav && !overflow, `nav=${mobileNav}; overflow=${overflow}`)
  await mobile.screenshot({ path: path.join(screenshotsDir, '04-portfolio-mobile.png'), fullPage: true })

  await desktop.goto(`${baseUrl}/portfolio`, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  const portfolioNav = (await desktop.getByTestId('nav-portfolio').count()) > 0
  const hiringNav = (await desktop.getByTestId('nav-hiring').count()) > 0
  record('Permission QA', 'Assistant portfolio access', portfolioNav && !hiringNav, `portfolio=${portfolioNav}; hiring=${hiringNav}`)

  const result = {
    generatedAt: new Date().toISOString(),
    branch: 'cursor/operations-hub-sprint1',
    product: 'Operations Hub Command Center',
    dataMode: 'mock-product-store',
    summary: {
      passed: checks.filter((check) => check.pass).length,
      failed: checks.filter((check) => !check.pass).length,
      total: checks.length,
    },
    checks,
    screenshots: [
      'screenshots/01-portfolio-desktop.png',
      'screenshots/02-project-detail-desktop.png',
      'screenshots/03-executive-integrated.png',
      'screenshots/04-portfolio-mobile.png',
    ],
  }
  await writeFile(path.join(outputDir, 'qa-results.json'), `${JSON.stringify(result, null, 2)}\n`)
  const md = [
    '# Operations Hub Product — Offline QA',
    '',
    `- Generated: ${result.generatedAt}`,
    `- Result: **${result.summary.passed}/${result.summary.total} passed**`,
    '',
    ...checks.map((check) => `- ${check.pass ? 'PASS' : 'FAIL'} — **${check.suite}** / ${check.name}: ${check.evidence}`),
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
