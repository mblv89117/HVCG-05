import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractClientScopedAttentionQuery,
  filterAttentionItemsForClient,
  mapsToGetClientScopedAttention,
  resolveAskAtlasScope,
} from '../src/pm/operatorDesk/askAtlasScope.ts';
import {
  mapsToGetAttentionItems,
  runAtlasHubRuntime,
} from '../src/pm/operatorDesk/agentRuntime.ts';
import { buildOperatorDeskModel } from '../src/pm/operatorDesk/model.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';

const staff: AtlasPrincipal = {
  userId: '11111111-1111-4111-8111-aaaaaaaaaa01',
  organizationId: 'org-hvcg',
  allowedClientIds: ['ACCG01', 'PDG01', 'HFD01', 'CCB01', 'LIEN01'],
  roles: ['HVCG Team Member'],
};

function deskPicture() {
  const model = buildOperatorDeskModel({
    hubSha: 'scope-test',
    entitledClients: ['ACCG01', 'PDG01', 'HFD01', 'CCB01', 'LIEN01'],
    commandCenter: {},
    commercialContext: {
      schemaVersion: 1,
      clients: [],
      opportunities: [],
      engagements: [],
      invoices: [],
      payments: [],
      capital: [],
      procurement: [],
      risks: [],
      growth: [],
    },
  });
  return model.operatingPicture;
}

describe('Ask Atlas client-scoped attention isolation', () => {
  it('detects client-scoped attention patterns and excludes them from global attention routing', () => {
    assert.equal(mapsToGetClientScopedAttention('What needs my attention for ACCG?'), true);
    assert.equal(mapsToGetClientScopedAttention('What are we waiting on for Hart?'), true);
    assert.equal(mapsToGetAttentionItems('What needs my attention for ACCG?'), false);
    assert.equal(mapsToGetAttentionItems('What needs my attention?'), true);
    const scoped = extractClientScopedAttentionQuery('What are we waiting on for Hart?');
    assert.equal(scoped?.clientToken, 'Hart');
    assert.equal(scoped?.filterState, 'Waiting');
  });

  it('keeps ACCG-scoped attention off Prodigy and Hart items', () => {
    const picture = deskPicture();
    const accg = runAtlasHubRuntime({
      principal: staff,
      picture,
      question: 'What needs my attention for ACCG?',
      now: '2026-08-25T20:00:00.000Z',
    });
    assert.ok(accg.askAtlas.items.every((item) => item.clientCode === 'ACCG01' || !item.clientCode));
    assert.equal(accg.askAtlas.items.some((item) => item.clientCode === 'PDG01'), false);
    assert.equal(accg.askAtlas.items.some((item) => item.clientCode === 'HFD01'), false);
    assert.equal(JSON.stringify(accg).includes('Prodigy'), false);
  });

  it('keeps Hart-scoped waiting questions off ACCG items', () => {
    const picture = deskPicture();
    const hart = runAtlasHubRuntime({
      principal: staff,
      picture,
      question: 'What are we waiting on for Hart?',
      now: '2026-08-25T20:01:00.000Z',
    });
    assert.ok(
      hart.askAtlas.items.every(
        (item) => item.clientCode === 'HFD01' || item.state !== 'Waiting' || !item.clientCode,
      ),
    );
    assert.equal(hart.askAtlas.items.some((item) => item.clientCode === 'ACCG01'), false);
  });

  it('binds explicit clientCode param for portfolio attention questions on client pages', () => {
    const scope = resolveAskAtlasScope(staff, 'What needs my attention?', {
      explicitClientCode: 'ACCG01',
    });
    assert.equal(scope.kind, 'client');
    if (scope.kind === 'client') assert.equal(scope.clientCode, 'ACCG01');

    const picture = deskPicture();
    const scoped = runAtlasHubRuntime({
      principal: staff,
      picture,
      question: 'What needs my attention?',
      explicitClientCode: 'ACCG01',
      now: '2026-08-25T20:02:00.000Z',
    });
    assert.equal(scoped.askAtlas.items.some((item) => item.clientCode === 'PDG01'), false);
    assert.equal(scoped.askAtlas.items.some((item) => item.clientCode === 'ACCG01'), true);
  });

  it('filterAttentionItemsForClient never admits foreign client codes', () => {
    const items = [
      { state: 'Waiting' as const, clientCode: 'ACCG01', client: 'ACCG Inc.' },
      { state: 'Capital' as const, clientCode: 'PDG01', client: 'Prodigy Games' },
      { state: 'Overdue' as const, clientCode: 'HFD01', client: 'Hart Family Dental' },
    ];
    const accgOnly = filterAttentionItemsForClient(items, 'ACCG01', 'ACCG Inc.');
    assert.deepEqual(accgOnly.map((row) => row.clientCode), ['ACCG01']);
  });
});
