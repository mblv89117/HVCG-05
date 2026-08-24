/**
 * ATLAS-ASK-ATLAS-CLIENT-HINTS-001
 * Count-only fabric.clientHints extras on authorizedSearch / operating picture.
 * Same shape as /health fabricSync.clientHints. No identifiers. No listClientHints.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  completedEntitledClientHints,
  copyEntitledClientHints,
  composeProductResearch,
  productResearchHasInventedFacts,
} from '../src/pm/operatorDesk/productResearchAgent.ts';
import { inspectProductImprovements } from '../src/pm/operatorDesk/productImprovement.ts';
import { emptyHonestOperatingPicture, withCompletedClientHints } from '../src/pm/operatorDesk/model.ts';
import { searchAuthorizedKnowledgeSync } from '../src/pm/operatorDesk/toolGateway.ts';
import type { AtlasPrincipal } from '../src/middleware/auth.ts';
import type { OperatorOperatingPicture } from '../src/pm/operatorDesk/types.ts';

const HINT_IDS =
  /PDG01|ACCG01|CCB01|HFD01|LIEN01|Colorado Craft|Precision Dental|displayName|@highvalue|\bDBA\b|ClientCode|Bearer\s|token=/i;

function staffPrincipal(): AtlasPrincipal {
  return {
    userId: 'ask-atlas-hints-writer',
    organizationId: 'org-hvcg',
    allowedClientIds: ['SYN01'],
    roles: ['HVCG Team Member'],
  };
}

function clientPrincipal(): AtlasPrincipal {
  return {
    userId: 'client-exec',
    organizationId: 'org-hvcg',
    allowedClientIds: ['SYN01'],
    roles: ['Client Executive'],
  };
}

function readyHints() {
  return {
    status: 'ready' as const,
    reason: 'Client hints loaded on the last completed sweep.',
    count: 10,
  };
}

function pictureWithHints(raw?: Parameters<typeof withCompletedClientHints>[1]): OperatorOperatingPicture {
  return withCompletedClientHints(emptyHonestOperatingPicture(), raw ?? readyHints());
}

function noInventedFacts(value: unknown): void {
  const serialized = JSON.stringify(value);
  assert.equal(HINT_IDS.test(serialized), false);
  assert.equal(serialized.includes('Hub-MI'), false);
  assert.equal(/\bltv\s*[:=]?\s*\d/i.test(serialized), false);
}

describe('ATLAS-ASK-ATLAS-CLIENT-HINTS-001 count-only extras', () => {
  it('attaches count-only keys on picture and authorizedSearch when fabric is ready', () => {
    const picture = pictureWithHints(readyHints());
    assert.ok(picture.clientHints);
    assert.deepEqual(Object.keys(picture.clientHints).sort(), ['count', 'reason', 'status']);
    assert.equal(picture.clientHints.status, 'ready');
    assert.equal(picture.clientHints.count, 10);
    assert.equal(typeof picture.clientHints.reason, 'string');

    const result = searchAuthorizedKnowledgeSync({
      principal: staffPrincipal(),
      picture,
      searchQuery: 'SYN01',
    });
    assert.ok(result.authorizedSearch.clientHints);
    assert.deepEqual(Object.keys(result.authorizedSearch.clientHints).sort(), ['count', 'reason', 'status']);
    assert.equal(result.authorizedSearch.clientHints.status, 'ready');
    assert.equal(result.authorizedSearch.clientHints.count, 10);
    assert.equal(result.authorizedSearch.clientHints.reason, readyHints().reason);
    assert.equal(HINT_IDS.test(JSON.stringify(result.authorizedSearch.clientHints)), false);
    noInventedFacts(result.authorizedSearch.clientHints);
    noInventedFacts(picture.clientHints);
  });

  it('omits extras when fabric is skipped or never_run', () => {
    const skipped = pictureWithHints({
      status: 'skipped',
      reason: 'Client hints have not completed; hint population remains unproven.',
      count: 0,
    });
    assert.equal(skipped.clientHints, undefined);
    assert.equal('clientHints' in skipped, false);

    const neverRun = withCompletedClientHints(emptyHonestOperatingPicture(), undefined);
    assert.equal(neverRun.clientHints, undefined);

    const skippedSearch = searchAuthorizedKnowledgeSync({
      principal: staffPrincipal(),
      picture: skipped,
      searchQuery: 'SYN01',
    });
    assert.equal(skippedSearch.authorizedSearch.clientHints, undefined);
    assert.equal('clientHints' in skippedSearch.authorizedSearch, false);

    const bare = searchAuthorizedKnowledgeSync({
      principal: staffPrincipal(),
      picture: emptyHonestOperatingPicture(),
      searchQuery: 'SYN01',
    });
    assert.equal(bare.authorizedSearch.clientHints, undefined);
    assert.equal('clientHints' in skippedSearch.authorizedSearch, false);
  });

  it('keeps empty authorizedSearch honest-empty when extras attach', () => {
    const result = searchAuthorizedKnowledgeSync({
      principal: staffPrincipal(),
      picture: pictureWithHints(readyHints()),
      searchQuery: '',
    });
    assert.equal(result.authorizedSearch.honestEmpty, true);
    assert.equal(result.authorizedSearch.hitCount, 0);
    assert.equal(result.authorizedSearch.hits.length, 0);
    assert.equal(result.authorizedSearch.classification, 'HONEST_EMPTY');
    assert.equal(result.authorizedSearch.invented, false);
    assert.equal(result.askAtlas.honestEmpty, true);
    assert.ok(result.authorizedSearch.clientHints);
    assert.equal(result.authorizedSearch.clientHints.status, 'ready');
    assert.equal(result.authorizedSearch.clientHints.count, 10);
    noInventedFacts(result);
  });

  it('strips identifiers and extra fields; isolation omits extras when unauthorized', () => {
    const leaked = completedEntitledClientHints({
      status: 'ready',
      reason: 'loaded PDG01 ACCG01 CCB01 displayName DBA user@highvalue token=secret',
      count: 10,
      clientCodes: ['PDG01', 'ACCG01', 'CCB01', 'HFD01', 'LIEN01', 'FAKE99'],
      displayName: 'Colorado Craft Beef',
    } as { status: unknown; reason: unknown; count: unknown });
    assert.ok(leaked);
    assert.deepEqual(Object.keys(leaked).sort(), ['count', 'reason', 'status']);
    assert.equal(leaked.reason, '');
    assert.equal(HINT_IDS.test(JSON.stringify(leaked)), false);

    const forbidden = searchAuthorizedKnowledgeSync({
      principal: clientPrincipal(),
      picture: pictureWithHints(readyHints()),
      searchQuery: 'SYN01',
    });
    assert.equal(forbidden.authorizedSearch.entitled, false);
    assert.equal(forbidden.authorizedSearch.clientHints, undefined);
    assert.equal(HINT_IDS.test(JSON.stringify(forbidden)), false);
  });

  it('product-research inspect path still evaluates count-only ready hints', () => {
    const copied = copyEntitledClientHints(readyHints());
    assert.ok(copied);
    const result = inspectProductImprovements({
      principal: staffPrincipal(),
      picture: pictureWithHints(copied),
      health: {
        authRequired: true,
        insecureDevAuth: false,
        providers: { microsoft: true, google: true, github: true },
        fabricNotes: ['Mail delta reached HTTP 200.'],
        fabricHonesty: 'delta',
        clientHints: copied,
      },
      inspectClass: 'product_research',
    });
    const atlas = result.productImprovement.productResearch.surfaces.find((row) => row.surface === 'atlas');
    assert.ok(atlas);
    assert.equal(atlas.status, 'evaluated');
    assert.match(atlas.basedOn, /status=ready count=10/);
    assert.equal(HINT_IDS.test(atlas.basedOn), false);
    assert.equal(result.productImprovement.productResearch.execute, false);
    assert.equal(productResearchHasInventedFacts(result.productImprovement.productResearch), false);
    noInventedFacts(result);

    const composed = composeProductResearch({
      health: {
        authRequired: true,
        insecureDevAuth: false,
        fabricHonesty: 'delta',
        clientHints: copied,
      },
    });
    assert.equal(composed.surfaces.find((row) => row.surface === 'atlas')?.basedOn, 'Entitled Hub fabric clientHints status=ready count=10');
  });
});
