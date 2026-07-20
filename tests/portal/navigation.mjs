#!/usr/bin/env node
/**
 * Navigation tests — every nav link maps to a page module.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/hvcg-client-portal')
const shell = readFileSync(resolve(root, 'src/layout/AppShell.tsx'), 'utf8')
const errors = []

const expected = [
  ['/', 'HomePage'],
  ['/summary', 'ExecutiveSummaryPage'],
  ['/contacts', 'ContactsPage'],
  ['/engagement', 'EngagementPage'],
  ['/projects', 'ProjectsPage'],
  ['/milestones', 'MilestonesPage'],
  ['/tasks', 'TasksPage'],
  ['/approvals', 'ApprovalsPage'],
  ['/deliverables', 'DeliverablesPage'],
  ['/kpis', 'KpisPage'],
  ['/capital', 'CapitalRoadmapPage'],
  ['/pipeline', 'PipelinePage'],
  ['/enterprise-value', 'EnterpriseValuePage'],
  ['/funding', 'FundingPage'],
  ['/data-room', 'DataRoomPage'],
  ['/documents', 'DocumentsPage'],
  ['/files', 'FilesPage'],
  ['/meetings', 'MeetingsPage'],
  ['/notes', 'NotesPage'],
  ['/decisions', 'DecisionsPage'],
  ['/messages', 'MessagesPage'],
  ['/advisor', 'AdvisorPage'],
  ['/ai-insights', 'AiInsightsPage'],
  ['/activity', 'ActivityPage'],
  ['/timeline', 'TimelinePage'],
  ['/notifications', 'NotificationsPage'],
  ['/invoices', 'InvoicesPage'],
]

for (const [path, page] of expected) {
  if (path !== '/' && !shell.includes(`to: '${path}'`) && !shell.includes(`to: "${path}"`)) {
    errors.push(`Nav missing ${path}`)
  }
  const pagePath = resolve(root, `src/pages/${page}.tsx`)
  if (!existsSync(pagePath)) errors.push(`Missing page module ${page}`)
}

if (!shell.includes('Client Home')) errors.push('Missing Client Home nav label')
if (!shell.includes('Secure Data Room')) errors.push('Missing Secure Data Room nav label')

if (errors.length) {
  console.error('FAIL — Portal navigation')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}
console.log('PASS — Portal navigation')
