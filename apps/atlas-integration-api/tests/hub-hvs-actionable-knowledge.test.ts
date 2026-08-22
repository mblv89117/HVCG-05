import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  hvsActionableClientKnowledge,
  hvsActionableWaitingItems,
} from '../src/pm/sharepoint/hvsActionableClientKnowledge.ts';

const AMOUNT = /\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/;

test('actionable HVS knowledge stays honest and useful', () => {
  const rows = hvsActionableClientKnowledge();
  assert.equal(rows.length, 12);
  assert.equal(rows.every((row) => row.provenance === 'CONFIRMED'), true);
  assert.equal(rows.every((row) => row.hubMiOperationalized === false), true);

  const colorado = rows.find((row) => row.client === 'Colorado Beef');
  assert.ok(colorado);
  assert.ok(
    colorado.clientResponsibilities.some(
      (row) => row.classification === 'PROPOSED' && /checklist/i.test(row.title),
    ),
  );
  assert.ok(
    colorado.hvcgResponsibilities.some(
      (row) => row.classification === 'CONFIRMED' && row.party === 'HVCG',
    ),
  );
  assert.ok(
    colorado.missingDocuments.some(
      (row) => row.classification === 'PROPOSED' && /not extracted/i.test(row.title),
    ),
  );

  const accg = rows.find((row) => row.client === 'ACCG Inc');
  assert.ok(accg);
  assert.ok(accg.hvcgResponsibilities.some((row) => row.classification === 'CONFIRMED'));
  assert.ok(accg.waitingItems.length >= 1 || accg.decisions.length >= 1);

  const pierlo = rows.find((row) => row.client.startsWith('Pierlo Inc'));
  assert.ok(pierlo);
  assert.ok(pierlo.missingDocuments.some((row) => row.classification === 'LIKELY'));
  assert.ok(pierlo.waitingItems.some((row) => /operating files|Hub client code/i.test(row.title)));
  assert.equal(pierlo.clientCode, '');

  const waiting = hvsActionableWaitingItems();
  assert.ok(waiting.length >= 8);
  assert.equal(waiting.some((row) => /folder recovered \(reference-only\)/i.test(row.title)), false);
  assert.equal(
    waiting.every((row) => ['CONFIRMED', 'LIKELY', 'PROPOSED'].includes(row.classification)),
    true,
  );

  const serialized = JSON.stringify(rows);
  assert.equal(serialized.includes('$'), false);
  assert.equal(AMOUNT.test(serialized), false);
  assert.equal(/\bltv\s*[:=]\s*\d/i.test(serialized), false);
  assert.match(serialized, /Do not invent Hub MI rows, amounts, LTV, or completion/);
});
