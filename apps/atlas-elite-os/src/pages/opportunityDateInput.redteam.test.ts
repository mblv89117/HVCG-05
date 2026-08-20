/**
 * Opportunity date input must always receive YYYY-MM-DD (or empty).
 * Never pass mm/dd/… fragments into <input type="date">.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(root, 'OpportunityDetailPage.tsx'), 'utf8');

describe('Opportunity date input dayStamp', () => {
  it('normalizes to YYYY-MM-DD and rejects mm/dd fragments', () => {
    assert.match(src, /function dayStamp\(iso\?: string\): string/);
    assert.match(src, /\(\\d\{4\}\)-\(\\d\{2\}\)-\(\\d\{2\}\)/);
    assert.doesNotMatch(src, /return iso\.slice\(0, 10\)/);
    assert.match(src, /type="date"/);
  });
});
