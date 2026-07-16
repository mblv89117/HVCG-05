import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const appRoot = resolve(import.meta.dirname, '..')
const repoRoot = resolve(appRoot, '../..')
const errors = []

function filesUnder(directory) {
  const result = []
  if (!statSafe(directory)) return result
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    if (['node_modules', 'dist', '.git'].includes(name)) continue
    if (statSync(path).isDirectory()) result.push(...filesUnder(path))
    else result.push(path)
  }
  return result
}

function statSafe(path) {
  try { return statSync(path) } catch { return null }
}

const sourceFiles = filesUnder(join(appRoot, 'src'))
const sourceText = sourceFiles.filter((file) => /\.(ts|tsx)$/.test(file)).map((file) => readFileSync(file, 'utf8')).join('\n')

for (const forbidden of ['fetch(', 'axios', 'XMLHttpRequest', 'process.env.PRODUCTION', 'localStorage.setItem("token"']) {
  if (sourceText.includes(forbidden)) errors.push(`Forbidden live-integration token: ${forbidden}`)
}

const appText = readFileSync(join(appRoot, 'src/App.tsx'), 'utf8')
const routes = ['agents', 'prompts', 'permissions', 'health', 'costs', 'audit', 'approvals', 'risks', 'policies']
for (const route of routes) {
  if (!appText.includes(`path="${route}"`)) errors.push(`Missing route: ${route}`)
}

const requiredOwnedArtifacts = [
  'docs/ai-governance-sprint1/ARCHITECTURE.md',
  'docs/ai-governance-sprint1/DATA_MODEL.md',
  'docs/ai-governance-sprint1/PERMISSION_MODEL.md',
  'docs/ai-governance-sprint1/PROMPT_VERSIONING.md',
  'docs/ai-governance-sprint1/AUDIT_MODEL.md',
  'docs/ai-governance-sprint1/POLICIES.md',
  'docs/ai-governance-sprint1/HANDOFF.md',
  'docs/ai-governance-sprint1/QA_RESULTS.md',
  'docs/ai-governance-sprint1/SCREENSHOTS.md',
  'PROJECT_ATLAS/Architecture/AIGovernanceSprint1.md',
  'PROJECT_ATLAS/Sprints/Sprint_AIGovernance1.md',
  'PROJECT_ATLAS/Handoffs/AIGovernanceSprint1.md',
  'PROJECT_ATLAS/QA/AIGovernanceSprint1/QA_RESULTS.md',
  'PROJECT_ATLAS/ProposedUpdates/AIGovernanceSprint1.md',
]
for (const path of requiredOwnedArtifacts) {
  if (!statSafe(join(repoRoot, path))) errors.push(`Missing owned artifact: ${path}`)
}

const allFiles = filesUnder(repoRoot)
const ownedMarkdown = allFiles.filter((file) =>
  file.endsWith('.md') &&
  (file.includes('/docs/ai-governance-sprint1/') || file.includes('/PROJECT_ATLAS/Architecture/AIGovernanceSprint1') ||
    file.includes('/PROJECT_ATLAS/Sprints/Sprint_AIGovernance1') || file.includes('/PROJECT_ATLAS/Handoffs/AIGovernanceSprint1') ||
    file.includes('/PROJECT_ATLAS/QA/AIGovernanceSprint1/') || file.includes('/PROJECT_ATLAS/ProposedUpdates/AIGovernanceSprint1')),
)
for (const file of ownedMarkdown) {
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1]
    if (/^(https?:|mailto:|#)/.test(target)) continue
    const cleanTarget = target.split('#')[0]
    if (cleanTarget && !statSafe(resolve(dirname(file), cleanTarget))) {
      errors.push(`Broken link in ${file}: ${target}`)
    }
  }
}

const ownedPrefixes = [
  'apps/hvcg-ai-governance/',
  'docs/ai-governance-sprint1/',
  'PROJECT_ATLAS/Architecture/AIGovernanceSprint1.md',
  'PROJECT_ATLAS/Sprints/Sprint_AIGovernance1.md',
  'PROJECT_ATLAS/Handoffs/AIGovernanceSprint1.md',
  'PROJECT_ATLAS/QA/AIGovernanceSprint1/',
  'PROJECT_ATLAS/ProposedUpdates/AIGovernanceSprint1.md',
]

const gitStatus = process.env.GIT_STATUS_PATHS?.split('\n').filter(Boolean) ?? []
for (const path of gitStatus) {
  if (!ownedPrefixes.some((prefix) => path === prefix || path.startsWith(prefix))) {
    errors.push(`Protected-path violation: ${path}`)
  }
}

if (!statSafe(join(appRoot, 'dist/index.html'))) errors.push('Production build missing: dist/index.html')

if (errors.length) {
  console.error('QA FAIL')
  for (const error of errors) console.error(` - ${error}`)
  process.exit(1)
}

console.log(`QA PASS · source files=${sourceFiles.length} · scanned repo files=${allFiles.length}`)
console.log(`Routes=${routes.length} · live API calls=0 · protected-path violations=0`)
