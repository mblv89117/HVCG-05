/**
 * D13 — Project Detail deferred-collection honesty (BU-P1-PROJECT-DEFERRED).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFERRED_CLOSED_COPY,
  DEFERRED_WRITE_BLOCKED,
  PROJECT_DEFERRED_COLLECTION_KEYS,
  deferredTabLabel,
  isCollectionDeferredClosed,
  resolveDeferredClosedMap,
} from './projectCollectionHonesty.ts';

const root = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(root, 'ProjectDetailPage.tsx'), 'utf8');

describe('D13 project collection honesty helpers', () => {
  it('defaults all eight collections to deferred-closed when Hub omits flags', () => {
    const closed = resolveDeferredClosedMap({});
    for (const key of PROJECT_DEFERRED_COLLECTION_KEYS) {
      assert.equal(closed[key], true, key);
      assert.equal(isCollectionDeferredClosed(key, undefined), true, key);
      assert.equal(isCollectionDeferredClosed(key, { deferred: {} }), true, key);
    }
  });

  it('opens a collection only when Hub explicitly marks persistable', () => {
    assert.equal(
      isCollectionDeferredClosed('notes', {
        deferred: { notes: 'PM_COLLECTION_NOT_IN_MVP' },
        persistable: { notes: true },
      }),
      false,
    );
    assert.equal(
      isCollectionDeferredClosed('notes', {
        deferred: {},
        persistable: ['notes'],
      }),
      false,
    );
    assert.equal(
      isCollectionDeferredClosed('risks', {
        deferred: { risks: 'PM_COLLECTION_NOT_IN_MVP' },
      }),
      true,
    );
    assert.equal(
      isCollectionDeferredClosed('documents', {
        persistable: { documents: false },
      }),
      true,
    );
  });

  it('labels tabs as deferred when collections are unconfirmed', () => {
    assert.equal(
      deferredTabLabel('Documents', ['documents'], {}),
      'Documents (deferred)',
    );
    assert.equal(
      deferredTabLabel('Notes & decisions', ['notes', 'decisions'], {
        persistable: { notes: true, decisions: true },
      }),
      'Notes & decisions',
    );
  });
});

describe('D13 ProjectDetailPage source honesty', () => {
  it('renders DeferredClosed copy and fail-closed write guard', () => {
    assert.match(page, /projectCollectionHonesty/);
    assert.match(page, /isCollectionDeferredClosed/);
    assert.match(page, /resolveDeferredClosedMap/);
    assert.match(page, /deferredTabLabel/);
    assert.match(page, /DEFERRED_CLOSED_COPY/);
    assert.match(page, /DEFERRED_WRITE_BLOCKED/);
    assert.equal(typeof DEFERRED_CLOSED_COPY, 'string');
    assert.equal(typeof DEFERRED_WRITE_BLOCKED, 'string');
    assert.match(DEFERRED_CLOSED_COPY, /did not confirm it is persistable/);
    assert.match(DEFERRED_WRITE_BLOCKED, /will not create or patch a local-only row/);
  });

  it('hides create/add/record for deferred notes and decisions; keeps task + milestone add', () => {
    assert.match(page, /Add task/);
    assert.match(page, /Add milestone/);
    assert.match(page, /createPmTask/);
    assert.match(page, /createPmMilestone/);
    // Record note/decision only inside non-deferred branches + fail-closed guards
    assert.match(page, /notesDeferred \? \(/);
    assert.match(page, /decisionsDeferred \? \(/);
    assert.match(page, /isCollectionDeferredClosed\('notes'/);
    assert.match(page, /isCollectionDeferredClosed\('decisions'/);
    assert.match(page, /Record note/);
    assert.match(page, /Record decision/);
  });

  it('marks Documents / Notes & decisions / Risks & waiting tabs as deferred when closed', () => {
    assert.match(page, /deferredTabLabel\('Documents', \['documents'\]/);
    assert.match(page, /deferredTabLabel\('Notes & decisions', \['notes', 'decisions'\]/);
    assert.match(page, /deferredTabLabel\('Risks & waiting', \['risks', 'waiting'\]/);
  });

  it('does not advertise empty-SoR copy for deferred collections', () => {
    // Empty-SoR strings must only appear in live (non-deferred) branches.
    const deliverablesLive = page.slice(
      page.indexOf('deliverablesDeferred ?'),
      page.indexOf('commitmentsDeferred ?'),
    );
    assert.match(deliverablesLive, /DeferredClosed label="Deliverables"/);
    assert.match(deliverablesLive, /None yet/);

    const notesBlock = page.slice(page.indexOf("tab === 'notes'"), page.indexOf("tab === 'risks'"));
    assert.match(notesBlock, /notesDeferred \?/);
    assert.match(notesBlock, /DeferredClosed label="Notes"/);
    // "No notes on this record." only after the live branch (not the DeferredClosed branch)
    const notesLive = notesBlock.slice(notesBlock.indexOf('AtlasCard title="Notes"'));
    assert.match(notesLive, /No notes on this record/);
    const notesClosed = notesBlock.slice(0, notesBlock.indexOf('AtlasCard title="Notes"'));
    assert.doesNotMatch(notesClosed, /No notes on this record/);

    const activityRow = page.slice(page.indexOf("label=\"Changed\""), page.indexOf("label=\"Requires me\""));
    assert.match(activityRow, /activityDeferred \?/);
    assert.doesNotMatch(
      activityRow.slice(0, activityRow.indexOf('activity.length === 0')),
      /No activity events on this record/,
    );
  });

  it('DEV honesty preview is gated and does not invent persistable rows', () => {
    assert.match(page, /isD13HonestyPreview/);
    assert.match(page, /atlas\.d13HonestyPreview/);
    assert.match(page, /import\.meta\.env\.DEV === true/);
    assert.match(page, /collectionMeta: \{\} as ProjectCollectionHonestyMeta/);
    assert.doesNotMatch(page, /persistable:\s*\{\s*notes:\s*true/);
  });
});
