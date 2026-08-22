import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ASK_ATLAS_QUESTION,
  extractAskAtlasFromOperatorJson,
  fetchOperatorAskAtlas,
} from '../integrations/hub/askAtlas';
import { HubHttpError } from '../integrations/hub/hubFetch';
import { AskAtlasSurface } from './AskAtlasSurface';
import { HONEST_EMPTY_ASK_ATLAS_FIXTURE, SIGNED_ASK_ATLAS_FIXTURE } from './askAtlas.fixture';
import {
  ASK_ATLAS_EMPTY_COPY,
  ASK_ATLAS_UNSIGNED_COPY,
  askAtlasView,
  serializeAskAtlasCopy,
} from './askAtlasView';

const AMOUNT = /\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/;

function assertNoInventedMoney(copy: string): void {
  assert.equal(copy.includes('$'), false);
  assert.equal(AMOUNT.test(copy), false);
  assert.equal(/\bltv\s*[:=]\s*\d/i.test(copy), false);
  assert.equal(/invented ltv|ltv 80|loan.to.value/i.test(copy), false);
}

describe('Ask Atlas signed view', () => {
  it('renders fixture items with state, why, basedOn, and classification in payload order', () => {
    const view = askAtlasView({ signed: true, payload: SIGNED_ASK_ATLAS_FIXTURE });
    assert.equal(view.kind, 'items');
    assert.equal(view.question, ASK_ATLAS_QUESTION);
    assert.equal(view.invented, false);
    assert.deepEqual(
      view.items.map((row) => row.state),
      ['At Risk', 'Overdue', 'Decision Required', 'Capital', 'Waiting'],
    );
    assert.deepEqual(view.ranking, SIGNED_ASK_ATLAS_FIXTURE.ranking);

    const atRisk = view.items[0];
    assert.equal(atRisk?.state, 'At Risk');
    assert.equal(atRisk?.client, 'Prodigy Games');
    assert.equal(atRisk?.clientCode, 'PDG01');
    assert.equal(atRisk?.classification, 'LIKELY');
    assert.equal(atRisk?.provenance, 'LIKELY');
    assert.match(atRisk?.why || '', /past-due invoice filenames/i);
    assert.match(atRisk?.basedOn || '', /Capital_Acquisition/i);

    assert.equal(
      view.items.some((row) => row.state === 'At Risk' && (row.client === 'Colorado Beef' || row.clientCode === 'CCB01')),
      false,
    );
    assert.ok(view.items.some((row) => row.state === 'Capital' && row.client === 'Colorado Beef' && row.classification === 'CONFIRMED'));
    assert.ok(view.items.some((row) => row.state === 'Decision Required' && row.classification === 'PROPOSED'));

    const html = renderToStaticMarkup(createElement(AskAtlasSurface, { view }));
    assert.match(html, /Ask Atlas — What needs attention/);
    assert.match(html, /WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW/);
    assert.match(html, /At Risk/);
    assert.match(html, /Prodigy Games/);
    assert.match(html, /LIKELY/);
    assert.match(html, /Based on:/);
    assert.match(html, /PROPOSED/);
    assert.doesNotMatch(html, /data-classification="CONFIRMED"[^>]*data-state="At Risk"/);
    assertNoInventedMoney(serializeAskAtlasCopy(view));
    assertNoInventedMoney(html);
  });

  it('does not re-rank payload items even if Hub order is unexpected', () => {
    const shuffled = {
      ...SIGNED_ASK_ATLAS_FIXTURE,
      items: [...SIGNED_ASK_ATLAS_FIXTURE.items].reverse(),
    };
    const view = askAtlasView({ signed: true, payload: shuffled });
    assert.deepEqual(
      view.items.map((row) => row.id),
      shuffled.items.map((row) => row.id),
    );
  });

  it('keeps PROPOSED and LIKELY visible and does not promote them to CONFIRMED', () => {
    const view = askAtlasView({ signed: true, payload: SIGNED_ASK_ATLAS_FIXTURE });
    const likely = view.items.filter((row) => row.classification === 'LIKELY');
    const proposed = view.items.filter((row) => row.classification === 'PROPOSED');
    assert.ok(likely.length >= 1);
    assert.ok(proposed.length >= 1);
    assert.equal(likely.every((row) => row.classification !== 'CONFIRMED'), true);
    const copy = serializeAskAtlasCopy(view);
    assert.match(copy, /LIKELY/);
    assert.match(copy, /PROPOSED/);
  });
});

describe('Ask Atlas honest empty', () => {
  it('renders empty, not invented items, when honestEmpty=true', () => {
    const view = askAtlasView({ signed: true, payload: HONEST_EMPTY_ASK_ATLAS_FIXTURE });
    assert.equal(view.kind, 'empty');
    assert.equal(view.items.length, 0);
    assert.equal(view.emptyReason, ASK_ATLAS_EMPTY_COPY);
    assert.equal(view.question, ASK_ATLAS_QUESTION);
    const copy = serializeAskAtlasCopy(view);
    assert.doesNotMatch(copy, /Prodigy Games|Colorado Beef|PDG01|CCB01/);
    assert.match(copy, /does not invent/);
    const html = renderToStaticMarkup(createElement(AskAtlasSurface, { view }));
    assert.match(html, /No entitled attention items/);
    assert.doesNotMatch(html, /Prodigy Games/);
    assert.equal(html.includes('ask-atlas-items'), false);
    assertNoInventedMoney(copy);
    assertNoInventedMoney(html);
  });

  it('treats items=[] as honest empty even if honestEmpty is false', () => {
    const view = askAtlasView({
      signed: true,
      payload: { ...HONEST_EMPTY_ASK_ATLAS_FIXTURE, honestEmpty: false, items: [] },
    });
    assert.equal(view.kind, 'empty');
    assert.equal(view.items.length, 0);
  });
});

describe('Ask Atlas unsigned fail-closed', () => {
  it('does not leak fixture items, client names, or codes when unsigned', () => {
    const view = askAtlasView({ signed: false, payload: SIGNED_ASK_ATLAS_FIXTURE });
    assert.equal(view.kind, 'unsigned');
    assert.equal(view.items.length, 0);
    assert.equal(view.question, null);
    assert.equal(view.emptyReason, ASK_ATLAS_UNSIGNED_COPY);
    const copy = serializeAskAtlasCopy(view);
    assert.doesNotMatch(copy, /Prodigy Games|Colorado Beef|PDG01|CCB01|Capital_Acquisition|Past Due Invoice/);
    const html = renderToStaticMarkup(createElement(AskAtlasSurface, { view }));
    assert.match(html, /fail-closed/);
    assert.doesNotMatch(html, /Prodigy Games|Colorado Beef|PDG01|CCB01/);
    assert.doesNotMatch(html, /WHAT ARE THE MOST IMPORTANT THINGS/);
    assertNoInventedMoney(copy);
    assertNoInventedMoney(html);
  });

  it('does not leak askAtlas on 401/403 even if a payload is present', () => {
    const view = askAtlasView({
      signed: true,
      payload: SIGNED_ASK_ATLAS_FIXTURE,
      status: 401,
    });
    assert.equal(view.kind, 'denied');
    assert.equal(view.items.length, 0);
    const copy = serializeAskAtlasCopy(view);
    assert.doesNotMatch(copy, /Prodigy Games|PDG01|Colorado Beef|CCB01/);
  });

  it('fetchOperatorAskAtlas fails closed without a Bearer token', async () => {
    await assert.rejects(
      () =>
        fetchOperatorAskAtlas({
          userId: '',
          organizationId: 'org-hvcg',
          clientIds: [],
        }),
      (err: unknown) => {
        assert.ok(err instanceof HubHttpError);
        assert.equal(err.status, 401);
        assert.equal(err.code, 'missing_bearer');
        return true;
      },
    );
  });

  it('extracts askAtlas only from operatorDesk and ignores top-level leaks', () => {
    const signed = extractAskAtlasFromOperatorJson({
      operatorDesk: { askAtlas: SIGNED_ASK_ATLAS_FIXTURE },
    });
    assert.equal(signed?.kind, 'ask_atlas_attention_v1');
    assert.equal(signed?.items[0]?.client, 'Prodigy Games');

    const leaked = extractAskAtlasFromOperatorJson({
      askAtlas: SIGNED_ASK_ATLAS_FIXTURE,
    });
    assert.equal(leaked, null);

    const unsigned = extractAskAtlasFromOperatorJson({
      error: 'unauthorized',
    });
    assert.equal(unsigned, null);
  });
});
