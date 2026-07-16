#!/usr/bin/env node
/**
 * Responsive CSS contract tests.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const css = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/hvcg-client-portal/src/styles/portal.css'),
  'utf8',
)
const errors = []

if (!css.includes('@media (max-width: 960px)')) errors.push('Missing mobile breakpoint @ 960px')
if (!css.includes('grid-template-columns: 1fr')) errors.push('Mobile layout should collapse to single column')
if (!css.includes('viewport') && true) {
  // viewport is in index.html — checked below
}
const html = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/hvcg-client-portal/index.html'),
  'utf8',
)
if (!html.includes('width=device-width')) errors.push('index.html missing viewport meta')

if (errors.length) {
  console.error('FAIL — Portal responsive')
  for (const e of errors) console.error(' -', e)
  process.exit(1)
}
console.log('PASS — Portal responsive')
