/**
 * W2K Elite meetings list honesty. Same Hub sentences, one payload list.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MEETINGS_LIST_SLICE,
  MEETINGS_MISSING_SENTENCE,
  meetingsListHonesty,
} from './meetingsListHonesty.ts';

const root = dirname(fileURLToPath(import.meta.url));
const PAGE_CAP_REASON =
  'HVCG_Meetings list walk did not complete. reason=page_cap; pagesFetched=80. Section is SOURCE_UNAVAILABLE. OWNER_DECISION_REQUIRED pageCap=80 top=100 itemsFetched=80.';

describe('W2K Elite meetings list honesty', () => {
  it('lists entitled titles and dates with the count, and drops other clients', () => {
    const view = meetingsListHonesty(
      {
        status: 'COMPLETE',
        queried: true,
        items: [
          {
            id: '1',
            title: 'ACCG kickoff',
            clientCode: 'ACCG01',
            date: '2026-09-01T00:00:00.000Z',
            summary: 'Private notes and the next action',
          },
          { id: '2', title: 'PDG working session', clientCode: 'PDG01', date: '2026-09-02' },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, 1);
    assert.deepEqual(view.slice, [{ id: '1', title: 'ACCG kickoff', date: '2026-09-01' }]);
    assert.match(view.sentence, /meetings=INDEXED/);
    assert.match(view.sentence, /ACCG kickoff \(2026-09-01\)/);
    assert.match(view.sentence, /1 entitled HVCG_Meetings row/);
    assert.equal(view.sentence.includes('PDG working session'), false);
    assert.equal(view.sentence.includes('Private notes'), false);
    assert.equal(/meetings=MISSING|meetings=SOURCE_UNAVAILABLE/.test(view.sentence), false);
  });

  it('caps the short slice and still reports the entitled count', () => {
    const items = Array.from({ length: MEETINGS_LIST_SLICE + 2 }, (_, index) => ({
      id: `m-${index}`,
      title: `ACCG meeting ${index + 1}`,
      clientCode: 'ACCG01',
      date: `2026-09-${String(index + 1).padStart(2, '0')}`,
    }));
    const view = meetingsListHonesty({ status: 'COMPLETE', queried: true, items }, 'ACCG01');
    assert.equal(view.kind, 'indexed');
    if (view.kind !== 'indexed') return;
    assert.equal(view.count, MEETINGS_LIST_SLICE + 2);
    assert.equal(view.slice.length, MEETINGS_LIST_SLICE);
    assert.match(view.sentence, new RegExp(`Showing ${MEETINGS_LIST_SLICE} of ${MEETINGS_LIST_SLICE + 2}`));
    assert.equal(view.sentence.includes('ACCG meeting 8'), false);
  });

  it('says meetings=MISSING for a finished empty slice', () => {
    const view = meetingsListHonesty({ status: 'COMPLETE', queried: true, items: [] }, 'ACCG01');
    assert.equal(view.kind, 'missing');
    assert.equal(view.sentence, MEETINGS_MISSING_SENTENCE);
    assert.equal(/meetings=SOURCE_UNAVAILABLE|meetings=INDEXED/.test(view.sentence), false);
  });

  it('says meetings=SOURCE_UNAVAILABLE and hides partial rows on page_cap', () => {
    const view = meetingsListHonesty(
      {
        status: 'SOURCE_UNAVAILABLE',
        queried: false,
        reason: PAGE_CAP_REASON,
        items: [
          {
            id: 'partial',
            title: 'ACCG scoped page row',
            clientCode: 'ACCG01',
            date: '2026-09-04',
            summary: 'hidden note',
          },
        ],
      },
      'ACCG01',
    );
    assert.equal(view.kind, 'source_unavailable');
    assert.match(view.sentence, /meetings=SOURCE_UNAVAILABLE/);
    assert.match(view.sentence, /reason=page_cap/);
    assert.match(view.sentence, /pagesFetched=80/);
    assert.match(view.sentence, /OWNER_DECISION_REQUIRED/);
    assert.match(view.sentence, /itemsFetched=80/);
    assert.equal(view.sentence.includes('ACCG scoped page row'), false);
    assert.equal(view.sentence.includes('hidden note'), false);
    assert.equal(/meetings=MISSING|meetings=INDEXED/.test(view.sentence), false);
  });

  it('wires State → Related Work to the Hub payload helper and not a second list', () => {
    const page = readFileSync(join(root, 'LiveClientDetailPage.tsx'), 'utf8');
    assert.match(page, /title="Meetings"/);
    assert.match(page, /meetingsListHonesty\(workspace\?\.meetings, clientId\)/);
    assert.match(page, /\{meetingsHonesty\.sentence\}/);
    assert.match(page, /not the timeline/);
    assert.equal(page.includes('workspace.timeline.map'), true);
    const meetingsCard = page.slice(page.indexOf('title="Meetings"'), page.indexOf('title="Timeline"'));
    assert.equal(meetingsCard.includes('workspace.timeline'), false);
    assert.equal(meetingsCard.includes('summary'), false);
  });
});
