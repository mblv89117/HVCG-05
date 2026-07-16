import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const appRoot = resolve(import.meta.dirname, '..')
const screenshotDir = resolve(appRoot, '../../PROJECT_ATLAS/QA/AIGovernanceSprint1/screenshots')
await mkdir(screenshotDir, { recursive: true })

const server = spawn('npm', ['run', 'preview'], {
  cwd: appRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env },
})

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:4176/')
      if (response.ok) return
    } catch {
      // Server not ready.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  throw new Error('Preview server did not start')
}

const errors = []
try {
  await waitForServer()
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

  const routes = ['/', '/agents', '/agents/operations', '/prompts', '/permissions', '/health', '/costs', '/audit', '/approvals', '/risks', '/policies']
  for (const route of routes) {
    const response = await page.goto(`http://127.0.0.1:4176${route}`, { waitUntil: 'networkidle' })
    if (!response?.ok()) errors.push(`${route}: HTTP ${response?.status()}`)
    const main = page.locator('main')
    if (!(await main.isVisible())) errors.push(`${route}: main not visible`)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    if (overflow) errors.push(`${route}: horizontal overflow desktop`)
  }
  await page.goto('http://127.0.0.1:4176/', { waitUntil: 'networkidle' })
  await page.screenshot({ path: resolve(screenshotDir, 'overview-desktop.png'), fullPage: true })
  await page.goto('http://127.0.0.1:4176/agents', { waitUntil: 'networkidle' })
  await page.screenshot({ path: resolve(screenshotDir, 'agent-registry-desktop.png'), fullPage: true })
  await page.goto('http://127.0.0.1:4176/approvals', { waitUntil: 'networkidle' })
  await page.screenshot({ path: resolve(screenshotDir, 'approval-queue-desktop.png'), fullPage: true })

  await page.setViewportSize({ width: 390, height: 844 })
  for (const route of ['/', '/agents', '/permissions', '/approvals', '/policies']) {
    await page.goto(`http://127.0.0.1:4176${route}`, { waitUntil: 'networkidle' })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
    if (overflow) errors.push(`${route}: horizontal overflow mobile`)
  }
  await page.goto('http://127.0.0.1:4176/', { waitUntil: 'networkidle' })
  await page.screenshot({ path: resolve(screenshotDir, 'overview-mobile.png'), fullPage: true })
  await page.getByRole('button', { name: 'Open navigation' }).click()
  if (!(await page.getByRole('navigation', { name: 'Primary navigation' }).isVisible())) errors.push('mobile navigation failed to open')
  await page.screenshot({ path: resolve(screenshotDir, 'navigation-mobile.png'), fullPage: true })

  await browser.close()
} finally {
  server.kill('SIGTERM')
}

if (errors.length) {
  console.error('BROWSER QA FAIL')
  for (const error of errors) console.error(` - ${error}`)
  process.exit(1)
}
console.log('BROWSER QA PASS · 11 routes · desktop/mobile · 5 screenshots')
