import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { summarizeAskAtlasPrompt, type AskAtlasDrawerItem } from './askAtlasDrawer';

const items: AskAtlasDrawerItem[] = [
  {
    state: 'Capital',
    client: 'Prodigy Games',
    clientCode: 'PDG01',
    classification: 'CONFIRMED',
    why: 'Review recovered capital-packet filename.',
    basedOn: 'CONFIRMED filename Strategic_Capital_Agreement May 6 2026.pdf',
  },
  {
    state: 'Overdue',
    client: 'Prodigy Games',
    clientCode: 'PDG01',
    classification: 'LIKELY',
    why: 'Review recovered past-due invoice filename.',
    basedOn: 'LIKELY April 2026 Past Due Invoice filename',
  },
];

describe('Ask Atlas drawer prompt summary', () => {
  it('routes capital attention questions to Capital items from signed operator context', () => {
    const answer = summarizeAskAtlasPrompt('What Capital matters need my attention?', items);
    assert.match(answer, /Ask Atlas found 1 entitled attention item/);
    assert.match(answer, /Capital - Prodigy Games \/ PDG01/);
    assert.match(answer, /Based on: CONFIRMED filename Strategic_Capital_Agreement/);
    assert.match(answer, /CONFIRMED/);
    assert.equal(answer.includes('Past Due Invoice'), false);
  });

  it('does not invent when signed context has no matching items', () => {
    const answer = summarizeAskAtlasPrompt('What is blocked?', items);
    assert.match(answer, /No entitled attention items/);
    assert.match(answer, /does not invent/);
  });

  it('surfaces signed context load errors instead of reporting false empty state', () => {
    const answer = summarizeAskAtlasPrompt('What needs attention?', [], 'missing bearer');
    assert.match(answer, /could not load signed operator context/);
    assert.match(answer, /missing bearer/);
  });
});
