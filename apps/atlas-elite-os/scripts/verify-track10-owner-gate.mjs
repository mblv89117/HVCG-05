#!/usr/bin/env node
/**
 * Track 10 owner-gate verification — automated checks before owner UAT.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ds = join(root, '../../packages/atlas-design-system/src');
const dist = join(root, 'dist/assets');

const requiredExports = [
  'AtlasCard',
  'CommandBar',
  'NavShell',
  'DashboardWidget',
  'DataTable',
  'AtlasForm',
  'AtlasDialog',
  'NotificationStack',
  'GlobalSearch',
  'GlobalAICommandPanel',
  'SparkBars',
];

const indexTs = readFileSync(join(ds, 'components/index.ts'), 'utf8');
for (const name of requiredExports) {
  assert.match(indexTs, new RegExp(name), `design system must export ${name}`);
}

const tokens = readFileSync(join(ds, 'tokens/index.ts'), 'utf8');
assert.match(tokens, /gold: '#b08a3c'/, 'brand gold token');
assert.match(tokens, /breakpoints/, 'responsive breakpoints');

assert.ok(existsSync(join(root, 'public/brand/hvcg-logo.svg')), 'brand logo asset');

if (existsSync(dist)) {
  const needles = ['1.25M', '4.8M', '$1.25', '$4.8'];
  for (const f of readdirSync(dist)) {
    if (!f.endsWith('.js')) continue;
    const text = readFileSync(join(dist, f), 'utf8');
    for (const n of needles) {
      assert.equal(text.includes(n), false, `dist ${f} must not contain ${n}`);
    }
  }
  console.log('PASS dist finance scan');
} else {
  console.log('SKIP dist scan — run npm run build first');
}

console.log('PASS Track 10 owner-gate verification');
