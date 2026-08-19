import { chromium } from 'playwright'
import { execFileSync, spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const baseUrl = 'http://127.0.0.1:4174'
const repoRoot = path.resolve(process.cwd(), '../..')
const outputDir = path.join(repoRoot, 'PROJECT_ATLAS/QA/CEOCommandCenterSprint2')
const screenshotsDir = path.join(outputDir, 'screenshots')
const routes = [
  ['/', 'overview'],
  ['/approvals', 'approvals'],
  ['/agents', 'agents'],
  ['/portfolio', 'portfolio'],
  ['/revenue', 'revenue'],
  ['/engineering', 'engineering'],
  ['/brief', 'brief'],
]
const checks = []
const record = (suite, name, pass, evidence) => checks.push({ suite, name, pass, evidence })

await mkdir(screenshotsDir, { recursive: true })
const server = spawn('npm', ['run', 'preview'], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stdout.on('data', (chunk) => { serverLog += chunk.toString() })
server.stderr.on('data', (chunk) => { serverLog += chunk.toString() })

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(baseUrl)).ok) return
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Preview did not start.\n${serverLog}`)
}

let browser
try {
  const currentState = await readFile(path.join(repoRoot, 'PROJECT_ATLAS/CURRENT_STATE.md'), 'utf8')
  const trackIndex = await readFile(path.join(repoRoot, 'PROJECT_ATLAS/TRACK_INDEX.md'), 'utf8')
  record('Atlas source', 'Track 1 freeze', currentState.includes('FROZEN — LIVE—INTERNAL'), 'CURRENT_STATE.md freeze anchor')
  record('Atlas source', 'Revenue Sprint 4 complete', currentState.includes('Sprint 1–4 Revenue OS') && currentState.includes('COMPLETE'), 'CURRENT_STATE.md Revenue anchor')
  record('Atlas source', 'EOS Sprint 2 complete', currentState.includes('Engineering OS Sprint 2') && currentState.includes('COMPLETE'), 'CURRENT_STATE.md EOS anchor')
  record('Atlas source', 'Tracks 1–9 indexed', Array.from({ length: 9 }, (_, index) => `Track ${index + 1}`).every((track) => trackIndex.includes(track)), 'TRACK_INDEX.md contains all tracks')

  const changed = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' })
  const changedPaths = changed.split('\n').filter(Boolean).map((line) => line.slice(3))
  const protectedChanges = changedPaths.filter((file) =>
    file.startsWith('src/power-automate/') ||
    file.startsWith('deployment/') ||
    file.includes('revenue-sprint') ||
    file.includes('Track-1-Live-Internal'),
  )
  record('Protected paths', 'No Production / Track 1 / Revenue mutation', protectedChanges.length === 0, protectedChanges.length ? protectedChanges.join(', ') : 'No protected paths changed')

  const sourceFiles = execFileSync('git', ['ls-files', '--others', '--cached', '--modified', 'apps/hvcg-executive-command-center/src'], { cwd: repoRoot, encoding: 'utf8' })
    .split('\n').filter(Boolean)
  let unsafeHtml = false
  for (const file of sourceFiles) {
    const text = await readFile(path.join(repoRoot, file), 'utf8')
    if (text.includes('dangerouslySetInnerHTML')) unsafeHtml = true
  }
  record('Security', 'No unsafe dynamic HTML API', !unsafeHtml, unsafeHtml ? 'dangerouslySetInnerHTML found' : 'React text rendering only')

  await waitForServer()
  browser = await chromium.launch({ headless: true })
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const externalRequests = []
  desktop.on('request', (request) => {
    if (!request.url().startsWith(baseUrl) && !request.url().startsWith('data:')) externalRequests.push(request.url())
  })

  for (const [route, name] of routes) {
    const response = await desktop.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    const heading = await desktop.locator('main h1').first().textContent()
    const sources = await desktop.locator('.source-badge').count()
    record('Navigation', `${name} route`, response?.ok() === true && Boolean(heading), `${route} → ${heading}`)
    record('Source labels', `${name} source visibility`, sources > 0, `${sources} source badges`)
    await desktop.screenshot({ path: path.join(screenshotsDir, `${name}-1440.png`), fullPage: true })
  }

  await desktop.goto(`${baseUrl}/approvals`, { waitUntil: 'networkidle' })
  await desktop.getByRole('button', { name: 'Approve placeholder' }).first().click()
  const notice = await desktop.getByRole('status').textContent()
  record('Approval safety', 'Placeholder action cannot execute live', notice?.includes('No live action executed') === true, notice)

  for (const width of [1280, 1440]) {
    await desktop.setViewportSize({ width, height: 900 })
    await desktop.goto(baseUrl, { waitUntil: 'networkidle' })
    const overflow = await desktop.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    record('Responsive desktop', `${width}px viewport`, !overflow, `horizontal overflow=${overflow}`)
  }

  record('Network safety', 'No external requests', externalRequests.length === 0, externalRequests.length ? externalRequests.join(', ') : 'Local static assets only')

  const result = {
    generatedAt: new Date().toISOString(),
    branch: 'cursor/track7-ceo-command-center-sprint2',
    environment: 'Development / UAT',
    summary: {
      passed: checks.filter((check) => check.pass).length,
      failed: checks.filter((check) => !check.pass).length,
      total: checks.length,
    },
    checks,
    screenshots: routes.map(([, name]) => `screenshots/${name}-1440.png`),
  }
  await writeFile(path.join(outputDir, 'qa-results.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result.summary))
  for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.suite}: ${check.name} — ${check.evidence}`)
  if (result.summary.failed > 0) process.exitCode = 1
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
