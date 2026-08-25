import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapsToOnboardingStatusIntent,
  routeAskAtlasPrompt,
  summarizeAskAtlasPrompt,
  type AskAtlasDrawerItem,
} from './askAtlasDrawer';

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

  it('routes onboarding-status Ask Atlas NL to Hub runtime, not SharePoint search', () => {
    assert.equal(mapsToOnboardingStatusIntent('Where are we on onboarding ACCG?'), true);
    assert.equal(routeAskAtlasPrompt('Where are we on onboarding ACCG?', { hasBearer: true }), 'hub_runtime_onboarding');
    assert.equal(routeAskAtlasPrompt('Where are we on onboarding ACCG?', { hasBearer: false }), 'unsigned_fail_closed');
    assert.equal(routeAskAtlasPrompt('Search ACCG onboarding files', { hasBearer: true }), 'hub_runtime');
    assert.equal(mapsToOnboardingStatusIntent('Search ACCG onboarding files'), false);
  });

  it('routes onboarding execute and status phrases to Hub, not generic questions', () => {
    assert.equal(routeAskAtlasPrompt('Start onboarding ACCG', { hasBearer: true }), 'hub_runtime_onboarding');
    assert.equal(routeAskAtlasPrompt('Run onboarding for ACCG01', { hasBearer: true }), 'hub_runtime_onboarding');
    assert.equal(routeAskAtlasPrompt('Execute onboarding ACCG', { hasBearer: true }), 'hub_runtime_onboarding');
    assert.equal(routeAskAtlasPrompt('Activate onboarding ACCG', { hasBearer: true }), 'hub_runtime_onboarding');
    assert.equal(routeAskAtlasPrompt('Begin onboarding ACCG', { hasBearer: true }), 'hub_runtime_onboarding');
    assert.equal(routeAskAtlasPrompt('Kick off onboarding ACCG', { hasBearer: true }), 'hub_runtime_onboarding');
    assert.equal(routeAskAtlasPrompt('What is the onboarding status for ACCG?', { hasBearer: true }), 'hub_runtime_onboarding');
    assert.equal(routeAskAtlasPrompt('Start the weekly marketing review', { hasBearer: true }), 'hub_runtime');
    assert.equal(mapsToOnboardingStatusIntent('What Capital matters need my attention?'), false);
  });

  it('filters client-scoped attention prompts away from other clients in signed cache', () => {
    const mixed: AskAtlasDrawerItem[] = [
      ...items,
      {
        state: 'Waiting',
        client: 'ACCG Inc.',
        clientCode: 'ACCG01',
        classification: 'LIKELY',
        why: 'Waiting on ACCG deliverable.',
        basedOn: 'ACCG project evidence',
      },
    ];
    const answer = summarizeAskAtlasPrompt('What needs my attention for ACCG?', mixed);
    assert.match(answer, /ACCG01/);
    assert.equal(answer.includes('PDG01'), false);
    assert.equal(answer.includes('Prodigy'), false);
  });
});
