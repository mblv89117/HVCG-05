#!/usr/bin/env node
/**
 * Portal smoke tests — static build + route inventory.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/hvcg-client-portal')
const dist = resolve(root, 'dist/index.html')
const app = resolve(root, 'src/App.tsx')

const errors = []

if (!existsSync(dist)) errors.push('dist/index.html missing — run npm run build first')
else {
  const html = readFileSync(dist, 'utf8')
  if (!html.includes('root')) errors.push('built index.html missing root mount')
}

const appSrc = readFileSync(app, 'utf8')
const requiredRoutes = [
  'summary',
  'contacts',
  'engagement',
  'projects',
  'milestones',
  'tasks',
  'approvals',
  'deliverables',
  'kpis',
  'capital',
  'pipeline',
  'enterprise-value',
  'funding',
  'data-room',
  'documents',
  'files',
  'meetings',
  'notes',
  'decisions',
  'messages',
  'advisor',
  'ai-insights',
  'activity',
  'timeline',
  'notifications',
  'invoices',
]
for (const r of requiredRoutes) {
  if (!appSrc.includes(`path="${r}"`) && !appSrc.includes(`path='${r}'`)) {
    errors.push(`Missing route: ${r}`)
  }
}

if (errors.length) {
  console.error('FAIL — Portal smoke')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}
console.log('PASS — Portal smoke')
