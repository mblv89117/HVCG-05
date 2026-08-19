import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile, cp } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:4176'
const atlasOut = path.resolve(process.cwd(), '../../PROJECT_ATLAS/QA/FinanceIntelligenceSprint1')
const docsOut = path.resolve(process.cwd(), '../../docs/finance-intelligence-sprint1')
const screenshotsDir = path.join(atlasOut, 'screenshots')
const docsShots = path.join(docsOut, 'screenshots')

const routes = [
  ['/', 'overview'],
  ['/decisions', 'decisions'],
  ['/changes', 'changes'],
  ['/scores', 'scores'],
  ['/trends', 'trends'],
  ['/cash', 'cash'],
  ['/working-capital', 'working-capital'],
  ['/budget', 'budget'],
  ['/forecast', 'forecast'],
  ['/enterprise-value', 'enterprise-value'],
  ['/workspaces', 'workspaces'],
  ['/capital', 'capital'],
  ['/alerts', 'alerts'],
  ['/ai', 'ai'],
  ['/governance', 'governance'],
]

await mkdir(screenshotsDir, { recursive: true })
await mkdir(docsShots, { recursive: true })

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
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })

  for (const [route, name] of routes) {
    const response = await desktop.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    const heading = await desktop.locator('main h1').first().textContent()
    record('Navigation QA', `${name} route`, response?.ok() === true && Boolean(heading), `${route} → ${heading}`)
  }

  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '01-overview-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/decisions`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '02-decisions-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/enterprise-value`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '03-enterprise-value-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/workspaces`, { waitUntil: 'networkidle' })
  await desktop.selectOption('select[aria-label="Organization"]', 'CCB')
  await desktop.waitForSelector('text=Awaiting verified data')
  await desktop.screenshot({ path: path.join(screenshotsDir, '04-ccb-workspace-desktop.png'), fullPage: true })
  await desktop.goto(`${baseUrl}/scores`, { waitUntil: 'networkidle' })
  await desktop.screenshot({ path: path.join(screenshotsDir, '05-scores-desktop.png'), fullPage: true })

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await mobile.goto(`${baseUrl}/cash`, { waitUntil: 'networkidle' })
  const mobileNavVisible = await mobile.locator('.mobile-nav').isVisible()
  const overflowPx = await mobile.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  record(
    'Responsive QA',
    '390×844 cash dashboard',
    mobileNavVisible && overflowPx <= 8,
    `mobile nav=${mobileNavVisible}; overflowPx=${overflowPx}`,
  )
  await mobile.screenshot({ path: path.join(screenshotsDir, '06-cash-mobile.png'), fullPage: true })

  await desktop.goto(`${baseUrl}/decisions`, { waitUntil: 'networkidle' })
  const recCards = await desktop.locator('.rec-card').count()
  const citationItems = await desktop.locator('.citation-list li').count()
  record(
    'Decision QA',
    'Recommendations cite supporting data',
    recCards >= 1 && citationItems >= 1,
    `recCards=${recCards}; citations=${citationItems}`,
  )

  await desktop.goto(`${baseUrl}/changes`, { waitUntil: 'networkidle' })
  const changeRows = await desktop.locator('[data-testid="daily-changes"] tbody tr').count()
  record('Decision QA', 'What changed since yesterday', changeRows >= 1, `${changeRows} rows`)

  await desktop.goto(`${baseUrl}/scores`, { waitUntil: 'networkidle' })
  const scoreCards = await desktop.locator('[data-testid="scorecards"] .info-card').count()
  record('Decision QA', 'Risk and readiness scores', scoreCards >= 1, `${scoreCards} scorecards`)

  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  const cashNav = (await desktop.getByTestId('nav-cash').count()) > 0
  const evNav = (await desktop.getByTestId('nav-enterprise-value').count()) > 0
  const overviewNav = (await desktop.getByTestId('nav-overview').count()) > 0
  record(
    'Permission QA',
    'Assistant layout',
    !cashNav && !evNav && overviewNav,
    `cash=${cashNav}; ev=${evNav}; overview=${overviewNav}`,
  )

  await desktop.goto(`${baseUrl}/cash`, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Dashboard role').selectOption('Assistant')
  await desktop.waitForURL(`${baseUrl}/`)
  record('Permission QA', 'Protected cash route', desktop.url() === `${baseUrl}/`, `redirected to ${desktop.url()}`)

  await desktop.getByLabel('Dashboard role').selectOption('Owner')
  await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
  await desktop.getByLabel('Organization').selectOption('CCB')
  await desktop.waitForSelector('text=Awaiting verified data')
  const incompleteText = await desktop.locator('text=Awaiting verified data').count()
  record('Financial QA', 'CCB incomplete labels', incompleteText >= 1, `incomplete matches=${incompleteText}`)

  await desktop.getByLabel('Organization').selectOption('HVCG')
  const kpiCount = await desktop.locator('.kpi-card').count()
  const banner = await desktop.getByTestId('data-mode-banner').count()
  record('Financial QA', 'Overview KPI density', kpiCount >= 8, `${kpiCount} KPI cards`)
  record('Financial QA', 'Mock-only banner present', banner === 1, `banner=${banner}`)

  await desktop.goto(`${baseUrl}/enterprise-value`, { waitUntil: 'networkidle' })
  const indicativeLabel = await desktop.locator('text=Indicative').count()
  record(
    'Financial QA',
    'EV indicative labeling',
    indicativeLabel >= 1,
    `indicative matches=${indicativeLabel}`,
  )

  for (const file of [
    '01-overview-desktop.png',
    '02-decisions-desktop.png',
    '03-enterprise-value-desktop.png',
    '04-ccb-workspace-desktop.png',
    '05-scores-desktop.png',
    '06-cash-mobile.png',
  ]) {
    await cp(path.join(screenshotsDir, file), path.join(docsShots, file))
  }

  const result = {
    generatedAt: new Date().toISOString(),
    branch: 'cursor/finance-intelligence-sprint1',
    dataMode: 'mock-demo + incomplete CCB',
    summary: {
      passed: checks.filter((c) => c.pass).length,
      failed: checks.filter((c) => c.pass === false).length,
      total: checks.length,
    },
    checks,
    screenshots: [
      'screenshots/01-overview-desktop.png',
      'screenshots/02-decisions-desktop.png',
      'screenshots/03-enterprise-value-desktop.png',
      'screenshots/04-ccb-workspace-desktop.png',
      'screenshots/05-scores-desktop.png',
      'screenshots/06-cash-mobile.png',
    ],
  }

  const md = [
    '# Finance Intelligence Sprint 1 — QA Results',
    '',
    `Generated: ${result.generatedAt}`,
    `Branch: \`${result.branch}\``,
    `Data mode: **${result.dataMode}**`,
    '',
    `## Summary: ${result.summary.passed}/${result.summary.total} passed`,
    '',
    '| Suite | Check | Result | Evidence |',
    '|-------|-------|--------|----------|',
    ...result.checks.map(
      (c) => `| ${c.suite} | ${c.name} | ${c.pass ? 'PASS' : 'FAIL'} | ${c.evidence.replace(/\|/g, '/')} |`,
    ),
    '',
    '## Screenshots',
    '',
    ...result.screenshots.map((s) => `- \`${s}\``),
    '',
  ].join('\n')

  await writeFile(path.join(atlasOut, 'qa-results.json'), `${JSON.stringify(result, null, 2)}\n`)
  await writeFile(path.join(atlasOut, 'QA_RESULTS.md'), md)
  await mkdir(docsOut, { recursive: true })
  await writeFile(path.join(docsOut, 'QA_RESULTS.md'), md)

  console.log(`QA ${result.summary.failed === 0 ? 'PASS' : 'FAIL'} ${result.summary.passed}/${result.summary.total}`)
  for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.suite}: ${check.name} — ${check.evidence}`)
  if (result.summary.failed > 0) process.exitCode = 1
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
