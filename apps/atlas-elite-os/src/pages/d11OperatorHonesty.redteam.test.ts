/**
 * D11 operator honesty — Documents must not call deferred Hub /api/pm/documents.
 * Quick Capture must not render when unsupported.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const docsPage = readFileSync(join(root, 'DocumentsOperatingPage.tsx'), 'utf8');
const myWork = readFileSync(join(root, 'MyWorkPage.tsx'), 'utf8');
const quickCapture = readFileSync(join(root, '../components/QuickCaptureBar.tsx'), 'utf8');

describe('D11 Elite operator honesty', () => {
  it('Documents operating page does not call deferred /api/pm/documents', () => {
    assert.doesNotMatch(docsPage, /fetchPmDocuments/);
    assert.doesNotMatch(docsPage, /hubFetchJson/);
    assert.match(docsPage, /Deferred/);
    assert.match(docsPage, /501|PM_COLLECTION_NOT_IN_MVP|Not live Hub API/);
  });

  it('Quick Capture returns null when supported=false and My Work does not mount it', () => {
    assert.match(quickCapture, /if \(!supported\) \{\s*return null;/);
    assert.doesNotMatch(myWork, /QuickCaptureBar/);
  });
});
