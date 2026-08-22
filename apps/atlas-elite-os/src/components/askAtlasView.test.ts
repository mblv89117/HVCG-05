import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ASK_ATLAS_QUESTION,
  extractAskAtlasFromOperatorJson,
  extractAuthorizedSearchFromRuntime,
  extractClientContextFromRuntime,
  extractOperatorRuntimeEnvelope,
  fetchOperatorAskAtlas,
  fetchOperatorRuntime,
  operatorRuntimePath,
} from '../integrations/hub/askAtlas';
import { HubHttpError } from '../integrations/hub/hubFetch';
import {
  HART_CLIENT_CONTEXT_FIXTURE,
  HART_RUNTIME_ENVELOPE,
  HONEST_EMPTY_ASK_ATLAS_FIXTURE,
  OVERDUE_ASK_ATLAS_FIXTURE,
  OVERDUE_RUNTIME_ENVELOPE,
  OWNER_GATED_RUNTIME_ENVELOPE,
  SEARCH_PRODIGY_AUTHORIZED_SEARCH_FIXTURE,
  SEARCH_PRODIGY_RUNTIME_ENVELOPE,
  SIGNED_ASK_ATLAS_FIXTURE,
  UNKNOWN_RUNTIME_ENVELOPE,
} from './askAtlas.fixture';
import {
  ASK_ATLAS_EMPTY_COPY,
  ASK_ATLAS_UNSIGNED_COPY,
  askAtlasView,
  askAtlasViewFromRuntime,
  renderAskAtlasMarkup,
  serializeAskAtlasCopy,
  type AskAtlasView,
} from './askAtlasView';

function AskAtlasCopy({ view }: { view: AskAtlasView }) {
  return createElement('div', {
    'data-testid': 'ask-atlas-surface',
    'data-kind': view.kind,
    dangerouslySetInnerHTML: { __html: renderAskAtlasMarkup(view) },
  });
}

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

    const html = renderToStaticMarkup(createElement(AskAtlasCopy, { view }));
    assert.match(html, /Ask Atlas — What needs attention/);
    assert.match(html, /WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW/);
    assert.match(html, /At Risk/);
    assert.match(html, /Prodigy Games/);
    assert.match(html, /LIKELY/);
    assert.match(html, /Based on:/);
    assert.match(html, /PROPOSED/);
    assert.match(html, /data-state="At Risk"/);
    assert.match(html, /data-classification="LIKELY"/);
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
    const html = renderToStaticMarkup(createElement(AskAtlasCopy, { view }));
    assert.match(html, /No entitled attention items/);
    assert.doesNotMatch(html, /Prodigy Games/);
    assert.doesNotMatch(html, /<ol>/);
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
    const html = renderToStaticMarkup(createElement(AskAtlasCopy, { view }));
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

  it('unsigned / missing bearer never calls runtime and never renders entitled items', async () => {
    let called = false;
    const original = globalThis.fetch;
    globalThis.fetch = async () => {
      called = true;
      throw new Error('runtime fetch must not run without a Hub Bearer');
    };
    try {
      await assert.rejects(
        () =>
          fetchOperatorRuntime(
            { userId: '', organizationId: 'org-hvcg', clientIds: [] },
            'What is overdue?',
          ),
        (err: unknown) => {
          assert.ok(err instanceof HubHttpError);
          assert.equal(err.status, 401);
          assert.equal(err.code, 'missing_bearer');
          return true;
        },
      );
      assert.equal(called, false);

      const view = askAtlasView({
        signed: false,
        payload: OVERDUE_ASK_ATLAS_FIXTURE,
        clientContext: HART_CLIENT_CONTEXT_FIXTURE,
        authorizedSearch: SEARCH_PRODIGY_AUTHORIZED_SEARCH_FIXTURE,
        askedQuestion: 'What is overdue?',
      });
      assert.equal(view.kind, 'unsigned');
      assert.equal(view.items.length, 0);
      assert.equal(view.clientContext, null);
      assert.equal(view.authorizedSearch, null);
      const copy = serializeAskAtlasCopy(view);
      assert.doesNotMatch(copy, /Hart Family|HFD01|PDG01|Prodigy|Colorado Beef|CCB01|Overdue/);
      assertNoInventedMoney(copy);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('Ask Atlas signed runtime fetch', () => {
  it('uses /operator/runtime.json?question= and never /operator.json', async () => {
    const calls: string[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response(
        JSON.stringify({
          operatorDesk: { askAtlas: OVERDUE_ASK_ATLAS_FIXTURE },
          runtime: {
            agent: 'atlas-hub-runtime',
            toolsInvoked: ['get_attention_items'],
            policyClass: 'READ_AUTO',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    try {
      const question = 'What is overdue?';
      const envelope = await fetchOperatorRuntime(
        {
          userId: 'u1',
          organizationId: 'org-hvcg',
          clientIds: [],
          accessToken: 'test-hub-bearer',
        },
        question,
      );
      assert.equal(calls.length, 1);
      assert.equal(operatorRuntimePath(question), '/operator/runtime.json?question=What%20is%20overdue%3F');
      assert.match(calls[0], /\/operator\/runtime\.json\?question=/);
      assert.match(decodeURIComponent(calls[0]), /What is overdue\?/);
      assert.equal(calls[0].includes('/operator.json'), false);
      assert.equal(envelope.askedQuestion, question);
      assert.equal(envelope.askAtlas?.items.length, 2);
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('Ask Atlas overdue runtime picture', () => {
  it('renders 2 Overdue items from operatorDesk.askAtlas without inventing amounts', () => {
    const view = askAtlasViewFromRuntime({
      signed: true,
      envelope: OVERDUE_RUNTIME_ENVELOPE,
    });
    assert.equal(view.kind, 'items');
    assert.equal(view.question, 'What is overdue?');
    assert.equal(view.items.length, 2);
    assert.deepEqual(
      view.items.map((row) => row.state),
      ['Overdue', 'Overdue'],
    );
    assert.equal(view.invented, false);
    const copy = serializeAskAtlasCopy(view);
    assert.match(copy, /What is overdue\?/);
    assert.doesNotMatch(copy, /WHAT ARE THE MOST IMPORTANT THINGS I NEED TO ADDRESS ACROSS HVCG RIGHT NOW/);
    assertNoInventedMoney(copy);
    const html = renderToStaticMarkup(createElement(AskAtlasCopy, { view }));
    assert.match(html, /data-state="Overdue"/);
    assertNoInventedMoney(html);
  });
});

describe('Ask Atlas Hart clientContext', () => {
  it('renders HFD01 LIKELY recovered_folder_filename and does not leak PDG01', () => {
    const extracted = extractClientContextFromRuntime({
      clientContext: HART_CLIENT_CONTEXT_FIXTURE,
    });
    assert.equal(extracted?.client.clientCode, 'HFD01');
    assert.equal(extracted?.classification, 'LIKELY');
    assert.equal(extracted?.evidenceClass, 'recovered_folder_filename');
    assert.deepEqual(extracted?.realClientsOperationalized, []);
    assert.equal(extracted?.client.hubMiOperationalized, false);

    const view = askAtlasViewFromRuntime({
      signed: true,
      envelope: HART_RUNTIME_ENVELOPE,
    });
    assert.equal(view.kind, 'client-context');
    assert.equal(view.question, 'What are we doing for Hart?');
    assert.equal(view.clientContext?.clientCode, 'HFD01');
    assert.equal(view.clientContext?.classification, 'LIKELY');
    assert.equal(view.clientContext?.evidenceClass, 'recovered_folder_filename');
    assert.deepEqual(view.clientContext?.realClientsOperationalized, []);
    assert.equal(view.clientContext?.hubMiOperationalized, false);
    const copy = serializeAskAtlasCopy(view);
    assert.match(copy, /HFD01/);
    assert.match(copy, /LIKELY/);
    assert.match(copy, /recovered_folder_filename/);
    assert.doesNotMatch(copy, /PDG01|Prodigy Games/);
    assert.equal(copy.includes('Hub-MI row'), false);
    assertNoInventedMoney(copy);
  });
});

describe('Ask Atlas Search Prodigy', () => {
  it('renders authorizedSearch hits without inventing extras', () => {
    const extracted = extractAuthorizedSearchFromRuntime({
      authorizedSearch: SEARCH_PRODIGY_AUTHORIZED_SEARCH_FIXTURE,
    });
    assert.equal(extracted?.hitCount, 1);
    assert.equal(extracted?.hits.length, 1);
    assert.equal(extracted?.pictureComposed, true);
    assert.equal(extracted?.entitled, true);

    const view = askAtlasViewFromRuntime({
      signed: true,
      envelope: SEARCH_PRODIGY_RUNTIME_ENVELOPE,
    });
    assert.equal(view.kind, 'search');
    assert.equal(view.question, 'Search Prodigy');
    assert.equal(view.authorizedSearch?.hitCount, 1);
    assert.equal(view.authorizedSearch?.hits.length, 1);
    assert.equal(view.authorizedSearch?.hits[0]?.title, 'Prodigy engagement note');
    assert.equal(view.authorizedSearch?.hits[0]?.clientCode, 'PDG01');
    const copy = serializeAskAtlasCopy(view);
    assert.match(copy, /hitCount=1/);
    assert.match(copy, /Prodigy engagement note/);
    assert.doesNotMatch(copy, /HFD01|Hart Family|CCB01|Colorado Beef/);
    assertNoInventedMoney(copy);
  });
});

describe('Ask Atlas owner-gated and unknown', () => {
  it('renders honest empty for owner-gated and unknown questions', () => {
    const gated = askAtlasViewFromRuntime({
      signed: true,
      envelope: OWNER_GATED_RUNTIME_ENVELOPE,
    });
    assert.equal(gated.kind, 'empty');
    assert.equal(gated.question, 'Submit this to the lender');
    assert.equal(gated.items.length, 0);
    assert.equal(gated.clientContext, null);
    assert.equal(gated.authorizedSearch, null);
    assert.equal(gated.emptyReason, ASK_ATLAS_EMPTY_COPY);
    const gatedCopy = serializeAskAtlasCopy(gated);
    assert.match(gatedCopy, /Submit this to the lender/);
    assert.doesNotMatch(gatedCopy, /Prodigy|Hart|PDG01|HFD01|250000/);
    assertNoInventedMoney(gatedCopy);

    const unknown = askAtlasViewFromRuntime({
      signed: true,
      envelope: UNKNOWN_RUNTIME_ENVELOPE,
    });
    assert.equal(unknown.kind, 'empty');
    assert.equal(unknown.question, 'what is the weather in Denver');
    assert.equal(unknown.items.length, 0);
    assert.equal(extractOperatorRuntimeEnvelope({
      operatorDesk: { askAtlas: OWNER_GATED_RUNTIME_ENVELOPE.askAtlas },
      runtime: { toolsInvoked: [] },
    }, 'what is the weather in Denver').runtime?.toolsInvoked.length, 0);
    assertNoInventedMoney(serializeAskAtlasCopy(unknown));
  });

  it('does not invent money, lender criteria, LTV, or Hub-MI rows', () => {
    for (const envelope of [
      OVERDUE_RUNTIME_ENVELOPE,
      HART_RUNTIME_ENVELOPE,
      SEARCH_PRODIGY_RUNTIME_ENVELOPE,
      OWNER_GATED_RUNTIME_ENVELOPE,
      UNKNOWN_RUNTIME_ENVELOPE,
    ]) {
      const view = askAtlasViewFromRuntime({ signed: true, envelope });
      const copy = serializeAskAtlasCopy(view);
      assertNoInventedMoney(copy);
      assert.equal(/hub-mi/i.test(copy) && /invent/i.test(copy) ? copy.includes('$') : false, false);
      assert.doesNotMatch(copy, /ltv\s*[:=]\s*\d/i);
    }
  });
});
