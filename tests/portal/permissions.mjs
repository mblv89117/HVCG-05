#!/usr/bin/env node
/**
 * Permission / visibility tests against mock model rules.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/hvcg-client-portal')
const mock = readFileSync(resolve(root, 'src/data/mockStore.ts'), 'utf8')
const ccb = readFileSync(resolve(root, 'src/data/coloradoCraftBeef.ts'), 'utf8')
const access = readFileSync(resolve(root, 'src/data/access.ts'), 'utf8')
const integrations = readFileSync(resolve(root, 'src/integrations/mockIntegrations.ts'), 'utf8')
const eng = readFileSync(resolve(root, 'src/pages/EngagementPage.tsx'), 'utf8')
const dataRoom = readFileSync(resolve(root, 'src/pages/DataRoomPage.tsx'), 'utf8')

const errors = []

if (!integrations.includes("mode: 'mocked'") && !integrations.includes('mode: "mocked"')) {
  errors.push('Expected mocked integrations')
}
if (!integrations.includes("name: 'outlook'") || !integrations.includes('ready: false')) {
  errors.push('Outlook must remain disabled/not ready')
}
if (!eng.includes('Fees, margins, and internal notes are never shown')) {
  errors.push('Engagement page must document fee hiding')
}
if (mock.includes('password') || mock.includes('secret') || mock.includes('apiKey')) {
  errors.push('Mock store must not contain secrets')
}
if (!mock.includes("sensitivity: 'ClientVisible'") && !ccb.includes("sensitivity: 'ClientVisible'")) {
  errors.push('Secure files should mark ClientVisible sensitivity')
}
if (!ccb.includes("sensitivity: 'Internal'")) {
  errors.push('CCB seed must include Internal document for role filtering tests')
}
if (!access.includes('canViewVisibility') || !access.includes('canContribute')) {
  errors.push('access helpers required for role tests')
}
if (!dataRoom.includes('Anonymous sharing disabled')) {
  errors.push('Data room must state anonymous sharing disabled')
}
if (!ccb.includes('Randy Kamin') || !ccb.includes('Generational Group')) {
  errors.push('CCB verified referral source missing')
}
if (ccb.includes('amountTarget: ') && /amountTarget:\s*[0-9]/.test(ccb)) {
  errors.push('CCB must not invent numeric funding targets')
}
if (!mock.includes('ACCG_ONLY') || (!mock.includes('cli-ccb') && !ccb.includes("CCB_CLIENT_ID = 'cli-ccb'"))) {
  errors.push('Isolation fixture (ACCG vs CCB) required')
}

if (errors.length) {
  console.error('FAIL — Portal permissions')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}
console.log('PASS — Portal permissions')
