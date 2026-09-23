/**
 * Ask Atlas capital questions must stay in the drawer.
 * The word "capital" is not a route to Capital Command Center when a live
 * Hub runner is attached. Hub workflowAnswer (including capitalContext=MISSING)
 * is what the drawer displays.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { aiCommandNavigatePath } from '../../../../packages/atlas-design-system/src/components/aiCommandNavigate.ts';

const root = dirname(fileURLToPath(import.meta.url));
const CAPITAL_CONTEXT = 'What is the current capital context for ACCG01?';
const CAPITAL_OPPORTUNITY = 'What capital opportunities are open for ACCG01?';
const PROJECTS = 'What are the current active projects for ACCG01?';

describe('Ask Atlas keyword navigation', () => {
  it('keeps live capital-context and capital-opportunity questions in the drawer', () => {
    assert.equal(aiCommandNavigatePath(CAPITAL_CONTEXT, { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath(CAPITAL_OPPORTUNITY, { liveAskAtlas: true }), null);
  });

  it('keeps the projects control probe in the drawer', () => {
    assert.equal(aiCommandNavigatePath(PROJECTS, { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath(PROJECTS, { liveAskAtlas: false }), null);
  });

  it('still keyword-routes capital only for the dev stub panel', () => {
    assert.equal(aiCommandNavigatePath('Open capital pipeline', { liveAskAtlas: false }), '/capital');
  });

  it('keeps the live document exception and does not treat capital as documents', () => {
    assert.equal(aiCommandNavigatePath('Find missing documents', { liveAskAtlas: true }), null);
    assert.equal(aiCommandNavigatePath('Find missing documents', { liveAskAtlas: false }), '/documents');
  });

  it('wires the drawer runner through the helper and displays Hub workflowAnswer', () => {
    const panel = readFileSync(
      join(root, '../../../../packages/atlas-design-system/src/components/SearchAndAI.tsx'),
      'utf8',
    );
    const runStart = panel.indexOf('const run = (prompt: string)');
    const run = panel.slice(runStart, panel.indexOf('return (', runStart));
    assert.match(run, /aiCommandNavigatePath\(trimmed, \{ liveAskAtlas: Boolean\(onRunPrompt\) \}\)/);
    assert.match(run, /onRunPrompt\(trimmed\)/);
    assert.doesNotMatch(run, /includes\('capital'\)/);
    assert.doesNotMatch(run, /onNavigateHint\('\/capital'\)/);

    const appShell = readFileSync(join(root, 'AppShell.tsx'), 'utf8');
    const runPrompt = appShell.slice(
      appShell.indexOf('onRunPrompt={async (prompt)'),
      appShell.indexOf('onAction={async'),
    );
    assert.match(runPrompt, /fetchOperatorRuntime\(hubAuth, prompt/);
    assert.match(runPrompt, /if \(res\.workflowAnswer\) return res\.workflowAnswer/);
  });
});
