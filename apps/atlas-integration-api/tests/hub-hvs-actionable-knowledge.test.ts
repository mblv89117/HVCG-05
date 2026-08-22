import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  hvsActionableAtRiskItems,
  hvsActionableCapitalItems,
  hvsActionableClientKnowledge,
  hvsActionableOverdueItems,
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

  const overdue = hvsActionableOverdueItems();
  assert.ok(overdue.length >= 2);
  assert.equal(
    overdue.every((row) => row.classification === 'LIKELY' && /past-due invoice filename/i.test(row.title)),
    true,
  );
  const prodigyOverdue = overdue.filter((row) => row.client === 'Prodigy Games');
  assert.equal(prodigyOverdue.length, 2);
  assert.ok(prodigyOverdue.some((row) => /April 2026 Past Due Invoice/i.test(row.filename)));
  assert.ok(prodigyOverdue.some((row) => /May 2026 Past Due Invoice/i.test(row.filename)));
  assert.equal(overdue.every((row) => /amounts not extracted/i.test(row.title)), true);

  const capital = hvsActionableCapitalItems();
  assert.ok(capital.length >= 4);
  assert.equal(
    capital.every((row) => row.classification === 'CONFIRMED' && row.party === 'HVCG'),
    true,
  );
  assert.ok(capital.some((row) => row.client === 'Colorado Beef' && /SBA Express/i.test(row.filename)));
  assert.ok(capital.some((row) => row.client === 'Prodigy Games' && /Capital_Acquisition/i.test(row.filename)));
  assert.ok(capital.some((row) => /121 Capital offer/i.test(row.filename)));
  assert.equal(capital.filter((row) => /SBA Express Funding Checklist/i.test(row.filename)).length, 1);
  assert.equal(capital.every((row) => /amounts and funding status not extracted/i.test(row.title)), true);

  const atRisk = hvsActionableAtRiskItems();
  assert.equal(atRisk.length, 1);
  assert.equal(atRisk[0]?.client, 'Prodigy Games');
  assert.equal(atRisk[0]?.clientCode, 'PDG01');
  assert.equal(atRisk[0]?.classification, 'LIKELY');
  assert.ok(atRisk[0]?.overdueFilenames.some((name) => /Past Due Invoice/i.test(name)));
  assert.ok(atRisk[0]?.capitalFilenames.some((name) => /Capital_Acquisition/i.test(name)));
  assert.equal(atRisk.every((row) => /amounts, payment status, and funding status not extracted/i.test(row.title)), true);
  assert.equal(atRisk.every((row) => row.client !== 'Colorado Beef'), true);

  const serialized = JSON.stringify(rows);
  assert.equal(serialized.includes('$'), false);
  assert.equal(AMOUNT.test(serialized), false);
  assert.equal(/\bltv\s*[:=]\s*\d/i.test(serialized), false);
  assert.equal(serialized.includes('Use recovered filenames as reference-only knowledge'), false);
  assert.equal(
    rows.every((row) =>
      row.hvcgResponsibilities.every((item) => !/reference-only knowledge/i.test(item.title)),
    ),
    true,
  );
});
